import React, { useState, useMemo, useRef, useEffect } from 'react';
import { ChevronDown, Search, Check } from 'lucide-react';
import { cn } from '../lib/utils';

export interface MultiSelectProps {
  label: string;
  options: (string | { label: string; value: string })[];
  selected: string[];
  onChange: (vals: string[]) => void;
  placeholder?: string;
  isDark?: boolean;
}

export const MultiSelect: React.FC<MultiSelectProps> = React.memo(({
  label,
  options = [],
  selected = [],
  onChange,
  placeholder = "Todas",
  isDark = false
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const optionsMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const opt of options) {
      if (typeof opt === 'string') {
        map.set(opt, opt);
      } else if (opt && opt.value) {
        map.set(opt.value, opt.label);
      }
    }
    return map;
  }, [options]);

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const filteredOptions = useMemo(() => {
    if (!isOpen) return [];
    if (!searchTerm.trim()) return options;
    const term = searchTerm.toLowerCase();
    return options.filter(opt => {
      const labelText = (typeof opt === 'string' ? opt : opt?.label) || '';
      return labelText.toLowerCase().includes(term);
    });
  }, [isOpen, options, searchTerm]);

  const toggleOption = (val: string) => {
    if (selectedSet.has(val)) {
      onChange(selected.filter(s => s !== val));
    } else {
      onChange([...selected, val]);
    }
  };

  const handleSelectAll = () => {
    const allVals = options.map(opt => typeof opt === 'string' ? opt : opt.value);
    onChange(allVals);
  };

  const handleDeselectAll = () => {
    onChange([]);
  };

  const getLabel = (val: string) => {
    return optionsMap.get(val) || val;
  };

  return (
    <div className={cn("flex flex-col gap-1 relative", isOpen ? "z-50" : "z-10")} ref={containerRef}>
      <label className={`text-[10px] font-black uppercase tracking-wider ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
        {label}
      </label>
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) setSearchTerm('');
        }}
        className={cn(
          "px-3 py-1.5 rounded-xl text-xs font-bold outline-none text-left flex items-center justify-between min-w-[130px] h-[36px] transition-all border shadow-2xs cursor-pointer",
          isDark
            ? "bg-slate-900 border-slate-800 text-slate-200 hover:border-slate-700"
            : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300",
          selected.length > 0 && (isDark ? "border-cyan-500/50 bg-cyan-950/30 text-cyan-300 font-black" : "border-emerald-300 bg-emerald-50/70 text-emerald-900 font-black")
        )}
      >
        <span className="truncate max-w-[130px]">
          {selected.length === 0 ? placeholder : selected.length === 1 ? getLabel(selected[0]) : `${selected.length} selecionados`}
        </span>
        <ChevronDown size={14} className={cn("transition-transform text-slate-400 shrink-0", isOpen && "rotate-180")} />
      </button>
      
      {isOpen && (
        <div 
          className={cn(
            "absolute top-full left-0 w-full mt-1.5 rounded-2xl shadow-2xl z-[9999] p-2 min-w-[250px] border animate-in fade-in zoom-in-95 duration-100",
            isDark ? "bg-slate-900/98 border-slate-700 text-slate-100 shadow-cyan-950/50 backdrop-blur-xl" : "bg-white/98 border-slate-200 text-slate-800 shadow-2xl backdrop-blur-xl"
          )}
          style={{ zIndex: 9999 }}
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="p-1.5 border-b border-slate-100 dark:border-slate-800 mb-2 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                {label} ({selected.length}/{options.length})
              </span>
              {selected.length > 0 && (
                <button 
                  type="button"
                  onClick={() => { onChange([]); }}
                  className="text-[10px] font-black text-rose-500 hover:text-rose-600 uppercase tracking-wider cursor-pointer"
                >
                  Limpar
                </button>
              )}
            </div>
            
            <div className="relative">
              <input
                type="text"
                placeholder="Pesquisar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className={cn(
                  "w-full pl-8 pr-3 py-1.5 rounded-xl text-xs outline-none transition-all font-medium",
                  isDark 
                    ? "bg-slate-800 border-slate-700 text-slate-100 focus:border-cyan-500" 
                    : "bg-slate-50 border border-slate-200 text-slate-800 focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                )}
                autoFocus
              />
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            </div>

            <div className="flex gap-1.5">
              <button 
                type="button"
                onClick={handleSelectAll}
                className={cn(
                  "flex-1 py-1 px-2 rounded-lg text-[10px] font-black uppercase transition-colors cursor-pointer",
                  isDark ? "bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                )}
              >
                Selecionar Tudo
              </button>
              <button 
                type="button"
                onClick={handleDeselectAll}
                className={cn(
                  "flex-1 py-1 px-2 rounded-lg text-[10px] font-black uppercase transition-colors cursor-pointer",
                  isDark ? "bg-slate-800 text-slate-400 hover:bg-slate-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                Desmarcar
              </button>
            </div>
          </div>

          <div className="max-h-64 overflow-y-auto custom-scrollbar overflow-x-hidden space-y-0.5">
            {filteredOptions.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400 italic">
                Nenhum resultado encontrado
              </div>
            ) : (
              <>
                {filteredOptions.slice(0, 100).map(opt => {
                  const val = typeof opt === 'string' ? opt : opt.value;
                  const labelText = typeof opt === 'string' ? opt : opt.label;
                  const isSelected = selected.includes(val);
                  
                  return (
                    <div
                      key={val}
                      onClick={() => toggleOption(val)}
                      className={cn(
                        "px-2.5 py-1.5 rounded-xl cursor-pointer text-xs flex items-center gap-2 transition-colors select-none",
                        isSelected 
                          ? (isDark ? "bg-cyan-500/20 text-cyan-300 font-black" : "bg-emerald-50 text-emerald-900 font-black")
                          : (isDark ? "hover:bg-slate-800 text-slate-300" : "hover:bg-slate-50 text-slate-700")
                      )}
                    >
                      <div className={cn(
                        "w-4 h-4 rounded-md flex items-center justify-center shrink-0 transition-all",
                        isSelected 
                          ? (isDark ? "bg-cyan-500 text-slate-950" : "bg-emerald-600 text-white") 
                          : (isDark ? "border border-slate-700 bg-slate-800" : "border border-slate-300 bg-white")
                      )}>
                        {isSelected && <Check size={11} strokeWidth={3} />}
                      </div>
                      <span className="truncate">{labelText}</span>
                    </div>
                  );
                })}
                {filteredOptions.length > 100 && (
                  <div className="p-2 text-center text-[10px] text-slate-400 border-t border-slate-100 dark:border-slate-800 italic">
                    Mostrando 100 de {filteredOptions.length} resultados. Pesquise acima para ver mais.
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
});
export default MultiSelect;
