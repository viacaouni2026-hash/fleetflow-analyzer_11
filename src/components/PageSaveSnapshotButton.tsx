import React, { useState, useEffect, useRef } from 'react';
import { 
  CheckCircle2, 
  RotateCw, 
  HardDrive, 
  Save, 
  Clock, 
  Calendar, 
  Layers, 
  Filter, 
  ShieldCheck, 
  ChevronDown, 
  ChevronUp, 
  Copy, 
  Check, 
  Sparkles,
  Cloud,
  ExternalLink,
  Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { LastValidSaveInfo } from '../types';
import { cn } from '../lib/utils';

interface PageSaveSnapshotButtonProps {
  lastValidSave: LastValidSaveInfo | null;
  onSaveAll: () => Promise<void> | void;
  isSaving?: boolean;
  appTheme?: 'light' | 'dark-neon';
  activeTabLabel?: string;
  totalRecords?: number;
  activeFiltersCount?: number;
  isCloudConnected?: boolean;
}

export const PageSaveSnapshotButton: React.FC<PageSaveSnapshotButtonProps> = ({
  lastValidSave,
  onSaveAll,
  isSaving = false,
  appTheme = 'light',
  activeTabLabel = 'Resumo Gerencial',
  totalRecords = 0,
  activeFiltersCount = 0,
  isCloudConnected = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showSavedFeedback, setShowSavedFeedback] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleTriggerSave = async (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await onSaveAll();
      setShowSavedFeedback(true);
      setTimeout(() => setShowSavedFeedback(false), 3000);
    } catch (err) {
      console.error("Erro ao salvar momento:", err);
    }
  };

  const handleCopyTimestamp = () => {
    if (!lastValidSave) return;
    const text = `Último Salvamento Válido: ${lastValidSave.displayString} | Página: ${lastValidSave.tabName} | Status: Válido`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const hasSave = Boolean(lastValidSave?.displayString);

  return (
    <div className="relative inline-block" ref={popoverRef}>
      {/* Botão Principal Estilo Indicador / Documento Corporativo */}
      <div 
        className={cn(
          "flex items-center gap-2 px-2.5 sm:px-3.5 py-1.5 sm:py-2 rounded-xl border transition-all duration-200 select-none shadow-xs group",
          appTheme === 'dark-neon'
            ? "bg-[#0b0f19] border-[#1e293b] hover:border-emerald-500/50 shadow-[0_0_15px_rgba(0,0,0,0.5)]"
            : "bg-white border-slate-200 hover:border-emerald-400 hover:shadow-sm"
        )}
      >
        {/* Indicador de Status com Ícone e Ping Verde */}
        <div 
          onClick={handleTriggerSave}
          title="Clique para salvar todo o estado atual da página"
          className="flex items-center gap-2 cursor-pointer"
        >
          <div className="relative flex items-center justify-center">
            {isSaving ? (
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-500/10 text-emerald-500 flex items-center justify-center border border-emerald-500/20">
                <RotateCw size={15} className="animate-spin" />
              </div>
            ) : showSavedFeedback ? (
              <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-emerald-500 text-white flex items-center justify-center shadow-md animate-bounce">
                <Check size={15} className="stroke-[3]" />
              </div>
            ) : (
              <div className={cn(
                "w-7 h-7 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center transition-colors border",
                hasSave 
                  ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/25 group-hover:bg-emerald-500/20" 
                  : "bg-amber-500/10 text-amber-600 border-amber-500/20"
              )}>
                <ShieldCheck size={16} />
              </div>
            )}
            
            {/* Pulsing indicator dot */}
            {!isSaving && hasSave && (
              <span className="absolute -top-0.5 -right-0.5 flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
            )}
          </div>

          {/* Texto de Data e Horário */}
          <div className="flex flex-col text-left">
            <div className="flex items-center gap-1.5">
              <span className={cn(
                "text-[9px] font-black uppercase tracking-wider",
                appTheme === 'dark-neon' ? "text-slate-400" : "text-slate-500"
              )}>
                {isSaving 
                  ? 'Salvando Tudo...' 
                  : showSavedFeedback 
                  ? 'Salvo com Sucesso!' 
                  : 'Último Salvamento'}
              </span>
              <span className={cn(
                "px-1 py-0.2 rounded text-[8px] font-black tracking-widest uppercase",
                hasSave 
                  ? "bg-emerald-500/15 text-emerald-600 border border-emerald-500/30" 
                  : "bg-amber-500/15 text-amber-600 border border-amber-500/30"
              )}>
                {hasSave ? 'VÁLIDO' : 'PENDENTE'}
              </span>
            </div>

            <div className="flex items-center gap-1 text-[11px] sm:text-xs font-mono font-bold">
              <Clock size={11} className={hasSave ? "text-emerald-500" : "text-amber-500"} />
              <span className={cn(
                "truncate max-w-[140px] sm:max-w-[190px]",
                appTheme === 'dark-neon' ? "text-slate-200" : "text-slate-800"
              )}>
                {hasSave ? lastValidSave?.displayString : 'Nenhum salvamento recente'}
              </span>
            </div>
          </div>
        </div>

        {/* Separador vertical sutil */}
        <div className={cn(
          "h-6 w-[1px] mx-1",
          appTheme === 'dark-neon' ? "bg-slate-800" : "bg-slate-200"
        )} />

        {/* Botão de Ação "Salvar Tudo" */}
        <button
          onClick={handleTriggerSave}
          disabled={isSaving}
          title="Salvar imediatamente todo o momento atual"
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs",
            isSaving 
              ? "bg-slate-200 text-slate-500 cursor-not-allowed" 
              : "bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95"
          )}
        >
          <Save size={13} className={cn(isSaving && "animate-spin")} />
          <span className="hidden md:inline">Salvar Tudo</span>
        </button>

        {/* Botão de Expansão / Detalhes */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "p-1 rounded-md text-slate-400 hover:text-slate-600 transition-colors",
            isOpen && "text-emerald-500"
          )}
          title="Ver detalhes do salvamento"
        >
          {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </button>
      </div>

      {/* Popover com Detalhes do Salvamento */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className={cn(
              "absolute right-0 top-full mt-2 w-80 sm:w-96 rounded-2xl border p-4 shadow-2xl z-50 backdrop-blur-xl",
              appTheme === 'dark-neon'
                ? "bg-[#0b0f19]/95 border-[#1e293b] text-slate-100 shadow-[0_15px_40px_rgba(0,0,0,0.8)]"
                : "bg-white/95 border-slate-200 text-slate-800 shadow-xl"
            )}
          >
            {/* Cabeçalho do Popover */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200/60 dark:border-slate-800/80 mb-3">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                  <ShieldCheck size={16} />
                </div>
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider">Status do Salvamento</h4>
                  <p className="text-[10px] text-slate-400 font-mono">Snapshot Integral do Sistema</p>
                </div>
              </div>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                VÁLIDO & CONCILIADO
              </span>
            </div>

            {/* Informações Estruturadas */}
            <div className="space-y-2.5 text-xs">
              {/* Data e Horário */}
              <div className={cn(
                "p-2.5 rounded-xl border flex items-center justify-between",
                appTheme === 'dark-neon' ? "bg-slate-900/60 border-slate-800" : "bg-slate-50 border-slate-100"
              )}>
                <div className="flex items-center gap-2">
                  <Clock size={15} className="text-emerald-500" />
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Data e Horário</span>
                    <span className="font-mono font-bold text-xs text-emerald-600 dark:text-emerald-400">
                      {lastValidSave?.displayString || 'Nenhum registro ainda'}
                    </span>
                  </div>
                </div>
                {hasSave && (
                  <button
                    onClick={handleCopyTimestamp}
                    title="Copiar carimbo de data e hora"
                    className="p-1.5 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
                  >
                    {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                  </button>
                )}
              </div>

              {/* Momento da Página (Aba Ativa) */}
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-800/60">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Layers size={13} className="text-blue-500" />
                  Momento Salvo:
                </span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {lastValidSave?.tabName || activeTabLabel}
                </span>
              </div>

              {/* Filtros Preservados */}
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-800/60">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Filter size={13} className="text-purple-500" />
                  Filtros Preservados:
                </span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {(lastValidSave?.activeFiltersCount ?? activeFiltersCount) > 0 
                    ? `${lastValidSave?.activeFiltersCount ?? activeFiltersCount} filtros ativos` 
                    : 'Filtro padrão geral'}
                </span>
              </div>

              {/* Base de Registros */}
              <div className="flex justify-between items-center py-1.5 border-b border-slate-100 dark:border-slate-800/60">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <HardDrive size={13} className="text-cyan-500" />
                  Registros na Memória:
                </span>
                <span className="font-mono font-bold text-slate-800 dark:text-slate-200">
                  {(lastValidSave?.totalRecordsCount ?? totalRecords).toLocaleString('pt-BR')} registros
                </span>
              </div>

              {/* Armazenamento */}
              <div className="flex justify-between items-center py-1.5">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Cloud size={13} className={isCloudConnected ? "text-emerald-500" : "text-slate-400"} />
                  Destino da Persistência:
                </span>
                <span className="font-bold text-[11px] text-slate-700 dark:text-slate-300">
                  {isCloudConnected ? 'Local + Nuvem Firestore' : 'Cache Local Seguro'}
                </span>
              </div>
            </div>

            {/* Ações Inferiores */}
            <div className="mt-4 pt-3 border-t border-slate-200/60 dark:border-slate-800/80 flex items-center gap-2">
              <button
                onClick={() => handleTriggerSave()}
                disabled={isSaving}
                className={cn(
                  "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-xl font-bold text-xs text-white transition-all shadow-md",
                  isSaving 
                    ? "bg-slate-400 cursor-not-allowed" 
                    : "bg-emerald-600 hover:bg-emerald-700 active:scale-98"
                )}
              >
                <Save size={14} className={cn(isSaving && "animate-spin")} />
                {isSaving ? 'Salvando...' : 'Salvar Momento Atual Agora'}
              </button>
              
              <button
                onClick={() => setIsOpen(false)}
                className="px-3 py-2 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Fechar
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
