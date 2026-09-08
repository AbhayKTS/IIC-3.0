import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/mockApi';
import type { Competition } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  Swords,
  Trophy,
  Clock,
  Users,
  CheckCircle2,
  Sparkles,
  Zap,
} from 'lucide-react';

const SEED_COMPETITIONS: Competition[] = [
  {
    id: 'comp-1',
    title: 'Polygon Smart Contract Speedrun Challenge',
    type: 'all-college',
    date: 'Starts in 2 days (Sept 10)',
    description: 'Solve 4 Solidity gas optimization puzzles and deploy an automated ERC-4337 paymaster within 3 hours. Top 3 teams win $1,200 in USDC and Soulbound Tokens.',
    participants: ['s1', 's2', 's3'],
    status: 'upcoming',
    category: 'Web3 & EVM',
  },
  {
    id: 'comp-2',
    title: 'Inter-University Algorithmic Sprint 2026',
    type: 'all-college',
    date: 'Live Now (Ends in 4 hrs)',
    description: '5 algorithmic problems testing Dynamic Programming, Graph Theory, and Segment Trees. Benchmarked against Codeforces Div 1 difficulty.',
    participants: ['s1', 's4', 's5'],
    status: 'ongoing',
    category: 'Competitive Programming',
  },
  {
    id: 'comp-3',
    title: 'AI Multi-Agent Hackathon (LLM Arena)',
    type: 'area',
    date: 'Sept 22, 2026',
    description: 'Build autonomous agents that can negotiate, trade, and analyze financial reports. Powered by Azure OpenAI API endpoints.',
    participants: ['s2', 's3'],
    status: 'upcoming',
    category: 'Artificial Intelligence',
  },
];

export default function StudentCompetitions() {
  const { session } = useAuth();
  const studentId = session?.userId || 'student';

  const [competitions, setCompetitions] = useState<Competition[]>(SEED_COMPETITIONS);
  const [joinedCompIds, setJoinedCompIds] = useState<Set<string>>(new Set(['comp-2']));

  useEffect(() => {
    loadCompetitions();
  }, []);

  const loadCompetitions = async () => {
    try {
      const data = await api.getCompetitions().catch(() => null);
      if (data && Array.isArray(data) && data.length > 0) {
        setCompetitions(data);
      }
    } catch {
      setCompetitions(SEED_COMPETITIONS);
    }
  };

  const handleJoin = async (comp: Competition) => {
    try {
      await api.joinCompetition(comp.id, studentId).catch(() => null);
      setJoinedCompIds((prev) => new Set([...prev, comp.id]));
      toast.success(`Joined "${comp.title}"! Competition portal unlocked.`);
    } catch {
      toast.error('Could not register for contest');
    }
  };

  return (
    <DashboardLayout role="student">
      <div className="container-main py-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Swords className="h-6 w-6 text-primary" /> Engineering Competitions & Arenas
            </h1>
            <p className="text-xs text-muted-foreground">
              Timed coding sprints, smart contract security audits, and hackathon challenges.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {competitions.map((comp) => {
            const isJoined = joinedCompIds.has(comp.id);
            return (
              <div
                key={comp.id}
                className="glass-card p-6 rounded-2xl border border-border/80 flex flex-col justify-between space-y-4 hover:border-primary/40 transition-all hover:shadow-lg group"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Badge
                      variant={comp.status === 'ongoing' ? 'default' : 'secondary'}
                      className={`text-xs uppercase ${
                        comp.status === 'ongoing' ? 'bg-emerald-500 animate-pulse text-white' : ''
                      }`}
                    >
                      {comp.status}
                    </Badge>
                    <span className="text-xs text-muted-foreground flex items-center gap-1 font-mono">
                      <Clock className="h-3 w-3" /> {comp.date}
                    </span>
                  </div>

                  <h3 className="font-bold text-lg text-foreground group-hover:text-primary transition-colors">
                    {comp.title}
                  </h3>

                  <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
                    {comp.description}
                  </p>

                  <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                    {comp.category}
                  </Badge>
                </div>

                <div className="pt-4 border-t border-border/40 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Users className="h-3.5 w-3.5" /> {comp.participants.length} Contenders
                  </span>

                  {isJoined ? (
                    <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 gap-1 text-xs">
                      <CheckCircle2 className="h-3 w-3" /> Joined
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => handleJoin(comp)}
                      className="text-xs gap-1.5 shadow-sm"
                    >
                      <Zap className="h-3 w-3" /> Enter Contest
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </DashboardLayout>
  );
}
