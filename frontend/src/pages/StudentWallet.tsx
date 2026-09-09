import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/layout/DashboardLayout';
import { useAuth } from '@/lib/auth';
import { api } from '@/lib/mockApi';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Wallet, Shield, Award, Copy, ExternalLink, Coins, CheckCircle2,
  Lock, Sparkles, RefreshCw, TrendingUp, ArrowUpRight, Zap, AlertCircle, Key
} from 'lucide-react';
import {
  generateWalletFromSeed, fetchNativeBalance, simulateMintSBT,
  formatAddress, explorerTxUrl, explorerAddressUrl, AMOY_FAUCET, AMOY_EXPLORER,
  fetchSBTsForAddress, saveTxRecord, type OnChainSBT
} from '@/lib/web3';

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

  // Off-ramp modal
  const [offRampOpen, setOffRampOpen] = useState(false);
  const [offRampAmount, setOffRampAmount] = useState('50');
  const [upiId, setUpiId] = useState('student@okaxis');

  // Static balances (would be fetched from API in production)
  const polEarnings = 350.0;

  // Generate wallet from userId on mount
  useEffect(() => {
    const wallet = generateWalletFromSeed(userId);
    setWalletAddress(wallet.address);
    setWalletPrivateKey(wallet.privateKey);
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

  const handleOffRamp = async () => {
    const n = parseFloat(offRampAmount);
    if (isNaN(n) || n <= 0 || n > polEarnings) { toast.error(`Enter a valid amount up to ${polEarnings} POL`); return; }
    if (!upiId.includes('@')) { toast.error('Enter a valid UPI ID'); return; }

    const inrValue = Math.round(n * 35);

    // Save transaction
    saveTxRecord({
      hash: `wth_${Date.now().toString(36)}`,
      type: 'PAYOUT',
      label: `Student UPI Withdrawal to ${upiId}`,
      amount: `-${n} POL`,
      timestamp: Date.now(),
      status: 'confirmed',
      network: 'Polygon Amoy (IMPS Off-Ramp)',
    });

    // Send notification
    await api.createNotification({
      userId,
      type: 'withdrawal',
      title: '💸 Earnings Withdrawn via UPI',
      body: `Your withdrawal of ${n} POL (₹${inrValue.toLocaleString('en-IN')}) has been successfully remitted to ${upiId} via IMPS.`,
      meta: { amount: n, inrValue, upiId },
    }).catch(() => null);

    setOffRampOpen(false);
    toast.success(`💸 Withdrawal completed! ₹${inrValue.toLocaleString('en-IN')} INR (${n} POL) sent to ${upiId} via IMPS`);
  };

  return (
    <DashboardLayout role="student">
      <div className="max-w-5xl mx-auto space-y-8 py-2">

        {/* ── Wallet Header ─────────────────────────────────────── */}
        <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/8 via-accent/5 to-transparent p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
            <div className="space-y-3 flex-1 min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                <Shield className="h-3.5 w-3.5" /> Polygon Amoy Testnet · ERC-4337 Custodial
              </div>
              <h1 className="text-2xl md:text-3xl font-bold text-foreground" style={{ fontFamily: '"Fraunces", serif' }}>
                Almadox Identity Wallet
              </h1>
              <p className="text-muted-foreground text-sm leading-relaxed max-w-lg">
                Auto-provisioned on signup. Holds non-transferable Soulbound Tokens (SBTs) and receives MicroGig payouts in POL tokens. Withdrawable to INR via UPI.
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

              {/* POL Earnings */}
              <div className="p-4 rounded-xl bg-card border border-border/80 shadow-sm min-w-[160px] space-y-1">
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <Coins className="h-3.5 w-3.5 text-purple-500" /> POL Earnings
                </span>
                <div className="text-2xl font-black text-foreground">{polEarnings.toFixed(2)} POL</div>
                <div className="text-[11px] text-purple-700 dark:text-purple-300 font-medium">≈ ₹{(polEarnings * 35).toLocaleString('en-IN')} INR</div>
                <Button size="sm" onClick={() => setOffRampOpen(true)} className="w-full mt-2 h-7 text-xs gap-1">
                  Off-Ramp to INR <ArrowUpRight className="h-3 w-3" />
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
              <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/30 gap-1.5 py-1 px-2.5 text-xs">
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

        {/* ── Off-Ramp Modal ───────────────────────────────────── */}
        <Dialog open={offRampOpen} onOpenChange={setOffRampOpen}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2"><Coins className="h-5 w-5 text-purple-500" /> Off-Ramp POL to INR</DialogTitle>
              <DialogDescription>Convert your MicroGig POL earnings directly to Indian Rupees via UPI.</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Amount in POL (Max: {polEarnings} POL)</label>
                <div className="relative">
                  <input type="number" max={polEarnings} min={1} value={offRampAmount} onChange={e => setOffRampAmount(e.target.value)}
                    className="w-full rounded-md border border-input bg-background p-2.5 text-sm font-semibold focus:outline-none focus:ring-1 focus:ring-primary" />
                  <button onClick={() => setOffRampAmount(polEarnings.toString())} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[11px] text-primary font-semibold hover:underline">MAX</button>
                </div>
                <p className="text-[11px] text-muted-foreground">≈ <strong className="text-foreground">₹{(parseFloat(offRampAmount || '0') * 35).toLocaleString('en-IN')} INR</strong> (1 POL ≈ ₹35.00)</p>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">UPI ID / VPA</label>
                <input type="text" placeholder="name@okhdfcbank" value={upiId} onChange={e => setUpiId(e.target.value)}
                  className="w-full rounded-md border border-input bg-background p-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary" />
              </div>
              <div className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 p-3 text-[11px] text-emerald-700 dark:text-emerald-400">
                ⚡ Instant IMPS settlement via licensed Polygon off-ramp gateway. No gas fees deducted.
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOffRampOpen(false)}>Cancel</Button>
              <Button onClick={handleOffRamp}>Confirm INR Payout</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* EXPORT MODAL */}
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
