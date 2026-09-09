import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import {
  User,
  Mail,
  Github,
  ExternalLink,
  Code2,
  Shield,
  Sparkles,
  Award,
  Briefcase,
  Star,
  ArrowLeft,
  Edit2,
  CheckCircle2,
  Link as LinkIcon,
  GraduationCap,
  Building2,
  Globe,
  Zap,
  Eye,
  Camera,
  UploadCloud,
  UserCheck,
  Send,
  Layers,
  RefreshCw,
  Copy,
  Check,
  ChevronRight,
  Trophy,
  Lock,
} from 'lucide-react';
import { generateWalletFromSeed, explorerTxUrl } from '@/lib/web3';

// ─── Demo Data ────────────────────────────────────────────────────────────────
const DEMO_STUDENT = {
  id: 'student_demo',
  name: 'Ansh Sharma',
  email: 'ansh@gla.ac.in',
  college: 'GLA University, Mathura',
  branch: 'B.Tech Computer Science',
  rollNumber: '2201640100083',
  graduationYear: '2026',
  headline: 'Full-Stack Engineer & Polygon Web3 Builder',
  bio: 'Passionate about building real-world decentralized applications on Polygon. Open to micro-gigs, internships, and hackathons. Strong fundamentals in Solidity, React, and TypeScript.',
  avatar: null as string | null,
  isOpenToWork: true,
  github: 'ansh-codr',
  linkedin: 'ansh-sharma-dev',
  portfolio: 'https://ansh.dev',
  verificationStatus: 'verified' as const,
  skills: ['Solidity', 'React', 'TypeScript', 'Python', 'FastAPI', 'Polygon', 'Web3.js', 'Foundry'],
  sbts: [
    { id: 'sbt-001', title: 'Smart Contract Developer Certified', category: 'Technical', tokenId: '0x001A', issuedBy: 'GLA University', mintedAt: '2026-08-12', txHash: '0x6b3f...d4aa' },
    { id: 'sbt-002', title: 'Hackathon Winner — TechFest 2026', category: 'Achievement', tokenId: '0x002B', issuedBy: 'GLA University', mintedAt: '2026-07-04', txHash: '0xa12e...5bc7' },
    { id: 'sbt-003', title: 'Campus Web3 Club Co-founder', category: 'Leadership', tokenId: '0x003C', issuedBy: 'GLA University', mintedAt: '2026-06-15', txHash: '0xe91f...8ca1' },
  ],
  codingProfiles: {
    leetcode: { username: 'anshcoder', rating: 1742, solved: 312, easy: 142, medium: 148, hard: 22 },
    codeforces: { username: 'ansh_cf', rating: 1580, rank: 'Specialist', solved: 210 },
    github: { username: 'ansh-codr', repos: 34, stars: 87, contributions: 1023 },
  },
  completedGigs: [
    { title: 'DeFi Escrow Smart Contract Audit', company: 'Polygon DevRel', bounty: '180 POL', rating: 5.0, date: '2026-08-20' },
    { title: 'React Dashboard for MUJ Innovation Hub', company: 'MUJ Placement Cell', bounty: '120 POL', rating: 4.8, date: '2026-07-15' },
  ],
};

function copyToClipboard(text: string) {
  navigator.clipboard.writeText(text).catch(() => {});
}

function shortenAddr(addr: string) {
  return addr.length > 16 ? `${addr.slice(0, 8)}…${addr.slice(-6)}` : addr;
}

// ─── Public Dashboard Component ───────────────────────────────────────────────
export default function StudentPublicDashboard() {
  const { studentId } = useParams<{ studentId?: string }>();
  const { session } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Determine if this is the owner's own profile
  const isOwner = !studentId || studentId === session?.userId;
  // Determine viewer role
  const viewerRole = session?.role ?? 'student';

  // Load demo student data (in a real app, fetch from Firestore by studentId)
  const [student, setStudent] = useState({ ...DEMO_STUDENT, id: studentId || session?.userId || DEMO_STUDENT.id });
  const [walletAddress] = useState(() => generateWalletFromSeed(student.id));
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'credentials' | 'work'>('overview');

  // Customize Modal
  const [customizeOpen, setCustomizeOpen] = useState(false);
  const [editHeadline, setEditHeadline] = useState(student.headline);
  const [editBio, setEditBio] = useState(student.bio);
  const [editGithub, setEditGithub] = useState(student.github);
  const [editLinkedin, setEditLinkedin] = useState(student.linkedin);
  const [editPortfolio, setEditPortfolio] = useState(student.portfolio);
  const [editOpenToWork, setEditOpenToWork] = useState(student.isOpenToWork);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(student.avatar);
  const [savingProfile, setSavingProfile] = useState(false);

  // Recruiter action: Contact/Offer Modal
  const [offerOpen, setOfferOpen] = useState(false);
  const [offerMessage, setOfferMessage] = useState('');
  const [sendingOffer, setSendingOffer] = useState(false);

  function handleCopyAddress() {
    copyToClipboard(walletAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleAvatarFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setAvatarPreview(url);
  }

  function openCustomize() {
    setEditHeadline(student.headline);
    setEditBio(student.bio);
    setEditGithub(student.github);
    setEditLinkedin(student.linkedin);
    setEditPortfolio(student.portfolio);
    setEditOpenToWork(student.isOpenToWork);
    setAvatarPreview(student.avatar);
    setCustomizeOpen(true);
  }

  async function handleSaveCustomize() {
    setSavingProfile(true);
    await new Promise((r) => setTimeout(r, 900));
    setStudent((prev) => ({
      ...prev,
      headline: editHeadline,
      bio: editBio,
      github: editGithub,
      linkedin: editLinkedin,
      portfolio: editPortfolio,
      isOpenToWork: editOpenToWork,
      avatar: avatarPreview,
    }));
    setSavingProfile(false);
    setCustomizeOpen(false);
    toast.success('Public profile updated! Recruiters and faculty see your changes instantly.');
  }

  async function handleSendOffer() {
    if (!offerMessage.trim()) { toast.error('Please write a message.'); return; }
    setSendingOffer(true);
    await new Promise((r) => setTimeout(r, 1200));
    setSendingOffer(false);
    setOfferOpen(false);
    setOfferMessage('');
    toast.success(`Opportunity sent to ${student.name}! They will see it in their notifications.`);
  }

  const sbtCategoryColor: Record<string, string> = {
    Technical: 'bg-blue-500/15 text-blue-400 border-blue-500/30',
    Achievement: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
    Leadership: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
    Academic: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  };

  const layoutRole = (viewerRole === 'student' ? 'student' : viewerRole === 'faculty' ? 'faculty' : 'recruiter') as 'student' | 'faculty' | 'recruiter';

  return (
    <DashboardLayout role={layoutRole}>
      <div className="container-main py-8 space-y-6">

        {/* ── HEADER BAR ─────────────────────────────────────────── */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="gap-1.5 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> Back
          </Button>
          <div className="flex-1" />
          {isOwner ? (
            <>
              <Badge className="bg-violet-500/15 text-violet-400 border border-violet-500/30 gap-1.5 px-3 py-1 font-mono text-xs">
                <Eye className="h-3.5 w-3.5" /> Public Preview Mode
              </Badge>
              <Button onClick={openCustomize} variant="outline" size="sm" className="gap-1.5 font-mono text-xs">
                <Edit2 className="h-3.5 w-3.5" /> Customize Public Profile
              </Button>
            </>
          ) : (
            <Badge variant="outline" className="font-mono text-xs gap-1.5 px-3">
              <Eye className="h-3.5 w-3.5" /> Verified Public Portfolio
            </Badge>
          )}
        </div>

        {/* ── OWNER PREVIEW BANNER ───────────────────────────────── */}
        {isOwner && (
          <div className="rounded-xl border border-violet-500/30 bg-violet-500/8 px-5 py-3 flex items-center gap-3">
            <Eye className="h-5 w-5 text-violet-400 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-violet-300 leading-snug">This is your public profile view</p>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">
                This is exactly what recruiters, college faculty, and other students see when they click your profile. Customize it to stand out.
              </p>
            </div>
            <Button onClick={openCustomize} size="sm" className="bg-violet-600 hover:bg-violet-500 text-white font-mono text-xs flex-shrink-0 gap-1.5">
              <Edit2 className="h-3.5 w-3.5" /> Customize
            </Button>
          </div>
        )}

        {/* ── IDENTITY HERO CARD ─────────────────────────────────── */}
        <div className="glass-card rounded-2xl border border-border/70 bg-gradient-to-br from-card via-card to-card/60 p-6 md:p-8">
          <div className="flex flex-col md:flex-row gap-6 md:items-start">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div className="h-24 w-24 md:h-28 md:w-28 rounded-2xl border-2 border-primary/40 bg-gradient-to-br from-primary/30 to-purple-600/20 flex items-center justify-center overflow-hidden shadow-lg">
                {student.avatar ? (
                  <img src={student.avatar} alt={student.name} className="h-full w-full object-cover" />
                ) : (
                  <User className="h-12 w-12 text-primary/60" />
                )}
              </div>
              {student.verificationStatus === 'verified' && (
                <span className="absolute -bottom-2 -right-2 bg-emerald-500 rounded-full p-1 border-2 border-background shadow-sm">
                  <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                </span>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl md:text-3xl font-bold text-foreground">{student.name}</h1>
                {student.verificationStatus === 'verified' && (
                  <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 gap-1 text-[11px] font-mono">
                    <Shield className="h-3 w-3" /> College Verified
                  </Badge>
                )}
                {student.isOpenToWork && (
                  <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/30 gap-1 text-[11px] font-mono animate-pulse">
                    <Zap className="h-3 w-3" /> Open to Opportunities
                  </Badge>
                )}
              </div>

              <p className="text-base text-primary/90 font-medium font-mono">{student.headline}</p>

              <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <Building2 className="h-3.5 w-3.5 text-primary" />
                  {student.college}
                </span>
                <span className="flex items-center gap-1.5">
                  <GraduationCap className="h-3.5 w-3.5 text-primary" />
                  {student.branch} · {student.graduationYear}
                </span>
                <span className="flex items-center gap-1.5">
                  <Mail className="h-3.5 w-3.5" />
                  {student.email}
                </span>
              </div>

              {/* Wallet Address */}
              <div className="flex items-center gap-2 pt-1">
                <div className="flex items-center gap-2 bg-secondary/50 border border-border rounded-lg px-3 py-1.5 font-mono text-xs text-muted-foreground">
                  <div className="h-2 w-2 rounded-full bg-purple-500 animate-pulse" />
                  Polygon Amoy
                  <span className="text-foreground/80 ml-1">{shortenAddr(walletAddress)}</span>
                </div>
                <button
                  type="button"
                  onClick={handleCopyAddress}
                  className="p-1.5 rounded-md border border-border/60 hover:bg-secondary transition-colors"
                  title="Copy wallet address"
                >
                  {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-muted-foreground" />}
                </button>
                <a
                  href={`https://amoy.polygonscan.com/address/${walletAddress}`}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 rounded-md border border-border/60 hover:bg-secondary transition-colors"
                  title="View on Polygonscan Amoy"
                >
                  <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                </a>
              </div>

              {/* Social Links */}
              <div className="flex flex-wrap gap-2 pt-1">
                {student.github && (
                  <a href={`https://github.com/${student.github}`} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1.5 text-xs font-mono px-3 py-1 rounded-full border border-border bg-secondary/30 hover:bg-secondary transition-colors text-foreground/80">
                    <Github className="h-3.5 w-3.5" /> {student.github}
                  </a>
                )}
                {student.linkedin && (
                  <a href={`https://linkedin.com/in/${student.linkedin}`} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1.5 text-xs font-mono px-3 py-1 rounded-full border border-border bg-secondary/30 hover:bg-secondary transition-colors text-foreground/80">
                    <LinkIcon className="h-3.5 w-3.5" /> LinkedIn
                  </a>
                )}
                {student.portfolio && (
                  <a href={student.portfolio} target="_blank" rel="noreferrer"
                    className="flex items-center gap-1.5 text-xs font-mono px-3 py-1 rounded-full border border-border bg-secondary/30 hover:bg-secondary transition-colors text-foreground/80">
                    <Globe className="h-3.5 w-3.5" /> Portfolio
                  </a>
                )}
              </div>
            </div>

            {/* Actions (only for recruiters and faculty) */}
            {!isOwner && viewerRole !== 'student' && (
              <div className="flex flex-col gap-2 flex-shrink-0">
                <Button onClick={() => setOfferOpen(true)} className="gap-2 font-mono text-xs">
                  <Send className="h-3.5 w-3.5" />
                  {viewerRole === 'recruiter' ? 'Offer Opportunity' : 'Endorse Student'}
                </Button>
                <Button variant="outline" size="sm" className="gap-2 font-mono text-xs">
                  <UserCheck className="h-3.5 w-3.5" /> Shortlist
                </Button>
              </div>
            )}
          </div>

          {/* Bio */}
          {student.bio && (
            <p className="mt-5 text-sm text-foreground/80 leading-relaxed border-t border-border/40 pt-4 font-mono">
              {student.bio}
            </p>
          )}

          {/* Skills */}
          <div className="mt-4 flex flex-wrap gap-1.5">
            {student.skills.map((s) => (
              <span key={s} className="px-2.5 py-1 rounded-full bg-primary/10 border border-primary/20 text-xs font-mono text-primary font-medium">
                {s}
              </span>
            ))}
          </div>
        </div>

        {/* ── TAB SELECTOR ─────────────────────────────────────────── */}
        <div className="flex border-b border-border/60 gap-6 text-sm font-mono">
          {(['overview', 'credentials', 'work'] as const).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`pb-3 font-semibold capitalize flex items-center gap-1.5 border-b-2 transition-all ${
                activeTab === tab ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab === 'overview' && <User className="h-3.5 w-3.5" />}
              {tab === 'credentials' && <Shield className="h-3.5 w-3.5" />}
              {tab === 'work' && <Briefcase className="h-3.5 w-3.5" />}
              {tab === 'overview' ? 'Coding Stats' : tab === 'credentials' ? `On-Chain SBTs (${student.sbts.length})` : 'Work History'}
            </button>
          ))}
        </div>

        {/* ─────────────── TAB: CODING STATS ─────────────────────── */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* LeetCode */}
            <div className="glass-card rounded-xl border border-border/70 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Code2 className="h-4 w-4 text-amber-500" />
                <span className="font-bold text-sm text-foreground font-mono">LeetCode</span>
                <Badge variant="outline" className="ml-auto text-[10px] font-mono border-amber-500/40 text-amber-400">@{student.codingProfiles.leetcode.username}</Badge>
              </div>
              <div className="text-3xl font-black font-mono text-amber-500">{student.codingProfiles.leetcode.rating}</div>
              <div className="text-xs text-muted-foreground font-mono">Contest Rating</div>
              <div className="flex gap-3 pt-1 border-t border-border/40 text-xs font-mono">
                <span className="text-emerald-400">{student.codingProfiles.leetcode.easy} Easy</span>
                <span className="text-amber-400">{student.codingProfiles.leetcode.medium} Med</span>
                <span className="text-red-400">{student.codingProfiles.leetcode.hard} Hard</span>
              </div>
              <div className="text-xs text-muted-foreground font-mono">{student.codingProfiles.leetcode.solved} problems solved</div>
            </div>

            {/* Codeforces */}
            <div className="glass-card rounded-xl border border-border/70 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Trophy className="h-4 w-4 text-blue-400" />
                <span className="font-bold text-sm text-foreground font-mono">Codeforces</span>
                <Badge variant="outline" className="ml-auto text-[10px] font-mono border-blue-500/40 text-blue-400">{student.codingProfiles.codeforces.rank}</Badge>
              </div>
              <div className="text-3xl font-black font-mono text-blue-400">{student.codingProfiles.codeforces.rating}</div>
              <div className="text-xs text-muted-foreground font-mono">Global Rating</div>
              <div className="pt-1 border-t border-border/40 text-xs font-mono text-muted-foreground">
                @{student.codingProfiles.codeforces.username} · {student.codingProfiles.codeforces.solved} solved
              </div>
            </div>

            {/* GitHub */}
            <div className="glass-card rounded-xl border border-border/70 p-5 space-y-3">
              <div className="flex items-center gap-2">
                <Github className="h-4 w-4 text-foreground" />
                <span className="font-bold text-sm text-foreground font-mono">GitHub</span>
                <Badge variant="outline" className="ml-auto text-[10px] font-mono">@{student.codingProfiles.github.username}</Badge>
              </div>
              <div className="text-3xl font-black font-mono text-foreground">{student.codingProfiles.github.contributions}</div>
              <div className="text-xs text-muted-foreground font-mono">Contributions (YTD)</div>
              <div className="pt-1 border-t border-border/40 flex gap-4 text-xs font-mono text-muted-foreground">
                <span>{student.codingProfiles.github.repos} repos</span>
                <span>{student.codingProfiles.github.stars} ⭐</span>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────── TAB: ON-CHAIN SBT CREDENTIALS ─────────── */}
        {activeTab === 'credentials' && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground font-mono px-1">
              Soulbound Tokens (ERC-5192) minted on Polygon Amoy testnet. Non-transferable, permanent credentials anchored on-chain.
            </p>
            {student.sbts.length === 0 ? (
              <div className="glass-card p-12 text-center rounded-2xl border border-dashed border-border/80 text-muted-foreground font-mono text-sm">
                No verified SBT credentials yet.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {student.sbts.map((sbt) => (
                  <div key={sbt.id} className="glass-card rounded-xl border border-border/70 p-5 space-y-3 hover:border-primary/40 transition-all">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-primary/30 to-purple-600/20 flex items-center justify-center border border-primary/30">
                          <Sparkles className="h-4.5 w-4.5 text-primary" />
                        </div>
                        <div>
                          <p className="font-bold text-sm text-foreground leading-snug">{sbt.title}</p>
                          <p className="text-[11px] text-muted-foreground font-mono">Issued by {sbt.issuedBy}</p>
                        </div>
                      </div>
                      <Badge variant="outline" className={`text-[10px] font-mono flex-shrink-0 ${sbtCategoryColor[sbt.category] || 'border-border text-muted-foreground'}`}>
                        {sbt.category}
                      </Badge>
                    </div>

                    <div className="pt-2 border-t border-border/40 grid grid-cols-2 gap-2 text-[11px] font-mono">
                      <div>
                        <span className="text-muted-foreground block">Token ID</span>
                        <span className="text-primary font-bold">{sbt.tokenId}</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground block">Minted</span>
                        <span className="text-foreground">{sbt.mintedAt}</span>
                      </div>
                    </div>

                    <a
                      href={explorerTxUrl(sbt.txHash)}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 text-[11px] text-primary font-mono hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" /> View on Polygonscan Amoy
                    </a>

                    <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 font-mono">
                      <Lock className="h-3 w-3" /> Non-transferable · ERC-5192 Soulbound
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─────────────── TAB: WORK HISTORY ─────────────────────── */}
        {activeTab === 'work' && (
          <div className="space-y-4">
            {student.completedGigs.length === 0 ? (
              <div className="glass-card p-12 text-center rounded-2xl border border-dashed border-border/80 text-muted-foreground font-mono text-sm">
                No completed gigs yet.
              </div>
            ) : (
              student.completedGigs.map((gig, i) => (
                <div key={i} className="glass-card rounded-xl border border-emerald-500/30 p-5 flex items-start justify-between gap-4 hover:border-emerald-500/50 transition-all">
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
                      <p className="font-bold text-sm text-foreground">{gig.title}</p>
                    </div>
                    <p className="text-xs text-muted-foreground font-mono ml-6">{gig.company} · {gig.date}</p>
                  </div>
                  <div className="text-right flex-shrink-0">
                    <div className="text-base font-extrabold font-mono text-purple-400">{gig.bounty}</div>
                    <div className="flex items-center gap-1 justify-end mt-1">
                      {Array.from({ length: 5 }).map((_, j) => (
                        <Star key={j} className={`h-3 w-3 ${j < Math.floor(gig.rating) ? 'text-amber-400 fill-amber-400' : 'text-muted-foreground'}`} />
                      ))}
                      <span className="text-[11px] text-muted-foreground font-mono ml-1">{gig.rating}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* ═══════════════ CUSTOMIZE PUBLIC PROFILE MODAL ══════════════ */}
      <Dialog open={customizeOpen} onOpenChange={setCustomizeOpen}>
        <DialogContent className="bg-[#14161A] border-[#2A2D33] text-[#F2F3F5] max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-mono text-base">
              <Edit2 className="h-4 w-4 text-primary" /> Customize Public Profile
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground font-mono">
              This is what recruiters and college faculty see. Make it count.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 max-h-[65vh] overflow-y-auto pr-1">
            {/* Avatar Upload */}
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 rounded-xl border border-border bg-secondary/30 flex items-center justify-center overflow-hidden flex-shrink-0">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="avatar" className="h-full w-full object-cover" />
                ) : (
                  <User className="h-8 w-8 text-muted-foreground" />
                )}
              </div>
              <div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5 text-xs font-mono"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Camera className="h-3.5 w-3.5" /> Upload Photo
                </Button>
                <p className="text-[11px] text-muted-foreground font-mono mt-1">PNG or JPG · Max 5MB</p>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarFileChange} />
            </div>

            {/* Headline */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground font-mono">Headline / Tagline</label>
              <Input
                value={editHeadline}
                onChange={(e) => setEditHeadline(e.target.value)}
                placeholder="e.g. Full-Stack Engineer & Polygon Web3 Builder"
                className="h-9 text-xs bg-secondary/20 font-mono"
                maxLength={100}
              />
              <span className="text-[10px] text-muted-foreground font-mono">{editHeadline.length}/100</span>
            </div>

            {/* Bio */}
            <div className="space-y-1">
              <label className="text-xs font-medium text-foreground font-mono">Bio & About Me</label>
              <Textarea
                value={editBio}
                onChange={(e) => setEditBio(e.target.value)}
                placeholder="Tell recruiters what you're working on and what you're looking for..."
                className="text-xs bg-secondary/20 font-mono resize-none"
                rows={3}
                maxLength={400}
              />
              <span className="text-[10px] text-muted-foreground font-mono">{editBio.length}/400</span>
            </div>

            {/* Open to Work Toggle */}
            <div className="flex items-center justify-between py-2 px-3 rounded-lg border border-border/60 bg-secondary/20">
              <div>
                <p className="text-xs font-semibold text-foreground font-mono">Open to Opportunities</p>
                <p className="text-[11px] text-muted-foreground font-mono">Recruiters will see a "Open to Work" badge on your profile</p>
              </div>
              <button
                type="button"
                onClick={() => setEditOpenToWork((v) => !v)}
                className={`relative h-6 w-11 rounded-full transition-colors flex-shrink-0 ${editOpenToWork ? 'bg-primary' : 'bg-secondary border border-border'}`}
              >
                <span className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${editOpenToWork ? 'translate-x-5' : ''}`} />
              </button>
            </div>

            {/* Social Links */}
            <div className="space-y-2">
              <label className="text-xs font-medium text-foreground font-mono">Social Links</label>
              <div className="flex items-center gap-2">
                <Github className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <Input value={editGithub} onChange={(e) => setEditGithub(e.target.value)} placeholder="GitHub username" className="h-9 text-xs bg-secondary/20 font-mono" />
              </div>
              <div className="flex items-center gap-2">
                <LinkIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <Input value={editLinkedin} onChange={(e) => setEditLinkedin(e.target.value)} placeholder="LinkedIn username" className="h-9 text-xs bg-secondary/20 font-mono" />
              </div>
              <div className="flex items-center gap-2">
                <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <Input value={editPortfolio} onChange={(e) => setEditPortfolio(e.target.value)} placeholder="Portfolio URL (https://...)" className="h-9 text-xs bg-secondary/20 font-mono" />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCustomizeOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveCustomize} disabled={savingProfile} className="gap-2 font-mono">
              {savingProfile ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Saving...</> : <><CheckCircle2 className="h-3.5 w-3.5" /> Save & Publish</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══════════════ OFFER / CONTACT MODAL ══════════════════════ */}
      <Dialog open={offerOpen} onOpenChange={setOfferOpen}>
        <DialogContent className="bg-[#14161A] border-[#2A2D33] text-[#F2F3F5] max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 font-mono text-base">
              <Send className="h-4 w-4 text-primary" />
              {viewerRole === 'recruiter' ? 'Send Opportunity to' : 'Endorse'} {student.name}
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground font-mono">
              This message will appear directly in the student's notifications.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Textarea
              value={offerMessage}
              onChange={(e) => setOfferMessage(e.target.value)}
              placeholder={viewerRole === 'recruiter' ? 'Hi Ansh, we have a micro-gig opportunity that matches your skill set...' : 'I am endorsing Ansh for their excellent performance in...'}
              className="text-xs bg-secondary/20 font-mono resize-none"
              rows={4}
            />
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOfferOpen(false)}>Cancel</Button>
            <Button onClick={handleSendOffer} disabled={sendingOffer} className="gap-2 font-mono">
              {sendingOffer ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Sending...</> : <><Send className="h-3.5 w-3.5" /> Send Message</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
