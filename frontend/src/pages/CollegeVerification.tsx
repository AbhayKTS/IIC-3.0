import React, { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/mockApi';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import {
  UserCheck,
  Search,
  RefreshCw,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  FileText,
  ShieldCheck,
  Clock,
  Building,
} from 'lucide-react';

export default function CollegeVerification() {
  const { session } = useAuth();
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchPendingStudents = async () => {
    try {
      setLoading(true);
      // Try faculty-specific queue endpoint first
      const facultyRes = await api.getFacultyPendingStudents().catch(() => null);
      if (facultyRes && Array.isArray(facultyRes.students)) {
        setStudents(facultyRes.students);
        return;
      }

      // Fallback to compat endpoint with collegeId
      const collegeId = (session?.user as any)?.collegeId || 'iitd';
      const compatStudents = await api.getPendingStudents(collegeId);
      setStudents(compatStudents || []);
    } catch (err: any) {
      toast.error(err.message || 'Failed to load verification queue');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const facultyUser = session?.user as any;
    const facultyCollegeId = facultyUser?.collegeId || facultyUser?.college?.id || 'iitd';
    if (!facultyCollegeId) {
      setLoading(false);
      return;
    }

    setLoading(true);

    let mapPending = new Map<string, any>();
    let mapPendingReview = new Map<string, any>();

    const updateCombined = () => {
      const combined = new Map<string, any>();
      mapPending.forEach((val, key) => combined.set(key, val));
      mapPendingReview.forEach((val, key) => combined.set(key, val));
      setStudents(Array.from(combined.values()));
      setLoading(false);
    };

    // Live subscription 1: verificationStatus == 'pending'
    const q1 = query(
      collection(db, 'users'),
      where('role', '==', 'student'),
      where('collegeId', '==', facultyCollegeId),
      where('verificationStatus', '==', 'pending')
    );

    // Live subscription 2: idVerification.status == 'pending_review'
    const q2 = query(
      collection(db, 'users'),
      where('role', '==', 'student'),
      where('collegeId', '==', facultyCollegeId),
      where('idVerification.status', '==', 'pending_review')
    );

    const unsub1 = onSnapshot(
      q1,
      (snapshot) => {
        mapPending = new Map();
        snapshot.docs.forEach((d) => mapPending.set(d.id, { id: d.id, ...d.data() }));
        updateCombined();
      },
      (err) => {
        console.warn('[CollegeVerification] pending listener warning:', err);
        fetchPendingStudents();
      }
    );

    const unsub2 = onSnapshot(
      q2,
      (snapshot) => {
        mapPendingReview = new Map();
        snapshot.docs.forEach((d) => mapPendingReview.set(d.id, { id: d.id, ...d.data() }));
        updateCombined();
      },
      (err) => {
        console.warn('[CollegeVerification] pending_review listener warning:', err);
      }
    );

    return () => {
      unsub1();
      unsub2();
    };
  }, [session]);

  const handleVerify = async (studentId: string, status: 'verified' | 'rejected') => {
    try {
      setProcessingId(studentId);
      await api.facultyVerifyStudent(studentId, status).catch(async () => {
        // Fallback to approve/reject student compat endpoints
        const collegeId = (session?.user as any)?.collegeId || 'iitd';
        if (status === 'verified') {
          await api.approveStudent(studentId, collegeId);
        } else {
          await api.rejectStudent(studentId);
        }
      });

      toast.success(
        status === 'verified'
          ? 'Student successfully verified and onboarded'
          : 'Student registration rejected'
      );

      setStudents((prev) => prev.filter((s) => s.id !== studentId && s.uid !== studentId));
    } catch (err: any) {
      toast.error(err.message || `Failed to update student status`);
    } finally {
      setProcessingId(null);
    }
  };

  const filtered = students.filter((s) => {
    const term = searchQuery.toLowerCase();
    const name = (s.name || s.displayName || s.email || '').toLowerCase();
    const roll = (s.idVerification?.extractedData?.rollNumber || '').toLowerCase();
    const email = (s.email || '').toLowerCase();
    return name.includes(term) || roll.includes(term) || email.includes(term);
  });

  return (
    <DashboardLayout role="faculty">
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1">
              <ShieldCheck className="h-3.5 w-3.5 text-[#3DDC84]" />
              <span>Campus Security & Admissions</span>
            </div>
            <h1
              className="text-2xl font-bold tracking-tight text-foreground"
              style={{ fontFamily: '"JetBrains Mono", monospace' }}
            >
              Student Verification Queue
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Review college domain registrations and Azure Document Intelligence OCR evidence before granting verified status.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchPendingStudents}
            disabled={loading}
            className="border-line font-mono text-xs self-start sm:self-auto"
          >
            <RefreshCw className={`h-3.5 w-3.5 mr-1.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh Queue
          </Button>
        </div>

        {/* Search Bar */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by student name, roll number, email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-surface border-line text-xs"
          />
        </div>

        {/* Queue Content */}
        {loading ? (
          <div className="text-center py-16 text-muted-foreground text-sm">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
            Loading pending student verification records...
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-surface border border-line rounded-xl p-12 text-center text-muted-foreground">
            <CheckCircle2 className="h-10 w-10 text-[#3DDC84] mx-auto mb-3" />
            <h3 className="text-base font-semibold text-foreground">No Pending Verifications</h3>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
              All student registrations for your institution have been reviewed and verified.
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filtered.map((student) => {
              const studentId = student.id || student.uid;
              const idVer = student.idVerification;
              const extracted = idVer?.extractedData || {};
              const confidence = idVer?.confidence !== undefined ? Math.round(idVer.confidence * 100) : null;
              const isCollegeMatched = idVer?.collegeMatch?.matched;
              const isMismatchFlagged = idVer?.collegeMatch?.mismatchFlagged;

              return (
                <div
                  key={studentId}
                  className="bg-surface border border-line rounded-xl p-5 hover:border-line/80 transition-all space-y-4"
                >
                  {/* Top Bar: Student Identity */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line/60 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-bold text-foreground">
                          {student.name || student.displayName || 'Unverified Student'}
                        </h2>
                        <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/30 text-[11px] font-mono">
                          <Clock className="h-3 w-3 mr-1" />
                          Pending Review
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">
                        {student.email}
                      </p>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={processingId === studentId}
                        onClick={() => handleVerify(studentId, 'rejected')}
                        className="h-8 px-3 text-xs text-destructive hover:bg-destructive/10 border border-destructive/20 font-mono"
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1" />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        disabled={processingId === studentId}
                        onClick={() => handleVerify(studentId, 'verified')}
                        className="h-8 px-4 text-xs bg-[#3DDC84] text-black hover:bg-[#34c775] font-mono font-semibold"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                        Approve Student
                      </Button>
                    </div>
                  </div>

                  {/* Azure OCR Evidence Box */}
                  <div className="bg-[#0A0B0D] border border-line rounded-lg p-4 space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-[#B98CFF]" />
                        <span className="text-xs font-semibold font-mono text-foreground">
                          Azure Document Intelligence OCR Evidence
                        </span>
                        <span className="text-[10px] text-muted-foreground font-mono">
                          ({idVer?.source || 'prebuilt-idDocument'})
                        </span>
                      </div>

                      {confidence !== null ? (
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] text-muted-foreground">OCR Confidence:</span>
                          <span
                            className={`text-xs font-mono font-bold px-2 py-0.5 rounded border ${
                              confidence >= 80
                                ? 'bg-[#3DDC84]/15 text-[#3DDC84] border-[#3DDC84]/30'
                                : confidence >= 50
                                ? 'bg-amber-400/15 text-amber-400 border-amber-400/30'
                                : 'bg-red-400/15 text-red-400 border-red-400/30'
                            }`}
                          >
                            {confidence}%
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">No OCR submission</span>
                      )}
                    </div>

                    {idVer ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs pt-1">
                        <div className="bg-surface/60 p-2.5 rounded border border-line/40">
                          <span className="text-[11px] text-muted-foreground block">Extracted Name</span>
                          <span className="font-semibold text-foreground">
                            {extracted.studentName || 'Not detected'}
                          </span>
                        </div>

                        <div className="bg-surface/60 p-2.5 rounded border border-line/40">
                          <span className="text-[11px] text-muted-foreground block">Extracted Roll / ID</span>
                          <span className="font-mono font-bold text-[#3DDC84]">
                            {extracted.rollNumber || 'Not detected'}
                          </span>
                        </div>

                        <div className="bg-surface/60 p-2.5 rounded border border-line/40">
                          <span className="text-[11px] text-muted-foreground block">Extracted Institution</span>
                          <span className="text-foreground">
                            {extracted.collegeName || 'Not detected'}
                          </span>
                        </div>

                        <div className="bg-surface/60 p-2.5 rounded border border-line/40">
                          <span className="text-[11px] text-muted-foreground block">Valid Until</span>
                          <span className="text-foreground font-mono">
                            {extracted.validUntil || 'Not detected'}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic py-1">
                        Student has not submitted an ID card image yet. Registration is pending manual review.
                      </p>
                    )}

                    {/* Mismatch Alert Flag */}
                    {isMismatchFlagged && (
                      <div className="flex items-center gap-2 p-2.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
                        <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                        <span>
                          <strong>Verification Flag:</strong> Extracted institution name does not strictly match your college domain. Please inspect ID details carefully.
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
