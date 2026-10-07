import React, { useState, useMemo } from 'react';
import { 
  X, 
  Search, 
  Download, 
  Printer, 
  FileText, 
  Layers, 
  Truck, 
  Building2, 
  Calendar, 
  ShoppingBag, 
  Package, 
  CheckCircle2, 
  Loader2,
  ChevronLeft,
  ChevronRight,
  Filter,
  Maximize2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const DEFAULT_UNI_LOGO_URL = 'https://raw.githubusercontent.com/Buenotec/Logo_UNI/refs/heads/main/logo_uni.png';

// Helper to convert Image URL to Base64
const getBase64FromUrl = async (url: string): Promise<string> => {
  try {
    const res = await fetch(url);
    const blob = await res.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          resolve(canvas.toDataURL('image/png'));
        } else {
          resolve('');
        }
      };
      img.onerror = () => resolve('');
      img.src = url;
    });
  }
};

interface MaintenanceExplosionModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  items: any[];
  appTheme?: string;
  isDark?: boolean;
  uniLogoUrl?: string;
  onPrintDirectly?: () => void;
}

export const MaintenanceExplosionModal: React.FC<MaintenanceExplosionModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  items = [],
  appTheme = 'light',
  isDark: isDarkProp,
  uniLogoUrl = DEFAULT_UNI_LOGO_URL,
  onPrintDirectly
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'estoque' | 'avulso'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | 'all'>(20);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  const isDark = isDarkProp !== undefined ? isDarkProp : appTheme === 'dark-neon';

  // Normalization helper for launch items
  const normalizedItems = useMemo(() => {
    return items.map((item, idx) => {
      const isEstoque = item.type === 'ESTOQUE' || item.type === 'estoque' || item.TIPO === 'ESTOQUE';
      const rawVal = Number(item._rawValue || item.VALORITEM || item.val || item.value || item.VALORTOTAL || 0) || 0;
      const qtd = Number(item.QUANTIDADE || item.QTD || item.qtd || 1) || 1;
      const vlrUnit = Number(item.VALORUNITARIO || item.VLRUNIT || (qtd > 0 ? rawVal / qtd : rawVal)) || 0;
      const prefix = String(item.PREFIXOVEIC || item.FROTA || item.prefix || 'N/A').trim();
      const placa = String(item.PLACA || item.placa || '-').trim();
      const nf = String(item.NRDOCTO || item.NUMERODOC || item.NUMNF || item.nro_docto || item.CODIGOMATAVULSO || '-').trim();
      const fornecedor = String(item.rsocialforn || item.RSOCIALFORN || item.fornecedor || (isEstoque ? 'Estoque Próprio (Requisição Interna)' : 'Fornecedor Externo')).trim();
      const material = String(item.DESCRICAONFSERVICO || item.DESCRICAOMAT || item.descricao || item.material_desc || 'Peça / Serviço Geral').trim();
      const dataStr = String(item.EMISSAO || item.DATA || item.datamov || item.MES_ANO || item.mesAno || '-').trim();
      const grc = String(item.DESCRICAOGRC || item.descricaogrc || item.grc || '-').trim();
      const gre = String(item.DESCRICAOGRE || item.descricaogre || item.gre || '-').trim();
      const grd = String(item.DESCRICAOGRD || item.descricaogrd || item.grd || '-').trim();

      return {
        id: item.id || `launch-${idx}`,
        isEstoque,
        type: isEstoque ? 'ESTOQUE' : 'NF AVULSO',
        rawVal,
        qtd,
        vlrUnit,
        prefix,
        placa: placa === '-' || placa === 'Sem Veic' || placa === 'SEM PLACA' ? '' : placa,
        nf,
        fornecedor,
        material,
        dataStr,
        grc,
        gre,
        grd,
        raw: item
      };
    });
  }, [items]);

  // Filtered items
  const filteredItems = useMemo(() => {
    let list = normalizedItems;

    if (typeFilter === 'estoque') {
      list = list.filter(it => it.isEstoque);
    } else if (typeFilter === 'avulso') {
      list = list.filter(it => !it.isEstoque);
    }

    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      list = list.filter(it => 
        it.prefix.toLowerCase().includes(q) ||
        it.placa.toLowerCase().includes(q) ||
        it.nf.toLowerCase().includes(q) ||
        it.fornecedor.toLowerCase().includes(q) ||
        it.material.toLowerCase().includes(q) ||
        it.grc.toLowerCase().includes(q) ||
        it.dataStr.toLowerCase().includes(q)
      );
    }

    return list;
  }, [normalizedItems, typeFilter, searchTerm]);

  // Totals calculations
  const totals = useMemo(() => {
    let totalEstoque = 0;
    let totalAvulso = 0;
    let totalCost = 0;
    const vehicleSet = new Set<string>();

    filteredItems.forEach(it => {
      if (it.isEstoque) totalEstoque += it.rawVal;
      else totalAvulso += it.rawVal;
      totalCost += it.rawVal;
      if (it.prefix && it.prefix !== 'N/A') vehicleSet.add(it.prefix);
    });

    return {
      totalEstoque,
      totalAvulso,
      totalCost,
      count: filteredItems.length,
      distinctVehicles: vehicleSet.size
    };
  }, [filteredItems]);

  // Pagination
  const totalPages = pageSize === 'all' ? 1 : Math.ceil(filteredItems.length / pageSize);
  const paginatedItems = useMemo(() => {
    if (pageSize === 'all') return filteredItems;
    const start = (currentPage - 1) * pageSize;
    return filteredItems.slice(start, start + pageSize);
  }, [filteredItems, currentPage, pageSize]);

  // Export to CSV
  const handleExportCSV = () => {
    const headers = [
      '#', 'Tipo', 'Data / Período', 'Frota', 'Placa', 'NF / Docto', 
      'Fornecedor / Razão Social', 'Peça / Material / Serviço', 
      'Qtd', 'Vlr Unitário (R$)', 'Vlr Total (R$)', 'Grupo Custo (GRC)', 'Grupo Estoque (GRE)', 'Grupo Despesa (GRD)'
    ];

    const rows = filteredItems.map((it, idx) => [
      idx + 1,
      `"${it.type}"`,
      `"${it.dataStr}"`,
      `"${it.prefix}"`,
      `"${it.placa}"`,
      `"${it.nf}"`,
      `"${it.fornecedor.replace(/"/g, '""')}"`,
      `"${it.material.replace(/"/g, '""')}"`,
      it.qtd,
      it.vlrUnit.toFixed(2),
      it.rawVal.toFixed(2),
      `"${it.grc.replace(/"/g, '""')}"`,
      `"${it.gre.replace(/"/g, '""')}"`,
      `"${it.grd.replace(/"/g, '""')}"`
    ].join(';'));

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `explosao_lancamentos_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Generate and Download PDF Report for Exploded Launches
  const handleGeneratePDF = async (action: 'save' | 'print' = 'save') => {
    setIsExportingPdf(true);
    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const now = new Date();
      const dateFormatted = now.toLocaleDateString('pt-BR', { 
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' 
      });
      const fileDate = now.toISOString().split('T')[0];
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // 1. Header Banner
      doc.setFillColor(30, 41, 59); // Slate 800
      doc.rect(0, 0, pageWidth, 24, 'F');

      // Top Accent Stripe
      doc.setFillColor(16, 185, 129); // Emerald 500
      doc.rect(0, 0, pageWidth, 2.5, 'F');

      // Embed UNI Logo
      let textStartX = 14;
      try {
        const imgData = await getBase64FromUrl(uniLogoUrl);
        if (imgData) {
          doc.setFillColor(255, 255, 255);
          doc.roundedRect(12, 5, 26, 15, 2, 2, 'F');
          doc.addImage(imgData, 'PNG', 13, 6, 24, 13, undefined, 'FAST');
          textStartX = 42;
        }
      } catch (e) {
        console.warn('Could not load UNI logo into PDF', e);
      }

      // Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(255, 255, 255);
      doc.text(`DETALHAMENTO E EXPLOSÃO DE LANÇAMENTOS — ${title.toUpperCase()}`, textStartX, 11);

      // Subtitle
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(203, 213, 225);
      doc.text(`Total Itens: ${totals.count} | Custo: R$ ${totals.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} | Emissão: ${dateFormatted}`, textStartX, 17);

      // Badge Right
      doc.setFillColor(79, 70, 229);
      doc.roundedRect(pageWidth - 58, 6, 44, 12, 2, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(255, 255, 255);
      doc.text('AUDITORIA DE MANUTENÇÃO', pageWidth - 36, 13.5, { align: 'center' });

      let currentY = 28;

      // 2. Quick KPIs Strip
      const kpis = [
        { label: 'TOTAL LANÇAMENTOS', val: String(totals.count), col: [67, 56, 202] },
        { label: 'CUSTO EM ESTOQUE', val: `R$ ${totals.totalEstoque.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, col: [5, 150, 105] },
        { label: 'CUSTO NF AVULSO', val: `R$ ${totals.totalAvulso.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, col: [217, 119, 6] },
        { label: 'CUSTO CONSOLIDADO', val: `R$ ${totals.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, col: [49, 46, 129] },
        { label: 'FROTAS ATENDIDAS', val: `${totals.distinctVehicles} frotas`, col: [124, 58, 237] }
      ];

      const kpiW = (pageWidth - 28 - (kpis.length - 1) * 3) / kpis.length;
      kpis.forEach((k, idx) => {
        const x = 14 + idx * (kpiW + 3);
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.roundedRect(x, currentY, kpiW, 11, 1.5, 1.5, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(5.5);
        doc.setTextColor(100, 116, 139);
        doc.text(k.label, x + 2.5, currentY + 3.5);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(k.col[0], k.col[1], k.col[2]);
        doc.text(k.val, x + 2.5, currentY + 8);
      });

      currentY += 14;

      // 3. Table of All Detailed Launches
      const tableHeaders = [
        ['#', 'Data', 'Tipo', 'Frota / Placa', 'NF / Doc', 'Fornecedor', 'Peça / Material / Descrição', 'Qtd', 'Vlr Unit (R$)', 'Total (R$)', 'Grupo Custo']
      ];

      const tableBody = filteredItems.map((it, idx) => [
        String(idx + 1),
        it.dataStr || '-',
        it.type,
        it.placa ? `${it.prefix} (${it.placa})` : it.prefix,
        it.nf,
        it.fornecedor.length > 25 ? it.fornecedor.substring(0, 24) + '..' : it.fornecedor,
        it.material.length > 35 ? it.material.substring(0, 34) + '..' : it.material,
        String(it.qtd),
        it.vlrUnit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        it.rawVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        it.grc.length > 18 ? it.grc.substring(0, 17) + '..' : it.grc
      ]);

      // Totals Row
      tableBody.push([
        'TOTAL',
        '-',
        `${totals.count} itens`,
        `${totals.distinctVehicles} frotas`,
        '-',
        '-',
        'SOMATÓRIO CONSOLIDADO',
        '-',
        '-',
        totals.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
        '-'
      ]);

      autoTable(doc, {
        head: tableHeaders,
        body: tableBody,
        startY: currentY,
        margin: { left: 14, right: 14, top: 14, bottom: 16 },
        styles: {
          font: 'helvetica',
          fontSize: 7,
          cellPadding: 1.8,
          overflow: 'linebreak',
          textColor: [30, 41, 59]
        },
        headStyles: {
          fillColor: [30, 41, 59],
          textColor: [255, 255, 255],
          fontStyle: 'bold',
          fontSize: 7.5,
          halign: 'left'
        },
        columnStyles: {
          0: { cellWidth: 8, halign: 'center' },
          1: { cellWidth: 18 },
          2: { cellWidth: 18, fontStyle: 'bold' },
          3: { cellWidth: 26, fontStyle: 'bold' },
          4: { cellWidth: 20 },
          5: { cellWidth: 42 },
          6: { cellWidth: 'auto' },
          7: { cellWidth: 10, halign: 'center' },
          8: { cellWidth: 20, halign: 'right' },
          9: { cellWidth: 22, halign: 'right', fontStyle: 'bold', textColor: [67, 56, 202] },
          10: { cellWidth: 26 }
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        didParseCell: (data) => {
          if (data.row.index === tableBody.length - 1) {
            data.cell.styles.fillColor = [224, 231, 255];
            data.cell.styles.fontStyle = 'bold';
            data.cell.styles.textColor = [30, 27, 75];
          }
          if (data.section === 'body' && data.column.index === 2) {
            const val = String(data.cell.raw);
            if (val === 'ESTOQUE') {
              data.cell.styles.textColor = [5, 150, 105];
            } else if (val === 'NF AVULSO') {
              data.cell.styles.textColor = [217, 119, 6];
            }
          }
        },
        didDrawPage: (data) => {
          const pageCount = (doc as any).internal.getNumberOfPages();
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(7);
          doc.setTextColor(148, 163, 184);
          doc.text(
            `Sistema UNI • Gestão de Frotas • Explosão de Lançamentos de Manutenção • Página ${data.pageNumber} de ${pageCount}`,
            pageWidth / 2,
            pageHeight - 6,
            { align: 'center' }
          );
        }
      });

      if (action === 'print') {
        const blobUrl = doc.output('bloburl');
        const printWindow = window.open(blobUrl, '_blank');
        if (printWindow) {
          printWindow.focus();
        } else {
          doc.save(`Explosao_Lancamentos_${fileDate}.pdf`);
        }
      } else {
        doc.save(`Explosao_Lancamentos_${fileDate}.pdf`);
      }
    } catch (e) {
      console.error('Erro ao gerar PDF da explosão:', e);
      alert('Ocorreu um erro ao gerar o PDF dos lançamentos.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          className={`w-full max-w-7xl max-h-[92vh] flex flex-col rounded-3xl border shadow-2xl overflow-hidden ${
            isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-200 text-slate-900'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-4 p-5 sm:p-6 border-b border-slate-100 bg-slate-50/50 shrink-0">
            <div className="flex items-center gap-3.5">
              <div className="p-3 bg-gradient-to-br from-indigo-500 to-indigo-700 text-white rounded-2xl shadow-md shadow-indigo-500/20 shrink-0">
                <Layers size={22} />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="text-base sm:text-lg font-black tracking-tight">
                    Explosão de Lançamentos — {title}
                  </h3>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                    {filteredItems.length} Registros
                  </span>
                </div>
                <p className="text-xs text-slate-500 font-medium mt-0.5">
                  {subtitle || 'Visualização analítica de cada item de estoque e nota fiscal avulsa no sistema'}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-200/60 transition-all cursor-pointer"
            >
              <X size={20} />
            </button>
          </div>

          {/* KPI Summary Cards Strip */}
          <div className="p-5 sm:p-6 pb-2 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3 shrink-0">
            <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-slate-800/40 border-slate-700/60' : 'bg-slate-50 border-slate-100'}`}>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                Lançamentos
              </span>
              <div className="text-base font-black text-slate-800">
                {totals.count} registros
              </div>
              <span className="text-[10px] text-slate-500 font-medium">{totals.distinctVehicles} frotas ativas</span>
            </div>

            <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-slate-800/40 border-slate-700/60' : 'bg-emerald-50/50 border-emerald-100'}`}>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 block mb-1">
                Estoque Próprio
              </span>
              <div className="text-base font-black text-emerald-700">
                R$ {totals.totalEstoque.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] text-emerald-600/80 font-medium">Requisições Almoxarifado</span>
            </div>

            <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-slate-800/40 border-slate-700/60' : 'bg-amber-50/50 border-amber-100'}`}>
              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 block mb-1">
                NF Avulso
              </span>
              <div className="text-base font-black text-amber-700">
                R$ {totals.totalAvulso.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] text-amber-600/80 font-medium">Serviços e Peças de Terceiros</span>
            </div>

            <div className={`p-3.5 rounded-2xl border ${isDark ? 'bg-slate-800/40 border-slate-700/60' : 'bg-indigo-50/50 border-indigo-100'} sm:col-span-1 col-span-2`}>
              <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 block mb-1">
                Custo Total Geral
              </span>
              <div className="text-base sm:text-lg font-black text-indigo-700">
                R$ {totals.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <span className="text-[10px] text-indigo-600/80 font-medium">100% dos lançamentos filtrados</span>
            </div>

            <div className="hidden lg:flex items-center justify-end gap-2">
              <button
                onClick={handleExportCSV}
                className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 cursor-pointer"
                title="Exportar CSV com todos os lançamentos"
              >
                <Download size={14} />
                <span>CSV</span>
              </button>

              <button
                onClick={() => handleGeneratePDF('save')}
                disabled={isExportingPdf}
                className="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm shadow-indigo-600/20 cursor-pointer disabled:opacity-50"
                title="Salvar PDF dos Lançamentos com Logo UNI"
              >
                {isExportingPdf ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
                <span>PDF</span>
              </button>
            </div>
          </div>

          {/* Search & Filter Controls */}
          <div className="px-5 sm:px-6 py-3 flex items-center justify-between gap-3 flex-wrap border-b border-slate-100 shrink-0">
            <div className="relative flex-1 min-w-[220px]">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                placeholder="Filtrar por Frota, Placa, NF, Fornecedor, Peça, Data..."
                className={`w-full pl-9 pr-4 py-2 rounded-xl text-xs font-medium border outline-hidden transition-all ${
                  isDark 
                    ? 'bg-slate-800 border-slate-700 text-white focus:border-indigo-500' 
                    : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-600 focus:bg-white'
                }`}
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200/80">
                <button
                  onClick={() => {
                    setTypeFilter('all');
                    setCurrentPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    typeFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Todos ({normalizedItems.length})
                </button>
                <button
                  onClick={() => {
                    setTypeFilter('estoque');
                    setCurrentPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    typeFilter === 'estoque' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Estoque
                </button>
                <button
                  onClick={() => {
                    setTypeFilter('avulso');
                    setCurrentPage(1);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    typeFilter === 'avulso' ? 'bg-amber-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  NF Avulso
                </button>
              </div>

              <div className="flex items-center gap-1">
                <select
                  value={pageSize}
                  onChange={(e) => {
                    setPageSize(e.target.value === 'all' ? 'all' : Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="px-2.5 py-1.5 bg-slate-100 rounded-xl text-xs font-bold border border-slate-200 text-slate-700 outline-hidden cursor-pointer"
                >
                  <option value={15}>15 itens</option>
                  <option value={25}>25 itens</option>
                  <option value={50}>50 itens</option>
                  <option value="all">Ver Todos</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="flex-1 overflow-y-auto overflow-x-auto px-5 sm:px-6 pb-5 sm:pb-6 custom-scrollbar">
            <div className="h-2 shrink-0"></div>
            <table className="w-full text-left border-separate border-spacing-0">
              <thead className="text-[10px] font-black uppercase tracking-wider text-slate-500">
                <tr>
                  <th className={`sticky top-0 z-20 py-2.5 px-3 text-center w-10 border-b ${isDark ? 'bg-slate-900/95 border-slate-700/60' : 'bg-slate-100/95 border-slate-200'} backdrop-blur-md`}>#</th>
                  <th className={`sticky top-0 z-20 py-2.5 px-3 border-b ${isDark ? 'bg-slate-900/95 border-slate-700/60' : 'bg-slate-100/95 border-slate-200'} backdrop-blur-md`}>Data / Mês</th>
                  <th className={`sticky top-0 z-20 py-2.5 px-3 border-b ${isDark ? 'bg-slate-900/95 border-slate-700/60' : 'bg-slate-100/95 border-slate-200'} backdrop-blur-md`}>Tipo</th>
                  <th className={`sticky top-0 z-20 py-2.5 px-3 border-b ${isDark ? 'bg-slate-900/95 border-slate-700/60' : 'bg-slate-100/95 border-slate-200'} backdrop-blur-md`}>Frota / Placa</th>
                  <th className={`sticky top-0 z-20 py-2.5 px-3 border-b ${isDark ? 'bg-slate-900/95 border-slate-700/60' : 'bg-slate-100/95 border-slate-200'} backdrop-blur-md`}>NF / Doc</th>
                  <th className={`sticky top-0 z-20 py-2.5 px-3 border-b ${isDark ? 'bg-slate-900/95 border-slate-700/60' : 'bg-slate-100/95 border-slate-200'} backdrop-blur-md`}>Fornecedor</th>
                  <th className={`sticky top-0 z-20 py-2.5 px-3 border-b ${isDark ? 'bg-slate-900/95 border-slate-700/60' : 'bg-slate-100/95 border-slate-200'} backdrop-blur-md`}>Peça / Material / Descrição</th>
                  <th className={`sticky top-0 z-20 py-2.5 px-3 text-center border-b ${isDark ? 'bg-slate-900/95 border-slate-700/60' : 'bg-slate-100/95 border-slate-200'} backdrop-blur-md`}>Qtd</th>
                  <th className={`sticky top-0 z-20 py-2.5 px-3 text-right border-b ${isDark ? 'bg-slate-900/95 border-slate-700/60' : 'bg-slate-100/95 border-slate-200'} backdrop-blur-md`}>Vlr Unit. (R$)</th>
                  <th className={`sticky top-0 z-20 py-2.5 px-3 text-right border-b ${isDark ? 'bg-slate-900/95 border-slate-700/60' : 'bg-slate-100/95 border-slate-200'} backdrop-blur-md`}>Total (R$)</th>
                  <th className={`sticky top-0 z-20 py-2.5 px-3 border-b ${isDark ? 'bg-slate-900/95 border-slate-700/60' : 'bg-slate-100/95 border-slate-200'} backdrop-blur-md`}>Grupo Custo</th>
                </tr>
              </thead>
              <tbody className={`divide-y ${isDark ? 'divide-slate-800/60' : 'divide-slate-100'} text-xs`}>
                {paginatedItems.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-slate-400">
                      Nenhum lançamento encontrado para os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  paginatedItems.map((it, idx) => {
                    const rowIdx = pageSize === 'all' ? idx + 1 : (currentPage - 1) * pageSize + idx + 1;
                    return (
                      <tr 
                        key={it.id} 
                        className={`hover:bg-indigo-50/40 transition-colors ${
                          idx % 2 === 1 ? 'bg-slate-50/40' : 'bg-white'
                        }`}
                      >
                        <td className="py-2.5 px-3 text-center font-mono text-[11px] text-slate-400">
                          {rowIdx}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-600 whitespace-nowrap">
                          {it.dataStr}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {it.isEstoque ? (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md text-[10px] font-extrabold uppercase">
                              Estoque
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded-md text-[10px] font-extrabold uppercase">
                              NF Avulso
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap font-bold text-slate-800">
                          <span className="font-extrabold text-indigo-900">{it.prefix}</span>
                          {it.placa && (
                            <span className="text-[10px] text-slate-400 font-mono ml-1">({it.placa})</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                          {it.nf}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 max-w-[200px] truncate" title={it.fornecedor}>
                          {it.fornecedor}
                        </td>
                        <td className="py-2.5 px-3 text-slate-800 font-medium max-w-[260px] truncate" title={it.material}>
                          {it.material}
                        </td>
                        <td className="py-2.5 px-3 text-center font-mono text-slate-600">
                          {it.qtd}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-slate-600 whitespace-nowrap">
                          {it.vlrUnit > 0 ? it.vlrUnit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-indigo-700 whitespace-nowrap">
                          R$ {it.rawVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3 text-[11px] text-slate-500 truncate max-w-[140px]" title={it.grc}>
                          {it.grc}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Footer / Pagination & Actions */}
          <div className="p-4 sm:p-5 border-t border-slate-100 bg-slate-50 flex items-center justify-between flex-wrap gap-3 shrink-0">
            <div className="text-xs font-medium text-slate-500">
              Exibindo {paginatedItems.length} de {filteredItems.length} registros ({totals.count} lançamentos no total)
            </div>

            <div className="flex items-center gap-3">
              {totalPages > 1 && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="text-xs font-bold text-slate-700 px-2">
                    {currentPage} / {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none cursor-pointer"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleGeneratePDF('print')}
                  disabled={isExportingPdf}
                  className="px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <Printer size={13} />
                  <span>Imprimir</span>
                </button>

                <button
                  onClick={() => handleGeneratePDF('save')}
                  disabled={isExportingPdf}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-md shadow-indigo-600/20 cursor-pointer disabled:opacity-50"
                >
                  {isExportingPdf ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                  <span>Salvar PDF</span>
                </button>

                <button
                  onClick={onClose}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
