import { useEffect, useState, useRef } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import almadoxCoin from '@/assets/almadox-coin-warm.png';

// ── Animation timeline phases ───────────────────────────────────────────────
// idle → wordmarkIn → readyToDrop → drop → squeeze → bounce → settle → fadeWordmark → centerAndGrow → spin → exit → complete
type Phase =
  | 'idle'
  | 'wordmarkIn'
  | 'readyToDrop'
  | 'drop'
  | 'squeeze'
  | 'bounce'
  | 'settle'
  | 'fadeWordmark'
  | 'centerAndGrow'
  | 'spin'
  | 'exit';

interface PreloaderProps {
  onComplete: () => void;
}

export default function Preloader({ onComplete }: PreloaderProps) {
  const prefersReduced = useReducedMotion();
  const [phase, setPhase] = useState<Phase>('idle');
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;

  // Ref on the middle lowercase 'a'
  const middleARef = useRef<HTMLSpanElement>(null);

  // Measured offset relative to screen center (px)
  const [targetPos, setTargetPos] = useState({ x: 0, y: -12 });

  // Function to measure the exact screen position of the middle 'a'
  const measureTarget = () => {
    if (!middleARef.current) return;
    const rect = middleARef.current.getBoundingClientRect();
    const screenCX = window.innerWidth / 2;
    const screenCY = window.innerHeight / 2;

    // Center X of 'a' relative to screen center
    const aCenterX = rect.left + rect.width / 2;
    const relX = aCenterX - screenCX;

    // Coin rests on the top curve of 'a'
    // Coin base size is 48px, radius 24px
    // rect.top is the top of 'a'
    const coinLandingY = rect.top - 8;
    const relY = coinLandingY - screenCY;

    setTargetPos({ x: relX, y: relY });
  };

  // Re-measure on window resize and font load
  useEffect(() => {
    if (typeof document !== 'undefined' && 'fonts' in document) {
      document.fonts.ready.then(measureTarget);
    }
    window.addEventListener('resize', measureTarget);
    return () => window.removeEventListener('resize', measureTarget);
  }, []);

  // Sequential timeline orchestrator
  useEffect(() => {
    if (prefersReduced) {
      onCompleteRef.current();
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];
    const schedule = (ms: number, fn: () => void) => {
      timers.push(setTimeout(fn, ms));
    };

    // 1. Wordmark emerges upward from bottom
    schedule(40, () => setPhase('wordmarkIn'));

    // 2. Measure once wordmark has fully settled at y: 0
    schedule(620, () => {
      measureTarget();
      setPhase('readyToDrop');
    });

    // 3. Coin drops fast from above screen onto 'a'
    schedule(700, () => setPhase('drop'));

    // 4. Impact: 'a' squashes under the weight, coin presses down
    schedule(1060, () => setPhase('squeeze'));

    // 5. Rebound: 'a' perks back up, coin pops into the air
    schedule(1280, () => setPhase('bounce'));

    // 6. Settle: coin hovers/settles atop 'a'
    schedule(1520, () => setPhase('settle'));

    // 7. Wordmark fades away, leaving only coin
    schedule(1850, () => setPhase('fadeWordmark'));

    // 8. Coin glides to screen center and scales up (~5x)
    schedule(2020, () => setPhase('centerAndGrow'));

    // 9. 3D Spin in the center with radial glow
    schedule(2600, () => setPhase('spin'));

    // 10. Curtain exit: whole screen slides up
    schedule(3850, () => setPhase('exit'));

    // 11. Complete
    schedule(4750, () => onCompleteRef.current());

    return () => timers.forEach(clearTimeout);
  }, [prefersReduced]);

  // ── Derived animation states ───────────────────────────────────────────────
  const wordmarkVisible = !['fadeWordmark', 'centerAndGrow', 'spin', 'exit'].includes(phase);
  const coinActive = !['idle', 'wordmarkIn'].includes(phase);
  const isCentered = ['centerAndGrow', 'spin', 'exit'].includes(phase);
  const isSpinning = phase === 'spin' || phase === 'exit';
  const isExiting = phase === 'exit';

  // ── Coin coordinates & scale ───────────────────────────────────────────────
  // X: Aligned with 'a' when small, dead center (0) when centered
  const coinX = isCentered ? 0 : targetPos.x;

  // Y: Starts high above viewport, drops to 'a', compresses on squeeze, pops on bounce, settles, centers
  let coinY = 0;
  if (phase === 'readyToDrop') {
    coinY = -window.innerHeight / 2 - 120; // above viewport
  } else if (phase === 'drop') {
    coinY = targetPos.y; // landing position
  } else if (phase === 'squeeze') {
    coinY = targetPos.y + 12; // pressed down
  } else if (phase === 'bounce') {
    coinY = targetPos.y - 28; // popped up
  } else if (phase === 'settle' || phase === 'fadeWordmark') {
    coinY = targetPos.y; // resting
  } else if (isCentered) {
    coinY = 0; // screen center
  } else {
    coinY = -window.innerHeight / 2 - 120;
  }

  // Base coin size: 48px. Centered scale: 4.8 (~230px)
  const coinScale = isCentered ? 4.8 : 1;

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden pointer-events-auto select-none"
      style={{ background: 'var(--background)' }}
      animate={{ y: isExiting ? '-100vh' : '0%' }}
      transition={{ duration: 0.85, ease: [0.76, 0, 0.24, 1] }}
    >
      {/* Ambient background glow */}
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 50% at 50% 50%, color-mix(in oklab, var(--primary) 12%, transparent), transparent 75%)',
        }}
      />

      {/* Subtle fine dot grid */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.15]"
        style={{
          backgroundImage:
            'linear-gradient(color-mix(in oklab, var(--primary) 7%, transparent) 1px, transparent 1px),' +
            'linear-gradient(90deg, color-mix(in oklab, var(--primary) 7%, transparent) 1px, transparent 1px)',
          backgroundSize: '40px 40px',
        }}
      />

      {/* ── Coin ─────────────────────────────────────────────────────────────
          Wrapper is pinned at screen center (50%, 50%).
          perspective on wrapper creates real 3D depth for rotateY spin.
      ─────────────────────────────────────────────────────────────────────── */}
      <div
        className="pointer-events-none absolute"
        style={{
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 30,
          perspective: '1100px',
        }}
      >
        {/* Glow halo behind centered coin */}
        <motion.div
          className="absolute -inset-10 rounded-full blur-2xl pointer-events-none"
          animate={{
            opacity: isCentered ? 0.75 : 0,
            scale: isCentered ? [1, 1.15, 1] : 0.5,
          }}
          transition={{
            opacity: { duration: 0.5 },
            scale: { duration: 2.4, repeat: Infinity, ease: 'easeInOut' },
          }}
          style={{
            background:
              'radial-gradient(circle, color-mix(in oklab, var(--primary) 55%, transparent) 0%, color-mix(in oklab, var(--accent) 30%, transparent) 45%, transparent 70%)',
          }}
        />

        <motion.img
          src={almadoxCoin}
          alt="Almadox Coin"
          aria-hidden="true"
          animate={{
            x: coinX,
            y: coinY,
            opacity: coinActive ? 1 : 0,
            scale: coinScale,
            rotateY: isSpinning ? 360 : 0,
          }}
          transition={{
            // X positioning
            x: isCentered
              ? { type: 'spring', stiffness: 170, damping: 22 }
              : { type: 'spring', stiffness: 350, damping: 26 },

            // Y positioning with distinct phases
            y:
              phase === 'drop'
                ? { type: 'spring', stiffness: 420, damping: 22, mass: 1.1 }
                : phase === 'squeeze'
                ? { type: 'tween', duration: 0.18, ease: 'easeIn' }
                : phase === 'bounce'
                ? { type: 'spring', stiffness: 520, damping: 12 }
                : phase === 'settle'
                ? { type: 'spring', stiffness: 300, damping: 20 }
                : isCentered
                ? { type: 'spring', stiffness: 170, damping: 22 }
                : { duration: 0 },

            // Scale up smoothly to center
            scale: isCentered
              ? { type: 'spring', stiffness: 150, damping: 18 }
              : { duration: 0.15 },

            // Continuous 3D spin
            rotateY: isSpinning
              ? { duration: 0.85, repeat: Infinity, ease: 'linear' }
              : { duration: 0.2 },

            opacity: { duration: 0.12 },
          }}
          style={{
            width: '48px',
            height: '48px',
            objectFit: 'contain',
            transformStyle: 'preserve-3d',
            filter: isCentered
              ? 'drop-shadow(0 14px 28px rgba(234, 88, 12, 0.45)) drop-shadow(0 0 45px rgba(245, 158, 11, 0.35))'
              : 'drop-shadow(0 4px 10px rgba(0, 0, 0, 0.5)) drop-shadow(0 0 12px rgba(234, 88, 12, 0.4))',
            display: 'block',
          }}
        />
      </div>

      {/* ── Wordmark ─────────────────────────────────────────────────────────
          "Almadox" typography centered in screen.
          The middle 'a' squashes and perks back on coin impact.
      ─────────────────────────────────────────────────────────────────────── */}
      <motion.div
        animate={{
          opacity: wordmarkVisible ? 1 : 0,
          y: phase === 'idle' ? 70 : 0,
          scale: wordmarkVisible ? 1 : 0.92,
          filter: wordmarkVisible ? 'blur(0px)' : 'blur(8px)',
        }}
        transition={{
          opacity: { duration: 0.32, ease: 'easeInOut' },
          y: { type: 'spring', stiffness: 260, damping: 22 },
          scale: { duration: 0.32 },
          filter: { duration: 0.3 },
        }}
        style={{
          fontFamily: '"Fraunces", serif',
          fontSize: 'clamp(64px, 10vw, 118px)',
          fontWeight: 700,
          letterSpacing: '-0.04em',
          lineHeight: 1,
          userSelect: 'none',
          position: 'relative',
          zIndex: 10,
          display: 'flex',
          alignItems: 'baseline',
        }}
      >
        {/* Capital 'A' */}
        <span
          style={{
            display: 'inline-block',
            color: 'var(--primary)',
            filter: 'drop-shadow(0 0 20px color-mix(in oklab, var(--primary) 45%, transparent))',
          }}
        >
          A
        </span>

        {/* 'l' */}
        <span style={{ display: 'inline-block', color: 'var(--foreground)' }}>l</span>

        {/* 'm' — subtle reaction wobble on impact */}
        <motion.span
          animate={{
            x: phase === 'squeeze' ? -3 : 0,
            rotate: phase === 'squeeze' ? -1.5 : 0,
          }}
          transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          style={{ display: 'inline-block', color: 'var(--foreground)' }}
        >
          m
        </motion.span>

        {/* ── Middle 'a' ──
            Ref measured target. Squeezes down on impact, perks back up.
        */}
        <motion.span
          ref={middleARef}
          animate={{
            scaleY: phase === 'squeeze' ? 0.3 : phase === 'bounce' ? 1.15 : 1,
            scaleX: phase === 'squeeze' ? 1.35 : phase === 'bounce' ? 0.92 : 1,
            color: phase === 'squeeze' ? 'var(--primary)' : 'var(--foreground)',
          }}
          transition={{
            scaleY:
              phase === 'squeeze'
                ? { type: 'tween', duration: 0.16, ease: 'easeOut' }
                : { type: 'spring', stiffness: 550, damping: 12 },
            scaleX:
              phase === 'squeeze'
                ? { type: 'tween', duration: 0.16, ease: 'easeOut' }
                : { type: 'spring', stiffness: 550, damping: 12 },
            color: { duration: 0.15 },
          }}
          style={{
            display: 'inline-block',
            transformOrigin: 'bottom center',
            position: 'relative',
          }}
        >
          a
        </motion.span>

        {/* 'd' — subtle reaction wobble on impact */}
        <motion.span
          animate={{
            x: phase === 'squeeze' ? 3 : 0,
            rotate: phase === 'squeeze' ? 1.5 : 0,
          }}
          transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          style={{ display: 'inline-block', color: 'var(--foreground)' }}
        >
          d
        </motion.span>

        {/* 'o' */}
        <span style={{ display: 'inline-block', color: 'var(--foreground)' }}>o</span>

        {/* 'x' */}
        <span style={{ display: 'inline-block', color: 'var(--foreground)' }}>x</span>
      </motion.div>
    </motion.div>
  );
}
