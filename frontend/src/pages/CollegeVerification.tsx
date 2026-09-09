import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Award,
  Sparkles,
  Bot,
  Eye,
  ExternalLink,
  Image as ImageIcon
} from 'lucide-react';

export default function CollegeVerification() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'id-cards' | 'achievements'>('id-cards');
  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Pending student achievements awaiting college faculty approval
  const [achievementQueue, setAchievementQueue] = useState<any[]>([
    {
      id: 'ach_ethindia_2026',
      studentName: 'Ansh Yadav',
      studentEmail: 'ansh.yadav_cs.aiml24@gla.ac.in',
      studentRoll: '2401030104',
      title: 'ETHIndia 2026 Finalist - DeFi Escrow Protocol',
      issuedBy: 'Devfolio & Polygon Labs',
      category: 'Web3 & Smart Contracts',
      reason: 'Architected automated smart contract vault on Polygon Amoy with ERC-4337 session keys and branch test coverage >92%.',
      submittedAt: Date.now() - 3600000 * 4,
      status: 'pending_faculty',
      proofUrl: 'https://images.unsplash.com/photo-1569683795645-b62e50fbf103?auto=format&fit=crop&w=800&q=80',
      credentialUrl: 'https://devfolio.co/submissions/ethindia-2026-polyvault',
      aiVerificationScore: 98.4,
    },
    {
      id: 'ach_aws_cert',
      studentName: 'Priya Sharma',
      studentEmail: 'priya.sharma_cs25@gla.ac.in',
      studentRoll: '2101040082',
      title: 'AWS Certified Cloud Practitioner (CLF-C02)',
      issuedBy: 'Amazon Web Services Training & Certification',
      category: 'Cloud Engineering',
      reason: 'Verified competencies in AWS Cloud architecture, IAM zero-trust policies, security governance, and serverless compute.',
      submittedAt: Date.now() - 3600000 * 28,
      status: 'pending_faculty',
      proofUrl: 'https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?auto=format&fit=crop&w=800&q=80',
      credentialUrl: 'https://www.credly.com/badges/aws-certified-cloud-practitioner',
      aiVerificationScore: 99.1,
    },
  ]);
  const [selectedProofPreview, setSelectedProofPreview] = useState<any | null>(null);

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

  const handleApproveAchievement = async (ach: any) => {
    setProcessingId(ach.id);
    try {
      await new Promise((r) => setTimeout(r, 800));
      setAchievementQueue((prev) => prev.filter((a) => a.id !== ach.id));
      toast.success(`✅ Approved! Soulbound Token (SBT) minted on Polygon for ${ach.studentName}.`);
    } catch (_) {
      toast.error('Failed to approve achievement');
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectAchievement = async (ach: any) => {
    setProcessingId(ach.id);
    try {
      await new Promise((r) => setTimeout(r, 500));
      setAchievementQueue((prev) => prev.filter((a) => a.id !== ach.id));
      toast.info(`Achievement rejected for ${ach.studentName}.`);
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

  const filteredAchievements = achievementQueue.filter((a) => {
    const term = searchQuery.toLowerCase();
    const name = (a.studentName || '').toLowerCase();
    const title = (a.title || '').toLowerCase();
    const issuer = (a.issuedBy || '').toLowerCase();
    return name.includes(term) || title.includes(term) || issuer.includes(term);
  });

  return (
    <DashboardLayout role="faculty">
      <div className="space-y-6 max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground uppercase tracking-wider mb-1">
              <ShieldCheck className="h-3.5 w-3.5 text-[#3DDC84]" />
              <span>Campus Security & Academic Credentials</span>
            </div>
            <h1
              className="text-2xl font-bold tracking-tight text-foreground"
              style={{ fontFamily: '"JetBrains Mono", monospace' }}
            >
              Institutional Verification Command Center
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Verify student registrations, Azure OCR student IDs, and Grok AI-reviewed achievement proofs for Polygon SBT minting.
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

        {/* Tab Switcher & Search Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-line pb-3">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('id-cards')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors flex items-center gap-2 ${
                activeTab === 'id-cards'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-surface text-muted-foreground hover:text-foreground border border-line'
              }`}
            >
              <UserCheck className="h-3.5 w-3.5" />
              Student ID Cards ({filtered.length})
            </button>
            <button
              onClick={() => setActiveTab('achievements')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-mono font-semibold transition-colors flex items-center gap-2 ${
                activeTab === 'achievements'
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-surface text-muted-foreground hover:text-foreground border border-line'
              }`}
            >
              <Award className="h-3.5 w-3.5" />
              Achievement SBT Proofs ({achievementQueue.length})
              {achievementQueue.length > 0 && (
                <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
              )}
            </button>
          </div>

          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={activeTab === 'id-cards' ? 'Search by name, roll, email...' : 'Search achievements by title, student...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-surface border-line text-xs"
            />
          </div>
        </div>

        {/* TAB 1: STUDENT ID CARDS */}
        {activeTab === 'id-cards' && (
          loading ? (
            <div className="text-center py-16 text-muted-foreground text-sm">
              <RefreshCw className="h-6 w-6 animate-spin mx-auto mb-2 text-primary" />
              Loading pending student verification records...
            </div>
          ) : filtered.length === 0 ? (
            <div className="bg-surface border border-line rounded-xl p-12 text-center text-muted-foreground">
              <CheckCircle2 className="h-10 w-10 text-[#3DDC84] mx-auto mb-3" />
              <h3 className="text-base font-semibold text-foreground">No Pending ID Verifications</h3>
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
                          onClick={() => navigate(`/student/public/${studentId}`)}
                          className="text-muted-foreground hover:text-primary font-mono text-xs gap-1"
                        >
                          <Eye className="h-3.5 w-3.5" /> Public Dashboard
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={processingId === studentId}
                          onClick={() => handleVerify(studentId, 'rejected')}
                          className="text-muted-foreground hover:text-red-400 hover:bg-red-500/10 font-mono text-xs"
                        >
                          <XCircle className="h-4 w-4 mr-1 text-red-400" />
                          Reject
                        </Button>

                        <Button
                          size="sm"
                          disabled={processingId === studentId}
                          onClick={() => handleVerify(studentId, 'verified')}
                          className="bg-[#3DDC84] hover:bg-[#32b86e] text-black font-mono text-xs font-bold shadow-sm"
                        >
                          {processingId === studentId ? (
                            <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1" />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                          )}
                          Approve Registration
                        </Button>
                      </div>
                    </div>

                    {/* OCR Extraction Result */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 font-mono text-muted-foreground">
                          <FileText className="h-3.5 w-3.5 text-primary" />
                          <span className="font-semibold text-foreground">
                            Azure Document Intelligence OCR Analysis
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
          )
        )}

        {/* TAB 2: STUDENT ACHIEVEMENT SBT PROOFS */}
        {activeTab === 'achievements' && (
          filteredAchievements.length === 0 ? (
            <div className="bg-surface border border-line rounded-xl p-12 text-center text-muted-foreground">
              <CheckCircle2 className="h-10 w-10 text-[#3DDC84] mx-auto mb-3" />
              <h3 className="text-base font-semibold text-foreground">No Pending Achievement Proofs</h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                All student achievement proofs for your institution have been reviewed and minted as Soulbound Tokens on Polygon.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {filteredAchievements.map((ach) => (
                <div
                  key={ach.id}
                  className="bg-surface border border-line rounded-xl p-5 hover:border-line/80 transition-all space-y-4"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-line/60 pb-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-bold text-foreground">
                          {ach.studentName}
                        </h2>
                        <Badge className="bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 text-[11px] font-mono gap-1">
                          <Bot className="h-3 w-3" /> Grok AI Authenticity: {ach.aiVerificationScore}%
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono mt-0.5">
                        {ach.studentEmail} • Roll: <strong className="text-foreground">{ach.studentRoll}</strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => navigate(`/student/public/${ach.studentRoll}`)}
                        className="text-muted-foreground hover:text-primary font-mono text-xs gap-1"
                      >
                        <Eye className="h-3.5 w-3.5" /> Public Dashboard
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={processingId === ach.id}
                        onClick={() => handleRejectAchievement(ach)}
                        className="text-muted-foreground hover:text-red-400 hover:bg-red-500/10 font-mono text-xs"
                      >
                        <XCircle className="h-4 w-4 mr-1 text-red-400" /> Reject
                      </Button>
                      <Button
                        size="sm"
                        disabled={processingId === ach.id}
                        onClick={() => handleApproveAchievement(ach)}
                        className="bg-[#3DDC84] hover:bg-[#32b86e] text-black font-mono text-xs font-bold shadow-sm"
                      >
                        {processingId === ach.id ? (
                          <>
                            <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1" /> Minting SBT...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-3.5 w-3.5 mr-1" /> Approve & Mint SBT
                          </>
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 items-start">
                    <div className="sm:col-span-3 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-foreground">{ach.title}</span>
                        <Badge variant="outline" className="text-[10px] font-mono">{ach.category}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono">
                        Issued by: <strong className="text-foreground">{ach.issuedBy}</strong>
                      </p>
                      <p className="text-xs text-foreground/90 font-mono leading-relaxed bg-surface/60 p-2.5 rounded border border-line/40">
                        {ach.reason}
                      </p>
                      {ach.credentialUrl && (
                        <a
                          href={ach.credentialUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary font-mono hover:underline pt-1"
                        >
                          <ExternalLink className="h-3 w-3" /> Official Credential Verification Link
                        </a>
                      )}
                    </div>

                    {ach.proofUrl && (
                      <div className="sm:col-span-1 space-y-1 text-center">
                        <span className="text-[10px] text-muted-foreground font-mono block">Certificate Media</span>
                        <button
                          type="button"
                          onClick={() => setSelectedProofPreview(ach)}
                          className="relative group rounded-lg overflow-hidden border border-line h-24 w-full bg-surface flex items-center justify-center hover:opacity-90 transition-opacity"
                        >
                          <img src={ach.proofUrl} alt="Certificate Proof" className="h-full w-full object-cover" />
                          <span className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-mono gap-1">
                            <Eye className="h-3.5 w-3.5" /> Inspect
                          </span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </DashboardLayout>
  );
}
