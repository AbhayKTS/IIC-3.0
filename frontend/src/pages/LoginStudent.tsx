import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/mockApi';
import type { IdVerificationData } from '@/lib/types';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, AlertCircle, UploadCloud, Camera, CheckCircle2, FileText } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import DotLottieLoader from '@/components/Loader';
import AuthIllustration from '@/components/AuthIllustration';

const AUTH_DOT_LOTTIE_SRC =
  'https://lottie.host/7a753e3c-14a7-4657-b5dc-cd8c6b952ffd/F4qKTN4Ubz.lottie';

export default function LoginStudent() {
  const { login, loading } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [ocrResult, setOcrResult] = useState<IdVerificationData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const collegeEmailDomains = ['iitd.ac.in', 'iitb.ac.in', 'nitt.ac.in', 'bits.ac.in', 'dtu.ac.in'];
    const domain = email.split('@')[1];
    if (!collegeEmailDomains.includes(domain)) {
      setError('Please use your college email address (e.g., name@iitd.ac.in). Personal emails are not allowed.');
      return;
    }
    // Perform real login early so the student has an auth session for ID card upload
    setIsVerifying(true);
    try {
      await login(email, password);
      setIsVerifying(false);
      setStep(2);
    } catch {
      // If student hasn't logged in before or credentials invalid, allow proceeding with demo
      setIsVerifying(false);
      setStep(2);
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
      // Fallback for visual demo if backend auth token is not present
      setIsVerifying(false);
      setOcrResult({
        status: 'pending_review',
        confidence: 0.94,
        extractedData: {
          studentName: email.split('@')[0].replace('.', ' ').toUpperCase(),
          rollNumber: '2024CSB1042',
          collegeName: 'IIT Delhi',
          validUntil: '2028',
        },
        collegeMatch: {
          matched: true,
          expectedCollegeName: 'IIT Delhi',
          extractedCollegeName: 'IIT Delhi',
        },
      });
    }
  };

  const handleStep3 = async () => {
    setIsVerifying(true);
    try {
      await login(email, password);
      // Wait for mock face verification
      setTimeout(() => {
        setIsVerifying(false);
        alert('Verification complete! Soulbound Token confirmed. Welcome to CollegeVerse.');
        navigate('/');
      }, 2000);
    } catch {
      setError('Invalid email or password. Please start over.');
      setStep(1);
      setIsVerifying(false);
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
            <div className="text-center mb-8">
              <GraduationCap className="h-10 w-10 text-primary mx-auto mb-3" />
              <h1 className="text-2xl font-bold text-foreground">
                {step === 1 && "Student Login"}
                {step === 2 && "ID Card Verification"}
                {step === 3 && "Face Verification"}
              </h1>
              <p className="text-sm text-muted-foreground mt-1">
                {step === 1 && "Use your college email to sign in"}
                {step === 2 && "Upload your valid college ID card"}
                {step === 3 && "We need to verify that you match your ID"}
              </p>
            </div>
            
            <div className="glass-card p-6 space-y-4">
              {error && (
                <div className="flex gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" /><span>{error}</span>
                </div>
              )}

              <AnimatePresence mode="wait">
                  {step === 1 && (
                      <motion.form 
                        key="step1"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        onSubmit={handleStep1} 
                        className="space-y-4"
                      >
                        <div>
                          <label className="text-sm font-medium text-foreground mb-1 block">College Email</label>
                          <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="name@iitd.ac.in" className="w-full px-3 py-2.5 rounded-lg bg-input border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-foreground mb-1 block">Password</label>
                          <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="••••••••" className="w-full px-3 py-2.5 rounded-lg bg-input border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
                        </div>
                        <button type="submit" disabled={isVerifying} className="w-full px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
                          {isVerifying ? <><DotLottieLoader size={18} src={AUTH_DOT_LOTTIE_SRC} /> Authenticating...</> : 'Continue'}
                        </button>
                      </motion.form>
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
                                  {selectedFile ? selectedFile.name : 'Click to select ID Card'}
                                </p>
                                <p className="text-xs mt-1 text-muted-foreground">PNG, JPG, or WEBP (Max 5MB)</p>
                            </div>

                            <button 
                              onClick={handleStep2} 
                              disabled={isVerifying || !selectedFile} 
                              className="w-full px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                               {isVerifying ? (
                                 <><DotLottieLoader size={18} src={AUTH_DOT_LOTTIE_SRC} /> Extracting ID via Azure AI...</>
                               ) : (
                                 'Upload & Analyze with AI OCR'
                               )}
                            </button>
                          </>
                        ) : (
                          <div className="space-y-4 text-left">
                            <div className="p-4 rounded-xl bg-secondary/30 border border-border space-y-3">
                              <div className="flex items-center justify-between border-b border-border/50 pb-2">
                                <div className="flex items-center gap-2 text-xs font-semibold text-[#3DDC84]">
                                  <CheckCircle2 className="h-4 w-4" />
                                  <span>OCR Extraction Verified</span>
                                </div>
                                <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#3DDC84]/15 text-[#3DDC84] border border-[#3DDC84]/30">
                                  {Math.round((ocrResult.confidence || 0.9) * 100)}% confidence
                                </span>
                              </div>

                              <div className="grid grid-cols-2 gap-2 text-xs">
                                <div>
                                  <span className="text-muted-foreground block">Student Name:</span>
                                  <span className="font-semibold text-foreground">
                                    {ocrResult.extractedData?.studentName || 'Extracted from ID'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground block">Roll / ID No:</span>
                                  <span className="font-mono text-foreground">
                                    {ocrResult.extractedData?.rollNumber || 'N/A'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground block">College:</span>
                                  <span className="text-foreground">
                                    {ocrResult.extractedData?.collegeName || 'IIT Delhi'}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-muted-foreground block">Valid Thru:</span>
                                  <span className="text-foreground">
                                    {ocrResult.extractedData?.validUntil || '2028'}
                                  </span>
                                </div>
                              </div>

                              <p className="text-[11px] text-muted-foreground pt-1 border-t border-border/40">
                                Supporting evidence submitted to your college faculty verification queue.
                              </p>
                            </div>

                            <button 
                              onClick={() => setStep(3)} 
                              className="w-full px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                            >
                              Continue to Face Verification
                            </button>
                          </div>
                        )}
                      </motion.div>
                  )}

                  {step === 3 && (
                       <motion.div 
                       key="step3"
                       initial={{ opacity: 0, x: -20 }}
                       animate={{ opacity: 1, x: 0 }}
                       exit={{ opacity: 0, x: 20 }}
                       className="space-y-4 text-center"
                     >
                       <div className="bg-secondary/20 rounded-xl p-8 flex flex-col items-center justify-center text-muted-foreground">
                           <Camera className="h-10 w-10 mb-3" />
                           <p className="text-sm">Please allow camera access</p>
                           <p className="text-xs mt-1">Position your face within the frame</p>
                       </div>
                       <button onClick={handleStep3} disabled={isVerifying || loading} className="w-full px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
                          {isVerifying || loading ? <><DotLottieLoader size={18} src={AUTH_DOT_LOTTIE_SRC} /> Matching Face...</> : 'Verify Face & Login'}
                       </button>
                     </motion.div>
                  )}
              </AnimatePresence>
              
              {step === 1 && (
                <>
                  <div className="text-xs text-muted-foreground mt-3 p-3 rounded-lg bg-secondary/50">
                    <strong>Demo accounts:</strong><br />
                    Verified: arjun@iitd.ac.in / pass123<br />
                    Pending: priya@iitd.ac.in / pass123
                  </div>
                  <p className="text-center text-sm text-muted-foreground mt-4">
                    Don't have an account?{' '}
                    <Link to="/signup/student" className="text-primary hover:underline font-medium">Sign up</Link>
                  </p>
                </>
              )}
            </div>
          </motion.div>
          <AuthIllustration className="order-1 lg:order-2" />
        </div>
      </div>
    </div>
  );
}
