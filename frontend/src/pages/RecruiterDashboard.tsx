import React, { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import {
  Briefcase,
  Search,
  Zap,
  ShieldCheck,
  CheckCircle2,
  Users,
  Award,
  ArrowRight,
  TrendingUp,
  Star,
  ExternalLink,
  Code2,
  Plus,
  Lock,
  Wallet
} from 'lucide-react';
import { api } from '@/lib/mockApi';

// Clean curated seeded candidates (High-signal top university talent)
const SEEDED_TOP_STUDENTS = [
  {
    id: 'student_aarav',
    name: 'Aarav Patel',
    college: 'GLA University, Mathura',
    degree: 'B.Tech Computer Science (2025)',
    avatar: 'AP',
    skills: ['Solidity', 'Foundry', 'Polygon', 'React', 'Node.js'],
    leetcodeRating: 1980,
    codeforcesRank: 'Expert (1640)',
    sbtVerified: true,
    bio: 'Smart contract security researcher & fullstack builder. Audited multiple DeFi protocols with 94%+ test coverage.',
  },
  {
    id: 'student_priya',
    name: 'Priya Sharma',
    college: 'IIT Delhi',
    degree: 'B.Tech Electrical & CS (2025)',
    avatar: 'PS',
    skills: ['Rust', 'Solidity', 'Go', 'Distributed Systems'],
    leetcodeRating: 2150,
    codeforcesRank: 'Candidate Master (1920)',
    sbtVerified: true,
    bio: 'Competitive programmer & EVM core developer. Built cross-chain liquidity routing and ZK verification circuits.',
  },
  {
    id: 'student_rohan',
    name: 'Rohan Verma',
    college: 'Delhi Technological University (DTU)',
    degree: 'B.Tech Information Technology (2025)',
    avatar: 'RV',
    skills: ['TypeScript', 'Next.js', 'PostgreSQL', 'Tailwind'],
    leetcodeRating: 1820,
    codeforcesRank: 'Specialist (1480)',
    sbtVerified: true,
    bio: 'Frontend architect with obsession for performance, optimistic UI updates, and accessibility.',
  },
];

// Recruiter's clean active gigs overview
const ACTIVE_GIGS_OVERVIEW = [
  {
    id: 'gig-defi-audit',
    title: 'Smart Contract Audit & Test Coverage for DeFi Escrow',
    category: 'Web3 & Blockchain',
    reward: 180,
    applicantsCount: 2,
    hasDeliverable: true,
  },
  {
    id: 'gig-react-dash',
    title: 'React + Tailwind Dashboard Component for Innovation Hub',
    category: 'Frontend Engineering',
    reward: 120,
    applicantsCount: 1,
    hasDeliverable: false,
  },
  {
    id: 'gig-llm-pipeline',
    title: 'LLM Resume Embeddings Pipeline with Vector Search',
    category: 'AI / Machine Learning',
    reward: 250,
    applicantsCount: 1,
    hasDeliverable: false,
  },
];

export default function RecruiterDashboard() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const companyName = (session?.user as any)?.company || 'Polygon Labs / Tech Hiring Partner';
  const recruiterName = session?.user?.name || (session?.user as any)?.email?.split('@')[0] || 'Technical Recruiter';

  const [shortlisted, setShortlisted] = useState<Record<string, boolean>>({});

  const handleShortlist = async (student: typeof SEEDED_TOP_STUDENTS[0]) => {
    setShortlisted((prev) => ({ ...prev, [student.id]: true }));

    await api.createNotification({
      userId: student.id,
      type: 'shortlist',
      title: `You were shortlisted by ${companyName}!`,
      body: `${recruiterName} from ${companyName} has shortlisted your profile for upcoming engineering openings.`,
    }).catch(() => null);

    toast.success(`⭐ ${student.name} added to your shortlisted candidates!`);
  };

  return (
    <DashboardLayout role="recruiter">
      <div className="container-main py-6 space-y-6 max-w-6xl mx-auto">
        {/* Banner */}
        <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-indigo-500/10 to-transparent p-6 md:p-8 backdrop-blur-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary font-mono">
                <Briefcase className="h-3.5 w-3.5" />
                Proof-of-Work Talent Acquisition
              </div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground font-mono">
                Welcome back, {recruiterName}
              </h1>
              <p className="text-muted-foreground text-xs leading-relaxed">
                {companyName} Talent Portal. Fast-track candidate hiring with zero screening on fake credentials. Hire students with Polygon Soulbound Tokens (SBTs) and rated micro-gig code deliverables.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                onClick={() => navigate('/recruiter/microgigs')}
                className="gap-2 shadow-sm bg-primary text-primary-foreground font-mono text-xs font-semibold"
              >
                <Zap className="h-4 w-4" /> Manage Micro-Gigs
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/recruiter/search')}
                className="gap-2 font-mono text-xs"
              >
                <Search className="h-4 w-4" /> Search Candidates
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/recruiter/wallet')}
                className="gap-2 font-mono text-xs border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
              >
                <Wallet className="h-4 w-4" /> Treasury & Wallet
              </Button>
            </div>
          </div>
        </div>

        {/* 4 Clean Real Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-card p-4 rounded-xl border border-border/80 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-mono">
              <span>My Active Micro-Gigs</span>
              <Zap className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-2xl font-black font-mono text-foreground">3 Posted</div>
            <div className="text-[11px] text-muted-foreground font-mono">
              Live on student portal
            </div>
          </div>

          <div className="glass-card p-4 rounded-xl border border-border/80 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-mono">
              <span>Student Applicants</span>
              <Users className="h-4 w-4 text-blue-400" />
            </div>
            <div className="text-2xl font-black font-mono text-blue-400">4 Candidates</div>
            <div className="text-[11px] text-muted-foreground font-mono">
              Applied across your gigs
            </div>
          </div>

          <div className="glass-card p-4 rounded-xl border border-border/80 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-mono">
              <span>Deliverables for Review</span>
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black font-mono text-emerald-400">1 Ready</div>
            <div className="text-[11px] text-emerald-500 font-mono">
              Code submitted for payout
            </div>
          </div>

          <div className="glass-card p-4 rounded-xl border border-border/80 space-y-1">
            <div className="flex items-center justify-between text-muted-foreground text-xs font-mono">
              <span>Corporate Treasury</span>
              <ShieldCheck className="h-4 w-4 text-primary" />
            </div>
            <div className="text-2xl font-black font-mono text-primary">$2,500 USDC</div>
            <div className="text-[11px] text-muted-foreground font-mono">
              Non-custodial smart escrow
            </div>
          </div>
        </div>

        {/* SECTION 1: MY ACTIVE POSTED GIGS & APPLICANTS PREVIEW */}
        <div className="glass-card p-6 rounded-2xl border border-border/80 space-y-4 bg-[#121620]/60">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div>
              <h2 className="text-base font-bold text-foreground font-mono flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" /> My Active Micro-Gigs & Candidate Applicants
              </h2>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">
                Overview of your open engineering bounties and current student applicants.
              </p>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate('/recruiter/microgigs')}
              className="text-xs font-mono gap-1.5"
            >
              View Full Command Center <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {ACTIVE_GIGS_OVERVIEW.map((gig) => (
              <div
                key={gig.id}
                className="p-4 rounded-xl bg-[#0A0D14] border border-border/60 flex flex-col justify-between space-y-3 hover:border-primary/40 transition-all cursor-pointer"
                onClick={() => navigate('/recruiter/microgigs')}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-muted-foreground">{gig.category}</span>
                    <span className="font-extrabold text-emerald-400">${gig.reward} USDC</span>
                  </div>
                  <h3 className="font-bold text-xs font-mono text-foreground line-clamp-2 leading-snug">
                    {gig.title}
                  </h3>
                </div>

                <div className="pt-2 border-t border-border/40 flex items-center justify-between">
                  <Badge
                    variant="secondary"
                    className={`font-mono text-[10px] ${
                      gig.hasDeliverable
                        ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                        : 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                    }`}
                  >
                    <Users className="h-3 w-3 mr-1" />
                    {gig.applicantsCount} Student{gig.applicantsCount !== 1 ? 's' : ''}
                    {gig.hasDeliverable && ' • ⚡ Ready'}
                  </Badge>

                  <span className="text-[11px] font-mono text-primary flex items-center gap-0.5 hover:underline">
                    Manage <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 2: TOP VERIFIED SEEDED CANDIDATES */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-foreground font-mono flex items-center gap-2">
                <Award className="h-4 w-4 text-primary" /> Top Verified University Candidates
              </h2>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">
                Curated high-signal engineering profiles with cryptographic Soulbound Token credentials.
              </p>
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate('/recruiter/search')}
              className="text-xs font-mono gap-1.5"
            >
              Explore All 1,800+ Candidates in Search <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {SEEDED_TOP_STUDENTS.map((st) => (
              <div
                key={st.id}
                className="glass-card p-5 rounded-2xl border border-border/80 flex flex-col justify-between space-y-4 shadow-sm bg-[#121620]/60 hover:border-primary/40 transition-all"
              >
                <div className="space-y-3">
                  {/* Avatar & Verification Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center font-bold text-primary font-mono text-sm">
                        {st.avatar}
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-foreground font-mono leading-tight">
                          {st.name}
                        </h3>
                        <span className="text-[11px] text-muted-foreground font-mono block">
                          {st.college}
                        </span>
                      </div>
                    </div>

                    <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono gap-1">
                      <ShieldCheck className="h-3 w-3" /> SBT Verified
                    </Badge>
                  </div>

                  {/* Bio */}
                  <p className="text-xs text-muted-foreground font-mono line-clamp-2 leading-relaxed">
                    {st.bio}
                  </p>

                  {/* Ratings */}
                  <div className="grid grid-cols-2 gap-2 p-2.5 rounded-lg bg-[#0A0D14] border border-border/60 text-xs font-mono">
                    <div>
                      <span className="text-[10px] text-muted-foreground block">LeetCode Rating</span>
                      <strong className="text-amber-400">{st.leetcodeRating}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Codeforces</span>
                      <strong className="text-blue-400">{st.codeforcesRank.split(' ')[0]}</strong>
                    </div>
                  </div>

                  {/* Skills tags */}
                  <div className="flex flex-wrap gap-1">
                    {st.skills.slice(0, 4).map((skill) => (
                      <span
                        key={skill}
                        className="px-2 py-0.5 rounded bg-[#1C2333] text-[10px] font-mono text-muted-foreground"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-3 border-t border-border/40 flex items-center justify-between gap-2">
                  <Button
                    size="sm"
                    variant={shortlisted[st.id] ? 'secondary' : 'outline'}
                    onClick={() => handleShortlist(st)}
                    className="font-mono text-xs h-8 flex-1 gap-1"
                  >
                    <Star className={`h-3 w-3 ${shortlisted[st.id] ? 'fill-amber-400 text-amber-400' : ''}`} />
                    {shortlisted[st.id] ? 'Shortlisted' : 'Shortlist'}
                  </Button>

                  <Button
                    size="sm"
                    onClick={() => navigate('/recruiter/search')}
                    className="bg-primary text-primary-foreground font-mono text-xs h-8 flex-1 gap-1"
                  >
                    View Profile
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
