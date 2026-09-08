import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { useState } from 'react';
import { Menu, X, GraduationCap, LogOut, LayoutDashboard } from 'lucide-react';
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
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-border/60 bg-background/85 backdrop-blur-xl">
      <div className="container-main flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold text-lg md:text-xl cyber-heading">
          <GraduationCap className="h-6 w-6 md:h-7 md:w-7 text-primary" />
          <span className="gradient-text">CollegeVerse</span>
        </Link>

        <div className="hidden md:flex items-center gap-6">
          {publicLinks.map(l => (
            <Link key={l.href} to={l.href} className={`text-xs md:text-sm cyber-label transition-colors hover:text-primary ${location.pathname === l.href ? 'text-primary' : 'text-muted-foreground'}`}>
              {l.label}
            </Link>
          ))}
        </div>

        <div className="hidden md:flex items-center gap-3">
          {session ? (
            <>
              <button onClick={() => navigate(dashboardPath)} className="flex items-center gap-2 text-xs cyber-label text-muted-foreground hover:text-primary transition-colors">
                <LayoutDashboard className="h-4 w-4" /> Dashboard
              </button>
              <button onClick={() => { logout(); navigate('/'); }} className="flex items-center gap-2 text-xs cyber-label text-muted-foreground hover:text-destructive transition-colors">
                <LogOut className="h-4 w-4" /> Logout
              </button>
            </>
          ) : (
            <button onClick={() => navigate('/login')} className="px-5 py-2 border border-primary text-primary text-xs cyber-label hover:bg-primary hover:text-primary-foreground transition-all chamfer-sm glow-primary min-h-11">
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
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="md:hidden border-t border-border/60 bg-background/95 backdrop-blur-xl overflow-hidden">
            <div className="container-main py-4 space-y-3">
              {publicLinks.map(l => (
                <Link key={l.href} to={l.href} onClick={() => setOpen(false)} className="block text-xs cyber-label text-muted-foreground hover:text-primary py-1.5">
                  {l.label}
                </Link>
              ))}
              <div className="pt-3 border-t border-border/50">
                {session ? (
                  <>
                    <button onClick={() => { navigate(dashboardPath); setOpen(false); }} className="block w-full text-left text-xs cyber-label text-muted-foreground hover:text-primary py-1.5">Dashboard</button>
                    <button onClick={() => { logout(); navigate('/'); setOpen(false); }} className="block w-full text-left text-xs cyber-label text-destructive py-1.5">Logout</button>
                  </>
                ) : (
                  <button onClick={() => { navigate('/login'); setOpen(false); }} className="w-full px-5 py-2 border border-primary text-primary text-xs cyber-label chamfer-sm min-h-11">Login</button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
