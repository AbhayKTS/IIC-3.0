import { useNavigate } from 'react-router-dom';
import { GraduationCap, Users, Briefcase } from 'lucide-react';
import { motion } from 'framer-motion';
import Navbar from '@/components/layout/Navbar';

export default function Login() {
  const navigate = useNavigate();
  const roles = [
    { label: 'Student', desc: 'Access your college portal, events, gigs & more', icon: <GraduationCap className="h-8 w-8" />, href: '/login/student', color: 'text-primary' },
    { label: 'College Faculty', desc: 'Manage students, events, and analytics', icon: <Users className="h-8 w-8" />, href: '/login/college', color: 'text-violet' },
    { label: 'Recruiter', desc: 'Find verified talent and post microgigs', icon: <Briefcase className="h-8 w-8" />, href: '/login/recruiter', color: 'text-cyan' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="container-main pt-32 pb-20">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="max-w-lg mx-auto text-center mb-10">
          <h1 className="text-3xl font-bold gradient-text mb-3">Welcome Back</h1>
          <p className="text-muted-foreground">Select your role to continue</p>
        </motion.div>
        <div className="max-w-lg mx-auto space-y-4">
          {roles.map((r, i) => (
            <motion.button key={r.label} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
              onClick={() => navigate(r.href)}
              className="w-full glass-card-hover p-5 flex items-center gap-4 text-left">
              <div className={`${r.color}`}>{r.icon}</div>
              <div>
                <h3 className="font-semibold text-foreground">{r.label}</h3>
                <p className="text-sm text-muted-foreground">{r.desc}</p>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
