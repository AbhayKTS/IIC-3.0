import React from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Briefcase,
  Building,
  CheckCircle2,
  Users,
  TrendingUp,
  Star,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';

const RECRUITER_PARTNERS = [
  {
    name: 'Polygon Labs',
    roles: ['Core Protocol Engineer', 'Smart Contract Auditor'],
    hiredCount: 14,
    rating: 4.9,
    status: 'Active Partner',
    bountiesPaid: '18,400 POL',
  },
  {
    name: 'Microsoft India',
    roles: ['Full Stack Engineer (Azure AI)', 'Cloud DevOps Intern'],
    hiredCount: 22,
    rating: 4.8,
    status: 'Active Partner',
    bountiesPaid: '26,000 POL',
  },
  {
    name: 'Google DeepMind',
    roles: ['ML Research Fellow', 'Applied LLM Intern'],
    hiredCount: 6,
    rating: 5.0,
    status: 'Research Partner',
    bountiesPaid: '12,500 POL',
  },
  {
    name: 'CRED',
    roles: ['Backend Systems Engineer', 'Data Platform Engineer'],
    hiredCount: 11,
    rating: 4.9,
    status: 'Active Partner',
    bountiesPaid: '15,000 POL',
  },
];

export default function CollegeRecruiters() {
  return (
    <DashboardLayout role="faculty">
      <div className="container-main py-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border/60 pb-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
              <Briefcase className="h-6 w-6 text-primary" /> Corporate Recruiter Partnerships
            </h1>
            <p className="text-xs text-muted-foreground">
              Monitor hiring companies, micro-gig bounty settlement records, and industry ratings of your student talent.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {RECRUITER_PARTNERS.map((rec) => (
            <div
              key={rec.name}
              className="glass-card p-6 rounded-2xl border border-border/80 flex flex-col justify-between space-y-4 shadow-sm"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/30 text-xs">
                    {rec.status}
                  </Badge>
                  <div className="flex items-center gap-1 text-amber-500 font-bold text-xs">
                    <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" /> {rec.rating} / 5.0
                  </div>
                </div>

                <h3 className="font-bold text-lg text-foreground">{rec.name}</h3>

                <div className="space-y-1">
                  <span className="text-xs text-muted-foreground">Active Roles & Gigs:</span>
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {rec.roles.map((r) => (
                      <span
                        key={r}
                        className="px-2.5 py-0.5 rounded-md bg-secondary/60 text-[11px] text-foreground/80 font-medium"
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
                <span>Total Students Hired: <strong className="text-foreground">{rec.hiredCount}</strong></span>
                <span className="text-purple-600 dark:text-purple-400 font-semibold">{rec.bountiesPaid} Disbursed</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
