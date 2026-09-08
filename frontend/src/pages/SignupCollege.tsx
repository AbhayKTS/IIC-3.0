import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { motion } from 'framer-motion';
import { Users, AlertCircle } from 'lucide-react';
import Navbar from '@/components/layout/Navbar';
import DotLottieLoader from '@/components/Loader';
import AuthIllustration from '@/components/AuthIllustration';

const AUTH_DOT_LOTTIE_SRC =
  'https://lottie.host/7a753e3c-14a7-4657-b5dc-cd8c6b952ffd/F4qKTN4Ubz.lottie';

export default function SignupCollege() {
  const { signup, loading } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    try {
      await signup({ email, password, role: 'faculty', name, department });
      navigate('/college/dashboard');
    } catch (err: any) {
      const msg = err?.message || '';
      if (msg.includes('email-already-in-use')) {
        setError('An account with this email already exists. Try logging in.');
      } else {
        setError(msg || 'Signup failed. Please try again.');
      }
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
            <Users className="h-10 w-10 text-violet mx-auto mb-3" />
            <h1 className="text-2xl font-bold text-foreground">Faculty Sign Up</h1>
            <p className="text-sm text-muted-foreground mt-1">Register as a faculty administrator</p>
          </div>
          <form onSubmit={handleSubmit} className="glass-card p-6 space-y-4">
            {error && (
              <div className="flex gap-2 p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" /><span>{error}</span>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Full Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} required placeholder="Dr. Rajesh Kumar" className="w-full px-3 py-2.5 rounded-lg bg-input border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Email</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} required placeholder="name@college.ac.in" className="w-full px-3 py-2.5 rounded-lg bg-input border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Department</label>
              <input type="text" value={department} onChange={e => setDepartment(e.target.value)} required placeholder="Computer Science" className="w-full px-3 py-2.5 rounded-lg bg-input border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} required placeholder="Min 6 characters" className="w-full px-3 py-2.5 rounded-lg bg-input border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <div>
              <label className="text-sm font-medium text-foreground mb-1 block">Confirm Password</label>
              <input type="password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required placeholder="••••••••" className="w-full px-3 py-2.5 rounded-lg bg-input border border-border text-foreground text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50" />
            </div>
            <button type="submit" disabled={loading} className="w-full px-4 py-2.5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? <><DotLottieLoader size={18} src={AUTH_DOT_LOTTIE_SRC} /> Creating account...</> : 'Create Account'}
            </button>
            <p className="text-center text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link to="/login/college" className="text-primary hover:underline font-medium">Sign in</Link>
            </p>
          </form>
          </motion.div>
          <AuthIllustration className="order-1 lg:order-2" />
        </div>
      </div>
    </div>
  );
}
