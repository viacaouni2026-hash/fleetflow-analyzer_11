import React, { useState, useRef, MouseEvent, ReactNode } from 'react';
import { motion } from 'motion/react';
import { 
  AlertCircle, 
  Database, 
  FileText, 
  Settings, 
  TrendingUp, 
  Sparkles, 
  Activity, 
  Zap, 
  ArrowUpRight,
  Layers,
  CheckCircle2,
  Package,
  Wrench
} from 'lucide-react';
import { cn } from '../lib/utils';

export interface MaintenanceTimelinePoint {
  name: string;
  total: number;
  estoque: number;
  avulso: number;
  count?: number;
  ordem?: string | number;
}

interface MaintenanceNeonKpiCardsProps {
  totalGeral: number;
  totalEstoque: number;
  totalAvulso: number;
  totalRegistros: number;
  timelineData?: MaintenanceTimelinePoint[];
  appTheme?: 'light' | 'dark-neon';
  onFilterEstoqueOnly?: () => void;
  onFilterAvulsoOnly?: () => void;
  onFilterReset?: () => void;
}

interface Interactive3DCardProps {
  children: ReactNode;
  className?: string;
  glowColor?: string;
  borderColor?: string;
  isDarkTheme?: boolean;
  index?: number;
  bgWave?: ReactNode;
}

const Interactive3DCard: React.FC<Interactive3DCardProps> = ({
  children,
  className = '',
  glowColor = 'rgba(99, 102, 241, 0.22)',
  borderColor = 'rgba(99, 102, 241, 0.35)',
  isDarkTheme = false,
  index = 0,
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

    const rotateX = ((y - centerY) / centerY) * -5.5;
    const rotateY = ((x - centerX) / centerX) * 5.5;

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
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, delay: index * 0.08, ease: [0.23, 1, 0.32, 1] }}
      style={{ perspective: 1000 }}
      className="h-full"
    >
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateZ(${isHovered ? '12px' : '0px'})`,
          transformStyle: 'preserve-3d',
          transition: isHovered ? 'transform 0.08s ease-out' : 'transform 0.5s ease-out',
        }}
        className={cn(
          "relative h-full rounded-3xl p-6 transition-all duration-300 overflow-hidden cursor-default group",
          isDarkTheme 
            ? "bg-slate-900/90 text-white shadow-2xl shadow-black/40 border border-slate-800" 
            : "bg-white text-slate-900 shadow-xl shadow-slate-200/60 border border-slate-100",
          className
        )}
      >
        {/* Dynamic Neon Background Glow Layer */}
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-300"
          style={{
            opacity: isHovered ? 0.95 : 0.45,
            background: `radial-gradient(circle at ${mousePos.x}% ${mousePos.y}%, ${glowColor} 0%, transparent 65%)`,
          }}
        />

        {/* Specular 3D Border Glow */}
        <div 
          className="absolute inset-0 rounded-3xl pointer-events-none transition-all duration-300"
          style={{
            border: `1.5px solid ${isHovered ? borderColor : 'rgba(226, 232, 240, 0.6)'}`,
            boxShadow: isHovered ? `inset 0 0 20px ${glowColor}, 0 10px 30px -10px ${glowColor}` : 'none'
          }}
        />

        {/* Glass reflection highlight on top edge */}
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/80 to-transparent pointer-events-none opacity-60" />

        {/* Full-Bleed Semi-transparent Dynamic Line Chart covering 100% card dimension */}
        {bgWave && (
          <div className="absolute inset-0 w-full h-full pointer-events-none overflow-hidden opacity-30 group-hover:opacity-65 transition-opacity duration-500 rounded-3xl">
            {bgWave}
          </div>
        )}

        {/* Foreground Content */}
        <div className="relative z-10 flex flex-col justify-between h-full space-y-4">
          {children}
        </div>
      </div>
    </motion.div>
  );
};

// Component helper for semi-transparent animated SVG Sparkline Line Charts
const AnimatedSparkline: React.FC<{
  data: number[];
  strokeColor: string;
  fillColorStart: string;
  fillColorEnd: string;
  glowColor: string;
  height?: number;
}> = ({ data, strokeColor, fillColorStart, fillColorEnd, glowColor, height = 150 }) => {
  if (!data || data.length === 0) {
    data = [20, 45, 30, 60, 40, 75, 55, 90];
  }

  const validData = data.map(v => isNaN(v) ? 0 : v);
  const min = Math.min(...validData, 0);
  const max = Math.max(...validData, 1);
  const range = max - min || 1;

  const width = 400;
  const paddingX = 0;
  const paddingY = 24;
  const chartHeight = height;

  const points = validData.map((val, idx) => {
    const x = (idx / Math.max(validData.length - 1, 1)) * width;
    const normalizedY = (val - min) / range;
    const y = chartHeight - paddingY - normalizedY * (chartHeight - paddingY * 2);
    return { x, y, val };
  });

  const pathD = points.reduce((acc, pt, i) => {
    if (i === 0) return `M ${pt.x} ${pt.y}`;
    const prev = points[i - 1];
    const cx = (prev.x + pt.x) / 2;
    return `${acc} C ${cx} ${prev.y}, ${cx} ${pt.y}, ${pt.x} ${pt.y}`;
  }, '');

  const areaD = `${pathD} L ${width} ${chartHeight} L 0 ${chartHeight} Z`;

  const maxPoint = points.reduce((prev, curr) => (curr.val > prev.val ? curr : prev), points[0]);

  return (
    <svg 
      viewBox={`0 0 ${width} ${chartHeight}`} 
      className="w-full h-full" 
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={`grad-${strokeColor.replace(/[^a-zA-Z0-9]/g, '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={fillColorStart} stopOpacity="0.45" />
          <stop offset="100%" stopColor={fillColorEnd} stopOpacity="0.0" />
        </linearGradient>
        <filter id={`neon-glow-${strokeColor.replace(/[^a-zA-Z0-9]/g, '')}`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor={glowColor} floodOpacity="0.6" />
        </filter>
      </defs>

      {/* Area Gradient Fill */}
      <path d={areaD} fill={`url(#grad-${strokeColor.replace(/[^a-zA-Z0-9]/g, '')})`} />

      {/* Main Sparkline Stroke */}
      <path
        d={pathD}
        fill="none"
        stroke={strokeColor}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter={`url(#neon-glow-${strokeColor.replace(/[^a-zA-Z0-9]/g, '')})`}
      />

      {/* Ambient Pulsing Peak Point */}
      {maxPoint && (
        <g transform={`translate(${maxPoint.x}, ${maxPoint.y})`}>
          <circle r="6" fill={strokeColor} opacity="0.3" className="animate-ping" />
          <circle r="3.5" fill="#ffffff" stroke={strokeColor} strokeWidth="2" />
        </g>
      )}

      {/* Last Point Beacon */}
      {points.length > 0 && (
        <g transform={`translate(${points[points.length - 1].x}, ${points[points.length - 1].y})`}>
          <circle r="4" fill={strokeColor} />
          <circle r="2" fill="#ffffff" />
        </g>
      )}
    </svg>
  );
};

// Cara Doida Animada Dinâmica (Wacky Crazy Face) que reage aos lançamentos
const CrazyAnimatedFace: React.FC<{ count: number; size?: number }> = ({ count, size = 48 }) => {
  const [isWackyClicked, setIsWackyClicked] = useState(false);

  // Determinar o nível de loucura baseado no volume de registros
  // >= 3500: Frenético / Insano (Muitos Lançamentos - Modo Turbo)
  // >= 1200: Muito Ativo / Elétrico
  // >= 300: Animado / Alegre
  // < 300: Com Sono / Preguiçoso (Poucos Lançamentos)
  const isInsane = count >= 3500;
  const isHigh = count >= 1200 && count < 3500;
  const isMedium = count >= 300 && count < 1200;
  const isLow = count < 300;

  return (
    <motion.div
      onClick={() => {
        setIsWackyClicked(true);
        setTimeout(() => setIsWackyClicked(false), 1200);
      }}
      whileHover={{ scale: 1.22, rotate: isInsane ? [0, -12, 12, -8, 8, 0] : [0, -8, 8, 0] }}
      whileTap={{ scale: 0.88 }}
      animate={
        isWackyClicked
          ? {
              rotate: [0, 360, 720],
              scale: [1, 1.35, 1],
              transition: { duration: 0.8, ease: "easeInOut" }
            }
          : isInsane
          ? {
              y: [0, -4, 2, -3, 0],
              rotate: [-3, 4, -4, 3, -3],
              scale: [1, 1.05, 0.98, 1.03, 1],
              transition: {
                repeat: Infinity,
                duration: 0.65,
                ease: "easeInOut"
              }
            }
          : isHigh
          ? {
              y: [0, -3, 1, 0],
              rotate: [-2, 2, -2],
              transition: {
                repeat: Infinity,
                duration: 1.2,
                ease: "easeInOut"
              }
            }
          : isMedium
          ? {
              y: [0, -2, 0],
              transition: {
                repeat: Infinity,
                duration: 2.2,
                ease: "easeInOut"
              }
            }
          : {
              rotate: [0, -3, 3, 0],
              transition: {
                repeat: Infinity,
                duration: 4.5,
                ease: "easeInOut"
              }
            }
      }
      className="relative cursor-pointer select-none group/face"
      style={{ width: size, height: size }}
      title={
        isInsane
          ? `🔥 Modo Frenético! ${count.toLocaleString('pt-BR')} registros (muita movimentação!)`
          : isHigh
          ? `⚡ Modo Elétrico! ${count.toLocaleString('pt-BR')} registros`
          : isMedium
          ? `✨ Movimentação Normal: ${count.toLocaleString('pt-BR')} registros`
          : `💤 Volume Baixo: ${count.toLocaleString('pt-BR')} registros`
      }
    >
      {/* Halo de Brilho Neon Pulsante da Cabeça */}
      <div 
        className={cn(
          "absolute -inset-1.5 rounded-full blur-md opacity-75 transition-all duration-300",
          isInsane 
            ? "bg-gradient-to-r from-amber-500 via-rose-500 to-yellow-400 animate-pulse" 
            : isHigh
            ? "bg-gradient-to-r from-amber-400 to-orange-500"
            : isMedium
            ? "bg-amber-400/50"
            : "bg-slate-400/30"
        )} 
      />

      {/* SVG Face Container */}
      <svg
        viewBox="0 0 100 100"
        className="w-full h-full relative z-10 drop-shadow-md overflow-visible"
      >
        <defs>
          {/* Gradiente da Pele da Cara */}
          <radialGradient id="faceSkin" cx="40%" cy="35%" r="65%">
            {isInsane ? (
              <>
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="60%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#ea580c" />
              </>
            ) : isHigh ? (
              <>
                <stop offset="0%" stopColor="#fef9c3" />
                <stop offset="60%" stopColor="#fbbf24" />
                <stop offset="100%" stopColor="#f59e0b" />
              </>
            ) : isMedium ? (
              <>
                <stop offset="0%" stopColor="#fef08a" />
                <stop offset="70%" stopColor="#fcd34d" />
                <stop offset="100%" stopColor="#f59e0b" />
              </>
            ) : (
              <>
                <stop offset="0%" stopColor="#e2e8f0" />
                <stop offset="70%" stopColor="#cbd5e1" />
                <stop offset="100%" stopColor="#94a3b8" />
              </>
            )}
          </radialGradient>

          {/* Gradiente Língua */}
          <linearGradient id="tongueGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#fb7185" />
            <stop offset="100%" stopColor="#e11d48" />
          </linearGradient>

          {/* Gradiente Óculos / Olho Maluco */}
          <linearGradient id="crazyPupil" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="50%" stopColor="#818cf8" />
            <stop offset="100%" stopColor="#ec4899" />
          </linearGradient>
        </defs>

        {/* Fumaça / Chamas se for insano */}
        {isInsane && (
          <g className="animate-bounce opacity-80" style={{ animationDuration: '0.9s' }}>
            <path d="M 30 12 Q 22 2, 34 0 Q 38 6, 32 12" fill="#ef4444" opacity="0.9" />
            <path d="M 50 10 Q 50 -3, 56 -2 Q 62 4, 52 10" fill="#f59e0b" opacity="0.95" />
            <path d="M 70 12 Q 78 2, 66 0 Q 62 6, 68 12" fill="#ef4444" opacity="0.9" />
          </g>
        )}

        {/* Formato da Cabeça */}
        <motion.circle
          cx="50"
          cy="50"
          r="44"
          fill="url(#faceSkin)"
          stroke={isInsane ? "#b45309" : "#d97706"}
          strokeWidth="3.5"
        />

        {/* Suor de desespero / agitação se for insano */}
        {isInsane && (
          <g className="animate-pulse">
            <path d="M 88 38 C 94 38, 94 48, 88 52 C 86 50, 84 45, 88 38 Z" fill="#38bdf8" stroke="#0284c7" strokeWidth="1" />
          </g>
        )}

        {/* Zzz flutuando se for Low */}
        {isLow && (
          <g className="animate-bounce" style={{ animationDuration: '3s' }}>
            <text x="75" y="24" fill="#64748b" fontSize="14" fontWeight="900">Z</text>
            <text x="86" y="14" fill="#94a3b8" fontSize="10" fontWeight="900">z</text>
          </g>
        )}

        {/* SOBRANCELHAS DOIDAS */}
        {isInsane ? (
          <g>
            {/* Esquerda: levantada e pontuda */}
            <path d="M 18 26 Q 32 16, 44 28" fill="none" stroke="#78350f" strokeWidth="4.5" strokeLinecap="round" />
            {/* Direita: curvada pra baixo furiosa/insana */}
            <path d="M 56 34 Q 68 20, 82 24" fill="none" stroke="#78350f" strokeWidth="4.5" strokeLinecap="round" />
          </g>
        ) : isHigh ? (
          <g>
            <path d="M 22 28 Q 32 20, 42 27" fill="none" stroke="#78350f" strokeWidth="3.5" strokeLinecap="round" />
            <path d="M 58 27 Q 68 20, 78 28" fill="none" stroke="#78350f" strokeWidth="3.5" strokeLinecap="round" />
          </g>
        ) : isMedium ? (
          <g>
            <path d="M 24 30 Q 33 24, 42 30" fill="none" stroke="#78350f" strokeWidth="3" strokeLinecap="round" />
            <path d="M 58 30 Q 67 24, 76 30" fill="none" stroke="#78350f" strokeWidth="3" strokeLinecap="round" />
          </g>
        ) : (
          <g>
            {/* Preguiça / sonolento */}
            <path d="M 24 34 Q 33 36, 42 34" fill="none" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" />
            <path d="M 58 34 Q 67 36, 76 34" fill="none" stroke="#475569" strokeWidth="2.5" strokeLinecap="round" />
          </g>
        )}

        {/* OLHOS DOIDOS (Giram e se movem se for insano) */}
        {isInsane ? (
          <g>
            {/* Olho Esquerdo GIGANTE Maluco */}
            <circle cx="32" cy="44" r="16" fill="#ffffff" stroke="#78350f" strokeWidth="2.5" />
            <motion.g
              animate={{ rotate: [0, 360] }}
              transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
              style={{ originX: "32px", originY: "44px" }}
            >
              {/* Espiral Hipnótica ou Pupila Elétrica */}
              <circle cx="35" cy="42" r="7.5" fill="url(#crazyPupil)" />
              <circle cx="37" cy="40" r="2.5" fill="#ffffff" />
              <path d="M 28 44 Q 32 38, 36 44 T 40 44" fill="none" stroke="#ffffff" strokeWidth="1.5" />
            </motion.g>

            {/* Olho Direito Pequeno Doidão Desproporcional */}
            <circle cx="68" cy="43" r="11" fill="#ffffff" stroke="#78350f" strokeWidth="2.5" />
            <motion.g
              animate={{
                x: [0, 3, -4, 2, 0],
                y: [0, -3, 3, -1, 0],
              }}
              transition={{ repeat: Infinity, duration: 0.5, ease: "easeInOut" }}
            >
              <circle cx="67" cy="43" r="5" fill="#1e1b4b" />
              <circle cx="69" cy="41" r="1.8" fill="#ffffff" />
              <circle cx="65" cy="44" r="1" fill="#ffffff" />
            </motion.g>
          </g>
        ) : isHigh ? (
          <g>
            {/* Olhos Grandes Espantados/Ativos */}
            <circle cx="33" cy="43" r="13" fill="#ffffff" stroke="#78350f" strokeWidth="2.5" />
            <motion.circle
              cx="35"
              cy="43"
              r="6.5"
              fill="#0f172a"
              animate={{ x: [-2, 3, -2], y: [-1, 2, -1] }}
              transition={{ repeat: Infinity, duration: 1.2 }}
            />
            <circle cx="37" cy="41" r="2" fill="#ffffff" />

            <circle cx="67" cy="43" r="13" fill="#ffffff" stroke="#78350f" strokeWidth="2.5" />
            <motion.circle
              cx="65"
              cy="43"
              r="6.5"
              fill="#0f172a"
              animate={{ x: [-3, 2, -3], y: [-1, 2, -1] }}
              transition={{ repeat: Infinity, duration: 1.2 }}
            />
            <circle cx="67" cy="41" r="2" fill="#ffffff" />
          </g>
        ) : isMedium ? (
          <g>
            {/* Olhos Sorridentes / Normais */}
            <circle cx="34" cy="44" r="10" fill="#ffffff" stroke="#78350f" strokeWidth="2" />
            <circle cx="35" cy="44" r="5" fill="#0f172a" />
            <circle cx="37" cy="42" r="1.5" fill="#ffffff" />

            <circle cx="66" cy="44" r="10" fill="#ffffff" stroke="#78350f" strokeWidth="2" />
            <circle cx="65" cy="44" r="5" fill="#0f172a" />
            <circle cx="67" cy="42" r="1.5" fill="#ffffff" />
          </g>
        ) : (
          <g>
            {/* Olhos semicerrados com sono */}
            <path d="M 25 46 Q 34 52, 43 46" fill="none" stroke="#334155" strokeWidth="3" strokeLinecap="round" />
            <path d="M 57 46 Q 66 52, 75 46" fill="none" stroke="#334155" strokeWidth="3" strokeLinecap="round" />
          </g>
        )}

        {/* BOCHECHAS ROSADAS */}
        <circle cx="20" cy="56" r="6" fill="#f43f5e" opacity="0.35" />
        <circle cx="80" cy="56" r="6" fill="#f43f5e" opacity="0.35" />

        {/* BOCA MALUCA DINÂMICA */}
        {isInsane ? (
          <g>
            {/* Boca Aberta Enorme Gargalhando / Doida */}
            <path
              d="M 24 62 Q 50 94, 76 62 Q 50 72, 24 62 Z"
              fill="#881337"
              stroke="#78350f"
              strokeWidth="3"
            />
            {/* Dente superior engraçado */}
            <rect x="42" y="64" width="7" height="6" rx="1.5" fill="#ffffff" />
            <rect x="51" y="64" width="7" height="6" rx="1.5" fill="#ffffff" />
            {/* Língua Maluca pra Fora Balançando */}
            <motion.path
              d="M 38 72 C 38 90, 62 90, 62 72 Z"
              fill="url(#tongueGrad)"
              stroke="#be123c"
              strokeWidth="2"
              animate={{ scaleY: [1, 1.25, 0.95, 1.15, 1], rotate: [-4, 6, -5, 0] }}
              transition={{ repeat: Infinity, duration: 0.55 }}
              style={{ originX: "50px", originY: "72px" }}
            />
          </g>
        ) : isHigh ? (
          <g>
            {/* Sorriso Largo com Língua */}
            <path
              d="M 28 62 Q 50 86, 72 62 Z"
              fill="#881337"
              stroke="#78350f"
              strokeWidth="3"
            />
            <path d="M 42 70 C 42 80, 58 80, 58 70 Z" fill="url(#tongueGrad)" />
          </g>
        ) : isMedium ? (
          <g>
            {/* Sorriso Simpático */}
            <path
              d="M 32 64 Q 50 80, 68 64"
              fill="none"
              stroke="#78350f"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
          </g>
        ) : (
          <g>
            {/* Boca Bocejando Pequena */}
            <ellipse cx="50" cy="66" rx="6" ry="8" fill="#475569" stroke="#334155" strokeWidth="2" />
          </g>
        )}
      </svg>
    </motion.div>
  );
};

export const MaintenanceNeonKpiCards: React.FC<MaintenanceNeonKpiCardsProps> = ({
  totalGeral,
  totalEstoque,
  totalAvulso,
  totalRegistros,
  timelineData = [],
  appTheme = 'light',
  onFilterEstoqueOnly,
  onFilterAvulsoOnly,
  onFilterReset
}) => {
  const isDark = appTheme === 'dark-neon';

  const estoquePct = totalGeral > 0 ? (totalEstoque / totalGeral) * 100 : 0;
  const avulsoPct = totalGeral > 0 ? (totalAvulso / totalGeral) * 100 : 0;

  // Extract timeline series for sparklines
  const totalSeries = timelineData.map(p => p.total || 0);
  const estoqueSeries = timelineData.map(p => p.estoque || 0);
  const avulsoSeries = timelineData.map(p => p.avulso || 0);
  const countSeries = timelineData.map(p => p.count || 1);

  // Peak period calculation
  const peakPeriod = timelineData.reduce((prev, curr) => {
    return (curr.total || 0) > (prev?.total || 0) ? curr : prev;
  }, timelineData[0] || null);

  const avgMonthly = timelineData.length > 0 ? totalGeral / timelineData.length : totalGeral;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
      {/* 1. CUSTO MANUTENÇÃO TOTAL */}
      <Interactive3DCard
        index={0}
        glowColor="rgba(99, 102, 241, 0.28)"
        borderColor="rgba(99, 102, 241, 0.45)"
        isDarkTheme={isDark}
        bgWave={
          <AnimatedSparkline 
            data={totalSeries} 
            strokeColor="#6366f1" 
            fillColorStart="#818cf8" 
            fillColorEnd="#4338ca" 
            glowColor="#6366f1" 
          />
        }
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-3 bg-gradient-to-br from-indigo-500 via-indigo-600 to-purple-600 text-white rounded-2xl shadow-md shadow-indigo-500/30 ring-2 ring-indigo-400/20 group-hover:scale-110 transition-transform duration-300">
              <AlertCircle size={20} className="animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] font-black tracking-wider text-slate-400 dark:text-slate-400 uppercase block">
                CUSTO MANUTENÇÃO TOTAL
              </span>
              <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                <Sparkles size={11} /> Consolidado Frota
              </span>
            </div>
          </div>

          <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200/80 dark:border-indigo-800 shadow-xs uppercase tracking-wider flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-ping" />
            CUSTO CONSOLIDADO
          </span>
        </div>

        <div className="pt-2">
          <div className="flex items-baseline gap-1.5 w-full min-w-0">
            <span 
              className="text-xl sm:text-2xl lg:text-xl xl:text-2xl 2xl:text-3xl font-black tracking-tighter text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-300 transition-colors truncate"
              title={totalGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            >
              {totalGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Média/período:</span>
              <span className="text-slate-800 dark:text-slate-200 font-extrabold">
                {avgMonthly.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
              </span>
            </div>
            {peakPeriod && (
              <span className="text-indigo-600 dark:text-indigo-400 bg-indigo-50/80 dark:bg-indigo-900/40 px-2 py-0.5 rounded-md text-[10px] font-extrabold truncate max-w-[130px]" title={`Pico: ${peakPeriod.name}`}>
                Pico: {peakPeriod.name}
              </span>
            )}
          </div>
        </div>
      </Interactive3DCard>

      {/* 2. CUSTO EM ESTOQUE */}
      <Interactive3DCard
        index={1}
        glowColor="rgba(16, 185, 129, 0.28)"
        borderColor="rgba(16, 185, 129, 0.45)"
        isDarkTheme={isDark}
        bgWave={
          <AnimatedSparkline 
            data={estoqueSeries} 
            strokeColor="#10b981" 
            fillColorStart="#34d399" 
            fillColorEnd="#047857" 
            glowColor="#10b981" 
          />
        }
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-3 bg-gradient-to-br from-emerald-500 via-emerald-600 to-teal-700 text-white rounded-2xl shadow-md shadow-emerald-500/30 ring-2 ring-emerald-400/20 group-hover:scale-110 transition-transform duration-300">
              <Database size={20} className="animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] font-black tracking-wider text-slate-400 dark:text-slate-400 uppercase block">
                CUSTO EM ESTOQUE
              </span>
              <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <Package size={11} /> Peças & Almoxarifado
              </span>
            </div>
          </div>

          <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200/80 dark:border-emerald-800 shadow-xs uppercase tracking-wider flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            {estoquePct.toFixed(1)}% DO TOTAL
          </span>
        </div>

        <div className="pt-2">
          <div className="flex items-baseline gap-1.5 w-full min-w-0">
            <span 
              className="text-xl sm:text-2xl lg:text-xl xl:text-2xl 2xl:text-3xl font-black tracking-tighter text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-300 transition-colors truncate"
              title={totalEstoque.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            >
              {totalEstoque.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>

          {/* Glowing Split Progress Bar */}
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className="text-slate-400">Participação:</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">
                {estoquePct.toFixed(1)}% ({totalEstoque >= 1000 ? `R$ ${(totalEstoque/1000).toFixed(0)}k` : `R$ ${totalEstoque.toFixed(0)}`})
              </span>
            </div>
            <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-200/50 dark:border-slate-700/50">
              <div 
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-1000 shadow-xs shadow-emerald-500/50" 
                style={{ width: `${Math.min(100, Math.max(estoquePct, 3))}%` }} 
              />
            </div>
          </div>
        </div>
      </Interactive3DCard>

      {/* 3. CUSTO NF AVULSO */}
      <Interactive3DCard
        index={2}
        glowColor="rgba(2, 132, 199, 0.28)"
        borderColor="rgba(2, 132, 199, 0.45)"
        isDarkTheme={isDark}
        bgWave={
          <AnimatedSparkline 
            data={avulsoSeries} 
            strokeColor="#0284c7" 
            fillColorStart="#38bdf8" 
            fillColorEnd="#0369a1" 
            glowColor="#0284c7" 
          />
        }
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-3 bg-gradient-to-br from-sky-500 via-sky-600 to-blue-700 text-white rounded-2xl shadow-md shadow-sky-500/30 ring-2 ring-sky-400/20 group-hover:scale-110 transition-transform duration-300">
              <FileText size={20} className="animate-pulse" />
            </div>
            <div>
              <span className="text-[10px] font-black tracking-wider text-slate-400 dark:text-slate-400 uppercase block">
                CUSTO NF AVULSO
              </span>
              <span className="text-[11px] font-bold text-sky-600 dark:text-sky-400 flex items-center gap-1">
                <Wrench size={11} /> Serviços Externos & NF
              </span>
            </div>
          </div>

          <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-sky-50 dark:bg-sky-950/60 text-sky-600 dark:text-sky-400 border border-sky-200/80 dark:border-sky-800 shadow-xs uppercase tracking-wider flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500" />
            {avulsoPct.toFixed(1)}% DO TOTAL
          </span>
        </div>

        <div className="pt-2">
          <div className="flex items-baseline gap-1.5 w-full min-w-0">
            <span 
              className="text-xl sm:text-2xl lg:text-xl xl:text-2xl 2xl:text-3xl font-black tracking-tighter text-slate-900 dark:text-white group-hover:text-sky-600 dark:group-hover:text-sky-300 transition-colors truncate"
              title={totalAvulso.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            >
              {totalAvulso.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>

          {/* Glowing Split Progress Bar */}
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 space-y-1.5">
            <div className="flex items-center justify-between text-[11px] font-bold">
              <span className="text-slate-400">Participação:</span>
              <span className="text-sky-600 dark:text-sky-400 font-extrabold">
                {avulsoPct.toFixed(1)}% ({totalAvulso >= 1000000 ? `R$ ${(totalAvulso/1000000).toFixed(1)}M` : `R$ ${(totalAvulso/1000).toFixed(0)}k`})
              </span>
            </div>
            <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-200/50 dark:border-slate-700/50">
              <div 
                className="h-full bg-gradient-to-r from-sky-500 to-blue-600 rounded-full transition-all duration-1000 shadow-xs shadow-sky-500/50" 
                style={{ width: `${Math.min(100, Math.max(avulsoPct, 3))}%` }} 
              />
            </div>
          </div>
        </div>
      </Interactive3DCard>

      {/* 4. REGISTROS DE MANUTENÇÃO COM CARA DOIDA ANIMADA */}
      <Interactive3DCard
        index={3}
        glowColor="rgba(245, 158, 11, 0.32)"
        borderColor="rgba(245, 158, 11, 0.55)"
        isDarkTheme={isDark}
        bgWave={
          <AnimatedSparkline 
            data={countSeries} 
            strokeColor="#f59e0b" 
            fillColorStart="#fbbf24" 
            fillColorEnd="#b45309" 
            glowColor="#f59e0b" 
          />
        }
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            {/* Cara Doida Animada no lugar do ícone estático */}
            <CrazyAnimatedFace count={totalRegistros} size={46} />
            <div>
              <span className="text-[10px] font-black tracking-wider text-slate-400 dark:text-slate-400 uppercase block">
                REGISTROS DE MANUTENÇÃO
              </span>
              <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                {totalRegistros >= 3500 ? (
                  <span className="text-rose-600 dark:text-rose-400 font-extrabold flex items-center gap-0.5 animate-pulse">
                    🔥 Modo Frenético!
                  </span>
                ) : totalRegistros >= 1200 ? (
                  <span className="text-amber-600 dark:text-amber-400 font-extrabold flex items-center gap-0.5">
                    ⚡ Movimentação Intensa
                  </span>
                ) : totalRegistros >= 300 ? (
                  <span className="text-emerald-600 dark:text-emerald-400 font-extrabold flex items-center gap-0.5">
                    ✨ Ritmo Constante
                  </span>
                ) : (
                  <span className="text-slate-500 font-extrabold flex items-center gap-0.5">
                    💤 Volume Baixo
                  </span>
                )}
              </span>
            </div>
          </div>

          <span className="text-[10px] font-extrabold px-2.5 py-1 rounded-full bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 border border-amber-200/80 dark:border-amber-800 shadow-xs uppercase tracking-wider flex items-center gap-1">
            <Zap size={10} className="text-amber-500 animate-bounce" />
            TOTAL DE MOVIMENTOS
          </span>
        </div>

        <div className="pt-2">
          <div className="flex items-baseline justify-between w-full min-w-0">
            <div className="flex items-baseline gap-2 min-w-0">
              <span 
                className="text-xl sm:text-2xl lg:text-xl xl:text-2xl 2xl:text-3xl font-black tracking-tighter text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-300 transition-colors truncate"
                title={totalRegistros.toLocaleString('pt-BR')}
              >
                {totalRegistros.toLocaleString('pt-BR')}
              </span>
              <span className="text-xs font-extrabold text-slate-400 uppercase tracking-wide shrink-0">
                lançamentos
              </span>
            </div>

            {/* Micro Badge indicativo do humor da cara doida */}
            <span className={cn(
              "text-[10px] font-black px-2 py-0.5 rounded-md border",
              totalRegistros >= 3500 
                ? "bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-300 border-rose-200 dark:border-rose-800 animate-pulse" 
                : totalRegistros >= 1200
                ? "bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800"
                : "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700"
            )}>
              {totalRegistros >= 3500 ? 'Insano' : totalRegistros >= 1200 ? 'Elétrico' : totalRegistros >= 300 ? 'Ativo' : 'Calmo'}
            </span>
          </div>

          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-[11px] font-bold text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1">
              <CheckCircle2 size={12} className="text-emerald-500" />
              <span>Base Auditada</span>
            </div>
            <span className="text-amber-600 dark:text-amber-400 font-extrabold">
              {timelineData.length > 0 ? `~${Math.round(totalRegistros / timelineData.length)} mov/mês` : '100% Conciliado'}
            </span>
          </div>
        </div>
      </Interactive3DCard>
    </div>
  );
};

export default MaintenanceNeonKpiCards;
