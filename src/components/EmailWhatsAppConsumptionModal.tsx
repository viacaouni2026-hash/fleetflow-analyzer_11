import React, { useState, useMemo } from 'react';
import { 
  X, 
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
  MessageSquare,
  Share2,
  ExternalLink,
  Edit3,
  Flame,
  FileText,
  Wrench,
  Gauge,
  GraduationCap,
  ClipboardList,
  ChevronRight,
  Maximize2,
  UserCheck,
  Clock,
  ShieldAlert,
  Layers,
  Users,
  User,
  RotateCcw,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { calculateExecutiveSynthesis, RecurrentCase as ExecutiveRecurrentCase } from '../lib/executiveSynthesis';

interface EmailWhatsAppConsumptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  consolidatedReportData: any[];
  mergedData?: any[];
  driverChartData?: any[];
  targetKml: number;
  periodoLabel: string;
  companyName: string;
  erpSystem?: string;
  reportLogo?: string;
}

export type RecurrentCase = ExecutiveRecurrentCase;

export default function EmailWhatsAppConsumptionModal({
  isOpen,
  onClose,
  consolidatedReportData,
  mergedData = [],
  driverChartData = [],
  targetKml,
  periodoLabel,
  companyName,
  erpSystem = 'TOTVS / Protheus',
  reportLogo = ''
}: EmailWhatsAppConsumptionModalProps) {
  // Threshold state (defaults to targetKml, e.g. 3.00)
  const [metaKml, setMetaKml] = useState<number>(() => targetKml || 3.0);
  const [copiedType, setCopiedType] = useState<'whatsapp' | 'email' | 'table' | 'sintese' | null>(null);
  const [filterMode, setFilterMode] = useState<'below_only' | 'all'>('below_only');
  const [filterScope, setFilterScope] = useState<'all' | 'placa' | 'motorista'>('all');
  const [selectedPlaca, setSelectedPlaca] = useState<string>('ALL');
  const [selectedDriver, setSelectedDriver] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortField, setSortField] = useState<'frota' | 'placa' | 'motorista' | 'km' | 'litros' | 'kml'>('kml');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [isEditingGuideline, setIsEditingGuideline] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'notificacao' | 'sintese_executiva'>('notificacao');

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

  // Map of vehicle plate/frota -> driver name
  const vehicleToDriverMap = useMemo(() => {
    const map = new Map<string, string>();
    if (driverChartData && Array.isArray(driverChartData)) {
      driverChartData.forEach(d => {
        const driverName = d.motorista || d.driverName || d.name || '';
        if (!driverName) return;
        if (d.placas && Array.isArray(d.placas)) {
          d.placas.forEach((p: string) => map.set(String(p).trim().toUpperCase(), driverName));
        }
        if (d.frotas && Array.isArray(d.frotas)) {
          d.frotas.forEach((f: string) => map.set(String(f).trim().toUpperCase(), driverName));
        }
        if (d.placa) map.set(String(d.placa).trim().toUpperCase(), driverName);
        if (d.frota) map.set(String(d.frota).trim().toUpperCase(), driverName);
      });
    }
    if (mergedData && Array.isArray(mergedData)) {
      mergedData.forEach(r => {
        const driverName = r.MOTORISTA || r.motorista;
        if (!driverName || driverName === 'N/A' || driverName === '-') return;
        const plate = String(r.PLACA || r.placa || '').trim().toUpperCase();
        const frota = String(r.FROTA || r.frota || '').trim().toUpperCase();
        if (plate && !map.has(plate)) map.set(plate, driverName);
        if (frota && !map.has(frota)) map.set(frota, driverName);
      });
    }
    return map;
  }, [driverChartData, mergedData]);

  // Base raw mapped items
  const baseVehicles = useMemo(() => {
    if (!consolidatedReportData || !Array.isArray(consolidatedReportData)) return [];
    return consolidatedReportData.map(v => {
      const placa = String(v.placa || '').trim().toUpperCase();
      const frota = String(v.frota || '').trim();
      const motorista = v.motorista && v.motorista !== 'N/A' && v.motorista !== '-'
        ? v.motorista
        : (vehicleToDriverMap.get(placa) || vehicleToDriverMap.get(frota) || 'NÃO IDENTIFICADO');
      const km = Number(v.kmProdutivo || v.km || 0);
      const litros = Number(v.litros || 0);
      const kml = Number(v.kml || (litros > 0 ? km / litros : 0));
      const isBelow = kml > 0 && kml < metaKml;

      return {
        ...v,
        placa,
        frota,
        motorista,
        km,
        litros,
        kml,
        isBelow
      };
    });
  }, [consolidatedReportData, metaKml, vehicleToDriverMap]);

  // Unique list of plates with frota & driver for the selector
  const uniquePlatesList = useMemo(() => {
    const map = new Map<string, { key: string; placa: string; frota: string; motorista: string; kml: number; isBelow: boolean }>();
    baseVehicles.forEach(item => {
      const key = item.placa || item.frota;
      if (!key) return;
      if (!map.has(key)) {
        map.set(key, {
          key,
          placa: item.placa,
          frota: item.frota,
          motorista: item.motorista,
          kml: item.kml,
          isBelow: item.isBelow
        });
      }
    });
    return Array.from(map.values()).sort((a, b) => (a.frota || a.placa).localeCompare(b.frota || b.placa));
  }, [baseVehicles]);

  // Unique list of drivers for the selector
  const uniqueDriversList = useMemo(() => {
    const map = new Map<string, { name: string; count: number; frotas: string[]; avgKml: number; totalKm: number; totalLitros: number }>();
    baseVehicles.forEach(item => {
      const driver = item.motorista || 'NÃO IDENTIFICADO';
      if (!map.has(driver)) {
        map.set(driver, { name: driver, count: 0, frotas: [], avgKml: 0, totalKm: 0, totalLitros: 0 });
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
        avgKml: d.totalLitros > 0 ? d.totalKm / d.totalLitros : 0
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [baseVehicles]);

  // Professional corporate notification guidelines text with the mandatory 3-week rule
  const defaultGuidelineText = useMemo(() => {
    return `Prezados Supervisores e Gestores Operacionais,

Solicitamos a verificação pontual dos veículos listados abaixo, cujas médias de consumo de combustível ficaram abaixo da meta operacional estabelecida de ${metaKml.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} km/L no período em referência.

Ressaltamos a extrema importância de validar e confirmar o envio de 100% das "Folhas KM" de toda a frota. Lembramos que a ausência ou pendência de qualquer folha de KM compromete diretamente o cálculo da quilometragem produtiva e impacta negativamente o atingimento da meta da operação.

Pedimos a gentileza de contatar e alinhar com os respectivos motoristas responsáveis para apuração das condições de condução, trajetos executados ou eventuais anomalias mecânicas/operacionais.

⚠️ DIRETRIZ CORPORATIVA DE RECORRÊNCIA: Fica formalmente estabelecido que, caso o mesmo motorista e/ou veículo (placa/frota) apresente média de consumo abaixo da meta por 3 (três) semanas consecutivas, a Supervisão Operacional e a Gestão de Frota deverão adotar e formalizar imediatamente um PLANO DE AÇÃO PARA MELHORIAS, integrando auditoria mecânica detalhada, análise de telemetria e reciclagem prática de condução econômica com os instrutores de tráfego.

Na sequência, solicitamos o retorno formal com as devidas justificativas técnicas e planos de ação para que possamos consolidar e reportar os resultados à Diretoria Executiva.

Agradecemos pelo contínuo empenho na otimização da eficiência energética e sustentabilidade da nossa frota.`;
  }, [metaKml]);

  const [guidelineText, setGuidelineText] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('fleet_consumption_email_guideline_v2');
      if (saved && saved.includes('3 (três) semanas')) {
        return saved;
      }
      return defaultGuidelineText;
    } catch {
      return defaultGuidelineText;
    }
  });

  // Keep guideline in sync if default is reset
  const handleResetGuideline = () => {
    setGuidelineText(defaultGuidelineText);
    try {
      localStorage.removeItem('fleet_consumption_email_guideline_v2');
    } catch (e) {
      console.warn(e);
    }
  };

  const handleSaveGuideline = (newText: string) => {
    setGuidelineText(newText);
    try {
      localStorage.setItem('fleet_consumption_email_guideline_v2', newText);
    } catch (e) {
      console.warn(e);
    }
  };

  // Filter vehicles for table view
  const vehiclesToReport = useMemo(() => {
    return baseVehicles
      .filter(v => {
        if (filterMode === 'below_only') {
          return v.kml > 0 && v.kml < metaKml;
        }
        return v.kml > 0;
      })
      .filter(v => {
        if (filterScope === 'placa' && selectedPlaca !== 'ALL') {
          return v.placa.toUpperCase() === selectedPlaca.toUpperCase() || 
                 v.frota.toUpperCase() === selectedPlaca.toUpperCase();
        }
        if (filterScope === 'motorista' && selectedDriver !== 'ALL') {
          return v.motorista.toUpperCase() === selectedDriver.toUpperCase();
        }
        return true;
      })
      .filter(v => {
        if (!searchTerm.trim()) return true;
        const term = searchTerm.toLowerCase();
        return (
          (v.placa && v.placa.toLowerCase().includes(term)) ||
          (v.frota && v.frota.toLowerCase().includes(term)) ||
          (v.motorista && v.motorista.toLowerCase().includes(term)) ||
          (v.operacao && String(v.operacao).toLowerCase().includes(term))
        );
      });
  }, [baseVehicles, filterMode, filterScope, selectedPlaca, selectedDriver, searchTerm, metaKml]);

  const handleSort = (field: 'frota' | 'placa' | 'motorista' | 'km' | 'litros' | 'kml') => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      // Default to ascending for text/media, descending for volume/km
      setSortDirection(field === 'kml' ? 'asc' : (field === 'km' || field === 'litros' ? 'desc' : 'asc'));
    }
  };

  // Dynamic sorting based on sortField and sortDirection
  const sortedVehicles = useMemo(() => {
    const list = [...vehiclesToReport];
    return list.sort((a, b) => {
      let comparison = 0;
      switch (sortField) {
        case 'frota': {
          const fa = a.frota || '';
          const fb = b.frota || '';
          comparison = fa.localeCompare(fb, 'pt-BR', { numeric: true, sensitivity: 'base' });
          break;
        }
        case 'placa': {
          const pa = a.placa || '';
          const pb = b.placa || '';
          comparison = pa.localeCompare(pb, 'pt-BR', { numeric: true, sensitivity: 'base' });
          break;
        }
        case 'motorista': {
          const ma = a.motorista || '';
          const mb = b.motorista || '';
          comparison = ma.localeCompare(mb, 'pt-BR', { sensitivity: 'base' });
          break;
        }
        case 'km': {
          const kma = Number(a.kmProdutivo || a.km || 0);
          const kmb = Number(b.kmProdutivo || b.km || 0);
          comparison = kma - kmb;
          break;
        }
        case 'litros': {
          const la = Number(a.litros || 0);
          const lb = Number(b.litros || 0);
          comparison = la - lb;
          break;
        }
        case 'kml':
        default: {
          const ka = Number(a.kml || 0);
          const kb = Number(b.kml || 0);
          comparison = ka - kb;
          break;
        }
      }
      return sortDirection === 'asc' ? comparison : -comparison;
    });
  }, [vehiclesToReport, sortField, sortDirection]);

  // Aggregated stats
  const summaryTotals = useMemo(() => {
    let totalKm = 0;
    let totalLitros = 0;
    let totalValor = 0;

    sortedVehicles.forEach(v => {
      totalKm += Number(v.kmProdutivo || v.km || 0);
      totalLitros += Number(v.litros || 0);
      totalValor += Number(v.valor || 0);
    });

    const avgKml = totalLitros > 0 ? totalKm / totalLitros : 0;
    return {
      count: sortedVehicles.length,
      totalKm,
      totalLitros,
      totalValor,
      avgKml
    };
  }, [sortedVehicles]);

  // =========================================================================
  // DETECÇÃO AUTOMATIZADA DE RECORRÊNCIA: 3 SEMANAS CONSECUTIVAS ABAIXO DA META
  // (Baseada estritamente em veículos com operação regular no período selecionado)
  // =========================================================================
  const executiveResult = useMemo(() => {
    return calculateExecutiveSynthesis(mergedData, consolidatedReportData, {
      metaKml
    });
  }, [mergedData, consolidatedReportData, metaKml]);

  const recurrentCases = executiveResult.recurrentCases;

  if (!isOpen) return null;

  const getFullUrl = (url: string) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `${window.location.origin}${url.startsWith('/') ? '' : '/'}${url}`;
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

  // Generate clean WhatsApp message
  const generateWhatsAppMessage = () => {
    const dateStr = new Date().toLocaleDateString('pt-BR');
    let text = `📊 *RELATÓRIO DE NOTIFICAÇÃO E JUSTIFICATIVAS DE CONSUMO*\n`;
    text += `🏢 *Empresa:* ${companyName}\n`;
    text += `📅 *Competência/Período:* ${periodoLabel.toUpperCase()}\n`;
    text += `🗓️ *Semana Atual:* Semana ${currentWeekInfo.weekNoStr} (${currentWeekInfo.year})\n`;
    text += `🎯 *Meta Operacional:* ${metaKml.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} km/L\n`;
    text += `⏱️ *Data de Emissão:* ${dateStr}\n\n`;
    
    text += `📝 *DIRETRIZES OPERACIONAIS:*\n`;
    text += `${guidelineText}\n\n`;

    if (recurrentCases.length > 0) {
      text += `🚨 *ALERTA MÁXIMO - PLANOS DE AÇÃO REQUERIDOS (${recurrentCases.length} VEÍCULOS COM 3 SEMANAS CONSECUTIVAS ABAIXO DA META):*\n`;
      recurrentCases.forEach((rc, i) => {
        text += `👉 *${i + 1}. Frota ${rc.frota} (${rc.placa})* - ${rc.driverRegimeLabel || (rc.motorista ? 'Condutor: ' + rc.motorista : '')}\n`;
        text += `   • Frequência Operacional: ${rc.totalActiveDays} dias operados no período (${rc.periodTotalKm.toLocaleString('pt-BR')} km rodados)\n`;
        text += `   • Recorrência Crítica: *${rc.consecutiveWeeksCount} semanas consecutivas* com média de *${rc.avgKmlConsecutive.toFixed(2)} km/L*\n`;
        text += `   • Ação Requerida: ${rc.suggestedAction}\n`;
      });
      text += `-------------------------------------------\n\n`;
    } else {
      text += `✅ *SÍNTESE EXECUTIVA DE RECORRÊNCIA:*\n`;
      text += `Nenhum veículo com operação regular no período apresentou 3 semanas consecutivas abaixo de ${metaKml.toFixed(2)} km/L.\n`;
      text += `-------------------------------------------\n\n`;
    }

    text += `📋 *QUADRO RESUMO DE VEÍCULOS FORA DA META (${sortedVehicles.length}):*\n`;
    text += `-------------------------------------------\n`;

    sortedVehicles.forEach((v, idx) => {
      const kmlStr = (v.kml || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const kmStr = (v.kmProdutivo || v.km || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 });
      const litrosStr = (v.litros || 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
      const diffPercent = metaKml > 0 ? (((v.kml - metaKml) / metaKml) * 100).toFixed(1) : '0';
      const isBelow = (v.kml || 0) < metaKml;

      text += `${idx + 1}. *Frota ${v.frota || '-'}* (${v.placa || '-'})\n`;
      text += `   • Média: *${kmlStr} km/L* ${isBelow ? '⚠️ (Abaixo da Meta: ' + diffPercent + '%)' : '✅'}\n`;
      text += `   • KM Lançado: ${kmStr} km | Litragem: ${litrosStr} L\n`;
      if (v.motorista) {
        text += `   • Motorista: ${v.motorista}\n`;
      }
      text += `\n`;
    });

    text += `-------------------------------------------\n`;
    text += `📈 *TOTAIS DO GRUPO NOTIFICADO:*\n`;
    text += `• Total Veículos: ${summaryTotals.count}\n`;
    text += `• KM Total: ${summaryTotals.totalKm.toLocaleString('pt-BR')} km\n`;
    text += `• Litragem Total: ${summaryTotals.totalLitros.toLocaleString('pt-BR', { minimumFractionDigits: 1 })} L\n`;
    text += `• Média Consolidada: *${summaryTotals.avgKml.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} km/L*\n\n`;
    text += `📲 _Gerado pelo Sistema Integrado de Gestão de Frotas_`;

    return text;
  };

  // Copy WhatsApp Text to Clipboard
  const handleCopyWhatsApp = async () => {
    const text = generateWhatsAppMessage();
    try {
      await navigator.clipboard.writeText(text);
      setCopiedType('whatsapp');
      setTimeout(() => setCopiedType(null), 3000);
    } catch (err) {
      console.error('Clipboard copy failed:', err);
    }
  };

  // Send directly to WhatsApp Web / App
  const handleOpenWhatsApp = () => {
    const text = generateWhatsAppMessage();
    const encoded = encodeURIComponent(text);
    window.open(`https://api.whatsapp.com/send?text=${encoded}`, '_blank');
  };

  // Open default Email client (mailto:)
  const handleOpenMailto = () => {
    const subject = encodeURIComponent(`[NOTIFICAÇÃO DE JUSTIFICATIVAS] Médias de Consumo - Frota ${companyName} (${periodoLabel} - Sem. ${currentWeekInfo.weekNoStr})`);
    const body = encodeURIComponent(generateWhatsAppMessage().replace(/\*/g, ''));
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  };

  // Copy Rich HTML Table for Email
  const handleCopyHtmlForEmail = async () => {
    const dateStr = new Date().toLocaleDateString('pt-BR');
    const htmlTable = `
      <div style="font-family: Arial, sans-serif; color: #1e293b; max-width: 760px; padding: 16px; border: 1px solid #e2e8f0; border-radius: 12px; background: #ffffff;">
        <div style="background-color: #0f172a; color: #ffffff; padding: 16px; border-radius: 8px; margin-bottom: 16px;">
          <h2 style="margin: 0 0 6px 0; font-size: 18px; font-weight: bold;">Relatório Integrado de Justificativas de Consumo</h2>
          <p style="margin: 0; font-size: 12px; color: #94a3b8;">${companyName} • Competência: <strong>${periodoLabel.toUpperCase()}</strong> • Semana Atual: <strong>Semana ${currentWeekInfo.weekNoStr}/${currentWeekInfo.year}</strong> • Meta: <strong>${metaKml.toFixed(2)} km/L</strong></p>
        </div>
        
        <div style="background-color: #fef3c7; border-left: 4px solid #d97706; padding: 14px 16px; margin-bottom: 16px; font-size: 13px; line-height: 1.55; color: #78350f; border-radius: 6px;">
          <strong style="color: #92400e; display: block; margin-bottom: 6px; text-transform: uppercase; font-size: 11px; letter-spacing: 0.5px;">Diretrizes Operacionais e Regra de Recorrência:</strong>
          ${guidelineText.replace(/\n/g, '<br/>')}
        </div>

        ${recurrentCases.length > 0 ? `
          <div style="background-color: #fee2e2; border-left: 4px solid #dc2626; padding: 12px 16px; margin-bottom: 16px; border-radius: 6px;">
            <h4 style="margin: 0 0 6px 0; font-size: 13px; color: #991b1b; font-weight: bold;">🚨 SÍNTESE EXECUTIVA: PLANOS DE AÇÃO REQUERIDOS (${recurrentCases.length} VEÍCULOS COM 3 SEMANAS CONSECUTIVAS FORA DA META)</h4>
            <p style="margin: 0 0 8px 0; font-size: 12px; color: #7f1d1d;">Conforme diretriz corporativa, veículos/motoristas com 3 semanas consecutivas abaixo da meta exigem plano de melhorias formal:</p>
            <ul style="margin: 0; padding-left: 18px; font-size: 12px; color: #991b1b;">
              ${recurrentCases.map(rc => `
                <li style="margin-bottom: 4px;">
                  <strong>Frota ${rc.frota} (${rc.placa})</strong> ${rc.motorista ? '- ' + rc.motorista : ''}: Média Crítica de <strong>${rc.avgKmlConsecutive.toFixed(2)} km/L</strong> em <strong>${rc.consecutiveWeeksCount} semanas consecutivas</strong>.
                </li>
              `).join('')}
            </ul>
          </div>
        ` : ''}

        <h3 style="font-size: 14px; font-weight: bold; margin-bottom: 8px; color: #0f172a;">Quadro Resumo de Veículos Fora da Média Ideal (${sortedVehicles.length} veículos)</h3>
        
        <table style="width: 100%; border-collapse: collapse; font-size: 12px; text-align: left; margin-bottom: 16px;">
          <thead>
            <tr style="background-color: #0f172a; color: #ffffff;">
              <th style="padding: 8px 10px; border: 1px solid #334155;">Prefixo/Frota</th>
              <th style="padding: 8px 10px; border: 1px solid #334155;">Placa</th>
              <th style="padding: 8px 10px; border: 1px solid #334155;">Motorista</th>
              <th style="padding: 8px 10px; border: 1px solid #334155; text-align: right;">KM Lançado</th>
              <th style="padding: 8px 10px; border: 1px solid #334155; text-align: right;">Litragem</th>
              <th style="padding: 8px 10px; border: 1px solid #334155; text-align: right;">Média KM/L</th>
              <th style="padding: 8px 10px; border: 1px solid #334155; text-align: center;">Status Anomalia</th>
            </tr>
          </thead>
          <tbody>
            ${sortedVehicles.map((v, i) => `
              <tr style="background-color: ${i % 2 === 0 ? '#ffffff' : '#f8fafc'};">
                <td style="padding: 6px 10px; border: 1px solid #e2e8f0; font-weight: bold;">${v.frota || '-'}</td>
                <td style="padding: 6px 10px; border: 1px solid #e2e8f0;">${v.placa || '-'}</td>
                <td style="padding: 6px 10px; border: 1px solid #e2e8f0; font-weight: 500; color: #334155;">${v.motorista || 'NÃO IDENTIFICADO'}</td>
                <td style="padding: 6px 10px; border: 1px solid #e2e8f0; text-align: right;">${(v.kmProdutivo || v.km || 0).toLocaleString('pt-BR')} km</td>
                <td style="padding: 6px 10px; border: 1px solid #e2e8f0; text-align: right;">${(v.litros || 0).toLocaleString('pt-BR', { minimumFractionDigits: 1 })} L</td>
                <td style="padding: 6px 10px; border: 1px solid #e2e8f0; text-align: right; font-weight: bold; color: ${v.kml < metaKml ? '#dc2626' : '#16a34a'};">${(v.kml || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} km/L</td>
                <td style="padding: 6px 10px; border: 1px solid #e2e8f0; text-align: center; font-weight: bold; color: #dc2626;">Média Baixa (&lt;${metaKml.toFixed(2)})</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div style="font-size: 11px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 8px;">
          Gerado em: ${dateStr} • Sistema Integrado de Gestão e Auditoria de Frotas
        </div>
      </div>
    `;

    try {
      const blob = new Blob([htmlTable], { type: 'text/html' });
      const textBlob = new Blob([generateWhatsAppMessage().replace(/\*/g, '')], { type: 'text/plain' });
      const data = [new ClipboardItem({ 'text/html': blob, 'text/plain': textBlob })];
      await navigator.clipboard.write(data);
      setCopiedType('email');
      setTimeout(() => setCopiedType(null), 3000);
    } catch (e) {
      // Fallback
      await navigator.clipboard.writeText(htmlTable);
      setCopiedType('email');
      setTimeout(() => setCopiedType(null), 3000);
    }
  };

  // =========================================================================
  // EXPORTAR PDF - DESIGN EXECUTIVO COM CABEÇALHO MODERNO EM TODAS AS PÁGINAS
  // E PÁGINA DEDICADA À SÍNTESE EXECUTIVA DE PLANO DE AÇÃO PARA 3 SEMANAS
  // =========================================================================
  const handleExportPDF = async () => {
    const doc = new jsPDF({
      orientation: 'p',
      unit: 'mm',
      format: 'a4'
    });

    const dateStr = new Date().toLocaleString('pt-BR');
    let logoBase64 = '';

    try {
      if (reportLogo) {
        logoBase64 = await getBase64FromUrl(getFullUrl(reportLogo));
      }
    } catch (e) {
      console.error('Logo render error on justification PDF:', e);
    }

    // Helper: Draw modern top header on any page
    const drawModernTopHeader = (pageNumber: number, titleOverride?: string) => {
      // Header Background
      doc.setFillColor(15, 23, 42); // slate-900 / dark modern
      doc.rect(0, 0, 210, 36, 'F');

      // Emerald side marker
      doc.setFillColor(16, 185, 129); // emerald-500
      doc.rect(0, 0, 5, 36, 'F');

      // Logo
      let textOffsetLeft = 14;
      if (logoBase64) {
        try {
          doc.addImage(logoBase64, 'PNG', 12, 6, 24, 12);
          textOffsetLeft = 40;
        } catch (e) {
          textOffsetLeft = 14;
        }
      }

      // Title Section
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(255, 255, 255);
      doc.text(titleOverride || 'Relatório Integrado de Justificativas de Consumo', textOffsetLeft, 14);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text(`${companyName} • Gerado com IA em ${dateStr} • ERP: ${erpSystem}`, textOffsetLeft, 20);

      // Period & Target Badge
      const badgeWidth = 210 - textOffsetLeft - 12;
      doc.setFillColor(30, 41, 59); // slate-800
      doc.roundedRect(textOffsetLeft, 24, badgeWidth, 7.2, 1.5, 1.5, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.8);
      doc.setTextColor(203, 213, 225); // slate-300
      doc.text(`COMPETÊNCIA/PERÍODO: ${periodoLabel.toUpperCase()}`, textOffsetLeft + 3, 28.8);

      doc.setTextColor(56, 189, 248); // sky-400
      const weekPosX = textOffsetLeft + (badgeWidth > 165 ? 80 : 66);
      doc.text(`SEMANA ATUAL: SEM. ${currentWeekInfo.weekNoStr}/${currentWeekInfo.year}`, weekPosX, 28.8);

      doc.setTextColor(52, 211, 153); // emerald-400
      doc.text(`META OPERACIONAL: ${metaKml.toFixed(2)} KM/L`, textOffsetLeft + badgeWidth - 3, 28.8, { align: 'right' });
    };

    // ==========================================
    // PÁGINA 1: NOTIFICAÇÃO + DIRETRIZES + TABELA
    // ==========================================
    drawModernTopHeader(1);

    let currentY = 42;

    // Helper: Clean text from emojis / non-ascii multi-byte symbols for safe jsPDF Helvetica rendering
    const cleanTextForPdf = (str: string) => {
      if (!str) return '';
      return str
        .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F1E6}-\u{1F1FF}]/gu, '')
        .trim();
    };

    // 1. Box de Título das Diretrizes
    doc.setFillColor(254, 243, 199); // amber-100
    doc.roundedRect(12, currentY, 186, 7, 1.5, 1.5, 'F');
    doc.setFillColor(217, 119, 6); // amber-600
    doc.rect(12, currentY, 3.5, 7, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(146, 64, 14); // amber-900
    doc.text('DIRETRIZES OPERACIONAIS E REGRA DE RECORRÊNCIA (3 SEMANAS CONSECUTIVAS):', 18, currentY + 4.8);

    currentY += 9;

    // Process guideline text paragraph by paragraph with precise typography
    const textWidth = 176;
    const textStartX = 17;
    const rawParagraphs = guidelineText.split('\n').map(p => cleanTextForPdf(p)).filter(p => p.length > 0);

    // Calculate height required for all paragraphs
    doc.setFontSize(7.8);
    const lineHeightFactor = 3.6; // mm per line
    const paragraphGap = 2.2; // mm between paragraphs

    let calculatedContentHeight = 6; // top and bottom padding
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

    const boxHeight = Math.max(calculatedContentHeight, 48);

    // Render outer container box with subtle styling
    doc.setFillColor(255, 251, 235); // amber-50
    doc.setDrawColor(253, 230, 138); // amber-200
    doc.setLineWidth(0.3);
    doc.roundedRect(12, currentY, 186, boxHeight, 2, 2, 'FD');

    // Render each paragraph nicely inside the box
    let textCursorY = currentY + 5;
    measuredParagraphs.forEach(({ lines, isRecurrenceRule }) => {
      if (isRecurrenceRule) {
        // Highlight background strip for the 3-week corporate rule
        const ruleHeight = (lines.length * lineHeightFactor) + 2;
        doc.setFillColor(254, 226, 226); // red-100
        doc.setDrawColor(248, 113, 113); // red-400
        doc.roundedRect(14, textCursorY - 3, 182, ruleHeight, 1.2, 1.2, 'FD');
        doc.setFillColor(220, 38, 38); // red-600
        doc.rect(14, textCursorY - 3, 2.5, ruleHeight, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(153, 27, 27); // red-800
        doc.text(lines, textStartX + 1, textCursorY);
        textCursorY += (lines.length * lineHeightFactor) + paragraphGap + 2;
      } else {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(51, 65, 85); // slate-700
        doc.text(lines, textStartX, textCursorY);
        textCursorY += (lines.length * lineHeightFactor) + paragraphGap;
      }
    });

    currentY += boxHeight + 6;

    // 2. Quadro Resumo de Veículos Fora da Média Ideal (Dados embaixo)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(`Quadro Resumo de Veículos Fora da Média Ideal (${sortedVehicles.length} veículos listados)`, 12, currentY);

    currentY += 2.5;

    // Table of Outliers Summary
    const tableHeader = [
      ['Prefixo/Frota', 'Placa', 'Motorista', 'KM Lançado', 'Litragem', 'Média KM/L', 'Status Anomalia']
    ];

    const tableRows = sortedVehicles.map(v => {
      const typeStr = `Média Baixa (<${metaKml.toFixed(2)})`;
      const isAdj = v.isOverlapAdjusted;
      return [
        isAdj ? `${v.frota || '-'} (Ajustado)` : (v.frota || '-'),
        v.placa || '-',
        v.motorista ? cleanTextForPdf(v.motorista) : 'NÃO IDENTIFICADO',
        (v.kmProdutivo || v.km || 0).toLocaleString('pt-BR') + ' km',
        (v.litros || 0).toLocaleString('pt-BR', { minimumFractionDigits: 1 }) + ' L',
        (v.kml || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' km/L',
        typeStr
      ];
    });

    autoTable(doc, {
      head: tableHeader,
      body: tableRows,
      startY: currentY,
      margin: { left: 12, right: 12, top: 40, bottom: 20 },
      theme: 'striped',
      headStyles: { 
        fillColor: [15, 23, 42], 
        textColor: [255, 255, 255], 
        fontSize: 7.2, 
        fontStyle: 'bold',
        cellPadding: 2.2
      },
      styles: { fontSize: 7, cellPadding: 1.8 },
      columnStyles: {
        0: { fontStyle: 'bold' },
        2: { cellWidth: 38 },
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right', fontStyle: 'bold' },
        6: { halign: 'center', fontStyle: 'bold', textColor: [185, 28, 28] }
      },
      didDrawPage: (data) => {
        if (data.pageNumber > 1) {
          drawModernTopHeader(data.pageNumber);
        }
      }
    });

    currentY = (doc as any).lastAutoTable.finalY + 6;

    // Totals Box
    if (currentY > 260) {
      doc.addPage();
      drawModernTopHeader(doc.getNumberOfPages());
      currentY = 42;
    }

    doc.setFillColor(241, 245, 249);
    doc.roundedRect(12, currentY, 186, 12, 1.5, 1.5, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`TOTAIS DO GRUPO: ${summaryTotals.count} Veículos Notificados`, 16, currentY + 4.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(71, 85, 105);
    doc.text(`KM Total: ${summaryTotals.totalKm.toLocaleString('pt-BR')} km   |   Litragem Total: ${summaryTotals.totalLitros.toLocaleString('pt-BR', { minimumFractionDigits: 1 })} L   |   Média Ponderada: ${summaryTotals.avgKml.toFixed(2)} km/L`, 16, currentY + 9);

    // =========================================================================
    // PÁGINA EXCLUSIVA: SÍNTESE EXECUTIVA AUTOMATIZADA DA OPERAÇÃO (PLANO DE AÇÃO)
    // =========================================================================
    doc.addPage();
    drawModernTopHeader(doc.getNumberOfPages(), 'Síntese Executiva Automatizada da Operação');

    let execY = 42;

    // Alert Banner
    doc.setFillColor(254, 226, 226); // red-100
    doc.roundedRect(12, execY, 186, 15, 2, 2, 'F');
    doc.setFillColor(220, 38, 38); // red-600
    doc.rect(12, execY, 4, 15, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(153, 27, 27); // red-800
    doc.text('PLANO DE AÇÃO OBRIGATÓRIO: RECORRÊNCIA DE MÉDIA BAIXA (3 SEMANAS CONSECUTIVAS)', 18, execY + 5.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(127, 29, 29); // red-900
    doc.text(`O sistema identificou ${recurrentCases.length} caso(s) com persistência de média abaixo de ${metaKml.toFixed(2)} km/L por 3 semanas consecutivas. Diretriz de intervenção imediata:`, 18, execY + 11);

    execY += 20;

    // Table of Recurrent Cases
    if (recurrentCases.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text('1. Veículos e Condutores em Alerta Máximo (Histórico Semanal Consecutivo)', 12, execY);

      const recurrentHeader = [
        ['Prefixo/Frota', 'Placa', 'Condutor Responsável', 'Semanas Consecutivas', 'Média Crítica', 'Status Plano']
      ];

      const recurrentRows = recurrentCases.map(rc => {
        const weeksSummary = rc.weeksDetails.map(w => `${w.semanaLabel.split('/')[0]}: ${w.kml.toFixed(2)}`).join(' | ');
        return [
          rc.frota,
          rc.placa,
          rc.motorista || 'A Definir pela Supervisão',
          `${rc.consecutiveWeeksCount} semanas (${weeksSummary})`,
          `${rc.avgKmlConsecutive.toFixed(2)} km/L`,
          'Ação Requerida'
        ];
      });

      autoTable(doc, {
        head: recurrentHeader,
        body: recurrentRows,
        startY: execY + 2,
        margin: { left: 12, right: 12 },
        theme: 'grid',
        headStyles: { 
          fillColor: [185, 28, 28], // red-700
          textColor: [255, 255, 255], 
          fontSize: 7, 
          fontStyle: 'bold' 
        },
        styles: { fontSize: 7, cellPadding: 2 },
        columnStyles: {
          0: { fontStyle: 'bold' },
          3: { fontSize: 6.5 },
          4: { halign: 'right', fontStyle: 'bold', textColor: [185, 28, 28] },
          5: { halign: 'center', fontStyle: 'bold', textColor: [185, 28, 28] }
        }
      });

      execY = (doc as any).lastAutoTable.finalY + 8;
    }

    // 4 Pilares do Plano de Ação Estruturado
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(15, 23, 42);
    doc.text('2. Matriz de Intervenção e Ações Operacionais Obrigatórias', 12, execY);

    execY += 4;

    const actionMatrixHeader = [
      ['Pilar / Área', 'Ação Obrigatória a ser Realizada', 'Responsável', 'Prazo Máximo']
    ];

    const actionMatrixRows = [
      [
        'OFICINA & MECÂNICA',
        'Auditoria e Diagnóstico Completo: Teste de opacidade, bicos injetores, filtros de ar/combustível e pressão de pneus.',
        'Chefe de Oficina / Manutenção',
        '48 horas'
      ],
      [
        'TELEMETRIA & CCO',
        'Auditoria de Condução: Relatório de rotação fora da faixa verde, tempo em marcha lenta excessiva (ralenti) e freadas bruscas.',
        'Analista de Telemetria / CCO',
        '24 horas'
      ],
      [
        'INSTRUTORIA & TREINAMENTO',
        'Reciclagem Prática em Rota: Acompanhamento presencial de rota com instrutor de tráfego e reaplicação de direção econômica.',
        'Instrutor Técnico de Tráfego',
        '5 dias úteis'
      ],
      [
        'SUPERVISÃO & CONTROLE',
        'Auditoria de Folhas KM: Validação da entrega tempestiva de 100% dos lançamentos e conferência física de hodômetros.',
        'Supervisor Operacional de Linha',
        'Imediato'
      ]
    ];

    autoTable(doc, {
      head: actionMatrixHeader,
      body: actionMatrixRows,
      startY: execY,
      margin: { left: 12, right: 12 },
      theme: 'grid',
      headStyles: { 
        fillColor: [30, 41, 59], 
        textColor: [255, 255, 255], 
        fontSize: 7, 
        fontStyle: 'bold' 
      },
      styles: { fontSize: 7, cellPadding: 2.5 },
      columnStyles: {
        0: { fontStyle: 'bold', textColor: [30, 41, 59], cellWidth: 40 },
        1: { cellWidth: 90 },
        2: { cellWidth: 34 },
        3: { halign: 'center', fontStyle: 'bold', cellWidth: 22 }
      }
    });

    execY = (doc as any).lastAutoTable.finalY + 12;

    // Formal Signature Box
    if (execY > 240) {
      doc.addPage();
      drawModernTopHeader(doc.getNumberOfPages(), 'Formalização e Aprovação Executiva');
      execY = 45;
    }

    doc.setDrawColor(203, 213, 225); // slate-300
    doc.line(16, execY + 12, 65, execY + 12);
    doc.line(80, execY + 12, 130, execY + 12);
    doc.line(145, execY + 12, 195, execY + 12);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(71, 85, 105);
    doc.text('SUPERVISOR OPERACIONAL', 40.5, execY + 16, { align: 'center' });
    doc.text('GESTOR DE MANUTENÇÃO', 105, execY + 16, { align: 'center' });
    doc.text('DIRETORIA EXECUTIVA', 170, execY + 16, { align: 'center' });

    // Footer on all pages
    const pageCount = (doc as any).internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(6.8);
      doc.setTextColor(148, 163, 184);
      doc.text(`Relatório Integrado de Consumo & Diretrizes - ${companyName} - Página ${i} de ${pageCount}`, 14, 290);
      doc.text(`Emissão com IA: ${dateStr} • ERP: ${erpSystem}`, 196, 290, { align: 'right' });
    }

    doc.save(`Relatorio_Justificativas_Consumo_${periodoLabel.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-5xl max-h-[94vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        id="modal-email-whatsapp-report"
      >
        {/* Modal Top Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-2xl border border-emerald-500/30">
              <Mail size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-black tracking-tight text-white">
                  Relatório para E-mail & WhatsApp
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/30 text-emerald-300 border border-emerald-400/30">
                  Comunicação Direta
                </span>
                {recurrentCases.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-500 text-white animate-pulse flex items-center gap-1">
                    <AlertTriangle size={11} /> {recurrentCases.length} com 3 Semanas Fora
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Diretrizes corporativas, gestão de justificativas e planos de ação para médias fora da meta
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
            title="Fechar modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Navigation: Notificação / Síntese Executiva */}
        <div className="bg-slate-900/95 px-6 py-2 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('notificacao')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === 'notificacao'
                  ? 'bg-white text-slate-950 shadow-md font-black'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <FileText size={15} />
              <span>Relatório & Diretrizes (Padrão)</span>
            </button>

            <button
              onClick={() => setActiveTab('sintese_executiva')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer relative ${
                activeTab === 'sintese_executiva'
                  ? 'bg-rose-600 text-white shadow-md font-black shadow-rose-900/40'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <ShieldAlert size={15} className={recurrentCases.length > 0 ? 'text-rose-400' : ''} />
              <span>Síntese Executiva Automatizada da Operação</span>
              {recurrentCases.length > 0 && (
                <span className="px-1.5 py-0.2 bg-rose-500 text-white rounded-full text-[9px] font-black">
                  {recurrentCases.length}
                </span>
              )}
            </button>
          </div>

          <div className="text-[11px] text-slate-400 hidden md:flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Calendar size={13} className="text-emerald-400" />
              <span>Período: <strong className="text-white">{periodoLabel}</strong></span>
            </div>
            <span className="text-slate-600">•</span>
            <div className="flex items-center gap-1.5">
              <Clock size={13} className="text-sky-400" />
              <span>Semana Atual: <strong className="text-sky-300">Sem. {currentWeekInfo.weekNoStr} ({currentWeekInfo.year})</strong></span>
            </div>
          </div>
        </div>

        {/* Modal Body with Scroll */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar bg-slate-50/60">
          
          {/* TAB 1: RELATÓRIO PADRÃO COM DIRETRIZES E TABELA */}
          {activeTab === 'notificacao' && (
            <>
              {/* Quick Settings & Controls Bar */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  {/* Scope Selector: Todos / Por Placa / Por Motorista */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      Filtrar por:
                    </span>
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                      <button
                        type="button"
                        onClick={() => {
                          setFilterScope('all');
                          setSelectedPlaca('ALL');
                          setSelectedDriver('ALL');
                        }}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                          filterScope === 'all'
                            ? 'bg-slate-900 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                        }`}
                      >
                        <Layers size={13} />
                        <span>Todos ({baseVehicles.length})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setFilterScope('placa');
                          if (selectedPlaca === 'ALL' && uniquePlatesList.length > 0) {
                            setSelectedPlaca('ALL');
                          }
                        }}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                          filterScope === 'placa'
                            ? 'bg-sky-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                        }`}
                      >
                        <Truck size={13} />
                        <span>Por Placa ({uniquePlatesList.length})</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setFilterScope('motorista');
                          if (selectedDriver === 'ALL' && uniqueDriversList.length > 0) {
                            setSelectedDriver('ALL');
                          }
                        }}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center gap-1.5 cursor-pointer ${
                          filterScope === 'motorista'
                            ? 'bg-indigo-600 text-white shadow-xs'
                            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                        }`}
                      >
                        <Users size={13} />
                        <span>Por Motorista ({uniqueDriversList.length})</span>
                      </button>
                    </div>
                  </div>

                  {/* Filter Mode & Meta Controls */}
                  <div className="flex items-center gap-3 flex-wrap">
                    {/* Meta Input */}
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Meta KM/L:
                      </span>
                      <div className="flex items-center gap-1.5 bg-slate-100 px-3 py-1.5 rounded-xl border border-slate-200">
                        <Sliders size={14} className="text-emerald-600" />
                        <input
                          type="number"
                          step="0.05"
                          min="1.0"
                          max="10.0"
                          value={metaKml}
                          onChange={(e) => setMetaKml(Number(e.target.value) || 3.0)}
                          className="w-14 bg-transparent text-xs font-black text-slate-900 outline-none text-right"
                        />
                        <span className="text-[11px] font-bold text-slate-500">km/l</span>
                      </div>
                    </div>

                    {/* Filter Mode Toggle */}
                    <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
                      <button
                        type="button"
                        onClick={() => setFilterMode('below_only')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                          filterMode === 'below_only'
                            ? 'bg-white text-rose-700 shadow-xs'
                            : 'text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        Apenas Abaixo ({metaKml.toFixed(2)})
                      </button>
                      <button
                        type="button"
                        onClick={() => setFilterMode('all')}
                        className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
                          filterMode === 'all'
                            ? 'bg-white text-indigo-700 shadow-xs'
                            : 'text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        Todos ({baseVehicles.length})
                      </button>
                    </div>
                  </div>
                </div>

                {/* Second Row: Specific Plate or Driver Dropdown Selectors + Search */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-3 flex-1 flex-wrap">
                    {/* Placa Selector Dropdown when filterScope === 'placa' */}
                    {filterScope === 'placa' && (
                      <div className="flex items-center gap-2 flex-1 min-w-[280px]">
                        <span className="text-xs font-bold text-sky-800 flex items-center gap-1.5 whitespace-nowrap">
                          <Truck size={14} className="text-sky-600" />
                          Selecionar Placa/Frota:
                        </span>
                        <select
                          value={selectedPlaca}
                          onChange={(e) => setSelectedPlaca(e.target.value)}
                          className="flex-1 bg-sky-50 border border-sky-300 text-sky-950 font-bold text-xs rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
                        >
                          <option value="ALL">-- Todas as Placas ({uniquePlatesList.length}) --</option>
                          {uniquePlatesList.map((p) => (
                            <option key={p.key} value={p.placa || p.frota}>
                              {p.frota ? `Frota ${p.frota}` : ''} {p.placa ? `[${p.placa}]` : ''} {p.motorista ? `- ${p.motorista}` : ''} ({p.kml.toFixed(2)} km/L) {p.isBelow ? '⚠️' : '✅'}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Motorista Selector Dropdown when filterScope === 'motorista' */}
                    {filterScope === 'motorista' && (
                      <div className="flex items-center gap-2 flex-1 min-w-[280px]">
                        <span className="text-xs font-bold text-indigo-800 flex items-center gap-1.5 whitespace-nowrap">
                          <User size={14} className="text-indigo-600" />
                          Selecionar Motorista:
                        </span>
                        <select
                          value={selectedDriver}
                          onChange={(e) => setSelectedDriver(e.target.value)}
                          className="flex-1 bg-indigo-50 border border-indigo-300 text-indigo-950 font-bold text-xs rounded-xl px-3 py-2 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                        >
                          <option value="ALL">-- Todos os Motoristas ({uniqueDriversList.length}) --</option>
                          {uniqueDriversList.map((d) => (
                            <option key={d.name} value={d.name}>
                              {d.name} ({d.count} {d.count === 1 ? 'veículo' : 'veículos'} • {d.avgKml.toFixed(2)} km/L)
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Search Field */}
                    <div className="relative flex-1 min-w-[220px]">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Buscar por placa, motorista ou frota..."
                        className="w-full pl-9 pr-8 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                      />
                      {searchTerm && (
                        <button
                          type="button"
                          onClick={() => setSearchTerm('')}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                        >
                          <X size={13} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Badges Summary */}
                  <div className="flex items-center gap-2">
                    <div className="px-3 py-1.5 bg-rose-50 border border-rose-200 rounded-xl text-xs flex items-center gap-1.5">
                      <AlertTriangle size={13} className="text-rose-600" />
                      <span className="font-bold text-rose-900">
                        {sortedVehicles.length} listado{sortedVehicles.length !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div className="px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs flex items-center gap-1.5">
                      <Fuel size={13} className="text-emerald-600" />
                      <span className="font-bold text-emerald-900">
                        Média: {summaryTotals.avgKml.toFixed(2)} km/l
                      </span>
                    </div>
                  </div>
                </div>

                {/* Active Filter Notification Banner */}
                {(filterScope !== 'all' || selectedPlaca !== 'ALL' || selectedDriver !== 'ALL' || searchTerm.trim() !== '') && (
                  <div className="bg-slate-100/90 rounded-xl p-2.5 px-3 border border-slate-200 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-600">Filtro Ativo:</span>
                      {filterScope === 'placa' && (
                        <span className="px-2 py-0.5 bg-sky-100 text-sky-800 border border-sky-200 rounded-md font-bold text-[11px]">
                          Placa: {selectedPlaca === 'ALL' ? 'Todas as Placas' : selectedPlaca}
                        </span>
                      )}
                      {filterScope === 'motorista' && (
                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-md font-bold text-[11px]">
                          Motorista: {selectedDriver === 'ALL' ? 'Todos os Motoristas' : selectedDriver}
                        </span>
                      )}
                      {searchTerm.trim() !== '' && (
                        <span className="px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-200 rounded-md font-bold text-[11px]">
                          Busca: "{searchTerm}"
                        </span>
                      )}
                      <span className="text-slate-500 font-medium">
                        ({sortedVehicles.length} veículo{sortedVehicles.length !== 1 ? 's' : ''} encontrado{sortedVehicles.length !== 1 ? 's' : ''})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setFilterScope('all');
                        setSelectedPlaca('ALL');
                        setSelectedDriver('ALL');
                        setSearchTerm('');
                      }}
                      className="px-2 py-1 bg-white hover:bg-slate-200 text-slate-700 font-bold rounded-lg border border-slate-300 transition-all flex items-center gap-1 cursor-pointer text-[11px]"
                    >
                      <RotateCcw size={12} />
                      <span>Limpar Filtros</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Section: Diretrizes e Motivo para Justificativa (Editable) */}
              <div className="bg-amber-50/70 border border-amber-200 rounded-2xl p-5 shadow-xs">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 bg-amber-500 text-white rounded-lg">
                      <MessageSquare size={16} />
                    </div>
                    <div>
                      <h4 className="text-xs font-black text-amber-950 uppercase tracking-wider">
                        Diretrizes e Notificação para Supervisores (Personalizável)
                      </h4>
                      <p className="text-[10px] text-amber-700 font-medium">
                        Texto oficial e educado que acompanhará o relatório no E-mail, WhatsApp e PDF
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setIsEditingGuideline(!isEditingGuideline)}
                      className="px-2.5 py-1 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Edit3 size={13} />
                      <span>{isEditingGuideline ? 'Concluir Edição' : 'Editar Texto'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleResetGuideline}
                      className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-600 border border-amber-200 rounded-lg text-xs font-bold transition-all cursor-pointer"
                      title="Restaurar texto padrão corporativo"
                    >
                      Restaurar Padrão
                    </button>
                  </div>
                </div>

                {isEditingGuideline ? (
                  <textarea
                    rows={7}
                    value={guidelineText}
                    onChange={(e) => handleSaveGuideline(e.target.value)}
                    className="w-full p-3.5 bg-white border border-amber-300 rounded-xl text-xs leading-relaxed text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500 font-sans shadow-inner"
                    placeholder="Insira as diretrizes para os supervisores..."
                  />
                ) : (
                  <div className="p-3.5 bg-white/95 rounded-xl border border-amber-200 text-xs text-slate-800 font-medium whitespace-pre-line leading-relaxed shadow-2xs">
                    {guidelineText}
                  </div>
                )}
              </div>

              {/* Alerta de Recorrência se houver */}
              {recurrentCases.length > 0 && (
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-rose-600 text-white rounded-xl">
                      <AlertTriangle size={18} />
                    </div>
                    <div>
                      <h5 className="text-xs font-black text-rose-950 uppercase tracking-wider">
                        {recurrentCases.length} Veículo(s) com Recorrência Crítica (3 Semanas Consecutivas Fora da Meta)
                      </h5>
                      <p className="text-[11px] text-rose-700">
                        O sistema detectou placas com médias abaixo de {metaKml.toFixed(2)} km/L por 3 semanas consecutivas. Abertura de plano de ação recomendada.
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => setActiveTab('sintese_executiva')}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 shadow-sm"
                  >
                    <span>Ver Síntese Executiva</span>
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}

              {/* Visual Preview Box matching the Image */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                {/* Header Preview */}
                <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    {reportLogo ? (
                      <img
                        src={getFullUrl(reportLogo)}
                        alt="Logo"
                        className="h-10 w-auto object-contain"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="p-2.5 bg-slate-900 text-white rounded-xl">
                        <Building2 size={20} />
                      </div>
                    )}
                    <div>
                      <h4 className="text-base font-black text-slate-900">
                        Relatório Integrado de Justificativas de Consumo
                      </h4>
                      <p className="text-[11px] text-slate-500 font-medium">
                        {companyName} • Gerado com IA • ERP: {erpSystem}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2.5 flex-wrap">
                    <div className="px-3.5 py-1.5 bg-slate-100 rounded-xl border border-slate-200/80 flex items-center gap-2">
                      <Calendar size={14} className="text-slate-500" />
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Competência:
                      </span>
                      <span className="text-xs font-black text-slate-900">
                        {periodoLabel.toUpperCase()}
                      </span>
                    </div>

                    <div className="px-3.5 py-1.5 bg-sky-50 rounded-xl border border-sky-200/80 flex items-center gap-2">
                      <Clock size={14} className="text-sky-600" />
                      <span className="text-[10px] font-bold text-sky-700 uppercase tracking-wider">
                        Semana Atual:
                      </span>
                      <span className="text-xs font-black text-sky-950">
                        Semana {currentWeekInfo.weekNoStr} ({currentWeekInfo.year})
                      </span>
                    </div>
                  </div>
                </div>

                {/* Sub-heading Table Title & Sorting Selector */}
                <div className="px-6 py-3 bg-slate-100/70 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={14} className="text-rose-500 shrink-0" />
                    <h5 className="text-xs font-black text-slate-800 uppercase tracking-wider">
                      Quadro Resumo de Veículos ({sortedVehicles.length} registros)
                    </h5>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1">
                      <ArrowUpDown size={12} className="text-indigo-600" />
                      Classificar:
                    </span>
                    <select
                      value={`${sortField}_${sortDirection}`}
                      onChange={(e) => {
                        const [field, dir] = e.target.value.split('_') as ['frota' | 'placa' | 'motorista' | 'km' | 'litros' | 'kml', 'asc' | 'desc'];
                        setSortField(field);
                        setSortDirection(dir);
                      }}
                      className="bg-white border border-slate-300 hover:border-slate-400 text-slate-900 text-xs font-bold rounded-lg px-2.5 py-1 outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-2xs"
                    >
                      <option value="kml_asc">⚡ Média KM/L: Menor primeiro (Crítico)</option>
                      <option value="kml_desc">⚡ Média KM/L: Maior primeiro</option>
                      <option value="frota_asc">🚚 Frota/Prefixo: Crescente (0-9 / A-Z)</option>
                      <option value="frota_desc">🚚 Frota/Prefixo: Decrescente (9-0 / Z-A)</option>
                      <option value="placa_asc">🏷️ Placa: A-Z</option>
                      <option value="placa_desc">🏷️ Placa: Z-A</option>
                      <option value="motorista_asc">👤 Condutor / Motorista: A-Z</option>
                      <option value="motorista_desc">👤 Condutor / Motorista: Z-A</option>
                      <option value="km_desc">📈 KM: Maior primeiro</option>
                      <option value="km_asc">📈 KM: Menor primeiro</option>
                      <option value="litros_desc">⛽ Litros: Maior primeiro</option>
                      <option value="litros_asc">⛽ Litros: Menor primeiro</option>
                    </select>
                  </div>
                </div>

                {/* Table Area */}
                <div className="overflow-x-auto max-h-[380px] overflow-y-auto custom-scrollbar">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-950 text-white text-[11px] font-black uppercase tracking-wider sticky top-0 z-20 select-none">
                      <tr>
                        <th 
                          onClick={() => handleSort('frota')}
                          className="py-3 px-4 cursor-pointer hover:bg-slate-800 transition-colors group"
                          title="Clique para ordenar por Prefixo / Frota"
                        >
                          <div className="flex items-center gap-1">
                            <span>Prefixo/Frota</span>
                            {sortField === 'frota' ? (
                              sortDirection === 'asc' ? <ArrowUp size={13} className="text-cyan-400" /> : <ArrowDown size={13} className="text-cyan-400" />
                            ) : (
                              <ArrowUpDown size={12} className="opacity-30 group-hover:opacity-100" />
                            )}
                          </div>
                        </th>
                        <th 
                          onClick={() => handleSort('placa')}
                          className="py-3 px-4 cursor-pointer hover:bg-slate-800 transition-colors group"
                          title="Clique para ordenar por Placa"
                        >
                          <div className="flex items-center gap-1">
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
                          className="py-3 px-4 cursor-pointer hover:bg-slate-800 transition-colors group"
                          title="Clique para ordenar por Motorista"
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
                          onClick={() => handleSort('km')}
                          className="py-3 px-4 text-right cursor-pointer hover:bg-slate-800 transition-colors group"
                          title="Clique para ordenar por KM"
                        >
                          <div className="flex items-center justify-end gap-1">
                            <span>KM Lançado</span>
                            {sortField === 'km' ? (
                              sortDirection === 'asc' ? <ArrowUp size={13} className="text-cyan-400" /> : <ArrowDown size={13} className="text-cyan-400" />
                            ) : (
                              <ArrowUpDown size={12} className="opacity-30 group-hover:opacity-100" />
                            )}
                          </div>
                        </th>
                        <th 
                          onClick={() => handleSort('litros')}
                          className="py-3 px-4 text-right cursor-pointer hover:bg-slate-800 transition-colors group"
                          title="Clique para ordenar por Litragem"
                        >
                          <div className="flex items-center justify-end gap-1">
                            <span>Litragem</span>
                            {sortField === 'litros' ? (
                              sortDirection === 'asc' ? <ArrowUp size={13} className="text-cyan-400" /> : <ArrowDown size={13} className="text-cyan-400" />
                            ) : (
                              <ArrowUpDown size={12} className="opacity-30 group-hover:opacity-100" />
                            )}
                          </div>
                        </th>
                        <th 
                          onClick={() => handleSort('kml')}
                          className="py-3 px-4 text-right cursor-pointer hover:bg-slate-800 transition-colors group bg-slate-900"
                          title="Clique para ordenar por Média KM/L"
                        >
                          <div className="flex items-center justify-end gap-1">
                            <span>Média KM/L</span>
                            {sortField === 'kml' ? (
                              sortDirection === 'asc' ? <ArrowUp size={13} className="text-rose-400" /> : <ArrowDown size={13} className="text-rose-400" />
                            ) : (
                              <ArrowUpDown size={12} className="opacity-30 group-hover:opacity-100" />
                            )}
                          </div>
                        </th>
                        <th className="py-3 px-4 text-center">Status Anomalia</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {sortedVehicles.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-12 text-center text-slate-400 font-medium">
                            <CheckCircle2 size={36} className="mx-auto text-emerald-500 mb-2.5 opacity-90" />
                            <p className="text-sm font-bold text-slate-700">Nenhum registro encontrado</p>
                            <p className="text-xs text-slate-400 mt-1">
                              Nenhum veículo corresponde aos filtros ativos (Meta: {metaKml.toFixed(2)} km/l).
                            </p>
                            {(filterScope !== 'all' || selectedPlaca !== 'ALL' || selectedDriver !== 'ALL' || searchTerm) && (
                              <button
                                type="button"
                                onClick={() => {
                                  setFilterScope('all');
                                  setSelectedPlaca('ALL');
                                  setSelectedDriver('ALL');
                                  setSearchTerm('');
                                }}
                                className="mt-3 px-3 py-1.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all inline-flex items-center gap-1.5 cursor-pointer"
                              >
                                <RotateCcw size={13} />
                                <span>Ver Todos os Veículos</span>
                              </button>
                            )}
                          </td>
                        </tr>
                      ) : (
                        sortedVehicles.map((v, idx) => {
                          const isBelow = (v.kml || 0) < metaKml;
                          const isAdj = v.isOverlapAdjusted;
                          return (
                            <tr
                              key={(v.placa || v.frota || '') + idx}
                              className={`hover:bg-slate-50/80 transition-colors ${
                                idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'
                              }`}
                            >
                              <td className="py-2.5 px-4 font-black text-slate-900">
                                <div className="flex items-center gap-1.5">
                                  <span>{v.frota || '-'}</span>
                                  {isAdj && (
                                    <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 rounded text-[9px] font-bold">
                                      Ajustado
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="py-2.5 px-4 font-bold text-slate-700">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (v.placa) {
                                      setFilterScope('placa');
                                      setSelectedPlaca(v.placa);
                                    }
                                  }}
                                  title="Filtrar por esta placa"
                                  className="text-sky-700 hover:text-sky-900 font-bold hover:underline cursor-pointer flex items-center gap-1"
                                >
                                  <span>{v.placa || '-'}</span>
                                </button>
                              </td>
                              <td className="py-2.5 px-4 font-medium text-slate-700 max-w-[180px] truncate">
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (v.motorista && v.motorista !== 'NÃO IDENTIFICADO') {
                                      setFilterScope('motorista');
                                      setSelectedDriver(v.motorista);
                                    }
                                  }}
                                  title={v.motorista ? `Filtrar por ${v.motorista}` : undefined}
                                  className={`text-left text-xs truncate max-w-full block ${
                                    v.motorista && v.motorista !== 'NÃO IDENTIFICADO'
                                      ? 'text-indigo-700 hover:text-indigo-900 font-bold hover:underline cursor-pointer'
                                      : 'text-slate-400 italic'
                                  }`}
                                >
                                  {v.motorista || 'NÃO IDENTIFICADO'}
                                </button>
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono text-slate-700">
                                {(v.kmProdutivo || v.km || 0).toLocaleString('pt-BR')} km
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono text-slate-700">
                                {(v.litros || 0).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} L
                              </td>
                              <td className="py-2.5 px-4 text-right font-mono font-black text-sm">
                                <span className={isBelow ? 'text-rose-600' : 'text-emerald-600'}>
                                  {(v.kml || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} km/l
                                </span>
                              </td>
                              <td className="py-2.5 px-4 text-center">
                                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black border ${
                                  isBelow
                                    ? 'bg-rose-50 text-rose-700 border-rose-200'
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                }`}>
                                  {isBelow ? `Média Baixa (<${metaKml.toFixed(2)})` : 'Na Meta'}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                    {sortedVehicles.length > 0 && (
                      <tfoot className="bg-slate-900 text-white font-black text-xs sticky bottom-0 z-10">
                        <tr>
                          <td className="py-3 px-4" colSpan={3}>
                            TOTAIS DO GRUPO ({sortedVehicles.length} veículos)
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-emerald-300">
                            {summaryTotals.totalKm.toLocaleString('pt-BR')} km
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-amber-300">
                            {summaryTotals.totalLitros.toLocaleString('pt-BR', { minimumFractionDigits: 1 })} L
                          </td>
                          <td className="py-3 px-4 text-right font-mono text-sm text-indigo-300">
                            {summaryTotals.avgKml.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} km/l
                          </td>
                          <td className="py-3 px-4 text-center text-slate-400 text-[10px] uppercase">
                            Consolidado
                          </td>
                        </tr>
                      </tfoot>
                    )}
                  </table>
                </div>
              </div>
            </>
          )}

          {/* TAB 2: SÍNTESE EXECUTIVA AUTOMATIZADA DA OPERAÇÃO (CARD DE TELA INTEIRA) */}
          {activeTab === 'sintese_executiva' && (
            <div className="space-y-6 animate-in fade-in duration-200">
              {/* Executive Header Banner */}
              <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-rose-950 text-white p-6 rounded-3xl shadow-xl border border-rose-900/30">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex items-start gap-4">
                    <div className="p-3 bg-rose-600 text-white rounded-2xl shadow-lg shadow-rose-700/30">
                      <ShieldAlert size={26} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-xl font-black tracking-tight text-white">
                          Síntese Executiva Automatizada da Operação
                        </h4>
                        <span className="px-2.5 py-0.5 bg-rose-500/30 text-rose-300 border border-rose-400/40 rounded-full text-xs font-black">
                          Diretriz de 3 Semanas Consecutivas
                        </span>
                        <span className="px-2.5 py-0.5 bg-sky-500/30 text-sky-300 border border-sky-400/40 rounded-full text-xs font-black flex items-center gap-1">
                          <Clock size={12} />
                          Semana Atual: {currentWeekInfo.weekNoStr}/{currentWeekInfo.year}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                        Módulo gerencial e executivo de intervenção obrigatória para veículos e condutores com persistência de consumo abaixo de <strong>{metaKml.toFixed(2)} km/L</strong> por 3 semanas consecutivas.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="px-4 py-2 bg-slate-800/80 rounded-2xl border border-slate-700 text-right">
                      <span className="block text-[10px] font-bold text-slate-400 uppercase">Casos Identificados</span>
                      <span className="text-lg font-black text-rose-400">{recurrentCases.length} Unidades</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Casos Críticos de Recorrência */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                    <h5 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                      Veículos & Motoristas com Recorrência Crítica (3 Semanas Consecutivas)
                    </h5>
                  </div>
                  <span className="text-xs font-bold text-slate-500">
                    Meta: {metaKml.toFixed(2)} km/l
                  </span>
                </div>

                {recurrentCases.length === 0 ? (
                  <div className="py-12 text-center text-slate-500">
                    <CheckCircle2 size={40} className="mx-auto text-emerald-500 mb-2" />
                    <p className="font-bold text-slate-800">Nenhuma anomalia de 3 semanas consecutivas detectada!</p>
                    <p className="text-xs text-slate-500 mt-1">Todos os veículos mantêm conformidade com as metas ou não apresentam recorrência contínua.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {recurrentCases.map((rc, idx) => (
                      <div 
                        key={rc.id + idx}
                        className="p-4 rounded-2xl border border-rose-200 bg-rose-50/40 hover:bg-rose-50/70 transition-all space-y-3 shadow-xs"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="p-1.5 bg-rose-600 text-white rounded-lg font-mono font-black text-xs">
                              Frota {rc.frota}
                            </span>
                            <span className="font-black text-slate-900 text-sm">
                              {rc.placa}
                            </span>
                          </div>
                          <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded-full text-[10px] font-black border border-rose-300">
                            {rc.consecutiveWeeksCount} Semanas Consecutivas
                          </span>
                        </div>

                        {rc.driverRegimeLabel ? (
                          <div className="flex items-center gap-1.5 text-xs text-slate-700">
                            {rc.driverRegime === 'dupla' || rc.driverRegime === 'multiplo' ? (
                              <Users size={14} className="text-indigo-600 shrink-0" />
                            ) : (
                              <UserCheck size={14} className="text-rose-600 shrink-0" />
                            )}
                            <span className="font-medium text-slate-800">{rc.driverRegimeLabel}</span>
                          </div>
                        ) : rc.motorista ? (
                          <div className="flex items-center gap-1.5 text-xs text-slate-700">
                            <UserCheck size={14} className="text-rose-600 shrink-0" />
                            <span>Condutor: <strong>{rc.motorista}</strong></span>
                          </div>
                        ) : null}

                        {rc.totalActiveDays > 0 && (
                          <div className="text-[11px] text-slate-500 flex items-center justify-between bg-slate-100/70 px-2 py-1 rounded-lg">
                            <span>Operação: <strong>{rc.totalActiveDays} dias ativos</strong></span>
                            <span>Média: <strong>{rc.avgKmPerActiveDay} km/dia</strong></span>
                          </div>
                        )}

                        {/* Weekly Timeline Breakdown (e.g. 36 - 35 - 34) */}
                        <div className="bg-white p-2.5 rounded-xl border border-rose-100 space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider block">
                              Evolução ({rc.weeksDetails.map(w => w.semanaLabel.split('/')[0]).join(' - ')}):
                            </span>
                            <span className="text-[9px] font-bold text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">
                              3 semanas consecutivas &lt; meta
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-center">
                            {rc.weeksDetails.map((w, wIdx) => (
                              <div key={w.semana + wIdx} className="bg-slate-50 p-1.5 rounded-lg border border-slate-200/60 relative">
                                {wIdx === 0 && (
                                  <span className="absolute top-0.5 right-1 text-[8px] font-black text-cyan-700 bg-cyan-100/80 px-1 rounded">
                                    Recente
                                  </span>
                                )}
                                <span className="block text-[9px] font-bold text-slate-600">{w.semanaLabel}</span>
                                <span className="block text-xs font-black text-rose-600">
                                  {w.kml.toFixed(2)} km/l
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-xs pt-1 border-t border-rose-100">
                          <span className="text-slate-500 font-medium">Média do Período Crítico:</span>
                          <span className="font-black text-rose-700 text-sm">{rc.avgKmlConsecutive.toFixed(2)} km/l</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Matriz Estruturada de Plano de Ação (4 Frentes de Trabalho) */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-5">
                <div className="flex items-center gap-2.5 border-b border-slate-100 pb-3">
                  <div className="p-2 bg-indigo-600 text-white rounded-xl">
                    <ClipboardList size={18} />
                  </div>
                  <div>
                    <h5 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                      Matriz Estruturada de Intervenção (Plano de Ação 4 Frentes)
                    </h5>
                    <p className="text-xs text-slate-500">
                      Diretrizes padronizadas para reversão de consumo fora da meta
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Frente 1: Oficina */}
                  <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-blue-600 text-white rounded-lg">
                        <Wrench size={16} />
                      </div>
                      <h6 className="text-xs font-black text-slate-900 uppercase">
                        1. Diagnóstico Mecânico & Injeção
                      </h6>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Auditoria técnica do sistema de injeção eletrônica, bicos injetores, filtros de combustível/ar, calibragem de pneus e sistema de arrefecimento.
                    </p>
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 pt-1">
                      <span>Responsável: Chefe de Oficina</span>
                      <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded">Prazo: 48h</span>
                    </div>
                  </div>

                  {/* Frente 2: Telemetria */}
                  <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-purple-600 text-white rounded-lg">
                        <Gauge size={16} />
                      </div>
                      <h6 className="text-xs font-black text-slate-900 uppercase">
                        2. Auditoria de Telemetria (CCO)
                      </h6>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Extração dos registros de RPM fora da faixa verde (econômica), tempo excessivo de motor ligado parado (ralenti) e frenagens bruscas.
                    </p>
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 pt-1">
                      <span>Responsável: Gestão de CCO</span>
                      <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded">Prazo: 24h</span>
                    </div>
                  </div>

                  {/* Frente 3: Treinamento */}
                  <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-emerald-600 text-white rounded-lg">
                        <GraduationCap size={16} />
                      </div>
                      <h6 className="text-xs font-black text-slate-900 uppercase">
                        3. Reciclagem Prática com Instrutor
                      </h6>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Escalação de instrutor de tráfego para acompanhamento prático em rota com o condutor, orientando direção defensiva e econômica.
                    </p>
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 pt-1">
                      <span>Responsável: Instrutoria Técnica</span>
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded">Prazo: 5 dias úteis</span>
                    </div>
                  </div>

                  {/* Frente 4: Documentação */}
                  <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className="p-1.5 bg-amber-600 text-white rounded-lg">
                        <FileText size={16} />
                      </div>
                      <h6 className="text-xs font-black text-slate-900 uppercase">
                        4. Validação de Folhas KM & Lançamentos
                      </h6>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      Conferência de 100% das Folhas KM, validação de hodômetros inicial/final e alinhamento com a equipe de controle de tráfego.
                    </p>
                    <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 pt-1">
                      <span>Responsável: Supervisão de Linha</span>
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded">Prazo: Imediato</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Action Bar (WhatsApp, Email, PDF) */}
        <div className="px-6 py-4 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl text-xs font-bold transition-all cursor-pointer"
            >
              Fechar
            </button>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            {/* Copiar para WhatsApp */}
            <button
              type="button"
              onClick={handleCopyWhatsApp}
              className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs active:scale-95"
              title="Copia o relatório, diretrizes e planos de ação para o WhatsApp"
            >
              {copiedType === 'whatsapp' ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
              <span>{copiedType === 'whatsapp' ? 'Copiado para WhatsApp!' : 'Copiar p/ WhatsApp'}</span>
            </button>

            {/* Enviar WhatsApp Web */}
            <button
              type="button"
              onClick={handleOpenWhatsApp}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-700/20 active:scale-95"
              title="Abre o WhatsApp Web ou App para envio direto aos supervisores"
            >
              <Send size={16} />
              <span>Enviar via WhatsApp</span>
            </button>

            {/* Copiar HTML para E-mail */}
            <button
              type="button"
              onClick={handleCopyHtmlForEmail}
              className="px-4 py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-xs active:scale-95"
              title="Copia a tabela visual, diretrizes e plano de ação para colar no Outlook ou Gmail"
            >
              {copiedType === 'email' ? <Check size={16} className="text-indigo-600" /> : <Mail size={16} />}
              <span>{copiedType === 'email' ? 'Tabela E-mail Copiada!' : 'Copiar p/ E-mail'}</span>
            </button>

            {/* Abrir Mailto */}
            <button
              type="button"
              onClick={handleOpenMailto}
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-indigo-700/20 active:scale-95"
              title="Abre o cliente de e-mail padrão do computador"
            >
              <ExternalLink size={16} />
              <span>Abrir E-mail</span>
            </button>

            {/* Baixar PDF */}
            <button
              type="button"
              onClick={handleExportPDF}
              className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-slate-950/20 active:scale-95"
              title="Baixa o relatório executivo em PDF com texto em cima, dados embaixo e Síntese Executiva de 3 semanas"
            >
              <Download size={16} />
              <span>Baixar PDF</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
