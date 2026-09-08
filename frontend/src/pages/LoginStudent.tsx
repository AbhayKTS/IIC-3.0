import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/mockApi';
import type { IdVerificationData } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle, UploadCloud, CheckCircle2, FileText, ArrowRight } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import DotLottieLoader from '@/components/Loader';
import AuthIllustration from '@/components/AuthIllustration';

const AUTH_DOT_LOTTIE_SRC =
  'https://lottie.host/7a753e3c-14a7-4657-b5dc-cd8c6b952ffd/F4qKTN4Ubz.lottie';

export default function LoginStudent() {
  const { login, loginWithGoogle, loading } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [ocrResult, setOcrResult] = useState<IdVerificationData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleGoogleLogin = async () => {
    setError('');
    setIsVerifying(true);
    try {
      await loginWithGoogle('student');
      setIsVerifying(false);
      setStep(2);
    } catch (err: any) {
      setIsVerifying(false);
      setError(err?.message || 'Google sign-in failed. Please use your official college Google account (e.g. name@gla.ac.in).');
    }
  };

  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const domain = email.split('@')[1]?.toLowerCase();
    if (!domain) {
      setError('Please enter a valid email address.');
      return;
    }

    const personalDomains = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com'];
    if (personalDomains.includes(domain)) {
      setError('Personal email addresses (@gmail.com, etc.) are not allowed. Please use your official college email.');
      return;
    }

    setIsVerifying(true);
    try {
      await login(email, password);
      setIsVerifying(false);
      setStep(2);
    } catch (err: any) {
      setIsVerifying(false);
      setError(err?.message || 'Authentication failed. Please check your college email and password.');
      // Strictly prevent proceeding on failure
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        setError('ID card image size must be under 5MB');
        return;
      }
      setSelectedFile(file);
      setError('');
    }
  };

  const handleStep2 = async () => {
    if (!selectedFile) {
      setError('Please select an ID card image file to upload.');
      return;
    }

    setIsVerifying(true);
    setError('');
    try {
      const res = await api.uploadIdCard(selectedFile);
      if (res?.idVerification) {
        setOcrResult(res.idVerification);
      }
      setIsVerifying(false);
    } catch (err: any) {
      setIsVerifying(false);
      setError(err?.message || 'ID Card analysis failed. Please ensure the ID card is clear, well-lit, and uncropped.');
      setOcrResult(null);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container-main pt-24 pb-16">
        <div className="grid gap-10 lg:grid-cols-2 items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="order-2 lg:order-1 w-full max-w-md mx-auto lg:mx-0"
          >
            <div className="bg-card border border-border rounded-2xl p-8 shadow-sm">
              <div className="mb-6">
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
                  Student Portal
                </span>
                <h1 className="text-2xl font-bold text-foreground mt-2">
                  {step === 1 && 'Student Sign In'}
                  {step === 2 && 'Step 2: College ID Verification'}
                </h1>
                <p className="text-sm text-muted-foreground mt-1">
                  {step === 1 && 'Sign in with your approved institution account.'}
                  {step === 2 && 'Upload your student ID card for Azure AI OCR scanning.'}
                </p>
              </div>

              {/* Progress indicator */}
              <div className="flex gap-2 mb-6">
                {[1, 2].map((s) => (
                  <div
                    key={s}
                    className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                      s <= step ? 'bg-primary' : 'bg-secondary'
                    }`}
                  />
                ))}
              </div>

              {error && (
                <div className="mb-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <AnimatePresence mode="wait">
                {step === 1 && (
                  <motion.div
                    key="step1"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-4"
                  >
                    {/* Google Login Option */}
                    <button
                      type="button"
                      onClick={handleGoogleLogin}
                      disabled={isVerifying || loading}
                      className="w-full px-4 py-2.5 rounded-lg border border-border bg-background hover:bg-secondary/50 text-foreground text-sm font-semibold transition-colors flex items-center justify-center gap-3 disabled:opacity-50"
                    >
                      <svg className="h-4 w-4" viewBox="0 0 24 24">
                        <path
                          fill="#4285F4"
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                        />
                        <path
                          fill="#34A853"
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                        />
                        <path
                          fill="#EA4335"
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                        />
                      </svg>
                      Continue with Google
                    </button>

                    <div className="relative flex items-center justify-center my-4">
                      <div className="border-t border-border w-full" />
                      <span className="bg-card px-2 text-xs text-muted-foreground uppercase absolute">
                        or with password
                      </span>
                    </div>

                    <form onSubmit={handleStep1} className="space-y-4">
                      <div>
                        <label className="text-sm font-medium text-foreground mb-1 block">College Email</label>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          placeholder="student@gla.ac.in"
                          className="w-full px-3 py-2.5 rounded-lg bg-input border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium text-foreground mb-1 block">Password</label>
                        <input
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          placeholder="••••••••"
                          className="w-full px-3 py-2.5 rounded-lg bg-input border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={isVerifying}
                        className="w-full px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                      >
                        {isVerifying ? (
                          <>
                            <DotLottieLoader size={18} src={AUTH_DOT_LOTTIE_SRC} /> Authenticating...
                          </>
                        ) : (
                          'Sign In'
                        )}
                      </button>
                    </form>

                    <p className="text-center text-sm text-muted-foreground mt-4">
                      Don't have an account?{' '}
                      <Link to="/signup/student" className="text-primary hover:underline font-medium">
                        Sign up
                      </Link>
                    </p>
                  </motion.div>
                )}

                {step === 2 && (
                  <motion.div
                    key="step2"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    className="space-y-4 text-center"
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileChange}
                      accept="image/png,image/jpeg,image/webp"
                      className="hidden"
                    />

                    {!ocrResult ? (
                      <>
                        <div
                          onClick={() => fileInputRef.current?.click()}
                          className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center text-muted-foreground hover:bg-secondary/20 transition-colors cursor-pointer"
                        >
                          <UploadCloud className="h-10 w-10 mb-3 text-primary" />
                          <p className="text-sm font-medium text-foreground">
                            {selectedFile ? selectedFile.name : 'Click to select College ID Card'}
                          </p>
                          <p className="text-xs mt-1 text-muted-foreground">PNG, JPG, or WEBP (Max 5MB)</p>
                        </div>

                        <button
                          onClick={handleStep2}
                          disabled={isVerifying || !selectedFile}
                          className="w-full px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                          {isVerifying ? (
                            <>
                              <DotLottieLoader size={18} src={AUTH_DOT_LOTTIE_SRC} /> Scanning ID with Azure AI...
                            </>
                          ) : (
                            'Analyze & Submit ID Card'
                          )}
                        </button>
                      </>
                    ) : (
                      <div className="text-left space-y-4">
                        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                          <div className="flex items-center gap-2 text-emerald-500 font-semibold text-sm mb-2">
                            <CheckCircle2 className="h-4 w-4" />
                            Azure Document Intelligence OCR Completed
                          </div>
                          <div className="space-y-1.5 text-xs text-foreground">
                            {ocrResult.extractedData?.studentName && (
                              <p><span className="text-muted-foreground">Name:</span> {ocrResult.extractedData.studentName}</p>
                            )}
                            {ocrResult.extractedData?.rollNumber && (
                              <p><span className="text-muted-foreground">Roll No:</span> {ocrResult.extractedData.rollNumber}</p>
                            )}
                            {ocrResult.extractedData?.collegeName && (
                              <p><span className="text-muted-foreground">College:</span> {ocrResult.extractedData.collegeName}</p>
                            )}
                            {ocrResult.extractedData?.validUntil && (
                              <p><span className="text-muted-foreground">Valid Until:</span> {ocrResult.extractedData.validUntil}</p>
                            )}
                            <p><span className="text-muted-foreground">Verification Status:</span> <span className="capitalize font-medium text-primary">{ocrResult.status}</span></p>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setSelectedFile(null);
                              setOcrResult(null);
                            }}
                            className="flex-1 px-4 py-2.5 rounded-lg border border-border text-foreground text-sm hover:bg-secondary/50"
                          >
                            Re-upload
                          </button>
                          <button
                            onClick={() => navigate('/student/profile')}
                            className="flex-1 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 flex items-center justify-center gap-1.5"
                          >
                            Go to Profile <ArrowRight className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
          <AuthIllustration className="order-1 lg:order-2" />
        </div>
      </div>
    </div>
  );
}
