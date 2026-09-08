import React, { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/mockApi';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  Search,
  ShieldCheck,
  Award,
  Sparkles,
  ExternalLink,
  Plus,
  CheckCircle2,
  Building,
  Filter,
  Star,
  Zap,
} from 'lucide-react';

interface Candidate {
  id: string;
  name: string;
  college: string;
  avatar: string;
  roleTitle: string;
  matchScore: number;
  skills: string[];
  leetcodeRating: number;
  codeforcesRating: number;
  githubCommits: number;
  sbtCount: number;
  sbtBadges: string[];
  rating: number;
}

const SEED_CANDIDATES: Candidate[] = [
  {
    id: 's1',
    name: 'Ansh Sharma',
    college: 'GLA University',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    roleTitle: 'Fullstack & Smart Contract Architect',
    matchScore: 97,
    skills: ['Solidity', 'Foundry', 'TypeScript', 'Next.js', 'Azure AI', 'Polygon'],
    leetcodeRating: 2150,
    codeforcesRating: 1980,
    githubCommits: 480,
    sbtCount: 4,
    sbtBadges: ['IIC 3.0 Finalist', 'Polygon Core Contributor', 'GLA Verified ID'],
    rating: 5.0,
  },
  {
    id: 's2',
    name: 'Priya Narang',
    college: 'Manipal University Jaipur',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    roleTitle: 'AI Research & Vector Database Engineer',
    matchScore: 93,
    skills: ['Python', 'FastAPI', 'PyTorch', 'Vector DB', 'OpenAI API', 'Docker'],
    leetcodeRating: 2090,
    codeforcesRating: 1890,
    githubCommits: 520,
    sbtCount: 3,
    sbtBadges: ['MUJ Hackathon Winner', 'Top ML Contributor'],
    rating: 4.9,
  },
  {
    id: 's3',
    name: 'Rohan Deshmukh',
    college: 'IIT Delhi',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    roleTitle: 'Distributed Systems & Go Developer',
    matchScore: 89,
    skills: ['Go', 'Kafka', 'PostgreSQL', 'Kubernetes', 'gRPC'],
    leetcodeRating: 2040,
    codeforcesRating: 1920,
    githubCommits: 390,
    sbtCount: 3,
    sbtBadges: ['IITD Verified ID', 'Open Source Fellow'],
    rating: 4.8,
  },
];

export default function RecruiterSearch() {
  const { session } = useAuth();
  const recruiterId = session?.userId || 'recruiter';

  const [candidates, setCandidates] = useState<Candidate[]>(SEED_CANDIDATES);
  const [search, setSearch] = useState('');
  const [selectedSkill, setSelectedSkill] = useState('all');
  const [shortlistedIds, setShortlistedIds] = useState<Set<string>>(new Set(['s1']));
  const [activeCandidate, setActiveCandidate] = useState<Candidate | null>(null);
  const [profileModalOpen, setProfileModalOpen] = useState(false);

  const handleShortlist = async (candidate: Candidate) => {
    try {
      await api.addToShortlist({
        studentId: candidate.id,
        recruiterId,
        notes: `Shortlisted for ${candidate.roleTitle} (Skill match: ${candidate.matchScore}%)`,
        addedAt: new Date().toISOString(),
      }).catch(() => null);

      setShortlistedIds((prev) => new Set([...prev, candidate.id]));
      toast.success(`${candidate.name} added to your recruitment shortlist!`);
    } catch {
      toast.error('Could not shortlist candidate');
    }
  };

  const skillsList = ['all', 'Solidity', 'Foundry', 'Next.js', 'Python', 'Vector DB', 'Go', 'Kafka'];

  const filtered = candidates.filter((c) => {
    const matchesSkill = selectedSkill === 'all' || c.skills.includes(selectedSkill);
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.college.toLowerCase().includes(search.toLowerCase()) ||
      c.roleTitle.toLowerCase().includes(search.toLowerCase()) ||
      c.skills.some((s) => s.toLowerCase().includes(search.toLowerCase()));
    return matchesSkill && matchesSearch;
  });

  return (
    <DashboardLayout role="recruiter">
      <div className="container-main py-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Search className="h-6 w-6 text-primary" /> Discover Verified Student Talent
            </h1>
            <p className="text-xs text-muted-foreground">
              Instant candidate shortlisting backed by live LeetCode/GitHub stats and Polygon Soulbound Token credentials.
            </p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search skill, candidate, or university..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
        </div>

        {/* Skill Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {skillsList.map((skill) => (
            <button
              key={skill}
              onClick={() => setSelectedSkill(skill)}
              className={`text-xs px-3.5 py-1.5 rounded-full border transition-all capitalize ${
                selectedSkill === skill
                  ? 'border-primary bg-primary/10 text-primary font-semibold'
                  : 'border-border/60 text-muted-foreground hover:bg-secondary/40'
              }`}
            >
              {skill}
            </button>
          ))}
        </div>

        {/* Candidate Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((c) => {
            const isShortlisted = shortlistedIds.has(c.id);
            return (
              <div
                key={c.id}
                className="glass-card p-6 rounded-2xl border border-border/80 flex flex-col justify-between space-y-4 shadow-sm hover:border-primary/40 transition-all group"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <img
                        src={c.avatar}
                        alt={c.name}
                        className="h-12 w-12 rounded-full object-cover border-2 border-primary/20"
                      />
                      <div>
                        <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors">
                          {c.name}
                        </h3>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <Building className="h-3 w-3" /> {c.college}
                        </div>
                      </div>
                    </div>

                    <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-xs font-bold gap-1">
                      <Sparkles className="h-3 w-3" /> {c.matchScore}% Match
                    </Badge>
                  </div>

                  <div className="text-xs font-semibold text-foreground/90">{c.roleTitle}</div>

                  {/* Badges / SBTs */}
                  <div className="flex flex-wrap gap-1">
                    <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/30 text-[10px] gap-1">
                      <ShieldCheck className="h-3 w-3" /> {c.sbtCount} Polygon SBTs
                    </Badge>
                    <Badge variant="secondary" className="text-[10px] gap-1 text-muted-foreground">
                      ⭐ {c.rating} Gig Rating
                    </Badge>
                  </div>

                  {/* Skills */}
                  <div className="flex flex-wrap gap-1 pt-1">
                    {c.skills.map((s) => (
                      <span
                        key={s}
                        className="px-2 py-0.5 rounded-md bg-secondary/60 text-[10px] text-muted-foreground font-medium"
                      >
                        {s}
                      </span>
                    ))}
                  </div>

                  {/* Proof-of-Work Metrics */}
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/40 text-center text-[11px]">
                    <div className="p-2 rounded-lg bg-secondary/30">
                      <span className="text-muted-foreground block text-[10px]">LeetCode</span>
                      <strong className="text-foreground">{c.leetcodeRating}</strong>
                    </div>
                    <div className="p-2 rounded-lg bg-secondary/30">
                      <span className="text-muted-foreground block text-[10px]">Codeforces</span>
                      <strong className="text-foreground">{c.codeforcesRating}</strong>
                    </div>
                    <div className="p-2 rounded-lg bg-secondary/30">
                      <span className="text-muted-foreground block text-[10px]">GitHub</span>
                      <strong className="text-foreground">{c.githubCommits}+</strong>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-border/40 flex items-center justify-between gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setActiveCandidate(c);
                      setProfileModalOpen(true);
                    }}
                    className="text-xs"
                  >
                    View SBTs
                  </Button>

                  {isShortlisted ? (
                    <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 gap-1 text-xs py-1 px-2.5">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Shortlisted
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleShortlist(c)}
                      className="text-xs gap-1.5 shadow-sm"
                    >
                      <Plus className="h-3.5 w-3.5" /> Shortlist
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* CANDIDATE SBT MODAL */}
        <Dialog open={profileModalOpen} onOpenChange={setProfileModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-emerald-500" />
                Verified SBT Cryptographic Proofs
              </DialogTitle>
              <DialogDescription>
                {activeCandidate?.name} ({activeCandidate?.college})
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 space-y-1">
                <div className="font-semibold flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Non-Transferable Soulbound Tokens on Polygon
                </div>
                <p className="text-[11px] opacity-90">
                  Credentials permanently bound to candidate's custodial wallet. Zero fake degrees, impossible to resell.
                </p>
              </div>

              <div className="space-y-2">
                <span className="font-semibold text-foreground">Verified Institutional Badges:</span>
                {activeCandidate?.sbtBadges.map((badge) => (
                  <div
                    key={badge}
                    className="p-2.5 rounded-lg bg-secondary/50 flex items-center justify-between font-mono text-[11px]"
                  >
                    <span>{badge}</span>
                    <Badge variant="outline" className="text-[10px] text-primary border-primary/30">
                      ERC-5192
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setProfileModalOpen(false)}>
                Close
              </Button>
              <Button
                onClick={() => {
                  if (activeCandidate) handleShortlist(activeCandidate);
                  setProfileModalOpen(false);
                }}
              >
                Confirm Shortlist
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
