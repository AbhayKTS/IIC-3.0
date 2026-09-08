import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import {
  Camera,
  CameraOff,
  ScanLine,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  RefreshCw,
  ShieldCheck,
  ShieldAlert,
  ClockIcon,
} from 'lucide-react';
import { auth } from '@/lib/firebase';

const API_BASE = (() => {
  const envUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
  if (envUrl && envUrl.startsWith('http')) return envUrl;
  if (typeof window !== 'undefined' && window.location.hostname.includes('web.app'))
    return 'https://iic-3-0-ansh.vercel.app/api/v1';
  return import.meta.env.PROD ? 'https://iic-3-0-ansh.vercel.app/api/v1' : 'http://localhost:4000/api/v1';
})();

// ── Canonical backend verification statuses ───────────────────────────────────
type BackendStatus = 'VERIFIED' | 'REQUIRES_REVIEW' | 'FAILED';

// ── Frontend UI phases ────────────────────────────────────────────────────────
type ScanPhase =
  | 'camera_init'
  | 'camera_denied'
  | 'live'
  | 'scanning'
  | 'reading'
  | 'comparing'
  | 'result_verified'
  | 'result_review'
  | 'result_failed'
  | 'error';

interface VerificationResult {
  status: BackendStatus;
  reason?: string;
  reasonMessage?: string;
  matchedFields?: string[];
  failedFields?: string[];
  extractedData?: {
    studentName?: string | null;
    rollNumber?: string | null;
    collegeName?: string | null;
    validUntil?: string | null;
  };
  confidence?: number;
  collegeMatch?: {
    matched: boolean;
    extractedCollegeName?: string | null;
    expectedCollegeName?: string | null;
  };
  verificationMethod?: string;
}

interface Props {
  onVerified: (result: VerificationResult) => void;
  onClose: () => void;
  studentName?: string;
  studentEmail?: string;
  collegeName?: string;
}

// ── Human-readable field labels ───────────────────────────────────────────────
const FIELD_LABELS: Record<string, string> = {
  institution: 'Institution',
  student_name: 'Student Name',
  enrollment_number: 'Enrollment Number',
  document_type: 'Document Type',
  document_readability: 'ID Readability',
  ocr: 'Document Scan',
};

function fieldLabel(field: string) {
  return FIELD_LABELS[field] || field.replace(/_/g, ' ');
}

function delay(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

export default function CameraIdScanner({
  onVerified,
  onClose,
  studentName,
  studentEmail,
  collegeName,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [phase, setPhase] = useState<ScanPhase>('camera_init');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [verificationResult, setVerificationResult] = useState<VerificationResult | null>(null);

  // ── Camera management ──────────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const startCamera = useCallback(async () => {
    setPhase('camera_init');
    setErrorMsg('');
    setVerificationResult(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setPhase('live');
        };
      }
    } catch (err: any) {
      if (err?.name === 'NotAllowedError' || err?.name === 'PermissionDeniedError') {
        setPhase('camera_denied');
      } else {
        setPhase('error');
        setErrorMsg(err?.message || 'Could not access camera.');
      }
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Capture + verify ───────────────────────────────────────────────────────
  const handleScan = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    // Capture frame from live stream
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.92)
    );
    if (!blob) {
      setPhase('error');
      setErrorMsg('Failed to capture frame from camera.');
      return;
    }

    // Stop camera stream immediately after capture
    stopCamera();

    // Animated status phases
    setPhase('scanning');
    await delay(600);
    setPhase('reading');

    try {
      const token = await auth.currentUser?.getIdToken();
      const formData = new FormData();
      formData.append('idCard', blob, 'camera-scan.jpg');

      const res = await fetch(`${API_BASE}/student/verify-id-card`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      const payload = await res.json().catch(() => null);

      if (!res.ok) {
        throw new Error(
          payload?.error?.message || payload?.message || `Server error ${res.status}`
        );
      }

      // ── Read the backend verification result ──────────────────────────────
      // The backend returns idVerification inside payload.data
      const idVerification: VerificationResult =
        payload?.data?.idVerification || payload?.idVerification || {};

      setVerificationResult(idVerification);

      setPhase('comparing');
      await delay(1200);

      // ── Map backend status to UI phase ────────────────────────────────────
      // CRITICAL: we read the BACKEND status, not infer from frontend checks
      const backendStatus: BackendStatus = idVerification.status as BackendStatus;

      if (backendStatus === 'VERIFIED') {
        setPhase('result_verified');
        onVerified(idVerification);
      } else if (backendStatus === 'REQUIRES_REVIEW') {
        setPhase('result_review');
        onVerified(idVerification); // Still notify parent (dashboard will update)
      } else {
        // FAILED — show specific failure reason from backend
        setPhase('result_failed');
        setErrorMsg(idVerification.reasonMessage || 'Verification failed. Please try again.');
      }
    } catch (err: any) {
      setPhase('result_failed');
      setErrorMsg(err?.message || 'Verification request failed. Please try again.');
    }
  };

  const handleRetry = () => {
    setVerificationResult(null);
    setErrorMsg('');
    startCamera();
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center gap-0 w-full select-none">

      {/* ── CAMERA INIT + LIVE ─────────────────────────────────────────────── */}
      {(phase === 'camera_init' || phase === 'live') && (
        <div className="w-full flex flex-col items-center gap-4">
          <p className="text-sm text-muted-foreground text-center">
            Hold your <span className="text-foreground font-semibold">physical college ID card</span> inside the frame
          </p>

          {/* Camera viewport */}
          <div className="relative w-full max-w-sm rounded-2xl overflow-hidden bg-black border border-border shadow-2xl">
            <video
              ref={videoRef}
              className="w-full object-cover"
              style={{ minHeight: 240, maxHeight: 320 }}
              autoPlay muted playsInline
            />

            {/* Scanning frame overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-52 h-36">
                <span className="absolute top-0 left-0 w-7 h-7 border-t-2 border-l-2 border-primary rounded-tl-md" />
                <span className="absolute top-0 right-0 w-7 h-7 border-t-2 border-r-2 border-primary rounded-tr-md" />
                <span className="absolute bottom-0 left-0 w-7 h-7 border-b-2 border-l-2 border-primary rounded-bl-md" />
                <span className="absolute bottom-0 right-0 w-7 h-7 border-b-2 border-r-2 border-primary rounded-br-md" />
                {phase === 'live' && (
                  <div className="absolute inset-x-0 top-0 h-0.5 bg-primary/80 animate-scan-line" />
                )}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[9px] text-primary/50 tracking-widest uppercase font-semibold">
                    PLACE ID HERE
                  </span>
                </div>
              </div>
            </div>

            {phase === 'camera_init' && (
              <div className="absolute inset-0 bg-black/70 flex items-center justify-center gap-2 text-white text-sm">
                <Loader2 className="h-5 w-5 animate-spin" /> Starting camera…
              </div>
            )}
          </div>

          {phase === 'live' && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-500 font-semibold">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              LIVE CAMERA
            </div>
          )}

          <Button
            size="lg"
            disabled={phase !== 'live'}
            onClick={handleScan}
            className="w-full max-w-sm gap-2 font-semibold text-base shadow-lg"
          >
            <ScanLine className="h-5 w-5" />
            Scan ID Card
          </Button>

          <p className="text-xs text-muted-foreground text-center px-4">
            The system will compare your ID against your registered profile.
            Camera captures are not stored.
          </p>
        </div>
      )}

      {/* ── CAMERA DENIED ─────────────────────────────────────────────────── */}
      {phase === 'camera_denied' && (
        <div className="w-full max-w-sm flex flex-col items-center gap-4 py-6 text-center">
          <div className="p-4 rounded-full bg-destructive/10">
            <CameraOff className="h-8 w-8 text-destructive" />
          </div>
          <h3 className="font-semibold text-foreground text-base">Camera Access Required</h3>
          <p className="text-sm text-muted-foreground">
            Camera access is required for live ID verification. Please allow access in your
            browser settings and try again.
          </p>
          <Button onClick={startCamera} className="gap-2 w-full">
            <Camera className="h-4 w-4" /> Allow Camera
          </Button>
          <p className="text-xs text-muted-foreground">
            Tip: Click the camera icon in your browser's address bar and select "Allow".
          </p>
        </div>
      )}

      {/* ── PROCESSING PHASES ─────────────────────────────────────────────── */}
      {(phase === 'scanning' || phase === 'reading' || phase === 'comparing') && (
        <div className="w-full max-w-sm flex flex-col items-center gap-6 py-8 text-center">
          <div className="relative w-48 h-32 rounded-xl border-2 border-primary/40 bg-secondary/30 flex items-center justify-center overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-0.5 bg-primary animate-scan-line" />
            <ScanLine className="h-10 w-10 text-primary/30" />
          </div>
          <div className="space-y-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
            <p className="font-semibold text-foreground text-sm">
              {phase === 'scanning' && 'Capturing frame…'}
              {phase === 'reading' && 'Reading your college ID…'}
              {phase === 'comparing' && 'Comparing against your registered profile…'}
            </p>
            <p className="text-xs text-muted-foreground">
              {phase === 'reading' && 'Azure Document Intelligence is extracting your ID fields.'}
              {phase === 'comparing' && 'Checking institution, name, and enrollment number.'}
            </p>
          </div>
        </div>
      )}

      {/* ── RESULT: VERIFIED ──────────────────────────────────────────────── */}
      {phase === 'result_verified' && verificationResult && (
        <div className="w-full max-w-sm flex flex-col gap-4 py-4">
          <div className="flex flex-col items-center gap-2">
            <div className="p-3 rounded-full bg-emerald-500/15">
              <ShieldCheck className="h-9 w-9 text-emerald-500" />
            </div>
            <h3 className="font-bold text-lg text-foreground">Identity Verified</h3>
            <p className="text-xs text-muted-foreground text-center">
              College Email + Live ID Scan
            </p>
          </div>

          <ChecksList
            matchedFields={verificationResult.matchedFields || []}
            failedFields={verificationResult.failedFields || []}
            extractedData={verificationResult.extractedData}
            studentEmail={studentEmail}
            collegeName={collegeName}
          />

          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs text-center font-medium">
            ✓ All required identity fields matched successfully.
          </div>

          <Button className="w-full" onClick={onClose}>
            Continue to Dashboard
          </Button>
        </div>
      )}

      {/* ── RESULT: REQUIRES REVIEW ───────────────────────────────────────── */}
      {phase === 'result_review' && verificationResult && (
        <div className="w-full max-w-sm flex flex-col gap-4 py-4">
          <div className="flex flex-col items-center gap-2">
            <div className="p-3 rounded-full bg-amber-500/15">
              <ClockIcon className="h-9 w-9 text-amber-500" />
            </div>
            <h3 className="font-bold text-lg text-foreground">Submitted for Review</h3>
          </div>

          <ChecksList
            matchedFields={verificationResult.matchedFields || []}
            failedFields={verificationResult.failedFields || []}
            extractedData={verificationResult.extractedData}
            studentEmail={studentEmail}
            collegeName={collegeName}
          />

          <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-400 text-xs text-center">
            {verificationResult.reasonMessage || 'Your application has been submitted for faculty review.'}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={handleRetry}>
              <RefreshCw className="h-4 w-4 mr-1.5" /> Rescan
            </Button>
            <Button className="flex-1" onClick={onClose}>
              Go to Dashboard
            </Button>
          </div>
        </div>
      )}

      {/* ── RESULT: FAILED ────────────────────────────────────────────────── */}
      {phase === 'result_failed' && (
        <div className="w-full max-w-sm flex flex-col gap-4 py-4">
          <div className="flex flex-col items-center gap-2">
            <div className="p-4 rounded-full bg-destructive/10">
              <ShieldAlert className="h-9 w-9 text-destructive" />
            </div>
            <h3 className="font-bold text-lg text-foreground">Verification Failed</h3>
          </div>

          {verificationResult && (
            <ChecksList
              matchedFields={verificationResult.matchedFields || []}
              failedFields={verificationResult.failedFields || []}
              extractedData={verificationResult.extractedData}
              studentEmail={studentEmail}
              collegeName={collegeName}
            />
          )}

          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs text-center">
            {errorMsg || verificationResult?.reasonMessage || 'Verification failed.'}
          </div>

          <Button onClick={handleRetry} className="gap-2 w-full">
            <RefreshCw className="h-4 w-4" /> Scan Again
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Make sure you are scanning your <strong>college-issued student ID card</strong> — not an event badge or other document.
          </p>
        </div>
      )}

      {/* ── ERROR ─────────────────────────────────────────────────────────── */}
      {phase === 'error' && (
        <div className="w-full max-w-sm flex flex-col items-center gap-4 py-6 text-center">
          <div className="p-4 rounded-full bg-amber-500/10">
            <AlertCircle className="h-8 w-8 text-amber-500" />
          </div>
          <h3 className="font-semibold text-foreground">Camera Error</h3>
          <p className="text-sm text-muted-foreground">{errorMsg}</p>
          <Button onClick={handleRetry} className="gap-2 w-full">
            <RefreshCw className="h-4 w-4" /> Retry
          </Button>
        </div>
      )}

      {/* Hidden canvas for frame capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

// ── Shared Checks List Component ──────────────────────────────────────────────

interface ChecksListProps {
  matchedFields: string[];
  failedFields: string[];
  extractedData?: {
    studentName?: string | null;
    rollNumber?: string | null;
    collegeName?: string | null;
    validUntil?: string | null;
  };
  studentEmail?: string;
  collegeName?: string;
}

function ChecksList({ matchedFields, failedFields, extractedData, studentEmail, collegeName }: ChecksListProps) {
  const allFields = [
    // Always show institutional email if we have it
    studentEmail ? { key: 'email', label: 'Institutional Email', value: studentEmail, matched: true } : null,
    ...matchedFields.map((f) => ({ key: f, label: fieldLabel(f), value: getFieldValue(f, extractedData, collegeName), matched: true })),
    ...failedFields.map((f) => ({ key: f, label: fieldLabel(f), value: null, matched: false })),
  ].filter(Boolean) as { key: string; label: string; value: string | null | undefined; matched: boolean }[];

  if (!allFields.length) return null;

  return (
    <div className="rounded-xl border border-border bg-secondary/10 divide-y divide-border overflow-hidden">
      {allFields.map((item) => (
        <div key={item.key} className="flex items-center justify-between px-4 py-3 text-sm">
          <div>
            <p className="text-muted-foreground text-xs">{item.label}</p>
            {item.value && (
              <p className="font-medium text-foreground text-xs mt-0.5">{item.value}</p>
            )}
          </div>
          {item.matched ? (
            <span className="flex items-center gap-1 text-emerald-500 font-semibold text-xs shrink-0 ml-2">
              <CheckCircle2 className="h-4 w-4" /> Matched
            </span>
          ) : (
            <span className="flex items-center gap-1 text-destructive font-semibold text-xs shrink-0 ml-2">
              <XCircle className="h-4 w-4" /> Failed
            </span>
          )}
        </div>
      ))}
    </div>
  );
}

function getFieldValue(
  field: string,
  extracted?: { studentName?: string | null; rollNumber?: string | null; collegeName?: string | null; validUntil?: string | null },
  registeredCollege?: string
): string | null {
  if (!extracted) return null;
  switch (field) {
    case 'institution': return extracted.collegeName || registeredCollege || null;
    case 'student_name': return extracted.studentName || null;
    case 'enrollment_number': return extracted.rollNumber || null;
    default: return null;
  }
}
