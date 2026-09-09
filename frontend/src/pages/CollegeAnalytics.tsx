import React from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/auth';
import { BarChart3, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';

const SKILL_DATA = [
  { skill: 'Smart Contracts / Solidity', demand: 88, supply: 60, color: '#F59E0B' },
  { skill: 'Full Stack (Next.js / React)', demand: 92, supply: 85, color: '#10B981' },
  { skill: 'LLM / Vector Search / RAG', demand: 82, supply: 64, color: '#8B5CF6' },
  { skill: 'System Design & DSA', demand: 95, supply: 72, color: '#3B82F6' },
  { skill: 'DevOps / CI-CD / Kubernetes', demand: 76, supply: 55, color: '#EC4899' },
  { skill: 'Rust / Go / C++', demand: 70, supply: 48, color: '#F97316' },
];

export default function CollegeAnalytics() {
  const { session } = useAuth();
  const collegeName = (session?.user as any)?.collegeName || 'Your College';

  return (
    <DashboardLayout role="faculty">
      <div className="max-w-5xl mx-auto space-y-6 py-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border/60 pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <BarChart3 className="h-6 w-6 text-violet-500" /> Industry Demand vs. Curriculum Alignment
            </h1>
            <p className="text-xs text-muted-foreground mt-1">
              {collegeName} · Recruiter skill demand vs. verified student skill supply
            </p>
          </div>
        </div>

        {/* Gap Analysis Chart */}
        <div className="glass-card p-6 rounded-2xl border border-border/80 space-y-5">
          <h2 className="text-base font-bold text-foreground flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" /> Skill Gap Analysis
          </h2>

          <div className="space-y-4">
            {SKILL_DATA.map((item) => {
              const gap = item.demand - item.supply;
              const isAligned = gap < 10;
              return (
                <div key={item.skill} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">{item.skill}</span>
                    <div className="flex items-center gap-2">
                      {isAligned ? (
                        <span className="text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Well Aligned
                        </span>
                      ) : (
                        <span className="text-amber-400 flex items-center gap-1">
                          <AlertCircle className="h-3 w-3" /> Gap: {gap}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="relative h-5 w-full bg-secondary rounded-full overflow-hidden">
                    {/* Supply bar */}
                    <div
                      className="absolute inset-y-0 left-0 rounded-full opacity-70 transition-all"
                      style={{ width: `${item.supply}%`, backgroundColor: item.color }}
                    />
                    {/* Demand marker */}
                    <div
                      className="absolute inset-y-0 border-r-2 border-white/80"
                      style={{ left: `${item.demand}%` }}
                    />
                  </div>
                  <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                    <span>Student Supply: <strong className="text-foreground">{item.supply}%</strong></span>
                    <span>Recruiter Demand: <strong className="text-foreground">{item.demand}%</strong></span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-4 text-[11px] text-muted-foreground pt-2 border-t border-border/40">
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-3 rounded bg-emerald-500 opacity-70" />
              <span>Filled bar = Student supply</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="h-3 w-0.5 bg-white/80" />
              <span>White line = Recruiter demand</span>
            </div>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="glass-card p-5 rounded-2xl border border-border/80 space-y-1">
            <p className="text-xs text-muted-foreground">Average Match Rate</p>
            <p className="text-2xl font-black text-primary">
              {Math.round(SKILL_DATA.reduce((a, s) => a + (s.supply / s.demand) * 100, 0) / SKILL_DATA.length)}%
            </p>
            <p className="text-[11px] text-emerald-400">Across all tracked skills</p>
          </div>
          <div className="glass-card p-5 rounded-2xl border border-border/80 space-y-1">
            <p className="text-xs text-muted-foreground">Highest Gap</p>
            <p className="text-2xl font-black text-amber-400">
              {Math.max(...SKILL_DATA.map(s => s.demand - s.supply))}%
            </p>
            <p className="text-[11px] text-muted-foreground">
              {SKILL_DATA.sort((a, b) => (b.demand - b.supply) - (a.demand - a.supply))[0].skill}
            </p>
          </div>
          <div className="glass-card p-5 rounded-2xl border border-border/80 space-y-1">
            <p className="text-xs text-muted-foreground">Best Aligned Skill</p>
            <p className="text-2xl font-black text-emerald-400">
              {Math.min(...SKILL_DATA.map(s => s.demand - s.supply))}%
            </p>
            <p className="text-[11px] text-muted-foreground">
              {SKILL_DATA.sort((a, b) => (a.demand - a.supply) - (b.demand - b.supply))[0].skill}
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
