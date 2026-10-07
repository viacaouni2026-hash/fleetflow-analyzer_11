import React, { useState, useMemo } from 'react';
import { 
  X, 
  Search, 
  Download, 
  Printer, 
  FileText, 
  Layers, 
  Truck, 
  Fuel, 
  Calendar, 
  User, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2, 
  Maximize2, 
  ChevronLeft, 
  ChevronRight, 
  Wrench, 
  Gauge, 
  Activity, 
  ShieldAlert, 
  Flame, 
  Clock, 
  ArrowUpRight, 
  Sparkles, 
  Share2, 
  Copy, 
  Check, 
  BarChart3,
  TrendingDown,
  TrendingUp,
  MapPin,
  FileSpreadsheet
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const DEFAULT_UNI_LOGO_URL = 'https://raw.githubusercontent.com/Buenotec/Logo_UNI/refs/heads/main/logo_uni.png';

// Helper to convert Image URL to Base64 for PDF embedding
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

export interface VehicleExplosionData {
  frota: string;
  placa: string;
  motorista?: string;
  operacao?: string;
  km: number;
  litros: number;
  media: number;
  desvioPercent?: number;
  litrosExcedentes?: number;
  isBelow?: boolean;
  consecutiveWeeksCount?: number;
  weeksDetails?: Array<{
    semana: string;
    semanaLabel: string;
    kml: number;
    km: number;
    litros: number;
  }>;
  suggestedAction?: string;
  [key: string]: any;
}

interface VehicleExplosionModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle: VehicleExplosionData | null;
  fuelRecords?: any[];
  kmRecords?: any[];
  mergedData?: any[];
  targetKml?: number;
  periodoLabel?: string;
  companyName?: string;
  erpSystem?: string;
  reportLogo?: string;
  onNavigateToJustifications?: (placa: string) => void;
  appTheme?: string;
  isDark?: boolean;
}

export const VehicleExplosionModal: React.FC<VehicleExplosionModalProps> = ({
  isOpen,
  onClose,
  vehicle,
  fuelRecords = [],
  kmRecords = [],
  mergedData = [],
  targetKml = 2.5,
  periodoLabel = 'Período Atual',
  companyName = 'UNI - Transporte & Logística',
  erpSystem = 'TOTVS / Protheus',
  reportLogo = DEFAULT_UNI_LOGO_URL,
  onNavigateToJustifications,
  appTheme = 'light',
  isDark: isDarkProp
}) => {
  const [activeTab, setActiveTab] = useState<'abastecimentos' | 'folhas_km' | 'evolucao' | 'plano_acao'>('abastecimentos');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number | 'all'>(15);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [copiedNotification, setCopiedNotification] = useState(false);

  // Local justification note per vehicle
  const [localNote, setLocalNote] = useState<string>(() => {
    if (!vehicle?.placa) return '';
    try {
      const saved = localStorage.getItem(`veh_explosion_note_${vehicle.placa}`);
      return saved || '';
    } catch {
      return '';
    }
  });

  const [savedNoteSuccess, setSavedNoteSuccess] = useState(false);

  const isDark = isDarkProp !== undefined ? isDarkProp : appTheme === 'dark-neon';

  // Normalize fuel records for this vehicle
  const normalizedFuelings = useMemo(() => {
    if (!vehicle) return [];
    
    // Combine explicit fuelRecords with matching rows in mergedData if fuelRecords is empty
    let source = fuelRecords;
    if (source.length === 0 && mergedData.length > 0) {
      const pNorm = vehicle.placa.toUpperCase().replace(/[^A-Z0-9]/g, '');
      const fNorm = vehicle.frota.toUpperCase().trim();
      source = mergedData.filter(r => {
        const rp = String(r.PLACA || r.placa || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
        const rf = String(r.FROTA || r.frota || r.VEICULO || '').toUpperCase().trim();
        const lit = Number(r.LITROS || r.litros || 0);
        return ((pNorm && rp === pNorm) || (fNorm && rf === fNorm)) && lit > 0;
      });
    }

    return source.map((f, idx) => {
      const rawDate = f.DATA || f.data || f.EMISSAO || f.emissao || '-';
      let dateFormatted = String(rawDate);
      if (dateFormatted.includes('-') && dateFormatted.split('-')[0].length === 4) {
        const [y, m, d] = dateFormatted.split('T')[0].split('-');
        dateFormatted = `${d}/${m}/${y}`;
      }

      const litros = Number(f.LITROS || f.litros || f.QTD || f.qtd || 0);
      const valorTotal = Number(f.VALOR || f.valor || f.VALORTOTAL || f.valorTotal || 0);
      const precoUnit = litros > 0 && valorTotal > 0 ? valorTotal / litros : Number(f.VALORUNITARIO || f.vlrUnit || 0);
      const posto = String(f.POSTO || f.posto || f.FORNECEDOR || f.fornecedor || f.LOCAL || f.local || 'Posto Interno / Convênio').trim();
      const combustivel = String(f.COMBUSTIVEL || f.combustivel || f.TIPO || f.tipo || 'DIESEL S10').trim();
      const motorista = String(f.MOTORISTA || f.motorista || f.CONDUTOR || f.condutor || vehicle.motorista || '-').trim();
      const kmRegistro = Number(f.HODOMETRO || f.hodometro || f.KM || f.km || 0);
      const documento = String(f.CUPOM || f.cupom || f.NRDOCTO || f.documento || f.NF || f.nf || f.CARTAO || '-').trim();
      const bomba = String(f.BOMBA || f.bomba || f.BICO || '-').trim();

      return {
        id: f.id || `fuel-${idx}`,
        data: dateFormatted,
        rawDate,
        litros,
        valorTotal,
        precoUnit,
        posto,
        combustivel,
        motorista,
        kmRegistro,
        documento,
        bomba,
        raw: f
      };
    }).sort((a, b) => {
      const da = new Date(a.rawDate).getTime() || 0;
      const db = new Date(b.rawDate).getTime() || 0;
      return db - da; // most recent first
    });
  }, [vehicle, fuelRecords, mergedData]);

  // Normalize KM / Log records for this vehicle
  const normalizedKms = useMemo(() => {
    if (!vehicle) return [];

    let source = kmRecords;
    if (source.length === 0 && mergedData.length > 0) {
      const pNorm = vehicle.placa.toUpperCase().replace(/[^A-Z0-9]/g, '');
      const fNorm = vehicle.frota.toUpperCase().trim();
      source = mergedData.filter(r => {
        const rp = String(r.PLACA || r.placa || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
        const rf = String(r.FROTA || r.frota || r.VEICULO || '').toUpperCase().trim();
        const km = Number(r.KM || r.km || 0);
        return ((pNorm && rp === pNorm) || (fNorm && rf === fNorm)) && km > 0;
      });
    }

    return source.map((k, idx) => {
      const rawDate = k.DATA || k.data || '-';
      let dateFormatted = String(rawDate);
      if (dateFormatted.includes('-') && dateFormatted.split('-')[0].length === 4) {
        const [y, m, d] = dateFormatted.split('T')[0].split('-');
        dateFormatted = `${d}/${m}/${y}`;
      }

      const kmRodado = Number(k.KM || k.km || k.KMPRODUTIVO || k.kmProdutivo || 0);
      const kmInicial = Number(k.KMINICIAL || k.kmInicial || k.KM_INICIAL || 0);
      const kmFinal = Number(k.KMFINAL || k.kmFinal || k.KM_FINAL || (kmInicial > 0 && kmRodado > 0 ? kmInicial + kmRodado : 0));
      const linha = String(k.LINHA || k.linha || k.OPERACAO || k.operacao || vehicle.operacao || 'OPERACIONAL GERAL').trim();
      const motorista = String(k.MOTORISTA || k.motorista || k.CONDUTOR || vehicle.motorista || '-').trim();
      const turno = String(k.TURNO || k.turno || k.HORARIO || k.horario || '-').trim();

      return {
        id: k.id || `km-${idx}`,
        data: dateFormatted,
        rawDate,
        kmRodado,
        kmInicial,
        kmFinal,
        linha,
        motorista,
        turno,
        raw: k
      };
    }).sort((a, b) => {
      const da = new Date(a.rawDate).getTime() || 0;
      const db = new Date(b.rawDate).getTime() || 0;
      return db - da; // most recent first
    });
  }, [vehicle, kmRecords, mergedData]);

  // Totals calculations
  const totalLitrosCalculated = useMemo(() => {
    return normalizedFuelings.reduce((acc, f) => acc + f.litros, 0);
  }, [normalizedFuelings]);

  const totalValorFuelCalculated = useMemo(() => {
    return normalizedFuelings.reduce((acc, f) => acc + f.valorTotal, 0);
  }, [normalizedFuelings]);

  const totalKmCalculated = useMemo(() => {
    return normalizedKms.reduce((acc, k) => acc + k.kmRodado, 0);
  }, [normalizedKms]);

  // Filtered lists based on search term
  const filteredFuelings = useMemo(() => {
    if (!searchTerm.trim()) return normalizedFuelings;
    const term = searchTerm.toLowerCase();
    return normalizedFuelings.filter(f => 
      f.data.toLowerCase().includes(term) ||
      f.posto.toLowerCase().includes(term) ||
      f.combustivel.toLowerCase().includes(term) ||
      f.motorista.toLowerCase().includes(term) ||
      f.documento.toLowerCase().includes(term)
    );
  }, [normalizedFuelings, searchTerm]);

  const filteredKms = useMemo(() => {
    if (!searchTerm.trim()) return normalizedKms;
    const term = searchTerm.toLowerCase();
    return normalizedKms.filter(k => 
      k.data.toLowerCase().includes(term) ||
      k.linha.toLowerCase().includes(term) ||
      k.motorista.toLowerCase().includes(term) ||
      k.turno.toLowerCase().includes(term)
    );
  }, [normalizedKms, searchTerm]);

  // Paginated lists
  const paginatedFuelings = useMemo(() => {
    if (pageSize === 'all') return filteredFuelings;
    const start = (currentPage - 1) * pageSize;
    return filteredFuelings.slice(start, start + pageSize);
  }, [filteredFuelings, currentPage, pageSize]);

  const paginatedKms = useMemo(() => {
    if (pageSize === 'all') return filteredKms;
    const start = (currentPage - 1) * pageSize;
    return filteredKms.slice(start, start + pageSize);
  }, [filteredKms, currentPage, pageSize]);

  const totalPages = useMemo(() => {
    const listLen = activeTab === 'abastecimentos' ? filteredFuelings.length : filteredKms.length;
    if (pageSize === 'all' || listLen === 0) return 1;
    return Math.ceil(listLen / pageSize);
  }, [activeTab, filteredFuelings.length, filteredKms.length, pageSize]);

  const handleSaveNote = () => {
    if (!vehicle?.placa) return;
    try {
      localStorage.setItem(`veh_explosion_note_${vehicle.placa}`, localNote);
      setSavedNoteSuccess(true);
      setTimeout(() => setSavedNoteSuccess(false), 2500);
    } catch (e) {
      console.error(e);
    }
  };

  const handleCopySummary = () => {
    if (!vehicle) return;
    const isBelow = vehicle.media < targetKml;
    const text = `📋 *EXPLOSÃO DE DADOS DO VEÍCULO - UNI LOGÍSTICA*
🚚 *Frota:* ${vehicle.frota} | *Placa:* ${vehicle.placa}
👤 *Condutor:* ${vehicle.motorista || 'NÃO IDENTIFICADO'}
📍 *Operação:* ${vehicle.operacao || 'GERAL'}
📊 *Média Real:* ${vehicle.media.toFixed(2)} km/L (Meta: ${targetKml.toFixed(2)} km/L)
⚠️ *Status:* ${isBelow ? `ABAIXO DA META (${vehicle.desvioPercent?.toFixed(1)}%)` : 'DENTRO DA META'}
🛣️ *KM Rodado Total:* ${vehicle.km.toLocaleString('pt-BR')} km
⛽ *Total Litros:* ${vehicle.litros.toLocaleString('pt-BR')} L
${vehicle.litrosExcedentes && vehicle.litrosExcedentes > 0 ? `🚨 *Litros Excedentes:* +${Math.round(vehicle.litrosExcedentes)} L\n` : ''}
*Total Abastecimentos:* ${normalizedFuelings.length} lançamentos
*Total Folhas KM:* ${normalizedKms.length} registros
*Período:* ${periodoLabel}`;

    navigator.clipboard.writeText(text);
    setCopiedNotification(true);
    setTimeout(() => setCopiedNotification(false), 2500);
  };

  // Generate complete single-vehicle PDF report
  const generateVehiclePdf = async (action: 'download' | 'print') => {
    if (!vehicle) return;
    setIsExportingPdf(true);

    try {
      const doc = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const dateStr = new Date().toLocaleDateString('pt-BR');
      const timeStr = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

      // Embed Logo
      let logoBase64 = '';
      if (reportLogo) {
        try {
          logoBase64 = await getBase64FromUrl(reportLogo);
        } catch (e) {
          console.warn('Could not load logo for explosion PDF', e);
        }
      }

      // 1. Header Banner
      doc.setFillColor(15, 23, 42); // slate-900
      doc.rect(0, 0, pageWidth, 24, 'F');

      if (logoBase64) {
        try {
          doc.addImage(logoBase64, 'PNG', 12, 3.5, 26, 17);
        } catch {
          // fallback text
        }
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(255, 255, 255);
      doc.text(`DETALHAMENTO & EXPLOSÃO DE DADOS OPERACIONAIS`, 42, 11);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(203, 213, 225); // slate-300
      doc.text(`FROTA ${vehicle.frota} • PLACA ${vehicle.placa} • ${companyName.toUpperCase()} • ERP: ${erpSystem}`, 42, 17);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(56, 189, 248); // sky-400
      doc.text(`PERÍODO: ${periodoLabel.toUpperCase()} | EMISSÃO: ${dateStr} ${timeStr}`, pageWidth - 12, 14, { align: 'right' });

      let currentY = 30;

      // 2. Vehicle Identification & KPI Summary Cards
      const cardW = (pageWidth - 24 - 15) / 6;
      const cardH = 18;

      const isBelow = vehicle.media < targetKml;

      const cards = [
        { label: 'KM TOTAL RODADO', val: `${vehicle.km.toLocaleString('pt-BR')} km`, bg: [241, 245, 249], text: [15, 23, 42] },
        { label: 'LITROS ABASTECIDOS', val: `${vehicle.litros.toLocaleString('pt-BR')} L`, bg: [241, 245, 249], text: [15, 23, 42] },
        { 
          label: 'MÉDIA REAL KM/L', 
          val: `${vehicle.media.toFixed(2)} km/L`, 
          bg: isBelow ? [254, 242, 242] : [240, 253, 244], 
          text: isBelow ? [225, 29, 72] : [5, 150, 105] 
        },
        { label: 'META ESTABELECIDA', val: `${targetKml.toFixed(2)} km/L`, bg: [238, 242, 255], text: [79, 70, 229] },
        { 
          label: 'DESVIO / EXCEDENTE', 
          val: isBelow ? `${vehicle.desvioPercent?.toFixed(1)}% (+${Math.round(vehicle.litrosExcedentes || 0)}L)` : 'CONFORME (0L)', 
          bg: isBelow ? [254, 243, 199] : [240, 253, 244], 
          text: isBelow ? [217, 119, 6] : [5, 150, 105] 
        },
        { label: 'CONDUTOR PRINCIPAL', val: (vehicle.motorista || 'NÃO IDENTIFICADO').substring(0, 18), bg: [248, 250, 252], text: [51, 65, 85] }
      ];

      cards.forEach((c, idx) => {
        const x = 12 + idx * (cardW + 3);
        doc.setFillColor(c.bg[0], c.bg[1], c.bg[2]);
        doc.roundedRect(x, currentY, cardW, cardH, 2, 2, 'F');
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.roundedRect(x, currentY, cardW, cardH, 2, 2, 'S');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(100, 116, 139);
        doc.text(c.label, x + 3, currentY + 5.5);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(9);
        doc.setTextColor(c.text[0], c.text[1], c.text[2]);
        doc.text(c.val, x + 3, currentY + 12);
      });

      currentY += cardH + 7;

      // 3. Fueling Table Section
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(`1. REGISTRO DETALHADO DE ABASTECIMENTOS DE COMBUSTÍVEL (${normalizedFuelings.length} LANÇAMENTOS)`, 12, currentY);
      currentY += 2;

      const fuelHeaders = [['Data', 'Posto / Fornecedor', 'Combustível', 'Litros', 'Vlr Unit (R$)', 'Total (R$)', 'Hodômetro (KM)', 'Condutor', 'Documento']];
      const fuelRows = normalizedFuelings.map(f => [
        f.data,
        f.posto.substring(0, 28),
        f.combustivel,
        `${f.litros.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} L`,
        f.precoUnit > 0 ? `R$ ${f.precoUnit.toFixed(2)}` : '-',
        f.valorTotal > 0 ? `R$ ${f.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-',
        f.kmRegistro > 0 ? `${f.kmRegistro.toLocaleString('pt-BR')} km` : '-',
        f.motorista.substring(0, 20),
        f.documento
      ]);

      autoTable(doc, {
        head: fuelHeaders,
        body: fuelRows.length > 0 ? fuelRows : [['-', 'Nenhum abastecimento registrado no período', '-', '-', '-', '-', '-', '-', '-']],
        startY: currentY,
        theme: 'striped',
        headStyles: {
          fillColor: [15, 23, 42],
          textColor: [255, 255, 255],
          fontSize: 7.5,
          fontStyle: 'bold',
          cellPadding: 2
        },
        styles: {
          fontSize: 7,
          cellPadding: 1.8,
          textColor: [51, 65, 85]
        },
        columnStyles: {
          3: { halign: 'right', fontStyle: 'bold' },
          4: { halign: 'right' },
          5: { halign: 'right', fontStyle: 'bold' },
          6: { halign: 'right' }
        },
        margin: { left: 12, right: 12 }
      });

      currentY = (doc as any).lastAutoTable.finalY + 8;

      // Check for page break before next table
      if (currentY > pageHeight - 50) {
        doc.addPage();
        currentY = 20;
      }

      // 4. KM & Log Table Section
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(`2. REGISTROS DE FOLHA DE KM & JORNADAS DE ODÔMETRO (${normalizedKms.length} REGISTROS)`, 12, currentY);
      currentY += 2;

      const kmHeaders = [['Data', 'Linha / Operação', 'Condutor', 'KM Inicial', 'KM Final', 'KM Rodado (Produtivo)', 'Turno / Observação']];
      const kmRows = normalizedKms.map(k => [
        k.data,
        k.linha.substring(0, 32),
        k.motorista.substring(0, 24),
        k.kmInicial > 0 ? `${k.kmInicial.toLocaleString('pt-BR')} km` : '-',
        k.kmFinal > 0 ? `${k.kmFinal.toLocaleString('pt-BR')} km` : '-',
        `${k.kmRodado.toLocaleString('pt-BR')} km`,
        k.turno
      ]);

      autoTable(doc, {
        head: kmHeaders,
        body: kmRows.length > 0 ? kmRows : [['-', 'Nenhum registro de KM lançado no período', '-', '-', '-', '-', '-']],
        startY: currentY,
        theme: 'striped',
        headStyles: {
          fillColor: [30, 41, 59],
          textColor: [255, 255, 255],
          fontSize: 7.5,
          fontStyle: 'bold',
          cellPadding: 2
        },
        styles: {
          fontSize: 7,
          cellPadding: 1.8,
          textColor: [51, 65, 85]
        },
        columnStyles: {
          3: { halign: 'right' },
          4: { halign: 'right' },
          5: { halign: 'right', fontStyle: 'bold', textColor: [2, 132, 199] }
        },
        margin: { left: 12, right: 12 }
      });

      currentY = (doc as any).lastAutoTable.finalY + 8;

      // 5. Corporate Action Matrix & Notes
      if (currentY > pageHeight - 45) {
        doc.addPage();
        currentY = 20;
      }

      doc.setFillColor(248, 250, 252);
      doc.roundedRect(12, currentY, pageWidth - 24, 28, 2, 2, 'F');
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(12, currentY, pageWidth - 24, 28, 2, 2, 'S');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text('3. DIRETRIZ CORPORATIVA & PLANO DE AÇÃO PARA O VEÍCULO', 16, currentY + 5.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(71, 85, 105);
      const actionText = `• Oficina & Mecânica: Validação de bicos injetores, filtros de ar/combustível e calibração de pneus.\n• Telemetria & CCO: Monitoramento de RPM em faixa verde, freadas bruscas e tempo de marcha lenta.\n• Treinamento Operacional: Alinhamento com condutor (${vehicle.motorista || 'NÃO IDENTIFICADO'}) e reciclagem prática de condução econômica.\n• Anotações do Gestor: ${localNote || 'Sem anotações complementares inseridas.'}`;
      doc.text(actionText, 16, currentY + 11);

      // Save / Output
      const cleanFileName = `Explosao_Veiculo_${vehicle.frota}_${vehicle.placa}_${dateStr.replace(/\//g, '-')}.pdf`;
      if (action === 'download') {
        doc.save(cleanFileName);
      } else {
        const pdfDataUri = doc.output('datauristring');
        const printWindow = window.open('', '_blank');
        if (printWindow) {
          printWindow.document.write(`
            <html>
              <head><title>Imprimir Explosão - Frota ${vehicle.frota} (${vehicle.placa})</title></head>
              <body style="margin:0;padding:0;overflow:hidden;">
                <iframe src="${pdfDataUri}" width="100%" height="100%" style="border:none;"></iframe>
              </body>
            </html>
          `);
          setTimeout(() => {
            printWindow.focus();
            printWindow.print();
          }, 600);
        } else {
          doc.save(cleanFileName);
        }
      }
    } catch (e) {
      console.error('Error generating explosion PDF', e);
    } finally {
      setIsExportingPdf(false);
    }
  };

  if (!isOpen || !vehicle) return null;

  const isBelow = vehicle.media < targetKml;

  return (
    <AnimatePresence>
      <div 
        id="vehicle-explosion-modal-backdrop"
        className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-5 bg-slate-950/80 backdrop-blur-md overflow-hidden print:hidden"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.94, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.94, y: 20 }}
          transition={{ type: 'spring', damping: 26, stiffness: 320 }}
          className={`w-full max-w-6xl max-h-[92vh] flex flex-col rounded-3xl shadow-2xl border overflow-hidden ${
            isDark 
              ? 'bg-slate-900 border-slate-700/80 text-white shadow-cyan-950/20' 
              : 'bg-white border-slate-100 text-slate-900 shadow-2xl'
          }`}
        >
          {/* TOP HEADER */}
          <div className={`p-5 md:p-6 border-b flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 ${
            isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-100'
          }`}>
            <div className="flex items-start md:items-center gap-3.5">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border shadow-md ${
                isBelow 
                  ? 'bg-rose-500/10 text-rose-500 border-rose-500/30' 
                  : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/30'
              }`}>
                <Truck size={24} />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`px-2.5 py-0.5 rounded-lg text-xs font-black font-mono border ${
                    isDark ? 'bg-slate-800 text-cyan-400 border-slate-700' : 'bg-white text-slate-900 border-slate-200 shadow-xs'
                  }`}>
                    FROTA {vehicle.frota}
                  </span>
                  <span className="text-xs font-mono font-bold text-slate-400">
                    PLACA: {vehicle.placa}
                  </span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                    isBelow 
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' 
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}>
                    {isBelow ? `Abaixo da Meta (${vehicle.desvioPercent?.toFixed(1)}%)` : 'Meta Atingida'}
                  </span>
                  {vehicle.consecutiveWeeksCount && vehicle.consecutiveWeeksCount >= 3 && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-600 text-white flex items-center gap-1 animate-pulse">
                      <Flame size={10} /> 3 Semanas Consecutivas
                    </span>
                  )}
                </div>
                <h3 className="text-lg md:text-xl font-black mt-1 tracking-tight flex items-center gap-2">
                  Explosão de Dados & Detalhamento Individual
                </h3>
                <p className="text-xs text-slate-400">
                  Condutor: <strong className={isDark ? 'text-slate-200' : 'text-slate-700'}>{vehicle.motorista || 'NÃO INFORMADO'}</strong> • Operação: {vehicle.operacao || 'GERAL'} • {periodoLabel}
                </p>
              </div>
            </div>

            {/* Header Action Buttons */}
            <div className="flex items-center gap-2 self-end md:self-auto">
              <button
                type="button"
                onClick={handleCopySummary}
                className={`p-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
                  copiedNotification
                    ? 'bg-emerald-600 text-white border-emerald-600'
                    : isDark 
                      ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700' 
                      : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
                title="Copiar resumo para WhatsApp"
              >
                {copiedNotification ? <Check size={15} /> : <Copy size={15} />}
                <span className="hidden sm:inline">{copiedNotification ? 'Copiado!' : 'Copiar'}</span>
              </button>

              <button
                type="button"
                onClick={() => generateVehiclePdf('print')}
                disabled={isExportingPdf}
                className={`p-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer disabled:opacity-50 ${
                  isDark 
                    ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700' 
                    : 'bg-white hover:bg-slate-100 text-slate-700 border-slate-200'
                }`}
                title="Imprimir relatório deste veículo"
              >
                <Printer size={15} />
                <span className="hidden sm:inline">Imprimir</span>
              </button>

              <button
                type="button"
                onClick={() => generateVehiclePdf('download')}
                disabled={isExportingPdf}
                className="px-3.5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-indigo-600/20 active:scale-95 disabled:opacity-50 cursor-pointer"
                title="Baixar relatório completo em PDF"
              >
                {isExportingPdf ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                <span>PDF Veículo</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className={`p-2.5 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer ${
                  isDark ? 'hover:bg-slate-800' : 'hover:bg-slate-100 hover:text-slate-900'
                }`}
                title="Fechar (Esc)"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* KPI METRIC CARDS BANNER */}
          <div className={`p-4 md:p-5 border-b grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 shrink-0 ${
            isDark ? 'bg-slate-950/60 border-slate-800' : 'bg-slate-50/50 border-slate-100'
          }`}>
            <div className={`p-3 rounded-2xl border ${
              isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-100 shadow-xs'
            }`}>
              <div className="flex items-center justify-between text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                <span>KM Total</span>
                <Gauge size={13} className="text-cyan-500" />
              </div>
              <p className="text-base md:text-lg font-black font-mono mt-1 text-cyan-400">
                {vehicle.km.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} <span className="text-xs font-normal">km</span>
              </p>
              <span className="text-[10px] text-slate-400 font-medium">{normalizedKms.length} lançamentos de KM</span>
            </div>

            <div className={`p-3 rounded-2xl border ${
              isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-100 shadow-xs'
            }`}>
              <div className="flex items-center justify-between text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                <span>Total Litros</span>
                <Fuel size={13} className="text-amber-500" />
              </div>
              <p className="text-base md:text-lg font-black font-mono mt-1 text-amber-400">
                {vehicle.litros.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} <span className="text-xs font-normal">L</span>
              </p>
              <span className="text-[10px] text-slate-400 font-medium">{normalizedFuelings.length} abastecimentos</span>
            </div>

            <div className={`p-3 rounded-2xl border ${
              isBelow 
                ? isDark ? 'bg-rose-950/40 border-rose-800/60' : 'bg-rose-50/70 border-rose-200'
                : isDark ? 'bg-emerald-950/40 border-emerald-800/60' : 'bg-emerald-50/70 border-emerald-200'
            }`}>
              <div className="flex items-center justify-between text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                <span>Média Real</span>
                {isBelow ? <TrendingDown size={13} className="text-rose-500" /> : <TrendingUp size={13} className="text-emerald-500" />}
              </div>
              <p className={`text-base md:text-lg font-black font-mono mt-1 ${isBelow ? 'text-rose-500' : 'text-emerald-500'}`}>
                {vehicle.media.toFixed(2)} <span className="text-xs font-normal">km/L</span>
              </p>
              <span className={`text-[10px] font-bold ${isBelow ? 'text-rose-400' : 'text-emerald-400'}`}>
                Meta: {targetKml.toFixed(2)} km/L
              </span>
            </div>

            <div className={`p-3 rounded-2xl border ${
              isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-100 shadow-xs'
            }`}>
              <div className="flex items-center justify-between text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                <span>Desvio %</span>
                <Activity size={13} className="text-indigo-400" />
              </div>
              <p className={`text-base md:text-lg font-black font-mono mt-1 ${
                isBelow ? 'text-rose-400' : 'text-emerald-400'
              }`}>
                {vehicle.desvioPercent ? `${vehicle.desvioPercent.toFixed(1)}%` : '0.0%'}
              </p>
              <span className="text-[10px] text-slate-400 font-medium">em relação ao alvo</span>
            </div>

            <div className={`p-3 rounded-2xl border ${
              isBelow 
                ? isDark ? 'bg-amber-950/40 border-amber-800/60' : 'bg-amber-50/70 border-amber-200'
                : isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-100 shadow-xs'
            }`}>
              <div className="flex items-center justify-between text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                <span>Excedente</span>
                <AlertTriangle size={13} className={isBelow ? 'text-amber-500' : 'text-slate-400'} />
              </div>
              <p className={`text-base md:text-lg font-black font-mono mt-1 ${isBelow ? 'text-amber-400' : 'text-slate-400'}`}>
                {vehicle.litrosExcedentes && vehicle.litrosExcedentes > 0 ? `+${Math.round(vehicle.litrosExcedentes)} L` : '0 L'}
              </p>
              <span className="text-[10px] text-slate-400 font-medium">{isBelow ? 'Consumo além da meta' : 'Em conformidade'}</span>
            </div>

            <div className={`p-3 rounded-2xl border ${
              isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-100 shadow-xs'
            }`}>
              <div className="flex items-center justify-between text-slate-400 text-[10px] font-bold uppercase tracking-wider">
                <span>Custo Combustível</span>
                <Sparkles size={13} className="text-purple-400" />
              </div>
              <p className="text-base md:text-lg font-black font-mono mt-1 text-purple-400">
                {totalValorFuelCalculated > 0 
                  ? `R$ ${totalValorFuelCalculated.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}` 
                  : (vehicle.litros * 5.95 > 0 ? `~R$ ${Math.round(vehicle.litros * 5.95).toLocaleString('pt-BR')}` : '-')}
              </p>
              <span className="text-[10px] text-slate-400 font-medium">Estimado do período</span>
            </div>
          </div>

          {/* SUB-TABS NAVIGATION */}
          <div className={`px-5 py-3 border-b flex items-center justify-between gap-3 shrink-0 ${
            isDark ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-100'
          }`}>
            <div className="flex items-center gap-2 overflow-x-auto custom-scrollbar pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => { setActiveTab('abastecimentos'); setCurrentPage(1); }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                  activeTab === 'abastecimentos'
                    ? isDark ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20' : 'bg-indigo-600 text-white shadow-md'
                    : isDark ? 'bg-slate-800/80 text-slate-300 hover:bg-slate-800' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Fuel size={14} />
                <span>Abastecimentos ({normalizedFuelings.length})</span>
              </button>

              <button
                type="button"
                onClick={() => { setActiveTab('folhas_km'); setCurrentPage(1); }}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                  activeTab === 'folhas_km'
                    ? isDark ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20' : 'bg-indigo-600 text-white shadow-md'
                    : isDark ? 'bg-slate-800/80 text-slate-300 hover:bg-slate-800' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Gauge size={14} />
                <span>Folhas de KM ({normalizedKms.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('evolucao')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                  activeTab === 'evolucao'
                    ? isDark ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20' : 'bg-indigo-600 text-white shadow-md'
                    : isDark ? 'bg-slate-800/80 text-slate-300 hover:bg-slate-800' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <BarChart3 size={14} />
                <span>Evolução & Recorrência</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('plano_acao')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shrink-0 ${
                  activeTab === 'plano_acao'
                    ? isDark ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20' : 'bg-indigo-600 text-white shadow-md'
                    : isDark ? 'bg-slate-800/80 text-slate-300 hover:bg-slate-800' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <Wrench size={14} />
                <span>Plano de Ação Imediato</span>
              </button>
            </div>

            {/* Quick Search */}
            {(activeTab === 'abastecimentos' || activeTab === 'folhas_km') && (
              <div className="relative w-48 sm:w-64 hidden sm:block">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={13} />
                <input
                  type="text"
                  placeholder="Pesquisar lançamentos..."
                  value={searchTerm}
                  onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(1); }}
                  className={`w-full pl-8 pr-7 py-1.5 text-xs rounded-xl border outline-none font-medium transition-all ${
                    isDark 
                      ? 'bg-slate-950 border-slate-700 text-white focus:border-cyan-500' 
                      : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-600'
                  }`}
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs font-bold"
                  >
                    ✕
                  </button>
                )}
              </div>
            )}
          </div>

          {/* MODAL BODY CONTENT */}
          <div className="p-5 md:p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">

            {/* TAB 1: ABASTECIMENTOS */}
            {activeTab === 'abastecimentos' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Fuel size={18} className="text-amber-500" />
                    <h4 className="text-sm font-black uppercase tracking-wider">
                      Lançamentos de Combustível ({filteredFuelings.length})
                    </h4>
                  </div>
                  <div className="text-xs text-slate-400 font-medium">
                    Soma: <strong className={isDark ? 'text-amber-400' : 'text-amber-600'}>{totalLitrosCalculated.toLocaleString('pt-BR', { minimumFractionDigits: 1 })} L</strong>
                  </div>
                </div>

                <div className={`overflow-x-auto rounded-2xl border custom-scrollbar ${
                  isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-100 bg-white'
                }`}>
                  <table className="w-full text-left text-xs">
                    <thead className={`border-b uppercase text-[10px] font-black tracking-wider ${
                      isDark ? 'bg-slate-900/90 text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-600 border-slate-100'
                    }`}>
                      <tr>
                        <th className="py-3 px-3.5">Data</th>
                        <th className="py-3 px-3.5">Posto / Local</th>
                        <th className="py-3 px-3.5">Combustível</th>
                        <th className="py-3 px-3.5 text-right">Litros</th>
                        <th className="py-3 px-3.5 text-right">Vlr Unitário</th>
                        <th className="py-3 px-3.5 text-right">Total (R$)</th>
                        <th className="py-3 px-3.5 text-right">Hodômetro</th>
                        <th className="py-3 px-3.5">Condutor</th>
                        <th className="py-3 px-3.5">Documento</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y font-medium ${
                      isDark ? 'divide-slate-800 text-slate-300' : 'divide-slate-100 text-slate-700'
                    }`}>
                      {paginatedFuelings.length === 0 ? (
                        <tr>
                          <td colSpan={9} className="py-8 text-center text-slate-400 text-xs">
                            Nenhum abastecimento encontrado para este veículo com os critérios atuais.
                          </td>
                        </tr>
                      ) : (
                        paginatedFuelings.map((f, idx) => (
                          <tr key={f.id || idx} className={isDark ? 'hover:bg-slate-800/50 transition-colors' : 'hover:bg-slate-50/80 transition-colors'}>
                            <td className="py-2.5 px-3.5 font-mono text-slate-400 whitespace-nowrap">{f.data}</td>
                            <td className="py-2.5 px-3.5 font-semibold text-slate-200 max-w-[200px] truncate" title={f.posto}>
                              {f.posto}
                            </td>
                            <td className="py-2.5 px-3.5">
                              <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold">
                                {f.combustivel}
                              </span>
                            </td>
                            <td className="py-2.5 px-3.5 text-right font-black font-mono text-amber-400">
                              {f.litros.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} L
                            </td>
                            <td className="py-2.5 px-3.5 text-right font-mono text-slate-400">
                              {f.precoUnit > 0 ? `R$ ${f.precoUnit.toFixed(2)}` : '-'}
                            </td>
                            <td className="py-2.5 px-3.5 text-right font-mono font-bold text-slate-200">
                              {f.valorTotal > 0 ? `R$ ${f.valorTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}
                            </td>
                            <td className="py-2.5 px-3.5 text-right font-mono text-slate-400">
                              {f.kmRegistro > 0 ? `${f.kmRegistro.toLocaleString('pt-BR')} km` : '-'}
                            </td>
                            <td className="py-2.5 px-3.5 text-slate-300 max-w-[160px] truncate" title={f.motorista}>
                              {f.motorista}
                            </td>
                            <td className="py-2.5 px-3.5 font-mono text-slate-400 text-[11px]">
                              {f.documento}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
                    <span>Mostrando página {currentPage} de {totalPages}</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className={`p-1.5 rounded-lg border disabled:opacity-40 cursor-pointer ${
                          isDark ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className={`p-1.5 rounded-lg border disabled:opacity-40 cursor-pointer ${
                          isDark ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: FOLHAS DE KM */}
            {activeTab === 'folhas_km' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Gauge size={18} className="text-cyan-500" />
                    <h4 className="text-sm font-black uppercase tracking-wider">
                      Registros de Odômetro & Folhas de KM ({filteredKms.length})
                    </h4>
                  </div>
                  <div className="text-xs text-slate-400 font-medium">
                    Soma Produtiva: <strong className={isDark ? 'text-cyan-400' : 'text-cyan-600'}>{totalKmCalculated.toLocaleString('pt-BR')} km</strong>
                  </div>
                </div>

                <div className={`overflow-x-auto rounded-2xl border custom-scrollbar ${
                  isDark ? 'border-slate-800 bg-slate-950/60' : 'border-slate-100 bg-white'
                }`}>
                  <table className="w-full text-left text-xs">
                    <thead className={`border-b uppercase text-[10px] font-black tracking-wider ${
                      isDark ? 'bg-slate-900/90 text-slate-400 border-slate-800' : 'bg-slate-50 text-slate-600 border-slate-100'
                    }`}>
                      <tr>
                        <th className="py-3 px-3.5">Data</th>
                        <th className="py-3 px-3.5">Linha / Operação</th>
                        <th className="py-3 px-3.5">Condutor</th>
                        <th className="py-3 px-3.5 text-right">KM Inicial</th>
                        <th className="py-3 px-3.5 text-right">KM Final</th>
                        <th className="py-3 px-3.5 text-right font-black text-cyan-400">KM Rodado</th>
                        <th className="py-3 px-3.5">Turno / Horário</th>
                      </tr>
                    </thead>
                    <tbody className={`divide-y font-medium ${
                      isDark ? 'divide-slate-800 text-slate-300' : 'divide-slate-100 text-slate-700'
                    }`}>
                      {paginatedKms.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                            Nenhum registro de Folha de KM encontrado para este veículo.
                          </td>
                        </tr>
                      ) : (
                        paginatedKms.map((k, idx) => (
                          <tr key={k.id || idx} className={isDark ? 'hover:bg-slate-800/50 transition-colors' : 'hover:bg-slate-50/80 transition-colors'}>
                            <td className="py-2.5 px-3.5 font-mono text-slate-400 whitespace-nowrap">{k.data}</td>
                            <td className="py-2.5 px-3.5 font-semibold text-slate-200 max-w-[220px] truncate" title={k.linha}>
                              {k.linha}
                            </td>
                            <td className="py-2.5 px-3.5 text-slate-300 max-w-[180px] truncate" title={k.motorista}>
                              {k.motorista}
                            </td>
                            <td className="py-2.5 px-3.5 text-right font-mono text-slate-400">
                              {k.kmInicial > 0 ? `${k.kmInicial.toLocaleString('pt-BR')} km` : '-'}
                            </td>
                            <td className="py-2.5 px-3.5 text-right font-mono text-slate-400">
                              {k.kmFinal > 0 ? `${k.kmFinal.toLocaleString('pt-BR')} km` : '-'}
                            </td>
                            <td className="py-2.5 px-3.5 text-right font-black font-mono text-cyan-400 bg-cyan-950/20">
                              {k.kmRodado.toLocaleString('pt-BR')} km
                            </td>
                            <td className="py-2.5 px-3.5 text-slate-400 font-mono text-[11px]">
                              {k.turno}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {totalPages > 1 && (
                  <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
                    <span>Mostrando página {currentPage} de {totalPages}</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className={`p-1.5 rounded-lg border disabled:opacity-40 cursor-pointer ${
                          isDark ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <ChevronLeft size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className={`p-1.5 rounded-lg border disabled:opacity-40 cursor-pointer ${
                          isDark ? 'border-slate-700 hover:bg-slate-800' : 'border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: EVOLUÇÃO & RECORRÊNCIA */}
            {activeTab === 'evolucao' && (
              <div className="space-y-6">
                {/* 3 Consecutive Weeks Alert Banner */}
                <div className={`p-5 rounded-2xl border ${
                  vehicle.consecutiveWeeksCount && vehicle.consecutiveWeeksCount >= 3
                    ? 'bg-red-950/60 border-red-800/80 text-red-200'
                    : isDark ? 'bg-slate-800/70 border-slate-700 text-slate-200' : 'bg-slate-50 border-slate-200 text-slate-800'
                }`}>
                  <div className="flex items-start gap-3.5">
                    <div className={`p-2.5 rounded-xl shrink-0 ${
                      vehicle.consecutiveWeeksCount && vehicle.consecutiveWeeksCount >= 3
                        ? 'bg-red-900/80 text-red-300 border border-red-700'
                        : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30'
                    }`}>
                      <ShieldAlert size={22} />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-black uppercase tracking-wider">
                          Diretriz Corporativa de Recorrência (Regra das 3 Semanas)
                        </h4>
                        {vehicle.consecutiveWeeksCount && vehicle.consecutiveWeeksCount >= 3 ? (
                          <span className="px-2 py-0.5 bg-red-600 text-white rounded-full text-[10px] font-black uppercase">
                            Intervenção Imediata Ativa
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 rounded-full text-[10px] font-black uppercase">
                            Monitoramento Regular
                          </span>
                        )}
                      </div>
                      <p className="text-xs leading-relaxed opacity-90">
                        Quando um veículo ou condutor mantém média abaixo da meta ({targetKml.toFixed(2)} km/L) por 3 semanas consecutivas, é disparado automaticamente o protocolo de Plano de Ação para auditoria técnica mecânica e reciclagem prática de condução econômica.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Week history pills if available */}
                {vehicle.weeksDetails && vehicle.weeksDetails.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                      Histórico Semanal Detalhado
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      {vehicle.weeksDetails.map((w, idx) => (
                        <div 
                          key={idx}
                          className={`p-4 rounded-2xl border text-center space-y-1 ${
                            w.kml < targetKml
                              ? isDark ? 'bg-rose-950/40 border-rose-800/60' : 'bg-rose-50 border-rose-200'
                              : isDark ? 'bg-emerald-950/40 border-emerald-800/60' : 'bg-emerald-50 border-emerald-200'
                          }`}
                        >
                          <span className="text-[11px] font-bold text-slate-400 block">{w.semanaLabel || w.semana}</span>
                          <span className={`text-xl font-black font-mono block ${
                            w.kml < targetKml ? 'text-rose-500' : 'text-emerald-500'
                          }`}>
                            {w.kml.toFixed(2)} <span className="text-xs font-normal">km/L</span>
                          </span>
                          <span className="text-[10px] text-slate-400 block font-mono">
                            {w.km.toLocaleString('pt-BR')} km • {w.litros.toLocaleString('pt-BR')} L
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Breakdown Summary */}
                <div className={`p-5 rounded-2xl border space-y-3 ${
                  isDark ? 'bg-slate-950/80 border-slate-800' : 'bg-slate-50 border-slate-100'
                }`}>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-400">
                    Diagnóstico Operacional Integrado
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1">
                      <span className="text-slate-400 block">Eficiência de Consumo:</span>
                      <p className="font-bold text-slate-200">
                        {vehicle.media >= targetKml 
                          ? `Excelente! O veículo operou ${(vehicle.media - targetKml).toFixed(2)} km/L acima da meta operacional.` 
                          : `Alerta: Consumo ${(targetKml - vehicle.media).toFixed(2)} km/L abaixo da meta de ${targetKml.toFixed(2)} km/L.`}
                      </p>
                    </div>
                    <div className="space-y-1">
                      <span className="text-slate-400 block">Impacto em Litros Excedentes:</span>
                      <p className="font-bold text-slate-200">
                        {vehicle.litrosExcedentes && vehicle.litrosExcedentes > 0
                          ? `Foram consumidos aproximadamente ${Math.round(vehicle.litrosExcedentes)} litros adicionais em relação ao target.`
                          : 'Zero litros excedentes. Operação eficiente.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 4: PLANO DE AÇÃO & INTERVENÇÃO */}
            {activeTab === 'plano_acao' && (
              <div className="space-y-6">
                {/* 4 Pillars Matrix */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Wrench size={16} className="text-amber-400" />
                    <h4 className="text-sm font-black uppercase tracking-wider">
                      Matriz de Intervenção em 4 Frentes Obrigatórias
                    </h4>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Frente 1: Oficina & Mecânica */}
                    <div className={`p-4 rounded-2xl border space-y-2 ${
                      isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-50 border-slate-100'
                    }`}>
                      <div className="flex items-center gap-2 text-amber-400">
                        <Wrench size={16} />
                        <span className="text-xs font-black uppercase tracking-wider">1. Oficina & Mecânica</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Abertura de O.S. para diagnóstico de injeção eletrônica, limpeza/troca de filtros de ar e combustível, e conferência de calibragem de pneus e alinhamento de eixos.
                      </p>
                    </div>

                    {/* Frente 2: Telemetria & CCO */}
                    <div className={`p-4 rounded-2xl border space-y-2 ${
                      isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-50 border-slate-100'
                    }`}>
                      <div className="flex items-center gap-2 text-sky-400">
                        <Gauge size={16} />
                        <span className="text-xs font-black uppercase tracking-wider">2. Telemetria & CCO</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Auditoria de relatórios de telemetria GPS: verificar RPM fora da faixa verde econômica, tempo ocioso em marcha lenta e velocidade média dos trechos percorridos.
                      </p>
                    </div>

                    {/* Frente 3: Treinamento Operacional */}
                    <div className={`p-4 rounded-2xl border space-y-2 ${
                      isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-50 border-slate-100'
                    }`}>
                      <div className="flex items-center gap-2 text-emerald-400">
                        <User size={16} />
                        <span className="text-xs font-black uppercase tracking-wider">3. Treinamento com Instrutor</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Agendamento de teste prático de rota acompanhada com condutor ({vehicle.motorista || 'NÃO INFORMADO'}) focado em condução preventiva e inércia do veículo.
                      </p>
                    </div>

                    {/* Frente 4: Supervisão de Folhas KM */}
                    <div className={`p-4 rounded-2xl border space-y-2 ${
                      isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-slate-50 border-slate-100'
                    }`}>
                      <div className="flex items-center gap-2 text-purple-400">
                        <FileText size={16} />
                        <span className="text-xs font-black uppercase tracking-wider">4. Conferência de Folhas KM</span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Verificação física das folhas de bordo diárias para assegurar ausência de lacunas de hodômetro ou apontamentos de rotas extraordinárias não registradas.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Local justification note */}
                <div className={`p-5 rounded-2xl border space-y-3 ${
                  isDark ? 'bg-slate-950 border-slate-800' : 'bg-white border-slate-100 shadow-sm'
                }`}>
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black uppercase tracking-wider text-slate-400">
                      Registro de Parecer Técnico & Acompanhamento do Gestor
                    </label>
                    {savedNoteSuccess && (
                      <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 size={13} /> Salvo com sucesso!
                      </span>
                    )}
                  </div>
                  <textarea
                    rows={3}
                    value={localNote}
                    onChange={(e) => setLocalNote(e.target.value)}
                    placeholder="Descreva o plano de ação acordado, retorno da oficina mecânica ou observações da supervisão para este veículo..."
                    className={`w-full p-3 rounded-xl text-xs border outline-none font-medium transition-all ${
                      isDark 
                        ? 'bg-slate-900 border-slate-700 text-white focus:border-cyan-500' 
                        : 'bg-slate-50 border-slate-200 text-slate-900 focus:border-indigo-600'
                    }`}
                  />
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-slate-500">
                      * As anotações ficam salvas de forma segura no navegador para consultas futuras.
                    </span>
                    <button
                      type="button"
                      onClick={handleSaveNote}
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm cursor-pointer"
                    >
                      Salvar Parecer
                    </button>
                  </div>
                </div>

                {/* Navigate to Justifications shortcut */}
                {onNavigateToJustifications && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onNavigateToJustifications(vehicle.placa);
                      }}
                      className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 border cursor-pointer ${
                        isDark 
                          ? 'bg-slate-800 hover:bg-slate-700 text-cyan-400 border-slate-700' 
                          : 'bg-slate-100 hover:bg-slate-200 text-indigo-600 border-slate-200'
                      }`}
                    >
                      <span>Abrir Aba de Justificativas com Este Veículo</span>
                      <ArrowUpRight size={15} />
                    </button>
                  </div>
                )}
              </div>
            )}

          </div>

          {/* FOOTER */}
          <div className={`p-4 md:px-6 border-t flex items-center justify-between shrink-0 text-xs text-slate-400 ${
            isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-50 border-slate-100'
          }`}>
            <span className="font-mono text-[11px]">
              Frota {vehicle.frota} • Placa {vehicle.placa} • {periodoLabel}
            </span>

            <button
              type="button"
              onClick={onClose}
              className={`px-5 py-2 rounded-xl font-bold transition-colors cursor-pointer ${
                isDark ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-slate-200 hover:bg-slate-300 text-slate-800'
              }`}
            >
              Fechar
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
