import React, { useState } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  BarChart3,
  TrendingUp,
  ShieldCheck,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  PieChart,
  Layers,
  Sparkles,
} from 'lucide-react';

export default function CollegeAnalytics() {
  const [selectedDept, setSelectedDept] = useState('cse');

  return (
    <DashboardLayout role="faculty">
      <div className="container-main py-6 space-y-6">
        {/* Banner */}
        <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-violet-500/10 to-transparent p-6 md:p-8 backdrop-blur-xl">
          <div className="space-y-2 max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              <BarChart3 className="h-3.5 w-3.5" />
              Real-Time Skill-Gap Engine
            </div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
              Institutional Curriculum & Skill-Gap Intelligence
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed">
              Synthesizing live recruiter micro-gig demands, LeetCode/Codeforces points, and student project submissions to benchmark curriculum readiness against 2026 tech industry hiring trends.
            </p>
          </div>
        </div>

        {/* Anti-Fraud & Trust Metrics (From PPT Slide 5) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="glass-card p-5 rounded-2xl border border-border/80 space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>National Hiring Risk Solved</span>
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-black text-emerald-500">74% → 0%</div>
            <p className="text-xs text-muted-foreground">
              Indian HR teams report fake degrees as #1 risk. AlmaDox Soulbound Tokens eliminate degree forgery on Polygon.
            </p>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-border/80 space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Resume Discrepancy Prevention</span>
              <AlertTriangle className="h-4 w-4 text-primary" />
            </div>
            <div className="text-2xl font-black text-primary">41% Mitigated</div>
            <p className="text-xs text-muted-foreground">
              41% of traditional resume claims trace to fake credentials. AlmaDox proves skill through rated micro-gig code.
            </p>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-border/80 space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Campus Placement Multiplier</span>
              <TrendingUp className="h-4 w-4 text-violet-400" />
            </div>
            <div className="text-2xl font-black text-violet-400">2.8x Speed</div>
            <p className="text-xs text-muted-foreground">
              Recruiters shortlist candidates 2.8x faster using AI skill-fit scoring and verified GitHub/LeetCode logs.
            </p>
          </div>
        </div>

        {/* Department Filter */}
        <div className="flex items-center gap-2 border-b border-border/60 pb-3">
          {[
            { id: 'cse', label: 'Computer Science & Engineering' },
            { id: 'ai', label: 'AI & Machine Learning' },
            { id: 'it', label: 'Information Technology' },
            { id: 'ece', label: 'Electronics & Communication' },
          ].map((dept) => (
            <button
              key={dept.id}
              onClick={() => setSelectedDept(dept.id)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedDept === dept.id
                  ? 'bg-primary text-primary-foreground font-semibold'
                  : 'text-muted-foreground hover:bg-secondary/40'
              }`}
            >
              {dept.label}
            </button>
          ))}
        </div>

        {/* Skill Gap Matrix */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="glass-card p-6 rounded-2xl border border-border/80 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" /> Skill Proficiency vs. Corporate Demand
              </h3>
              <Badge variant="outline" className="text-xs">
                Updated Live
              </Badge>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-foreground">EVM / Solidity & Web3 Infrastructure</span>
                  <span className="text-amber-500 font-semibold">Demand: 88% | Student Cohort: 42%</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2.5 overflow-hidden flex">
                  <div className="bg-primary h-2.5 rounded-l-full" style={{ width: '42%' }} />
                  <div className="bg-amber-500/40 h-2.5 rounded-r-full" style={{ width: '46%' }} />
                </div>
                <p className="text-[11px] text-muted-foreground">High unmet demand in decentralized finance and smart contracts.</p>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-foreground">Fullstack Next.js, React & TypeScript</span>
                  <span className="text-emerald-500 font-semibold">Demand: 92% | Student Cohort: 86%</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2.5 overflow-hidden flex">
                  <div className="bg-emerald-500 h-2.5 rounded-full" style={{ width: '86%' }} />
                </div>
                <p className="text-[11px] text-muted-foreground">Well-balanced. Strongest placement conversion rate.</p>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-foreground">Foundation Model Fine-Tuning & Multi-Agent AI</span>
                  <span className="text-violet-400 font-semibold">Demand: 94% | Student Cohort: 55%</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2.5 overflow-hidden flex">
                  <div className="bg-violet-500 h-2.5 rounded-l-full" style={{ width: '55%' }} />
                  <div className="bg-violet-500/30 h-2.5 rounded-r-full" style={{ width: '39%' }} />
                </div>
                <p className="text-[11px] text-muted-foreground">Rapid growth in enterprise demand; students eager for lab compute.</p>
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-foreground">Distributed Systems, Kafka & Golang</span>
                  <span className="text-primary font-semibold">Demand: 76% | Student Cohort: 48%</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2.5 overflow-hidden flex">
                  <div className="bg-primary h-2.5 rounded-l-full" style={{ width: '48%' }} />
                  <div className="bg-primary/30 h-2.5 rounded-r-full" style={{ width: '28%' }} />
                </div>
                <p className="text-[11px] text-muted-foreground">Recommended for Year 3 elective enhancement.</p>
              </div>
            </div>
          </div>

          {/* AI Curriculum Alignment Recommendations */}
          <div className="glass-card p-6 rounded-2xl border border-border/80 space-y-4">
            <h3 className="font-bold text-base text-foreground flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-amber-500" /> Actionable Curriculum Interventions
            </h3>

            <div className="space-y-3">
              <div className="p-4 rounded-xl bg-secondary/40 border border-border/60 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-foreground">Launch Smart Contract Security Elective</span>
                  <Badge className="bg-emerald-500/10 text-emerald-500 text-[10px]">High ROI</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Partner with Polygon Guild to introduce hands-on Foundry & ERC-4337 labs in Semester 6. Closes 46% student skill gap.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-secondary/40 border border-border/60 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-foreground">Incorporate Micro-Gig Hackathons in Grading</span>
                  <Badge className="bg-primary/10 text-primary text-[10px]">Recommended</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Allow students to substitute standard term papers with verified completed industry micro-gigs.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-secondary/40 border border-border/60 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-xs text-foreground">Azure OpenAI Compute Lab Credit</span>
                  <Badge className="bg-violet-500/10 text-violet-400 text-[10px]">Under Review</Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Provide GPU and model API quotas to student AI clubs to accelerate production-ready LLM deliverables.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
