import React, { useState, useMemo } from 'react';
import { 
  Gauge, 
  MapPin, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle, 
  CheckCircle, 
  FileDown, 
  Search, 
  Info,
  Layers,
  ArrowUpDown,
  Filter,
  BarChart2,
  ListFilter
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend, 
  Line, 
  ComposedChart,
  ReferenceLine
} from 'recharts';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { PortalTooltipWrapper, Tooltip3DContainer } from './PortalChartTooltip';

// =========================================================================
// CUSTOM 3D NEON TOOLTIP FOR GPS VS ODÔMETRO AUDIT
// =========================================================================
const GPSAuditChartTooltip: React.FC<{ active?: boolean; payload?: any[]; isGapChart?: boolean }> = ({
  active,
  payload,
  isGapChart = false
}) => {
  if (!active || !payload || !payload.length) return null;
  const item = payload[0]?.payload || {};
  const frota = item.name ? String(item.name).replace(/^F/, '') : '-';
  const placa = item.placa || 'PLACA';
  const gpsVal = Number(item.gps) || 0;
  const odomVal = Number(item.odom) || 0;
  const gapVal = Number(item.gap) || (gpsVal - odomVal);
  const isPositive = gapVal >= 0;
  const isGrave = Math.abs(gapVal) > 0.6;
  const glowColor = isGrave ? '#f43f5e' : Math.abs(gapVal) < 0.2 ? '#10b981' : '#f59e0b';

  return (
    <PortalTooltipWrapper active={active} payload={payload}>
      <Tooltip3DContainer
        glowColor={glowColor}
        className="min-w-[270px] max-w-[340px]"
        watermarkAnimation={
          <svg viewBox="0 0 140 80" className="w-32 h-18 opacity-25">
            <g transform="translate(100, 40)">
              {/* Satellite Radar Sweeper */}
              <motion.circle
                cx="0"
                cy="0"
                r="22"
                fill="none"
                stroke={glowColor}
                strokeWidth="1.5"
                strokeDasharray="3 3"
                animate={{ scale: [0.8, 1.25, 0.8], opacity: [0.3, 0.8, 0.3] }}
                transition={{ repeat: Infinity, duration: 2.5 }}
              />
              <circle cx="0" cy="0" r="4" fill={glowColor} />
            </g>
          </svg>
        }
      >
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100 dark:border-slate-800">
          <div>
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block">
              Auditoria de Telemetria
            </span>
            <h4 className="text-sm font-black text-slate-900 dark:text-white">
              {placa} <span className="text-xs text-slate-500 font-mono">#{frota}</span>
            </h4>
          </div>
          <span
            className="px-2 py-0.5 rounded-lg text-[10px] font-black font-mono border"
            style={{
              backgroundColor: `${glowColor}15`,
              color: glowColor,
              borderColor: `${glowColor}40`
            }}
          >
            {isPositive ? `+${gapVal.toFixed(2)}` : gapVal.toFixed(2)} km/l
          </span>
        </div>

        <div className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-cyan-700 dark:text-cyan-400 font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-cyan-500 shadow-[0_0_6px_#06b6d4]" />
              Média GPS (Produtivo):
            </span>
            <span className="font-mono font-black text-slate-900 dark:text-white">
              {gpsVal > 0 ? `${gpsVal.toFixed(2)} km/l` : '-'}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-600 dark:text-slate-400 font-bold flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-slate-500" />
              Média Odômetro:
            </span>
            <span className="font-mono font-black text-slate-900 dark:text-white">
              {odomVal > 0 ? `${odomVal.toFixed(2)} km/l` : '-'}
            </span>
          </div>

          <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-[11px] font-extrabold">
            <span className="text-slate-500">Diagnóstico:</span>
            <span style={{ color: glowColor }}>
              {isGrave ? '⚠ Desvio Crítico' : Math.abs(gapVal) < 0.2 ? '✓ Consistente' : '⚡ Desvio Moderado'}
            </span>
          </div>
        </div>
      </Tooltip3DContainer>
    </PortalTooltipWrapper>
  );
};

interface GPSConsumptionTabProps {
  consolidatedReportData: any[];
  periodoLabel: string;
  companyName: string;
  erpSystem: string;
  reportLogo: string;
}

export default function GPSConsumptionTab({
  consolidatedReportData,
  periodoLabel,
  companyName,
  erpSystem,
  reportLogo
}: GPSConsumptionTabProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<string>('deviationAbs');
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [diagnosticFilter, setDiagnosticFilter] = useState<string>('all');
  const [showChartType, setShowChartType] = useState<'comparison' | 'gap'>('comparison');

  // Parse rows with both measures
  const analyzedData = useMemo(() => {
    return consolidatedReportData.map(v => {
      const placa = String(v.placa || v.PLACA || '');
      const frota = String(v.frota !== undefined && v.frota !== null ? v.frota : '-');
      const operacao = String(v.operacao !== undefined && v.operacao !== null ? v.operacao : '-');
      const litros = Number(v.litros !== undefined ? v.litros : (v.LITROS || 0));
      const valor = Number(v.valor !== undefined ? v.valor : (v.VALOR || 0));
      
      // GPS Distance
      const gpsKm = Number(v.kmProdutivo !== undefined ? v.kmProdutivo : (v.KM_PRODUTIVO || 0));

      // Odometer Distance (range calculation from min and max KMs)
      const kmInicial = Number(v.kmInicial !== undefined ? v.kmInicial : (v.KM_INICIAL !== undefined ? v.KM_INICIAL : 0));
      const kmFinal = Number(v.kmFinal !== undefined ? v.kmFinal : (v.KM_FINAL !== undefined ? v.KM_FINAL : 0));

      const odomKm = (kmFinal > kmInicial && kmInicial !== 999999999) 
        ? (kmFinal - kmInicial) 
        : 0;

      // Fuel consumption averages (KM/L)
      const kmlGPS = litros > 0 ? (gpsKm / litros) : 0;
      const kmlOdom = litros > 0 ? (odomKm / litros) : 0;

      // Differences
      const kmlDiff = kmlGPS - kmlOdom;
      const kmDiff = gpsKm - odomKm;

      // Percentage deviation relative to odometer consumption
      let percentDeviation = 0;
      if (kmlOdom > 0) {
        percentDeviation = (kmlDiff / kmlOdom) * 100;
      } else if (kmlGPS > 0) {
        percentDeviation = 100; // If odometer was 0 but GPS is valid
      }

      // Diagnostic analysis
      let diagnostic = 'Sem Dados';
      let diagColor = 'slate';
      let diagPriority = 0; // for sorting

      if (litros === 0) {
        diagnostic = 'Sem Abastecimento';
        diagColor = 'slate';
        diagPriority = 5;
      } else if (gpsKm === 0 && odomKm === 0) {
        diagnostic = 'Sem Distância';
        diagColor = 'gray';
        diagPriority = 4;
      } else if (gpsKm === 0 && odomKm > 0) {
        diagnostic = 'GPS Sem Sinal';
        diagColor = 'blue';
        diagPriority = 1; // High priority anomaly
      } else if (odomKm === 0 && gpsKm > 0) {
        diagnostic = 'Odômetro Incompleto';
        diagColor = 'amber';
        diagPriority = 2; // Medium priority anomaly
      } else {
        const absDev = Math.abs(percentDeviation);
        if (absDev <= 5) {
          diagnostic = 'Consistente';
          diagColor = 'emerald';
          diagPriority = 6; // Perfect agreement
        } else if (absDev <= 15) {
          diagnostic = 'Desvio Moderado';
          diagColor = 'amber';
          diagPriority = 3;
        } else {
          diagnostic = 'Desvio Grave';
          diagColor = 'rose';
          diagPriority = 0; // Top priority anomaly!
        }
      }

      return {
        placa,
        frota,
        operacao,
        litros,
        valor,
        gpsKm,
        odomKm,
        kmlGPS,
        kmlOdom,
        kmlDiff,
        kmDiff,
        percentDeviation,
        diagnostic,
        diagColor,
        diagPriority,
        deviationAbs: Math.abs(kmlDiff)
      };
    });
  }, [consolidatedReportData]);

  // Overall aggregated statistics
  const summaryStats = useMemo(() => {
    let totalL = 0;
    let totalGpsKm = 0;
    let totalOdomKm = 0;
    
    let consistentCount = 0;
    let modCount = 0;
    let graveCount = 0;
    let noGpsSignal = 0;
    let noOdomRecords = 0;
    let activeVehicles = 0;

    analyzedData.forEach(row => {
      totalL += row.litros;
      totalGpsKm += row.gpsKm;
      totalOdomKm += row.odomKm;

      if (row.litros > 0 && (row.gpsKm > 0 || row.odomKm > 0)) {
        activeVehicles++;
        if (row.diagnostic === 'Consistente') consistentCount++;
        else if (row.diagnostic === 'Desvio Moderado') modCount++;
        else if (row.diagnostic === 'Desvio Grave') graveCount++;
        else if (row.diagnostic === 'GPS Sem Sinal') noGpsSignal++;
        else if (row.diagnostic === 'Odômetro Incompleto') noOdomRecords++;
      }
    });

    const fleetKmlGps = totalL > 0 ? (totalGpsKm / totalL) : 0;
    const fleetKmlOdom = totalL > 0 ? (totalOdomKm / totalL) : 0;
    const fleetKmlDiff = fleetKmlGps - fleetKmlOdom;
    const fleetPercentDeviation = fleetKmlOdom > 0 ? (fleetKmlDiff / fleetKmlOdom) * 100 : 0;

    const coherenceIndex = activeVehicles > 0 
      ? ((consistentCount + modCount) / activeVehicles) * 100 
      : 0;

    return {
      fleetKmlGps,
      fleetKmlOdom,
      fleetKmlDiff,
      fleetPercentDeviation,
      totalGpsKm,
      totalOdomKm,
      totalL,
      activeVehicles,
      consistentCount,
      modCount,
      graveCount,
      noGpsSignal,
      noOdomRecords,
      coherenceIndex
    };
  }, [analyzedData]);

  // Filter & Search
  const filteredData = useMemo(() => {
    let result = analyzedData.filter(row => {
      const p = row.placa.toLowerCase();
      const f = row.frota.toLowerCase();
      const op = row.operacao.toLowerCase();
      const search = searchTerm.toLowerCase();
      
      const matchesSearch = p.includes(search) || f.includes(search) || op.includes(search);
      if (!matchesSearch) return false;

      if (diagnosticFilter !== 'all') {
        if (diagnosticFilter === 'anomalies') {
          return ['Desvio Grave', 'GPS Sem Sinal', 'Odômetro Incompleto'].includes(row.diagnostic);
        }
        return row.diagnostic === diagnosticFilter;
      }

      return true;
    });

    // Sorting
    result.sort((a: any, b: any) => {
      let valA = a[sortField];
      let valB = b[sortField];

      if (typeof valA === 'string') {
        const strB = typeof valB === 'string' ? valB : String(valB || '');
        return sortAsc ? valA.localeCompare(strB) : strB.localeCompare(valA);
      }

      // Numerics
      if (valA === undefined || valA === null) valA = 0;
      if (valB === undefined || valB === null) valB = 0;

      return sortAsc ? valA - valB : valB - valA;
    });

    return result;
  }, [analyzedData, searchTerm, sortField, sortAsc, diagnosticFilter]);

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  // Excel Export
  const handleExportXLSX = () => {
    const wsData = filteredData.map(row => ({
      'Frota/Filiado': row.frota,
      'Placa': row.placa,
      'Operação': row.operacao,
      'Litros Abastecidos': row.litros,
      'Distância GPS (KM)': row.gpsKm,
      'Distância Odômetro (KM)': row.odomKm,
      'Média Consumo GPS (KM/L)': row.kmlGPS,
      'Média Consumo Odômetro (KM/L)': row.kmlOdom,
      'Divergência KM/L (GPS - Odômetro)': row.kmlDiff,
      'Desvio %': row.percentDeviation,
      'Diferença Metragem (KM)': row.kmDiff,
      'Diagnóstico': row.diagnostic
    }));

    const ws = XLSX.utils.json_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Média GPS vs Odômetro");
    XLSX.writeFile(wb, `Auditoria_Consumo_GPS_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Base64 helper for PDF logo
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
      console.error('Base64 fetch error:', err);
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
    doc.rect(0, 0, 210, 52, 'F');

    // Blue/Teal side marker decorative bar
    doc.setFillColor(14, 116, 144); // cyan-750 / steel-blue
    doc.rect(0, 0, 4, 52, 'F');

    // Logo
    try {
      if (reportLogo) {
        const logo64 = await getBase64FromUrl(getFullUrl(reportLogo));
        if (logo64) {
          doc.addImage(logo64, 'PNG', 12, 8, 20, 10);
        }
      }
    } catch (e) {
      console.error('Logo render error on PDF:', e);
    }

    // Title Section
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(15, 23, 42); // slate-900
    doc.text('Auditoria de Consumo: Média GPS vs. Odômetro', 38, 15);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(100, 116, 139); // slate-500
    doc.text(`${companyName} • Gestão Inteligente • Gerado em ${dateStr} • ERP: ${erpSystem}`, 38, 20);

    // Period banner
    doc.setFillColor(241, 245, 249); // slate-100
    doc.roundedRect(12, 26, 186, 9, 1.5, 1.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('PERÍODO DE REFERÊNCIA:', 16, 32);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(15, 23, 42);
    doc.text(periodoLabel.toUpperCase(), 58, 32);

    doc.setTextColor(71, 85, 105);
    doc.text(`Frotas Analisadas: ${summaryStats.activeVehicles} | Média GPS Frota: ${summaryStats.fleetKmlGps.toFixed(2)} km/l | Média Odom Frota: ${summaryStats.fleetKmlOdom.toFixed(2)} km/l`, 102, 32);

    // Context explanation
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    const expl = "Este relatório cruza a movimentação de GPS (KM Produtivo) com a quilometragem física (calculada entre KMs Inicial e Final registrados pelos motoristas via odômetro) visando auditar divergências de consumo e identificar anomalias.";
    const splitExpl = doc.splitTextToSize(expl, 186);
    doc.text(splitExpl, 12, 40);

    // Core table header
    const tableHeader = [
      ['Frota', 'Placa', 'Operação', 'Litros', 'KM GPS', 'KM Odom', 'Média GPS', 'Média Odom', 'Diferença', 'Aviso']
    ];

    const tableRows = filteredData.map(row => {
      const diffSign = row.kmlDiff > 0 ? '+' : '';
      return [
        row.frota,
        row.placa,
        row.operacao,
        row.litros > 0 ? `${row.litros.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} L` : '0 L',
        row.gpsKm.toLocaleString('pt-BR'),
        row.odomKm.toLocaleString('pt-BR'),
        row.kmlGPS > 0 ? `${row.kmlGPS.toFixed(2)}` : '-',
        row.kmlOdom > 0 ? `${row.kmlOdom.toFixed(2)}` : '-',
        row.litros > 0 ? `${diffSign}${row.kmlDiff.toFixed(2)} (${row.percentDeviation > 0 ? '+' : ''}${row.percentDeviation.toFixed(1)}%)` : '-',
        row.diagnostic
      ];
    });

    autoTable(doc, {
      head: tableHeader,
      body: tableRows,
      startY: 55,
      theme: 'striped',
      headStyles: { 
        fillColor: [15, 23, 42], 
        textColor: [255, 255, 255], 
        fontSize: 7.5, 
        fontStyle: 'bold',
        cellPadding: 2
      },
      styles: { fontSize: 7, cellPadding: 1.5 },
      columnStyles: {
        6: { fontStyle: 'bold' },
        7: { fontStyle: 'bold' },
        8: { fontStyle: 'bold' }
      },
      didParseCell: (data) => {
        if (data.section === 'body' && data.column.index === 9) {
          const val = data.cell.text[0];
          if (val === 'Desvio Grave') {
            data.cell.styles.textColor = [185, 28, 28]; // red
            data.cell.styles.fontStyle = 'bold';
          } else if (val === 'GPS Sem Sinal') {
            data.cell.styles.textColor = [29, 78, 216]; // blue
            data.cell.styles.fontStyle = 'bold';
          } else if (val === 'Odômetro Incompleto') {
            data.cell.styles.textColor = [194, 65, 12]; // orange
          } else if (val === 'Consistente') {
            data.cell.styles.textColor = [4, 120, 87]; // green
          }
        }
      }
    });

    // Page numbers
    const totalPages = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(6.5);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text(`* Auditoria gerencial gerada automaticamente cruzando telemetria GPS e leituras manuais de odômetro. O desvio ideal recomendado é de até ±5%.`, 12, 288);
      
      doc.setFont('helvetica', 'normal');
      doc.text(`Páxina ${i} de ${totalPages}`, 190, 288);
    }

    doc.save(`Auditoria_Consumo_GPS_${periodoLabel.replace(/\s+/g, '_')}.pdf`);
  };

  // Recharts data preparation (Vehicles with both readings)
  const chartData = useMemo(() => {
    return filteredData
      .filter(row => row.litros > 0 && row.gpsKm > 0 && row.odomKm > 0)
      .slice(0, 20) // Show first 20 vehicles to keep chart clean and legible
      .map(row => ({
        name: `F${row.frota}`,
        gps: parseFloat(row.kmlGPS.toFixed(2)),
        odom: parseFloat(row.kmlOdom.toFixed(2)),
        gap: parseFloat(row.kmlDiff.toFixed(2)),
        placa: row.placa
      }));
  }, [filteredData]);

  return (
    <div className="space-y-6">
      {/* Tab Header Banner */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-cyan-50 text-cyan-600 rounded-md">
              <Gauge className="w-5 h-5" />
            </span>
            <h3 className="text-xl font-bold text-slate-900">Auditoria de Consumo: GPS vs. Odômetro</h3>
          </div>
          <p className="text-sm text-slate-500">
            Comparação detalhada da média de combustível (KM/L) calculada via <strong className="text-cyan-700">Telemetria GPS (KM Produtivo)</strong> contra o rendimento estimado pelo <strong className="text-slate-800">Odômetro Físico (KM Inicial e Final)</strong>. Desvios expressivos auxiliam na detecção de erros de digitação, fraudes ou falhas de sinal.
          </p>
        </div>

        {/* Global actions */}
        <div className="flex flex-wrap items-center gap-2 self-start xl:self-center">
          <button
            onClick={handleExportPDF}
            disabled={filteredData.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-semibold text-xs rounded-lg transition-all cursor-pointer shadow-xs"
          >
            <FileDown size={14} />
            Exportar PDF
          </button>
          
          <button
            onClick={handleExportXLSX}
            disabled={filteredData.length === 0}
            className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-semibold text-xs rounded-lg transition-all cursor-pointer shadow-xs"
          >
            <FileDown size={14} />
            Planilha Excel
          </button>
        </div>
      </div>

      {/* Grid of aggregated KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-3xs hover:shadow-xs transition-shadow">
          <p className="text-[10px] font-black font-mono text-slate-400 uppercase tracking-widest mb-1">MÉDIA GLOBAL GPS</p>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-cyan-600">
              {summaryStats.fleetKmlGps > 0 ? summaryStats.fleetKmlGps.toLocaleString('pt', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
            </span>
            {summaryStats.fleetKmlGps > 0 && <span className="text-xs text-slate-400 font-bold font-mono">km/l</span>}
          </div>
          <div className="text-[9px] text-slate-400 font-bold uppercase mt-2">
            Baseada em {summaryStats.totalGpsKm.toLocaleString('pt')} km rodados
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-3xs hover:shadow-xs transition-shadow">
          <p className="text-[10px] font-black font-mono text-slate-400 uppercase tracking-widest mb-1">MÉDIA GLOBAL ODÔMETRO</p>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-slate-800">
              {summaryStats.fleetKmlOdom > 0 ? summaryStats.fleetKmlOdom.toLocaleString('pt', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
            </span>
            {summaryStats.fleetKmlOdom > 0 && <span className="text-xs text-slate-400 font-bold font-mono">km/l</span>}
          </div>
          <div className="text-[9px] text-slate-400 font-bold uppercase mt-2">
            Calculada em {summaryStats.totalOdomKm.toLocaleString('pt')} km digitados
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-3xs hover:shadow-xs transition-shadow">
          <p className="text-[10px] font-black font-mono text-slate-400 uppercase tracking-widest mb-1">DIVERGÊNCIA MÉDIA</p>
          <div className="flex items-baseline gap-1">
            <span className={cn(
              "text-2xl font-black",
              Math.abs(summaryStats.fleetKmlDiff) < 0.1 ? "text-emerald-600" : (Math.abs(summaryStats.fleetKmlDiff) < 0.4 ? "text-amber-500" : "text-rose-600")
            )}>
              {summaryStats.fleetKmlDiff > 0 ? '+' : ''}{summaryStats.fleetKmlDiff.toLocaleString('pt', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] font-bold text-slate-400 font-mono ml-1">
              ({summaryStats.fleetPercentDeviation > 0 ? '+' : ''}{summaryStats.fleetPercentDeviation.toFixed(1)}%)
            </span>
          </div>
          <div className="text-[9px] text-slate-400 font-bold uppercase mt-2">
            Diferença global (GPS - Odom)
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-3xs hover:shadow-xs transition-shadow">
          <p className="text-[10px] font-black font-mono text-slate-400 uppercase tracking-widest mb-1">COERÊNCIA DE LEITURA</p>
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-black text-emerald-600">
              {summaryStats.coherenceIndex.toFixed(1)}%
            </span>
          </div>
          <div className="text-[9px] text-slate-400 font-bold uppercase mt-2">
            {summaryStats.consistentCount} frotas consistentes (&lt;5% desvio)
          </div>
        </div>
      </div>

      {/* Chart Section */}
      {chartData.length > 0 && (
        <div className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <h4 className="text-base font-black text-slate-800 uppercase tracking-wide">Auditoria Visual (Primeiras 20 Frotas)</h4>
              <p className="text-xs text-slate-400">Análise de desvio gráfico entre as leituras de Telemetria e Odômetro</p>
            </div>

            <div className="flex bg-slate-100 p-1 rounded-xl w-fit border border-slate-200">
              <button
                onClick={() => setShowChartType('comparison')}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-xs font-bold transition-all uppercase select-none cursor-pointer",
                  showChartType === 'comparison' ? "bg-white text-slate-800 shadow-xs" : "text-slate-400 hover:text-slate-600"
                )}
              >
                Comparar Médias
              </button>
              <button
                onClick={() => setShowChartType('gap')}
                className={cn(
                  "px-4 py-1.5 rounded-lg text-xs font-bold transition-all uppercase select-none cursor-pointer",
                  showChartType === 'gap' ? "bg-white text-slate-800 shadow-xs" : "text-slate-400 hover:text-slate-600"
                )}
              >
                Variação (kM/L)
              </button>
            </div>
          </div>

          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              {showChartType === 'comparison' ? (
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" fontSize={10} fontWeight="bold" stroke="#94a3b8" />
                  <YAxis fontSize={10} fontWeight="bold" stroke="#94a3b8" domain={[0, 'auto']} />
                  <Tooltip content={<GPSAuditChartTooltip />} />
                  <Legend 
                    verticalAlign="bottom" 
                    height={36} 
                    iconType="circle" 
                    formatter={(val) => val === 'gps' ? 'Média GPS (KM Produtivo)' : 'Média Odômetro'}
                  />
                  <Bar 
                    dataKey="gps" 
                    fill="#0891b2" 
                    radius={[4, 4, 0, 0]} 
                    barSize={20}
                    className="cursor-pointer"
                    onClick={(entry: any) => {
                      if (entry && (entry.placa || entry.name)) {
                        const target = entry.placa || entry.name.replace(/^F/, '');
                        setSearchTerm(searchTerm === target ? '' : target);
                      }
                    }}
                  />
                  <Bar 
                    dataKey="odom" 
                    fill="#475569" 
                    radius={[4, 4, 0, 0]} 
                    barSize={20}
                    className="cursor-pointer"
                    onClick={(entry: any) => {
                      if (entry && (entry.placa || entry.name)) {
                        const target = entry.placa || entry.name.replace(/^F/, '');
                        setSearchTerm(searchTerm === target ? '' : target);
                      }
                    }}
                  />
                </BarChart>
              ) : (
                <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="name" fontSize={10} fontWeight="bold" stroke="#94a3b8" />
                  <YAxis fontSize={10} fontWeight="bold" stroke="#94a3b8" domain={['auto', 'auto']} />
                  <Tooltip content={<GPSAuditChartTooltip isGapChart={true} />} />
                  <ReferenceLine y={0} stroke="#94a3b8" strokeDasharray="3 3" />
                  <Bar 
                    dataKey="gap" 
                    fill="#f59e0b" 
                    radius={[4, 4, 0, 0]}
                    className="cursor-pointer"
                    onClick={(entry: any) => {
                      if (entry && (entry.placa || entry.name)) {
                        const target = entry.placa || entry.name.replace(/^F/, '');
                        setSearchTerm(searchTerm === target ? '' : target);
                      }
                    }}
                  >
                    {chartData.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={entry.gap > 0.4 ? "#059669" : (entry.gap < -0.4 ? "#dc2626" : "#f59e0b")} 
                      />
                    ))}
                  </Bar>
                </ComposedChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Main Table Segment */}
      <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
        {/* Table Filters header */}
        <div className="p-5 border-b border-slate-100 bg-slate-50/20 flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
          <div className="relative flex-1 max-w-sm">
            <input
              type="text"
              placeholder="Pesquisar placa, frota ou operação..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 focus:border-cyan-500 rounded-xl text-xs outline-none focus:ring-2 focus:ring-cyan-500/10 transition-all font-medium text-slate-800 shadow-3xs"
            />
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-cyan-600" />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-100/80 border border-slate-200 p-1 rounded-xl text-[10px] font-bold text-slate-600 shadow-3xs">
              <span className="pl-2 pr-1 uppercase text-[9px] text-slate-400">Diagnóstico:</span>
              {[
                { id: 'all', label: 'Todos' },
                { id: 'anomalies', label: 'Anomalias' },
                { id: 'Consistente', label: 'Coerentes' },
                { id: 'Desvio Grave', label: 'Desvio Grave' },
                { id: 'GPS Sem Sinal', label: 'GPS Sem Sinal' }
              ].map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setDiagnosticFilter(opt.id)}
                  className={cn(
                    "px-2.5 py-1 rounded-lg uppercase select-none transition-all cursor-pointer",
                    diagnosticFilter === opt.id ? "bg-white text-slate-800 shadow-3xs font-black" : "text-slate-400 hover:text-slate-600"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Table representation */}
        <div className="overflow-x-auto">
          {filteredData.length === 0 ? (
            <div className="text-center py-16">
              <AlertTriangle className="mx-auto text-slate-350 mb-3" size={36} />
              <p className="text-slate-400 font-semibold text-xs uppercase tracking-wide">Nenhum veículo encontrado com os filtros atuais</p>
            </div>
          ) : (
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-100 text-slate-400 uppercase font-black font-mono tracking-wider text-[9px] select-none">
                  <th onClick={() => handleSort('frota')} className="px-5 py-3 cursor-pointer hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-1">Frota <ArrowUpDown size={10} /></div>
                  </th>
                  <th onClick={() => handleSort('placa')} className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-1">Placa <ArrowUpDown size={10} /></div>
                  </th>
                  <th onClick={() => handleSort('operacao')} className="px-4 py-3 cursor-pointer hover:bg-slate-100 transition-colors">
                    <div className="flex items-center gap-1">Operação <ArrowUpDown size={10} /></div>
                  </th>
                  <th onClick={() => handleSort('litros')} className="px-4 py-3 text-right cursor-pointer hover:bg-slate-100 transition-colors">
                    <div className="flex items-center justify-end gap-1">Litros <ArrowUpDown size={10} /></div>
                  </th>
                  <th onClick={() => handleSort('gpsKm')} className="px-4 py-3 text-right cursor-pointer hover:bg-slate-100 transition-colors">
                    <div className="flex items-center justify-end gap-1">Dist. GPS <ArrowUpDown size={10} /></div>
                  </th>
                  <th onClick={() => handleSort('odomKm')} className="px-4 py-3 text-right cursor-pointer hover:bg-slate-100 transition-colors">
                    <div className="flex items-center justify-end gap-1">Dist. Odom <ArrowUpDown size={10} /></div>
                  </th>
                  <th onClick={() => handleSort('kmlGPS')} className="px-4 py-3 text-right bg-cyan-50/30 border-l border-cyan-100/50 cursor-pointer hover:bg-cyan-50/50 transition-colors">
                    <div className="flex items-center justify-end gap-1 text-cyan-700">Média GPS <ArrowUpDown size={10} /></div>
                  </th>
                  <th onClick={() => handleSort('kmlOdom')} className="px-4 py-3 text-right border-r border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors">
                    <div className="flex items-center justify-end gap-1">Média Odom <ArrowUpDown size={10} /></div>
                  </th>
                  <th onClick={() => handleSort('deviationAbs')} className="px-4 py-3 text-right cursor-pointer hover:bg-slate-100 transition-colors">
                    <div className="flex items-center justify-end gap-1">Divergência <ArrowUpDown size={10} /></div>
                  </th>
                  <th onClick={() => handleSort('diagPriority')} className="px-5 py-3 text-center cursor-pointer hover:bg-slate-100 transition-colors">
                    <div className="flex items-center justify-center gap-1">Diagnóstico <ArrowUpDown size={10} /></div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredData.map((row) => (
                  <tr key={row.placa} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-5 py-3 font-bold font-mono text-slate-900">{row.frota}</td>
                    <td className="px-4 py-3 font-mono font-medium tracking-wider text-slate-500 select-all">{row.placa}</td>
                    <td className="px-4 py-3 text-slate-500 max-w-[200px] truncate" title={row.operacao}>{row.operacao}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-600 font-medium">
                      {row.litros > 0 ? `${row.litros.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} L` : '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-500">
                      {row.gpsKm > 0 ? `${row.gpsKm.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} km` : '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-mono text-slate-500">
                      {row.odomKm > 0 ? `${row.odomKm.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} km` : '-'}
                    </td>
                    
                    {/* Media GPS */}
                    <td className="px-4 py-3 text-right font-bold font-mono text-cyan-800 bg-cyan-50/10 border-l border-cyan-100/50">
                      {row.kmlGPS > 0 ? (
                        <span className="px-1.5 py-0.5 rounded bg-cyan-100/30">
                          {row.kmlGPS.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      ) : '-'}
                    </td>

                    {/* Media Odom */}
                    <td className="px-4 py-3 text-right font-bold font-mono text-slate-800 border-r border-slate-100">
                      {row.kmlOdom > 0 ? (
                        <span>
                          {row.kmlOdom.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      ) : '-'}
                    </td>

                    {/* Gap / Divergência (GPS - Odom) */}
                    <td className="px-4 py-3 text-right font-mono font-extrabold">
                      {row.litros > 0 && (row.gpsKm > 0 || row.odomKm > 0) ? (
                        <div className="flex flex-col items-end">
                          <span className={cn(
                            "text-xs",
                            row.kmlDiff > 0.4 ? "text-emerald-600" : (row.kmlDiff < -0.4 ? "text-rose-600" : "text-amber-600")
                          )}>
                            {row.kmlDiff > 0 ? '+' : ''}{row.kmlDiff.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} km/l
                          </span>
                          <span className="text-[9px] text-slate-400 font-semibold uppercase font-sans">
                            ({row.percentDeviation > 0 ? '+' : ''}{row.percentDeviation.toFixed(1)}%)
                          </span>
                        </div>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>

                    {/* Diagnostic Badge */}
                    <td className="px-5 py-3 text-center">
                      <span className={cn(
                        "inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-black uppercase tracking-tight rounded-md select-none border",
                        row.diagColor === 'emerald' && "bg-emerald-50 text-emerald-700 border-emerald-200",
                        row.diagColor === 'amber' && "bg-amber-50 text-amber-700 border-amber-200",
                        row.diagColor === 'rose' && "bg-rose-50 text-rose-700 border-rose-250",
                        row.diagColor === 'blue' && "bg-blue-50 text-blue-700 border-blue-200",
                        row.diagColor === 'gray' && "bg-slate-50 text-slate-500 border-slate-200",
                        row.diagColor === 'slate' && "bg-slate-50 text-slate-400 border-slate-150"
                      )}>
                        {row.diagnostic === 'Consistente' && <CheckCircle size={10} />}
                        {['Desvio Grave', 'Desvio Moderado', 'GPS Sem Sinal'].includes(row.diagnostic) && <AlertTriangle size={10} />}
                        {row.diagnostic}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        
        {/* Footnote instruction explanation */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center gap-2 text-slate-400 text-[10px] font-medium uppercase font-mono leading-relaxed">
          <Info size={14} className="text-cyan-600 shrink-0" />
          <span>Fórmula de Divergência Aplicada: <strong>Divergência = Média GPS (KM Produtivo / Litros) - Média Odômetro ((KM Final - KM Inicial) / Litros)</strong>. O desvio percentual é medido sob a base do odômetro.</span>
        </div>
      </div>
    </div>
  );
}
