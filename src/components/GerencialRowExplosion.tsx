import React, { useState } from 'react';
import { 
  Maximize2, 
  Minimize2, 
  Wrench, 
  Fuel, 
  DollarSign, 
  Gauge, 
  Layers, 
  FileText, 
  Package, 
  ChevronRight, 
  ExternalLink, 
  AlertCircle, 
  CheckCircle2, 
  Zap, 
  Sparkles, 
  Truck, 
  Settings, 
  Info,
  Calendar,
  Hash,
  ArrowUpRight,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
import { cn } from '../lib/utils';

interface GerencialRowExplosionProps {
  row: any;
  targetKml: number;
  normalizedNf: any[];
  normalizedEstoque: any[];
  maintenanceFilters: any;
  appTheme?: string;
  onAuditPrefix?: (prefix: string) => void;
  onSelectVehicle?: (placa: string) => void;
}

export const GerencialRowExplosion: React.FC<GerencialRowExplosionProps> = ({
  row,
  targetKml,
  normalizedNf = [],
  normalizedEstoque = [],
  maintenanceFilters,
  appTheme = 'light',
  onAuditPrefix,
  onSelectVehicle,
}) => {
  const isDark = appTheme === 'dark-neon';
  const [activeSubTab, setActiveSubTab] = useState<'overview' | 'items'>('overview');

  const placa = row.placa || row.PLACA || '';
  const frota = row.frota || row.FROTA || '';
  const prefix = (frota && String(frota).trim() !== 'N/A' && String(frota).trim() !== '0') ? String(frota).trim() : placa;

  const totalFuel = row.valor || 0;
  const totalMaint = row.totalMaint || 0;
  const totalGeral = totalFuel + totalMaint;
  const kmProdutivo = row.kmProdutivo || 0;
  const litros = row.litros || 0;
  const kml = row.kml || 0;
  const kmInicial = row.kmInicial || 0;
  const kmFinal = row.kmFinal || 0;

  const custoPorKm = kmProdutivo > 0 ? (totalGeral / kmProdutivo) : 0;
  const custoFuelPorKm = kmProdutivo > 0 ? (totalFuel / kmProdutivo) : 0;
  const custoMaintPorKm = kmProdutivo > 0 ? (totalMaint / kmProdutivo) : 0;

  const kmlDiff = kml > 0 ? ((kml - targetKml) / targetKml) * 100 : 0;
  const isKmlAboveTarget = kml >= targetKml;

  // Filter maintenance items for this vehicle
  const vehicleNfItems = React.useMemo(() => {
    return normalizedNf.filter(item => {
      const matchPrefix = item.PREFIXOVEIC === prefix || item.PREFIXOVEIC === placa || item.PLACA === placa;
      if (!matchPrefix) return false;
      if (!maintenanceFilters) return true;
      const matchesAno = !maintenanceFilters.ano?.length || maintenanceFilters.ano.includes(item.ano);
      const matchesMes = !maintenanceFilters.mes?.length || maintenanceFilters.mes.includes(item.mes);
      const matchesGrc = !maintenanceFilters.grc?.length || maintenanceFilters.grc.includes(item.grc);
      const matchesGre = !maintenanceFilters.gre?.length || maintenanceFilters.gre.includes(item.gre);
      const matchesGrd = !maintenanceFilters.grd?.length || maintenanceFilters.grd.includes(item.grd);
      return matchesAno && matchesMes && matchesGrc && matchesGre && matchesGrd;
    });
  }, [normalizedNf, prefix, placa, maintenanceFilters]);

  const vehicleEstoqueItems = React.useMemo(() => {
    return normalizedEstoque.filter(item => {
      const matchPrefix = item.PREFIXOVEIC === prefix || item.PREFIXOVEIC === placa || item.PLACA === placa;
      if (!matchPrefix) return false;
      if (!maintenanceFilters) return true;
      const matchesAno = !maintenanceFilters.ano?.length || maintenanceFilters.ano.includes(item.ano);
      const matchesMes = !maintenanceFilters.mes?.length || maintenanceFilters.mes.includes(item.mes);
      const matchesGrc = !maintenanceFilters.grc?.length || maintenanceFilters.grc.includes(item.grc);
      const matchesGre = !maintenanceFilters.gre?.length || maintenanceFilters.gre.includes(item.gre);
      const matchesGrd = !maintenanceFilters.grd?.length || maintenanceFilters.grd.includes(item.grd);
      return matchesAno && matchesMes && matchesGrc && matchesGre && matchesGrd;
    });
  }, [normalizedEstoque, prefix, placa, maintenanceFilters]);

  const allVehicleItems = React.useMemo(() => {
    const nfs = vehicleNfItems.map(i => ({ ...i, tipoLanc: 'AVULSO' as const }));
    const estoques = vehicleEstoqueItems.map(i => ({ ...i, tipoLanc: 'ESTOQUE' as const }));
    return [...nfs, ...estoques].sort((a, b) => (Number(b.valor) || 0) - (Number(a.valor) || 0));
  }, [vehicleNfItems, vehicleEstoqueItems]);

  const categories = [
    { label: 'Câmbio', value: row.cambio || 0, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20', icon: Settings },
    { label: 'Pneus', value: row.pneus || 0, color: 'text-indigo-500', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20', icon: Layers },
    { label: 'Motor', value: row.motor || 0, color: 'text-rose-500', bg: 'bg-rose-500/10', border: 'border-rose-500/20', icon: Zap },
    { label: 'Elétrica', value: row.eletrica || 0, color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/20', icon: Sparkles },
    { label: 'Carroceria', value: row.carroceria || 0, color: 'text-orange-500', bg: 'bg-orange-500/10', border: 'border-orange-500/20', icon: Truck },
    { label: 'Diversos', value: row.diversos || 0, color: 'text-slate-500', bg: 'bg-slate-500/10', border: 'border-slate-500/20', icon: Info },
  ];

  return (
    <td colSpan={17} className="p-0 border-b-2 border-indigo-200 dark:border-indigo-900/60 bg-gradient-to-b from-indigo-50/40 via-white to-slate-50/60 dark:from-slate-900/90 dark:via-slate-900 dark:to-slate-950">
      <div className="p-6 md:p-8 space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
        
        {/* Top bar with Vehicle Info & Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <Truck size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                  Explosão de Dados do Ativo
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300">
                  Placa: {placa}
                </span>
                {frota && frota !== placa && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    Frota: {frota}
                  </span>
                )}
                {row.isOverlapAdjusted && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 border border-amber-300">
                    Ajuste de Sobreposição
                  </span>
                )}
              </div>
              <h3 className="text-xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2 mt-0.5">
                {placa} {frota && frota !== placa ? `(${frota})` : ''}
              </h3>
            </div>
          </div>

          {/* Sub tabs & Quick Action buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center p-1 bg-slate-200/60 dark:bg-slate-800 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveSubTab('overview')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-black transition-all",
                  activeSubTab === 'overview'
                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                Visão Analítica
              </button>
              <button
                type="button"
                onClick={() => setActiveSubTab('items')}
                className={cn(
                  "px-3 py-1.5 rounded-lg text-xs font-black transition-all flex items-center gap-1.5",
                  activeSubTab === 'items'
                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                    : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                <span>Lançamentos</span>
                <span className="px-1.5 py-0.2 rounded-full text-[9px] font-black bg-indigo-500/20 text-indigo-600 dark:text-indigo-300">
                  {allVehicleItems.length}
                </span>
              </button>
            </div>

            {onAuditPrefix && (
              <button
                type="button"
                onClick={() => onAuditPrefix(prefix)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all shadow-md shadow-indigo-600/20 active:scale-95"
                title="Auditar e ajustar lançamentos deste veículo"
              >
                <FileText size={14} />
                <span>Auditar Lançamentos</span>
              </button>
            )}

            {onSelectVehicle && (
              <button
                type="button"
                onClick={() => onSelectVehicle(placa)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-800 dark:hover:bg-slate-700 rounded-xl text-xs font-black transition-all shadow-md active:scale-95"
                title="Filtrar veículo no painel principal"
              >
                <ArrowUpRight size={14} />
                <span>Filtrar no Painel</span>
              </button>
            )}
          </div>
        </div>

        {activeSubTab === 'overview' ? (
          <div className="space-y-6">
            {/* 4 Cards: Totais e Desempenho */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              {/* Card Combustível */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700 shadow-sm space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-black uppercase text-[10px] tracking-wider">
                    <Fuel size={14} /> Combustível
                  </span>
                  <span>{litros.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} Litros</span>
                </div>
                <div className="text-xl font-black font-mono text-slate-900 dark:text-white">
                  {totalFuel.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </div>
                <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span>Custo p/ KM:</span>
                  <span className="font-black font-mono text-emerald-600 dark:text-emerald-400">
                    {custoFuelPorKm > 0 ? custoFuelPorKm.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }) : '-'} /km
                  </span>
                </div>
              </div>

              {/* Card Manutenção */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700 shadow-sm space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-black uppercase text-[10px] tracking-wider">
                    <Wrench size={14} /> Manutenção Total
                  </span>
                  <span>Avulso + Estoque</span>
                </div>
                <div className="text-xl font-black font-mono text-rose-600 dark:text-rose-400">
                  {totalMaint.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </div>
                <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span className="text-blue-600 dark:text-blue-400 font-bold">
                    Avulso: {(row.avulsoTotal || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
                  </span>
                  <span className="text-amber-600 dark:text-amber-400 font-bold">
                    Estoque: {(row.estoqueTotal || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
                  </span>
                </div>
              </div>

              {/* Card Desempenho KM/L */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700 shadow-sm space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                  <span className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-black uppercase text-[10px] tracking-wider">
                    <Gauge size={14} /> Média KM/L
                  </span>
                  <span className="text-[10px] font-black uppercase">Meta {targetKml.toFixed(1)}</span>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className={cn(
                    "text-xl font-black font-mono",
                    kml <= 0 ? "text-slate-400" : (isKmlAboveTarget ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400")
                  )}>
                    {kml > 0 ? kml.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                  </span>
                  {kml > 0 && (
                    <span className={cn(
                      "text-[10px] font-black px-1.5 py-0.5 rounded-md flex items-center gap-0.5",
                      isKmlAboveTarget ? "bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300" : "bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300"
                    )}>
                      {isKmlAboveTarget ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                      {kmlDiff > 0 ? `+${kmlDiff.toFixed(1)}%` : `${kmlDiff.toFixed(1)}%`}
                    </span>
                  )}
                </div>
                <div className="pt-2 border-t border-slate-100 dark:border-slate-700/60 flex items-center justify-between text-[11px] text-slate-500 dark:text-slate-400">
                  <span>KM Produtivo:</span>
                  <span className="font-black font-mono text-slate-800 dark:text-slate-200">
                    {kmProdutivo.toLocaleString('pt-BR')} km
                  </span>
                </div>
              </div>

              {/* Card Investimento Global */}
              <div className="p-4 rounded-2xl bg-slate-900 text-white shadow-lg shadow-slate-950/20 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold text-slate-400">
                  <span className="flex items-center gap-1.5 text-amber-400 font-black uppercase text-[10px] tracking-wider">
                    <DollarSign size={14} /> Custo Global
                  </span>
                  <span className="text-[10px] text-slate-400">Comb + Manut</span>
                </div>
                <div className="text-xl font-black font-mono text-white italic">
                  {totalGeral.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </div>
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Custo Total / KM:</span>
                  <span className="font-black font-mono text-amber-300">
                    {custoPorKm > 0 ? custoPorKm.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 }) : '-'} /km
                  </span>
                </div>
              </div>

            </div>

            {/* Odômetros e Decomposição Técnica por Categoria */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              
              {/* Odômetro e Quilometragem */}
              <div className="p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700 space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                  <Gauge size={14} className="text-indigo-500" /> Movimentação de Quilometragem
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60">
                    <span className="text-[10px] font-black uppercase text-slate-400 block">KM Inicial</span>
                    <span className="text-sm font-black font-mono text-slate-800 dark:text-slate-200">
                      {kmInicial.toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700/60">
                    <span className="text-[10px] font-black uppercase text-slate-400 block">KM Final</span>
                    <span className="text-sm font-black font-mono text-slate-800 dark:text-slate-200">
                      {kmFinal.toLocaleString('pt-BR')}
                    </span>
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/50 flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">Distância Percorrida:</span>
                  <span className="text-sm font-black font-mono text-emerald-600 dark:text-emerald-400">
                    {kmProdutivo.toLocaleString('pt-BR')} km
                  </span>
                </div>
              </div>

              {/* Grid dos 6 Subsistemas Técnicos */}
              <div className="lg:col-span-2 p-4 rounded-2xl bg-white dark:bg-slate-800/80 border border-slate-200/90 dark:border-slate-700 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
                    <Wrench size={14} className="text-rose-500" /> Distribuição Técnica de Oficina ({categories.length} grupos)
                  </h4>
                  <span className="text-[10px] font-bold text-slate-400">
                    Total: {totalMaint.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
                  </span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  {categories.map((cat) => {
                    const Icon = cat.icon;
                    const catPct = totalMaint > 0 ? ((cat.value / totalMaint) * 100).toFixed(0) : '0';
                    return (
                      <div 
                        key={cat.label} 
                        className={cn(
                          "p-2.5 rounded-xl border flex items-center justify-between gap-2 transition-all hover:scale-[1.02]",
                          cat.bg,
                          cat.border
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <Icon size={14} className={cat.color} />
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-600 dark:text-slate-300 block leading-none">
                              {cat.label}
                            </span>
                            <span className={cn("text-xs font-black font-mono mt-0.5 block", cat.color)}>
                              {cat.value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
                            </span>
                          </div>
                        </div>
                        {cat.value > 0 && (
                          <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-white/80 dark:bg-slate-900/80 text-slate-700 dark:text-slate-300 font-mono shadow-xs">
                            {catPct}%
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          </div>
        ) : (
          /* SubTab: Lista de Itens / Auditoria Instantânea */
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-600 dark:text-slate-300">
              <span>Lançamentos Registrados para este Ativo no Período ({allVehicleItems.length} registros)</span>
              {onAuditPrefix && (
                <button
                  type="button"
                  onClick={() => onAuditPrefix(prefix)}
                  className="text-xs font-black text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                >
                  <span>Abrir Editor Completo de Auditoria</span>
                  <ChevronRight size={14} />
                </button>
              )}
            </div>

            {allVehicleItems.length === 0 ? (
              <div className="p-8 text-center bg-white dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 text-slate-400">
                <AlertCircle size={28} className="mx-auto mb-2 opacity-50" />
                <p className="text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Nenhum lançamento individual de nota fiscal ou estoque encontrado
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Os valores consolidados podem ter sido lançados via resumo ou rateio geral.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-50 dark:bg-slate-900/80 text-slate-500 uppercase font-black text-[9px] tracking-wider border-b border-slate-200 dark:border-slate-700">
                    <tr>
                      <th className="px-3 py-2.5">Origem</th>
                      <th className="px-3 py-2.5">Data</th>
                      <th className="px-3 py-2.5">Documento</th>
                      <th className="px-3 py-2.5">Descrição / Produto / Serviço</th>
                      <th className="px-3 py-2.5">Grupo (GRC / GRE / GRD)</th>
                      <th className="px-3 py-2.5 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700/60 font-bold">
                    {allVehicleItems.slice(0, 20).map((item, i) => {
                      const isEstoque = item.tipoLanc === 'ESTOQUE';
                      const val = Number(item.valor) || 0;
                      return (
                        <tr key={i} className="hover:bg-slate-50/80 dark:hover:bg-slate-700/40">
                          <td className="px-3 py-2">
                            <span className={cn(
                              "px-2 py-0.5 rounded-md text-[9px] font-black tracking-wider uppercase inline-flex items-center gap-1",
                              isEstoque ? "bg-amber-100 dark:bg-amber-950 text-amber-800 dark:text-amber-300" : "bg-blue-100 dark:bg-blue-950 text-blue-800 dark:text-blue-300"
                            )}>
                              {isEstoque ? <Package size={10} /> : <FileText size={10} />}
                              {isEstoque ? 'Estoque' : 'Avulso (NF)'}
                            </span>
                          </td>
                          <td className="px-3 py-2 font-mono text-slate-500">{item.data || item.DATA || '-'}</td>
                          <td className="px-3 py-2 font-mono text-slate-600 dark:text-slate-300">{item.documento || item.NUMERONF || item.DOCUMENTO || '-'}</td>
                          <td className="px-3 py-2 text-slate-900 dark:text-white max-w-[280px] truncate" title={item.descricao || item.DESCRICAO || item.NOMEMAT}>
                            {item.descricao || item.DESCRICAO || item.NOMEMAT || '-'}
                          </td>
                          <td className="px-3 py-2 text-slate-500 font-mono text-[10px]">
                            {item.grc || item.GRC || item.gre || item.GRE || item.grd || item.GRD || '-'}
                          </td>
                          <td className="px-3 py-2 text-right font-black font-mono text-slate-900 dark:text-white">
                            {val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
                {allVehicleItems.length > 20 && (
                  <div className="p-2.5 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-200 dark:border-slate-700 text-center text-xs text-slate-500 font-bold">
                    Exibindo os 20 principais lançamentos de {allVehicleItems.length}. Use o botão &quot;Auditar Lançamentos&quot; para auditar a lista completa.
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </td>
  );
};
