import React, { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  QrCode, CreditCard, Building2, ShieldCheck, CheckCircle2,
  Lock, RefreshCw, Smartphone, Zap, Clock
} from 'lucide-react';

interface RazorpayCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  amountInr: number;
  orderId?: string;
  keyId?: string;
  merchantName?: string;
  prefillEmail?: string;
  prefillName?: string;
  onSuccess: (paymentData: {
    razorpay_payment_id: string;
    razorpay_order_id?: string;
    razorpay_signature?: string;
    amount: number;
  }) => void;
}

// Play pleasant web-audio confirmation chime on payment success
function playSuccessChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(523.25, ctx.currentTime); // C5
    osc.frequency.setValueAtTime(659.25, ctx.currentTime + 0.12); // E5
    osc.frequency.setValueAtTime(783.99, ctx.currentTime + 0.24); // G5
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.8);
  } catch (e) {
    // Audio context may be restricted by autoplay policy
  }
}

export default function RazorpayCheckoutModal({
  isOpen,
  onClose,
  amountInr,
  orderId,
  merchantName = 'Almadox Escrow & Treasury',
  prefillEmail = 'recruiter@techcorp.com',
  prefillName = 'Vikram Mehta',
  onSuccess,
}: RazorpayCheckoutModalProps) {
  const [activeTab, setActiveTab] = useState<'upi' | 'card' | 'netbanking'>('upi');
  const [status, setStatus] = useState<'idle' | 'authorizing' | 'success'>('idle');

  // Form states
  const [upiVpa, setUpiVpa] = useState(prefillEmail.split('@')[0] + '@okhdfcbank');
  const [cardNumber, setCardNumber] = useState('4532 •••• •••• 8821');
  const [cardExpiry, setCardExpiry] = useState('12/28');
  const [cardCvv, setCardCvv] = useState('892');
  const [cardHolder, setCardHolder] = useState(prefillName);
  const [selectedBank, setSelectedBank] = useState('HDFC Bank');

  // Countdown timer for QR code (12:00 -> 00:00)
  const [timeLeft, setTimeLeft] = useState(720);
  const [orderHash, setOrderHash] = useState('');
  const [paymentId, setPaymentId] = useState('');

  // Reset states when opened
  useEffect(() => {
    if (isOpen) {
      setStatus('idle');
      setTimeLeft(720);
      const generatedOrder = orderId || `order_${Math.random().toString(36).substring(2, 11).toUpperCase()}`;
      setOrderHash(generatedOrder);
      setPaymentId(`pay_${Math.random().toString(36).substring(2, 12)}`);
    }
  }, [isOpen, orderId]);

  // Countdown clock tick
  useEffect(() => {
    if (!isOpen || status !== 'idle') return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, status]);

  const formatTimer = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Simulate Razorpay payment processing & bank authorization
  const triggerPaymentSimulation = () => {
    setStatus('authorizing');

    setTimeout(() => {
      setStatus('success');
      playSuccessChime();

      setTimeout(() => {
        onSuccess({
          razorpay_payment_id: paymentId,
          razorpay_order_id: orderHash,
          razorpay_signature: `sig_mock_${Math.random().toString(36).substring(2, 14)}`,
          amount: amountInr,
        });
        onClose();
      }, 2000);
    }, 2200);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && status !== 'authorizing' && onClose()}>
      <DialogContent className="p-0 overflow-hidden bg-[#0A0D14] border border-[#1E2638] text-white max-w-[480px] rounded-2xl shadow-2xl">
        {/* Razorpay Brand Header */}
        <div className="bg-[#0c2340] px-6 py-4 border-b border-[#1E3A5F] relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              {/* Razorpay Icon Symbol */}
              <div className="w-8 h-8 rounded-lg bg-[#3395ff] flex items-center justify-center font-bold text-white shadow-md shadow-blue-500/20">
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-current">
                  <path d="M13.5 2L4 14h7v8l9.5-12h-7z" />
                </svg>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm tracking-tight text-white font-mono">Razorpay</span>
                  <Badge variant="outline" className="text-[10px] py-0 px-1.5 h-4 bg-blue-500/10 text-blue-300 border-blue-400/30">
                    TEST MODE
                  </Badge>
                </div>
                <p className="text-[11px] text-blue-200/70 font-mono truncate max-w-[220px]">
                  {merchantName}
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-blue-200/60 font-mono block">Amount to Pay</span>
              <span className="text-lg font-extrabold font-mono text-white tracking-tight">
                ₹{amountInr.toLocaleString('en-IN')}.00
              </span>
            </div>
          </div>

          <div className="mt-2.5 flex items-center justify-between text-[11px] text-blue-200/60 border-t border-blue-900/40 pt-2 font-mono">
            <span className="truncate">Ref: {orderHash}</span>
            <span className="flex items-center gap-1 text-emerald-400 font-medium">
              <ShieldCheck className="w-3.5 h-3.5" /> 256-bit Encrypted
            </span>
          </div>
        </div>

        {/* Dynamic Content Views */}
        {status === 'authorizing' && (
          <div className="py-14 px-8 text-center space-y-6">
            {/* Spinning Razorpay Dual-Ring Loader */}
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-blue-500/20 animate-ping" />
              <div className="w-16 h-16 rounded-full border-4 border-t-[#3395ff] border-r-[#3395ff] border-b-transparent border-l-transparent animate-spin" />
              <div className="absolute w-8 h-8 rounded-lg bg-[#3395ff]/20 flex items-center justify-center text-[#3395ff]">
                <Lock className="w-4 h-4" />
              </div>
            </div>

            <div className="space-y-2">
              <h3 className="text-base font-bold font-mono text-white">
                Contacting Issuing Bank...
              </h3>
              <p className="text-xs text-muted-foreground font-mono max-w-xs mx-auto">
                Authorizing ₹{amountInr.toLocaleString('en-IN')} with NPCI / Banking Gateway. Do not close or refresh.
              </p>
            </div>

            {/* Simulated progress bars */}
            <div className="w-full bg-[#161C28] h-1.5 rounded-full overflow-hidden max-w-xs mx-auto">
              <div className="h-full bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-400 animate-pulse rounded-full w-4/5 transition-all duration-700" />
            </div>

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>Verified Razorpay Sandbox API</span>
            </div>
          </div>
        )}

        {status === 'success' && (
          <div className="py-12 px-8 text-center space-y-5 animate-in zoom-in-95 duration-300">
            {/* Success Green Expanding Checkmark */}
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
              <div className="w-16 h-16 rounded-full bg-emerald-500 flex items-center justify-center shadow-lg shadow-emerald-500/30">
                <CheckCircle2 className="w-9 h-9 text-black stroke-[2.5]" />
              </div>
            </div>

            <div className="space-y-1.5">
              <h3 className="text-xl font-extrabold font-mono text-white">
                Payment Successful!
              </h3>
              <p className="text-xs text-emerald-400 font-mono font-medium">
                ₹{amountInr.toLocaleString('en-IN')}.00 Paid to Almadox Treasury
              </p>
              <div className="text-[11px] text-muted-foreground font-mono pt-1">
                Payment ID: <span className="text-blue-400 font-semibold">{paymentId}</span>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-[#0F1420] border border-emerald-500/30 text-xs font-mono text-muted-foreground flex items-center justify-center gap-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
              Crediting corporate wallet & finalizing audit log...
            </div>
          </div>
        )}

        {status === 'idle' && (
          <div className="p-6 space-y-5">
            {/* Navigation Tabs */}
            <div className="grid grid-cols-3 gap-2 bg-[#121624] p-1 rounded-xl border border-[#1E2638]">
              <button
                type="button"
                onClick={() => setActiveTab('upi')}
                className={`py-2 text-xs font-mono rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'upi'
                    ? 'bg-[#1E293B] text-white font-bold shadow-sm border border-blue-500/40 text-blue-400'
                    : 'text-muted-foreground hover:text-white'
                }`}
              >
                <QrCode className="w-3.5 h-3.5" /> UPI & QR
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('card')}
                className={`py-2 text-xs font-mono rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'card'
                    ? 'bg-[#1E293B] text-white font-bold shadow-sm border border-blue-500/40 text-blue-400'
                    : 'text-muted-foreground hover:text-white'
                }`}
              >
                <CreditCard className="w-3.5 h-3.5" /> Cards
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('netbanking')}
                className={`py-2 text-xs font-mono rounded-lg transition-all flex items-center justify-center gap-1.5 ${
                  activeTab === 'netbanking'
                    ? 'bg-[#1E293B] text-white font-bold shadow-sm border border-blue-500/40 text-blue-400'
                    : 'text-muted-foreground hover:text-white'
                }`}
              >
                <Building2 className="w-3.5 h-3.5" /> Netbanking
              </button>
            </div>

            {/* TAB 1: UPI & DYNAMIC QR CODE */}
            {activeTab === 'upi' && (
              <div className="space-y-4">
                <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-[#0E1320] border border-[#1A2234] relative">
                  {/* Dynamic QR Code Animation */}
                  <div className="relative p-3 bg-white rounded-xl shadow-lg">
                    {/* SVG Stylized QR matrix */}
                    <svg
                      viewBox="0 0 100 100"
                      className="w-36 h-36"
                      shapeRendering="crispEdges"
                    >
                      {/* Outer corner squares */}
                      <rect x="5" y="5" width="30" height="30" fill="#0c2340" rx="3" />
                      <rect x="10" y="10" width="20" height="20" fill="white" />
                      <rect x="15" y="15" width="10" height="10" fill="#0c2340" />

                      <rect x="65" y="5" width="30" height="30" fill="#0c2340" rx="3" />
                      <rect x="70" y="10" width="20" height="20" fill="white" />
                      <rect x="75" y="15" width="10" height="10" fill="#0c2340" />

                      <rect x="5" y="65" width="30" height="30" fill="#0c2340" rx="3" />
                      <rect x="10" y="70" width="20" height="20" fill="white" />
                      <rect x="15" y="75" width="10" height="10" fill="#0c2340" />

                      {/* Data dots matrix */}
                      <rect x="42" y="12" width="6" height="6" fill="#0c2340" />
                      <rect x="50" y="8" width="6" height="6" fill="#0c2340" />
                      <rect x="44" y="24" width="8" height="8" fill="#0c2340" />
                      <rect x="15" y="44" width="6" height="8" fill="#0c2340" />
                      <rect x="25" y="48" width="8" height="6" fill="#0c2340" />
                      <rect x="40" y="40" width="20" height="20" fill="#3395ff" rx="4" />
                      {/* Lightning inside center */}
                      <polygon points="50,44 45,51 49,51 47,56 55,49 51,49" fill="white" />

                      <rect x="68" y="44" width="7" height="7" fill="#0c2340" />
                      <rect x="80" y="48" width="8" height="8" fill="#0c2340" />
                      <rect x="44" y="68" width="6" height="6" fill="#0c2340" />
                      <rect x="54" y="74" width="8" height="8" fill="#0c2340" />
                      <rect x="72" y="70" width="8" height="6" fill="#0c2340" />
                      <rect x="84" y="82" width="8" height="8" fill="#0c2340" />
                    </svg>

                    {/* Animated Scanning Laser Line */}
                    <div className="absolute inset-x-2 top-2 h-0.5 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_8px_#34d399] animate-[bounce_2.5s_infinite]" />
                  </div>

                  <div className="mt-3 flex items-center gap-2 text-xs font-mono text-muted-foreground">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Scan & Pay via any UPI App • Expires in {formatTimer(timeLeft)}</span>
                  </div>

                  {/* UPI Logos Strip */}
                  <div className="mt-3 flex items-center gap-2">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#1C2333] text-[#3395ff]">GPay</span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#1C2333] text-[#673ab7]">PhonePe</span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#1C2333] text-[#00baf2]">Paytm</span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#1C2333] text-emerald-400">CRED</span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#1C2333] text-amber-400">BHIM</span>
                  </div>
                </div>

                {/* UPI VPA input */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-mono text-muted-foreground flex items-center justify-between">
                    <span>Or enter UPI ID / VPA</span>
                    <span className="text-emerald-400">Instant Verification</span>
                  </label>
                  <div className="flex gap-2">
                    <Input
                      value={upiVpa}
                      onChange={(e) => setUpiVpa(e.target.value)}
                      placeholder="username@okhdfcbank"
                      className="bg-[#0E1320] border-[#1E2638] text-xs font-mono"
                    />
                    <Button
                      type="button"
                      onClick={triggerPaymentSimulation}
                      className="bg-[#3395ff] hover:bg-[#2b83ea] text-white font-mono text-xs font-semibold px-4"
                    >
                      Verify & Pay
                    </Button>
                  </div>
                </div>

                {/* Instant One-Tap Simulation Trigger */}
                <Button
                  type="button"
                  onClick={triggerPaymentSimulation}
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-mono text-xs font-bold py-2.5 shadow-lg shadow-emerald-900/30 gap-1.5"
                >
                  <Zap className="w-3.5 h-3.5 fill-current" />
                  Simulate UPI Approval (Demo Top-up)
                </Button>
              </div>
            )}

            {/* TAB 2: CARDS */}
            {activeTab === 'card' && (
              <div className="space-y-4">
                {/* Visual Card Preview */}
                <div className="p-4 rounded-xl bg-gradient-to-tr from-[#1E293B] via-[#0F172A] to-[#1E3A8A] border border-blue-500/30 shadow-md space-y-3">
                  <div className="flex justify-between items-center text-xs font-mono text-blue-200">
                    <span className="tracking-widest uppercase">Razorpay Secure Card</span>
                    <span className="font-bold text-amber-400">RuPay / VISA</span>
                  </div>
                  <div className="text-base font-mono tracking-widest text-white font-semibold py-1">
                    {cardNumber}
                  </div>
                  <div className="flex justify-between items-center text-[10px] font-mono text-blue-200/80">
                    <div>
                      <span className="block text-[8px] text-muted-foreground uppercase">Cardholder</span>
                      <span>{cardHolder.toUpperCase()}</span>
                    </div>
                    <div>
                      <span className="block text-[8px] text-muted-foreground uppercase">Expires</span>
                      <span>{cardExpiry}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <div className="space-y-1">
                    <label className="text-[11px] font-mono text-muted-foreground">Card Number</label>
                    <Input
                      value={cardNumber}
                      onChange={(e) => setCardNumber(e.target.value)}
                      placeholder="4532 0000 0000 0000"
                      className="bg-[#0E1320] border-[#1E2638] text-xs font-mono"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <label className="text-[11px] font-mono text-muted-foreground">Valid Thru</label>
                      <Input
                        value={cardExpiry}
                        onChange={(e) => setCardExpiry(e.target.value)}
                        placeholder="MM/YY"
                        className="bg-[#0E1320] border-[#1E2638] text-xs font-mono"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] font-mono text-muted-foreground">CVV</label>
                      <Input
                        value={cardCvv}
                        onChange={(e) => setCardCvv(e.target.value)}
                        placeholder="•••"
                        type="password"
                        maxLength={4}
                        className="bg-[#0E1320] border-[#1E2638] text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>

                <Button
                  type="button"
                  onClick={triggerPaymentSimulation}
                  className="w-full bg-[#3395ff] hover:bg-[#2b83ea] text-white font-mono text-xs font-bold py-2.5 shadow-md shadow-blue-500/20 gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5" />
                  Pay ₹{amountInr.toLocaleString('en-IN')} with Test Card
                </Button>
              </div>
            )}

            {/* TAB 3: NETBANKING */}
            {activeTab === 'netbanking' && (
              <div className="space-y-4">
                <p className="text-xs font-mono text-muted-foreground">
                  Select your bank to proceed with netbanking:
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {['HDFC Bank', 'State Bank of India', 'ICICI Bank', 'Axis Bank', 'Kotak Mahindra', 'Punjab National Bank'].map((b) => (
                    <button
                      key={b}
                      type="button"
                      onClick={() => setSelectedBank(b)}
                      className={`p-2.5 rounded-lg border text-xs font-mono text-left transition-all ${
                        selectedBank === b
                          ? 'border-blue-500 bg-blue-500/10 text-white font-bold'
                          : 'border-[#1E2638] bg-[#0E1320] text-muted-foreground hover:text-white'
                      }`}
                    >
                      <div className="truncate">{b}</div>
                    </button>
                  ))}
                </div>

                <Button
                  type="button"
                  onClick={triggerPaymentSimulation}
                  className="w-full bg-[#3395ff] hover:bg-[#2b83ea] text-white font-mono text-xs font-bold py-2.5 shadow-md shadow-blue-500/20 gap-1.5"
                >
                  <Building2 className="w-3.5 h-3.5" />
                  Pay ₹{amountInr.toLocaleString('en-IN')} via {selectedBank}
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Footer info strip */}
        <div className="bg-[#060910] px-6 py-2.5 border-t border-[#161C28] flex items-center justify-between text-[10px] font-mono text-muted-foreground">
          <span className="flex items-center gap-1 text-slate-400">
            <Lock className="w-3 h-3 text-emerald-400" /> PCI-DSS Level 1 Compliant
          </span>
          <span className="text-slate-500">Powering Almadox Treasury</span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
