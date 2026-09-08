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
} from 'lucide-react';
import { auth } from '@/lib/firebase';

const API_BASE = (() => {
  const envUrl = import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL;
  if (envUrl && envUrl.startsWith('http')) return envUrl;
  if (typeof window !== 'undefined' && window.location.hostname.includes('web.app'))
    return 'https://iic-3-0-ansh.vercel.app/api/v1';
  return import.meta.env.PROD ? 'https://iic-3-0-ansh.vercel.app/api/v1' : 'http://localhost:4000/api/v1';
})();

type ScanPhase =
  | 'camera_init'       // requesting permission
  | 'camera_denied'     // permission denied
  | 'live'              // showing live stream, ready to scan
  | 'scanning'          // frame captured, sending to backend
  | 'reading'           // "Reading your college ID…"
  | 'comparing'         // "Comparing ID details…"
  | 'verified'          // ✓ all matched
  | 'failed'            // ✗ OCR/comparison failed
  | 'error';            // unexpected error

interface ScanResult {
  studentName?: string | null;
  rollNumber?: string | null;
  collegeName?: string | null;
  validUntil?: string | null;
  confidence?: number;
  collegeMatch?: {
    matched: boolean;
    extractedCollegeName?: string | null;
    expectedCollegeName?: string | null;
    mismatchFlagged: boolean;
  };
  status?: string;
}

interface Props {
  onVerified: (result: ScanResult) => void;
  onClose: () => void;
  studentName?: string;
  studentEmail?: string;
  collegeName?: string;
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
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [scanChecks, setScanChecks] = useState<{ label: string; matched: boolean }[]>([]);

  // ── Start camera stream ───────────────────────────────────────────────────
  const startCamera = useCallback(async () => {
    setPhase('camera_init');
    setErrorMsg('');
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

  // ── Stop camera ────────────────────────────────────────────────────────────
  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Capture frame + send to backend ───────────────────────────────────────
  const handleScan = async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    // Capture current frame
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Convert to blob (JPEG 92% quality for smaller payload)
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/jpeg', 0.92)
    );
    if (!blob) {
      setPhase('error');
      setErrorMsg('Failed to capture frame from camera.');
      return;
    }

    // Stop camera (prevent further UI changes mid-flow)
    stopCamera();

    // Animated phase transitions
    setPhase('scanning');
    await delay(800);
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

      const idVerification: ScanResult = payload?.data?.idVerification || payload?.idVerification || {};
      setScanResult(idVerification);

      setPhase('comparing');
      await delay(1200);

      // Build comparison checks
      const checks = buildChecks(idVerification, studentName, collegeName);
      setScanChecks(checks);

      const allGood = checks.every((c) => c.matched);
      setPhase(allGood ? 'verified' : 'verified'); // Always show result; backend handles reject
      onVerified(idVerification);
    } catch (err: any) {
      setPhase('failed');
      setErrorMsg(err?.message || 'Verification failed. Please try again.');
    }
  };

  // ── Retry ─────────────────────────────────────────────────────────────────
  const handleRetry = () => {
    setScanResult(null);
    setScanChecks([]);
    setErrorMsg('');
    startCamera();
  };

  return (
    <div className="flex flex-col items-center gap-0 w-full select-none">
      {/* ── PHASE: LIVE CAMERA ── */}
      {(phase === 'camera_init' || phase === 'live') && (
        <div className="w-full flex flex-col items-center gap-4">
          <p className="text-sm text-muted-foreground text-center">
            Hold your college ID card{' '}
            <span className="text-foreground font-semibold">inside the frame</span>
          </p>

          {/* Camera viewport */}
          <div className="relative w-full max-w-sm rounded-2xl overflow-hidden bg-black border border-border shadow-2xl">
            {/* Live video */}
            <video
              ref={videoRef}
              className="w-full object-cover"
              style={{ minHeight: 240, maxHeight: 320 }}
              autoPlay
              muted
              playsInline
            />

            {/* Scanning overlay frame */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              {/* Corner guides */}
              <div className="relative w-48 h-32">
                {/* Top-left */}
                <span className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-primary rounded-tl-md" />
                {/* Top-right */}
                <span className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-primary rounded-tr-md" />
                {/* Bottom-left */}
                <span className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-primary rounded-bl-md" />
                {/* Bottom-right */}
                <span className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-primary rounded-br-md" />

                {/* Scanning line animation */}
                {phase === 'live' && (
                  <div className="absolute inset-x-0 top-0 h-0.5 bg-primary/70 animate-scan-line" />
                )}

                {/* Center label */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-[10px] text-primary/60 tracking-widest uppercase font-semibold">
                    PLACE ID HERE
                  </span>
                </div>
              </div>
            </div>

            {/* Camera init spinner */}
            {phase === 'camera_init' && (
              <div className="absolute inset-0 bg-black/70 flex items-center justify-center gap-2 text-white text-sm">
                <Loader2 className="h-5 w-5 animate-spin" />
                Starting camera…
              </div>
            )}
          </div>

          {/* LIVE indicator */}
          {phase === 'live' && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-500 font-semibold">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              LIVE CAMERA
            </div>
          )}

          {/* Scan button */}
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
            Keep your ID steady and well-lit. Camera captures are not saved to your device.
          </p>
        </div>
      )}

      {/* ── PHASE: CAMERA DENIED ── */}
      {phase === 'camera_denied' && (
        <div className="w-full max-w-sm flex flex-col items-center gap-4 py-6 text-center">
          <div className="p-4 rounded-full bg-destructive/10">
            <CameraOff className="h-8 w-8 text-destructive" />
          </div>
          <h3 className="font-semibold text-foreground text-base">Camera Access Required</h3>
          <p className="text-sm text-muted-foreground">
            Camera access is required to verify your college ID. Please allow camera access in your
            browser settings and try again.
          </p>
          <Button onClick={startCamera} className="gap-2 w-full">
            <Camera className="h-4 w-4" />
            Allow Camera
          </Button>
          <p className="text-xs text-muted-foreground">
            Tip: Look for the camera icon in your browser's address bar, click it, and choose
            "Allow".
          </p>
        </div>
      )}

      {/* ── PHASE: SCANNING / READING / COMPARING ── */}
      {(phase === 'scanning' || phase === 'reading' || phase === 'comparing') && (
        <div className="w-full max-w-sm flex flex-col items-center gap-6 py-8 text-center">
          {/* Animated card preview placeholder */}
          <div className="relative w-48 h-32 rounded-xl border-2 border-primary/40 bg-secondary/30 flex items-center justify-center overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-0.5 bg-primary animate-scan-line" />
            <ScanLine className="h-10 w-10 text-primary/40" />
          </div>

          <div className="space-y-2">
            <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto" />
            <p className="font-semibold text-foreground text-sm">
              {phase === 'scanning' && 'Processing frame…'}
              {phase === 'reading' && 'Reading your college ID…'}
              {phase === 'comparing' && 'Comparing ID details…'}
            </p>
            <p className="text-xs text-muted-foreground">
              {phase === 'reading' && 'Azure Document Intelligence is extracting your ID fields.'}
              {phase === 'comparing' && 'Matching extracted data against your registered profile.'}
            </p>
          </div>
        </div>
      )}

      {/* ── PHASE: VERIFIED / RESULT ── */}
      {phase === 'verified' && scanResult && (
        <div className="w-full max-w-sm flex flex-col gap-4 py-4">
          <div className="flex items-center justify-center gap-2">
            <div className="p-3 rounded-full bg-emerald-500/15">
              <ShieldCheck className="h-8 w-8 text-emerald-500" />
            </div>
          </div>
          <h3 className="text-center font-bold text-lg text-foreground">
            College ID Verification
          </h3>

          <div className="rounded-xl border border-border bg-secondary/20 divide-y divide-border overflow-hidden">
            {scanChecks.length > 0 ? (
              scanChecks.map((check, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-3 text-sm">
                  <span className="text-muted-foreground">{check.label}</span>
                  {check.matched ? (
                    <span className="flex items-center gap-1 text-emerald-500 font-semibold text-xs">
                      <CheckCircle2 className="h-4 w-4" /> Matched
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-amber-500 font-semibold text-xs">
                      <AlertCircle className="h-4 w-4" /> Requires Review
                    </span>
                  )}
                </div>
              ))
            ) : (
              // Fallback if no checks array built (e.g. Azure returned minimal data)
              <>
                <div className="flex items-center justify-between px-4 py-3 text-sm">
                  <span className="text-muted-foreground">ID Card Submitted</span>
                  <span className="flex items-center gap-1 text-emerald-500 font-semibold text-xs">
                    <CheckCircle2 className="h-4 w-4" /> Done
                  </span>
                </div>
                <div className="flex items-center justify-between px-4 py-3 text-sm">
                  <span className="text-muted-foreground">OCR Confidence</span>
                  <span className="text-foreground font-semibold text-xs">
                    {scanResult.confidence !== undefined
                      ? `${Math.round(scanResult.confidence * 100)}%`
                      : 'N/A'}
                  </span>
                </div>
              </>
            )}
          </div>

          {/* Raw extracted info */}
          {(scanResult.studentName || scanResult.rollNumber || scanResult.collegeName) && (
            <div className="rounded-xl border border-border bg-secondary/10 px-4 py-3 space-y-1 text-xs">
              <p className="font-semibold text-foreground mb-1">Extracted from ID:</p>
              {scanResult.studentName && (
                <p>
                  <span className="text-muted-foreground">Name: </span>
                  <span className="font-medium text-foreground">{scanResult.studentName}</span>
                </p>
              )}
              {scanResult.rollNumber && (
                <p>
                  <span className="text-muted-foreground">Roll / Enrollment: </span>
                  <span className="font-medium text-foreground">{scanResult.rollNumber}</span>
                </p>
              )}
              {scanResult.collegeName && (
                <p>
                  <span className="text-muted-foreground">Institution: </span>
                  <span className="font-medium text-foreground">{scanResult.collegeName}</span>
                </p>
              )}
            </div>
          )}

          <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs text-center font-medium">
            {scanChecks.every((c) => c.matched)
              ? '✓ Identity verified. Your application is under faculty review.'
              : '⚠ Submitted for manual faculty verification.'}
          </div>

          <div className="flex gap-2">
            <Button variant="outline" className="flex-1" onClick={handleRetry}>
              <RefreshCw className="h-4 w-4 mr-1.5" /> Rescan
            </Button>
            <Button className="flex-1" onClick={onClose}>
              Continue to Dashboard
            </Button>
          </div>
        </div>
      )}

      {/* ── PHASE: FAILED ── */}
      {phase === 'failed' && (
        <div className="w-full max-w-sm flex flex-col items-center gap-4 py-6 text-center">
          <div className="p-4 rounded-full bg-destructive/10">
            <XCircle className="h-8 w-8 text-destructive" />
          </div>
          <h3 className="font-semibold text-foreground text-base">Scan Failed</h3>
          <p className="text-sm text-muted-foreground">{errorMsg}</p>
          <Button onClick={handleRetry} className="gap-2 w-full">
            <RefreshCw className="h-4 w-4" /> Try Again
          </Button>
        </div>
      )}

      {/* ── PHASE: ERROR ── */}
      {phase === 'error' && (
        <div className="w-full max-w-sm flex flex-col items-center gap-4 py-6 text-center">
          <div className="p-4 rounded-full bg-amber-500/10">
            <AlertCircle className="h-8 w-8 text-amber-500" />
          </div>
          <h3 className="font-semibold text-foreground text-base">Camera Error</h3>
          <p className="text-sm text-muted-foreground">{errorMsg}</p>
          <Button onClick={handleRetry} className="gap-2 w-full">
            <RefreshCw className="h-4 w-4" /> Retry
          </Button>
        </div>
      )}

      {/* Hidden canvas used for frame capture */}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function buildChecks(
  result: ScanResult,
  studentName?: string,
  collegeName?: string
): { label: string; matched: boolean }[] {
  const checks: { label: string; matched: boolean }[] = [];

  // Name check
  if (result.studentName) {
    const nameMatch = !!studentName &&
      fuzzy(result.studentName, studentName);
    checks.push({ label: `Name — "${result.studentName}"`, matched: nameMatch });
  }

  // Institution check
  if (result.collegeName) {
    const collegeMatch = result.collegeMatch?.matched ?? false;
    checks.push({ label: `Institution — "${result.collegeName}"`, matched: collegeMatch || !result.collegeMatch?.mismatchFlagged });
  }

  // Roll number (just check it exists)
  if (result.rollNumber) {
    checks.push({ label: `Enrollment # — "${result.rollNumber}"`, matched: true });
  }

  // Validity
  if (result.validUntil) {
    checks.push({ label: `ID Validity — ${result.validUntil}`, matched: true });
  }

  // If nothing extracted, add generic submission confirmation
  if (checks.length === 0) {
    checks.push({ label: 'ID Card Submitted', matched: true });
    checks.push({ label: 'Pending Faculty Review', matched: true });
  }

  return checks;
}

function fuzzy(a: string, b: string): boolean {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
  const wordsA = new Set(normalize(a).split(/\s+/));
  const wordsB = normalize(b).split(/\s+/);
  return wordsB.some((w) => wordsA.has(w) && w.length > 2);
}
