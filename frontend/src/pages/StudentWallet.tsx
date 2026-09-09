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
  History, ArrowDownLeft
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

export default function StudentWallet() {
  const { session } = useAuth();
  const userId = session?.userId || 'demo-student';

  // Web3 state
  const [walletAddress, setWalletAddress] = useState('');
  const [walletPrivateKey, setWalletPrivateKey] = useState('');
  const [polBalance, setPolBalance] = useState('0.0000');
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);

  // SBT state
  const [sbts, setSbts] = useState<OnChainSBT[]>([]);
  const [selectedSbt, setSelectedSbt] = useState<OnChainSBT | null>(null);
  const [proofModalOpen, setProofModalOpen] = useState(false);

  // Add Achievement modal
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [achievementTitle, setAchievementTitle] = useState('');
  const [achievementReason, setAchievementReason] = useState('');
  const [achievementIssuer, setAchievementIssuer] = useState('');
  const [minting, setMinting] = useState(false);

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
    } catch (_) {
      // Ignored if offline or collection not indexed
    }
  }, [userId]);

  // Fetch POL balance from Amoy testnet
  const refreshBalance = useCallback(async () => {
    if (!walletAddress) return;
    setBalanceLoading(true);
    const { formatted } = await fetchNativeBalance(walletAddress);
    setPolBalance(formatted);
    const onChainSbts = await fetchSBTsForAddress(walletAddress);
    // Merge any simulated SBTs that we might have created during this session
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

  const handleMintSBT = async () => {
    if (!achievementTitle.trim() || !achievementIssuer.trim()) {
      toast.error('Please fill in the achievement title and issuing authority.');
      return;
    }
    setMinting(true);
    try {
      const result = await simulateMintSBT(walletAddress, achievementTitle);
      
      const newSbt: OnChainSBT = {
        tokenId: result.tokenId,
        title: achievementTitle,
        issuedBy: achievementIssuer,
        reason: achievementReason || 'Achievement verified and minted as Soulbound Token.',
        mintedAt: Math.floor(Date.now() / 1000),
        recipient: walletAddress,
      };
      
      // Save tx to local history log
      saveTxRecord({
        hash: result.txHash,
        type: 'SBT_MINT',
        label: `Minted SBT: ${achievementTitle}`,
        tokenId: result.tokenId,
        contractAddress: result.contractAddress,
        timestamp: Date.now(),
        status: 'confirmed',
        network: 'Polygon Amoy Testnet',
      });

      const newTx: StudentTransaction = {
        id: result.txHash,
        type: 'SBT_MINT',
        label: `Minted Soulbound Token: ${achievementTitle}`,
        amount: '0 POL',
        timestamp: Date.now(),
        status: 'confirmed',
        network: 'Polygon Amoy Testnet',
        txHash: result.txHash,
      };
      setTransactions(prev => [newTx, ...prev]);

      setSbts(prev => [newSbt, ...prev]);
      setAddModalOpen(false);
      setAchievementTitle('');
      setAchievementReason('');
      setAchievementIssuer('');
      toast.success(`SBT minted! Token #${result.tokenId} is now on your wallet.`, { duration: 6000 });
    } catch (e) {
      toast.error('Minting failed — please try again.');
    } finally {
      setMinting(false);
    }
  };

  // Comprehensive Withdrawal (UPI or Bank IMPS)
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
      // 1 POL ≈ ₹35 INR
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

      // Add to local state
      setTransactions(prev => [newTx, ...prev]);

      // Save to local storage log
      saveTxRecord({
        hash: fakeTxHash,
        type: 'POL_TRANSFER',
        label: newTx.label,
        amount: `-${amountNum} POL`,
        timestamp: Date.now(),
        status: 'confirmed',
        network: 'Polygon Amoy Testnet',
      });

      // Save to Firestore if available
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

      // Send real-time notification to the student
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
      <div className="max-w-5xl mx-auto space-y-8 py-2">

        {/* ── Wallet Header & Primary Card ──────────────────────── */}
        <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/8 via-accent/5 to-transparent p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="space-y-3 flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                  <Shield className="h-3.5 w-3.5" /> Polygon Amoy Testnet · ERC-4337 Smart Account
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
                    Withdraw Funds (INR)
                  </Button>
                </div>
              </div>

              <h1 className="text-2xl md:text-3xl font-bold text-foreground" style={{ fontFamily: '"Fraunces", serif' }}>
                Student Identity & Polygon Treasury
              </h1>
              <p className="text-muted-foreground text-sm leading-relaxed max-w-lg">
                Auto-provisioned on signup. Holds non-transferable Soulbound Tokens (SBTs) and receives MicroGig rewards in Polygon (POL) coin. Withdrawable directly to INR via UPI or IMPS.
              </p>

              {/* Address Bar */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background/80 border border-border/80 text-xs font-mono text-foreground">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                  <span className="truncate max-w-[200px] sm:max-w-none">{walletAddress || 'Generating…'}</span>
                </div>
                <Button size="sm" variant="outline" onClick={copyAddress} className="h-8 gap-1.5 text-xs" disabled={!walletAddress}>
                  <Copy className="h-3.5 w-3.5" /> Copy
                </Button>
                <a href={explorerAddressUrl(walletAddress)} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors px-2">
                  Polygonscan <ExternalLink className="h-3 w-3" />
                </a>
                <a href={AMOY_FAUCET} target="_blank" rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-accent hover:text-accent/80 transition-colors px-2 font-semibold">
                  Get Testnet POL <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>

            {/* Balance Cards */}
            <div className="flex flex-wrap gap-3">
              {/* POL Balance (Live from Amoy) */}
              <div className="p-4 rounded-xl bg-card border border-border/80 shadow-sm min-w-[160px] space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Coins className="h-3.5 w-3.5 text-violet-500" /> POL Balance
                  </span>
                  <button onClick={refreshBalance} disabled={balanceLoading} className="text-muted-foreground hover:text-primary transition-colors">
                    <RefreshCw className={`h-3 w-3 ${balanceLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>
                <div className="text-2xl font-black text-foreground">{polBalance}</div>
                <div className="text-[11px] text-muted-foreground">Polygon Amoy (live)</div>
              </div>

              {/* POL Earnings Card */}
              <div className="p-4 rounded-xl bg-card border border-border/80 shadow-sm min-w-[160px] space-y-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Coins className="h-3.5 w-3.5 text-purple-500" /> POL Earnings
                </span>
                <div className="text-2xl font-black text-foreground">{polEarnings.toFixed(2)} POL</div>
                <div className="text-[11px] text-purple-700 dark:text-purple-300 font-medium">≈ ₹{(polEarnings * 35).toLocaleString('en-IN')} INR</div>
                <Button size="sm" onClick={() => setWithdrawOpen(true)} className="w-full mt-2 h-7 text-xs gap-1">
                  Withdraw to INR <ArrowUpRight className="h-3 w-3" />
                </Button>
              </div>

              {/* Export Private Key */}
              <div className="p-4 rounded-xl bg-card border border-border/80 shadow-sm min-w-[160px] flex flex-col justify-center gap-2">
                <div className="text-xs text-muted-foreground flex items-center gap-1">
                  <Key className="h-3.5 w-3.5 text-accent" /> Custodial Wallet
                </div>
                <Button size="sm" variant="secondary" onClick={() => setExportModalOpen(true)} className="w-full text-xs gap-1.5">
                  <ExternalLink className="h-3.5 w-3.5" /> Export to MetaMask
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Transaction View & Audit History (Parity with Recruiter) ── */}
        <div className="glass-card p-6 rounded-2xl border border-border/80 space-y-4 shadow-sm bg-card">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div>
              <h2 className="text-base font-bold text-foreground font-mono flex items-center gap-2">
                <History className="h-4 w-4 text-purple-600 dark:text-purple-400" /> Polygon Earnings & Withdrawal Activity
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                Real-time audit trail of student MicroGig bounties, SBT credentials, and instant UPI/IMPS INR withdrawals.
              </p>
            </div>
            <Badge variant="outline" className="text-xs font-mono text-foreground border-border">
              {transactions.length} Records
            </Badge>
          </div>

          <div className="divide-y divide-border/60">
            {transactions.length > 0 ? (
              transactions.map((tx) => (
                <div key={tx.id} className="py-3.5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${
                      tx.type === 'GIG_PAYOUT' || tx.type === 'TOPUP'
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                        : tx.type === 'SBT_MINT'
                        ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30'
                        : 'bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30'
                    }`}>
                      {tx.type === 'GIG_PAYOUT' || tx.type === 'TOPUP' ? (
                        <ArrowDownLeft className="h-4 w-4" />
                      ) : tx.type === 'SBT_MINT' ? (
                        <Sparkles className="h-4 w-4" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-xs text-foreground truncate font-mono">
                        {tx.label}
                      </div>
                      <div className="text-[11px] text-muted-foreground font-mono mt-0.5 flex items-center gap-2">
                        <span>{new Date(tx.timestamp).toLocaleString()}</span>
                        {tx.network && (
                          <>
                            <span>•</span>
                            <span className="text-muted-foreground font-medium">{tx.network}</span>
                          </>
                        )}
                        {tx.txHash && (
                          <>
                            <span>•</span>
                            <a
                              href={explorerTxUrl(tx.txHash)}
                              target="_blank"
                              rel="noreferrer"
                              className="text-primary hover:underline cursor-pointer"
                            >
                              {tx.txHash.slice(0, 10)}...
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
                    <Badge variant="outline" className="text-[10px] font-mono capitalize border-border text-foreground mt-0.5">
                      {tx.status}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-muted-foreground font-mono">
                No activity recorded yet. Apply for MicroGigs to receive Polygon POL earnings.
              </div>
            )}
          </div>
        </div>

        {/* ── SBT Gallery ──────────────────────────────────────── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2" style={{ fontFamily: '"Fraunces", serif' }}>
                <Award className="h-5 w-5 text-accent" /> Soulbound Tokens (SBTs)
              </h2>
              <p className="text-xs text-muted-foreground mt-1">
                Non-transferable ERC-5192 credentials on Polygon — verified, permanent, fraud-proof.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/30 gap-1.5 py-1 px-2.5 text-xs">
                <Lock className="h-3 w-3" /> Non-Transferable
              </Badge>
              <Button size="sm" onClick={() => setAddModalOpen(true)} className="gap-1.5 text-xs">
                <Sparkles className="h-3.5 w-3.5" /> Add Achievement
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {sbts.map(sbt => (
              <div key={sbt.id}
                className="rounded-2xl border border-border/80 bg-card overflow-hidden flex flex-col hover:border-primary/40 hover:shadow-lg transition-all group">
                {/* Visual NFT Header */}
                <div className="h-24 bg-gradient-to-br from-primary/20 via-accent/15 to-violet-500/20 p-4 flex flex-col justify-between relative">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-background/70 backdrop-blur-md text-foreground">
                      Token #{sbt.tokenId}
                    </span>
                    <Badge variant="secondary" className="text-[10px] gap-1 bg-background/80">
                      <Shield className="h-2.5 w-2.5 text-primary" /> Amoy
                    </Badge>
                  </div>
                  <div className="text-xs font-semibold text-foreground/90 truncate">{sbt.issuedBy}</div>
                </div>

                <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors leading-snug mb-2">{sbt.title}</h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">{sbt.reason}</p>
                  </div>
                  <div className="pt-3 border-t border-border/40 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>Minted:</span>
                      <span className="font-medium text-foreground">{new Date(sbt.mintedAt * 1000).toLocaleDateString()}</span>
                    </div>
                    <Button size="sm" variant="outline" className="w-full mt-1 gap-1.5 text-xs"
                      onClick={() => { setSelectedSbt(sbt); setProofModalOpen(true); }}>
                      <Sparkles className="h-3 w-3 text-primary" /> View Cryptographic Proof
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
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

        {/* ── Add Achievement Modal ────────────────────────────── */}
        <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" /> Mint New Achievement SBT
              </DialogTitle>
              <DialogDescription>
                Submit your achievement for minting as a non-transferable Soulbound Token on Polygon Amoy.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Achievement Title *</label>
                <input value={achievementTitle} onChange={e => setAchievementTitle(e.target.value)}
                  placeholder="e.g. Smart India Hackathon 2026 Winner"
                  className="w-full rounded-md border border-input bg-background p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Issuing Authority *</label>
                <input value={achievementIssuer} onChange={e => setAchievementIssuer(e.target.value)}
                  placeholder="e.g. Ministry of Education / AICTE"
                  className="w-full rounded-md border border-input bg-background p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Description / Citation</label>
                <textarea value={achievementReason} onChange={e => setAchievementReason(e.target.value)}
                  placeholder="Describe the achievement and why it is being verified..."
                  rows={3}
                  className="w-full rounded-md border border-input bg-background p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary resize-none" />
              </div>
              <div className="rounded-lg bg-primary/8 border border-primary/20 p-3 flex items-start gap-2 text-[11px] text-muted-foreground">
                <AlertCircle className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                The SBT will be minted to your wallet on <span className="font-semibold text-primary mx-1">Polygon Amoy Testnet</span>. In production, the issuing authority would co-sign this transaction.
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddModalOpen(false)}>Cancel</Button>
              <Button onClick={handleMintSBT} disabled={minting} className="gap-1.5">
                {minting ? <><RefreshCw className="h-3.5 w-3.5 animate-spin" /> Minting…</> : <><Sparkles className="h-3.5 w-3.5" /> Mint SBT</>}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Proof Modal ──────────────────────────────────────── */}
        <Dialog open={proofModalOpen} onOpenChange={setProofModalOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" /> ERC-5192 Cryptographic Proof
              </DialogTitle>
              <DialogDescription>On-chain verifiable credential metadata (Polygon Amoy)</DialogDescription>
            </DialogHeader>
            {selectedSbt && (
              <div className="space-y-4 py-2 text-xs">
                <div className="p-3 rounded-lg bg-secondary/50 font-mono space-y-2 overflow-x-auto text-[11px]">
                  {[
                    ['Contract', '0x3E62bE5E52B750e3B3bDb798EAf4E6A360D4A09e'],
                    ['Token ID', `#${selectedSbt.tokenId}`],
                    ['Owner Wallet', walletAddress],
                    ['Tx Hash', selectedSbt.txHash],
                    ['Standard', 'ERC-5192 (Locked: true)'],
                    ['Network', 'Polygon Amoy Testnet (Chain 80002)'],
                  ].map(([k, v]) => (
                    <div key={k}><span className="text-muted-foreground">{k}: </span>
                      <span className={k === 'Standard' ? 'text-emerald-500' : k === 'Tx Hash' ? 'text-primary' : 'text-foreground'}>{v}</span>
                    </div>
                  ))}
                </div>
                <div><p className="font-semibold text-foreground mb-1">Issuing Authority:</p><p className="text-muted-foreground">{selectedSbt.issuedBy}</p></div>
                <div><p className="font-semibold text-foreground mb-1">Achievement Citation:</p><p className="text-muted-foreground">{selectedSbt.reason}</p></div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setProofModalOpen(false)}>Close</Button>
              <a href={selectedSbt ? explorerTxUrl(selectedSbt.txHash) : AMOY_EXPLORER} target="_blank" rel="noreferrer">
                <Button className="gap-1.5">
                  <ExternalLink className="h-3.5 w-3.5" /> View on Polygonscan
                </Button>
              </a>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── Comprehensive Student Withdrawal Dialog (POL → INR) ── */}
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

        {/* ── Export Private Key Modal ─────────────────────────── */}
        <Dialog open={exportModalOpen} onOpenChange={setExportModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" /> Export Private Key
              </DialogTitle>
              <DialogDescription>
                You can import your Almadox identity wallet into MetaMask to view your POL tokens directly.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-3">
              <div className="bg-destructive/10 border border-destructive/20 text-destructive text-xs p-3 rounded-md">
                <strong>WARNING:</strong> Never share this key with anyone. Anyone with this key has full control over your wallet and funds.
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-foreground">Your Private Key</label>
                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    readOnly
                    value={walletPrivateKey}
                    className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm font-mono text-muted-foreground"
                  />
                  <Button
                    variant="outline"
                    onClick={() => {
                      navigator.clipboard.writeText(walletPrivateKey);
                      toast.success('Private key copied! Do not share this.');
                    }}
                    className="shrink-0"
                  >
                    Copy
                  </Button>
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button onClick={() => setExportModalOpen(false)}>Done</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
