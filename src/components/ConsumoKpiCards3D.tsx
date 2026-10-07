import React, { useState, useRef, MouseEvent, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart3, 
  Fuel, 
  Gauge, 
  AlertCircle, 
  Truck, 
  Sliders, 
  TrendingUp, 
  TrendingDown, 
  Sparkles, 
  Zap, 
  DollarSign,
  Activity,
  ArrowUpRight,
  Info
} from 'lucide-react';
import { cn } from '../lib/utils';

export interface ConsumoStats {
  totalKmProdutivo?: number;
  totalKm?: number;
  totalLitros?: number;
  avgKml?: number;
  totalValor?: number;
  costPerKm?: number;
  kmRecordCount?: number;
  qualityIssues?: number;
}

interface ConsumoKpiCards3DProps {
  stats: ConsumoStats;
  avgMethod: 'simple' | 'weighted';
  setAvgMethod: (method: 'simple' | 'weighted') => void;
  appTheme?: 'light' | 'dark-neon';
  targetKml?: number;
}

interface Interactive3DCardProps {
  children: ReactNode;
  className?: string;
  glowColor?: string;
  isDarkTheme?: boolean;
  index?: number;
  backgroundAnimation?: ReactNode;
}

const Interactive3DCard: React.FC<Interactive3DCardProps> = ({
  children,
  className = '',
  glowColor = 'rgba(59, 130, 246, 0.18)',
  isDarkTheme = false,
  index = 0,
  backgroundAnimation
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    // Smooth 3D tilt calculation
    const rotateX = ((y - centerY) / centerY) * -6.5;
    const rotateY = ((x - centerX) / centerX) * 6.5;

    setTilt({ x: rotateX, y: rotateY });
    setMousePos({
      x: Math.round((x / rect.width) * 100),
      y: Math.round((y / rect.height) * 100),
    });
  };

  const handleMouseEnter = () => setIsHovered(true);
  const handleMouseLeave = () => {
    setIsHovered(false);
    setTilt({ x: 0, y: 0 });
    setMousePos({ x: 50, y: 50 });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 22, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, delay: index * 0.06, ease: [0.23, 1, 0.32, 1] }}
      style={{ perspective: 1100 }}
      className="h-full"
    >
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          transform: isHovered
            ? `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateZ(14px) scale3d(1.02, 1.02, 1.02)`
            : 'rotateX(0deg) rotateY(0deg) translateZ(0px) scale3d(1, 1, 1)',
          transformStyle: 'preserve-3d',
          transition: isHovered ? 'transform 0.08s ease-out' : 'transform 0.5s cubic-bezier(0.23, 1, 0.32, 1)',
        }}
        className={`group relative rounded-[2rem] p-5 sm:p-6 flex flex-col justify-between h-full transition-shadow duration-500 overflow-hidden cursor-default ${
          isDarkTheme
            ? 'bg-slate-900/90 border border-slate-800/90 text-slate-100 shadow-xl shadow-black/50 backdrop-blur-md hover:border-slate-700/80 hover:shadow-2xl'
            : 'bg-white border border-slate-200/90 text-slate-900 shadow-xl shadow-slate-200/60 hover:border-slate-300 hover:shadow-2xl'
        } ${className}`}
      >
        {/* Dynamic Holographic Glass Light Sheen */}
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-300 z-0"
          style={{
            background: isHovered
              ? `radial-gradient(circle 240px at ${mousePos.x}% ${mousePos.y}%, ${glowColor}, transparent 70%)`
              : 'none',
            opacity: isHovered ? 1 : 0,
          }}
        />

        {/* Ambient 3D Depth Rings */}
        <div className="absolute -top-10 -right-10 w-36 h-36 rounded-full border border-slate-200/40 dark:border-slate-800/40 pointer-events-none opacity-30 group-hover:scale-110 transition-transform duration-700" />
        <div className="absolute -bottom-12 -left-12 w-32 h-32 rounded-full border border-slate-200/20 dark:border-slate-800/20 pointer-events-none opacity-20" />

        {/* Top Glowing Neon Accent Strip */}
        <div 
          className={`absolute top-0 left-0 right-0 h-[3px] transition-opacity duration-300 z-20 ${
            isHovered ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            background: `linear-gradient(90deg, transparent, ${glowColor.replace(/0\.\d+/, '0.9')}, transparent)`
          }}
        />

        {/* Background Bus / Kinetic Animation Layer (Transparent) */}
        {backgroundAnimation && (
          <div className="absolute inset-0 overflow-hidden pointer-events-none z-0 select-none">
            {backgroundAnimation}
          </div>
        )}

        {/* 3D Elevated Content Wrapper */}
        <div className="relative z-10 flex flex-col justify-between h-full" style={{ transform: 'translateZ(18px)' }}>
          {children}
        </div>
      </div>
    </motion.div>
  );
};

/* =========================================================================
   1. BUS ANIMATION 1: KM PRODUTIVO (Cruising Speed & Road Distance)
   ========================================================================= */
const KmBusAnimation: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  return (
    <div className="absolute right-0 bottom-0 w-full h-full flex items-end justify-end pointer-events-none">
      <svg 
        viewBox="0 0 280 140" 
        className={cn(
          "w-56 sm:w-64 h-32 opacity-15 group-hover:opacity-35 transition-opacity duration-500 transform translate-x-4 translate-y-3",
          isDark ? "text-cyan-400" : "text-blue-600"
        )}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="kmBusGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={isDark ? "#38bdf8" : "#2563eb"} stopOpacity="0.2" />
            <stop offset="50%" stopColor={isDark ? "#06b6d4" : "#3b82f6"} stopOpacity="0.6" />
            <stop offset="100%" stopColor={isDark ? "#60a5fa" : "#1d4ed8"} stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id="kmRoadGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={isDark ? "#38bdf8" : "#2563eb"} stopOpacity="0" />
            <stop offset="50%" stopColor={isDark ? "#06b6d4" : "#3b82f6"} stopOpacity="0.8" />
            <stop offset="100%" stopColor={isDark ? "#38bdf8" : "#2563eb"} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Animated Speed Streaks / Wind trails */}
        <motion.g
          animate={{ x: [0, -35] }}
          transition={{ repeat: Infinity, duration: 0.9, ease: "linear" }}
        >
          <line x1="260" y1="38" x2="210" y2="38" stroke="currentColor" strokeWidth="1.5" strokeDasharray="6 8" opacity="0.6" />
          <line x1="275" y1="52" x2="225" y2="52" stroke="currentColor" strokeWidth="1" strokeDasharray="8 6" opacity="0.4" />
          <line x1="240" y1="70" x2="190" y2="70" stroke="currentColor" strokeWidth="1.2" strokeDasharray="4 6" opacity="0.5" />
        </motion.g>

        {/* Floating Bus with Suspension Bobbing */}
        <motion.g
          animate={{ y: [0, -2, 0, -1.2, 0], x: [0, 1.5, 0, -1, 0] }}
          transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
        >
          {/* Main Bus Body */}
          <path
            d="M 50 42 
               C 50 35, 56 30, 64 30 
               L 200 30 
               C 215 30, 226 38, 230 52 
               L 236 82 
               C 238 88, 234 94, 228 94 
               L 56 94 
               C 50 94, 46 90, 46 84 
               L 46 48 
               C 46 44, 48 42, 50 42 Z"
            fill="url(#kmBusGrad)"
            stroke="currentColor"
            strokeWidth="1.8"
          />

          {/* Roof AC Unit / Fairing */}
          <path
            d="M 100 24 L 170 24 C 174 24, 176 26, 176 30 L 94 30 C 94 26, 96 24, 100 24 Z"
            fill="currentColor"
            opacity="0.35"
          />

          {/* Windows / Windshield Ribbon */}
          <path
            d="M 60 40 L 95 40 L 95 62 L 60 62 Z"
            fill={isDark ? "#0f172a" : "#ffffff"}
            opacity="0.75"
            stroke="currentColor"
            strokeWidth="1"
          />
          <path
            d="M 102 40 L 138 40 L 138 62 L 102 62 Z"
            fill={isDark ? "#0f172a" : "#ffffff"}
            opacity="0.75"
            stroke="currentColor"
            strokeWidth="1"
          />
          <path
            d="M 145 40 L 180 40 L 180 62 L 145 62 Z"
            fill={isDark ? "#0f172a" : "#ffffff"}
            opacity="0.75"
            stroke="currentColor"
            strokeWidth="1"
          />
          {/* Front Sloped Panoramic Windshield */}
          <path
            d="M 187 40 L 218 40 C 223 46, 226 54, 228 62 L 187 62 Z"
            fill={isDark ? "#38bdf8" : "#93c5fd"}
            opacity="0.55"
            stroke="currentColor"
            strokeWidth="1.2"
          />

          {/* Front Headlight Glow */}
          <circle cx="234" cy="80" r="3.5" fill="#38bdf8" className="animate-pulse" />
          <path d="M 235 80 L 268 74 L 272 88 Z" fill="url(#kmBusGrad)" opacity="0.3" />

          {/* Wheel Wells & Rotating Wheels */}
          {/* Rear Wheel */}
          <circle cx="85" cy="94" r="14" fill={isDark ? "#090d16" : "#e2e8f0"} stroke="currentColor" strokeWidth="1.8" />
          <motion.g
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
            style={{ transformOrigin: "85px 94px" }}
          >
            <circle cx="85" cy="94" r="6" fill="currentColor" opacity="0.6" />
            <line x1="85" y1="80" x2="85" y2="108" stroke="currentColor" strokeWidth="1.5" />
            <line x1="71" y1="94" x2="99" y2="94" stroke="currentColor" strokeWidth="1.5" />
          </motion.g>

          {/* Front Wheel */}
          <circle cx="195" cy="94" r="14" fill={isDark ? "#090d16" : "#e2e8f0"} stroke="currentColor" strokeWidth="1.8" />
          <motion.g
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
            style={{ transformOrigin: "195px 94px" }}
          >
            <circle cx="195" cy="94" r="6" fill="currentColor" opacity="0.6" />
            <line x1="195" y1="80" x2="195" y2="108" stroke="currentColor" strokeWidth="1.5" />
            <line x1="181" y1="94" x2="209" y2="94" stroke="currentColor" strokeWidth="1.5" />
          </motion.g>
        </motion.g>

        {/* Dynamic Road Underneath with Moving Dash Marks */}
        <line x1="10" y1="108" x2="270" y2="108" stroke="url(#kmRoadGrad)" strokeWidth="2.5" />
        <motion.line
          x1="270"
          y1="114"
          x2="0"
          y2="114"
          stroke="currentColor"
          strokeWidth="2"
          strokeDasharray="14 16"
          animate={{ strokeDashoffset: [0, 60] }}
          transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
          opacity="0.7"
        />

        {/* Floating Distance Pulse Rings */}
        <motion.circle
          cx="40"
          cy="108"
          r="4"
          fill="currentColor"
          animate={{ scale: [1, 2.2], opacity: [0.8, 0] }}
          transition={{ repeat: Infinity, duration: 1.4, ease: "easeOut" }}
        />
      </svg>
    </div>
  );
};

/* =========================================================================
   2. BUS ANIMATION 2: CONSUMO TOTAL (Fluid Fuel Filling & Tank Dynamics)
   ========================================================================= */
const ConsumoBusAnimation: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  return (
    <div className="absolute right-0 bottom-0 w-full h-full flex items-end justify-end pointer-events-none">
      <svg 
        viewBox="0 0 280 140" 
        className={cn(
          "w-56 sm:w-64 h-32 opacity-15 group-hover:opacity-35 transition-opacity duration-500 transform translate-x-3 translate-y-3",
          isDark ? "text-emerald-400" : "text-emerald-600"
        )}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="fuelBusGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={isDark ? "#34d399" : "#10b981"} stopOpacity="0.25" />
            <stop offset="100%" stopColor={isDark ? "#059669" : "#047857"} stopOpacity="0.75" />
          </linearGradient>
          <linearGradient id="fuelLiquidGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={isDark ? "#10b981" : "#059669"} stopOpacity="0.8" />
            <stop offset="50%" stopColor={isDark ? "#34d399" : "#10b981"} stopOpacity="0.95" />
            <stop offset="100%" stopColor={isDark ? "#6ee7b7" : "#34d399"} stopOpacity="0.8" />
          </linearGradient>
        </defs>

        {/* Fuel Station Nozzle / Droplet Stream */}
        <g transform="translate(15, 20)">
          {/* Pulsing Fuel Nozzle */}
          <path
            d="M 12 18 L 24 30 L 32 30 L 44 48"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            opacity="0.6"
          />
          {/* Animated Fuel Droplets Flowing into the Bus */}
          <motion.circle
            cx="24"
            cy="30"
            r="2.5"
            fill="currentColor"
            animate={{ cx: [24, 52], cy: [30, 68], opacity: [0, 1, 0], scale: [0.8, 1.2, 0.4] }}
            transition={{ repeat: Infinity, duration: 1.3, ease: "easeIn" }}
          />
          <motion.circle
            cx="24"
            cy="30"
            r="2"
            fill="currentColor"
            animate={{ cx: [24, 52], cy: [30, 68], opacity: [0, 1, 0], scale: [0.8, 1.2, 0.4] }}
            transition={{ repeat: Infinity, duration: 1.3, delay: 0.65, ease: "easeIn" }}
          />
        </g>

        {/* Bus Structure */}
        <g>
          {/* Main Bus Chassis */}
          <path
            d="M 48 44 
               C 48 36, 54 32, 62 32 
               L 196 32 
               C 210 32, 222 40, 226 54 
               L 232 84 
               C 234 90, 230 96, 224 96 
               L 54 96 
               C 48 96, 44 92, 44 86 
               L 44 50 
               C 44 46, 46 44, 48 44 Z"
            fill="url(#fuelBusGrad)"
            stroke="currentColor"
            strokeWidth="1.8"
          />

          {/* Windows Outline */}
          <rect x="58" y="40" width="34" height="22" rx="3" fill={isDark ? "#090d16" : "#ffffff"} opacity="0.6" stroke="currentColor" strokeWidth="1" />
          <rect x="98" y="40" width="34" height="22" rx="3" fill={isDark ? "#090d16" : "#ffffff"} opacity="0.6" stroke="currentColor" strokeWidth="1" />
          <rect x="138" y="40" width="34" height="22" rx="3" fill={isDark ? "#090d16" : "#ffffff"} opacity="0.6" stroke="currentColor" strokeWidth="1" />
          <path d="M 178 40 L 212 40 C 218 46, 221 54, 223 62 L 178 62 Z" fill={isDark ? "#090d16" : "#ffffff"} opacity="0.6" stroke="currentColor" strokeWidth="1" />

          {/* Internal Glowing Fuel Tank Compartment */}
          <rect 
            x="76" 
            y="68" 
            width="96" 
            height="22" 
            rx="4" 
            fill={isDark ? "#064e3b" : "#d1fae5"} 
            stroke="currentColor" 
            strokeWidth="1.4" 
            opacity="0.8"
          />

          {/* Undulating Dynamic Fuel Fluid Level */}
          <motion.path
            d="M 78 78 Q 102 74, 126 78 T 170 78 L 170 88 L 78 88 Z"
            fill="url(#fuelLiquidGrad)"
            animate={{
              d: [
                "M 78 78 Q 102 74, 126 78 T 170 78 L 170 88 L 78 88 Z",
                "M 78 76 Q 102 80, 126 76 T 170 76 L 170 88 L 78 88 Z",
                "M 78 78 Q 102 74, 126 78 T 170 78 L 170 88 L 78 88 Z",
              ]
            }}
            transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
          />

          {/* Micro Bubbles Rising in Tank */}
          <motion.circle
            cx="100"
            cy="84"
            r="1.5"
            fill="#ffffff"
            animate={{ cy: [84, 72], opacity: [0, 0.9, 0] }}
            transition={{ repeat: Infinity, duration: 1.8, ease: "easeOut" }}
          />
          <motion.circle
            cx="135"
            cy="86"
            r="1.8"
            fill="#ffffff"
            animate={{ cy: [86, 70], opacity: [0, 0.9, 0] }}
            transition={{ repeat: Infinity, duration: 2.1, delay: 0.7, ease: "easeOut" }}
          />

          {/* Wheels */}
          <circle cx="82" cy="96" r="13" fill={isDark ? "#090d16" : "#e2e8f0"} stroke="currentColor" strokeWidth="1.8" />
          <circle cx="82" cy="96" r="5" fill="currentColor" opacity="0.7" />

          <circle cx="190" cy="96" r="13" fill={isDark ? "#090d16" : "#e2e8f0"} stroke="currentColor" strokeWidth="1.8" />
          <circle cx="190" cy="96" r="5" fill="currentColor" opacity="0.7" />
        </g>
      </svg>
    </div>
  );
};

/* =========================================================================
   3. BUS ANIMATION 3: MÉDIA KM/L (Aerodynamics, Wind Tunnel & Efficiency)
   ========================================================================= */
const MediaBusAnimation: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  return (
    <div className="absolute right-0 bottom-0 w-full h-full flex items-end justify-end pointer-events-none">
      <svg 
        viewBox="0 0 280 140" 
        className={cn(
          "w-56 sm:w-64 h-32 opacity-15 group-hover:opacity-35 transition-opacity duration-500 transform translate-x-3 translate-y-3",
          isDark ? "text-violet-400" : "text-violet-600"
        )}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="mediaBusGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={isDark ? "#a855f7" : "#8b5cf6"} stopOpacity="0.25" />
            <stop offset="100%" stopColor={isDark ? "#7c3aed" : "#6d28d9"} stopOpacity="0.8" />
          </linearGradient>
          <linearGradient id="aeroStreamGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={isDark ? "#c084fc" : "#8b5cf6"} stopOpacity="0" />
            <stop offset="40%" stopColor={isDark ? "#e879f9" : "#a855f7"} stopOpacity="0.9" />
            <stop offset="100%" stopColor={isDark ? "#38bdf8" : "#3b82f6"} stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Aerodynamic Wind Stream Flow Waves Wrapping Over the Bus */}
        <motion.path
          d="M 270 48 C 230 46, 210 24, 150 20 C 100 16, 50 18, 10 20"
          stroke="url(#aeroStreamGrad)"
          strokeWidth="2"
          strokeDasharray="40 20"
          animate={{ strokeDashoffset: [0, -120] }}
          transition={{ repeat: Infinity, duration: 1.8, ease: "linear" }}
        />
        <motion.path
          d="M 275 62 C 240 60, 220 34, 160 30 C 110 26, 60 28, 20 30"
          stroke="url(#aeroStreamGrad)"
          strokeWidth="1.5"
          strokeDasharray="30 25"
          animate={{ strokeDashoffset: [0, -110] }}
          transition={{ repeat: Infinity, duration: 2.2, ease: "linear" }}
        />
        <motion.path
          d="M 260 88 C 220 86, 200 78, 160 76 C 110 74, 50 78, 10 84"
          stroke="url(#aeroStreamGrad)"
          strokeWidth="1.2"
          strokeDasharray="25 30"
          animate={{ strokeDashoffset: [0, -90] }}
          transition={{ repeat: Infinity, duration: 2.6, ease: "linear" }}
        />

        {/* Aerodynamic High-Tech Bus Profile */}
        <motion.g
          animate={{ x: [-2, 2, -2], y: [0, -2, 0] }}
          transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
        >
          {/* Streamlined Body */}
          <path
            d="M 52 46 
               C 52 38, 58 32, 66 32 
               L 194 32 
               C 214 32, 228 42, 234 58 
               L 238 82 
               C 240 88, 236 94, 230 94 
               L 58 94 
               C 52 94, 48 90, 48 84 
               L 48 52 
               C 48 48, 50 46, 52 46 Z"
            fill="url(#mediaBusGrad)"
            stroke="currentColor"
            strokeWidth="1.8"
          />

          {/* Aerodynamic Swept Windows */}
          <path d="M 62 40 L 96 40 L 96 62 L 62 62 Z" fill={isDark ? "#090d16" : "#ffffff"} opacity="0.65" stroke="currentColor" strokeWidth="1" />
          <path d="M 104 40 L 142 40 L 142 62 L 104 62 Z" fill={isDark ? "#090d16" : "#ffffff"} opacity="0.65" stroke="currentColor" strokeWidth="1" />
          <path d="M 150 40 L 188 40 L 188 62 L 150 62 Z" fill={isDark ? "#090d16" : "#ffffff"} opacity="0.65" stroke="currentColor" strokeWidth="1" />
          {/* Curved Front Aerodynamic Canopy */}
          <path d="M 196 40 L 224 40 C 230 48, 233 56, 235 64 L 196 64 Z" fill={isDark ? "#c084fc" : "#ddd6fe"} opacity="0.55" stroke="currentColor" strokeWidth="1.2" />

          {/* Eco Efficiency Core / Radar Ring Pulse in the Front */}
          <circle cx="236" cy="74" r="3" fill="#a855f7" />
          <motion.circle
            cx="236"
            cy="74"
            r="3"
            stroke="currentColor"
            strokeWidth="1.5"
            fill="none"
            animate={{ r: [3, 16], opacity: [0.9, 0] }}
            transition={{ repeat: Infinity, duration: 1.6, ease: "easeOut" }}
          />

          {/* Streamlined Alloy Wheels */}
          <circle cx="86" cy="94" r="13" fill={isDark ? "#090d16" : "#e2e8f0"} stroke="currentColor" strokeWidth="1.8" />
          <circle cx="86" cy="94" r="5" fill="currentColor" opacity="0.7" />

          <circle cx="198" cy="94" r="13" fill={isDark ? "#090d16" : "#e2e8f0"} stroke="currentColor" strokeWidth="1.8" />
          <circle cx="198" cy="94" r="5" fill="currentColor" opacity="0.7" />
        </motion.g>
      </svg>
    </div>
  );
};

/* =========================================================================
   4. CARD ANIMATION 4: CUSTO TOTAL (Financial Flow & Metric Matrix)
   ========================================================================= */
const CustoTotalAnimation: React.FC<{ isDark: boolean }> = ({ isDark }) => {
  return (
    <div className="absolute right-0 bottom-0 w-full h-full flex items-end justify-end pointer-events-none">
      <svg 
        viewBox="0 0 280 140" 
        className={cn(
          "w-56 sm:w-64 h-32 opacity-15 group-hover:opacity-35 transition-opacity duration-500 transform translate-x-3 translate-y-3",
          isDark ? "text-rose-400" : "text-rose-600"
        )}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="custoWaveGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={isDark ? "#fb7185" : "#f43f5e"} stopOpacity="0.4" />
            <stop offset="100%" stopColor={isDark ? "#e11d48" : "#be123c"} stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* Dynamic Financial Trend Waveform */}
        <motion.path
          d="M 20 100 Q 60 70, 100 85 T 180 55 T 260 40 L 260 120 L 20 120 Z"
          fill="url(#custoWaveGrad)"
        />
        <motion.path
          d="M 20 100 Q 60 70, 100 85 T 180 55 T 260 40"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          animate={{
            d: [
              "M 20 100 Q 60 70, 100 85 T 180 55 T 260 40",
              "M 20 95 Q 60 80, 100 75 T 180 60 T 260 45",
              "M 20 100 Q 60 70, 100 85 T 180 55 T 260 40",
            ]
          }}
          transition={{ repeat: Infinity, duration: 3.5, ease: "easeInOut" }}
        />

        {/* Peak Investment Glow Node */}
        <motion.circle
          cx="260"
          cy="40"
          r="4.5"
          fill="currentColor"
          animate={{ scale: [1, 1.4, 1] }}
          transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
        />
        <motion.circle
          cx="260"
          cy="40"
          r="4.5"
          stroke="currentColor"
          strokeWidth="1.5"
          fill="none"
          animate={{ r: [4.5, 18], opacity: [0.8, 0] }}
          transition={{ repeat: Infinity, duration: 1.8, ease: "easeOut" }}
        />

        {/* Floating Currency Symbol Nodes */}
        <circle cx="100" cy="85" r="3" fill="currentColor" opacity="0.6" />
        <circle cx="180" cy="55" r="3" fill="currentColor" opacity="0.7" />
      </svg>
    </div>
  );
};

/* =========================================================================
   MAIN EXPORT: ConsumoKpiCards3D
   ========================================================================= */
export const ConsumoKpiCards3D: React.FC<ConsumoKpiCards3DProps> = ({
  stats,
  avgMethod,
  setAvgMethod,
  appTheme = 'light',
  targetKml = 2.5
}) => {
  const isDark = appTheme === 'dark-neon';

  const totalKmProdutivo = stats.totalKmProdutivo || 0;
  const totalLitros = stats.totalLitros || 0;
  const avgKml = stats.avgKml || 0;
  const totalValor = stats.totalValor || 0;
  const costPerKm = stats.costPerKm || (totalKmProdutivo > 0 ? totalValor / totalKmProdutivo : 0);
  const kmRecordCount = stats.kmRecordCount || 0;

  const isAvgAboveTarget = avgKml >= targetKml;

  return (
    <div id="consumo-kpis-3d" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 sm:gap-6">
      
      {/* =========================================================================
          CARD 1: KM PRODUTIVO (KM RODADO / DISTÂNCIA)
          ========================================================================= */}
      <Interactive3DCard 
        index={0}
        isDarkTheme={isDark}
        glowColor="rgba(59, 130, 246, 0.22)"
        backgroundAnimation={<KmBusAnimation isDark={isDark} />}
      >
        <div className="flex items-center justify-between mb-4">
          <div className={cn(
            "w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shadow-md transition-all duration-300 transform group-hover:scale-110",
            isDark 
              ? "bg-blue-500/15 text-blue-400 border border-blue-500/30 shadow-blue-950/50" 
              : "bg-blue-50 text-blue-600 border border-blue-100 shadow-blue-100/80"
          )}>
            <Truck size={22} className="sm:size-[24px]" />
          </div>
          <span className={cn(
            "px-3 py-1 text-[9px] sm:text-[10px] font-black rounded-full uppercase tracking-wider border shadow-xs flex items-center gap-1.5",
            isDark
              ? "bg-blue-950/70 text-blue-300 border-blue-800"
              : "bg-blue-50 text-blue-700 border-blue-200"
          )}>
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
            KM Produtivo
          </span>
        </div>

        <div>
          <p className={cn(
            "font-black uppercase tracking-wider text-[9px] sm:text-[10px] mb-2 font-sans",
            isDark ? "text-slate-400" : "text-slate-600"
          )}>
            KM PRODUTIVO (APP)
          </p>
          <h4 
            className={cn(
              "text-lg sm:text-xl md:text-2xl font-black tracking-tight flex flex-wrap items-baseline gap-1.5",
              isDark ? "text-white" : "text-slate-950"
            )}
            title={`${totalKmProdutivo.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} Quilômetros`}
          >
            {totalKmProdutivo.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
            <span className={cn(
              "text-xs font-extrabold uppercase tracking-tight",
              isDark ? "text-blue-400" : "text-blue-700"
            )}>
              KM
            </span>
          </h4>
          <p className={cn(
            "text-[10px] font-bold uppercase tracking-tight mt-1 flex items-center gap-1.5",
            isDark ? "text-slate-400" : "text-slate-600"
          )}>
            <span className="font-extrabold font-mono text-blue-600 dark:text-blue-400">({kmRecordCount} reg)</span>
            <span>Soma por Linha</span>
          </p>
        </div>
      </Interactive3DCard>

      {/* =========================================================================
          CARD 2: CONSUMO TOTAL (LITROS ABASTECIDOS)
          ========================================================================= */}
      <Interactive3DCard 
        index={1}
        isDarkTheme={isDark}
        glowColor="rgba(16, 185, 129, 0.22)"
        backgroundAnimation={<ConsumoBusAnimation isDark={isDark} />}
      >
        <div className="flex items-center justify-between mb-4">
          <div className={cn(
            "w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shadow-md transition-all duration-300 transform group-hover:scale-110",
            isDark 
              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-emerald-950/50" 
              : "bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-emerald-100/80"
          )}>
            <Fuel size={22} className="sm:size-[24px]" />
          </div>
          <span className={cn(
            "px-3 py-1 text-[9px] sm:text-[10px] font-black rounded-full uppercase tracking-wider border shadow-xs flex items-center gap-1.5",
            isDark
              ? "bg-emerald-950/70 text-emerald-300 border-emerald-800"
              : "bg-emerald-50 text-emerald-700 border-emerald-200"
          )}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Litragem Total
          </span>
        </div>

        <div>
          <p className={cn(
            "font-black uppercase tracking-wider text-[9px] sm:text-[10px] mb-2 font-sans",
            isDark ? "text-slate-400" : "text-slate-600"
          )}>
            Consumo Total
          </p>
          <h4 
            className={cn(
              "text-lg sm:text-xl md:text-2xl font-black tracking-tight flex flex-wrap items-baseline gap-1.5",
              isDark ? "text-white" : "text-slate-950"
            )}
            title={`${totalLitros.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} Litros`}
          >
            {totalLitros.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
            <span className={cn(
              "text-xs font-extrabold uppercase tracking-tight",
              isDark ? "text-emerald-400" : "text-emerald-700"
            )}>
              LITROS
            </span>
          </h4>
          <p className={cn(
            "text-[10px] font-bold uppercase tracking-tight mt-1 flex items-center gap-1.5",
            isDark ? "text-slate-400" : "text-slate-600"
          )}>
            <span>Base Competência</span>
          </p>
        </div>
      </Interactive3DCard>

      {/* =========================================================================
          CARD 3: MÉDIA DE CONSUMO (KM/L)
          ========================================================================= */}
      <Interactive3DCard 
        index={2}
        isDarkTheme={isDark}
        glowColor="rgba(139, 92, 246, 0.22)"
        backgroundAnimation={<MediaBusAnimation isDark={isDark} />}
      >
        <div className="flex items-center justify-between mb-4">
          <div className={cn(
            "w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shadow-md transition-all duration-300 transform group-hover:scale-110",
            isDark 
              ? "bg-violet-500/15 text-violet-400 border border-violet-500/30 shadow-violet-950/50" 
              : "bg-violet-50 text-violet-600 border border-violet-100 shadow-violet-100/80"
          )}>
            <Gauge size={22} className="sm:size-[24px]" />
          </div>
          <span className={cn(
            "px-3 py-1 text-[9px] sm:text-[10px] font-black rounded-full uppercase tracking-wider border shadow-xs flex items-center gap-1.5",
            isAvgAboveTarget
              ? isDark ? "bg-emerald-950/70 text-emerald-300 border-emerald-800" : "bg-emerald-50 text-emerald-700 border-emerald-200"
              : isDark ? "bg-amber-950/70 text-amber-300 border-amber-800" : "bg-amber-50 text-amber-700 border-amber-200"
          )}>
            <span className={cn("w-1.5 h-1.5 rounded-full animate-pulse", isAvgAboveTarget ? "bg-emerald-500" : "bg-amber-500")} />
            {avgMethod === 'weighted' ? 'Ponderada' : 'Simples'}
          </span>
        </div>

        <div>
          <p className={cn(
            "font-black uppercase tracking-wider text-[9px] sm:text-[10px] mb-2 font-sans",
            isDark ? "text-slate-400" : "text-slate-600"
          )}>
            Média de Consumo
          </p>
          <h4 
            className={cn(
              "text-lg sm:text-xl md:text-2xl font-black tracking-tight flex flex-wrap items-baseline gap-1.5",
              isDark ? "text-white" : "text-slate-950"
            )}
          >
            {avgKml.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            <span className={cn(
              "text-xs font-extrabold uppercase tracking-tight",
              isDark ? "text-violet-400" : "text-violet-700"
            )}>
              KM/L
            </span>
          </h4>

          {/* Interactive Toggle for Calculation Method */}
          <button 
            type="button"
            onClick={() => setAvgMethod(avgMethod === 'simple' ? 'weighted' : 'simple')}
            className={cn(
              "text-[10px] font-bold uppercase tracking-tight mt-1.5 flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all cursor-pointer shadow-2xs active:scale-95",
              isDark
                ? "bg-violet-950/60 hover:bg-violet-900/80 text-violet-300 border-violet-800"
                : "bg-violet-50 hover:bg-violet-100 text-violet-800 border-violet-200"
            )}
            title="Clique para alternar entre Média Simples e Ponderada"
          >
            <Sliders size={11} className="shrink-0 text-violet-500" />
            <span>{avgMethod === 'simple' ? 'Média Simples' : 'Média Ponderada'}</span>
          </button>
        </div>
      </Interactive3DCard>

      {/* =========================================================================
          CARD 4: CUSTO TOTAL (VALOR TOTAL ABASTECIDO)
          ========================================================================= */}
      <Interactive3DCard 
        index={3}
        isDarkTheme={isDark}
        glowColor="rgba(244, 63, 94, 0.22)"
        backgroundAnimation={<CustoTotalAnimation isDark={isDark} />}
      >
        <div className="flex items-center justify-between mb-4">
          <div className={cn(
            "w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shadow-md transition-all duration-300 transform group-hover:scale-110",
            isDark 
              ? "bg-rose-500/15 text-rose-400 border border-rose-500/30 shadow-rose-950/50" 
              : "bg-rose-50 text-rose-600 border border-rose-100 shadow-rose-100/80"
          )}>
            <DollarSign size={22} className="sm:size-[24px]" />
          </div>
          <span className={cn(
            "px-3 py-1 text-[9px] sm:text-[10px] font-black rounded-full uppercase tracking-wider border shadow-xs flex items-center gap-1.5",
            isDark
              ? "bg-rose-950/70 text-rose-300 border-rose-800"
              : "bg-rose-50 text-rose-700 border-rose-200"
          )}>
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            Valor Total
          </span>
        </div>

        <div>
          <p className={cn(
            "font-black uppercase tracking-wider text-[9px] sm:text-[10px] mb-2 font-sans",
            isDark ? "text-slate-400" : "text-slate-600"
          )}>
            Custo Total
          </p>
          <h4 
            className={cn(
              "text-lg sm:text-xl md:text-2xl font-black tracking-tight flex flex-wrap items-baseline gap-1 font-mono",
              isDark ? "text-white" : "text-slate-950"
            )}
            title={totalValor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          >
            {totalValor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </h4>
          <p className={cn(
            "text-[10px] font-bold uppercase tracking-tight mt-1 flex items-center gap-1.5",
            isDark ? "text-slate-400" : "text-slate-600"
          )}>
            <span>R$ {costPerKm.toFixed(2)}/km rodado</span>
          </p>
        </div>
      </Interactive3DCard>

    </div>
  );
};
