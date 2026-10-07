import React, { useState, useMemo } from 'react';
import { 
  ClipboardCheck, 
  FileText, 
  Mail, 
  Send, 
  Copy, 
  Check, 
  Download, 
  AlertTriangle, 
  Fuel, 
  Truck, 
  Building2, 
  Calendar, 
  Sliders, 
  CheckCircle2, 
  Sparkles,
  Share2,
  ExternalLink,
  Edit3,
  Flame,
  Wrench,
  Gauge,
  GraduationCap,
  ClipboardList,
  ChevronRight,
  UserCheck,
  Clock,
  ShieldAlert,
  Search,
  Filter,
  Maximize2,
  Layers,
  ArrowUpRight,
  Printer,
  LayoutTemplate,
  X,
  Loader2,
  BarChart3,
  TrendingUp,
  FileCheck,
  User,
  Users,
  ChevronDown,
  RotateCcw,
  Car,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Activity,
  Info,
  History
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import JustificationsTab from './JustificationsTab';
import EmailWhatsAppConsumptionModal from './EmailWhatsAppConsumptionModal';
import { 
  calculateExecutiveSynthesis, 
  ExecutiveSynthesisResult, 
  RecurrentCase, 
  ExcludedVehicleAudit 
} from '../lib/executiveSynthesis';
import { VehicleExplosionModal, VehicleExplosionData } from './VehicleExplosionModal';
import { HistoryDriverVehicleTab } from './HistoryDriverVehicleTab';

interface ActionPlanTabProps {
  consolidatedReportData: any[];
  mergedData: any[];
  driverChartData?: any[];
  targetKml: number;
  periodoLabel: string;
  companyName: string;
  erpSystem?: string;
  reportLogo?: string;
  getLinkedFuelings: (placa: string) => any[];
  getLinkedKms: (placa: string) => any[];
}

export default function ActionPlanTab({
  consolidatedReportData,
  mergedData = [],
  driverChartData = [],
  targetKml,
  periodoLabel,
  companyName,
  erpSystem = 'TOTVS / Protheus',
  reportLogo = '',
  getLinkedFuelings,
  getLinkedKms
}: ActionPlanTabProps) {
  // Navigation between main page (Notificação & Síntese Executiva) and secondary page (Justificativas por Veículo)
  const [activeView, setActiveView] = useState<'sintese_principal' | 'justificativas_veiculos'>('sintese_principal');
  
  // Internal view inside the main synthesis page: Notificação vs Síntese Executiva vs Histórico de Médias
  const [sinteseTab, setSinteseTab] = useState<'notificacao' | 'sintese_executiva' | 'historico_medias'>('notificacao');

  // Week Selection state for Plano de Ação (Default: última semana encerrada ou semana atual com avaliação das 3 anteriores)
  const [referenceWeekKey, setReferenceWeekKey] = useState<string>('auto');
  const [evalMode, setEvalMode] = useState<'previous_3_closed' | 'including_reference_3' | 'custom_weeks'>('previous_3_closed');
  const [selectedCustomWeeks, setSelectedCustomWeeks] = useState<string[]>([]);

  // Meta & filter state
  const [metaKml, setMetaKml] = useState<number>(() => targetKml || 2.5);
  const [minActiveDaysMode, setMinActiveDaysMode] = useState<'auto' | 'regular_4' | 'rigorous_7' | 'custom'>('auto');
  const [customMinActiveDays, setCustomMinActiveDays] = useState<number>(4);
  const [minPeriodKm, setMinPeriodKm] = useState<number>(200);
  const [showExcludedAuditModal, setShowExcludedAuditModal] = useState<boolean>(false);
  const [filterMode, setFilterMode] = useState<'below_only' | 'all'>('below_only');
  const [filterScope, setFilterScope] = useState<'all' | 'placa' | 'motorista'>('all');
  const [selectedPlaca, setSelectedPlaca] = useState<string>('ALL');
  const [selectedDriver, setSelectedDriver] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortField, setSortField] = useState<'frota' | 'placa' | 'motorista' | 'operacao' | 'km' | 'litros' | 'media' | 'desvio' | 'excedente'>('media');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [copiedType, setCopiedType] = useState<'whatsapp' | 'email' | 'table' | 'sintese' | null>(null);
  const [isEditingGuideline, setIsEditingGuideline] = useState<boolean>(false);
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [selectedExplosionVehicle, setSelectedExplosionVehicle] = useState<VehicleExplosionData | null>(null);

  // Modal de Opções de Exportação & Impressão (Paisagem / Horizontal como padrão)
  const [showExportOptionsModal, setShowExportOptionsModal] = useState<boolean>(false);
  const [exportReportMode, setExportReportMode] = useState<'consolidated' | 'detailed'>('consolidated');
  const [exportOrientation, setExportOrientation] = useState<'landscape' | 'portrait'>('landscape');
  const [exportIncludeExecutiveSummary, setExportIncludeExecutiveSummary] = useState<boolean>(true);
  const [exportIncludeGuidelines, setExportIncludeGuidelines] = useState<boolean>(true);
  const [exportIncludeKpis, setExportIncludeKpis] = useState<boolean>(true);
  const [exportIncludeTable, setExportIncludeTable] = useState<boolean>(true);
  const [exportIncludeActionMatrix, setExportIncludeActionMatrix] = useState<boolean>(true);
  const [exportIncludeSignatures, setExportIncludeSignatures] = useState<boolean>(true);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState<boolean>(false);

  // Calculate current week of year
  const currentWeekInfo = useMemo(() => {
    const now = new Date();
    const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
    const weekNoStr = String(weekNo).padStart(2, '0');
    const year = d.getUTCFullYear();

    return {
      weekNo,
      weekNoStr,
      year,
      fullLabel: `Semana ${weekNoStr} (${weekNo}ª Sem/${year})`,
      shortLabel: `Sem. ${weekNoStr}/${year}`,
      displayBadge: `SEMANA ATUAL: ${weekNoStr}ª (${year})`,
      tag: `Semana ${weekNoStr}`
    };
  }, []);

  // Professional corporate notification guidelines text with the mandatory 3-week rule
  const defaultGuidelineText = useMemo(() => {
    return `Prezados Supervisores e Gestores Operacionais,

Solicitamos a verificação pontual dos veículos listados abaixo, cujas médias de consumo de combustível ficaram abaixo da meta operacional estabelecida de ${metaKml.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} km/L no período em referência.

Ressaltamos a extrema importância de validar e confirmar o envio de 100% das "Folhas KM" de toda a frota. Lembramos que a ausência ou pendência de qualquer folha de KM compromete diretamente o cálculo da quilometragem produtiva e impacta negativamente o atingimento da meta da operação.

Pedimos a gentileza de contatar e alinhar com os respectivos motoristas responsáveis para apuração das condições de condução, trajetos executados ou eventuais anomalias mecânicas/operacionais.

DIRETRIZ CORPORATIVA DE RECORRÊNCIA: Fica formalmente estabelecido que, caso o mesmo motorista e/ou veículo (placa/frota) apresente média de consumo abaixo da meta por 3 (três) semanas consecutivas, a Supervisão Operacional e a Gestão de Frota deverão adotar e formalizar imediatamente um PLANO DE AÇÃO PARA MELHORIAS, integrando auditoria mecânica detalhada, análise de telemetria e reciclagem prática de condução econômica com os instrutores de tráfego.

Na sequência, solicitamos o retorno formal com as devidas justificativas técnicas e planos de ação para que possamos consolidar e reportar os resultados à Diretoria Executiva.

Agradecemos pelo contínuo empenho na otimização da eficiência energética e sustentabilidade da nossa frota.`;
  }, [metaKml]);

  const [guidelineText, setGuidelineText] = useState<string>(defaultGuidelineText);

  // Sync guideline text when meta changes if not custom edited
  React.useEffect(() => {
    if (!isEditingGuideline) {
      setGuidelineText(defaultGuidelineText);
    }
  }, [defaultGuidelineText, isEditingGuideline]);

  // Build mapping from vehicle (plate / frota) to primary driver name
  const vehicleToDriverMap = useMemo(() => {
    const map = new Map<string, string>();
    const vehicleDriverKm = new Map<string, Map<string, number>>();

    // 1. Ingest from driverChartData (which matches the "Consumo por Motorista" dashboard exactly)
    if (driverChartData && Array.isArray(driverChartData)) {
      driverChartData.forEach(d => {
        const rawName = String(d.name || d.motorista || d.driver || '').trim();
        if (!rawName || rawName === 'NÃO INFORMADO' || rawName === 'N/A' || rawName === '-' || rawName === 'SEM MOTORISTA' || rawName.toLowerCase().startsWith('motorista (')) return;
        const driverName = rawName.toUpperCase();

        // Check associated plates
        if (d.placas) {
          const plates = d.placas instanceof Set ? Array.from(d.placas) : (Array.isArray(d.placas) ? d.placas : [d.placas]);
          plates.forEach((p: any) => {
            const normP = String(p || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
            if (normP) {
              if (!vehicleDriverKm.has(normP)) vehicleDriverKm.set(normP, new Map());
              const dKm = vehicleDriverKm.get(normP)!;
              dKm.set(driverName, (dKm.get(driverName) || 0) + (Number(d.kmProdutivo) || Number(d.kmTotal) || Number(d.km) || 100));
            }
          });
        }

        // Check associated frotas
        if (d.frotas) {
          const frotas = d.frotas instanceof Set ? Array.from(d.frotas) : (Array.isArray(d.frotas) ? d.frotas : [d.frotas]);
          frotas.forEach((f: any) => {
            const normF = String(f || '').trim().toUpperCase();
            if (normF && normF !== 'N/A' && normF !== 'SEMVEIC') {
              const keyF = `FROTA_${normF}`;
              if (!vehicleDriverKm.has(keyF)) vehicleDriverKm.set(keyF, new Map());
              const dKm = vehicleDriverKm.get(keyF)!;
              dKm.set(driverName, (dKm.get(driverName) || 0) + (Number(d.kmProdutivo) || Number(d.kmTotal) || Number(d.km) || 100));
            }
          });
        }
      });
    }

    // 2. Ingest from raw mergedData records
    if (mergedData && Array.isArray(mergedData)) {
      mergedData.forEach(r => {
        const rawDriver = String(r.MOTORISTA || r.motorista || r.CONDUTOR || r.condutor || r.NOME_MOTORISTA || r.NOME || '').trim().toUpperCase();
        if (!rawDriver || rawDriver === 'N/A' || rawDriver === '-' || rawDriver === 'NÃO INFORMADO' || rawDriver === 'SEM MOTORISTA' || rawDriver.startsWith('MOTORISTA (')) return;

        const normPlate = String(r.PLACA || r.placa || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
        const normFrota = String(r.FROTA || r.frota || '').trim().toUpperCase();
        const km = Number(r.KM_PRODUTIVO || r.KM_TOTAL || r.KM || r.km || 1);

        if (normPlate) {
          if (!vehicleDriverKm.has(normPlate)) vehicleDriverKm.set(normPlate, new Map());
          const dKm = vehicleDriverKm.get(normPlate)!;
          dKm.set(rawDriver, (dKm.get(rawDriver) || 0) + km);
        }
        if (normFrota && normFrota !== 'N/A' && normFrota !== 'SEMVEIC') {
          const keyF = `FROTA_${normFrota}`;
          if (!vehicleDriverKm.has(keyF)) vehicleDriverKm.set(keyF, new Map());
          const dKm = vehicleDriverKm.get(keyF)!;
          dKm.set(rawDriver, (dKm.get(rawDriver) || 0) + km);
        }
      });
    }

    // Select the primary driver (with highest KM share) for each plate and frota
    vehicleDriverKm.forEach((driverMap, key) => {
      let topDriver = '';
      let maxKm = -1;
      driverMap.forEach((km, driver) => {
        if (km > maxKm) {
          maxKm = km;
          topDriver = driver;
        }
      });
      if (topDriver) {
        map.set(key, topDriver);
      }
    });

    return map;
  }, [driverChartData, mergedData]);

  // Base raw mapped items
  const baseItems = useMemo(() => {
    if (!consolidatedReportData || !Array.isArray(consolidatedReportData)) return [];

    return consolidatedReportData
      .map(item => {
        const km = Number(item.kmProdutivo !== undefined && item.kmProdutivo > 0 ? item.kmProdutivo : (item.km !== undefined && item.km > 0 ? item.km : (item.kmTotal || item.KM || item.totalKm || 0)));
        const litros = Number(item.litros !== undefined ? item.litros : (item.LITROS || item.totalLitros || 0));
        const media = Number(item.kml !== undefined && item.kml > 0 ? item.kml : (item.MEDIA || item.media || (litros > 0 ? km / litros : 0)));
        const frota = String(item.FROTA || item.frota || item.VEICULO || '').trim();
        const placa = String(item.PLACA || item.placa || '').trim();
        const normPlate = placa.toUpperCase().replace(/[^A-Z0-9]/g, '');
        const normFrotaKey = `FROTA_${frota.toUpperCase().trim()}`;
        
        const rawItemDriver = String(item.MOTORISTA || item.motorista || item.CONDUTOR || '').trim();
        const resolvedDriver = (rawItemDriver && rawItemDriver !== 'N/A' && rawItemDriver !== '-' && rawItemDriver !== 'NÃO IDENTIFICADO' && rawItemDriver !== 'NÃO INFORMADO')
          ? rawItemDriver
          : (vehicleToDriverMap.get(normPlate) || vehicleToDriverMap.get(normFrotaKey) || 'NÃO IDENTIFICADO');

        const operacao = String(item.OPERACAO || item.operacao || item.LINHA || '').trim();
        const desvioPercent = metaKml > 0 ? ((media - metaKml) / metaKml) * 100 : 0;
        const litrosExcedentes = media < metaKml && media > 0 ? (km / media) - (km / metaKml) : 0;

        return {
          ...item,
          frota,
          placa,
          motorista: resolvedDriver,
          operacao: operacao || 'OPERACIONAL',
          km,
          litros,
          media,
          desvioPercent,
          litrosExcedentes: Math.max(0, litrosExcedentes),
          isBelow: media < metaKml && km > 0 && litros > 0
        };
      })
      .filter(item => item.km > 0 && item.litros > 0);
  }, [consolidatedReportData, metaKml, vehicleToDriverMap]);

  // Unique list of plates with frota & driver for the selector
  const uniquePlatesList = useMemo(() => {
    const map = new Map<string, { key: string; placa: string; frota: string; motorista: string; media: number; isBelow: boolean }>();
    baseItems.forEach(item => {
      const key = item.placa || item.frota;
      if (!key) return;
      if (!map.has(key)) {
        map.set(key, {
          key,
          placa: item.placa,
          frota: item.frota,
          motorista: item.motorista,
          media: item.media,
          isBelow: item.isBelow
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => (a.frota || a.placa).localeCompare(b.frota || b.placa));
  }, [baseItems]);

  // Unique list of drivers for the selector (source of truth from driverChartData)
  const uniqueDriversList = useMemo(() => {
    if (driverChartData && Array.isArray(driverChartData) && driverChartData.length > 0) {
      return driverChartData
        .filter(d => {
          const name = String(d.name || d.motorista || '').trim();
          return name && name !== 'NÃO INFORMADO' && name !== 'N/A' && name !== '-';
        })
        .map(d => {
          const name = String(d.name || d.motorista || '').trim();
          const frotas = d.frotasList ? String(d.frotasList).split(', ').filter(Boolean) : (d.frota ? [String(d.frota)] : []);
          return {
            name,
            count: d.trips || 1,
            frotas,
            avgMedia: Number(d.kml || 0),
            totalKm: Number(d.km || d.kmProdutivo || 0),
            totalLitros: Number(d.litros || 0)
          };
        })
        .sort((a, b) => a.name.localeCompare(b.name));
    }

    const map = new Map<string, { name: string; count: number; frotas: string[]; avgMedia: number; totalKm: number; totalLitros: number }>();
    baseItems.forEach(item => {
      const driver = item.motorista || 'NÃO IDENTIFICADO';
      if (!map.has(driver)) {
        map.set(driver, { name: driver, count: 0, frotas: [], avgMedia: 0, totalKm: 0, totalLitros: 0 });
      }
      const d = map.get(driver)!;
      d.count += 1;
      if (item.frota && !d.frotas.includes(item.frota)) d.frotas.push(item.frota);
      if (item.placa && !d.frotas.includes(item.placa)) d.frotas.push(item.placa);
      d.totalKm += item.km;
      d.totalLitros += item.litros;
    });

    return Array.from(map.values())
      .map(d => ({
        ...d,
        avgMedia: d.totalLitros > 0 ? d.totalKm / d.totalLitros : 0
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [baseItems, driverChartData]);

  // Filter and compute outlier items
  const processedItems = useMemo(() => {
    return baseItems
      .filter(item => {
        if (filterMode === 'below_only') return item.isBelow;
        return true;
      })
      .filter(item => {
        if (filterScope === 'placa' && selectedPlaca !== 'ALL') {
          return item.placa.toUpperCase() === selectedPlaca.toUpperCase() || 
                 item.frota.toUpperCase() === selectedPlaca.toUpperCase();
        }
        if (filterScope === 'motorista' && selectedDriver !== 'ALL') {
          return item.motorista.toUpperCase() === selectedDriver.toUpperCase();
        }
        return true;
      })
      .filter(item => {
        if (!searchTerm.trim()) return true;
        const term = searchTerm.toLowerCase();
        return (
          item.frota.toLowerCase().includes(term) ||
          item.placa.toLowerCase().includes(term) ||
          item.motorista.toLowerCase().includes(term) ||
          item.operacao.toLowerCase().includes(term)
        );
      });
  }, [baseItems, filterMode, filterScope, selectedPlaca, selectedDriver, searchTerm]);

  // Dynamic multi-column sorting handler
  const handleSort = (field: 'frota' | 'placa' | 'motorista' | 'operacao' | 'km' | 'litros' | 'media' | 'desvio' | 'excedente') => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      // For media, asc is default (lowest first = worst first). For numbers (km, litros, excedente), desc is default. For text, asc is default.
      if (field === 'media') {
        setSortDirection('asc');
      } else if (field === 'km' || field === 'litros' || field === 'excedente' || field === 'desvio') {
        setSortDirection('desc');
      } else {
        setSortDirection('asc');
      }
    }
  };

  // Sort vehicles dynamically based on sortField and sortDirection
  const sortedVehicles = useMemo(() => {
    return [...processedItems].sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'frota':
          comparison = a.frota.localeCompare(b.frota, undefined, { numeric: true, sensitivity: 'base' });
          break;
        case 'placa':
          comparison = a.placa.localeCompare(b.placa, undefined, { numeric: true, sensitivity: 'base' });
          break;
        case 'motorista':
          comparison = a.motorista.localeCompare(b.motorista, undefined, { sensitivity: 'base' });
          break;
        case 'operacao':
          comparison = a.operacao.localeCompare(b.operacao, undefined, { sensitivity: 'base' });
          break;
        case 'km':
          comparison = a.km - b.km;
          break;
        case 'litros':
          comparison = a.litros - b.litros;
          break;
        case 'media':
          comparison = a.media - b.media;
          break;
        case 'desvio':
          comparison = a.desvioPercent - b.desvioPercent;
          break;
        case 'excedente':
          comparison = a.litrosExcedentes - b.litrosExcedentes;
          break;
        default:
          comparison = a.media - b.media;
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [processedItems, sortField, sortDirection]);

  // Group by operation
  const groupedByOperation = useMemo(() => {
    const map = new Map<string, typeof sortedVehicles>();
    sortedVehicles.forEach(v => {
      const op = v.operacao || 'GERAL / DIVERSOS';
      if (!map.has(op)) {
        map.set(op, []);
      }
      map.get(op)!.push(v);
    });
    return Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length);
  }, [sortedVehicles]);

  // Overall totals for the notification
  const totals = useMemo(() => {
    const totalKm = sortedVehicles.reduce((acc, curr) => acc + curr.km, 0);
    const totalLitros = sortedVehicles.reduce((acc, curr) => acc + curr.litros, 0);
    const avgKml = totalLitros > 0 ? totalKm / totalLitros : 0;
    const totalLitrosExcedentes = sortedVehicles.reduce((acc, curr) => acc + curr.litrosExcedentes, 0);

    return {
      count: sortedVehicles.length,
      totalKm,
      totalLitros,
      avgKml,
      totalLitrosExcedentes
    };
  }, [sortedVehicles]);

  // Executive Synthesis Engine: Detects 3 consecutive weeks below target,
  // strictly enforcing operational regularity and eliminating sporadic 1-2 day trips.
  const executiveResult = useMemo<ExecutiveSynthesisResult>(() => {
    let minActiveDays: number | undefined = undefined;
    if (minActiveDaysMode === 'regular_4') minActiveDays = 4;
    else if (minActiveDaysMode === 'rigorous_7') minActiveDays = 7;
    else if (minActiveDaysMode === 'custom') minActiveDays = customMinActiveDays;

    return calculateExecutiveSynthesis(mergedData, consolidatedReportData, {
      metaKml,
      minActiveDays,
      minPeriodKm,
      minWeeklyKm: 60,
      referenceWeek: referenceWeekKey !== 'auto' ? referenceWeekKey : undefined,
      evalMode,
      customTargetWeeks: evalMode === 'custom_weeks' && selectedCustomWeeks.length > 0 ? selectedCustomWeeks : undefined
    });
  }, [mergedData, consolidatedReportData, metaKml, minActiveDaysMode, customMinActiveDays, minPeriodKm, referenceWeekKey, evalMode, selectedCustomWeeks]);

  const recurrentCases = executiveResult.recurrentCases;
  const weekSelectionInfo = executiveResult.weekSelectionInfo;

  // Text generators
  const generateWhatsAppMessage = () => {
    const dateStr = new Date().toLocaleDateString('pt-BR');
    let text = `📊 *RELATÓRIO DE NOTIFICAÇÃO E PLANO DE AÇÃO DE CONSUMO*\n`;
    text += `🏢 *Empresa:* ${companyName}\n`;
    text += `📅 *Competência/Período:* ${periodoLabel.toUpperCase()}\n`;
    text += `🗓️ *Semana Atual:* Semana ${currentWeekInfo.weekNoStr} (${currentWeekInfo.year})\n`;
    text += `🎯 *Meta Operacional:* ${metaKml.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} km/L\n`;
    text += `⏱️ *Data de Emissão:* ${dateStr}\n\n`;
    
    text += `⚠️ *DIRETRIZES OPERACIONAIS E REGRA DE RECORRÊNCIA:*\n`;
    text += `${guidelineText}\n\n`;
    
    text += `📋 *RESUMO GERAL DOS VEÍCULOS FORA DA META (${sortedVehicles.length} VEÍCULOS):*\n`;
    text += `• *Quilometragem Total:* ${totals.totalKm.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} km\n`;
    text += `• *Volume Consumido:* ${totals.totalLitros.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} L\n`;
    text += `• *Média Geral do Grupo:* ${totals.avgKml.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} km/L\n`;
    if (totals.totalLitrosExcedentes > 0) {
      text += `• *Litros Excedentes Estimados:* +${totals.totalLitrosExcedentes.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} L\n`;
    }
    text += `\n───────────────────────────────\n`;
    text += `🚍 *LISTA DETALHADA POR OPERAÇÃO / VEÍCULO:*\n\n`;

    groupedByOperation.forEach(([opName, vehicles]) => {
      text += `📍 *${opName.toUpperCase()}* (${vehicles.length} veículos)\n`;
      vehicles.forEach(v => {
        const desvioStr = v.desvioPercent < 0 ? `${v.desvioPercent.toFixed(1)}%` : `+${v.desvioPercent.toFixed(1)}%`;
        text += `▪ *Frota ${v.frota}* (${v.placa}) - *Média: ${v.media.toFixed(2)} km/L* [${desvioStr}]\n`;
        text += `   KM: ${v.km.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} | Litros: ${v.litros.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} | Condutor: ${v.motorista}\n`;
      });
      text += `\n`;
    });

    if (recurrentCases.length > 0) {
      text += `🚨 *CASOS CRÍTICOS COM RECORRÊNCIA (3 SEMANAS CONSECUTIVAS):*\n`;
      recurrentCases.forEach((rc, i) => {
        text += `🔴 *${i + 1}. Frota ${rc.frota} (${rc.placa})* | Média Consecutiva: *${rc.avgKmlConsecutive.toFixed(2)} km/L*\n`;
        text += `   • ${rc.driverRegimeLabel}\n`;
        text += `   • Regularidade: ${rc.totalActiveDays} dias operados (${rc.periodTotalKm.toLocaleString('pt-BR')} km no período)\n`;
        text += `   • Histórico Semanal: ${rc.weeksDetails.map(w => `${w.semanaLabel}: ${w.kml.toFixed(2)} km/L`).join(' ➔ ')}\n`;
        text += `   • Plano de Ação: ${rc.suggestedAction}\n\n`;
      });
    } else {
      text += `✅ *SÍNTESE EXECUTIVA DE RECORRÊNCIA:*\n`;
      text += `Nenhum veículo com operação regular no período analisado apresentou 3 semanas consecutivas abaixo de ${metaKml.toFixed(2)} km/L.\n\n`;
    }

    text += `\n⚠️ *Ação Requerida:* Favor responder com as justificativas formais e os planos de ação até o prazo estabelecido.`;
    return text;
  };

  const handleCopyWhatsApp = () => {
    const text = generateWhatsAppMessage();
    navigator.clipboard.writeText(text);
    setCopiedType('whatsapp');
    setTimeout(() => setCopiedType(null), 3000);
  };

  const handleOpenMailto = () => {
    const subject = encodeURIComponent(`[PLANO DE AÇÃO & JUSTIFICATIVAS] Médias de Consumo - Frota ${companyName} (${periodoLabel} - Sem. ${currentWeekInfo.weekNoStr})`);
    const body = encodeURIComponent(generateWhatsAppMessage().replace(/\*/g, ''));
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  const handleCopyEmailHtml = () => {
    const dateStr = new Date().toLocaleDateString('pt-BR');
    const html = `
      <div style="font-family: Arial, sans-serif; color: #1e293b; max-width: 760px; padding: 16px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
        <div style="background-color: #0f172a; color: #ffffff; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
          <h2 style="margin: 0 0 6px 0; font-size: 18px; font-weight: bold;">Plano de Ação Integrado de Justificativas de Consumo</h2>
          <p style="margin: 0; font-size: 12px; color: #94a3b8;">${companyName} • Competência: <strong>${periodoLabel.toUpperCase()}</strong> • Semana Atual: <strong>Semana ${currentWeekInfo.weekNoStr}/${currentWeekInfo.year}</strong> • Meta: <strong>${metaKml.toFixed(2)} km/L</strong></p>
        </div>
        
        <div style="background-color: #fef3c7; border-left: 4px solid #d97706; padding: 14px 16px; margin-bottom: 16px; font-size: 13px; line-height: 1.55; color: #78350f; border-radius: 6px;">
          <h4 style="margin: 0 0 6px 0; font-size: 13px; font-weight: bold; color: #92400e;">DIRETRIZES OPERACIONAIS E REGRA DE RECORRÊNCIA (3 SEMANAS CONSECUTIVAS)</h4>
          ${guidelineText.replace(/\n/g, '<br/>')}
        </div>

        <table style="width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 16px;">
          <thead>
            <tr style="background-color: #0f172a; color: #ffffff;">
              <th style="padding: 8px 10px; text-align: left;">Frota / Placa</th>
              <th style="padding: 8px 10px; text-align: left;">Motorista</th>
              <th style="padding: 8px 10px; text-align: left;">Operação</th>
              <th style="padding: 8px 10px; text-align: right;">KM</th>
              <th style="padding: 8px 10px; text-align: right;">Litros</th>
              <th style="padding: 8px 10px; text-align: right;">Média</th>
              <th style="padding: 8px 10px; text-align: center;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${sortedVehicles.map((v, i) => `
              <tr style="background-color: ${i % 2 === 0 ? '#f8fafc' : '#ffffff'}; border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 8px 10px; font-weight: bold; color: #0f172a;">${v.frota} <span style="font-weight: normal; color: #64748b;">(${v.placa})</span></td>
                <td style="padding: 8px 10px; color: #334155;">${v.motorista}</td>
                <td style="padding: 8px 10px; color: #475569;">${v.operacao}</td>
                <td style="padding: 8px 10px; text-align: right;">${v.km.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</td>
                <td style="padding: 8px 10px; text-align: right;">${v.litros.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</td>
                <td style="padding: 8px 10px; text-align: right; font-weight: bold; color: ${v.media < metaKml ? '#dc2626' : '#16a34a'};">${v.media.toFixed(2)} km/L</td>
                <td style="padding: 8px 10px; text-align: center; color: #dc2626; font-weight: bold;">${v.desvioPercent.toFixed(1)}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <p style="font-size: 11px; color: #64748b; margin-top: 16px;">Relatório emitido em ${dateStr} através do FleetFlow Inteligência de Frota.</p>
      </div>
    `;

    navigator.clipboard.writeText(html);
    setCopiedType('email');
    setTimeout(() => setCopiedType(null), 3000);
  };

  // Open Export Modal
  const handleExportPDF = () => {
    setShowExportOptionsModal(true);
  };

  // Generate Executive PDF matching company styling with full custom options and Landscape default
  const handleGeneratePDF = async (action: 'download' | 'print' = 'download') => {
    setIsGeneratingPdf(true);
    try {
      const isLandscape = exportOrientation === 'landscape';
      const doc = new jsPDF(isLandscape ? 'l' : 'p', 'mm', 'a4');
      const pageWidth = isLandscape ? 297 : 210;
      const pageHeight = isLandscape ? 210 : 297;
      const margin = 12;
      const printableWidth = pageWidth - (margin * 2);
      const dateStr = new Date().toLocaleString('pt-BR');

      const cleanTextForPdf = (str: string) => {
        if (!str) return '';
        return str
          .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F1E6}-\u{1F1FF}]/gu, '')
          .trim();
      };

      const drawCorporateHeader = () => {
        // Slate Header Banner
        doc.setFillColor(15, 23, 42); // slate-900
        doc.rect(0, 0, pageWidth, 35, 'F');

        // Emerald accent bar
        doc.setFillColor(16, 185, 129); // emerald-500
        doc.rect(0, 0, 5, 35, 'F');

        let textOffsetLeft = 14;

        if (reportLogo) {
          try {
            doc.addImage(reportLogo, 'PNG', 14, 5, 26, 14, undefined, 'FAST');
            textOffsetLeft = 44;
          } catch {
            // Fallback if image fails
          }
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(isLandscape ? 14 : 12.5);
        doc.setTextColor(255, 255, 255);
        doc.text('Plano de Ação Integrado de Justificativas de Consumo', textOffsetLeft, 13);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.2);
        doc.setTextColor(148, 163, 184); // slate-400
        doc.text(`${companyName} • Gerado com IA em ${dateStr} • ERP: ${erpSystem} • Orientação: ${isLandscape ? 'Paisagem (Horizontal)' : 'Retrato (Vertical)'}`, textOffsetLeft, 19);

        const badgeWidth = pageWidth - textOffsetLeft - margin;
        doc.setFillColor(30, 41, 59); // slate-800
        doc.roundedRect(textOffsetLeft, 23, badgeWidth, 7.5, 1.5, 1.5, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.8);
        doc.setTextColor(203, 213, 225); // slate-300
        doc.text(`COMPETÊNCIA/PERÍODO: ${periodoLabel.toUpperCase()}`, textOffsetLeft + 3, 28);

        doc.setTextColor(56, 189, 248); // sky-400
        const weekPosX = textOffsetLeft + (badgeWidth * (isLandscape ? 0.38 : 0.42));
        doc.text(`SEMANA ATUAL: SEM. ${currentWeekInfo.weekNoStr}/${currentWeekInfo.year}`, weekPosX, 28);

        doc.setTextColor(52, 211, 153); // emerald-400
        doc.text(`META OPERACIONAL: ${metaKml.toFixed(2)} KM/L`, textOffsetLeft + badgeWidth - 4, 28, { align: 'right' });
      };

      drawCorporateHeader();

      let currentY = 40;

      // 1. CARDS DE INDICADORES EXECUTIVOS (KPIS)
      if (exportIncludeKpis) {
        const cardCount = 4;
        const cardGap = 4;
        const cardWidth = (printableWidth - (cardGap * (cardCount - 1))) / cardCount;
        const cardHeight = 15;

        const kpis = [
          { label: 'VEÍCULOS / LANÇAMENTOS', val: `${sortedVehicles.length} un.`, sub: `${totals.count} abaixo da meta`, color: [248, 250, 252], border: [203, 213, 225], textCol: [15, 23, 42] },
          { label: 'QUILOMETRAGEM TOTAL', val: `${totals.totalKm.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} km`, sub: '100% folhas KM validadas', color: [238, 242, 255], border: [199, 210, 254], textCol: [67, 56, 202] },
          { label: 'VOLUME CONSUMIDO', val: `${totals.totalLitros.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} L`, sub: totals.totalLitrosExcedentes > 0 ? `+${Math.round(totals.totalLitrosExcedentes)} L excedentes` : 'Dentro do previsto', color: [255, 241, 242], border: [254, 205, 211], textCol: [190, 18, 60] },
          { label: 'MÉDIA GERAL DO GRUPO', val: `${totals.avgKml.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} km/L`, sub: `Meta: ${metaKml.toFixed(2)} km/L (${totals.avgKml < metaKml ? 'Abaixo da Meta' : 'Atingiu Meta'})`, color: [240, 253, 244], border: [187, 247, 208], textCol: [21, 128, 61] }
        ];

        kpis.forEach((kpi, index) => {
          const cardX = margin + (index * (cardWidth + cardGap));
          doc.setFillColor(kpi.color[0], kpi.color[1], kpi.color[2]);
          doc.setDrawColor(kpi.border[0], kpi.border[1], kpi.border[2]);
          doc.setLineWidth(0.3);
          doc.roundedRect(cardX, currentY, cardWidth, cardHeight, 1.5, 1.5, 'FD');

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(5.6);
          doc.setTextColor(100, 116, 139);
          doc.text(kpi.label, cardX + 3, currentY + 3.8);

          doc.setFontSize(8.5);
          doc.setTextColor(kpi.textCol[0], kpi.textCol[1], kpi.textCol[2]);
          doc.text(kpi.val, cardX + 3, currentY + 8.8);

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(5.2);
          doc.setTextColor(100, 116, 139);
          doc.text(kpi.sub, cardX + 3, currentY + 12.8);
        });

        currentY += cardHeight + 4;
      }

      // 2. DIRETRIZES OPERACIONAIS E REGRA DE RECORRÊNCIA (3 SEMANAS CONSECUTIVAS)
      if (exportIncludeGuidelines) {
        doc.setFillColor(254, 243, 199); // amber-100
        doc.roundedRect(margin, currentY, printableWidth, 6, 1.2, 1.2, 'F');
        doc.setFillColor(217, 119, 6); // amber-600
        doc.rect(margin, currentY, 3, 6, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.2);
        doc.setTextColor(146, 64, 14); // amber-900
        doc.text('DIRETRIZES OPERACIONAIS E REGRA DE RECORRÊNCIA (3 SEMANAS CONSECUTIVAS):', margin + 6, currentY + 4.2);

        currentY += 7.8;

        const textWidth = printableWidth - 8;
        const textStartX = margin + 4;
        const rawParagraphs = guidelineText.split('\n').map(p => cleanTextForPdf(p)).filter(p => p.length > 0);

        doc.setFontSize(isLandscape ? 7.2 : 6.8);
        const lineHeightFactor = isLandscape ? 3.2 : 3.0;
        const paragraphGap = 1.8;

        let calculatedContentHeight = 5;
        const measuredParagraphs: { lines: string[]; isRecurrenceRule: boolean }[] = [];

        rawParagraphs.forEach(p => {
          const isRecurrenceRule = p.toUpperCase().includes('DIRETRIZ CORPORATIVA DE RECORRÊNCIA') || p.toUpperCase().includes('3 (TRÊS) SEMANAS') || p.toUpperCase().includes('3 SEMANAS');
          if (isRecurrenceRule) {
            doc.setFont('helvetica', 'bold');
          } else {
            doc.setFont('helvetica', 'normal');
          }
          const lines = doc.splitTextToSize(p, textWidth);
          measuredParagraphs.push({ lines, isRecurrenceRule });
          calculatedContentHeight += (lines.length * lineHeightFactor) + paragraphGap;
        });

        const boxHeight = calculatedContentHeight;

        doc.setFillColor(255, 251, 235); // amber-50
        doc.setDrawColor(253, 230, 138); // amber-200
        doc.setLineWidth(0.3);
        doc.roundedRect(margin, currentY, printableWidth, boxHeight, 1.5, 1.5, 'FD');

        let textCursorY = currentY + 4;
        measuredParagraphs.forEach(({ lines, isRecurrenceRule }) => {
          if (isRecurrenceRule) {
            const ruleHeight = (lines.length * lineHeightFactor) + 2.2;
            doc.setFillColor(254, 226, 226); // red-100
            doc.setDrawColor(248, 113, 113); // red-400
            doc.roundedRect(margin + 2, textCursorY - 2.8, printableWidth - 4, ruleHeight, 1.2, 1.2, 'FD');
            doc.setFillColor(220, 38, 38); // red-600
            doc.rect(margin + 2, textCursorY - 2.8, 2.5, ruleHeight, 'F');

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(isLandscape ? 7.2 : 6.8);
            doc.setTextColor(153, 27, 27); // red-800
            doc.text(lines, textStartX + 1, textCursorY);
            textCursorY += (lines.length * lineHeightFactor) + paragraphGap + 2;
          } else {
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(isLandscape ? 7.2 : 6.8);
            doc.setTextColor(51, 65, 85); // slate-700
            doc.text(lines, textStartX, textCursorY);
            textCursorY += (lines.length * lineHeightFactor) + paragraphGap;
          }
        });

        currentY += boxHeight + 4.5;
      }

      // 3. TABELA ANALÍTICA / QUADRO RESUMO DE VEÍCULOS
      if (exportIncludeTable) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.2);
        doc.setTextColor(15, 23, 42);
        doc.text(`Quadro Resumo de Veículos ${filterMode === 'below_only' ? 'Fora da Média Ideal' : 'da Operação'} (${sortedVehicles.length} veículos listados)`, margin, currentY);

        currentY += 2;

        const tableHeader = [
          ['Frota', 'Placa', 'Motorista', 'Operação', 'KM', 'Litros', 'Média', 'Desvio', 'Excedente (L)']
        ];

        const tableBody = sortedVehicles.map(v => [
          v.frota,
          v.placa,
          v.motorista,
          v.operacao,
          v.km.toLocaleString('pt-BR', { maximumFractionDigits: 0 }),
          v.litros.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
          `${v.media.toFixed(2)} km/L`,
          `${v.desvioPercent.toFixed(1)}%`,
          v.litrosExcedentes > 0 ? `+${Math.round(v.litrosExcedentes)} L` : '-'
        ]);

        const columnStylesLandscape = {
          0: { fontStyle: 'bold', halign: 'center', cellWidth: 18 },
          1: { fontStyle: 'bold', halign: 'center', cellWidth: 24 },
          2: { cellWidth: 64 },
          3: { cellWidth: 48 },
          4: { halign: 'right', cellWidth: 22 },
          5: { halign: 'right', cellWidth: 22 },
          6: { halign: 'right', fontStyle: 'bold', textColor: [220, 38, 38], cellWidth: 24 },
          7: { halign: 'center', fontStyle: 'bold', textColor: [185, 28, 28], cellWidth: 23 },
          8: { halign: 'right', textColor: [194, 65, 12], cellWidth: 28 }
        };

        const columnStylesPortrait = {
          0: { fontStyle: 'bold', halign: 'center', cellWidth: 14 },
          1: { fontStyle: 'bold', halign: 'center', cellWidth: 18 },
          2: { cellWidth: 44 },
          3: { cellWidth: 32 },
          4: { halign: 'right', cellWidth: 16 },
          5: { halign: 'right', cellWidth: 16 },
          6: { halign: 'right', fontStyle: 'bold', textColor: [220, 38, 38], cellWidth: 16 },
          7: { halign: 'center', fontStyle: 'bold', textColor: [185, 28, 28], cellWidth: 14 },
          8: { halign: 'right', textColor: [194, 65, 12], cellWidth: 16 }
        };

        autoTable(doc, {
          startY: currentY,
          head: tableHeader,
          body: tableBody,
          theme: 'grid',
          tableWidth: printableWidth,
          headStyles: {
            fillColor: [15, 23, 42],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: isLandscape ? 7.2 : 6.5,
            halign: 'center',
            cellPadding: 1.8
          },
          styles: {
            fontSize: isLandscape ? 6.8 : 6.2,
            cellPadding: isLandscape ? 1.8 : 1.4,
            textColor: [30, 41, 59],
            lineColor: [226, 232, 240],
            lineWidth: 0.1
          },
          alternateRowStyles: {
            fillColor: [248, 250, 252]
          },
          columnStyles: (isLandscape ? columnStylesLandscape : columnStylesPortrait) as any,
          margin: { top: 40, bottom: 12, left: margin, right: margin },
          didDrawPage: (data) => {
            if (data.pageNumber > 1) {
              drawCorporateHeader();
            }
          }
        });
      }

      // 4. SÍNTESE EXECUTIVA DE RECORRÊNCIA (3 SEMANAS CONSECUTIVAS)
      if (exportIncludeExecutiveSummary) {
        doc.addPage();
        drawCorporateHeader();

        let page2Y = 40;

        const isCompliant = recurrentCases.length === 0;
        doc.setFillColor(isCompliant ? 16 : 239, isCompliant ? 185 : 68, isCompliant ? 129 : 68);
        doc.roundedRect(margin, page2Y, printableWidth, 6.8, 1.2, 1.2, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.8);
        doc.setTextColor(255, 255, 255);
        doc.text(
          isCompliant
            ? `SÍNTESE EXECUTIVA: STATUS DE CONFORMIDADE OPERACIONAL (OPERAÇÃO REGULAR NO PERÍODO)`
            : `SÍNTESE EXECUTIVA AUTOMATIZADA: CASOS CRÍTICOS (3 SEMANAS CONSECUTIVAS ABAIXO DA META)`, 
          margin + 4, 
          page2Y + 4.6
        );

        page2Y += 8.5;

        if (recurrentCases.length > 0) {
          const recHeader = [['Frota / Placa', 'Regime de Condução / Linha', 'Frequência Operacional', 'Histórico Consecutivo (km/L)', 'Média 3 Sem.', 'Status']];
          const recBody = recurrentCases.map(rc => [
            `${rc.frota} (${rc.placa})`,
            `${rc.driverRegimeLabel}\n${rc.operacao || 'OPERAÇÃO GERAL'}`,
            `${rc.totalActiveDays} dias operados\n${rc.periodTotalKm.toLocaleString('pt-BR')} km no período`,
            rc.weeksDetails.map(w => `${w.semanaLabel}: ${w.kml.toFixed(2)} km/L (${w.km} km)`).join('\n'),
            `${rc.avgKmlConsecutive.toFixed(2)} km/L\n(${rc.totalKmConsecutive.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} km)`,
            'INTERVENÇÃO'
          ]);

          autoTable(doc, {
            startY: page2Y,
            head: recHeader,
            body: recBody,
            theme: 'grid',
            tableWidth: printableWidth,
            headStyles: {
              fillColor: [185, 28, 28],
              textColor: [255, 255, 255],
              fontStyle: 'bold',
              fontSize: 7.2,
              halign: 'center'
            },
            styles: { fontSize: 6.8, cellPadding: 2 },
            columnStyles: {
              0: { fontStyle: 'bold', textColor: [30, 41, 59], cellWidth: isLandscape ? 38 : 28 },
              1: { cellWidth: isLandscape ? 75 : 55 },
              2: { cellWidth: isLandscape ? 45 : 32 },
              3: { cellWidth: isLandscape ? 65 : 45 },
              4: { halign: 'right', fontStyle: 'bold', cellWidth: isLandscape ? 32 : 22 },
              5: { halign: 'center', fontStyle: 'bold', textColor: [220, 38, 38], cellWidth: isLandscape ? 25 : 18 }
            },
            margin: { top: 40, bottom: 12, left: margin, right: margin },
            didDrawPage: (data) => {
              if (data.pageNumber > 1) {
                drawCorporateHeader();
              }
            }
          });
        } else {
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(8.5);
          doc.setTextColor(30, 41, 59);
          doc.text(
            `Nenhuma não-conformidade recorrente de 3 semanas consecutivas foi identificada entre os ${executiveResult.eligibleVehiclesCount} veículos com operação regular no período.`,
            margin,
            page2Y + 6
          );
          doc.setFontSize(7.5);
          doc.setTextColor(100, 116, 139);
          doc.text(
            `Critério de amostragem operacional: mínimo de ${executiveResult.activeCriteria.minActiveDays} dias ativos de rodagem e ${executiveResult.activeCriteria.minPeriodKm} km no período. Veículos com saídas pontuais (1 a 2 deslocamentos) ou parados em oficina foram desconsiderados da intervenção.`,
            margin,
            page2Y + 12
          );
        }
      }

      // 5. MATRIZ DE INTERVENÇÃO OBRIGATÓRIA (PLANO DE AÇÃO)
      if (exportIncludeActionMatrix) {
        let matrixStartY = ((doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 6 : currentY + 6);
        
        if (matrixStartY > (pageHeight - 65)) {
          doc.addPage();
          drawCorporateHeader();
          matrixStartY = 40;
        }

        doc.setFillColor(241, 245, 249);
        doc.roundedRect(margin, matrixStartY, printableWidth, 40, 1.8, 1.8, 'F');
        doc.setDrawColor(203, 213, 225);
        doc.roundedRect(margin, matrixStartY, printableWidth, 40, 1.8, 1.8, 'D');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.8);
        doc.setTextColor(15, 23, 42);
        doc.text('MATRIZ DE INTERVENÇÃO OBRIGATÓRIA (PLANO DE AÇÃO IMEDIATO):', margin + 4, matrixStartY + 5);

        const actionMatrix = [
          ['1. Oficina & Mecânica', 'Auditoria de bicos injetores, filtros de ar/combustível e pressão de pneus', 'Prazo: 48h', 'O.S. Aberta'],
          ['2. Telemetria & CCO', 'Auditoria de RPM fora da faixa verde e tempo em marcha lenta excessiva', 'Prazo: 24h', 'Em Análise'],
          ['3. Instrutoria de Tráfego', 'Reciclagem prática presencial em rota com aplicação de condução econômica', 'Prazo: 5 dias', 'Agendado'],
          ['4. Supervisão Operacional', 'Validação do envio tempestivo de 100% das Folhas KM e alinhamento de rotas', 'Imediato', 'Validado']
        ];

        autoTable(doc, {
          startY: matrixStartY + 7,
          head: [['Frente de Intervenção', 'Ação Obrigatória Corporativa', 'Prazo Limite', 'Status']],
          body: actionMatrix,
          theme: 'plain',
          tableWidth: printableWidth - 4,
          headStyles: {
            fillColor: [30, 41, 59],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: 6.6,
            cellPadding: 1.5
          },
          styles: { fontSize: 6.6, cellPadding: 1.8 },
          columnStyles: {
            0: { fontStyle: 'bold', textColor: [30, 41, 59], cellWidth: isLandscape ? 50 : 38 },
            1: { cellWidth: isLandscape ? 135 : 85 },
            2: { cellWidth: isLandscape ? 48 : 34 },
            3: { halign: 'center', fontStyle: 'bold', cellWidth: isLandscape ? 36 : 25 }
          },
          margin: { top: 40, bottom: 12, left: margin + 2, right: margin + 2 },
          didDrawPage: (data) => {
            if (data.pageNumber > 1) {
              drawCorporateHeader();
            }
          }
        });
      }

      // 6. BLOCO DE ASSINATURAS CORPORATIVAS (AUDITORIA & FORMALIZAÇÃO)
      if (exportIncludeSignatures) {
        let sigStartY = ((doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 8 : currentY + 8);
        if (sigStartY > (pageHeight - 32)) {
          doc.addPage();
          drawCorporateHeader();
          sigStartY = 45;
        }

        const sigColWidth = (printableWidth - 20) / 3;
        const sigY = sigStartY + 13;

        // Signature 1: Supervisão Operacional
        doc.setDrawColor(148, 163, 184); // slate-400
        doc.setLineWidth(0.3);
        doc.line(margin + 5, sigY, margin + 5 + sigColWidth, sigY);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.6);
        doc.setTextColor(30, 41, 59);
        doc.text('SUPERVISÃO OPERACIONAL', margin + 5 + (sigColWidth / 2), sigY + 3.8, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5.5);
        doc.setTextColor(100, 116, 139);
        doc.text('Validação de Folhas KM e Alinhamento', margin + 5 + (sigColWidth / 2), sigY + 7.2, { align: 'center' });

        // Signature 2: Gestão de Frotas & CCO
        const sig2X = margin + 15 + sigColWidth;
        doc.line(sig2X, sigY, sig2X + sigColWidth, sigY);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.6);
        doc.setTextColor(30, 41, 59);
        doc.text('GESTÃO DE FROTAS & CCO', sig2X + (sigColWidth / 2), sigY + 3.8, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5.5);
        doc.setTextColor(100, 116, 139);
        doc.text('Auditoria de Telemetria e Oficina', sig2X + (sigColWidth / 2), sigY + 7.2, { align: 'center' });

        // Signature 3: Diretoria Executiva
        const sig3X = margin + 25 + (sigColWidth * 2);
        doc.line(sig3X, sigY, sig3X + sigColWidth, sigY);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.6);
        doc.setTextColor(30, 41, 59);
        doc.text('DIRETORIA EXECUTIVA', sig3X + (sigColWidth / 2), sigY + 3.8, { align: 'center' });
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5.5);
        doc.setTextColor(100, 116, 139);
        doc.text('Aprovação do Plano Integrado', sig3X + (sigColWidth / 2), sigY + 7.2, { align: 'center' });
      }

      // Add page numbering to all pages
      const totalPages = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5.8);
        doc.setTextColor(148, 163, 184);
        doc.text(`Página ${i} de ${totalPages} • FleetFlow Inteligência de Frota • Documento Oficial de Auditoria`, pageWidth / 2, pageHeight - 4, { align: 'center' });
      }

      const fileName = `Plano_de_Acao_Consumo_${companyName.replace(/[^A-Za-z0-9]/g, '_')}_${currentWeekInfo.shortLabel.replace(/[^A-Za-z0-9]/g, '_')}_${exportOrientation}.pdf`;

      if (action === 'print') {
        const blobUrl = doc.output('bloburl');
        const printWindow = window.open(blobUrl, '_blank');
        if (!printWindow) {
          // If popup blocker blocked it, fallback to download
          doc.save(fileName);
        }
      } else {
        doc.save(fileName);
      }

      setShowExportOptionsModal(false);
    } catch (err) {
      console.error('Erro ao gerar PDF do Plano de Ação:', err);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Header Navigation for Action Plan Module */}
      <div className="bg-white rounded-3xl p-5 md:p-6 border border-slate-200/80 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gradient-to-br from-emerald-500 to-teal-700 text-white rounded-2xl shadow-md shadow-emerald-500/20">
              <ClipboardCheck size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                  PLANO DE AÇÃO & GESTÃO DE JUSTIFICATIVAS
                </h2>
                <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 font-black text-[10px] uppercase tracking-wider rounded-full border border-emerald-300">
                  Módulo Integrado
                </span>
              </div>
              <p className="text-xs md:text-sm text-slate-500 mt-0.5">
                Central de notificações formais, síntese executiva de recorrência (3 semanas) e gestão de justificativas com IA.
              </p>
            </div>
          </div>
        </div>

        {/* View Switcher Sub-tabs */}
        <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 self-start md:self-auto">
          <button
            type="button"
            onClick={() => setActiveView('sintese_principal')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeView === 'sintese_principal'
                ? 'bg-white text-emerald-800 shadow-md transform scale-[1.02]'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50/50'
            }`}
          >
            <FileText size={15} />
            <span>Notificação & Síntese Executiva</span>
            {recurrentCases.length > 0 && (
              <span className="px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-[10px] font-black">
                {recurrentCases.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveView('justificativas_veiculos')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              activeView === 'justificativas_veiculos'
                ? 'bg-white text-emerald-800 shadow-md transform scale-[1.02]'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50/50'
            }`}
          >
            <Sparkles size={15} className="text-amber-500" />
            <span>Justificativas por Veículo (IA)</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: NOTIFICAÇÃO & SÍNTESE EXECUTIVA (MAIN PAGE) */}
      {activeView === 'sintese_principal' && (
        <div className="space-y-6">
          {/* Action Ribbon / Control Bar */}
          <div className="bg-slate-900 text-white rounded-3xl p-5 md:p-6 shadow-xl border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2 bg-slate-800/90 px-3.5 py-2 rounded-2xl border border-slate-700/80">
                <Sliders size={15} className="text-emerald-400" />
                <span className="text-xs text-slate-300 font-bold">Meta:</span>
                <input 
                  type="number" 
                  step="0.05"
                  min="1.0"
                  max="10.0"
                  value={metaKml}
                  onChange={(e) => setMetaKml(parseFloat(e.target.value) || 2.5)}
                  className="w-16 px-2 py-0.5 bg-slate-900 border border-slate-600 rounded-lg text-emerald-400 font-black text-xs text-center focus:ring-1 focus:ring-emerald-400 outline-none"
                />
                <span className="text-[10px] text-slate-400 font-bold">km/L</span>
              </div>

              <div className="flex items-center gap-2 bg-slate-800/90 px-3.5 py-2 rounded-2xl border border-slate-700/80">
                <Calendar size={14} className="text-emerald-400" />
                <span className="text-xs text-slate-300 font-medium">Período: <strong className="text-white font-bold">{periodoLabel}</strong></span>
              </div>

              {/* Seletor de Semanas do Plano de Ação */}
              <div className="flex items-center gap-2 bg-slate-800/95 px-3 py-1.5 rounded-2xl border border-slate-700/90 flex-wrap">
                <div className="flex items-center gap-1 text-xs text-slate-300 font-bold">
                  <Clock size={13} className="text-cyan-400" />
                  <span className="hidden sm:inline">Semana Ref.:</span>
                </div>

                <select
                  value={referenceWeekKey}
                  onChange={(e) => setReferenceWeekKey(e.target.value)}
                  className="bg-slate-900 border border-slate-700 rounded-xl px-2 py-1 text-xs text-cyan-300 font-black focus:outline-none focus:ring-1 focus:ring-cyan-500 cursor-pointer"
                  title="Selecione a semana de referência para o Plano de Ação"
                >
                  <option value="auto">
                    Sem. Atual: Sem. {currentWeekInfo.weekNoStr} ({currentWeekInfo.year}) [Padrão]
                  </option>
                  {weekSelectionInfo?.availableWeeks.map(w => (
                    <option key={w.key} value={w.key}>
                      Semana {w.weekNo} ({w.year})
                    </option>
                  ))}
                </select>

                <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-700">
                  <button
                    type="button"
                    onClick={() => setEvalMode('previous_3_closed')}
                    className={`px-2 py-0.5 text-[11px] font-black rounded transition-all cursor-pointer ${
                      evalMode === 'previous_3_closed'
                        ? 'bg-cyan-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Modo Padrão Corporativo: avalia as 3 últimas semanas fechadas anteriores à semana de referência (ex: Sem. 36-35-34 para semana 37)"
                  >
                    3 Sem. Anteriores (Padrão)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEvalMode('including_reference_3')}
                    className={`px-2 py-0.5 text-[11px] font-black rounded transition-all cursor-pointer ${
                      evalMode === 'including_reference_3'
                        ? 'bg-cyan-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-white'
                    }`}
                    title="Avalia a semana de referência combinada com as 2 semanas anteriores (ex: Sem. 37-36-35)"
                  >
                    3 Últimas c/ Ref.
                  </button>
                </div>

                {/* Visual badge of target weeks */}
                <div className="flex items-center gap-1 text-[10px] font-bold text-slate-300 bg-slate-900/90 px-2 py-0.5 rounded-md border border-slate-700/60 hidden xl:flex">
                  <span className="text-slate-400 uppercase tracking-wider text-[9px]">Auditando:</span>
                  {weekSelectionInfo?.targetWeeks.map((tw, idx) => (
                    <React.Fragment key={tw.key}>
                      <span className="text-cyan-300 font-mono font-bold">Sem. {tw.weekNo}</span>
                      {idx < (weekSelectionInfo?.targetWeeks.length - 1) && <span className="text-slate-500">➔</span>}
                    </React.Fragment>
                  ))}
                </div>

                {(referenceWeekKey !== 'auto' || evalMode !== 'previous_3_closed') && (
                  <button
                    type="button"
                    onClick={() => {
                      setReferenceWeekKey('auto');
                      setEvalMode('previous_3_closed');
                    }}
                    className="p-1 text-slate-400 hover:text-cyan-300 hover:bg-slate-700/60 rounded-md transition-colors cursor-pointer"
                    title="Restaurar padrão corporativo (Semana atual com avaliação das 3 anteriores)"
                  >
                    <RotateCcw size={12} />
                  </button>
                )}
              </div>

              <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
                <button
                  type="button"
                  onClick={() => setFilterMode('below_only')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                    filterMode === 'below_only' ? 'bg-rose-500 text-white shadow-sm' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Abaixo da Meta ({totals.count})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('all')}
                  className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                    filterMode === 'all' ? 'bg-slate-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Todos
                </button>
              </div>

              {/* Filter Scope: TODOS vs POR PLACA vs POR MOTORISTA */}
              <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700 gap-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 hidden sm:inline">Filtrar:</span>
                <button
                  type="button"
                  onClick={() => {
                    setFilterScope('all');
                    setSelectedPlaca('ALL');
                    setSelectedDriver('ALL');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    filterScope === 'all'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                  }`}
                  title="Exibir todos os veículos e motoristas"
                >
                  <Layers size={13} />
                  <span>Todos</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setFilterScope('placa');
                    setSelectedDriver('ALL');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    filterScope === 'placa'
                      ? 'bg-cyan-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                  }`}
                  title="Filtrar por Placa de Veículo"
                >
                  <Truck size={13} />
                  <span>Por Placa</span>
                  {uniquePlatesList.length > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${filterScope === 'placa' ? 'bg-cyan-800 text-white' : 'bg-slate-700 text-slate-300'}`}>
                      {uniquePlatesList.length}
                    </span>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setFilterScope('motorista');
                    setSelectedPlaca('ALL');
                  }}
                  className={`flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                    filterScope === 'motorista'
                      ? 'bg-purple-600 text-white shadow-sm'
                      : 'text-slate-400 hover:text-white hover:bg-slate-700/50'
                  }`}
                  title="Filtrar por Condutor / Motorista"
                >
                  <Users size={13} />
                  <span>Por Motorista</span>
                  {uniqueDriversList.length > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-md ${filterScope === 'motorista' ? 'bg-purple-800 text-white' : 'bg-slate-700 text-slate-300'}`}>
                      {uniqueDriversList.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleCopyWhatsApp}
                className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-emerald-600/30 cursor-pointer active:scale-95"
                title="Copiar texto formatado para WhatsApp"
              >
                {copiedType === 'whatsapp' ? <Check size={14} /> : <Share2 size={14} />}
                <span>{copiedType === 'whatsapp' ? 'Copiado!' : 'WhatsApp'}</span>
              </button>

              <button
                type="button"
                onClick={handleCopyEmailHtml}
                className="flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-indigo-600/30 cursor-pointer active:scale-95"
                title="Copiar tabela formatada para E-mail corporativo"
              >
                {copiedType === 'email' ? <Check size={14} /> : <Mail size={14} />}
                <span>{copiedType === 'email' ? 'Tabela Copiada!' : 'Copiar E-mail'}</span>
              </button>

              <button
                type="button"
                onClick={handleOpenMailto}
                className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                title="Abrir no cliente de e-mail padrão do computador"
              >
                <ExternalLink size={13} />
                <span>Abrir E-mail</span>
              </button>

              <button
                type="button"
                onClick={handleExportPDF}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-400 hover:to-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md shadow-teal-500/20 cursor-pointer active:scale-95"
                title="Exportar documento oficial em PDF"
              >
                <Download size={14} />
                <span>Baixar PDF Executivo</span>
              </button>

              <button
                type="button"
                onClick={() => setIsModalOpen(true)}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-xl transition-all"
                title="Visualizar em Modal Flutuante"
              >
                <Maximize2 size={15} />
              </button>
            </div>
          </div>

          {/* Sub-selector inside Synthesis View: Notificação vs Síntese Executiva de 3 semanas */}
          <div className="flex items-center justify-between gap-4 border-b border-slate-200 pb-3">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSinteseTab('notificacao')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  sinteseTab === 'notificacao'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <FileText size={14} />
                <span>Notificação & Diretrizes Operacionais</span>
              </button>

              <button
                type="button"
                onClick={() => setSinteseTab('sintese_executiva')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  sinteseTab === 'sintese_executiva'
                    ? 'bg-gradient-to-r from-rose-600 to-red-700 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <ShieldAlert size={14} className={sinteseTab === 'sintese_executiva' ? 'text-white' : 'text-rose-600'} />
                <span>Síntese Executiva de Recorrência (3 Semanas)</span>
                {recurrentCases.length > 0 && (
                  <span className="px-2 py-0.5 bg-white text-rose-700 rounded-full text-[10px] font-black">
                    {recurrentCases.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => setSinteseTab('historico_medias')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  sinteseTab === 'historico_medias'
                    ? 'bg-gradient-to-r from-indigo-600 to-purple-700 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
                title="Visualizar histórico de evolução semanal de médias por motorista, placa ou dupla"
              >
                <History size={14} className={sinteseTab === 'historico_medias' ? 'text-white' : 'text-indigo-600'} />
                <span>Histórico de Média por Motorista/Placa</span>
              </button>
            </div>

            {/* Quick search */}
            <div className="relative w-72 hidden sm:block">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar frota, placa, motorista..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* TAB 1: NOTIFICAÇÃO & QUADRO RESUMO */}
          {sinteseTab === 'notificacao' && (
            <div className="space-y-6">
              {/* Document Mockup Frame */}
              <div className="bg-white border border-slate-200/90 rounded-3xl shadow-xl overflow-hidden">
                {/* Visual Header matching PDF styling */}
                <div className="bg-slate-900 text-white p-6 relative border-b border-slate-800">
                  <div className="absolute left-0 top-0 bottom-0 w-2 bg-emerald-500" />
                  
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      {reportLogo ? (
                        <div className="h-12 w-28 bg-slate-800/80 rounded-xl p-1 flex items-center justify-center border border-slate-700/80">
                          <img src={reportLogo} alt="Logo" className="max-h-full max-w-full object-contain" />
                        </div>
                      ) : (
                        <div className="p-3 bg-slate-800 rounded-xl border border-slate-700">
                          <Building2 size={24} className="text-emerald-400" />
                        </div>
                      )}
                      <div>
                        <h3 className="text-lg md:text-xl font-black text-white tracking-tight">
                          Relatório Integrado de Justificativas de Consumo
                        </h3>
                        <p className="text-xs text-slate-400">
                          {companyName} • Gerado com IA • ERP: {erpSystem}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 flex-wrap">
                      <div className="px-3.5 py-1.5 bg-slate-800/90 rounded-xl border border-slate-700 flex items-center gap-2">
                        <Calendar size={14} className="text-slate-400" />
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          Competência:
                        </span>
                        <span className="text-xs font-black text-white">
                          {periodoLabel.toUpperCase()}
                        </span>
                      </div>

                      <div className="px-3.5 py-1.5 bg-sky-950/90 rounded-xl border border-sky-700/70 flex items-center gap-2">
                        <Clock size={14} className="text-sky-400" />
                        <span className="text-[10px] font-bold text-sky-300 uppercase tracking-wider">
                          Semana Atual:
                        </span>
                        <span className="text-xs font-black text-sky-200">
                          Semana {currentWeekInfo.weekNoStr} ({currentWeekInfo.year})
                        </span>
                      </div>

                      <div className="px-3.5 py-1.5 bg-emerald-950/80 rounded-xl border border-emerald-700/60 flex items-center gap-2">
                        <Fuel size={14} className="text-emerald-400" />
                        <span className="text-[10px] font-bold text-emerald-300 uppercase tracking-wider">
                          Meta:
                        </span>
                        <span className="text-xs font-black text-emerald-300">
                          {metaKml.toFixed(2)} km/L
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Guidelines Box */}
                  <div className="bg-amber-50/80 border border-amber-200/90 rounded-2xl p-5 relative">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-1.5 h-4 bg-amber-600 rounded-full" />
                        <h4 className="text-xs font-black text-amber-950 uppercase tracking-wider">
                          Diretrizes Operacionais e Regra de Recorrência (3 Semanas Consecutivas)
                        </h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsEditingGuideline(!isEditingGuideline)}
                        className="text-xs text-amber-800 hover:text-amber-950 flex items-center gap-1 font-bold bg-amber-100 hover:bg-amber-200/80 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
                      >
                        <Edit3 size={12} />
                        <span>{isEditingGuideline ? 'Concluir Edição' : 'Editar Diretrizes'}</span>
                      </button>
                    </div>

                    {isEditingGuideline ? (
                      <div className="space-y-2">
                        <textarea
                          rows={8}
                          value={guidelineText}
                          onChange={(e) => setGuidelineText(e.target.value)}
                          className="w-full text-xs text-slate-800 bg-white border border-amber-300 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-amber-500 font-mono leading-relaxed"
                        />
                        <button
                          type="button"
                          onClick={() => setGuidelineText(defaultGuidelineText)}
                          className="text-[11px] text-amber-800 hover:underline font-bold"
                        >
                          Restaurar texto padrão oficial
                        </button>
                      </div>
                    ) : (
                      <div className="text-xs text-slate-700 whitespace-pre-line leading-relaxed space-y-2">
                        {guidelineText.split('\n\n').map((paragraph, pIdx) => {
                          const isRecurrence = paragraph.toUpperCase().includes('DIRETRIZ CORPORATIVA DE RECORRÊNCIA') || paragraph.toUpperCase().includes('3 (TRÊS) SEMANAS');
                          if (isRecurrence) {
                            return (
                              <div key={pIdx} className="bg-red-50/90 border border-red-300/80 rounded-xl p-3.5 my-2 flex items-start gap-2.5 shadow-xs">
                                <AlertTriangle size={16} className="text-red-600 shrink-0 mt-0.5" />
                                <div className="text-xs text-red-950 font-bold leading-relaxed">
                                  {paragraph}
                                </div>
                              </div>
                            );
                          }
                          return <p key={pIdx}>{paragraph}</p>;
                        })}
                      </div>
                    )}
                  </div>

                  {/* Summary Metric Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Veículos Listados</span>
                      <div className="flex items-baseline gap-2 mt-1">
                        <span className="text-xl font-black text-slate-900">{sortedVehicles.length}</span>
                        <span className="text-[10px] text-rose-600 font-bold">fora da meta</span>
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">KM Total do Grupo</span>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-xl font-black text-slate-900">{totals.totalKm.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</span>
                        <span className="text-[10px] text-slate-500 font-bold">km</span>
                      </div>
                    </div>

                    <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-3.5">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Volume Consumido</span>
                      <div className="flex items-baseline gap-1 mt-1">
                        <span className="text-xl font-black text-slate-900">{totals.totalLitros.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}</span>
                        <span className="text-[10px] text-slate-500 font-bold">L</span>
                      </div>
                    </div>

                    <div className="bg-rose-50 border border-rose-200 rounded-2xl p-3.5">
                      <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">Média Geral do Grupo</span>
                      <div className="flex items-baseline gap-1.5 mt-1">
                        <span className="text-xl font-black text-rose-700">{totals.avgKml.toFixed(2)}</span>
                        <span className="text-[10px] text-rose-600 font-bold">km/L (Meta: {metaKml.toFixed(2)})</span>
                      </div>
                    </div>
                  </div>

                  {/* Outlier Vehicles Table */}
                  <div className="space-y-4">
                    {/* Filter Bar with TODOS / POR PLACA / POR MOTORISTA & CLASSIFICAÇÃO */}
                    <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-3.5 space-y-3">
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-sm font-black text-slate-900">
                            Quadro de Veículos Fora da Meta ({sortedVehicles.length})
                          </h4>
                          <span className="text-xs text-slate-500 font-medium">
                            • Ordenado por: <strong className="text-indigo-700">
                              {sortField === 'frota' && `Frota (${sortDirection === 'asc' ? '0-9 / A-Z' : '9-0 / Z-A'})`}
                              {sortField === 'placa' && `Placa (${sortDirection === 'asc' ? 'A-Z' : 'Z-A'})`}
                              {sortField === 'motorista' && `Motorista (${sortDirection === 'asc' ? 'A-Z' : 'Z-A'})`}
                              {sortField === 'operacao' && `Operação (${sortDirection === 'asc' ? 'A-Z' : 'Z-A'})`}
                              {sortField === 'km' && `KM (${sortDirection === 'asc' ? 'Menor > Maior' : 'Maior > Menor'})`}
                              {sortField === 'litros' && `Litros (${sortDirection === 'asc' ? 'Menor > Maior' : 'Maior > Menor'})`}
                              {sortField === 'media' && `Média Real (${sortDirection === 'asc' ? 'Menor primeiro / Crítico' : 'Maior primeiro'})`}
                              {sortField === 'desvio' && `Desvio % (${sortDirection === 'asc' ? 'Mais negativo' : 'Menos negativo'})`}
                              {sortField === 'excedente' && `Excedente (${sortDirection === 'asc' ? 'Menor > Maior' : 'Maior > Menor'})`}
                            </strong>
                          </span>
                        </div>

                        {/* Direct Filter Buttons & Sort Dropdown */}
                        <div className="flex items-center gap-2.5 flex-wrap">
                          {/* Filter by scope */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider mr-0.5">
                              Filtrar:
                            </span>

                            <button
                              type="button"
                              onClick={() => {
                                setFilterScope('all');
                                setSelectedPlaca('ALL');
                                setSelectedDriver('ALL');
                              }}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                                filterScope === 'all' && selectedPlaca === 'ALL' && selectedDriver === 'ALL'
                                  ? 'bg-slate-900 text-white shadow-sm'
                                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                              }`}
                            >
                              <Layers size={13} />
                              <span>Todos</span>
                              <span className="text-[10px] opacity-80">({baseItems.length})</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setFilterScope('placa');
                                setSelectedDriver('ALL');
                              }}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                                filterScope === 'placa'
                                  ? 'bg-cyan-600 text-white shadow-sm'
                                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-cyan-50 hover:text-cyan-800'
                              }`}
                            >
                              <Truck size={13} />
                              <span>Por Placa</span>
                              <span className="text-[10px] opacity-80">({uniquePlatesList.length})</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setFilterScope('motorista');
                                setSelectedPlaca('ALL');
                              }}
                              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                                filterScope === 'motorista'
                                  ? 'bg-purple-600 text-white shadow-sm'
                                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-purple-50 hover:text-purple-800'
                              }`}
                            >
                              <Users size={13} />
                              <span>Por Motorista</span>
                              <span className="text-[10px] opacity-80">({uniqueDriversList.length})</span>
                            </button>
                          </div>

                          {/* Classification / Sorting Dropdown */}
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1">
                              <ArrowUpDown size={12} className="text-indigo-600" />
                              Classificar:
                            </span>
                            <select
                              value={`${sortField}_${sortDirection}`}
                              onChange={(e) => {
                                const [field, dir] = e.target.value.split('_') as ['frota' | 'placa' | 'motorista' | 'operacao' | 'km' | 'litros' | 'media' | 'desvio' | 'excedente', 'asc' | 'desc'];
                                setSortField(field);
                                setSortDirection(dir);
                              }}
                              className="bg-white border border-slate-300 hover:border-slate-400 text-slate-900 text-xs font-bold rounded-xl px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-xs"
                            >
                              <option value="media_asc">⚡ Média Real: Menor primeiro (Mais crítico)</option>
                              <option value="media_desc">⚡ Média Real: Maior primeiro</option>
                              <option value="frota_asc">🚚 Frota: Crescente (0-9 / A-Z)</option>
                              <option value="frota_desc">🚚 Frota: Decrescente (9-0 / Z-A)</option>
                              <option value="placa_asc">🏷️ Placa: A-Z (Crescente)</option>
                              <option value="placa_desc">🏷️ Placa: Z-A (Decrescente)</option>
                              <option value="motorista_asc">👤 Condutor / Motorista: A-Z</option>
                              <option value="motorista_desc">👤 Condutor / Motorista: Z-A</option>
                              <option value="operacao_asc">🏢 Operação: A-Z</option>
                              <option value="operacao_desc">🏢 Operação: Z-A</option>
                              <option value="excedente_desc">⚠️ Excedente (L): Maior primeiro</option>
                              <option value="excedente_asc">⚠️ Excedente (L): Menor primeiro</option>
                              <option value="km_desc">📈 KM: Maior primeiro</option>
                              <option value="km_asc">📈 KM: Menor primeiro</option>
                              <option value="litros_desc">⛽ Litros: Maior primeiro</option>
                              <option value="litros_asc">⛽ Litros: Menor primeiro</option>
                              <option value="desvio_asc">📉 Desvio %: Mais negativo</option>
                              <option value="desvio_desc">📈 Desvio %: Menos negativo</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Dropdown Selectors based on active filterScope */}
                      {filterScope === 'placa' && (
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-2 border-t border-slate-200/80">
                          <span className="text-xs font-bold text-cyan-900 shrink-0 flex items-center gap-1.5">
                            <Truck size={14} className="text-cyan-600" />
                            Selecione o Veículo / Placa:
                          </span>
                          <select
                            value={selectedPlaca}
                            onChange={(e) => setSelectedPlaca(e.target.value)}
                            className="flex-1 bg-white border border-cyan-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-bold focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                          >
                            <option value="ALL">🔍 Todas as Placas ({uniquePlatesList.length} veículos cadastrados)</option>
                            {uniquePlatesList.map((p, idx) => (
                              <option key={idx} value={p.placa}>
                                Frota {p.frota} • Placa: {p.placa} — Motorista: {p.motorista} ({p.media.toFixed(2)} km/L)
                              </option>
                            ))}
                          </select>

                          {selectedPlaca !== 'ALL' && (
                            <button
                              type="button"
                              onClick={() => setSelectedPlaca('ALL')}
                              className="px-2.5 py-1.5 bg-cyan-100 hover:bg-cyan-200 text-cyan-800 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors shrink-0 cursor-pointer"
                              title="Limpar seleção de placa"
                            >
                              <RotateCcw size={12} />
                              <span>Todas as Placas</span>
                            </button>
                          )}
                        </div>
                      )}

                      {filterScope === 'motorista' && (
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-2 border-t border-slate-200/80">
                          <span className="text-xs font-bold text-purple-900 shrink-0 flex items-center gap-1.5">
                            <User size={14} className="text-purple-600" />
                            Selecione o Motorista:
                          </span>
                          <select
                            value={selectedDriver}
                            onChange={(e) => setSelectedDriver(e.target.value)}
                            className="flex-1 bg-white border border-purple-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-bold focus:ring-2 focus:ring-purple-500 focus:outline-none"
                          >
                            <option value="ALL">🔍 Todos os Motoristas ({uniqueDriversList.length} condutores)</option>
                            {uniqueDriversList.map((d, idx) => (
                              <option key={idx} value={d.name}>
                                {d.name} ({d.count} veículo{d.count > 1 ? 's' : ''} • Frota: {d.frotas.slice(0, 3).join(', ')} • Méd: {d.avgMedia.toFixed(2)} km/L)
                              </option>
                            ))}
                          </select>

                          {selectedDriver !== 'ALL' && (
                            <button
                              type="button"
                              onClick={() => setSelectedDriver('ALL')}
                              className="px-2.5 py-1.5 bg-purple-100 hover:bg-purple-200 text-purple-800 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors shrink-0 cursor-pointer"
                              title="Limpar seleção de motorista"
                            >
                              <RotateCcw size={12} />
                              <span>Todos os Motoristas</span>
                            </button>
                          )}
                        </div>
                      )}

                      {/* Active Filter Banner when isolated */}
                      {(selectedPlaca !== 'ALL' || selectedDriver !== 'ALL' || searchTerm.trim() !== '') && (
                        <div className="flex items-center justify-between gap-2 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-1.5 text-xs text-emerald-900">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold uppercase tracking-wider text-[10px] text-emerald-700">Filtro Ativo:</span>
                            {selectedPlaca !== 'ALL' && (
                              <span className="px-2 py-0.5 bg-cyan-600 text-white rounded-md font-bold text-[11px] flex items-center gap-1">
                                <Truck size={12} /> Placa: {selectedPlaca}
                              </span>
                            )}
                            {selectedDriver !== 'ALL' && (
                              <span className="px-2 py-0.5 bg-purple-600 text-white rounded-md font-bold text-[11px] flex items-center gap-1">
                                <User size={12} /> Motorista: {selectedDriver}
                              </span>
                            )}
                            {searchTerm.trim() !== '' && (
                              <span className="px-2 py-0.5 bg-slate-700 text-white rounded-md font-bold text-[11px] flex items-center gap-1">
                                <Search size={12} /> Busca: "{searchTerm}"
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setFilterScope('all');
                              setSelectedPlaca('ALL');
                              setSelectedDriver('ALL');
                              setSearchTerm('');
                            }}
                            className="text-emerald-700 hover:text-emerald-900 font-bold text-xs flex items-center gap-1 hover:underline cursor-pointer"
                          >
                            <X size={13} />
                            <span>Limpar Filtros</span>
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-xs">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead className="bg-slate-950 text-white font-bold text-[11px] uppercase tracking-wider select-none">
                          <tr>
                            <th 
                              onClick={() => handleSort('frota')}
                              className="py-3 px-3.5 text-center cursor-pointer hover:bg-slate-800 transition-colors group"
                              title="Clique para ordenar por Frota"
                            >
                              <div className="flex items-center justify-center gap-1">
                                <span>Frota</span>
                                {sortField === 'frota' ? (
                                  sortDirection === 'asc' ? <ArrowUp size={13} className="text-cyan-400" /> : <ArrowDown size={13} className="text-cyan-400" />
                                ) : (
                                  <ArrowUpDown size={12} className="opacity-30 group-hover:opacity-100" />
                                )}
                              </div>
                            </th>
                            <th 
                              onClick={() => handleSort('placa')}
                              className="py-3 px-3.5 text-center cursor-pointer hover:bg-slate-800 transition-colors group"
                              title="Clique para ordenar por Placa"
                            >
                              <div className="flex items-center justify-center gap-1">
                                <span>Placa</span>
                                {sortField === 'placa' ? (
                                  sortDirection === 'asc' ? <ArrowUp size={13} className="text-cyan-400" /> : <ArrowDown size={13} className="text-cyan-400" />
                                ) : (
                                  <ArrowUpDown size={12} className="opacity-30 group-hover:opacity-100" />
                                )}
                              </div>
                            </th>
                            <th 
                              onClick={() => handleSort('motorista')}
                              className="py-3 px-3.5 cursor-pointer hover:bg-slate-800 transition-colors group"
                              title="Clique para ordenar por Condutor / Motorista"
                            >
                              <div className="flex items-center gap-1">
                                <span>Condutor / Motorista</span>
                                {sortField === 'motorista' ? (
                                  sortDirection === 'asc' ? <ArrowUp size={13} className="text-cyan-400" /> : <ArrowDown size={13} className="text-cyan-400" />
                                ) : (
                                  <ArrowUpDown size={12} className="opacity-30 group-hover:opacity-100" />
                                )}
                              </div>
                            </th>
                            <th 
                              onClick={() => handleSort('operacao')}
                              className="py-3 px-3.5 cursor-pointer hover:bg-slate-800 transition-colors group"
                              title="Clique para ordenar por Operação"
                            >
                              <div className="flex items-center gap-1">
                                <span>Operação</span>
                                {sortField === 'operacao' ? (
                                  sortDirection === 'asc' ? <ArrowUp size={13} className="text-cyan-400" /> : <ArrowDown size={13} className="text-cyan-400" />
                                ) : (
                                  <ArrowUpDown size={12} className="opacity-30 group-hover:opacity-100" />
                                )}
                              </div>
                            </th>
                            <th 
                              onClick={() => handleSort('km')}
                              className="py-3 px-3.5 text-right cursor-pointer hover:bg-slate-800 transition-colors group"
                              title="Clique para ordenar por KM"
                            >
                              <div className="flex items-center justify-end gap-1">
                                <span>KM</span>
                                {sortField === 'km' ? (
                                  sortDirection === 'asc' ? <ArrowUp size={13} className="text-cyan-400" /> : <ArrowDown size={13} className="text-cyan-400" />
                                ) : (
                                  <ArrowUpDown size={12} className="opacity-30 group-hover:opacity-100" />
                                )}
                              </div>
                            </th>
                            <th 
                              onClick={() => handleSort('litros')}
                              className="py-3 px-3.5 text-right cursor-pointer hover:bg-slate-800 transition-colors group"
                              title="Clique para ordenar por Litros"
                            >
                              <div className="flex items-center justify-end gap-1">
                                <span>Litros</span>
                                {sortField === 'litros' ? (
                                  sortDirection === 'asc' ? <ArrowUp size={13} className="text-cyan-400" /> : <ArrowDown size={13} className="text-cyan-400" />
                                ) : (
                                  <ArrowUpDown size={12} className="opacity-30 group-hover:opacity-100" />
                                )}
                              </div>
                            </th>
                            <th 
                              onClick={() => handleSort('media')}
                              className="py-3 px-3.5 text-right cursor-pointer hover:bg-slate-800 transition-colors group bg-slate-900"
                              title="Clique para ordenar por Média Real"
                            >
                              <div className="flex items-center justify-end gap-1">
                                <span>Média Real</span>
                                {sortField === 'media' ? (
                                  sortDirection === 'asc' ? <ArrowUp size={13} className="text-rose-400" /> : <ArrowDown size={13} className="text-rose-400" />
                                ) : (
                                  <ArrowUpDown size={12} className="opacity-30 group-hover:opacity-100" />
                                )}
                              </div>
                            </th>
                            <th 
                              onClick={() => handleSort('desvio')}
                              className="py-3 px-3.5 text-center cursor-pointer hover:bg-slate-800 transition-colors group"
                              title="Clique para ordenar por Desvio %"
                            >
                              <div className="flex items-center justify-center gap-1">
                                <span>Desvio</span>
                                {sortField === 'desvio' ? (
                                  sortDirection === 'asc' ? <ArrowUp size={13} className="text-cyan-400" /> : <ArrowDown size={13} className="text-cyan-400" />
                                ) : (
                                  <ArrowUpDown size={12} className="opacity-30 group-hover:opacity-100" />
                                )}
                              </div>
                            </th>
                            <th 
                              onClick={() => handleSort('excedente')}
                              className="py-3 px-3.5 text-right cursor-pointer hover:bg-slate-800 transition-colors group"
                              title="Clique para ordenar por Litros Excedentes"
                            >
                              <div className="flex items-center justify-end gap-1">
                                <span>Excedente</span>
                                {sortField === 'excedente' ? (
                                  sortDirection === 'asc' ? <ArrowUp size={13} className="text-amber-400" /> : <ArrowDown size={13} className="text-amber-400" />
                                ) : (
                                  <ArrowUpDown size={12} className="opacity-30 group-hover:opacity-100" />
                                )}
                              </div>
                            </th>
                            <th className="py-3 px-3 text-center w-16 bg-slate-900/90 text-cyan-400">
                              <div className="flex items-center justify-center gap-1" title="Explodir dados detalhados deste veículo">
                                <span>Explodir</span>
                              </div>
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white font-medium">
                          {sortedVehicles.length === 0 ? (
                            <tr>
                              <td colSpan={10} className="py-8 text-center text-slate-400">
                                Nenhum veículo encontrado com os filtros atuais selecionados.
                              </td>
                            </tr>
                          ) : (
                            sortedVehicles.map((v, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                                <td className="py-2.5 px-3.5 font-black text-slate-900 text-center">
                                  <span className="px-2 py-0.5 bg-slate-100 rounded-md font-mono">{v.frota}</span>
                                </td>
                                <td className="py-2.5 px-3.5 font-bold text-slate-700 text-center font-mono">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setFilterScope('placa');
                                      setSelectedPlaca(v.placa);
                                      setSelectedDriver('ALL');
                                    }}
                                    className="hover:text-cyan-600 hover:underline cursor-pointer transition-colors"
                                    title="Clique para filtrar por esta placa"
                                  >
                                    {v.placa}
                                  </button>
                                </td>
                                <td className="py-2.5 px-3.5 text-slate-800 font-semibold max-w-[200px] truncate">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setFilterScope('motorista');
                                      setSelectedDriver(v.motorista);
                                      setSelectedPlaca('ALL');
                                    }}
                                    className="hover:text-purple-600 hover:underline text-left cursor-pointer transition-colors"
                                    title="Clique para filtrar por este motorista"
                                  >
                                    {v.motorista}
                                  </button>
                                </td>
                                <td className="py-2.5 px-3.5 text-slate-600 max-w-[150px] truncate">
                                  {v.operacao}
                                </td>
                                <td className="py-2.5 px-3.5 text-right font-mono text-slate-700">
                                  {v.km.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                                </td>
                                <td className="py-2.5 px-3.5 text-right font-mono text-slate-700">
                                  {v.litros.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
                                </td>
                                <td className="py-2.5 px-3.5 text-right font-black font-mono text-rose-600">
                                  {v.media.toFixed(2)} km/L
                                </td>
                                <td className="py-2.5 px-3.5 text-center">
                                  <span className="px-2 py-0.5 bg-rose-100 text-rose-700 rounded-full font-black text-[10px]">
                                    {v.desvioPercent.toFixed(1)}%
                                  </span>
                                </td>
                                <td className="py-2.5 px-3.5 text-right font-mono text-amber-700 font-bold">
                                  {v.litrosExcedentes > 0 ? `+${Math.round(v.litrosExcedentes)} L` : '-'}
                                </td>
                                <td className="py-2.5 px-3 text-center">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedExplosionVehicle(v)}
                                    className="p-1.5 rounded-xl bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white border border-indigo-200 hover:border-indigo-600 transition-all shadow-xs hover:shadow-md cursor-pointer group/exp flex items-center justify-center mx-auto"
                                    title={`Explodir dados detalhados da Frota ${v.frota} (${v.placa})`}
                                  >
                                    <Maximize2 size={13} className="group-hover/exp:scale-110 transition-transform" />
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: SÍNTESE EXECUTIVA DE RECORRÊNCIA (3 SEMANAS CONSECUTIVAS) */}
          {sinteseTab === 'sintese_executiva' && (
            <div className="space-y-6">
              {/* Executive Summary Card */}
              <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 text-white rounded-3xl p-6 md:p-8 shadow-2xl border border-slate-700/80 relative overflow-hidden">
                <div className="absolute top-0 right-0 p-12 opacity-5 pointer-events-none">
                  <ShieldAlert size={280} />
                </div>

                <div className="relative z-10 space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-700 pb-6">
                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        {recurrentCases.length > 0 ? (
                          <span className="px-3 py-1 bg-red-600 text-white rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 animate-pulse">
                            <Flame size={14} />
                            Alerta Crítico de Recorrência
                          </span>
                        ) : (
                          <span className="px-3 py-1 bg-emerald-600 text-white rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5">
                            <CheckCircle2 size={14} />
                            Conformidade Operacional
                          </span>
                        )}
                        <span className="px-2.5 py-0.5 bg-rose-500/30 text-rose-300 border border-rose-400/40 rounded-full text-xs font-black">
                          Diretriz de 3 Semanas Consecutivas
                        </span>
                        <span className="px-2.5 py-0.5 bg-indigo-500/30 text-indigo-300 border border-indigo-400/40 rounded-full text-xs font-black flex items-center gap-1">
                          <Activity size={12} />
                          Frequência Mínima: ≥ {executiveResult.activeCriteria.minActiveDays} dias operados
                        </span>
                        <span className="px-2.5 py-0.5 bg-sky-500/30 text-sky-300 border border-sky-400/40 rounded-full text-xs font-black flex items-center gap-1">
                          <Clock size={12} />
                          Semana Atual: {currentWeekInfo.weekNoStr}/{currentWeekInfo.year}
                        </span>
                      </div>
                      <h3 className="text-xl md:text-2xl font-black text-white mt-2 tracking-tight">
                        Síntese Executiva Automatizada da Operação
                      </h3>
                      <p className="text-xs md:text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
                        Módulo gerencial e executivo com critério de amostragem consistente: considera apenas veículos com operação regular no período (mínimo de <strong>{executiveResult.activeCriteria.minActiveDays} dias ativos</strong> e <strong>{executiveResult.activeCriteria.minPeriodKm} km</strong>), eliminando falsos positivos de saídas pontuais (1 a 2 deslocamentos esporádicos).
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className={`text-center px-4 py-3 rounded-2xl border ${
                        recurrentCases.length > 0 
                          ? 'bg-red-950/80 border-red-700/60' 
                          : 'bg-emerald-950/80 border-emerald-700/60'
                      }`}>
                        <span className={`text-[10px] font-bold uppercase tracking-wider block ${
                          recurrentCases.length > 0 ? 'text-red-300' : 'text-emerald-300'
                        }`}>Casos Críticos</span>
                        <span className={`text-3xl font-black ${
                          recurrentCases.length > 0 ? 'text-red-400' : 'text-emerald-400'
                        }`}>{recurrentCases.length}</span>
                      </div>
                    </div>
                  </div>

                  {/* 4 KPIs de Auditoria Operacional */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Operação Regular</span>
                      <span className="text-xl font-black text-emerald-400">{executiveResult.eligibleVehiclesCount}</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">Veículos auditados</span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Isentos (Esporádicos)</span>
                        <span className="text-xl font-black text-amber-400">{executiveResult.excludedVehiclesCount}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setShowExcludedAuditModal(true)}
                        className="mt-1 text-[10px] font-bold text-cyan-400 hover:text-cyan-300 underline text-left cursor-pointer"
                      >
                        Ver Auditoria de Isenção →
                      </button>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Critério de Dias</span>
                      <span className="text-xl font-black text-indigo-400">≥ {executiveResult.activeCriteria.minActiveDays} dias</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">No período analisado</span>
                    </div>

                    <div className="p-3.5 rounded-2xl bg-slate-800/80 border border-slate-700/80">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Meta Operacional</span>
                      <span className="text-xl font-black text-white">{metaKml.toFixed(2)} km/L</span>
                      <span className="text-[10px] text-slate-400 block mt-0.5">3 semanas consecutivas</span>
                    </div>
                  </div>

                  {/* Operational Regularity Filter Bar */}
                  <div className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-700 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-300 flex items-center gap-1.5">
                        <Filter size={14} className="text-cyan-400" />
                        Filtro de Regularidade Operacional:
                      </span>
                      <button
                        type="button"
                        onClick={() => setMinActiveDaysMode('auto')}
                        className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                          minActiveDaysMode === 'auto'
                            ? 'bg-cyan-500 text-slate-950 shadow-xs'
                            : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                        }`}
                        title="Calcula automaticamente com base no tamanho do período (quinzena/mês)"
                      >
                        Automático ({executiveResult.activeCriteria.minActiveDays} dias)
                      </button>
                      <button
                        type="button"
                        onClick={() => setMinActiveDaysMode('regular_4')}
                        className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                          minActiveDaysMode === 'regular_4'
                            ? 'bg-cyan-500 text-slate-950 shadow-xs'
                            : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                        }`}
                        title="Exige ao menos 4 dias rodados no período"
                      >
                        Padrão Regular (≥ 4 dias)
                      </button>
                      <button
                        type="button"
                        onClick={() => setMinActiveDaysMode('rigorous_7')}
                        className={`px-2.5 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                          minActiveDaysMode === 'rigorous_7'
                            ? 'bg-cyan-500 text-slate-950 shadow-xs'
                            : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
                        }`}
                        title="Exige ao menos 7 dias rodados no período (operação quase diária)"
                      >
                        Intensivo (≥ 7 dias)
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setShowExcludedAuditModal(true)}
                        className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:border-slate-600 font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                      >
                        <ShieldAlert size={13} className="text-amber-400" />
                        <span>Auditoria de Isenções ({executiveResult.excludedVehiclesCount})</span>
                      </button>
                    </div>
                  </div>

                  {/* Painel Executivo de Configuração e Auditoria de Semanas do Plano de Ação */}
                  <div className="p-4 rounded-2xl bg-slate-900/95 border border-cyan-800/40 shadow-xl space-y-3.5">
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                          <Calendar size={18} />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-black text-white uppercase tracking-wider">
                              Configuração de Semanas do Plano de Ação
                            </h4>
                            {evalMode === 'previous_3_closed' && referenceWeekKey === 'auto' ? (
                              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-full text-[10px] font-black uppercase">
                                Regra Padrão Ativa
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full text-[10px] font-black uppercase">
                                Período Personalizado
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-300 mt-0.5">
                            {evalMode === 'previous_3_closed' 
                              ? `Critério Padrão: Semana de referência em curso (Semana ${weekSelectionInfo?.referenceWeekNo || currentWeekInfo.weekNoStr}). Para entrar no Plano de Ação, o veículo/motorista deve ter ficado abaixo da meta (${metaKml.toFixed(2)} km/L) nas 3 últimas semanas anteriores concluídas.`
                              : `Critério Ajustado: Avaliando ${weekSelectionInfo?.targetWeeks.map(w => `Sem. ${w.weekNo}`).join(', ') || '3 semanas'}.`}
                          </p>
                        </div>
                      </div>

                      {/* Botão de resetar para o padrão se alterado */}
                      {(evalMode !== 'previous_3_closed' || referenceWeekKey !== 'auto') && (
                        <button
                          type="button"
                          onClick={() => {
                            setReferenceWeekKey('auto');
                            setEvalMode('previous_3_closed');
                            setSelectedCustomWeeks([]);
                          }}
                          className="px-3 py-1.5 bg-cyan-950/80 hover:bg-cyan-900/90 text-cyan-300 border border-cyan-700/60 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 self-start lg:self-center cursor-pointer"
                        >
                          <RotateCcw size={13} />
                          <span>Restaurar Padrão (Semana Atual - 3 Anteriores)</span>
                        </button>
                      )}
                    </div>

                    {/* Controles de Semanas e Modos */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {/* Modo 1: 3 Semanas Anteriores (Padrão) */}
                      <div 
                        onClick={() => setEvalMode('previous_3_closed')}
                        className={`p-3 rounded-xl border transition-all cursor-pointer ${
                          evalMode === 'previous_3_closed'
                            ? 'bg-cyan-950/40 border-cyan-500 shadow-sm ring-1 ring-cyan-500/30'
                            : 'bg-slate-800/60 border-slate-700 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-white flex items-center gap-1.5">
                            <CheckCircle2 size={14} className={evalMode === 'previous_3_closed' ? 'text-cyan-400' : 'text-slate-500'} />
                            3 Semanas Anteriores
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/30">
                            Padrão Oficial
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 mt-1.5 leading-relaxed">
                          Se semana atual = <strong>{weekSelectionInfo?.referenceWeekNo || currentWeekInfo.weekNoStr}</strong>, audita as 3 semanas anteriores fechadas ({weekSelectionInfo?.availableWeeks
                            .filter(w => (w.year * 100 + w.weekNo) < ((weekSelectionInfo?.referenceYear || 0) * 100 + (weekSelectionInfo?.referenceWeekNo || 0)))
                            .slice(-3)
                            .map(w => `Sem. ${w.weekNo}`)
                            .join(', ') || '36, 35, 34'}).
                        </p>
                      </div>

                      {/* Modo 2: 3 Últimas incluindo a atual */}
                      <div 
                        onClick={() => setEvalMode('including_reference_3')}
                        className={`p-3 rounded-xl border transition-all cursor-pointer ${
                          evalMode === 'including_reference_3'
                            ? 'bg-cyan-950/40 border-cyan-500 shadow-sm ring-1 ring-cyan-500/30'
                            : 'bg-slate-800/60 border-slate-700 hover:border-slate-600'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-white flex items-center gap-1.5">
                            <Clock size={14} className={evalMode === 'including_reference_3' ? 'text-cyan-400' : 'text-slate-500'} />
                            3 Últimas c/ Atual
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 bg-sky-500/20 text-sky-300 rounded border border-sky-500/30">
                            Tempo Real
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 mt-1.5 leading-relaxed">
                          Audita a semana em curso (Semana <strong>{weekSelectionInfo?.referenceWeekNo || currentWeekInfo.weekNoStr}</strong>) + 2 semanas anteriores.
                        </p>
                      </div>

                      {/* Seletor de Semana de Referência */}
                      <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700 flex flex-col justify-between">
                        <div>
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                            Semana de Referência:
                          </span>
                          <select
                            value={referenceWeekKey}
                            onChange={(e) => setReferenceWeekKey(e.target.value)}
                            className="w-full mt-1.5 bg-slate-900 border border-slate-600 rounded-lg px-2 py-1 text-xs text-cyan-300 font-black focus:outline-none focus:ring-1 focus:ring-cyan-400 cursor-pointer"
                          >
                            <option value="auto">
                              Semana Atual: Sem. {currentWeekInfo.weekNoStr} ({currentWeekInfo.year}) [Padrão]
                            </option>
                            {weekSelectionInfo?.availableWeeks.map(w => (
                              <option key={w.key} value={w.key}>
                                Semana {w.weekNo} de {w.year}
                              </option>
                            ))}
                          </select>
                        </div>
                        <span className="text-[10px] text-slate-400 mt-1">
                          Permite auditar semanas históricas retroativas.
                        </span>
                      </div>
                    </div>

                    {/* Timeline de Semanas Auditadas */}
                    <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                          <Check size={13} className="text-emerald-400" />
                          Semanas Auditadas neste Plano de Ação:
                        </span>
                        {weekSelectionInfo?.targetWeeks.map((tw) => (
                          <span
                            key={tw.key}
                            className="px-2.5 py-1 rounded-lg bg-cyan-950/80 border border-cyan-500/50 text-cyan-200 text-xs font-black flex items-center gap-1 shadow-xs"
                          >
                            <Calendar size={12} className="text-cyan-400" />
                            <span>Semana {tw.weekNo}/{tw.year}</span>
                          </span>
                        ))}
                      </div>

                      <div className="text-[11px] text-slate-400">
                        Total de <strong>{weekSelectionInfo?.targetWeeks.length || 3} semanas</strong> consecutivas avaliadas
                      </div>
                    </div>
                  </div>

                  {/* List of Recurrent Cases */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-black text-slate-200 uppercase tracking-wider flex items-center gap-2">
                        <UserCheck size={16} className="text-emerald-400" />
                        Veículos com Operação Regular em Regime de Intervenção ({recurrentCases.length})
                      </h4>
                      {recurrentCases.length > 0 && (
                        <span className="text-xs text-red-400 font-bold">
                          Exige Plano de Ação Imediato
                        </span>
                      )}
                    </div>

                    {recurrentCases.length === 0 ? (
                      <div className="p-8 rounded-2xl bg-slate-800/60 border border-slate-700/80 text-center space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto">
                          <CheckCircle2 size={24} />
                        </div>
                        <h5 className="text-base font-black text-white">Nenhum Veículo Crítico com 3 Semanas Consecutivas Abaixo da Meta</h5>
                        <p className="text-xs text-slate-300 max-w-xl mx-auto leading-relaxed">
                          Todos os <strong>{executiveResult.eligibleVehiclesCount} veículos</strong> que operaram regularmente no período ({executiveResult.activeCriteria.minActiveDays}+ dias ativos) estão em conformidade com as metas ou não sustentam 3 semanas consecutivas em desvio.
                        </p>
                        <p className="text-[11px] text-slate-400 max-w-lg mx-auto">
                          Veículos com saídas esporádicas (1 a 2 deslocamentos pontuais ou testes de mecânica) foram isolados para evitar planos de ação incoerentes por amostragem insuficiente.
                        </p>
                        {executiveResult.excludedVehiclesCount > 0 && (
                          <button
                            type="button"
                            onClick={() => setShowExcludedAuditModal(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-700 text-cyan-400 rounded-xl text-xs font-bold border border-slate-700 cursor-pointer"
                          >
                            <Info size={13} />
                            Ver os {executiveResult.excludedVehiclesCount} veículos isentos por baixa frequência
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {recurrentCases.map((rc, idx) => (
                          <div key={rc.id || idx} className="bg-slate-800/90 border border-slate-700 rounded-2xl p-5 space-y-4 hover:border-red-500/50 transition-colors shadow-lg">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-center gap-3">
                                <div className="p-3 bg-red-950/80 border border-red-700/60 text-red-400 rounded-xl font-black text-sm">
                                  #{idx + 1}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="text-base font-black text-white">Frota {rc.frota}</span>
                                    <span className="text-xs text-slate-400 font-mono">({rc.placa})</span>
                                  </div>
                                  
                                  {/* Regime de Condução Badge */}
                                  <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium mt-1">
                                    {rc.driverRegime === 'dupla' || rc.driverRegime === 'multiplo' ? (
                                      <Users size={14} className="text-indigo-400 shrink-0" />
                                    ) : (
                                      <UserCheck size={14} className="text-emerald-400 shrink-0" />
                                    )}
                                    <span className="text-white font-bold">{rc.driverRegimeLabel}</span>
                                  </div>

                                  {/* Operational Regularity Badge */}
                                  <div className="flex items-center gap-2 text-[11px] text-slate-400 mt-1">
                                    <span className="px-2 py-0.5 rounded-md bg-slate-900 border border-slate-700 text-cyan-300 font-bold">
                                      {rc.totalActiveDays} dias operados no período
                                    </span>
                                    <span>Média: {rc.avgKmPerActiveDay} km/dia</span>
                                  </div>
                                </div>
                              </div>

                              <div className="text-right">
                                <span className="text-[10px] font-bold text-red-300 uppercase tracking-wider block">Média 3 Semanas</span>
                                <span className="text-lg font-black text-red-400">{rc.avgKmlConsecutive.toFixed(2)} km/L</span>
                                <span className="text-[10px] text-slate-400 block">{rc.totalKmConsecutive.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} km tot.</span>
                              </div>
                            </div>

                            {/* Week-by-week pill history (e.g. 36 - 35 - 34) */}
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                  Evolução Consecutiva ({rc.weeksDetails.map(w => w.semanaLabel.split('/')[0]).join(' - ')}):
                                </span>
                                <span className="text-[9px] font-semibold text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-800/40">
                                  3 semanas consecutivas &lt; meta
                                </span>
                              </div>
                              <div className="grid grid-cols-3 gap-2">
                                {rc.weeksDetails.map((w, wIdx) => (
                                  <div key={wIdx} className="bg-slate-900/90 border border-slate-700/80 rounded-xl p-2 text-center relative overflow-hidden">
                                    {wIdx === 0 && (
                                      <span className="absolute top-0 right-0 px-1.5 py-0.2 bg-cyan-500/30 text-cyan-300 text-[8px] font-bold rounded-bl border-b border-l border-cyan-400/20">
                                        Mais Recente
                                      </span>
                                    )}
                                    <span className="text-[10px] text-slate-300 block font-bold pt-0.5">{w.semanaLabel}</span>
                                    <span className="text-xs font-black text-red-400 block">{w.kml.toFixed(2)} km/L</span>
                                    <span className="text-[9px] text-slate-500 block">{w.km} km ({w.activeDays}d)</span>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Action badge */}
                            <div className="p-3 bg-red-950/40 border border-red-900/60 rounded-xl text-xs text-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                              <div className="space-y-0.5">
                                <strong className="text-red-300 block">Ação Obrigatória Corporativa:</strong>
                                <p className="text-[11px]">{rc.suggestedAction}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => setSelectedExplosionVehicle({
                                  frota: rc.frota,
                                  placa: rc.placa,
                                  motorista: rc.motorista,
                                  operacao: rc.operacao,
                                  km: rc.totalKmConsecutive,
                                  litros: rc.totalLitrosConsecutive,
                                  media: rc.avgKmlConsecutive,
                                  consecutiveWeeksCount: rc.consecutiveWeeksCount,
                                  weeksDetails: rc.weeksDetails,
                                  suggestedAction: rc.suggestedAction,
                                  isBelow: true
                                })}
                                className="px-3 py-2 bg-slate-900 hover:bg-slate-700 text-cyan-400 hover:text-white border border-slate-700 hover:border-cyan-500 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 cursor-pointer shadow-md self-end sm:self-center"
                                title={`Explodir dados completos da Frota ${rc.frota} (${rc.placa})`}
                              >
                                <Maximize2 size={13} />
                                <span>Explodir Dados</span>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* 4-Pillar Action Matrix */}
                  <div className="bg-slate-900/90 border border-slate-700 rounded-2xl p-6 space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-4 bg-emerald-500 rounded-full" />
                      <h4 className="text-sm font-black text-white uppercase tracking-wider">
                        Matriz de Intervenção em 4 Frentes Obrigatórias (Plano de Ação Imediato)
                      </h4>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
                      <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 space-y-2">
                        <div className="flex items-center gap-2 text-amber-400">
                          <Wrench size={16} />
                          <span className="text-xs font-black uppercase">1. Oficina & Mecânica</span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          Diagnóstico minucioso de bicos injetores, filtros de combustível/ar, calibragem de pneus e sistema de arrefecimento.
                        </p>
                        <span className="inline-block text-[10px] font-bold text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-700/60">
                          Prazo: 48 horas
                        </span>
                      </div>

                      <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 space-y-2">
                        <div className="flex items-center gap-2 text-sky-400">
                          <Gauge size={16} />
                          <span className="text-xs font-black uppercase">2. Telemetria & CCO</span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          Auditoria detalhada de condução: tempo de motor ocioso (marcha lenta parada), faixas de rotação (RPM) e frenagens bruscas.
                        </p>
                        <span className="inline-block text-[10px] font-bold text-sky-300 bg-sky-950/60 px-2 py-0.5 rounded-md border border-sky-700/60">
                          Prazo: 24 horas
                        </span>
                      </div>

                      <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 space-y-2">
                        <div className="flex items-center gap-2 text-emerald-400">
                          <GraduationCap size={16} />
                          <span className="text-xs font-black uppercase">3. Treinamento & Tráfego</span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          Reciclagem prática presencial em rota com instrutor técnico para correção de vícios e aplicação de direção econômica.
                        </p>
                        <span className="inline-block text-[10px] font-bold text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-700/60">
                          Prazo: 5 dias úteis
                        </span>
                      </div>

                      <div className="bg-slate-800/80 border border-slate-700 rounded-xl p-4 space-y-2">
                        <div className="flex items-center gap-2 text-purple-400">
                          <ClipboardList size={16} />
                          <span className="text-xs font-black uppercase">4. Supervisão & KM</span>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          Auditoria física de 100% das Folhas de KM enviadas e validação da integridade de hodômetros e rotas escaladas.
                        </p>
                        <span className="inline-block text-[10px] font-bold text-purple-300 bg-purple-950/60 px-2 py-0.5 rounded-md border border-purple-700/60">
                          Prazo: Imediato
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: HISTÓRICO DE MÉDIA POR MOTORISTA / PLACA */}
          {sinteseTab === 'historico_medias' && (
            <div className="space-y-6">
              <HistoryDriverVehicleTab
                consolidatedReportData={consolidatedReportData}
                mergedData={mergedData}
                driverChartData={driverChartData}
                targetKml={metaKml}
                periodoLabel={periodoLabel}
                companyName={companyName}
                erpSystem={erpSystem}
                reportLogo={reportLogo}
                onNavigateToActionPlan={() => setSinteseTab('sintese_executiva')}
              />
            </div>
          )}
        </div>
      )}

      {/* VIEW 2: JUSTIFICATIVAS POR VEÍCULO (IA) */}
      {activeView === 'justificativas_veiculos' && (
        <div className="space-y-6">
          <JustificationsTab
            consolidatedReportData={consolidatedReportData}
            mergedData={mergedData}
            periodoLabel={periodoLabel}
            companyName={companyName}
            erpSystem={erpSystem}
            reportLogo={reportLogo}
            getLinkedFuelings={getLinkedFuelings}
            getLinkedKms={getLinkedKms}
          />
        </div>
      )}

      {/* Modal for floating pop-up if user triggers it */}
      <EmailWhatsAppConsumptionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        consolidatedReportData={consolidatedReportData}
        mergedData={mergedData}
        driverChartData={driverChartData}
        targetKml={metaKml}
        periodoLabel={periodoLabel}
        companyName={companyName}
        erpSystem={erpSystem}
        reportLogo={reportLogo}
      />

      {/* Modal de Opções de Exportação & Impressão do Plano de Ação */}
      {showExportOptionsModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shadow-sm">
                  <LayoutTemplate size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">Opções de Exportação & Impressão</h3>
                  <p className="text-xs text-slate-500 font-medium">Personalize os elementos visuais e modo de relatório .PDF</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowExportOptionsModal(false)}
                className="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              
              {/* 1. Modo do Relatório */}
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-400">Modo do Relatório .PDF</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setExportReportMode('consolidated')}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                      exportReportMode === 'consolidated'
                        ? 'border-indigo-600 bg-indigo-50/40 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-800">Consolidado Gerencial</span>
                      {exportReportMode === 'consolidated' && <CheckCircle2 size={16} className="text-indigo-600" />}
                    </div>
                    <p className="text-[11px] text-slate-500">Por grupos com totais, desvios e médias</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExportReportMode('detailed')}
                    className={`p-4 rounded-2xl border text-left transition-all cursor-pointer ${
                      exportReportMode === 'detailed'
                        ? 'border-indigo-600 bg-indigo-50/40 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-800">Listagem Completa</span>
                      {exportReportMode === 'detailed' && <CheckCircle2 size={16} className="text-indigo-600" />}
                    </div>
                    <p className="text-[11px] text-slate-500">Todos os veículos analisados ({sortedVehicles.length})</p>
                  </button>
                </div>
              </div>

              {/* 2. Elementos para Incluir */}
              <div className="space-y-2.5">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-400">Elementos para Incluir</label>
                
                {/* Executive Summary */}
                <div 
                  onClick={() => setExportIncludeExecutiveSummary(!exportIncludeExecutiveSummary)}
                  className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                      <Sparkles size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">Card Síntese Executiva Automatizada</p>
                      <p className="text-[10px] text-slate-500">Resumo estratégico em texto com frotas em desvio consecutivo (3 semanas)</p>
                    </div>
                  </div>
                  <input 
                    type="checkbox"
                    checked={exportIncludeExecutiveSummary}
                    onChange={() => {}}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 pointer-events-none"
                  />
                </div>

                {/* Diretrizes Operacionais */}
                <div 
                  onClick={() => setExportIncludeGuidelines(!exportIncludeGuidelines)}
                  className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                      <FileText size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">Diretrizes Operacionais & Regra de Recorrência</p>
                      <p className="text-[10px] text-slate-500">Instruções corporativas e destaque formal para a regra de 3 semanas</p>
                    </div>
                  </div>
                  <input 
                    type="checkbox"
                    checked={exportIncludeGuidelines}
                    onChange={() => {}}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 pointer-events-none"
                  />
                </div>

                {/* KPIs */}
                <div 
                  onClick={() => setExportIncludeKpis(!exportIncludeKpis)}
                  className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                      <Layers size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">Cards de Indicadores Executivos</p>
                      <p className="text-[10px] text-slate-500">KM Total, Volume Consumido, Média Geral e Litros Excedentes</p>
                    </div>
                  </div>
                  <input 
                    type="checkbox"
                    checked={exportIncludeKpis}
                    onChange={() => {}}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 pointer-events-none"
                  />
                </div>

                {/* Table */}
                <div 
                  onClick={() => setExportIncludeTable(!exportIncludeTable)}
                  className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                      <FileCheck size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">Tabela Analítica / Quadro Resumo</p>
                      <p className="text-[10px] text-slate-500">Listagem detalhada de veículos com valores, médias, desvios e excedentes</p>
                    </div>
                  </div>
                  <input 
                    type="checkbox"
                    checked={exportIncludeTable}
                    onChange={() => {}}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 pointer-events-none"
                  />
                </div>

                {/* Action Matrix */}
                <div 
                  onClick={() => setExportIncludeActionMatrix(!exportIncludeActionMatrix)}
                  className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center">
                      <Wrench size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">Matriz de Intervenção Obrigatória (Plano de Ação)</p>
                      <p className="text-[10px] text-slate-500">4 Frentes: Oficina/Mecânica, Telemetria/CCO, Treinamento e Supervisão</p>
                    </div>
                  </div>
                  <input 
                    type="checkbox"
                    checked={exportIncludeActionMatrix}
                    onChange={() => {}}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 pointer-events-none"
                  />
                </div>

                {/* Signatures */}
                <div 
                  onClick={() => setExportIncludeSignatures(!exportIncludeSignatures)}
                  className="flex items-center justify-between p-3.5 rounded-2xl border border-slate-100 hover:border-slate-200 hover:bg-slate-50/50 cursor-pointer transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
                      <UserCheck size={16} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800">Bloco de Assinaturas Corporativas</p>
                      <p className="text-[10px] text-slate-500">Campos formais de validação para Supervisão, Gestão e Diretoria</p>
                    </div>
                  </div>
                  <input 
                    type="checkbox"
                    checked={exportIncludeSignatures}
                    onChange={() => {}}
                    className="w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 pointer-events-none"
                  />
                </div>
              </div>

              {/* 3. Orientação da Página (Paisagem como padrão) */}
              <div className="space-y-2">
                <label className="text-[11px] font-black uppercase tracking-wider text-slate-400">Orientação da Página (A4)</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setExportOrientation('landscape')}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      exportOrientation === 'landscape'
                        ? 'border-indigo-600 bg-indigo-50/40 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-800">Paisagem (Horizontal)</span>
                      {exportOrientation === 'landscape' && <CheckCircle2 size={16} className="text-indigo-600" />}
                    </div>
                    <p className="text-[10px] text-slate-500 font-medium text-indigo-900/70">★ Padrão Recomendado para tabelas amplas</p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setExportOrientation('portrait')}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
                      exportOrientation === 'portrait'
                        ? 'border-indigo-600 bg-indigo-50/40 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-bold text-slate-800">Retrato (Vertical)</span>
                      {exportOrientation === 'portrait' && <CheckCircle2 size={16} className="text-indigo-600" />}
                    </div>
                    <p className="text-[10px] text-slate-500">Formato padrão de documento</p>
                  </button>
                </div>
              </div>

              {/* Banner */}
              <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-2.5 text-emerald-800 text-[11px] font-medium">
                <CheckCircle2 size={16} className="text-emerald-600 flex-shrink-0" />
                <span>Cabeçalho oficial com Logo UNI, Semana Atual ({currentWeekInfo.shortLabel}) e Meta Operacional ({metaKml.toFixed(2)} km/L) inseridos automaticamente em alta definição.</span>
              </div>

            </div>

            {/* Footer Buttons */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowExportOptionsModal(false)}
                disabled={isGeneratingPdf}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleGeneratePDF('print')}
                  disabled={isGeneratingPdf}
                  className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {isGeneratingPdf ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Printer size={14} />
                  )}
                  Imprimir Agora
                </button>

                <button
                  type="button"
                  onClick={() => handleGeneratePDF('download')}
                  disabled={isGeneratingPdf}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-600/20 active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  {isGeneratingPdf ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <Download size={14} />
                  )}
                  Baixar Relatório (PDF)
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* MODAL DE EXPLOSÃO DE DADOS DO VEÍCULO / PLANO DE AÇÃO */}
      <VehicleExplosionModal
        isOpen={!!selectedExplosionVehicle}
        onClose={() => setSelectedExplosionVehicle(null)}
        vehicle={selectedExplosionVehicle}
        fuelRecords={selectedExplosionVehicle ? getLinkedFuelings(selectedExplosionVehicle.placa) : []}
        kmRecords={selectedExplosionVehicle ? getLinkedKms(selectedExplosionVehicle.placa) : []}
        mergedData={mergedData}
        targetKml={metaKml}
        periodoLabel={periodoLabel}
        companyName={companyName}
        erpSystem={erpSystem}
        reportLogo={reportLogo}
        onNavigateToJustifications={(placa) => {
          setActiveView('justificativas_veiculos');
        }}
      />

      {/* MODAL DE AUDITORIA DE VEÍCULOS ISENTOS (DESLOCAMENTOS ESPORÁDICOS 1-2 DIAS / OFICINA) */}
      {showExcludedAuditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-4xl max-h-[88vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-600 shadow-sm">
                  <ShieldAlert size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight">
                    Auditoria de Isenção de Veículos ({executiveResult.excludedVehiclesCount} Isentos)
                  </h3>
                  <p className="text-xs text-slate-500 font-medium">
                    Veículos desconsiderados do Plano de Ação por baixa frequência no período para assegurar a coerência gerencial
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowExcludedAuditModal(false)}
                className="w-9 h-9 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 flex items-center justify-center transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Criteria Banner */}
            <div className="px-6 py-3 bg-amber-50/60 border-b border-amber-100 text-xs text-amber-900 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Info size={14} className="text-amber-600 shrink-0" />
                <span>
                  <strong>Regra de Amostragem:</strong> Apenas veículos com <strong>≥ {executiveResult.activeCriteria.minActiveDays} dias operados</strong> e <strong>≥ {executiveResult.activeCriteria.minPeriodKm} km</strong> no período são qualificados para intervenção executiva.
                </span>
              </div>
              <span className="font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-md text-[11px]">
                {executiveResult.excludedVehiclesCount} de {executiveResult.totalVehiclesAnalyzed} veículos isentos
              </span>
            </div>

            {/* Content Table */}
            <div className="p-6 overflow-y-auto flex-1">
              {executiveResult.excludedAuditList.length === 0 ? (
                <div className="py-12 text-center text-slate-500">
                  <CheckCircle2 size={36} className="mx-auto text-emerald-500 mb-2" />
                  <p className="font-bold text-slate-800">Nenhum veículo foi isento!</p>
                  <p className="text-xs text-slate-500 mt-1">Todos os veículos da frota cumpriram o critério mínimo de regularidade no período.</p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 text-slate-600 border-b border-slate-200 font-black text-[11px] uppercase tracking-wider">
                        <th className="py-3 px-3.5">Frota / Placa</th>
                        <th className="py-3 px-3.5">Condutor</th>
                        <th className="py-3 px-3.5 text-center">Dias Ativos</th>
                        <th className="py-3 px-3.5 text-right">KM Rodados</th>
                        <th className="py-3 px-3.5 text-right">Consumo</th>
                        <th className="py-3 px-4">Motivo da Isenção</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {executiveResult.excludedAuditList.map((item, idx) => (
                        <tr key={item.placa + idx} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-2.5 px-3.5 font-bold text-slate-900 whitespace-nowrap">
                            <span className="px-2 py-0.5 rounded bg-slate-100 font-mono text-slate-700 mr-1.5">
                              {item.frota}
                            </span>
                            {item.placa}
                          </td>
                          <td className="py-2.5 px-3.5 text-slate-600 whitespace-nowrap max-w-[160px] truncate">
                            {item.motorista || 'NÃO INFORMADO'}
                          </td>
                          <td className="py-2.5 px-3.5 text-center font-bold">
                            <span className={`px-2 py-0.5 rounded-full text-[11px] ${
                              item.activeDays <= 1 
                                ? 'bg-rose-50 text-rose-700 border border-rose-200' 
                                : 'bg-amber-50 text-amber-700 border border-amber-200'
                            }`}>
                              {item.activeDays} {item.activeDays === 1 ? 'dia' : 'dias'}
                            </span>
                          </td>
                          <td className="py-2.5 px-3.5 text-right font-medium text-slate-700">
                            {item.totalKm.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} km
                          </td>
                          <td className="py-2.5 px-3.5 text-right font-bold text-slate-800">
                            {item.kml > 0 ? `${item.kml.toFixed(2)} km/L` : '-'}
                          </td>
                          <td className="py-2.5 px-4 text-slate-600 text-[11px]">
                            <span className="inline-block bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-medium">
                              {item.reason}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500">
                Esta auditoria garante que a gerência não perca tempo cobrando desvios pontuais decorrentes de oficinas ou saídas isoladas.
              </span>
              <button
                type="button"
                onClick={() => setShowExcludedAuditModal(false)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
              >
                Fechar Auditoria
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
