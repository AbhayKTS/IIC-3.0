import { useNavigate } from 'react-router-dom';
import { GraduationCap, Users, Briefcase, Sparkles, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';
import Navbar from '@/components/layout/Navbar';
import { useAuth } from '@/lib/auth';
import { toast } from 'sonner';

export default function Login() {
  const navigate = useNavigate();
  const { loginDemo } = useAuth();

  const roles = [
    {
      label: 'Student',
      desc: 'Access your college portal, events, gigs & more',
      icon: <GraduationCap className="h-8 w-8" />,
      href: '/login/student',
      color: 'text-primary',
      demoUser: 'Arjun Sharma (IIT Delhi)',
    },
    {
      label: 'College Faculty',
      desc: 'Manage university profile, verification & roster',
      icon: <Users className="h-8 w-8" />,
      href: '/login/college',
      color: 'text-violet',
      demoUser: 'Prof. Rajesh Gupta (IIT Delhi)',
    },
    {
      label: 'Recruiter',
      desc: 'Find verified talent and post micro-gigs',
      icon: <Briefcase className="h-8 w-8" />,
      href: '/login/recruiter',
      color: 'text-cyan',
      demoUser: 'Vikram Mehta (TechCorp Labs)',
    },
  ];

  const handleOneClickDemo = async (email: string, targetPath: string, name: string) => {
    try {
      await loginDemo(email);
      toast.success(`Logged in as demo ${name}!`);
      navigate(targetPath);
    } catch (err: any) {
      toast.error('Demo login failed');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container-main pt-28 pb-20 max-w-xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-semibold mb-3">
            <Sparkles className="h-3.5 w-3.5" />
            Instant Exploration Mode
          </span>
          <h1 className="text-3xl font-extrabold text-foreground tracking-tight mb-2">Welcome Back</h1>
          <p className="text-muted-foreground text-sm">Select your role or click any demo account below to explore immediately.</p>
        </motion.div>

        {/* 1-Click Fast Access Panel */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 mb-6 rounded-2xl bg-gradient-to-r from-primary/10 via-violet-500/10 to-cyan/10 border border-primary/20 space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-foreground font-mono flex items-center gap-1.5">
              ⚡ FAST DEMO JUMP:
            </span>
            <span className="text-[10px] text-muted-foreground font-mono">1-click direct explore</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              onClick={() => handleOneClickDemo('rajesh@iitd.ac.in', '/college/dashboard', 'Faculty')}
              className="flex items-center justify-between p-3 rounded-xl bg-violet-500/10 border border-violet-500/20 hover:bg-violet-500/20 text-left transition-all group"
            >
              <div>
                <div className="text-xs font-bold text-violet-400">🏛️ College Faculty</div>
                <div className="text-[11px] text-muted-foreground font-mono">IIT Delhi • Prof. Rajesh</div>
              </div>
              <ArrowRight className="h-4 w-4 text-violet-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>

            <button
              onClick={() => handleOneClickDemo('vikram@techcorp.com', '/recruiter/dashboard', 'Recruiter')}
              className="flex items-center justify-between p-3 rounded-xl bg-cyan/10 border border-cyan/20 hover:bg-cyan/20 text-left transition-all group"
            >
              <div>
                <div className="text-xs font-bold text-cyan">💼 Recruiter</div>
                <div className="text-[11px] text-muted-foreground font-mono">TechCorp • Vikram Mehta</div>
              </div>
              <ArrowRight className="h-4 w-4 text-cyan opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </div>
        </motion.div>

        {/* Standard Role Selector */}
        <div className="space-y-3">
          {roles.map((r, i) => (
            <motion.button
              key={r.label}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1 }}
              onClick={() => navigate(r.href)}
              className="w-full glass-card-hover p-4 rounded-2xl flex items-center justify-between text-left group"
            >
              <div className="flex items-center gap-4">
                <div className={`${r.color}`}>{r.icon}</div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-foreground text-sm">{r.label}</h3>
                    <span className="text-[10px] font-mono text-muted-foreground bg-secondary px-2 py-0.5 rounded">
                      Demo: {r.demoUser}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{r.desc}</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
