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
  ShieldCheck, Loader2, RefreshCw, Users, FileText,
  ArrowUpRight, Award, Check, Code2, AlertCircle, Search, Coins
} from 'lucide-react';
import { collection, addDoc, getDocs, query, where, doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

const SEED_RECRUITER_GIGS: Gig[] = [
  {
    id: 'gig-defi-audit',
    title: 'Smart Contract Audit & Test Coverage for DeFi Escrow',
    description: 'Review Solidity contracts for an automated escrow disbursement module. Write Foundry test suites with >90% branch coverage and submit gas optimization report.',
    skills: ['Solidity', 'Foundry', 'Polygon', 'Smart Contracts'],
    reward: 180,
    deadline: '2026-09-20',
    mode: 'remote',
    category: 'Web3 & Blockchain',
    duration: '1 week',
    paid: true,
    recruiterId: 'recruiter',
    status: 'open',
  },
  {
    id: 'gig-react-dash',
    title: 'React + Tailwind Dashboard Component for Innovation Hub',
    description: 'Build an interactive live analytics chart component displaying campus hackathon metrics and real-time team registrations using Recharts and Tailwind CSS.',
    skills: ['React', 'TypeScript', 'Tailwind CSS', 'Recharts'],
    reward: 120,
    deadline: '2026-09-18',
    mode: 'on-campus',
    category: 'Frontend Engineering',
    duration: '4 days',
    paid: true,
    recruiterId: 'recruiter',
    status: 'open',
  },
  {
    id: 'gig-llm-pipeline',
    title: 'LLM Resume Embeddings Pipeline with Vector Search',
    description: 'Implement a Python FastAPI microservice that parses candidate resumes, computes embeddings via OpenAI / HuggingFace, and indexes them into Pinecone/Qdrant.',
    skills: ['Python', 'FastAPI', 'OpenAI', 'Vector DB', 'PyTorch'],
    reward: 250,
    deadline: '2026-09-25',
    mode: 'remote',
    category: 'AI / Machine Learning',
    duration: '10 days',
    paid: true,
    recruiterId: 'recruiter',
    status: 'open',
  },
];

const SEED_APPLICATIONS: GigApplication[] = [
  {
    id: 'app-aarav-1',
    gigId: 'gig-defi-audit',
    studentId: 'student_aarav',
    studentName: 'Aarav Patel',
    studentCollege: 'GLA University, Mathura',
    studentSkills: ['Solidity', 'Foundry', 'Hardhat', 'Polygon'],
    studentRating: 1980,
    status: 'completed', // deliverable ready for review
    deliverableUrl: 'https://github.com/aaravpatel/defi-escrow-audit',
    notes: 'Completed Foundry test suite with 94.2% branch coverage and identified 3 gas-saving assembly optimizations in GAS_REPORT.md.',
    submittedAt: 'Today, 10:14 AM',
    appliedAt: '2 days ago',
  },
  {
    id: 'app-priya-1',
    gigId: 'gig-defi-audit',
    studentId: 'student_priya',
    studentName: 'Priya Sharma',
    studentCollege: 'IIT Delhi',
    studentSkills: ['Solidity', 'Web3.js', 'EVM Security'],
    studentRating: 2150,
    status: 'applied',
    notes: 'Final-year CSE with hands-on experience in auditing EVM smart contracts. Prepared to write comprehensive fuzzing tests.',
    appliedAt: 'Yesterday, 3:45 PM',
  },
  {
    id: 'app-rohan-1',
    gigId: 'gig-react-dash',
    studentId: 'student_rohan',
    studentName: 'Rohan Verma',
    studentCollege: 'Delhi Technological University (DTU)',
    studentSkills: ['React', 'TypeScript', 'Tailwind', 'Recharts'],
    studentRating: 1820,
    status: 'accepted', // in-progress
    notes: 'Working on responsive Recharts dashboard with live theme toggle and data polling hooks.',
    appliedAt: '3 days ago',
  },
  {
    id: 'app-ananya-1',
    gigId: 'gig-llm-pipeline',
    studentId: 'student_ananya',
    studentName: 'Ananya Rao',
    studentCollege: 'BITS Pilani',
    studentSkills: ['Python', 'FastAPI', 'PyTorch', 'Qdrant'],
    studentRating: 1920,
    status: 'applied',
    notes: 'Experienced in embedding models and vector similarity pipelines. Can deploy on Docker within 48 hours.',
    appliedAt: '1 day ago',
  },
];

export default function RecruiterMicroGigs() {
  const { session } = useAuth();
  const recruiterId = session?.userId || 'recruiter';
  const recruiterName = session?.user?.name || (session?.user as any)?.company || 'Corporate Recruiter';

  const [gigs, setGigs] = useState<Gig[]>(SEED_RECRUITER_GIGS);
  const [applications, setApplications] = useState<GigApplication[]>(SEED_APPLICATIONS);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'my-gigs' | 'submissions'>('my-gigs');

  // Modal states
  const [createOpen, setCreateOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // View Applicants Modal
  const [applicantsModalOpen, setApplicantsModalOpen] = useState(false);
  const [selectedGigForApplicants, setSelectedGigForApplicants] = useState<Gig | null>(null);

  // Review & Payout Modal
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedAppForPayout, setSelectedAppForPayout] = useState<GigApplication | null>(null);
  const [rating, setRating] = useState(5);
  const [reviewNotes, setReviewNotes] = useState('');
  const [releasing, setReleasing] = useState(false);

  // New gig form
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Web3 & Blockchain');
  const [bounty, setBounty] = useState('180');
  const [duration, setDuration] = useState('1 week');
  const [skills, setSkills] = useState('Solidity, Polygon, Foundry');
  const [desc, setDesc] = useState('');

  // Fetch gigs and applications from Firestore / Backend
  const loadGigsData = async () => {
    try {
      setLoading(true);
      const [backendGigs, backendApps] = await Promise.all([
        api.getGigs().catch(() => [] as Gig[]),
        api.getGigApplications().catch(() => [] as GigApplication[]),
      ]);

      const mergedGigs = [...SEED_RECRUITER_GIGS];
      backendGigs.forEach((bg: any) => {
        if (!mergedGigs.some((g) => g.id === bg.id)) {
          mergedGigs.unshift(bg);
        }
      });
      setGigs(mergedGigs);

      const mergedApps = [...SEED_APPLICATIONS];
      backendApps.forEach((ba: any) => {
        if (!mergedApps.some((a) => a.id === ba.id)) {
          mergedApps.unshift(ba);
        }
      });
      setApplications(mergedApps);
    } catch (err) {
      console.warn('Fallback using local seed data for gigs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGigsData();
  }, [recruiterId]);

  // Handle Post New Micro-Gig
  const handleCreateGig = async () => {
    if (!title.trim() || !desc.trim()) {
      toast.error('Please enter gig title and task description');
      return;
    }

    try {
      setSubmitting(true);
      const newGig: Omit<Gig, 'id' | 'status'> = {
        title: title.trim(),
        description: desc.trim(),
        skills: skills.split(',').map((s) => s.trim()).filter(Boolean),
        reward: parseFloat(bounty) || 150,
        deadline: '2026-12-31',
        mode: 'remote',
        category,
        duration,
        paid: true,
        recruiterId,
      };

      let createdDoc: any = null;
      try {
        createdDoc = await api.createGig(newGig);
      } catch (err: any) {
        console.warn('Backend gig creation fallback to Firestore/Local:', err.message);
      }

      const gigId = createdDoc?.id || `gig_${Date.now().toString(36)}`;
      if (db) {
        await addDoc(collection(db, 'gigs'), {
          ...newGig,
          status: 'open',
          createdAt: Date.now(),
        }).catch(() => null);
      }

      const fullGig: Gig = {
        ...newGig,
        id: gigId,
        status: 'open',
      };

      setGigs((prev) => [fullGig, ...prev]);
      toast.success('🎉 Micro-Gig published in POL! Students can now view and apply.');
      setCreateOpen(false);
      setTitle('');
      setDesc('');
    } catch (err: any) {
      toast.error(err.message || 'Could not publish micro-gig');
    } finally {
      setSubmitting(false);
    }
  };

  // Accept candidate application
  const handleAcceptApplication = async (app: GigApplication) => {
    try {
      setApplications((prev) =>
        prev.map((a) => (a.id === app.id ? { ...a, status: 'accepted' } : a))
      );

      await api.updateGigApp(app.id, 'accepted').catch(() => null);

      await api.createNotification({
        userId: app.studentId,
        type: 'gig_accepted',
        title: '🎉 Application Accepted for MicroGig!',
        body: `${recruiterName} accepted your application. You can now start building the deliverable.`,
        meta: { gigId: app.gigId, appId: app.id },
      }).catch(() => null);

      toast.success(`✅ ${app.studentName || 'Student'} has been assigned to this gig!`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to accept application');
    }
  };

  // Handle Review & Release Payout (in Polygon POL)
  const handleAcceptAndPayout = async () => {
    if (!selectedAppForPayout) return;
    setReleasing(true);

    try {
      const gig = gigs.find((g) => g.id === selectedAppForPayout.gigId);
      const payoutAmount = gig?.reward || 180;

      // 1. Mark application as completed / paid
      setApplications((prev) =>
        prev.map((a) => (a.id === selectedAppForPayout.id ? { ...a, status: 'completed' } : a))
      );
      await api.updateGigApp(selectedAppForPayout.id, 'completed').catch(() => null);

      // 2. Simulate Polygon Amoy testnet payout in POL
      const studentWallet = generateWalletFromSeed(selectedAppForPayout.studentId);
      const payoutResult = await simulateGigPayout(studentWallet.address, payoutAmount);

      // 3. Save transaction record to audit log
      saveTxRecord({
        hash: payoutResult.txHash,
        type: 'GIG_PAYOUT',
        label: `MicroGig POL Payout: ${gig?.title || 'Escrow'} → ${selectedAppForPayout.studentName}`,
        amount: `${payoutAmount} POL`,
        timestamp: Date.now(),
        status: 'confirmed',
        network: 'Polygon Amoy Testnet',
      });

      // 4. Send in-app notification to the student
      await api.createNotification({
        userId: selectedAppForPayout.studentId,
        type: 'gig_payout',
        title: '💸 MicroGig POL Reward Released!',
        body: `Congratulations! ${recruiterName} reviewed your deliverable with ${rating}★ and released ${payoutAmount} POL directly to your Polygon wallet.`,
        meta: { txHash: payoutResult.txHash, rating, amount: payoutAmount },
      }).catch(() => null);

      setReviewModalOpen(false);
      setSelectedAppForPayout(null);

      toast.success(
        <div>
          <p className="font-semibold">Payout Released: {payoutAmount} POL → {selectedAppForPayout.studentName}</p>
          <a
            href={explorerTxUrl(payoutResult.txHash)}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-primary underline flex items-center gap-1 mt-1 font-mono"
          >
            <ExternalLink className="h-3 w-3" /> View On-Chain Settlement ({payoutResult.txHash.slice(0, 10)}...)
          </a>
        </div>,
        { duration: 8000 }
      );
    } catch (err: any) {
      toast.error(err?.message || 'Payout release failed');
    } finally {
      setReleasing(false);
    }
  };

  const getApplicantsForGig = (gigId: string) => {
    return applications.filter((a) => a.gigId === gigId);
  };

  const pendingSubmissions = applications.filter(
    (a) => a.status === 'completed' || a.deliverableUrl
  );

  return (
    <DashboardLayout role="recruiter">
      <div className="container-main py-6 space-y-6 max-w-6xl mx-auto">
        {/* Header Title Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2 font-mono">
                <Zap className="h-6 w-6 text-primary" /> Polygon Micro-Gig Command Center
              </h1>
              <Badge variant="outline" className="font-mono text-xs border-primary/40 text-primary">
                Polygon Amoy Escrow
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1 font-mono">
              Post verified codebase tasks in Polygon (POL), inspect applicant student portfolios, and execute smart escrow releases.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadGigsData}
              disabled={loading}
              className="gap-1.5 text-xs font-mono text-foreground border-border"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
            <Button
              onClick={() => setCreateOpen(true)}
              className="bg-primary text-primary-foreground gap-1.5 text-xs font-mono font-semibold shadow-sm"
            >
              <Plus className="h-4 w-4" /> Post Micro-Gig (POL)
            </Button>
          </div>
        </div>

        {/* 4 Quick Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-card p-4 rounded-xl border border-border shadow-sm space-y-1 bg-card">
            <span className="text-xs text-muted-foreground font-mono flex items-center gap-1.5">
              <Zap className="h-3.5 w-3.5 text-primary" /> My Active Gigs
            </span>
            <div className="text-2xl font-black font-mono text-foreground">{gigs.length} Posted</div>
            <div className="text-[11px] text-muted-foreground font-mono">Live on student portal</div>
          </div>

          <div className="glass-card p-4 rounded-xl border border-border shadow-sm space-y-1 bg-card">
            <span className="text-xs text-muted-foreground font-mono flex items-center gap-1.5">
              <Users className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" /> Student Applicants
            </span>
            <div className="text-2xl font-black font-mono text-blue-600 dark:text-blue-400">{applications.length} Candidates</div>
            <div className="text-[11px] text-muted-foreground font-mono">Ready for candidate review</div>
          </div>

          <div className="glass-card p-4 rounded-xl border border-border shadow-sm space-y-1 bg-card">
            <span className="text-xs text-muted-foreground font-mono flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" /> Deliverables for Payout
            </span>
            <div className="text-2xl font-black font-mono text-emerald-700 dark:text-emerald-400">{pendingSubmissions.length} Ready</div>
            <div className="text-[11px] text-emerald-700 dark:text-emerald-500 font-mono">Code submitted for audit</div>
          </div>

          <div className="glass-card p-4 rounded-xl border border-border shadow-sm space-y-1 bg-card">
            <span className="text-xs text-muted-foreground font-mono flex items-center gap-1.5">
              <Coins className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400" /> Escrow Committed
            </span>
            <div className="text-2xl font-black font-mono text-purple-700 dark:text-purple-400">
              {gigs.reduce((acc, g) => acc + (g.reward || 0), 0)} POL
            </div>
            <div className="text-[11px] text-muted-foreground font-mono">Smart contract backed</div>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex border-b border-border/60 gap-4 text-sm font-mono">
          <button
            type="button"
            onClick={() => setActiveTab('my-gigs')}
            className={`pb-3 font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'my-gigs'
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <Zap className="h-4 w-4" /> My Posted Gigs & Applicants ({gigs.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('submissions')}
            className={`pb-3 font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === 'submissions'
                ? 'border-emerald-500 text-emerald-700 dark:text-emerald-400'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            <CheckCircle2 className="h-4 w-4" /> Deliverables Awaiting Review ({pendingSubmissions.length})
          </button>
        </div>

        {/* TAB 1: MY POSTED GIGS & APPLICANTS LIST */}
        {activeTab === 'my-gigs' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-foreground font-mono flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" /> Active Bounties ({gigs.length})
              </h2>
              <span className="text-xs text-muted-foreground font-mono">
                Click "View Applicants" on any gig to see who applied
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {gigs.map((gig) => {
                const gigApps = getApplicantsForGig(gig.id);
                const hasDeliverable = gigApps.some((a) => a.status === 'completed' || a.deliverableUrl);

                return (
                  <div
                    key={gig.id}
                    className="glass-card p-6 rounded-2xl border border-border flex flex-col justify-between space-y-4 shadow-sm hover:border-primary/40 transition-all bg-card text-foreground"
                  >
                    <div className="space-y-3">
                      {/* Category & Status Header */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <Badge variant="outline" className="text-[10px] font-mono border-primary/40 text-primary">
                            {gig.category}
                          </Badge>
                          <Badge variant="outline" className="text-[10px] font-mono capitalize border-border text-foreground">
                            {gig.mode}
                          </Badge>
                        </div>
                        <div className="text-right">
                          <span className="text-lg font-extrabold font-mono text-purple-700 dark:text-purple-400">
                            {gig.reward} POL
                          </span>
                          <span className="text-[10px] text-muted-foreground font-mono block">
                            Duration: {gig.duration}
                          </span>
                        </div>
                      </div>

                      {/* Gig Title & Description */}
                      <div>
                        <h3 className="font-bold text-base text-foreground leading-snug font-mono">
                          {gig.title}
                        </h3>
                        <p className="text-xs text-muted-foreground line-clamp-3 mt-1.5 leading-relaxed font-mono">
                          {gig.description}
                        </p>
                      </div>

                      {/* Skills Tags */}
                      <div className="flex flex-wrap gap-1 pt-1">
                        {gig.skills.map((s) => (
                          <span
                            key={s}
                            className="px-2 py-0.5 rounded-md bg-secondary text-[10px] font-mono text-foreground font-medium border border-border"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Applicant Bar & Actions */}
                    <div className="pt-4 border-t border-border flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          className={`font-mono text-xs gap-1 py-1 ${
                            hasDeliverable
                              ? 'bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30'
                              : gigApps.length > 0
                              ? 'bg-blue-500/15 text-blue-800 dark:text-blue-300 border border-blue-500/30'
                              : 'bg-secondary text-muted-foreground border border-border'
                          }`}
                        >
                          <Users className="h-3.5 w-3.5" />
                          {gigApps.length} Applicant{gigApps.length !== 1 ? 's' : ''}
                          {hasDeliverable && ' • ⚡ Deliverable Ready'}
                        </Badge>
                      </div>

                      <Button
                        size="sm"
                        onClick={() => {
                          setSelectedGigForApplicants(gig);
                          setApplicantsModalOpen(true);
                        }}
                        className="font-mono text-xs gap-1.5 shadow-sm"
                      >
                        <Users className="h-3.5 w-3.5" />
                        View Applicants ({gigApps.length})
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 2: DELIVERABLES QUEUE */}
        {activeTab === 'submissions' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-foreground font-mono flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" /> Deliverables Awaiting Code Review & Escrow Release
              </h2>
              <Badge variant="secondary" className="text-xs font-mono">
                {pendingSubmissions.length} Submissions
              </Badge>
            </div>

            {pendingSubmissions.length === 0 ? (
              <div className="glass-card p-12 text-center rounded-2xl border border-dashed border-border space-y-2 bg-card">
                <CheckCircle2 className="h-10 w-10 text-emerald-600 dark:text-emerald-400 mx-auto opacity-70" />
                <h3 className="font-semibold text-foreground font-mono">No pending deliverables</h3>
                <p className="text-xs text-muted-foreground font-mono">
                  When students finish coding and submit their repository, it will appear here for payout.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {pendingSubmissions.map((sub) => {
                  const gig = gigs.find((g) => g.id === sub.gigId);

                  return (
                    <div
                      key={sub.id}
                      className="glass-card p-6 rounded-2xl border border-border flex flex-col justify-between space-y-4 shadow-sm bg-card text-foreground"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="text-xs font-bold text-primary font-mono flex items-center gap-1">
                              <Award className="h-3.5 w-3.5" /> {sub.studentName}
                            </span>
                            <div className="text-[11px] text-muted-foreground font-mono">{sub.studentCollege}</div>
                          </div>
                          <div className="text-right">
                            <span className="text-base font-extrabold text-purple-700 dark:text-purple-400 font-mono">
                              {gig?.reward || 180} POL
                            </span>
                            <span className="text-[10px] text-muted-foreground block font-mono">{sub.submittedAt}</span>
                          </div>
                        </div>

                        <h3 className="font-bold text-base text-foreground leading-snug font-mono">
                          {gig?.title || 'Micro-Gig Task'}
                        </h3>

                        <div className="p-3 rounded-lg bg-secondary/50 border border-border text-xs font-mono text-foreground space-y-1">
                          <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold block">Student Note</span>
                          <p>{sub.notes}</p>
                        </div>

                        {sub.deliverableUrl && (
                          <div className="pt-1">
                            <a
                              href={sub.deliverableUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 text-xs text-primary font-mono font-medium hover:underline p-2 rounded-lg bg-primary/10 border border-primary/20"
                            >
                              <Code2 className="h-3.5 w-3.5" /> Inspect Code Repository ({sub.deliverableUrl.replace('https://', '')})
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </div>
                        )}
                      </div>

                      <div className="pt-4 border-t border-border flex items-center justify-end">
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedAppForPayout(sub);
                            setRating(5);
                            setReviewNotes('');
                            setReviewModalOpen(true);
                          }}
                          className="bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs gap-1.5 shadow-sm"
                        >
                          <Star className="h-3.5 w-3.5 fill-current" /> Rate & Release {gig?.reward || 180} POL
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ── MODAL 1: VIEW APPLICANTS FOR A SPECIFIC GIG ──────── */}
        <Dialog open={applicantsModalOpen} onOpenChange={setApplicantsModalOpen}>
          <DialogContent className="bg-card border-border text-foreground max-w-2xl max-h-[85vh] overflow-y-auto shadow-2xl">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-base font-bold font-mono text-foreground flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Candidate Applicants ({selectedGigForApplicants ? getApplicantsForGig(selectedGigForApplicants.id).length : 0})
                </DialogTitle>
                <Badge variant="outline" className="text-[10px] font-mono border-purple-500/40 text-purple-700 dark:text-purple-400">
                  {selectedGigForApplicants?.reward} POL Escrow
                </Badge>
              </div>
              <DialogDescription className="text-xs text-muted-foreground font-mono">
                {selectedGigForApplicants?.title}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 mt-2">
              {selectedGigForApplicants && getApplicantsForGig(selectedGigForApplicants.id).length > 0 ? (
                getApplicantsForGig(selectedGigForApplicants.id).map((app) => (
                  <div
                    key={app.id}
                    className="p-4 rounded-xl bg-secondary/40 border border-border space-y-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm font-mono text-foreground">{app.studentName}</h4>
                          <span className="flex items-center gap-1 text-[10px] font-mono text-emerald-700 dark:text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
                            <ShieldCheck className="h-3 w-3" /> SBT Verified
                          </span>
                        </div>
                        <div className="text-xs text-muted-foreground font-mono mt-0.5">
                          {app.studentCollege} • LeetCode: <strong className="text-amber-700 dark:text-amber-400">{app.studentRating || '1850+'}</strong>
                        </div>
                      </div>

                      <div>
                        {app.status === 'completed' || app.deliverableUrl ? (
                          <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 font-mono text-[10px]">
                            ⚡ Deliverable Submitted
                          </Badge>
                        ) : app.status === 'accepted' ? (
                          <Badge className="bg-blue-500/15 text-blue-700 dark:text-blue-300 border border-blue-500/30 font-mono text-[10px]">
                            In-Progress
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="font-mono text-[10px] text-muted-foreground">
                            Applied ({app.appliedAt || 'Recent'})
                          </Badge>
                        )}
                      </div>
                    </div>

                    {/* Pitch / Application Notes */}
                    <div className="p-3 rounded-lg bg-background text-xs font-mono text-foreground leading-relaxed border border-border">
                      <span className="text-[10px] uppercase tracking-wider text-primary font-bold block mb-1">
                        Application Proposal
                      </span>
                      {app.notes || 'Student applied with verified university credentials.'}
                    </div>

                    {/* Deliverable link if provided */}
                    {app.deliverableUrl && (
                      <div className="pt-1">
                        <a
                          href={app.deliverableUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-primary font-mono font-medium hover:underline p-2 rounded-lg bg-primary/10 border border-primary/20"
                        >
                          <Code2 className="h-3.5 w-3.5" /> Inspect Code Submission: {app.deliverableUrl}
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      </div>
                    )}

                    {/* Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-border">
                      <div className="flex items-center gap-1">
                        {(app.studentSkills || []).map((s) => (
                          <span key={s} className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-secondary text-foreground border border-border">
                            {s}
                          </span>
                        ))}
                      </div>

                      <div className="flex items-center gap-2">
                        {app.status === 'applied' && (
                          <Button
                            size="sm"
                            onClick={() => handleAcceptApplication(app)}
                            className="bg-primary text-primary-foreground font-mono text-xs h-7 gap-1"
                          >
                            <Check className="h-3 w-3" /> Accept & Assign Task
                          </Button>
                        )}
                        {(app.status === 'completed' || app.deliverableUrl) && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedAppForPayout(app);
                              setApplicantsModalOpen(false);
                              setReviewModalOpen(true);
                            }}
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs h-7 gap-1"
                          >
                            <Star className="h-3 w-3 fill-current" /> Rate & Release Escrow
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-xs font-mono text-muted-foreground">
                  No applications received yet for this gig. Students will appear here once they apply.
                </div>
              )}
            </div>

            <DialogFooter className="mt-4 pt-3 border-t border-border">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setApplicantsModalOpen(false)}
                className="font-mono text-xs"
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── MODAL 2: POST A NEW MICRO-GIG (POL) ─────────────────── */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="bg-card border-border text-foreground max-w-lg shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2 font-mono text-foreground">
                <Zap className="h-4 w-4 text-primary" /> Post Engineering Micro-Gig (POL)
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground font-mono">
                Create a codebase task for verified campus students. Payout is backed by smart escrow in Polygon (POL).
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 mt-2 text-xs font-mono">
              <div className="space-y-1">
                <label className="text-foreground font-semibold">Gig Title</label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Implement ERC-4337 Paymaster Module with Bundler Integration"
                  className="bg-background border-input text-xs font-mono text-foreground"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-foreground font-semibold">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full h-9 rounded-md bg-background border border-input px-3 text-xs font-mono text-foreground"
                  >
                    <option value="Web3 & Blockchain">Web3 & Blockchain</option>
                    <option value="Frontend Engineering">Frontend Engineering</option>
                    <option value="AI / Machine Learning">AI / Machine Learning</option>
                    <option value="Mobile Development">Mobile Development</option>
                    <option value="Backend / Cloud">Backend / Cloud</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-foreground font-semibold">Bounty (POL)</label>
                  <div className="relative">
                    <Input
                      type="number"
                      value={bounty}
                      onChange={(e) => setBounty(e.target.value)}
                      placeholder="180"
                      className="bg-background border-input text-xs font-mono text-foreground"
                    />
                    <span className="absolute right-3 top-2.5 text-xs text-purple-600 dark:text-purple-400 font-mono font-bold">POL</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-foreground font-semibold">Estimated Duration</label>
                  <Input
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="e.g. 1 week"
                    className="bg-background border-input text-xs font-mono text-foreground"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-foreground font-semibold">Required Skills (comma-separated)</label>
                  <Input
                    value={skills}
                    onChange={(e) => setSkills(e.target.value)}
                    placeholder="Solidity, Foundry, Polygon"
                    className="bg-background border-input text-xs font-mono text-foreground"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-foreground font-semibold">Task Description & Deliverables</label>
                <textarea
                  value={desc}
                  onChange={(e) => setDesc(e.target.value)}
                  placeholder="Detail the deliverable requirements, repository setup, and acceptance criteria..."
                  rows={4}
                  className="w-full rounded-md bg-background border border-input p-2.5 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <DialogFooter className="mt-4 pt-3 border-t border-border">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCreateOpen(false)}
                disabled={submitting}
                className="font-mono text-xs text-foreground"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleCreateGig}
                disabled={submitting || !title.trim() || !desc.trim()}
                className="bg-primary text-primary-foreground font-mono text-xs font-semibold gap-1.5"
              >
                {submitting ? 'Publishing...' : 'Publish Micro-Gig (POL)'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── MODAL 3: RATE & RELEASE PAYOUT (POL) ───────────────── */}
        <Dialog open={reviewModalOpen} onOpenChange={setReviewModalOpen}>
          <DialogContent className="bg-card border-border text-foreground max-w-md shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2 font-mono text-foreground">
                <Star className="h-4 w-4 text-amber-500 fill-current" />
                Rate Work & Release Polygon Escrow
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground font-mono">
                Review deliverable for <strong className="text-foreground">{selectedAppForPayout?.studentName}</strong>. On-chain POL transfer will execute on Polygon Amoy.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-2 text-xs font-mono">
              <div className="p-3.5 rounded-xl bg-secondary/50 border border-border space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Recipient:</span>
                  <span className="text-foreground font-bold">{selectedAppForPayout?.studentName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Settlement Amount:</span>
                  <span className="text-purple-700 dark:text-purple-400 font-black text-sm">
                    {gigs.find((g) => g.id === selectedAppForPayout?.gigId)?.reward || 180} POL
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Target Network:</span>
                  <span className="text-primary font-medium">Polygon Amoy Testnet</span>
                </div>
              </div>

              {/* Star Rating Selector */}
              <div className="space-y-1.5 text-center">
                <label className="text-foreground font-semibold block">Rating for Soulbound Token (SBT)</label>
                <div className="flex items-center justify-center gap-2">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setRating(s)}
                      className="p-1 hover:scale-110 transition-transform"
                    >
                      <Star
                        className={`h-6 w-6 ${
                          s <= rating ? 'text-amber-500 fill-current' : 'text-muted-foreground/30'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-foreground font-semibold">Recruiter Review & Endorsement</label>
                <textarea
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Optional review note to be stamped on the candidate's verified profile..."
                  rows={2}
                  className="w-full rounded-md bg-background border border-input p-2 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>

            <DialogFooter className="mt-4 pt-3 border-t border-border">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setReviewModalOpen(false)}
                disabled={releasing}
                className="font-mono text-xs text-foreground"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleAcceptAndPayout}
                disabled={releasing}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-mono text-xs font-semibold gap-1.5 shadow-sm"
              >
                {releasing ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Releasing Escrow...
                  </>
                ) : (
                  `Confirm & Release ${gigs.find((g) => g.id === selectedAppForPayout?.gigId)?.reward || 180} POL`
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
