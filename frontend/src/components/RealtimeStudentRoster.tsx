import React, { useState } from 'react';
import { useRealtimeStudents } from '@/lib/useRealtimeStudents';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/mockApi';
import type { Student } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  GraduationCap,
  ShieldCheck,
  Search,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Code2,
  Sparkles,
  RefreshCw,
  Mail,
  UserCheck,
  Star,
  FileText,
  Clock,
  Briefcase,
  Award,
} from 'lucide-react';

interface RealtimeStudentRosterProps {
  role: 'faculty' | 'recruiter';
  collegeId?: string | null;
  targetSkills?: string[];
  onShortlistCandidate?: (student: Student) => void;
}

export default function RealtimeStudentRoster({
  role,
  collegeId,
  targetSkills = [],
  onShortlistCandidate,
}: RealtimeStudentRosterProps) {
  const { students, totalCount, loading, isLive, lastSyncedAt, refetch } = useRealtimeStudents({
    collegeId: role === 'faculty' ? collegeId : undefined,
  });

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [shortlistedIds, setShortlistedIds] = useState<Record<string, boolean>>({});

  const filtered = students.filter((st) => {
    const term = searchQuery.toLowerCase();
    const name = (st.name || '').toLowerCase();
    const email = (st.email || '').toLowerCase();
    const bio = (st.bio || '').toLowerCase();
    const skills = (st.skills || []).join(' ').toLowerCase();
    return name.includes(term) || email.includes(term) || bio.includes(term) || skills.includes(term);
  });

  const { session } = useAuth();
  const recruiterId = session?.userId || 'recruiter';
  const recruiterName = (session?.user as any)?.name || (session?.user as any)?.company || 'Recruiter';

  const handleShortlist = async (st: Student) => {
    // Optimistic UI update
    setShortlistedIds((prev) => ({ ...prev, [st.id]: true }));

    try {
      // 1. Write shortlist record to Firestore via backend
      await api.addToShortlist({
        recruiterId,
        studentId: st.id,
        studentName: st.name || 'Student',
        notes: `Shortlisted for skills: ${(st.skills || []).slice(0, 3).join(', ')}`,
        addedAt: new Date().toISOString(),
      } as any);

      // 2. Create in-app notification for the student
      await api.createNotification({
        userId: st.id,
        type: 'shortlist',
        title: `You were shortlisted by ${recruiterName}!`,
        body: `A recruiter at ${(session?.user as any)?.company || 'a company'} has shortlisted your profile. Check your profile for more details.`,
        meta: { recruiterId, recruiterName },
      }).catch(() => null); // don't fail the shortlist if notification fails

      // 3. Propagate to parent (e.g. increment shortlistedCount counter)
      onShortlistCandidate?.(st);
      toast.success(`✅ ${st.name} shortlisted! They will receive an in-app notification.`);
    } catch (err: any) {
      // Revert optimistic update on failure
      setShortlistedIds((prev) => ({ ...prev, [st.id]: false }));
      toast.error(err?.message || 'Failed to shortlist candidate. Try again.');
    }
  };

  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl glass-card border border-border">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-foreground font-mono flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-primary" />
              {role === 'faculty'
                ? 'Live Enrolled Student Profiles & Verification Status'
                : 'Live Candidate Talent Pool & Verified Student Profiles'}
            </h3>
            <span className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
              {isLive ? 'FIRESTORE REALTIME' : 'REALTIME SYNC'}
            </span>
          </div>
          <p className="text-xs text-muted-foreground">
            {role === 'faculty'
              ? 'Real-time synchronization with student updates, Azure OCR ID verification, and skills graph.'
              : 'Real-time candidate stream. Instant skill verification backed by LeetCode, Codeforces, and Polygon SBTs.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative w-48 sm:w-64">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name, skill, email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-8 pl-8 text-xs bg-secondary/30 font-mono"
            />
          </div>

          <Button
            size="sm"
            variant="outline"
            onClick={() => refetch()}
            className="h-8 px-2.5 text-xs font-mono gap-1"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden md:inline">Refresh</span>
          </Button>
        </div>
      </div>

      {/* Grid of Student Cards */}
      {loading && students.length === 0 ? (
        <div className="p-8 text-center glass-card rounded-xl border border-border space-y-2">
          <RefreshCw className="h-6 w-6 animate-spin text-primary mx-auto" />
          <p className="text-xs text-muted-foreground">Loading real-time student profiles from Firebase...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-8 text-center glass-card rounded-xl border border-dashed border-border space-y-2">
          <p className="text-sm text-foreground font-semibold">No student profiles match your search</p>
          <p className="text-xs text-muted-foreground">
            {searchQuery ? 'Try searching for a different skill or name.' : 'Student profiles will appear here in real-time as users register.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((student) => {
            const isVerified =
              student.verificationStatus === 'verified' ||
              student.idVerification?.status === 'VERIFIED' ||
              (student as any).verificationStatus === 'VERIFIED';
            const isShortlisted = shortlistedIds[student.id];

            const leetcodeCount = student.codingProfiles?.leetcode?.totalSolved ?? null;
            const codeforcesRating = student.codingProfiles?.codeforces?.rating ?? null;

            return (
              <div
                key={student.id}
                className="glass-card p-4 rounded-xl border border-border/80 hover:border-primary/40 transition-all flex flex-col justify-between space-y-4 group bg-surface/50"
              >
                <div className="space-y-3">
                  {/* Top info row */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-mono font-bold text-sm flex-shrink-0">
                        {student.name ? student.name.slice(0, 2).toUpperCase() : 'ST'}
                      </div>
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm text-foreground truncate group-hover:text-primary transition-colors">
                          {student.name || 'Anonymous Student'}
                        </h4>
                        <p className="text-[11px] text-muted-foreground truncate font-mono">
                          {student.email}
                        </p>
                      </div>
                    </div>

                    <Badge
                      variant="outline"
                      className={`text-[10px] font-mono flex-shrink-0 ${
                        isVerified
                          ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
                          : 'border-amber-500/30 text-amber-400 bg-amber-500/10'
                      }`}
                    >
                      {isVerified ? 'VERIFIED' : 'PENDING'}
                    </Badge>
                  </div>

                  {/* Bio snippet */}
                  {student.bio && (
                    <p className="text-xs text-muted-foreground/90 line-clamp-2 leading-relaxed">
                      {student.bio}
                    </p>
                  )}

                  {/* Coding stats badges */}
                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    {leetcodeCount !== null && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#FFA116]/10 text-[#FFA116] border border-[#FFA116]/30 flex items-center gap-1">
                        <Code2 className="h-2.5 w-2.5" />
                        <span>LC: {leetcodeCount} solved</span>
                      </span>
                    )}
                    {codeforcesRating !== null && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#318CE7]/10 text-[#318CE7] border border-[#318CE7]/30 flex items-center gap-1">
                        <Award className="h-2.5 w-2.5" />
                        <span>CF: {codeforcesRating}</span>
                      </span>
                    )}
                    {isVerified && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                        <ShieldCheck className="h-2.5 w-2.5" />
                        <span>OCR Identity Match</span>
                      </span>
                    )}
                  </div>

                  {/* Skills tags */}
                  {student.skills && student.skills.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-1">
                      {student.skills.slice(0, 5).map((skill, idx) => {
                        const matchesTarget = targetSkills.some(
                          (t) => t.toLowerCase() === skill.toLowerCase()
                        );
                        return (
                          <span
                            key={idx}
                            className={`text-[10px] px-2 py-0.5 rounded font-mono ${
                              matchesTarget
                                ? 'bg-primary/20 text-primary border border-primary/40 font-semibold'
                                : 'bg-secondary/60 text-muted-foreground border border-border/60'
                            }`}
                          >
                            {skill}
                          </span>
                        );
                      })}
                      {student.skills.length > 5 && (
                        <span className="text-[10px] text-muted-foreground font-mono px-1 py-0.5">
                          +{student.skills.length - 5} more
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Action footer */}
                <div className="pt-3 border-t border-border/50 flex items-center justify-between gap-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setSelectedStudent(student)}
                    className="text-xs h-7 px-2 font-mono text-muted-foreground hover:text-foreground"
                  >
                    View Details
                  </Button>

                  {role === 'recruiter' && (
                    <Button
                      size="sm"
                      onClick={() => handleShortlist(student)}
                      disabled={isShortlisted}
                      className={`text-xs h-7 px-3 font-mono font-semibold gap-1 ${
                        isShortlisted
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-primary text-primary-foreground'
                      }`}
                    >
                      {isShortlisted ? (
                        <>
                          <CheckCircle2 className="h-3 w-3" />
                          <span>Shortlisted</span>
                        </>
                      ) : (
                        <>
                          <Star className="h-3 w-3" />
                          <span>Shortlist</span>
                        </>
                      )}
                    </Button>
                  )}

                  {role === 'faculty' && (
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {student.collegeId || 'Enrolled'}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Full Student Profile Modal */}
      <Dialog open={Boolean(selectedStudent)} onOpenChange={(open) => !open && setSelectedStudent(null)}>
        {selectedStudent && (
          <DialogContent className="sm:max-w-lg bg-surface border-border">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 border border-primary/30 flex items-center justify-center text-primary font-bold text-base font-mono">
                  {selectedStudent.name ? selectedStudent.name.slice(0, 2).toUpperCase() : 'ST'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span>{selectedStudent.name}</span>
                    <Badge variant="outline" className="text-[10px] font-mono text-emerald-400 border-emerald-500/30">
                      {selectedStudent.verificationStatus}
                    </Badge>
                  </div>
                  <DialogDescription className="text-xs font-mono text-muted-foreground">
                    {selectedStudent.email}
                  </DialogDescription>
                </div>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              {/* Bio */}
              {selectedStudent.bio && (
                <div className="space-y-1">
                  <span className="font-semibold text-foreground font-mono uppercase text-[10px] tracking-wider block">
                    Bio / Summary
                  </span>
                  <p className="text-muted-foreground leading-relaxed bg-secondary/30 p-3 rounded-lg border border-border/60">
                    {selectedStudent.bio}
                  </p>
                </div>
              )}

              {/* Skills */}
              <div className="space-y-1.5">
                <span className="font-semibold text-foreground font-mono uppercase text-[10px] tracking-wider block">
                  Verified Skills
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(selectedStudent.skills || []).map((sk, idx) => (
                    <Badge key={idx} variant="secondary" className="font-mono text-xs">
                      {sk}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Coding Profiles Breakdown */}
              {selectedStudent.codingProfiles && (
                <div className="space-y-2 pt-2 border-t border-border/50">
                  <span className="font-semibold text-foreground font-mono uppercase text-[10px] tracking-wider block">
                    Competitive Coding Records
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedStudent.codingProfiles.leetcode && (
                      <div className="p-3 rounded-lg bg-secondary/30 border border-border/60 space-y-1">
                        <div className="flex items-center justify-between text-[#FFA116] font-bold">
                          <span>LeetCode</span>
                          <span>{selectedStudent.codingProfiles.leetcode.totalSolved} solved</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          {selectedStudent.codingProfiles.leetcode.easy}E / {selectedStudent.codingProfiles.leetcode.medium}M / {selectedStudent.codingProfiles.leetcode.hard}H
                        </div>
                      </div>
                    )}
                    {selectedStudent.codingProfiles.codeforces && (
                      <div className="p-3 rounded-lg bg-secondary/30 border border-border/60 space-y-1">
                        <div className="flex items-center justify-between text-[#318CE7] font-bold">
                          <span>Codeforces</span>
                          <span>Rating: {selectedStudent.codingProfiles.codeforces.rating || 'N/A'}</span>
                        </div>
                        <div className="text-[10px] text-muted-foreground font-mono">
                          Rank: {selectedStudent.codingProfiles.codeforces.rank || 'Unrated'}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* ID Verification Details */}
              {selectedStudent.idVerification && (
                <div className="space-y-2 pt-2 border-t border-border/50">
                  <span className="font-semibold text-foreground font-mono uppercase text-[10px] tracking-wider block">
                    Azure OCR ID Verification
                  </span>
                  <div className="bg-secondary/30 p-3 rounded-lg grid grid-cols-2 gap-2 text-[11px] font-mono">
                    <div>
                      <span className="text-muted-foreground block">Status:</span>
                      <strong className="text-emerald-400">{selectedStudent.idVerification.status}</strong>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Roll Number:</span>
                      <strong className="text-foreground">{selectedStudent.idVerification.extractedData?.rollNumber || 'Verified'}</strong>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
              <Button size="sm" variant="outline" onClick={() => setSelectedStudent(null)}>
                Close
              </Button>
              {role === 'recruiter' && (
                <Button
                  size="sm"
                  onClick={() => {
                    handleShortlist(selectedStudent);
                    setSelectedStudent(null);
                  }}
                  className="bg-primary text-primary-foreground font-mono text-xs"
                >
                  Shortlist Candidate
                </Button>
              )}
            </div>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}
