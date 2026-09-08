import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/mockApi';
import type { Placement } from '@/lib/types';
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
  Briefcase,
  Building,
  Sparkles,
  Search,
  CheckCircle2,
  Clock,
  ExternalLink,
  MapPin,
  TrendingUp,
  DollarSign,
  ShieldCheck,
} from 'lucide-react';

interface RichPlacement extends Placement {
  location: string;
  roleType: string;
  matchScore: number;
}

const SEED_PLACEMENTS: RichPlacement[] = [
  {
    id: 'plc-1',
    title: 'Associate Software Engineer (Core Platform)',
    company: 'Polygon Labs',
    collegeId: 'all',
    package: '₹22 - 28 LPA',
    deadline: '2026-09-30',
    description: 'Build decentralized infrastructure, EVM bridge components, and high-throughput microservices. Requires strong problem-solving and smart contract familiarity.',
    requirements: ['Data Structures & Algorithms', 'Go / Rust or Node.js', 'Solidity Basics', 'Web3 Protocols'],
    applicants: ['s1', 's2'],
    location: 'Bangalore / Remote',
    roleType: 'Full Time',
    matchScore: 94,
  },
  {
    id: 'plc-2',
    title: 'Full Stack Engineer (AI Products)',
    company: 'Microsoft India',
    collegeId: 'all',
    package: '₹28 - 36 LPA',
    deadline: '2026-10-05',
    description: 'Work on Azure Cognitive Services and enterprise Copilot integrations. Developing Next.js, TypeScript, and microservice APIs.',
    requirements: ['React / Next.js', 'TypeScript', 'Cloud Architecture', 'Azure / AWS'],
    applicants: ['s1', 's3'],
    location: 'Hyderabad / Hybrid',
    roleType: 'Full Time',
    matchScore: 91,
  },
  {
    id: 'plc-3',
    title: 'Machine Learning Research Intern',
    company: 'Google DeepMind',
    collegeId: 'all',
    package: '₹1.5 Lakh / month',
    deadline: '2026-09-28',
    description: 'Research foundation model alignment, multi-agent evaluation architectures, and LLM reasoning benchmarks with our research scientists.',
    requirements: ['Python', 'PyTorch / JAX', 'Transformers', 'Research Publications / Strong GitHub'],
    applicants: ['s2'],
    location: 'Bangalore',
    roleType: 'Internship (6 Mo)',
    matchScore: 88,
  },
  {
    id: 'plc-4',
    title: 'FinTech Backend Engineer',
    company: 'CRED',
    collegeId: 'all',
    package: '₹24 - 30 LPA',
    deadline: '2026-10-10',
    description: 'High-scale payment gateway workflows, Kafka streaming engines, and low-latency transaction processing pipelines.',
    requirements: ['Java / Go', 'Distributed Systems', 'Kafka', 'SQL / PostgreSQL Optimization'],
    applicants: ['s4', 's5'],
    location: 'Bangalore',
    roleType: 'Full Time',
    matchScore: 82,
  },
];

export default function StudentPlacements() {
  const { session } = useAuth();
  const studentId = session?.userId || 'student';

  const [placements, setPlacements] = useState<RichPlacement[]>(SEED_PLACEMENTS);
  const [search, setSearch] = useState('');
  const [selectedPlacement, setSelectedPlacement] = useState<RichPlacement | null>(null);
  const [applyModalOpen, setApplyModalOpen] = useState(false);
  const [appliedIds, setAppliedIds] = useState<Set<string>>(new Set(['plc-1']));

  useEffect(() => {
    loadPlacements();
  }, []);

  const loadPlacements = async () => {
    try {
      const data = await api.getPlacements().catch(() => null);
      if (data && Array.isArray(data) && data.length > 0) {
        // Merge
      }
    } catch {
      // Keep seed
    }
  };

  const handleApply = async () => {
    if (!selectedPlacement) return;
    try {
      await api.applyToPlacement(selectedPlacement.id, studentId).catch(() => null);
      setAppliedIds((prev) => new Set([...prev, selectedPlacement.id]));
      toast.success(
        `Applied to ${selectedPlacement.company} (${selectedPlacement.title}) with verified AlmaDox profile!`
      );
      setApplyModalOpen(false);
    } catch {
      toast.error('Application failed');
    }
  };

  const filtered = placements.filter(
    (p) =>
      p.title.toLowerCase().includes(search.toLowerCase()) ||
      p.company.toLowerCase().includes(search.toLowerCase()) ||
      p.requirements.some((r) => r.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <DashboardLayout role="student">
      <div className="container-main py-6 space-y-6">
        {/* Banner */}
        <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-emerald-500/10 to-transparent p-6 md:p-8 backdrop-blur-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-500">
                <Sparkles className="h-3.5 w-3.5" />
                AI Skill-Matched Drives
              </div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                Placements & Corporate Drives
              </h1>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Direct campus and off-campus opportunities mapped to your live Skill Graph. Recruiters view your verified Soulbound Tokens and rated micro-gig deliverables, skipping weeks of manual resume screening.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-card border border-border/80 text-center min-w-[170px] space-y-1">
              <span className="text-xs text-muted-foreground block">Profile Match Avg</span>
              <span className="text-2xl font-black text-emerald-500">91%</span>
              <span className="text-[10px] text-muted-foreground block">Top 5% of Applicant Pool</span>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-border/60 pb-4">
          <h2 className="text-xl font-bold text-foreground">Active Recruitment Drives</h2>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search role, company, or skills..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
        </div>

        {/* Placements Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filtered.map((item) => {
            const hasApplied = appliedIds.has(item.id);
            return (
              <div
                key={item.id}
                className="glass-card p-6 rounded-2xl border border-border/80 flex flex-col justify-between space-y-4 hover:border-primary/40 transition-all hover:shadow-lg group"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-primary">{item.company}</span>
                        <span className="text-xs text-muted-foreground">• {item.roleType}</span>
                      </div>
                      <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors leading-snug">
                        {item.title}
                      </h3>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 font-bold text-xs gap-1">
                        <Sparkles className="h-3 w-3" /> {item.matchScore}% Match
                      </Badge>
                      <span className="text-xs font-bold text-foreground block mt-1">{item.package}</span>
                    </div>
                  </div>

                  <p className="text-xs text-muted-foreground line-clamp-3 leading-relaxed">
                    {item.description}
                  </p>

                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {item.requirements.map((req) => (
                      <span
                        key={req}
                        className="px-2.5 py-0.5 rounded-md bg-secondary/60 text-[11px] font-medium text-foreground/80 border border-border/40"
                      >
                        {req}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="pt-3 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" /> {item.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5" /> Apply by {item.deadline}
                    </span>
                  </div>

                  {hasApplied ? (
                    <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 gap-1 text-xs">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Applied
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => {
                        setSelectedPlacement(item);
                        setApplyModalOpen(true);
                      }}
                      className="gap-1.5 shadow-sm text-xs"
                    >
                      Apply Now <ExternalLink className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* APPLY MODAL */}
        <Dialog open={applyModalOpen} onOpenChange={setApplyModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5 text-primary" /> One-Click Placement Application
              </DialogTitle>
              <DialogDescription>
                {selectedPlacement?.company} — {selectedPlacement?.title}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 space-y-1.5 text-emerald-600 dark:text-emerald-400">
                <div className="font-semibold flex items-center gap-1">
                  <ShieldCheck className="h-4 w-4" /> Cryptographically Verified Profile
                </div>
                <p className="text-[11px] opacity-90">
                  Your Azure OCR verified college ID, Soulbound Tokens (SBTs), and verified skill graph will be transmitted directly to {selectedPlacement?.company}'s talent portal.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-secondary/40 space-y-1 text-muted-foreground">
                <span className="font-semibold text-foreground">Verified Credentials Attached:</span>
                <ul className="list-disc pl-4 space-y-0.5 text-[11px]">
                  <li>College ID: Verified Student</li>
                  <li>Coding Handles: LeetCode + Codeforces + GitHub</li>
                  <li>AlmaDox SBT Proof-of-Work Badge</li>
                </ul>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setApplyModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleApply}>Confirm Application</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
