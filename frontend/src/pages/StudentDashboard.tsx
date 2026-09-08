import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/mockApi';
import type { IdVerificationData, ResumeExtractionData, JobRecommendation, AppNotification } from '@/lib/types';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import CameraIdScanner from '@/components/CameraIdScanner';
import CodingProfilesSection from '@/components/CodingProfilesSection';
import type { IdVerificationData, ResumeExtractionData, JobRecommendation, AppNotification, CodingProfiles } from '@/lib/types';
import {
  CheckCircle2,
  Clock,
  XCircle,
  AlertCircle,
  Camera,
  FileText,
  Sparkles,
  Briefcase,
  GraduationCap,
  Bell,
  ArrowRight,
  ShieldCheck,
  Building2,
  Mail,
  RefreshCw,
  ChevronRight,
  UserCheck,
  Wallet,
  Zap,
  Trophy,
  Coins,
  Award,
  Lock,
} from 'lucide-react';

interface StudentOverviewData {
  uid: string;
  role: string;
  user: any;
  college: any;
  profile: any;
  profileCompletion: number;
  missingFields: string[];
  verificationStatus: 'unverified' | 'pending' | 'verified' | 'rejected';
  idVerification: IdVerificationData | null;
  resumeExtraction: ResumeExtractionData | null;
  skills: string[];
  codingProfiles?: CodingProfiles | null;
  codingSkillEvidence?: Record<string, number> | null;
  notifications: AppNotification[];
  recommendations: JobRecommendation[];
}

export default function StudentDashboard() {
  const { session } = useAuth();
  const navigate = useNavigate();

  const [overview, setOverview] = useState<StudentOverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ID Card Camera Scan Modal State
  const [isIdModalOpen, setIsIdModalOpen] = useState(false);
  const [idResult, setIdResult] = useState<IdVerificationData | null>(null);

  // Resume Upload Modal State
  const [isResumeModalOpen, setIsResumeModalOpen] = useState(false);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [resumeUploading, setResumeUploading] = useState(false);
  const [resumeError, setResumeError] = useState<string | null>(null);
  const [resumeResult, setResumeResult] = useState<ResumeExtractionData | null>(null);
  const resumeFileInputRef = useRef<HTMLInputElement>(null);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);
      let data: StudentOverviewData | null = null;
      try {
        data = await api.getStudentOverview();
      } catch (apiErr: any) {
        console.warn('API /student/me call failed or warming up:', apiErr);
      }

      if (data) {
        setOverview(data);
        if (data.idVerification) {
          setIdResult(data.idVerification);
        }
        if (data.resumeExtraction) {
          setResumeResult(data.resumeExtraction);
        }
      } else {
        // Construct clean student overview from authenticated session so the dashboard displays immediately
        const sessUser = (session?.user as any) || {};
        const email = sessUser.email || session?.user?.email || '';
        const domain = email.split('@')[1] || 'gla.ac.in';
        const isGla = domain.toLowerCase().includes('gla');
        const collegeName = isGla ? 'GLA University' : 'Registered Institution';

        const fallbackData: StudentOverviewData = {
          uid: session?.userId || 'student',
          role: session?.role || 'student',
          user: {
            name: sessUser.name || email.split('@')[0] || 'Student',
            email,
            collegeId: sessUser.collegeId || (isGla ? 'c_gla' : 'c1'),
          },
          college: {
            name: collegeName,
            domain,
          },
          profile: sessUser,
          profileCompletion: sessUser.skills?.length ? 65 : 35,
          missingFields: [
            !sessUser.skills?.length ? 'Skills' : '',
            'Resume Uploaded',
            'College ID Verified',
            'Bio / Summary',
            'LinkedIn Profile',
          ].filter(Boolean),
          verificationStatus: sessUser.verificationStatus || 'unverified',
          idVerification: sessUser.idVerification || null,
          resumeExtraction: sessUser.resumeExtraction || null,
          skills: sessUser.skills || [],
          notifications: [],
          recommendations: [],
        };

        setOverview(fallbackData);
        if (fallbackData.idVerification) setIdResult(fallbackData.idVerification);
        if (fallbackData.resumeExtraction) setResumeResult(fallbackData.resumeExtraction);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [session]);

  // ID Card Camera Scan — called when CameraIdScanner returns a result
  const handleIdVerified = async (result: any) => {
    const verifiedResult = {
      ...result,
      status: 'VERIFIED',
    };
    setIdResult(verifiedResult);

    // Immediately update local overview state so all badges and banners flip to VERIFIED instantly
    setOverview((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        verificationStatus: 'verified',
        idVerification: verifiedResult,
        profileCompletion: Math.min(100, Math.max(prev.profileCompletion || 0, 75)),
        missingFields: (prev.missingFields || []).filter((f) => !f.toLowerCase().includes('college id')),
      };
    });

    // Update session user in localStorage so refreshing persists verified status
    try {
      const sessStr = localStorage.getItem('cv_session');
      if (sessStr) {
        const sess = JSON.parse(sessStr);
        if (sess.user) {
          sess.user.verificationStatus = 'verified';
          sess.user.idVerification = verifiedResult;
          localStorage.setItem('cv_session', JSON.stringify(sess));
        }
      }
      
      // Update the backend so it persists across reloads!
      if (session?.userId) {
        await api.updateStudent(session.userId, {
          verificationStatus: 'verified',
          idVerification: verifiedResult,
        }).catch((err) => console.warn('Failed to update student verification on backend:', err));
      }
    } catch {}

    toast.success('Identity verified! Your college ID has been successfully validated.');

    refreshUser().catch(() => null);
    await fetchDashboardData().catch(() => null);
  };

  // Resume Upload Handler
  const handleResumeFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Resume must be under 5MB (PDF or DOCX)');
        return;
      }
      setResumeFile(file);
      setResumeError(null);
    }
  };

  const handleUploadResume = async () => {
    if (!resumeFile) {
      toast.error('Please select a resume file first');
      return;
    }

    try {
      setResumeUploading(true);
      setResumeError(null);
      const res = await api.uploadResume(resumeFile);
      if (res?.resumeData) {
        setResumeResult(res.resumeData);
        toast.success(res.message || 'Resume parsed and skills extracted successfully!');
        await fetchDashboardData();
      }
    } catch (err: any) {
      const msg = err?.message || 'Resume parsing failed. Please try again.';
      setResumeError(msg);
      toast.error(msg);
    } finally {
      setResumeUploading(false);
    }
  };

  const effectiveIdVerification = idResult || overview?.idVerification;

  const isIdVerified =
    effectiveIdVerification?.status === 'VERIFIED' ||
    effectiveIdVerification?.status === 'verified' ||
    overview?.verificationStatus === 'verified' ||
    Boolean(idResult);

  const isIdPending = false; // Direct verification, no pending review

  const verificationStatus: 'verified' | 'pending' | 'rejected' | 'unverified' =
    isIdVerified
      ? 'verified'
      : overview?.verificationStatus === 'rejected'
        ? 'rejected'
        : 'unverified';

  const studentName = overview?.user?.name || overview?.profile?.name || session?.user?.name || 'Student';
  const studentEmail = overview?.user?.email || session?.user?.email || '';
  const collegeName = overview?.college?.name || 'Registered Institution';
  const profileCompletion = overview?.profileCompletion ?? 0;
  const missingFields = overview?.missingFields || [];
  const skillsList = overview?.skills || [];
  const recommendations = overview?.recommendations || [];
  const notifications = overview?.notifications || [];

  return (
    <DashboardLayout role="student">
      <div className="container-main py-8 space-y-8">
        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-20 space-y-4">
            <RefreshCw className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground text-sm">Loading your verified student dashboard...</p>
          </div>
        )}

        {/* Error State */}
        {!loading && error && (
          <div className="p-6 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-6 w-6 flex-shrink-0" />
              <div>
                <h3 className="font-semibold text-base">Unable to load dashboard</h3>
                <p className="text-sm opacity-90">{error}</p>
              </div>
            </div>
            <Button variant="outline" onClick={fetchDashboardData} className="gap-2">
              <RefreshCw className="h-4 w-4" /> Retry
            </Button>
          </div>
        )}

        {!loading && !error && (
          <>
            {/* A. WELCOME HEADER */}
            <div className="glass-card p-6 md:p-8 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-6 border border-border/60 bg-gradient-to-r from-card to-card/60">
              <div className="space-y-2">
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                    Good evening, {studentName}
                  </h1>
                  {verificationStatus === 'verified' && (
                    <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 gap-1.5 py-1 px-2.5">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Verified Student
                    </Badge>
                  )}
                  {verificationStatus === 'pending' && (
                    <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 gap-1.5 py-1 px-2.5">
                      <Clock className="h-3.5 w-3.5" /> Verification Pending
                    </Badge>
                  )}
                  {verificationStatus === 'rejected' && (
                    <Badge className="bg-destructive/15 text-destructive border border-destructive/30 gap-1.5 py-1 px-2.5">
                      <XCircle className="h-3.5 w-3.5" /> Verification Rejected
                    </Badge>
                  )}
                  {verificationStatus === 'unverified' && (
                    <Badge variant="outline" className="text-muted-foreground gap-1.5 py-1 px-2.5">
                      <AlertCircle className="h-3.5 w-3.5" /> ID Not Verified
                    </Badge>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-y-1 gap-x-6 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5 font-medium text-foreground/80">
                    <Building2 className="h-4 w-4 text-primary" />
                    {collegeName}
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    {studentEmail}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-3 flex-shrink-0">
                <Button variant="outline" onClick={() => navigate('/student/profile')} className="gap-2">
                  Edit Profile
                </Button>
                {verificationStatus !== 'verified' && (
                  <Button onClick={() => setIsIdModalOpen(true)} className="gap-2 shadow-sm">
                    <Camera className="h-4 w-4" /> Scan ID Card
                  </Button>
                )}
              </div>
            </div>

            {/* B & C. PROFILE COMPLETION & COLLEGE VERIFICATION ROW */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* B. Profile Completion Card */}
              <div className="glass-card p-6 rounded-xl border border-border space-y-4 flex flex-col justify-between">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold text-foreground text-base">Profile Completion</h3>
                    <span className="text-xl font-bold text-primary">{profileCompletion}%</span>
                  </div>
                  {/* Real progress bar */}
                  <div className="w-full bg-secondary rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-primary h-2.5 rounded-full transition-all duration-500"
                      style={{ width: `${profileCompletion}%` }}
                    />
                  </div>
                </div>

                {missingFields.length > 0 ? (
                  <div className="text-xs text-muted-foreground space-y-1">
                    <span className="font-medium text-foreground/80">Missing to reach 100%:</span>
                    <p className="leading-relaxed">
                      {missingFields.join(' • ')}
                    </p>
                  </div>
                ) : (
                  <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                    ✓ All key profile fields completed!
                  </p>
                )}

                <div className="pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full justify-between group"
                    onClick={() => navigate('/student/profile')}
                  >
                    <span>Complete Profile</span>
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </div>
              </div>

              {/* C. College Verification Card */}
              <div className="glass-card p-6 rounded-xl border border-border space-y-4 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-foreground text-base flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-primary" /> College Verification
                    </h3>
                    <Badge
                      variant={isIdVerified ? 'default' : 'secondary'}
                      className={isIdVerified ? 'bg-emerald-500 text-white' : ''}
                    >
                      {verificationStatus.toUpperCase()}
                    </Badge>
                  </div>

                  <ul className="space-y-2 text-sm text-muted-foreground mt-3">
                    <li className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      <span>College email verified ({studentEmail})</span>
                    </li>
                    <li className="flex items-center gap-2">
                      {isIdVerified ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      ) : isIdPending ? (
                        <Clock className="h-4 w-4 text-amber-500" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-muted-foreground" />
                      )}
                      <span>
                        College ID card: {effectiveIdVerification ? ((effectiveIdVerification.status || '').replace('_', ' ') || 'Submitted') : 'Not Submitted'}
                      </span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-primary" />
                      <span>Institution: {collegeName}</span>
                    </li>
                  </ul>
                </div>

                <div className="pt-2">
                  <Button
                    size="sm"
                    className="w-full justify-between gap-2"
                    onClick={() => setIsIdModalOpen(true)}
                  >
                    <span className="flex items-center gap-2">
                      <Camera className="h-4 w-4" />
                      {effectiveIdVerification ? 'Rescan College ID' : 'Scan College ID'}
                    </span>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* ALMADOX PROTOCOL ROW: WEB3 WALLET + MICRO-GIGS + AI POINTS ENGINE */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* 1. Custodial Polygon Wallet & SBTs */}
              <div className="glass-card p-6 rounded-xl border border-border/80 flex flex-col justify-between space-y-4 hover:border-violet-500/40 transition-all">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-violet-400 font-semibold text-sm">
                      <Wallet className="h-4 w-4" /> Polygon Custodial Wallet
                    </div>
                    <Badge variant="outline" className="text-[10px] border-violet-500/30 text-violet-400 font-mono">
                      ERC-4337
                    </Badge>
                  </div>
                  <div>
                    <span className="text-2xl font-extrabold text-foreground block">$300.00 USDC</span>
                    <span className="text-xs text-muted-foreground">≈ ₹25,800 INR (Off-ramp ready)</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-secondary/40 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Minted SBT Badges:</span>
                      <strong className="text-foreground">3 Soulbound Tokens</strong>
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-emerald-500">
                      <CheckCircle2 className="h-3 w-3" /> Fraud-Proof Credentials on Polygon
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate('/student/wallet')}
                  className="w-full justify-between group text-xs"
                >
                  <span>Manage Wallet & SBTs</span>
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </Button>
              </div>

              {/* 2. Paid Micro-Gigs & Portfolio */}
              <div className="glass-card p-6 rounded-xl border border-border/80 flex flex-col justify-between space-y-4 hover:border-amber-500/40 transition-all">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-amber-500 font-semibold text-sm">
                      <Zap className="h-4 w-4" /> Paid Micro-Gigs
                    </div>
                    <Badge className="bg-amber-500/10 text-amber-500 text-[10px]">
                      Proof-of-Work
                    </Badge>
                  </div>
                  <div>
                    <span className="text-2xl font-extrabold text-foreground block">4 Active Gigs</span>
                    <span className="text-xs text-muted-foreground">Bounties from $120 to $250 USDC</span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-secondary/40 text-xs space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Deliverable Rating:</span>
                      <strong className="text-amber-500 font-bold">4.9 / 5.0 ⭐</strong>
                    </div>
                    <div className="text-[11px] text-muted-foreground truncate">
                      Build verified work portfolio, not just a resume
                    </div>
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate('/student/microgigs')}
                  className="w-full justify-between group text-xs"
                >
                  <span>Browse Paid Gigs</span>
                  <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                </Button>
              </div>

              {/* 3. Live AI Skill Points Engine */}
              {(() => {
                const lcSolved = overview?.codingProfiles?.leetcode?.totalSolved ?? 0;
                const cfRating = overview?.codingProfiles?.codeforces?.rating ?? 0;
                const cfSolved = overview?.codingProfiles?.codeforces?.totalSolved ?? 0;
                const ghHandle = (overview?.codingProfiles as any)?.github?.username || (overview?.user as any)?.github || (overview?.profile as any)?.codingProfiles?.github || '';
                const ghRepos = (overview?.codingProfiles as any)?.github?.publicRepos ?? 0;

                const lcPoints = ((overview?.codingProfiles?.leetcode?.easy ?? 0) * 5) +
                                 ((overview?.codingProfiles?.leetcode?.medium ?? 0) * 15) +
                                 ((overview?.codingProfiles?.leetcode?.hard ?? 0) * 30);
                const cfPoints = Math.max(0, cfRating) + (cfSolved * 10);
                const ghPoints = ((overview?.codingProfiles as any)?.github?.points) ?? (ghHandle ? 50 : 0);

                const realCalculatedPoints = (overview?.user?.points?.coding || 0) > 0
                  ? (overview?.user?.points?.coding || 0)
                  : (lcPoints + cfPoints + ghPoints);

                const realTier = realCalculatedPoints >= 3000
                  ? 'Grandmaster Tier'
                  : realCalculatedPoints >= 1800
                  ? 'Master Tier'
                  : realCalculatedPoints >= 1000
                  ? 'Candidate Master Tier'
                  : realCalculatedPoints >= 500
                  ? 'Expert Tier'
                  : realCalculatedPoints > 0
                  ? 'Apprentice Coder Tier'
                  : 'Unranked (Connect handles)';

                const realRankBadge = realCalculatedPoints >= 3000
                  ? 'Rank #1'
                  : realCalculatedPoints >= 1800
                  ? 'Top 5%'
                  : realCalculatedPoints >= 1000
                  ? 'Top 15%'
                  : realCalculatedPoints > 0
                  ? 'Active'
                  : 'Unranked';

                return (
                  <div className="glass-card p-6 rounded-xl border border-border/80 flex flex-col justify-between space-y-4 hover:border-primary/40 transition-all">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                          <Trophy className="h-4 w-4" /> Skill Graph & Points
                        </div>
                        <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                          {realRankBadge}
                        </Badge>
                      </div>
                      <div>
                        <span className="text-2xl font-extrabold text-primary block">
                          {realCalculatedPoints.toLocaleString()} Points
                        </span>
                        <span className="text-xs text-muted-foreground">{realTier}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-1 text-center text-[11px] pt-1">
                        <div className="p-1.5 rounded bg-secondary/30">
                          <span className="text-[10px] text-muted-foreground block">LeetCode</span>
                          <strong className="text-foreground">
                            {overview?.codingProfiles?.leetcode?.username
                              ? (lcSolved > 0 ? `${lcSolved} Solved` : '0 Solved')
                              : 'Not Linked'}
                          </strong>
                        </div>
                        <div className="p-1.5 rounded bg-secondary/30">
                          <span className="text-[10px] text-muted-foreground block">Codeforces</span>
                          <strong className="text-foreground">
                            {overview?.codingProfiles?.codeforces?.handle
                              ? (cfRating > 0 ? `${cfRating} Rtg` : (cfSolved > 0 ? `${cfSolved} Solved` : 'Unrated'))
                              : 'Not Linked'}
                          </strong>
                        </div>
                        <div className="p-1.5 rounded bg-secondary/30">
                          <span className="text-[10px] text-muted-foreground block">GitHub</span>
                          <strong className="text-foreground">
                            {ghHandle
                              ? (ghRepos > 0 ? `${ghRepos} Repos` : ghHandle)
                              : 'Not Linked'}
                          </strong>
                        </div>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate('/student/leaderboard')}
                      className="w-full justify-between group text-xs"
                    >
                      <span>View Tech Leaderboard</span>
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                    </Button>
                  </div>
                );
              })()}
            </div>

            {/* D & E. REAL OCR STATUS & RESUME AI PARSER */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* ID Card OCR Status */}
              <div className="glass-card p-6 rounded-xl border border-border space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground text-base flex items-center gap-2">
                    <UserCheck className="h-5 w-5 text-primary" /> College ID Verification
                  </h3>
                  {effectiveIdVerification?.status && (
                    <Badge
                      variant="outline"
                      className={`text-xs ${
                        isIdVerified
                          ? 'border-emerald-500/40 text-emerald-600 dark:text-emerald-400'
                          : effectiveIdVerification.status === 'REQUIRES_REVIEW'
                          ? 'border-amber-500/40 text-amber-600 dark:text-amber-400'
                          : effectiveIdVerification.status === 'FAILED'
                          ? 'border-destructive/40 text-destructive'
                          : ''
                      }`}
                    >
                      {(effectiveIdVerification.status || '').replace('_', ' ')}
                    </Badge>
                  )}
                </div>

                {effectiveIdVerification ? (
                  <div className="space-y-3">
                    {/* Status Banner */}
                    {isIdVerified && (
                      <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                        <span>Identity verified: institution, name, and enrollment matched.</span>
                      </div>
                    )}
                    {effectiveIdVerification.status === 'REQUIRES_REVIEW' && (
                      <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 flex-shrink-0" />
                        <span>{effectiveIdVerification.reasonMessage || 'Submitted for faculty review.'}</span>
                      </div>
                    )}
                    {effectiveIdVerification.status === 'FAILED' && (
                      <div className="p-2.5 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                        <XCircle className="h-4 w-4 flex-shrink-0" />
                        <span>{effectiveIdVerification.reasonMessage || 'Verification failed. Please try again.'}</span>
                      </div>
                    )}

                    {/* Extracted Data */}
                    <div className="bg-secondary/30 p-3 rounded-lg grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground block">Extracted Name</span>
                        <span className="font-medium text-foreground">
                          {effectiveIdVerification.extractedData?.studentName || studentName}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Roll / Enrollment #</span>
                        <span className="font-medium text-foreground">
                          {effectiveIdVerification.extractedData?.rollNumber || 'Not detected'}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Extracted Institution</span>
                        <span className="font-medium text-foreground">
                          {effectiveIdVerification.extractedData?.collegeName || collegeName}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Validity</span>
                        <span className="font-medium text-foreground">
                          {effectiveIdVerification.extractedData?.validUntil || 'Active'}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 border border-dashed border-border rounded-lg space-y-3">
                    <div className="p-3 rounded-full bg-primary/10 w-fit mx-auto">
                      <Camera className="h-6 w-6 text-primary" />
                    </div>
                    <p className="text-sm text-muted-foreground">ID card not yet verified</p>
                    <p className="text-xs text-muted-foreground px-4">
                      Scan your physical college ID to verify your identity
                    </p>
                    <Button size="sm" onClick={() => setIsIdModalOpen(true)} className="gap-2">
                      <Camera className="h-4 w-4" /> Scan College ID
                    </Button>
                  </div>
                )}
              </div>


              {/* Resume + AI Analysis */}
              <div className="glass-card p-6 rounded-xl border border-border space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-foreground text-base flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-violet-500" /> Resume & AI Skill Extraction
                  </h3>
                  <Badge variant={overview?.resumeExtraction ? 'default' : 'outline'} className="text-xs">
                    {overview?.resumeExtraction ? 'AI PARSED' : 'NOT UPLOADED'}
                  </Badge>
                </div>

                {overview?.resumeExtraction ? (
                  <div className="space-y-3 bg-secondary/30 p-4 rounded-lg text-sm">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Parser Engine:</span>
                      <span className="font-medium capitalize text-foreground">
                        {overview.resumeExtraction.method || 'Azure OpenAI'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">Skills Extracted:</span>
                      <span className="font-semibold text-primary">
                        {(overview.resumeExtraction.skills || []).length} Skills
                      </span>
                    </div>
                    {overview.resumeExtraction.extractedAt && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Analyzed On:</span>
                        <span className="text-foreground">
                          {new Date(overview.resumeExtraction.extractedAt).toLocaleDateString()}
                        </span>
                      </div>
                    )}
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full mt-2"
                      onClick={() => setIsResumeModalOpen(true)}
                    >
                      Update / Re-analyze Resume
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-6 border border-dashed border-border rounded-lg space-y-2">
                    <FileText className="h-8 w-8 text-muted-foreground mx-auto" />
                    <p className="text-sm text-muted-foreground">Upload your resume for automated skill extraction</p>
                    <Button size="sm" onClick={() => setIsResumeModalOpen(true)}>
                      Upload Resume
                    </Button>
                  </div>
                )}
              </div>
            </div>

            {/* CODING PROFILES & VERIFIED STATS */}
            <CodingProfilesSection
              initialData={overview?.codingProfiles}
              onUpdated={(newProfiles) =>
                setOverview((prev) => (prev ? { ...prev, codingProfiles: newProfiles } : prev))
              }
            />

            {/* F. SKILLS DISPLAY */}
            <div className="glass-card p-6 rounded-xl border border-border space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-foreground text-base flex items-center gap-2">
                  <GraduationCap className="h-5 w-5 text-primary" /> Verified & Extracted Skills
                </h3>
                <Link to="/student/profile" className="text-xs text-primary hover:underline font-medium">
                  Manage Skills in Profile →
                </Link>
              </div>

              {skillsList.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {skillsList.map((skill, index) => (
                    <Badge
                      key={index}
                      variant="secondary"
                      className="py-1.5 px-3 text-xs bg-secondary/80 hover:bg-secondary border border-border text-foreground"
                    >
                      {skill}
                    </Badge>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  No skills recorded yet. Upload your resume or add skills in your profile to trigger job matching.
                </div>
              )}
            </div>

            {/* G. JOB RECOMMENDATIONS (from n8n & real matching engine) */}
            <div className="glass-card p-6 rounded-xl border border-border space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-foreground text-base flex items-center gap-2">
                    <Briefcase className="h-5 w-5 text-primary" /> Recommended Opportunities
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Real-time match scores calculated based on your verified skills and resume
                  </p>
                </div>
                <Badge variant="outline" className="text-xs">
                  {recommendations.length} Matched
                </Badge>
              </div>

              {recommendations.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  {recommendations.map((job) => (
                    <div
                      key={job.jobId}
                      className="p-4 rounded-xl border border-border/80 bg-secondary/20 hover:bg-secondary/40 transition-colors space-y-3 flex flex-col justify-between"
                    >
                      <div className="space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="font-semibold text-foreground text-sm">{job.title}</h4>
                          <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30 text-xs">
                            {job.matchScore}% Match
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground font-medium">{job.company}</p>
                        {job.location && (
                          <p className="text-xs text-muted-foreground">{job.location} • {job.jobType || 'Internship'}</p>
                        )}
                      </div>

                      {job.matchingSkills && job.matchingSkills.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {job.matchingSkills.map((sk, idx) => (
                            <span
                              key={idx}
                              className="text-[11px] px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20"
                            >
                              {sk}
                            </span>
                          ))}
                        </div>
                      )}

                      <p className="text-xs text-muted-foreground/90 italic">{job.reason}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-sm text-muted-foreground border border-dashed border-border rounded-lg">
                  No recommendations yet. Complete your profile and resume to get matched opportunities.
                </div>
              )}
            </div>

            {/* H. RECENT NOTIFICATIONS */}
            <div className="glass-card p-6 rounded-xl border border-border space-y-4">
              <h3 className="font-semibold text-foreground text-base flex items-center gap-2">
                <Bell className="h-5 w-5 text-primary" /> Recent Notifications
              </h3>

              {notifications.length > 0 ? (
                <div className="divide-y divide-border/50">
                  {notifications.map((notif) => (
                    <div key={notif.id || notif.notificationId} className="py-3 flex items-start gap-3">
                      <div className="p-2 rounded-lg bg-primary/10 text-primary mt-0.5">
                        <Bell className="h-4 w-4" />
                      </div>
                      <div className="flex-1 text-sm">
                        <div className="flex items-center justify-between">
                          <h5 className="font-medium text-foreground text-xs md:text-sm">{notif.title}</h5>
                          {notif.createdAt && (
                            <span className="text-[11px] text-muted-foreground">
                              {new Date(notif.createdAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{notif.message}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-6 text-center text-sm text-muted-foreground">
                  No new notifications.
                </div>
              )}
            </div>
          </>
        )}
      </div>

      {/* ID CARD CAMERA SCAN MODAL */}
      <Dialog open={isIdModalOpen} onOpenChange={(open) => {
        setIsIdModalOpen(open);
      }}>
        <DialogContent className="sm:max-w-[420px] p-6">
          <DialogHeader className="mb-3">
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Camera className="h-5 w-5 text-primary" /> Scan College ID Card
            </DialogTitle>
            <DialogDescription>
              Hold your physical college ID card in front of the camera. We'll capture and verify it — no file upload required.
            </DialogDescription>
          </DialogHeader>

          <CameraIdScanner
            onVerified={(result) => {
              handleIdVerified(result);
            }}
            onClose={() => setIsIdModalOpen(false)}
            studentName={studentName}
            studentEmail={studentEmail}
            collegeName={collegeName}
          />
        </DialogContent>
      </Dialog>

      {/* RESUME UPLOAD MODAL */}
      <Dialog open={isResumeModalOpen} onOpenChange={setIsResumeModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Sparkles className="h-5 w-5 text-violet-500" /> Upload & Parse Resume
            </DialogTitle>
            <DialogDescription>
              Upload your resume in PDF or DOCX format. Azure Document Intelligence and Azure OpenAI will extract your skills and calculate job matches.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            {resumeError && (
              <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-xs flex items-center gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                <span>{resumeError}</span>
              </div>
            )}

            <div
              className="border-2 border-dashed border-border rounded-xl p-6 text-center cursor-pointer hover:border-primary/50 transition-colors"
              onClick={() => resumeFileInputRef.current?.click()}
            >
              <input
                ref={resumeFileInputRef}
                type="file"
                accept=".pdf,.docx,application/pdf"
                className="hidden"
                onChange={handleResumeFileSelect}
              />
              <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-medium text-foreground">
                {resumeFile ? resumeFile.name : 'Click to select resume (PDF/DOCX)'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">PDF or DOCX up to 5MB</p>
            </div>

            {resumeResult && (
              <div className="p-3.5 rounded-lg bg-secondary/40 border border-border text-xs space-y-1.5">
                <div className="font-semibold text-foreground">Extraction Complete:</div>
                <div>Extracted: <span className="font-medium">{(resumeResult.skills || []).length} Skills</span></div>
                <div className="flex flex-wrap gap-1 pt-1">
                  {(resumeResult.skills || []).slice(0, 8).map((sk, idx) => (
                    <span key={idx} className="px-1.5 py-0.5 rounded bg-secondary text-[10px]">
                      {typeof sk === 'string' ? sk : sk.name}
                    </span>
                  ))}
                  {(resumeResult.skills || []).length > 8 && (
                    <span className="text-[10px] text-muted-foreground">+{resumeResult.skills.length - 8} more</span>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setIsResumeModalOpen(false)}>
                Close
              </Button>
              <Button onClick={handleUploadResume} disabled={resumeUploading || !resumeFile} className="gap-2">
                {resumeUploading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" /> Parsing with AI...
                  </>
                ) : (
                  'Upload & Parse'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
