import React, { useState, useRef, MouseEvent, ReactNode, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Fuel, 
  Gauge, 
  Truck, 
  Database, 
  FileText, 
  AlertCircle, 
  BarChart3, 
  Sliders, 
  Sparkles,
  TrendingUp,
  Activity,
  Zap,
  DollarSign,
  Wrench,
  Package,
  Layers,
  CheckCircle2,
  Cpu,
  ArrowUpRight
} from 'lucide-react';
import { cn } from '../lib/utils';

export interface SummaryTotals {
  litros: number;
  fuelRecordCount?: number;
  valorFuel: number;
  avgKml: number;
  kmProdutivo: number;
  estoqueTotal: number;
  avulsoTotal: number;
  totalMaint: number;
  totalGeral: number;
  cambio?: number;
  pneus?: number;
  motor?: number;
  eletrica?: number;
  carroceria?: number;
  diversos?: number;
}

export interface ResumoGerencialKpiCardsProps {
  summaryTotals: SummaryTotals;
  avgMethod: 'simple' | 'weighted';
  setAvgMethod: (method: 'simple' | 'weighted') => void;
  appTheme?: 'light' | 'dark-neon';
  summaryData?: any[];
  targetKml?: number;
}

interface Interactive3DCardProps {
  children: ReactNode;
  className?: string;
  glowColor?: string;
  isDarkTheme?: boolean;
  isHero?: boolean;
  index?: number;
  backgroundAnimation?: ReactNode;
  bgWave?: ReactNode;
}

const Interactive3DCard: React.FC<Interactive3DCardProps> = ({
  children,
  className = '',
  glowColor = 'rgba(16, 185, 129, 0.18)',
  isDarkTheme = false,
  isHero = false,
  index = 0,
  backgroundAnimation,
  bgWave
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
      transition={{ duration: 0.45, delay: index * 0.05, ease: [0.23, 1, 0.32, 1] }}
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
          isHero
            ? isDarkTheme
              ? 'bg-gradient-to-br from-slate-900 via-[#070b19] to-slate-950 border border-indigo-500/40 shadow-2xl shadow-indigo-950/60'
              : 'bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 border border-indigo-600/40 text-white shadow-2xl shadow-slate-900/35'
            : isDarkTheme
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
            background: isHero
              ? 'linear-gradient(90deg, #6366f1, #34d399, #ec4899)'
              : `linear-gradient(90deg, transparent, ${glowColor.replace(/0\.\d+/, '0.9')}, transparent)`
          }}
        />

        {/* Full-Dimension Dynamic Wave Background Chart covering 100% of card */}
        {bgWave && (
          <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden opacity-30 group-hover:opacity-70 transition-opacity duration-500 rounded-[2rem]">
            {bgWave}
          </div>
        )}

        {/* Dedicated 3D Kinetic / Neon Thematic Animation Layer */}
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
   HELPER: EXTRACT DYNAMIC TIME/ASSET SERIES FOR SPARKLINE CHARTS
   ========================================================================= */
function extractDynamicDataSeries(
  data: any[] | undefined,
  fieldAccessor: (item: any) => number,
  sampleCount: number = 10,
  fallback: number[] = [25, 45, 30, 65, 45, 80, 60, 95]
): number[] {
  if (!data || data.length === 0) return fallback;

  const raw = data
    .map(item => fieldAccessor(item))
    .filter(v => typeof v === 'number' && !isNaN(v) && isFinite(v));

  if (raw.length === 0 || raw.every(v => v === 0)) return fallback;

  if (raw.length <= sampleCount) {
    return raw;
  }

  // Smooth uniform sampling across the dataset
  const step = (raw.length - 1) / (sampleCount - 1);
  const sampled: number[] = [];
  for (let i = 0; i < sampleCount; i++) {
    const idx = Math.round(i * step);
    sampled.push(raw[idx] || 0);
  }
  return sampled;
}

/* =========================================================================
   FULL-DIMENSION DYNAMIC SVG CHART GENERATOR (100% Bleed)
   ========================================================================= */
const FullDimensionCardWave: React.FC<{
  data: number[];
  strokeColor: string;
  fillColorStart: string;
  fillColorEnd: string;
  showPoints?: boolean;
}> = ({ data, strokeColor, fillColorStart, fillColorEnd, showPoints = true }) => {
  const validData = useMemo(() => {
    if (!data || data.length === 0) return [25, 45, 30, 65, 45, 80, 60, 95];
    const cleaned = data.map(v => (isNaN(v) || !isFinite(v) ? 0 : v));
    return cleaned.length > 0 ? cleaned : [25, 45, 30, 65, 45, 80, 60, 95];
  }, [data]);

  const min = Math.min(...validData, 0);
  const max = Math.max(...validData, 1);
  const range = max - min || 1;

  const width = 400;
  const chartHeight = 160;
  const paddingY = 24;

  const points = useMemo(() => {
    return validData.map((val, idx) => {
      const x = (idx / Math.max(validData.length - 1, 1)) * width;
      const normalizedY = (val - min) / range;
      const y = chartHeight - paddingY - normalizedY * (chartHeight - paddingY * 2);
      return { x, y, val };
    });
  }, [validData, min, range]);

  const pathD = useMemo(() => {
    return points.reduce((acc, pt, idx) => {
      if (idx === 0) return `M ${pt.x} ${pt.y}`;
      const prev = points[idx - 1];
      const cx = (prev.x + pt.x) / 2;
      return `${acc} C ${cx} ${prev.y}, ${cx} ${pt.y}, ${pt.x} ${pt.y}`;
    }, '');
  }, [points]);

  const areaD = `${pathD} L ${width} ${chartHeight} L 0 ${chartHeight} Z`;
  const gradId = `gerWaveGrad-${strokeColor.replace(/[^a-zA-Z0-9]/g, '')}-${validData.length}`;

  // Find peak point for pulsating glow marker
  const peakPoint = useMemo(() => {
    if (points.length === 0) return null;
    return points.reduce((maxPt, pt) => (pt.val > maxPt.val ? pt : maxPt), points[0]);
  }, [points]);

  return (
    <svg 
      viewBox={`0 0 ${width} ${chartHeight}`} 
      className="w-full h-full" 
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fillColorStart} stopOpacity="0.45" />
          <stop offset="60%" stopColor={fillColorEnd} stopOpacity="0.15" />
          <stop offset="100%" stopColor={fillColorEnd} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      
      {/* Background Gradient Fill Area */}
      <path d={areaD} fill={`url(#${gradId})`} />
      
      {/* Dynamic Animated Glowing Stroke Path */}
      <path 
        d={pathD} 
        fill="none" 
        stroke={strokeColor} 
        strokeWidth="2.5" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />

      {/* Dynamic Peak & Highlight Dots */}
      {showPoints && peakPoint && (
        <g>
          <circle 
            cx={peakPoint.x} 
            cy={peakPoint.y} 
            r="4.5" 
            fill={strokeColor} 
            className="animate-pulse"
          />
          <circle 
            cx={peakPoint.x} 
            cy={peakPoint.y} 
            r="8" 
            fill="none" 
            stroke={strokeColor} 
            strokeWidth="1.2" 
            strokeOpacity="0.6"
          />
        </g>
      )}
    </svg>
  );
};

/* =========================================================================
   1. CARD 1: LITRAGEM TOTAL - POSTO & BOMBA DE COMBUSTÍVEL DINÂMICA
   ========================================================================= */
const FuelPumpStationAnimation: React.FC<{ 
  isDark: boolean; 
  litros: number;
  abastecimentos?: number;
}> = ({ isDark, litros, abastecimentos = 0 }) => {
  // Format live dynamic LCD text
  const displayLitersText = useMemo(() => {
    if (litros >= 1_000_000) return `${(litros / 1_000_000).toFixed(1)}M L`;
    if (litros >= 1_000) return `${(litros / 1_000).toFixed(1)}k L`;
    return `${Math.round(litros)} L`;
  }, [litros]);

  return (
    <div className="absolute right-0 bottom-0 w-full h-full flex items-end justify-end pointer-events-none">
      <svg 
        viewBox="0 0 280 150" 
        className={cn(
          "w-60 sm:w-68 h-36 opacity-25 group-hover:opacity-60 transition-opacity duration-500 transform translate-x-3 translate-y-2",
          isDark ? "text-emerald-400" : "text-emerald-600"
        )}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="pumpBodyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={isDark ? "#34d399" : "#059669"} stopOpacity="0.8" />
            <stop offset="100%" stopColor={isDark ? "#065f46" : "#047857"} stopOpacity="0.4" />
          </linearGradient>
          <linearGradient id="fuelLiquidGrad" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#6ee7b7" stopOpacity="0.4" />
          </linearGradient>
        </defs>

        {/* Animated Fuel Droplets Falling into Flow */}
        <motion.g
          animate={{ y: [-15, 60], opacity: [0, 1, 0] }}
          transition={{ repeat: Infinity, duration: 1.6, ease: "easeIn" }}
        >
          <circle cx="230" cy="50" r="3" fill="#10b981" />
          <path d="M 230 47 C 228 50, 232 50, 230 47 Z" fill="#10b981" />
        </motion.g>
        <motion.g
          animate={{ y: [-10, 55], opacity: [0, 1, 0] }}
          transition={{ repeat: Infinity, duration: 2.1, delay: 0.6, ease: "easeIn" }}
        >
          <circle cx="218" cy="65" r="2.5" fill="#34d399" />
        </motion.g>

        {/* Fuel Station Canopy Roof */}
        <path d="M 120 28 L 260 28 L 250 36 L 130 36 Z" fill="currentColor" opacity="0.35" />
        <rect x="185" y="36" width="6" height="85" fill="currentColor" opacity="0.25" />

        {/* 3D Modern Fuel Dispenser Unit */}
        <rect x="135" y="45" width="46" height="76" rx="6" fill="url(#pumpBodyGrad)" stroke="currentColor" strokeWidth="1.8" />
        
        {/* Digital Fuel Counter Display */}
        <rect x="141" y="53" width="34" height="20" rx="3" fill="#022c22" stroke="#10b981" strokeWidth="0.8" />
        <motion.text 
          x="158" 
          y="66" 
          fill="#34d399" 
          fontSize="6.5" 
          fontWeight="900" 
          textAnchor="middle" 
          fontFamily="monospace"
          animate={{ opacity: [0.75, 1, 0.75] }}
          transition={{ repeat: Infinity, duration: 1.2 }}
        >
          {displayLitersText}
        </motion.text>

        {/* Animated Fuel Level Tank Inside Dispenser */}
        <rect x="142" y="78" width="32" height="36" rx="2" fill="#064e3b" opacity="0.6" />
        <motion.rect 
          x="142" 
          y="88" 
          width="32" 
          height="26" 
          rx="2" 
          fill="url(#fuelLiquidGrad)"
          animate={{ height: [22, 28, 22], y: [92, 86, 92] }}
          transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
        />

        {/* Dispenser Hose & Nozzle */}
        <path 
          d="M 181 60 C 205 60, 215 90, 205 110 C 200 118, 185 118, 182 105" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2.5" 
          strokeLinecap="round" 
        />
        {/* Nozzle Gun */}
        <path d="M 182 105 L 180 96 L 175 96 L 175 102 Z" fill="#10b981" />

        {/* Ground Station Platform */}
        <ellipse cx="190" cy="125" rx="75" ry="12" fill="currentColor" opacity="0.12" />
      </svg>
    </div>
  );
};

/* =========================================================================
   2. CARD 2: CUSTO COMBUSTÍVEL - CIFRÕES & MOEDAS DINÂMICAS NEON
   ========================================================================= */
const DollarMoneyStreamAnimation: React.FC<{ 
  isDark: boolean; 
  valorFuel: number; 
}> = ({ isDark, valorFuel }) => {
  return (
    <div className="absolute right-0 bottom-0 w-full h-full flex items-end justify-end pointer-events-none">
      <svg 
        viewBox="0 0 280 150" 
        className={cn(
          "w-60 sm:w-68 h-36 opacity-25 group-hover:opacity-60 transition-opacity duration-500 transform translate-x-3 translate-y-2",
          isDark ? "text-teal-400" : "text-teal-600"
        )}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="coinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={isDark ? "#2dd4bf" : "#0d9488"} />
            <stop offset="100%" stopColor={isDark ? "#0f766e" : "#115e59"} />
          </linearGradient>
        </defs>

        {/* Rising Holographic Dollar / Currency Signs */}
        <motion.g
          animate={{ y: [20, -50], opacity: [0, 1, 0], scale: [0.8, 1.1, 0.9] }}
          transition={{ repeat: Infinity, duration: 3.2, ease: "easeOut" }}
          transform="translate(160, 80)"
        >
          <text x="0" y="0" fill={isDark ? "#2dd4bf" : "#0d9488"} fontSize="19" fontWeight="900" fontFamily="sans-serif">
            R$
          </text>
        </motion.g>

        <motion.g
          animate={{ y: [30, -45], opacity: [0, 0.9, 0], scale: [0.7, 1.15, 0.8] }}
          transition={{ repeat: Infinity, duration: 3.8, delay: 1.2, ease: "easeOut" }}
          transform="translate(210, 95)"
        >
          <text x="0" y="0" fill={isDark ? "#5eead4" : "#14b8a6"} fontSize="16" fontWeight="900" fontFamily="sans-serif">
            $
          </text>
        </motion.g>

        <motion.g
          animate={{ y: [25, -40], opacity: [0, 0.85, 0], scale: [0.6, 1, 0.7] }}
          transition={{ repeat: Infinity, duration: 2.8, delay: 1.9, ease: "easeOut" }}
          transform="translate(130, 90)"
        >
          <text x="0" y="0" fill={isDark ? "#99f6e4" : "#0f766e"} fontSize="14" fontWeight="800" fontFamily="sans-serif">
            R$
          </text>
        </motion.g>

        {/* 3D Stacked Golden/Teal Money Vault Coins */}
        <g transform="translate(180, 85)">
          <ellipse cx="0" cy="20" rx="22" ry="7" fill="url(#coinGrad)" stroke="currentColor" strokeWidth="1.2" />
          <ellipse cx="0" cy="15" rx="22" ry="7" fill="url(#coinGrad)" stroke="currentColor" strokeWidth="1.2" />
          <ellipse cx="0" cy="10" rx="22" ry="7" fill="url(#coinGrad)" stroke="currentColor" strokeWidth="1.2" />
          <ellipse cx="0" cy="5" rx="22" ry="7" fill="url(#coinGrad)" stroke="currentColor" strokeWidth="1.2" />
          
          {/* Top Coin Glowing Face */}
          <ellipse cx="0" cy="0" rx="22" ry="7" fill={isDark ? "#5eead4" : "#2dd4bf"} stroke="#ffffff" strokeWidth="1.2" />
          <text x="0" y="2.5" fill="#042f2e" fontSize="7" fontWeight="900" textAnchor="middle">
            R$
          </text>
        </g>

        {/* Rotating Sparkles around Money */}
        <motion.g
          animate={{ rotate: [0, 360], scale: [0.9, 1.2, 0.9] }}
          transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
          transform="translate(225, 45)"
        >
          <path d="M 0 -7 L 2 -2 L 7 0 L 2 2 L 0 7 L -2 2 L -7 0 L -2 -2 Z" fill="#2dd4bf" />
        </motion.g>
      </svg>
    </div>
  );
};

/* =========================================================================
   3. CARD 3: MÉDIA DE CONSUMO - TACÔMETRO DINÂMICO & GAUGE DE KM/L
   ========================================================================= */
const EcoFuelGaugeAnimation: React.FC<{ 
  isDark: boolean;
  avgKml: number;
  targetKml?: number;
}> = ({ isDark, avgKml, targetKml = 3.0 }) => {
  // Dynamically calculate accurate gauge needle rotation based on actual avgKml
  // Range: 0 to 5.0 km/l maps into -55deg to +55deg
  const targetNeedleAngle = useMemo(() => {
    if (!avgKml || avgKml <= 0) return -45;
    const clamped = Math.max(0.5, Math.min(5.0, avgKml));
    // When clamped = 1.0 -> -45deg, when clamped = 3.0 (meta) -> +10deg, when clamped = 4.5 -> +45deg
    return ((clamped - 1.0) / 4.0) * 90 - 45;
  }, [avgKml]);

  const isAboveTarget = avgKml >= targetKml;

  return (
    <div className="absolute right-0 bottom-0 w-full h-full flex items-end justify-end pointer-events-none">
      <svg 
        viewBox="0 0 280 150" 
        className={cn(
          "w-60 sm:w-68 h-36 opacity-25 group-hover:opacity-60 transition-opacity duration-500 transform translate-x-3 translate-y-2",
          isDark ? "text-violet-400" : "text-violet-600"
        )}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="gaugeArcGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="35%" stopColor="#f59e0b" />
            <stop offset="75%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#06b6d4" />
          </linearGradient>
        </defs>

        <g transform="translate(190, 95)">
          {/* Outer Gauge Ring */}
          <circle cx="0" cy="0" r="48" stroke="currentColor" strokeWidth="1" strokeDasharray="4 4" opacity="0.3" />
          
          {/* Speed / Efficiency Arc */}
          <path 
            d="M -42 0 A 42 42 0 1 1 42 0" 
            fill="none" 
            stroke="url(#gaugeArcGrad)" 
            strokeWidth="5" 
            strokeLinecap="round" 
          />

          {/* Tick marks */}
          <line x1="-36" y1="-6" x2="-30" y2="-6" stroke="currentColor" strokeWidth="1.5" />
          <line x1="-24" y1="-28" x2="-20" y2="-23" stroke="currentColor" strokeWidth="1.5" />
          <line x1="0" y1="-38" x2="0" y2="-32" stroke="#10b981" strokeWidth="2.5" />
          <line x1="24" y1="-28" x2="20" y2="-23" stroke="currentColor" strokeWidth="1.5" />
          <line x1="36" y1="-6" x2="30" y2="-6" stroke="currentColor" strokeWidth="1.5" />

          {/* Center Hub */}
          <circle cx="0" cy="0" r="9" fill="#0f172a" stroke={isDark ? "#a78bfa" : "#7c3aed"} strokeWidth="2" />
          <circle cx="0" cy="0" r="4" fill={isAboveTarget ? "#34d399" : "#a78bfa"} />

          {/* Dynamic Gauge Needle with Organic Spring Oscillator */}
          <motion.g
            animate={{ 
              rotate: [
                targetNeedleAngle - 4, 
                targetNeedleAngle + 4, 
                targetNeedleAngle - 2, 
                targetNeedleAngle + 3, 
                targetNeedleAngle - 4
              ] 
            }}
            transition={{ repeat: Infinity, duration: 4.5, ease: "easeInOut" }}
          >
            <path d="M -3 0 L 0 -40 L 3 0 Z" fill={isDark ? "#c084fc" : "#8b5cf6"} />
            <circle cx="0" cy="-40" r="2.5" fill="#ffffff" />
          </motion.g>

          {/* Dynamic ECO Status Indicator */}
          <motion.g
            animate={{ scale: [0.9, 1.15, 0.9], opacity: [0.7, 1, 0.7] }}
            transition={{ repeat: Infinity, duration: 2 }}
            transform="translate(0, 18)"
          >
            <path 
              d="M 0 -8 C -4 0, -4 4, 0 8 C 4 4, 4 0, 0 -8 Z" 
              fill={isAboveTarget ? "#10b981" : "#f59e0b"} 
            />
          </motion.g>
        </g>
      </svg>
    </div>
  );
};

/* =========================================================================
   4. CARD 4: DISTÂNCIA TOTAL / KM PRODUTIVO - FROTA EM VELOCIDADE
   ========================================================================= */
const HighwayFleetAnimation: React.FC<{ 
  isDark: boolean;
  kmProdutivo: number;
}> = ({ isDark, kmProdutivo }) => {
  return (
    <div className="absolute right-0 bottom-0 w-full h-full flex items-end justify-end pointer-events-none">
      <svg 
        viewBox="0 0 280 150" 
        className={cn(
          "w-60 sm:w-68 h-36 opacity-25 group-hover:opacity-60 transition-opacity duration-500 transform translate-x-3 translate-y-2",
          isDark ? "text-blue-400" : "text-blue-600"
        )}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="fleetBusGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={isDark ? "#38bdf8" : "#2563eb"} stopOpacity="0.3" />
            <stop offset="50%" stopColor={isDark ? "#06b6d4" : "#3b82f6"} stopOpacity="0.7" />
            <stop offset="100%" stopColor={isDark ? "#60a5fa" : "#1d4ed8"} stopOpacity="0.95" />
          </linearGradient>
        </defs>

        {/* Speed & Highway Road Stripes */}
        <motion.g
          animate={{ x: [0, -40] }}
          transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
        >
          <line x1="270" y1="120" x2="220" y2="120" stroke="currentColor" strokeWidth="2.5" strokeDasharray="10 14" opacity="0.6" />
          <line x1="260" y1="45" x2="200" y2="45" stroke="currentColor" strokeWidth="1.2" strokeDasharray="6 8" opacity="0.4" />
          <line x1="275" y1="65" x2="215" y2="65" stroke="currentColor" strokeWidth="1.5" strokeDasharray="8 10" opacity="0.5" />
        </motion.g>

        {/* Cruising Modern Coach Bus */}
        <motion.g
          animate={{ y: [0, -2, 0, -1.5, 0], x: [0, 2, 0, -1, 0] }}
          transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
        >
          {/* Main Bus Body */}
          <path
            d="M 60 48 
               C 60 42, 66 38, 74 38 
               L 200 38 
               C 215 38, 226 44, 230 56 
               L 235 84 
               C 237 90, 233 96, 226 96 
               L 66 96 
               C 60 96, 56 92, 56 86 
               L 56 54 
               C 56 50, 58 48, 60 48 Z"
            fill="url(#fleetBusGrad)"
            stroke="currentColor"
            strokeWidth="1.8"
          />

          {/* Panoramic Windows */}
          <rect x="72" y="44" width="24" height="18" rx="2" fill={isDark ? "#bae6fd" : "#e0f2fe"} opacity="0.75" />
          <rect x="102" y="44" width="24" height="18" rx="2" fill={isDark ? "#bae6fd" : "#e0f2fe"} opacity="0.75" />
          <rect x="132" y="44" width="24" height="18" rx="2" fill={isDark ? "#bae6fd" : "#e0f2fe"} opacity="0.75" />
          <path d="M 162 44 L 210 44 C 218 48, 220 54, 220 62 L 162 62 Z" fill={isDark ? "#bae6fd" : "#e0f2fe"} opacity="0.8" />

          {/* LED Headlights */}
          <polygon points="228,72 234,74 231,78 226,77" fill="#38bdf8" />

          {/* Spinning Wheels */}
          <g transform="translate(94, 96)">
            <circle cx="0" cy="0" r="10" fill="#0f172a" stroke="currentColor" strokeWidth="1.5" />
            <motion.circle cx="0" cy="0" r="5" fill="#38bdf8" animate={{ rotate: [0, 360] }} transition={{ repeat: Infinity, duration: 0.6, ease: "linear" }} />
          </g>
          <g transform="translate(196, 96)">
            <circle cx="0" cy="0" r="10" fill="#0f172a" stroke="currentColor" strokeWidth="1.5" />
            <motion.circle cx="0" cy="0" r="5" fill="#38bdf8" animate={{ rotate: [0, 360] }} transition={{ repeat: Infinity, duration: 0.6, ease: "linear" }} />
          </g>
        </motion.g>
      </svg>
    </div>
  );
};

/* =========================================================================
   5. CARD 5: CUSTO EM ESTOQUE - ALMOXARIFADO & ENGRENAGENS DINÂMICAS
   ========================================================================= */
const WarehouseStockAnimation: React.FC<{ 
  isDark: boolean;
  estoqueTotal: number;
  estoquePct: number;
}> = ({ isDark, estoqueTotal, estoquePct }) => {
  return (
    <div className="absolute right-0 bottom-0 w-full h-full flex items-end justify-end pointer-events-none">
      <svg 
        viewBox="0 0 280 150" 
        className={cn(
          "w-60 sm:w-68 h-36 opacity-25 group-hover:opacity-60 transition-opacity duration-500 transform translate-x-3 translate-y-2",
          isDark ? "text-emerald-400" : "text-emerald-600"
        )}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="boxGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={isDark ? "#34d399" : "#059669"} stopOpacity="0.8" />
            <stop offset="100%" stopColor={isDark ? "#065f46" : "#047857"} stopOpacity="0.4" />
          </linearGradient>
        </defs>

        {/* Rotating 3D Neon Industrial Gears */}
        <g transform="translate(155, 60)">
          <motion.g
            animate={{ rotate: [0, 360] }}
            transition={{ repeat: Infinity, duration: 8, ease: "linear" }}
          >
            <circle cx="0" cy="0" r="22" stroke="currentColor" strokeWidth="2.5" fill="none" strokeDasharray="8 4" />
            <circle cx="0" cy="0" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
            <line x1="-22" y1="0" x2="22" y2="0" stroke="currentColor" strokeWidth="2" />
            <line x1="0" y1="-22" x2="0" y2="22" stroke="currentColor" strokeWidth="2" />
          </motion.g>
        </g>

        <g transform="translate(195, 45)">
          <motion.g
            animate={{ rotate: [360, 0] }}
            transition={{ repeat: Infinity, duration: 6, ease: "linear" }}
          >
            <circle cx="0" cy="0" r="16" stroke={isDark ? "#6ee7b7" : "#10b981"} strokeWidth="2" fill="none" strokeDasharray="6 3" />
            <circle cx="0" cy="0" r="7" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </motion.g>
        </g>

        {/* 3D Stacked Warehouse Parts & Inventory Pallets */}
        <g transform="translate(170, 75)">
          <path d="M 0 15 L 25 2 L 50 15 L 25 28 Z" fill="url(#boxGrad)" stroke="currentColor" strokeWidth="1" />
          <path d="M 0 15 L 25 28 L 25 46 L 0 33 Z" fill="currentColor" opacity="0.4" stroke="currentColor" strokeWidth="1" />
          <path d="M 50 15 L 25 28 L 25 46 L 50 33 Z" fill="currentColor" opacity="0.6" stroke="currentColor" strokeWidth="1" />

          {/* Isometric Box 2 on top */}
          <g transform="translate(10, -18)">
            <path d="M 0 12 L 18 2 L 36 12 L 18 22 Z" fill={isDark ? "#6ee7b7" : "#34d399"} opacity="0.8" stroke="#ffffff" strokeWidth="0.8" />
            <path d="M 0 12 L 18 22 L 18 36 L 0 26 Z" fill="currentColor" opacity="0.5" stroke="currentColor" strokeWidth="0.8" />
            <path d="M 36 12 L 18 22 L 18 36 L 36 26 Z" fill="currentColor" opacity="0.7" stroke="currentColor" strokeWidth="0.8" />
          </g>
        </g>
      </svg>
    </div>
  );
};

/* =========================================================================
   6. CARD 6: CUSTO NF AVULSO - NOTA FISCAL & SCANNER LASER DINÂMICO
   ========================================================================= */
const InvoiceScannerAnimation: React.FC<{ 
  isDark: boolean;
  avulsoTotal: number;
  avulsoPct: number;
}> = ({ isDark, avulsoTotal, avulsoPct }) => {
  return (
    <div className="absolute right-0 bottom-0 w-full h-full flex items-end justify-end pointer-events-none">
      <svg 
        viewBox="0 0 280 150" 
        className={cn(
          "w-60 sm:w-68 h-36 opacity-25 group-hover:opacity-60 transition-opacity duration-500 transform translate-x-3 translate-y-2",
          isDark ? "text-indigo-400" : "text-indigo-600"
        )}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="invGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={isDark ? "#818cf8" : "#4f46e5"} stopOpacity="0.7" />
            <stop offset="100%" stopColor={isDark ? "#312e81" : "#3730a3"} stopOpacity="0.3" />
          </linearGradient>
        </defs>

        <g transform="translate(170, 35)">
          {/* Holographic Invoice Document */}
          <rect x="0" y="0" width="56" height="78" rx="4" fill="url(#invGrad)" stroke="currentColor" strokeWidth="1.5" />
          
          {/* Folded Top Corner */}
          <polygon points="42,0 56,14 42,14" fill={isDark ? "#a5b4fc" : "#6366f1"} />

          {/* Invoice Rows / Data Lines */}
          <line x1="8" y1="20" x2="36" y2="20" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="8" y1="30" x2="48" y2="30" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
          <line x1="8" y1="38" x2="44" y2="38" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
          <line x1="8" y1="46" x2="40" y2="46" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.6" />
          <line x1="8" y1="56" x2="28" y2="56" stroke="#10b981" strokeWidth="2" strokeLinecap="round" />
          <line x1="34" y1="56" x2="48" y2="56" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" />

          {/* Stamp / Badge of Approval with dynamic % */}
          <circle cx="38" cy="65" r="7" stroke="#10b981" strokeWidth="1.2" strokeDasharray="3 2" />
          <path d="M 35 65 L 37 67 L 42 62" stroke="#10b981" strokeWidth="1.2" strokeLinecap="round" />

          {/* Animated Laser Scanner Beam */}
          <motion.g
            animate={{ y: [5, 70, 5] }}
            transition={{ repeat: Infinity, duration: 2.8, ease: "easeInOut" }}
          >
            <line x1="-6" y1="0" x2="62" y2="0" stroke={isDark ? "#38bdf8" : "#0284c7"} strokeWidth="2" />
            <line x1="-2" y1="0" x2="58" y2="0" stroke="#ffffff" strokeWidth="1" />
          </motion.g>
        </g>
      </svg>
    </div>
  );
};

/* =========================================================================
   7. CARD 7: CUSTO MANUTENÇÃO TOTAL - OFICINA & FERRAMENTAS DINÂMICAS
   ========================================================================= */
const MaintenanceToolsAnimation: React.FC<{ 
  isDark: boolean;
  totalMaint: number;
}> = ({ isDark, totalMaint }) => {
  return (
    <div className="absolute right-0 bottom-0 w-full h-full flex items-end justify-end pointer-events-none">
      <svg 
        viewBox="0 0 280 150" 
        className={cn(
          "w-60 sm:w-68 h-36 opacity-25 group-hover:opacity-60 transition-opacity duration-500 transform translate-x-3 translate-y-2",
          isDark ? "text-rose-400" : "text-rose-600"
        )}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Pulsing Warning / Maintenance Radar Rings */}
        <g transform="translate(195, 70)">
          <motion.circle 
            cx="0" 
            cy="0" 
            r="32" 
            stroke="currentColor" 
            strokeWidth="1" 
            strokeDasharray="4 6" 
            animate={{ scale: [0.8, 1.25, 0.8], opacity: [0.2, 0.6, 0.2] }}
            transition={{ repeat: Infinity, duration: 2.5, ease: "easeInOut" }}
          />

          {/* Crossed Wrench 1 */}
          <motion.g
            animate={{ rotate: [-45, -35, -45] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
          >
            <path
              d="M -5 -28 C -12 -25, -12 -15, -5 -12 L 5 18 C 8 25, 18 25, 20 18 L 10 -12 C 15 -15, 15 -25, 5 -28 Z"
              fill={isDark ? "#fb7185" : "#e11d48"}
              stroke="#ffffff"
              strokeWidth="1.2"
            />
          </motion.g>

          {/* Crossed Wrench 2 */}
          <motion.g
            animate={{ rotate: [45, 35, 45] }}
            transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
          >
            <path
              d="M -5 -28 C -12 -25, -12 -15, -5 -12 L 5 18 C 8 25, 18 25, 20 18 L 10 -12 C 15 -15, 15 -25, 5 -28 Z"
              fill={isDark ? "#f43f5e" : "#be123c"}
              stroke="#ffffff"
              strokeWidth="1.2"
            />
          </motion.g>

          {/* Center Electric Bolt / Maintenance Spark */}
          <circle cx="0" cy="0" r="10" fill="#0f172a" stroke="currentColor" strokeWidth="1.5" />
          <path d="M 1 -6 L -3 1 L 0 1 L -1 6 L 4 -1 L 1 -1 Z" fill="#fb7185" />
        </g>
      </svg>
    </div>
  );
};

/* =========================================================================
   8. CARD 8: HERO 3D CARD - INVESTIMENTO TOTAL & COLUNAS DINÂMICAS PROPORCIONAIS
   ========================================================================= */
const HeroTotalInvestmentAnimation: React.FC<{ 
  isDark: boolean;
  totalGeral: number;
  valorFuel: number;
  estoqueTotal: number;
  avulsoTotal: number;
}> = ({ isDark, totalGeral, valorFuel, estoqueTotal, avulsoTotal }) => {
  // Compute real dynamic heights proportional to financial distribution
  const safeTotal = totalGeral > 0 ? totalGeral : 1;
  const fuelPct = Math.max(15, Math.min(80, (valorFuel / safeTotal) * 75));
  const estoquePct = Math.max(12, Math.min(65, (estoqueTotal / safeTotal) * 75));
  const avulsoPct = Math.max(15, Math.min(75, (avulsoTotal / safeTotal) * 75));

  return (
    <div className="absolute right-0 bottom-0 w-full h-full flex items-end justify-end pointer-events-none">
      <svg 
        viewBox="0 0 280 150" 
        className="w-60 sm:w-72 h-38 opacity-30 group-hover:opacity-65 transition-opacity duration-500 transform translate-x-4 translate-y-2 text-emerald-400"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="heroBarGrad1" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#10b981" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#34d399" stopOpacity="0.95" />
          </linearGradient>
          <linearGradient id="heroBarGrad2" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.95" />
          </linearGradient>
          <linearGradient id="heroBarGrad3" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#6366f1" stopOpacity="0.2" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0.95" />
          </linearGradient>
        </defs>

        {/* Concentric Energy Rings */}
        <motion.circle 
          cx="210" 
          cy="70" 
          r="45" 
          stroke="#10b981" 
          strokeWidth="1.2" 
          strokeDasharray="6 6"
          animate={{ rotate: [0, 360] }}
          transition={{ repeat: Infinity, duration: 14, ease: "linear" }}
        />

        {/* 3D Holographic Growth Bars with Proportional Real Heights */}
        <g transform="translate(150, 40)">
          {/* Bar 1: Combustível */}
          <motion.rect 
            x="0" 
            y={80 - fuelPct} 
            width="14" 
            height={fuelPct} 
            rx="3" 
            fill="url(#heroBarGrad1)"
            animate={{ 
              height: [fuelPct - 4, fuelPct + 4, fuelPct - 4], 
              y: [80 - fuelPct + 4, 80 - fuelPct - 4, 80 - fuelPct + 4] 
            }}
            transition={{ repeat: Infinity, duration: 2.6, ease: "easeInOut" }}
          />

          {/* Bar 2: Estoque */}
          <motion.rect 
            x="20" 
            y={80 - estoquePct} 
            width="14" 
            height={estoquePct} 
            rx="3" 
            fill="url(#heroBarGrad2)"
            animate={{ 
              height: [estoquePct - 3, estoquePct + 3, estoquePct - 3], 
              y: [80 - estoquePct + 3, 80 - estoquePct - 3, 80 - estoquePct + 3] 
            }}
            transition={{ repeat: Infinity, duration: 2.2, delay: 0.3, ease: "easeInOut" }}
          />

          {/* Bar 3: Avulso */}
          <motion.rect 
            x="40" 
            y={80 - avulsoPct} 
            width="14" 
            height={avulsoPct} 
            rx="3" 
            fill="url(#heroBarGrad3)"
            animate={{ 
              height: [avulsoPct - 4, avulsoPct + 4, avulsoPct - 4], 
              y: [80 - avulsoPct + 4, 80 - avulsoPct - 4, 80 - avulsoPct + 4] 
            }}
            transition={{ repeat: Infinity, duration: 2.9, delay: 0.6, ease: "easeInOut" }}
          />

          {/* Connecting Neon Trend Arrow */}
          <motion.path 
            d="M 7 40 L 27 20 L 47 5 L 56 12 M 47 5 L 47 18" 
            stroke="#34d399" 
            strokeWidth="2.5" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            animate={{ opacity: [0.7, 1, 0.7] }}
            transition={{ repeat: Infinity, duration: 1.5 }}
          />
        </g>
      </svg>
    </div>
  );
};

/* =========================================================================
   MAIN EXPORT COMPONENT: RESUMO GERENCIAL KPI CARDS 3D NEON COM GRÁFICOS DINÂMICOS
   ========================================================================= */
export const ResumoGerencialKpiCards: React.FC<ResumoGerencialKpiCardsProps> = ({
  summaryTotals,
  avgMethod,
  setAvgMethod,
  appTheme = 'light',
  summaryData = [],
  targetKml = 3.0,
}) => {
  const isDark = appTheme === 'dark-neon';

  const estoqueMaintPct = summaryTotals.totalMaint > 0
    ? ((summaryTotals.estoqueTotal / summaryTotals.totalMaint) * 100).toFixed(1)
    : '0.0';

  const avulsoMaintPct = summaryTotals.totalMaint > 0
    ? ((summaryTotals.avulsoTotal / summaryTotals.totalMaint) * 100).toFixed(1)
    : '0.0';

  // 1. Dynamic series for Card 1 (Litragem)
  const litragemSeries = useMemo(() => {
    return extractDynamicDataSeries(
      summaryData,
      item => item.litros || item.LITROS || 0,
      12,
      [20, 35, 25, 55, 45, 75, 60, 95]
    );
  }, [summaryData]);

  // 2. Dynamic series for Card 2 (Valor Combustível)
  const valorFuelSeries = useMemo(() => {
    return extractDynamicDataSeries(
      summaryData,
      item => item.valor || item.VALOR || item.valorFuel || 0,
      12,
      [30, 45, 35, 70, 50, 85, 70, 100]
    );
  }, [summaryData]);

  // 3. Dynamic series for Card 3 (Média KM/L)
  const kmlSeries = useMemo(() => {
    return extractDynamicDataSeries(
      summaryData,
      item => {
        const v = item.kml || item.KML || (item.kmProdutivo && item.litros ? item.kmProdutivo / item.litros : 0);
        return v > 0 && v < 15 ? v : 0;
      },
      12,
      [40, 60, 50, 75, 65, 85, 75, 90]
    );
  }, [summaryData]);

  // 4. Dynamic series for Card 4 (KM Produtivo)
  const kmProdutivoSeries = useMemo(() => {
    return extractDynamicDataSeries(
      summaryData,
      item => item.kmProdutivo || item.KM || item.km || 0,
      12,
      [25, 45, 40, 70, 60, 85, 75, 100]
    );
  }, [summaryData]);

  // 5. Dynamic series for Card 5 (Estoque)
  const estoqueSeries = useMemo(() => {
    return extractDynamicDataSeries(
      summaryData,
      item => item.estoqueTotal || item.ESTOQUE || 0,
      12,
      [35, 50, 45, 65, 55, 80, 70, 85]
    );
  }, [summaryData]);

  // 6. Dynamic series for Card 6 (Avulso)
  const avulsoSeries = useMemo(() => {
    return extractDynamicDataSeries(
      summaryData,
      item => item.avulsoTotal || item.AVULSO || 0,
      12,
      [25, 40, 35, 60, 50, 80, 65, 95]
    );
  }, [summaryData]);

  // 7. Dynamic series for Card 7 (Total Manutenção)
  const maintSeries = useMemo(() => {
    return extractDynamicDataSeries(
      summaryData,
      item => item.totalMaint || (item.estoqueTotal || 0) + (item.avulsoTotal || 0),
      12,
      [30, 45, 40, 65, 55, 85, 75, 100]
    );
  }, [summaryData]);

  // 8. Dynamic series for Card 8 (Total Geral / Consolidado)
  const totalGeralSeries = useMemo(() => {
    return extractDynamicDataSeries(
      summaryData,
      item => (item.valor || 0) + (item.totalMaint || 0),
      12,
      [35, 55, 45, 80, 65, 95, 85, 110]
    );
  }, [summaryData]);

  return (
    <div id="gerencial-kpis" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-7">
      
      {/* --------------------------------------------------------------------
          Card 1: Total Abastecimento / Litragem (Posto & Bomba Dinâmica)
          -------------------------------------------------------------------- */}
      <Interactive3DCard 
        index={0}
        isDarkTheme={isDark}
        glowColor="rgba(16, 185, 129, 0.25)"
        backgroundAnimation={
          <FuelPumpStationAnimation 
            isDark={isDark} 
            litros={summaryTotals.litros} 
            abastecimentos={summaryTotals.fuelRecordCount}
          />
        }
        bgWave={
          <FullDimensionCardWave 
            data={litragemSeries} 
            strokeColor="#10b981" 
            fillColorStart="#10b981" 
            fillColorEnd="#047857" 
          />
        }
      >
        <div className="flex items-center justify-between mb-4">
          <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shadow-md transition-all duration-300 transform group-hover:scale-110 ${
            isDark 
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-emerald-950/40' 
              : 'bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-emerald-100'
          }`}>
            <Fuel size={22} className="sm:size-[24px]" />
          </div>
          <span className={`px-3 py-1 text-[9px] sm:text-[10px] font-black rounded-full uppercase tracking-wider border shadow-xs flex items-center gap-1.5 ${
            isDark
              ? 'bg-emerald-950/70 text-emerald-300 border-emerald-800'
              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
          }`}>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Litragem Total
          </span>
        </div>
        <div>
          <p className={`font-black uppercase tracking-wider text-[9px] sm:text-[10px] mb-2 font-sans ${
            isDark ? 'text-slate-400' : 'text-slate-600'
          }`}>
            Total Abastecimento / Litragem
          </p>
          <h4 
            className={`text-base sm:text-lg md:text-xl font-black tracking-tight flex flex-wrap items-baseline gap-1.5 ${
              isDark ? 'text-white' : 'text-slate-950'
            }`} 
            title={`${summaryTotals.litros.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} Litros`}
          >
            {summaryTotals.litros.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
            <span className={`text-xs font-extrabold uppercase tracking-tight ${
              isDark ? 'text-emerald-400' : 'text-emerald-700'
            }`}>
              LITROS
            </span>
          </h4>
          <p className={`text-[10px] font-bold uppercase tracking-tight mt-1 flex items-center gap-1.5 ${
            isDark ? 'text-slate-400' : 'text-slate-600'
          }`}>
            <span className="font-extrabold font-mono">{summaryTotals.fuelRecordCount || 0}</span> Abastecimentos
          </p>
        </div>
      </Interactive3DCard>

      {/* --------------------------------------------------------------------
          Card 2: Total Combustível (Cifrões & Moedas Dinâmicas)
          -------------------------------------------------------------------- */}
      <Interactive3DCard 
        index={1}
        isDarkTheme={isDark}
        glowColor="rgba(20, 184, 166, 0.25)"
        backgroundAnimation={
          <DollarMoneyStreamAnimation 
            isDark={isDark} 
            valorFuel={summaryTotals.valorFuel}
          />
        }
        bgWave={
          <FullDimensionCardWave 
            data={valorFuelSeries} 
            strokeColor="#14b8a6" 
            fillColorStart="#14b8a6" 
            fillColorEnd="#0f766e" 
          />
        }
      >
        <div className="flex items-center justify-between mb-4">
          <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shadow-md transition-all duration-300 ${
            isDark 
              ? 'bg-teal-500/15 text-teal-400 border border-teal-500/30 shadow-teal-950/40' 
              : 'bg-teal-50 text-teal-600 border border-teal-100 shadow-teal-100'
          }`}>
            <DollarSign size={22} className="sm:size-[24px]" />
          </div>
          <span className={`px-3 py-1 text-[9px] sm:text-[10px] font-black rounded-full uppercase tracking-wider border shadow-xs ${
            isDark
              ? 'bg-teal-950/70 text-teal-300 border-teal-800'
              : 'bg-teal-50 text-teal-700 border-teal-200'
          }`}>
            Custo Combustível
          </span>
        </div>
        <div>
          <p className={`font-black uppercase tracking-wider text-[9px] sm:text-[10px] mb-2 font-sans ${
            isDark ? 'text-slate-400' : 'text-slate-600'
          }`}>
            Total Combustível
          </p>
          <h4 
            className={`text-base sm:text-lg md:text-xl font-black tracking-tight flex flex-wrap items-baseline gap-1 font-mono ${
              isDark ? 'text-white' : 'text-slate-950'
            }`} 
            title={summaryTotals.valorFuel.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          >
            {summaryTotals.valorFuel.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </h4>
          <p className={`text-[10px] font-bold uppercase tracking-tight mt-1 ${
            isDark ? 'text-slate-400' : 'text-slate-600'
          }`}>
            Valor Total Abastecido
          </p>
        </div>
      </Interactive3DCard>

      {/* --------------------------------------------------------------------
          Card 3: Média de Consumo (Tacômetro Dinâmico & Medidor Eco KM/L)
          -------------------------------------------------------------------- */}
      <Interactive3DCard 
        index={2}
        isDarkTheme={isDark}
        glowColor="rgba(139, 92, 246, 0.25)"
        backgroundAnimation={
          <EcoFuelGaugeAnimation 
            isDark={isDark} 
            avgKml={summaryTotals.avgKml}
            targetKml={targetKml}
          />
        }
        bgWave={
          <FullDimensionCardWave 
            data={kmlSeries} 
            strokeColor="#8b5cf6" 
            fillColorStart="#8b5cf6" 
            fillColorEnd="#5b21b6" 
          />
        }
      >
        <div className="flex items-center justify-between mb-4">
          <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shadow-md transition-all duration-300 ${
            isDark 
              ? 'bg-violet-500/15 text-violet-400 border border-violet-500/30 shadow-violet-950/40' 
              : 'bg-violet-50 text-violet-600 border border-violet-100 shadow-violet-100'
          }`}>
            <Gauge size={22} className="sm:size-[24px]" />
          </div>
          <span className={`px-3 py-1 text-[9px] sm:text-[10px] font-black rounded-full uppercase tracking-wider border shadow-xs ${
            isDark
              ? 'bg-violet-950/70 text-violet-300 border-violet-800'
              : 'bg-violet-50 text-violet-700 border-violet-200'
          }`}>
            Consumo Médio
          </span>
        </div>
        <div>
          <p className={`font-black uppercase tracking-wider text-[9px] sm:text-[10px] mb-2 font-sans ${
            isDark ? 'text-slate-400' : 'text-slate-600'
          }`}>
            Média de Consumo
          </p>
          <h4 className={`text-base sm:text-lg md:text-xl font-black tracking-tight flex flex-wrap items-baseline gap-1.5 ${
            isDark ? 'text-white' : 'text-slate-950'
          }`}>
            {(summaryTotals.avgKml || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} 
            <span className={`text-xs font-extrabold uppercase tracking-tight ${
              isDark ? 'text-violet-400' : 'text-violet-700'
            }`}>
              KM/L
            </span>
          </h4>
          <button 
            type="button"
            onClick={() => setAvgMethod(avgMethod === 'simple' ? 'weighted' : 'simple')}
            className={`text-[10px] font-bold uppercase tracking-tight mt-1.5 flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all cursor-pointer shadow-2xs ${
              isDark
                ? 'bg-violet-950/60 hover:bg-violet-900/80 text-violet-300 border-violet-800'
                : 'bg-violet-50 hover:bg-violet-100 text-violet-800 border-violet-200'
            }`}
            title="Clique para alternar o método de cálculo"
          >
            <Sliders size={11} className="shrink-0" />
            <span>{avgMethod === 'simple' ? 'Média Simples' : 'Média Ponderada'}</span>
          </button>
        </div>
      </Interactive3DCard>

      {/* --------------------------------------------------------------------
          Card 4: Distância Total / KM Produtivo (Frota & Rodovia Dinâmica)
          -------------------------------------------------------------------- */}
      <Interactive3DCard 
        index={3}
        isDarkTheme={isDark}
        glowColor="rgba(59, 130, 246, 0.25)"
        backgroundAnimation={
          <HighwayFleetAnimation 
            isDark={isDark} 
            kmProdutivo={summaryTotals.kmProdutivo}
          />
        }
        bgWave={
          <FullDimensionCardWave 
            data={kmProdutivoSeries} 
            strokeColor="#3b82f6" 
            fillColorStart="#3b82f6" 
            fillColorEnd="#1d4ed8" 
          />
        }
      >
        <div className="flex items-center justify-between mb-4">
          <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shadow-md transition-all duration-300 ${
            isDark 
              ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30 shadow-blue-950/40' 
              : 'bg-blue-50 text-blue-600 border border-blue-100 shadow-blue-100'
          }`}>
            <Truck size={22} className="sm:size-[24px]" />
          </div>
          <span className={`px-3 py-1 text-[9px] sm:text-[10px] font-black rounded-full uppercase tracking-wider border shadow-xs ${
            isDark
              ? 'bg-blue-950/70 text-blue-300 border-blue-800'
              : 'bg-blue-50 text-blue-700 border-blue-200'
          }`}>
            Produtividade
          </span>
        </div>
        <div>
          <p className={`font-black uppercase tracking-wider text-[9px] sm:text-[10px] mb-2 font-sans ${
            isDark ? 'text-slate-400' : 'text-slate-600'
          }`}>
            Distância Total / KM Produtivo
          </p>
          <h4 className={`text-base sm:text-lg md:text-xl font-black tracking-tight flex flex-wrap items-baseline gap-1.5 ${
            isDark ? 'text-white' : 'text-slate-950'
          }`}>
            {summaryTotals.kmProdutivo.toLocaleString('pt-BR')} 
            <span className={`text-xs font-extrabold uppercase tracking-tight ${
              isDark ? 'text-blue-400' : 'text-blue-700'
            }`}>
              KM
            </span>
          </h4>
          <p className={`text-[10px] font-bold uppercase tracking-tight mt-1 ${
            isDark ? 'text-slate-400' : 'text-slate-600'
          }`}>
            KM Produtivo Total
          </p>
        </div>
      </Interactive3DCard>

      {/* --------------------------------------------------------------------
          Card 5: Custo em Estoque (Almoxarifado & Engrenagens Dinâmicas)
          -------------------------------------------------------------------- */}
      <Interactive3DCard 
        index={4}
        isDarkTheme={isDark}
        glowColor="rgba(16, 185, 129, 0.25)"
        backgroundAnimation={
          <WarehouseStockAnimation 
            isDark={isDark} 
            estoqueTotal={summaryTotals.estoqueTotal}
            estoquePct={Number(estoqueMaintPct)}
          />
        }
        bgWave={
          <FullDimensionCardWave 
            data={estoqueSeries} 
            strokeColor="#10b981" 
            fillColorStart="#10b981" 
            fillColorEnd="#047857" 
          />
        }
      >
        <div className="flex items-center justify-between mb-4">
          <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shadow-md transition-all duration-300 ${
            isDark 
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-emerald-950/40' 
              : 'bg-emerald-50 text-emerald-600 border border-emerald-100 shadow-emerald-100'
          }`}>
            <Database size={22} className="sm:size-[24px]" />
          </div>
          <span className={`px-3 py-1 text-[9px] sm:text-[10px] font-black rounded-full uppercase tracking-wider border shadow-xs ${
            isDark
              ? 'bg-rose-950/70 text-rose-300 border-rose-800'
              : 'bg-rose-50 text-rose-700 border-rose-200'
          }`}>
            {estoqueMaintPct}% da Manut.
          </span>
        </div>
        <div>
          <p className={`font-black uppercase tracking-wider text-[9px] sm:text-[10px] mb-2 font-sans ${
            isDark ? 'text-slate-400' : 'text-slate-600'
          }`}>
            Custo em Estoque
          </p>
          <h4 
            className={`text-base sm:text-lg md:text-xl font-black tracking-tight flex flex-wrap items-baseline gap-1 font-mono ${
              isDark ? 'text-white' : 'text-slate-950'
            }`} 
            title={summaryTotals.estoqueTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          >
            {summaryTotals.estoqueTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </h4>
          <p className={`text-[10px] font-bold uppercase tracking-tight mt-1 ${
            isDark ? 'text-slate-400' : 'text-slate-600'
          }`}>
            Peças e Materiais (Estoque)
          </p>
        </div>
      </Interactive3DCard>

      {/* --------------------------------------------------------------------
          Card 6: Custo NF Avulso (Nota Fiscal & Scanner Laser Dinâmico)
          -------------------------------------------------------------------- */}
      <Interactive3DCard 
        index={5}
        isDarkTheme={isDark}
        glowColor="rgba(99, 102, 241, 0.25)"
        backgroundAnimation={
          <InvoiceScannerAnimation 
            isDark={isDark} 
            avulsoTotal={summaryTotals.avulsoTotal}
            avulsoPct={Number(avulsoMaintPct)}
          />
        }
        bgWave={
          <FullDimensionCardWave 
            data={avulsoSeries} 
            strokeColor="#6366f1" 
            fillColorStart="#6366f1" 
            fillColorEnd="#3730a3" 
          />
        }
      >
        <div className="flex items-center justify-between mb-4">
          <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shadow-md transition-all duration-300 ${
            isDark 
              ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 shadow-indigo-950/40' 
              : 'bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-indigo-100'
          }`}>
            <FileText size={22} className="sm:size-[24px]" />
          </div>
          <span className={`px-3 py-1 text-[9px] sm:text-[10px] font-black rounded-full uppercase tracking-wider border shadow-xs ${
            isDark
              ? 'bg-rose-950/70 text-rose-300 border-rose-800'
              : 'bg-rose-50 text-rose-700 border-rose-200'
          }`}>
            {avulsoMaintPct}% da Manut.
          </span>
        </div>
        <div>
          <p className={`font-black uppercase tracking-wider text-[9px] sm:text-[10px] mb-2 font-sans ${
            isDark ? 'text-slate-400' : 'text-slate-600'
          }`}>
            Custo NF Avulso
          </p>
          <h4 
            className={`text-base sm:text-lg md:text-xl font-black tracking-tight flex flex-wrap items-baseline gap-1 font-mono ${
              isDark ? 'text-white' : 'text-slate-950'
            }`} 
            title={summaryTotals.avulsoTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          >
            {summaryTotals.avulsoTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </h4>
          <p className={`text-[10px] font-bold uppercase tracking-tight mt-1 ${
            isDark ? 'text-slate-400' : 'text-slate-600'
          }`}>
            Serviços de Terceiros (NF Avulso)
          </p>
        </div>
      </Interactive3DCard>

      {/* --------------------------------------------------------------------
          Card 7: Custo Manutenção Total (Oficina & Ferramentas Dinâmicas)
          -------------------------------------------------------------------- */}
      <Interactive3DCard 
        index={6}
        isDarkTheme={isDark}
        glowColor="rgba(244, 63, 94, 0.25)"
        backgroundAnimation={
          <MaintenanceToolsAnimation 
            isDark={isDark} 
            totalMaint={summaryTotals.totalMaint}
          />
        }
        bgWave={
          <FullDimensionCardWave 
            data={maintSeries} 
            strokeColor="#f43f5e" 
            fillColorStart="#f43f5e" 
            fillColorEnd="#9f1239" 
          />
        }
      >
        <div className="flex items-center justify-between mb-4">
          <div className={`w-11 h-11 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center shadow-md transition-all duration-300 ${
            isDark 
              ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30 shadow-rose-950/40' 
              : 'bg-rose-50 text-rose-600 border border-rose-100 shadow-rose-100'
          }`}>
            <AlertCircle size={22} className="sm:size-[24px]" />
          </div>
          <span className={`px-3 py-1 text-[9px] sm:text-[10px] font-black rounded-full uppercase tracking-wider border shadow-xs ${
            isDark
              ? 'bg-rose-950/70 text-rose-300 border-rose-800'
              : 'bg-rose-50 text-rose-700 border-rose-200'
          }`}>
            Custo Consolidado
          </span>
        </div>
        <div>
          <p className={`font-black uppercase tracking-wider text-[9px] sm:text-[10px] mb-2 font-sans ${
            isDark ? 'text-slate-400' : 'text-slate-600'
          }`}>
            Custo Manutenção Total
          </p>
          <h4 
            className={`text-base sm:text-lg md:text-xl font-black tracking-tight flex flex-wrap items-baseline gap-1 font-mono ${
              isDark ? 'text-white' : 'text-slate-950'
            }`} 
            title={summaryTotals.totalMaint.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          >
            {summaryTotals.totalMaint.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </h4>
          <p className={`text-[10px] font-bold uppercase tracking-tight mt-1 ${
            isDark ? 'text-slate-400' : 'text-slate-600'
          }`}>
            Manutenção Total Consolidada
          </p>
        </div>
      </Interactive3DCard>

      {/* --------------------------------------------------------------------
          Card 8: HERO 3D CARD - Investimento Total (Consolidado Geral Dinâmico)
          -------------------------------------------------------------------- */}
      <Interactive3DCard 
        index={7}
        isDarkTheme={isDark}
        isHero={true}
        glowColor="rgba(99, 102, 241, 0.45)"
        backgroundAnimation={
          <HeroTotalInvestmentAnimation 
            isDark={isDark} 
            totalGeral={summaryTotals.totalGeral}
            valorFuel={summaryTotals.valorFuel}
            estoqueTotal={summaryTotals.estoqueTotal}
            avulsoTotal={summaryTotals.avulsoTotal}
          />
        }
        bgWave={
          <FullDimensionCardWave 
            data={totalGeralSeries} 
            strokeColor="#10b981" 
            fillColorStart="#10b981" 
            fillColorEnd="#047857" 
          />
        }
      >
        <div className="flex items-center justify-between mb-4">
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 flex items-center justify-center shadow-lg shadow-emerald-500/30 transform transition-transform duration-300 group-hover:rotate-6">
            <Zap size={22} className="sm:size-[24px]" />
          </div>
          <span className="px-3 py-1 text-[9px] sm:text-[10px] font-black rounded-full uppercase tracking-wider bg-emerald-400/20 text-emerald-300 border border-emerald-400/30 shadow-xs flex items-center gap-1.5">
            <Sparkles size={11} className="animate-spin text-emerald-400" />
            Consolidado Geral
          </span>
        </div>

        <div>
          <p className="text-indigo-200/80 font-black uppercase tracking-wider text-[9px] sm:text-[10px] mb-2 font-sans">
            Investimento Total
          </p>
          <h4 
            className="text-base sm:text-lg md:text-xl lg:text-2xl font-black text-white tracking-tight flex flex-wrap items-baseline gap-1 font-mono drop-shadow-md" 
            title={summaryTotals.totalGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          >
            {summaryTotals.totalGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
          </h4>
          <div className="mt-3 flex items-center gap-2">
            <span className="text-[9px] sm:text-[10px] font-black text-emerald-300 bg-emerald-500/20 px-2.5 py-1 rounded-full uppercase tracking-tight border border-emerald-500/30 shadow-xs flex items-center gap-1">
              <TrendingUp size={11} />
              Custo Operacional Total
            </span>
          </div>
        </div>
      </Interactive3DCard>

    </div>
  );
};

export default ResumoGerencialKpiCards;
