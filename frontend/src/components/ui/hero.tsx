import { useEffect, useRef, useState } from "react";
import { MeshGradient, PulsingBorder } from "@paper-design/shaders-react";
import { motion } from "framer-motion";

type ShaderShowcaseProps = {
  coinSrc: string;
  className?: string;
};

export default function ShaderShowcase({ coinSrc, className }: ShaderShowcaseProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    const handleMouseEnter = () => setIsActive(true);
    const handleMouseLeave = () => setIsActive(false);

    const container = containerRef.current;
    if (container) {
      container.addEventListener("mouseenter", handleMouseEnter);
      container.addEventListener("mouseleave", handleMouseLeave);
    }

    return () => {
      if (container) {
        container.removeEventListener("mouseenter", handleMouseEnter);
        container.removeEventListener("mouseleave", handleMouseLeave);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={
        className ||
        "relative w-[280px] h-[280px] sm:w-[360px] sm:h-[360px] lg:w-[420px] lg:h-[420px]"
      }
    >
      <svg className="absolute inset-0 w-0 h-0">
        <defs>
          <filter id="hero-glass" x="-50%" y="-50%" width="200%" height="200%">
            <feTurbulence baseFrequency="0.005" numOctaves="1" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="0.3" />
            <feColorMatrix
              type="matrix"
              values="1 0 0 0 0.02
                      0 1 0 0 0.02
                      0 0 1 0 0.05
                      0 0 0 0.9 0"
              result="tint"
            />
          </filter>
        </defs>
      </svg>

      <MeshGradient
        className="absolute inset-0 w-full h-full rounded-full"
        colors={["#000000", "#06b6d4", "#0891b2", "#164e63", "#f97316"]}
        speed={0.3}
        backgroundColor="#000000"
      />
      <MeshGradient
        className="absolute inset-0 w-full h-full opacity-60 rounded-full"
        colors={["#000000", "#ffffff", "#06b6d4", "#f97316"]}
        speed={0.2}
        wireframe
        backgroundColor="transparent"
      />

      <div
        className="absolute inset-6 rounded-full border border-white/10 bg-white/5 backdrop-blur-sm"
        style={{ filter: "url(#hero-glass)" }}
      />

      <motion.div
        className="absolute inset-0 flex items-center justify-center"
        animate={{ scale: isActive ? 1.04 : 1 }}
        transition={{ type: "spring", stiffness: 250, damping: 20 }}
      >
        <img
          src={coinSrc}
          alt="CVR Coin"
          className="w-2/3 h-2/3 object-contain drop-shadow-[0_0_30px_rgba(249,115,22,0.35)]"
        />
      </motion.div>

      <div className="absolute -bottom-3 -right-3">
        <PulsingBorder
          colors={["#06b6d4", "#0891b2", "#f97316", "#ffffff"]}
          colorBack="#00000000"
          speed={1.4}
          roundness={1}
          thickness={0.1}
          softness={0.2}
          intensity={4}
          spotsPerColor={4}
          spotSize={0.12}
          pulse={0.1}
          smoke={0.5}
          smokeSize={3}
          scale={0.75}
          rotation={0}
          frame={9161408.251009725}
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "50%",
          }}
        />
      </div>
    </div>
  );
}
