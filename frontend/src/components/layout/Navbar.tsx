import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useState } from 'react';
import { Menu, X, ShieldCheck, LogOut, LayoutDashboard } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Navbar() {
  const { session, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  const isPortal = location.pathname.startsWith('/student') || location.pathname.startsWith('/college') || location.pathname.startsWith('/recruiter');

  const publicLinks = [
    { label: 'Colleges', href: '/colleges' },
    { label: 'Leaderboard', href: '/leaderboard' },
    { label: 'MicroGigs', href: '/microgigs' },
    { label: 'Marketplace', href: '/marketplace' },
    { label: 'Explore', href: '/explore' },
    { label: 'About', href: '/about' },
  ];

  const dashboardPath = session?.role === 'student' ? '/student/dashboard' : session?.role === 'faculty' ? '/college/dashboard' : '/recruiter/dashboard';

  if (isPortal) return null;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border bg-background/80 backdrop-blur-xl">
      <div className="container-main flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg md:text-xl" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
          <ShieldCheck className="h-6 w-6 md:h-7 md:w-7 text-primary" />
          <span>Almadox</span>
        </Link>

        {/* Center Navigation - Pill shaped background for active */}
        <div className="hidden md:flex items-center gap-1 p-1 rounded-full border border-line bg-surface/50 backdrop-blur-md">
          {publicLinks.map(l => {
            const isActive = location.pathname === l.href;
            return (
              <Link 
                key={l.href} 
                to={l.href} 
                className={`px-4 py-1.5 rounded-full text-xs font-medium transition-all ${isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground hover:bg-secondary/50'}`}
                style={{ fontFamily: '"JetBrains Mono", monospace' }}
              >
                {l.label}
              </Link>
            );
          })}
        </div>

        {/* Right Nav CTAs */}
        <div className="hidden md:flex items-center gap-3">
          {session ? (
            <>
              <button onClick={() => navigate(dashboardPath)} className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-primary transition-colors" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                <LayoutDashboard className="h-4 w-4" /> Dashboard
              </button>
              <button onClick={() => { logout(); navigate('/'); }} className="flex items-center gap-2 text-xs font-medium text-muted-foreground hover:text-destructive transition-colors" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                <LogOut className="h-4 w-4" /> Logout
              </button>
            </>
          ) : (
            <button onClick={() => navigate('/login')} className="btn-primary !rounded-full">
              Login
            </button>
          )}
        </div>

        <button className="md:hidden text-foreground" onClick={() => setOpen(!open)}>
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="md:hidden border-t border-border bg-background/95 backdrop-blur-xl overflow-hidden">
            <div className="container-main py-4 space-y-3">
              {publicLinks.map(l => (
                <Link key={l.href} to={l.href} onClick={() => setOpen(false)} className="block text-sm text-muted-foreground hover:text-primary py-1.5" style={{ fontFamily: '"JetBrains Mono", monospace' }}>
                  {l.label}
                </Link>
              ))}
              <div className="pt-3 border-t border-border">
                {session ? (
                  <>
                    <button onClick={() => { navigate(dashboardPath); setOpen(false); }} className="block w-full text-left text-sm text-muted-foreground hover:text-primary py-1.5" style={{ fontFamily: '"JetBrains Mono", monospace' }}>Dashboard</button>
                    <button onClick={() => { logout(); navigate('/'); setOpen(false); }} className="block w-full text-left text-sm text-destructive py-1.5" style={{ fontFamily: '"JetBrains Mono", monospace' }}>Logout</button>
                  </>
                ) : (
                  <button onClick={() => { navigate('/login'); setOpen(false); }} className="w-full btn-primary !rounded-full mt-2">Login</button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
