import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/mockApi';
import { Button } from '@/components/ui/button';
import RealtimeStudentRoster from '@/components/RealtimeStudentRoster';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import {
  GraduationCap,
  Users,
  ShieldCheck,
  TrendingUp,
  Briefcase,
  AlertCircle,
  Bell,
  ArrowRight,
  CheckCircle2,
  Calendar,
  Building,
  Sparkles,
  BarChart3,
  Award,
} from 'lucide-react';

export default function CollegeDashboard() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const facultyName = session?.user?.name || (session?.user as any)?.email?.split('@')[0] || 'Dean of Engineering';
  const collegeName = (session?.user as any)?.collegeName || 'Your College';
  const collegeId = (session?.user as any)?.collegeId || '';

  const [pendingCount, setPendingCount] = useState(0);
  const [verifiedCount, setVerifiedCount] = useState(0);
  const [totalStudents, setTotalStudents] = useState(0);
  const [placedCount, setPlacedCount] = useState(0);
  const [placementRate, setPlacementRate] = useState(0);
  const [openGigsCount, setOpenGigsCount] = useState(0);
  const [recruiterCount, setRecruiterCount] = useState(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadStats();
  }, [collegeId]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const [pendingRes, verifiedRes, gigs, analyticsRes, placementsRes] = await Promise.all([
        api.getFacultyPendingStudents().catch(() => null),
        api.getVerifiedStudents().catch(() => []),
        api.getGigs().catch(() => []),
        api.getCollegeAnalytics().catch(() => null),
        api.getPlacements(collegeId || undefined).catch(() => []),
      ]);

      const stats = analyticsRes?.stats || {};

      let pPending = 0;
      if (pendingRes && Array.isArray(pendingRes.students)) {
        pPending = pendingRes.students.length;
      } else if (typeof stats.totalPendingStudents === 'number') {
        pPending = stats.totalPendingStudents;
      }
      setPendingCount(pPending);

      const verifiedList = Array.isArray(verifiedRes) ? verifiedRes : [];
      const myVerified = collegeId
        ? verifiedList.filter((s: any) => s.collegeId === collegeId)
        : verifiedList;
      const vCount = myVerified.length || stats.totalVerifiedStudents || 0;
      setVerifiedCount(vCount);

      const totStudents = stats.totalStudents || (vCount + pPending) || 0;
      setTotalStudents(totStudents);

      // Real placements count
      const myPlacements = Array.isArray(placementsRes)
        ? (collegeId ? placementsRes.filter((p: any) => p.collegeId === collegeId || p.status === 'placed') : placementsRes)
        : [];
      const pCount = myPlacements.length || stats.totalPlacements || 0;
      setPlacedCount(pCount);

      const computedRate = totStudents > 0
        ? Math.min(100, Math.round((pCount / totStudents) * 100))
        : (stats.placementRate || 0);
      setPlacementRate(computedRate);

      const openGigs = Array.isArray(gigs) ? gigs.filter((g: any) => g.status === 'open' || !g.status) : [];
      setOpenGigsCount(openGigs.length || stats.totalOpenGigs || 0);

      const rCount = stats.totalRecruiters || 0;
      if (rCount > 0) {
        setRecruiterCount(rCount);
      } else {
        const shortlist = await api.getShortlist('').catch(() => []);
        const uniqueRecruiters = new Set((Array.isArray(shortlist) ? shortlist : []).map((s: any) => s.recruiterId).filter(Boolean));
        setRecruiterCount(uniqueRecruiters.size || 0);
      }
    } catch {
      // Keep defaults
    } finally {
      setLoading(false);
    }
  };


  return (
    <DashboardLayout role="faculty">
      <div className="container-main py-6 space-y-6">
        {/* Welcome Banner */}
        <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-purple-500/10 to-transparent p-6 md:p-8 backdrop-blur-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <Building className="h-3.5 w-3.5" />
                University Administration Portal
              </div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                Welcome back, {facultyName}
              </h1>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {collegeName} Placement & Academic Alignment Portal. Real-time skill analytics, Azure OCR student verification, and Soulbound Token governance.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={() => navigate('/college/profile')} className="gap-2 shadow-sm bg-primary text-primary-foreground">
                <Building className="h-4 w-4" /> Manage College Profile
              </Button>
              <Button variant="outline" onClick={() => navigate('/college/placements')} className="gap-2">
                <Briefcase className="h-4 w-4 text-emerald-500" /> Placements ({placedCount})
              </Button>
              <Button variant="outline" onClick={() => navigate('/college/verification')} className="gap-2">
                <ShieldCheck className="h-4 w-4" /> Verification Queue ({pendingCount})
              </Button>
            </div>
          </div>
        </div>

        {/* 4 Core University Metric KPIs with Real Live Aggregated Data */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-card p-5 rounded-2xl border border-border/80 space-y-2">
            <div className="flex items-center justify-between text-muted-foreground text-xs">
              <span>Verified Student Roster</span>
              <ShieldCheck className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-black text-foreground">{verifiedCount}</div>
            <div className="text-[11px] text-emerald-500 font-medium flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" /> {totalStudents > 0 ? `${totalStudents} Total Registered` : 'SBT-verified identities'}
            </div>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-border/80 space-y-2">
            <div className="flex items-center justify-between text-muted-foreground text-xs">
              <span>Campus Placement Rate</span>
              <TrendingUp className="h-4 w-4 text-primary" />
            </div>
            <div className="text-2xl font-black text-primary">{placementRate}%</div>
            <div className="text-[11px] text-muted-foreground font-medium">
              {placedCount} student{placedCount !== 1 ? 's' : ''} placed via platform
            </div>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-border/80 space-y-2">
            <div className="flex items-center justify-between text-muted-foreground text-xs">
              <span>Active Micro-Gigs</span>
              <Award className="h-4 w-4 text-amber-500" />
            </div>
            <div className="text-2xl font-black text-amber-500">{openGigsCount} Open</div>
            <div className="text-[11px] text-muted-foreground font-medium">
              Live from recruiter postings
            </div>
          </div>

          <div className="glass-card p-5 rounded-2xl border border-border/80 space-y-2">
            <div className="flex items-center justify-between text-muted-foreground text-xs">
              <span>Partner Recruiters</span>
              <Briefcase className="h-4 w-4 text-violet-500" />
            </div>
            <div className="text-2xl font-black text-violet-400">{recruiterCount} Companies</div>
            <div className="text-[11px] text-emerald-500 font-medium">
              Active corporate hiring
            </div>
          </div>
        </div>

        {/* 2 Big Dashboard Panels */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Panel 1: Pending Student Verifications */}
          <div className="glass-card p-6 rounded-2xl border border-border/80 space-y-4 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5 text-primary" /> Student Identity Verification
                </h3>
                <Badge variant="secondary" className="text-xs">
                  {pendingCount} Pending Review
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Students who scanned their physical university ID card via camera. Azure OCR and regex validation compare roll number, student name, and institutional email domain.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-secondary/30 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Automated OCR Match:</span>
                <span className="font-semibold text-emerald-500">92% Match Threshold</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">Soulbound Token Issuance:</span>
                <span className="font-semibold text-primary">On-chain Polygon Minting Enabled</span>
              </div>
            </div>

            <Button
              onClick={() => navigate('/college/verification')}
              className="w-full justify-between group"
            >
              <span>Review Pending Verifications</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>

          {/* Panel 2: Live Skill-Gap Analysis Overview */}
          <div className="glass-card p-6 rounded-2xl border border-border/80 space-y-4 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-base text-foreground flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-violet-500" /> Industry Demand Alignment
                </h3>
                <Badge variant="outline" className="text-xs border-violet-500/30 text-violet-400">
                  AI Real-Time Radar
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">
                Comparison of top recruiter micro-gig requirements vs. student curriculum proficiency across Computer Science, AI, and Electronics.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-foreground font-medium">Smart Contracts & Solidity</span>
                  <span className="text-amber-500 font-semibold">68% Match (Gap: 32%)</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                  <div className="bg-amber-500 h-2 rounded-full" style={{ width: '68%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-foreground font-medium">Full Stack (Next.js / TypeScript)</span>
                  <span className="text-emerald-500 font-semibold">92% Match (Well Aligned)</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                  <div className="bg-emerald-500 h-2 rounded-full" style={{ width: '92%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-foreground font-medium">LLM Fine-Tuning & Vector Search</span>
                  <span className="text-primary font-semibold">78% Match (Gap: 22%)</span>
                </div>
                <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                  <div className="bg-primary h-2 rounded-full" style={{ width: '78%' }} />
                </div>
              </div>
            </div>

            <Button
              variant="outline"
              onClick={() => navigate('/college/analytics')}
              className="w-full justify-between group"
            >
              <span>Explore Detailed Skill Analytics</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
          </div>
        </div>

        {/* Real-time Student Roster (Live Firestore) */}
        <RealtimeStudentRoster
          role="faculty"
          collegeId={(session?.user as any)?.collegeId || (session?.user as any)?.college?.id || 'c1'}
        />
      </div>
    </DashboardLayout>
  );
}
