import { useState, useEffect, useRef, useCallback } from 'react';
import { auth } from '@/lib/firebase';
import {
  Camera,
  CameraOff,
  ScanLine,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  ShieldCheck,
  ShieldAlert,
  Clock as ClockIcon,
  RefreshCw,
  Sparkles,
  Timer,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  onVerified: (result: VerificationResult) => void;
  onClose: () => void;
  studentName?: string;
  studentEmail?: string;
  collegeName?: string;
}

const API_BASE = (() => {
  const envUrl = import.meta.env.VITE_API_URL;
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
  | 'captured'
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

const FIELD_LABELS: Record<string, string> = {
  institution: 'University / College',
  student_name: 'Student Name',
  enrollment_number: 'Enrollment / Roll No',
  document_type: 'Valid Student ID Card',
  document_readability: 'ID Readability',
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

  // Photo capture & preview states
  const [capturedImageUrl, setCapturedImageUrl] = useState<string | null>(null);
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
  const [flashActive, setFlashActive] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number | null>(null);

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
    setCapturedImageUrl(null);
    setCapturedBlob(null);
    setCountdown(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
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

  // ── Snap Photo Action ──────────────────────────────────────────────────────
  const takeSnapshot = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    // Flash animation
    setFlashActive(true);
    setTimeout(() => setFlashActive(false), 200);

    // Capture highest resolution available from video
    const w = video.videoWidth || 1280;
    const h = video.videoHeight || 720;
    canvas.width = w;
    canvas.height = h;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, w, h);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.95)
    );

    if (!blob) {
      setPhase('error');
      setErrorMsg('Failed to capture frame from camera.');
      return;
    }

    // Stop live stream immediately so the user knows the capture is completed
    stopCamera();

    setCapturedImageUrl(dataUrl);
    setCapturedBlob(blob);
    setPhase('captured');
  }, [stopCamera]);

  // ── Timer-assisted capture (3s countdown) ──────────────────────────────────
  const startTimerCapture = () => {
    setCountdown(3);
  };

  useEffect(() => {
    if (countdown === null) return;
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0) {
      setCountdown(null);
      takeSnapshot();
    }
  }, [countdown, takeSnapshot]);

  // ── Send Captured Photo to Azure OCR & Verification Engine ─────────────────
  const handleVerifyCapturedPhoto = async () => {
    if (!capturedBlob) return;

    setPhase('scanning');
    await delay(600);
    setPhase('reading');

    try {
      const token = await auth.currentUser?.getIdToken();
      const formData = new FormData();
      formData.append('idCard', capturedBlob, 'camera-scan.jpg');

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

      const idVerification: VerificationResult =
        payload?.data?.idVerification || payload?.idVerification || {};

      setVerificationResult(idVerification);

      setPhase('comparing');
      await delay(900);

      const backendStatus: BackendStatus = idVerification.status as BackendStatus;

      if (backendStatus === 'VERIFIED') {
        setPhase('result_verified');
        onVerified(idVerification);
      } else if (backendStatus === 'REQUIRES_REVIEW') {
        setPhase('result_review');
        onVerified(idVerification);
      } else {
        setPhase('result_failed');
        setErrorMsg(idVerification.reasonMessage || 'Verification failed. Please try again.');
      }
    } catch (err: any) {
      setPhase('result_failed');
      setErrorMsg(err?.message || 'Verification request failed. Please try again.');
    }
  };

  const handleRetake = () => {
    setVerificationResult(null);
    setErrorMsg('');
    setCapturedImageUrl(null);
    setCapturedBlob(null);
    startCamera();
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col items-center gap-0 w-full select-none">

      {/* ── CAMERA INIT + LIVE PREVIEW ──────────────────────────────────────── */}
      {(phase === 'camera_init' || phase === 'live') && (
        <div className="w-full flex flex-col items-center gap-4">
          <p className="text-xs text-muted-foreground text-center">
            Position your <span className="text-foreground font-semibold">physical college ID card</span> inside the frame
          </p>

          {/* Camera viewport */}
          <div className="relative w-full max-w-sm rounded-2xl overflow-hidden bg-black border border-border shadow-2xl">
            <video
              ref={videoRef}
              className="w-full object-cover"
              style={{ minHeight: 230, maxHeight: 300 }}
              autoPlay
              muted
              playsInline
            />

            {/* Flash Effect */}
            {flashActive && (
              <div className="absolute inset-0 bg-white z-20 animate-out fade-out duration-200" />
            )}

            {/* Countdown Overlay */}
            {countdown !== null && (
              <div className="absolute inset-0 z-30 bg-black/60 flex items-center justify-center">
                <span className="text-6xl font-extrabold text-white animate-ping">
                  {countdown}
                </span>
              </div>
            )}

            {/* Scanning frame overlay */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative w-56 h-36 border border-primary/30 rounded-xl bg-primary/5">
                <span className="absolute -top-1 -left-1 w-6 h-6 border-t-3 border-l-3 border-primary rounded-tl-lg" />
                <span className="absolute -top-1 -right-1 w-6 h-6 border-t-3 border-r-3 border-primary rounded-tr-lg" />
                <span className="absolute -bottom-1 -left-1 w-6 h-6 border-b-3 border-l-3 border-primary rounded-bl-lg" />
                <span className="absolute -bottom-1 -right-1 w-6 h-6 border-b-3 border-r-3 border-primary rounded-br-lg" />

                {phase === 'live' && (
                  <div className="absolute inset-x-0 top-0 h-0.5 bg-primary/80 animate-scan-line" />
                )}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[10px] text-primary/70 tracking-widest uppercase font-semibold bg-background/60 px-2 py-0.5 rounded backdrop-blur-sm">
                    FIT ID CARD HERE
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
              LIVE CAMERA ACTIVE
            </div>
          )}

          {/* Action Buttons: Instant Snap & 3-Second Timer */}
          <div className="w-full max-w-sm flex gap-2">
            <Button
              size="lg"
              disabled={phase !== 'live' || countdown !== null}
              onClick={takeSnapshot}
              className="flex-1 gap-2 font-semibold text-sm shadow-md"
            >
              <Camera className="h-4 w-4" />
              Capture ID Photo
            </Button>
            <Button
              size="lg"
              variant="outline"
              disabled={phase !== 'live' || countdown !== null}
              onClick={startTimerCapture}
              className="gap-1.5 text-xs font-medium px-3"
              title="3-second timer so you can hold ID card steady with both hands"
            >
              <Timer className="h-4 w-4" />
              3s Timer
            </Button>
          </div>

          <p className="text-[11px] text-muted-foreground text-center px-4">
            Once captured, the photo is frozen so you <strong>do not have to hold the card</strong> while OCR verifies it.
          </p>
        </div>
      )}

      {/* ── PHOTO CAPTURED (REVIEW & CONFIRMATION) ───────────────────────────── */}
      {phase === 'captured' && capturedImageUrl && (
        <div className="w-full flex flex-col items-center gap-4 animate-in fade-in zoom-in-95 duration-200">
          {/* Prominent success notification */}
          <div className="w-full p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center justify-center gap-2 font-semibold shadow-sm">
            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />
            <span>Photo Captured! You can put your ID card down now.</span>
          </div>

          {/* Display captured photo */}
          <div className="relative w-full max-w-sm rounded-2xl overflow-hidden bg-black border-2 border-primary/50 shadow-2xl">
            <img
              src={capturedImageUrl}
              alt="Captured College ID"
              className="w-full object-cover"
              style={{ minHeight: 210, maxHeight: 290 }}
            />
            <div className="absolute bottom-2 left-2 right-2 bg-background/80 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-border/60 text-[11px] text-muted-foreground flex items-center justify-between">
              <span>Photo ready for AI OCR</span>
              <span className="text-primary font-semibold">High Quality</span>
            </div>
          </div>

          <div className="w-full max-w-sm flex gap-2">
            <Button
              variant="outline"
              onClick={handleRetake}
              className="flex-1 gap-1.5 text-sm"
            >
              <RefreshCw className="h-4 w-4" /> Retake Photo
            </Button>
            <Button
              onClick={handleVerifyCapturedPhoto}
              className="flex-1 gap-2 text-sm font-semibold shadow-lg bg-primary hover:bg-primary/90"
            >
              <Sparkles className="h-4 w-4" /> Verify ID Card
            </Button>
          </div>

          <p className="text-[11px] text-muted-foreground text-center">
            Make sure your name, roll number, and college name are readable before submitting.
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

      {/* ── PROCESSING PHASES (SCANNING THE CAPTURED PHOTO) ─────────────────── */}
      {(phase === 'scanning' || phase === 'reading' || phase === 'comparing') && (
        <div className="w-full max-w-sm flex flex-col items-center gap-4 py-2 text-center animate-in fade-in duration-200">
          {/* Show the captured photo with neon scan laser overlaid */}
          <div className="relative w-full rounded-2xl overflow-hidden bg-black border-2 border-primary shadow-2xl">
            {capturedImageUrl && (
              <img
                src={capturedImageUrl}
                alt="Captured ID scan in progress"
                className="w-full object-cover opacity-80"
                style={{ minHeight: 210, maxHeight: 270 }}
              />
            )}
            <div className="absolute inset-0 bg-primary/10 pointer-events-none" />
            <div className="absolute inset-x-0 top-0 h-1 bg-cyan-400 shadow-[0_0_15px_#22d3ee] animate-scan-line pointer-events-none" />
            <div className="absolute bottom-3 left-3 right-3 bg-black/75 backdrop-blur-md px-3 py-2 rounded-xl border border-white/10 text-left">
              <div className="flex items-center gap-2 text-xs font-semibold text-white">
                <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
                {phase === 'scanning' && 'Processing captured photo…'}
                {phase === 'reading' && 'Azure AI extracting ID card fields…'}
                {phase === 'comparing' && 'Comparing against university records…'}
              </div>
            </div>
          </div>

          {/* Stepper indication showing that holding is complete */}
          <div className="w-full p-3 rounded-xl bg-secondary/30 border border-border/60 text-left space-y-1.5 text-xs">
            <div className="flex items-center gap-2 text-emerald-500 font-medium">
              <CheckCircle2 className="h-4 w-4" />
              <span>Step 1: ID photo captured (Card no longer needed in hand)</span>
            </div>
            <div className="flex items-center gap-2 text-primary font-medium">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>
                {phase === 'reading' ? 'Step 2: Azure Document Intelligence reading credentials...' : 'Step 3: Cryptographic verification on Polygon...'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── RESULT: VERIFIED ──────────────────────────────────────────────── */}
      {phase === 'result_verified' && verificationResult && (
        <div className="w-full max-w-sm flex flex-col gap-4 py-3 animate-in fade-in zoom-in-95 duration-200">
          <div className="flex flex-col items-center gap-2">
            <div className="p-3 rounded-full bg-emerald-500/15">
              <ShieldCheck className="h-9 w-9 text-emerald-500" />
            </div>
            <h3 className="font-bold text-lg text-foreground">Identity Verified</h3>
            <p className="text-xs text-muted-foreground text-center">
              College Email + Live ID Scan Matched
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
            ✓ All required identity fields matched successfully. Soulbound Token minting ready.
          </div>

          <Button className="w-full" onClick={onClose}>
            Continue to Dashboard
          </Button>
        </div>
      )}

      {/* ── RESULT: REQUIRES REVIEW ───────────────────────────────────────── */}
      {phase === 'result_review' && verificationResult && (
        <div className="w-full max-w-sm flex flex-col gap-4 py-3 animate-in fade-in zoom-in-95 duration-200">
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
            <Button variant="outline" className="flex-1" onClick={handleRetake}>
              <RefreshCw className="h-4 w-4 mr-1.5" /> Retake Photo
            </Button>
            <Button className="flex-1" onClick={onClose}>
              Go to Dashboard
            </Button>
          </div>
        </div>
      )}

      {/* ── RESULT: FAILED ────────────────────────────────────────────────── */}
      {phase === 'result_failed' && (
        <div className="w-full max-w-sm flex flex-col gap-4 py-3 animate-in fade-in zoom-in-95 duration-200">
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

          <Button onClick={handleRetake} className="gap-2 w-full">
            <RefreshCw className="h-4 w-4" /> Capture Photo Again
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Hold your <strong>college-issued student ID card</strong> steady and ensure good lighting so text is clear.
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
          <Button onClick={handleRetake} className="gap-2 w-full">
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
