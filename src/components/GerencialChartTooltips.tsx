import React from 'react';
import { 
  Wrench, 
  Package, 
  FileText, 
  Fuel, 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  Layers, 
  Zap, 
  Settings, 
  Sparkles, 
  Truck, 
  Info,
  Compass,
  Radio,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { motion } from 'motion/react';
import { PortalTooltipWrapper, Tooltip3DContainer } from './PortalChartTooltip';

// =========================================================================
// 1. TOOLTIP: GRUPOS / CATEGORIAS TÉCNICAS DE MANUTENÇÃO (3D + NEON + KINETIC)
// =========================================================================
interface CustomGroupMaintTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  totalMaint?: number;
  isDark?: boolean;
}

export const CustomGroupMaintTooltip: React.FC<CustomGroupMaintTooltipProps> = ({
  active,
  payload,
  label,
  totalMaint = 0,
  isDark = false,
}) => {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0];
  const value = Number(data.value) || 0;
  const catName = String(label || data.name || 'CATEGORIA').toUpperCase();
  const pct = totalMaint > 0 ? ((value / totalMaint) * 100).toFixed(1) : '0.0';

  // Dynamic Neon Theme per technical category
  let glowColor = '#6366f1';
  let icon = <Wrench size={16} className="text-indigo-400" />;
  let watermark = (
    <svg viewBox="0 0 140 80" className="w-32 h-18 opacity-25">
      <motion.g animate={{ rotate: [0, 360] }} transition={{ repeat: Infinity, duration: 10, ease: "linear" }}>
        <circle cx="100" cy="40" r="22" stroke="#6366f1" strokeWidth="2" strokeDasharray="4 4" fill="none" />
      </motion.g>
    </svg>
  );

  if (catName.includes('PNEU')) {
    glowColor = '#38bdf8';
    icon = <Layers size={16} className="text-sky-400" />;
    watermark = (
      <svg viewBox="0 0 140 80" className="w-32 h-18 opacity-25">
        <motion.g animate={{ rotate: [0, 360] }} transition={{ repeat: Infinity, duration: 4, ease: "linear" }}>
          <circle cx="100" cy="40" r="24" stroke="#38bdf8" strokeWidth="4" strokeDasharray="6 3" fill="none" />
          <circle cx="100" cy="40" r="14" stroke="#38bdf8" strokeWidth="1.5" fill="none" />
        </motion.g>
      </svg>
    );
  } else if (catName.includes('MOTOR')) {
    glowColor = '#10b981';
    icon = <Zap size={16} className="text-emerald-400" />;
    watermark = (
      <svg viewBox="0 0 140 80" className="w-32 h-18 opacity-25">
        <motion.path
          d="M 85 20 L 98 40 L 92 40 L 105 60 L 96 46 L 102 46 Z"
          fill="#10b981"
          animate={{ opacity: [0.4, 1, 0.4], scale: [0.95, 1.05, 0.95] }}
          transition={{ repeat: Infinity, duration: 1.5 }}
        />
      </svg>
    );
  } else if (catName.includes('CAMBIO') || catName.includes('CÂMBIO') || catName.includes('TRANSMISSAO')) {
    glowColor = '#f59e0b';
    icon = <Settings size={16} className="text-amber-400" />;
    watermark = (
      <svg viewBox="0 0 140 80" className="w-32 h-18 opacity-25">
        <g transform="translate(90, 40)">
          <motion.g animate={{ rotate: [0, 360] }} transition={{ repeat: Infinity, duration: 8, ease: "linear" }}>
            <circle cx="0" cy="0" r="18" stroke="#f59e0b" strokeWidth="2" strokeDasharray="5 3" fill="none" />
          </motion.g>
        </g>
        <g transform="translate(115, 30)">
          <motion.g animate={{ rotate: [360, 0] }} transition={{ repeat: Infinity, duration: 6, ease: "linear" }}>
            <circle cx="0" cy="0" r="12" stroke="#f59e0b" strokeWidth="1.5" strokeDasharray="4 2" fill="none" />
          </motion.g>
        </g>
      </svg>
    );
  } else if (catName.includes('ELETRICA') || catName.includes('ELÉTRICA')) {
    glowColor = '#a855f7';
    icon = <Sparkles size={16} className="text-purple-400" />;
    watermark = (
      <svg viewBox="0 0 140 80" className="w-32 h-18 opacity-25">
        <motion.circle
          cx="105"
          cy="40"
          r="20"
          stroke="#a855f7"
          strokeWidth="1.5"
          strokeDasharray="4 4"
          animate={{ scale: [0.8, 1.2, 0.8], opacity: [0.3, 0.8, 0.3] }}
          transition={{ repeat: Infinity, duration: 2 }}
        />
      </svg>
    );
  } else if (catName.includes('CARROCERIA') || catName.includes('CHASSI')) {
    glowColor = '#f97316';
    icon = <Truck size={16} className="text-orange-400" />;
  }

  return (
    <PortalTooltipWrapper active={active} payload={payload}>
      <Tooltip3DContainer
        isDark={isDark}
        glowColor={glowColor}
        className="min-w-[270px] max-w-[340px]"
        watermarkAnimation={watermark}
      >
        {/* Header */}
        <div className={`flex items-center justify-between gap-3 pb-2.5 border-b ${
          isDark ? 'border-slate-800' : 'border-slate-100'
        }`}>
          <div className="flex items-center gap-2">
            <div 
              className="p-2 rounded-xl flex items-center justify-center border shadow-xs"
              style={{
                backgroundColor: `${glowColor}18`,
                borderColor: `${glowColor}35`
              }}
            >
              {icon}
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                Grupo Técnico
              </span>
              <h4 className="text-sm font-black tracking-tight leading-none text-slate-950 dark:text-white">
                {label || data.name}
              </h4>
            </div>
          </div>
          <span 
            className="px-2.5 py-1 rounded-xl text-[10px] font-black font-mono border shadow-2xs"
            style={{
              backgroundColor: `${glowColor}15`,
              color: isDark ? '#fff' : glowColor,
              borderColor: `${glowColor}40`
            }}
          >
            {pct}% do total
          </span>
        </div>

        {/* Custo & Barra de Proporção */}
        <div className="pt-3 space-y-2.5">
          <div className="flex items-baseline justify-between gap-2">
            <span className={`text-xs font-bold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Despesa Alocada:
            </span>
            <span className="text-base font-black font-mono tracking-tight text-slate-950 dark:text-white">
              {value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>

          <div className="w-full bg-slate-100 dark:bg-slate-800/80 rounded-full h-2 overflow-hidden flex p-0.5 border border-slate-200/50 dark:border-slate-700/50">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, Math.max(6, Number(pct)))}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className="h-full rounded-full"
              style={{
                background: `linear-gradient(90deg, ${glowColor}80, ${glowColor})`,
                boxShadow: `0 0 10px ${glowColor}`
              }}
            />
          </div>
        </div>
      </Tooltip3DContainer>
    </PortalTooltipWrapper>
  );
};

// =========================================================================
// 2. TOOLTIP: ORIGEM DA DESPESA (ESTOQUE VS AVULSO) (3D + NEON + SCANNER)
// =========================================================================
interface CustomOriginCostTooltipProps {
  active?: boolean;
  payload?: any[];
  totalMaint?: number;
  isDark?: boolean;
}

export const CustomOriginCostTooltip: React.FC<CustomOriginCostTooltipProps> = ({
  active,
  payload,
  totalMaint = 0,
  isDark = false,
}) => {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0];
  const item = data.payload || {};
  const name = String(item.name || data.name || '');
  const value = Number(item.value ?? data.value) || 0;
  const isEstoque = name.toUpperCase().includes('ESTOQUE');
  const pct = totalMaint > 0 ? ((value / totalMaint) * 100).toFixed(1) : '0.0';
  const glowColor = isEstoque ? '#10b981' : '#f43f5e';

  return (
    <PortalTooltipWrapper active={active} payload={payload}>
      <Tooltip3DContainer
        isDark={isDark}
        glowColor={glowColor}
        className="min-w-[270px] max-w-[340px]"
        watermarkAnimation={
          isEstoque ? (
            // Isometric Warehouse Parts Container
            <svg viewBox="0 0 140 80" className="w-32 h-18 opacity-25">
              <g transform="translate(90, 45)">
                <path d="M 0 10 L 20 0 L 40 10 L 20 20 Z" fill="#10b981" />
                <path d="M 0 10 L 20 20 L 20 35 L 0 25 Z" fill="#047857" opacity="0.6" />
                <path d="M 40 10 L 20 20 L 20 35 L 40 25 Z" fill="#065f46" opacity="0.8" />
              </g>
            </svg>
          ) : (
            // Holographic Invoice with Vertical Laser Scan
            <svg viewBox="0 0 140 80" className="w-32 h-18 opacity-25">
              <g transform="translate(95, 20)">
                <rect x="0" y="0" width="34" height="46" rx="3" fill="#f43f5e" opacity="0.3" stroke="#f43f5e" strokeWidth="1.2" />
                <line x1="6" y1="12" x2="22" y2="12" stroke="#f43f5e" strokeWidth="2" />
                <line x1="6" y1="20" x2="28" y2="20" stroke="#f43f5e" strokeWidth="1.5" />
                <line x1="6" y1="28" x2="24" y2="28" stroke="#f43f5e" strokeWidth="1.5" />
                <motion.line
                  x1="-4"
                  y1="0"
                  x2="38"
                  y2="0"
                  stroke="#fff"
                  strokeWidth="2"
                  animate={{ y: [4, 42, 4] }}
                  transition={{ repeat: Infinity, duration: 2.2, ease: "easeInOut" }}
                />
              </g>
            </svg>
          )
        }
      >
        <div className={`flex items-center justify-between gap-3 pb-2.5 border-b ${
          isDark ? 'border-slate-800' : 'border-slate-100'
        }`}>
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-xl flex items-center justify-center ${
              isEstoque 
                ? (isDark ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-emerald-50 text-emerald-600 border border-emerald-200')
                : (isDark ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-rose-50 text-rose-600 border border-rose-200')
            }`}>
              {isEstoque ? <Package size={16} /> : <FileText size={16} />}
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                Origem Contábil
              </span>
              <h4 className="text-xs font-black tracking-tight leading-none text-slate-950 dark:text-white">
                {isEstoque ? 'Estoque (Peças/Almox.)' : 'NF Avulso (Terceiros/MDO)'}
              </h4>
            </div>
          </div>
        </div>

        <div className="pt-3 space-y-2.5">
          <div className="flex items-baseline justify-between gap-2">
            <span className={`text-xs font-bold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Total Lançado:
            </span>
            <span className={`text-base font-black font-mono tracking-tight ${
              isEstoque ? (isDark ? 'text-emerald-400' : 'text-emerald-700') : (isDark ? 'text-rose-400' : 'text-rose-700')
            }`}>
              {value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>

          <div className={`flex items-center justify-between text-[11px] font-bold p-2 rounded-xl border ${
            isDark ? 'bg-slate-800/80 border-slate-700' : 'bg-slate-50 border-slate-200/80'
          }`}>
            <span className={isDark ? 'text-slate-400' : 'text-slate-600'}>Participação na Manutenção:</span>
            <span className="font-black font-mono text-slate-950 dark:text-white">{pct}%</span>
          </div>
        </div>
      </Tooltip3DContainer>
    </PortalTooltipWrapper>
  );
};

// =========================================================================
// 3. TOOLTIP: TOP 5 MAIORES INVESTIMENTOS (3D + NEON + DUAL RATIO)
// =========================================================================
interface CustomTop5InvestmentTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  isDark?: boolean;
}

export const CustomTop5InvestmentTooltip: React.FC<CustomTop5InvestmentTooltipProps> = ({
  active,
  payload,
  label,
  isDark = false,
}) => {
  if (!active || !payload || !payload.length) return null;
  const item = payload[0]?.payload || {};
  const placa = item.name || label || 'VEÍCULO';
  const frota = item.frota;
  const combustivel = Number(item.combustivel) || 0;
  const manutencao = Number(item.manutencao) || 0;
  const total = Number(item.total) || (combustivel + manutencao);
  
  const fuelPct = total > 0 ? ((combustivel / total) * 100).toFixed(1) : '0.0';
  const maintPct = total > 0 ? ((manutencao / total) * 100).toFixed(1) : '0.0';

  return (
    <PortalTooltipWrapper active={active} payload={payload}>
      <Tooltip3DContainer
        isDark={isDark}
        glowColor="#10b981"
        className="min-w-[290px] max-w-[360px]"
        watermarkAnimation={
          <svg viewBox="0 0 140 80" className="w-32 h-18 opacity-20">
            <motion.g
              animate={{ y: [15, -25], opacity: [0, 1, 0] }}
              transition={{ repeat: Infinity, duration: 2.8, ease: "easeOut" }}
              transform="translate(100, 50)"
            >
              <text x="0" y="0" fill="#10b981" fontSize="18" fontWeight="900" fontFamily="sans-serif">
                R$
              </text>
            </motion.g>
          </svg>
        }
      >
        <div className={`flex items-center justify-between gap-3 pb-2.5 border-b ${
          isDark ? 'border-slate-800' : 'border-slate-100'
        }`}>
          <div>
            <div className="flex items-center gap-1.5 mb-0.5">
              <Truck size={14} className="text-emerald-500" />
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                Ativo / Placa
              </span>
            </div>
            <h4 className="text-base font-black tracking-tight leading-none text-slate-950 dark:text-white">
              {placa}
            </h4>
            {frota && frota !== placa && (
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 mt-0.5 block">
                Frota: #{frota}
              </span>
            )}
          </div>
          <div className="text-right">
            <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block">
              Investimento Total
            </span>
            <span className="text-sm font-black font-mono text-emerald-600 dark:text-emerald-400">
              {total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>
        </div>

        <div className="pt-3 space-y-2">
          {/* Combustível Row */}
          <div className="flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-[0_0_8px_#10b981] shrink-0" />
              <span className={`font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Combustível</span>
            </div>
            <div className="text-right font-mono">
              <span className="font-black text-slate-950 dark:text-white">
                {combustivel.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
              <span className="text-[10px] text-emerald-500 ml-1.5 font-bold">({fuelPct}%)</span>
            </div>
          </div>

          {/* Manutenção Row */}
          <div className="flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-[0_0_8px_#f43f5e] shrink-0" />
              <span className={`font-bold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>Manutenção</span>
            </div>
            <div className="text-right font-mono">
              <span className="font-black text-slate-950 dark:text-white">
                {manutencao.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
              <span className="text-[10px] text-rose-500 ml-1.5 font-bold">({maintPct}%)</span>
            </div>
          </div>

          {/* Dual Stacked Mini Ratio Bar */}
          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden flex mt-1 border border-slate-200/60 dark:border-slate-700">
            <div className="bg-emerald-500 h-full transition-all duration-300" style={{ width: `${fuelPct}%` }} />
            <div className="bg-rose-500 h-full transition-all duration-300" style={{ width: `${maintPct}%` }} />
          </div>
        </div>
      </Tooltip3DContainer>
    </PortalTooltipWrapper>
  );
};

// =========================================================================
// 4. TOOLTIP: ALOCAÇÃO OPERACIONAL GERAL (3D + NEON)
// =========================================================================
interface CustomAllocationTooltipProps {
  active?: boolean;
  payload?: any[];
  totalGeral?: number;
  isDark?: boolean;
}

export const CustomAllocationTooltip: React.FC<CustomAllocationTooltipProps> = ({
  active,
  payload,
  totalGeral = 0,
  isDark = false,
}) => {
  if (!active || !payload || !payload.length) return null;
  const data = payload[0];
  const item = data.payload || {};
  const name = String(item.name || data.name || '');
  const value = Number(item.value ?? data.value) || 0;
  const isFuel = name.toUpperCase().includes('COMBUST');
  const pct = totalGeral > 0 ? ((value / totalGeral) * 100).toFixed(1) : '0.0';
  const glowColor = isFuel ? '#10b981' : '#f43f5e';

  return (
    <PortalTooltipWrapper active={active} payload={payload}>
      <Tooltip3DContainer
        isDark={isDark}
        glowColor={glowColor}
        className="min-w-[270px] max-w-[340px]"
      >
        <div className={`flex items-center justify-between gap-3 pb-2.5 border-b ${
          isDark ? 'border-slate-800' : 'border-slate-100'
        }`}>
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-xl flex items-center justify-center ${
              isFuel 
                ? (isDark ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-emerald-50 text-emerald-600 border border-emerald-200')
                : (isDark ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-rose-50 text-rose-600 border border-rose-200')
            }`}>
              {isFuel ? <Fuel size={16} /> : <Wrench size={16} />}
            </div>
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
                Distribuição Operacional
              </span>
              <h4 className="text-sm font-black tracking-tight leading-none text-slate-950 dark:text-white">
                {name}
              </h4>
            </div>
          </div>
          <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black font-mono border ${
            isFuel 
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30' 
              : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30'
          }`}>
            {pct}%
          </span>
        </div>

        <div className="pt-3 space-y-2.5">
          <div className="flex items-baseline justify-between gap-2">
            <span className={`text-xs font-bold ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
              Total Alocado:
            </span>
            <span className={`text-base font-black font-mono tracking-tight ${
              isFuel ? (isDark ? 'text-emerald-400' : 'text-emerald-700') : (isDark ? 'text-rose-400' : 'text-rose-700')
            }`}>
              {value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </span>
          </div>

          <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(100, Math.max(6, Number(pct)))}%` }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              className={`h-full rounded-full ${isFuel ? 'bg-emerald-500' : 'bg-rose-500'}`}
              style={{
                boxShadow: `0 0 10px ${isFuel ? '#10b981' : '#f43f5e'}`
              }}
            />
          </div>
        </div>
      </Tooltip3DContainer>
    </PortalTooltipWrapper>
  );
};
