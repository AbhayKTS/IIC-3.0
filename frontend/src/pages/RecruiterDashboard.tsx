import React from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import RealtimeStudentRoster from '@/components/RealtimeStudentRoster';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import {
  Briefcase,
  Search,
  ListChecks,
  Zap,
  ShieldCheck,
  CheckCircle2,
  Users,
  Award,
  ArrowRight,
  Sparkles,
  TrendingUp,
} from 'lucide-react';

export default function RecruiterDashboard() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const companyName = (session?.user as any)?.company || 'Polygon Labs / Tech Hiring Partner';
  const recruiterName = session?.user?.name || (session?.user as any)?.email?.split('@')[0] || 'Technical Recruiter';

  return (
    <DashboardLayout role="recruiter">
      <div className="container-main py-6 space-y-6">
        {/* Banner */}
        <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-indigo-500/10 to-transparent p-6 md:p-8 backdrop-blur-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <Briefcase className="h-3.5 w-3.5" />
                Proof-of-Work Talent Acquisition
              </div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                Welcome, {recruiterName}
              </h1>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {companyName} Talent Portal. Fast-track candidate hiring with zero screening on fake credentials. Hire students with Polygon Soulbound Tokens (SBTs) and rated micro-gig code.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={() => navigate('/recruiter/profile')} className="gap-2 shadow-sm bg-primary text-primary-foreground">
                <Briefcase className="h-4 w-4" /> Company Profile
              </Button>
              <Button variant="outline" onClick={() => navigate('/recruiter/search')} className="gap-2">
                <Search className="h-4 w-4" /> Discover Talent
              </Button>
              <Button variant="outline" onClick={() => navigate('/recruiter/microgigs')} className="gap-2">
                <Zap className="h-4 w-4" /> Post Micro-Gig
              </Button>
            </div>
          </div>
        </div>

        {/* 4 Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-card p-5 rounded-2xl border border-border/80 space-y-2">
            <div className="flex items-center justify-between text-muted-foreground text-xs">
              <span>Verified Talent Pool</span>
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-black text-foreground">1,840+ Students</div>
            <div className="text-[11px] text-emerald-500 font-medium flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> 100% SBT Cryptographically Verified
            </div>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-border/80 space-y-2">
            <div className="flex items-center justify-between text-muted-foreground text-xs">
              <span>Shortlisted Candidates</span>
              <ListChecks className="h-4 w-4 text-primary" />
            </div>
            <div className="text-2xl font-black text-primary">12 Shortlisted</div>
            <div className="text-[11px] text-muted-foreground font-medium">
              Average Skill-Fit Match: 92%
            </div>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-border/80 space-y-2">
            <div className="flex items-center justify-between text-muted-foreground text-xs">
              <span>Active Micro-Gigs</span>
              <Zap className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-2xl font-black text-amber-500">4 Gigs Running</div>
            <div className="text-[11px] text-muted-foreground font-medium">
              7 student submissions ready for rating
            </div>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-border/80 space-y-2">
            <div className="flex items-center justify-between text-muted-foreground text-xs">
              <span>Screening Speedup</span>
              <TrendingUp className="h-4 w-4 text-violet-400" />
            </div>
            <div className="text-2xl font-black text-violet-400">Near-Zero Hours</div>
            <div className="text-[11px] text-emerald-500 font-medium">
              No manual degree/marksheet checks required
            </div>
          </div>
        </div>

        {/* 2 Core Action Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Card 1 */}
          <div className="glass-card p-6 rounded-2xl border border-border/80 space-y-4 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                  <Search className="h-5 w-5 text-primary" /> AI Candidate Matching Engine
                </h3>
                <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                  Live Skill Graphs
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Filter prospective engineering hires by actual proof-of-work: LeetCode contest rating, Codeforces rank, GitHub commits, and Soulbound Tokens minted by universities.
              </p>
            </div>

            <Button onClick={() => navigate('/recruiter/search')} className="w-full justify-between group">
              <span>Launch Candidate Search</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>

          {/* Card 2 */}
          <div className="glass-card p-6 rounded-2xl border border-border/80 space-y-4 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                  <Zap className="h-5 w-5 text-amber-500" /> Manage Micro-Gigs & Deliverables
                </h3>
                <Badge className="bg-amber-500/10 text-amber-500 text-xs">
                  Escrow Settlement
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Post short engineering bounties in USDC/INR. Test student capabilities with real codebase tasks, assign 5-star ratings, and release on-chain settlement upon review.
              </p>
            </div>

            <Button
              variant="outline"
              onClick={() => navigate('/recruiter/microgigs')}
              className="w-full justify-between group"
            >
              <span>Review Submissions & Rate Work</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>
        </div>

        {/* Real-time Student Candidates Roster (Live Firestore) */}
        <RealtimeStudentRoster role="recruiter" />
      </div>
    </DashboardLayout>
  );
}
