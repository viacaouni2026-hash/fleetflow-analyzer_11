import React, { useState, useMemo, useEffect } from 'react';
import {
  Users,
  Truck,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Search,
  Filter,
  Download,
  FileSpreadsheet,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Sliders,
  Sparkles,
  ClipboardCheck,
  ChevronRight,
  Info,
  Clock,
  Eye,
  X,
  RotateCcw,
  Layers,
  Activity,
  Award,
  ShieldAlert,
  Fuel,
  UserCheck,
  Car,
  User,
  Check,
  ExternalLink,
  ChevronDown,
  FileText,
  Printer,
  Loader2,
  LayoutTemplate,
  FileDown
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine
} from 'recharts';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { getISOWeekInfo, getOffsetISOWeek } from '../lib/executiveSynthesis';

// Base64 and Text utilities for jsPDF exports
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

const cleanTextForPdf = (str: string) => {
  if (!str) return '';
  return str
    .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F700}-\u{1F77F}\u{1F780}-\u{1F7FF}\u{1F800}-\u{1F8FF}\u{1F900}-\u{1F9FF}\u{1FA00}-\u{1FA6F}\u{1FA70}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}\u{1F1E6}-\u{1F1FF}]/gu, '')
    .trim();
};

export type HistoryPerspective = 'drivers' | 'driver_individual' | 'vehicles' | 'vehicle_individual' | 'pairs';

export interface WeeklyVehicleDetail {
  placa: string;
  frota: string;
  km: number;
  litros: number;
  kml: number;
}

export interface WeeklyDriverDetail {
  driverName: string;
  km: number;
  litros: number;
  kml: number;
  percentKm: number;
}

// Helper to safely parse record date across various formats
function parseRecordDate(dateVal: any): Date | null {
  if (!dateVal) return null;
  if (dateVal instanceof Date && !isNaN(dateVal.getTime())) return dateVal;
  if (typeof dateVal === 'string') {
    const s = dateVal.trim();
    if (!s) return null;
    const parts = s.split(/[-/]/);
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        return new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      } else {
        return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
      }
    }
    const parsed = new Date(s);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  return null;
}

interface HistoryDriverVehicleTabProps {
  consolidatedReportData?: any[];
  mergedData?: any[];
  driverChartData?: any[];
  targetKml: number;
  periodoLabel?: string;
  companyName?: string;
  erpSystem?: string;
  reportLogo?: string | null;
  onNavigateToActionPlan?: () => void;
  initialPerspective?: HistoryPerspective;
}

interface WeeklyMetric {
  key: string;
  label: string;
  shortLabel: string;
  weekNo: number;
  year: number;
  km: number;
  litros: number;
  kml: number;
  activeDays: number;
  hasOperation: boolean;
  isBelowTarget: boolean;
}

interface DriverHistoryProfile {
  id: string;
  name: string;
  frotas: string[];
  placas: string[];
  operacoes: string[];
  totalKm: number;
  totalLitros: number;
  overallKml: number;
  activeDaysCount: number;
  weeklyMetrics: Map<string, WeeklyMetric>;
  weeksList: WeeklyMetric[];
  weeklyVehicles: Map<string, WeeklyVehicleDetail[]>;
  consecutiveBelowCount: number;
  isRecurrentCase: boolean;
  status: 'critical_3' | 'warning_1_2' | 'good' | 'recovering';
  statusLabel: string;
  recentTrend: 'down' | 'up' | 'stable';
}

interface VehicleHistoryProfile {
  id: string;
  frota: string;
  placa: string;
  motoristaPrincipal: string;
  driverRegime: 'titular' | 'dupla' | 'multiplo';
  driverRegimeLabel: string;
  operacao: string;
  totalKm: number;
  totalLitros: number;
  overallKml: number;
  activeDaysCount: number;
  weeklyMetrics: Map<string, WeeklyMetric>;
  weeksList: WeeklyMetric[];
  weeklyDrivers: Map<string, WeeklyDriverDetail[]>;
  consecutiveBelowCount: number;
  isRecurrentCase: boolean;
  status: 'critical_3' | 'warning_1_2' | 'good' | 'recovering';
  statusLabel: string;
  recentTrend: 'down' | 'up' | 'stable';
}

interface PairHistoryProfile {
  id: string;
  driverName: string;
  frota: string;
  placa: string;
  operacao: string;
  totalKm: number;
  totalLitros: number;
  overallKml: number;
  weeklyMetrics: Map<string, WeeklyMetric>;
  weeksList: WeeklyMetric[];
  consecutiveBelowCount: number;
  isRecurrentCase: boolean;
}

export const HistoryDriverVehicleTab: React.FC<HistoryDriverVehicleTabProps> = ({
  consolidatedReportData = [],
  mergedData = [],
  driverChartData = [],
  targetKml,
  periodoLabel = 'Período Completo',
  companyName = 'Transportes & Logística',
  erpSystem = 'FleetFlow',
  reportLogo = null,
  onNavigateToActionPlan,
  initialPerspective
}) => {
  // Local active target
  const [effectiveMeta, setEffectiveMeta] = useState<number>(targetKml > 0 ? targetKml : 2.70);

  // View Perspective: 'drivers' | 'driver_individual' | 'vehicles' | 'vehicle_individual' | 'pairs'
  const [activePerspective, setActivePerspective] = useState<HistoryPerspective>(initialPerspective || 'drivers');

  useEffect(() => {
    if (initialPerspective) {
      setActivePerspective(initialPerspective);
    }
  }, [initialPerspective]);

  // Selected driver and vehicle for individual dossier views
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');

  // Filter and Search states
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'critical_3' | 'warning' | 'good' | 'recovering'>('all');
  const [maxWeeksRange, setMaxWeeksRange] = useState<number>(8); // 4, 8, 12, or 0 (all)

  // Table Sorting
  const [sortField, setSortField] = useState<string>('overallKml');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Selected for Comparison Chart
  const [selectedChartIds, setSelectedChartIds] = useState<string[]>([]);

  // Detailed Modal Drilldown
  const [drilldownItem, setDrilldownItem] = useState<{ type: 'driver' | 'vehicle'; data: any } | null>(null);

  // PDF Export States & Options (Dossiê do Condutor & Veículo)
  const [showDriverPdfModal, setShowDriverPdfModal] = useState<boolean>(false);
  const [pdfTargetDriver, setPdfTargetDriver] = useState<DriverHistoryProfile | null>(null);
  const [driverPdfOrientation, setDriverPdfOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [includeDriverKpis, setIncludeDriverKpis] = useState<boolean>(true);
  const [includeDriverGuidelines, setIncludeDriverGuidelines] = useState<boolean>(true);
  const [includeDriverWeeklyTable, setIncludeDriverWeeklyTable] = useState<boolean>(true);
  const [includeDriverVehiclesBreakdown, setIncludeDriverVehiclesBreakdown] = useState<boolean>(true);
  const [includeDriverSignatures, setIncludeDriverSignatures] = useState<boolean>(true);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);

  // PDF Export States & Options (Dossiê da Placa)
  const [showVehiclePdfModal, setShowVehiclePdfModal] = useState<boolean>(false);
  const [pdfTargetVehicle, setPdfTargetVehicle] = useState<VehicleHistoryProfile | null>(null);
  const [vehiclePdfOrientation, setVehiclePdfOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [includeVehicleKpis, setIncludeVehicleKpis] = useState<boolean>(true);
  const [includeVehicleGuidelines, setIncludeVehicleGuidelines] = useState<boolean>(true);
  const [includeVehicleWeeklyTable, setIncludeVehicleWeeklyTable] = useState<boolean>(true);
  const [includeVehicleDriversBreakdown, setIncludeVehicleDriversBreakdown] = useState<boolean>(true);
  const [includeVehicleSignatures, setIncludeVehicleSignatures] = useState<boolean>(true);

  // Synchronize targetKml if changed from props
  React.useEffect(() => {
    if (targetKml > 0) {
      setEffectiveMeta(targetKml);
    }
  }, [targetKml]);

  // Discover all distinct weeks across mergedData and build chronological week registry
  const chronologicalWeeks = useMemo(() => {
    const weeksMap = new Map<string, ReturnType<typeof getISOWeekInfo>>();
    
    if (Array.isArray(mergedData)) {
      mergedData.forEach(r => {
        const dateVal = r.DATA || r.data || r.parsedDate || r.DataAbastecimento;
        if (!dateVal) return;
        let d: Date | null = null;
        if (dateVal instanceof Date && !isNaN(dateVal.getTime())) {
          d = dateVal;
        } else if (typeof dateVal === 'string') {
          const parts = dateVal.split(/[-/]/);
          if (parts.length === 3) {
            if (parts[0].length === 4) {
              d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
            } else {
              d = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
            }
          } else {
            const p = new Date(dateVal);
            if (!isNaN(p.getTime())) d = p;
          }
        }
        if (d && !isNaN(d.getTime())) {
          const w = getISOWeekInfo(d);
          if (!weeksMap.has(w.key)) {
            weeksMap.set(w.key, w);
          }
        }
      });
    }

    // Sort chronologically
    let sorted = Array.from(weeksMap.values()).sort((a, b) => a.sortNum - b.sortNum);

    // If no dates in data, provide current calendar week window (last 6 weeks)
    if (sorted.length === 0) {
      const now = new Date();
      const current = getISOWeekInfo(now);
      const list = [];
      for (let offset = 5; offset >= 0; offset--) {
        list.push(getOffsetISOWeek(current.year, current.weekNo, offset));
      }
      sorted = list;
    }

    return sorted;
  }, [mergedData]);

  // Displayed weeks depending on maxWeeksRange
  const displayedWeeks = useMemo(() => {
    if (maxWeeksRange > 0 && chronologicalWeeks.length > maxWeeksRange) {
      return chronologicalWeeks.slice(-maxWeeksRange);
    }
    return chronologicalWeeks;
  }, [chronologicalWeeks, maxWeeksRange]);

  // Compile Driver Profiles with Week-by-Week Metrics
  const driverProfiles = useMemo<DriverHistoryProfile[]>(() => {
    // 1. Vehicle benchmark map from consolidatedReportData
    const consVehicleMap = new Map<string, { km: number; litros: number; kml: number }>();
    if (Array.isArray(consolidatedReportData)) {
      consolidatedReportData.forEach(item => {
        const placa = String(item.PLACA || item.placa || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
        const frota = String(item.FROTA || item.frota || '').trim();
        const km = Number(item.kmProdutivo !== undefined && item.kmProdutivo > 0 ? item.kmProdutivo : (item.km !== undefined && item.km > 0 ? item.km : (item.kmTotal || item.KM || item.totalKm || 0)));
        const litros = Number(item.litros !== undefined ? item.litros : (item.LITROS || item.totalLitros || 0));
        const kml = Number(item.kml !== undefined && item.kml > 0 ? item.kml : (item.MEDIA || item.media || (litros > 0 ? km / litros : 0)));
        const rec = { km, litros, kml };
        if (placa) consVehicleMap.set(placa, rec);
        if (frota) consVehicleMap.set(`FROTA_${frota.toUpperCase()}`, rec);
      });
    }

    // 2. Driver baseline mapping from driverChartData (Média de Consumo source of truth)
    const consDriverMap = new Map<string, { km: number; litros: number; kml: number; frotas: string[]; placas: string[]; operacoes: string[] }>();
    if (Array.isArray(driverChartData)) {
      driverChartData.forEach(d => {
        const name = String(d.name || d.motorista || '').trim().toUpperCase();
        if (!name || name === 'NÃO INFORMADO' || name === 'N/A' || name === '-') return;
        const km = Number(d.km !== undefined && d.km > 0 ? d.km : (d.kmProdutivo || d.kmTotal || 0));
        const litros = Number(d.litros || 0);
        const kml = Number(d.kml !== undefined && d.kml > 0 ? d.kml : (litros > 0 && km > 0 ? km / litros : 0));
        consDriverMap.set(name, {
          km,
          litros,
          kml,
          frotas: d.frotas ? Array.from(d.frotas as any) : (d.frota ? [String(d.frota)] : (d.frotasList ? String(d.frotasList).split(', ').filter(Boolean) : [])),
          placas: d.placas ? Array.from(d.placas as any) : (d.placa ? [String(d.placa)] : []),
          operacoes: d.operacoes ? Array.from(d.operacoes as any) : (d.operacao ? [String(d.operacao)] : [])
        });
      });
    }

    // 3. Process mergedData: aggregate weekly vehicle data with driver distribution
    const vehWeeklyMap = new Map<string, Map<string, {
      placa: string;
      frota: string;
      km: number;
      litros: number;
      activeDates: Set<string>;
      driverKm: Map<string, number>;
      driverLitros: Map<string, number>;
      driverDates: Map<string, Set<string>>;
      operacoes: Set<string>;
    }>>();

    const directDriverFuelWeekly = new Map<string, Map<string, number>>();
    const rawVehPeriodMap = new Map<string, { km: number; litros: number }>();

    if (Array.isArray(mergedData)) {
      mergedData.forEach(r => {
        const d = parseRecordDate(r.DATA || r.data || r.parsedDate || r.supplyDate);
        const weekKey = d ? getISOWeekInfo(d).key : (chronologicalWeeks[chronologicalWeeks.length - 1]?.key || 'W-CURRENT');
        const dateStr = d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : 'default';

        const rawPlaca = String(r.PLACA || r.placa || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
        const rawFrota = String(r.FROTA || r.frota || r.VEICULO || '').trim();
        const vehKey = rawPlaca || (rawFrota ? `FROTA_${rawFrota.toUpperCase()}` : '');

        const rawDriver = String(r.MOTORISTA || r.motorista || r.CONDUTOR || r.condutor || r.NOME_MOTORISTA || '').trim().toUpperCase();
        const cleanDriver = (rawDriver && rawDriver !== 'N/A' && rawDriver !== '-' && rawDriver !== 'NÃO INFORMADO' && rawDriver !== 'SEM MOTORISTA' && !rawDriver.startsWith('MOTORISTA ('))
          ? rawDriver
          : '';

        const isKm = Boolean(r.isKMRecord !== undefined ? r.isKMRecord : ((r.KM_PRODUTIVO && r.KM_PRODUTIVO > 0) || (r.KM_TOTAL && r.KM_TOTAL > 0)));
        const kmVal = isKm ? Number(r.KM_PRODUTIVO || r.KM_TOTAL || r.KM || r.DISTANCE || r.km || 0) : 0;
        const litVal = Number(r.LITROS || r.litros || 0);
        const op = String(r.OPERACAO || r.operacao || r.LINHA || '').trim();

        if (vehKey) {
          if (!vehWeeklyMap.has(weekKey)) {
            vehWeeklyMap.set(weekKey, new Map());
          }
          const vMap = vehWeeklyMap.get(weekKey)!;
          if (!vMap.has(vehKey)) {
            vMap.set(vehKey, {
              placa: rawPlaca || rawFrota,
              frota: rawFrota || rawPlaca,
              km: 0,
              litros: 0,
              activeDates: new Set(),
              driverKm: new Map(),
              driverLitros: new Map(),
              driverDates: new Map(),
              operacoes: new Set()
            });
          }
          const wVeh = vMap.get(vehKey)!;
          if (op) wVeh.operacoes.add(op);
          if (rawPlaca && !wVeh.placa) wVeh.placa = rawPlaca;
          if (rawFrota && !wVeh.frota) wVeh.frota = rawFrota;

          if (isKm && kmVal > 0) {
            wVeh.km += kmVal;
            if (dateStr !== 'default') wVeh.activeDates.add(dateStr);
            if (cleanDriver) {
              wVeh.driverKm.set(cleanDriver, (wVeh.driverKm.get(cleanDriver) || 0) + kmVal);
              if (litVal > 0) {
                wVeh.driverLitros.set(cleanDriver, (wVeh.driverLitros.get(cleanDriver) || 0) + litVal);
              }
              if (!wVeh.driverDates.has(cleanDriver)) {
                wVeh.driverDates.set(cleanDriver, new Set());
              }
              if (dateStr !== 'default') wVeh.driverDates.get(cleanDriver)!.add(dateStr);
            }
          }
          if (litVal > 0) {
            wVeh.litros += litVal;
          }

          if (!rawVehPeriodMap.has(vehKey)) {
            rawVehPeriodMap.set(vehKey, { km: 0, litros: 0 });
          }
          const pVeh = rawVehPeriodMap.get(vehKey)!;
          if (isKm) pVeh.km += kmVal;
          if (litVal > 0) pVeh.litros += litVal;
        }

        // Direct driver fuel if logged on fuel record
        if (!isKm && litVal > 0 && cleanDriver) {
          if (!directDriverFuelWeekly.has(weekKey)) {
            directDriverFuelWeekly.set(weekKey, new Map());
          }
          const dMap = directDriverFuelWeekly.get(weekKey)!;
          dMap.set(cleanDriver, (dMap.get(cleanDriver) || 0) + litVal);
        }
      });
    }

    // 4. Distribute vehicle KM and Liters to each driver
    const map = new Map<string, {
      name: string;
      frotas: Set<string>;
      placas: Set<string>;
      operacoes: Set<string>;
      activeDates: Set<string>;
      totalKm: number;
      totalLitros: number;
      weekly: Map<string, {
        km: number;
        litros: number;
        activeDates: Set<string>;
        vehiclesMap: Map<string, { placa: string; frota: string; km: number; litros: number }>;
      }>;
    }>();

    vehWeeklyMap.forEach((vMap, weekKey) => {
      vMap.forEach((wVeh, vehKey) => {
        const consV = consVehicleMap.get(wVeh.placa) || consVehicleMap.get(vehKey) || (wVeh.frota ? consVehicleMap.get(`FROTA_${wVeh.frota.toUpperCase()}`) : undefined);
        const rawP = rawVehPeriodMap.get(vehKey);
        const benchKml = (consV && consV.kml > 0)
          ? consV.kml
          : ((rawP && rawP.litros > 0 && rawP.km > 0)
            ? (rawP.km / rawP.litros)
            : ((wVeh.litros > 0 && wVeh.km > 0) ? (wVeh.km / wVeh.litros) : 0));

        let totalDriverKm = 0;
        wVeh.driverKm.forEach(km => { totalDriverKm += km; });

        wVeh.driverKm.forEach((dKm, dName) => {
          if (!map.has(dName)) {
            map.set(dName, {
              name: dName,
              frotas: new Set(),
              placas: new Set(),
              operacoes: new Set(),
              activeDates: new Set(),
              totalKm: 0,
              totalLitros: 0,
              weekly: new Map()
            });
          }
          const p = map.get(dName)!;
          if (wVeh.frota && wVeh.frota !== 'N/A') p.frotas.add(wVeh.frota);
          if (wVeh.placa && wVeh.placa !== 'N/A') p.placas.add(wVeh.placa);
          wVeh.operacoes.forEach(o => p.operacoes.add(o));

          const dDates = wVeh.driverDates.get(dName);
          if (dDates) {
            dDates.forEach(dt => p.activeDates.add(dt));
          }

          if (!p.weekly.has(weekKey)) {
            p.weekly.set(weekKey, { km: 0, litros: 0, activeDates: new Set(), vehiclesMap: new Map() });
          }
          const wRec = p.weekly.get(weekKey)!;
          if (dDates) {
            dDates.forEach(dt => wRec.activeDates.add(dt));
          }

          // Calculate fuel allocation
          let allocatedLit = 0;
          const directDriverLit = wVeh.driverLitros?.get(dName) || 0;
          if (directDriverLit > 0) {
            allocatedLit = directDriverLit;
          } else if (wVeh.litros > 0) {
            const ratio = totalDriverKm > 0 ? (dKm / totalDriverKm) : 1;
            allocatedLit = wVeh.litros * ratio;
          } else if (benchKml > 0 && dKm > 0) {
            allocatedLit = dKm / benchKml;
          }

          p.totalKm += dKm;
          p.totalLitros += allocatedLit;

          wRec.km += dKm;
          wRec.litros += allocatedLit;

          const vehItemKey = wVeh.placa || (wVeh.frota ? `Frota ${wVeh.frota}` : 'OUTRO');
          if (!wRec.vehiclesMap.has(vehItemKey)) {
            wRec.vehiclesMap.set(vehItemKey, { placa: wVeh.placa || '-', frota: wVeh.frota || '-', km: 0, litros: 0 });
          }
          const vEntry = wRec.vehiclesMap.get(vehItemKey)!;
          vEntry.km += dKm;
          vEntry.litros += allocatedLit;
        });
      });
    });

    // Merge direct fuel if any driver wasn't allocated
    directDriverFuelWeekly.forEach((dMap, weekKey) => {
      dMap.forEach((lit, dName) => {
        if (map.has(dName)) {
          const p = map.get(dName)!;
          if (!p.weekly.has(weekKey)) {
            p.weekly.set(weekKey, { km: 0, litros: 0, activeDates: new Set(), vehiclesMap: new Map() });
          }
          const wRec = p.weekly.get(weekKey)!;
          if (wRec.litros === 0) {
            wRec.litros += lit;
            p.totalLitros += lit;
          }
        }
      });
    });

    // Calibrate with driverChartData
    consDriverMap.forEach((consD, dName) => {
      if (!map.has(dName)) {
        map.set(dName, {
          name: dName,
          frotas: new Set(consD.frotas),
          placas: new Set(consD.placas),
          operacoes: new Set(consD.operacoes),
          activeDates: new Set(),
          totalKm: consD.km,
          totalLitros: consD.litros,
          weekly: new Map()
        });
      } else {
        const p = map.get(dName)!;
        consD.frotas.forEach(f => p.frotas.add(f));
        consD.placas.forEach(pl => p.placas.add(pl));
        consD.operacoes.forEach(o => p.operacoes.add(o));
      }
    });

    // 5. Build profiles
    const result: DriverHistoryProfile[] = [];

    map.forEach((p, driverName) => {
      const consD = consDriverMap.get(driverName);
      const authoritativeKm = consD && consD.km > 0 ? consD.km : p.totalKm;
      const authoritativeLitros = consD && consD.litros > 0 ? consD.litros : p.totalLitros;
      const overallKml = consD && consD.kml > 0 
        ? consD.kml 
        : (authoritativeLitros > 0 ? authoritativeKm / authoritativeLitros : 0);

      const weeklyMetrics = new Map<string, WeeklyMetric>();
      const weeksList: WeeklyMetric[] = [];
      const weeklyVehicles = new Map<string, WeeklyVehicleDetail[]>();

      displayedWeeks.forEach(w => {
        const wData = p.weekly.get(w.key);
        const km = wData ? Math.round(wData.km) : 0;
        let litros = wData ? Math.round(wData.litros * 10) / 10 : 0;
        if (litros === 0 && km > 0 && overallKml > 0) {
          litros = Math.round((km / overallKml) * 10) / 10;
        }
        const kml = (litros > 0 && km > 0) ? Number((km / litros).toFixed(2)) : 0;
        const hasOperation = km > 0 && litros > 0;
        const isBelowTarget = hasOperation && kml < effectiveMeta;

        const metric: WeeklyMetric = {
          key: w.key,
          label: w.label,
          shortLabel: `Sem. ${w.weekNo}`,
          weekNo: w.weekNo,
          year: w.year,
          km,
          litros,
          kml,
          activeDays: wData ? wData.activeDates.size : 0,
          hasOperation,
          isBelowTarget
        };

        weeklyMetrics.set(w.key, metric);
        weeksList.push(metric);

        const vList: WeeklyVehicleDetail[] = [];
        if (wData && wData.vehiclesMap) {
          wData.vehiclesMap.forEach(v => {
            let vLitros = v.litros;
            if (vLitros === 0 && v.km > 30 && overallKml > 0) {
              vLitros = v.km / overallKml;
            }
            const vKml = vLitros > 0 && v.km > 0 ? Number((v.km / vLitros).toFixed(2)) : (overallKml > 0 ? Number(overallKml.toFixed(2)) : 0);
            vList.push({
              placa: v.placa,
              frota: v.frota,
              km: Math.round(v.km),
              litros: Math.round(vLitros * 10) / 10,
              kml: vKml
            });
          });
        }
        weeklyVehicles.set(w.key, vList.sort((a, b) => b.km - a.km));
      });

      // Calculate consecutive weeks below target from the latest operating weeks
      let consecutiveBelowCount = 0;
      for (let i = weeksList.length - 1; i >= 0; i--) {
        const wk = weeksList[i];
        if (!wk.hasOperation) {
          // If there was no operation in this week, the consecutive streak is broken
          break;
        }
        if (wk.isBelowTarget) {
          consecutiveBelowCount++;
        } else {
          // Within or above target: streak is broken immediately
          break;
        }
      }

      const isRecurrentCase = consecutiveBelowCount >= 3;

      let status: 'critical_3' | 'warning_1_2' | 'good' | 'recovering' = 'good';
      let statusLabel = 'Meta Atingida';

      if (isRecurrentCase) {
        status = 'critical_3';
        statusLabel = `Alerta Crítico: ${consecutiveBelowCount} semanas consecutivas < meta`;
      } else if (consecutiveBelowCount > 0) {
        status = 'warning_1_2';
        statusLabel = `${consecutiveBelowCount} semana(s) abaixo da meta`;
      } else {
        // Check if recovering: was below previously, but last week met target
        const lastW = weeksList[weeksList.length - 1];
        const prevW = weeksList[weeksList.length - 2];
        if (lastW && lastW.kml >= effectiveMeta && prevW && prevW.isBelowTarget) {
          status = 'recovering';
          statusLabel = 'Em Recuperação (superou meta na última semana)';
        }
      }

      // Trend analysis
      let recentTrend: 'down' | 'up' | 'stable' = 'stable';
      const validWeeks = weeksList.filter(w => w.hasOperation && w.kml > 0);
      if (validWeeks.length >= 2) {
        const last = validWeeks[validWeeks.length - 1].kml;
        const prev = validWeeks[validWeeks.length - 2].kml;
        if (last > prev + 0.05) recentTrend = 'up';
        else if (last < prev - 0.05) recentTrend = 'down';
      }

      result.push({
        id: `driver-${driverName.replace(/[^A-Z0-9]/g, '_')}`,
        name: driverName,
        frotas: Array.from(p.frotas),
        placas: Array.from(p.placas),
        operacoes: Array.from(p.operacoes),
        totalKm: Math.round(authoritativeKm),
        totalLitros: Math.round(authoritativeLitros),
        overallKml: Number(overallKml.toFixed(2)),
        activeDaysCount: p.activeDates.size,
        weeklyMetrics,
        weeksList,
        weeklyVehicles,
        consecutiveBelowCount,
        isRecurrentCase,
        status,
        statusLabel,
        recentTrend
      });
    });

    return result.sort((a, b) => b.totalKm - a.totalKm);
  }, [mergedData, driverChartData, consolidatedReportData, displayedWeeks, effectiveMeta, chronologicalWeeks]);

  // Compile Vehicle Profiles with Week-by-Week Metrics
  const vehicleProfiles = useMemo<VehicleHistoryProfile[]>(() => {
    const map = new Map<string, {
      frota: string;
      placa: string;
      operacoes: Set<string>;
      driverKmMap: Map<string, number>;
      activeDates: Set<string>;
      totalKm: number;
      totalLitros: number;
      weekly: Map<string, {
        km: number;
        litros: number;
        activeDates: Set<string>;
        driversMap: Map<string, { driverName: string; km: number; litros: number }>;
      }>;
    }>();

    // 1. Process mergedData
    if (Array.isArray(mergedData)) {
      mergedData.forEach(r => {
        const frota = String(r.FROTA || r.frota || '').trim();
        const placa = String(r.PLACA || r.placa || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (!placa && !frota) return;
        const key = placa || `FROTA_${frota}`;

        const d = parseRecordDate(r.DATA || r.data || r.parsedDate || r.supplyDate);
        const weekKey = d ? getISOWeekInfo(d).key : (chronologicalWeeks[chronologicalWeeks.length - 1]?.key || 'W-CURRENT');
        const dateStr = d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}` : 'default';

        if (!map.has(key)) {
          map.set(key, {
            frota: frota || placa,
            placa: placa || frota,
            operacoes: new Set(),
            driverKmMap: new Map(),
            activeDates: new Set(),
            totalKm: 0,
            totalLitros: 0,
            weekly: new Map()
          });
        }

        const v = map.get(key)!;
        const op = String(r.OPERACAO || r.operacao || r.LINHA || '').trim();
        if (op) v.operacoes.add(op);
        if (dateStr !== 'default') v.activeDates.add(dateStr);

        const rawDriver = String(r.MOTORISTA || r.motorista || r.CONDUTOR || r.condutor || '').trim().toUpperCase();
        const isKm = Boolean(r.isKMRecord !== undefined ? r.isKMRecord : ((r.KM_PRODUTIVO && r.KM_PRODUTIVO > 0) || (r.KM_TOTAL && r.KM_TOTAL > 0)));
        const kmVal = isKm ? Number(r.KM_PRODUTIVO || r.KM_TOTAL || r.KM || r.DISTANCE || r.km || 0) : 0;
        const litVal = Number(r.LITROS || r.litros || 0);

        if (rawDriver && rawDriver !== 'N/A' && rawDriver !== '-' && !rawDriver.startsWith('MOTORISTA (')) {
          v.driverKmMap.set(rawDriver, (v.driverKmMap.get(rawDriver) || 0) + (kmVal || 50));
        }

        if (!v.weekly.has(weekKey)) {
          v.weekly.set(weekKey, { km: 0, litros: 0, activeDates: new Set(), driversMap: new Map() });
        }
        const wRec = v.weekly.get(weekKey)!;
        if (dateStr !== 'default') wRec.activeDates.add(dateStr);
        wRec.km += kmVal;
        wRec.litros += litVal;

        if (rawDriver && rawDriver !== 'N/A' && rawDriver !== '-' && !rawDriver.startsWith('MOTORISTA (')) {
          if (!wRec.driversMap.has(rawDriver)) {
            wRec.driversMap.set(rawDriver, { driverName: rawDriver, km: 0, litros: 0 });
          }
          const dRec = wRec.driversMap.get(rawDriver)!;
          dRec.km += kmVal;
          dRec.litros += litVal;
        }

        v.totalKm += kmVal;
        v.totalLitros += litVal;
      });
    }

    // 2. Cross-reference with consolidatedReportData (Source of truth from Média de Consumo)
    const consVehMap = new Map<string, { km: number; litros: number; kml: number; frota: string; placa: string; operacao: string }>();
    if (Array.isArray(consolidatedReportData)) {
      consolidatedReportData.forEach(item => {
        const placa = String(item.PLACA || item.placa || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
        const frota = String(item.FROTA || item.frota || item.VEICULO || '').trim();
        const normKey = placa || (frota ? `FROTA_${frota.toUpperCase()}` : '');
        if (!normKey) return;

        const cKm = Number(item.kmProdutivo !== undefined && item.kmProdutivo > 0 ? item.kmProdutivo : (item.km !== undefined && item.km > 0 ? item.km : (item.kmTotal || item.KM || item.totalKm || 0)));
        const cLit = Number(item.litros !== undefined ? item.litros : (item.LITROS || item.totalLitros || 0));
        const cKml = Number(item.kml !== undefined && item.kml > 0 ? item.kml : (item.MEDIA || item.media || (cLit > 0 ? cKm / cLit : 0)));
        const operacao = String(item.OPERACAO || item.operacao || '').trim();

        const rec = { km: cKm, litros: cLit, kml: cKml, frota: frota || placa, placa: placa || frota, operacao };
        consVehMap.set(normKey, rec);
        if (placa) consVehMap.set(placa, rec);
        if (frota) consVehMap.set(`FROTA_${frota.toUpperCase()}`, rec);

        if (!map.has(normKey)) {
          map.set(normKey, {
            frota: frota || placa,
            placa: placa || frota,
            operacoes: new Set(operacao ? [operacao] : []),
            driverKmMap: new Map(),
            activeDates: new Set(),
            totalKm: cKm,
            totalLitros: cLit,
            weekly: new Map()
          });
        } else {
          const v = map.get(normKey)!;
          if (cKm > 0) v.totalKm = cKm;
          if (cLit > 0) v.totalLitros = cLit;
          if (operacao) v.operacoes.add(operacao);
          if (frota && (!v.frota || v.frota === 'N/A')) v.frota = frota;
          if (placa && (!v.placa || v.placa === 'N/A')) v.placa = placa;
        }
      });
    }

    // 3. Build Vehicle Profiles
    const result: VehicleHistoryProfile[] = [];

    map.forEach((v, key) => {
      const normPlaca = v.placa ? v.placa.toUpperCase().replace(/[^A-Z0-9]/g, '') : '';
      const normFrota = v.frota ? `FROTA_${v.frota.toUpperCase().trim()}` : '';
      const consV = consVehMap.get(key) || consVehMap.get(normPlaca) || consVehMap.get(normFrota);

      const authoritativeKm = consV && consV.km > 0 ? consV.km : v.totalKm;
      const authoritativeLitros = consV && consV.litros > 0 ? consV.litros : v.totalLitros;
      const overallKml = consV && consV.kml > 0
        ? consV.kml
        : (authoritativeLitros > 0 ? authoritativeKm / authoritativeLitros : 0);

      // Determine main driver & driver regime
      let motoristaPrincipal = 'NÃO INFORMADO';
      let driverRegime: 'titular' | 'dupla' | 'multiplo' = 'titular';
      let driverRegimeLabel = 'Condutor não identificado';

      const sortedDrivers = Array.from(v.driverKmMap.entries()).sort((a, b) => b[1] - a[1]);
      const totalRecordedDriverKm = sortedDrivers.reduce((acc, curr) => acc + curr[1], 0);

      if (sortedDrivers.length === 1) {
        motoristaPrincipal = sortedDrivers[0][0];
        driverRegime = 'titular';
        driverRegimeLabel = `Titular: ${motoristaPrincipal} (100%)`;
      } else if (sortedDrivers.length >= 2) {
        const top1 = sortedDrivers[0];
        const top2 = sortedDrivers[1];
        const p1 = totalRecordedDriverKm > 0 ? Math.round((top1[1] / totalRecordedDriverKm) * 100) : 50;
        const p2 = totalRecordedDriverKm > 0 ? Math.round((top2[1] / totalRecordedDriverKm) * 100) : 50;
        motoristaPrincipal = top1[0];

        if (p1 >= 75) {
          driverRegime = 'titular';
          driverRegimeLabel = `Titular: ${top1[0]} (${p1}%)`;
        } else if (p1 + p2 >= 80) {
          driverRegime = 'dupla';
          driverRegimeLabel = `Dupla: ${top1[0]} (${p1}%) e ${top2[0]} (${p2}%)`;
        } else {
          driverRegime = 'multiplo';
          driverRegimeLabel = `Frota Compartilhada (${sortedDrivers.length} condutores)`;
        }
      }

      // Compile week list for displayed weeks
      const weeklyMetrics = new Map<string, WeeklyMetric>();
      const weeksList: WeeklyMetric[] = [];
      const weeklyDrivers = new Map<string, WeeklyDriverDetail[]>();

      displayedWeeks.forEach(w => {
        const wData = v.weekly.get(w.key);
        const km = wData ? Math.round(wData.km) : 0;
        let litros = wData ? Math.round(wData.litros * 10) / 10 : 0;
        if (litros === 0 && km > 0 && overallKml > 0) {
          litros = Math.round((km / overallKml) * 10) / 10;
        }
        const kml = (litros > 0 && km > 0) ? Number((km / litros).toFixed(2)) : 0;
        const hasOperation = km > 0 && litros > 0;
        const isBelowTarget = hasOperation && kml < effectiveMeta;

        const metric: WeeklyMetric = {
          key: w.key,
          label: w.label,
          shortLabel: `Sem. ${w.weekNo}`,
          weekNo: w.weekNo,
          year: w.year,
          km,
          litros,
          kml,
          activeDays: wData ? wData.activeDates.size : 0,
          hasOperation,
          isBelowTarget
        };

        weeklyMetrics.set(w.key, metric);
        weeksList.push(metric);

        // Drivers who operated this vehicle in this week
        const dList: WeeklyDriverDetail[] = [];
        if (wData && wData.driversMap) {
          const totWKm = wData.km > 0 ? wData.km : 1;
          wData.driversMap.forEach(d => {
            let dLitros = d.litros;
            if (dLitros === 0 && litros > 0 && totWKm > 0) {
              dLitros = litros * (d.km / totWKm);
            } else if (dLitros === 0 && d.km > 30 && overallKml > 0) {
              dLitros = d.km / overallKml;
            }
            const dKml = dLitros > 0 && d.km > 0 ? Number((d.km / dLitros).toFixed(2)) : 0;
            const percentKm = Math.min(100, Math.round((d.km / totWKm) * 100));
            dList.push({
              driverName: d.driverName,
              km: Math.round(d.km),
              litros: Math.round(dLitros * 10) / 10,
              kml: dKml,
              percentKm
            });
          });
        }
        weeklyDrivers.set(w.key, dList.sort((a, b) => b.km - a.km));
      });

      // Calculate consecutive weeks below target from the latest operating weeks
      let consecutiveBelowCount = 0;
      for (let i = weeksList.length - 1; i >= 0; i--) {
        const wk = weeksList[i];
        if (!wk.hasOperation) {
          // If there was no operation in this week, the consecutive streak is broken
          break;
        }
        if (wk.isBelowTarget) {
          consecutiveBelowCount++;
        } else {
          // Within or above target: streak is broken immediately
          break;
        }
      }

      const isRecurrentCase = consecutiveBelowCount >= 3;

      let status: 'critical_3' | 'warning_1_2' | 'good' | 'recovering' = 'good';
      let statusLabel = 'Meta Atingida';

      if (isRecurrentCase) {
        status = 'critical_3';
        statusLabel = `Alerta Crítico: ${consecutiveBelowCount} semanas consecutivas < meta`;
      } else if (consecutiveBelowCount > 0) {
        status = 'warning_1_2';
        statusLabel = `${consecutiveBelowCount} semana(s) abaixo da meta`;
      } else {
        const lastW = weeksList[weeksList.length - 1];
        const prevW = weeksList[weeksList.length - 2];
        if (lastW && lastW.kml >= effectiveMeta && prevW && prevW.isBelowTarget) {
          status = 'recovering';
          statusLabel = 'Em Recuperação';
        }
      }

      let recentTrend: 'down' | 'up' | 'stable' = 'stable';
      const validWeeks = weeksList.filter(w => w.hasOperation && w.kml > 0);
      if (validWeeks.length >= 2) {
        const last = validWeeks[validWeeks.length - 1].kml;
        const prev = validWeeks[validWeeks.length - 2].kml;
        if (last > prev + 0.05) recentTrend = 'up';
        else if (last < prev - 0.05) recentTrend = 'down';
      }

      result.push({
        id: `vehicle-${key.replace(/[^A-Z0-9]/g, '_')}`,
        frota: v.frota,
        placa: v.placa,
        motoristaPrincipal,
        driverRegime,
        driverRegimeLabel,
        operacao: consV?.operacao || Array.from(v.operacoes)[0] || 'GERAL',
        totalKm: Math.round(authoritativeKm),
        totalLitros: Math.round(authoritativeLitros),
        overallKml: Number(overallKml.toFixed(2)),
        activeDaysCount: v.activeDates.size,
        weeklyMetrics,
        weeksList,
        weeklyDrivers,
        consecutiveBelowCount,
        isRecurrentCase,
        status,
        statusLabel,
        recentTrend
      });
    });

    return result.sort((a, b) => b.totalKm - a.totalKm);
  }, [mergedData, consolidatedReportData, displayedWeeks, effectiveMeta, chronologicalWeeks]);

  // Compile Driver x Vehicle Cross Pairs
  const pairProfiles = useMemo<PairHistoryProfile[]>(() => {
    const map = new Map<string, {
      driverName: string;
      frota: string;
      placa: string;
      operacao: string;
      totalKm: number;
      totalLitros: number;
      weekly: Map<string, { km: number; litros: number }>;
    }>();

    if (Array.isArray(mergedData)) {
      mergedData.forEach(r => {
        const rawDriver = String(r.MOTORISTA || r.motorista || r.CONDUTOR || r.condutor || '').trim().toUpperCase();
        const frota = String(r.FROTA || r.frota || '').trim();
        const placa = String(r.PLACA || r.placa || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
        if (!rawDriver || rawDriver === 'N/A' || rawDriver.startsWith('MOTORISTA (')) return;
        if (!placa && !frota) return;

        const pairKey = `${rawDriver}__${placa || frota}`;
        const d = parseRecordDate(r.DATA || r.data || r.parsedDate || r.supplyDate);
        const weekKey = d ? getISOWeekInfo(d).key : (chronologicalWeeks[chronologicalWeeks.length - 1]?.key || 'W-CURRENT');

        if (!map.has(pairKey)) {
          map.set(pairKey, {
            driverName: rawDriver,
            frota: frota || placa,
            placa: placa || frota,
            operacao: String(r.OPERACAO || r.operacao || 'GERAL').trim(),
            totalKm: 0,
            totalLitros: 0,
            weekly: new Map()
          });
        }

        const p = map.get(pairKey)!;
        const isKm = Boolean(r.isKMRecord || (r.KM_PRODUTIVO && r.KM_PRODUTIVO > 0) || (r.KM_TOTAL && r.KM_TOTAL > 0) || (r.DISTANCE && r.DISTANCE > 0));
        const kmVal = isKm ? Number(r.KM_PRODUTIVO || r.KM_TOTAL || r.KM || r.DISTANCE || r.km || 0) : 0;
        const litVal = !isKm ? Number(r.LITROS || r.litros || 0) : 0;

        p.totalKm += kmVal;
        p.totalLitros += litVal;

        if (!p.weekly.has(weekKey)) {
          p.weekly.set(weekKey, { km: 0, litros: 0 });
        }
        const w = p.weekly.get(weekKey)!;
        w.km += kmVal;
        w.litros += litVal;
      });
    }

    const consVehicleMap = new Map<string, { km: number; litros: number; kml: number }>();
    if (Array.isArray(consolidatedReportData)) {
      consolidatedReportData.forEach(item => {
        const placa = String(item.PLACA || item.placa || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
        const frota = String(item.FROTA || item.frota || '').trim();
        const km = Number(item.kmProdutivo !== undefined && item.kmProdutivo > 0 ? item.kmProdutivo : (item.km !== undefined && item.km > 0 ? item.km : (item.kmTotal || item.KM || item.totalKm || 0)));
        const litros = Number(item.litros !== undefined ? item.litros : (item.LITROS || item.totalLitros || 0));
        const kml = Number(item.kml !== undefined && item.kml > 0 ? item.kml : (item.MEDIA || item.media || (litros > 0 ? km / litros : 0)));
        const rec = { km, litros, kml };
        if (placa) consVehicleMap.set(placa, rec);
        if (frota) consVehicleMap.set(`FROTA_${frota.toUpperCase()}`, rec);
      });
    }

    const result: PairHistoryProfile[] = [];

    map.forEach((p, pairKey) => {
      if (p.totalKm < 100) return; // ignore negligible records
      const normPlaca = p.placa ? p.placa.toUpperCase().replace(/[^A-Z0-9]/g, '') : '';
      const normFrota = p.frota ? `FROTA_${p.frota.toUpperCase().trim()}` : '';
      const consV = consVehicleMap.get(normPlaca) || consVehicleMap.get(normFrota);
      const benchKml = consV && consV.kml > 0 ? consV.kml : (p.totalLitros > 0 ? p.totalKm / p.totalLitros : 0);
      let effectiveLitros = p.totalLitros;
      if (effectiveLitros === 0 && benchKml > 0 && p.totalKm > 0) {
        effectiveLitros = p.totalKm / benchKml;
      }
      const overallKml = effectiveLitros > 0 ? p.totalKm / effectiveLitros : (benchKml > 0 ? benchKml : 0);

      const weeklyMetrics = new Map<string, WeeklyMetric>();
      const weeksList: WeeklyMetric[] = [];

      displayedWeeks.forEach(w => {
        const wData = p.weekly.get(w.key);
        const km = wData ? Math.round(wData.km) : 0;
        let litros = wData ? Math.round(wData.litros * 10) / 10 : 0;
        if (litros === 0 && km > 50 && overallKml > 0) {
          litros = Math.round((km / overallKml) * 10) / 10;
        }
        const kml = (litros > 0 && km > 0) ? Number((km / litros).toFixed(2)) : 0;
        const hasOperation = km > 50 && litros > 0;
        const isBelowTarget = hasOperation && kml < effectiveMeta;

        const metric: WeeklyMetric = {
          key: w.key,
          label: w.label,
          shortLabel: `Sem. ${w.weekNo}`,
          weekNo: w.weekNo,
          year: w.year,
          km,
          litros,
          kml,
          activeDays: 0,
          hasOperation,
          isBelowTarget
        };

        weeklyMetrics.set(w.key, metric);
        weeksList.push(metric);
      });

      let consecutiveBelowCount = 0;
      for (let i = weeksList.length - 1; i >= 0; i--) {
        const wk = weeksList[i];
        if (!wk.hasOperation) {
          // If there was no operation in this week, the consecutive streak is broken
          break;
        }
        if (wk.isBelowTarget) {
          consecutiveBelowCount++;
        } else {
          break;
        }
      }

      result.push({
        id: `pair-${pairKey.replace(/[^A-Z0-9]/g, '_')}`,
        driverName: p.driverName,
        frota: p.frota,
        placa: p.placa,
        operacao: p.operacao,
        totalKm: Math.round(p.totalKm),
        totalLitros: Math.round(effectiveLitros),
        overallKml: Number(overallKml.toFixed(2)),
        weeklyMetrics,
        weeksList,
        consecutiveBelowCount,
        isRecurrentCase: consecutiveBelowCount >= 3
      });
    });

    return result.sort((a, b) => b.totalKm - a.totalKm);
  }, [mergedData, consolidatedReportData, displayedWeeks, effectiveMeta, chronologicalWeeks]);

  // Overall Global Statistics for the Header
  const globalStats = useMemo(() => {
    let totalKm = 0;
    let totalLitros = 0;
    let criticalCount = 0;
    let goodCount = 0;

    driverProfiles.forEach(d => {
      if (d.isRecurrentCase) criticalCount++;
      if (d.overallKml >= effectiveMeta) goodCount++;
    });

    if (Array.isArray(consolidatedReportData) && consolidatedReportData.length > 0) {
      totalKm = consolidatedReportData.reduce((acc, r) => acc + Number(r.kmProdutivo !== undefined && r.kmProdutivo > 0 ? r.kmProdutivo : (r.km || r.kmTotal || 0)), 0);
      totalLitros = consolidatedReportData.reduce((acc, r) => acc + Number(r.litros || 0), 0);
    } else {
      driverProfiles.forEach(d => {
        totalKm += d.totalKm;
        totalLitros += d.totalLitros;
      });
    }

    const fleetAvgKml = totalLitros > 0 ? totalKm / totalLitros : 0;
    const complianceRate = driverProfiles.length > 0 ? Math.round((goodCount / driverProfiles.length) * 100) : 0;

    return {
      totalDrivers: driverProfiles.length,
      totalVehicles: consolidatedReportData && consolidatedReportData.length > 0 ? consolidatedReportData.length : vehicleProfiles.length,
      fleetAvgKml: Number(fleetAvgKml.toFixed(2)),
      criticalCasesCount: criticalCount,
      complianceRate,
      totalKm: Math.round(totalKm),
      totalLitros: Math.round(totalLitros)
    };
  }, [driverProfiles, vehicleProfiles, consolidatedReportData, effectiveMeta]);

  // Filtered & Sorted Drivers
  const filteredDrivers = useMemo(() => {
    return driverProfiles
      .filter(d => {
        if (statusFilter === 'critical_3') return d.status === 'critical_3';
        if (statusFilter === 'warning') return d.status === 'warning_1_2' || d.status === 'critical_3';
        if (statusFilter === 'good') return d.status === 'good';
        if (statusFilter === 'recovering') return d.status === 'recovering';
        return true;
      })
      .filter(d => {
        if (!searchTerm.trim()) return true;
        const term = searchTerm.toLowerCase();
        return (
          d.name.toLowerCase().includes(term) ||
          d.placas.some(p => p.toLowerCase().includes(term)) ||
          d.frotas.some(f => f.toLowerCase().includes(term)) ||
          d.operacoes.some(o => o.toLowerCase().includes(term))
        );
      })
      .sort((a, b) => {
        let diff = 0;
        if (sortField === 'name') diff = a.name.localeCompare(b.name);
        else if (sortField === 'overallKml') diff = a.overallKml - b.overallKml;
        else if (sortField === 'totalKm') diff = a.totalKm - b.totalKm;
        else if (sortField === 'totalLitros') diff = a.totalLitros - b.totalLitros;
        else if (sortField === 'consecutive') diff = a.consecutiveBelowCount - b.consecutiveBelowCount;
        else if (sortField.startsWith('week_')) {
          const wKey = sortField.replace('week_', '');
          const wA = a.weeklyMetrics.get(wKey)?.kml || 0;
          const wB = b.weeklyMetrics.get(wKey)?.kml || 0;
          diff = wA - wB;
        } else {
          diff = a.overallKml - b.overallKml;
        }
        return sortDir === 'asc' ? diff : -diff;
      });
  }, [driverProfiles, statusFilter, searchTerm, sortField, sortDir]);

  // Filtered & Sorted Vehicles
  const filteredVehicles = useMemo(() => {
    return vehicleProfiles
      .filter(v => {
        if (statusFilter === 'critical_3') return v.status === 'critical_3';
        if (statusFilter === 'warning') return v.status === 'warning_1_2' || v.status === 'critical_3';
        if (statusFilter === 'good') return v.status === 'good';
        if (statusFilter === 'recovering') return v.status === 'recovering';
        return true;
      })
      .filter(v => {
        if (!searchTerm.trim()) return true;
        const term = searchTerm.toLowerCase();
        return (
          v.placa.toLowerCase().includes(term) ||
          v.frota.toLowerCase().includes(term) ||
          v.motoristaPrincipal.toLowerCase().includes(term) ||
          v.operacao.toLowerCase().includes(term)
        );
      })
      .sort((a, b) => {
        let diff = 0;
        if (sortField === 'placa') diff = a.placa.localeCompare(b.placa);
        else if (sortField === 'frota') diff = a.frota.localeCompare(b.frota, undefined, { numeric: true });
        else if (sortField === 'motorista') diff = a.motoristaPrincipal.localeCompare(b.motoristaPrincipal);
        else if (sortField === 'overallKml') diff = a.overallKml - b.overallKml;
        else if (sortField === 'totalKm') diff = a.totalKm - b.totalKm;
        else if (sortField === 'consecutive') diff = a.consecutiveBelowCount - b.consecutiveBelowCount;
        else if (sortField.startsWith('week_')) {
          const wKey = sortField.replace('week_', '');
          const wA = a.weeklyMetrics.get(wKey)?.kml || 0;
          const wB = b.weeklyMetrics.get(wKey)?.kml || 0;
          diff = wA - wB;
        } else {
          diff = a.overallKml - b.overallKml;
        }
        return sortDir === 'asc' ? diff : -diff;
      });
  }, [vehicleProfiles, statusFilter, searchTerm, sortField, sortDir]);

  // Selected driver for individual perspective
  const selectedDriver = useMemo<DriverHistoryProfile | null>(() => {
    if (selectedDriverId) {
      const found = driverProfiles.find(d => d.id === selectedDriverId || d.name === selectedDriverId);
      if (found) return found;
    }
    const critical = driverProfiles.find(d => d.isRecurrentCase);
    return critical || driverProfiles[0] || null;
  }, [driverProfiles, selectedDriverId]);

  // Selected vehicle for individual perspective
  const selectedVehicle = useMemo<VehicleHistoryProfile | null>(() => {
    if (selectedVehicleId) {
      const found = vehicleProfiles.find(v => v.id === selectedVehicleId || v.placa === selectedVehicleId || v.frota === selectedVehicleId);
      if (found) return found;
    }
    const critical = vehicleProfiles.find(v => v.isRecurrentCase);
    return critical || vehicleProfiles[0] || null;
  }, [vehicleProfiles, selectedVehicleId]);

  // Individual Driver Weekly Chart Data
  const individualDriverChartData = useMemo(() => {
    if (!selectedDriver) return [];
    return displayedWeeks.map(w => {
      const m = selectedDriver.weeklyMetrics.get(w.key);
      let fKm = 0;
      let fLit = 0;
      driverProfiles.forEach(d => {
        const dm = d.weeklyMetrics.get(w.key);
        if (dm && dm.hasOperation) {
          fKm += dm.km;
          fLit += dm.litros;
        }
      });
      const fleetAvg = fLit > 0 ? Number((fKm / fLit).toFixed(2)) : null;

      return {
        semana: `Sem. ${w.weekNo}`,
        kml: m && m.kml > 0 ? m.kml : null,
        km: m ? m.km : 0,
        litros: m ? m.litros : 0,
        meta: effectiveMeta,
        frotaMedia: fleetAvg
      };
    });
  }, [selectedDriver, displayedWeeks, effectiveMeta, driverProfiles]);

  // Individual Vehicle Weekly Chart Data
  const individualVehicleChartData = useMemo(() => {
    if (!selectedVehicle) return [];
    return displayedWeeks.map(w => {
      const m = selectedVehicle.weeklyMetrics.get(w.key);
      let fKm = 0;
      let fLit = 0;
      vehicleProfiles.forEach(v => {
        const vm = v.weeklyMetrics.get(w.key);
        if (vm && vm.hasOperation) {
          fKm += vm.km;
          fLit += vm.litros;
        }
      });
      const fleetAvg = fLit > 0 ? Number((fKm / fLit).toFixed(2)) : null;

      return {
        semana: `Sem. ${w.weekNo}`,
        kml: m && m.kml > 0 ? m.kml : null,
        km: m ? m.km : 0,
        litros: m ? m.litros : 0,
        meta: effectiveMeta,
        frotaMedia: fleetAvg
      };
    });
  }, [selectedVehicle, displayedWeeks, effectiveMeta, vehicleProfiles]);

  // Chart Data: Week-by-Week comparison
  const chartData = useMemo(() => {
    return displayedWeeks.map(w => {
      const entry: any = {
        semana: `Sem. ${w.weekNo}`,
        meta: effectiveMeta
      };

      // Fleet average for this week
      let fKm = 0;
      let fLitros = 0;
      driverProfiles.forEach(d => {
        const m = d.weeklyMetrics.get(w.key);
        if (m && m.hasOperation) {
          fKm += m.km;
          fLitros += m.litros;
        }
      });
      entry['Média Frota'] = fLitros > 0 ? Number((fKm / fLitros).toFixed(2)) : null;

      // Plot selected drivers or vehicles
      if (activePerspective === 'drivers') {
        selectedChartIds.forEach(id => {
          const d = driverProfiles.find(item => item.id === id);
          if (d) {
            const m = d.weeklyMetrics.get(w.key);
            entry[d.name] = m && m.kml > 0 ? m.kml : null;
          }
        });
      } else {
        selectedChartIds.forEach(id => {
          const v = vehicleProfiles.find(item => item.id === id);
          if (v) {
            const m = v.weeklyMetrics.get(w.key);
            const label = `Frota ${v.frota} (${v.placa})`;
            entry[label] = m && m.kml > 0 ? m.kml : null;
          }
        });
      }

      return entry;
    });
  }, [displayedWeeks, effectiveMeta, driverProfiles, vehicleProfiles, selectedChartIds, activePerspective]);

  // Handle Sort Toggle
  const handleSortToggle = (field: string) => {
    if (sortField === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir(field === 'overallKml' ? 'asc' : 'desc');
    }
  };

  // Toggle selection for chart comparison
  const handleToggleChartSelect = (id: string) => {
    setSelectedChartIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(item => item !== id);
      } else {
        if (prev.length >= 4) {
          return [...prev.slice(1), id]; // keep max 4
        }
        return [...prev, id];
      }
    });
  };

  // Export Matrix or Individual Dossier to Excel (.xlsx)
  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    if (activePerspective === 'driver_individual' && selectedDriver) {
      const rows = selectedDriver.weeksList.map(w => {
        const vehs = selectedDriver.weeklyVehicles.get(w.key) || [];
        const vehStr = vehs.map(v => `${v.frota} (${v.placa}): ${v.km}km`).join('; ') || '-';
        return {
          'Condutor': selectedDriver.name,
          'Semana': w.shortLabel,
          'Ano': w.year,
          'Veículos Utilizados na Semana': vehStr,
          'KM Rodado': w.km,
          'Litros Consumidos': w.litros,
          'Média (km/L)': w.kml > 0 ? w.kml : '-',
          'Meta (km/L)': effectiveMeta,
          'Dias Ativos': w.activeDays,
          'Situação': w.hasOperation ? (w.kml >= effectiveMeta ? 'Conforme' : 'Abaixo da Meta') : 'Sem Operação'
        };
      });
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, 'Dossie Condutor');
      XLSX.writeFile(wb, `Dossie_Condutor_${selectedDriver.name.replace(/[^A-Z0-9]/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx`);
      return;
    }

    if (activePerspective === 'vehicle_individual' && selectedVehicle) {
      const rows = selectedVehicle.weeksList.map(w => {
        const drivers = selectedVehicle.weeklyDrivers.get(w.key) || [];
        const drivStr = drivers.map(d => `${d.driverName} (${d.percentKm}% - ${d.km}km)`).join('; ') || '-';
        return {
          'Frota': selectedVehicle.frota,
          'Placa': selectedVehicle.placa,
          'Condutor Principal': selectedVehicle.motoristaPrincipal,
          'Semana': w.shortLabel,
          'Ano': w.year,
          'Condutores da Semana': drivStr,
          'KM Rodado': w.km,
          'Litros Consumidos': w.litros,
          'Média (km/L)': w.kml > 0 ? w.kml : '-',
          'Meta (km/L)': effectiveMeta,
          'Dias Ativos': w.activeDays,
          'Situação': w.hasOperation ? (w.kml >= effectiveMeta ? 'Conforme' : 'Abaixo da Meta') : 'Sem Operação'
        };
      });
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, 'Dossie Placa');
      XLSX.writeFile(wb, `Dossie_Placa_${selectedVehicle.placa}_${new Date().toISOString().split('T')[0]}.xlsx`);
      return;
    }

    if (activePerspective === 'drivers') {
      const rows = filteredDrivers.map(d => {
        const row: any = {
          'Motorista': d.name,
          'Veículos Utilizados': d.frotas.join(', ') || d.placas.join(', '),
          'Operações': d.operacoes.join(', '),
          'KM Total': d.totalKm,
          'Litros Totais': d.totalLitros,
          'Média Geral (km/L)': d.overallKml,
          'Meta (km/L)': effectiveMeta,
          'Semanas Consecutivas < Meta': d.consecutiveBelowCount,
          'Status Operacional': d.statusLabel
        };
        displayedWeeks.forEach(w => {
          const m = d.weeklyMetrics.get(w.key);
          row[`Sem. ${w.weekNo} (km/L)`] = m && m.kml > 0 ? m.kml : '-';
          row[`Sem. ${w.weekNo} (KM)`] = m ? m.km : 0;
        });
        return row;
      });
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, 'Histórico Motoristas');
    } else if (activePerspective === 'vehicles') {
      const rows = filteredVehicles.map(v => {
        const row: any = {
          'Frota': v.frota,
          'Placa': v.placa,
          'Condutor Principal': v.motoristaPrincipal,
          'Regime Operacional': v.driverRegimeLabel,
          'Operação': v.operacao,
          'KM Total': v.totalKm,
          'Litros Totais': v.totalLitros,
          'Média Geral (km/L)': v.overallKml,
          'Meta (km/L)': effectiveMeta,
          'Semanas Consecutivas < Meta': v.consecutiveBelowCount,
          'Status Operacional': v.statusLabel
        };
        displayedWeeks.forEach(w => {
          const m = v.weeklyMetrics.get(w.key);
          row[`Sem. ${w.weekNo} (km/L)`] = m && m.kml > 0 ? m.kml : '-';
          row[`Sem. ${w.weekNo} (KM)`] = m ? m.km : 0;
        });
        return row;
      });
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, 'Histórico Veículos');
    } else {
      const rows = pairProfiles.map(p => {
        const row: any = {
          'Motorista': p.driverName,
          'Frota': p.frota,
          'Placa': p.placa,
          'Operação': p.operacao,
          'KM no Par': p.totalKm,
          'Litros no Par': p.totalLitros,
          'Média Par (km/L)': p.overallKml,
          'Meta (km/L)': effectiveMeta,
          'Semanas Consecutivas < Meta': p.consecutiveBelowCount,
          'Recorrência Crítica': p.isRecurrentCase ? 'SIM' : 'NÃO'
        };
        displayedWeeks.forEach(w => {
          const m = p.weeklyMetrics.get(w.key);
          row[`Sem. ${w.weekNo} (km/L)`] = m && m.kml > 0 ? m.kml : '-';
        });
        return row;
      });
      const ws = XLSX.utils.json_to_sheet(rows);
      XLSX.utils.book_append_sheet(wb, ws, 'Histórico Pares');
    }

    XLSX.writeFile(wb, `Historico_Medias_${activePerspective}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Export Consolidated Report to PDF (same corporate standard as other reports)
  const handleExportPdf = async () => {
    // If on individual driver tab, delegate to driver dossier PDF
    if (activePerspective === 'driver_individual') {
      if (selectedDriver) {
        await handleGenerateDriverPdf(selectedDriver, 'download');
        return;
      } else if (filteredDrivers.length > 0) {
        await handleGenerateDriverPdf(filteredDrivers[0], 'download');
        return;
      }
    }

    // If on individual vehicle tab, delegate to vehicle dossier PDF
    if (activePerspective === 'vehicle_individual') {
      if (selectedVehicle) {
        await handleGenerateVehiclePdf(selectedVehicle, 'download');
        return;
      } else if (filteredVehicles.length > 0) {
        await handleGenerateVehiclePdf(filteredVehicles[0], 'download');
        return;
      }
    }

    setIsExportingPdf(true);
    try {
      // Landscape orientation so all weekly evolution columns fit comfortably
      const doc = new jsPDF('l', 'mm', 'a4');
      const pageWidth = 297;
      const pageHeight = 210;
      const margin = 10;
      const dateStr = new Date().toLocaleString('pt-BR');
      const safePeriodo = cleanTextForPdf(periodoLabel || 'Consolidado');

      // Fetch base64 logo if available
      let logo64 = '';
      if (reportLogo) {
        try {
          logo64 = await getBase64FromUrl(getFullUrl(reportLogo));
        } catch {
          // ignore logo error
        }
      }

      // Perspectives configuration
      let reportTitle = 'Relatório de Histórico de Médias por Motorista';
      let tableHeaders: string[][] = [];
      let tableRows: any[][] = [];

      if (activePerspective === 'drivers') {
        reportTitle = 'Relatório de Histórico de Médias por Motorista';
        const baseHeaders = [
          'MOTORISTA',
          'VEÍCULOS',
          'KM TOTAL',
          'LITROS',
          'MÉDIA',
          'META',
          'SEM. < META',
          'SITUAÇÃO'
        ];
        const weekHeaders = displayedWeeks.map(w => `S.${w.weekNo}`);
        tableHeaders = [[...baseHeaders, ...weekHeaders]];

        tableRows = filteredDrivers.map(d => {
          const row = [
            cleanTextForPdf(d.name),
            cleanTextForPdf(d.frotas.slice(0, 3).join(', ') || d.placas.slice(0, 2).join(', ') || '-'),
            d.totalKm.toLocaleString('pt-BR'),
            d.totalLitros.toLocaleString('pt-BR'),
            d.overallKml > 0 ? `${d.overallKml.toFixed(2)}` : '-',
            effectiveMeta.toFixed(2),
            String(d.consecutiveBelowCount),
            cleanTextForPdf(d.statusLabel)
          ];
          displayedWeeks.forEach(w => {
            const m = d.weeklyMetrics.get(w.key);
            row.push(m && m.kml > 0 ? m.kml.toFixed(2) : '-');
          });
          return row;
        });
      } else if (activePerspective === 'vehicles') {
        reportTitle = 'Relatório de Histórico de Médias por Placa / Veículo';
        const baseHeaders = [
          'FROTA',
          'PLACA',
          'CONDUTOR PRINCIPAL',
          'OPERAÇÃO',
          'KM TOTAL',
          'LITROS',
          'MÉDIA',
          'META',
          'SEM. < META',
          'SITUAÇÃO'
        ];
        const weekHeaders = displayedWeeks.map(w => `S.${w.weekNo}`);
        tableHeaders = [[...baseHeaders, ...weekHeaders]];

        tableRows = filteredVehicles.map(v => {
          const row = [
            cleanTextForPdf(v.frota),
            cleanTextForPdf(v.placa),
            cleanTextForPdf(v.motoristaPrincipal || '-'),
            cleanTextForPdf(v.operacao || '-'),
            v.totalKm.toLocaleString('pt-BR'),
            v.totalLitros.toLocaleString('pt-BR'),
            v.overallKml > 0 ? `${v.overallKml.toFixed(2)}` : '-',
            effectiveMeta.toFixed(2),
            String(v.consecutiveBelowCount),
            cleanTextForPdf(v.statusLabel)
          ];
          displayedWeeks.forEach(w => {
            const m = v.weeklyMetrics.get(w.key);
            row.push(m && m.kml > 0 ? m.kml.toFixed(2) : '-');
          });
          return row;
        });
      } else {
        // pairs
        reportTitle = 'Relatório de Histórico de Médias - Motorista × Placa';
        const baseHeaders = [
          'MOTORISTA',
          'FROTA',
          'PLACA',
          'OPERAÇÃO',
          'KM NO PAR',
          'LITROS',
          'MÉDIA',
          'META',
          'SEM. < META',
          'RECORRENTE'
        ];
        const weekHeaders = displayedWeeks.map(w => `S.${w.weekNo}`);
        tableHeaders = [[...baseHeaders, ...weekHeaders]];

        tableRows = pairProfiles.map(p => {
          const row = [
            cleanTextForPdf(p.driverName),
            cleanTextForPdf(p.frota),
            cleanTextForPdf(p.placa),
            cleanTextForPdf(p.operacao || '-'),
            p.totalKm.toLocaleString('pt-BR'),
            p.totalLitros.toLocaleString('pt-BR'),
            p.overallKml > 0 ? `${p.overallKml.toFixed(2)}` : '-',
            effectiveMeta.toFixed(2),
            String(p.consecutiveBelowCount),
            p.isRecurrentCase ? 'SIM' : 'NÃO'
          ];
          displayedWeeks.forEach(w => {
            const m = p.weeklyMetrics.get(w.key);
            row.push(m && m.kml > 0 ? m.kml.toFixed(2) : '-');
          });
          return row;
        });
      }

      // Draw Corporate Header on pages
      const drawReportHeader = () => {
        // Slate-900 banner
        doc.setFillColor(15, 23, 42);
        doc.rect(0, 0, pageWidth, 28, 'F');

        // Emerald accent bar on left
        doc.setFillColor(16, 185, 129); // emerald-500
        doc.rect(0, 0, 4, 28, 'F');

        let textOffsetLeft = 10;
        if (logo64) {
          try {
            doc.addImage(logo64, 'PNG', 10, 4, 24, 12, undefined, 'FAST');
            textOffsetLeft = 38;
          } catch {
            textOffsetLeft = 10;
          }
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.setTextColor(255, 255, 255);
        doc.text(reportTitle, textOffsetLeft, 11);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184); // slate-400
        doc.text(
          `${companyName} • Gestão de Frotas & Auditoria Longitudinal • Gerado em: ${dateStr} • ERP: ${erpSystem}`,
          textOffsetLeft,
          17
        );

        // Sub badge bar
        const badgeWidth = pageWidth - textOffsetLeft - margin;
        doc.setFillColor(30, 41, 59); // slate-800
        doc.roundedRect(textOffsetLeft, 20, badgeWidth, 6, 1, 1, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.setTextColor(203, 213, 225);
        const metaText = `COMPETÊNCIA: ${safePeriodo.toUpperCase()}  |  META DE CONSUMO: ${effectiveMeta.toFixed(2)} km/L  |  TOTAL REGISTROS: ${tableRows.length}  |  CASOS CRÍTICOS (3+ SEM < META): ${globalStats.criticalCasesCount}`;
        doc.text(metaText, textOffsetLeft + 3, 24);
      };

      drawReportHeader();

      // Render Table with autoTable
      autoTable(doc, {
        head: tableHeaders,
        body: tableRows,
        startY: 32,
        margin: { left: margin, right: margin, bottom: 12 },
        theme: 'striped',
        headStyles: {
          fillColor: [15, 23, 42],
          textColor: [255, 255, 255],
          fontSize: 7,
          fontStyle: 'bold',
          halign: 'center',
          cellPadding: 2
        },
        styles: {
          fontSize: 6.5,
          cellPadding: 1.8,
          overflow: 'ellipsize'
        },
        columnStyles: {
          0: { halign: 'left', fontStyle: 'bold' }
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252]
        },
        didParseCell: (data) => {
          if (data.section === 'body') {
            const rawVal = data.cell.raw;
            const numVal = parseFloat(String(rawVal).replace(',', '.'));
            if (!isNaN(numVal) && numVal > 0 && numVal < effectiveMeta) {
              if (data.column.index >= 4) {
                data.cell.styles.textColor = [190, 18, 60]; // rose-700
                data.cell.styles.fontStyle = 'bold';
              }
            } else if (!isNaN(numVal) && numVal >= effectiveMeta && data.column.index >= 4) {
              data.cell.styles.textColor = [4, 120, 87]; // emerald-700
            }
          }
        },
        didDrawPage: (data) => {
          if (data.pageNumber > 1) {
            drawReportHeader();
          }

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(6.5);
          doc.setTextColor(148, 163, 184);
          doc.text(
            `${companyName} • Histórico de Média por Motorista e Placa • Desenvolvido por rbtecX`,
            margin,
            pageHeight - 4
          );
          doc.text(
            `Página ${data.pageNumber}`,
            pageWidth - margin,
            pageHeight - 4,
            { align: 'right' }
          );
        }
      });

      const dateFile = new Date().toISOString().split('T')[0];
      const filename = `Historico_Medias_${activePerspective}_${dateFile}.pdf`;
      doc.save(filename);
    } catch (err) {
      console.error('Erro ao gerar relatório em PDF:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Generate Executive Driver Dossier in PDF format
  const handleGenerateDriverPdf = async (
    targetDriver: DriverHistoryProfile,
    action: 'download' | 'print' = 'download',
    customOrientation?: 'portrait' | 'landscape'
  ) => {
    if (!targetDriver) return;
    setIsExportingPdf(true);

    try {
      const orientation = customOrientation || driverPdfOrientation;
      const isLandscape = orientation === 'landscape';
      const doc = new jsPDF(isLandscape ? 'l' : 'p', 'mm', 'a4');
      const pageWidth = isLandscape ? 297 : 210;
      const pageHeight = isLandscape ? 210 : 297;
      const margin = 12;
      const printableWidth = pageWidth - (margin * 2);
      const dateStr = new Date().toLocaleString('pt-BR');

      // Fetch base64 logo if available
      let logo64 = '';
      if (reportLogo) {
        try {
          logo64 = await getBase64FromUrl(getFullUrl(reportLogo));
        } catch {
          // ignore logo error
        }
      }

      // Draw Corporate Header function
      const drawCorporateHeader = () => {
        // Slate Header Banner
        doc.setFillColor(15, 23, 42); // slate-900
        doc.rect(0, 0, pageWidth, 35, 'F');

        // Indigo Accent Bar
        doc.setFillColor(99, 102, 241); // indigo-500
        doc.rect(0, 0, 5, 35, 'F');

        let textOffsetLeft = 14;
        if (logo64) {
          try {
            doc.addImage(logo64, 'PNG', 14, 5, 26, 14, undefined, 'FAST');
            textOffsetLeft = 44;
          } catch {
            textOffsetLeft = 14;
          }
        }

        // Title & Company info
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(isLandscape ? 13.5 : 12.5);
        doc.setTextColor(255, 255, 255);
        doc.text('Dossiê Individual de Desempenho do Condutor', textOffsetLeft, 13);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.2);
        doc.setTextColor(148, 163, 184); // slate-400
        doc.text(
          `${companyName} • Auditoria Operacional de Eficiência • Gerado em ${dateStr} • ERP: ${erpSystem}`,
          textOffsetLeft,
          19
        );

        // Sub-badge bar
        const badgeWidth = pageWidth - textOffsetLeft - margin;
        doc.setFillColor(30, 41, 59); // slate-800
        doc.roundedRect(textOffsetLeft, 23, badgeWidth, 7.5, 1.5, 1.5, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.8);
        doc.setTextColor(203, 213, 225); // slate-300
        doc.text(`COMPETÊNCIA: ${cleanTextForPdf(periodoLabel).toUpperCase()}`, textOffsetLeft + 3, 28);

        doc.setTextColor(56, 189, 248); // sky-400
        const driverNameTrunc = targetDriver.name.length > 28 ? targetDriver.name.slice(0, 26) + '...' : targetDriver.name;
        const centerOffset = textOffsetLeft + (badgeWidth * (isLandscape ? 0.38 : 0.42));
        doc.text(`CONDUTOR: ${driverNameTrunc}`, centerOffset, 28);

        doc.setTextColor(52, 211, 153); // emerald-400
        doc.text(`META OPERACIONAL: ${effectiveMeta.toFixed(2)} KM/L`, textOffsetLeft + badgeWidth - 4, 28, { align: 'right' });
      };

      drawCorporateHeader();
      let currentY = 40;

      // 1. QUADRO DE IDENTIFICAÇÃO DO CONDUTOR & STATUS GERAL
      const isRecurrent = targetDriver.isRecurrentCase;
      const isCompliant = targetDriver.overallKml >= effectiveMeta;
      const statusColor: [number, number, number] = isRecurrent
        ? [220, 38, 38] // red-600
        : isCompliant
        ? [16, 185, 129] // emerald-600
        : [217, 119, 6]; // amber-600

      const idBoxHeight = 16;
      doc.setFillColor(248, 250, 252); // slate-50
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.setLineWidth(0.3);
      doc.roundedRect(margin, currentY, printableWidth, idBoxHeight, 1.5, 1.5, 'FD');

      // Left status bar
      doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
      doc.rect(margin, currentY, 3.5, idBoxHeight, 'F');

      // Driver Name
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42); // slate-900
      doc.text(cleanTextForPdf(targetDriver.name), margin + 6, currentY + 5.5);

      // Status Pill
      const statusText = isRecurrent
        ? 'CRÍTICO / RECORRENTE (3+ SEMANAS CONSECUTIVAS ABAIXO DA META)'
        : isCompliant
        ? 'CONFORME (ATINGIU A META OPERACIONAL)'
        : 'ATENÇÃO (ABAIXO DA META OPERACIONAL)';

      doc.setFontSize(6.5);
      doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
      doc.text(`STATUS: ${statusText}`, margin + 6, currentY + 10);

      // Operations and Vehicles subtext
      const opsText = targetDriver.operacoes.length > 0 ? targetDriver.operacoes.join(', ') : 'Operação Padrão';
      const vecsText = targetDriver.frotas.length > 0
        ? targetDriver.frotas.map(f => `Frota ${f}`).join(', ')
        : (targetDriver.placas.join(', ') || 'Diversos');

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.2);
      doc.setTextColor(100, 116, 139); // slate-500
      const detailStr = `Operações: ${opsText} • Frotas/Placas: ${vecsText} • Dias de Condução: ${targetDriver.activeDaysCount} dias`;
      doc.text(cleanTextForPdf(detailStr), margin + 6, currentY + 14);

      currentY += idBoxHeight + 3.5;

      // 2. CARDS DE INDICADORES EXECUTIVOS (KPIS)
      if (includeDriverKpis) {
        const cardCount = 4;
        const cardGap = 3.5;
        const cardWidth = (printableWidth - (cardGap * (cardCount - 1))) / cardCount;
        const cardHeight = 14;

        const kmlDiff = effectiveMeta > 0 ? ((targetDriver.overallKml - effectiveMeta) / effectiveMeta) * 100 : 0;
        const kmlDiffStr = targetDriver.overallKml > 0 ? `${kmlDiff >= 0 ? '+' : ''}${kmlDiff.toFixed(1)}% vs meta` : '-';

        const kpis = [
          {
            label: 'MÉDIA DO CONDUTOR',
            val: targetDriver.overallKml > 0 ? `${targetDriver.overallKml.toFixed(2)} km/L` : '-',
            sub: `Meta: ${effectiveMeta.toFixed(2)} (${kmlDiffStr})`,
            color: isCompliant ? [240, 253, 244] : [255, 241, 242],
            border: isCompliant ? [187, 247, 208] : [254, 205, 211],
            textCol: isCompliant ? [21, 128, 61] : [190, 18, 60]
          },
          {
            label: 'QUILOMETRAGEM TOTAL',
            val: `${targetDriver.totalKm.toLocaleString('pt-BR')} km`,
            sub: `${targetDriver.weeksList.length} semanas registradas`,
            color: [238, 242, 255],
            border: [199, 210, 254],
            textCol: [67, 56, 202]
          },
          {
            label: 'COMBUSTÍVEL CONSUMIDO',
            val: `${targetDriver.totalLitros.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} L`,
            sub: 'Volume consolidado e rateado',
            color: [254, 242, 242],
            border: [254, 202, 202],
            textCol: [185, 28, 28]
          },
          {
            label: 'RECORRÊNCIA RECENTE',
            val: `${targetDriver.consecutiveBelowCount}x semana(s)`,
            sub: isRecurrent ? 'Exige Plano de Ação Imediato' : 'Dentro do limite tolerável',
            color: isRecurrent ? [254, 226, 226] : [241, 245, 249],
            border: isRecurrent ? [248, 113, 113] : [203, 213, 225],
            textCol: isRecurrent ? [185, 28, 28] : [30, 41, 59]
          }
        ];

        kpis.forEach((kpi, idx) => {
          const cardX = margin + (idx * (cardWidth + cardGap));
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
          doc.text(kpi.val, cardX + 3, currentY + 8.5);

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(5.2);
          doc.setTextColor(100, 116, 139);
          doc.text(kpi.sub, cardX + 3, currentY + 12.2);
        });

        currentY += cardHeight + 3.5;
      }

      // 3. DIRETRIZES OPERACIONAIS E DIAGNÓSTICO INDIVIDUAL
      if (includeDriverGuidelines) {
        const guidelineBoxHeight = isRecurrent ? 15 : 12;
        doc.setFillColor(isRecurrent ? 254 : (isCompliant ? 240 : 255), isRecurrent ? 242 : (isCompliant ? 253 : 251), isRecurrent ? 242 : (isCompliant ? 244 : 235));
        doc.setDrawColor(isRecurrent ? 254 : (isCompliant ? 187 : 253), isRecurrent ? 202 : (isCompliant ? 247 : 230), isRecurrent ? 202 : (isCompliant ? 208 : 138));
        doc.setLineWidth(0.3);
        doc.roundedRect(margin, currentY, printableWidth, guidelineBoxHeight, 1.2, 1.2, 'FD');

        doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
        doc.rect(margin, currentY, 2.5, guidelineBoxHeight, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.8);
        doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
        doc.text(
          isRecurrent
            ? 'DIRETRIZ CORPORATIVA DE RECORRÊNCIA (PLANO DE AÇÃO IMEDIATO):'
            : isCompliant
            ? 'DIRETRIZ DE EFICIÊNCIA ENERGÉTICA E CONDUÇÃO ECONÔMICA (CONFORME):'
            : 'DIRETRIZ DE ACOMPANHAMENTO PREVENTIVO DE CONSUMO:',
          margin + 5,
          currentY + 4
        );

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(5.8);
        doc.setTextColor(51, 65, 85);

        const guidelineMsg = isRecurrent
          ? `O condutor acumulou ${targetDriver.consecutiveBelowCount} semanas consecutivas com consumo abaixo da meta corporativa (${effectiveMeta.toFixed(2)} km/L). É obrigatória a abertura imediata de Plano de Ação, convocação para reciclagem prática com a instrutoria de tráfego, auditoria de RPM em telemetria e inspeção mecânica dos veículos habituais.`
          : isCompliant
          ? `O condutor mantém desempenho de consumo alinhado ou superior à meta operacional (${effectiveMeta.toFixed(2)} km/L), demonstrando domínio das boas práticas de condução econômica (aproveitamento de inércia, rotação na faixa verde e baixo tempo em marcha lenta).`
          : `O condutor registrou consumo abaixo da meta operacional (${effectiveMeta.toFixed(2)} km/L) sem reincidência de 3 semanas consecutivas. Recomenda-se orientação preventiva de tráfego e acompanhamento do hodômetro semanal.`;

        const splitText = doc.splitTextToSize(guidelineMsg, printableWidth - 8);
        doc.text(splitText, margin + 5, currentY + 7.5);

        currentY += guidelineBoxHeight + 3.5;
      }

      // 4. TABELA ANALÍTICA SEMANA A SEMANA (DESEMPENHO INDIVIDUAL)
      if (includeDriverWeeklyTable) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.8);
        doc.setTextColor(15, 23, 42);
        doc.text(`Histórico Semanal de Desempenho e Veículos Operados (${targetDriver.weeksList.length} semanas)`, margin, currentY);
        currentY += 2;

        const tableHead = [
          ['Semana', 'Veículos Utilizados na Semana', 'KM Rodado', 'Litros', 'Média', 'Meta', 'Desvio', 'Dias', 'Situação']
        ];

        const tableBody: any[] = targetDriver.weeksList.map(w => {
          const vehs = targetDriver.weeklyVehicles?.get(w.key) || [];
          const vehStr = vehs.length > 0
            ? vehs.map(v => `${v.frota} (${v.placa}): ${v.km}km`).join('\n')
            : '-';
          const diff = w.kml > 0 ? Number((((w.kml - effectiveMeta) / effectiveMeta) * 100).toFixed(1)) : 0;
          const diffStr = w.kml > 0 ? `${diff >= 0 ? '+' : ''}${diff}%` : '-';
          const situacao = !w.hasOperation
            ? 'Sem Operação'
            : (w.kml >= effectiveMeta ? 'Conforme' : 'Abaixo da Meta');

          return [
            w.label,
            vehStr,
            w.km > 0 ? `${w.km.toLocaleString('pt-BR')} km` : '-',
            w.litros > 0 ? `${w.litros.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} L` : '-',
            w.kml > 0 ? `${w.kml.toFixed(2)} km/L` : '-',
            `${effectiveMeta.toFixed(2)}`,
            diffStr,
            w.activeDays > 0 ? `${w.activeDays}d` : '-',
            situacao
          ];
        });

        // Add summary footer row to body
        const diffGlobal = effectiveMeta > 0 ? ((targetDriver.overallKml - effectiveMeta) / effectiveMeta) * 100 : 0;
        const diffGlobalStr = targetDriver.overallKml > 0 ? `${diffGlobal >= 0 ? '+' : ''}${diffGlobal.toFixed(1)}%` : '-';
        const situacaoGlobal = targetDriver.overallKml >= effectiveMeta
          ? 'Conforme'
          : (targetDriver.isRecurrentCase ? 'Crítico (Recorrente)' : 'Abaixo da Meta');

        tableBody.push([
          'TOTAIS / MÉDIA DO PERÍODO',
          `${targetDriver.frotas.length} veículos operados`,
          `${targetDriver.totalKm.toLocaleString('pt-BR')} km`,
          `${targetDriver.totalLitros.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} L`,
          targetDriver.overallKml > 0 ? `${targetDriver.overallKml.toFixed(2)} km/L` : '-',
          `${effectiveMeta.toFixed(2)}`,
          diffGlobalStr,
          `${targetDriver.activeDaysCount}d`,
          situacaoGlobal
        ]);

        const columnStylesPortrait: any = {
          0: { fontStyle: 'bold', cellWidth: 32 },
          1: { cellWidth: 50 },
          2: { halign: 'right', cellWidth: 18 },
          3: { halign: 'right', cellWidth: 18 },
          4: { halign: 'right', fontStyle: 'bold', cellWidth: 18 },
          5: { halign: 'center', cellWidth: 14 },
          6: { halign: 'center', fontStyle: 'bold', cellWidth: 14 },
          7: { halign: 'center', cellWidth: 10 },
          8: { halign: 'center', fontStyle: 'bold', cellWidth: 12 }
        };

        const columnStylesLandscape: any = {
          0: { fontStyle: 'bold', cellWidth: 42 },
          1: { cellWidth: 85 },
          2: { halign: 'right', cellWidth: 24 },
          3: { halign: 'right', cellWidth: 24 },
          4: { halign: 'right', fontStyle: 'bold', cellWidth: 24 },
          5: { halign: 'center', cellWidth: 20 },
          6: { halign: 'center', fontStyle: 'bold', cellWidth: 20 },
          7: { halign: 'center', cellWidth: 16 },
          8: { halign: 'center', fontStyle: 'bold', cellWidth: 18 }
        };

        autoTable(doc, {
          startY: currentY,
          head: tableHead,
          body: tableBody,
          theme: 'grid',
          tableWidth: printableWidth,
          headStyles: {
            fillColor: [15, 23, 42],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: isLandscape ? 6.8 : 6.2,
            halign: 'center',
            cellPadding: 1.5
          },
          styles: {
            fontSize: isLandscape ? 6.5 : 5.8,
            cellPadding: isLandscape ? 1.6 : 1.3,
            textColor: [30, 41, 59],
            lineColor: [226, 232, 240],
            lineWidth: 0.1
          },
          alternateRowStyles: {
            fillColor: [248, 250, 252]
          },
          columnStyles: isLandscape ? columnStylesLandscape : columnStylesPortrait,
          margin: { top: 40, bottom: 12, left: margin, right: margin },
          didParseCell: (data) => {
            // Summary row styling (last row)
            if (data.row.index === tableBody.length - 1) {
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.fillColor = [226, 232, 240];
              data.cell.styles.textColor = [15, 23, 42];
            }
            // Column 4 (Média)
            if (data.column.index === 4 && data.section === 'body') {
              const textVal = String(data.cell.raw || '');
              const num = parseFloat(textVal.replace(' km/L', '').replace(',', '.'));
              if (!isNaN(num) && num > 0) {
                if (num < effectiveMeta) {
                  data.cell.styles.textColor = [220, 38, 38];
                } else {
                  data.cell.styles.textColor = [22, 163, 74];
                }
              }
            }
            // Column 6 (Desvio)
            if (data.column.index === 6 && data.section === 'body') {
              const textVal = String(data.cell.raw || '');
              if (textVal.startsWith('-')) {
                data.cell.styles.textColor = [220, 38, 38];
              } else if (textVal.startsWith('+')) {
                data.cell.styles.textColor = [22, 163, 74];
              }
            }
            // Column 8 (Situação)
            if (data.column.index === 8 && data.section === 'body') {
              const textVal = String(data.cell.raw || '');
              if (textVal.includes('Abaixo') || textVal.includes('Crítico')) {
                data.cell.styles.textColor = [185, 28, 28];
              } else if (textVal.includes('Conforme')) {
                data.cell.styles.textColor = [21, 128, 61];
              }
            }
          },
          didDrawPage: (data) => {
            if (data.pageNumber > 1) {
              drawCorporateHeader();
            }
          }
        });

        currentY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 5 : currentY + 20;
      }

      // 5. CONSOLIDADO DE VEÍCULOS CONDUZIDOS NO PERÍODO
      if (includeDriverVehiclesBreakdown) {
        const vehAggMap = new Map<string, { frota: string; placa: string; km: number; litros: number }>();
        if (targetDriver.weeklyVehicles) {
          targetDriver.weeklyVehicles.forEach((vList) => {
            vList.forEach(v => {
              const vKey = v.placa || v.frota || 'OUTRO';
              if (!vehAggMap.has(vKey)) {
                vehAggMap.set(vKey, { frota: v.frota, placa: v.placa, km: 0, litros: 0 });
              }
              const rec = vehAggMap.get(vKey)!;
              rec.km += v.km;
              rec.litros += v.litros;
            });
          });
        }

        const vehAggList = Array.from(vehAggMap.values()).sort((a, b) => b.km - a.km);

        if (vehAggList.length > 0) {
          // Check if we need a new page for vehicle table
          if (currentY > pageHeight - 45) {
            doc.addPage();
            drawCorporateHeader();
            currentY = 40;
          }

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(7.8);
          doc.setTextColor(15, 23, 42);
          doc.text(`Consolidado por Veículo / Placa Conduzida pelo Motorista (${vehAggList.length} veículos)`, margin, currentY);
          currentY += 2;

          const vehTableHead = [
            ['Frota', 'Placa', 'KM Conduzido', 'Litros Consumidos', 'Média Obtida', '% do KM Total', 'Status vs Meta']
          ];

          const vehTableBody = vehAggList.map(v => {
            const vKml = v.litros > 0 && v.km > 0 ? (v.km / v.litros) : 0;
            const pct = targetDriver.totalKm > 0 ? Math.round((v.km / targetDriver.totalKm) * 100) : 0;
            const diff = vKml > 0 ? Number((((vKml - effectiveMeta) / effectiveMeta) * 100).toFixed(1)) : 0;
            const diffStr = vKml > 0 ? `${diff >= 0 ? '+' : ''}${diff}%` : '-';
            const statusStr = vKml >= effectiveMeta ? 'Conforme' : (vKml > 0 ? 'Abaixo da Meta' : '-');

            return [
              `Frota ${v.frota}`,
              v.placa || '-',
              `${v.km.toLocaleString('pt-BR')} km`,
              `${v.litros.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} L`,
              vKml > 0 ? `${vKml.toFixed(2)} km/L` : '-',
              `${pct}%`,
              `${statusStr} (${diffStr})`
            ];
          });

          autoTable(doc, {
            startY: currentY,
            head: vehTableHead,
            body: vehTableBody,
            theme: 'grid',
            tableWidth: printableWidth,
            headStyles: {
              fillColor: [30, 41, 59],
              textColor: [255, 255, 255],
              fontStyle: 'bold',
              fontSize: isLandscape ? 6.5 : 6.0,
              halign: 'center',
              cellPadding: 1.4
            },
            styles: {
              fontSize: isLandscape ? 6.2 : 5.6,
              cellPadding: isLandscape ? 1.4 : 1.2,
              textColor: [30, 41, 59],
              lineColor: [226, 232, 240],
              lineWidth: 0.1
            },
            columnStyles: {
              0: { fontStyle: 'bold', cellWidth: isLandscape ? 35 : 25 },
              1: { fontStyle: 'bold', cellWidth: isLandscape ? 35 : 25 },
              2: { halign: 'right', cellWidth: isLandscape ? 35 : 25 },
              3: { halign: 'right', cellWidth: isLandscape ? 35 : 25 },
              4: { halign: 'right', fontStyle: 'bold', cellWidth: isLandscape ? 35 : 25 },
              5: { halign: 'center', cellWidth: isLandscape ? 30 : 20 },
              6: { halign: 'center', cellWidth: isLandscape ? 68 : 41 }
            },
            margin: { top: 40, bottom: 12, left: margin, right: margin },
            didDrawPage: (data) => {
              if (data.pageNumber > 1) {
                drawCorporateHeader();
              }
            }
          });

          currentY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 6 : currentY + 20;
        }
      }

      // 6. BLOCO FORMAL DE ASSINATURAS CORPORATIVAS
      if (includeDriverSignatures) {
        if (currentY > pageHeight - 34) {
          doc.addPage();
          drawCorporateHeader();
          currentY = 42;
        }

        const sigBoxHeight = 24;
        doc.setFillColor(250, 250, 250);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.roundedRect(margin, currentY, printableWidth, sigBoxHeight, 1.5, 1.5, 'FD');

        doc.setFont('helvetica', 'italic');
        doc.setFontSize(5.5);
        doc.setTextColor(100, 116, 139);
        doc.text(
          'Declaro ter ciência dos indicadores de consumo apurados neste dossiê e das diretrizes de condução econômica da empresa.',
          margin + 4,
          currentY + 4
        );

        const sigColWidth = (printableWidth - 16) / 3;
        const lineY = currentY + 15;

        // Signatures 1, 2, 3
        const sigs = [
          { title: 'Supervisão / Gestão de Frota', sub: 'Assinatura & Carimbo' },
          { title: 'Instrutoria Técnica / CCO', sub: 'Auditoria de Condução' },
          { title: `Condutor: ${targetDriver.name}`, sub: 'Ciência do Condutor' }
        ];

        sigs.forEach((s, idx) => {
          const sX = margin + 4 + (idx * (sigColWidth + 4));
          doc.setDrawColor(148, 163, 184);
          doc.setLineWidth(0.2);
          doc.line(sX, lineY, sX + sigColWidth, lineY);

          doc.setFont('helvetica', 'bold');
          doc.setFontSize(5.8);
          doc.setTextColor(30, 41, 59);
          const truncTitle = s.title.length > 32 ? s.title.slice(0, 30) + '...' : s.title;
          doc.text(truncTitle, sX + (sigColWidth / 2), lineY + 3.5, { align: 'center' });

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(4.8);
          doc.setTextColor(100, 116, 139);
          doc.text(s.sub, sX + (sigColWidth / 2), lineY + 6.5, { align: 'center' });
        });
      }

      // Final Page Numbering and Footer Watermark on all pages
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.2);
        doc.setTextColor(148, 163, 184); // slate-400
        doc.text(
          `${companyName} • Dossiê Individual do Condutor • Confidencial - Controle Operacional de Frota`,
          margin,
          pageHeight - 5
        );
        doc.text(
          `Página ${i} de ${totalPages}`,
          pageWidth - margin,
          pageHeight - 5,
          { align: 'right' }
        );
      }

      const safeName = targetDriver.name.replace(/[^A-Z0-9]/gi, '_').slice(0, 30);
      const dateFile = new Date().toISOString().split('T')[0];
      const filename = `Dossie_Condutor_${safeName}_${dateFile}.pdf`;

      if (action === 'print') {
        const pdfBlob = doc.output('blob');
        const blobUrl = URL.createObjectURL(pdfBlob);
        const printWindow = window.open(blobUrl, '_blank');
        if (printWindow) {
          printWindow.focus();
        } else {
          doc.save(filename);
        }
      } else {
        doc.save(filename);
      }

      setShowDriverPdfModal(false);
    } catch (err) {
      console.error('Error generating driver dossier PDF:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Generate Executive Vehicle Dossier in PDF format
  const handleGenerateVehiclePdf = async (
    targetVehicle: VehicleHistoryProfile,
    action: 'download' | 'print' = 'download',
    customOrientation?: 'portrait' | 'landscape'
  ) => {
    if (!targetVehicle) return;
    setIsExportingPdf(true);

    try {
      const orientation = customOrientation || vehiclePdfOrientation;
      const isLandscape = orientation === 'landscape';
      const doc = new jsPDF(isLandscape ? 'l' : 'p', 'mm', 'a4');
      const pageWidth = isLandscape ? 297 : 210;
      const pageHeight = isLandscape ? 210 : 297;
      const margin = 12;
      const printableWidth = pageWidth - (margin * 2);
      const dateStr = new Date().toLocaleString('pt-BR');

      let logo64 = '';
      if (reportLogo) {
        try {
          logo64 = await getBase64FromUrl(getFullUrl(reportLogo));
        } catch {
          // ignore logo error
        }
      }

      const drawCorporateHeader = () => {
        doc.setFillColor(15, 23, 42); // slate-900
        doc.rect(0, 0, pageWidth, 35, 'F');

        doc.setFillColor(6, 182, 212); // cyan-500
        doc.rect(0, 0, 5, 35, 'F');

        let textOffsetLeft = 14;
        if (logo64) {
          try {
            doc.addImage(logo64, 'PNG', 14, 5, 26, 14, undefined, 'FAST');
            textOffsetLeft = 44;
          } catch {
            textOffsetLeft = 14;
          }
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(isLandscape ? 13.5 : 12.5);
        doc.setTextColor(255, 255, 255);
        doc.text('Dossiê Individual de Desempenho da Placa / Veículo', textOffsetLeft, 13);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.2);
        doc.setTextColor(148, 163, 184);
        doc.text(
          `${companyName} • Auditoria Operacional de Eficiência • Gerado em ${dateStr} • ERP: ${erpSystem}`,
          textOffsetLeft,
          19
        );

        const badgeWidth = pageWidth - textOffsetLeft - margin;
        doc.setFillColor(30, 41, 59);
        doc.roundedRect(textOffsetLeft, 23, badgeWidth, 7.5, 1.5, 1.5, 'F');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.8);
        doc.setTextColor(203, 213, 225);
        doc.text(`COMPETÊNCIA: ${cleanTextForPdf(periodoLabel).toUpperCase()}`, textOffsetLeft + 3, 28);

        doc.setTextColor(56, 189, 248);
        const centerOffset = textOffsetLeft + (badgeWidth * (isLandscape ? 0.38 : 0.42));
        doc.text(`FROTA: ${targetVehicle.frota} (${targetVehicle.placa})`, centerOffset, 28);

        doc.setTextColor(52, 211, 153);
        doc.text(`META OPERACIONAL: ${effectiveMeta.toFixed(2)} KM/L`, textOffsetLeft + badgeWidth - 4, 28, { align: 'right' });
      };

      drawCorporateHeader();
      let currentY = 40;

      const isRecurrent = targetVehicle.isRecurrentCase;
      const isCompliant = targetVehicle.overallKml >= effectiveMeta;
      const statusColor: [number, number, number] = isRecurrent
        ? [220, 38, 38]
        : isCompliant
        ? [16, 185, 129]
        : [217, 119, 6];

      const idBoxHeight = 16;
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.roundedRect(margin, currentY, printableWidth, idBoxHeight, 1.5, 1.5, 'FD');

      doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
      doc.rect(margin, currentY, 3.5, idBoxHeight, 'F');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`Frota ${targetVehicle.frota} • Placa ${targetVehicle.placa}`, margin + 6, currentY + 5.5);

      const statusText = isRecurrent
        ? 'CRÍTICO / RECORRENTE (3+ SEMANAS CONSECUTIVAS ABAIXO DA META)'
        : isCompliant
        ? 'CONFORME (ATINGIU A META OPERACIONAL)'
        : 'ATENÇÃO (ABAIXO DA META OPERACIONAL)';

      doc.setFontSize(6.5);
      doc.setTextColor(statusColor[0], statusColor[1], statusColor[2]);
      doc.text(`STATUS: ${statusText}`, margin + 6, currentY + 10);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.2);
      doc.setTextColor(100, 116, 139);
      const detailStr = `Titular: ${targetVehicle.motoristaPrincipal} • Regime: ${targetVehicle.driverRegimeLabel} • Operação: ${targetVehicle.operacao} • Dias: ${targetVehicle.activeDaysCount}d`;
      doc.text(cleanTextForPdf(detailStr), margin + 6, currentY + 14);

      currentY += idBoxHeight + 3.5;

      if (includeVehicleKpis) {
        const cardCount = 4;
        const cardGap = 3.5;
        const cardWidth = (printableWidth - (cardGap * (cardCount - 1))) / cardCount;
        const cardHeight = 14;

        const kmlDiff = effectiveMeta > 0 ? ((targetVehicle.overallKml - effectiveMeta) / effectiveMeta) * 100 : 0;
        const kmlDiffStr = targetVehicle.overallKml > 0 ? `${kmlDiff >= 0 ? '+' : ''}${kmlDiff.toFixed(1)}% vs meta` : '-';

        const kpis = [
          {
            label: 'MÉDIA DO VEÍCULO',
            val: targetVehicle.overallKml > 0 ? `${targetVehicle.overallKml.toFixed(2)} km/L` : '-',
            sub: `Meta: ${effectiveMeta.toFixed(2)} (${kmlDiffStr})`,
            color: isCompliant ? [240, 253, 244] : [255, 241, 242],
            border: isCompliant ? [187, 247, 208] : [254, 205, 211],
            textCol: isCompliant ? [21, 128, 61] : [190, 18, 60]
          },
          {
            label: 'QUILOMETRAGEM TOTAL',
            val: `${targetVehicle.totalKm.toLocaleString('pt-BR')} km`,
            sub: `${targetVehicle.weeksList.length} semanas registradas`,
            color: [238, 242, 255],
            border: [199, 210, 254],
            textCol: [67, 56, 202]
          },
          {
            label: 'COMBUSTÍVEL CONSUMIDO',
            val: `${targetVehicle.totalLitros.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} L`,
            sub: 'Volume apurado e abastecido',
            color: [254, 242, 242],
            border: [254, 202, 202],
            textCol: [185, 28, 28]
          },
          {
            label: 'RECORRÊNCIA RECENTE',
            val: `${targetVehicle.consecutiveBelowCount}x semana(s)`,
            sub: isRecurrent ? 'Exige Plano de Ação Imediato' : 'Dentro do limite tolerável',
            color: isRecurrent ? [254, 226, 226] : [241, 245, 249],
            border: isRecurrent ? [248, 113, 113] : [203, 213, 225],
            textCol: isRecurrent ? [185, 28, 28] : [30, 41, 59]
          }
        ];

        kpis.forEach((kpi, idx) => {
          const cardX = margin + (idx * (cardWidth + cardGap));
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
          doc.text(kpi.val, cardX + 3, currentY + 8.5);

          doc.setFont('helvetica', 'normal');
          doc.setFontSize(5.2);
          doc.setTextColor(100, 116, 139);
          doc.text(kpi.sub, cardX + 3, currentY + 12.2);
        });

        currentY += cardHeight + 3.5;
      }

      if (includeVehicleWeeklyTable) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.8);
        doc.setTextColor(15, 23, 42);
        doc.text(`Histórico Semanal da Placa ${targetVehicle.placa} e Condutores (${targetVehicle.weeksList.length} semanas)`, margin, currentY);
        currentY += 2;

        const tableHead = [
          ['Semana', 'Condutores da Semana', 'KM Rodado', 'Litros', 'Média', 'Meta', 'Desvio', 'Dias', 'Situação']
        ];

        const tableBody: any[] = targetVehicle.weeksList.map(w => {
          const drivers = targetVehicle.weeklyDrivers?.get(w.key) || [];
          const drivStr = drivers.length > 0
            ? drivers.map(d => `${d.driverName} (${d.percentKm}% - ${d.km}km)`).join('\n')
            : '-';
          const diff = w.kml > 0 ? Number((((w.kml - effectiveMeta) / effectiveMeta) * 100).toFixed(1)) : 0;
          const diffStr = w.kml > 0 ? `${diff >= 0 ? '+' : ''}${diff}%` : '-';
          const situacao = !w.hasOperation
            ? 'Sem Operação'
            : (w.kml >= effectiveMeta ? 'Conforme' : 'Abaixo da Meta');

          return [
            w.label,
            drivStr,
            w.km > 0 ? `${w.km.toLocaleString('pt-BR')} km` : '-',
            w.litros > 0 ? `${w.litros.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} L` : '-',
            w.kml > 0 ? `${w.kml.toFixed(2)} km/L` : '-',
            `${effectiveMeta.toFixed(2)}`,
            diffStr,
            w.activeDays > 0 ? `${w.activeDays}d` : '-',
            situacao
          ];
        });

        const diffGlobal = effectiveMeta > 0 ? ((targetVehicle.overallKml - effectiveMeta) / effectiveMeta) * 100 : 0;
        const diffGlobalStr = targetVehicle.overallKml > 0 ? `${diffGlobal >= 0 ? '+' : ''}${diffGlobal.toFixed(1)}%` : '-';
        const situacaoGlobal = targetVehicle.overallKml >= effectiveMeta
          ? 'Conforme'
          : (targetVehicle.isRecurrentCase ? 'Crítico (Recorrente)' : 'Abaixo da Meta');

        tableBody.push([
          'TOTAIS / MÉDIA DO PERÍODO',
          `${targetVehicle.motoristaPrincipal} (e outros)`,
          `${targetVehicle.totalKm.toLocaleString('pt-BR')} km`,
          `${targetVehicle.totalLitros.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} L`,
          targetVehicle.overallKml > 0 ? `${targetVehicle.overallKml.toFixed(2)} km/L` : '-',
          `${effectiveMeta.toFixed(2)}`,
          diffGlobalStr,
          `${targetVehicle.activeDaysCount}d`,
          situacaoGlobal
        ]);

        const columnStylesPortrait: any = {
          0: { fontStyle: 'bold', cellWidth: 32 },
          1: { cellWidth: 50 },
          2: { halign: 'right', cellWidth: 18 },
          3: { halign: 'right', cellWidth: 18 },
          4: { halign: 'right', fontStyle: 'bold', cellWidth: 18 },
          5: { halign: 'center', cellWidth: 14 },
          6: { halign: 'center', fontStyle: 'bold', cellWidth: 14 },
          7: { halign: 'center', cellWidth: 10 },
          8: { halign: 'center', fontStyle: 'bold', cellWidth: 12 }
        };

        const columnStylesLandscape: any = {
          0: { fontStyle: 'bold', cellWidth: 42 },
          1: { cellWidth: 85 },
          2: { halign: 'right', cellWidth: 24 },
          3: { halign: 'right', cellWidth: 24 },
          4: { halign: 'right', fontStyle: 'bold', cellWidth: 24 },
          5: { halign: 'center', cellWidth: 20 },
          6: { halign: 'center', fontStyle: 'bold', cellWidth: 20 },
          7: { halign: 'center', cellWidth: 16 },
          8: { halign: 'center', fontStyle: 'bold', cellWidth: 18 }
        };

        autoTable(doc, {
          startY: currentY,
          head: tableHead,
          body: tableBody,
          theme: 'grid',
          tableWidth: printableWidth,
          headStyles: {
            fillColor: [15, 23, 42],
            textColor: [255, 255, 255],
            fontStyle: 'bold',
            fontSize: isLandscape ? 6.8 : 6.2,
            halign: 'center',
            cellPadding: 1.5
          },
          styles: {
            fontSize: isLandscape ? 6.5 : 5.8,
            cellPadding: isLandscape ? 1.6 : 1.3,
            textColor: [30, 41, 59],
            lineColor: [226, 232, 240],
            lineWidth: 0.1
          },
          alternateRowStyles: {
            fillColor: [248, 250, 252]
          },
          columnStyles: isLandscape ? columnStylesLandscape : columnStylesPortrait,
          margin: { top: 40, bottom: 12, left: margin, right: margin },
          didParseCell: (data) => {
            if (data.row.index === tableBody.length - 1) {
              data.cell.styles.fontStyle = 'bold';
              data.cell.styles.fillColor = [226, 232, 240];
              data.cell.styles.textColor = [15, 23, 42];
            }
            if (data.column.index === 4 && data.section === 'body') {
              const textVal = String(data.cell.raw || '');
              const num = parseFloat(textVal.replace(' km/L', '').replace(',', '.'));
              if (!isNaN(num) && num > 0) {
                if (num < effectiveMeta) {
                  data.cell.styles.textColor = [220, 38, 38];
                } else {
                  data.cell.styles.textColor = [22, 163, 74];
                }
              }
            }
          },
          didDrawPage: (data) => {
            if (data.pageNumber > 1) {
              drawCorporateHeader();
            }
          }
        });

        currentY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 6 : currentY + 20;
      }

      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(6.2);
        doc.setTextColor(148, 163, 184);
        doc.text(
          `${companyName} • Dossiê Individual da Placa • Confidencial - Controle Operacional de Frota`,
          margin,
          pageHeight - 5
        );
        doc.text(
          `Página ${i} de ${totalPages}`,
          pageWidth - margin,
          pageHeight - 5,
          { align: 'right' }
        );
      }

      const filename = `Dossie_Placa_${targetVehicle.placa}_${new Date().toISOString().split('T')[0]}.pdf`;

      if (action === 'print') {
        const pdfBlob = doc.output('blob');
        const blobUrl = URL.createObjectURL(pdfBlob);
        const printWindow = window.open(blobUrl, '_blank');
        if (printWindow) {
          printWindow.focus();
        } else {
          doc.save(filename);
        }
      } else {
        doc.save(filename);
      }

      setShowVehiclePdfModal(false);
    } catch (err) {
      console.error('Error generating vehicle dossier PDF:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Helper color for km/L vs meta
  const getKmlBadgeColor = (kml: number) => {
    if (kml <= 0) return 'text-slate-400 bg-slate-100 border-slate-200';
    if (kml >= effectiveMeta) return 'text-emerald-700 bg-emerald-50 border-emerald-300 font-black';
    if (kml >= effectiveMeta * 0.95) return 'text-amber-700 bg-amber-50 border-amber-300 font-bold';
    return 'text-rose-700 bg-rose-50 border-rose-300 font-black';
  };

  // Chart color palette for lines
  const lineColors = ['#0284c7', '#8b5cf6', '#ea580c', '#10b981', '#f43f5e'];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner & Control Deck */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-indigo-600 via-purple-700 to-slate-900 text-white rounded-2xl shadow-md shadow-indigo-600/20">
              <Layers size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl md:text-2xl font-black text-slate-900 tracking-tight">
                  HISTÓRICO DE MÉDIA POR MOTORISTA E PLACA
                </h2>
                <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-800 font-black text-[10px] uppercase tracking-wider rounded-full border border-indigo-300">
                  Evolução Semanal
                </span>
                {globalStats.criticalCasesCount > 0 && (
                  <span className="px-2.5 py-0.5 bg-rose-100 text-rose-800 font-black text-[10px] uppercase tracking-wider rounded-full border border-rose-300 flex items-center gap-1">
                    <AlertTriangle size={11} className="text-rose-600" />
                    {globalStats.criticalCasesCount} Casos com 3+ Semanas Abaixo
                  </span>
                )}
              </div>
              <p className="text-xs md:text-sm text-slate-500 mt-1">
                Acompanhamento longitudinal de consumo (km/L) semana a semana, auditoria de persistência e análise comparativa condutor vs. veículo.
              </p>
            </div>
          </div>
        </div>

        {/* View Switcher Tabs & Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap self-start lg:self-auto">
          <div className="bg-slate-100 p-1.5 rounded-2xl flex items-center gap-1 border border-slate-200 flex-wrap">
            <button
              type="button"
              onClick={() => {
                setActivePerspective('drivers');
                setSelectedChartIds([]);
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                activePerspective === 'drivers'
                  ? 'bg-white text-indigo-900 shadow-md transform scale-[1.02]'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users size={14} />
              <span>Por Motorista ({globalStats.totalDrivers})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActivePerspective('driver_individual');
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                activePerspective === 'driver_individual'
                  ? 'bg-indigo-600 text-white shadow-md transform scale-[1.02]'
                  : 'text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100'
              }`}
            >
              <User size={14} />
              <span>Motorista Individual</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActivePerspective('vehicles');
                setSelectedChartIds([]);
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                activePerspective === 'vehicles'
                  ? 'bg-white text-indigo-900 shadow-md transform scale-[1.02]'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Truck size={14} />
              <span>Por Placa ({globalStats.totalVehicles})</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActivePerspective('vehicle_individual');
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                activePerspective === 'vehicle_individual'
                  ? 'bg-indigo-600 text-white shadow-md transform scale-[1.02]'
                  : 'text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100'
              }`}
            >
              <Car size={14} />
              <span>Placa Individual</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActivePerspective('pairs');
                setSelectedChartIds([]);
              }}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                activePerspective === 'pairs'
                  ? 'bg-white text-indigo-900 shadow-md transform scale-[1.02]'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Activity size={14} />
              <span>Motorista × Placa ({pairProfiles.length})</span>
            </button>
          </div>

          {onNavigateToActionPlan && (
            <button
              type="button"
              onClick={onNavigateToActionPlan}
              className="flex items-center gap-2 px-3.5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md shadow-emerald-600/20 cursor-pointer active:scale-95 transition-all"
              title="Abrir Central do Plano de Ação"
            >
              <ClipboardCheck size={14} />
              <span>Ir para Plano de Ação</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
            title="Exportar dados históricos para planilha Excel"
          >
            <FileSpreadsheet size={14} className="text-emerald-600" />
            <span className="hidden sm:inline">Exportar Excel</span>
          </button>

          <button
            type="button"
            onClick={handleExportPdf}
            disabled={isExportingPdf}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-emerald-600/20 active:scale-95 disabled:opacity-50"
            title="Salvar Relatório em formato PDF (mesmo padrão dos outros relatórios)"
          >
            {isExportingPdf ? (
              <Loader2 size={14} className="animate-spin text-white" />
            ) : (
              <Download size={14} className="text-white" />
            )}
            <span className="hidden sm:inline">{isExportingPdf ? 'Gerando...' : 'Salvar PDF'}</span>
          </button>
        </div>
      </div>

      {/* 4 KPI Dashboard Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Média Global da Frota</span>
            <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
              <Fuel size={16} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{globalStats.fleetAvgKml.toFixed(2)}</span>
            <span className="text-xs font-bold text-slate-500">km/L</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Volume auditado: {globalStats.totalLitros.toLocaleString('pt-BR')} L
          </span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Meta Operacional</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Sliders size={16} />
            </div>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <input 
              type="number" 
              step="0.05"
              min="1.0"
              max="10.0"
              value={effectiveMeta}
              onChange={(e) => setEffectiveMeta(parseFloat(e.target.value) || 2.70)}
              className="w-20 px-2 py-1 bg-slate-50 border border-slate-300 rounded-lg text-emerald-700 font-black text-lg text-center focus:ring-2 focus:ring-emerald-500 outline-none"
            />
            <span className="text-xs font-bold text-slate-500">km/L</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            Ajustável para simulação
          </span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Casos Críticos (3+ Semanas)</span>
            <div className={`p-2 rounded-xl ${globalStats.criticalCasesCount > 0 ? 'bg-rose-50 text-rose-600' : 'bg-emerald-50 text-emerald-600'}`}>
              <ShieldAlert size={16} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className={`text-2xl font-black ${globalStats.criticalCasesCount > 0 ? 'text-rose-600' : 'text-emerald-600'}`}>
              {globalStats.criticalCasesCount}
            </span>
            <span className="text-xs font-bold text-slate-500">condutores/veículos</span>
          </div>
          <span className="text-[11px] text-rose-600 font-bold mt-1 block">
            Elegíveis para Plano de Ação
          </span>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-xs relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Taxa de Conformidade</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <Award size={16} />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-purple-700">{globalStats.complianceRate}%</span>
            <span className="text-xs font-bold text-slate-500">dentro da meta</span>
          </div>
          <span className="text-[11px] text-slate-500 mt-1 block">
            {globalStats.totalDrivers} condutores monitorados
          </span>
        </div>
      </div>

      {/* Comparison Evolution Chart & Search/Filters (Visible for consolidated perspectives: drivers, vehicles, pairs) */}
      {(activePerspective === 'drivers' || activePerspective === 'vehicles' || activePerspective === 'pairs') && (
        <>
          {/* Comparison Evolution Chart (Recharts) */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm md:text-base font-black text-slate-900 flex items-center gap-2">
              <TrendingUp size={18} className="text-indigo-600" />
              Evolução Temporal de Médias de Consumo (km/L)
            </h3>
            <p className="text-xs text-slate-500">
              {selectedChartIds.length > 0 
                ? `Comparando ${selectedChartIds.length} item(ns) selecionado(s) com a Média da Frota e Meta Operacional.`
                : 'Selecione motoristas ou placas na tabela abaixo para plotar linhas individuais e comparar desempenhos.'}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-bold">Janela de Semanas:</span>
            <select
              value={maxWeeksRange}
              onChange={(e) => setMaxWeeksRange(parseInt(e.target.value, 10))}
              className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 font-bold focus:ring-2 focus:ring-indigo-500"
            >
              <option value={4}>Últimas 4 Semanas</option>
              <option value={8}>Últimas 8 Semanas</option>
              <option value={12}>Últimas 12 Semanas</option>
              <option value={0}>Todas as Semanas ({chronologicalWeeks.length})</option>
            </select>
            {selectedChartIds.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedChartIds([])}
                className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                Limpar Gráfico
              </button>
            )}
          </div>
        </div>

        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="semana" stroke="#64748b" tick={{ fontSize: 11, fontWeight: 'bold' }} />
              <YAxis domain={['auto', 'auto']} stroke="#64748b" tick={{ fontSize: 11 }} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderRadius: '12px',
                  color: '#fff',
                  border: 'none',
                  fontSize: '12px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)'
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
              
              {/* Meta line */}
              <ReferenceLine
                y={effectiveMeta}
                stroke="#ef4444"
                strokeDasharray="4 4"
                label={{ value: `Meta: ${effectiveMeta.toFixed(2)} km/L`, fill: '#ef4444', fontSize: 11, fontWeight: 'bold' }}
              />

              {/* Fleet average */}
              <Line
                type="monotone"
                dataKey="Média Frota"
                stroke="#10b981"
                strokeWidth={3}
                dot={{ r: 4, fill: '#10b981' }}
                activeDot={{ r: 6 }}
              />

              {/* Selected Driver or Vehicle lines */}
              {activePerspective === 'drivers' ? (
                selectedChartIds.map((id, idx) => {
                  const d = driverProfiles.find(item => item.id === id);
                  if (!d) return null;
                  return (
                    <Line
                      key={id}
                      type="monotone"
                      dataKey={d.name}
                      stroke={lineColors[idx % lineColors.length]}
                      strokeWidth={2.5}
                      dot={{ r: 4 }}
                    />
                  );
                })
              ) : (
                selectedChartIds.map((id, idx) => {
                  const v = vehicleProfiles.find(item => item.id === id);
                  if (!v) return null;
                  const label = `Frota ${v.frota} (${v.placa})`;
                  return (
                    <Line
                      key={id}
                      type="monotone"
                      dataKey={label}
                      stroke={lineColors[idx % lineColors.length]}
                      strokeWidth={2.5}
                      dot={{ r: 4 }}
                    />
                  );
                })
              )}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-3xl p-4 md:p-5 border border-slate-200/90 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative w-full sm:w-80">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={
                activePerspective === 'drivers'
                  ? 'Buscar por condutor, frota ou placa...'
                  : 'Buscar por placa, frota, condutor ou linha...'
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* Status Filter Buttons */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs">
            <button
              type="button"
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                statusFilter === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('critical_3')}
              className={`px-3 py-1.5 rounded-lg font-black transition-all cursor-pointer flex items-center gap-1 ${
                statusFilter === 'critical_3' ? 'bg-rose-600 text-white shadow-xs' : 'text-rose-600 hover:bg-rose-50'
              }`}
            >
              <AlertTriangle size={12} />
              <span>3+ Semanas Abaixo ({globalStats.criticalCasesCount})</span>
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('warning')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                statusFilter === 'warning' ? 'bg-amber-500 text-white shadow-xs' : 'text-amber-700 hover:bg-amber-50'
              }`}
            >
              Abaixo na Última
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('good')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                statusFilter === 'good' ? 'bg-emerald-600 text-white shadow-xs' : 'text-emerald-700 hover:bg-emerald-50'
              }`}
            >
              Conformes
            </button>
          </div>
        </div>

          <div className="text-xs text-slate-400 font-medium">
            Exibindo{' '}
            <strong className="text-slate-800 font-bold">
              {activePerspective === 'drivers'
                ? `${filteredDrivers.length} de ${driverProfiles.length}`
                : activePerspective === 'vehicles'
                ? `${filteredVehicles.length} de ${vehicleProfiles.length}`
                : `${pairProfiles.length}`}
            </strong>{' '}
            registros
          </div>
        </div>
        </>
      )}

      {/* MATRIX TABLE: PERSPECTIVE 1 - DRIVERS */}
      {activePerspective === 'drivers' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-900 text-white font-bold text-[11px] uppercase tracking-wider select-none">
                <tr>
                  <th className="py-3.5 px-3 text-center w-10">Gráfico</th>
                  <th
                    onClick={() => handleSortToggle('name')}
                    className="py-3.5 px-4 cursor-pointer hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Condutor / Motorista</span>
                      <ArrowUpDown size={12} className="opacity-40" />
                    </div>
                  </th>
                  <th className="py-3.5 px-3">Veículos Operados</th>
                  <th
                    onClick={() => handleSortToggle('totalKm')}
                    className="py-3.5 px-3 text-right cursor-pointer hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>KM Total</span>
                      <ArrowUpDown size={12} className="opacity-40" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSortToggle('overallKml')}
                    className="py-3.5 px-3 text-right cursor-pointer hover:bg-slate-800 transition-colors bg-slate-800"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Média Global</span>
                      <ArrowUpDown size={12} className="opacity-60" />
                    </div>
                  </th>
                  
                  {/* Dynamic Week Columns */}
                  {displayedWeeks.map(w => (
                    <th
                      key={w.key}
                      onClick={() => handleSortToggle(`week_${w.key}`)}
                      className="py-3.5 px-2.5 text-center cursor-pointer hover:bg-slate-800 transition-colors border-l border-slate-800 min-w-[85px]"
                    >
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] text-cyan-300">Sem. {w.weekNo}</span>
                        <span className="text-[9px] text-slate-400 font-normal">{w.year}</span>
                      </div>
                    </th>
                  ))}

                  <th
                    onClick={() => handleSortToggle('consecutive')}
                    className="py-3.5 px-3.5 text-center cursor-pointer hover:bg-slate-800 transition-colors border-l border-slate-800"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>Recorrência</span>
                      <ArrowUpDown size={12} className="opacity-40" />
                    </div>
                  </th>
                  <th className="py-3.5 px-3 text-center">Ações</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredDrivers.length === 0 ? (
                  <tr>
                    <td colSpan={7 + displayedWeeks.length} className="py-12 text-center text-slate-400">
                      Nenhum motorista encontrado com os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  filteredDrivers.map(d => {
                    const isSelected = selectedChartIds.includes(d.id);
                    return (
                      <tr
                        key={d.id}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          d.isRecurrentCase ? 'bg-rose-50/30' : ''
                        }`}
                      >
                        <td className="py-3 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleChartSelect(d.id)}
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            title="Selecionar para o gráfico de comparação"
                          />
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-black text-slate-900">{d.name}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {d.operacoes.slice(0, 2).join(' • ') || 'Operação Geral'}
                          </div>
                        </td>
                        <td className="py-3 px-3">
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {d.frotas.slice(0, 3).map((f, i) => (
                              <span
                                key={i}
                                className="px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-bold border border-slate-200"
                              >
                                Frota {f}
                              </span>
                            ))}
                            {d.frotas.length > 3 && (
                              <span className="text-[10px] text-slate-400 font-bold self-center">
                                +{d.frotas.length - 3}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-right font-medium text-slate-700">
                          {d.totalKm.toLocaleString('pt-BR')} km
                        </td>
                        <td className="py-3 px-3 text-right bg-slate-50/50">
                          <span
                            className={`px-2 py-0.5 rounded-lg border text-xs ${getKmlBadgeColor(d.overallKml)}`}
                          >
                            {d.overallKml.toFixed(2)} km/L
                          </span>
                        </td>

                        {/* Week-by-Week Data Cells */}
                        {displayedWeeks.map(w => {
                          const m = d.weeklyMetrics.get(w.key);
                          if (!m || !m.hasOperation || m.kml <= 0) {
                            return (
                              <td key={w.key} className="py-3 px-2 text-center text-slate-300 border-l border-slate-100">
                                -
                              </td>
                            );
                          }
                          return (
                            <td
                              key={w.key}
                              className="py-2.5 px-2 text-center border-l border-slate-100"
                            >
                              <div
                                className={`px-2 py-1 rounded-lg border text-[11px] inline-block ${getKmlBadgeColor(m.kml)}`}
                                title={`KM: ${m.km.toLocaleString('pt-BR')} | Litros: ${m.litros}L | Dias: ${m.activeDays}`}
                              >
                                {m.kml.toFixed(2)}
                              </div>
                              <div className="text-[9px] text-slate-400 mt-0.5">
                                {m.km} km
                              </div>
                            </td>
                          );
                        })}

                        <td className="py-3 px-3.5 text-center border-l border-slate-100">
                          {d.isRecurrentCase ? (
                            <span className="px-2.5 py-1 bg-rose-600 text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 shadow-xs">
                              <AlertTriangle size={11} />
                              <span>{d.consecutiveBelowCount}x Seguidas</span>
                            </span>
                          ) : d.consecutiveBelowCount > 0 ? (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-[10px] font-bold">
                              {d.consecutiveBelowCount}x Abaixo
                            </span>
                          ) : d.status === 'recovering' ? (
                            <span className="px-2 py-0.5 bg-sky-100 text-sky-800 border border-sky-300 rounded-lg text-[10px] font-bold">
                              Recuperando
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1">
                              <CheckCircle2 size={11} className="text-emerald-600" />
                              <span>Conforme</span>
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedDriverId(d.id);
                                setActivePerspective('driver_individual');
                              }}
                              className="p-1.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white rounded-lg transition-colors cursor-pointer"
                              title="Abrir Dossiê Individual deste Condutor"
                            >
                              <User size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setPdfTargetDriver(d);
                                setShowDriverPdfModal(true);
                              }}
                              className="p-1.5 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white rounded-lg transition-colors cursor-pointer"
                              title={`Salvar Dossiê em PDF de ${d.name}`}
                            >
                              <FileText size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDrilldownItem({ type: 'driver', data: d })}
                              className="p-1.5 bg-slate-100 hover:bg-indigo-100 text-slate-600 hover:text-indigo-800 rounded-lg transition-colors cursor-pointer"
                              title="Ver ficha resumida"
                            >
                              <Eye size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MATRIX TABLE: PERSPECTIVE 2 - VEHICLES / PLATES */}
      {activePerspective === 'vehicles' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-900 text-white font-bold text-[11px] uppercase tracking-wider select-none">
                <tr>
                  <th className="py-3.5 px-3 text-center w-10">Gráfico</th>
                  <th
                    onClick={() => handleSortToggle('frota')}
                    className="py-3.5 px-3.5 cursor-pointer hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Frota / Placa</span>
                      <ArrowUpDown size={12} className="opacity-40" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSortToggle('motorista')}
                    className="py-3.5 px-3.5 cursor-pointer hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Condutor Principal & Regime</span>
                      <ArrowUpDown size={12} className="opacity-40" />
                    </div>
                  </th>
                  <th className="py-3.5 px-3">Operação</th>
                  <th
                    onClick={() => handleSortToggle('totalKm')}
                    className="py-3.5 px-3 text-right cursor-pointer hover:bg-slate-800 transition-colors"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>KM Total</span>
                      <ArrowUpDown size={12} className="opacity-40" />
                    </div>
                  </th>
                  <th
                    onClick={() => handleSortToggle('overallKml')}
                    className="py-3.5 px-3 text-right cursor-pointer hover:bg-slate-800 transition-colors bg-slate-800"
                  >
                    <div className="flex items-center justify-end gap-1">
                      <span>Média Global</span>
                      <ArrowUpDown size={12} className="opacity-60" />
                    </div>
                  </th>

                  {/* Dynamic Week Columns */}
                  {displayedWeeks.map(w => (
                    <th
                      key={w.key}
                      onClick={() => handleSortToggle(`week_${w.key}`)}
                      className="py-3.5 px-2.5 text-center cursor-pointer hover:bg-slate-800 transition-colors border-l border-slate-800 min-w-[85px]"
                    >
                      <div className="flex flex-col items-center">
                        <span className="text-[10px] text-cyan-300">Sem. {w.weekNo}</span>
                        <span className="text-[9px] text-slate-400 font-normal">{w.year}</span>
                      </div>
                    </th>
                  ))}

                  <th
                    onClick={() => handleSortToggle('consecutive')}
                    className="py-3.5 px-3.5 text-center cursor-pointer hover:bg-slate-800 transition-colors border-l border-slate-800"
                  >
                    <div className="flex items-center justify-center gap-1">
                      <span>Recorrência</span>
                      <ArrowUpDown size={12} className="opacity-40" />
                    </div>
                  </th>
                  <th className="py-3.5 px-3 text-center">Ações</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-100">
                {filteredVehicles.length === 0 ? (
                  <tr>
                    <td colSpan={8 + displayedWeeks.length} className="py-12 text-center text-slate-400">
                      Nenhum veículo encontrado com os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  filteredVehicles.map(v => {
                    const isSelected = selectedChartIds.includes(v.id);
                    return (
                      <tr
                        key={v.id}
                        className={`hover:bg-slate-50/80 transition-colors ${
                          v.isRecurrentCase ? 'bg-rose-50/30' : ''
                        }`}
                      >
                        <td className="py-3 px-3 text-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleChartSelect(v.id)}
                            className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            title="Selecionar para o gráfico de comparação"
                          />
                        </td>
                        <td className="py-3 px-3.5">
                          <div className="font-black text-slate-900 text-xs">Frota {v.frota}</div>
                          <div className="text-[11px] font-mono text-cyan-800 font-bold">{v.placa}</div>
                        </td>
                        <td className="py-3 px-3.5">
                          <div className="font-bold text-slate-800">{v.motoristaPrincipal}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{v.driverRegimeLabel}</div>
                        </td>
                        <td className="py-3 px-3 text-slate-600 font-medium">
                          {v.operacao}
                        </td>
                        <td className="py-3 px-3 text-right font-medium text-slate-700">
                          {v.totalKm.toLocaleString('pt-BR')} km
                        </td>
                        <td className="py-3 px-3 text-right bg-slate-50/50">
                          <span
                            className={`px-2 py-0.5 rounded-lg border text-xs ${getKmlBadgeColor(v.overallKml)}`}
                          >
                            {v.overallKml.toFixed(2)} km/L
                          </span>
                        </td>

                        {/* Week-by-Week Data Cells */}
                        {displayedWeeks.map(w => {
                          const m = v.weeklyMetrics.get(w.key);
                          if (!m || !m.hasOperation || m.kml <= 0) {
                            return (
                              <td key={w.key} className="py-3 px-2 text-center text-slate-300 border-l border-slate-100">
                                -
                              </td>
                            );
                          }
                          return (
                            <td
                              key={w.key}
                              className="py-2.5 px-2 text-center border-l border-slate-100"
                            >
                              <div
                                className={`px-2 py-1 rounded-lg border text-[11px] inline-block ${getKmlBadgeColor(m.kml)}`}
                                title={`KM: ${m.km.toLocaleString('pt-BR')} | Litros: ${m.litros}L | Dias: ${m.activeDays}`}
                              >
                                {m.kml.toFixed(2)}
                              </div>
                              <div className="text-[9px] text-slate-400 mt-0.5">
                                {m.km} km
                              </div>
                            </td>
                          );
                        })}

                        <td className="py-3 px-3.5 text-center border-l border-slate-100">
                          {v.isRecurrentCase ? (
                            <span className="px-2.5 py-1 bg-rose-600 text-white rounded-lg text-[10px] font-black uppercase tracking-wider flex items-center justify-center gap-1 shadow-xs">
                              <AlertTriangle size={11} />
                              <span>{v.consecutiveBelowCount}x Seguidas</span>
                            </span>
                          ) : v.consecutiveBelowCount > 0 ? (
                            <span className="px-2 py-0.5 bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-[10px] font-bold">
                              {v.consecutiveBelowCount}x Abaixo
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-[10px] font-bold flex items-center justify-center gap-1">
                              <CheckCircle2 size={11} className="text-emerald-600" />
                              <span>Conforme</span>
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedVehicleId(v.id);
                                setActivePerspective('vehicle_individual');
                              }}
                              className="p-1.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white rounded-lg transition-colors cursor-pointer"
                              title="Abrir Dossiê Individual desta Placa"
                            >
                              <Car size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setPdfTargetVehicle(v);
                                setShowVehiclePdfModal(true);
                              }}
                              className="p-1.5 bg-cyan-50 hover:bg-cyan-600 text-cyan-700 hover:text-white rounded-lg transition-colors cursor-pointer"
                              title={`Salvar Dossiê em PDF da Placa ${v.placa}`}
                            >
                              <FileText size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setDrilldownItem({ type: 'vehicle', data: v })}
                              className="p-1.5 bg-slate-100 hover:bg-indigo-100 text-slate-600 hover:text-indigo-800 rounded-lg transition-colors cursor-pointer"
                              title="Ver ficha resumida"
                            >
                              <Eye size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MATRIX TABLE: PERSPECTIVE 3 - PAIRS (DRIVER X VEHICLE) */}
      {activePerspective === 'pairs' && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-900 text-white font-bold text-[11px] uppercase tracking-wider select-none">
                <tr>
                  <th className="py-3.5 px-4">Condutor</th>
                  <th className="py-3.5 px-3">Veículo / Placa</th>
                  <th className="py-3.5 px-3">Operação</th>
                  <th className="py-3.5 px-3 text-right">KM no Par</th>
                  <th className="py-3.5 px-3 text-right bg-slate-800">Média Par</th>
                  {displayedWeeks.map(w => (
                    <th key={w.key} className="py-3.5 px-2 text-center border-l border-slate-800 min-w-[75px]">
                      <span className="text-[10px] text-cyan-300">Sem. {w.weekNo}</span>
                    </th>
                  ))}
                  <th className="py-3.5 px-3 text-center border-l border-slate-800">Recorrência</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pairProfiles.map(p => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-bold text-slate-900">{p.driverName}</td>
                    <td className="py-3 px-3">
                      <span className="font-bold text-slate-800">Frota {p.frota}</span>
                      <span className="text-slate-400 ml-1">({p.placa})</span>
                    </td>
                    <td className="py-3 px-3 text-slate-600">{p.operacao}</td>
                    <td className="py-3 px-3 text-right font-medium">{p.totalKm.toLocaleString('pt-BR')} km</td>
                    <td className="py-3 px-3 text-right bg-slate-50/50">
                      <span className={`px-2 py-0.5 rounded-lg border text-xs ${getKmlBadgeColor(p.overallKml)}`}>
                        {p.overallKml.toFixed(2)} km/L
                      </span>
                    </td>
                    {displayedWeeks.map(w => {
                      const m = p.weeklyMetrics.get(w.key);
                      return (
                        <td key={w.key} className="py-3 px-2 text-center border-l border-slate-100">
                          {m && m.kml > 0 ? (
                            <span className={`px-1.5 py-0.5 rounded text-[10px] border ${getKmlBadgeColor(m.kml)}`}>
                              {m.kml.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                      );
                    })}
                    <td className="py-3 px-3 text-center border-l border-slate-100">
                      {p.isRecurrentCase ? (
                        <span className="px-2 py-0.5 bg-rose-600 text-white rounded text-[10px] font-black">
                          {p.consecutiveBelowCount}x Seguidas
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[10px]">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* INDIVIDUAL PERSPECTIVE: MOTORISTA INDIVIDUAL */}
      {activePerspective === 'driver_individual' && selectedDriver && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Individual Driver Selector & Controls Deck */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                <User size={24} />
              </div>
              <div className="flex-1">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Selecionar Condutor para Análise Individual
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <select
                    value={selectedDriver.id}
                    onChange={(e) => setSelectedDriverId(e.target.value)}
                    className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-black text-slate-900 focus:ring-2 focus:ring-indigo-500 w-full sm:w-80 cursor-pointer"
                  >
                    {driverProfiles.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.name} — {d.overallKml.toFixed(2)} km/L {d.isRecurrentCase ? '⚠️ (3+ sem < meta)' : ''}
                      </option>
                    ))}
                  </select>

                  {/* Quick Filters */}
                  {driverProfiles.some(d => d.isRecurrentCase) && (
                    <button
                      type="button"
                      onClick={() => {
                        const nextCrit = driverProfiles.find(d => d.isRecurrentCase && d.id !== selectedDriver.id) || driverProfiles.find(d => d.isRecurrentCase);
                        if (nextCrit) setSelectedDriverId(nextCrit.id);
                      }}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <AlertTriangle size={12} />
                      <span>Ver Crítico (3+ Semanas)</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setActivePerspective('drivers')}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Ver Matriz de Todos os Motoristas
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleExportExcel}
                className="flex items-center gap-2 px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-xs"
                title="Exportar dossiê deste condutor para planilha Excel (.xlsx)"
              >
                <FileSpreadsheet size={14} className="text-emerald-600" />
                <span>Exportar Excel</span>
              </button>

              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => handleGenerateDriverPdf(selectedDriver, 'download')}
                  disabled={isExportingPdf}
                  className="flex items-center gap-2 px-3.5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-l-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-xs disabled:opacity-50"
                  title="Salvar Dossiê Oficial deste Condutor em formato PDF diretamente"
                >
                  {isExportingPdf ? (
                    <Loader2 size={14} className="animate-spin text-white" />
                  ) : (
                    <FileText size={14} className="text-white" />
                  )}
                  <span>Salvar PDF (Dossiê)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPdfTargetDriver(selectedDriver);
                    setShowDriverPdfModal(true);
                  }}
                  className="px-2.5 py-2.5 bg-rose-700 hover:bg-rose-800 text-white border-l border-rose-500 rounded-r-xl transition-all cursor-pointer shadow-xs"
                  title="Configurar opções e imprimir Dossiê em PDF"
                >
                  <Sliders size={13} />
                </button>
              </div>
            </div>
          </div>

          {/* Selected Driver Profile Header & KPI Cards */}
          <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-md">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 bg-indigo-500/30 text-indigo-300 text-[10px] font-black uppercase tracking-wider rounded-md border border-indigo-400/30">
                    Dossiê Individual do Condutor
                  </span>
                  <span className={`px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-md border ${
                    selectedDriver.isRecurrentCase
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : selectedDriver.overallKml >= effectiveMeta
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  }`}>
                    {selectedDriver.statusLabel}
                  </span>
                </div>
                <h3 className="text-2xl md:text-3xl font-black text-white mt-2">
                  {selectedDriver.name}
                </h3>
                <div className="flex items-center gap-4 text-xs text-slate-300 mt-2 flex-wrap">
                  <div>
                    <span className="text-slate-400">Operações:</span>{' '}
                    <strong className="text-white">{selectedDriver.operacoes.join(', ') || 'Geral'}</strong>
                  </div>
                  <div className="h-3 w-px bg-slate-700 hidden sm:block" />
                  <div>
                    <span className="text-slate-400">Veículos / Placas Utilizadas:</span>{' '}
                    <strong className="text-cyan-300">
                      {selectedDriver.frotas.map(f => `Frota ${f}`).join(', ') || selectedDriver.placas.join(', ') || 'N/D'}
                    </strong>
                  </div>
                </div>
              </div>

              {/* 4 Driver KPI Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full lg:w-auto">
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-300 block">Média Geral</span>
                  <div className="text-xl font-black mt-0.5 flex items-center justify-center gap-1">
                    <span className={selectedDriver.overallKml >= effectiveMeta ? 'text-emerald-400' : 'text-rose-400'}>
                      {selectedDriver.overallKml.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-slate-300 font-normal">km/L</span>
                  </div>
                  <span className="text-[9px] text-slate-400 mt-0.5 block">
                    Meta: {effectiveMeta.toFixed(2)} km/L
                  </span>
                </div>

                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-300 block">KM Total</span>
                  <div className="text-xl font-black text-white mt-0.5">
                    {selectedDriver.totalKm.toLocaleString('pt-BR')}
                  </div>
                  <span className="text-[9px] text-slate-400 mt-0.5 block">km rodados</span>
                </div>

                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-300 block">Combustível</span>
                  <div className="text-xl font-black text-white mt-0.5">
                    {selectedDriver.totalLitros.toLocaleString('pt-BR')}
                  </div>
                  <span className="text-[9px] text-slate-400 mt-0.5 block">litros consumidos</span>
                </div>

                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-300 block">Recorrência</span>
                  <div className={`text-xl font-black mt-0.5 ${
                    selectedDriver.isRecurrentCase ? 'text-rose-400' : 'text-emerald-400'
                  }`}>
                    {selectedDriver.consecutiveBelowCount}x
                  </div>
                  <span className="text-[9px] text-slate-400 mt-0.5 block">
                    {selectedDriver.isRecurrentCase ? 'Plano de Ação' : 'Abaixo da meta'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Individual Driver Weekly Line Chart */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <TrendingUp size={16} className="text-indigo-600" />
                  Evolução Semanal do Condutor ({selectedDriver.name}) vs. Meta e Frota
                </h4>
                <p className="text-xs text-slate-500">
                  Acompanhe a curva de consumo do motorista semana a semana em comparação com a meta operacional ({effectiveMeta.toFixed(2)} km/L) e a média da frota.
                </p>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={individualDriverChartData} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="semana" stroke="#64748b" tick={{ fontSize: 11, fontWeight: 'bold' }} />
                  <YAxis domain={['auto', 'auto']} stroke="#64748b" tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '12px',
                      color: '#fff',
                      border: 'none',
                      fontSize: '12px',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  
                  {/* Meta Reference Line */}
                  <ReferenceLine
                    y={effectiveMeta}
                    stroke="#ef4444"
                    strokeDasharray="4 4"
                    label={{ value: `Meta: ${effectiveMeta.toFixed(2)} km/L`, fill: '#ef4444', fontSize: 11, fontWeight: 'bold' }}
                  />

                  {/* Fleet Average Line */}
                  <Line
                    type="monotone"
                    dataKey="frotaMedia"
                    name="Média Geral da Frota"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />

                  {/* Driver km/L Line */}
                  <Line
                    type="monotone"
                    dataKey="kml"
                    name={`Média ${selectedDriver.name}`}
                    stroke="#6366f1"
                    strokeWidth={3}
                    dot={{ r: 5, fill: '#6366f1' }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Individual Driver Detailed Weekly Breakdown Table */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-indigo-600" />
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Desempenho Semana a Semana & Veículos Conduzidos
                </h4>
              </div>
              <span className="text-xs text-slate-400 font-bold">
                {selectedDriver.weeksList.length} semanas registradas
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-900 text-white font-bold text-[11px] uppercase tracking-wider select-none">
                  <tr>
                    <th className="py-3.5 px-4">Semana</th>
                    <th className="py-3.5 px-3">Veículos Utilizados na Semana</th>
                    <th className="py-3.5 px-3 text-right">KM Rodado</th>
                    <th className="py-3.5 px-3 text-right">Litros</th>
                    <th className="py-3.5 px-3 text-right bg-slate-800">Média (km/L)</th>
                    <th className="py-3.5 px-3 text-center">Meta (km/L)</th>
                    <th className="py-3.5 px-3 text-center">Desvio vs. Meta</th>
                    <th className="py-3.5 px-3 text-center">Dias Ativos</th>
                    <th className="py-3.5 px-3 text-center">Situação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedDriver.weeksList.map(w => {
                    const vehs = selectedDriver.weeklyVehicles?.get(w.key) || [];
                    const diff = w.kml > 0 ? Number((((w.kml - effectiveMeta) / effectiveMeta) * 100).toFixed(1)) : 0;
                    return (
                      <tr key={w.key} className={`hover:bg-slate-50 transition-colors ${w.isBelowTarget ? 'bg-rose-50/20' : ''}`}>
                        <td className="py-3 px-4 font-black text-slate-900">
                          {w.label}
                        </td>
                        <td className="py-3 px-3">
                          {vehs.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {vehs.map((v, vIdx) => (
                                <span
                                  key={vIdx}
                                  className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded-md text-[10px] font-bold border border-slate-200"
                                >
                                  Frota {v.frota} ({v.placa}) — {v.km} km
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px]">-</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-medium text-slate-700">
                          {w.km.toLocaleString('pt-BR')} km
                        </td>
                        <td className="py-3 px-3 text-right font-medium text-slate-700">
                          {w.litros.toLocaleString('pt-BR')} L
                        </td>
                        <td className="py-3 px-3 text-right bg-slate-50/50">
                          <span className={`px-2.5 py-1 rounded-lg border text-xs ${getKmlBadgeColor(w.kml)}`}>
                            {w.kml > 0 ? `${w.kml.toFixed(2)} km/L` : '-'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center text-slate-500 font-mono">
                          {effectiveMeta.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {w.kml > 0 ? (
                            <span className={`font-bold text-[11px] ${diff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {diff >= 0 ? `+${diff}%` : `${diff}%`}
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center text-slate-600 font-bold">
                          {w.activeDays > 0 ? `${w.activeDays} dias` : '-'}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {w.hasOperation ? (
                            w.kml >= effectiveMeta ? (
                              <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold">
                                Conforme
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 bg-rose-100 text-rose-800 rounded-full text-[10px] font-bold">
                                Abaixo da Meta
                              </span>
                            )
                          ) : (
                            <span className="text-slate-400 text-[10px]">Sem Operação</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* INDIVIDUAL PERSPECTIVE: PLACA / VEÍCULO INDIVIDUAL */}
      {activePerspective === 'vehicle_individual' && selectedVehicle && (
        <div className="space-y-6 animate-in fade-in duration-300">
          {/* Individual Vehicle Selector & Controls Deck */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3 flex-1">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl">
                <Car size={24} />
              </div>
              <div className="flex-1">
                <div className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                  Selecionar Veículo / Placa para Análise Individual
                </div>
                <div className="flex items-center gap-2 mt-1 flex-wrap">
                  <select
                    value={selectedVehicle.id}
                    onChange={(e) => setSelectedVehicleId(e.target.value)}
                    className="bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-black text-slate-900 focus:ring-2 focus:ring-indigo-500 w-full sm:w-80 cursor-pointer"
                  >
                    {vehicleProfiles.map(v => (
                      <option key={v.id} value={v.id}>
                        Frota {v.frota} ({v.placa}) — {v.overallKml.toFixed(2)} km/L {v.isRecurrentCase ? '⚠️' : ''} [{v.motoristaPrincipal}]
                      </option>
                    ))}
                  </select>

                  {/* Quick Filters */}
                  {vehicleProfiles.some(v => v.isRecurrentCase) && (
                    <button
                      type="button"
                      onClick={() => {
                        const nextCrit = vehicleProfiles.find(v => v.isRecurrentCase && v.id !== selectedVehicle.id) || vehicleProfiles.find(v => v.isRecurrentCase);
                        if (nextCrit) setSelectedVehicleId(nextCrit.id);
                      }}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <AlertTriangle size={12} />
                      <span>Ver Placa Crítica (3+ Semanas)</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setActivePerspective('vehicles')}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Ver Matriz de Todas as Placas
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleExportExcel}
                className="flex items-center gap-2 px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-xs"
                title="Exportar dossiê desta placa para planilha Excel (.xlsx)"
              >
                <FileSpreadsheet size={14} className="text-emerald-600" />
                <span>Exportar Excel</span>
              </button>

              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => handleGenerateVehiclePdf(selectedVehicle, 'download')}
                  disabled={isExportingPdf}
                  className="flex items-center gap-2 px-3.5 py-2.5 bg-cyan-600 hover:bg-cyan-700 text-white rounded-l-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-xs disabled:opacity-50"
                  title="Salvar Dossiê Oficial desta Placa em formato PDF diretamente"
                >
                  {isExportingPdf ? (
                    <Loader2 size={14} className="animate-spin text-white" />
                  ) : (
                    <FileText size={14} className="text-white" />
                  )}
                  <span>Salvar PDF (Placa)</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPdfTargetVehicle(selectedVehicle);
                    setShowVehiclePdfModal(true);
                  }}
                  className="px-2.5 py-2.5 bg-cyan-700 hover:bg-cyan-800 text-white border-l border-cyan-500 rounded-r-xl transition-all cursor-pointer shadow-xs"
                  title="Configurar opções e imprimir Dossiê da Placa em PDF"
                >
                  <Sliders size={13} />
                </button>
              </div>
            </div>
          </div>

          {/* Selected Vehicle Profile Header & KPI Cards */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 rounded-3xl p-6 text-white shadow-md">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 bg-cyan-500/30 text-cyan-300 text-[10px] font-black uppercase tracking-wider rounded-md border border-cyan-400/30">
                    Dossiê Individual da Placa
                  </span>
                  <span className={`px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded-md border ${
                    selectedVehicle.isRecurrentCase
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                      : selectedVehicle.overallKml >= effectiveMeta
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                      : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                  }`}>
                    {selectedVehicle.statusLabel}
                  </span>
                </div>
                <h3 className="text-2xl md:text-3xl font-black text-white mt-2 flex items-center gap-2">
                  <span>Frota {selectedVehicle.frota}</span>
                  <span className="text-cyan-300 font-mono text-xl">({selectedVehicle.placa})</span>
                </h3>
                <div className="flex items-center gap-4 text-xs text-slate-300 mt-2 flex-wrap">
                  <div>
                    <span className="text-slate-400">Condutor Titular / Principal:</span>{' '}
                    <strong className="text-white">{selectedVehicle.motoristaPrincipal}</strong>
                  </div>
                  <div className="h-3 w-px bg-slate-700 hidden sm:block" />
                  <div>
                    <span className="text-slate-400">Regime:</span>{' '}
                    <strong className="text-cyan-300">{selectedVehicle.driverRegimeLabel}</strong>
                  </div>
                  <div className="h-3 w-px bg-slate-700 hidden sm:block" />
                  <div>
                    <span className="text-slate-400">Operação:</span>{' '}
                    <strong className="text-white">{selectedVehicle.operacao}</strong>
                  </div>
                </div>
              </div>

              {/* 4 Vehicle KPI Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full lg:w-auto">
                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-300 block">Média da Placa</span>
                  <div className="text-xl font-black mt-0.5 flex items-center justify-center gap-1">
                    <span className={selectedVehicle.overallKml >= effectiveMeta ? 'text-emerald-400' : 'text-rose-400'}>
                      {selectedVehicle.overallKml.toFixed(2)}
                    </span>
                    <span className="text-[10px] text-slate-300 font-normal">km/L</span>
                  </div>
                  <span className="text-[9px] text-slate-400 mt-0.5 block">
                    Meta: {effectiveMeta.toFixed(2)} km/L
                  </span>
                </div>

                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-300 block">KM Total</span>
                  <div className="text-xl font-black text-white mt-0.5">
                    {selectedVehicle.totalKm.toLocaleString('pt-BR')}
                  </div>
                  <span className="text-[9px] text-slate-400 mt-0.5 block">km rodados</span>
                </div>

                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-300 block">Combustível</span>
                  <div className="text-xl font-black text-white mt-0.5">
                    {selectedVehicle.totalLitros.toLocaleString('pt-BR')}
                  </div>
                  <span className="text-[9px] text-slate-400 mt-0.5 block">litros consumidos</span>
                </div>

                <div className="bg-white/10 backdrop-blur-md rounded-2xl p-3.5 border border-white/10 text-center">
                  <span className="text-[10px] uppercase font-bold text-slate-300 block">Recorrência</span>
                  <div className={`text-xl font-black mt-0.5 ${
                    selectedVehicle.isRecurrentCase ? 'text-rose-400' : 'text-emerald-400'
                  }`}>
                    {selectedVehicle.consecutiveBelowCount}x
                  </div>
                  <span className="text-[9px] text-slate-400 mt-0.5 block">
                    {selectedVehicle.isRecurrentCase ? 'Plano de Ação' : 'Abaixo da meta'}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Individual Vehicle Weekly Line Chart */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/90 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <TrendingUp size={16} className="text-indigo-600" />
                  Evolução Semanal da Placa {selectedVehicle.placa} (Frota {selectedVehicle.frota}) vs. Meta e Frota
                </h4>
                <p className="text-xs text-slate-500">
                  Acompanhe a curva de consumo do veículo semana a semana em comparação com a meta operacional ({effectiveMeta.toFixed(2)} km/L) e a média da frota.
                </p>
              </div>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={individualVehicleChartData} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="semana" stroke="#64748b" tick={{ fontSize: 11, fontWeight: 'bold' }} />
                  <YAxis domain={['auto', 'auto']} stroke="#64748b" tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0f172a',
                      borderRadius: '12px',
                      color: '#fff',
                      border: 'none',
                      fontSize: '12px',
                      boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  
                  {/* Meta Reference Line */}
                  <ReferenceLine
                    y={effectiveMeta}
                    stroke="#ef4444"
                    strokeDasharray="4 4"
                    label={{ value: `Meta: ${effectiveMeta.toFixed(2)} km/L`, fill: '#ef4444', fontSize: 11, fontWeight: 'bold' }}
                  />

                  {/* Fleet Average Line */}
                  <Line
                    type="monotone"
                    dataKey="frotaMedia"
                    name="Média Geral da Frota"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />

                  {/* Vehicle km/L Line */}
                  <Line
                    type="monotone"
                    dataKey="kml"
                    name={`Média Placa ${selectedVehicle.placa}`}
                    stroke="#0284c7"
                    strokeWidth={3}
                    dot={{ r: 5, fill: '#0284c7' }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Individual Vehicle Detailed Weekly Breakdown Table */}
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden">
            <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar size={16} className="text-indigo-600" />
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                  Desempenho Semana a Semana & Condutores que Operaram a Placa
                </h4>
              </div>
              <span className="text-xs text-slate-400 font-bold">
                {selectedVehicle.weeksList.length} semanas registradas
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-900 text-white font-bold text-[11px] uppercase tracking-wider select-none">
                  <tr>
                    <th className="py-3.5 px-4">Semana</th>
                    <th className="py-3.5 px-3">Condutores que Rodaram na Placa</th>
                    <th className="py-3.5 px-3 text-right">KM Rodado</th>
                    <th className="py-3.5 px-3 text-right">Litros</th>
                    <th className="py-3.5 px-3 text-right bg-slate-800">Média (km/L)</th>
                    <th className="py-3.5 px-3 text-center">Meta (km/L)</th>
                    <th className="py-3.5 px-3 text-center">Desvio vs. Meta</th>
                    <th className="py-3.5 px-3 text-center">Regime na Semana</th>
                    <th className="py-3.5 px-3 text-center">Situação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {selectedVehicle.weeksList.map(w => {
                    const drivs = selectedVehicle.weeklyDrivers?.get(w.key) || [];
                    const diff = w.kml > 0 ? Number((((w.kml - effectiveMeta) / effectiveMeta) * 100).toFixed(1)) : 0;
                    return (
                      <tr key={w.key} className={`hover:bg-slate-50 transition-colors ${w.isBelowTarget ? 'bg-rose-50/20' : ''}`}>
                        <td className="py-3 px-4 font-black text-slate-900">
                          {w.label}
                        </td>
                        <td className="py-3 px-3">
                          {drivs.length > 0 ? (
                            <div className="flex flex-wrap gap-1.5">
                              {drivs.map((d, dIdx) => (
                                <span
                                  key={dIdx}
                                  className="px-2 py-0.5 bg-slate-100 text-slate-800 rounded-md text-[10px] font-bold border border-slate-200"
                                >
                                  {d.driverName}: {d.km} km ({d.percentKm}%)
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 text-[11px]">-</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-right font-medium text-slate-700">
                          {w.km.toLocaleString('pt-BR')} km
                        </td>
                        <td className="py-3 px-3 text-right font-medium text-slate-700">
                          {w.litros.toLocaleString('pt-BR')} L
                        </td>
                        <td className="py-3 px-3 text-right bg-slate-50/50">
                          <span className={`px-2.5 py-1 rounded-lg border text-xs ${getKmlBadgeColor(w.kml)}`}>
                            {w.kml > 0 ? `${w.kml.toFixed(2)} km/L` : '-'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-center text-slate-500 font-mono">
                          {effectiveMeta.toFixed(2)}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {w.kml > 0 ? (
                            <span className={`font-bold text-[11px] ${diff >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {diff >= 0 ? `+${diff}%` : `${diff}%`}
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-center text-slate-600 font-bold">
                          {drivs.length <= 1 ? 'Condutor Titular' : `${drivs.length} Condutores`}
                        </td>
                        <td className="py-3 px-3 text-center">
                          {w.hasOperation ? (
                            w.kml >= effectiveMeta ? (
                              <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[10px] font-bold">
                                Conforme
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 bg-rose-100 text-rose-800 rounded-full text-[10px] font-bold">
                                Abaixo da Meta
                              </span>
                            )
                          ) : (
                            <span className="text-slate-400 text-[10px]">Sem Operação</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Drilldown Modal (Ficha Histórica Completa) */}
      {drilldownItem && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400">
                  {drilldownItem.type === 'driver' ? 'Ficha Histórica do Condutor' : 'Ficha Histórica do Veículo'}
                </span>
                <h3 className="text-lg font-black text-white mt-0.5">
                  {drilldownItem.type === 'driver' ? drilldownItem.data.name : `Frota ${drilldownItem.data.frota} (${drilldownItem.data.placa})`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDrilldownItem(null)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-6">
              {/* Summary Metrics */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">KM Total Rodado</span>
                  <span className="text-lg font-black text-slate-900">
                    {drilldownItem.data.totalKm.toLocaleString('pt-BR')} km
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Volume Abastecido</span>
                  <span className="text-lg font-black text-slate-900">
                    {drilldownItem.data.totalLitros.toLocaleString('pt-BR')} L
                  </span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Média Geral no Período</span>
                  <span className={`text-lg font-black ${drilldownItem.data.overallKml < effectiveMeta ? 'text-rose-600' : 'text-emerald-600'}`}>
                    {drilldownItem.data.overallKml.toFixed(2)} km/L
                  </span>
                </div>
              </div>

              {/* Weekly Evolution Table */}
              <div>
                <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider mb-2">
                  Evolução Semana a Semana
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold text-[10px] uppercase">
                      <tr>
                        <th className="py-2.5 px-3">Semana</th>
                        <th className="py-2.5 px-3 text-right">KM</th>
                        <th className="py-2.5 px-3 text-right">Litros</th>
                        <th className="py-2.5 px-3 text-right">Média (km/L)</th>
                        <th className="py-2.5 px-3 text-center">Status vs Meta ({effectiveMeta.toFixed(2)})</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {drilldownItem.data.weeksList.map((w: WeeklyMetric) => (
                        <tr key={w.key} className="hover:bg-slate-50">
                          <td className="py-2.5 px-3 font-bold text-slate-900">{w.label}</td>
                          <td className="py-2.5 px-3 text-right text-slate-600">{w.km.toLocaleString('pt-BR')}</td>
                          <td className="py-2.5 px-3 text-right text-slate-600">{w.litros.toLocaleString('pt-BR')}</td>
                          <td className="py-2.5 px-3 text-right font-black">
                            {w.kml > 0 ? `${w.kml.toFixed(2)} km/L` : '-'}
                          </td>
                          <td className="py-2.5 px-3 text-center">
                            {w.hasOperation ? (
                              w.kml >= effectiveMeta ? (
                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">
                                  Conforme
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded font-bold text-[10px]">
                                  Abaixo da Meta
                                </span>
                              )
                            ) : (
                              <span className="text-slate-400 text-[10px]">Sem rodagem</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
              {drilldownItem.type === 'driver' ? (
                <button
                  type="button"
                  onClick={() => handleGenerateDriverPdf(drilldownItem.data, 'download')}
                  disabled={isExportingPdf}
                  className="flex items-center gap-2 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                  title="Salvar Dossiê Oficial deste Condutor em PDF"
                >
                  {isExportingPdf ? (
                    <Loader2 size={14} className="animate-spin text-white" />
                  ) : (
                    <FileText size={14} className="text-white" />
                  )}
                  <span>Salvar Dossiê em PDF</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleGenerateVehiclePdf(drilldownItem.data, 'download')}
                  disabled={isExportingPdf}
                  className="flex items-center gap-2 px-3.5 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs disabled:opacity-50"
                  title="Salvar Dossiê Oficial desta Placa em PDF"
                >
                  {isExportingPdf ? (
                    <Loader2 size={14} className="animate-spin text-white" />
                  ) : (
                    <FileText size={14} className="text-white" />
                  )}
                  <span>Salvar Dossiê em PDF</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setDrilldownItem(null)}
                className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-700 transition-colors cursor-pointer"
              >
                Fechar Ficha
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE EXPORTAÇÃO PDF: DOSSIÊ DO CONDUTOR */}
      {showDriverPdfModal && pdfTargetDriver && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-rose-500/20 border border-rose-400/30 text-rose-300 rounded-2xl">
                  <FileText size={22} />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-rose-400">
                    Exportação Oficial • Padrão Corporativo
                  </span>
                  <h3 className="text-base font-black text-white mt-0.5">
                    Salvar Dossiê do Condutor em PDF
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Condutor: <strong className="text-white">{pdfTargetDriver.name}</strong> • Meta: <strong className="text-emerald-400">{effectiveMeta.toFixed(2)} km/L</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowDriverPdfModal(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
                title="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-slate-800">
              {/* Orientation Selection */}
              <div>
                <label className="text-xs font-black text-slate-900 uppercase tracking-wider block mb-2">
                  1. Orientação da Página do Documento
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setDriverPdfOrientation('portrait')}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                      driverPdfOrientation === 'portrait'
                        ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`p-2 rounded-xl ${driverPdfOrientation === 'portrait' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      <LayoutTemplate size={18} />
                    </div>
                    <div>
                      <div className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                        <span>Retrato (Vertical)</span>
                        <span className="text-[9px] bg-indigo-100 text-indigo-700 px-1.5 py-0.2 rounded font-bold">Padrão</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        Recomendado para impressão A4, dossiê individual e arquivo do condutor.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDriverPdfOrientation('landscape')}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                      driverPdfOrientation === 'landscape'
                        ? 'border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-500/20'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`p-2 rounded-xl ${driverPdfOrientation === 'landscape' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      <LayoutTemplate size={18} className="rotate-90" />
                    </div>
                    <div>
                      <div className="text-xs font-black text-slate-900">
                        Paisagem (Horizontal)
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        Ideal para visualização ampliada de todas as colunas em telas panorâmicas.
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Sections to Include */}
              <div>
                <label className="text-xs font-black text-slate-900 uppercase tracking-wider block mb-2">
                  2. Conteúdo e Seções do Dossiê
                </label>
                <div className="space-y-2.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <label className="flex items-center gap-2.5 text-xs text-slate-800 font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeDriverKpis}
                      onChange={(e) => setIncludeDriverKpis(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer h-4 w-4"
                    />
                    <span><strong>Cards de Indicadores Executivos:</strong> Média do condutor, KM total, litros consumidos e recorrência recente.</span>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-slate-800 font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeDriverGuidelines}
                      onChange={(e) => setIncludeDriverGuidelines(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer h-4 w-4"
                    />
                    <span><strong>Diretrizes Operacionais & Diagnóstico:</strong> Orientações corporativas de condução econômica ou plano de ação corretivo.</span>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-slate-800 font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeDriverWeeklyTable}
                      onChange={(e) => setIncludeDriverWeeklyTable(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer h-4 w-4"
                    />
                    <span><strong>Tabela Semana a Semana:</strong> Detalhamento cronológico com frotas operadas, km, combustível, média e status vs meta.</span>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-slate-800 font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeDriverVehiclesBreakdown}
                      onChange={(e) => setIncludeDriverVehiclesBreakdown(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer h-4 w-4"
                    />
                    <span><strong>Consolidado por Veículo:</strong> Resumo de todas as frotas e placas conduzidas pelo motorista e médias obtidas.</span>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-slate-800 font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeDriverSignatures}
                      onChange={(e) => setIncludeDriverSignatures(e.target.checked)}
                      className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer h-4 w-4"
                    />
                    <span><strong>Bloco Formal de Assinaturas:</strong> Campos de ciência para Gestão de Frota, CCO/Instrutoria e Condutor.</span>
                  </label>
                </div>
              </div>

              {/* Corporate Standards Callout */}
              <div className="p-3.5 bg-indigo-50/70 rounded-2xl border border-indigo-200/80 flex items-start gap-3">
                <Info size={18} className="text-indigo-600 shrink-0 mt-0.5" />
                <div className="text-[11px] text-indigo-950 leading-relaxed">
                  <strong>Padrão Visual do Sistema:</strong> O relatório inclui o cabeçalho executivo institucional, identificação da empresa ({companyName}), competência auditada, carimbo de auditoria ERP e paginação numerada oficial.
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setShowDriverPdfModal(false)}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleGenerateDriverPdf(pdfTargetDriver, 'print')}
                  disabled={isExportingPdf}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs disabled:opacity-50"
                  title="Abrir pré-visualização e diálogo de impressão"
                >
                  <Printer size={14} className="text-slate-600" />
                  <span>Imprimir</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleGenerateDriverPdf(pdfTargetDriver, 'download')}
                  disabled={isExportingPdf}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-rose-600/20 disabled:opacity-50"
                >
                  {isExportingPdf ? (
                    <>
                      <Loader2 size={14} className="animate-spin text-white" />
                      <span>Gerando Dossiê...</span>
                    </>
                  ) : (
                    <>
                      <FileDown size={14} className="text-white" />
                      <span>Baixar Dossiê em PDF</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE EXPORTAÇÃO PDF: DOSSIÊ DA PLACA / VEÍCULO */}
      {showVehiclePdfModal && pdfTargetVehicle && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white flex items-center justify-between border-b border-white/10">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 rounded-2xl">
                  <FileText size={22} />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-cyan-400">
                    Exportação Oficial • Padrão Corporativo
                  </span>
                  <h3 className="text-base font-black text-white mt-0.5">
                    Salvar Dossiê da Placa / Veículo em PDF
                  </h3>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Frota: <strong className="text-white">{pdfTargetVehicle.frota} ({pdfTargetVehicle.placa})</strong> • Meta: <strong className="text-emerald-400">{effectiveMeta.toFixed(2)} km/L</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowVehiclePdfModal(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
                title="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-slate-800">
              <div>
                <label className="text-xs font-black text-slate-900 uppercase tracking-wider block mb-2">
                  1. Orientação da Página do Documento
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setVehiclePdfOrientation('portrait')}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                      vehiclePdfOrientation === 'portrait'
                        ? 'border-cyan-600 bg-cyan-50/50 ring-2 ring-cyan-500/20'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`p-2 rounded-xl ${vehiclePdfOrientation === 'portrait' ? 'bg-cyan-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      <LayoutTemplate size={18} />
                    </div>
                    <div>
                      <div className="text-xs font-black text-slate-900 flex items-center gap-1.5">
                        <span>Retrato (Vertical)</span>
                        <span className="text-[9px] bg-cyan-100 text-cyan-700 px-1.5 py-0.2 rounded font-bold">Padrão</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        Formato ideal para ficha cadastral, auditoria de frota e prontuário.
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setVehiclePdfOrientation('landscape')}
                    className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex items-start gap-3 ${
                      vehiclePdfOrientation === 'landscape'
                        ? 'border-cyan-600 bg-cyan-50/50 ring-2 ring-cyan-500/20'
                        : 'border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className={`p-2 rounded-xl ${vehiclePdfOrientation === 'landscape' ? 'bg-cyan-600 text-white' : 'bg-slate-100 text-slate-600'}`}>
                      <LayoutTemplate size={18} className="rotate-90" />
                    </div>
                    <div>
                      <div className="text-xs font-black text-slate-900">
                        Paisagem (Horizontal)
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                        Ideal para visualização analítica expandida das semanas e condutores.
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-black text-slate-900 uppercase tracking-wider block mb-2">
                  2. Conteúdo e Seções do Dossiê
                </label>
                <div className="space-y-2.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                  <label className="flex items-center gap-2.5 text-xs text-slate-800 font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeVehicleKpis}
                      onChange={(e) => setIncludeVehicleKpis(e.target.checked)}
                      className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 cursor-pointer h-4 w-4"
                    />
                    <span><strong>Cards de Indicadores da Placa:</strong> Média do veículo, KM total rodado, litros consumidos e status de recorrência.</span>
                  </label>

                  <label className="flex items-center gap-2.5 text-xs text-slate-800 font-medium cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeVehicleWeeklyTable}
                      onChange={(e) => setIncludeVehicleWeeklyTable(e.target.checked)}
                      className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500 cursor-pointer h-4 w-4"
                    />
                    <span><strong>Tabela Semana a Semana:</strong> Histórico com motoristas da semana, km, litros e conformidade com a meta.</span>
                  </label>
                </div>
              </div>

              <div className="p-3.5 bg-cyan-50/70 rounded-2xl border border-cyan-200/80 flex items-start gap-3">
                <Info size={18} className="text-cyan-700 shrink-0 mt-0.5" />
                <div className="text-[11px] text-cyan-950 leading-relaxed">
                  <strong>Padrão Visual Corporativo:</strong> O relatório gerado adota a identidade corporativa do sistema ({companyName}), com registros de data/hora, meta operacional de consumo e layout oficial para auditoria de frota.
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setShowVehiclePdfModal(false)}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 rounded-xl hover:bg-slate-200/60 transition-colors cursor-pointer"
              >
                Cancelar
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleGenerateVehiclePdf(pdfTargetVehicle, 'print')}
                  disabled={isExportingPdf}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs disabled:opacity-50"
                  title="Abrir pré-visualização e diálogo de impressão"
                >
                  <Printer size={14} className="text-slate-600" />
                  <span>Imprimir</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleGenerateVehiclePdf(pdfTargetVehicle, 'download')}
                  disabled={isExportingPdf}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-600 to-cyan-700 hover:from-cyan-500 hover:to-cyan-600 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer shadow-md shadow-cyan-600/20 disabled:opacity-50"
                >
                  {isExportingPdf ? (
                    <>
                      <Loader2 size={14} className="animate-spin text-white" />
                      <span>Gerando Dossiê...</span>
                    </>
                  ) : (
                    <>
                      <FileDown size={14} className="text-white" />
                      <span>Baixar Dossiê em PDF</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
