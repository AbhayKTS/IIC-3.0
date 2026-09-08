import React, { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
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
  FileText,
  Plus,
  Clock,
  CheckCircle2,
  Users,
  Code2,
} from 'lucide-react';

interface Assessment {
  id: string;
  title: string;
  category: string;
  duration: string;
  questionsCount: number;
  applicantsCompleted: number;
  avgScore: number;
}

const SEED_TESTS: Assessment[] = [
  {
    id: 'test-1',
    title: 'Solidity Smart Contract Security & Gas Optimization',
    category: 'Web3 & Blockchain',
    duration: '90 mins',
    questionsCount: 4,
    applicantsCompleted: 18,
    avgScore: 84,
  },
  {
    id: 'test-2',
    title: 'Next.js 14 App Router & Concurrency Architecture',
    category: 'Frontend Engineering',
    duration: '60 mins',
    questionsCount: 5,
    applicantsCompleted: 32,
    avgScore: 88,
  },
  {
    id: 'test-3',
    title: 'Python Vector Search & Embeddings Microservice Test',
    category: 'AI / Data Science',
    duration: '75 mins',
    questionsCount: 3,
    applicantsCompleted: 14,
    avgScore: 79,
  },
];

export default function RecruiterTests() {
  const [tests, setTests] = useState<Assessment[]>(SEED_TESTS);
  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Web3 & Blockchain');
  const [duration, setDuration] = useState('60 mins');
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = () => {
    if (!title.trim()) {
      toast.error('Please enter test title');
      return;
    }
    setTests((prev) => [
      {
        id: `test_${Date.now()}`,
        title,
        category,
        duration,
        questionsCount: 4,
        applicantsCompleted: 0,
        avgScore: 0,
      },
      ...prev,
    ]);
    toast.success('Technical screening test created and active!');
    setCreateOpen(false);
    setTitle('');
  };

  return (
    <DashboardLayout role="recruiter">
      <div className="container-main py-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <FileText className="h-6 w-6 text-primary" /> Technical Screening Assessments
            </h1>
            <p className="text-xs text-muted-foreground">
              Create automated coding tests, gas optimization challenges, and evaluate candidate solutions.
            </p>
          </div>

          <Button onClick={() => setCreateOpen(true)} className="gap-1.5 text-xs shadow-sm">
            <Plus className="h-4 w-4" /> Create Test
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {tests.map((t) => (
            <div
              key={t.id}
              className="glass-card p-6 rounded-2xl border border-border/80 flex flex-col justify-between space-y-4 shadow-sm hover:border-primary/40 transition-all"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                    {t.category}
                  </Badge>
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {t.duration}
                  </span>
                </div>

                <h3 className="font-bold text-base text-foreground leading-snug">{t.title}</h3>

                <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-border/40">
                  <div className="p-2 rounded-lg bg-secondary/40">
                    <span className="text-muted-foreground block text-[10px]">Completed</span>
                    <strong className="text-foreground">{t.applicantsCompleted} candidates</strong>
                  </div>
                  <div className="p-2 rounded-lg bg-secondary/40">
                    <span className="text-muted-foreground block text-[10px]">Avg Score</span>
                    <strong className="text-emerald-500">{t.avgScore > 0 ? `${t.avgScore}%` : 'N/A'}</strong>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-border/40 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{t.questionsCount} Coding Tasks</span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => toast.info(`Viewing applicant test results for "${t.title}"`)}
                  className="text-xs"
                >
                  View Scores
                </Button>
              </div>
            </div>
          ))}
        </div>

        {/* CREATE MODAL */}
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" /> Create Assessment
              </DialogTitle>
              <DialogDescription>
                Define coding challenges for candidate evaluation.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <div className="space-y-1">
                <label className="font-medium text-foreground">Assessment Title *</label>
                <Input
                  placeholder="e.g. Distributed Systems & Concurrency Test"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-foreground">Category</label>
                <Input
                  placeholder="e.g. Web3 / AI / Backend"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                />
              </div>

              <div className="space-y-1">
                <label className="font-medium text-foreground">Time Limit</label>
                <Input
                  placeholder="e.g. 60 mins"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                />
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreate}>Create Assessment</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
