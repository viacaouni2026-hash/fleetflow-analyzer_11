import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Calendar, 
  Filter, 
  RotateCcw, 
  Truck, 
  Tag, 
  Wrench, 
  Layers, 
  Package, 
  FileText, 
  X, 
  Sparkles, 
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff
} from 'lucide-react';
import { MultiSelect } from './MultiSelect';

export interface ResumoGerencialFilterBarProps {
  filterMonth: string[];
  setFilterMonth: (months: string[]) => void;
  filterYear: string[];
  setFilterYear: (years: string[]) => void;
  filterFrota: string[];
  setFilterFrota: (frotas: string[]) => void;
  filterPlaca: string[];
  setFilterPlaca: (placas: string[]) => void;
  maintenanceFilters: {
    prefixo: string[];
    placa: string[];
    ano: string[];
    mes: string[];
    grc: string[];
    gre: string[];
    grd: string[];
    vehicleType: string;
    [key: string]: any;
  };
  setMaintenanceFilters: React.Dispatch<React.SetStateAction<any>>;
  filterOptions: {
    meses?: (string | { label: string; value: string })[];
    anos?: (string | { label: string; value: string })[];
    frotas?: (string | { label: string; value: string })[];
    placas?: (string | { label: string; value: string })[];
    [key: string]: any;
  };
  maintenanceOptions: {
    meses?: string[];
    anos?: string[];
    prefixos?: string[];
    placas?: string[];
    grc?: string[];
    gre?: string[];
    grd?: string[];
    [key: string]: any;
  };
  onClearAll: () => void;
  appTheme?: 'light' | 'dark-neon';
}

const MONTH_DATA = [
  { num: '01', name: 'Janeiro', short: 'JAN' },
  { num: '02', name: 'Fevereiro', short: 'FEV' },
  { num: '03', name: 'Março', short: 'MAR' },
  { num: '04', name: 'Abril', short: 'ABR' },
  { num: '05', name: 'Maio', short: 'MAI' },
  { num: '06', name: 'Junho', short: 'JUN' },
  { num: '07', name: 'Julho', short: 'JUL' },
  { num: '08', name: 'Agosto', short: 'AGO' },
  { num: '09', name: 'Setembro', short: 'SET' },
  { num: '10', name: 'Outubro', short: 'OUT' },
  { num: '11', name: 'Novembro', short: 'NOV' },
  { num: '12', name: 'Dezembro', short: 'DEZ' },
];

export const ResumoGerencialFilterBar: React.FC<ResumoGerencialFilterBarProps> = React.memo(({
  filterMonth,
  setFilterMonth,
  filterYear,
  setFilterYear,
  filterFrota,
  setFilterFrota,
  filterPlaca,
  setFilterPlaca,
  maintenanceFilters,
  setMaintenanceFilters,
  filterOptions,
  maintenanceOptions,
  onClearAll,
  appTheme = 'light'
}) => {
  const isDark = appTheme === 'dark-neon';

  // Toggle expand / collapse state with LocalStorage persistence
  const [isExpanded, setIsExpanded] = useState<boolean>(() => {
    const saved = localStorage.getItem('fleet_resumo_gerencial_filters_expanded');
    return saved !== null ? saved === 'true' : true;
  });

  const toggleExpanded = () => {
    setIsExpanded(prev => {
      const next = !prev;
      localStorage.setItem('fleet_resumo_gerencial_filters_expanded', String(next));
      return next;
    });
  };

  // Active month set (normalized to '01', '02', etc. and month names)
  const activeMonthsSet = useMemo(() => {
    const set = new Set<string>();
    filterMonth.forEach(m => {
      set.add(m.padStart(2, '0'));
    });
    maintenanceFilters.mes.forEach(m => {
      const match = MONTH_DATA.find(md => md.name.toLowerCase() === m.toLowerCase() || md.short.toLowerCase() === m.toLowerCase() || md.num === m);
      if (match) set.add(match.num);
    });
    return set;
  }, [filterMonth, maintenanceFilters.mes]);

  const handleToggleMonth = (num: string, name: string) => {
    let nextMonthNums: string[];
    let nextMonthNames: string[];

    if (activeMonthsSet.has(num)) {
      // Remove month
      nextMonthNums = Array.from(activeMonthsSet).filter(m => m !== num);
      nextMonthNames = nextMonthNums.map(n => {
        const found = MONTH_DATA.find(md => md.num === n);
        return found ? found.name : '';
      }).filter(Boolean);
    } else {
      // Add month
      nextMonthNums = [...Array.from(activeMonthsSet), num];
      nextMonthNames = nextMonthNums.map(n => {
        const found = MONTH_DATA.find(md => md.num === n);
        return found ? found.name : '';
      }).filter(Boolean);
    }

    setFilterMonth(nextMonthNums);
    setMaintenanceFilters((prev: any) => ({
      ...prev,
      mes: nextMonthNames,
      mesAvulso: nextMonthNames,
      mesEstoque: nextMonthNames
    }));
  };

  const handleSelectAllMonths = () => {
    setFilterMonth([]);
    setMaintenanceFilters((prev: any) => ({
      ...prev,
      mes: [],
      mesAvulso: [],
      mesEstoque: []
    }));
  };

  // Synchronized Handlers
  const handleYearChange = (years: string[]) => {
    setFilterYear(years);
    setMaintenanceFilters((prev: any) => ({
      ...prev,
      ano: years,
      anoAvulso: years,
      anoEstoque: years
    }));
  };

  const handleFrotaChange = (frotas: string[]) => {
    setFilterFrota(frotas);
    setMaintenanceFilters((prev: any) => ({
      ...prev,
      prefixo: frotas
    }));
  };

  const handlePlacaChange = (placas: string[]) => {
    setFilterPlaca(placas);
    setMaintenanceFilters((prev: any) => ({
      ...prev,
      placa: placas
    }));
  };

  // Total active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (activeMonthsSet.size > 0) count += activeMonthsSet.size;
    if (filterYear.length > 0 || maintenanceFilters.ano.length > 0) count += Math.max(filterYear.length, maintenanceFilters.ano.length);
    if (filterFrota.length > 0 || maintenanceFilters.prefixo.length > 0) count += Math.max(filterFrota.length, maintenanceFilters.prefixo.length);
    if (filterPlaca.length > 0 || maintenanceFilters.placa.length > 0) count += Math.max(filterPlaca.length, maintenanceFilters.placa.length);
    if (maintenanceFilters.grc.length > 0) count += maintenanceFilters.grc.length;
    if (maintenanceFilters.gre.length > 0) count += maintenanceFilters.gre.length;
    if (maintenanceFilters.grd.length > 0) count += maintenanceFilters.grd.length;
    if (maintenanceFilters.vehicleType && maintenanceFilters.vehicleType !== 'all') count += 1;
    return count;
  }, [activeMonthsSet, filterYear, maintenanceFilters, filterFrota, filterPlaca]);

  // Options list formatting
  const formattedMesesOptions = useMemo(() => {
    return MONTH_DATA.map(m => ({
      label: `${m.short} - ${m.name}`,
      value: m.num
    }));
  }, []);

  const formattedAnoOptions = useMemo(() => {
    const list = new Set<string>();
    (filterOptions.anos || []).forEach(a => {
      const val = typeof a === 'string' ? a : (a?.value || a?.label || '');
      if (val) list.add(String(val));
    });
    (maintenanceOptions.anos || []).forEach(a => {
      if (a) list.add(String(a));
    });
    if (list.size === 0) {
      ['2024', '2025', '2026'].forEach(y => list.add(y));
    }
    return Array.from(list).sort().map(y => ({ label: y, value: y }));
  }, [filterOptions.anos, maintenanceOptions.anos]);

  const formattedFrotaOptions = useMemo(() => {
    const list = new Set<string>();
    (filterOptions.frotas || []).forEach(f => {
      const val = typeof f === 'string' ? f : (f?.value || f?.label || '');
      if (val) list.add(String(val));
    });
    (maintenanceOptions.prefixos || []).forEach(f => {
      if (f) list.add(String(f));
    });
    return Array.from(list).filter(Boolean).sort().map(f => ({ label: f, value: f }));
  }, [filterOptions.frotas, maintenanceOptions.prefixos]);

  const formattedPlacaOptions = useMemo(() => {
    const list = new Set<string>();
    (filterOptions.placas || []).forEach(p => {
      const val = typeof p === 'string' ? p : (p?.value || p?.label || '');
      if (val) list.add(String(val));
    });
    (maintenanceOptions.placas || []).forEach(p => {
      if (p) list.add(String(p));
    });
    return Array.from(list).filter(Boolean).sort().map(p => ({ label: p, value: p }));
  }, [filterOptions.placas, maintenanceOptions.placas]);

  return (
    <div 
      id="gerencial-executive-filter-bar"
      className={`rounded-3xl border transition-all duration-300 p-6 space-y-6 shadow-xl relative z-30 overflow-visible ${
        isDark 
          ? 'bg-slate-900/90 border-cyan-500/30 shadow-cyan-950/20 backdrop-blur-xl' 
          : 'bg-white border-slate-200 shadow-slate-100'
      }`}
    >
      {/* Header Bar */}
      <div className={`flex flex-wrap items-center justify-between gap-4 ${isExpanded ? 'pb-4 border-b border-slate-100 dark:border-slate-800' : ''}`}>
        <div className="flex items-center gap-3">
          <div 
            onClick={toggleExpanded}
            className={`p-2.5 rounded-2xl flex items-center justify-center cursor-pointer transition-transform hover:scale-105 ${
              isDark ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30' : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
            }`}
            title={isExpanded ? 'Clique para ocultar filtros' : 'Clique para expandir filtros'}
          >
            <SlidersHorizontal size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 
                onClick={toggleExpanded}
                className={`text-base font-black uppercase tracking-tight cursor-pointer hover:opacity-80 transition-opacity ${
                  isDark ? 'text-white' : 'text-slate-900'
                }`}
              >
                Filtros do Resumo Gerencial
              </h3>
              {activeFilterCount > 0 && (
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest ${
                  isDark ? 'bg-cyan-500 text-slate-950 shadow-sm shadow-cyan-500/50' : 'bg-emerald-600 text-white shadow-sm'
                }`}>
                  {activeFilterCount} {activeFilterCount === 1 ? 'filtro ativo' : 'filtros ativos'}
                </span>
              )}
            </div>
            <p className={`text-xs font-semibold ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {isExpanded 
                ? 'Filtre conjuntamente combustível, manutenção e KPIs executivos'
                : activeFilterCount > 0 
                  ? 'Filtros aplicados e ativos na visualização gerencial' 
                  : 'Filtros recolhidos — clique em expandir para filtrar'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {activeFilterCount > 0 && (
            <button
              type="button"
              onClick={onClearAll}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 border cursor-pointer ${
                isDark 
                  ? 'bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20' 
                  : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
              }`}
              title="Limpar todos os filtros selecionados"
            >
              <RotateCcw size={14} />
              <span className="hidden sm:inline">Limpar Todos os Filtros</span>
              <span className="sm:hidden">Limpar</span>
            </button>
          )}

          {/* Botão para Ocultar / Expandir Filtros */}
          <button
            type="button"
            onClick={toggleExpanded}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all active:scale-95 border cursor-pointer shadow-sm ${
              isExpanded
                ? isDark
                  ? 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/20'
                  : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100/80'
                : isDark
                  ? 'bg-gradient-to-r from-cyan-500 to-teal-400 text-slate-950 font-black border-cyan-400 hover:opacity-95 shadow-cyan-500/20'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-black border-emerald-600 hover:opacity-95 shadow-emerald-600/20'
            }`}
            title={isExpanded ? 'Ocultar os seletores de filtros' : 'Expandir todos os seletores de filtros'}
          >
            {isExpanded ? (
              <>
                <ChevronUp size={16} className="stroke-[2.5]" />
                <span>Ocultar Filtros</span>
              </>
            ) : (
              <>
                <ChevronDown size={16} className="stroke-[2.5]" />
                <span>Expandir Filtros</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Collapsible Content: Quick Month Selector & Detailed MultiSelect Filters */}
      <AnimatePresence initial={false}>
        {isExpanded && (
          <motion.div
            key="resumo-gerencial-filters-body"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="space-y-6 overflow-visible"
          >
            {/* Quick Month Selector Toolbar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className={`text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5 ${
                  isDark ? 'text-cyan-400' : 'text-slate-600'
                }`}>
                  <Calendar size={14} />
                  Seleção Rápida por Mês (Exercício)
                </label>
                <span className={`text-[10px] font-bold ${isDark ? 'text-slate-400' : 'text-slate-400'}`}>
                  {activeMonthsSet.size === 0 ? 'Exibindo todos os 12 meses' : `${activeMonthsSet.size} mês(es) selecionado(s)`}
                </span>
              </div>

              <div className={`p-1.5 rounded-2xl border flex flex-wrap items-center gap-1.5 ${
                isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50 border-slate-200/80'
              }`}>
                {/* Todos os meses button */}
                <button
                  type="button"
                  onClick={handleSelectAllMonths}
                  className={`px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                    activeMonthsSet.size === 0
                      ? isDark
                        ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30'
                        : 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                      : isDark
                        ? 'text-slate-400 hover:text-white hover:bg-slate-800'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white'
                  }`}
                >
                  Todos
                </button>

                {/* 12 Months Pills */}
                {MONTH_DATA.map((m) => {
                  const isSelected = activeMonthsSet.has(m.num);
                  return (
                    <button
                      key={m.num}
                      type="button"
                      onClick={() => handleToggleMonth(m.num, m.name)}
                      className={`flex-1 min-w-[54px] px-2.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex flex-col items-center justify-center ${
                        isSelected
                          ? isDark
                            ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/30 scale-105'
                            : 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20 scale-105'
                          : isDark
                            ? 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white hover:border-slate-700'
                            : 'bg-white text-slate-700 border border-slate-200/80 hover:text-slate-950 hover:bg-slate-100/50'
                      }`}
                      title={`Filtrar registros de ${m.name}`}
                    >
                      <span>{m.short}</span>
                      <span className={`text-[9px] font-bold ${isSelected ? (isDark ? 'text-slate-900' : 'text-emerald-100') : 'text-slate-400'}`}>
                        {m.num}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Detailed MultiSelect Filter Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3 pt-2">
              <MultiSelect 
                label="Mês (Multi)" 
                options={formattedMesesOptions} 
                selected={Array.from(activeMonthsSet)} 
                onChange={(vals) => {
                  setFilterMonth(vals);
                  const monthNames = vals.map(v => {
                    const found = MONTH_DATA.find(md => md.num === v);
                    return found ? found.name : '';
                  }).filter(Boolean);
                  setMaintenanceFilters((prev: any) => ({
                    ...prev,
                    mes: monthNames,
                    mesAvulso: monthNames,
                    mesEstoque: monthNames
                  }));
                }} 
                placeholder="Todos os Meses" 
              />

              <MultiSelect 
                label="Ano" 
                options={formattedAnoOptions} 
                selected={filterYear.length > 0 ? filterYear : maintenanceFilters.ano} 
                onChange={handleYearChange} 
                placeholder="Todos os Anos" 
              />

              <MultiSelect 
                label="Prefixo / Frota" 
                options={formattedFrotaOptions} 
                selected={filterFrota.length > 0 ? filterFrota : maintenanceFilters.prefixo} 
                onChange={handleFrotaChange} 
                placeholder="Todos os Prefixos" 
              />

              <MultiSelect 
                label="Placa" 
                options={formattedPlacaOptions} 
                selected={filterPlaca.length > 0 ? filterPlaca : maintenanceFilters.placa} 
                onChange={handlePlacaChange} 
                placeholder="Todas as Placas" 
              />

              <MultiSelect 
                label="Grupo Custo (GRC)" 
                options={(maintenanceOptions.grc || []).map(g => ({ label: g, value: g }))} 
                selected={maintenanceFilters.grc} 
                onChange={(vals) => setMaintenanceFilters((prev: any) => ({ ...prev, grc: vals }))} 
                placeholder="Todos os Custos" 
              />

              <MultiSelect 
                label="Grupo Despesa (GRD)" 
                options={(maintenanceOptions.grd || []).map(g => ({ label: g, value: g }))} 
                selected={maintenanceFilters.grd} 
                onChange={(vals) => setMaintenanceFilters((prev: any) => ({ ...prev, grd: vals }))} 
                placeholder="Todas as Despesas" 
              />

              <MultiSelect 
                label="Grupo Estoque (GRE)" 
                options={(maintenanceOptions.gre || []).map(g => ({ label: g, value: g }))} 
                selected={maintenanceFilters.gre} 
                onChange={(vals) => setMaintenanceFilters((prev: any) => ({ ...prev, gre: vals }))} 
                placeholder="Todos os Estoques" 
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Active Filter Chips */}
      {activeFilterCount > 0 && (
        <div className={`p-3 rounded-2xl border flex flex-wrap items-center gap-2 ${
          isDark ? 'bg-slate-950/40 border-slate-800' : 'bg-slate-50 border-slate-200'
        }`}>
          <span className={`text-[10px] font-black uppercase tracking-wider flex items-center gap-1 ${
            isDark ? 'text-slate-400' : 'text-slate-500'
          }`}>
            <Filter size={12} />
            Filtros Aplicados:
          </span>

          {/* Month Chips */}
          {Array.from(activeMonthsSet).map(num => {
            const found = MONTH_DATA.find(md => md.num === num);
            return (
              <span 
                key={`chip-month-${num}`}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wide border shadow-sm ${
                  isDark ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30' : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                }`}
              >
                <span>Mês: {found ? found.name : num}</span>
                <button 
                  type="button" 
                  onClick={() => handleToggleMonth(num, found ? found.name : '')}
                  className="hover:opacity-75"
                >
                  <X size={12} />
                </button>
              </span>
            );
          })}

          {/* Year Chips */}
          {(filterYear.length > 0 ? filterYear : maintenanceFilters.ano).map(yr => (
            <span 
              key={`chip-yr-${yr}`}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wide border shadow-sm ${
                isDark ? 'bg-indigo-500/10 text-indigo-400 border-indigo-500/30' : 'bg-indigo-50 text-indigo-800 border-indigo-200'
              }`}
            >
              <span>Ano: {yr}</span>
              <button 
                type="button" 
                onClick={() => handleYearChange((filterYear.length > 0 ? filterYear : maintenanceFilters.ano).filter(y => y !== yr))}
                className="hover:opacity-75"
              >
                <X size={12} />
              </button>
            </span>
          ))}

          {/* Frota Chips */}
          {(filterFrota.length > 0 ? filterFrota : maintenanceFilters.prefixo).map(f => (
            <span 
              key={`chip-fr-${f}`}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wide border shadow-sm ${
                isDark ? 'bg-blue-500/10 text-blue-400 border-blue-500/30' : 'bg-blue-50 text-blue-800 border-blue-200'
              }`}
            >
              <span>Frota: {f}</span>
              <button 
                type="button" 
                onClick={() => handleFrotaChange((filterFrota.length > 0 ? filterFrota : maintenanceFilters.prefixo).filter(x => x !== f))}
                className="hover:opacity-75"
              >
                <X size={12} />
              </button>
            </span>
          ))}

          {/* Placa Chips */}
          {(filterPlaca.length > 0 ? filterPlaca : maintenanceFilters.placa).map(p => (
            <span 
              key={`chip-pl-${p}`}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wide border shadow-sm ${
                isDark ? 'bg-amber-500/10 text-amber-400 border-amber-500/30' : 'bg-amber-50 text-amber-800 border-amber-200'
              }`}
            >
              <span>Placa: {p}</span>
              <button 
                type="button" 
                onClick={() => handlePlacaChange((filterPlaca.length > 0 ? filterPlaca : maintenanceFilters.placa).filter(x => x !== p))}
                className="hover:opacity-75"
              >
                <X size={12} />
              </button>
            </span>
          ))}

          {/* GRC Chips */}
          {maintenanceFilters.grc.map(g => (
            <span 
              key={`chip-grc-${g}`}
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wide border shadow-sm ${
                isDark ? 'bg-violet-500/10 text-violet-400 border-violet-500/30' : 'bg-violet-50 text-violet-800 border-violet-200'
              }`}
            >
              <span>GRC: {g}</span>
              <button 
                type="button" 
                onClick={() => setMaintenanceFilters((prev: any) => ({ ...prev, grc: prev.grc.filter((x: string) => x !== g) }))}
                className="hover:opacity-75"
              >
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
});
