import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  TrendingUp, 
  Truck, 
  Building2, 
  ShoppingBag, 
  Layers, 
  Calendar, 
  Wrench, 
  Search, 
  Download, 
  Printer, 
  Copy, 
  Check, 
  ArrowUpDown, 
  ArrowUp, 
  ArrowDown, 
  Sparkles, 
  PieChart as PieIcon, 
  BarChart3, 
  DollarSign, 
  Maximize2,
  Filter,
  CheckCircle2,
  HelpCircle,
  ChevronRight,
  Package,
  Loader2,
  Settings2,
  X,
  SlidersHorizontal,
  LayoutTemplate,
  ListOrdered
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { MaintenanceExplosionModal } from './MaintenanceExplosionModal';

const UNI_LOGO_URL = 'https://raw.githubusercontent.com/Buenotec/Logo_UNI/refs/heads/main/logo_uni.png';

// Helper to convert Image URL to Base64 for sharp PDF embedding
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

interface DynamicMaintenanceReportProps {
  combinedData: any[];
  totalGeral: number;
  totalEstoque: number;
  totalAvulso: number;
  onSelectVehicle?: (prefix: string) => void;
  onSelectMonth?: (month: string) => void;
  appTheme?: string;
}

type GroupByOption = 'veiculo' | 'fornecedor' | 'grc' | 'gre' | 'grd' | 'mes' | 'material';

export const DynamicMaintenanceReport: React.FC<DynamicMaintenanceReportProps> = ({
  combinedData = [],
  totalGeral = 0,
  totalEstoque = 0,
  totalAvulso = 0,
  onSelectVehicle,
  onSelectMonth,
  appTheme = 'light'
}) => {
  const [groupBy, setGroupBy] = useState<GroupByOption>('veiculo');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<'name' | 'total' | 'estoque' | 'avulso' | 'count' | 'pct'>('total');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [pageSize, setPageSize] = useState<number | 'all'>(15);
  const [currentPage, setCurrentPage] = useState(1);
  const [copiedSuccess, setCopiedSuccess] = useState(false);
  const [typeFilter, setTypeFilter] = useState<'all' | 'estoque' | 'avulso'>('all');
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Custom Export Selection State (Similar to Média de Consumo)
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportIncludeChart, setExportIncludeChart] = useState(true);
  const [exportIncludeKpis, setExportIncludeKpis] = useState(true);
  const [exportIncludeTable, setExportIncludeTable] = useState(true);
  const [exportIncludeExecutiveSummary, setExportIncludeExecutiveSummary] = useState(true);
  const [exportReportMode, setExportReportMode] = useState<'consolidated' | 'mass_launches' | 'by_fleet'>('consolidated');
  const [exportOrientation, setExportOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [defaultAction, setDefaultAction] = useState<'save' | 'print'>('save');

  // Drilldown / Explosion Modal State
  const [drilldownModalData, setDrilldownModalData] = useState<{
    title: string;
    subtitle?: string;
    items: any[];
  } | null>(null);

  const isDark = appTheme === 'dark-neon';

  // Group and consolidate data based on selected grouping dimension
  const groupedData = useMemo(() => {
    const map = new Map<string, {
      key: string;
      name: string;
      subName?: string;
      estoque: number;
      avulso: number;
      total: number;
      count: number;
      estoqueCount: number;
      avulsoCount: number;
      uniqueVehicles: Set<string>;
      uniqueSuppliers: Set<string>;
      rawItems: any[];
    }>();

    combinedData.forEach((item: any) => {
      let groupKey = 'Não Especificado';
      let groupName = 'Não Especificado';
      let subName = '';

      const rawVal = Number(item._rawValue || item.VALORITEM || item.val || item.value || 0) || 0;
      const isEstoque = item.type === 'ESTOQUE' || item.type === 'estoque';
      const isAvulso = !isEstoque;

      if (groupBy === 'veiculo') {
        const rawPrefix = String(item.PREFIXOVEIC || item.FROTA || item.prefix || 'N/A').trim();
        const isSemVeic = !rawPrefix || rawPrefix === 'N/A' || rawPrefix === 'Sem Veic' || rawPrefix === '0' || rawPrefix === 'SEM PLACA' || rawPrefix === 'NULL' || rawPrefix.toLowerCase() === 'sem veiculo';

        if (isSemVeic) {
          const grc = String(item.DESCRICAOGRC || item.descricaogrc || item.grc || '').trim();
          const grcNorm = grc.toLowerCase();
          if (grcNorm === 'suprimentos') {
            groupKey = 'Sem Veículo - Suprimentos';
            groupName = 'Frota sem veículos (Suprimentos)';
            subName = 'EPIs, Uniformes, Copa & Predial';
          } else if (grcNorm === 'oficina') {
            groupKey = 'Sem Veículo - Oficina';
            groupName = 'Oficina / Garagem (Sem Veículo)';
            subName = 'Consumíveis & Insumos Gerais da Oficina';
          } else {
            const displayGrc = grc || 'Diversos';
            groupKey = `Sem Veículo - ${displayGrc}`;
            groupName = `Sem Veículo (${displayGrc})`;
            subName = 'Custos Administrativos / Departamentais';
          }
        } else {
          groupKey = rawPrefix;
          groupName = `Frota ${rawPrefix}`;
          const placa = String(item.PLACA || item.placa || '').trim();
          if (placa && placa !== '-' && placa !== 'Sem Veic' && placa !== 'SEM PLACA') {
            subName = placa;
          }
        }
      } else if (groupBy === 'fornecedor') {
        const fornName = String(item.rsocialforn || item.RSOCIALFORN || item.fornecedor || item.FORNECEDOR || 'Direto / Estoque Próprio').trim();
        const numForn = String(item.nrforn || item.NRFORN || '').trim();
        groupKey = fornName || 'Não Identificado';
        groupName = fornName || 'Não Identificado';
        if (numForn && numForn !== '0' && numForn !== '-') {
          subName = `Cód: ${numForn}`;
        }
      } else if (groupBy === 'grc') {
        const grc = String(item.DESCRICAOGRC || item.descricaogrc || item.grc || 'Sem Grupo GRC').trim();
        groupKey = grc;
        groupName = grc;
      } else if (groupBy === 'gre') {
        const gre = String(item.DESCRICAOGRE || item.descricaogre || item.gre || 'Sem Grupo GRE').trim();
        groupKey = gre;
        groupName = gre;
      } else if (groupBy === 'grd') {
        const grd = String(item.DESCRICAOGRD || item.descricaogrd || item.grd || 'Sem Grupo GRD').trim();
        groupKey = grd;
        groupName = grd;
      } else if (groupBy === 'mes') {
        const mYear = String(item.mesAno || item['Mes/Ano'] || item.month_year || item.nomeMes || 'Período Geral').trim();
        groupKey = mYear;
        groupName = mYear.toUpperCase();
      } else if (groupBy === 'material') {
        const mat = String(item.DESCRICAONFSERVICO || item.DESCRICAOMAT || item.descricao || item.material_desc || 'Serviço / Item Diverso').trim();
        groupKey = mat;
        groupName = mat;
        const codMat = String(item.CODIGOINTERNOMATERIAL || item.CODIGOMATAVULSO || item.material_code || '').trim();
        if (codMat) subName = `Cód: ${codMat}`;
      }

      if (!map.has(groupKey)) {
        map.set(groupKey, {
          key: groupKey,
          name: groupName,
          subName,
          estoque: 0,
          avulso: 0,
          total: 0,
          count: 0,
          estoqueCount: 0,
          avulsoCount: 0,
          uniqueVehicles: new Set(),
          uniqueSuppliers: new Set(),
          rawItems: []
        });
      }

      const entry = map.get(groupKey)!;
      entry.count += 1;
      entry.rawItems.push(item);
      if (isEstoque) {
        entry.estoque += rawVal;
        entry.estoqueCount += 1;
      } else {
        entry.avulso += rawVal;
        entry.avulsoCount += 1;
      }
      entry.total += rawVal;

      const p = String(item.PREFIXOVEIC || item.FROTA || '').trim();
      if (p && p !== 'N/A') entry.uniqueVehicles.add(p);
      const f = String(item.rsocialforn || item.RSOCIALFORN || '').trim();
      if (f) entry.uniqueSuppliers.add(f);
    });

    let list = Array.from(map.values());

    // Apply type filter if selected
    if (typeFilter === 'estoque') {
      list = list.filter(item => item.estoque > 0);
    } else if (typeFilter === 'avulso') {
      list = list.filter(item => item.avulso > 0);
    }

    // Filter by search
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      list = list.filter(item => 
        item.name.toLowerCase().includes(q) || 
        (item.subName && item.subName.toLowerCase().includes(q)) ||
        item.key.toLowerCase().includes(q)
      );
    }

    // Sort
    list.sort((a, b) => {
      let valA: any = a.total;
      let valB: any = b.total;

      if (sortField === 'name') {
        valA = a.name;
        valB = b.name;
        return sortOrder === 'asc' 
          ? String(valA).localeCompare(String(valB), undefined, { numeric: true }) 
          : String(valB).localeCompare(String(valA), undefined, { numeric: true });
      } else if (sortField === 'estoque') {
        valA = a.estoque;
        valB = b.estoque;
      } else if (sortField === 'avulso') {
        valA = a.avulso;
        valB = b.avulso;
      } else if (sortField === 'count') {
        valA = a.count;
        valB = b.count;
      } else {
        valA = a.total;
        valB = b.total;
      }

      return sortOrder === 'asc' ? valA - valB : valB - valA;
    });

    return list;
  }, [combinedData, groupBy, typeFilter, searchTerm, sortField, sortOrder]);

  // Executive KPI summary calculations
  const executiveMetrics = useMemo(() => {
    const totalCost = totalGeral || combinedData.reduce((acc, curr) => acc + (Number(curr._rawValue || curr.VALORITEM || curr.val || 0) || 0), 0) || 1;
    const distinctVehicles = new Set(combinedData.map(c => String(c.PREFIXOVEIC || c.FROTA || '').trim()).filter(Boolean)).size;
    const distinctSuppliers = new Set(combinedData.map(c => String(c.rsocialforn || c.RSOCIALFORN || '').trim()).filter(Boolean)).size;
    const avgPerVehicle = distinctVehicles > 0 ? totalCost / distinctVehicles : 0;
    const avgPerRecord = combinedData.length > 0 ? totalCost / combinedData.length : 0;
    
    // Top Vehicle
    const vehMap = new Map<string, number>();
    combinedData.forEach(c => {
      const p = String(c.PREFIXOVEIC || c.FROTA || 'N/A').trim();
      const val = Number(c._rawValue || c.VALORITEM || c.val || 0) || 0;
      vehMap.set(p, (vehMap.get(p) || 0) + val);
    });
    let topVehicle = { name: '-', value: 0 };
    vehMap.forEach((val, name) => {
      if (val > topVehicle.value) topVehicle = { name, value: val };
    });

    // Top Supplier
    const supMap = new Map<string, number>();
    combinedData.forEach(c => {
      const s = String(c.rsocialforn || c.RSOCIALFORN || '').trim();
      if (!s) return;
      const val = Number(c._rawValue || c.VALORITEM || c.val || 0) || 0;
      supMap.set(s, (supMap.get(s) || 0) + val);
    });
    let topSupplier = { name: '-', value: 0 };
    supMap.forEach((val, name) => {
      if (val > topSupplier.value) topSupplier = { name, value: val };
    });

    // Top GRC
    const grcMap = new Map<string, number>();
    combinedData.forEach(c => {
      const g = String(c.DESCRICAOGRC || c.descricaogrc || '').trim();
      if (!g) return;
      const val = Number(c._rawValue || c.VALORITEM || c.val || 0) || 0;
      grcMap.set(g, (grcMap.get(g) || 0) + val);
    });
    let topGrc = { name: '-', value: 0 };
    grcMap.forEach((val, name) => {
      if (val > topGrc.value) topGrc = { name, value: val };
    });

    const estoqueShare = totalCost > 0 ? ((totalEstoque / totalCost) * 100).toFixed(1) : '0';
    const avulsoShare = totalCost > 0 ? ((totalAvulso / totalCost) * 100).toFixed(1) : '0';

    return {
      totalCost,
      distinctVehicles,
      distinctSuppliers,
      avgPerVehicle,
      avgPerRecord,
      topVehicle,
      topSupplier,
      topGrc,
      estoqueShare,
      avulsoShare,
      totalCount: combinedData.length
    };
  }, [combinedData, totalGeral, totalEstoque, totalAvulso]);

  // Paginated rows
  const paginatedRows = useMemo(() => {
    if (pageSize === 'all') return groupedData;
    const start = (currentPage - 1) * pageSize;
    return groupedData.slice(start, start + pageSize);
  }, [groupedData, currentPage, pageSize]);

  const totalPages = pageSize === 'all' ? 1 : Math.ceil(groupedData.length / pageSize);

  // Toggle sort
  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    const headers = ['Grupo / Categoria', 'Identificador / Detalhe', 'Lançamentos', 'Custo Estoque (R$)', 'Custo NF Avulso (R$)', 'Custo Total (R$)', '% Participação'];
    const rows = groupedData.map(item => {
      const pct = executiveMetrics.totalCost > 0 ? ((item.total / executiveMetrics.totalCost) * 100).toFixed(2) : '0.00';
      return [
        `"${item.name.replace(/"/g, '""')}"`,
        `"${(item.subName || '').replace(/"/g, '""')}"`,
        item.count,
        item.estoque.toFixed(2),
        item.avulso.toFixed(2),
        item.total.toFixed(2),
        `${pct}%`
      ].join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `relatorio_manutencao_${groupBy}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy Executive Summary text
  const handleCopySummary = () => {
    const text = `📊 RELATÓRIO EXECUTIVO DE MANUTENÇÃO DE FROTA
📅 Data de Emissão: ${new Date().toLocaleDateString('pt-BR')}
💰 Custo Consolidado: R$ ${executiveMetrics.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
📦 Estoque: R$ ${totalEstoque.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${executiveMetrics.estoqueShare}%)
📑 NF Avulso: R$ ${totalAvulso.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${executiveMetrics.avulsoShare}%)
🔢 Lançamentos: ${executiveMetrics.totalCount} registros
🚗 Frotas com Manutenção: ${executiveMetrics.distinctVehicles}
💵 Média por Frota: R$ ${executiveMetrics.avgPerVehicle.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
🏆 Maior Custo por Veículo: ${executiveMetrics.topVehicle.name} (R$ ${executiveMetrics.topVehicle.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
🏢 Principal Fornecedor: ${executiveMetrics.topSupplier.name} (R$ ${executiveMetrics.topSupplier.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
🏷️ Grupo de Compra Predominante: ${executiveMetrics.topGrc.name} (R$ ${executiveMetrics.topGrc.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`;

    navigator.clipboard.writeText(text).then(() => {
      setCopiedSuccess(true);
      setTimeout(() => setCopiedSuccess(false), 2500);
    });
  };

  // Generate and Download PDF Report with customizable elements, Executive Summary and UNI Logo
  const handleGeneratePDF = async (
    action: 'save' | 'print' = 'save',
    opts = {
      includeChart: exportIncludeChart,
      includeKpis: exportIncludeKpis,
      includeTable: exportIncludeTable,
      includeExecutiveSummary: exportIncludeExecutiveSummary,
      reportMode: exportReportMode,
      orientation: exportOrientation
    }
  ) => {
    setIsExportingPdf(true);
    try {
      const isLandscape = opts.orientation === 'landscape';
      const doc = new jsPDF({
        orientation: isLandscape ? 'landscape' : 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const groupLabels: Record<GroupByOption, string> = {
        veiculo: 'Veículo / Frota',
        fornecedor: 'Fornecedor',
        grc: 'Grupo Custo (GRC)',
        gre: 'Grupo Estoque (GRE)',
        grd: 'Grupo Despesa (GRD)',
        mes: 'Mês / Competência',
        material: 'Material / Peça / Serviço'
      };

      const currentDimensionLabel = groupLabels[groupBy] || groupBy;
      const now = new Date();
      const dateFormatted = now.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
      const fileDate = now.toISOString().split('T')[0];

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();

      // 1. Header Banner
      doc.setFillColor(30, 41, 59); // Slate 800
      doc.rect(0, 0, pageWidth, 24, 'F');

      // Top Emerald Accent Stripe
      doc.setFillColor(16, 185, 129); // Emerald 500
      doc.rect(0, 0, pageWidth, 2.5, 'F');

      // Add UNI Logo to Header
      let textStartX = 14;
      try {
        const imgData = await getBase64FromUrl(UNI_LOGO_URL);
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
      doc.setFontSize(12);
      doc.setTextColor(255, 255, 255);
      const headerTitle = opts.reportMode === 'mass_launches' 
        ? 'RELATÓRIO DE LANÇAMENTOS DETALHADOS EM MASSA'
        : 'RELATÓRIO ANALÍTICO & EXECUTIVO DE MANUTENÇÃO';
      doc.text(headerTitle, textStartX, 11);

      // Subtitle
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(203, 213, 225); // Slate 300
      doc.text(`Agrupamento: ${currentDimensionLabel.toUpperCase()} | Filtro: ${typeFilter.toUpperCase()} | Gerado em: ${dateFormatted}`, textStartX, 17);

      // Badge Right
      doc.setFillColor(79, 70, 229); // Indigo 600
      doc.roundedRect(pageWidth - 58, 6, 44, 12, 2, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(255, 255, 255);
      doc.text('GESTÃO DE FROTAS', pageWidth - 36, 13.5, { align: 'center' });

      let currentY = 28;

      // 1.5 SÍNTESE EXECUTIVA AUTOMATIZADA (Card if selected)
      if (opts.includeExecutiveSummary) {
        const summaryCardW = pageWidth - 28;
        const summaryCardH = 22;
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(99, 102, 241);
        doc.setLineWidth(0.4);
        doc.roundedRect(14, currentY, summaryCardW, summaryCardH, 2, 2, 'FD');

        // Left accent bar
        doc.setFillColor(79, 70, 229);
        doc.roundedRect(14, currentY, 3, summaryCardH, 1, 1, 'F');

        // Header Title
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(49, 46, 129);
        doc.text('SÍNTESE EXECUTIVA AUTOMATIZADA', 21, currentY + 4.5);

        // Bullets Line 1
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.5);
        doc.setTextColor(51, 65, 85);
        const bullet1 = `• Custo Total: R$ ${executiveMetrics.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em ${executiveMetrics.totalCount} lançamentos`;
        const bullet2 = `• Estoque: R$ ${totalEstoque.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${executiveMetrics.estoqueShare}%) | NF Avulso: R$ ${totalAvulso.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} (${executiveMetrics.avulsoShare}%)`;
        doc.text(bullet1, 21, currentY + 9.5);
        doc.text(bullet2, 21, currentY + 14);

        // Bullets Line 2
        const bullet3 = `• Frotas Atendidas: ${executiveMetrics.distinctVehicles} veic (Média R$ ${executiveMetrics.avgPerVehicle.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}/veic)`;
        const bullet4 = `• Destaques: Maior Frota [${executiveMetrics.topVehicle.name} - R$ ${executiveMetrics.topVehicle.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}] | Fornecedor Top [${executiveMetrics.topSupplier.name.substring(0, 20)}]`;
        doc.text(bullet3, isLandscape ? pageWidth / 2 : 21, isLandscape ? currentY + 9.5 : currentY + 18);
        if (isLandscape) {
          doc.text(bullet4, pageWidth / 2, currentY + 14);
        }

        currentY += summaryCardH + 3.5;
      }

      // 2. Executive KPI Cards Block (if selected)
      if (opts.includeKpis) {
        const totalCards = isLandscape ? 5 : 3;
        const cardGap = 3;
        const cardWidth = (pageWidth - 28 - (totalCards - 1) * cardGap) / totalCards;
        const cardHeight = 14;

        const cardsData = [
          {
            title: 'CUSTO TOTAL',
            value: `R$ ${executiveMetrics.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            sub: `${executiveMetrics.totalCount} lançamentos`,
            bgColor: [248, 250, 252],
            borderColor: [226, 232, 240],
            textColor: [67, 56, 202]
          },
          {
            title: 'ESTOQUE PRÓPRIO',
            value: `R$ ${totalEstoque.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            sub: `${executiveMetrics.estoqueShare}% do total`,
            bgColor: [240, 253, 244],
            borderColor: [187, 247, 208],
            textColor: [5, 150, 105]
          },
          {
            title: 'NF / AVULSO',
            value: `R$ ${totalAvulso.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            sub: `${executiveMetrics.avulsoShare}% do total`,
            bgColor: [255, 247, 237],
            borderColor: [254, 215, 170],
            textColor: [217, 119, 6]
          },
          {
            title: 'VEÍCULOS ATENDIDOS',
            value: `${executiveMetrics.distinctVehicles}`,
            sub: `Média R$ ${executiveMetrics.avgPerVehicle.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}/veic`,
            bgColor: [245, 243, 255],
            borderColor: [233, 213, 255],
            textColor: [124, 58, 237]
          },
          {
            title: 'FORNECEDORES',
            value: `${executiveMetrics.distinctSuppliers}`,
            sub: `Top: ${executiveMetrics.topSupplier.name.substring(0, 14)}`,
            bgColor: [239, 246, 255],
            borderColor: [191, 219, 254],
            textColor: [37, 99, 235]
          }
        ];

        const cardsToDraw = isLandscape ? cardsData : cardsData.slice(0, 3);

        cardsToDraw.forEach((c, idx) => {
          const x = 14 + idx * (cardWidth + cardGap);
          doc.setFillColor(c.bgColor[0], c.bgColor[1], c.bgColor[2]);
          doc.setDrawColor(c.borderColor[0], c.borderColor[1], c.borderColor[2]);
          doc.setLineWidth(0.3);
          doc.roundedRect(x, currentY, cardWidth, cardHeight, 1.5, 1.5, 'FD');

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(5.5);
          doc.setTextColor(100, 116, 139);
          doc.text(c.title, x + 2.5, currentY + 3.5);

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7.5);
          doc.setTextColor(c.textColor[0], c.textColor[1], c.textColor[2]);
          doc.text(c.value, x + 2.5, currentY + 8);

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(5);
          doc.setTextColor(100, 116, 139);
          doc.text(c.sub, x + 2.5, currentY + 12);
        });

        currentY += cardHeight + 3.5;
      }

      // 3. Mini Visual Distribution / Top Breakdown (if selected)
      if (opts.includeChart && groupedData.length > 0 && opts.reportMode !== 'mass_launches') {
        const topItems = groupedData.slice(0, Math.min(5, groupedData.length));
        const maxVal = topItems[0]?.total || 1;

        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        const chartBlockH = 20;
        doc.roundedRect(14, currentY, pageWidth - 28, chartBlockH, 2, 2, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(30, 41, 59);
        doc.text(`RANKING TOP ${topItems.length} - ${currentDimensionLabel.toUpperCase()} (PARTICIPAÇÃO NO CUSTO)`, 18, currentY + 4.5);

        const barW = (pageWidth - 36) / topItems.length;
        topItems.forEach((it, i) => {
          const itX = 18 + i * barW;
          const pctOfMax = (it.total / maxVal);
          const barMaxH = 8;
          const itH = Math.max(2, barMaxH * pctOfMax);
          const barY = currentY + 15 - itH;

          // Bar Background Track (Subtle Depth)
          doc.setFillColor(241, 245, 249);
          doc.roundedRect(itX, currentY + 7, Math.min(28, barW - 6), barMaxH, 1, 1, 'F');

          // Bar Vibrant Colors Palette
          const pdfBarColors: [number, number, number][] = [
            [37, 99, 235],   // Electric Blue
            [16, 185, 129],  // Neon Emerald
            [245, 158, 11],  // Solar Amber
            [239, 68, 68],   // Crimson Laser
            [139, 92, 246],  // Cyber Violet
            [6, 182, 212]    // Cyan
          ];
          const chosenColor = pdfBarColors[i % pdfBarColors.length];

          // Bar Fill
          doc.setFillColor(chosenColor[0], chosenColor[1], chosenColor[2]);
          doc.roundedRect(itX, barY, Math.min(28, barW - 6), itH, 1, 1, 'F');

          // Label
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(5.5);
          doc.setTextColor(71, 85, 105);
          const shortTitle = it.name.length > 16 ? it.name.substring(0, 15) + '..' : it.name;
          doc.text(shortTitle, itX, currentY + 18);

          // Value
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(5.5);
          doc.setTextColor(chosenColor[0], chosenColor[1], chosenColor[2]);
          const valStr = it.total >= 1000 ? `R$ ${(it.total / 1000).toFixed(1)}k` : `R$ ${it.total.toFixed(0)}`;
          doc.text(valStr, itX, barY - 1);
        });

        currentY += chartBlockH + 3.5;
      }

      // 4. Data Table: Consolidated vs Mass Launches
      if (opts.includeTable) {
        if (opts.reportMode === 'mass_launches') {
          // Flatten all launches across combinedData
          const massTableHeaders = [
            ['#', 'Data', 'Tipo', 'Frota / Placa', 'NF / Doc', 'Fornecedor', 'Material / Descrição', 'Qtd', 'Vlr Unit (R$)', 'Total (R$)', 'Grupo Custo']
          ];

          const massTableBody = combinedData.map((item, idx) => {
            const isEstoque = item.type === 'ESTOQUE' || item.type === 'estoque' || item.TIPO === 'ESTOQUE';
            const rawVal = Number(item._rawValue || item.VALORITEM || item.val || item.value || item.VALORTOTAL || 0) || 0;
            const qtd = Number(item.QUANTIDADE || item.QTD || item.qtd || 1) || 1;
            const vlrUnit = Number(item.VALORUNITARIO || item.VLRUNIT || (qtd > 0 ? rawVal / qtd : rawVal)) || 0;
            const prefix = String(item.PREFIXOVEIC || item.FROTA || item.prefix || 'N/A').trim();
            const placa = String(item.PLACA || item.placa || '-').trim();
            const nf = String(item.NRDOCTO || item.NUMERODOC || item.NUMNF || item.nro_docto || item.CODIGOMATAVULSO || '-').trim();
            const fornecedor = String(item.rsocialforn || item.RSOCIALFORN || item.fornecedor || (isEstoque ? 'Estoque Próprio' : 'Fornecedor Externo')).trim();
            const material = String(item.DESCRICAONFSERVICO || item.DESCRICAOMAT || item.descricao || item.material_desc || '-').trim();
            const dataStr = String(item.EMISSAO || item.DATA || item.datamov || item.MES_ANO || item.mesAno || '-').trim();
            const grc = String(item.DESCRICAOGRC || item.descricaogrc || item.grc || '-').trim();

            return [
              String(idx + 1),
              dataStr,
              isEstoque ? 'ESTOQUE' : 'NF AVULSO',
              placa && placa !== '-' ? `${prefix} (${placa})` : prefix,
              nf,
              fornecedor.length > 22 ? fornecedor.substring(0, 21) + '..' : fornecedor,
              material.length > 32 ? material.substring(0, 31) + '..' : material,
              String(qtd),
              vlrUnit.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
              rawVal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
              grc.length > 16 ? grc.substring(0, 15) + '..' : grc
            ];
          });

          massTableBody.push([
            'TOTAL',
            '-',
            `${combinedData.length} itens`,
            `${executiveMetrics.distinctVehicles} frotas`,
            '-',
            '-',
            'SOMATÓRIO TOTAL DE LANÇAMENTOS',
            '-',
            '-',
            executiveMetrics.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            '-'
          ]);

          autoTable(doc, {
            head: massTableHeaders,
            body: massTableBody,
            startY: currentY,
            margin: { left: 14, right: 14, top: 14, bottom: 16 },
            styles: {
              font: 'helvetica',
              fontSize: 6.8,
              cellPadding: 1.6,
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
              1: { cellWidth: 17 },
              2: { cellWidth: 17, fontStyle: 'bold' },
              3: { cellWidth: 26, fontStyle: 'bold' },
              4: { cellWidth: 18 },
              5: { cellWidth: 38 },
              6: { cellWidth: 'auto' },
              7: { cellWidth: 9, halign: 'center' },
              8: { cellWidth: 19, halign: 'right' },
              9: { cellWidth: 22, halign: 'right', fontStyle: 'bold', textColor: [67, 56, 202] },
              10: { cellWidth: 24 }
            },
            alternateRowStyles: {
              fillColor: [248, 250, 252]
            },
            didParseCell: (data) => {
              if (data.row.index === massTableBody.length - 1) {
                data.cell.styles.fillColor = [224, 231, 255];
                data.cell.styles.fontStyle = 'bold';
                data.cell.styles.textColor = [30, 27, 75];
              }
            },
            didDrawPage: (data) => {
              const pageCount = (doc as any).internal.getNumberOfPages();
              doc.setFont('helvetica', 'normal');
              doc.setFontSize(7);
              doc.setTextColor(148, 163, 184);
              doc.text(
                `Sistema UNI • Gestão de Frotas • Lançamentos em Massa de Manutenção • Página ${data.pageNumber} de ${pageCount}`,
                pageWidth / 2,
                pageHeight - 6,
                { align: 'center' }
              );
            }
          });
        } else {
          // Standard Consolidated Mode
          const tableHeaders = [
            ['#', currentDimensionLabel, 'Identificador / Detalhe', 'Lançamentos', 'Estoque Próprio (R$)', 'NF / Avulso (R$)', 'Custo Total (R$)', '% Part.']
          ];

          const tableBody = groupedData.map((row, index) => {
            const pct = executiveMetrics.totalCost > 0 ? ((row.total / executiveMetrics.totalCost) * 100).toFixed(2) + '%' : '0.00%';
            return [
              String(index + 1),
              row.name || '-',
              row.subName || '-',
              String(row.count),
              row.estoque.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
              row.avulso.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
              row.total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
              pct
            ];
          });

          // Add Total Footer row
          const totalEstoqueSum = groupedData.reduce((acc, r) => acc + r.estoque, 0);
          const totalAvulsoSum = groupedData.reduce((acc, r) => acc + r.avulso, 0);
          const totalCostSum = groupedData.reduce((acc, r) => acc + r.total, 0);
          const totalCountSum = groupedData.reduce((acc, r) => acc + r.count, 0);

          tableBody.push([
            'TOTAL',
            `CONSOLIDADO GERAL (${groupedData.length} registros)`,
            '-',
            String(totalCountSum),
            totalEstoqueSum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            totalAvulsoSum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            totalCostSum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
            '100.00%'
          ]);

          autoTable(doc, {
            head: tableHeaders,
            body: tableBody,
            startY: currentY,
            margin: { left: 14, right: 14, top: 14, bottom: 16 },
            styles: {
              font: 'helvetica',
              fontSize: 7.5,
              cellPadding: 2,
              overflow: 'linebreak',
              textColor: [30, 41, 59]
            },
            headStyles: {
              fillColor: [30, 41, 59],
              textColor: [255, 255, 255],
              fontStyle: 'bold',
              fontSize: 8,
              halign: 'left'
            },
            columnStyles: {
              0: { cellWidth: 10, halign: 'center' },
              1: { cellWidth: 'auto', fontStyle: 'bold' },
              2: { cellWidth: isLandscape ? 35 : 24, textColor: [100, 116, 139] },
              3: { cellWidth: isLandscape ? 22 : 16, halign: 'center' },
              4: { cellWidth: isLandscape ? 32 : 24, halign: 'right', textColor: [5, 150, 105] },
              5: { cellWidth: isLandscape ? 32 : 24, halign: 'right', textColor: [217, 119, 6] },
              6: { cellWidth: isLandscape ? 36 : 28, halign: 'right', fontStyle: 'bold', textColor: [67, 56, 202] },
              7: { cellWidth: isLandscape ? 18 : 15, halign: 'right', fontStyle: 'bold' }
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
            },
            didDrawPage: (data) => {
              const pageCount = (doc as any).internal.getNumberOfPages();
              doc.setFont('helvetica', 'normal');
              doc.setFontSize(7);
              doc.setTextColor(148, 163, 184);
              doc.text(
                `Sistema UNI • Gestão de Frotas • Relatório de Manutenção • Página ${data.pageNumber} de ${pageCount}`,
                pageWidth / 2,
                pageHeight - 6,
                { align: 'center' }
              );
            }
          });
        }
      }

      if (action === 'print') {
        const blobUrl = doc.output('bloburl');
        const printWindow = window.open(blobUrl, '_blank');
        if (printWindow) {
          printWindow.focus();
        } else {
          doc.save(`Relatorio_Manutencao_${groupBy}_${fileDate}.pdf`);
        }
      } else {
        doc.save(`Relatorio_Manutencao_${groupBy}_${fileDate}.pdf`);
      }
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Ocorreu um erro ao processar o relatório em PDF.');
    } finally {
      setIsExportingPdf(false);
      setShowExportModal(false);
    }
  };

  // Dedicated Print Report using jsPDF & user-selected components
  const handlePrintReport = (opts = {
    includeChart: exportIncludeChart,
    includeKpis: exportIncludeKpis,
    includeTable: exportIncludeTable,
    includeExecutiveSummary: exportIncludeExecutiveSummary,
    reportMode: exportReportMode,
    orientation: exportOrientation
  }) => {
    try {
      handleGeneratePDF('print', opts);
    } catch (e) {
      console.error('Print Error:', e);
      handleGeneratePDF('save', opts);
    } finally {
      setShowExportModal(false);
    }
  };

  const groupByLabels: Record<GroupByOption, { label: string; icon: React.ReactNode }> = {
    veiculo: { label: 'Por Veículo / Frota', icon: <Truck size={14} /> },
    fornecedor: { label: 'Por Fornecedor', icon: <Building2 size={14} /> },
    grc: { label: 'Grupo de Compra (GRC)', icon: <ShoppingBag size={14} /> },
    gre: { label: 'Grupo Estoque (GRE)', icon: <Layers size={14} /> },
    grd: { label: 'Grupo Despesa (GRD)', icon: <Layers size={14} /> },
    mes: { label: 'Por Mês / Período', icon: <Calendar size={14} /> },
    material: { label: 'Por Material / Serviço', icon: <Wrench size={14} /> }
  };

  return (
    <div id="dynamic-maintenance-report" className="space-y-6 pt-4">
      {/* Main Container Card */}
      <div className={`p-6 md:p-8 rounded-3xl border shadow-sm transition-all ${
        isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-900'
      }`}>
        
        {/* Header Ribbon with Actions */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-100">
          <div className="flex items-start gap-4">
            <div className="p-3 bg-gradient-to-br from-indigo-500 to-indigo-700 text-white rounded-2xl shadow-md shadow-indigo-500/20 shrink-0">
              <BarChart3 size={24} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl font-extrabold tracking-tight">
                  Relatório Analítico & Executivo de Manutenção
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                  Consolidação Dinâmica
                </span>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                  <Sparkles size={11} /> 100% Filtrável
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1 max-w-2xl font-medium">
                Visão detalhada e gerencial de custos consolidados extraídos dos gráficos e tabelas com agrupamentos customizáveis, indicadores de Pareto e exportação imediata.
              </p>
            </div>
          </div>

          {/* Action Toolbar */}
          <div className="flex items-center gap-2.5 flex-wrap shrink-0">
            <button
              onClick={() => {
                setDrilldownModalData({
                  title: `Todos os Lançamentos do Sistema (${typeFilter.toUpperCase()})`,
                  subtitle: `${combinedData.length} registros individuais carregados para auditoria e impressão em massa`,
                  items: combinedData
                });
              }}
              className="px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm shadow-purple-600/20 cursor-pointer"
              title="Visualizar, filtrar e explodir todos os lançamentos individuais do sistema"
            >
              <Layers size={14} />
              <span>Explodir Lançamentos ({combinedData.length})</span>
            </button>

            <button
              onClick={handleCopySummary}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border shadow-2xs cursor-pointer ${
                copiedSuccess 
                  ? 'bg-emerald-500 text-white border-emerald-600' 
                  : isDark 
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700' 
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
              title="Copiar Resumo Executivo para Área de Transferência"
            >
              {copiedSuccess ? <Check size={14} /> : <Copy size={14} />}
              <span>{copiedSuccess ? 'Copiado!' : 'Copiar Resumo'}</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm shadow-emerald-600/20 cursor-pointer"
              title="Baixar planilha CSV com os dados agrupados"
            >
              <Download size={14} />
              <span>Exportar CSV</span>
            </button>

            <button
              onClick={() => {
                setDefaultAction('save');
                setShowExportModal(true);
              }}
              disabled={isExportingPdf}
              className="px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm shadow-blue-600/20 cursor-pointer disabled:opacity-50"
              title="Salvar e baixar relatório executivo como PDF formatado"
            >
              {isExportingPdf ? <Loader2 size={14} className="animate-spin" /> : <FileText size={14} />}
              <span>Salvar PDF</span>
            </button>

            <button
              onClick={() => {
                setDefaultAction('print');
                setShowExportModal(true);
              }}
              disabled={isExportingPdf}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm shadow-indigo-600/20 cursor-pointer print:hidden disabled:opacity-50"
              title="Imprimir Relatório formatado em A4"
            >
              <Printer size={14} />
              <span>Imprimir Relatório</span>
            </button>

            <button
              onClick={() => setShowExportModal(true)}
              className={`p-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center border shadow-2xs cursor-pointer ${
                isDark 
                  ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700' 
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
              title="Opções personalizadas de exportação (selecionar gráficos, cards, orientação)"
            >
              <SlidersHorizontal size={15} />
            </button>
          </div>
        </div>

        {/* Executive Highlights Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5 my-6">
          {/* Card 1: Total Investido */}
          <div className={`p-4 rounded-2xl border transition-all ${
            isDark ? 'bg-slate-800/60 border-slate-700/60' : 'bg-slate-50/70 border-slate-100'
          }`}>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
              Custo Total
            </span>
            <div className="text-base sm:text-lg font-black text-indigo-600">
              R$ {executiveMetrics.totalCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-slate-500 font-bold mt-0.5 block">
              {executiveMetrics.totalCount} lançamentos
            </span>
          </div>

          {/* Card 2: Estoque */}
          <div className={`p-4 rounded-2xl border transition-all ${
            isDark ? 'bg-slate-800/60 border-slate-700/60' : 'bg-slate-50/70 border-slate-100'
          }`}>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
              Estoque Próprio
            </span>
            <div className="text-base sm:text-lg font-black text-emerald-600">
              R$ {totalEstoque.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-1.5 py-0.2 rounded w-fit inline-block mt-0.5">
              {executiveMetrics.estoqueShare}% do total
            </span>
          </div>

          {/* Card 3: NF Avulso */}
          <div className={`p-4 rounded-2xl border transition-all ${
            isDark ? 'bg-slate-800/60 border-slate-700/60' : 'bg-slate-50/70 border-slate-100'
          }`}>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
              NF Avulso (Terceiros)
            </span>
            <div className="text-base sm:text-lg font-black text-blue-600">
              R$ {totalAvulso.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] font-bold text-blue-700 bg-blue-100/70 px-1.5 py-0.2 rounded w-fit inline-block mt-0.5">
              {executiveMetrics.avulsoShare}% do total
            </span>
          </div>

          {/* Card 4: Média por Frota */}
          <div className={`p-4 rounded-2xl border transition-all ${
            isDark ? 'bg-slate-800/60 border-slate-700/60' : 'bg-slate-50/70 border-slate-100'
          }`}>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
              Média por Frota
            </span>
            <div className="text-base sm:text-lg font-black text-slate-800">
              R$ {executiveMetrics.avgPerVehicle.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <span className="text-[10px] text-slate-500 font-medium mt-0.5 block">
              {executiveMetrics.distinctVehicles} frotas ativas
            </span>
          </div>

          {/* Card 5: Top Veículo */}
          <div className={`p-4 rounded-2xl border transition-all ${
            isDark ? 'bg-slate-800/60 border-slate-700/60' : 'bg-slate-50/70 border-slate-100'
          }`}>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
              Maior Despesa (Frota)
            </span>
            <div className="text-base sm:text-lg font-black text-rose-600 truncate" title={executiveMetrics.topVehicle.name}>
              {executiveMetrics.topVehicle.name}
            </div>
            <span className="text-[10px] font-bold text-rose-700 bg-rose-100/70 px-1.5 py-0.2 rounded w-fit inline-block mt-0.5">
              R$ {executiveMetrics.topVehicle.value.toLocaleString('pt-BR', { notation: 'compact' })}
            </span>
          </div>

          {/* Card 6: Top Fornecedor */}
          <div className={`p-4 rounded-2xl border transition-all ${
            isDark ? 'bg-slate-800/60 border-slate-700/60' : 'bg-slate-50/70 border-slate-100'
          }`}>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">
              Fornecedor Líder
            </span>
            <div className="text-sm sm:text-base font-black text-amber-600 truncate" title={executiveMetrics.topSupplier.name}>
              {executiveMetrics.topSupplier.name}
            </div>
            <span className="text-[10px] font-bold text-amber-800 bg-amber-100/70 px-1.5 py-0.2 rounded w-fit inline-block mt-0.5">
              R$ {executiveMetrics.topSupplier.value.toLocaleString('pt-BR', { notation: 'compact' })}
            </span>
          </div>
        </div>

        {/* Smart Automated Management Insights (Executive Bullet Points) */}
        <div className={`p-4 md:p-5 rounded-2xl border mb-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
          isDark ? 'bg-indigo-950/40 border-indigo-900/60 text-indigo-100' : 'bg-indigo-50/60 border-indigo-100/80 text-indigo-950'
        }`}>
          <div className="flex items-start gap-3">
            <div className="p-2 bg-indigo-600 text-white rounded-xl shadow-xs shrink-0 mt-0.5">
              <Sparkles size={16} />
            </div>
            <div className="space-y-1 text-xs">
              <h4 className="font-extrabold uppercase tracking-wide text-indigo-900 flex items-center gap-1.5">
                Síntese Executiva Automatizada:
              </h4>
              <p className="text-slate-700 leading-relaxed font-medium">
                • A frota <strong className="text-indigo-900 font-bold">{executiveMetrics.topVehicle.name}</strong> é o principal centro de custo no período (R$ {executiveMetrics.topVehicle.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}).
                {executiveMetrics.topSupplier.name !== '-' && (
                  <span> • O parceiro comercial <strong className="text-indigo-900 font-bold">{executiveMetrics.topSupplier.name}</strong> concentra o maior faturamento de notas avulsas.</span>
                )}
                {executiveMetrics.topGrc.name !== '-' && (
                  <span> • O grupo de custo <strong className="text-indigo-900 font-bold">{executiveMetrics.topGrc.name}</strong> é a categoria predominante.</span>
                )}
                <span> • Custo médio por lançamento: <strong className="text-indigo-900 font-bold">R$ {executiveMetrics.avgPerRecord.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong>.</span>
              </p>
            </div>
          </div>
        </div>

        {/* Grouping Dimension Switcher Tabs */}
        <div className="space-y-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-2xl border border-slate-200/80 flex-wrap">
              {(Object.keys(groupByLabels) as GroupByOption[]).map((key) => {
                const isSelected = groupBy === key;
                return (
                  <button
                    key={key}
                    onClick={() => {
                      setGroupBy(key);
                      setCurrentPage(1);
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                      isSelected 
                        ? 'bg-white text-indigo-700 shadow-xs border border-slate-200/80' 
                        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/50'
                    }`}
                  >
                    {groupByLabels[key].icon}
                    <span>{groupByLabels[key].label}</span>
                  </button>
                );
              })}
            </div>

            {/* Type Filter Buttons (Todos, Estoque, Avulso) */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
              <button
                onClick={() => { setTypeFilter('all'); setCurrentPage(1); }}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  typeFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Todos ({combinedData.length})
              </button>
              <button
                onClick={() => { setTypeFilter('estoque'); setCurrentPage(1); }}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  typeFilter === 'estoque' ? 'bg-emerald-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Estoque
              </button>
              <button
                onClick={() => { setTypeFilter('avulso'); setCurrentPage(1); }}
                className={`px-2.5 py-1 rounded-lg transition-all ${
                  typeFilter === 'avulso' ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                NF Avulso
              </button>
            </div>
          </div>

          {/* Search bar and Rows Per Page */}
          <div className="flex items-center justify-between gap-4 flex-wrap pt-2">
            <div className="relative flex-1 min-w-[240px] max-w-md">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder={`Buscar em ${groupByLabels[groupBy].label}...`}
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl outline-none focus:bg-white focus:border-indigo-500 transition-all font-medium"
              />
              {searchTerm && (
                <button
                  onClick={() => setSearchTerm('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center gap-3 text-xs font-bold text-slate-500">
              <span>{groupedData.length} registros agrupados</span>
              <div className="flex items-center gap-1">
                <span>Exibir:</span>
                <select
                  value={pageSize}
                  onChange={(e) => {
                    const val = e.target.value === 'all' ? 'all' : Number(e.target.value);
                    setPageSize(val);
                    setCurrentPage(1);
                  }}
                  className="bg-slate-100 border border-slate-200 rounded-lg px-2 py-1 text-xs font-bold outline-none cursor-pointer"
                >
                  <option value={15}>15 linhas</option>
                  <option value={30}>30 linhas</option>
                  <option value={50}>50 linhas</option>
                  <option value="all">Todas</option>
                </select>
              </div>
            </div>
          </div>

          {/* Dynamic Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-2xs custom-scrollbar">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-extrabold uppercase text-[10px] tracking-wider border-b border-slate-200 select-none">
                <tr>
                  <th 
                    onClick={() => handleSort('name')}
                    className="py-3.5 px-4 cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>{groupByLabels[groupBy].label}</span>
                      {sortField === 'name' ? (sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} className="text-slate-300" />}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('count')}
                    className="py-3.5 px-4 text-center cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>Lançamentos</span>
                      {sortField === 'count' ? (sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} className="text-slate-300" />}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('estoque')}
                    className="py-3.5 px-4 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Custo Estoque</span>
                      {sortField === 'estoque' ? (sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} className="text-slate-300" />}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('avulso')}
                    className="py-3.5 px-4 text-right cursor-pointer hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Custo NF Avulso</span>
                      {sortField === 'avulso' ? (sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} className="text-slate-300" />}
                    </div>
                  </th>
                  <th 
                    onClick={() => handleSort('total')}
                    className="py-3.5 px-4 text-right cursor-pointer hover:bg-slate-100 transition-colors bg-indigo-50/50"
                  >
                    <div className="flex items-center justify-end gap-1 text-indigo-900">
                      <span>Custo Consolidado</span>
                      {sortField === 'total' ? (sortOrder === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : <ArrowUpDown size={12} className="text-slate-300" />}
                    </div>
                  </th>
                  <th className="py-3.5 px-4 text-center w-[160px]">
                    % Participação
                  </th>
                  <th className="py-3.5 px-4 text-center w-[100px] print:hidden">
                    Ação
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {paginatedRows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                      Nenhum registro encontrado para os critérios selecionados.
                    </td>
                  </tr>
                ) : (
                  paginatedRows.map((row, idx) => {
                    const pctOfTotal = executiveMetrics.totalCost > 0 ? ((row.total / executiveMetrics.totalCost) * 100) : 0;
                    const isHighImpact = pctOfTotal >= 10;
                    const isMedImpact = pctOfTotal >= 3 && pctOfTotal < 10;

                    return (
                      <tr 
                        key={row.key || idx}
                        className="hover:bg-slate-50/80 transition-colors group"
                      >
                        {/* Group Name & SubName */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-600 text-[10px] font-black flex items-center justify-center shrink-0">
                              {(currentPage - 1) * (pageSize === 'all' ? 0 : pageSize) + idx + 1}
                            </span>
                            <div>
                              <div className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                                {row.name}
                              </div>
                              {row.subName && (
                                <div className="text-[10px] text-slate-400 font-semibold">
                                  {row.subName}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Record count with breakdown */}
                        <td className="py-3 px-4 text-center">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-bold">
                            {row.count}
                          </span>
                        </td>

                        {/* Estoque */}
                        <td className="py-3 px-4 text-right font-mono text-emerald-700 font-semibold">
                          {row.estoque > 0 ? (
                            `R$ ${row.estoque.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>

                        {/* Avulso */}
                        <td className="py-3 px-4 text-right font-mono text-blue-700 font-semibold">
                          {row.avulso > 0 ? (
                            `R$ ${row.avulso.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>

                        {/* Total */}
                        <td className="py-3 px-4 text-right font-mono font-black text-indigo-700 bg-indigo-50/20">
                          R$ {row.total.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>

                        {/* Visual Progress Bar & % */}
                        <td className="py-3 px-4">
                          <div className="space-y-1">
                            <div className="flex items-center justify-between text-[10px] font-bold">
                              <span className={isHighImpact ? 'text-rose-600' : isMedImpact ? 'text-amber-600' : 'text-slate-600'}>
                                {pctOfTotal.toFixed(1)}%
                              </span>
                              {isHighImpact && (
                                <span className="text-[9px] bg-rose-50 text-rose-700 font-extrabold px-1 rounded">
                                  Alto Impacto
                                </span>
                              )}
                            </div>
                            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all duration-300 ${
                                  isHighImpact 
                                    ? 'bg-gradient-to-r from-rose-500 to-rose-600' 
                                    : isMedImpact 
                                      ? 'bg-gradient-to-r from-amber-500 to-indigo-500' 
                                      : 'bg-gradient-to-r from-indigo-500 to-emerald-500'
                                }`}
                                style={{ width: `${Math.min(100, Math.max(2, pctOfTotal))}%` }}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Drilldown button */}
                        <td className="py-3 px-4 text-center print:hidden">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => {
                                const matchingItems = (row.rawItems && row.rawItems.length > 0)
                                  ? row.rawItems
                                  : combinedData.filter(item => {
                                    if (groupBy === 'veiculo') {
                                      const rawPrefix = String(item.PREFIXOVEIC || item.FROTA || item.prefix || '').trim();
                                      const isSemVeic = !rawPrefix || rawPrefix === 'N/A' || rawPrefix === 'Sem Veic' || rawPrefix === '0' || rawPrefix === 'SEM PLACA';
                                      if (isSemVeic) {
                                        const grc = String(item.DESCRICAOGRC || item.descricaogrc || item.grc || '').trim().toLowerCase();
                                        if (row.key === 'Sem Veículo - Suprimentos') return grc === 'suprimentos';
                                        if (row.key === 'Sem Veículo - Oficina') return grc === 'oficina';
                                        return row.key.includes(grc);
                                      }
                                      const placa = String(item.PLACA || item.placa || '').trim();
                                      return rawPrefix === row.key || placa === row.key || row.name.includes(rawPrefix) || (placa && row.name.includes(placa));
                                    }
                                    if (groupBy === 'fornecedor') {
                                      const isEstoque = item.type === 'ESTOQUE' || item.type === 'estoque' || item.TIPO === 'ESTOQUE';
                                      const forn = String(item.rsocialforn || item.RSOCIALFORN || item.fornecedor || (isEstoque ? 'ESTOQUE PRÓPRIO' : 'FORNECEDOR EXTERNO')).trim();
                                      return forn.toUpperCase() === row.key.toUpperCase();
                                    }
                                    if (groupBy === 'grc') {
                                      const grc = String(item.DESCRICAOGRC || item.descricaogrc || item.grc || item.GRUPO_CUSTO || 'OUTROS').trim();
                                      return grc.toUpperCase() === row.key.toUpperCase();
                                    }
                                    if (groupBy === 'gre') {
                                      const gre = String(item.DESCRICAOGRE || item.descricaogre || item.gre || item.GRUPO_ESTOQUE || 'OUTROS').trim();
                                      return gre.toUpperCase() === row.key.toUpperCase();
                                    }
                                    if (groupBy === 'grd') {
                                      const grd = String(item.DESCRICAOGRD || item.descricaogrd || item.grd || item.GRUPO_DESPESA || 'OUTROS').trim();
                                      return grd.toUpperCase() === row.key.toUpperCase();
                                    }
                                    if (groupBy === 'mes') {
                                      const mes = String(item.MES_ANO || item.mesAno || item.EMISSAO || item.DATA || '').substring(0, 7);
                                      return mes === row.key || String(item.MES_ANO || '').trim() === row.key;
                                    }
                                    if (groupBy === 'material') {
                                      const mat = String(item.DESCRICAONFSERVICO || item.DESCRICAOMAT || item.descricao || item.material_desc || 'OUTROS').trim();
                                      return mat.toUpperCase() === row.key.toUpperCase();
                                    }
                                    return true;
                                  });

                                setDrilldownModalData({
                                  title: `Detalhamento: ${row.name}`,
                                  subtitle: `${matchingItems.length > 0 ? matchingItems.length : row.count} lançamentos • Custo Total: R$ ${row.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`,
                                  items: matchingItems.length > 0 ? matchingItems : combinedData
                                });
                              }}
                              className="px-2.5 py-1 bg-purple-50 hover:bg-purple-600 hover:text-white text-purple-700 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1 border border-purple-200 hover:border-purple-600 cursor-pointer shadow-2xs"
                              title={`Explodir lançamentos do sistema de ${row.name}`}
                            >
                              <Layers size={11} />
                              <span>Explodir ({row.count})</span>
                            </button>

                            {groupBy === 'veiculo' && onSelectVehicle && (
                              <button
                                onClick={() => onSelectVehicle(row.key)}
                                className="px-2 py-1 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 rounded-lg text-[10px] font-bold transition-all flex items-center justify-center gap-1 border border-slate-200/80 hover:border-indigo-200 cursor-pointer shadow-2xs"
                                title={`Abrir Auditoria da Frota ${row.key}`}
                              >
                                <Maximize2 size={11} />
                                <span>Auditar</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>

              {/* Table Footer with Totals */}
              {groupedData.length > 0 && (
                <tfoot className="bg-slate-100/80 font-black text-slate-900 border-t-2 border-slate-300 text-xs">
                  <tr>
                    <td className="py-3.5 px-4">
                      TOTAL CONSOLIDADO ({groupedData.length} grupos)
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {groupedData.reduce((acc, curr) => acc + curr.count, 0)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-emerald-700">
                      R$ {groupedData.reduce((acc, curr) => acc + curr.estoque, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-blue-700">
                      R$ {groupedData.reduce((acc, curr) => acc + curr.avulso, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-indigo-700 bg-indigo-100/40 text-sm">
                      R$ {groupedData.reduce((acc, curr) => acc + curr.total, 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold">
                      100.0%
                    </td>
                    <td className="py-3.5 px-4 print:hidden"></td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-3 flex-wrap gap-2 text-xs font-bold text-slate-500">
              <span>
                Página {currentPage} de {totalPages} ({groupedData.length} registros no total)
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:pointer-events-none rounded-lg transition-all"
                >
                  Anterior
                </button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    let pageNum = i + 1;
                    if (totalPages > 5 && currentPage > 3) {
                      pageNum = currentPage - 2 + i;
                      if (pageNum > totalPages) pageNum = totalPages - (4 - i);
                    }
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`w-7 h-7 rounded-lg transition-all flex items-center justify-center font-bold ${
                          currentPage === pageNum 
                            ? 'bg-indigo-600 text-white shadow-xs' 
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:pointer-events-none rounded-lg transition-all"
                >
                  Próxima
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* Modal de Exportação Personalizada (Similar ao Módulo de Média de Consumo) */}
      <AnimatePresence>
        {showExportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.18 }}
              className={`w-full max-w-lg rounded-3xl shadow-2xl border overflow-hidden ${
                isDark ? 'bg-slate-900 border-slate-800 text-white' : 'bg-white border-slate-100 text-slate-900'
              }`}
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between p-6 border-b border-slate-100">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl">
                    <LayoutTemplate size={20} />
                  </div>
                  <div>
                    <h3 className="text-base font-black tracking-tight">
                      Opções de Exportação & Impressão
                    </h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">
                      Personalize os elementos visuais e modo de relatório .PDF
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowExportModal(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-all cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
                {/* Mode Selector */}
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-2">
                    Modo do Relatório .PDF
                  </span>
                  <div className="grid grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={() => setExportReportMode('consolidated')}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        exportReportMode === 'consolidated'
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-900 font-bold'
                          : isDark ? 'border-slate-700 bg-slate-800 text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="text-xs font-black">Consolidado Gerencial</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Por grupos com totais e médias</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setExportReportMode('mass_launches')}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        exportReportMode === 'mass_launches'
                          ? 'border-purple-600 bg-purple-50 text-purple-900 font-bold'
                          : isDark ? 'border-slate-700 bg-slate-800 text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="text-xs font-black">Lançamentos em Massa</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Todos os itens individuais ({combinedData.length})</div>
                    </button>
                  </div>
                </div>

                {/* Element selection toggles */}
                <div className="space-y-2.5">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block">
                    Elementos para Incluir
                  </span>

                  {/* Toggle 0: Síntese Executiva Automatizada */}
                  <label className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
                    exportIncludeExecutiveSummary 
                      ? 'bg-purple-50/60 border-purple-200 text-purple-950' 
                      : isDark ? 'bg-slate-800/40 border-slate-700/60 text-slate-400' : 'bg-slate-50/60 border-slate-200 text-slate-600'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${
                        exportIncludeExecutiveSummary ? 'bg-purple-600 text-white' : 'bg-slate-200 text-slate-500'
                      }`}>
                        <Sparkles size={15} />
                      </div>
                      <div>
                        <div className="text-xs font-bold">Card Síntese Executiva Automatizada</div>
                        <div className="text-[11px] text-slate-500 font-medium">Resumo estratégico em texto com frotas e fornecedor top</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={exportIncludeExecutiveSummary}
                      onChange={(e) => setExportIncludeExecutiveSummary(e.target.checked)}
                      className="w-4 h-4 text-purple-600 rounded focus:ring-purple-500 cursor-pointer"
                    />
                  </label>

                  {/* Toggle 1: Cards Executivos */}
                  <label className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
                    exportIncludeKpis 
                      ? 'bg-indigo-50/50 border-indigo-200 text-indigo-950' 
                      : isDark ? 'bg-slate-800/40 border-slate-700/60 text-slate-400' : 'bg-slate-50/60 border-slate-200 text-slate-600'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs ${
                        exportIncludeKpis ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'
                      }`}>
                        KPI
                      </div>
                      <div>
                        <div className="text-xs font-bold">Cards de Indicadores Executivos</div>
                        <div className="text-[11px] text-slate-500 font-medium">Custo Total, Estoque, Avulso, Veículos e Fornecedores</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={exportIncludeKpis}
                      onChange={(e) => setExportIncludeKpis(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                    />
                  </label>

                  {/* Toggle 2: Gráficos / Ranking Top */}
                  <label className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
                    exportIncludeChart 
                      ? 'bg-indigo-50/50 border-indigo-200 text-indigo-950' 
                      : isDark ? 'bg-slate-800/40 border-slate-700/60 text-slate-400' : 'bg-slate-50/60 border-slate-200 text-slate-600'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                        exportIncludeChart ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'
                      }`}>
                        <BarChart3 size={16} />
                      </div>
                      <div>
                        <div className="text-xs font-bold">Gráfico de Distribuição / Top Participações</div>
                        <div className="text-[11px] text-slate-500 font-medium">Visualização em barras dos maiores centros de custo</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={exportIncludeChart}
                      onChange={(e) => setExportIncludeChart(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                    />
                  </label>

                  {/* Toggle 3: Tabela Analítica */}
                  <label className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
                    exportIncludeTable 
                      ? 'bg-indigo-50/50 border-indigo-200 text-indigo-950' 
                      : isDark ? 'bg-slate-800/40 border-slate-700/60 text-slate-400' : 'bg-slate-50/60 border-slate-200 text-slate-600'
                  }`}>
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                        exportIncludeTable ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500'
                      }`}>
                        <FileText size={16} />
                      </div>
                      <div>
                        <div className="text-xs font-bold">Tabela Analítica / Lançamentos</div>
                        <div className="text-[11px] text-slate-500 font-medium">Listagem detalhada com valores, percentuais e somatório geral</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={exportIncludeTable}
                      onChange={(e) => setExportIncludeTable(e.target.checked)}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500 cursor-pointer"
                    />
                  </label>
                </div>

                {/* Orientation Selector */}
                <div>
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-400 block mb-2">
                    Orientação da Página (A4)
                  </span>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setExportOrientation('landscape')}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        exportOrientation === 'landscape'
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-900 font-bold'
                          : isDark ? 'border-slate-700 bg-slate-800 text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="text-xs font-black">Paisagem (Horizontal)</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Recomendado para tabelas amplas</div>
                    </button>
                    <button
                      type="button"
                      onClick={() => setExportOrientation('portrait')}
                      className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                        exportOrientation === 'portrait'
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-900 font-bold'
                          : isDark ? 'border-slate-700 bg-slate-800 text-slate-300' : 'border-slate-200 bg-slate-50 text-slate-700'
                      }`}
                    >
                      <div className="text-xs font-black">Retrato (Vertical)</div>
                      <div className="text-[10px] text-slate-500 mt-0.5">Formato padrão de documento</div>
                    </button>
                  </div>
                </div>

                {/* Logo indicator */}
                <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-800 rounded-2xl text-[11px] font-medium border border-emerald-100">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                  <span>Cabeçalho oficial com <strong>Logo UNI</strong> inserido automaticamente em alta definição.</span>
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="flex items-center justify-end gap-2.5 p-6 border-t border-slate-100 bg-slate-50/50">
                <button
                  type="button"
                  onClick={() => setShowExportModal(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={() => handlePrintReport({
                    includeChart: exportIncludeChart,
                    includeKpis: exportIncludeKpis,
                    includeTable: exportIncludeTable,
                    includeExecutiveSummary: exportIncludeExecutiveSummary,
                    reportMode: exportReportMode,
                    orientation: exportOrientation
                  })}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Printer size={14} />
                  <span>Imprimir Agora</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleGeneratePDF('save', {
                    includeChart: exportIncludeChart,
                    includeKpis: exportIncludeKpis,
                    includeTable: exportIncludeTable,
                    includeExecutiveSummary: exportIncludeExecutiveSummary,
                    reportMode: exportReportMode,
                    orientation: exportOrientation
                  })}
                  disabled={isExportingPdf}
                  className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-md shadow-indigo-600/20 cursor-pointer disabled:opacity-50"
                >
                  {isExportingPdf ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                  <span>{isExportingPdf ? 'Gerando...' : 'Baixar Relatório (PDF)'}</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Explosion / Detailed Launches Drill-down Modal */}
      {drilldownModalData && (
        <MaintenanceExplosionModal
          isOpen={!!drilldownModalData}
          onClose={() => setDrilldownModalData(null)}
          title={drilldownModalData.title}
          subtitle={drilldownModalData.subtitle}
          items={drilldownModalData.items}
          isDark={isDark}
          onPrintDirectly={() => {
            handleGeneratePDF('print', {
              includeChart: false,
              includeKpis: true,
              includeTable: true,
              includeExecutiveSummary: true,
              reportMode: 'mass_launches',
              orientation: 'landscape'
            });
          }}
        />
      )}
    </div>
  );
};
