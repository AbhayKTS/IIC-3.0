import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { motion, AnimatePresence } from 'framer-motion';
import { GraduationCap, AlertCircle, UploadCloud, Camera } from 'lucide-react';
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

  const handleStep1 = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const collegeEmailDomains = ['iitd.ac.in', 'iitb.ac.in', 'nitt.ac.in', 'bits.ac.in', 'dtu.ac.in'];
    const domain = email.split('@')[1];
    if (!collegeEmailDomains.includes(domain)) {
      setError('Please use your college email address (e.g., name@iitd.ac.in). Personal emails are not allowed.');
      return;
    }
    // Simulate initial login verification
    setIsVerifying(true);
    setTimeout(() => {
        setIsVerifying(false);
        setStep(2);
    }, 1500);
  };

  const handleStep2 = () => {
    setIsVerifying(true);
    setTimeout(() => {
        setIsVerifying(false);
        setStep(3);
    }, 1500);
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
                        <div className="border-2 border-dashed border-border rounded-xl p-8 flex flex-col items-center justify-center text-muted-foreground hover:bg-secondary/20 transition-colors cursor-pointer">
                            <UploadCloud className="h-10 w-10 mb-3" />
                            <p className="text-sm">Click to upload or drag and drop</p>
                            <p className="text-xs mt-1">SVG, PNG, JPG or GIF</p>
                        </div>
                        <button onClick={handleStep2} disabled={isVerifying} className="w-full px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
                           {isVerifying ? <><DotLottieLoader size={18} src={AUTH_DOT_LOTTIE_SRC} /> Verifying ID...</> : 'Upload and Verify ID'}
                        </button>
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
