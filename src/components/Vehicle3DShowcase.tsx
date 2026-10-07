import React, { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  Zap, 
  Eye, 
  RotateCw, 
  Sliders, 
  Compass, 
  Activity, 
  ShieldCheck, 
  Flame, 
  Layers, 
  Cpu, 
  Gauge, 
  Radio, 
  Maximize2 
} from 'lucide-react';

export type Vehicle3DMode = 'diagonal' | 'orbit' | 'turbo' | 'scanner' | 'interactive';
export type NeonTheme = 'emerald' | 'cyan' | 'purple' | 'gold';

interface Vehicle3DShowcaseProps {
  initialMode?: Vehicle3DMode;
  showControls?: boolean;
}

const THEME_CONFIGS: Record<NeonTheme, {
  name: string;
  primary: string;
  glow: string;
  underglow: string;
  headlight: string;
  accent: string;
  tagBg: string;
  tagBorder: string;
}> = {
  emerald: {
    name: 'Esmeralda UNI',
    primary: '#10B981',
    glow: 'rgba(16, 185, 129, 0.65)',
    underglow: 'radial-gradient(ellipse at center, rgba(16, 185, 129, 0.75) 0%, rgba(6, 182, 212, 0.35) 45%, transparent 75%)',
    headlight: 'rgba(52, 211, 153, 0.85)',
    accent: '#059669',
    tagBg: 'bg-emerald-500/15',
    tagBorder: 'border-emerald-500/30'
  },
  cyan: {
    name: 'Ciano Cyber',
    primary: '#06B6D4',
    glow: 'rgba(6, 182, 212, 0.65)',
    underglow: 'radial-gradient(ellipse at center, rgba(6, 182, 212, 0.75) 0%, rgba(99, 102, 241, 0.35) 45%, transparent 75%)',
    headlight: 'rgba(56, 189, 248, 0.85)',
    accent: '#0891B2',
    tagBg: 'bg-cyan-500/15',
    tagBorder: 'border-cyan-500/30'
  },
  purple: {
    name: 'Ultra Violeta',
    primary: '#A855F7',
    glow: 'rgba(168, 85, 247, 0.65)',
    underglow: 'radial-gradient(ellipse at center, rgba(168, 85, 247, 0.75) 0%, rgba(236, 72, 153, 0.35) 45%, transparent 75%)',
    headlight: 'rgba(192, 132, 252, 0.85)',
    accent: '#7E22CE',
    tagBg: 'bg-purple-500/15',
    tagBorder: 'border-purple-500/30'
  },
  gold: {
    name: 'Ouro Executive',
    primary: '#F59E0B',
    glow: 'rgba(245, 158, 11, 0.65)',
    underglow: 'radial-gradient(ellipse at center, rgba(245, 158, 11, 0.75) 0%, rgba(239, 68, 68, 0.35) 45%, transparent 75%)',
    headlight: 'rgba(252, 211, 77, 0.85)',
    accent: '#D97706',
    tagBg: 'bg-amber-500/15',
    tagBorder: 'border-amber-500/30'
  }
};

export const Vehicle3DShowcase: React.FC<Vehicle3DShowcaseProps> = ({
  initialMode = 'diagonal',
  showControls = true
}) => {
  const [mode, setMode] = useState<Vehicle3DMode>(initialMode);
  const [theme, setTheme] = useState<NeonTheme>('emerald');
  const [headlightsOn, setHeadlightsOn] = useState(true);
  const [underglowOn, setUnderglowOn] = useState(true);
  const [isScanning, setIsScanning] = useState(false);
  const [turboBoost, setTurboBoost] = useState(false);
  const [telemetryInfo, setTelemetryInfo] = useState({
    speed: 84,
    rpm: 1420,
    temp: 88,
    fuelEff: 4.18
  });

  const containerRef = useRef<HTMLDivElement>(null);
  
  // Interactive mouse tracking with spring physics
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  const springConfig = { damping: 25, stiffness: 180 };
  const smoothX = useSpring(mouseX, springConfig);
  const smoothY = useSpring(mouseY, springConfig);

  const rotateXInteractive = useTransform(smoothY, [-0.5, 0.5], [28, 2]);
  const rotateYInteractive = useTransform(smoothX, [-0.5, 0.5], [-35, 15]);
  const rotateZInteractive = useTransform(smoothX, [-0.5, 0.5], [-6, 6]);

  const currentTheme = THEME_CONFIGS[theme];

  // Dynamic telemetry simulation
  useEffect(() => {
    const interval = setInterval(() => {
      setTelemetryInfo(prev => ({
        speed: mode === 'turbo' ? Math.floor(98 + Math.random() * 18) : Math.floor(78 + Math.random() * 10),
        rpm: mode === 'turbo' ? Math.floor(1800 + Math.random() * 300) : Math.floor(1380 + Math.random() * 90),
        temp: Math.floor(86 + Math.random() * 4),
        fuelEff: Number((4.12 + Math.random() * 0.15).toFixed(2))
      }));
    }, 1500);
    return () => clearInterval(interval);
  }, [mode]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current || mode !== 'interactive') return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(x);
    mouseY.set(y);
  };

  const handleMouseLeave = () => {
    if (mode === 'interactive') {
      mouseX.set(0);
      mouseY.set(0);
    }
  };

  const triggerTurboBurst = () => {
    setTurboBoost(true);
    setTimeout(() => setTurboBoost(false), 2400);
  };

  return (
    <div 
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className="relative w-full flex flex-col items-center select-none"
    >
      {/* 3D PERSPECTIVE STAGE CONTAINER */}
      <div 
        className="relative w-full max-w-[580px] h-[310px] md:h-[350px] flex items-center justify-center overflow-visible"
        style={{ perspective: 1400 }}
      >
        {/* Ambient Holographic Stage Floor Ring (iPhone Glass Pedestal) */}
        <div 
          className="absolute bottom-4 w-[85%] h-[120px] rounded-full pointer-events-none transition-all duration-700"
          style={{
            transform: 'rotateX(75deg) translateZ(-40px)',
            background: underglowOn ? currentTheme.underglow : 'transparent',
            boxShadow: underglowOn ? `0 0 60px ${currentTheme.glow}` : 'none',
            border: '1px solid rgba(255,255,255,0.08)'
          }}
        />

        {/* Concentric Holographic Cyber Radar Rings on Floor */}
        <div 
          className="absolute bottom-6 w-[70%] h-[90px] rounded-full border border-dashed pointer-events-none opacity-40 animate-[spin_20s_linear_infinite]"
          style={{
            borderColor: currentTheme.primary,
            transform: 'rotateX(75deg) translateZ(-35px)'
          }}
        />

        {/* Dynamic Speed Streaks for Turbo Mode */}
        <AnimatePresence>
          {(mode === 'turbo' || turboBoost) && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 pointer-events-none overflow-hidden z-0"
            >
              {[...Array(8)].map((_, i) => (
                <motion.div
                  key={`streak-${i}`}
                  className="absolute h-[2px] rounded-full"
                  style={{
                    top: `${15 + i * 11}%`,
                    left: '100%',
                    width: `${60 + (i % 3) * 40}px`,
                    background: `linear-gradient(90deg, transparent, ${currentTheme.primary}, #ffffff)`,
                    boxShadow: `0 0 10px ${currentTheme.primary}`
                  }}
                  animate={{
                    left: ['100%', '-30%']
                  }}
                  transition={{
                    repeat: Infinity,
                    duration: 0.6 + (i % 4) * 0.15,
                    ease: 'linear',
                    delay: i * 0.08
                  }}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Telemetry Floating Glass HUD Chips (Top-Left & Top-Right) */}
        <div className="absolute top-2 left-2 z-30 hidden sm:flex flex-col gap-1.5 pointer-events-none">
          <div className="px-2.5 py-1 rounded-xl bg-slate-950/70 border border-white/10 backdrop-blur-md shadow-lg flex items-center gap-2 text-[10px] font-mono text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full animate-ping" style={{ backgroundColor: currentTheme.primary }} />
            <span>VEL: <strong className="text-white">{telemetryInfo.speed} KM/H</strong></span>
          </div>
          <div className="px-2.5 py-1 rounded-xl bg-slate-950/70 border border-white/10 backdrop-blur-md shadow-lg flex items-center gap-2 text-[10px] font-mono text-slate-300">
            <Activity size={10} style={{ color: currentTheme.primary }} />
            <span>RPM: <strong className="text-white">{telemetryInfo.rpm}</strong></span>
          </div>
        </div>

        <div className="absolute top-2 right-2 z-30 hidden sm:flex flex-col gap-1.5 pointer-events-none text-right">
          <div className="px-2.5 py-1 rounded-xl bg-slate-950/70 border border-white/10 backdrop-blur-md shadow-lg flex items-center gap-2 text-[10px] font-mono text-slate-300 justify-end">
            <Gauge size={10} style={{ color: currentTheme.primary }} />
            <span>EFIC.: <strong className="text-emerald-400">{telemetryInfo.fuelEff} KM/L</strong></span>
          </div>
          <div className="px-2.5 py-1 rounded-xl bg-slate-950/70 border border-white/10 backdrop-blur-md shadow-lg flex items-center gap-2 text-[10px] font-mono text-slate-300 justify-end">
            <Radio size={10} className="text-cyan-400 animate-pulse" />
            <span>FROTA: <strong className="text-white">UNI 2026</strong></span>
          </div>
        </div>

        {/* 3D TRANSFORMED VEHICLE RIG */}
        <motion.div
          className="relative w-[340px] md:w-[420px] h-[190px] md:h-[220px] flex items-center justify-center"
          style={{
            transformStyle: 'preserve-3d',
            rotateX: mode === 'interactive' ? rotateXInteractive : undefined,
            rotateY: mode === 'interactive' ? rotateYInteractive : undefined,
            rotateZ: mode === 'interactive' ? rotateZInteractive : undefined
          }}
          animate={
            mode === 'diagonal'
              ? {
                  rotateX: [16, 20, 16],
                  rotateY: [-24, -20, -24],
                  rotateZ: [-3, -1, -3],
                  y: [-6, 6, -6],
                  scale: [1, 1.02, 1]
                }
              : mode === 'orbit'
              ? {
                  rotateX: [12, 18, 12],
                  rotateY: [-180, 180],
                  y: [-8, 8, -8],
                  scale: [0.96, 1.04, 0.96]
                }
              : mode === 'turbo' || turboBoost
              ? {
                  rotateX: [14, 18, 14],
                  rotateY: [-28, -25, -28],
                  rotateZ: [-4, -2, -4],
                  x: [-3, 4, -3],
                  y: [-4, 4, -4],
                  scale: [1.02, 1.05, 1.02]
                }
              : mode === 'scanner'
              ? {
                  rotateX: [18, 16, 18],
                  rotateY: [-22, -22, -22],
                  rotateZ: [-2, -2, -2],
                  y: [-2, 2, -2]
                }
              : {}
          }
          transition={
            mode === 'orbit'
              ? {
                  rotateY: { repeat: Infinity, duration: 12, ease: 'linear' },
                  rotateX: { repeat: Infinity, duration: 6, ease: 'easeInOut' },
                  y: { repeat: Infinity, duration: 4, ease: 'easeInOut' }
                }
              : mode === 'turbo' || turboBoost
              ? {
                  repeat: Infinity,
                  duration: 0.18,
                  ease: 'easeInOut'
                }
              : {
                  repeat: Infinity,
                  duration: 4.5,
                  ease: 'easeInOut'
                }
          }
        >
          {/* VEHICLE CHASSIS DROP SHADOW (Projected on 3D Ground) */}
          <div 
            className="absolute -bottom-8 w-[90%] h-[35px] bg-black/60 rounded-full blur-md pointer-events-none"
            style={{
              transform: 'rotateX(75deg) translateZ(-30px) scale(1.1)',
              background: `radial-gradient(ellipse at center, rgba(0,0,0,0.85) 0%, ${currentTheme.glow} 30%, transparent 70%)`
            }}
          />

          {/* HEADLIGHT PROJECTED BEAMS (Dynamic 3D Cone) */}
          {headlightsOn && (
            <div 
              className="absolute -right-28 top-1/2 -translate-y-1/2 w-64 h-36 pointer-events-none"
              style={{
                transform: 'rotateY(30deg) translateZ(20px)',
                background: `radial-gradient(ellipse at left, ${currentTheme.headlight} 0%, rgba(255,255,255,0.15) 35%, transparent 75%)`,
                clipPath: 'polygon(0% 40%, 100% 0%, 100% 100%, 0% 60%)',
                opacity: mode === 'turbo' || turboBoost ? 0.95 : 0.65
              }}
            />
          )}

          {/* HOLOGRAPHIC SCANNER LASER CURTAIN */}
          {(mode === 'scanner' || isScanning) && (
            <motion.div
              className="absolute inset-y-[-20%] w-[3px] pointer-events-none z-40"
              style={{
                background: `linear-gradient(180deg, transparent, ${currentTheme.primary}, #ffffff, ${currentTheme.primary}, transparent)`,
                boxShadow: `0 0 18px ${currentTheme.primary}, 0 0 35px #ffffff`
              }}
              animate={{
                left: ['-5%', '105%', '-5%']
              }}
              transition={{
                repeat: Infinity,
                duration: 2.4,
                ease: 'easeInOut'
              }}
            >
              <div 
                className="absolute top-0 bottom-0 -left-12 -right-12 opacity-30"
                style={{
                  background: `linear-gradient(90deg, transparent, ${currentTheme.primary} 45%, ${currentTheme.primary} 55%, transparent)`
                }}
              />
            </motion.div>
          )}

          {/* ULTRA-HD 3D ISOMETRIC / DIAGONAL COACH & CAR VEHICLE SVG */}
          <div className="w-full h-full relative cursor-pointer filter drop-shadow-[0_15px_30px_rgba(0,0,0,0.8)]">
            <svg 
              viewBox="0 0 460 240" 
              className="w-full h-full overflow-visible"
              xmlns="http://www.w3.org/2000/svg"
            >
              <defs>
                {/* Metallic Frosted Body Gradient (iPhone Style Anodized Titanium) */}
                <linearGradient id="bodyTitanium3D" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#1e293b" />
                  <stop offset="25%" stopColor="#0f172a" />
                  <stop offset="60%" stopColor="#1e293b" />
                  <stop offset="85%" stopColor="#334155" />
                  <stop offset="100%" stopColor="#0f172a" />
                </linearGradient>

                {/* Roof Specular Light Highlight */}
                <linearGradient id="roofSpecular3D" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.4" />
                  <stop offset="30%" stopColor="#ffffff" stopOpacity="0.85" />
                  <stop offset="70%" stopColor="#94a3b8" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#ffffff" stopOpacity="0.1" />
                </linearGradient>

                {/* Glass Cockpit & Panoramic Windows with Emerald/Cyan Tint */}
                <linearGradient id="cockpitGlass3D" x1="20%" y1="0%" x2="80%" y2="100%">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.45" />
                  <stop offset="40%" stopColor="#0f172a" stopOpacity="0.8" />
                  <stop offset="75%" stopColor="#10b981" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#0284c7" stopOpacity="0.6" />
                </linearGradient>

                {/* Neon Dynamic Light Trim Gradient */}
                <linearGradient id="neonTrimGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor={currentTheme.primary} stopOpacity="0.2" />
                  <stop offset="40%" stopColor={currentTheme.primary} stopOpacity="1" />
                  <stop offset="70%" stopColor="#ffffff" stopOpacity="0.9" />
                  <stop offset="100%" stopColor={currentTheme.primary} stopOpacity="1" />
                </linearGradient>

                {/* Cyber Wheel Rims */}
                <linearGradient id="rimGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#64748b" />
                  <stop offset="50%" stopColor="#0f172a" />
                  <stop offset="100%" stopColor="#94a3b8" />
                </linearGradient>

                {/* Underglow Filter */}
                <filter id="neonGlowEffect" x="-30%" y="-30%" width="160%" height="160%">
                  <feGaussianBlur stdDeviation="4" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* 3D PERSPECTIVE FACETS */}

              {/* 1. LOWER CHASSIS & AERODYNAMIC DIFFUSER */}
              <path 
                d="M 50,165 L 110,188 L 360,188 L 415,160 L 400,150 L 60,150 Z" 
                fill="#050811" 
                stroke="#1e293b" 
                strokeWidth="1.5"
              />

              {/* 2. NEON UNDERGLOW CHASSIS ACCENT LINE */}
              {underglowOn && (
                <path 
                  d="M 60,168 L 115,190 L 355,190 L 410,162" 
                  fill="none" 
                  stroke={currentTheme.primary} 
                  strokeWidth="3.5" 
                  strokeLinecap="round"
                  filter="url(#neonGlowEffect)"
                />
              )}

              {/* 3. MAIN 3D BODY - SIDE FLANK (Aerodynamic Curved Coach/Bus/Car Flank) */}
              <path 
                d="M 45,145 
                   L 55,100 
                   Q 80,68 135,58 
                   L 320,54 
                   Q 375,54 405,82 
                   L 425,125 
                   Q 430,145 415,160 
                   L 360,185 
                   L 115,185 
                   L 55,165 
                   Z" 
                fill="url(#bodyTitanium3D)" 
                stroke="#334155" 
                strokeWidth="1.5"
              />

              {/* 4. METALLIC SPECULAR TOP BEVEL (iPhone Diamond Cut Chamfer Edge) */}
              <path 
                d="M 55,100 Q 80,68 135,58 L 320,54 Q 375,54 405,82" 
                fill="none" 
                stroke="url(#roofSpecular3D)" 
                strokeWidth="2.5" 
                strokeLinecap="round"
              />

              {/* 5. PANORAMIC TINTED COCKPIT & WINDOWS (Multi-Pane VIP Glass) */}
              {/* Front Curved Windshield */}
              <path 
                d="M 330,62 L 392,86 L 412,122 L 345,116 Z" 
                fill="url(#cockpitGlass3D)" 
                stroke="#475569" 
                strokeWidth="1"
              />
              {/* Lateral Passenger Panoramic Windows with Cyber Dividers */}
              <path 
                d="M 135,66 L 320,62 L 335,115 L 130,118 Z" 
                fill="url(#cockpitGlass3D)" 
                stroke="#334155" 
                strokeWidth="1"
              />
              {/* Window Glass Glare Reflection Line */}
              <path 
                d="M 145,72 L 310,68 L 290,95 L 140,98 Z" 
                fill="white" 
                fillOpacity="0.08" 
              />
              {/* Glass Pillar Vertical Dividers */}
              <line x1="180" y1="65" x2="175" y2="117" stroke="#1e293b" strokeWidth="2.5" />
              <line x1="230" y1="64" x2="225" y2="116" stroke="#1e293b" strokeWidth="2.5" />
              <line x1="280" y1="63" x2="275" y2="115" stroke="#1e293b" strokeWidth="2.5" />

              {/* 6. CORPORATE EMBLEM & VIAÇÃO UNI STREAMLINE DECAL */}
              <g transform="translate(140, 130)">
                {/* Aero Streamline Ribbon */}
                <path 
                  d="M 0,8 Q 80,2 170,4 L 165,14 Q 80,12 0,16 Z" 
                  fill="url(#neonTrimGrad)" 
                  filter="url(#neonGlowEffect)"
                />
                {/* Wordmark Emblem Badge */}
                <rect x="35" y="-3" width="70" height="20" rx="6" fill="#090d16" stroke={currentTheme.primary} strokeWidth="1" />
                <text x="70" y="11" textAnchor="middle" fill="#ffffff" fontSize="10" fontWeight="900" fontFamily="sans-serif" letterSpacing="2">
                  UNI
                </text>
              </g>

              {/* 7. FRONT CYBER MATRIX LED HEADLIGHT CLUSTER */}
              <g transform="translate(390, 120)">
                {/* Main Crystal Prism Lens */}
                <polygon 
                  points="0,10 25,12 32,24 5,20" 
                  fill={headlightsOn ? '#ffffff' : '#475569'} 
                  stroke={currentTheme.primary} 
                  strokeWidth="1.5"
                  filter={headlightsOn ? "url(#neonGlowEffect)" : undefined}
                />
                {/* LED Projector Beads */}
                {headlightsOn && (
                  <>
                    <circle cx="8" cy="14" r="2.5" fill="#ffffff" />
                    <circle cx="16" cy="16" r="2.5" fill="#ffffff" />
                    <circle cx="24" cy="18" r="2.5" fill="#ffffff" />
                    {/* Laser DRL Strip */}
                    <path d="M -5,8 L 26,10" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />
                  </>
                )}
              </g>

              {/* 8. REAR VERTICAL VIP CYBER TAILLIGHT */}
              <g transform="translate(42, 115)">
                <path 
                  d="M 2,0 L 8,2 L 6,32 L 0,28 Z" 
                  fill="#ef4444" 
                  stroke="#dc2626" 
                  strokeWidth="1" 
                  filter="url(#neonGlowEffect)"
                />
                <line x1="4" y1="4" x2="2" y2="26" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" />
              </g>

              {/* 9. REAR WHEEL ARCH & 3D CYBER WHEEL (Angled Isometric Rim) */}
              <g transform="translate(100, 175)">
                {/* Wheel Arch Recess */}
                <path d="M -30,-5 Q 0,-32 30,-5 Z" fill="#020617" />
                {/* Tire Outer Rubber */}
                <ellipse cx="0" cy="0" rx="26" ry="18" fill="#0f172a" stroke="#334155" strokeWidth="2" />
                {/* Multi-Spoke Titanium Rim */}
                <ellipse cx="0" cy="0" rx="17" ry="11" fill="url(#rimGrad)" stroke="#64748b" strokeWidth="1.5" />
                {/* Center Hubcap with Neon Accent */}
                <ellipse cx="0" cy="0" rx="6" ry="4" fill={currentTheme.primary} filter="url(#neonGlowEffect)" />
                {/* Radial Rim Spokes */}
                <line x1="-12" y1="-7" x2="12" y2="7" stroke="#ffffff" strokeWidth="1.5" opacity="0.8" />
                <line x1="-12" y1="7" x2="12" y2="-7" stroke="#ffffff" strokeWidth="1.5" opacity="0.8" />
              </g>

              {/* 10. FRONT WHEEL ARCH & 3D CYBER WHEEL */}
              <g transform="translate(325, 175)">
                {/* Wheel Arch Recess */}
                <path d="M -32,-5 Q 0,-34 32,-5 Z" fill="#020617" />
                {/* Tire Outer Rubber */}
                <ellipse cx="0" cy="0" rx="28" ry="19" fill="#0f172a" stroke="#334155" strokeWidth="2" />
                {/* Multi-Spoke Titanium Rim */}
                <ellipse cx="0" cy="0" rx="18" ry="12" fill="url(#rimGrad)" stroke="#64748b" strokeWidth="1.5" />
                {/* Center Hubcap */}
                <ellipse cx="0" cy="0" rx="7" ry="4.5" fill={currentTheme.primary} filter="url(#neonGlowEffect)" />
                {/* Radial Rim Spokes */}
                <line x1="-13" y1="-8" x2="13" y2="8" stroke="#ffffff" strokeWidth="1.5" opacity="0.8" />
                <line x1="-13" y1="8" x2="13" y2="-8" stroke="#ffffff" strokeWidth="1.5" opacity="0.8" />
              </g>

              {/* 11. HOLOGRAPHIC DIAGNOSTIC NODE TARGETS (Clickable/Interactive) */}
              <g className="cursor-pointer">
                {/* Engine Bay Sensor */}
                <circle cx="75" cy="130" r="4" fill={currentTheme.primary} className="animate-ping" opacity="0.75" />
                <circle cx="75" cy="130" r="2.5" fill="#ffffff" />
                {/* GPS / Satellite Rooftop Antenna */}
                <circle cx="240" cy="56" r="3.5" fill="#06b6d4" className="animate-ping" opacity="0.75" />
                <circle cx="240" cy="56" r="2" fill="#ffffff" />
                {/* Telemetry Hub */}
                <circle cx="370" cy="140" r="4" fill="#a855f7" className="animate-ping" opacity="0.75" />
                <circle cx="370" cy="140" r="2.5" fill="#ffffff" />
              </g>
            </svg>
          </div>
        </motion.div>
      </div>

      {/* INTERACTIVE CONTROLS BAR (Liquid iPhone Glass UI) */}
      {showControls && (
        <div className="w-full max-w-xl mt-3 p-2.5 rounded-2xl bg-slate-950/60 border border-white/10 backdrop-blur-2xl shadow-[0_10px_30px_rgba(0,0,0,0.5),inset_0_1px_1px_rgba(255,255,255,0.15)] flex flex-col gap-2.5">
          
          {/* Movement Mode Selector Tabs */}
          <div className="flex items-center justify-between gap-1 overflow-x-auto p-1 bg-slate-900/80 rounded-xl border border-white/5 custom-scrollbar">
            
            <button
              type="button"
              onClick={() => setMode('diagonal')}
              className={`flex-1 min-w-[90px] px-2.5 py-1.5 rounded-lg text-[11px] font-black tracking-wide uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'diagonal'
                  ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 shadow-md shadow-emerald-500/25 scale-[1.02]'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Compass size={12} className={mode === 'diagonal' ? 'text-slate-950' : 'text-emerald-400'} />
              <span>Diagonal 3D</span>
            </button>

            <button
              type="button"
              onClick={() => setMode('orbit')}
              className={`flex-1 min-w-[80px] px-2.5 py-1.5 rounded-lg text-[11px] font-black tracking-wide uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'orbit'
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-500 text-slate-950 shadow-md shadow-cyan-500/25 scale-[1.02]'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <RotateCw size={12} className={mode === 'orbit' ? 'text-slate-950' : 'text-cyan-400 animate-spin'} />
              <span>Órbita 360°</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setMode('turbo');
                triggerTurboBurst();
              }}
              className={`flex-1 min-w-[80px] px-2.5 py-1.5 rounded-lg text-[11px] font-black tracking-wide uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'turbo'
                  ? 'bg-gradient-to-r from-amber-500 to-rose-500 text-slate-950 shadow-md shadow-amber-500/25 scale-[1.02]'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Flame size={12} className={mode === 'turbo' ? 'text-slate-950' : 'text-amber-400'} />
              <span>Turbo Drive</span>
            </button>

            <button
              type="button"
              onClick={() => setMode('scanner')}
              className={`flex-1 min-w-[80px] px-2.5 py-1.5 rounded-lg text-[11px] font-black tracking-wide uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'scanner'
                  ? 'bg-gradient-to-r from-purple-500 to-indigo-500 text-slate-950 shadow-md shadow-purple-500/25 scale-[1.02]'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Cpu size={12} className={mode === 'scanner' ? 'text-slate-950' : 'text-purple-400'} />
              <span>Scanner Raio-X</span>
            </button>

            <button
              type="button"
              onClick={() => setMode('interactive')}
              className={`flex-1 min-w-[80px] px-2.5 py-1.5 rounded-lg text-[11px] font-black tracking-wide uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                mode === 'interactive'
                  ? 'bg-gradient-to-r from-teal-400 to-cyan-400 text-slate-950 shadow-md shadow-teal-400/25 scale-[1.02]'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <Maximize2 size={12} className={mode === 'interactive' ? 'text-slate-950' : 'text-teal-400'} />
              <span>Giroscópio</span>
            </button>
          </div>

          {/* Quick Neon Toggles & Theme Customizer */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-1 text-[10px] font-mono text-slate-400">
            
            {/* Neon Theme Swatches */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-bold uppercase text-[9px]">Cor Neon:</span>
              {(['emerald', 'cyan', 'purple', 'gold'] as NeonTheme[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTheme(t)}
                  className={`w-5 h-5 rounded-full transition-transform cursor-pointer border ${
                    theme === t ? 'scale-125 ring-2 ring-white/50 border-white' : 'opacity-70 hover:opacity-100 border-transparent'
                  }`}
                  style={{
                    backgroundColor: THEME_CONFIGS[t].primary,
                    boxShadow: theme === t ? `0 0 10px ${THEME_CONFIGS[t].primary}` : 'none'
                  }}
                  title={THEME_CONFIGS[t].name}
                />
              ))}
            </div>

            {/* Quick Feature Toggles */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setHeadlightsOn(!headlightsOn)}
                className={`px-2 py-1 rounded-lg border text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  headlightsOn 
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-xs shadow-emerald-500/30' 
                    : 'bg-slate-900 text-slate-500 border-slate-800'
                }`}
              >
                Faróis LED {headlightsOn ? 'ON' : 'OFF'}
              </button>

              <button
                type="button"
                onClick={() => setUnderglowOn(!underglowOn)}
                className={`px-2 py-1 rounded-lg border text-[9px] font-bold uppercase tracking-wider transition-all cursor-pointer ${
                  underglowOn 
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-xs shadow-cyan-500/30' 
                    : 'bg-slate-900 text-slate-500 border-slate-800'
                }`}
              >
                Underglow {underglowOn ? 'ON' : 'OFF'}
              </button>

              <button
                type="button"
                onClick={triggerTurboBurst}
                className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-amber-500/30 to-rose-500/30 border border-amber-500/40 text-amber-300 text-[9px] font-bold uppercase tracking-wider hover:scale-105 active:scale-95 transition-all cursor-pointer flex items-center gap-1"
              >
                <Zap size={10} className="text-amber-400" />
                Nitro
              </button>
            </div>

          </div>

        </div>
      )}
    </div>
  );
};

export default Vehicle3DShowcase;
