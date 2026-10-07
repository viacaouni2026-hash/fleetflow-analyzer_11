import React, { useEffect, useState, useRef, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Fuel, 
  Gauge, 
  Truck, 
  User, 
  CheckCircle2, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown, 
  Sparkles,
  Zap,
  Activity,
  Layers,
  Compass,
  DollarSign
} from 'lucide-react';
import { cn } from '../lib/utils';

// =========================================================================
// 1. REUSABLE 3D NEON PORTAL CONTAINER WRAPPER
// =========================================================================
interface PortalTooltipWrapperProps {
  active?: boolean;
  payload?: any[];
  coordinate?: { x: number; y: number };
  children: React.ReactNode;
  offsetY?: number;
  offsetX?: number;
}

export const PortalTooltipWrapper: React.FC<PortalTooltipWrapperProps> = ({
  active,
  payload,
  children,
  offsetY = 14,
  offsetX = 18,
}) => {
  const [coords, setCoords] = useState<{ x: number; y: number } | null>(null);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const handleMouseMove = (e: MouseEvent) => {
      setCoords({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  if (!isMounted || !active || !payload || !payload.length) {
    return null;
  }

  const clientX = coords?.x ?? (typeof window !== 'undefined' ? window.innerWidth / 2 : 0);
  const clientY = coords?.y ?? (typeof window !== 'undefined' ? window.innerHeight / 2 : 0);

  const tooltipWidth = 320;
  const tooltipHeight = 240;
  const padding = 16;

  // Horizontal position with smart flip
  let left = clientX + offsetX;
  if (typeof window !== 'undefined' && left + tooltipWidth > window.innerWidth - padding) {
    left = clientX - tooltipWidth - offsetX;
  }
  if (left < padding) left = padding;

  // Vertical position with smart flip
  let top = clientY + offsetY;
  if (typeof window !== 'undefined' && top + tooltipHeight > window.innerHeight - padding) {
    top = clientY - tooltipHeight - offsetY;
  }
  if (top < padding) {
    top = Math.max(padding, Math.min(clientY - 30, (typeof window !== 'undefined' ? window.innerHeight : 800) - tooltipHeight - padding));
  }

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      style={{
        position: 'fixed',
        left: `${Math.round(left)}px`,
        top: `${Math.round(top)}px`,
        zIndex: 999999,
        pointerEvents: 'none',
        transition: 'left 0.04s cubic-bezier(0.23, 1, 0.32, 1), top 0.04s cubic-bezier(0.23, 1, 0.32, 1)',
        willChange: 'left, top',
        perspective: '1000px',
      }}
      className="animate-in fade-in-0 zoom-in-95 duration-150 select-none"
    >
      {children}
    </div>,
    document.body
  );
};

// =========================================================================
// 2. 3D NEON BASE CARD CONTAINER FOR TOOLTIPS
// =========================================================================
interface Tooltip3DContainerProps {
  children: ReactNode;
  isDark?: boolean;
  glowColor?: string; // e.g. '#10b981', '#f43f5e', '#8b5cf6'
  statusType?: 'success' | 'danger' | 'warning' | 'info' | 'purple' | 'teal';
  watermarkAnimation?: ReactNode;
  className?: string;
}

export const Tooltip3DContainer: React.FC<Tooltip3DContainerProps> = ({
  children,
  isDark = false,
  glowColor = '#10b981',
  statusType = 'info',
  watermarkAnimation,
  className = '',
}) => {
  const getGlowShadow = () => {
    if (isDark) {
      return `0 20px 40px -15px rgba(0, 0, 0, 0.9), 0 0 25px -5px ${glowColor}40, inset 0 1px 1px ${glowColor}30`;
    }
    return `0 20px 35px -12px rgba(15, 23, 42, 0.25), 0 0 20px -6px ${glowColor}35, inset 0 1px 1px rgba(255, 255, 255, 0.9)`;
  };

  return (
    <div
      style={{
        boxShadow: getGlowShadow(),
        transform: 'rotateX(3deg) rotateY(-2deg) translateZ(8px)',
        transformStyle: 'preserve-3d',
      }}
      className={cn(
        'relative rounded-2xl p-4 border backdrop-blur-2xl transition-all overflow-hidden',
        isDark
          ? 'bg-slate-900/95 text-white border-slate-700/80'
          : 'bg-white/95 text-slate-900 border-slate-200/90',
        className
      )}
    >
      {/* Top Neon Ambient Sweep Line */}
      <div 
        className="absolute top-0 left-0 right-0 h-[3px] z-20"
        style={{
          background: `linear-gradient(90deg, transparent, ${glowColor}, transparent)`,
        }}
      />

      {/* 3D Radial Glow Splash */}
      <div
        className="absolute -top-12 -right-12 w-36 h-36 rounded-full pointer-events-none opacity-35 blur-xl z-0"
        style={{ background: glowColor }}
      />

      {/* Subtle Holographic Grid Pattern */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none z-0"
        style={{
          backgroundImage: `linear-gradient(${isDark ? '#fff' : '#000'} 1px, transparent 1px), linear-gradient(90deg, ${isDark ? '#fff' : '#000'} 1px, transparent 1px)`,
          backgroundSize: '16px 16px',
        }}
      />

      {/* Contextual Pertinent Background Animation */}
      {watermarkAnimation && (
        <div className="absolute right-0 bottom-0 pointer-events-none z-0 select-none overflow-hidden">
          {watermarkAnimation}
        </div>
      )}

      {/* 3D Elevated Content Layer */}
      <div className="relative z-10" style={{ transform: 'translateZ(12px)' }}>
        {children}
      </div>
    </div>
  );
};

// =========================================================================
// 3. SPECIALIZED TOOLTIP: CONSUMO POR VEÍCULO (3D + NEON + ANIMAÇÃO PERTINENTE)
// =========================================================================
interface VehicleTooltipProps {
  active?: boolean;
  payload?: any[];
  targetKml: number;
  isDark?: boolean;
}

export const VehicleConsumoTooltip: React.FC<VehicleTooltipProps> = ({
  active,
  payload,
  targetKml,
  isDark = false,
}) => {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload || {};
  const isAboveMeta = (data.kml || 0) >= targetKml;
  const glowColor = isAboveMeta ? '#10b981' : '#f43f5e';
  const diffPct = targetKml > 0 ? (((data.kml || 0) - targetKml) / targetKml) * 100 : 0;

  return (
    <PortalTooltipWrapper active={active} payload={payload}>
      <Tooltip3DContainer
        isDark={isDark}
        glowColor={glowColor}
        className="min-w-[280px] max-w-[340px]"
        watermarkAnimation={
          <svg viewBox="0 0 160 90" className="w-36 h-20 opacity-20 transform translate-x-2 translate-y-2">
            {isAboveMeta ? (
              // Eco Cruising Bus with Green Wave
              <g>
                <motion.path
                  d="M 10 70 Q 80 40 150 70"
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2"
                  strokeDasharray="4 4"
                  animate={{ strokeDashoffset: [0, -20] }}
                  transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                />
                <circle cx="120" cy="40" r="18" fill="#10b981" opacity="0.2" />
                <motion.g animate={{ y: [0, -3, 0] }} transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}>
                  <rect x="70" y="30" width="50" height="22" rx="4" fill="#10b981" opacity="0.6" />
                  <circle cx="82" cy="52" r="5" fill="#0f172a" stroke="#10b981" strokeWidth="1.5" />
                  <circle cx="108" cy="52" r="5" fill="#0f172a" stroke="#10b981" strokeWidth="1.5" />
                </motion.g>
              </g>
            ) : (
              // Alert / High Fuel Consumption Warning Radar
              <g>
                <motion.circle
                  cx="120"
                  cy="45"
                  r="28"
                  fill="none"
                  stroke="#f43f5e"
                  strokeWidth="1.5"
                  strokeDasharray="3 3"
                  animate={{ scale: [0.8, 1.25, 0.8], opacity: [0.3, 0.8, 0.3] }}
                  transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                />
                <path d="M 120 28 L 132 48 L 108 48 Z" fill="#f43f5e" opacity="0.7" />
                <circle cx="120" cy="44" r="1.5" fill="#fff" />
              </g>
            )}
          </svg>
        }
      >
        {/* Header: Placa & Frota */}
        <div className={`flex items-start justify-between gap-2 mb-2.5 pb-2 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-xl flex items-center justify-center ${
              isAboveMeta 
                ? (isDark ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-emerald-50 text-emerald-600 border border-emerald-200')
                : (isDark ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-rose-50 text-rose-600 border border-rose-200')
            }`}>
              <Truck size={16} />
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className={`w-2 h-2 rounded-full shrink-0 ${
                  isAboveMeta ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-rose-500 shadow-[0_0_10px_#f43f5e]'
                }`} />
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Ativo / Placa</span>
              </div>
              <h4 className={`font-black text-sm tracking-tight leading-tight ${isDark ? 'text-white' : 'text-slate-950'}`}>
                {data.name || 'VEÍCULO'}
              </h4>
            </div>
          </div>

          {data.frota && (
            <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black font-mono shrink-0 border shadow-xs ${
              isDark ? 'bg-slate-800/90 text-cyan-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-200'
            }`}>
              #{data.frota}
            </span>
          )}
        </div>

        {/* Metric Rows */}
        <div className="space-y-1.5 text-xs py-1">
          <div className="flex justify-between items-center">
            <span className={`text-[11px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>KM Produtivo:</span>
            <span className={`font-mono font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
              {(data.km || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} km
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className={`text-[11px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Volume Abastecido:</span>
            <span className={`font-mono font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
              {(data.litros || 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} L
            </span>
          </div>
          {data.valor !== undefined && (
            <div className="flex justify-between items-center">
              <span className={`text-[11px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Custo Combustível:</span>
              <span className={`font-mono font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                {Number(data.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>
          )}
        </div>

        {/* 3D Performance Badge with Live Efficiency Indicator */}
        <div className={`mt-3 p-2.5 rounded-xl border flex items-center justify-between shadow-sm ${
          isAboveMeta 
            ? (isDark ? 'bg-emerald-950/50 border-emerald-800/80 text-emerald-300' : 'bg-emerald-50/90 border-emerald-300 text-emerald-800')
            : (isDark ? 'bg-rose-950/50 border-rose-800/80 text-rose-300' : 'bg-rose-50/90 border-rose-300 text-rose-800')
        }`}>
          <div>
            <div className="flex items-center gap-1">
              {isAboveMeta ? <TrendingUp size={12} className="text-emerald-500" /> : <TrendingDown size={12} className="text-rose-500" />}
              <span className="text-[9px] font-black uppercase tracking-wider block opacity-80">
                Média vs Meta ({targetKml.toLocaleString('pt-BR', { minimumFractionDigits: 1 })} km/l)
              </span>
            </div>
            <span className="text-[11px] font-black flex items-center gap-1 mt-0.5">
              {isAboveMeta ? '✓ Eficiência Superada' : '⚠ Consumo Elevado'}
              <span className="text-[9px] font-mono font-bold opacity-80">
                ({diffPct >= 0 ? `+${diffPct.toFixed(1)}%` : `${diffPct.toFixed(1)}%`})
              </span>
            </span>
          </div>

          <div className="text-right">
            <span className={`text-base font-black font-mono tracking-tight block leading-none ${
              isAboveMeta ? (isDark ? 'text-emerald-300' : 'text-emerald-700') : (isDark ? 'text-rose-300' : 'text-rose-700')
            }`}>
              {(data.kml || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[9px] font-black uppercase tracking-tight opacity-75">KM/L</span>
          </div>
        </div>
      </Tooltip3DContainer>
    </PortalTooltipWrapper>
  );
};

// =========================================================================
// 4. SPECIALIZED TOOLTIP: CONSUMO POR MOTORISTA (3D + NEON + ANIMAÇÃO PERTINENTE)
// =========================================================================
interface DriverTooltipProps {
  active?: boolean;
  payload?: any[];
  targetKml: number;
  isDark?: boolean;
}

export const DriverConsumoTooltip: React.FC<DriverTooltipProps> = ({
  active,
  payload,
  targetKml,
  isDark = false,
}) => {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0].payload || {};
  const isAboveMeta = (data.kml || 0) >= targetKml;
  const glowColor = isAboveMeta ? '#10b981' : '#f43f5e';
  const diffPct = targetKml > 0 ? (((data.kml || 0) - targetKml) / targetKml) * 100 : 0;

  return (
    <PortalTooltipWrapper active={active} payload={payload}>
      <Tooltip3DContainer
        isDark={isDark}
        glowColor={glowColor}
        className="min-w-[290px] max-w-[350px]"
        watermarkAnimation={
          <svg viewBox="0 0 160 90" className="w-36 h-20 opacity-20 transform translate-x-2 translate-y-2">
            {/* Steering Wheel / Compass Navigation Ring */}
            <g transform="translate(125, 45)">
              <motion.circle
                cx="0"
                cy="0"
                r="26"
                fill="none"
                stroke={glowColor}
                strokeWidth="1.5"
                strokeDasharray="4 4"
                animate={{ rotate: [0, 360] }}
                transition={{ repeat: Infinity, duration: 12, ease: "linear" }}
              />
              <circle cx="0" cy="0" r="18" fill="none" stroke={glowColor} strokeWidth="1" />
              <line x1="-18" y1="0" x2="18" y2="0" stroke={glowColor} strokeWidth="1.5" />
              <line x1="0" y1="-18" x2="0" y2="18" stroke={glowColor} strokeWidth="1.5" />
              <circle cx="0" cy="0" r="5" fill={glowColor} />
            </g>
          </svg>
        }
      >
        {/* Header: Motorista & Frotas */}
        <div className={`flex items-start justify-between gap-2 mb-2.5 pb-2 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-xl flex items-center justify-center ${
              isAboveMeta 
                ? (isDark ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-emerald-50 text-emerald-600 border border-emerald-200')
                : (isDark ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-rose-50 text-rose-600 border border-rose-200')
            }`}>
              <User size={16} />
            </div>
            <div>
              <div className="flex items-center gap-1.5 mb-0.5">
                <span className={`w-2 h-2 rounded-full shrink-0 ${
                  isAboveMeta ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-rose-500 shadow-[0_0_10px_#f43f5e]'
                }`} />
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Condutor / Motorista</span>
              </div>
              <h4 className={`font-black text-sm tracking-tight leading-tight ${isDark ? 'text-white' : 'text-slate-950'}`}>
                {data.name || 'CONDUTOR'}
              </h4>
            </div>
          </div>

          {data.frotasList && (
            <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black font-mono shrink-0 border shadow-xs ${
              isDark ? 'bg-slate-800/90 text-indigo-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-200'
            }`}>
              {data.frotasList}
            </span>
          )}
        </div>

        {data.operacao && data.operacao !== 'N/A' && (
          <div className="mb-2">
            <span className={`text-[10px] px-2.5 py-0.5 rounded-lg font-extrabold border ${
              isDark ? 'bg-indigo-950/60 text-indigo-300 border-indigo-800' : 'bg-indigo-50 text-indigo-700 border-indigo-200'
            }`}>
              Operação: {data.operacao}
            </span>
          </div>
        )}

        <div className="space-y-1.5 text-xs py-1">
          <div className="flex justify-between items-center">
            <span className={`text-[11px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>KM Total Percorrido:</span>
            <span className={`font-mono font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
              {(data.km || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} km
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className={`text-[11px] font-semibold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>Litros Abastecidos:</span>
            <span className={`font-mono font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
              {(data.litros || 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} L
            </span>
          </div>
        </div>

        {/* 3D Performance Badge */}
        <div className={`mt-3 p-2.5 rounded-xl border flex items-center justify-between shadow-sm ${
          isAboveMeta 
            ? (isDark ? 'bg-emerald-950/50 border-emerald-800/80 text-emerald-300' : 'bg-emerald-50/90 border-emerald-300 text-emerald-800')
            : (isDark ? 'bg-rose-950/50 border-rose-800/80 text-rose-300' : 'bg-rose-50/90 border-rose-300 text-rose-800')
        }`}>
          <div>
            <span className="text-[9px] font-black uppercase tracking-wider block opacity-80">
              Desempenho ({targetKml.toLocaleString('pt-BR', { minimumFractionDigits: 1 })} km/l)
            </span>
            <span className="text-[11px] font-black flex items-center gap-1 mt-0.5">
              {isAboveMeta ? '✓ Acima da Meta' : '⚠ Abaixo da Meta'}
              <span className="text-[9px] font-mono font-bold opacity-80">
                ({diffPct >= 0 ? `+${diffPct.toFixed(1)}%` : `${diffPct.toFixed(1)}%`})
              </span>
            </span>
          </div>

          <div className="text-right">
            <span className={`text-base font-black font-mono tracking-tight block leading-none ${
              isAboveMeta ? (isDark ? 'text-emerald-300' : 'text-emerald-700') : (isDark ? 'text-rose-300' : 'text-rose-700')
            }`}>
              {(data.kml || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[9px] font-black uppercase tracking-tight opacity-75">KM/L</span>
          </div>
        </div>
      </Tooltip3DContainer>
    </PortalTooltipWrapper>
  );
};

// =========================================================================
// 5. SPECIALIZED TOOLTIP: MULTI-SERIES EVOLUTION (3D + NEON + PULSE DOTS)
// =========================================================================
interface EvolutionTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  isDark?: boolean;
}

export const GenericEvolutionTooltip: React.FC<EvolutionTooltipProps> = ({
  active,
  payload,
  label,
  isDark = false,
}) => {
  if (!active || !payload || !payload.length) return null;

  return (
    <PortalTooltipWrapper active={active} payload={payload}>
      <Tooltip3DContainer
        isDark={isDark}
        glowColor="#3b82f6"
        className="min-w-[240px] max-w-[320px]"
        watermarkAnimation={
          <svg viewBox="0 0 140 80" className="w-32 h-16 opacity-15 transform translate-x-2 translate-y-2">
            <motion.path
              d="M 10 50 Q 40 20 80 40 T 130 15"
              fill="none"
              stroke="#3b82f6"
              strokeWidth="2.5"
              strokeLinecap="round"
              animate={{ pathLength: [0.3, 1, 0.3] }}
              transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}
            />
          </svg>
        }
      >
        <div className={`flex items-center justify-between pb-2 mb-2 border-b ${isDark ? 'border-slate-800' : 'border-slate-100'}`}>
          <div className="flex items-center gap-1.5">
            <Activity size={14} className="text-blue-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
              Período / Série
            </span>
          </div>
          <span className="text-xs font-black font-mono text-blue-600 dark:text-blue-400">
            {label}
          </span>
        </div>

        <div className="space-y-2">
          {payload.map((p, idx) => {
            const val = p.value !== undefined && p.value !== null && !isNaN(Number(p.value)) 
              ? Number(p.value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) 
              : '0,00';
            const color = p.color || '#3b82f6';

            return (
              <div key={idx} className="flex items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2 min-w-0">
                  <div 
                    className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs" 
                    style={{ backgroundColor: color, boxShadow: `0 0 8px ${color}` }} 
                  />
                  <span className={`truncate text-[11px] font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    {p.name}:
                  </span>
                </div>
                <span className={`font-mono font-black text-xs ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  {val} <span className="text-[10px] font-bold text-slate-400">km/l</span>
                </span>
              </div>
            );
          })}
        </div>
      </Tooltip3DContainer>
    </PortalTooltipWrapper>
  );
};
