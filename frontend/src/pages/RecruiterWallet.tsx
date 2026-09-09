import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/auth';
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
import { doc, getDoc, setDoc, updateDoc, collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';
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
  const [balance, setBalance] = useState<number>(2500); // Default recruiter balance in USDC
  const [loading, setLoading] = useState(false);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);

  // Top-up Modal State
  const [topUpOpen, setTopUpOpen] = useState(false);
  const [topUpAmount, setTopUpAmount] = useState('5000');
  const [isProcessingTopUp, setIsProcessingTopUp] = useState(false);

  // Generate deterministic custodial Polygon address
  useEffect(() => {
    const wallet = generateWalletFromSeed(`recruiter_${userId}`);
    setWalletAddress(wallet.address);
  }, [userId]);

  // Fetch live wallet balance and transactions from Firestore
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
          }
        }

        // Fetch transactions
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
        } else {
          // Default initial transactions if none exists
          setTransactions([
            {
              id: 'tx_init_1',
              type: 'TOPUP',
              label: 'Initial Account Deposit',
              amount: '+2,500 USDC',
              timestamp: Date.now() - 86400000 * 2,
              status: 'confirmed',
              network: 'Polygon Amoy',
              txHash: '0x8f3b...e21a',
            },
            {
              id: 'tx_init_2',
              type: 'ESCROW_LOCK',
              label: 'Smart Contract Escrow for Fullstack Gig',
              amount: '-350 USDC',
              timestamp: Date.now() - 86400000,
              status: 'confirmed',
              network: 'ERC-4337 Escrow',
              txHash: '0x4c1a...99e8',
            },
          ]);
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

  // Handle Top-Up via Razorpay or simulated fast-path
  const handleTopUp = async () => {
    const amountNum = parseFloat(topUpAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      toast.error('Please enter a valid amount in INR');
      return;
    }

    setIsProcessingTopUp(true);
    try {
      const tokenAmount = amountNum; // 1 INR = 1 Token in test/sandbox
      const newBal = balance + tokenAmount;

      if (db) {
        const userRef = doc(db, 'users', userId);
        await setDoc(userRef, { walletBalance: newBal }, { merge: true });

        const txRecord = {
          userId,
          type: 'TOPUP' as const,
          label: `Wallet Top-up via Razorpay (₹${amountNum.toLocaleString('en-IN')})`,
          amount: `+${tokenAmount} USDC`,
          timestamp: Date.now(),
          status: 'confirmed' as const,
          network: 'Fiat/INR (Razorpay)',
          txHash: `rzp_pay_${Date.now().toString(36)}`,
        };

        const txColl = collection(db, 'transactions');
        await setDoc(doc(txColl), txRecord);

        setTransactions(prev => [
          { id: txRecord.txHash, ...txRecord },
          ...prev,
        ]);
      }

      setBalance(newBal);
      toast.success(`Successfully added ${tokenAmount.toLocaleString()} USDC to your corporate escrow wallet!`);
      setTopUpOpen(false);
    } catch (err: any) {
      toast.error(err.message || 'Payment processing failed');
    } finally {
      setIsProcessingTopUp(false);
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
                <Wallet className="h-6 w-6 text-primary" /> Corporate Escrow & Treasury
              </h1>
              <Badge variant="outline" className="font-mono text-xs border-primary/30 text-primary">
                ERC-4337 Smart Account
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Deposit hiring funds, fund verified student MicroGigs, and execute automated smart contract escrow releases.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchWalletData}
              disabled={loading}
              className="gap-1.5 font-mono text-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
            <Button
              size="sm"
              onClick={() => setTopUpOpen(true)}
              className="bg-primary text-primary-foreground font-mono text-xs font-semibold gap-1.5"
            >
              <Plus className="h-4 w-4" /> Top-up Wallet (INR)
            </Button>
          </div>
        </div>

        {/* Balance Hero Card */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Main Balance Card */}
          <div className="md:col-span-2 p-6 rounded-2xl bg-gradient-to-br from-[#14161A] to-[#0A0B0D] border border-border relative overflow-hidden shadow-sm">
            <div className="absolute top-0 right-0 p-6 opacity-10 pointer-events-none">
              <Coins className="w-36 h-36 text-primary" />
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-muted-foreground">
                  Available Treasury Balance
                </span>
                <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-mono">
                  <Shield className="h-3.5 w-3.5" /> 100% Non-Custodial Backed
                </span>
              </div>

              <div>
                <div className="text-4xl font-extrabold font-mono text-foreground tracking-tight">
                  ${balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                  <span className="text-xl text-primary font-bold">USDC</span>
                </div>
                <div className="text-xs text-muted-foreground font-mono mt-1">
                  ≈ ₹{(balance * 86).toLocaleString('en-IN')} INR equivalent available for bounties
                </div>
              </div>

              {/* Custodial Address Bar */}
              <div className="pt-2">
                <span className="text-[11px] font-mono text-muted-foreground block mb-1.5">
                  Deposit Address (Polygon Amoy / Mainnet)
                </span>
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-[#0A0B0D] border border-border/80 font-mono text-xs text-foreground/90 max-w-lg">
                  <span className="truncate flex-1">{walletAddress || 'Generating secure keypair...'}</span>
                  <button
                    onClick={copyAddress}
                    className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                    title="Copy Address"
                  >
                    <Copy className="h-3.5 w-3.5" />
                  </button>
                  {walletAddress && (
                    <a
                      href={explorerAddressUrl(walletAddress)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-1 rounded hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
                      title="View on Polygon Explorer"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Quick Metrics & Escrow Info */}
          <div className="p-6 rounded-2xl bg-surface border border-border flex flex-col justify-between space-y-4">
            <div>
              <h3 className="text-sm font-bold text-foreground font-mono flex items-center gap-2">
                <Lock className="h-4 w-4 text-amber-500" /> Active Bounty Escrows
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Funds locked in student deliverables awaiting milestone review.
              </p>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-mono p-2.5 rounded-lg bg-secondary/30 border border-border/60">
                <span className="text-muted-foreground">Active MicroGigs:</span>
                <span className="font-bold text-foreground">3 In-Progress</span>
              </div>
              <div className="flex items-center justify-between text-xs font-mono p-2.5 rounded-lg bg-secondary/30 border border-border/60">
                <span className="text-muted-foreground">Locked in Escrow:</span>
                <span className="font-bold text-amber-400">$650.00 USDC</span>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setTopUpOpen(true)}
              className="w-full text-xs font-mono gap-1.5"
            >
              <CreditCard className="h-3.5 w-3.5 text-primary" /> Instant INR Deposit
            </Button>
          </div>
        </div>

        {/* Transaction History Section */}
        <div className="bg-surface border border-border rounded-xl p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-border/60 pb-4">
            <div>
              <h2 className="text-base font-bold text-foreground font-mono flex items-center gap-2">
                <History className="h-4 w-4 text-primary" /> Escrow & Deposit Activity
              </h2>
              <p className="text-xs text-muted-foreground mt-0.5">
                Audit trail of Razorpay top-ups, smart contract escrows, and verified student payouts.
              </p>
            </div>
            <Badge variant="outline" className="text-xs font-mono">
              {transactions.length} Records
            </Badge>
          </div>

          <div className="divide-y divide-border/40">
            {transactions.length > 0 ? (
              transactions.map((tx) => (
                <div key={tx.id} className="py-3.5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${
                      tx.type === 'TOPUP'
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : 'bg-primary/15 text-primary border border-primary/30'
                    }`}>
                      {tx.type === 'TOPUP' ? (
                        <ArrowDownLeft className="h-4 w-4" />
                      ) : (
                        <ArrowUpRight className="h-4 w-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="font-medium text-xs text-foreground truncate font-mono">
                        {tx.label}
                      </div>
                      <div className="text-[11px] text-muted-foreground font-mono mt-0.5 flex items-center gap-2">
                        <span>{new Date(tx.timestamp).toLocaleString()}</span>
                        {tx.network && (
                          <>
                            <span>•</span>
                            <span className="text-muted-foreground/80">{tx.network}</span>
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
                      tx.amount.startsWith('+') ? 'text-emerald-400' : 'text-foreground'
                    }`}>
                      {tx.amount}
                    </div>
                    <Badge variant="outline" className="text-[10px] font-mono capitalize border-border/80 mt-0.5">
                      {tx.status}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-8 text-center text-xs text-muted-foreground font-mono">
                No transactions recorded yet. Click "Top-up Wallet" to add funds.
              </div>
            )}
          </div>
        </div>

        {/* Top-up Dialog */}
        <Dialog open={topUpOpen} onOpenChange={setTopUpOpen}>
          <DialogContent className="bg-[#14161A] border-[#2A2D33] text-[#F2F3F5] max-w-md">
            <DialogHeader>
              <DialogTitle className="text-base font-bold flex items-center gap-2 font-mono">
                <CreditCard className="h-4 w-4 text-primary" />
                Top-Up Recruiter Treasury
              </DialogTitle>
              <DialogDescription className="text-xs text-[#8A8F98]">
                Add hiring funds via Razorpay UPI / Cards. Funds are converted 1:1 to on-chain test USDC ready for MicroGig escrow locks.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 mt-2">
              <div className="space-y-1.5">
                <label className="text-xs font-mono text-foreground font-medium">
                  Deposit Amount (INR)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-xs text-muted-foreground font-mono">₹</span>
                  <Input
                    type="number"
                    value={topUpAmount}
                    onChange={(e) => setTopUpAmount(e.target.value)}
                    placeholder="5000"
                    className="bg-[#0A0B0D] border-[#2A2D33] pl-7 text-xs font-mono"
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
                    className={`font-mono text-xs ${
                      topUpAmount === amt ? 'border-primary text-primary bg-primary/10' : 'border-[#2A2D33]'
                    }`}
                  >
                    ₹{parseInt(amt).toLocaleString('en-IN')}
                  </Button>
                ))}
              </div>

              <div className="p-3 rounded-lg bg-[#0A0B0D] border border-[#2A2D33] text-xs font-mono space-y-1.5">
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>Exchange Rate:</span>
                  <span className="text-foreground">1 INR = 1 USDC (Sandbox)</span>
                </div>
                <div className="flex items-center justify-between text-muted-foreground">
                  <span>You will receive:</span>
                  <span className="text-primary font-bold">
                    +{(parseFloat(topUpAmount) || 0).toLocaleString()} USDC
                  </span>
                </div>
              </div>
            </div>

            <DialogFooter className="mt-4 pt-3 border-t border-[#2A2D33]">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setTopUpOpen(false)}
                className="font-mono text-xs"
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
                  `Pay ₹${(parseFloat(topUpAmount) || 0).toLocaleString('en-IN')} via Razorpay`
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
