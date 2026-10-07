import React, { useState, useRef, MouseEvent, ReactNode, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Navigation, 
  Fuel, 
  Gauge, 
  DollarSign, 
  Radio, 
  Activity, 
  Zap, 
  Cpu, 
  Satellite, 
  TrendingUp, 
  TrendingDown, 
  Compass, 
  Layers, 
  Truck, 
  Clock, 
  CheckCircle2, 
  AlertTriangle,
  ArrowUpRight,
  ShieldCheck,
  Signal,
  Sliders,
  Sparkles
} from 'lucide-react';
import { cn } from '../lib/utils';

export interface GpsStatsData {
  totalRecords?: number;
  uniqueVehicles?: number;
  uniqueDays?: number;
  totalKm?: number;
  totalKmDistancia?: number;
  totalLitros?: number;
  totalValor?: number;
  avgKml?: number;
  avgLkm?: number;
  monthly?: any[];
  byVehicle?: any[];
  daily?: any[];
}

export interface GpsMediaKpiCardsProps {
  gpsStats: GpsStatsData;
  appTheme?: 'light' | 'dark-neon';
  targetKml?: number;
  onFilterVehiclesWithLitros?: () => void;
  activeFilterCount?: number;
}

interface Interactive3DCardProps {
  children: ReactNode;
  className?: string;
  glowColor?: string;
  accentColor?: string;
  isDarkTheme?: boolean;
  index?: number;
  radarAnimation?: ReactNode;
  bgWave?: ReactNode;
}

const Interactive3DCard: React.FC<Interactive3DCardProps> = ({
  children,
  className = '',
  glowColor = 'rgba(6, 182, 212, 0.22)',
  accentColor = '#06b6d4',
  isDarkTheme = false,
  index = 0,
  radarAnimation,
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
    const rotateX = ((y - centerY) / centerY) * -6;
    const rotateY = ((x - centerX) / centerX) * 6;

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
      initial={{ opacity: 0, y: 24, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.45, delay: index * 0.08, ease: [0.23, 1, 0.32, 1] }}
      style={{ perspective: 1200 }}
      className="h-full"
    >
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          transform: isHovered
            ? `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateZ(16px) scale3d(1.02, 1.02, 1.02)`
            : 'rotateX(0deg) rotateY(0deg) translateZ(0px) scale3d(1, 1, 1)',
          transformStyle: 'preserve-3d',
          transition: isHovered ? 'transform 0.08s ease-out' : 'transform 0.5s cubic-bezier(0.23, 1, 0.32, 1)',
        }}
        className={cn(
          "group relative rounded-[2rem] p-6 flex flex-col justify-between h-full transition-all duration-500 overflow-hidden cursor-default border",
          isDarkTheme
            ? "bg-slate-900/90 border-slate-800/80 text-slate-100 shadow-2xl shadow-black/60 backdrop-blur-xl hover:border-slate-700"
            : "bg-white/95 border-slate-200/90 text-slate-900 shadow-xl shadow-slate-200/70 backdrop-blur-xl hover:border-slate-300 hover:shadow-2xl",
          className
        )}
      >
        {/* Holographic light reflection following cursor */}
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-300 z-0"
          style={{
            background: isHovered
              ? `radial-gradient(circle 280px at ${mousePos.x}% ${mousePos.y}%, ${glowColor}, transparent 70%)`
              : 'none',
            opacity: isHovered ? 1 : 0,
          }}
        />

        {/* Ambient telemetry circuit lines in the background */}
        <div className="absolute top-0 right-0 w-40 h-40 opacity-10 pointer-events-none overflow-hidden">
          <svg width="160" height="160" viewBox="0 0 160 160" fill="none">
            <circle cx="80" cy="80" r="70" stroke={accentColor} strokeWidth="1" strokeDasharray="4 4" />
            <circle cx="80" cy="80" r="50" stroke={accentColor} strokeWidth="1" />
            <circle cx="80" cy="80" r="30" stroke={accentColor} strokeWidth="1" strokeDasharray="2 2" />
            <line x1="0" y1="80" x2="160" y2="80" stroke={accentColor} strokeWidth="0.75" />
            <line x1="80" y1="0" x2="80" y2="160" stroke={accentColor} strokeWidth="0.75" />
          </svg>
        </div>

        {/* Background wave / custom visual if provided */}
        {bgWave}

        {/* Optional Radar / Pulse animation */}
        {radarAnimation}

        {/* Top glowing neon line with pulse */}
        <div 
          className="absolute top-0 left-0 right-0 h-[2.5px] z-10 transition-all duration-300 group-hover:h-[3.5px]"
          style={{
            background: `linear-gradient(90deg, transparent, ${accentColor}, transparent)`,
            boxShadow: `0 0 12px ${accentColor}`
          }}
        />

        {/* Inner Content with 3D Pop Effect */}
        <div className="relative z-10 flex flex-col justify-between h-full space-y-5">
          {children}
        </div>
      </div>
    </motion.div>
  );
};

export const GpsMediaKpiCards: React.FC<GpsMediaKpiCardsProps> = ({
  gpsStats,
  appTheme = 'light',
  targetKml = 4.0
}) => {
  const isDark = appTheme === 'dark-neon';

  // Derived metrics
  const totalKm = gpsStats.totalKm || 0;
  const totalKmDistancia = gpsStats.totalKmDistancia || 0;
  const totalLitros = gpsStats.totalLitros || 0;
  const totalValor = gpsStats.totalValor || 0;
  const avgKml = gpsStats.avgKml || 0;
  const avgLkm = gpsStats.avgLkm || 0;
  const uniqueVehicles = gpsStats.uniqueVehicles || 0;
  const uniqueDays = gpsStats.uniqueDays || 0;
  const totalRecords = gpsStats.totalRecords || 0;

  const diffKm = useMemo(() => {
    return totalKm - totalKmDistancia;
  }, [totalKm, totalKmDistancia]);

  const costPerKm = useMemo(() => {
    if (totalKm > 0 && totalValor > 0) {
      return totalValor / totalKm;
    }
    return 0;
  }, [totalKm, totalValor]);

  const avgLitersPerVehicle = useMemo(() => {
    if (uniqueVehicles > 0 && totalLitros > 0) {
      return totalLitros / uniqueVehicles;
    }
    return 0;
  }, [uniqueVehicles, totalLitros]);

  const avgLitersPerDay = useMemo(() => {
    if (uniqueDays > 0 && totalLitros > 0) {
      return totalLitros / uniqueDays;
    }
    return 0;
  }, [uniqueDays, totalLitros]);

  // Performance vs target
  const kmlDelta = useMemo(() => {
    if (!targetKml || targetKml <= 0 || avgKml <= 0) return 0;
    return ((avgKml - targetKml) / targetKml) * 100;
  }, [avgKml, targetKml]);

  return (
    <div className="space-y-6">
      {/* Telemetry Live HUD Bar */}
      <div 
        className={cn(
          "rounded-3xl p-4 sm:p-5 border transition-all duration-300 relative overflow-hidden flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-lg",
          isDark 
            ? "bg-slate-950/80 border-cyan-500/30 text-slate-200 shadow-cyan-950/30 backdrop-blur-xl" 
            : "bg-white/90 border-slate-200 text-slate-800 shadow-slate-100 backdrop-blur-xl"
        )}
      >
        {/* Ambient Top Glow Line */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_10px_#06b6d4]" />
        
        {/* Left Side: System Telemetry Status */}
        <div className="flex items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-600 to-teal-400 p-[1.5px] shadow-lg shadow-cyan-500/20 flex items-center justify-center">
              <div className={cn(
                "w-full h-full rounded-[14px] flex items-center justify-center",
                isDark ? "bg-slate-950 text-cyan-300" : "bg-slate-900 text-cyan-300"
              )}>
                <Satellite size={22} className="animate-pulse" />
              </div>
            </div>
            {/* Pulsing live beacon dot */}
            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-cyan-500 border-2 border-slate-900" />
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h4 className={cn("text-sm font-black uppercase tracking-wider", isDark ? "text-white" : "text-slate-900")}>
                Telemetria Satelital Odômetro GPS
              </h4>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-black bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 animate-pulse">
                CAN-BUS LIVE
              </span>
            </div>
            <p className={cn("text-xs font-semibold", isDark ? "text-slate-400" : "text-slate-500")}>
              Cálculo de consumo e rendimento real auditado por satélite e odômetro veicular
            </p>
          </div>
        </div>

        {/* Right Side: Quick Micro-Metrics */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Veículos Ativos */}
          <div className={cn(
            "px-3.5 py-2 rounded-2xl border flex items-center gap-2.5 transition-all",
            isDark ? "bg-slate-900/90 border-slate-800" : "bg-slate-50 border-slate-200"
          )}>
            <div className="p-1.5 rounded-lg bg-cyan-500/15 text-cyan-500">
              <Truck size={15} />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Veículos</span>
              <span className="text-xs font-black text-cyan-500 font-mono">
                {uniqueVehicles} <span className="text-[10px] text-slate-400 font-sans">unid.</span>
              </span>
            </div>
          </div>

          {/* Dias Mapeados */}
          <div className={cn(
            "px-3.5 py-2 rounded-2xl border flex items-center gap-2.5 transition-all",
            isDark ? "bg-slate-900/90 border-slate-800" : "bg-slate-50 border-slate-200"
          )}>
            <div className="p-1.5 rounded-lg bg-emerald-500/15 text-emerald-500">
              <Clock size={15} />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Período</span>
              <span className="text-xs font-black text-emerald-500 font-mono">
                {uniqueDays} <span className="text-[10px] text-slate-400 font-sans">dias</span>
              </span>
            </div>
          </div>

          {/* Registros Processados */}
          <div className={cn(
            "px-3.5 py-2 rounded-2xl border flex items-center gap-2.5 transition-all",
            isDark ? "bg-slate-900/90 border-slate-800" : "bg-slate-50 border-slate-200"
          )}>
            <div className="p-1.5 rounded-lg bg-violet-500/15 text-violet-500">
              <Cpu size={15} />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Pacotes GPS</span>
              <span className="text-xs font-black text-violet-400 font-mono">
                {totalRecords.toLocaleString('pt-BR')} <span className="text-[10px] text-slate-400 font-sans">logs</span>
              </span>
            </div>
          </div>

          {/* Status Sincronismo */}
          <div className={cn(
            "px-3.5 py-2 rounded-2xl border flex items-center gap-2",
            isDark ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-emerald-50 border-emerald-200 text-emerald-700"
          )}>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-[10px] font-black uppercase font-mono tracking-wider">Sinal 100% OK</span>
          </div>
        </div>
      </div>

      {/* 4 Holographic 3D Interactive Telemetry Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* CARD 1: Distância Total (Odômetro GPS) - Cyan Telemetry */}
        <Interactive3DCard
          index={0}
          isDarkTheme={isDark}
          glowColor="rgba(6, 182, 212, 0.25)"
          accentColor="#06b6d4"
          radarAnimation={
            <div className="absolute -bottom-8 -right-8 w-36 h-36 rounded-full pointer-events-none opacity-20">
              <div className="w-full h-full rounded-full border-2 border-cyan-500/50 animate-ping" style={{ animationDuration: '3s' }} />
            </div>
          }
        >
          {/* Card Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 flex items-center justify-center shadow-lg shadow-cyan-500/10 group-hover:scale-110 transition-transform">
                <Navigation size={22} className="transform rotate-45 stroke-[2.5]" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400 font-mono block">
                  TELEMETRIA GPS
                </span>
                <h3 className={cn("text-xs font-black uppercase tracking-tight", isDark ? "text-white" : "text-slate-800")}>
                  Distância Total (Odômetro)
                </h3>
              </div>
            </div>

            <span className="px-2.5 py-1 rounded-full text-[9px] font-mono font-bold bg-cyan-500/15 text-cyan-400 border border-cyan-500/30 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              ODÔMETRO
            </span>
          </div>

          {/* Main Hero Number with 3D Pop */}
          <div className="my-2">
            <div className="flex items-baseline gap-1.5">
              <p className={cn(
                "text-3xl sm:text-4xl font-black font-mono tracking-tight",
                isDark ? "text-cyan-300 drop-shadow-[0_0_12px_rgba(6,182,212,0.4)]" : "text-slate-900"
              )}>
                {totalKm.toLocaleString('pt-BR')}
              </p>
              <span className="text-sm font-black text-cyan-500 font-mono">KM</span>
            </div>
            <p className={cn("text-[11px] font-semibold mt-1", isDark ? "text-slate-400" : "text-slate-500")}>
              Soma calculada pela variação do odômetro físico
            </p>
          </div>

          {/* Telemetry Micro-Metrics & Sub-stats */}
          <div className={cn(
            "p-3.5 rounded-2xl border space-y-2",
            isDark ? "bg-slate-950/60 border-slate-800/80" : "bg-slate-50/80 border-slate-200/80"
          )}>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                <Compass size={12} className="text-cyan-400" />
                Dist. Trajetória GPS
              </span>
              <span className={cn("font-mono font-black", isDark ? "text-slate-200" : "text-slate-800")}>
                {totalKmDistancia.toLocaleString('pt-BR')} KM
              </span>
            </div>

            <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-gradient-to-r from-cyan-500 to-teal-400 h-full rounded-full transition-all duration-1000 shadow-[0_0_8px_#06b6d4]"
                style={{ width: `${Math.min(100, Math.max(15, (totalKmDistancia / (totalKm || 1)) * 100))}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] pt-0.5">
              <span className="text-slate-400 font-medium">Ajuste Físico vs Satélite:</span>
              <span className="font-mono font-bold text-cyan-400">
                {diffKm >= 0 ? `+${diffKm.toLocaleString('pt-BR')} KM` : `${diffKm.toLocaleString('pt-BR')} KM`}
              </span>
            </div>
          </div>
        </Interactive3DCard>


        {/* CARD 2: Total Abastecido (Litros) - Emerald Telemetry */}
        <Interactive3DCard
          index={1}
          isDarkTheme={isDark}
          glowColor="rgba(16, 185, 129, 0.25)"
          accentColor="#10b981"
          radarAnimation={
            <div className="absolute -bottom-6 -right-6 w-32 h-32 opacity-15 pointer-events-none">
              <svg viewBox="0 0 100 100" className="w-full h-full">
                <path
                  d="M0,50 Q25,35 50,50 T100,50 L100,100 L0,100 Z"
                  fill="#10b981"
                  className="animate-pulse"
                />
              </svg>
            </div>
          }
        >
          {/* Card Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shadow-lg shadow-emerald-500/10 group-hover:scale-110 transition-transform">
                <Fuel size={22} className="stroke-[2.5]" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400 font-mono block">
                  VOLUME CRUZADO
                </span>
                <h3 className={cn("text-xs font-black uppercase tracking-tight", isDark ? "text-white" : "text-slate-800")}>
                  Total Abastecido (Litros)
                </h3>
              </div>
            </div>

            <span className="px-2.5 py-1 rounded-full text-[9px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              DIESEL S10/S500
            </span>
          </div>

          {/* Main Hero Number with 3D Pop */}
          <div className="my-2">
            <div className="flex items-baseline gap-1.5">
              <p className={cn(
                "text-3xl sm:text-4xl font-black font-mono tracking-tight",
                isDark ? "text-emerald-400 drop-shadow-[0_0_12px_rgba(16,185,129,0.4)]" : "text-emerald-600"
              )}>
                {totalLitros.toLocaleString('pt-BR')}
              </p>
              <span className="text-sm font-black text-emerald-500 font-mono">L</span>
            </div>
            <p className={cn("text-[11px] font-semibold mt-1", isDark ? "text-slate-400" : "text-slate-500")}>
              Volume total cruzado das frotas mapeadas
            </p>
          </div>

          {/* Telemetry Micro-Metrics & Sub-stats */}
          <div className={cn(
            "p-3.5 rounded-2xl border space-y-2",
            isDark ? "bg-slate-950/60 border-slate-800/80" : "bg-slate-50/80 border-slate-200/80"
          )}>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                <Truck size={12} className="text-emerald-400" />
                Média / Veículo
              </span>
              <span className={cn("font-mono font-black", isDark ? "text-slate-200" : "text-slate-800")}>
                {avgLitersPerVehicle.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} L
              </span>
            </div>

            <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-1000 shadow-[0_0_8px_#10b981]"
                style={{ width: '85%' }}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] pt-0.5">
              <span className="text-slate-400 font-medium">Consumo Diário Médio:</span>
              <span className="font-mono font-bold text-emerald-400">
                {avgLitersPerDay.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} L/dia
              </span>
            </div>
          </div>
        </Interactive3DCard>


        {/* CARD 3: Média Global KM/L - Violet Telemetry */}
        <Interactive3DCard
          index={2}
          isDarkTheme={isDark}
          glowColor="rgba(168, 85, 247, 0.25)"
          accentColor="#a855f7"
          radarAnimation={
            <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full border border-purple-500/20 pointer-events-none" />
          }
        >
          {/* Card Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-purple-500/15 text-purple-400 border border-purple-500/30 flex items-center justify-center shadow-lg shadow-purple-500/10 group-hover:scale-110 transition-transform">
                <Gauge size={22} className="stroke-[2.5]" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-purple-400 font-mono block">
                  RENDIMENTO REAL
                </span>
                <h3 className={cn("text-xs font-black uppercase tracking-tight", isDark ? "text-white" : "text-slate-800")}>
                  Média Global KM/L
                </h3>
              </div>
            </div>

            {avgKml >= targetKml ? (
              <span className="px-2.5 py-1 rounded-full text-[9px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <TrendingUp size={11} />
                EFICIENTE
              </span>
            ) : (
              <span className="px-2.5 py-1 rounded-full text-[9px] font-mono font-bold bg-purple-500/15 text-purple-400 border border-purple-500/30 flex items-center gap-1">
                <Activity size={11} />
                PONDERADA
              </span>
            )}
          </div>

          {/* Main Hero Number with 3D Pop */}
          <div className="my-2">
            <div className="flex items-baseline gap-1.5">
              <p className={cn(
                "text-3xl sm:text-4xl font-black font-mono tracking-tight",
                isDark ? "text-purple-300 drop-shadow-[0_0_12px_rgba(168,85,247,0.4)]" : "text-violet-600"
              )}>
                {avgKml > 0 
                  ? avgKml.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) 
                  : '-'}
              </p>
              <span className="text-sm font-black text-purple-400 font-mono">KM/L</span>
            </div>
            <p className={cn("text-[11px] font-semibold mt-1", isDark ? "text-slate-400" : "text-slate-500")}>
              Ponderada pelo odômetro e litros auditados
            </p>
          </div>

          {/* Telemetry Micro-Metrics & Sub-stats */}
          <div className={cn(
            "p-3.5 rounded-2xl border space-y-2",
            isDark ? "bg-slate-950/60 border-slate-800/80" : "bg-slate-50/80 border-slate-200/80"
          )}>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                <Zap size={12} className="text-purple-400" />
                Consumo Específico
              </span>
              <span className={cn("font-mono font-black", isDark ? "text-slate-200" : "text-slate-800")}>
                {avgLkm > 0 ? (avgLkm * 100).toFixed(1) : '-'} L/100KM
              </span>
            </div>

            <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-gradient-to-r from-purple-500 to-indigo-500 h-full rounded-full transition-all duration-1000 shadow-[0_0_8px_#a855f7]"
                style={{ width: `${Math.min(100, Math.max(20, (avgKml / (targetKml || 4)) * 100))}%` }}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] pt-0.5">
              <span className="text-slate-400 font-medium">Meta ({targetKml.toFixed(2)} KM/L):</span>
              <span className={cn(
                "font-mono font-bold flex items-center gap-0.5",
                kmlDelta >= 0 ? "text-emerald-400" : "text-amber-400"
              )}>
                {kmlDelta >= 0 ? `+${kmlDelta.toFixed(1)}% vs Meta` : `${kmlDelta.toFixed(1)}% vs Meta`}
              </span>
            </div>
          </div>
        </Interactive3DCard>


        {/* CARD 4: Custo Total Combustível - Amber Telemetry */}
        <Interactive3DCard
          index={3}
          isDarkTheme={isDark}
          glowColor="rgba(245, 158, 11, 0.25)"
          accentColor="#f59e0b"
          radarAnimation={
            <div className="absolute -bottom-8 -left-8 w-32 h-32 rounded-full border border-amber-500/20 pointer-events-none" />
          }
        >
          {/* Card Header */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-lg shadow-amber-500/10 group-hover:scale-110 transition-transform">
                <DollarSign size={22} className="stroke-[2.5]" />
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 font-mono block">
                  INVESTIMENTO TOTAL
                </span>
                <h3 className={cn("text-xs font-black uppercase tracking-tight", isDark ? "text-white" : "text-slate-800")}>
                  Custo Combustível (R$)
                </h3>
              </div>
            </div>

            <span className="px-2.5 py-1 rounded-full text-[9px] font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              FINANCEIRO
            </span>
          </div>

          {/* Main Hero Number with 3D Pop */}
          <div className="my-2">
            <div className="flex items-baseline gap-1.5">
              <p className={cn(
                "text-2xl sm:text-3xl font-black font-mono tracking-tight",
                isDark ? "text-amber-400 drop-shadow-[0_0_12px_rgba(245,158,11,0.4)]" : "text-amber-600"
              )}>
                {totalValor > 0 
                  ? totalValor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) 
                  : 'R$ 0,00'}
              </p>
            </div>
            <p className={cn("text-[11px] font-semibold mt-1", isDark ? "text-slate-400" : "text-slate-500")}>
              Custo total estimado acumulado na operação
            </p>
          </div>

          {/* Telemetry Micro-Metrics & Sub-stats */}
          <div className={cn(
            "p-3.5 rounded-2xl border space-y-2",
            isDark ? "bg-slate-950/60 border-slate-800/80" : "bg-slate-50/80 border-slate-200/80"
          )}>
            <div className="flex items-center justify-between text-xs">
              <span className="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1">
                <Activity size={12} className="text-amber-400" />
                Custo por KM Rodado
              </span>
              <span className={cn("font-mono font-black", isDark ? "text-slate-200" : "text-slate-800")}>
                {costPerKm > 0 ? costPerKm.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) + '/KM' : '-'}
              </span>
            </div>

            <div className="w-full bg-slate-200 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div 
                className="bg-gradient-to-r from-amber-500 to-orange-400 h-full rounded-full transition-all duration-1000 shadow-[0_0_8px_#f59e0b]"
                style={{ width: '70%' }}
              />
            </div>

            <div className="flex items-center justify-between text-[10px] pt-0.5">
              <span className="text-slate-400 font-medium">Investimento Médio / Veíc:</span>
              <span className="font-mono font-bold text-amber-400">
                {uniqueVehicles > 0 
                  ? (totalValor / uniqueVehicles).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 }) 
                  : '-'}
              </span>
            </div>
          </div>
        </Interactive3DCard>

      </div>
    </div>
  );
};
export default GpsMediaKpiCards;
