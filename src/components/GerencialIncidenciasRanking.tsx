import React, { useState, useMemo, useRef, MouseEvent, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  TrendingUp, 
  Settings, 
  Wrench, 
  Package, 
  FileText, 
  Fuel, 
  Gauge, 
  Truck, 
  DollarSign, 
  Award, 
  Copy, 
  Check, 
  Filter, 
  Layers, 
  Eye, 
  EyeOff, 
  Sparkles, 
  ArrowUpDown, 
  BarChart2, 
  Grid3X3, 
  Table as TableIcon,
  ChevronRight,
  ChevronLeft,
  Zap,
  Info,
  Search,
  Tag,
  SlidersHorizontal
} from 'lucide-react';

export type RankingMetricType = string;

export interface VehicleIncidenceItem {
  placa: string;
  frota: string;
  prefixo?: string;
  totalMaint: number;
  estoqueTotal: number;
  avulsoTotal: number;
  cambio: number;
  pneus: number;
  motor: number;
  eletrica: number;
  carroceria: number;
  diversos: number;
  valorFuel: number;
  litros: number;
  kmProdutivo: number;
  kml: number;
  totalGeral: number;
  fuelRecordCount?: number;
  byGroup?: Record<string, number>;
  byGrc?: Record<string, number>;
  byGre?: Record<string, number>;
  byGrd?: Record<string, number>;
}

export interface DynamicGroupButton {
  id: string;
  label: string;
  category: 'geral' | 'tecnica' | 'grc' | 'gre' | 'grd' | 'combustivel';
  categoryLabel: string;
  totalValue: number;
  vehicleCount: number;
  icon?: React.ReactNode;
}

interface GerencialIncidenciasRankingProps {
  summaryGerencialData: any[];
  summaryGerencialTotals: {
    totalMaint: number;
    estoqueTotal: number;
    avulsoTotal: number;
    valorFuel: number;
    litros: number;
    kmProdutivo: number;
    totalGeral: number;
    cambio?: number;
    pneus?: number;
    motor?: number;
    eletrica?: number;
    carroceria?: number;
    diversos?: number;
    byGroup?: Record<string, number>;
    byGrc?: Record<string, number>;
    byGre?: Record<string, number>;
    byGrd?: Record<string, number>;
  };
  maintenanceOptions?: {
    grc?: string[];
    gre?: string[];
    grd?: string[];
    [key: string]: any;
  };
  appTheme?: 'light' | 'dark-neon';
  onAuditPrefix?: (prefix: string) => void;
  onSelectPlaca?: (placa: string) => void;
}

// 3D Tilt Card Component for each vehicle item with Neon and Contextual Animations
interface Podium3DCardProps {
  item: VehicleIncidenceItem;
  rank: number;
  metricType: RankingMetricType;
  metricLabel: string;
  maxValue: number;
  totalFleetValue: number;
  isDark: boolean;
  onAudit?: (prefix: string) => void;
  onFilterPlate?: (placa: string) => void;
}

const Podium3DCard: React.FC<Podium3DCardProps> = ({
  item,
  rank,
  metricType,
  metricLabel,
  maxValue,
  totalFleetValue,
  isDark,
  onAudit,
  onFilterPlate,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleMouseMove = (e: MouseEvent<HTMLDivElement>) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;

    const rotateX = ((y - centerY) / centerY) * -8;
    const rotateY = ((x - centerX) / centerX) * 8;

    setTilt({ x: rotateX, y: rotateY });
    setMousePos({
      x: Math.round((x / rect.width) * 100),
      y: Math.round((y / rect.height) * 100),
    });
  };

  const handleCopyPlate = (e: React.MouseEvent) => {
    e.stopPropagation();
    const textToCopy = item.placa || item.frota || 'VEIC';
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  // Get primary display value according to selected metric
  const getPrimaryValue = () => {
    if (metricType.startsWith('group:')) {
      const groupName = metricType.replace('group:', '');
      const groupVal = 
        item.byGroup?.[groupName] ?? 
        item.byGrc?.[groupName] ?? 
        item.byGre?.[groupName] ?? 
        item.byGrd?.[groupName] ?? 0;
      return { 
        value: groupVal, 
        label: 'R$', 
        suffix: groupName, 
        format: 'currency' 
      };
    }

    switch (metricType) {
      case 'totalMaint': return { value: item.totalMaint, label: 'R$', suffix: 'Manutenção Total', format: 'currency' };
      case 'estoque': return { value: item.estoqueTotal, label: 'R$', suffix: 'Peças (Estoque)', format: 'currency' };
      case 'avulso': return { value: item.avulsoTotal, label: 'R$', suffix: 'NF Avulso (Serviços)', format: 'currency' };
      case 'cambio': return { value: item.cambio, label: 'R$', suffix: 'Câmbio', format: 'currency' };
      case 'pneus': return { value: item.pneus, label: 'R$', suffix: 'Pneus', format: 'currency' };
      case 'motor': return { value: item.motor, label: 'R$', suffix: 'Motor', format: 'currency' };
      case 'eletrica': return { value: item.eletrica, label: 'R$', suffix: 'Elétrica', format: 'currency' };
      case 'carroceria': return { value: item.carroceria, label: 'R$', suffix: 'Carroceria', format: 'currency' };
      case 'diversos': return { value: item.diversos, label: 'R$', suffix: 'Diversos', format: 'currency' };
      case 'totalGeral': return { value: item.totalGeral, label: 'R$', suffix: 'Total Geral', format: 'currency' };
      case 'fuelCost': return { value: item.valorFuel, label: 'R$', suffix: 'Combustível', format: 'currency' };
      case 'fuelLitros': return { value: item.litros, label: '', suffix: 'LITROS', format: 'number' };
      case 'lowestKml': return { value: item.kml, label: '', suffix: 'KM/L', format: 'decimal' };
      case 'highestKm': return { value: item.kmProdutivo, label: '', suffix: 'KM', format: 'number' };
      default: return { value: item.totalMaint, label: 'R$', suffix: metricLabel || '', format: 'currency' };
    }
  };

  const primary = getPrimaryValue();
  const pctOfMax = maxValue > 0 ? Math.min(100, Math.max(4, (primary.value / maxValue) * 100)) : 0;
  const pctOfFleet = totalFleetValue > 0 ? ((primary.value / totalFleetValue) * 100).toFixed(1) : '0.0';

  // Podium Badge Visual Styling with vibrant Neon themes
  const getPodiumBadge = () => {
    if (rank === 1) {
      return {
        bg: 'bg-gradient-to-br from-amber-400 via-amber-500 to-amber-600 text-slate-950 font-black shadow-lg shadow-amber-500/50 ring-2 ring-amber-300/80',
        glow: 'rgba(245, 158, 11, 0.35)',
        accent: '#f59e0b',
        laserGlow: '#f59e0b',
        tag: '🥇 1º LUGAR',
        borderGlow: 'border-amber-400/40 hover:border-amber-400',
        badgeColor: 'text-amber-500',
      };
    }
    if (rank === 2) {
      return {
        bg: 'bg-gradient-to-br from-slate-200 via-slate-300 to-slate-400 text-slate-900 font-black shadow-md shadow-slate-400/40 ring-2 ring-slate-200/80',
        glow: 'rgba(148, 163, 184, 0.3)',
        accent: '#94a3b8',
        laserGlow: '#38bdf8',
        tag: '🥈 2º LUGAR',
        borderGlow: 'border-slate-300/40 hover:border-slate-400',
        badgeColor: 'text-slate-500 dark:text-slate-300',
      };
    }
    if (rank === 3) {
      return {
        bg: 'bg-gradient-to-br from-amber-600 via-orange-500 to-amber-700 text-white font-black shadow-md shadow-amber-700/40 ring-2 ring-amber-600/80',
        glow: 'rgba(234, 88, 12, 0.3)',
        accent: '#ea580c',
        laserGlow: '#f97316',
        tag: '🥉 3º LUGAR',
        borderGlow: 'border-amber-600/40 hover:border-amber-500',
        badgeColor: 'text-amber-600',
      };
    }
    return {
      bg: isDark ? 'bg-slate-800 text-slate-200 border border-slate-700' : 'bg-slate-100 text-slate-800 border border-slate-200',
      glow: 'rgba(99, 102, 241, 0.22)',
      accent: '#6366f1',
      laserGlow: '#10b981',
      tag: `${rank}º LUGAR`,
      borderGlow: isDark ? 'border-slate-800 hover:border-indigo-500/40' : 'border-slate-200 hover:border-indigo-300',
      badgeColor: 'text-indigo-500',
    };
  };

  const podium = getPodiumBadge();
  const displayName = item.placa || item.frota || 'SEM IDENT.';
  const isUnassigned = displayName.toUpperCase().includes('SEM VEIC') || displayName.toUpperCase().includes('SEM PLACA');

  // Dynamically computed Neon Shadow for the card
  const getCardShadow = () => {
    if (isHovered) {
      if (rank === 1) {
        return '0 25px 50px -12px rgba(245, 158, 11, 0.35), 0 0 30px -4px rgba(245, 158, 11, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.6)';
      }
      if (rank === 2) {
        return '0 25px 50px -12px rgba(56, 189, 248, 0.25), 0 0 25px -4px rgba(56, 189, 248, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.6)';
      }
      if (rank === 3) {
        return '0 25px 50px -12px rgba(234, 88, 12, 0.25), 0 0 25px -4px rgba(234, 88, 12, 0.3), inset 0 1px 2px rgba(255, 255, 255, 0.6)';
      }
      return '0 25px 50px -12px rgba(99, 102, 241, 0.2), 0 0 20px -4px rgba(99, 102, 241, 0.25), inset 0 1px 2px rgba(255, 255, 255, 0.6)';
    }
    return isDark ? '0 12px 30px -10px rgba(0, 0, 0, 0.8)' : '0 12px 28px -10px rgba(15, 23, 42, 0.08)';
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.4, delay: (rank - 1) * 0.05, ease: [0.23, 1, 0.32, 1] }}
      style={{ perspective: 1200 }}
      className="h-full"
    >
      <div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => {
          setIsHovered(false);
          setTilt({ x: 0, y: 0 });
          setMousePos({ x: 50, y: 50 });
        }}
        onClick={() => {
          const id = item.prefixo || item.frota || item.placa;
          if (id && onAudit) onAudit(id);
        }}
        style={{
          transform: isHovered
            ? `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) translateZ(12px) scale3d(1.025, 1.025, 1.025)`
            : 'rotateX(0deg) rotateY(0deg) translateZ(0px) scale3d(1, 1, 1)',
          transformStyle: 'preserve-3d',
          boxShadow: getCardShadow(),
          transition: isHovered ? 'transform 0.08s ease-out, box-shadow 0.25s ease-out' : 'transform 0.5s cubic-bezier(0.23, 1, 0.32, 1), box-shadow 0.5s ease-out',
        }}
        className={`relative rounded-3xl p-5 sm:p-6 flex flex-col justify-between h-full transition-all duration-300 cursor-pointer overflow-hidden border group ${podium.borderGlow} ${
          isDark 
            ? 'bg-slate-900/95 text-white shadow-black/40' 
            : 'bg-white/95 text-slate-950 shadow-slate-100/90'
        }`}
      >
        {/* Holographic Specular Light Sheen */}
        <div
          className="absolute inset-0 pointer-events-none transition-opacity duration-300 z-0"
          style={{
            background: isHovered
              ? `radial-gradient(circle 240px at ${mousePos.x}% ${mousePos.y}%, ${podium.glow}, transparent 70%)`
              : 'none',
            opacity: isHovered ? 1 : 0,
          }}
        />

        {/* Top Ambient Neon Glow Bar */}
        <div 
          className="absolute top-0 left-0 right-0 h-[4px] z-20 transition-all duration-300"
          style={{
            background: `linear-gradient(90deg, transparent, ${podium.accent}, transparent)`,
            boxShadow: isHovered || rank <= 3 ? `0 0 12px ${podium.accent}` : 'none'
          }}
        />

        {/* Ambient Watermark Background SVG Animation (Contextual & Pertinent) */}
        <div className="absolute right-0 bottom-0 pointer-events-none z-0 select-none overflow-hidden translate-x-2 translate-y-2 opacity-20 group-hover:opacity-35 transition-opacity duration-500">
          {isUnassigned ? (
            // Holographic Sonar / Scanner Radar for unassigned records
            <svg viewBox="0 0 150 90" className="w-36 h-22">
              <g transform="translate(110, 45)">
                <motion.circle
                  cx="0"
                  cy="0"
                  r="32"
                  fill="none"
                  stroke="#f43f5e"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                  animate={{ scale: [0.7, 1.3, 0.7], opacity: [0.2, 0.9, 0.2] }}
                  transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
                />
                <motion.circle
                  cx="0"
                  cy="0"
                  r="18"
                  fill="none"
                  stroke="#f43f5e"
                  strokeWidth="1.5"
                  animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
                  transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
                />
                <circle cx="0" cy="0" r="4" fill="#f43f5e" />
                <motion.line
                  x1="0"
                  y1="0"
                  x2="28"
                  y2="0"
                  stroke="#f43f5e"
                  strokeWidth="2"
                  animate={{ rotate: [0, 360] }}
                  transition={{ repeat: Infinity, duration: 3, ease: "linear" }}
                  style={{ transformOrigin: "0px 0px" }}
                />
              </g>
            </svg>
          ) : (
            // Modern Cruising Bus with glowing LED headlights and animated road speed markers
            <svg viewBox="0 0 160 95" className="w-40 h-24">
              <g transform="translate(45, 25)">
                {/* Road Speed Line */}
                <motion.line
                  x1="-30"
                  y1="52"
                  x2="110"
                  y2="52"
                  stroke={podium.accent}
                  strokeWidth="2"
                  strokeDasharray="8 6"
                  animate={{ strokeDashoffset: [0, -28] }}
                  transition={{ repeat: Infinity, duration: 1.2, ease: "linear" }}
                />

                {/* Aerodynamic Bus Silhouette */}
                <motion.g
                  animate={{ y: [0, -2.5, 0] }}
                  transition={{ repeat: Infinity, duration: 2.4, ease: "easeInOut" }}
                >
                  <rect x="0" y="10" width="76" height="34" rx="6" fill={podium.accent} opacity="0.65" />
                  {/* Bus Windshield & Windows */}
                  <rect x="52" y="14" width="18" height="14" rx="2" fill="#fff" opacity="0.85" />
                  <rect x="30" y="14" width="18" height="12" rx="2" fill="#fff" opacity="0.6" />
                  <rect x="8" y="14" width="18" height="12" rx="2" fill="#fff" opacity="0.6" />

                  {/* Headlight Beam */}
                  <polygon points="76,28 115,18 115,42 76,34" fill={podium.accent} opacity="0.25" />

                  {/* Bus Wheels with Rotating Spokes */}
                  <g transform="translate(18, 44)">
                    <circle cx="0" cy="0" r="7" fill="#0f172a" stroke={podium.accent} strokeWidth="2" />
                    <motion.circle
                      cx="0"
                      cy="0"
                      r="4"
                      stroke="#fff"
                      strokeWidth="1.5"
                      strokeDasharray="2 2"
                      animate={{ rotate: [0, 360] }}
                      transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                    />
                  </g>
                  <g transform="translate(58, 44)">
                    <circle cx="0" cy="0" r="7" fill="#0f172a" stroke={podium.accent} strokeWidth="2" />
                    <motion.circle
                      cx="0"
                      cy="0"
                      r="4"
                      stroke="#fff"
                      strokeWidth="1.5"
                      strokeDasharray="2 2"
                      animate={{ rotate: [0, 360] }}
                      transition={{ repeat: Infinity, duration: 0.8, ease: "linear" }}
                    />
                  </g>
                </motion.g>
              </g>
            </svg>
          )}
        </div>

        {/* Card Content in 3D perspective layer */}
        <div className="relative z-10 flex flex-col justify-between h-full space-y-4" style={{ transform: 'translateZ(18px)' }}>
          
          {/* Header with Rank Badge and Actions */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span 
                className={`w-9 h-9 rounded-2xl flex items-center justify-center text-xs font-black shrink-0 transition-transform duration-300 group-hover:scale-110 ${podium.bg}`}
                style={{ transform: 'translateZ(10px)' }}
              >
                {rank}º
              </span>
              <span className={`text-[10px] font-black uppercase tracking-wider ${podium.badgeColor}`}>
                {podium.tag}
              </span>
            </div>

            <div className="flex items-center gap-1.5" style={{ transform: 'translateZ(10px)' }}>
              {/* Copy Plate Button */}
              <button
                type="button"
                onClick={handleCopyPlate}
                className={`p-1.5 rounded-xl border transition-all cursor-pointer ${
                  isDark 
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border-slate-700' 
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 border-slate-200'
                }`}
                title="Copiar Placa/Prefixo"
              >
                {copied ? <Check size={13} className="text-emerald-500" /> : <Copy size={13} />}
              </button>

              {/* Inspect Gear Icon */}
              <div 
                className={`p-1.5 rounded-xl border transition-all ${
                  isDark 
                    ? 'bg-slate-800 text-slate-400 group-hover:text-emerald-400 group-hover:border-emerald-500/30 border-slate-700' 
                    : 'bg-slate-100 text-slate-600 group-hover:text-emerald-700 group-hover:border-emerald-300 border-slate-200'
                }`}
                title="Auditar Veículo"
              >
                <Settings size={13} className="group-hover:rotate-90 transition-transform duration-500" />
              </div>
            </div>
          </div>

          {/* Vehicle Plate / Identifier Block */}
          <div style={{ transform: 'translateZ(12px)' }}>
            <div className="flex items-center justify-between gap-1 mb-1">
              <span className={`text-[9px] font-black uppercase tracking-wider ${
                isDark ? 'text-slate-400' : 'text-slate-500'
              }`}>
                PLACA / FROTA
              </span>
              {isUnassigned && (
                <span className="px-1.5 py-0.5 bg-rose-500/10 text-rose-500 border border-rose-500/30 rounded-md text-[8px] font-black uppercase shadow-xs animate-pulse">
                  NÃO IDENTIFICADO
                </span>
              )}
            </div>

            <h4 
              className={`text-xl sm:text-2xl font-black tracking-tight leading-tight truncate transition-colors ${
                isHovered ? 'text-emerald-500 dark:text-emerald-400' : (isDark ? 'text-white' : 'text-slate-950')
              }`}
              title={displayName}
            >
              {displayName}
            </h4>

            {item.frota && item.frota !== item.placa && (
              <p className={`text-[11px] font-bold mt-0.5 truncate ${
                isDark ? 'text-slate-400' : 'text-slate-600'
              }`}>
                Frota: <span className="font-black font-mono text-slate-800 dark:text-slate-200">{item.frota}</span>
              </p>
            )}
          </div>

          {/* Neon 3D Progress Bar with Laser Glowing Tip */}
          <div className="space-y-1.5" style={{ transform: 'translateZ(14px)' }}>
            <div className="flex items-center justify-between text-[10px] font-mono font-bold">
              <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>
                Impacto no Grupo
              </span>
              <span className="text-emerald-500 font-extrabold flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                {pctOfFleet}% da frota
              </span>
            </div>

            <div className={`relative w-full rounded-full h-2 overflow-hidden shadow-inner border ${
              isDark ? 'bg-slate-800 border-slate-700/60' : 'bg-slate-100 border-slate-300/80'
            }`}>
              <motion.div 
                initial={{ width: 0 }}
                animate={{ width: `${pctOfMax}%` }}
                transition={{ duration: 0.7, ease: 'easeOut' }}
                className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-400 rounded-full relative"
                style={{
                  boxShadow: '0 0 10px rgba(16, 185, 129, 0.8)'
                }}
              >
                {/* Laser Glowing Pulse on the edge */}
                <div className="absolute right-0 top-0 bottom-0 w-2 bg-white rounded-full opacity-80 shadow-[0_0_8px_#fff]" />
              </motion.div>
            </div>
          </div>

          {/* Primary Value Display */}
          <div 
            className={`pt-3 border-t flex items-baseline justify-between ${
              isDark ? 'border-slate-800/80' : 'border-slate-200'
            }`}
            style={{ transform: 'translateZ(20px)' }}
          >
            <div className="min-w-0 pr-2">
              <span className={`text-[9px] font-black uppercase tracking-wider block truncate ${
                isDark ? 'text-slate-400' : 'text-slate-600'
              }`} title={primary.suffix || 'Valor Total'}>
                {primary.suffix || 'Valor Total'}
              </span>
              <div className="flex items-baseline gap-1 font-mono">
                {primary.label && (
                  <span className="text-emerald-500 font-bold text-xs">
                    {primary.label}
                  </span>
                )}
                <span className={`text-lg sm:text-xl font-black tracking-tight ${
                  isDark ? 'text-white' : 'text-slate-950'
                }`}>
                  {primary.format === 'currency' 
                    ? Math.round(primary.value).toLocaleString('pt-BR')
                    : primary.format === 'decimal'
                      ? primary.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                      : primary.value.toLocaleString('pt-BR')
                  }
                </span>
                {primary.format !== 'currency' && primary.suffix && (
                  <span className="text-[10px] font-extrabold text-slate-400">
                    {primary.suffix}
                  </span>
                )}
              </div>
            </div>

            {/* Quick Pill for Secondary Sub-data */}
            <div className="text-right shrink-0">
              {metricType !== 'totalMaint' && item.totalMaint > 0 && (
                <span className={`text-[9px] font-mono font-bold block ${
                  isDark ? 'text-slate-400' : 'text-slate-600'
                }`}>
                  Manut: R$ {Math.round(item.totalMaint).toLocaleString('pt-BR', { notation: 'compact' })}
                </span>
              )}
              {metricType === 'totalMaint' && (item.estoqueTotal > 0 || item.avulsoTotal > 0) && (
                <div className="text-[8px] font-mono text-right space-y-0.5">
                  <span className="text-teal-500 font-extrabold block">
                    Est: R$ {Math.round(item.estoqueTotal).toLocaleString('pt-BR', { notation: 'compact' })}
                  </span>
                  <span className="text-indigo-400 font-extrabold block">
                    NF: R$ {Math.round(item.avulsoTotal).toLocaleString('pt-BR', { notation: 'compact' })}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Quick Footer Action Hint */}
          <div 
            className="pt-2 flex items-center justify-between text-[9px] font-black uppercase tracking-wider text-slate-400 group-hover:text-emerald-500 transition-colors"
            style={{ transform: 'translateZ(12px)' }}
          >
            <span className="flex items-center gap-1">
              <Sparkles size={11} className="text-emerald-500 group-hover:rotate-12 transition-transform" /> 
              Auditar registro
            </span>
            <ChevronRight size={13} className="transform group-hover:translate-x-1.5 transition-transform" />
          </div>

        </div>
      </div>
    </motion.div>
  );
};

export const GerencialIncidenciasRanking: React.FC<GerencialIncidenciasRankingProps> = ({
  summaryGerencialData,
  summaryGerencialTotals,
  maintenanceOptions,
  appTheme = 'light',
  onAuditPrefix,
  onSelectPlaca,
}) => {
  const isDark = appTheme === 'dark-neon';

  // Selection states for customizable ranking
  const [metricType, setMetricType] = useState<RankingMetricType>('totalMaint');
  const [rankLimit, setRankLimit] = useState<number>(5);
  const [hideUnassigned, setHideUnassigned] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [searchTerm, setSearchTerm] = useState<string>('');
  
  // Dynamic Group Category Filter and Search
  const [groupCategoryFilter, setGroupCategoryFilter] = useState<'all' | 'principais' | 'grc' | 'gre' | 'grd' | 'tecnica' | 'combustivel'>('all');
  const [groupButtonSearch, setGroupButtonSearch] = useState<string>('');
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Scroll helper for button bar
  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const scrollAmount = direction === 'left' ? -280 : 280;
      scrollContainerRef.current.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    }
  };

  // 1. EXTRACT ALL DYNAMIC GROUPS FROM THE DATASET
  const allDynamicGroups = useMemo<DynamicGroupButton[]>(() => {
    const list: DynamicGroupButton[] = [];
    const addedIds = new Set<string>();

    // A. Base Overall Totals
    list.push({
      id: 'totalMaint',
      label: 'Manutenção Total',
      category: 'geral',
      categoryLabel: 'Manutenção Geral',
      totalValue: summaryGerencialTotals.totalMaint || 0,
      vehicleCount: summaryGerencialData.filter(d => (d.totalMaint || 0) > 0).length,
      icon: <Wrench size={13} />
    });
    addedIds.add('totalMaint');

    list.push({
      id: 'estoque',
      label: 'Peças (Estoque)',
      category: 'geral',
      categoryLabel: 'Manutenção Geral',
      totalValue: summaryGerencialTotals.estoqueTotal || 0,
      vehicleCount: summaryGerencialData.filter(d => (d.estoqueTotal || 0) > 0).length,
      icon: <Package size={13} />
    });
    addedIds.add('estoque');

    list.push({
      id: 'avulso',
      label: 'Serviços (Avulso)',
      category: 'geral',
      categoryLabel: 'Manutenção Geral',
      totalValue: summaryGerencialTotals.avulsoTotal || 0,
      vehicleCount: summaryGerencialData.filter(d => (d.avulsoTotal || 0) > 0).length,
      icon: <FileText size={13} />
    });
    addedIds.add('avulso');

    // B. Base Technical Categories
    const techCategories = [
      { id: 'pneus', label: 'Pneus', val: summaryGerencialTotals.pneus || 0, icon: <Layers size={13} /> },
      { id: 'motor', label: 'Motor', val: summaryGerencialTotals.motor || 0, icon: <Zap size={13} /> },
      { id: 'cambio', label: 'Câmbio', val: summaryGerencialTotals.cambio || 0, icon: <Settings size={13} /> },
      { id: 'eletrica', label: 'Elétrica', val: summaryGerencialTotals.eletrica || 0, icon: <Sparkles size={13} /> },
      { id: 'carroceria', label: 'Carroceria', val: summaryGerencialTotals.carroceria || 0, icon: <Truck size={13} /> },
      { id: 'diversos', label: 'Diversos', val: summaryGerencialTotals.diversos || 0, icon: <Info size={13} /> },
    ];

    techCategories.forEach(cat => {
      list.push({
        id: cat.id,
        label: cat.label,
        category: 'tecnica',
        categoryLabel: 'Categorias Técnicas',
        totalValue: cat.val,
        vehicleCount: summaryGerencialData.filter(d => ((d as any)[cat.id] || 0) > 0).length,
        icon: cat.icon
      });
      addedIds.add(cat.id);
    });

    // C. Dynamic Groups from GRC (Grupo Custo)
    const grcNames = new Set<string>();
    if (maintenanceOptions?.grc) {
      maintenanceOptions.grc.forEach(g => g && grcNames.add(String(g).trim().toUpperCase()));
    }
    if (summaryGerencialTotals.byGrc) {
      Object.keys(summaryGerencialTotals.byGrc).forEach(g => g && grcNames.add(g.trim().toUpperCase()));
    }

    grcNames.forEach(name => {
      const id = `group:${name}`;
      if (!addedIds.has(id)) {
        const val = summaryGerencialTotals.byGrc?.[name] ?? 
          summaryGerencialTotals.byGroup?.[name] ?? 
          summaryGerencialData.reduce((acc, curr) => acc + (curr.byGrc?.[name] || curr.byGroup?.[name] || 0), 0);
        
        const count = summaryGerencialData.filter(d => (d.byGrc?.[name] || d.byGroup?.[name] || 0) > 0).length;
        
        list.push({
          id,
          label: name,
          category: 'grc',
          categoryLabel: 'Grupo Custo (GRC)',
          totalValue: val,
          vehicleCount: count,
          icon: <Tag size={13} />
        });
        addedIds.add(id);
      }
    });

    // D. Dynamic Groups from GRE (Grupo Estoque)
    const greNames = new Set<string>();
    if (maintenanceOptions?.gre) {
      maintenanceOptions.gre.forEach(g => g && greNames.add(String(g).trim().toUpperCase()));
    }
    if (summaryGerencialTotals.byGre) {
      Object.keys(summaryGerencialTotals.byGre).forEach(g => g && greNames.add(g.trim().toUpperCase()));
    }

    greNames.forEach(name => {
      const id = `group:${name}`;
      if (!addedIds.has(id)) {
        const val = summaryGerencialTotals.byGre?.[name] ?? 
          summaryGerencialTotals.byGroup?.[name] ?? 
          summaryGerencialData.reduce((acc, curr) => acc + (curr.byGre?.[name] || curr.byGroup?.[name] || 0), 0);
        
        const count = summaryGerencialData.filter(d => (d.byGre?.[name] || d.byGroup?.[name] || 0) > 0).length;
        
        list.push({
          id,
          label: name,
          category: 'gre',
          categoryLabel: 'Grupo Estoque (GRE)',
          totalValue: val,
          vehicleCount: count,
          icon: <Package size={13} />
        });
        addedIds.add(id);
      }
    });

    // E. Dynamic Groups from GRD (Grupo Despesa)
    const grdNames = new Set<string>();
    if (maintenanceOptions?.grd) {
      maintenanceOptions.grd.forEach(g => g && grdNames.add(String(g).trim().toUpperCase()));
    }
    if (summaryGerencialTotals.byGrd) {
      Object.keys(summaryGerencialTotals.byGrd).forEach(g => g && grdNames.add(g.trim().toUpperCase()));
    }

    grdNames.forEach(name => {
      const id = `group:${name}`;
      if (!addedIds.has(id)) {
        const val = summaryGerencialTotals.byGrd?.[name] ?? 
          summaryGerencialTotals.byGroup?.[name] ?? 
          summaryGerencialData.reduce((acc, curr) => acc + (curr.byGrd?.[name] || curr.byGroup?.[name] || 0), 0);
        
        const count = summaryGerencialData.filter(d => (d.byGrd?.[name] || d.byGroup?.[name] || 0) > 0).length;
        
        list.push({
          id,
          label: name,
          category: 'grd',
          categoryLabel: 'Grupo Despesa (GRD)',
          totalValue: val,
          vehicleCount: count,
          icon: <FileText size={13} />
        });
        addedIds.add(id);
      }
    });

    // F. Additional custom groups present in summaryGerencialTotals.byGroup
    if (summaryGerencialTotals.byGroup) {
      Object.keys(summaryGerencialTotals.byGroup).forEach(name => {
        const uName = name.trim().toUpperCase();
        const id = `group:${uName}`;
        if (!addedIds.has(id)) {
          const val = summaryGerencialTotals.byGroup?.[uName] || 0;
          const count = summaryGerencialData.filter(d => (d.byGroup?.[uName] || 0) > 0).length;
          list.push({
            id,
            label: uName,
            category: 'grc',
            categoryLabel: 'Grupo',
            totalValue: val,
            vehicleCount: count,
            icon: <Tag size={13} />
          });
          addedIds.add(id);
        }
      });
    }

    // G. Fuel & Performance
    list.push({
      id: 'totalGeral',
      label: 'Investimento Global',
      category: 'combustivel',
      categoryLabel: 'Geral & Combustível',
      totalValue: summaryGerencialTotals.totalGeral || 0,
      vehicleCount: summaryGerencialData.filter(d => (d.totalGeral || 0) > 0).length,
      icon: <DollarSign size={13} />
    });
    list.push({
      id: 'fuelCost',
      label: 'Combustível (R$)',
      category: 'combustivel',
      categoryLabel: 'Geral & Combustível',
      totalValue: summaryGerencialTotals.valorFuel || 0,
      vehicleCount: summaryGerencialData.filter(d => (d.valorFuel || 0) > 0).length,
      icon: <Fuel size={13} />
    });
    list.push({
      id: 'lowestKml',
      label: 'Menor KM/L (Consumo)',
      category: 'combustivel',
      categoryLabel: 'Geral & Combustível',
      totalValue: 0,
      vehicleCount: summaryGerencialData.filter(d => (d.kml || 0) > 0).length,
      icon: <Gauge size={13} />
    });
    list.push({
      id: 'highestKm',
      label: 'Maior KM Produtivo',
      category: 'combustivel',
      categoryLabel: 'Geral & Combustível',
      totalValue: summaryGerencialTotals.kmProdutivo || 0,
      vehicleCount: summaryGerencialData.filter(d => (d.kmProdutivo || 0) > 0).length,
      icon: <TrendingUp size={13} />
    });

    return list;
  }, [summaryGerencialTotals, summaryGerencialData, maintenanceOptions]);

  // Filtered Dynamic Buttons for toolbar
  const visibleGroupButtons = useMemo(() => {
    return allDynamicGroups.filter(btn => {
      // Category filter
      if (groupCategoryFilter === 'principais') {
        const isMain = ['totalMaint', 'estoque', 'avulso', 'pneus', 'motor', 'cambio', 'carroceria'].includes(btn.id) || btn.totalValue > 5000;
        if (!isMain) return false;
      } else if (groupCategoryFilter === 'tecnica') {
        if (btn.category !== 'tecnica') return false;
      } else if (groupCategoryFilter === 'grc') {
        if (btn.category !== 'grc') return false;
      } else if (groupCategoryFilter === 'gre') {
        if (btn.category !== 'gre') return false;
      } else if (groupCategoryFilter === 'grd') {
        if (btn.category !== 'grd') return false;
      } else if (groupCategoryFilter === 'combustivel') {
        if (btn.category !== 'combustivel') return false;
      }

      // Search term filter inside buttons
      if (groupButtonSearch.trim()) {
        const q = groupButtonSearch.toLowerCase();
        return btn.label.toLowerCase().includes(q) || btn.categoryLabel.toLowerCase().includes(q);
      }

      return true;
    });
  }, [allDynamicGroups, groupCategoryFilter, groupButtonSearch]);

  // Process data for ranking based on selected metric
  const processedRanking = useMemo(() => {
    if (!summaryGerencialData || summaryGerencialData.length === 0) return [];

    let list: VehicleIncidenceItem[] = summaryGerencialData.map((d: any) => {
      const placa = String(d.placa || d.PLACA || '').trim();
      const frota = String(d.frota || d.FROTA || '').trim();
      const prefixo = String(d.prefixo || d.PREFIXO || frota || placa).trim();
      
      const cambio = Number(d.cambio || 0);
      const pneus = Number(d.pneus || 0);
      const motor = Number(d.motor || 0);
      const eletrica = Number(d.eletrica || 0);
      const carroceria = Number(d.carroceria || 0);
      const diversos = Number(d.diversos || 0);
      const estoqueTotal = Number(d.estoqueTotal || 0);
      const avulsoTotal = Number(d.avulsoTotal || 0);
      const totalMaint = Number(d.totalMaint || (cambio + pneus + motor + eletrica + carroceria + diversos));
      
      const valorFuel = Number(d.valor || d.VALOR || 0);
      const litros = Number(d.litros || d.LITROS || 0);
      const kmProdutivo = Number(d.kmProdutivo || d.KM_PRODUTIVO || d.km || 0);
      const kml = Number(d.kml || d.KML || (litros > 0 ? kmProdutivo / litros : 0));
      const totalGeral = Number(d.totalGeral || (valorFuel + totalMaint));

      return {
        placa: placa || frota || 'SEM VEIC',
        frota,
        prefixo,
        totalMaint,
        estoqueTotal,
        avulsoTotal,
        cambio,
        pneus,
        motor,
        eletrica,
        carroceria,
        diversos,
        valorFuel,
        litros,
        kmProdutivo,
        kml,
        totalGeral,
        fuelRecordCount: d.fuelRecordCount || d.recordCount || 0,
        byGroup: d.byGroup || {},
        byGrc: d.byGrc || {},
        byGre: d.byGre || {},
        byGrd: d.byGrd || {}
      };
    });

    // Filter unassigned if enabled
    if (hideUnassigned) {
      list = list.filter(item => {
        const p = item.placa.toUpperCase();
        return !p.includes('SEM VEIC') && !p.includes('SEM PLACA') && !p.includes('NAO IDENT') && !p.includes('NÃO IDENT');
      });
    }

    // Filter search term
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      list = list.filter(item => 
        item.placa.toLowerCase().includes(q) || 
        item.frota.toLowerCase().includes(q) ||
        (item.prefixo && item.prefixo.toLowerCase().includes(q))
      );
    }

    // Sort by active metric
    list.sort((a, b) => {
      if (metricType.startsWith('group:')) {
        const groupName = metricType.replace('group:', '');
        const valA = a.byGroup?.[groupName] ?? a.byGrc?.[groupName] ?? a.byGre?.[groupName] ?? a.byGrd?.[groupName] ?? 0;
        const valB = b.byGroup?.[groupName] ?? b.byGrc?.[groupName] ?? b.byGre?.[groupName] ?? b.byGrd?.[groupName] ?? 0;
        return valB - valA;
      }

      switch (metricType) {
        case 'totalMaint': return (b.totalMaint || 0) - (a.totalMaint || 0);
        case 'estoque': return (b.estoqueTotal || 0) - (a.estoqueTotal || 0);
        case 'avulso': return (b.avulsoTotal || 0) - (a.avulsoTotal || 0);
        case 'cambio': return (b.cambio || 0) - (a.cambio || 0);
        case 'pneus': return (b.pneus || 0) - (a.pneus || 0);
        case 'motor': return (b.motor || 0) - (a.motor || 0);
        case 'eletrica': return (b.eletrica || 0) - (a.eletrica || 0);
        case 'carroceria': return (b.carroceria || 0) - (a.carroceria || 0);
        case 'diversos': return (b.diversos || 0) - (a.diversos || 0);
        case 'totalGeral': return (b.totalGeral || 0) - (a.totalGeral || 0);
        case 'fuelCost': return (b.valorFuel || 0) - (a.valorFuel || 0);
        case 'fuelLitros': return (b.litros || 0) - (a.litros || 0);
        case 'lowestKml': {
          const aKml = a.kml > 0 ? a.kml : 999999;
          const bKml = b.kml > 0 ? b.kml : 999999;
          return aKml - bKml;
        }
        case 'highestKm': return (b.kmProdutivo || 0) - (a.kmProdutivo || 0);
        default: return (b.totalMaint || 0) - (a.totalMaint || 0);
      }
    });

    return list;
  }, [summaryGerencialData, metricType, hideUnassigned, searchTerm]);

  // Selected top slice
  const topItems = useMemo(() => {
    return processedRanking.slice(0, rankLimit);
  }, [processedRanking, rankLimit]);

  // Active Metric Label
  const currentMetricObj = allDynamicGroups.find(m => m.id === metricType);
  const currentMetricLabel = currentMetricObj?.label || (metricType.startsWith('group:') ? metricType.replace('group:', '') : 'Manutenção Total');

  // Max value among top items for progress bars
  const maxValue = useMemo(() => {
    if (topItems.length === 0) return 1;
    const top = topItems[0];
    if (metricType.startsWith('group:')) {
      const groupName = metricType.replace('group:', '');
      const val = top?.byGroup?.[groupName] ?? top?.byGrc?.[groupName] ?? top?.byGre?.[groupName] ?? top?.byGrd?.[groupName] ?? 0;
      return val || 1;
    }
    switch (metricType) {
      case 'totalMaint': return top.totalMaint || 1;
      case 'estoque': return top.estoqueTotal || 1;
      case 'avulso': return top.avulsoTotal || 1;
      case 'cambio': return top.cambio || 1;
      case 'pneus': return top.pneus || 1;
      case 'motor': return top.motor || 1;
      case 'eletrica': return top.eletrica || 1;
      case 'carroceria': return top.carroceria || 1;
      case 'diversos': return top.diversos || 1;
      case 'totalGeral': return top.totalGeral || 1;
      case 'fuelCost': return top.valorFuel || 1;
      case 'fuelLitros': return top.litros || 1;
      case 'lowestKml': return Math.max(...topItems.map(t => t.kml)) || 1;
      case 'highestKm': return top.kmProdutivo || 1;
      default: return top.totalMaint || 1;
    }
  }, [topItems, metricType]);

  // Total value for this metric across entire fleet
  const totalFleetValue = useMemo(() => {
    if (metricType.startsWith('group:')) {
      const groupName = metricType.replace('group:', '');
      const fleetTotal = summaryGerencialTotals.byGroup?.[groupName] 
        ?? summaryGerencialTotals.byGrc?.[groupName] 
        ?? summaryGerencialTotals.byGre?.[groupName] 
        ?? summaryGerencialTotals.byGrd?.[groupName] 
        ?? summaryGerencialData.reduce((acc, curr) => {
          const v = curr.byGroup?.[groupName] ?? curr.byGrc?.[groupName] ?? curr.byGre?.[groupName] ?? curr.byGrd?.[groupName] ?? 0;
          return acc + (Number(v) || 0);
        }, 0);
      return fleetTotal || 0;
    }

    switch (metricType) {
      case 'totalMaint': return summaryGerencialTotals.totalMaint;
      case 'estoque': return summaryGerencialTotals.estoqueTotal;
      case 'avulso': return summaryGerencialTotals.avulsoTotal;
      case 'cambio': return summaryGerencialTotals.cambio || 0;
      case 'pneus': return summaryGerencialTotals.pneus || 0;
      case 'motor': return summaryGerencialTotals.motor || 0;
      case 'eletrica': return summaryGerencialTotals.eletrica || 0;
      case 'carroceria': return summaryGerencialTotals.carroceria || 0;
      case 'diversos': return summaryGerencialTotals.diversos || 0;
      case 'totalGeral': return summaryGerencialTotals.totalGeral;
      case 'fuelCost': return summaryGerencialTotals.valorFuel;
      case 'fuelLitros': return summaryGerencialTotals.litros;
      case 'lowestKml': return 0;
      case 'highestKm': return summaryGerencialTotals.kmProdutivo;
      default: return summaryGerencialTotals.totalMaint;
    }
  }, [summaryGerencialTotals, summaryGerencialData, metricType]);

  // Sum of values among Top Items
  const sumTopValue = useMemo(() => {
    if (metricType.startsWith('group:')) {
      const groupName = metricType.replace('group:', '');
      return topItems.reduce((acc, item) => {
        const v = item.byGroup?.[groupName] ?? item.byGrc?.[groupName] ?? item.byGre?.[groupName] ?? item.byGrd?.[groupName] ?? 0;
        return acc + v;
      }, 0);
    }

    return topItems.reduce((acc, item) => {
      switch (metricType) {
        case 'totalMaint': return acc + item.totalMaint;
        case 'estoque': return acc + item.estoqueTotal;
        case 'avulso': return acc + item.avulsoTotal;
        case 'cambio': return acc + item.cambio;
        case 'pneus': return acc + item.pneus;
        case 'motor': return acc + item.motor;
        case 'eletrica': return acc + item.eletrica;
        case 'carroceria': return acc + item.carroceria;
        case 'diversos': return acc + item.diversos;
        case 'totalGeral': return acc + item.totalGeral;
        case 'fuelCost': return acc + item.valorFuel;
        case 'fuelLitros': return acc + item.litros;
        case 'lowestKml': return acc + item.kml;
        case 'highestKm': return acc + item.kmProdutivo;
        default: return acc + item.totalMaint;
      }
    }, 0);
  }, [topItems, metricType]);

  const avgTopValue = topItems.length > 0 ? sumTopValue / topItems.length : 0;
  const topSharePct = totalFleetValue > 0 ? ((sumTopValue / totalFleetValue) * 100).toFixed(1) : '0.0';

  return (
    <div 
      id="gerencial-top-incidences" 
      className={`p-6 sm:p-8 md:p-10 rounded-[3rem] border shadow-2xl transition-all duration-300 relative overflow-hidden ${
        isDark 
          ? 'bg-slate-900 border-slate-800 shadow-slate-950/80 text-white' 
          : 'bg-white border-slate-200 shadow-slate-200/60 text-slate-900'
      }`}
    >
      {/* Subtle Background Glow Elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 dark:bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-80 h-80 bg-indigo-500/5 dark:bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Header with dynamic metrics and controls */}
      <div className="relative z-10 flex flex-col lg:flex-row lg:items-end justify-between gap-6 mb-8">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="px-3 py-1 bg-emerald-500 text-white text-[9px] font-black rounded uppercase tracking-wider shadow-xs flex items-center gap-1.5">
              <Award size={12} />
              Ranking Performance 3D
            </span>
            <span className={`px-3 py-1 text-[9px] font-black rounded uppercase tracking-wider border shadow-2xs ${
              isDark ? 'bg-indigo-950/80 text-indigo-300 border-indigo-800' : 'bg-indigo-50 text-indigo-800 border-indigo-200'
            }`}>
              Top {rankLimit} Veículos
            </span>
            {hideUnassigned && (
              <span className={`px-2.5 py-1 text-[9px] font-bold rounded uppercase tracking-wider border ${
                isDark ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-slate-100 text-slate-700 border-slate-200'
              }`}>
                Sem "SEM VEIC"
              </span>
            )}
            <span className={`px-2.5 py-1 text-[9px] font-bold rounded uppercase tracking-wider border ${
              isDark ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800' : 'bg-emerald-50 text-emerald-800 border-emerald-200'
            }`}>
              {allDynamicGroups.length} Grupos Disponíveis
            </span>
          </div>

          <h3 className={`text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-tight ${
            isDark ? 'text-white' : 'text-slate-950'
          }`}>
            Top {rankLimit} Incidências de Manutenção
          </h3>
          <p className={`text-xs font-bold uppercase tracking-widest mt-2 underline decoration-emerald-500/50 underline-offset-4 flex items-center gap-1.5 ${
            isDark ? 'text-slate-400' : 'text-slate-600'
          }`}>
            <span>Classificação Ativa:</span>
            <strong className={isDark ? 'text-emerald-400' : 'text-emerald-700'}>
              {currentMetricLabel}
            </strong>
          </p>
        </div>

        {/* Aggregate KPI Overview Box */}
        <div className={`p-4 sm:p-5 rounded-2xl border backdrop-blur-md flex flex-wrap sm:flex-nowrap items-center gap-5 sm:gap-6 shrink-0 shadow-lg ${
          isDark 
            ? 'bg-slate-800/60 border-slate-700/70 shadow-black/30' 
            : 'bg-slate-50 border-slate-200 shadow-slate-100'
        }`}>
          <div>
            <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${
              isDark ? 'text-slate-400' : 'text-slate-600'
            }`}>
              Custo Médio p/ Top {rankLimit}
            </p>
            <p className={`text-xl sm:text-2xl font-black font-mono ${
              isDark ? 'text-white' : 'text-slate-950'
            }`}>
              R$ {Math.round(avgTopValue).toLocaleString('pt-BR')}
            </p>
          </div>

          <div className={`h-10 w-[1px] hidden sm:block ${isDark ? 'bg-slate-700' : 'bg-slate-300'}`} />

          <div>
            <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${
              isDark ? 'text-slate-400' : 'text-slate-600'
            }`}>
              Representatividade
            </p>
            <p className="text-xl sm:text-2xl font-black font-mono text-emerald-500">
              {topSharePct}% <span className="text-xs font-bold text-slate-400">do grupo</span>
            </p>
          </div>
        </div>
      </div>

      {/* RICH INTERACTIVE TOOLBAR: Metric Select, Limits, Filter Toggle */}
      <div className={`relative z-10 p-4 sm:p-5 rounded-3xl border mb-6 flex flex-col gap-4 ${
        isDark 
          ? 'bg-slate-950/60 border-slate-800 shadow-inner' 
          : 'bg-slate-50/90 border-slate-200/90 shadow-2xs'
      }`}>
        
        {/* Top Toolbar Controls Row: Dropdown, Search, Limits, Hide SEM VEIC, View Toggle */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
          
          {/* Metric Selector Dropdown with all dynamic groups */}
          <div className="flex flex-wrap items-center gap-2">
            <span className={`text-xs font-black uppercase tracking-wider flex items-center gap-1.5 mr-1 ${
              isDark ? 'text-slate-400' : 'text-slate-700'
            }`}>
              <Filter size={13} className="text-emerald-500" />
              Métrica:
            </span>

            <div className="relative">
              <select
                value={metricType}
                onChange={(e) => setMetricType(e.target.value)}
                className={`text-xs font-bold py-2 pl-3 pr-8 rounded-xl border focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-xs max-w-[280px] sm:max-w-[340px] truncate ${
                  isDark 
                    ? 'bg-slate-800 border-slate-700 text-white' 
                    : 'bg-white border-slate-300 text-slate-900'
                }`}
              >
                <optgroup label="Manutenção Geral">
                  <option value="totalMaint">🛠️ Custo Manutenção Total</option>
                  <option value="estoque">📦 Custo Estoque (Peças)</option>
                  <option value="avulso">📄 Custo NF Avulso (Serviços)</option>
                </optgroup>

                <optgroup label="Categorias Técnicas">
                  <option value="pneus">🛞 Pneus</option>
                  <option value="motor">🔧 Motor</option>
                  <option value="cambio">⚙️ Câmbio</option>
                  <option value="eletrica">⚡ Elétrica</option>
                  <option value="carroceria">🚌 Carroceria</option>
                  <option value="diversos">📦 Diversos</option>
                </optgroup>

                {allDynamicGroups.some(g => g.category === 'grc') && (
                  <optgroup label="Grupos de Custo (GRC)">
                    {allDynamicGroups
                      .filter(g => g.category === 'grc')
                      .map(g => (
                        <option key={g.id} value={g.id}>
                          🏷️ {g.label} {g.totalValue > 0 ? `(R$ ${Math.round(g.totalValue).toLocaleString('pt-BR')})` : ''}
                        </option>
                      ))}
                  </optgroup>
                )}

                {allDynamicGroups.some(g => g.category === 'gre') && (
                  <optgroup label="Grupos de Estoque (GRE)">
                    {allDynamicGroups
                      .filter(g => g.category === 'gre')
                      .map(g => (
                        <option key={g.id} value={g.id}>
                          📦 {g.label} {g.totalValue > 0 ? `(R$ ${Math.round(g.totalValue).toLocaleString('pt-BR')})` : ''}
                        </option>
                      ))}
                  </optgroup>
                )}

                {allDynamicGroups.some(g => g.category === 'grd') && (
                  <optgroup label="Grupos de Despesa (GRD)">
                    {allDynamicGroups
                      .filter(g => g.category === 'grd')
                      .map(g => (
                        <option key={g.id} value={g.id}>
                          📑 {g.label} {g.totalValue > 0 ? `(R$ ${Math.round(g.totalValue).toLocaleString('pt-BR')})` : ''}
                        </option>
                      ))}
                  </optgroup>
                )}

                <optgroup label="Visão Geral & Consumo">
                  <option value="totalGeral">💰 Investimento Global (Geral)</option>
                  <option value="fuelCost">⛽ Gasto Combustível (R$)</option>
                  <option value="fuelLitros">🛢️ Litragem (Litros)</option>
                  <option value="lowestKml">🚨 Pior Média (Menor KM/L)</option>
                  <option value="highestKm">🚀 Maior KM Produtivo</option>
                </optgroup>
              </select>
            </div>
          </div>

          {/* Right Controls: Limits, Hide SEM VEIC, View Mode */}
          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto justify-between lg:justify-end">
            {/* Top Limit Buttons */}
            <div className="flex items-center gap-1">
              <span className={`text-[11px] font-bold mr-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Exibir:
              </span>
              {[5, 10, 15, 20].map(limit => (
                <button
                  key={limit}
                  type="button"
                  onClick={() => setRankLimit(limit)}
                  className={`text-xs font-black px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer ${
                    rankLimit === limit
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : isDark
                        ? 'bg-slate-800 text-slate-400 hover:text-white border-slate-700'
                        : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'
                  }`}
                >
                  Top {limit}
                </button>
              ))}
            </div>

            {/* Toggle Hide Unassigned / SEM VEIC */}
            <button
              type="button"
              onClick={() => setHideUnassigned(!hideUnassigned)}
              className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
                hideUnassigned
                  ? 'bg-amber-500/20 text-amber-500 border-amber-500/40 font-black'
                  : isDark
                    ? 'bg-slate-800 text-slate-400 hover:text-white border-slate-700'
                    : 'bg-white text-slate-700 hover:bg-slate-100 border-slate-200'
              }`}
              title="Ocultar lançamentos genéricos sem identificação de veículo"
            >
              {hideUnassigned ? <EyeOff size={13} /> : <Eye size={13} />}
              <span>Ocultar "SEM VEIC"</span>
            </button>

            <div className={`h-6 w-[1px] hidden sm:block ${isDark ? 'bg-slate-800' : 'bg-slate-200'}`} />

            {/* View Mode Toggle (Cards vs Table) - Final da Linha */}
            <div className={`flex items-center rounded-xl p-1 border ml-auto lg:ml-0 ${
              isDark ? 'bg-slate-800 border-slate-700' : 'bg-white border-slate-200'
            }`}>
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'cards'
                    ? 'bg-emerald-500 text-white shadow-xs'
                    : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Visualização em Cartões 3D"
              >
                <Grid3X3 size={14} />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'table'
                    ? 'bg-emerald-500 text-white shadow-xs'
                    : isDark ? 'text-slate-400 hover:text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
                title="Visualização em Tabela"
              >
                <TableIcon size={14} />
              </button>
            </div>
          </div>

        </div>

        {/* 2. DYNAMIC GROUP BUTTONS BAR (All existing groups dynamically inserted) */}
        <div className={`pt-3 border-t ${isDark ? 'border-slate-800/80' : 'border-slate-200/80'}`}>
          
          {/* Sub-header with Category Filter Chips & Button Search */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 mb-2.5">
            
            {/* Category Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto custom-scrollbar pb-1 text-[11px] font-bold">
              <span className={`text-[10px] uppercase font-black mr-1 shrink-0 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                Filtro Grupos:
              </span>
              {[
                { id: 'all', label: `Todos (${allDynamicGroups.length})` },
                { id: 'principais', label: '⭐ Principais' },
                { id: 'grc', label: 'Grupo Custo (GRC)' },
                { id: 'gre', label: 'Grupo Estoque (GRE)' },
                { id: 'grd', label: 'Grupo Despesa (GRD)' },
                { id: 'tecnica', label: 'Técnicos' },
              ].map(tab => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setGroupCategoryFilter(tab.id as any)}
                  className={`px-2.5 py-1 rounded-lg border transition-all cursor-pointer shrink-0 ${
                    groupCategoryFilter === tab.id
                      ? isDark 
                        ? 'bg-indigo-600 text-white border-indigo-500 shadow-xs' 
                        : 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : isDark
                        ? 'bg-slate-900/80 text-slate-400 hover:text-slate-200 border-slate-800'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Quick Search inside Dynamic Group Buttons */}
            <div className="relative shrink-0 sm:w-52">
              <Search size={12} className={`absolute left-2.5 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
              <input
                type="text"
                placeholder="Filtrar botões de grupo..."
                value={groupButtonSearch}
                onChange={(e) => setGroupButtonSearch(e.target.value)}
                className={`w-full text-xs pl-7 pr-3 py-1.5 rounded-xl border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                  isDark 
                    ? 'bg-slate-900 border-slate-800 text-white placeholder-slate-500' 
                    : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400'
                }`}
              />
              {groupButtonSearch && (
                <button
                  type="button"
                  onClick={() => setGroupButtonSearch('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-200"
                >
                  ✕
                </button>
              )}
            </div>

          </div>

          {/* DYNAMIC SCROLLABLE BUTTONS LIST */}
          <div className="relative group/scroll">
            {/* Left Scroll Button */}
            <button
              type="button"
              onClick={() => handleScroll('left')}
              className={`absolute left-0 top-1/2 -translate-y-1/2 z-20 p-1.5 rounded-full shadow-lg border transition-opacity opacity-0 group-hover/scroll:opacity-100 ${
                isDark ? 'bg-slate-800/90 text-white border-slate-700 hover:bg-slate-700' : 'bg-white/90 text-slate-800 border-slate-200 hover:bg-slate-100'
              }`}
              title="Rolar botões para a esquerda"
            >
              <ChevronLeft size={14} />
            </button>

            {/* Dynamic Buttons Row */}
            <div 
              ref={scrollContainerRef}
              className="flex items-center gap-1.5 overflow-x-auto py-1 px-1 custom-scrollbar scroll-smooth"
            >
              {visibleGroupButtons.length === 0 ? (
                <p className="text-xs text-slate-400 py-1.5 italic">
                  Nenhum grupo correspondente ao filtro "{groupButtonSearch}".
                </p>
              ) : (
                visibleGroupButtons.map(btn => {
                  const isActive = metricType === btn.id;
                  return (
                    <button
                      key={btn.id}
                      type="button"
                      onClick={() => setMetricType(btn.id)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-xl border transition-all cursor-pointer flex items-center gap-1.5 shrink-0 select-none ${
                        isActive
                          ? 'bg-emerald-500 text-white border-emerald-500 shadow-md font-black ring-2 ring-emerald-500/30'
                          : isDark
                            ? 'bg-slate-900 text-slate-300 hover:text-white hover:bg-slate-800 border-slate-800'
                            : 'bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 border-slate-200 shadow-2xs'
                      }`}
                      title={`${btn.categoryLabel}: ${btn.label} - Total: R$ ${Math.round(btn.totalValue).toLocaleString('pt-BR')} (${btn.vehicleCount} veículos)`}
                    >
                      <span className={isActive ? 'text-white' : 'text-emerald-500'}>
                        {btn.icon || <Tag size={12} />}
                      </span>
                      <span>{btn.label}</span>
                      {btn.totalValue > 0 && (
                        <span className={`text-[10px] px-1.5 py-0.2 rounded-md font-mono font-normal ml-0.5 ${
                          isActive 
                            ? 'bg-emerald-600 text-white' 
                            : isDark ? 'bg-slate-800 text-slate-400' : 'bg-slate-100 text-slate-500'
                        }`}>
                          R$ {Math.round(btn.totalValue).toLocaleString('pt-BR', { notation: 'compact' })}
                        </span>
                      )}
                    </button>
                  );
                })
              )}
            </div>

            {/* Right Scroll Button */}
            <button
              type="button"
              onClick={() => handleScroll('right')}
              className={`absolute right-0 top-1/2 -translate-y-1/2 z-20 p-1.5 rounded-full shadow-lg border transition-opacity opacity-0 group-hover/scroll:opacity-100 ${
                isDark ? 'bg-slate-800/90 text-white border-slate-700 hover:bg-slate-700' : 'bg-white/90 text-slate-800 border-slate-200 hover:bg-slate-100'
              }`}
              title="Rolar botões para a direita"
            >
              <ChevronRight size={14} />
            </button>
          </div>

        </div>

      </div>

      {/* RENDER VIEW: 3D CARDS GRID */}
      {viewMode === 'cards' ? (
        <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 ${
          rankLimit > 5 ? 'xl:grid-cols-5' : ''
        }`}>
          <AnimatePresence mode="popLayout">
            {topItems.map((item, idx) => (
              <Podium3DCard
                key={`${item.placa}-${item.frota}-${idx}`}
                item={item}
                rank={idx + 1}
                metricType={metricType}
                metricLabel={currentMetricLabel}
                maxValue={maxValue}
                totalFleetValue={totalFleetValue}
                isDark={isDark}
                onAudit={onAuditPrefix}
                onFilterPlate={onSelectPlaca}
              />
            ))}
          </AnimatePresence>
        </div>
      ) : (
        /* RENDER VIEW: MODERN 3D INTERACTIVE TABLE */
        <div className={`rounded-2xl border overflow-hidden shadow-lg ${
          isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="overflow-x-auto custom-scrollbar">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className={`border-b font-black uppercase text-[10px] tracking-wider ${
                  isDark ? 'border-slate-800 bg-slate-800/80 text-slate-300' : 'border-slate-200 bg-slate-100 text-slate-700'
                }`}>
                  <th className="py-3.5 px-4 text-center"># Rank</th>
                  <th className="py-3.5 px-4">Placa / Frota</th>
                  <th className="py-3.5 px-4">Impacto / Barra</th>
                  <th className="py-3.5 px-4 text-right">Valor Métrica ({currentMetricLabel})</th>
                  <th className="py-3.5 px-4 text-right">Manutenção Total</th>
                  <th className="py-3.5 px-4 text-right">Estoque / NF</th>
                  <th className="py-3.5 px-4 text-right">Combustível</th>
                  <th className="py-3.5 px-4 text-right">KM/L</th>
                  <th className="py-3.5 px-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className={`divide-y font-medium ${isDark ? 'divide-slate-800' : 'divide-slate-100'}`}>
                {topItems.map((item, idx) => {
                  const getRowMetricVal = () => {
                    if (metricType.startsWith('group:')) {
                      const groupName = metricType.replace('group:', '');
                      return item.byGroup?.[groupName] ?? item.byGrc?.[groupName] ?? item.byGre?.[groupName] ?? item.byGrd?.[groupName] ?? 0;
                    }
                    switch (metricType) {
                      case 'totalMaint': return item.totalMaint;
                      case 'estoque': return item.estoqueTotal;
                      case 'avulso': return item.avulsoTotal;
                      case 'cambio': return item.cambio;
                      case 'pneus': return item.pneus;
                      case 'motor': return item.motor;
                      case 'eletrica': return item.eletrica;
                      case 'carroceria': return item.carroceria;
                      case 'diversos': return item.diversos;
                      case 'totalGeral': return item.totalGeral;
                      case 'fuelCost': return item.valorFuel;
                      case 'fuelLitros': return item.litros;
                      case 'lowestKml': return item.kml;
                      case 'highestKm': return item.kmProdutivo;
                      default: return item.totalMaint;
                    }
                  };

                  const rowMetricVal = getRowMetricVal();
                  const pctOfMax = maxValue > 0 ? ((rowMetricVal / maxValue) * 100) : 0;
                  
                  return (
                    <tr 
                      key={idx}
                      onClick={() => {
                        const id = item.prefixo || item.frota || item.placa;
                        if (id && onAuditPrefix) onAuditPrefix(id);
                      }}
                      className={`transition-colors cursor-pointer group ${
                        isDark ? 'hover:bg-slate-800/60' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="py-3.5 px-4 text-center">
                        <span className={`w-7 h-7 inline-flex items-center justify-center rounded-xl font-black text-xs ${
                          idx === 0 
                            ? 'bg-amber-400 text-slate-950 shadow-xs' 
                            : idx === 1 
                              ? 'bg-slate-300 text-slate-900' 
                              : idx === 2 
                                ? 'bg-amber-600 text-white' 
                                : isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {idx + 1}º
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className={`font-black text-sm group-hover:text-emerald-500 transition-colors ${
                            isDark ? 'text-white' : 'text-slate-950'
                          }`}>
                            {item.placa}
                          </span>
                          {item.frota && item.frota !== item.placa && (
                            <span className="text-[10px] font-bold text-slate-400 font-mono">
                              ({item.frota})
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 min-w-[140px]">
                        <div className={`w-full rounded-full h-2 overflow-hidden shadow-inner ${
                          isDark ? 'bg-slate-800' : 'bg-slate-200'
                        }`}>
                          <div 
                            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(5, pctOfMax)}%` }}
                          />
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-black text-emerald-500">
                        {metricType === 'lowestKml' 
                          ? rowMetricVal.toFixed(2)
                          : metricType === 'fuelLitros' || metricType === 'highestKm'
                            ? Math.round(rowMetricVal).toLocaleString('pt-BR')
                            : `R$ ${Math.round(rowMetricVal).toLocaleString('pt-BR')}`
                        }
                      </td>

                      <td className={`py-3.5 px-4 text-right font-mono font-bold ${
                        isDark ? 'text-slate-200' : 'text-slate-800'
                      }`}>
                        R$ {Math.round(item.totalMaint).toLocaleString('pt-BR')}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono text-[10px] space-y-0.5">
                        <span className="text-teal-500 font-bold block">
                          Est: R$ {Math.round(item.estoqueTotal).toLocaleString('pt-BR', { notation: 'compact' })}
                        </span>
                        <span className="text-indigo-400 font-bold block">
                          NF: R$ {Math.round(item.avulsoTotal).toLocaleString('pt-BR', { notation: 'compact' })}
                        </span>
                      </td>

                      <td className={`py-3.5 px-4 text-right font-mono font-bold ${
                        isDark ? 'text-slate-300' : 'text-slate-700'
                      }`}>
                        R$ {Math.round(item.valorFuel).toLocaleString('pt-BR')}
                      </td>

                      <td className="py-3.5 px-4 text-right font-mono font-black text-violet-500">
                        {item.kml > 0 ? item.kml.toFixed(2) : '-'}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const id = item.prefixo || item.frota || item.placa;
                            if (id && onAuditPrefix) onAuditPrefix(id);
                          }}
                          className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                            isDark 
                              ? 'bg-slate-800 hover:bg-emerald-600 hover:text-white text-slate-300 border-slate-700' 
                              : 'bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-700 border-slate-200'
                          }`}
                          title="Auditar Veículo"
                        >
                          <Settings size={13} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Footer Info & Stats */}
      <div className={`mt-6 pt-4 border-t flex flex-col sm:flex-row items-center justify-between gap-3 text-xs ${
        isDark ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-600'
      }`}>
        <div className="flex items-center gap-2">
          <Sparkles size={14} className="text-emerald-500" />
          <span>Mostrando <strong>{topItems.length}</strong> veículos de maior demanda em <strong>{currentMetricLabel}</strong> (Total: <strong>{processedRanking.length}</strong> ativos analisados).</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setRankLimit(prev => prev === 5 ? 10 : prev === 10 ? 20 : 5)}
            className={`font-bold hover:underline transition-colors cursor-pointer ${
              isDark ? 'text-indigo-400' : 'text-indigo-700'
            }`}
          >
            {rankLimit === 5 ? 'Expandir para Top 10 →' : rankLimit === 10 ? 'Expandir para Top 20 →' : 'Reduzir para Top 5 ←'}
          </button>
        </div>
      </div>

    </div>
  );
};

export default GerencialIncidenciasRanking;
