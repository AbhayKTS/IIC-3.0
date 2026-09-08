import React, { useState, useEffect } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/mockApi';
import type { WalletSBT } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
  Wallet,
  Shield,
  Award,
  ArrowUpRight,
  Copy,
  ExternalLink,
  Coins,
  CheckCircle2,
  Lock,
  Sparkles,
  RefreshCw,
  QrCode,
  DollarSign,
  TrendingUp,
} from 'lucide-react';

const SEED_SBTS: WalletSBT[] = [
  {
    id: 'sbt-1',
    studentId: 'student',
    title: 'International Innovation Challenge 3.0 Finalist',
    reason: 'Recognized for developing the AlmaDox AI Skill Graph and Web3 Verification Protocol at Manipal University Jaipur.',
    issuedBy: 'Manipal University Jaipur / IIC 3.0 Committee',
    date: '2026-09-08',
    txHash: '0x8f23a93d0521e1a499318b76251e6040854c15383562479e0bf03576085a81e3',
    tokenId: 1042,
    contractAddress: '0x3E62bE5E52B750e3B3bDb798EAf4E6A360D4A09e',
    network: 'Polygon PoS',
  },
  {
    id: 'sbt-2',
    studentId: 'student',
    title: 'Top Tier Open Source Contributor (GitHub Level 4)',
    reason: 'Verified 120+ commits across high-impact open source repositories and Web3 tooling.',
    issuedBy: 'AlmaDox Developer Guild',
    date: '2026-08-20',
    txHash: '0x3b18d249f07147b2c9384918e5927513b6392017a5829e502746182903746a18',
    tokenId: 874,
    contractAddress: '0x3E62bE5E52B750e3B3bDb798EAf4E6A360D4A09e',
    network: 'Polygon PoS',
  },
  {
    id: 'sbt-3',
    studentId: 'student',
    title: 'Verified Institutional Identity & Academic Status',
    reason: 'Completed Azure OCR student ID biometric and university registry cross-validation.',
    issuedBy: 'Dean of Academic Affairs',
    date: '2026-08-15',
    txHash: '0x9a4821c905321f85382057392018471958201748291047285910284759201847',
    tokenId: 450,
    contractAddress: '0x3E62bE5E52B750e3B3bDb798EAf4E6A360D4A09e',
    network: 'Polygon PoS',
  },
];

export default function StudentWallet() {
  const { session } = useAuth();
  const studentId = session?.userId || 'student';
  const userEmail = session?.user?.email || 'student@university.ac.in';

  // Deterministic mock custodial wallet based on user ID / email
  const walletAddress = `0x71C${Math.abs(
    studentId.split('').reduce((acc, c) => acc + c.charCodeAt(0), 1048576)
  )
    .toString(16)
    .toUpperCase()}4E89a17B2`;

  const [sbts, setSbts] = useState<WalletSBT[]>(SEED_SBTS);
  const [loading, setLoading] = useState(false);
  const [selectedSbt, setSelectedSbt] = useState<WalletSBT | null>(null);
  const [proofModalOpen, setProofModalOpen] = useState(false);
  const [offRampModalOpen, setOffRampModalOpen] = useState(false);
  const [offRampAmount, setOffRampAmount] = useState('150');
  const [upiId, setUpiId] = useState('student@okaxis');
  const [offRamping, setOffRamping] = useState(false);

  // Balances
  const usdcBalance = 300.0;
  const maticBalance = 4.85;
  const adoxTokens = 1250;

  useEffect(() => {
    loadSbtTokens();
  }, [studentId]);

  const loadSbtTokens = async () => {
    try {
      setLoading(true);
      const res = await api.sbtGetTokens(studentId).catch(() => null);
      if (res && Array.isArray(res) && res.length > 0) {
        setSbts(res);
      } else {
        const compatWallet = await api.getWallet(studentId).catch(() => null);
        if (compatWallet && Array.isArray(compatWallet) && compatWallet.length > 0) {
          setSbts(compatWallet);
        } else {
          setSbts(SEED_SBTS);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const copyAddress = () => {
    navigator.clipboard.writeText(walletAddress);
    toast.success('Custodial Polygon address copied to clipboard!');
  };

  const handleSimulateOffRamp = () => {
    const num = parseFloat(offRampAmount);
    if (isNaN(num) || num <= 0 || num > usdcBalance) {
      toast.error(`Please enter a valid amount up to $${usdcBalance} USDC`);
      return;
    }
    if (!upiId.includes('@')) {
      toast.error('Please enter a valid UPI ID (e.g. yourname@oksbi)');
      return;
    }

    setOffRamping(true);
    setTimeout(() => {
      setOffRamping(false);
      setOffRampModalOpen(false);
      toast.success(
        `Off-ramp simulated: ₹${(num * 86).toLocaleString()} INR will be disbursed to ${upiId} via instant bank settlement.`
      );
    }, 1500);
  };

  return (
    <DashboardLayout role="student">
      <div className="container-main py-6 space-y-6">
        {/* Top Wallet Header */}
        <div className="relative overflow-hidden rounded-2xl border border-violet-500/20 bg-gradient-to-r from-violet-500/10 via-purple-500/10 to-transparent p-6 md:p-8 backdrop-blur-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-semibold text-violet-400">
                <Shield className="h-3.5 w-3.5" />
                ERC-4337 Account Abstraction
              </div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                AlmaDox Web3 Custodial Wallet
              </h1>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Automatically provisioned on signup with Polygon smart contract account abstraction. Holds non-transferable Soulbound Tokens (SBTs) and earned micro-gig stablecoin payouts with automated INR off-ramping.
              </p>

              {/* Wallet Address Bar */}
              <div className="flex items-center gap-2 pt-2 flex-wrap">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-background/80 border border-border/80 text-xs font-mono text-foreground">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>{walletAddress}</span>
                </div>
                <Button size="sm" variant="outline" onClick={copyAddress} className="h-8 gap-1.5 text-xs">
                  <Copy className="h-3.5 w-3.5" /> Copy
                </Button>
                <a
                  href={`https://polygonscan.com/address/${walletAddress}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors px-2"
                >
                  Polygonscan <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </div>

            {/* Quick Balance Cards */}
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="p-4 rounded-xl bg-card border border-border/80 shadow-sm min-w-[180px] space-y-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Coins className="h-3.5 w-3.5 text-emerald-500" /> USDC Balance
                </span>
                <div className="text-2xl font-black text-foreground">
                  ${usdcBalance.toFixed(2)}
                </div>
                <div className="text-[11px] text-emerald-500 font-medium">
                  ≈ ₹{(usdcBalance * 86).toLocaleString()} INR
                </div>
                <Button
                  size="sm"
                  onClick={() => setOffRampModalOpen(true)}
                  className="w-full mt-2 h-7 text-xs gap-1 shadow-sm"
                >
                  Off-Ramp to INR <ArrowUpRight className="h-3 w-3" />
                </Button>
              </div>

              <div className="p-4 rounded-xl bg-card border border-border/80 shadow-sm min-w-[150px] space-y-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Coins className="h-3.5 w-3.5 text-violet-500" /> AlmaDox Tokens
                </span>
                <div className="text-2xl font-black text-violet-400">
                  {adoxTokens} ADOX
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Phase 2 Ecosystem Token
                </div>
                <Badge variant="outline" className="text-[10px] mt-2 font-mono border-violet-500/30 text-violet-400">
                  Points-Backed
                </Badge>
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Soulbound Tokens (SBTs) Gallery */}
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-foreground flex items-center gap-2">
                <Award className="h-5 w-5 text-amber-500" /> Minted Soulbound Tokens (SBTs)
              </h2>
              <p className="text-xs text-muted-foreground">
                Non-transferable on-chain ERC-5192 credentials verified by institutions and companies on Polygon.
              </p>
            </div>
            <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/30 gap-1.5 py-1 px-2.5">
              <Lock className="h-3 w-3" /> Non-Transferable & Fraud-Proof
            </Badge>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {sbts.map((sbt) => (
              <div
                key={sbt.id}
                className="glass-card rounded-2xl border border-border/80 overflow-hidden flex flex-col justify-between hover:border-primary/50 transition-all hover:shadow-lg group"
              >
                {/* Visual NFT Header */}
                <div className="h-28 bg-gradient-to-br from-violet-600/30 via-indigo-600/20 to-primary/30 p-4 flex flex-col justify-between relative">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded bg-background/70 backdrop-blur-md text-foreground">
                      Token #{sbt.tokenId || 1042}
                    </span>
                    <Badge variant="secondary" className="text-[10px] gap-1 bg-background/80">
                      <Shield className="h-2.5 w-2.5 text-primary" /> {sbt.network || 'Polygon PoS'}
                    </Badge>
                  </div>
                  <div className="text-xs font-semibold text-white/90 drop-shadow-sm truncate">
                    {sbt.issuedBy}
                  </div>
                </div>

                {/* Content */}
                <div className="p-5 space-y-3 flex-1 flex flex-col justify-between">
                  <div className="space-y-2">
                    <h3 className="font-bold text-base text-foreground group-hover:text-primary transition-colors leading-snug">
                      {sbt.title}
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {sbt.reason}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-border/40 space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                      <span>Minted Date:</span>
                      <span className="font-medium text-foreground">{sbt.date}</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
                      <span>Tx Hash:</span>
                      <span className="text-primary hover:underline cursor-pointer truncate max-w-[130px]">
                        {sbt.txHash.slice(0, 10)}...{sbt.txHash.slice(-6)}
                      </span>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full mt-2 gap-1.5 text-xs"
                      onClick={() => {
                        setSelectedSbt(sbt);
                        setProofModalOpen(true);
                      }}
                    >
                      <Sparkles className="h-3 w-3 text-primary" /> View Cryptographic Proof
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 3: Why Soulbound Tokens Matter (PPT Problem Fit & Innovation) */}
        <div className="glass-card p-6 rounded-2xl border border-border/80 bg-gradient-to-r from-card to-secondary/30 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
              <Lock className="h-4 w-4 text-primary" /> Zero Fraud Guarantee
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              74% of Indian HR teams rank fake degrees as their #1 hiring risk. Soulbound Tokens are permanently bound to your custodial wallet address and cannot be transferred, sold, or faked.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Instant Recruiter Verification
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Recruiters don't have to wait weeks for manual background verification calls. They inspect the cryptographic signature on Polygon directly in under 2 seconds.
            </p>
          </div>

          <div className="space-y-2">
            <div className="flex items-center gap-2 text-foreground font-semibold text-sm">
              <TrendingUp className="h-4 w-4 text-violet-400" /> Compounding Skill Graph
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Every verified hackathon win, top open-source contribution, and micro-gig deliverable mints proof-of-work into your live skill profile.
            </p>
          </div>
        </div>

        {/* PROOF MODAL */}
        <Dialog open={proofModalOpen} onOpenChange={setProofModalOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" /> Polygon SBT Cryptographic Proof
              </DialogTitle>
              <DialogDescription>
                On-chain verifiable credential metadata (ERC-5192 Non-Transferable Standard)
              </DialogDescription>
            </DialogHeader>

            {selectedSbt && (
              <div className="space-y-4 py-2 text-xs">
                <div className="p-3 rounded-lg bg-secondary/50 font-mono space-y-2 overflow-x-auto text-[11px]">
                  <div>
                    <span className="text-muted-foreground">Contract: </span>
                    <span className="text-foreground">{selectedSbt.contractAddress || '0x3E62bE5E52B750e3B3bDb798EAf4E6A360D4A09e'}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Token ID: </span>
                    <span className="text-foreground">#{selectedSbt.tokenId || 1042}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Owner Wallet: </span>
                    <span className="text-foreground">{walletAddress}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Tx Hash: </span>
                    <span className="text-primary">{selectedSbt.txHash}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Standard: </span>
                    <span className="text-emerald-500">ERC-5192 (Locked: true)</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <span className="font-semibold text-foreground">Issuing Authority:</span>
                  <p className="text-muted-foreground">{selectedSbt.issuedBy}</p>
                </div>

                <div className="space-y-1.5">
                  <span className="font-semibold text-foreground">Achievement Citation:</span>
                  <p className="text-muted-foreground">{selectedSbt.reason}</p>
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setProofModalOpen(false)}>
                Close
              </Button>
              <Button
                onClick={() => {
                  toast.success('Signature verified valid against AlmaDox Polygon registry key.');
                }}
                className="gap-1.5"
              >
                <CheckCircle2 className="h-3.5 w-3.5" /> Re-Verify Signature
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* OFF-RAMP MODAL */}
        <Dialog open={offRampModalOpen} onOpenChange={setOffRampModalOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Coins className="h-5 w-5 text-emerald-500" /> Off-Ramp Stablecoins to INR
              </DialogTitle>
              <DialogDescription>
                Convert your USDC micro-gig earnings into Indian Rupees directly to your UPI ID / bank account.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Amount in USDC (Max: ${usdcBalance})</label>
                <div className="relative">
                  <input
                    type="number"
                    max={usdcBalance}
                    min={10}
                    value={offRampAmount}
                    onChange={(e) => setOffRampAmount(e.target.value)}
                    className="w-full rounded-md border border-input bg-background p-2.5 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button
                    onClick={() => setOffRampAmount(usdcBalance.toString())}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-primary font-semibold hover:underline"
                  >
                    MAX
                  </button>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Estimated payout: <strong className="text-foreground">₹{(parseFloat(offRampAmount || '0') * 86).toLocaleString()} INR</strong> (Exchange Rate 1 USDC = ₹86.00)
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-foreground">Receiving UPI ID / VPA</label>
                <input
                  type="text"
                  placeholder="e.g. name@okhdfcbank"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  className="w-full rounded-md border border-input bg-background p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-[11px] text-emerald-600 dark:text-emerald-400">
                ⚡ Instant IMPS settlement powered by licensed on-ramp/off-ramp gateway. No gas fees deducted.
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setOffRampModalOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSimulateOffRamp} disabled={offRamping}>
                {offRamping ? 'Processing Transfer...' : 'Confirm INR Payout'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
