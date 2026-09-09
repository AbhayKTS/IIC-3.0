import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/mockApi';
import { simulateGigPayout, saveTxRecord, explorerTxUrl, generateWalletFromSeed } from '@/lib/web3';
import type { Gig, GigApplication } from '@/lib/types';
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
  Zap, Plus, CheckCircle2, ExternalLink, Star, Clock,
  ShieldCheck, Loader2, RefreshCw,
} from 'lucide-react';

interface SubmissionView {
  appId: string;
  gigId: string;
  gigTitle: string;
  studentId: string;
  studentName: string;
  deliverableUrl: string;
  notes: string;
  submittedAt: string;
  bounty: number;
}

export default function RecruiterMicroGigs() {
  const { session } = useAuth();
  const recruiterId = session?.userId || 'recruiter';

  const [gigs, setGigs] = useState<Gig[]>([]);
  const [submissions, setSubmissions] = useState<SubmissionView[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(true);

  const [createOpen, setCreateOpen] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedSub, setSelectedSub] = useState<SubmissionView | null>(null);
  const [rating, setRating] = useState(5);
  const [reviewNotes, setReviewNotes] = useState('');
  const [releasing, setReleasing] = useState(false);

  // New gig form
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Web3 & Blockchain');
  const [bounty, setBounty] = useState('150');
  const [duration, setDuration] = useState('1 week');
  const [skills, setSkills] = useState('Solidity, Polygon, Foundry');
  const [desc, setDesc] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadSubmissions = async () => {
    try {
      setLoadingSubmissions(true);
      // Fetch all gigs and gig-applications in parallel
      const [allGigs, allApps] = await Promise.all([
        api.getGigs().catch(() => [] as Gig[]),
        api.getGigApplications().catch(() => [] as GigApplication[]),
      ]);

      // Filter gigs that belong to this recruiter
      const myGigs = allGigs.filter((g: any) => g.recruiterId === recruiterId || !g.recruiterId);
      setGigs(myGigs);

      // Filter apps that are 'completed' (submitted by student) but not yet paid
      const myGigIds = new Set(myGigs.map((g: any) => g.id));
      const completedApps = (allApps as GigApplication[]).filter(
        (a) => myGigIds.has(a.gigId) && (a.status === 'completed' || a.status === 'submitted')
      );

      const submissionViews: SubmissionView[] = completedApps.map((app) => {
        const gig = myGigs.find((g: any) => g.id === app.gigId);
        return {
          appId: app.id,
          gigId: app.gigId,
          gigTitle: gig?.title || 'Micro-Gig',
          studentId: app.studentId,
          studentName: (app as any).studentName || 'Student',
          deliverableUrl: (app as any).deliverableUrl || '',
          notes: (app as any).notes || 'Deliverable submitted for review.',
          submittedAt: (app as any).submittedAt || new Date().toLocaleString(),
          bounty: gig?.reward || 150,
        };
      });

      setSubmissions(submissionViews);
    } catch (err) {
      console.error('Failed to load submissions:', err);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  useEffect(() => {
    loadSubmissions();
  }, [recruiterId]);

  const handleCreateGig = async () => {
    if (!title.trim() || !desc.trim()) {
      toast.error('Please enter gig title and task description');
      return;
    }

    try {
      setSubmitting(true);
      const newGig: Omit<Gig, 'id' | 'status'> = {
        title,
        description: desc,
        skills: skills.split(',').map((s) => s.trim()).filter(Boolean),
        reward: parseFloat(bounty) || 150,
        deadline: '2026-12-31',
        mode: 'remote',
        category,
        duration,
        paid: true,
        recruiterId,
      };

      const created = await api.createGig(newGig);
      // Add to local gigs list immediately
      setGigs((prev) => [...prev, { ...newGig, id: (created as any)?.id || Date.now().toString(), status: 'open' } as Gig]);

      toast.success('Micro-Gig published! Students can now apply.');
      setCreateOpen(false);
      setTitle('');
      setDesc('');
    } catch {
      toast.error('Could not publish micro-gig');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAcceptAndPayout = async () => {
    if (!selectedSub) return;
    setReleasing(true);

    try {
      // 1. Mark the gig application as "paid" in the backend
      await api.updateGigApp(selectedSub.appId, 'completed' as any).catch(() => null);

      // 2. Simulate on-chain Polygon payout
      const studentWallet = generateWalletFromSeed(selectedSub.studentId);
      const payoutResult = await simulateGigPayout(studentWallet.address, selectedSub.bounty);

      // 3. Save transaction record to local tx log
      saveTxRecord({
        hash: payoutResult.txHash,
        type: 'GIG_PAYOUT',
        label: `Payout: ${selectedSub.gigTitle} → ${selectedSub.studentName}`,
        amount: `${selectedSub.bounty} USDC`,
        timestamp: Date.now(),
        status: 'confirmed',
        network: 'Polygon Amoy Testnet',
      });

      // 4. Remove from submissions UI
      setSubmissions((prev) => prev.filter((s) => s.appId !== selectedSub.appId));
      setReviewModalOpen(false);

      toast.success(
        <div>
          <p className="font-semibold">Payout released! ${selectedSub.bounty} USDC → {selectedSub.studentName}</p>
          <a href={explorerTxUrl(payoutResult.txHash)} target="_blank" rel="noreferrer"
            className="text-xs text-blue-400 underline flex items-center gap-1 mt-1">
            <ExternalLink className="h-3 w-3" /> View on Polygonscan
          </a>
        </div>,
        { duration: 8000 }
      );
    } catch (err: any) {
      toast.error(err?.message || 'Payout failed');
    } finally {
      setReleasing(false);
    }
  };

  return (
    <DashboardLayout role="recruiter">
      <div className="container-main py-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Zap className="h-6 w-6 text-primary" /> Micro-Gig Command Center
            </h1>
            <p className="text-xs text-muted-foreground">
              Post paid micro-gigs, rate student deliverables, and release on-chain escrow payouts.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={loadSubmissions} className="gap-1.5 text-xs">
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
            <Button onClick={() => setCreateOpen(true)} className="gap-1.5 text-xs shadow-sm">
              <Plus className="h-4 w-4" /> Post Micro-Gig
            </Button>
          </div>
        </div>

        {/* Active Gigs count */}
        {gigs.length > 0 && (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Zap className="h-4 w-4 text-amber-500" />
            <span><strong className="text-foreground">{gigs.length}</strong> active gig{gigs.length !== 1 ? 's' : ''} posted</span>
          </div>
        )}

        {/* Pending Submissions Queue */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Deliverables Awaiting Rating & Payout
            </h2>
            <Badge variant="secondary" className="text-xs">
              {loadingSubmissions ? '...' : `${submissions.length} Submissions`}
            </Badge>
          </div>

          {loadingSubmissions ? (
            <div className="glass-card p-12 text-center rounded-2xl border border-border/80">
              <Loader2 className="h-8 w-8 text-primary mx-auto animate-spin mb-3" />
              <p className="text-sm text-muted-foreground">Loading submissions...</p>
            </div>
          ) : submissions.length === 0 ? (
            <div className="glass-card p-12 text-center rounded-2xl border border-dashed border-border/80 space-y-2">
              <CheckCircle2 className="h-10 w-10 text-emerald-500 mx-auto opacity-70" />
              <h3 className="font-semibold text-foreground">No pending deliverables</h3>
              <p className="text-xs text-muted-foreground">
                When students submit completed work, it will appear here for rating and payout.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {submissions.map((sub) => (
                <div
                  key={sub.appId}
                  className="glass-card p-6 rounded-2xl border border-border/80 flex flex-col justify-between space-y-4 shadow-sm group hover:border-primary/40 transition-all"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-xs font-semibold text-primary">{sub.studentName}</span>
                        <div className="text-[11px] text-muted-foreground font-mono">{sub.studentId.slice(0, 12)}...</div>
                      </div>
                      <div className="text-right">
                        <span className="text-base font-extrabold text-emerald-500">${sub.bounty} USDC</span>
                        <span className="text-[10px] text-muted-foreground block font-mono">{sub.submittedAt}</span>
                      </div>
                    </div>

                    <h3 className="font-bold text-base text-foreground leading-snug">{sub.gigTitle}</h3>

                    <p className="text-xs text-muted-foreground line-clamp-3 bg-secondary/30 p-2.5 rounded-lg border border-border/40">
                      {sub.notes}
                    </p>

                    {sub.deliverableUrl && (
                      <div className="pt-1">
                        <a
                          href={sub.deliverableUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-primary font-medium hover:underline"
                        >
                          <ExternalLink className="h-3.5 w-3.5" /> Inspect Code Repository
                        </a>
                      </div>
                    )}
                  </div>

                  <div className="pt-4 border-t border-border/40 flex items-center justify-end">
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedSub(sub);
                        setRating(5);
                        setReviewNotes('');
                        setReviewModalOpen(true);
                      }}
                      className="text-xs gap-1.5 shadow-sm"
                    >
                      <Star className="h-3.5 w-3.5 fill-current" /> Rate & Release Payout
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* REVIEW & PAYOUT MODAL */}
        <Dialog open={reviewModalOpen} onOpenChange={setReviewModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Star className="h-5 w-5 text-amber-500 fill-amber-500" /> Rate Deliverable & Release Escrow
              </DialogTitle>
              <DialogDescription>
                {selectedSub?.gigTitle} (${selectedSub?.bounty} USDC)
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              <div className="space-y-1.5">
                <label className="font-semibold text-foreground">Rating (1 to 5 Stars):</label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setRating(s)}
                      className={`p-2 rounded-lg border transition-all ${
                        rating >= s
                          ? 'border-amber-500 bg-amber-500/10 text-amber-500'
                          : 'border-border text-muted-foreground'
                      }`}
                    >
                      <Star className={`h-4 w-4 ${rating >= s ? 'fill-current' : ''}`} />
                    </button>
                  ))}
                  <span className="font-bold text-foreground text-sm ml-2">{rating}.0 / 5.0</span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="font-medium text-foreground">Review Feedback for Student Portfolio</label>
                <textarea
                  rows={3}
                  placeholder="e.g. Excellent code organization and clean documentation..."
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  className="w-full rounded-md border border-input bg-background p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 space-y-1">
                <div className="font-semibold flex items-center gap-1">
                  <ShieldCheck className="h-3.5 w-3.5" /> Polygon On-Chain Settlement
                </div>
                <p className="text-[11px] opacity-90">
                  Authorizing payout will disburse ${selectedSub?.bounty} USDC from escrow to {selectedSub?.studentName}'s custodial wallet. A transaction record will be saved to your history.
                </p>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setReviewModalOpen(false)} disabled={releasing}>
                Cancel
              </Button>
              <Button onClick={handleAcceptAndPayout} disabled={releasing}>
                {releasing ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Releasing on Polygon...
                  </span>
                ) : 'Authorize Payout & Rating'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* POST MICRO-GIG MODAL */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-primary" /> Post New Paid Micro-Gig
              </DialogTitle>
              <DialogDescription>
                Define real tasks with crypto bounty settlement for university students.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div className="space-y-1">
                <label className="font-medium text-foreground">Task Title *</label>
                <Input
                  placeholder="e.g. Build Foundry Test Suite for Token Vesting"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="font-medium text-foreground">Bounty in USDC *</label>
                  <Input
                    type="number"
                    placeholder="e.g. 150"
                    value={bounty}
                    onChange={(e) => setBounty(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <label className="font-medium text-foreground">Category</label>
                  <Input
                    placeholder="Web3 / AI / Frontend"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-medium text-foreground">Required Skills (comma-separated)</label>
                <Input
                  placeholder="Solidity, Foundry, Polygon"
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-foreground">Task Specifications *</label>
                <textarea
                  rows={3}
                  placeholder="Describe scope, acceptance criteria, and expected deliverables..."
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  className="w-full rounded-md border border-input bg-background p-2.5 text-xs focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateGig} disabled={submitting}>
                {submitting ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Publishing...
                  </span>
                ) : 'Deploy Gig with Escrow'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
