import React, { useState, useMemo } from 'react';
import { 
  Sparkles, 
  TrendingDown, 
  TrendingUp, 
  Calculator, 
  FileDown, 
  Trash2, 
  CheckCircle, 
  RefreshCw, 
  Info,
  Calendar,
  Layers,
  Activity,
  Award,
  Maximize2
} from 'lucide-react';
import Markdown from 'react-markdown';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { VehicleExplosionModal, VehicleExplosionData } from './VehicleExplosionModal';

interface JustificationsTabProps {
  consolidatedReportData: any[];
  mergedData: any[];
  periodoLabel: string;
  companyName: string;
  erpSystem: string;
  reportLogo: string;
  getLinkedFuelings: (placa: string) => any[];
  getLinkedKms: (placa: string) => any[];
}

export default function JustificationsTab({
  consolidatedReportData,
  mergedData,
  periodoLabel,
  companyName,
  erpSystem,
  reportLogo,
  getLinkedFuelings,
  getLinkedKms
}: JustificationsTabProps) {
  // Persistence cache for justifications
  const [justifications, setJustifications] = useState<{ [key: string]: string }>(() => {
    try {
      const saved = localStorage.getItem('fleet_ia_justifications');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Editable limits for minimum and maximum average consumption
  const [minKml, setMinKml] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('fleet_ia_min_kml');
      return saved ? parseFloat(saved) : 2.80;
    } catch {
      return 2.80;
    }
  });

  const [maxKml, setMaxKml] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('fleet_ia_max_kml');
      return saved ? parseFloat(saved) : 4.50;
    } catch {
      return 4.50;
    }
  });

  const [selectedExplosionVehicle, setSelectedExplosionVehicle] = useState<VehicleExplosionData | null>(null);

  // Filter local outliers
  const outlierVehicles = useMemo(() => {
    return consolidatedReportData.filter(v => {
      const kmlVal = v.kml || 0;
      return kmlVal > 0 && (kmlVal < minKml || kmlVal > maxKml);
    });
  }, [consolidatedReportData, minKml, maxKml]);

  // Statistics
  const stats = useMemo(() => {
    let lowCount = 0;
    let highCount = 0;
    outlierVehicles.forEach(v => {
      if (v.kml < minKml) lowCount++;
      else if (v.kml > maxKml) highCount++;
    });
    return { lowCount, highCount, totalCount: outlierVehicles.length };
  }, [outlierVehicles, minKml, maxKml]);

  // Date Formatter
  const formatDate = (dateStr: string) => {
    if (!dateStr) return '-';
    // If we have ISO / Timestamp/ Date string
    if (dateStr.includes('-')) {
      const cleanDate = dateStr.split('T')[0];
      const parts = cleanDate.split('-');
      if (parts[0] && parts[0].length === 4) {
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
      }
    }
    return dateStr;
  };

  // Group daily entries for anomalous vehicles based on those atrelados à média
  const vehicleRecords = useMemo(() => {
    const map = new Map<string, { fuelRecords: any[]; kmRecords: any[] }>();

    outlierVehicles.forEach(v => {
      const pNorm = String(v.placa || v.PLACA || '').trim().toUpperCase();
      
      const fuels = getLinkedFuelings ? getLinkedFuelings(v.placa) : [];
      const kms = getLinkedKms ? getLinkedKms(v.placa) : [];

      const sortedFuels = [...fuels].sort((a, b) => {
        const da = a.parsedDate ? new Date(a.parsedDate).getTime() : (a.DATA ? new Date(a.DATA).getTime() : 0);
        const db = b.parsedDate ? new Date(b.parsedDate).getTime() : (b.DATA ? new Date(b.DATA).getTime() : 0);
        return da - db;
      });

      const sortedKms = [...kms].sort((a, b) => {
        const da = a.parsedDate ? new Date(a.parsedDate).getTime() : (a.DATA ? new Date(a.DATA).getTime() : 0);
        const db = b.parsedDate ? new Date(b.parsedDate).getTime() : (b.DATA ? new Date(b.DATA).getTime() : 0);
        return da - db;
      });

      map.set(pNorm, { fuelRecords: sortedFuels, kmRecords: sortedKms });
    });

    return map;
  }, [outlierVehicles, getLinkedFuelings, getLinkedKms]);

  // Handle single vehicle Manual justification update
  const handleUpdateJustification = (placa: string, text: string) => {
    setJustifications(prev => {
      const next = { ...prev, [placa]: text };
      localStorage.setItem('fleet_ia_justifications', JSON.stringify(next));
      return next;
    });
  };

  // Clear cache
  const handleClearCache = () => {
    if (confirm('Tem certeza de que deseja limpar todas as justificativas salvas localmente?')) {
      setJustifications({});
      localStorage.removeItem('fleet_ia_justifications');
    }
  };

  const getBase64FromUrl = async (url: string): Promise<string> => {
    try {
      const data = await fetch(url);
      const blob = await data.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(blob);
      });
    } catch (err) {
      console.error('Base64 fetch error for logo:', err);
      return '';
    }
  };

  const getFullUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `${window.location.origin}${url.startsWith('/') ? '' : '/'}${url}`;
  };

  // PDF Export
  const handleExportPDF = async () => {
    const doc = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4'
    });

    const dateStr = new Date().toLocaleString('pt-BR');

    // Header Background
    doc.setFillColor(248, 250, 252); // slate-50
    doc.rect(0, 0, 210, 60, 'F');

    // Emerald side marker
    doc.setFillColor(16, 185, 129); // emerald-500
    doc.rect(0, 0, 4, 60, 'F');

    // Logo
    try {
      if (reportLogo) {
        const logo64 = await getBase64FromUrl(getFullUrl(reportLogo));
        if (logo64) {
          doc.addImage(logo64, 'PNG', 12, 10, 20, 10);
        }
      }
    } catch (e) {
      console.error('Logo render error on justification PDF:', e);
    }

    // Title Section
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text('Relatório Integrado de Justificativas de Consumo', 38, 17);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(`${companyName} • Gerado com IA em ${dateStr} • ERP: ${erpSystem}`, 38, 23);

    // Period info
    doc.setFillColor(241, 245, 249); // slate-100
    doc.roundedRect(12, 29, 186, 10, 2, 2, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('COMPETÊNCIA/PERÍODO SELECIONADO:', 16, 35);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text(periodoLabel.toUpperCase(), 75, 35);

    // Table of Outliers Summary
    const tableHeader = [
      ['Prefixo/Frota', 'Placa', 'KM Lançado', 'Litragem', 'Média KM/L', 'Status Anomalia']
    ];

    const tableRows = outlierVehicles.map(v => {
      const typeStr = v.kml < minKml ? `Média Baixa (<${minKml.toFixed(2)})` : `Média Alta (>${maxKml.toFixed(2)})`;
      const isAdj = v.isOverlapAdjusted;
      return [
        isAdj ? `${v.frota || '-'} (Ajustado)` : (v.frota || '-'),
        v.placa || '-',
        (v.kmProdutivo || 0).toLocaleString('pt-BR') + ' km',
        (v.litros || 0).toLocaleString('pt-BR') + ' L',
        (v.kml || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' km/L',
        typeStr
      ];
    });

    // Subtitle
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(15, 23, 42);
    doc.text('Quadro Resumo de Veículos Fora da Média Ideal', 12, 49);

    autoTable(doc, {
      head: tableHeader,
      body: tableRows,
      startY: 53,
      theme: 'striped',
      headStyles: { 
        fillColor: [15, 23, 42], 
        textColor: [255, 255, 255], 
        fontSize: 8, 
        fontStyle: 'bold',
        cellPadding: 2.5
      },
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: {
        5: { fontStyle: 'bold', textColor: [185, 28, 28] } // highlight status column
      }
    });

    // Detail page/sections for each vehicle justification
    let currentY = (doc as any).lastAutoTable.finalY + 10;

    outlierVehicles.forEach((v) => {
      const p = v.placa || v.PLACA || '';
      const pNorm = String(p).trim().toUpperCase();
      const recs = vehicleRecords.get(pNorm) || { fuelRecords: [], kmRecords: [] };

      // Add a page break if needed for elegant spacing
      if (currentY > 210) {
        doc.addPage();
        currentY = 20;
      }

      // Draw vehicle row header banner
      const isAdj = v.isOverlapAdjusted;
      if (isAdj) {
        doc.setFillColor(254, 243, 199); // amber-100 (warm yellow-orange accent)
      } else {
        doc.setFillColor(241, 245, 249); // slate-100
      }
      doc.rect(12, currentY, 186, 10, 'F');
      
      const sideColor = isAdj
        ? [217, 119, 6] // amber-600
        : (v.kml < minKml ? [220, 38, 38] : [79, 70, 229]); // red-600 or indigo-600
      doc.setFillColor(sideColor[0], sideColor[1], sideColor[2]);
      doc.rect(12, currentY, 3, 10, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(15, 23, 42);
      
      const rangeText = `FROTA ${v.frota || '-'}${isAdj ? ' (AJUSTADA)' : ''} - PLACA ${v.placa} | Cálculo total: ${v.kmProdutivo.toLocaleString('pt-BR')} km / ${v.litros.toLocaleString('pt-BR')} L = ${v.kml.toFixed(2)} km/L`;
      doc.text(rangeText, 18, currentY + 6.5);

      currentY += 14;

      if (isAdj) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7.5);
        doc.setTextColor(180, 83, 9); // amber-700
        doc.text('* Nota: Valores recalculados e atrelados considerando abastecimentos complementares de competência ajustada.', 15, currentY - 1);
        currentY += 4;
      }

      currentY += 2;

      // Draw Fuel tables for this vehicle
      if (recs.fuelRecords.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(51, 65, 85);
        doc.text('LANÇAMENTOS DE ABASTECIMENTOS (COMBUSTÍVEL):', 12, currentY - 2);

        autoTable(doc, {
          head: [['Data', 'Litragem Lançada', 'Valor', 'Cartão']],
          body: recs.fuelRecords.map(f => [
            formatDate(f.DATA),
            (f.LITROS || 0).toLocaleString('pt-BR') + ' L',
            (f.VALOR || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
            f.CARTAO || '-'
          ]),
          startY: currentY,
          margin: { left: 12, right: 12 },
          theme: 'grid',
          headStyles: { fillColor: [51, 65, 85], fontSize: 7.5, cellPadding: 1.5 },
          styles: { fontSize: 7.5, cellPadding: 1.5 },
        });
        currentY = (doc as any).lastAutoTable.finalY + 8;
      } else {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.text('* Nenhum abastecimento de combustível registrado neste período.', 15, currentY);
        currentY += 6;
      }

      if (currentY > 240) {
        doc.addPage();
        currentY = 20;
      }

      // Draw KM tables for this vehicle
      if (recs.kmRecords.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(51, 65, 85);
        doc.text('LANÇAMENTOS DE ODÔMETRO (MOVIMENTAÇÃO KM):', 12, currentY - 2);

        autoTable(doc, {
          head: [['Data', 'KM Inicial', 'KM Final', 'KM Total', 'KM Produtivo', 'Operação / Linha']],
          body: recs.kmRecords.map(k => [
            formatDate(k.DATA),
            (k.KM_INICIAL || 0).toLocaleString('pt-BR'),
            (k.KM_FINAL || 0).toLocaleString('pt-BR'),
            (k.KM_TOTAL || 0).toLocaleString('pt-BR'),
            (k.KM_PRODUTIVO || 0).toLocaleString('pt-BR'),
            k.OPERACAO || '-'
          ]),
          startY: currentY,
          margin: { left: 12, right: 12 },
          theme: 'grid',
          headStyles: { fillColor: [51, 65, 85], fontSize: 7.5, cellPadding: 1.5 },
          styles: { fontSize: 7.5, cellPadding: 1.5 },
        });
        currentY = (doc as any).lastAutoTable.finalY + 8;
      } else {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(8);
        doc.text('* Nenhum registro de odômetro (KM) localizado neste período.', 15, currentY);
        currentY += 6;
      }

      if (currentY > 210) {
        doc.addPage();
        currentY = 20;
      }

      // Draw manual justification header
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(16, 185, 129); // Emerald
      doc.text('PARECER TÉCNICO E JUSTIFICATIVA DE CONSUMO:', 12, currentY);
      currentY += 4;

      const justificationText = justifications[p] || '*Nenhuma justificativa técnica inserida.*';

      // Clean justification markdown blocks to put in PDF nicely
      const cleanText = justificationText
        .replace(/###/g, '')
        .replace(/\*\*/g, '')
        .trim();

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(51, 65, 85); // slate-700

      const splitLines = doc.splitTextToSize(cleanText, 186);
      
      // Check height before printing lines
      const estimatedHeight = splitLines.length * 3.8;
      if (currentY + estimatedHeight > 280) {
        doc.addPage();
        currentY = 20;
      }

      doc.text(splitLines, 12, currentY);
      currentY += estimatedHeight + 15;
    });

    // Add Page number & Disclaimer footer directly on each page
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text(`* Este relatório consolida odômetro e cálculos físicos computados no banco de dados corporativo, com justificativas manuais inseridas pelo gestor de frotas.`, 12, 288);
      
      doc.setFont('helvetica', 'normal');
      doc.text(`Pág. ${i} de ${totalPages}`, 190, 288);
    }

    doc.save(`Justificativas_Consumo_${periodoLabel.replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <div className="space-y-6">
      {/* Alert Banner / Header */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-emerald-50 text-emerald-600 rounded-md">
              <Award className="w-5 h-5" />
            </span>
            <h3 className="text-xl font-bold text-slate-900">Justificativas de Consumo</h3>
          </div>
          <p className="text-sm text-slate-500">
            Frotas com rendimento fora dos parâmetros normais (<strong className="text-amber-600">Média &lt; {minKml.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} km/L</strong> ou <strong className="text-indigo-600">Média &gt; {maxKml.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} km/L</strong>). O sistema permite o detalhamento técnico e a inserção manual de justificativas e pareceres por veículo.
          </p>
          
          <div className="flex flex-wrap items-center gap-4 bg-slate-50/70 border border-slate-100 p-2.5 rounded-xl max-w-fit shadow-3xs">
            <div className="flex items-center gap-2">
              <label className="text-[11px] font-extrabold text-slate-500 font-sans tracking-wide uppercase" htmlFor="min-kml-input">Média Mínima:</label>
              <input
                id="min-kml-input"
                type="number"
                step="0.1"
                min="0"
                max="10"
                value={minKml}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val)) {
                    setMinKml(val);
                    localStorage.setItem('fleet_ia_min_kml', String(val));
                  }
                }}
                className="w-16 px-2 py-1 bg-white text-slate-850 lg:hover:border-slate-350 border border-slate-200 rounded-lg text-xs font-extrabold text-center focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 font-mono shadow-3xs"
              />
              <span className="text-[10px] text-slate-400 font-bold uppercase font-mono">km/L</span>
            </div>
            
            <div className="h-4 w-px bg-slate-200 hidden sm:block" />
            
            <div className="flex items-center gap-2">
              <label className="text-[11px] font-extrabold text-slate-500 font-sans tracking-wide uppercase" htmlFor="max-kml-input">Média Máxima:</label>
              <input
                id="max-kml-input"
                type="number"
                step="0.1"
                min="0"
                max="20"
                value={maxKml}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val)) {
                    setMaxKml(val);
                    localStorage.setItem('fleet_ia_max_kml', String(val));
                  }
                }}
                className="w-16 px-2 py-1 bg-white text-slate-850 lg:hover:border-slate-350 border border-slate-200 rounded-lg text-xs font-extrabold text-center focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 font-mono shadow-3xs"
              />
              <span className="text-[10px] text-slate-400 font-bold uppercase font-mono">km/L</span>
            </div>
          </div>
        </div>

        {/* Global Toolbar buttons */}
        <div className="flex flex-wrap items-center gap-2 self-start xl:self-center">
          {outlierVehicles.length > 0 && (
            <button
              onClick={handleExportPDF}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg transition-all cursor-pointer shadow-xs"
            >
              <FileDown size={14} />
              Exportar em PDF
            </button>
          )}

          {Object.keys(justifications).length > 0 && (
            <button
              onClick={handleClearCache}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-red-50 text-slate-600 hover:text-red-600 border border-slate-100 rounded-lg transition-all text-xs font-medium"
              title="Limpar justificativas cacheadas localmente"
            >
              <Trash2 size={14} />
              Limpar Cache
            </button>
          )}
        </div>
      </div>

      {/* Outlier Metrics Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-100 flex items-center gap-3">
          <div className="p-2 bg-rose-50 text-rose-600 rounded-lg">
            <TrendingDown className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium font-mono">RENDIMENTO SOB SUSPEITA</p>
            <p className="text-lg font-bold text-slate-850">{stats.lowCount} frotas &lt; {minKml.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} km/L</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-100 flex items-center gap-3">
          <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium font-mono">RENDIMENTO ANÔMALO ALTO</p>
            <p className="text-lg font-bold text-slate-850">{stats.highCount} frotas &gt; {maxKml.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} km/L</p>
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-100 flex items-center gap-3">
          <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg">
            <Sparkles className="w-6 h-6" />
          </div>
          <div>
            <p className="text-xs text-slate-400 font-medium font-mono">IA JUSTIFICADAS</p>
            <p className="text-lg font-bold text-slate-850">
              {Object.keys(justifications).filter(k => outlierVehicles.some(v => v.placa === k)).length} de {stats.totalCount} geradas
            </p>
          </div>
        </div>
      </div>

      {/* Empty State */}
      {outlierVehicles.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-100 shadow-sm max-w-lg mx-auto">
          <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
          <h4 className="text-base font-bold text-slate-850">Tudo em Conformidade!</h4>
          <p className="text-xs text-slate-400 mt-2">
            Nenhuma frota obteve rendimento anormal no período selecionado. Todos os veículos avaliados operaram no patamar ideal (entre {minKml.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} km/L e {maxKml.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} km/L).
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between px-2 text-slate-400 text-xs font-medium uppercase tracking-wider font-mono">
            <span>Frotas sob avaliação ({outlierVehicles.length})</span>
            <span className="flex items-center gap-1"><Calendar size={13}/> {periodoLabel}</span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {outlierVehicles.map(vehicle => {
              const placa = vehicle.placa || vehicle.PLACA || '';
              const pNorm = String(placa).trim().toUpperCase();
              const isLow = vehicle.kml < minKml;
              const recs = vehicleRecords.get(pNorm) || { fuelRecords: [], kmRecords: [] };

              return (
                <div 
                  key={placa} 
                  id={`justification-card-${placa}`}
                  className="bg-white rounded-2xl border border-slate-100 hover:border-slate-200 shadow-sm overflow-hidden transition-all duration-200"
                >
                  <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-50 bg-slate-50/30">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-sm font-semibold select-all px-2.5 py-1 rounded-md font-mono transition-all border ${
                          vehicle.isOverlapAdjusted
                            ? 'bg-amber-100 text-amber-900 border-amber-300 shadow-xs'
                            : 'bg-slate-100 text-slate-900 border-slate-200'
                        }`}>
                          FROTA {vehicle.frota || '-'}{vehicle.isOverlapAdjusted ? ' (Ajustado)' : ''}
                        </span>
                        {vehicle.isOverlapAdjusted && (
                          <span className="text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-0.5 rounded-full select-none shadow-3xs animate-pulse">
                            Ajuste de Competência Ativo
                          </span>
                        )}
                        <span className="text-xs text-slate-400 font-mono tracking-wider bg-slate-50 border border-slate-100 px-2 py-0.5 rounded-md">
                          Placa: {placa}
                        </span>

                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          isLow 
                            ? 'bg-amber-50 text-amber-700' 
                            : 'bg-indigo-50 text-indigo-700'
                        }`}>
                          {isLow ? <TrendingDown size={12}/> : <TrendingUp size={12}/>}
                          {isLow ? `Média Baixa: ${vehicle.kml.toFixed(2)} KM/L` : `Média Alta: ${vehicle.kml.toFixed(2)} KM/L`}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-xs text-slate-500 mt-1">
                        <div className="flex items-center gap-1.5">
                          <Calculator size={13} className="text-slate-400" />
                          <span className="font-medium text-slate-600">KM Produtivo Lançado:</span> 
                          <span className="font-semibold font-mono text-slate-900">{(vehicle.kmProdutivo || 0).toLocaleString('pt-BR')} km</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-300">|</span>
                          <span className="font-medium text-slate-600">Combustível Lançado:</span>
                          <span className="font-semibold font-mono text-slate-900">{(vehicle.litros || 0).toLocaleString('pt-BR')} L</span>
                        </div>
                      </div>
                    </div>

                    {/* Button to explode data */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setSelectedExplosionVehicle({
                          frota: vehicle.frota || '-',
                          placa: placa,
                          motorista: vehicle.motorista,
                          operacao: vehicle.operacao,
                          km: vehicle.kmProdutivo || vehicle.km || 0,
                          litros: vehicle.litros || 0,
                          media: vehicle.kml || 0,
                          desvioPercent: minKml > 0 ? ((vehicle.kml - minKml) / minKml) * 100 : 0,
                          litrosExcedentes: vehicle.kml < minKml && vehicle.kml > 0 ? ((vehicle.kmProdutivo || vehicle.km || 0) / vehicle.kml) - ((vehicle.kmProdutivo || vehicle.km || 0) / minKml) : 0,
                          isBelow: vehicle.kml < minKml
                        })}
                        className="px-3 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white border border-indigo-200 hover:border-indigo-600 transition-all text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95"
                        title={`Explodir dados detalhados da Frota ${vehicle.frota || '-'} (${placa})`}
                      >
                        <Maximize2 size={13} />
                        <span>Explodir Dados</span>
                      </button>
                    </div>
                  </div>

                  <div className="p-5 space-y-6">
                    {/* Calculations container */}
                    <div className="bg-slate-50/60 rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 border border-slate-100 shadow-xs">
                      <div className="flex items-center gap-3">
                        <span className="p-1 px-2.5 bg-white text-slate-600 border border-slate-150 rounded-lg font-mono text-xs font-semibold shadow-xs">
                          Cálculo Físico Aplicado
                        </span>
                        <div className="text-xs font-medium text-slate-500 flex flex-wrap items-center gap-1.5">
                          <span className="font-mono text-slate-800 font-semibold text-xs bg-slate-100 px-1.5 py-0.5 rounded">{(vehicle.kmProdutivo || 0).toLocaleString('pt-BR')} km</span>
                          <span className="text-slate-400">/</span>
                          <span className="font-mono text-slate-800 font-semibold text-xs bg-slate-100 px-1.5 py-0.5 rounded">{(vehicle.litros || 0).toLocaleString('pt-BR')} L</span>
                          <span className="text-slate-400">=</span>
                          <strong className="font-bold font-mono text-emerald-600 text-sm bg-emerald-50/50 px-2 py-0.5 rounded border border-emerald-100/50">{vehicle.kml.toFixed(2)} KM/L</strong>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 text-xs text-slate-400">
                        <Info size={13} className="text-slate-400" />
                        <span>Parâmetro Ideal: {minKml.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} km/L até {maxKml.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} km/L</span>
                      </div>
                    </div>

                    {/* NEW DETAILED LAYOUT: All fuel and distance postings */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Fuelings Grid Card */}
                      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
                        <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                          <div className="flex items-center gap-1.5">
                            <span className="p-1 bg-amber-50 text-amber-600 rounded">
                              <Layers size={14} />
                            </span>
                            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Histórico de Abastecimentos</span>
                          </div>
                          <span className="text-[10px] bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded-full font-mono">
                            {recs.fuelRecords.length} lançamentos
                          </span>
                        </div>

                        {recs.fuelRecords.length === 0 ? (
                          <div className="py-8 text-center text-slate-400 italic text-xs">
                            Sem lançamentos de combustível para o período.
                          </div>
                        ) : (
                          <div className="overflow-x-auto max-h-[220px] overflow-y-auto pr-1">
                            <table className="w-full text-left text-xs">
                              <thead className="sticky top-0 bg-white">
                                <tr className="border-b border-slate-200 text-slate-400 font-medium">
                                  <th className="py-1.5 font-mono">Data</th>
                                  <th className="py-1.5 text-right font-mono">Litros</th>
                                  <th className="py-1.5 text-right font-mono">Valor</th>
                                  <th className="py-1.5 text-right font-mono">Cartão</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 text-slate-600">
                                {recs.fuelRecords.map((f, i) => (
                                  <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="py-2 font-mono text-slate-500">{formatDate(f.DATA)}</td>
                                    <td className="py-2 text-right font-mono font-bold text-slate-800">{f.LITROS.toLocaleString('pt-BR')} L</td>
                                    <td className="py-2 text-right font-mono text-slate-500">{f.VALOR.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</td>
                                    <td className="py-2 text-right font-mono text-slate-400">{f.CARTAO || '-'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>

                      {/* Odometers/Distances Grid Card */}
                      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-xs">
                        <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                          <div className="flex items-center gap-1.5">
                            <span className="p-1 bg-indigo-50 text-indigo-600 rounded">
                              <Activity size={14} />
                            </span>
                            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">Histórico de Odômetro (KM)</span>
                          </div>
                          <span className="text-[10px] bg-slate-100 text-slate-600 font-semibold px-2 py-0.5 rounded-full font-mono">
                            {recs.kmRecords.length} lançamentos
                          </span>
                        </div>

                        {recs.kmRecords.length === 0 ? (
                          <div className="py-8 text-center text-slate-400 italic text-xs">
                            Sem registros de odômetro para o período.
                          </div>
                        ) : (
                          <div className="overflow-x-auto max-h-[220px] overflow-y-auto pr-1">
                            <table className="w-full text-left text-xs">
                              <thead className="sticky top-0 bg-white">
                                <tr className="border-b border-slate-200 text-slate-400 font-medium">
                                  <th className="py-1.5 font-mono">Data</th>
                                  <th className="py-1.5 text-right font-mono">KM Inic.</th>
                                  <th className="py-1.5 text-right font-mono">KM Fin.</th>
                                  <th className="py-1.5 text-right font-mono">Prod.</th>
                                  <th className="py-1.5 text-right font-mono">Linha / Operação</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100 text-slate-600">
                                {recs.kmRecords.map((k, i) => (
                                  <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="py-2 font-mono text-slate-500">{formatDate(k.DATA)}</td>
                                    <td className="py-2 text-right font-mono text-slate-500">{k.KM_INICIAL.toLocaleString('pt-BR')}</td>
                                    <td className="py-2 text-right font-mono text-slate-500">{k.KM_FINAL.toLocaleString('pt-BR')}</td>
                                    <td className="py-2 text-right font-mono font-bold text-slate-800">{k.KM_PRODUTIVO.toLocaleString('pt-BR')} km</td>
                                    <td className="py-2 text-right font-mono max-w-[90px] truncate text-slate-400" title={k.OPERACAO || ''}>{k.OPERACAO || '-'}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Technical justification input box */}
                    <div className="pt-4 border-t border-slate-100 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-slate-700 uppercase tracking-wider font-mono">
                        <div className="flex items-center gap-1.5 text-emerald-700">
                          <Award size={14} className="text-emerald-600" />
                          <span>Parecer Técnico / Justificativa de Consumo</span>
                        </div>
                        {justifications[placa] && (
                          <span className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                            Salvo Localmente
                          </span>
                        )}
                      </div>
                      <textarea
                        value={justifications[placa] || ''}
                        onChange={(e) => handleUpdateJustification(placa, e.target.value)}
                        placeholder="Insira as observações mecânicas, rotas, desvios ou quaisquer fatores que justificam o consumo fora do normal deste veículo..."
                        className="w-full min-h-[120px] px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 rounded-xl transition-all shadow-3xs"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL DE EXPLOSÃO DE DADOS DO VEÍCULO */}
      <VehicleExplosionModal
        isOpen={!!selectedExplosionVehicle}
        onClose={() => setSelectedExplosionVehicle(null)}
        vehicle={selectedExplosionVehicle}
        fuelRecords={selectedExplosionVehicle ? getLinkedFuelings(selectedExplosionVehicle.placa) : []}
        kmRecords={selectedExplosionVehicle ? getLinkedKms(selectedExplosionVehicle.placa) : []}
        mergedData={mergedData}
        targetKml={minKml}
        periodoLabel={periodoLabel}
        companyName={companyName}
        erpSystem={erpSystem}
        reportLogo={reportLogo}
      />
    </div>
  );
}
