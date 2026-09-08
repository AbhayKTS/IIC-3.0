import React, { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import {
  ListChecks,
  Search,
  Calendar,
  Trash2,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  MessageSquare,
  Building,
} from 'lucide-react';

interface ShortlistedCandidate {
  id: string;
  studentId: string;
  name: string;
  college: string;
  role: string;
  matchScore: number;
  status: 'Shortlisted' | 'Technical Round 1' | 'Final Interview' | 'Offer Disbursed';
  notes: string;
  addedAt: string;
}

const SEED_SHORTLIST: ShortlistedCandidate[] = [
  {
    id: 'sh-1',
    studentId: 's1',
    name: 'Ansh Sharma',
    college: 'GLA University',
    role: 'Fullstack & Smart Contract Architect',
    matchScore: 97,
    status: 'Final Interview',
    notes: 'Exceptional Foundry gas optimization test cases. Solid communication, verified Polygon SBTs.',
    addedAt: '2026-09-07',
  },
  {
    id: 'sh-2',
    studentId: 's2',
    name: 'Priya Narang',
    college: 'Manipal University Jaipur',
    role: 'AI Research & Vector DB Engineer',
    matchScore: 93,
    status: 'Technical Round 1',
    notes: 'Won MUJ Innovation Challenge 3.0. High proficiency in FastAPI and vector indexing.',
    addedAt: '2026-09-08',
  },
];

export default function RecruiterShortlist() {
  const [shortlist, setShortlist] = useState<ShortlistedCandidate[]>(SEED_SHORTLIST);

  const handleRemove = (id: string) => {
    setShortlist((prev) => prev.filter((s) => s.id !== id));
    toast.info('Candidate removed from shortlist.');
  };

  const handleSchedule = (name: string) => {
    toast.success(`Interview invitation dispatched to ${name}'s verified college email!`);
  };

  return (
    <DashboardLayout role="recruiter">
      <div className="container-main py-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <ListChecks className="h-6 w-6 text-primary" /> Candidate Shortlist & Pipeline
            </h1>
            <p className="text-xs text-muted-foreground">
              Manage shortlisted verified candidates, add interview evaluation notes, and dispatch interview slots.
            </p>
          </div>
          <Badge variant="secondary" className="text-xs">
            {shortlist.length} Verified Candidates in Pipeline
          </Badge>
        </div>

        <div className="space-y-4">
          {shortlist.map((c) => (
            <div
              key={c.id}
              className="glass-card p-6 rounded-2xl border border-border/80 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-primary/40 transition-all shadow-sm"
            >
              <div className="space-y-2 max-w-2xl">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-base text-foreground">{c.name}</h3>
                  <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 text-[11px] font-bold">
                    {c.matchScore}% Skill Match
                  </Badge>
                  <Badge variant="outline" className="text-[10px] uppercase text-primary border-primary/30">
                    {c.status}
                  </Badge>
                </div>

                <div className="text-xs text-muted-foreground flex items-center gap-2">
                  <span className="font-medium text-foreground">{c.role}</span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Building className="h-3 w-3" /> {c.college}
                  </span>
                </div>

                <p className="text-xs text-muted-foreground bg-secondary/40 p-2.5 rounded-lg border border-border/40">
                  <strong className="text-foreground">Recruiter Notes: </strong>
                  {c.notes}
                </p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <Button
                  size="sm"
                  onClick={() => handleSchedule(c.name)}
                  className="text-xs gap-1.5 shadow-sm"
                >
                  <Calendar className="h-3.5 w-3.5" /> Schedule Interview
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleRemove(c.id)}
                  className="text-xs text-destructive hover:bg-destructive/10 border-destructive/20 gap-1"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Remove
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
