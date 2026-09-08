import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/mockApi';
import type { Gig, GigApplication } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
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
  Zap,
  Search,
  DollarSign,
  Clock,
  Briefcase,
  CheckCircle2,
  ExternalLink,
  Award,
  Filter,
  Layers,
  Send,
  Building,
  Star,
  Coins,
  ShieldCheck,
} from 'lucide-react';

const INITIAL_SEED_GIGS: Gig[] = [
  {
    id: 'gig-1',
    title: 'Smart Contract Audit & Test Coverage for DeFi Escrow',
    description: 'Review Solidity contracts for an automated escrow disbursement module. Write Foundry test suites with >90% branch coverage and submit gas optimization report.',
    skills: ['Solidity', 'Foundry', 'Polygon', 'Smart Contracts'],
    reward: 180, // USDC
    deadline: '2026-09-20',
    mode: 'remote',
    category: 'Web3 & Blockchain',
    duration: '1 week',
    paid: true,
    recruiterId: 'rec_polygon_devs',
    status: 'open',
  },
  {
    id: 'gig-2',
    title: 'React + Tailwind Dashboard Component for MUJ Innovation Hub',
    description: 'Build an interactive live analytics chart component displaying campus hackathon metrics and real-time team registrations using Recharts and Tailwind CSS.',
    skills: ['React', 'TypeScript', 'Tailwind CSS', 'Recharts'],
    reward: 120, // USDC
    deadline: '2026-09-18',
    mode: 'on-campus',
    category: 'Frontend Engineering',
    duration: '4 days',
    paid: true,
    recruiterId: 'rec_muj_placement',
    status: 'open',
  },
  {
    id: 'gig-3',
    title: 'LLM Resume Embeddings Pipeline with Vector Search',
    description: 'Implement a Python FastAPI microservice that parses candidate resumes, computes embeddings via OpenAI / HuggingFace, and indexes them into Pinecone/Qdrant.',
    skills: ['Python', 'FastAPI', 'OpenAI', 'Vector DB', 'PyTorch'],
    reward: 250, // USDC
    deadline: '2026-09-25',
    mode: 'remote',
    category: 'AI / Machine Learning',
    duration: '10 days',
    paid: true,
    recruiterId: 'rec_nexus_labs',
    status: 'open',
  },
  {
    id: 'gig-4',
    title: 'Cross-Platform Mobile Auth Integration (Flutter)',
    description: 'Integrate Firebase Auth + Google Sign-In with deep linking and biometric lock screen for our campus student companion app.',
    skills: ['Flutter', 'Dart', 'Firebase Auth', 'Mobile'],
    reward: 150, // USDC
    deadline: '2026-09-22',
    mode: 'remote',
    category: 'Mobile Development',
    duration: '5 days',
    paid: true,
    recruiterId: 'rec_edutech_india',
    status: 'open',
  },
];

export default function StudentMicroGigs() {
  const { session } = useAuth();
  const studentId = session?.userId || 'student';

  const [gigs, setGigs] = useState<Gig[]>(INITIAL_SEED_GIGS);
  const [applications, setApplications] = useState<GigApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'browse' | 'active' | 'portfolio'>('browse');

  // Modal states
  const [selectedGig, setSelectedGig] = useState<Gig | null>(null);
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [proposalPitch, setProposalPitch] = useState('');
  const [applying, setApplying] = useState(false);

  // Deliverable submission modal
  const [submitModalOpen, setSubmitModalOpen] = useState(false);
  const [submittingGigId, setSubmittingGigId] = useState<string | null>(null);
  const [deliverableUrl, setDeliverableUrl] = useState('');
  const [deliverableNotes, setDeliverableNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadGigsAndApps();
  }, [studentId]);

  const loadGigsAndApps = async () => {
    try {
      setLoading(true);
      const [fetchedGigs, fetchedApps] = await Promise.all([
        api.getGigs().catch(() => INITIAL_SEED_GIGS),
        api.getGigApplications(undefined, studentId).catch(() => []),
      ]);

      if (fetchedGigs && fetchedGigs.length > 0) {
        const merged = [...fetchedGigs];
        INITIAL_SEED_GIGS.forEach((seed) => {
          if (!merged.find((g) => g.id === seed.id)) merged.push(seed);
        });
        setGigs(merged);
      } else {
        setGigs(INITIAL_SEED_GIGS);
      }

      setApplications(fetchedApps || []);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    if (!selectedGig) return;
    try {
      setApplying(true);
      await api.applyToGig(selectedGig.id, studentId).catch(() => {
        const newApp: GigApplication = {
          id: `app_${Date.now()}`,
          gigId: selectedGig.id,
          studentId,
          status: 'applied',
        };
        setApplications((prev) => [...prev, newApp]);
      });

      toast.success(`Application submitted for "${selectedGig.title}"! Recruiter will review your AI Skill Graph.`);
      setApplyModalOpen(false);
      setProposalPitch('');
      await loadGigsAndApps();
    } catch (err: any) {
      toast.error(err.message || 'Failed to submit application');
    } finally {
      setApplying(false);
    }
  };

  const handleSubmitDeliverable = async () => {
    if (!submittingGigId || !deliverableUrl) {
      toast.error('Please provide your deliverable link (GitHub repo, live preview, or demo)');
      return;
    }

    try {
      setSubmitting(true);
      const app = applications.find((a) => a.gigId === submittingGigId);
      const gig = gigs.find((g) => g.id === submittingGigId);

      if (app) {
        await api.completeGig(app.id, studentId, gig?.title || 'Micro-Gig').catch(() => null);
      }

      setApplications((prev) =>
        prev.map((a) =>
          a.gigId === submittingGigId ? { ...a, status: 'completed' } : a
        )
      );

      toast.success('Deliverable submitted successfully! Polygon smart contract payment escrow is pending recruiter rating.');
      setSubmitModalOpen(false);
      setDeliverableUrl('');
      setDeliverableNotes('');
    } catch (err: any) {
      toast.error(err.message || 'Error submitting deliverable');
    } finally {
      setSubmitting(false);
    }
  };

  const categories = ['all', 'Web3 & Blockchain', 'Frontend Engineering', 'AI / Machine Learning', 'Mobile Development'];

  const filteredGigs = gigs.filter((gig) => {
    const matchesCat = selectedCategory === 'all' || gig.category === selectedCategory;
    const matchesSearch =
      gig.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      gig.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      gig.skills.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const appliedGigIds = new Set(applications.map((a) => a.gigId));
  const activeApplications = applications.filter((a) => a.status === 'applied' || a.status === 'accepted');
  const completedApplications = applications.filter((a) => a.status === 'completed');

  const totalEarnedUsd = completedApplications.reduce((acc, curr) => {
    const gig = gigs.find((g) => g.id === curr.gigId);
    return acc + (gig ? gig.reward : 150);
  }, 0);

  return (
    <DashboardLayout role="student">
      <div className="container-main py-6 space-y-6">
        {/* Top Header Banner */}
        <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-purple-500/10 to-transparent p-6 md:p-8 backdrop-blur-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <Zap className="h-3.5 w-3.5" />
                AlmaDox Proof-of-Work Protocol
              </div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                Paid Micro-Gigs & Work Portfolio
              </h1>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Build an undeniable, on-chain work portfolio. Complete industry-sponsored tasks, get rated on real deliverables, and receive crypto payments (USDC / MATIC) directly off-rampable to INR.
              </p>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-card border border-border/70 shadow-sm text-center">
                <span className="text-xs text-muted-foreground block">Total Earned</span>
                <span className="text-lg font-bold text-emerald-500">
                  ${totalEarnedUsd} <span className="text-xs font-normal text-muted-foreground">(₹{(totalEarnedUsd * 86).toLocaleString()})</span>
                </span>
              </div>
              <div className="p-3 rounded-xl bg-card border border-border/70 shadow-sm text-center">
                <span className="text-xs text-muted-foreground block">Active Work</span>
                <span className="text-lg font-bold text-primary">{activeApplications.length}</span>
              </div>
              <div className="p-3 rounded-xl bg-card border border-border/70 shadow-sm text-center">
                <span className="text-xs text-muted-foreground block">Work Rating</span>
                <span className="text-lg font-bold text-amber-500 flex items-center justify-center gap-1">
                  4.9 <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center justify-between border-b border-border/60 pb-3 flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('browse')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'browse'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'
              }`}
            >
              Explore Gigs ({filteredGigs.length})
            </button>
            <button
              onClick={() => setActiveTab('active')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'active'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'
              }`}
            >
              My Applications ({activeApplications.length})
            </button>
            <button
              onClick={() => setActiveTab('portfolio')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeTab === 'portfolio'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-secondary/40'
              }`}
            >
              Verified Deliverables ({completedApplications.length})
            </button>
          </div>

          {/* Search & Filter */}
          {activeTab === 'browse' && (
            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by skill, title..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 text-sm"
                />
              </div>
            </div>
          )}
        </div>

        {/* Category Filter Pills */}
        {activeTab === 'browse' && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-all capitalize whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'border-primary bg-primary/10 text-primary font-semibold'
                    : 'border-border/60 text-muted-foreground hover:text-foreground hover:bg-secondary/30'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        )}

        {/* TAB 1: BROWSE GIGS */}
        {activeTab === 'browse' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {filteredGigs.map((gig) => {
              const hasApplied = appliedGigIds.has(gig.id);
              return (
                <div
                  key={gig.id}
                  className="glass-card p-6 rounded-2xl border border-border/80 hover:border-primary/40 transition-all flex flex-col justify-between space-y-4 hover:shadow-lg group"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <Badge variant="outline" className="text-[11px] mb-2 border-primary/30 text-primary">
                          {gig.category}
                        </Badge>
                        <h3 className="font-semibold text-lg text-foreground group-hover:text-primary transition-colors leading-snug">
                          {gig.title}
                        </h3>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="text-lg font-extrabold text-emerald-500 flex items-center gap-0.5 justify-end">
                          <Coins className="h-4 w-4" /> ${gig.reward}
                        </div>
                        <span className="text-[11px] text-muted-foreground">≈ ₹{gig.reward * 86}</span>
                      </div>
                    </div>

                    <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                      {gig.description}
                    </p>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {gig.skills.map((skill) => (
                        <span
                          key={skill}
                          className="px-2.5 py-0.5 rounded-md bg-secondary/60 text-foreground/80 text-[11px] font-medium border border-border/40"
                        >
                          {skill}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" /> {gig.duration}
                      </span>
                      <span className="flex items-center gap-1 capitalize">
                        <Briefcase className="h-3.5 w-3.5" /> {gig.mode}
                      </span>
                    </div>

                    {hasApplied ? (
                      <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 gap-1">
                        <CheckCircle2 className="h-3 w-3" /> Applied
                      </Badge>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedGig(gig);
                          setApplyModalOpen(true);
                        }}
                        className="gap-1.5 shadow-sm"
                      >
                        Apply <Send className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* TAB 2: ACTIVE APPLICATIONS */}
        {activeTab === 'active' && (
          <div className="space-y-4">
            {activeApplications.length === 0 ? (
              <div className="glass-card p-12 text-center rounded-2xl border border-dashed border-border/80 space-y-3">
                <Zap className="h-10 w-10 text-muted-foreground mx-auto opacity-60" />
                <h3 className="text-base font-semibold text-foreground">No active micro-gig applications</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Browse industry and college micro-gigs to put your skills to work and get paid directly on-chain.
                </p>
                <Button onClick={() => setActiveTab('browse')} className="gap-2 mt-2">
                  Browse Opportunities
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {activeApplications.map((app) => {
                  const gig = gigs.find((g) => g.id === app.gigId);
                  return (
                    <div
                      key={app.id}
                      className="glass-card p-6 rounded-2xl border border-border/80 flex flex-col md:flex-row md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-foreground text-base">
                            {gig?.title || 'Micro-Gig Assignment'}
                          </h4>
                          <Badge variant="outline" className="text-xs uppercase">
                            {app.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground max-w-2xl line-clamp-2">
                          {gig?.description}
                        </p>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground pt-1">
                          <span className="text-emerald-500 font-semibold">Reward: ${gig?.reward || 150} USDC</span>
                          <span>Deadline: {gig?.deadline || 'Flexible'}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <Button
                          size="sm"
                          onClick={() => {
                            setSubmittingGigId(app.gigId);
                            setSubmitModalOpen(true);
                          }}
                          className="gap-1.5 shadow-sm"
                        >
                          Submit Deliverable <ExternalLink className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: VERIFIED PORTFOLIO DELIVERABLES */}
        {activeTab === 'portfolio' && (
          <div className="space-y-4">
            {completedApplications.length === 0 ? (
              <div className="glass-card p-12 text-center rounded-2xl border border-dashed border-border/80 space-y-3">
                <Award className="h-10 w-10 text-muted-foreground mx-auto opacity-60" />
                <h3 className="text-base font-semibold text-foreground">No completed deliverables yet</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Once you complete a micro-gig and your deliverable is rated by the recruiter, it will appear here as a verified portfolio proof.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {completedApplications.map((app) => {
                  const gig = gigs.find((g) => g.id === app.gigId);
                  return (
                    <div
                      key={app.id}
                      className="glass-card p-6 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <Badge className="bg-emerald-500/20 text-emerald-500 border-emerald-500/40 text-[10px] gap-1 mb-1">
                            <ShieldCheck className="h-3 w-3" /> VERIFIED ON-CHAIN
                          </Badge>
                          <h4 className="font-semibold text-foreground">{gig?.title || 'Completed Task'}</h4>
                        </div>
                        <div className="flex items-center gap-1 text-amber-500 font-bold text-sm">
                          5.0 <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Deliverable accepted. Settlement payout of ${gig?.reward || 150} USDC completed on Polygon network.
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* APPLY MODAL */}
        <Dialog open={applyModalOpen} onOpenChange={setApplyModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" /> Apply for Micro-Gig
              </DialogTitle>
              <DialogDescription>
                {selectedGig?.title} (${selectedGig?.reward} USDC)
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="rounded-lg bg-secondary/40 p-3 text-xs space-y-1">
                <span className="font-semibold text-foreground">AI Skill Graph Match:</span>
                <p className="text-muted-foreground">
                  Your verified coding profile (GitHub, LeetCode, Resume) will be shared automatically with the employer.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Why are you the right fit? (Brief note)</label>
                <textarea
                  rows={3}
                  placeholder="Mention previous relevant projects, repositories, or technical experience..."
                  value={proposalPitch}
                  onChange={(e) => setProposalPitch(e.target.value)}
                  className="w-full rounded-md border border-input bg-background p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setApplyModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleApply} disabled={applying}>
                {applying ? 'Submitting...' : 'Submit Application'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* SUBMIT DELIVERABLE MODAL */}
        <Dialog open={submitModalOpen} onOpenChange={setSubmitModalOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" /> Submit Project Deliverable
              </DialogTitle>
              <DialogDescription>
                Provide the link to your code repository, deployed build, or deliverables for recruiter review.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">
                  Deliverable URL (GitHub / Vercel / Figma / Docs) *
                </label>
                <Input
                  placeholder="https://github.com/username/project"
                  value={deliverableUrl}
                  onChange={(e) => setDeliverableUrl(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Summary & Verification Notes</label>
                <textarea
                  rows={3}
                  placeholder="Highlight features implemented, test instructions, or notes for the reviewer..."
                  value={deliverableNotes}
                  onChange={(e) => setDeliverableNotes(e.target.value)}
                  className="w-full rounded-md border border-input bg-background p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setSubmitModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmitDeliverable} disabled={submitting}>
                {submitting ? 'Submitting...' : 'Confirm & Request Payout'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
