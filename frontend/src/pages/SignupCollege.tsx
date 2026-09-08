import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/mockApi';
import type { College } from '@/lib/types';
import { motion } from 'framer-motion';
import { Users, AlertCircle, Building, Mail, Lock, User, MapPin, BookOpen, ArrowRight } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import AuthIllustration from '@/components/AuthIllustration';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function SignupCollege() {
  const { signup, loginWithGoogle, loading } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [collegeName, setCollegeName] = useState('GLA University');
  const [collegeLocation, setCollegeLocation] = useState('Mathura, Uttar Pradesh');
  const [department, setDepartment] = useState('Computer Science & Engineering');
  const [existingColleges, setExistingColleges] = useState<College[]>([]);

  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    api.getColleges()
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setExistingColleges(data);
        }
      })
      .catch(() => null);
  }, []);

  const handleManualSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!name || !email || !password || !collegeName) {
      setError('Please fill in all required fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      // Find if collegeId matches any existing college
      const matched = existingColleges.find(
        (c) => c.name.toLowerCase() === collegeName.toLowerCase()
      );

      await signup({
        email,
        password,
        role: 'faculty',
        name,
        collegeId: matched?.id,
        collegeName,
        collegeLocation,
        department,
      });

      navigate('/college/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Registration failed. Please verify your details.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignup = async () => {
    setError('');
    try {
      await loginWithGoogle('faculty');
      navigate('/college/dashboard');
    } catch (err: any) {
      setError(err?.message || 'Google signup failed. Ensure you use an authorized college email.');
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
            className="order-2 lg:order-1 w-full max-w-lg mx-auto lg:mx-0"
          >
            <div className="text-center lg:text-left mb-6">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-violet-500/10 text-violet-400 border border-violet-500/20 text-xs font-semibold mb-3">
                <Users className="h-3.5 w-3.5" />
                Faculty Administrator Onboarding
              </span>
              <h1 className="text-2xl lg:text-3xl font-extrabold text-foreground">Register Institutional Account</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Enter your university information to set up identity governance and real-time syncing.
              </p>
            </div>

            <div className="glass-card p-6 md:p-8 space-y-5 rounded-2xl border border-border shadow-xl">
              {error && (
                <div className="flex gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                  <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {/* Manual Form */}
              <form onSubmit={handleManualSignup} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">Faculty Full Name</label>
                    <div className="relative">
                      <User className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Dr. Rajesh Kumar"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className="pl-9 h-9 text-xs bg-secondary/20"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">Official Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        type="email"
                        placeholder="rajesh@gla.ac.in"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="pl-9 h-9 text-xs bg-secondary/20 font-mono"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Account Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="password"
                      placeholder="Minimum 6 characters"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-9 h-9 text-xs bg-secondary/20"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">College / University</label>
                    <div className="relative">
                      <Building className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="e.g. GLA University, IIT Delhi"
                        value={collegeName}
                        onChange={(e) => setCollegeName(e.target.value)}
                        className="pl-9 h-9 text-xs bg-secondary/20"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-semibold text-foreground">Department / School</label>
                    <div className="relative">
                      <BookOpen className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Computer Science & Engineering"
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        className="pl-9 h-9 text-xs bg-secondary/20"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-foreground">Campus Location</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="e.g. Mathura, Uttar Pradesh"
                      value={collegeLocation}
                      onChange={(e) => setCollegeLocation(e.target.value)}
                      className="pl-9 h-9 text-xs bg-secondary/20"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading || isSubmitting}
                  className="w-full h-10 gap-2 bg-primary text-primary-foreground font-semibold text-xs shadow-md mt-2"
                >
                  {isSubmitting ? 'Registering...' : 'Register Institutional Profile'}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </form>

              {/* Divider */}
              <div className="relative flex items-center justify-center">
                <div className="border-t border-border w-full"></div>
                <span className="bg-card px-3 text-[11px] text-muted-foreground uppercase font-mono">Or SSO</span>
              </div>

              {/* Google Signup Button */}
              <button
                type="button"
                onClick={handleGoogleSignup}
                disabled={loading || isSubmitting}
                className="w-full py-2.5 px-4 rounded-xl border border-border bg-card hover:bg-muted/50 text-foreground font-semibold text-xs flex items-center justify-center gap-3 transition-colors shadow-sm disabled:opacity-50"
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
                <span>Continue with Institutional Google Account</span>
              </button>

              <p className="text-center text-xs text-muted-foreground pt-1">
                Already registered your institution?{' '}
                <Link to="/login/college" className="text-primary hover:underline font-semibold">
                  Sign in here
                </Link>
              </p>
            </div>
          </motion.div>
          <AuthIllustration className="order-1 lg:order-2" />
        </div>
      </div>
    </div>
  );
}
