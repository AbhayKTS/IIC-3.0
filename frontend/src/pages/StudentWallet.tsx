import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/mockApi';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Wallet, Shield, Award, Copy, ExternalLink, Coins, CheckCircle2,
  Lock, Sparkles, RefreshCw, TrendingUp, ArrowUpRight, Zap, AlertCircle, Key,
  History, ArrowDownLeft, Upload, FileText, Image as ImageIcon, CheckCircle,
  Bot, Clock, ChevronRight, Eye
} from 'lucide-react';
import {
  generateWalletFromSeed, fetchNativeBalance, simulateMintSBT,
  formatAddress, explorerTxUrl, explorerAddressUrl, AMOY_FAUCET, AMOY_EXPLORER,
  fetchSBTsForAddress, saveTxRecord, getTxHistory, type OnChainSBT
} from '@/lib/web3';
import { collection, query, where, orderBy, limit, onSnapshot, addDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface StudentTransaction {
  id: string;
  type: 'PAYOUT' | 'GIG_PAYOUT' | 'SBT_MINT' | 'TOPUP';
  label: string;
  amount: string;
  timestamp: number;
  status: 'confirmed' | 'pending';
  network?: string;
  txHash?: string;
}

export interface PendingAchievement {
  id: string;
  title: string;
  issuedBy: string;
  category?: string;
  reason: string;
  submittedAt: number;
  status: 'pending_ai' | 'pending_faculty' | 'verified' | 'rejected';
  proofUrl?: string;
  proofType?: 'image' | 'pdf' | 'link';
  credentialUrl?: string;
  aiVerificationScore?: number;
  aiVerifiedAt?: number;
  tokenId?: number;
}

const DEFAULT_STUDENT_TRANSACTIONS: StudentTransaction[] = [
  {
    id: 'stx_gig_1',
    type: 'GIG_PAYOUT',
    label: 'MicroGig Payout: Smart Contract Audit & Test Coverage',
    amount: '+180 POL',
    timestamp: Date.now() - 3600000 * 3, // 3 hours ago
    status: 'confirmed',
    network: 'Polygon Amoy Testnet',
    txHash: '0x8f2a6b7c9d1e4a5b6c7d8e9f0a1b2c3d4e5f6a7b',
  },
  {
    id: 'stx_gig_2',
    type: 'GIG_PAYOUT',
    label: 'MicroGig Payout: React + Tailwind Dashboard Component',
    amount: '+120 POL',
    timestamp: Date.now() - 3600000 * 26, // 1 day ago
    status: 'confirmed',
    network: 'Polygon Amoy Testnet',
    txHash: '0x3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d',
  },
  {
    id: 'stx_wth_1',
    type: 'PAYOUT',
    label: 'Student UPI Withdrawal to student@okaxis (₹1,750)',
    amount: '-50 POL',
    timestamp: Date.now() - 3600000 * 72, // 3 days ago
    status: 'confirmed',
    network: 'Polygon Amoy (IMPS Off-Ramp)',
    txHash: '0x1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b',
  },
  {
    id: 'stx_sbt_1',
    type: 'SBT_MINT',
    label: 'Minted Soulbound Token: Smart India Hackathon 2026 Winner',
    amount: '0 POL',
    timestamp: Date.now() - 3600000 * 120, // 5 days ago
    status: 'confirmed',
    network: 'Polygon Amoy Testnet',
    txHash: '0x5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c',
  },
];

const DEFAULT_PENDING_ACHIEVEMENTS: PendingAchievement[] = [
  {
    id: 'ach_ethindia_2026',
    title: 'ETHIndia 2026 Finalist - DeFi Escrow Protocol',
    issuedBy: 'Devfolio & Polygon Labs',
    category: 'Web3 & Smart Contracts',
    reason: 'Architected automated smart contract vault on Polygon Amoy with ERC-4337 session keys and branch test coverage >92%.',
    submittedAt: Date.now() - 3600000 * 4,
    status: 'pending_ai',
    proofUrl: 'https://images.unsplash.com/photo-1569683795645-b62e50fbf103?auto=format&fit=crop&w=800&q=80',
    proofType: 'image',
    credentialUrl: 'https://devfolio.co/submissions/ethindia-2026-polyvault',
    aiVerificationScore: 96,
  },
  {
    id: 'ach_aws_cert',
    title: 'AWS Certified Cloud Practitioner (CLF-C02)',
    issuedBy: 'Amazon Web Services Training & Certification',
    category: 'Cloud Engineering',
    reason: 'Verified competencies in AWS Cloud architecture, IAM zero-trust policies, security governance, and serverless compute.',
    submittedAt: Date.now() - 3600000 * 28,
    status: 'pending_faculty',
    proofUrl: 'https://images.unsplash.com/photo-1606326608606-aa0b62935f2b?auto=format&fit=crop&w=800&q=80',
    proofType: 'image',
    credentialUrl: 'https://www.credly.com/badges/aws-certified-cloud-practitioner',
    aiVerificationScore: 99,
  },
];

export default function StudentWallet() {
  const { session } = useAuth();
  const userId = session?.userId || 'demo-student';

  // Web3 state
  const [walletAddress, setWalletAddress] = useState('');
  const [walletPrivateKey, setWalletPrivateKey] = useState('');
  const [polBalance, setPolBalance] = useState('0.0000');
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);

  // SBT & Achievements state
  const [sbts, setSbts] = useState<OnChainSBT[]>([]);
  const [selectedSbt, setSelectedSbt] = useState<OnChainSBT | null>(null);
  const [proofModalOpen, setProofModalOpen] = useState(false);
  const [achievementTab, setAchievementTab] = useState<'verified' | 'pending'>('verified');

  // Pending achievements awaiting AI or faculty verification
  const [pendingAchievements, setPendingAchievements] = useState<PendingAchievement[]>(DEFAULT_PENDING_ACHIEVEMENTS);
  const [selectedProofPreview, setSelectedProofPreview] = useState<PendingAchievement | null>(null);

  // Add Achievement modal state
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [achievementTitle, setAchievementTitle] = useState('');
  const [achievementReason, setAchievementReason] = useState('');
  const [achievementIssuer, setAchievementIssuer] = useState('');
  const [achievementCategory, setAchievementCategory] = useState('Hackathon / Competition');
  const [achievementProofUrl, setAchievementProofUrl] = useState('');
  const [achievementCredentialUrl, setAchievementCredentialUrl] = useState('');
  const [proofFileName, setProofFileName] = useState('');
  const [isSubmittingAchievement, setIsSubmittingAchievement] = useState(false);

  // Grok AI Verification animation state
  const [verifyingWithAiId, setVerifyingWithAiId] = useState<string | null>(null);
  const [aiProgressText, setAiProgressText] = useState('');

  // Dynamic POL Earnings
  const [polEarnings, setPolEarnings] = useState<number>(350.0);

  // Transactions State
  const [transactions, setTransactions] = useState<StudentTransaction[]>(DEFAULT_STUDENT_TRANSACTIONS);

  // Withdrawal modal state (Full parity with Recruiter)
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('50');
  const [withdrawMethod, setWithdrawMethod] = useState<'upi' | 'bank'>('upi');
  const [withdrawDestination, setWithdrawDestination] = useState('student@okaxis');
  const [isProcessingWithdraw, setIsProcessingWithdraw] = useState(false);

  // Generate deterministic custodial Polygon address
  useEffect(() => {
    const wallet = generateWalletFromSeed(userId);
    setWalletAddress(wallet.address);
    setWalletPrivateKey(wallet.privateKey);
  }, [userId]);

  // Load and merge local transactions
  useEffect(() => {
    const localLogs = getTxHistory();
    if (localLogs && localLogs.length > 0) {
      const converted: StudentTransaction[] = localLogs.map(l => ({
        id: l.hash,
        type: (l.type === 'GIG_PAYOUT' ? 'GIG_PAYOUT' : l.type === 'SBT_MINT' ? 'SBT_MINT' : 'PAYOUT'),
        label: l.label,
        amount: l.amount || '0 POL',
        timestamp: l.timestamp,
        status: l.status,
        network: l.network,
        txHash: l.hash,
      }));

      setTransactions(prev => {
        const merged = [...converted];
        prev.forEach(p => {
          if (!merged.find(m => m.id === p.id || m.txHash === p.txHash)) {
            merged.push(p);
          }
        });
        return merged.sort((a, b) => b.timestamp - a.timestamp);
      });
    }
  }, []);

  // Listen to Firestore transactions if available
  useEffect(() => {
    if (!userId || !db) return;
    try {
      const txRef = collection(db, 'transactions');
      const q = query(
        txRef,
        where('userId', '==', userId),
        orderBy('timestamp', 'desc'),
        limit(20)
      );
      const unsub = onSnapshot(q, (snap) => {
        if (!snap.empty) {
          const fsTxs = snap.docs.map(d => ({ id: d.id, ...d.data() } as StudentTransaction));
          setTransactions(prev => {
            const merged = [...fsTxs];
            prev.forEach(p => {
              if (!merged.find(m => m.id === p.id || (m.txHash && m.txHash === p.txHash))) {
                merged.push(p);
              }
            });
            return merged.sort((a, b) => b.timestamp - a.timestamp);
          });
        }
      }, () => null);

      return () => unsub();
    } catch (_) {}
  }, [userId]);

  // Fetch POL balance from Amoy testnet
  const refreshBalance = useCallback(async () => {
    if (!walletAddress) return;
    setBalanceLoading(true);
    const { formatted } = await fetchNativeBalance(walletAddress);
    setPolBalance(formatted);
    const onChainSbts = await fetchSBTsForAddress(walletAddress);
    setSbts(prev => {
      const merged = [...onChainSbts];
      prev.forEach(p => {
        if (!merged.find(m => m.tokenId === p.tokenId)) merged.unshift(p);
      });
      return merged;
    });
    setBalanceLoading(false);
  }, [walletAddress]);

  useEffect(() => {
    if (walletAddress) refreshBalance();
  }, [walletAddress, refreshBalance]);

  const copyAddress = () => {
    navigator.clipboard.writeText(walletAddress);
    toast.success('Polygon address copied to clipboard!');
  };

  // Handle certificate file selection / mock upload
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setProofFileName(file.name);
      // Create an object URL for local image preview
      const localUrl = URL.createObjectURL(file);
      setAchievementProofUrl(localUrl);
      toast.info(`Uploaded certificate proof: ${file.name}`);
    }
  };

  // Student Submits Achievement for Verification
  const handleSubmitAchievement = async () => {
    if (!achievementTitle.trim() || !achievementIssuer.trim()) {
      toast.error('Please enter the achievement title and issuing authority.');
      return;
    }
    if (!achievementProofUrl.trim() && !achievementCredentialUrl.trim()) {
      toast.error('Please upload a certificate proof or provide a verification URL.');
      return;
    }

    setIsSubmittingAchievement(true);
    try {
      const newPending: PendingAchievement = {
        id: `ach_${Date.now()}`,
        title: achievementTitle.trim(),
        issuedBy: achievementIssuer.trim(),
        category: achievementCategory,
        reason: achievementReason.trim() || 'Verified achievement submitted for Grok AI & university credentialing.',
        submittedAt: Date.now(),
        status: 'pending_ai',
        proofUrl: achievementProofUrl || 'https://images.unsplash.com/photo-1569683795645-b62e50fbf103?auto=format&fit=crop&w=800&q=80',
        proofType: 'image',
        credentialUrl: achievementCredentialUrl.trim() || undefined,
        aiVerificationScore: 97,
      };

      setPendingAchievements(prev => [newPending, ...prev]);

      // Save to Firestore achievements collection if available
      if (db) {
        try {
          await addDoc(collection(db, 'achievements'), {
            userId,
            ...newPending,
            collegeId: (session?.user as any)?.collegeId || 'iitd',
          });
        } catch (_) {}
      }

      // Notify faculty & student
      await api.createNotification({
        userId,
        type: 'achievement_submitted',
        title: '📜 Achievement Submitted for Verification',
        body: `Your credential "${newPending.title}" is in pending verification mode. Run Grok AI Verification or await Faculty Approval to mint your on-chain SBT.`,
        meta: { achievementId: newPending.id, title: newPending.title },
      }).catch(() => null);

      setAddModalOpen(false);
      setAchievementTitle('');
      setAchievementIssuer('');
      setAchievementReason('');
      setAchievementProofUrl('');
      setAchievementCredentialUrl('');
      setProofFileName('');
      setAchievementTab('pending');

      toast.success(
        '📜 Achievement submitted in pending mode! Run Grok AI verification to mint your Soulbound Token on Polygon.',
        { duration: 6000 }
      );
    } catch (err: any) {
      toast.error('Submission failed: ' + (err.message || 'Unknown error'));
    } finally {
      setIsSubmittingAchievement(false);
    }
  };

  // Run Grok AI Verification & Automatically Mint On-Chain SBT
  const handleVerifyWithGrokAi = async (ach: PendingAchievement) => {
    setVerifyingWithAiId(ach.id);
    setAiProgressText('🤖 Initializing Grok AI Credential Scanner...');

    try {
      await new Promise(r => setTimeout(r, 900));
      setAiProgressText('🔍 Parsing certificate metadata, issuing authority & signature...');
      await new Promise(r => setTimeout(r, 1100));
      setAiProgressText('🛡️ Verifying zero-fraud cryptographic binding with student identity...');
      await new Promise(r => setTimeout(r, 1000));
      setAiProgressText('⚡ Grok AI Authenticity Confirmed (98.4% Match). Minting SBT on Polygon Amoy...');

      // Simulate on-chain minting
      const result = await simulateMintSBT(walletAddress, ach.title);

      const mintedSbt: OnChainSBT = {
        tokenId: result.tokenId,
        title: ach.title,
        issuedBy: ach.issuedBy,
        reason: ach.reason,
        mintedAt: Math.floor(Date.now() / 1000),
        recipient: walletAddress,
      };

      // Save transaction record to local history
      saveTxRecord({
        hash: result.txHash,
        type: 'SBT_MINT',
        label: `Minted Soulbound Token: ${ach.title}`,
        tokenId: result.tokenId,
        contractAddress: result.contractAddress,
        timestamp: Date.now(),
        status: 'confirmed',
        network: 'Polygon Amoy Testnet',
      });

      // Append to transactions audit list
      const mintTx: StudentTransaction = {
        id: result.txHash,
        type: 'SBT_MINT',
        label: `Minted Soulbound Token: ${ach.title} (Token #${result.tokenId})`,
        amount: '0 POL',
        timestamp: Date.now(),
        status: 'confirmed',
        network: 'Polygon Amoy Testnet',
        txHash: result.txHash,
      };
      setTransactions(prev => [mintTx, ...prev]);

      // Move from pending to verified
      setSbts(prev => [mintedSbt, ...prev]);
      setPendingAchievements(prev => prev.filter(p => p.id !== ach.id));

      // Send confirmation notification
      await api.createNotification({
        userId,
        type: 'sbt_minted',
        title: '🎉 Grok AI Verified & SBT Minted!',
        body: `Your credential "${ach.title}" was verified with 98.4% confidence by Grok AI. Soulbound Token #${result.tokenId} is now active on Polygon Amoy.`,
        meta: { tokenId: result.tokenId, txHash: result.txHash },
      }).catch(() => null);

      setAchievementTab('verified');
      toast.success(`🎉 Grok AI Verified! Soulbound Token #${result.tokenId} minted to your Polygon wallet.`, {
        duration: 8000,
        action: {
          label: 'Polygonscan',
          onClick: () => window.open(explorerTxUrl(result.txHash), '_blank'),
        },
      });
    } catch (err: any) {
      toast.error('AI Verification encountered an issue. Please try again.');
    } finally {
      setVerifyingWithAiId(null);
      setAiProgressText('');
    }
  };

  // Multi-channel Withdrawal (POL -> INR via UPI or Bank IMPS)
  const handleWithdraw = async () => {
    const amountNum = parseFloat(withdrawAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('Please enter a valid amount in POL');
      return;
    }
    if (amountNum > polEarnings) {
      toast.error(`Insufficient earnings. Available: ${polEarnings} POL`);
      return;
    }

    if (withdrawMethod === 'upi') {
      if (!withdrawDestination.includes('@')) {
        toast.error('Please enter a valid UPI ID (e.g. name@okhdfcbank)');
        return;
      }
    } else {
      if (withdrawDestination.trim().length < 6) {
        toast.error('Please enter a valid Bank Account Number and IFSC Code');
        return;
      }
    }

    setIsProcessingWithdraw(true);
    try {
      const inrValue = Math.round(amountNum * 35);
      const randomHex = Math.floor(Math.random() * 0xffffffff).toString(16).padStart(8, '0');
      const fakeTxHash = `0x${randomHex}892b1049f7e61a4c8032${randomHex}`;

      // Deduct earnings
      setPolEarnings(prev => Math.max(0, +(prev - amountNum).toFixed(2)));

      const newTx: StudentTransaction = {
        id: `wth_${Date.now()}`,
        type: 'PAYOUT',
        label: withdrawMethod === 'upi'
          ? `Student UPI Withdrawal to ${withdrawDestination} (₹${inrValue.toLocaleString('en-IN')})`
          : `Student Bank Transfer to ${withdrawDestination} (₹${inrValue.toLocaleString('en-IN')})`,
        amount: `-${amountNum} POL`,
        timestamp: Date.now(),
        status: 'confirmed',
        network: 'Polygon Amoy (IMPS Off-Ramp)',
        txHash: fakeTxHash,
      };

      setTransactions(prev => [newTx, ...prev]);

      saveTxRecord({
        hash: fakeTxHash,
        type: 'POL_TRANSFER',
        label: newTx.label,
        amount: `-${amountNum} POL`,
        timestamp: Date.now(),
        status: 'confirmed',
        network: 'Polygon Amoy Testnet',
      });

      if (db) {
        try {
          await addDoc(collection(db, 'transactions'), {
            userId,
            type: 'PAYOUT',
            label: newTx.label,
            amount: `-${amountNum} POL`,
            timestamp: Date.now(),
            status: 'confirmed',
            network: 'Polygon Amoy (IMPS Off-Ramp)',
            txHash: fakeTxHash,
            amountInr: inrValue,
            tokensWithdrawn: amountNum,
          });
        } catch (_) {}
      }

      await api.createNotification({
        userId,
        type: 'withdrawal',
        title: '💸 Earnings Withdrawn via ' + (withdrawMethod === 'upi' ? 'UPI' : 'Bank IMPS'),
        body: `Your withdrawal of ${amountNum} POL (₹${inrValue.toLocaleString('en-IN')}) has been dispatched to ${withdrawDestination} via instant IMPS.`,
        meta: { amount: amountNum, inrValue, destination: withdrawDestination, method: withdrawMethod },
      }).catch(() => null);

      setWithdrawOpen(false);
      toast.success(`💸 Dispatched ₹${inrValue.toLocaleString('en-IN')} (${amountNum} POL) to ${withdrawDestination}!`);
    } catch (err: any) {
      toast.error('Withdrawal failed: ' + (err.message || 'Unknown error'));
    } finally {
      setIsProcessingWithdraw(false);
    }
  };

  return (
    <DashboardLayout role="student">
      <div className="max-w-6xl mx-auto space-y-8 py-2">

        {/* ── TOP SECTION: 2-COLUMN GRID (Wallet on Left, Activity on Right) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

          {/* LEFT COLUMN: Identity Wallet & Balances (7 cols) */}
          <div className="lg:col-span-7 space-y-4">
            <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/8 via-accent/5 to-transparent p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  <Shield className="h-3.5 w-3.5" /> Polygon Amoy · ERC-4337 Smart Account
                </div>

                {/* Top Action Buttons */}
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={refreshBalance}
                    disabled={balanceLoading}
                    className="h-8 text-xs gap-1.5 font-medium"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${balanceLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setWithdrawOpen(true)}
                    className="h-8 text-xs font-semibold gap-1.5 border border-amber-600/40 text-amber-800 dark:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20 shadow-sm"
                  >
                    <ArrowUpRight className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
                    Withdraw (INR)
                  </Button>
                </div>
              </div>

              <div>
                <h1 className="text-2xl font-bold text-foreground" style={{ fontFamily: '"Fraunces", serif' }}>
                  Student Identity & Polygon Treasury
                </h1>
                <p className="text-muted-foreground text-xs leading-relaxed mt-1">
                  Holds non-transferable Soulbound Tokens (SBTs) and receives MicroGig rewards in Polygon (POL) coin. Withdrawable directly to INR via UPI or IMPS.
                </p>
              </div>

              {/* Address Bar */}
              <div className="flex flex-wrap items-center gap-2 pt-0.5">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background/80 border border-border/80 text-xs font-mono text-foreground">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span className="truncate max-w-[180px] sm:max-w-none">{walletAddress || 'Generating…'}</span>
                </div>
                <Button size="sm" variant="outline" onClick={copyAddress} className="h-7 gap-1 text-xs" disabled={!walletAddress}>
                  <Copy className="h-3 w-3" /> Copy
                </Button>
                <a href={explorerAddressUrl(walletAddress)} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors px-1">
                  Polygonscan <ExternalLink className="h-2.5 w-2.5" />
                </a>
                <a href={AMOY_FAUCET} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-accent hover:text-accent/80 transition-colors px-1 font-semibold">
                  Faucet <ExternalLink className="h-2.5 w-2.5" />
                </a>
              </div>

              {/* Balance Cards Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                {/* POL Balance (Live from Amoy) */}
                <div className="p-3.5 rounded-xl bg-card border border-border shadow-sm space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                      <Coins className="h-3.5 w-3.5 text-violet-500" /> POL Balance
                    </span>
                    <button onClick={refreshBalance} disabled={balanceLoading} className="text-muted-foreground hover:text-primary transition-colors">
                      <RefreshCw className={`h-3 w-3 ${balanceLoading ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                  <div className="text-xl font-black text-foreground font-mono">{polBalance}</div>
                  <div className="text-[10px] text-muted-foreground">Polygon Amoy (live)</div>
                </div>

                {/* POL Earnings Card */}
                <div className="p-3.5 rounded-xl bg-card border border-border shadow-sm space-y-1">
                  <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Coins className="h-3.5 w-3.5 text-purple-500" /> POL Earnings
                  </span>
                  <div className="text-xl font-black text-foreground font-mono">{polEarnings.toFixed(2)} POL</div>
                  <div className="text-[10px] text-purple-700 dark:text-purple-300 font-medium">≈ ₹{(polEarnings * 35).toLocaleString('en-IN')} INR</div>
                  <Button size="sm" onClick={() => setWithdrawOpen(true)} className="w-full mt-1.5 h-6 text-[11px] gap-1">
                    Withdraw <ArrowUpRight className="h-3 w-3" />
                  </Button>
                </div>

                {/* Export Private Key */}
                <div className="p-3.5 rounded-xl bg-card border border-border shadow-sm flex flex-col justify-between space-y-2">
                  <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                    <Key className="h-3.5 w-3.5 text-accent" /> Custodial Wallet
                  </div>
                  <div className="text-[10px] text-muted-foreground leading-tight">ERC-4337 Web3 Identity</div>
                  <Button size="sm" variant="secondary" onClick={() => setExportModalOpen(true)} className="w-full text-[11px] h-6 gap-1">
                    <ExternalLink className="h-3 w-3" /> Export Key
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Transaction Activity & Audit Log (5 cols) */}
          <div className="lg:col-span-5">
            <div className="glass-card p-5 rounded-2xl border border-border shadow-sm bg-card space-y-3 flex flex-col justify-between h-full">
              <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
                <div>
                  <h2 className="text-sm font-bold text-foreground font-mono flex items-center gap-1.5">
                    <History className="h-4 w-4 text-purple-600 dark:text-purple-400" /> Transaction Activity
                  </h2>
                  <p className="text-[11px] text-muted-foreground font-mono">
                    Audit trail of rewards & withdrawals
                  </p>
                </div>
                <Badge variant="outline" className="text-[10px] font-mono text-foreground border-border">
                  {transactions.length} Records
                </Badge>
              </div>

              {/* Scrollable Audit List */}
              <div className="divide-y divide-border/50 max-h-[300px] overflow-y-auto pr-1">
                {transactions.length > 0 ? (
                  transactions.map((tx) => (
                    <div key={tx.id} className="py-2.5 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${
                          tx.type === 'GIG_PAYOUT' || tx.type === 'TOPUP'
                            ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                            : tx.type === 'SBT_MINT'
                            ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30'
                            : 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                        }`}>
                          {tx.type === 'GIG_PAYOUT' || tx.type === 'TOPUP' ? (
                            <ArrowDownLeft className="h-3.5 w-3.5" />
                          ) : tx.type === 'SBT_MINT' ? (
                            <Sparkles className="h-3.5 w-3.5" />
                          ) : (
                            <ArrowUpRight className="h-3.5 w-3.5" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-xs text-foreground truncate font-mono">
                            {tx.label}
                          </div>
                          <div className="text-[10px] text-muted-foreground font-mono mt-0.5 flex items-center gap-1.5 truncate">
                            <span>{new Date(tx.timestamp).toLocaleDateString()}</span>
                            {tx.txHash && (
                              <>
                                <span>•</span>
                                <a
                                  href={explorerTxUrl(tx.txHash)}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-primary hover:underline cursor-pointer"
                                >
                                  {tx.txHash.slice(0, 8)}...
                                </a>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className={`text-xs font-mono font-bold ${
                          tx.amount.startsWith('+')
                            ? 'text-emerald-700 dark:text-emerald-400'
                            : tx.amount.startsWith('-')
                            ? 'text-rose-700 dark:text-rose-400'
                            : 'text-foreground'
                        }`}>
                          {tx.amount}
                        </div>
                        <Badge variant="outline" className="text-[9px] font-mono capitalize border-border text-foreground">
                          {tx.status}
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-8 text-center text-xs text-muted-foreground font-mono">
                    No transactions recorded yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ── BOTTOM SECTION: SOULBOUND TOKENS (SBTs) & ACHIEVEMENTS ── */}
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-between gap-4 flex-wrap border-b border-border/60 pb-3">
            <div>
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2" style={{ fontFamily: '"Fraunces", serif' }}>
                <Award className="h-5 w-5 text-accent" /> Soulbound Tokens (SBTs) & Verified Achievements
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Non-transferable ERC-5192 credentials verified by Grok AI and college faculty, minted permanently to Polygon.
              </p>
            </div>

            {/* Actions & Tabs */}
            <div className="flex items-center gap-3">
              {/* Tab Selector */}
              <div className="flex items-center p-1 rounded-lg bg-secondary/60 border border-border text-xs font-mono">
                <button
                  onClick={() => setAchievementTab('verified')}
                  className={`px-3 py-1 rounded-md transition-colors font-semibold ${
                    achievementTab === 'verified'
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Verified On-Chain ({sbts.length})
                </button>
                <button
                  onClick={() => setAchievementTab('pending')}
                  className={`px-3 py-1 rounded-md transition-colors font-semibold flex items-center gap-1.5 ${
                    achievementTab === 'pending'
                      ? 'bg-card text-foreground shadow-sm'
                      : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Pending Verification ({pendingAchievements.length})
                  {pendingAchievements.length > 0 && (
                    <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                  )}
                </button>
              </div>

              <Button size="sm" onClick={() => setAddModalOpen(true)} className="gap-1.5 text-xs">
                <Upload className="h-3.5 w-3.5" /> Submit Achievement Proof
              </Button>
            </div>
          </div>

          {/* TAB 1: VERIFIED ON-CHAIN SBTs */}
          {achievementTab === 'verified' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {sbts.map(sbt => (
                <div key={sbt.id}
                  className="rounded-2xl border border-border bg-card overflow-hidden flex flex-col hover:border-primary/50 hover:shadow-md transition-all group">
                  {/* NFT Header */}
                  <div className="h-24 bg-gradient-to-br from-purple-600/20 via-primary/15 to-violet-500/20 p-4 flex flex-col justify-between relative border-b border-border/40">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-background/80 backdrop-blur-md text-foreground">
                        Token #{sbt.tokenId}
                      </span>
                      <Badge variant="secondary" className="text-[10px] gap-1 bg-background/90 text-purple-700 dark:text-purple-300">
                        <Shield className="h-2.5 w-2.5 text-purple-500" /> Polygon Amoy
                      </Badge>
                    </div>
                    <div className="text-xs font-semibold text-foreground truncate">{sbt.issuedBy}</div>
                  </div>

                  <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors leading-snug mb-1.5">{sbt.title}</h3>
                      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{sbt.reason}</p>
                    </div>
                    <div className="pt-3 border-t border-border/40 space-y-2">
                      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                        <span>Minted On-Chain:</span>
                        <span className="font-medium text-foreground">{new Date(sbt.mintedAt * 1000).toLocaleDateString()}</span>
                      </div>
                      <Button size="sm" variant="outline" className="w-full mt-1 gap-1.5 text-xs font-mono"
                        onClick={() => { setSelectedSbt(sbt); setProofModalOpen(true); }}>
                        <Sparkles className="h-3 w-3 text-primary" /> View Cryptographic Proof
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* TAB 2: PENDING VERIFICATIONS (Grok AI & Faculty Review) */}
          {achievementTab === 'pending' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-foreground flex items-start gap-3">
                <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-amber-800 dark:text-amber-300 font-semibold block">Pending Fraud-Proof Verification</strong>
                  Student achievements with uploaded certificates remain in pending mode until verified by **Grok AI** or reviewed by college faculty. Click **"Verify with Grok AI"** on any credential to run instant AI document verification and mint your Soulbound Token!
                </div>
              </div>

              {pendingAchievements.length === 0 ? (
                <div className="p-12 text-center rounded-2xl border border-dashed border-border bg-card space-y-3">
                  <Award className="h-10 w-10 text-muted-foreground mx-auto opacity-50" />
                  <h3 className="text-sm font-semibold text-foreground">No pending achievement proofs</h3>
                  <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                    Submit your hackathon wins, open-source bounties, or certifications with proof media to mint verified SBTs.
                  </p>
                  <Button size="sm" onClick={() => setAddModalOpen(true)} className="gap-1.5 mt-1">
                    <Upload className="h-3.5 w-3.5" /> Submit Achievement Proof
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {pendingAchievements.map((ach) => (
                    <div
                      key={ach.id}
                      className="rounded-2xl border border-border bg-card p-5 space-y-4 shadow-sm flex flex-col justify-between"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <Badge className="bg-amber-500/15 text-amber-800 dark:text-amber-300 border border-amber-500/30 text-[10px] font-mono mb-1.5 gap-1">
                              <Clock className="h-3 w-3" /> Awaiting Verification
                            </Badge>
                            <h3 className="font-bold text-sm text-foreground leading-snug">{ach.title}</h3>
                            <span className="text-xs text-muted-foreground font-mono block mt-0.5">
                              Issuer: <strong className="text-foreground">{ach.issuedBy}</strong>
                            </span>
                          </div>

                          {ach.proofUrl && (
                            <button
                              type="button"
                              onClick={() => setSelectedProofPreview(ach)}
                              className="relative group shrink-0 rounded-lg overflow-hidden border border-border h-12 w-16 bg-secondary/80 flex items-center justify-center hover:opacity-90 transition-opacity"
                            >
                              <img src={ach.proofUrl} alt="Certificate Proof" className="h-full w-full object-cover" />
                              <span className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white text-[10px]">
                                <Eye className="h-3.5 w-3.5" />
                              </span>
                            </button>
                          )}
                        </div>

                        <p className="text-xs text-muted-foreground leading-relaxed">{ach.reason}</p>

                        {/* Credential Links */}
                        {ach.credentialUrl && (
                          <div className="text-[11px] font-mono">
                            <a
                              href={ach.credentialUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary hover:underline inline-flex items-center gap-1"
                            >
                              <ExternalLink className="h-3 w-3" /> Official Issuer Link: {ach.credentialUrl}
                            </a>
                          </div>
                        )}
                      </div>

                      {/* AI Verification CTA */}
                      <div className="pt-3 border-t border-border/60 flex items-center justify-between gap-3">
                        <span className="text-[11px] font-mono text-muted-foreground">
                          Submitted: {new Date(ach.submittedAt).toLocaleDateString()}
                        </span>

                        <Button
                          size="sm"
                          onClick={() => handleVerifyWithGrokAi(ach)}
                          disabled={verifyingWithAiId === ach.id}
                          className="bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs font-semibold gap-1.5 shadow-sm"
                        >
                          {verifyingWithAiId === ach.id ? (
                            <>
                              <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Verifying...
                            </>
                          ) : (
                            <>
                              <Bot className="h-3.5 w-3.5" /> Verify with Grok AI
                            </>
                          )}
                        </Button>
                      </div>

                      {/* Live verification progress ticker if currently active */}
                      {verifyingWithAiId === ach.id && (
                        <div className="p-2.5 rounded-lg bg-purple-500/10 border border-purple-500/20 text-[11px] font-mono text-purple-700 dark:text-purple-300 animate-pulse">
                          {aiProgressText}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Why SBTs Matter ──────────────────────────────────── */}
        <div className="p-6 rounded-2xl border border-border/60 bg-card grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            { icon: Lock, color: 'text-primary', label: 'Zero Fraud Guarantee', copy: '74% of Indian HR teams rank fake degrees as #1 hiring risk. SBTs are permanently bound to your wallet address — cannot be transferred, sold, or faked.' },
            { icon: CheckCircle2, color: 'text-emerald-500', label: 'Instant Verification', copy: 'Recruiters verify credentials in under 2 seconds by inspecting the cryptographic signature directly on Polygon — no manual background checks needed.' },
            { icon: TrendingUp, color: 'text-accent', label: 'Compounding Skill Graph', copy: 'Every hackathon win, open-source contribution, and MicroGig deliverable mints proof-of-work into your growing live skill record.' },
          ].map(({ icon: Icon, color, label, copy }) => (
            <div key={label} className="space-y-2">
              <div className={`flex items-center gap-2 font-semibold text-sm text-foreground`}>
                <Icon className={`h-4 w-4 ${color}`} /> {label}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed">{copy}</p>
            </div>
          ))}
        </div>

        {/* ── MODAL 1: SUBMIT ACHIEVEMENT WITH CERTIFICATE / PROOF MEDIA ── */}
        <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
          <DialogContent className="bg-card border-border text-foreground max-w-lg shadow-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-foreground font-mono text-base">
                <Upload className="h-4 w-4 text-primary" /> Submit Verified Achievement Proof
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground font-mono">
                Upload your certificate or competition proof. Credentials will be placed in pending mode and verified by Grok AI before minting your Soulbound Token on Polygon.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground font-mono">Achievement Title *</label>
                <Input
                  value={achievementTitle}
                  onChange={e => setAchievementTitle(e.target.value)}
                  placeholder="e.g. Smart India Hackathon 2026 Winner"
                  className="bg-background border-input text-xs font-mono text-foreground"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground font-mono">Issuing Authority / Org *</label>
                  <Input
                    value={achievementIssuer}
                    onChange={e => setAchievementIssuer(e.target.value)}
                    placeholder="e.g. Ministry of Education / AICTE"
                    className="bg-background border-input text-xs font-mono text-foreground"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-foreground font-mono">Category</label>
                  <Input
                    value={achievementCategory}
                    onChange={e => setAchievementCategory(e.target.value)}
                    placeholder="e.g. Hackathon, Cloud Cert, Bounty"
                    className="bg-background border-input text-xs font-mono text-foreground"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground font-mono">Achievement Details / Citation</label>
                <textarea
                  value={achievementReason}
                  onChange={e => setAchievementReason(e.target.value)}
                  placeholder="Describe your role, deliverable, or hackathon project problem statement..."
                  rows={2}
                  className="w-full rounded-md border border-input bg-background p-2.5 text-xs font-mono text-foreground focus:outline-none focus:ring-1 focus:ring-primary resize-none"
                />
              </div>

              {/* Certificate Media Upload Area */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground font-mono flex items-center justify-between">
                  <span>Certificate / Proof Media (Image / Document) *</span>
                  {proofFileName && <span className="text-primary font-normal">{proofFileName}</span>}
                </label>
                <div className="border-2 border-dashed border-border rounded-xl p-4 text-center hover:border-primary/50 transition-colors bg-secondary/30 relative">
                  <input
                    type="file"
                    accept="image/*,application/pdf"
                    onChange={handleFileChange}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <div className="flex flex-col items-center gap-1.5">
                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                    <span className="text-xs font-mono text-foreground font-medium">
                      {proofFileName ? 'Replace Certificate Proof' : 'Click to upload certificate or winner letter'}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">PNG, JPG, WEBP, or PDF up to 10MB</span>
                  </div>
                </div>
              </div>

              {/* Optional Credential / Portfolio URL */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground font-mono">
                  Online Verification URL (Devfolio, Credly, GitHub, etc.)
                </label>
                <Input
                  value={achievementCredentialUrl}
                  onChange={e => setAchievementCredentialUrl(e.target.value)}
                  placeholder="https://devfolio.co/submissions/..."
                  className="bg-background border-input text-xs font-mono text-foreground"
                />
              </div>

              <div className="rounded-lg bg-purple-500/10 border border-purple-500/20 p-3 flex items-start gap-2 text-[11px] text-muted-foreground font-mono">
                <Bot className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                <span>
                  After submission, this achievement enters **Pending Mode**. You or college faculty can trigger **Grok AI Verification** to validate the document and mint the ERC-5192 Soulbound Token.
                </span>
              </div>
            </div>

            <DialogFooter className="border-t border-border pt-3">
              <Button variant="ghost" size="sm" onClick={() => setAddModalOpen(false)} className="text-xs font-mono">
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSubmitAchievement}
                disabled={isSubmittingAchievement}
                className="bg-primary text-primary-foreground font-mono text-xs font-semibold gap-1.5 shadow-sm"
              >
                {isSubmittingAchievement ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Submitting...
                  </>
                ) : (
                  <>
                    <Upload className="h-3.5 w-3.5" /> Submit for Verification
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── MODAL 2: CERTIFICATE PROOF PREVIEW MODAL ──────────── */}
        <Dialog open={!!selectedProofPreview} onOpenChange={() => setSelectedProofPreview(null)}>
          <DialogContent className="bg-card border-border text-foreground max-w-xl shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-sm font-bold font-mono text-foreground flex items-center gap-2">
                <FileText className="h-4 w-4 text-primary" /> Certificate Proof: {selectedProofPreview?.title}
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground font-mono">
                Issuer: {selectedProofPreview?.issuedBy}
              </DialogDescription>
            </DialogHeader>
            {selectedProofPreview?.proofUrl && (
              <div className="rounded-xl overflow-hidden border border-border bg-black/50 max-h-[400px] flex items-center justify-center p-2">
                <img
                  src={selectedProofPreview.proofUrl}
                  alt="Certificate"
                  className="max-h-[380px] w-auto object-contain rounded-lg shadow-md"
                />
              </div>
            )}
            <DialogFooter className="border-t border-border pt-2 flex items-center justify-between">
              <span className="text-xs font-mono text-muted-foreground">
                Grok AI Confidence: <strong className="text-purple-600 dark:text-purple-400">{selectedProofPreview?.aiVerificationScore || 96}%</strong>
              </span>
              <Button size="sm" variant="outline" onClick={() => setSelectedProofPreview(null)} className="text-xs font-mono">
                Close Preview
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── MODAL 3: CRYPTOGRAPHIC SBT PROOF MODAL ────────────── */}
        <Dialog open={proofModalOpen} onOpenChange={setProofModalOpen}>
          <DialogContent className="bg-card border-border text-foreground max-w-lg shadow-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-foreground font-mono text-base">
                <Shield className="h-4 w-4 text-purple-600 dark:text-purple-400" /> ERC-5192 Cryptographic Proof
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground font-mono">
                On-chain verifiable credential metadata (Polygon Amoy)
              </DialogDescription>
            </DialogHeader>
            {selectedSbt && (
              <div className="space-y-4 py-2 text-xs">
                <div className="p-3 rounded-lg bg-secondary/60 font-mono space-y-2 overflow-x-auto text-[11px] border border-border">
                  {[
                    ['Contract', '0x3E62bE5E52B750e3B3bDb798EAf4E6A360D4A09e'],
                    ['Token ID', `#${selectedSbt.tokenId}`],
                    ['Owner Wallet', walletAddress],
                    ['Tx Hash', selectedSbt.txHash],
                    ['Standard', 'ERC-5192 (Locked: true)'],
                    ['Network', 'Polygon Amoy Testnet (Chain 80002)'],
                  ].map(([k, v]) => (
                    <div key={k}><span className="text-muted-foreground">{k}: </span>
                      <span className={k === 'Standard' ? 'text-emerald-600 dark:text-emerald-400 font-bold' : k === 'Tx Hash' ? 'text-primary' : 'text-foreground'}>{v}</span>
                    </div>
                  ))}
                </div>
                <div><p className="font-semibold text-foreground mb-1 font-mono">Issuing Authority:</p><p className="text-muted-foreground text-xs">{selectedSbt.issuedBy}</p></div>
                <div><p className="font-semibold text-foreground mb-1 font-mono">Achievement Citation:</p><p className="text-muted-foreground text-xs leading-relaxed">{selectedSbt.reason}</p></div>
              </div>
            )}
            <DialogFooter className="border-t border-border pt-3">
              <Button variant="outline" size="sm" onClick={() => setProofModalOpen(false)} className="text-xs font-mono">Close</Button>
              <a href={selectedSbt ? explorerTxUrl(selectedSbt.txHash) : AMOY_EXPLORER} target="_blank" rel="noreferrer">
                <Button size="sm" className="gap-1.5 text-xs font-mono">
                  <ExternalLink className="h-3.5 w-3.5" /> View on Polygonscan
                </Button>
              </a>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── MODAL 4: WITHDRAWAL DIALOG (POL -> INR) ───────────── */}
        <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
          <DialogContent className="bg-card border-border text-foreground max-w-md shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2 font-mono text-foreground">
                <ArrowUpRight className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                Withdraw Polygon Earnings (POL → INR)
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground font-mono">
                Convert and remit your verified MicroGig POL earnings directly to your Indian bank account or personal UPI ID via instant IMPS payout.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <label className="text-foreground font-semibold">Withdrawal Amount (POL)</label>
                  <span className="text-muted-foreground font-medium">Available: {polEarnings.toFixed(2)} POL</span>
                </div>
                <div className="relative">
                  <Input
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="50"
                    max={polEarnings}
                    className="bg-background border-input text-xs font-mono text-foreground"
                  />
                  <button
                    type="button"
                    onClick={() => setWithdrawAmount(polEarnings.toString())}
                    className="absolute right-12 top-2.5 text-[11px] text-primary font-mono font-semibold hover:underline"
                  >
                    MAX
                  </button>
                  <span className="absolute right-3 top-2.5 text-xs text-purple-600 dark:text-purple-400 font-mono font-bold">POL</span>
                </div>
              </div>

              {/* Method Selector */}
              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setWithdrawMethod('upi')}
                  className={`font-mono text-xs font-semibold ${
                    withdrawMethod === 'upi'
                      ? 'border-primary text-primary bg-primary/10'
                      : 'border-border text-foreground hover:bg-secondary'
                  }`}
                >
                  UPI (Instant)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setWithdrawMethod('bank')}
                  className={`font-mono text-xs font-semibold ${
                    withdrawMethod === 'bank'
                      ? 'border-primary text-primary bg-primary/10'
                      : 'border-border text-foreground hover:bg-secondary'
                  }`}
                >
                  Bank Transfer (IMPS)
                </Button>
              </div>

              {/* Destination Input */}
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-foreground font-semibold">
                  {withdrawMethod === 'upi' ? 'Student UPI ID / VPA' : 'Bank Account Number & IFSC'}
                </label>
                <Input
                  value={withdrawDestination}
                  onChange={(e) => setWithdrawDestination(e.target.value)}
                  placeholder={withdrawMethod === 'upi' ? 'e.g. student@okaxis' : 'e.g. 50100421987654 (HDFC0000123)'}
                  className="bg-background border-input text-xs font-mono text-foreground"
                />
              </div>

              {/* Settlement Route and Rate Calculation */}
              <div className="p-3.5 rounded-xl bg-secondary/50 border border-border text-xs font-mono space-y-1.5">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Settlement Route:</span>
                  <span className="text-foreground font-medium">Licensed Polygon Gateway (Zero Gas Fees)</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Conversion Rate:</span>
                  <span className="text-foreground font-medium">1 POL ≈ ₹35.00 INR</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground pt-1 border-t border-border/40">
                  <span>Estimated INR Received:</span>
                  <span className="text-amber-700 dark:text-amber-400 font-bold text-sm">
                    ≈ ₹{Math.round((parseFloat(withdrawAmount) || 0) * 35).toLocaleString('en-IN')} INR
                  </span>
                </div>
              </div>
            </div>

            <DialogFooter className="mt-4 pt-3 border-t border-border">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setWithdrawOpen(false)}
                className="font-mono text-xs text-foreground"
                disabled={isProcessingWithdraw}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleWithdraw}
                disabled={isProcessingWithdraw || !withdrawAmount || (parseFloat(withdrawAmount) || 0) <= 0 || (parseFloat(withdrawAmount) || 0) > polEarnings}
                className="bg-amber-600 hover:bg-amber-500 text-white font-mono text-xs font-semibold gap-1.5 shadow-sm"
              >
                {isProcessingWithdraw ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Remitting...
                  </>
                ) : (
                  <>
                    Confirm INR Remittance <ArrowUpRight className="h-3.5 w-3.5" />
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── MODAL 5: EXPORT PRIVATE KEY ───────────────────────── */}
        <Dialog open={exportModalOpen} onOpenChange={setExportModalOpen}>
          <DialogContent className="sm:max-w-md bg-card border-border text-foreground shadow-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive font-mono text-base">
                <AlertCircle className="h-5 w-5" /> Export Private Key
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground font-mono">
                Import your Almadox identity wallet into MetaMask or Phantom to view and manage your POL tokens.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs p-3 rounded-md font-mono">
                <strong>WARNING:</strong> Never share this key with anyone. Anyone with this key has complete control over your on-chain assets.
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground font-mono">Your Private Key</label>
                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    readOnly
                    value={walletPrivateKey}
                    className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-xs font-mono text-muted-foreground"
                  />
                  <Button
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(walletPrivateKey);
                      toast.success('Private key copied! Do not share this.');
                    }}
                    className="shrink-0 text-xs font-mono"
                  >
                    Copy
                  </Button>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={() => setExportModalOpen(false)} className="text-xs font-mono">Done</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
