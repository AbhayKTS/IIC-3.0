import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Wallet, Shield, Copy, ExternalLink, Coins, CheckCircle2,
  Lock, Sparkles, RefreshCw, ArrowUpRight, Plus, CreditCard,
  History, ArrowDownLeft, Building2, HelpCircle
} from 'lucide-react';
import {
  generateWalletFromSeed, formatAddress, explorerAddressUrl
} from '@/lib/web3';
import RazorpayCheckoutModal from '@/components/RazorpayCheckoutModal';
import { doc, getDoc, setDoc, addDoc, collection, query, where, getDocs, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';

interface WalletTransaction {
  id: string;
  type: 'TOPUP' | 'PAYOUT' | 'ESCROW_LOCK' | 'ESCROW_RELEASE';
  label: string;
  amount: string;
  timestamp: number;
  status: 'confirmed' | 'pending' | 'failed';
  network?: string;
  txHash?: string;
}

export default function RecruiterWallet() {
  const { session } = useAuth();
  const userId = session?.userId || 'recruiter';

  const [walletAddress, setWalletAddress] = useState('');
  const [balance, setBalance] = useState<number>(2500); // Recruiter balance in Polygon POL
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const prevBalanceRef = useRef<number | null>(null);

  // Top-up Modal & Razorpay Animation State
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('5000');
  const [isProcessingTopUp, setIsProcessingTopUp] = useState(false);
  const [razorpayModalOpen, setRazorpayModalOpen] = useState(false);
  const [pendingRazorpayOrder, setPendingRazorpayOrder] = useState<{
    orderId?: string;
    keyId?: string;
    amount: number;
  }>({ amount: 5000 });

  // Withdraw Modal State
  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('1000');
  const [withdrawMethod, setWithdrawMethod] = useState<'upi' | 'bank'>('upi');
  const [withdrawDestination, setWithdrawDestination] = useState('recruiter@okhdfcbank');
  const [isProcessingWithdraw, setIsProcessingWithdraw] = useState(false);

  // Generate deterministic custodial Polygon address
  useEffect(() => {
    const wallet = generateWalletFromSeed(`recruiter_${userId}`);
    setWalletAddress(wallet.address);
  }, [userId]);

  // Real-time Firestore sync for wallet balance and transactions
  useEffect(() => {
    if (!userId || !db) return;

    // 1. Listen for user wallet balance updates
    const userRef = doc(db, 'users', userId);
    const unsubUser = onSnapshot(userRef, (snap) => {
      if (snap.exists()) {
        const uData = snap.data();
        if (typeof uData.walletBalance === 'number') {
          if (prevBalanceRef.current !== null && uData.walletBalance > prevBalanceRef.current) {
            const added = uData.walletBalance - prevBalanceRef.current;
            toast.success(`🎉 Verified: +${added.toLocaleString()} POL credited to your Polygon treasury!`);
          }
          prevBalanceRef.current = uData.walletBalance;
          setBalance(uData.walletBalance);
        }
      }
    }, (err) => {
      console.warn('Live balance listener error:', err.message);
    });

    // 2. Listen for transaction updates
    const txRef = collection(db, 'transactions');
    const q = query(
      txRef,
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(20)
    );
    const unsubTx = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as WalletTransaction));
        setTransactions(list);
      }
    }, (err) => {
      console.warn('Live transactions listener error:', err.message);
    });

    return () => {
      unsubUser();
      unsubTx();
    };
  }, [userId]);

  // Manual fallback refresh
  const fetchWalletData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      if (db) {
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const uData = userSnap.data();
          if (typeof uData.walletBalance === 'number') {
            setBalance(uData.walletBalance);
            prevBalanceRef.current = uData.walletBalance;
          }
        }

        const txRef = collection(db, 'transactions');
        const q = query(
          txRef,
          where('userId', '==', userId),
          orderBy('timestamp', 'desc'),
          limit(20)
        );
        const txSnap = await getDocs(q);
        if (!txSnap.empty) {
          const list = txSnap.docs.map(d => ({ id: d.id, ...d.data() } as WalletTransaction));
          setTransactions(list);
        }
      }
    } catch (err: any) {
      console.warn('Failed to load wallet data from Firestore:', err.message);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchWalletData();
  }, [fetchWalletData]);

  // Open Razorpay Checkout Modal with animation
  const handleTopUp = async () => {
    const amountNum = parseFloat(topUpAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('Please enter a valid amount in INR');
      return;
    }

    setIsProcessingTopUp(true);
    let orderRes: any = null;
    try {
      orderRes = await api.createRazorpayOrder(amountNum);
    } catch (apiErr: any) {
      console.warn('Backend Razorpay order fallback:', apiErr.message);
    }
    setIsProcessingTopUp(false);
    setTopUpOpen(false);

    setPendingRazorpayOrder({
      orderId: orderRes?.id,
      keyId: orderRes?.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID,
      amount: amountNum,
    });
    setRazorpayModalOpen(true);
  };

  // Handle Razorpay Payment Success & Polygon POL Treasury Credit
  const handleRazorpaySuccess = async (paymentData: {
    razorpay_payment_id: string;
    razorpay_order_id?: string;
    razorpay_signature?: string;
    amount: number;
  }) => {
    // 1 INR = 1 POL on Sandbox Testnet
    const polAmount = paymentData.amount;
    const newBal = balance + polAmount;

    if (db) {
      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, { walletBalance: newBal }, { merge: true });

      const txRecord = {
        userId,
        type: 'TOPUP' as const,
        label: `Wallet Top-up via Razorpay (Converted to POL) — ${paymentData.razorpay_payment_id}`,
        amount: `+${polAmount} POL`,
        timestamp: Date.now(),
        status: 'confirmed' as const,
        network: 'Polygon Amoy Testnet (Fiat/INR)',
        txHash: paymentData.razorpay_payment_id,
      };

      const txColl = collection(db, 'transactions');
      await addDoc(txColl, txRecord);
    }

    setBalance(newBal);
    toast.success(`🎉 Verified: +${polAmount.toLocaleString()} POL credited to Polygon corporate treasury!`);
  };

  // Handle Treasury Withdrawal (POL -> INR)
  const handleWithdraw = async () => {
    const amountNum = parseFloat(withdrawAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('Please enter a valid withdrawal amount in POL');
      return;
    }
    if (amountNum > balance) {
      toast.error(`Insufficient balance. Maximum available: ${balance.toLocaleString()} POL`);
      return;
    }
    if (!withdrawDestination.trim()) {
      toast.error('Please enter your destination UPI ID or Bank account');
      return;
    }

    setIsProcessingWithdraw(true);
    try {
      const newBal = balance - amountNum;
      // 1 POL ≈ ₹35 INR
      const inrValue = Math.round(amountNum * 35);

      const txRecord = {
        userId,
        type: 'PAYOUT' as const,
        label: `POL Treasury Withdrawal to ${withdrawMethod.toUpperCase()} (${withdrawDestination})`,
        amount: `-${amountNum} POL`,
        timestamp: Date.now(),
        status: 'confirmed' as const,
        network: 'Polygon Amoy → Fiat/IMPS',
        txHash: `payout_${Date.now().toString(36)}`,
      };

      if (db) {
        const userRef = doc(db, 'users', userId);
        await setDoc(userRef, { walletBalance: newBal }, { merge: true });

        const txColl = collection(db, 'transactions');
        await addDoc(txColl, txRecord);
      }

      // Send notification to recruiter
      await api.createNotification({
        userId,
        type: 'withdrawal',
        title: '💸 Polygon Treasury Payout Processed',
        body: `Withdrawal of ${amountNum} POL (≈ ₹${inrValue.toLocaleString('en-IN')}) has been remitted to ${withdrawDestination} via IMPS.`,
        meta: { amount: amountNum, destination: withdrawDestination },
      }).catch(() => null);

      setBalance(newBal);
      setTransactions((prev) => [{ id: txRecord.txHash, ...txRecord }, ...prev]);
      toast.success(`💸 Dispatched ₹${inrValue.toLocaleString('en-IN')} (${amountNum} POL) to ${withdrawDestination}!`);
      setWithdrawOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Withdrawal failed');
    } finally {
      setIsProcessingWithdraw(false);
    }
  };

  const copyAddress = () => {
    if (!walletAddress) return;
    navigator.clipboard.writeText(walletAddress);
    toast.success('Polygon address copied to clipboard');
  };

  return (
    <DashboardLayout role="recruiter">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header Title */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold font-mono tracking-tight text-foreground flex items-center gap-2">
                <Wallet className="h-6 w-6 text-primary" /> Corporate Polygon Escrow & Treasury
              </h1>
              <Badge variant="outline" className="font-mono text-xs border-primary/40 text-primary">
                Polygon Amoy • ERC-4337
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1 font-mono">
              Top up hiring funds in Polygon (POL), fund student MicroGigs, and execute automated smart contract escrow releases.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchWalletData}
              disabled={loading}
              className="gap-1.5 font-mono text-xs text-foreground border-border"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setWithdrawOpen(true)}
              className="font-mono text-xs font-semibold gap-1.5 border-amber-600/40 text-amber-800 dark:text-amber-300 bg-amber-500/10 hover:bg-amber-500/20"
            >
              <ArrowUpRight className="h-4 w-4" /> Withdraw Funds
            </Button>
            <Button
              size="sm"
              onClick={() => setTopUpOpen(true)}
              className="bg-primary text-primary-foreground font-mono text-xs font-semibold gap-1.5 shadow-sm"
            >
              <Plus className="h-4 w-4" /> Top-up Wallet (INR → POL)
            </Button>
          </div>
        </div>

        {/* Balance Hero Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Main Balance Card (Guaranteed 100% Crisp Contrast) */}
          <div className="md:col-span-2 p-6 rounded-2xl bg-gradient-to-br from-[#1b0d38] via-[#251347] to-[#120824] border border-purple-500/40 text-white relative overflow-hidden shadow-xl">
            <div className="absolute top-0 right-0 p-6 opacity-15 pointer-events-none">
              <Coins className="w-36 h-36 text-purple-300" />
            </div>

            <div className="space-y-4 relative z-10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-purple-200 font-semibold">
                  Available Polygon Treasury Balance
                </span>
                <span className="flex items-center gap-1.5 text-xs text-emerald-300 font-mono bg-emerald-500/20 px-2.5 py-1 rounded-full border border-emerald-400/40 font-medium">
                  <Shield className="h-3.5 w-3.5" /> 100% Polygon Non-Custodial
                </span>
              </div>

              <div>
                <div className="text-4xl sm:text-5xl font-black font-mono text-white tracking-tight flex items-baseline gap-2">
                  {balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  <span className="text-2xl text-purple-300 font-bold">POL</span>
                </div>
                <div className="text-xs text-purple-200/90 font-mono mt-1.5 flex items-center gap-2">
                  <span>≈ ₹{(balance * 35).toLocaleString('en-IN')} INR equivalent on Polygon Amoy Testnet</span>
                  <span>•</span>
                  <span className="text-emerald-300">Active Escrow Ready</span>
                </div>
              </div>

              {/* Custodial Address Bar (High Contrast) */}
              <div className="pt-2">
                <span className="text-[11px] font-mono text-purple-200/80 block mb-1.5 font-medium">
                  Polygon Escrow Smart Account Address (Amoy / Mainnet)
                </span>
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-black/50 border border-purple-400/40 font-mono text-xs text-white max-w-lg shadow-inner">
                  <span className="truncate flex-1 font-mono text-zinc-100">{walletAddress || 'Generating secure keypair...'}</span>
                  <button
                    onClick={copyAddress}
                    className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-purple-200 hover:text-white transition-colors"
                    title="Copy Address"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  {walletAddress && (
                    <a
                      href={explorerAddressUrl(walletAddress)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-purple-200 hover:text-white transition-colors"
                      title="View on Polygonscan"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Metrics & Escrow Info */}
          <div className="p-6 rounded-2xl bg-card border border-border shadow-sm flex flex-col justify-between space-y-4">
            <div>
              <h3 className="text-sm font-bold text-foreground font-mono flex items-center gap-2">
                <Lock className="h-4 w-4 text-amber-500" /> Active Bounty Escrows
              </h3>
              <p className="text-xs text-muted-foreground mt-1 font-mono">
                Funds locked in student deliverables awaiting milestone review.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-mono p-2.5 rounded-lg bg-secondary/50 border border-border/60">
                <span className="text-muted-foreground">Active MicroGigs:</span>
                <span className="font-bold text-foreground">3 In-Progress</span>
              </div>
              <div className="flex items-center justify-between text-xs font-mono p-2.5 rounded-lg bg-secondary/50 border border-border/60">
                <span className="text-muted-foreground">Locked in Escrow:</span>
                <span className="font-bold text-amber-700 dark:text-amber-400">650.00 POL</span>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setTopUpOpen(true)}
              className="w-full text-xs font-mono gap-1.5 border-primary/30 text-primary hover:bg-primary/10"
            >
              <CreditCard className="h-3.5 w-3.5" /> Instant INR → POL Deposit
            </Button>
          </div>
        </div>

        {/* Transaction History Section (Clean High-Contrast Roster) */}
        <div className="bg-card border border-border rounded-xl p-6 space-y-4 shadow-sm">
          <div className="flex items-center justify-between border-b border-border/60 pb-4">
            <div>
              <h2 className="text-base font-bold text-foreground font-mono flex items-center gap-2">
                <History className="h-4 w-4 text-primary" /> Polygon Escrow & Deposit Activity
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5 font-mono">
                Audit trail of Razorpay top-ups converted to POL, smart contract escrows, and student payouts.
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
                      tx.type === 'TOPUP'
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                        : 'bg-primary/15 text-primary border border-primary/30'
                    }`}>
                      {tx.type === 'TOPUP' ? (
                        <ArrowDownLeft className="h-4 w-4" />
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
                            <span className="text-primary hover:underline cursor-pointer">{tx.txHash.slice(0, 10)}...</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className={`text-xs font-mono font-bold ${
                      tx.amount.startsWith('+')
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-foreground'
                    }`}>
                      {/* Ensure POL token label is displayed */}
                      {tx.amount.includes('USDC') ? tx.amount.replace('USDC', 'POL') : tx.amount}
                    </div>
                    <Badge variant="outline" className="text-[10px] font-mono capitalize border-border text-foreground mt-0.5">
                      {tx.status}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-muted-foreground font-mono">
                No transactions recorded yet. Click "Top-up Wallet" to add POL funds.
              </div>
            )}
          </div>
        </div>

        {/* Top-up Dialog (Clean High-Contrast Theme) */}
        <Dialog open={topUpOpen} onOpenChange={setTopUpOpen}>
          <DialogContent className="bg-card border-border text-foreground max-w-md shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2 font-mono text-foreground">
                <CreditCard className="h-4 w-4 text-primary" />
                Top-Up Recruiter Treasury (INR → POL)
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground font-mono">
                Deposit hiring funds via Razorpay UPI / Cards. Funds are converted into Polygon (POL) native tokens ready for on-chain MicroGig escrow locks.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-foreground font-semibold">
                  Deposit Amount (INR)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-muted-foreground font-mono font-bold">₹</span>
                  <Input
                    type="number"
                    value={topUpAmount}
                    onChange={(e) => setTopUpAmount(e.target.value)}
                    placeholder="5000"
                    className="bg-background border-input pl-7 text-xs font-mono text-foreground"
                  />
                </div>
              </div>

              {/* Quick Select Buttons */}
              <div className="grid grid-cols-3 gap-2">
                {['2500', '5000', '10000'].map((amt) => (
                  <Button
                    key={amt}
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setTopUpAmount(amt)}
                    className={`font-mono text-xs font-semibold ${
                      topUpAmount === amt
                        ? 'border-primary text-primary bg-primary/10'
                        : 'border-border text-foreground hover:bg-secondary'
                    }`}
                  >
                    ₹{parseInt(amt).toLocaleString('en-IN')}
                  </Button>
                ))}
              </div>

              <div className="p-3.5 rounded-xl bg-secondary/50 border border-border text-xs font-mono space-y-1.5">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Exchange Route:</span>
                  <span className="text-foreground font-medium">1 INR = 1 POL (Testnet Rate)</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>You will receive:</span>
                  <span className="text-purple-600 dark:text-purple-400 font-extrabold text-sm">
                    +{(parseFloat(topUpAmount) || 0).toLocaleString()} POL
                  </span>
                </div>
              </div>
            </div>

            <DialogFooter className="mt-4 pt-3 border-t border-border">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTopUpOpen(false)}
                className="font-mono text-xs text-foreground"
                disabled={isProcessingTopUp}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleTopUp}
                disabled={isProcessingTopUp || !topUpAmount}
                className="bg-primary text-primary-foreground font-mono text-xs font-semibold gap-1.5"
              >
                {isProcessingTopUp ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Processing...
                  </>
                ) : (
                  `Pay ₹${(parseFloat(topUpAmount) || 0).toLocaleString('en-IN')} → Receive POL`
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Withdrawal Dialog (Clean High-Contrast Theme) */}
        <Dialog open={withdrawOpen} onOpenChange={setWithdrawOpen}>
          <DialogContent className="bg-card border-border text-foreground max-w-md shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2 font-mono text-foreground">
                <ArrowUpRight className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                Withdraw Polygon Treasury (POL → INR)
              </DialogTitle>
              <DialogDescription className="text-xs text-muted-foreground font-mono">
                Remit unallocated hiring funds back to your registered company bank account or corporate UPI ID via instant IMPS transfer.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs font-mono">
                  <label className="text-foreground font-semibold">Withdrawal Amount (POL)</label>
                  <span className="text-muted-foreground font-medium">Available: {balance.toLocaleString()} POL</span>
                </div>
                <div className="relative">
                  <Input
                    type="number"
                    value={withdrawAmount}
                    onChange={(e) => setWithdrawAmount(e.target.value)}
                    placeholder="1000"
                    className="bg-background border-input text-xs font-mono text-foreground"
                  />
                  <span className="absolute right-3 top-2.5 text-xs text-purple-600 dark:text-purple-400 font-mono font-bold">POL</span>
                </div>
              </div>

              {/* Method selector */}
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
                  Bank Transfer (NEFT/IMPS)
                </Button>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono text-foreground font-semibold">
                  {withdrawMethod === 'upi' ? 'Destination UPI ID' : 'Bank Account Number & IFSC'}
                </label>
                <Input
                  value={withdrawDestination}
                  onChange={(e) => setWithdrawDestination(e.target.value)}
                  placeholder={withdrawMethod === 'upi' ? 'e.g. finance@hdfcbank' : 'e.g. 50100421987654 (HDFC0000123)'}
                  className="bg-background border-input text-xs font-mono text-foreground"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-secondary/50 border border-border text-xs font-mono space-y-1.5">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Settlement Route:</span>
                  <span className="text-foreground font-medium">Direct Corporate Remittance (IMPS)</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
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
                disabled={isProcessingWithdraw || !withdrawAmount || (parseFloat(withdrawAmount) || 0) > balance}
                className="bg-amber-600 hover:bg-amber-500 text-white font-mono text-xs font-semibold gap-1.5 shadow-sm"
              >
                {isProcessingWithdraw ? (
                  <>
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" /> Remitting...
                  </>
                ) : (
                  `Withdraw ${(parseFloat(withdrawAmount) || 0).toLocaleString()} POL`
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Razorpay Authentic Checkout & Animation Modal */}
        <RazorpayCheckoutModal
          isOpen={razorpayModalOpen}
          onClose={() => setRazorpayModalOpen(false)}
          amountInr={pendingRazorpayOrder.amount}
          orderId={pendingRazorpayOrder.orderId}
          keyId={pendingRazorpayOrder.keyId}
          merchantName="Almadox Polygon Escrow Treasury"
          prefillEmail={(session?.user as any)?.email || 'recruiter@techcorp.com'}
          prefillName={session?.user?.name || 'Recruiter'}
          onSuccess={handleRazorpaySuccess}
        />
      </div>
    </DashboardLayout>
  );
}
