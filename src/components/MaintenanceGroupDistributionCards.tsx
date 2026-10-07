import React, { useState, useMemo } from 'react';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { 
  ShoppingBag, 
  Package, 
  Receipt, 
  Sparkles, 
  TrendingUp, 
  Layers, 
  Maximize2, 
  Search, 
  ArrowUpDown, 
  X, 
  Filter, 
  BarChart3, 
  Zap, 
  ArrowUpRight,
  Truck,
  Wrench,
  Check
} from 'lucide-react';

export interface GroupItemData {
  name: string;
  value: number;
  count: number;
  avulso?: number;
  estoque?: number;
  topVehicle?: string;
  topVehicleVal?: number;
  topMaterial?: string;
  topMaterialVal?: number;
  distinctVehiclesCount?: number;
}

interface MaintenanceGroupDistributionCardsProps {
  grcData: GroupItemData[];
  greData: GroupItemData[];
  grdData: GroupItemData[];
  onSelectGroup?: (type: 'grc' | 'gre' | 'grd', name: string) => void;
  onAuditPrefix?: (prefix: string) => void;
  isDark?: boolean;
}

// 8 Vibrant Neon Gradients for GRC (Purchase Group)
const GRC_PALETTES = [
  { id: 'grc-neon-0', name: 'Electric Cyan', start: '#00f2fe', end: '#4facfe', shadow: 'rgba(0, 242, 254, 0.65)', solid: '#06b6d4', text: '#0891b2' },
  { id: 'grc-neon-1', name: 'Neon Emerald', start: '#10b981', end: '#059669', shadow: 'rgba(16, 185, 129, 0.65)', solid: '#10b981', text: '#059669' },
  { id: 'grc-neon-2', name: 'Solar Amber', start: '#f59e0b', end: '#d97706', shadow: 'rgba(245, 158, 11, 0.65)', solid: '#f59e0b', text: '#d97706' },
  { id: 'grc-neon-3', name: 'Crimson Laser', start: '#ef4444', end: '#b91c1c', shadow: 'rgba(239, 68, 68, 0.65)', solid: '#ef4444', text: '#dc2626' },
  { id: 'grc-neon-4', name: 'Cyber Violet', start: '#8b5cf6', end: '#6d28d9', shadow: 'rgba(139, 92, 246, 0.65)', solid: '#8b5cf6', text: '#7c3aed' },
  { id: 'grc-neon-5', name: 'Vivid Blue', start: '#3b82f6', end: '#1d4ed8', shadow: 'rgba(59, 130, 246, 0.65)', solid: '#3b82f6', text: '#2563eb' },
  { id: 'grc-neon-6', name: 'Hot Pink', start: '#ec4899', end: '#be185d', shadow: 'rgba(236, 72, 153, 0.65)', solid: '#ec4899', text: '#db2777' },
  { id: 'grc-neon-7', name: 'Neon Orange', start: '#f97316', end: '#c2410c', shadow: 'rgba(249, 115, 22, 0.65)', solid: '#f97316', text: '#ea580c' },
];

// 8 Vibrant Neon Gradients for GRE (Inventory Group)
const GRE_PALETTES = [
  { id: 'gre-neon-0', name: 'Cyber Indigo', start: '#6366f1', end: '#4338ca', shadow: 'rgba(99, 102, 241, 0.65)', solid: '#6366f1', text: '#4f46e5' },
  { id: 'gre-neon-1', name: 'Electric Turquoise', start: '#06b6d4', end: '#0e7490', shadow: 'rgba(6, 182, 212, 0.65)', solid: '#06b6d4', text: '#0891b2' },
  { id: 'gre-neon-2', name: 'Vivid Magenta', start: '#ec4899', end: '#a21caf', shadow: 'rgba(236, 72, 153, 0.65)', solid: '#d946ef', text: '#c026d3' },
  { id: 'gre-neon-3', name: 'Flame Gold', start: '#f97316', end: '#ea580c', shadow: 'rgba(249, 115, 22, 0.65)', solid: '#f97316', text: '#ea580c' },
  { id: 'gre-neon-4', name: 'Mint Teal', start: '#14b8a6', end: '#0f766e', shadow: 'rgba(20, 184, 166, 0.65)', solid: '#14b8a6', text: '#0d9488' },
  { id: 'gre-neon-5', name: 'Royal Purple', start: '#a855f7', end: '#7e22ce', shadow: 'rgba(168, 85, 247, 0.65)', solid: '#a855f7', text: '#9333ea' },
  { id: 'gre-neon-6', name: 'Cobalt Sky', start: '#0284c7', end: '#0369a1', shadow: 'rgba(2, 132, 199, 0.65)', solid: '#0284c7', text: '#0284c7' },
  { id: 'gre-neon-7', name: 'Neon Jade', start: '#10b981', end: '#047857', shadow: 'rgba(16, 185, 129, 0.65)', solid: '#10b981', text: '#059669' },
];

// 8 Vibrant Neon Gradients for GRD (Expense Group)
const GRD_PALETTES = [
  { id: 'grd-neon-0', name: 'Neon Coral', start: '#f43f5e', end: '#be123c', shadow: 'rgba(244, 63, 94, 0.65)', solid: '#f43f5e', text: '#e11d48' },
  { id: 'grd-neon-1', name: 'Electric Lime', start: '#84cc16', end: '#4d7c0f', shadow: 'rgba(132, 204, 22, 0.65)', solid: '#84cc16', text: '#65a30d' },
  { id: 'grd-neon-2', name: 'Neon Azure', start: '#3b82f6', end: '#1d4ed8', shadow: 'rgba(59, 130, 246, 0.65)', solid: '#3b82f6', text: '#2563eb' },
  { id: 'grd-neon-3', name: 'Laser Fuchsia', start: '#d946ef', end: '#a21caf', shadow: 'rgba(217, 70, 239, 0.65)', solid: '#d946ef', text: '#c026d3' },
  { id: 'grd-neon-4', name: 'Solar Amber', start: '#f59e0b', end: '#b45309', shadow: 'rgba(245, 158, 11, 0.65)', solid: '#f59e0b', text: '#d97706' },
  { id: 'grd-neon-5', name: 'Aurora Emerald', start: '#10b981', end: '#047857', shadow: 'rgba(16, 185, 129, 0.65)', solid: '#10b981', text: '#059669' },
  { id: 'grd-neon-6', name: 'Cyber Violet', start: '#6366f1', end: '#4338ca', shadow: 'rgba(99, 102, 241, 0.65)', solid: '#6366f1', text: '#4f46e5' },
  { id: 'grd-neon-7', name: 'Aquamarine', start: '#06b6d4', end: '#0e7490', shadow: 'rgba(6, 182, 212, 0.65)', solid: '#06b6d4', text: '#0891b2' },
];

/**
 * Rich Holographic / Cyber Tooltip for Donut Charts
 */
interface CustomGroupTooltipProps {
  active?: boolean;
  payload?: any[];
  totalGroupVal: number;
  groupTypeLabel: string;
  palette: typeof GRC_PALETTES;
}

const CustomGroupTooltip: React.FC<CustomGroupTooltipProps> = ({
  active,
  payload,
  totalGroupVal,
  groupTypeLabel,
  palette
}) => {
  if (!active || !payload || !payload.length) return null;

  const data = payload[0].payload as GroupItemData;
  const index = payload[0].index !== undefined ? payload[0].index : 0;
  const color = palette[index % palette.length];
  const value = Number(data.value) || 0;
  const pct = totalGroupVal > 0 ? ((value / totalGroupVal) * 100).toFixed(1) : '0';
  
  const avulsoVal = Number(data.avulso) || 0;
  const estoqueVal = Number(data.estoque) || 0;
  const hasSplit = (avulsoVal + estoqueVal) > 0;
  const avulsoPct = value > 0 ? ((avulsoVal / value) * 100).toFixed(0) : '0';
  const estoquePct = value > 0 ? ((estoqueVal / value) * 100).toFixed(0) : '0';
  const avgTicket = data.count > 0 ? (value / data.count) : value;

  return (
    <div className="relative z-[999999] bg-slate-950/98 backdrop-blur-2xl border border-slate-700/90 rounded-2xl p-4 shadow-[0_20px_50px_rgba(0,0,0,0.7)] text-white min-w-[280px] max-w-[340px] pointer-events-none ring-1 ring-white/20 animate-in fade-in zoom-in-95 duration-150">
      {/* Glow Top Accent Line */}
      <div 
        className="absolute top-0 left-4 right-4 h-1 rounded-full shadow-lg"
        style={{
          background: `linear-gradient(90deg, ${color.start}, ${color.end})`,
          boxShadow: `0 0 14px ${color.shadow}`
        }}
      />

      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-2.5 pt-1">
        <div className="flex items-center gap-2 min-w-0">
          <div 
            className="w-3 h-3 rounded-full shrink-0 shadow-md animate-pulse"
            style={{ 
              backgroundColor: color.solid,
              boxShadow: `0 0 8px ${color.shadow}`
            }}
          />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-200 bg-slate-800/90 px-1.5 py-0.5 rounded border border-slate-700">
                {groupTypeLabel} • #{index + 1}
              </span>
            </div>
            <h5 className="font-black text-sm text-white truncate max-w-[180px] mt-0.5" title={data.name}>
              {data.name}
            </h5>
          </div>
        </div>

        <div className="text-right shrink-0">
          <span 
            className="px-2.5 py-1 rounded-lg text-xs font-black font-mono shadow-sm"
            style={{
              backgroundColor: `${color.solid}30`,
              color: color.start,
              border: `1px solid ${color.solid}70`
            }}
          >
            {pct}%
          </span>
        </div>
      </div>

      {/* Main Value Display */}
      <div className="my-3 p-2.5 rounded-xl bg-slate-900/95 border border-slate-800 flex items-center justify-between">
        <div>
          <span className="text-[9px] uppercase font-bold text-slate-300 block tracking-wider">Valor Total</span>
          <span className="text-base font-black font-mono text-white tracking-tight">
            R$ {value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div className="text-right">
          <span className="text-[9px] uppercase font-bold text-slate-300 block tracking-wider">Lançamentos</span>
          <span className="text-xs font-black text-cyan-300 font-mono">
            {data.count || 1} reg.
          </span>
        </div>
      </div>

      {/* Split: Estoque vs Avulso (if applicable) */}
      {hasSplit && (
        <div className="mb-3 space-y-1.5">
          <div className="flex items-center justify-between text-[10px] font-bold">
            <span className="flex items-center gap-1 text-emerald-300 font-semibold">
              <Package size={11} className="text-emerald-400" /> Estoque: R$ {estoqueVal.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} ({estoquePct}%)
            </span>
            <span className="flex items-center gap-1 text-blue-300 font-semibold">
              <Receipt size={11} className="text-blue-400" /> Avulso: R$ {avulsoVal.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} ({avulsoPct}%)
            </span>
          </div>
          <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden flex shadow-inner border border-slate-700/50">
            <div 
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
              style={{ width: `${estoquePct}%` }}
              title={`Estoque: ${estoquePct}%`}
            />
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-400 transition-all duration-300"
              style={{ width: `${avulsoPct}%` }}
              title={`Avulso: ${avulsoPct}%`}
            />
          </div>
        </div>
      )}

      {/* Additional Operational Info */}
      <div className="grid grid-cols-2 gap-2 text-[10px] pt-2 border-t border-slate-800">
        <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
          <span className="text-slate-300 block text-[9px] font-bold">Ticket Médio</span>
          <span className="font-black text-slate-100 font-mono">
            R$ {avgTicket.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </span>
        </div>
        <div className="bg-slate-900/80 p-2 rounded-lg border border-slate-800">
          <span className="text-slate-300 block text-[9px] font-bold truncate">
            {data.topVehicle ? 'Principal Frota' : 'Frotas'}
          </span>
          <span className="font-black text-amber-300 truncate block">
            {data.topVehicle && data.topVehicle !== '-' ? `Frota ${data.topVehicle}` : `${data.distinctVehiclesCount || 1} frotas`}
          </span>
        </div>
      </div>
    </div>
  );
};

/**
 * Individual Single Group Donut Card
 */
interface SingleGroupCardProps {
  title: string;
  subtitle: string;
  badgeLabel: string;
  type: 'grc' | 'gre' | 'grd';
  icon: React.ReactNode;
  iconBg: string;
  iconColor: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  glowClass: string;
  palette: typeof GRC_PALETTES;
  data: GroupItemData[];
  onSelectGroup?: (type: 'grc' | 'gre' | 'grd', name: string) => void;
  onOpenExplosionModal: (title: string, type: 'grc' | 'gre' | 'grd', items: GroupItemData[], palette: typeof GRC_PALETTES) => void;
  isDark?: boolean;
}

const SingleGroupCard: React.FC<SingleGroupCardProps> = ({
  title,
  subtitle,
  badgeLabel,
  type,
  icon,
  iconBg,
  iconColor,
  badgeBg,
  badgeText,
  badgeBorder,
  glowClass,
  palette,
  data,
  onSelectGroup,
  onOpenExplosionModal,
  isDark
}) => {
  const [hoveredSlice, setHoveredSlice] = useState<GroupItemData | null>(null);
  const [activeSliceIndex, setActiveSliceIndex] = useState<number | null>(null);
  const [displayLimit, setDisplayLimit] = useState<number>(6);

  const totalValue = useMemo(() => {
    return data.reduce((acc, curr) => acc + (curr.value || 0), 0);
  }, [data]);

  const topCategory = data[0] || null;
  const topPct = topCategory && totalValue > 0 ? ((topCategory.value / totalValue) * 100).toFixed(1) : '0';
  const totalLaunches = useMemo(() => data.reduce((acc, curr) => acc + (curr.count || 1), 0), [data]);
  const avgGroupVal = data.length > 0 ? (totalValue / data.length) : 0;

  // Chart data: Slice top 8, cluster rest as "Outros" if there are more
  const chartSlices = useMemo(() => {
    if (data.length <= 8) return data;
    const top7 = data.slice(0, 7);
    const others = data.slice(7);
    const othersVal = others.reduce((acc, c) => acc + (c.value || 0), 0);
    const othersCount = others.reduce((acc, c) => acc + (c.count || 1), 0);
    const othersEstoque = others.reduce((acc, c) => acc + (c.estoque || 0), 0);
    const othersAvulso = others.reduce((acc, c) => acc + (c.avulso || 0), 0);

    return [
      ...top7,
      {
        name: `Outros (${others.length} grupos)`,
        value: othersVal,
        count: othersCount,
        estoque: othersEstoque,
        avulso: othersAvulso
      }
    ];
  }, [data]);

  return (
    <div 
      className={`relative p-6 rounded-3xl border shadow-sm flex flex-col justify-between transition-all duration-300 hover:shadow-xl group/card ${
        isDark ? 'bg-slate-900/90 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}
      style={{
        backgroundImage: isDark 
          ? 'radial-gradient(ellipse at top right, rgba(30, 41, 59, 0.4), transparent 70%)'
          : 'radial-gradient(ellipse at top right, rgba(241, 245, 249, 0.8), transparent 70%)'
      }}
    >
      {/* Top Ambient Glow Line */}
      <div 
        className="absolute -top-[1px] left-8 right-8 h-[2px] rounded-full opacity-60 group-hover/card:opacity-100 transition-opacity"
        style={{
          background: `linear-gradient(90deg, transparent, ${palette[0].start}, ${palette[1].start}, transparent)`,
          boxShadow: `0 0 16px ${palette[0].shadow}`
        }}
      />

      <div>
        {/* Card Header with Glowing Icon & Total Badge */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-2xl ${iconBg} ${iconColor} shadow-md shrink-0 flex items-center justify-center transition-transform group-hover/card:scale-105 duration-300 relative`}>
              {icon}
              {/* Mini glowing indicator */}
              <span 
                className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full shadow-md animate-ping opacity-75"
                style={{ backgroundColor: palette[0].solid }}
              />
              <span 
                className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full shadow-md"
                style={{ backgroundColor: palette[0].solid }}
              />
            </div>
            <div>
              <h4 className={`text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                <span>{title}</span>
              </h4>
              <p className={`text-[10px] font-bold mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                {badgeLabel} • <span className={`font-extrabold ${isDark ? 'text-slate-300' : 'text-slate-900'}`}>{data.length}</span> categorias
              </p>
            </div>
          </div>

          <div className="text-right">
            <span 
              className={`inline-flex items-center gap-1 text-[11px] font-black px-2.5 py-1 rounded-xl border font-mono shadow-xs ${badgeBg} ${badgeText} ${badgeBorder}`}
              style={{
                boxShadow: `0 2px 10px ${palette[0].shadow}`
              }}
            >
              R$ {totalValue.toLocaleString('pt-BR', { notation: 'compact' })}
            </span>
          </div>
        </div>

        {/* Quick Insights Sub-bar */}
        <div className={`grid grid-cols-2 gap-2 mb-4 p-2.5 rounded-2xl border text-[10px] ${
          isDark 
            ? 'bg-slate-800/80 border-slate-700/80' 
            : 'bg-slate-100 border-slate-300/80'
        }`}>
          <div className="flex items-center gap-1.5 truncate">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-xs shrink-0" />
            <span className={`font-bold uppercase text-[9px] tracking-wider shrink-0 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Líder:
            </span>
            <span className={`font-extrabold truncate ${isDark ? 'text-slate-100' : 'text-slate-950'}`} title={topCategory?.name}>
              {topCategory?.name || '-'}
            </span>
            <span className={`font-mono font-black shrink-0 ml-0.5 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
              ({topPct}%)
            </span>
          </div>
          <div className="flex items-center justify-end gap-1.5 font-mono">
            <span className={`text-[9px] uppercase font-bold tracking-wider ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              Média:
            </span>
            <span className={`font-black ${isDark ? 'text-slate-100' : 'text-slate-950'}`}>
              R$ {avgGroupVal.toLocaleString('pt-BR', { notation: 'compact' })}
            </span>
          </div>
        </div>

        {/* 3D NEON DONUT CHART CANVAS */}
        <div className="h-[230px] relative my-1">
          {/* Subtle Ambient Background 3D Depth Rings (z-0) */}
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0">
            <div className={`w-[180px] h-[180px] rounded-full border border-dashed animate-[spin_60s_linear_infinite] ${
              isDark ? 'border-slate-700/60' : 'border-slate-300/80'
            }`} />
            <div 
              className="absolute w-[150px] h-[150px] rounded-full opacity-25 blur-xl transition-all duration-500"
              style={{ 
                background: hoveredSlice 
                  ? `radial-gradient(circle, ${palette[activeSliceIndex !== null ? activeSliceIndex % palette.length : 0].start} 0%, transparent 70%)`
                  : `radial-gradient(circle, ${palette[0].start} 0%, transparent 70%)` 
              }}
            />
          </div>

          {/* 3D HOLOGRAPHIC CENTER HUB (z-10, sits underneath the Recharts Tooltip) */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4 z-10">
            <div className={`w-[102px] h-[102px] rounded-full flex flex-col items-center justify-center backdrop-blur-md shadow-lg border p-2 transform transition-all duration-300 ${
              isDark ? 'bg-slate-900/95 border-slate-700' : 'bg-white border-slate-300 shadow-md'
            }`}>
              {hoveredSlice ? (
                <>
                  <span className={`text-[9px] font-black truncate max-w-[85px] uppercase tracking-wider ${
                    isDark ? 'text-slate-300' : 'text-slate-800'
                  }`}>
                    {hoveredSlice.name}
                  </span>
                  <span className={`text-xs font-black font-mono mt-0.5 tracking-tight ${
                    isDark ? 'text-white' : 'text-slate-950'
                  }`}>
                    R$ {Number(hoveredSlice.value || 0).toLocaleString('pt-BR', { notation: 'compact' })}
                  </span>
                  <span 
                    className="text-[9px] font-black px-1.5 py-0.2 rounded-full mt-0.5 shadow-2xs font-mono"
                    style={{
                      backgroundColor: `${palette[activeSliceIndex !== null ? activeSliceIndex % palette.length : 0].solid}25`,
                      color: palette[activeSliceIndex !== null ? activeSliceIndex % palette.length : 0].solid
                    }}
                  >
                    {totalValue > 0 ? (((hoveredSlice.value || 0) / totalValue) * 100).toFixed(1) : 0}%
                  </span>
                </>
              ) : (
                <>
                  <span className={`text-[9px] font-black uppercase tracking-widest ${
                    isDark ? 'text-slate-400' : 'text-slate-700'
                  }`}>
                    {badgeLabel}
                  </span>
                  <span className={`text-sm font-black font-mono tracking-tight ${
                    isDark ? 'text-white' : 'text-slate-950'
                  }`}>
                    R$ {totalValue.toLocaleString('pt-BR', { notation: 'compact' })}
                  </span>
                  <span className={`text-[9px] font-bold mt-0.5 ${
                    isDark ? 'text-slate-400' : 'text-slate-700'
                  }`}>
                    {data.length} grupos
                  </span>
                </>
              )}
            </div>
          </div>

          {/* SVG Recharts Container (z-30 so Tooltip is on top of Center Hub) */}
          <div className="relative z-30 w-full h-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                {/* SVG Linear Gradients Definition for 3D Neon Metallic Finish */}
                <defs>
                  {palette.map((p, idx) => (
                    <linearGradient key={p.id} id={p.id} x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor={p.start} stopOpacity={1} />
                      <stop offset="100%" stopColor={p.end} stopOpacity={1} />
                    </linearGradient>
                  ))}
                  {/* 3D Drop Shadow / Glow Filter */}
                  <filter id={`neon-glow-${type}`} x="-20%" y="-20%" width="140%" height="140%">
                    <feDropShadow dx="0" dy="4" stdDeviation="6" floodColor="#000000" floodOpacity="0.25" />
                    <feDropShadow dx="0" dy="0" stdDeviation="4" floodColor={palette[0].solid} floodOpacity="0.3" />
                  </filter>
                </defs>

                <Pie
                  data={chartSlices}
                  cx="50%"
                  cy="50%"
                  innerRadius={56}
                  outerRadius={78}
                  paddingAngle={4}
                  cornerRadius={5}
                  dataKey="value"
                  animationBegin={0}
                  animationDuration={900}
                  animationEasing="ease-out"
                  onMouseEnter={(entry: any, index: number) => {
                    setHoveredSlice((entry?.payload || entry) as GroupItemData);
                    setActiveSliceIndex(index);
                  }}
                  onMouseLeave={() => {
                    setHoveredSlice(null);
                    setActiveSliceIndex(null);
                  }}
                  onClick={(entry: any) => {
                    const item = (entry?.payload || entry) as GroupItemData;
                    if (onSelectGroup && item?.name) {
                      onSelectGroup(type, item.name);
                    }
                  }}
                >
                  {chartSlices.map((entry, index) => {
                    const p = palette[index % palette.length];
                    const isHovered = activeSliceIndex === index;
                    return (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={`url(#${p.id})`}
                        stroke={isHovered ? '#ffffff' : (isDark ? '#0f172a' : '#ffffff')}
                        strokeWidth={isHovered ? 2.5 : 1.5}
                        className="transition-all duration-300 cursor-pointer"
                        style={{
                          filter: isHovered 
                            ? `drop-shadow(0 0 10px ${p.shadow}) drop-shadow(0 6px 12px rgba(0,0,0,0.35))`
                            : 'drop-shadow(0 2px 4px rgba(0,0,0,0.12))',
                          transform: isHovered ? 'scale(1.04)' : 'scale(1)',
                          transformOrigin: 'center center',
                          opacity: hoveredSlice && !isHovered ? 0.6 : 1
                        }}
                      />
                    );
                  })}
                </Pie>

                <Tooltip 
                  wrapperStyle={{ zIndex: 999999, pointerEvents: 'none' }}
                  allowEscapeViewBox={{ x: true, y: true }}
                  content={
                    <CustomGroupTooltip 
                      totalGroupVal={totalValue} 
                      groupTypeLabel={badgeLabel} 
                      palette={palette}
                    />
                  }
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* DETAILED EXPANDABLE DISTRIBUTION LIST WITH VALUES & NEON BARS */}
      <div className={`mt-4 pt-3 border-t ${isDark ? 'border-slate-800' : 'border-slate-200'}`}>
        <div className="flex items-center justify-between mb-2">
          <span className={`text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 ${
            isDark ? 'text-slate-300' : 'text-slate-900'
          }`}>
            <BarChart3 size={13} className={isDark ? 'text-slate-400' : 'text-slate-700'} />
            Ranking de Distribuição
          </span>
          <button
            type="button"
            onClick={() => onOpenExplosionModal(title, type, data, palette)}
            className={`text-[10px] font-extrabold flex items-center gap-1 hover:underline cursor-pointer transition-colors ${
              isDark ? 'text-indigo-400 hover:text-indigo-300' : 'text-indigo-700 hover:text-indigo-900'
            }`}
          >
            <span>Ver todos ({data.length})</span>
            <Maximize2 size={11} />
          </button>
        </div>

        <div className="max-h-[175px] overflow-y-auto pr-1 space-y-2 custom-scrollbar">
          {data.slice(0, displayLimit).map((item, idx) => {
            const pct = totalValue > 0 ? ((item.value / totalValue) * 100).toFixed(1) : '0';
            const color = palette[idx % palette.length];
            const isHovered = activeSliceIndex === idx;

            const avulsoVal = item.avulso || 0;
            const estoqueVal = item.estoque || 0;
            const hasSplit = (avulsoVal + estoqueVal) > 0;
            const avulsoPct = item.value > 0 ? ((avulsoVal / item.value) * 100).toFixed(0) : '0';
            const estoquePct = item.value > 0 ? ((estoqueVal / item.value) * 100).toFixed(0) : '0';

            return (
              <div 
                key={idx}
                onMouseEnter={() => {
                  setHoveredSlice(item);
                  setActiveSliceIndex(idx);
                }}
                onMouseLeave={() => {
                  setHoveredSlice(null);
                  setActiveSliceIndex(null);
                }}
                onClick={() => {
                  if (onSelectGroup && item.name) {
                    onSelectGroup(type, item.name);
                  }
                }}
                className={`group/item text-[11px] p-2 rounded-2xl transition-all duration-200 cursor-pointer border ${
                  isHovered 
                    ? (isDark ? 'bg-slate-800 border-slate-600 shadow-xs' : 'bg-slate-100 border-slate-300 shadow-xs')
                    : (isDark ? 'hover:bg-slate-800/50 border-transparent' : 'hover:bg-slate-50 border-transparent')
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <span 
                      className="w-4 h-4 rounded-md flex items-center justify-center text-[9px] font-black shrink-0 font-mono shadow-2xs"
                      style={{
                        backgroundColor: `${color.solid}25`,
                        color: color.solid,
                        border: `1px solid ${color.solid}50`
                      }}
                    >
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <span 
                        className={`font-bold truncate block max-w-[130px] transition-colors ${
                          isDark 
                            ? 'text-slate-100 group-hover/item:text-indigo-400' 
                            : 'text-slate-900 group-hover/item:text-indigo-700'
                        }`}
                        title={item.name}
                      >
                        {item.name}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 font-mono">
                    <span className={`font-black text-xs ${isDark ? 'text-white' : 'text-slate-950'}`}>
                      R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span 
                      className="text-[10px] font-black px-1.5 py-0.5 rounded-md shadow-2xs"
                      style={{
                        backgroundColor: `${color.solid}20`,
                        color: color.solid
                      }}
                    >
                      {pct}%
                    </span>
                  </div>
                </div>

                {/* 3D Neon Dual Segment Bar or Gradient Bar */}
                {hasSplit ? (
                  <div className={`w-full rounded-full h-2 overflow-hidden flex shadow-inner border ${
                    isDark ? 'bg-slate-800 border-slate-700/50' : 'bg-slate-200 border-slate-300'
                  }`}>
                    <div 
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 transition-all duration-300"
                      style={{ width: `${(Number(pct) * Number(estoquePct)) / 100}%` }}
                      title={`Estoque: R$ ${estoqueVal.toLocaleString('pt-BR')} (${estoquePct}%)`}
                    />
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300"
                      style={{ width: `${(Number(pct) * Number(avulsoPct)) / 100}%` }}
                      title={`Avulso: R$ ${avulsoVal.toLocaleString('pt-BR')} (${avulsoPct}%)`}
                    />
                  </div>
                ) : (
                  <div className={`w-full rounded-full h-2 overflow-hidden shadow-inner border ${
                    isDark ? 'bg-slate-800 border-slate-700/50' : 'bg-slate-200 border-slate-300'
                  }`}>
                    <div 
                      className="h-full rounded-full transition-all duration-500 shadow-sm"
                      style={{ 
                        width: `${pct}%`, 
                        background: `linear-gradient(90deg, ${color.start}, ${color.end})`,
                        boxShadow: isHovered ? `0 0 8px ${color.shadow}` : 'none'
                      }}
                    />
                  </div>
                )}

                {/* Subtext info for each item */}
                <div className={`flex items-center justify-between text-[9px] font-semibold mt-1 ${
                  isDark ? 'text-slate-400' : 'text-slate-700'
                }`}>
                  <span className="truncate">
                    {item.count ? `${item.count} reg.` : '1 reg.'}
                    {hasSplit && ` • Est: ${estoquePct}% | NF: ${avulsoPct}%`}
                  </span>
                  {item.topVehicle && item.topVehicle !== '-' && (
                    <span className={`font-bold shrink-0 ${isDark ? 'text-slate-300' : 'text-slate-900'}`}>
                      Frota {item.topVehicle}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer Quick Action Toggle */}
        <div className="mt-3 pt-2 flex items-center justify-between">
          {data.length > 6 && (
            <button
              type="button"
              onClick={() => setDisplayLimit(prev => prev === 6 ? 12 : 6)}
              className={`text-[10px] font-bold transition-colors cursor-pointer ${
                isDark ? 'text-slate-400 hover:text-slate-100' : 'text-slate-700 hover:text-slate-950'
              }`}
            >
              {displayLimit === 6 ? `Mostrar +6 itens` : `Mostrar menos`}
            </button>
          )}
          <button
            type="button"
            onClick={() => onOpenExplosionModal(title, type, data, palette)}
            className={`ml-auto px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 border cursor-pointer shadow-2xs ${
              isDark 
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' 
                : 'bg-slate-100 hover:bg-slate-200 text-slate-900 border-slate-300'
            }`}
          >
            <Zap size={11} className="text-amber-500" />
            <span>Explodir Grupos</span>
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Explosion Modal for Viewing All Groups with Search, Filters & Deep Stats
 */
interface GroupExplosionModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  type: 'grc' | 'gre' | 'grd';
  items: GroupItemData[];
  palette: typeof GRC_PALETTES;
  onSelectGroup?: (type: 'grc' | 'gre' | 'grd', name: string) => void;
  isDark?: boolean;
}

const GroupExplosionModal: React.FC<GroupExplosionModalProps> = ({
  isOpen,
  onClose,
  title,
  type,
  items,
  palette,
  onSelectGroup,
  isDark = false
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'value' | 'count' | 'name' | 'estoque' | 'avulso'>('value');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  if (!isOpen) return null;

  const totalValue = items.reduce((acc, curr) => acc + (curr.value || 0), 0);
  const totalCount = items.reduce((acc, curr) => acc + (curr.count || 1), 0);

  const filteredItems = items
    .filter(it => it.name.toLowerCase().includes(searchTerm.toLowerCase()))
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'value') comparison = (b.value || 0) - (a.value || 0);
      else if (sortBy === 'count') comparison = (b.count || 0) - (a.count || 0);
      else if (sortBy === 'estoque') comparison = (b.estoque || 0) - (a.estoque || 0);
      else if (sortBy === 'avulso') comparison = (b.avulso || 0) - (a.avulso || 0);
      else if (sortBy === 'name') comparison = a.name.localeCompare(b.name);

      return sortOrder === 'asc' ? -comparison : comparison;
    });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className={`border rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 ${
        isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
      }`}>
        
        {/* Modal Header */}
        <div className={`p-6 border-b flex items-center justify-between ${
          isDark ? 'bg-slate-800/50 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-2xl shadow-md">
              <Layers size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className={`text-lg font-black ${isDark ? 'text-white' : 'text-slate-950'}`}>
                  Explosão Completa: {title}
                </h3>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                  isDark ? 'bg-indigo-950 text-indigo-300 border-indigo-800' : 'bg-indigo-50 text-indigo-800 border-indigo-200'
                }`}>
                  {items.length} Grupos
                </span>
              </div>
              <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                Total Acumulado: <strong className={`font-mono ${isDark ? 'text-white' : 'text-slate-950'}`}>R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> • {totalCount} lançamentos
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className={`p-2 rounded-xl transition-colors cursor-pointer ${
              isDark ? 'bg-slate-800 text-slate-400 hover:text-white' : 'bg-slate-100 text-slate-600 hover:text-slate-900'
            }`}
          >
            <X size={18} />
          </button>
        </div>

        {/* Search & Sorting Toolbar */}
        <div className={`p-4 border-b flex flex-col sm:flex-row items-center justify-between gap-3 ${
          isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'
        }`}>
          <div className="relative w-full sm:w-80">
            <Search size={16} className={`absolute left-3.5 top-1/2 -translate-y-1/2 ${isDark ? 'text-slate-500' : 'text-slate-400'}`} />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Pesquisar categoria por nome..."
              className={`w-full pl-9 pr-4 py-2 border rounded-xl text-xs font-semibold focus:ring-2 focus:ring-indigo-500 focus:outline-none ${
                isDark ? 'bg-slate-800 border-slate-700 text-white placeholder:text-slate-500' : 'bg-slate-50 border-slate-300 text-slate-900 placeholder:text-slate-400'
              }`}
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
            <span className={`text-[11px] font-bold shrink-0 flex items-center gap-1 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              <ArrowUpDown size={12} /> Ordenar:
            </span>
            <button
              onClick={() => {
                if (sortBy === 'value') setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
                else { setSortBy('value'); setSortOrder('desc'); }
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                sortBy === 'value' 
                  ? 'bg-indigo-600 text-white shadow-xs' 
                  : (isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700 hover:bg-slate-200')
              }`}
            >
              Valor {sortBy === 'value' && (sortOrder === 'desc' ? '↓' : '↑')}
            </button>
            <button
              onClick={() => {
                if (sortBy === 'count') setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
                else { setSortBy('count'); setSortOrder('desc'); }
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                sortBy === 'count' 
                  ? 'bg-indigo-600 text-white shadow-xs' 
                  : (isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700 hover:bg-slate-200')
              }`}
            >
              Lançamentos {sortBy === 'count' && (sortOrder === 'desc' ? '↓' : '↑')}
            </button>
            <button
              onClick={() => {
                if (sortBy === 'name') setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc');
                else { setSortBy('name'); setSortOrder('asc'); }
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                sortBy === 'name' 
                  ? 'bg-indigo-600 text-white shadow-xs' 
                  : (isDark ? 'bg-slate-800 text-slate-300' : 'bg-slate-100 text-slate-700 hover:bg-slate-200')
              }`}
            >
              Nome {sortBy === 'name' && (sortOrder === 'desc' ? '↓' : '↑')}
            </button>
          </div>
        </div>

        {/* Table Content */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className={`border-b font-bold uppercase text-[10px] tracking-wider ${
                isDark ? 'border-slate-800 text-slate-400' : 'border-slate-200 text-slate-600 bg-slate-50'
              }`}>
                <th className="py-2.5 px-3">#</th>
                <th className="py-2.5 px-3">Grupo / Categoria</th>
                <th className="py-2.5 px-3 text-center">Lançamentos</th>
                <th className="py-2.5 px-3 text-right">Estoque (R$)</th>
                <th className="py-2.5 px-3 text-right">NF / Avulso (R$)</th>
                <th className="py-2.5 px-3 text-right">Valor Total (R$)</th>
                <th className="py-2.5 px-3 text-right">% Participação</th>
                <th className="py-2.5 px-3 text-center">Ação</th>
              </tr>
            </thead>
            <tbody className={`divide-y font-medium ${isDark ? 'divide-slate-800' : 'divide-slate-100'}`}>
              {filteredItems.map((item, idx) => {
                const pct = totalValue > 0 ? ((item.value / totalValue) * 100).toFixed(2) : '0.00';
                const color = palette[idx % palette.length];

                return (
                  <tr key={idx} className={`transition-colors group ${
                    isDark ? 'hover:bg-slate-800/60' : 'hover:bg-slate-50'
                  }`}>
                    <td className={`py-3 px-3 font-mono ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                      {idx + 1}
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        <span 
                          className="w-2.5 h-2.5 rounded-full shrink-0 shadow-xs"
                          style={{ backgroundColor: color.solid }}
                        />
                        <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-900'}`}>
                          {item.name}
                        </span>
                      </div>
                    </td>
                    <td className={`py-3 px-3 text-center font-mono ${isDark ? 'text-slate-400' : 'text-slate-700'}`}>
                      {item.count || 1}
                    </td>
                    <td className={`py-3 px-3 text-right font-mono font-bold ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>
                      {item.estoque ? item.estoque.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                    </td>
                    <td className={`py-3 px-3 text-right font-mono font-bold ${isDark ? 'text-blue-400' : 'text-blue-700'}`}>
                      {item.avulso ? item.avulso.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                    </td>
                    <td className={`py-3 px-3 text-right font-mono font-black ${isDark ? 'text-white' : 'text-slate-950'}`}>
                      R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold">
                      <span 
                        className="px-2 py-0.5 rounded-md text-[11px]"
                        style={{
                          backgroundColor: `${color.solid}20`,
                          color: color.solid
                        }}
                      >
                        {pct}%
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => {
                          if (onSelectGroup) {
                            onSelectGroup(type, item.name);
                            onClose();
                          }
                        }}
                        className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                          isDark 
                            ? 'bg-indigo-950 text-indigo-300 hover:bg-indigo-600 hover:text-white' 
                            : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-600 hover:text-white'
                        }`}
                        title="Filtrar por este grupo"
                      >
                        <Filter size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Modal Footer */}
        <div className={`p-4 border-t flex items-center justify-between text-xs ${
          isDark ? 'border-slate-800 bg-slate-800/50 text-slate-400' : 'border-slate-200 bg-slate-50 text-slate-600'
        }`}>
          <span>Mostrando {filteredItems.length} de {items.length} grupos</span>
          <button
            onClick={onClose}
            className={`px-4 py-2 font-bold rounded-xl transition-all cursor-pointer ${
              isDark 
                ? 'bg-slate-100 hover:bg-white text-slate-900' 
                : 'bg-slate-900 hover:bg-slate-800 text-white'
            }`}
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

/**
 * Main Exported Container for the 3 Maintenance Group Cards
 */
export const MaintenanceGroupDistributionCards: React.FC<MaintenanceGroupDistributionCardsProps> = ({
  grcData,
  greData,
  grdData,
  onSelectGroup,
  onAuditPrefix,
  isDark = false
}) => {
  const [explosionModal, setExplosionModal] = useState<{
    isOpen: boolean;
    title: string;
    type: 'grc' | 'gre' | 'grd';
    items: GroupItemData[];
    palette: typeof GRC_PALETTES;
  }>({
    isOpen: false,
    title: '',
    type: 'grc',
    items: [],
    palette: GRC_PALETTES
  });

  const handleOpenExplosion = (
    title: string,
    type: 'grc' | 'gre' | 'grd',
    items: GroupItemData[],
    palette: typeof GRC_PALETTES
  ) => {
    setExplosionModal({
      isOpen: true,
      title,
      type,
      items,
      palette
    });
  };

  return (
    <>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* 1. Grupo de Compra (GRC) */}
        <SingleGroupCard
          title="Distribuição por Grupo de Compra"
          subtitle="Agrupamento das aquisições e requisições de compra"
          badgeLabel="GRC"
          type="grc"
          icon={<ShoppingBag size={20} />}
          iconBg={isDark ? "bg-blue-500/20" : "bg-blue-100"}
          iconColor={isDark ? "text-blue-400" : "text-blue-700"}
          badgeBg={isDark ? "bg-blue-950/90" : "bg-blue-50"}
          badgeText={isDark ? "text-blue-300" : "text-blue-900"}
          badgeBorder={isDark ? "border-blue-800" : "border-blue-300"}
          glowClass="shadow-blue-500/20"
          palette={GRC_PALETTES}
          data={grcData}
          onSelectGroup={onSelectGroup}
          onOpenExplosionModal={handleOpenExplosion}
          isDark={isDark}
        />

        {/* 2. Grupo de Estoque (GRE) */}
        <SingleGroupCard
          title="Distribuição por Grupo de Estoque"
          subtitle="Categorização por almoxarifado e itens em estoque"
          badgeLabel="GRE"
          type="gre"
          icon={<Package size={20} />}
          iconBg={isDark ? "bg-indigo-500/20" : "bg-indigo-100"}
          iconColor={isDark ? "text-indigo-400" : "text-indigo-700"}
          badgeBg={isDark ? "bg-indigo-950/90" : "bg-indigo-50"}
          badgeText={isDark ? "text-indigo-300" : "text-indigo-900"}
          badgeBorder={isDark ? "border-indigo-800" : "border-indigo-300"}
          glowClass="shadow-indigo-500/20"
          palette={GRE_PALETTES}
          data={greData}
          onSelectGroup={onSelectGroup}
          onOpenExplosionModal={handleOpenExplosion}
          isDark={isDark}
        />

        {/* 3. Grupo de Despesa (GRD) */}
        <SingleGroupCard
          title="Distribuição por Grupo de Despesa"
          subtitle="Classificação contábil e centro de custo"
          badgeLabel="GRD"
          type="grd"
          icon={<Receipt size={20} />}
          iconBg={isDark ? "bg-rose-500/20" : "bg-rose-100"}
          iconColor={isDark ? "text-rose-400" : "text-rose-700"}
          badgeBg={isDark ? "bg-rose-950/90" : "bg-rose-50"}
          badgeText={isDark ? "text-rose-300" : "text-rose-900"}
          badgeBorder={isDark ? "border-rose-800" : "border-rose-300"}
          glowClass="shadow-rose-500/20"
          palette={GRD_PALETTES}
          data={grdData}
          onSelectGroup={onSelectGroup}
          onOpenExplosionModal={handleOpenExplosion}
          isDark={isDark}
        />
      </div>

      {/* Full Modal for Deep Group Exploration */}
      <GroupExplosionModal
        isOpen={explosionModal.isOpen}
        onClose={() => setExplosionModal(prev => ({ ...prev, isOpen: false }))}
        title={explosionModal.title}
        type={explosionModal.type}
        items={explosionModal.items}
        palette={explosionModal.palette}
        onSelectGroup={onSelectGroup}
        isDark={isDark}
      />
    </>
  );
};

export default MaintenanceGroupDistributionCards;
