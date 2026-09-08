import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/mockApi';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Trophy,
  Medal,
  Flame,
  Search,
  Github,
  Code2,
  Terminal,
  Award,
  ShieldCheck,
  TrendingUp,
  Sparkles,
  Building,
} from 'lucide-react';

interface LeaderboardEntry {
  id: string;
  rank: number;
  name: string;
  college: string;
  avatar: string;
  totalPoints: number;
  leetcode: { solved: number; rating: number; handle: string };
  codeforces: { rating: number; rank: string; handle: string };
  github: { commits: number; prs: number; handle: string };
  sbtCount: number;
  badge: string;
}

const SEED_LEADERBOARD: LeaderboardEntry[] = [
  {
    id: 's1',
    rank: 1,
    name: 'Ansh Sharma',
    college: 'GLA University',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    totalPoints: 3840,
    leetcode: { solved: 720, rating: 2150, handle: 'ansh_codr' },
    codeforces: { rating: 1980, rank: 'Candidate Master', handle: 'ansh_dev' },
    github: { commits: 480, prs: 34, handle: 'ansh-codr' },
    sbtCount: 4,
    badge: 'Grandmaster',
  },
  {
    id: 's2',
    rank: 2,
    name: 'Priya Narang',
    college: 'Manipal University Jaipur',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
    totalPoints: 3620,
    leetcode: { solved: 680, rating: 2090, handle: 'priya_algo' },
    codeforces: { rating: 1890, rank: 'Master', handle: 'priya_n' },
    github: { commits: 520, prs: 41, handle: 'priyanarang' },
    sbtCount: 3,
    badge: 'Algorithm Prodigy',
  },
  {
    id: 's3',
    rank: 3,
    name: 'Rohan Deshmukh',
    college: 'IIT Delhi',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
    totalPoints: 3410,
    leetcode: { solved: 610, rating: 2040, handle: 'rohan_d' },
    codeforces: { rating: 1920, rank: 'Candidate Master', handle: 'rohandeshmukh' },
    github: { commits: 390, prs: 28, handle: 'rohand' },
    sbtCount: 3,
    badge: 'Web3 Builder',
  },
  {
    id: 's4',
    rank: 4,
    name: 'Aarav Patel',
    college: 'BITS Pilani',
    avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
    totalPoints: 3180,
    leetcode: { solved: 540, rating: 1960, handle: 'aarav_p' },
    codeforces: { rating: 1780, rank: 'Expert', handle: 'aarav_cf' },
    github: { commits: 450, prs: 22, handle: 'aaravp' },
    sbtCount: 2,
    badge: 'Fullstack Ace',
  },
  {
    id: 's5',
    rank: 5,
    name: 'Sneha Kulkarni',
    college: 'DTU Delhi',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
    totalPoints: 2990,
    leetcode: { solved: 510, rating: 1910, handle: 'sneha_k' },
    codeforces: { rating: 1740, rank: 'Expert', handle: 'snehak' },
    github: { commits: 360, prs: 19, handle: 'snehakul' },
    sbtCount: 2,
    badge: 'AI Specialist',
  },
];

export default function StudentLeaderboard() {
  const { session } = useAuth();
  const [entries, setEntries] = useState<LeaderboardEntry[]>(SEED_LEADERBOARD);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<'all' | 'leetcode' | 'codeforces' | 'github'>('all');
  const [collegeFilter, setCollegeFilter] = useState('all');

  useEffect(() => {
    loadLeaderboard();
  }, [filterCategory]);

  const loadLeaderboard = async () => {
    try {
      const data = await api.getStudentLeaderboard(filterCategory).catch(() => null);
      if (data && Array.isArray(data) && data.length > 0) {
        // Map or format if needed
      }
    } catch {
      // Keep rich seed
    }
  };

  const filtered = entries.filter((e) => {
    const matchesSearch =
      e.name.toLowerCase().includes(search.toLowerCase()) ||
      e.college.toLowerCase().includes(search.toLowerCase()) ||
      e.badge.toLowerCase().includes(search.toLowerCase());
    const matchesCollege = collegeFilter === 'all' || e.college.toLowerCase().includes(collegeFilter.toLowerCase());
    return matchesSearch && matchesCollege;
  });

  return (
    <DashboardLayout role="student">
      <div className="container-main py-6 space-y-6">
        {/* Banner */}
        <div className="relative overflow-hidden rounded-2xl border border-amber-500/20 bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-transparent p-6 md:p-8 backdrop-blur-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-500">
                <Trophy className="h-3.5 w-3.5" />
                Live AI Points Engine
              </div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                National Student Tech Leaderboard
              </h1>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Rankings driven by verifiable coding activity across LeetCode, Codeforces, and GitHub. Earn Soulbound Tokens (SBTs) and points by completing micro-gigs and solving real engineering challenges.
              </p>
            </div>

            {/* Top 3 Podium Highlights */}
            <div className="flex items-center gap-3">
              <div className="text-center p-3 rounded-xl bg-card border border-amber-500/30 shadow-md">
                <span className="text-xs font-bold text-amber-500 block">Rank #1</span>
                <span className="text-sm font-semibold text-foreground">3,840 Pts</span>
                <span className="text-[10px] text-muted-foreground block">GLA Univ</span>
              </div>
              <div className="text-center p-3 rounded-xl bg-card border border-border/80 shadow-sm">
                <span className="text-xs font-bold text-slate-400 block">Rank #2</span>
                <span className="text-sm font-semibold text-foreground">3,620 Pts</span>
                <span className="text-[10px] text-muted-foreground block">MUJ</span>
              </div>
              <div className="text-center p-3 rounded-xl bg-card border border-border/80 shadow-sm">
                <span className="text-xs font-bold text-amber-700 block">Rank #3</span>
                <span className="text-sm font-semibold text-foreground">3,410 Pts</span>
                <span className="text-[10px] text-muted-foreground block">IIT Delhi</span>
              </div>
            </div>
          </div>
        </div>

        {/* Filters & Search */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-border/60 pb-4">
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
            <button
              onClick={() => setFilterCategory('all')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filterCategory === 'all'
                  ? 'bg-primary text-primary-foreground font-semibold'
                  : 'text-muted-foreground hover:bg-secondary/50'
              }`}
            >
              Overall Skill Points
            </button>
            <button
              onClick={() => setFilterCategory('leetcode')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filterCategory === 'leetcode'
                  ? 'bg-primary text-primary-foreground font-semibold'
                  : 'text-muted-foreground hover:bg-secondary/50'
              }`}
            >
              LeetCode Solved
            </button>
            <button
              onClick={() => setFilterCategory('codeforces')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filterCategory === 'codeforces'
                  ? 'bg-primary text-primary-foreground font-semibold'
                  : 'text-muted-foreground hover:bg-secondary/50'
              }`}
            >
              Codeforces Rating
            </button>
            <button
              onClick={() => setFilterCategory('github')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filterCategory === 'github'
                  ? 'bg-primary text-primary-foreground font-semibold'
                  : 'text-muted-foreground hover:bg-secondary/50'
              }`}
            >
              GitHub Contributions
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Search student or college..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-8 text-xs"
            />
          </div>
        </div>

        {/* Leaderboard Table */}
        <div className="glass-card rounded-2xl border border-border/80 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-secondary/40 text-xs font-medium text-muted-foreground border-b border-border/60">
                <tr>
                  <th className="py-3.5 px-4 w-14 text-center">#</th>
                  <th className="py-3.5 px-4">Student & College</th>
                  <th className="py-3.5 px-4 text-center">Verified SBTs</th>
                  <th className="py-3.5 px-4 text-center">LeetCode</th>
                  <th className="py-3.5 px-4 text-center">Codeforces</th>
                  <th className="py-3.5 px-4 text-center">GitHub</th>
                  <th className="py-3.5 px-4 text-right">Skill Score</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {filtered.map((item) => (
                  <tr key={item.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="py-4 px-4 text-center font-bold">
                      {item.rank === 1 && <span className="text-amber-500 font-extrabold text-base">🥇 1</span>}
                      {item.rank === 2 && <span className="text-slate-400 font-extrabold text-base">🥈 2</span>}
                      {item.rank === 3 && <span className="text-amber-700 font-extrabold text-base">🥉 3</span>}
                      {item.rank > 3 && <span className="text-muted-foreground">{item.rank}</span>}
                    </td>

                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={item.avatar}
                          alt={item.name}
                          className="h-10 w-10 rounded-full object-cover border border-border"
                        />
                        <div>
                          <div className="font-semibold text-foreground flex items-center gap-1.5">
                            {item.name}
                            <Badge variant="outline" className="text-[10px] py-0 px-1.5 border-primary/40 text-primary">
                              {item.badge}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <Building className="h-3 w-3" /> {item.college}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-4 text-center">
                      <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/30 gap-1 text-xs">
                        <ShieldCheck className="h-3 w-3" /> {item.sbtCount} SBTs
                      </Badge>
                    </td>

                    <td className="py-4 px-4 text-center">
                      <div className="font-semibold text-foreground">{item.leetcode.solved} solved</div>
                      <div className="text-[11px] text-muted-foreground font-mono">Rating: {item.leetcode.rating}</div>
                    </td>

                    <td className="py-4 px-4 text-center">
                      <div className="font-semibold text-foreground">{item.codeforces.rating}</div>
                      <div className="text-[11px] text-muted-foreground">{item.codeforces.rank}</div>
                    </td>

                    <td className="py-4 px-4 text-center">
                      <div className="font-semibold text-foreground">{item.github.commits} commits</div>
                      <div className="text-[11px] text-muted-foreground">{item.github.prs} PRs merged</div>
                    </td>

                    <td className="py-4 px-4 text-right">
                      <span className="text-base font-black text-primary">
                        {item.totalPoints.toLocaleString()}
                      </span>
                      <span className="text-[10px] text-muted-foreground block">points</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
