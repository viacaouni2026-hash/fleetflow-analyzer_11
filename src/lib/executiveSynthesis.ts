/**
 * Executive Synthesis & Operational Regularity Analysis Engine
 * 
 * Regras de Negócio e Diretrizes Corporativas:
 * 1. Elegibilidade Operacional: Avalia apenas veículos que efetivamente rodaram no período selecionado
 *    (quinzena / mês), excluindo veículos parados na oficina ou com deslocamentos esporádicos (apenas 1 ou 2 saídas).
 * 2. Suporte a Regime de Condução: Identifica se o veículo operou com condutor titular (único)
 *    ou em regime de revezamento/dupla de turno (2 motoristas), calculando o share de KM de cada um.
 * 3. Consumo Real Consecutivo: Só valida semanas com rodagem expressiva (km >= limiar) e combustível real,
 *    eliminando distorções de 0.00 km/L geradas por abastecimentos estáticos de garagem/oficina.
 * 4. Isenção e Auditoria: Veículos com amostragem insuficiente são catalogados com justificativa técnica clara.
 */

export interface DriverShare {
  name: string;
  km: number;
  percent: number;
}

export interface WeekDetail {
  semana: string;
  semanaLabel: string;
  kml: number;
  km: number;
  litros: number;
  activeDays: number;
}

export interface RecurrentCase {
  id: string;
  type: 'veiculo' | 'motorista';
  frota: string;
  placa: string;
  motorista?: string;
  operacao?: string;
  consecutiveWeeksCount: number;
  weeksDetails: WeekDetail[];
  avgKmlConsecutive: number;
  totalKmConsecutive: number;
  totalLitrosConsecutive: number;
  suggestedAction: string;
  // Professional fleet metrics
  totalActiveDays: number;
  avgKmPerActiveDay: number;
  driverRegime: 'titular' | 'dupla' | 'multiplo' | 'indefinido';
  driverRegimeLabel: string;
  driversShare: DriverShare[];
  periodTotalKm: number;
  periodTotalLitros: number;
  periodOverallKml: number;
  isRegularOperation: boolean;
  exclusionReason?: string;
}

export interface ExcludedVehicleAudit {
  frota: string;
  placa: string;
  motorista: string;
  operacao: string;
  totalKm: number;
  totalLitros: number;
  kml: number;
  activeDays: number;
  reason: string;
}

export interface WeekSelectionInfo {
  referenceWeekKey: string;
  referenceWeekLabel: string;
  referenceWeekNo: number;
  referenceYear: number;
  evalMode: 'previous_3_closed' | 'including_reference_3' | 'custom_weeks';
  targetWeeks: {
    key: string;
    label: string;
    shortLabel: string;
    weekNo: number;
    year: number;
  }[];
  availableWeeks: {
    key: string;
    label: string;
    shortLabel: string;
    weekNo: number;
    year: number;
    hasData: boolean;
  }[];
}

export interface ExecutiveSynthesisOptions {
  metaKml: number;
  minActiveDays?: number; // Minimum days with displacement in period (default: 4 for quinzena, 8 for month)
  minPeriodKm?: number;   // Minimum total km in period (default: 200 km)
  minWeeklyKm?: number;   // Minimum km in a week to qualify consumption (default: 60 km)
  periodTypeHint?: 'quinzena' | 'mes' | 'semana' | 'custom';
  // Week Selection for Plano de Ação
  referenceWeek?: string | number; // e.g. '2026-W37' or 'W37' or 37
  evalMode?: 'previous_3_closed' | 'including_reference_3' | 'custom_weeks';
  customTargetWeeks?: string[]; // e.g. ['2026-W34', '2026-W35', '2026-W36']
}

export interface ExecutiveSynthesisResult {
  recurrentCases: RecurrentCase[];
  totalVehiclesAnalyzed: number;
  eligibleVehiclesCount: number;
  excludedVehiclesCount: number;
  excludedAuditList: ExcludedVehicleAudit[];
  metaKml: number;
  activeCriteria: {
    minActiveDays: number;
    minPeriodKm: number;
    minWeeklyKm: number;
    detectedPeriodDays: number;
  };
  weekSelectionInfo: WeekSelectionInfo;
}

/**
 * Helper: Parse any date format into a clean Date object or null
 */
export function parseDateHelper(rawDate: any): Date | null {
  if (!rawDate) return null;
  if (rawDate instanceof Date) return isNaN(rawDate.getTime()) ? null : rawDate;
  
  const s = String(rawDate).trim();
  if (!s) return null;

  // ISO: YYYY-MM-DD or YYYY/MM/DD
  const isoMatch = s.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (isoMatch) {
    const d = new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]));
    return isNaN(d.getTime()) ? null : d;
  }

  // Brazilian: DD/MM/YYYY or DD-MM-YYYY
  const brMatch = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (brMatch) {
    const d = new Date(Number(brMatch[3]), Number(brMatch[2]) - 1, Number(brMatch[1]));
    return isNaN(d.getTime()) ? null : d;
  }

  const parsed = new Date(s);
  return isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Helper: Get ISO week information
 */
export function getISOWeekInfo(date: Date): { key: string; label: string; year: number; weekNo: number; sortNum: number } {
  const dUtc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = dUtc.getUTCDay() || 7;
  dUtc.setUTCDate(dUtc.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(dUtc.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((dUtc.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  const year = dUtc.getUTCFullYear();
  const weekNoStr = String(weekNo).padStart(2, '0');

  return {
    key: `${year}-W${weekNoStr}`,
    label: `Sem. ${weekNoStr}/${year}`,
    year,
    weekNo,
    sortNum: year * 100 + weekNo
  };
}

/**
 * Helper to compute previous/offset ISO weeks
 */
export function getOffsetISOWeek(year: number, weekNo: number, offsetWeeks: number) {
  // offsetWeeks: positive means go back in time, negative means advance forward
  let targetW = weekNo - offsetWeeks;
  let targetY = year;
  while (targetW < 1) {
    targetY -= 1;
    targetW += 52;
  }
  while (targetW > 52) {
    targetY += 1;
    targetW -= 52;
  }
  const weekStr = String(targetW).padStart(2, '0');
  return {
    key: `${targetY}-W${weekStr}`,
    label: `Sem. ${weekStr}/${targetY}`,
    shortLabel: `Sem. ${weekStr}`,
    weekNo: targetW,
    year: targetY,
    sortNum: targetY * 100 + targetW
  };
}

/**
 * Main Analysis Engine: Evaluates vehicles for 3 consecutive weeks below target,
 * filtering strictly for vehicles with regular operations and excluding sporadic ones.
 */
export function calculateExecutiveSynthesis(
  mergedData: any[] = [],
  consolidatedReportData: any[] = [],
  options: ExecutiveSynthesisOptions
): ExecutiveSynthesisResult {
  const metaKml = options.metaKml > 0 ? options.metaKml : 2.70;
  const minWeeklyKm = options.minWeeklyKm ?? 60;

  // 1. Discover total date span and unique active dates in mergedData
  const allDatasetDates = new Set<string>();
  const allDatasetWeeksMap = new Map<string, ReturnType<typeof getISOWeekInfo>>();

  if (Array.isArray(mergedData)) {
    mergedData.forEach(r => {
      const d = parseDateHelper(r.DATA || r.data || r.parsedDate);
      if (d) {
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        allDatasetDates.add(dateStr);
        const wInfo = getISOWeekInfo(d);
        if (!allDatasetWeeksMap.has(wInfo.key)) {
          allDatasetWeeksMap.set(wInfo.key, wInfo);
        }
      }
    });
  }

  const detectedPeriodDays = allDatasetDates.size > 0 ? allDatasetDates.size : 15;

  // Current calendar week reference
  const now = new Date();
  const currentCalendarWeek = getISOWeekInfo(now);

  // Available weeks detected in dataset, sorted chronologically
  const detectedWeeksList = Array.from(allDatasetWeeksMap.values()).sort((a, b) => a.sortNum - b.sortNum);

  // Determine reference week (Default: current calendar week e.g. W37, or latest week present in data)
  let refYear = currentCalendarWeek.year;
  let refWeekNo = currentCalendarWeek.weekNo;

  if (options.referenceWeek) {
    if (typeof options.referenceWeek === 'number') {
      refWeekNo = options.referenceWeek;
    } else {
      const s = String(options.referenceWeek).trim();
      const matchYearWeek = s.match(/^(\d{4})-W?(\d{1,2})$/i);
      const matchWeekOnly = s.match(/^W?(\d{1,2})$/i);
      if (matchYearWeek) {
        refYear = parseInt(matchYearWeek[1], 10);
        refWeekNo = parseInt(matchYearWeek[2], 10);
      } else if (matchWeekOnly) {
        refWeekNo = parseInt(matchWeekOnly[1], 10);
      }
    }
  } else if (detectedWeeksList.length > 0) {
    // If no explicit referenceWeek is given, check if data has weeks >= calendar week or use current calendar week
    const latestDataWeek = detectedWeeksList[detectedWeeksList.length - 1];
    // If the data is from a past year or specific period, pick the max week in data; otherwise current week
    if (latestDataWeek.year < currentCalendarWeek.year || latestDataWeek.weekNo > currentCalendarWeek.weekNo) {
      refYear = latestDataWeek.year;
      refWeekNo = latestDataWeek.weekNo;
    }
  }

  const referenceWeekObj = getOffsetISOWeek(refYear, refWeekNo, 0);

  // Evaluation Mode:
  // - 'previous_3_closed': Default requested by user! (e.g., if ref=37 -> weeks 36, 35, 34)
  // - 'including_reference_3': weeks 37, 36, 35
  // - 'custom_weeks': explicit weeks selected
  const evalMode = options.evalMode || 'previous_3_closed';

  let targetWeeks: Array<{
    key: string;
    label: string;
    shortLabel: string;
    weekNo: number;
    year: number;
    sortNum: number;
  }> = [];

  if (evalMode === 'including_reference_3') {
    // Weeks [ref, ref-1, ref-2] (e.g. 37, 36, 35)
    targetWeeks = [
      getOffsetISOWeek(refYear, refWeekNo, 0),
      getOffsetISOWeek(refYear, refWeekNo, 1),
      getOffsetISOWeek(refYear, refWeekNo, 2)
    ];
  } else if (evalMode === 'custom_weeks' && Array.isArray(options.customTargetWeeks) && options.customTargetWeeks.length > 0) {
    targetWeeks = options.customTargetWeeks.map(k => {
      const match = k.match(/^(\d{4})-W?(\d{1,2})$/i);
      if (match) {
        return getOffsetISOWeek(parseInt(match[1], 10), parseInt(match[2], 10), 0);
      }
      return getOffsetISOWeek(refYear, parseInt(k.replace(/\D/g, ''), 10) || refWeekNo, 0);
    }).sort((a, b) => b.sortNum - a.sortNum); // Most recent first
  } else {
    // 'previous_3_closed' (DEFAULT):
    // E.g., if current week = 37, evaluated weeks are strictly 36, 35, 34!
    // Ordered from most recent closed week to oldest: 36 - 35 - 34
    targetWeeks = [
      getOffsetISOWeek(refYear, refWeekNo, 1), // e.g. Sem. 36 (most recent closed)
      getOffsetISOWeek(refYear, refWeekNo, 2), // e.g. Sem. 35
      getOffsetISOWeek(refYear, refWeekNo, 3)  // e.g. Sem. 34
    ];
  }

  // Compile available weeks list for the selector UI
  // Combines detected weeks in data with a surrounding range around the reference week
  const availableWeeksMap = new Map<string, { key: string; label: string; shortLabel: string; weekNo: number; year: number; hasData: boolean }>();

  // Add surrounding weeks around reference (e.g. ref-8 to ref+1)
  for (let offset = 8; offset >= -1; offset--) {
    const w = getOffsetISOWeek(refYear, refWeekNo, offset);
    availableWeeksMap.set(w.key, {
      key: w.key,
      label: w.label,
      shortLabel: w.shortLabel,
      weekNo: w.weekNo,
      year: w.year,
      hasData: allDatasetWeeksMap.has(w.key)
    });
  }

  // Also include any other weeks that have data
  detectedWeeksList.forEach(w => {
    if (!availableWeeksMap.has(w.key)) {
      availableWeeksMap.set(w.key, {
        key: w.key,
        label: w.label,
        shortLabel: `Sem. ${String(w.weekNo).padStart(2, '0')}`,
        weekNo: w.weekNo,
        year: w.year,
        hasData: true
      });
    }
  });

  const availableWeeksList = Array.from(availableWeeksMap.values()).sort((a, b) => (a.year * 100 + a.weekNo) - (b.year * 100 + b.weekNo));

  // Determine auto threshold for active days if not explicitly provided
  let effectiveMinActiveDays = options.minActiveDays;
  if (effectiveMinActiveDays === undefined || effectiveMinActiveDays <= 0) {
    if (detectedPeriodDays <= 7) {
      effectiveMinActiveDays = 3; // Weekly period: at least 3 active days
    } else if (detectedPeriodDays <= 18) {
      effectiveMinActiveDays = 4; // Quinzena (15 days): at least 4 active days (excludes 1-2 sporadic runs)
    } else {
      effectiveMinActiveDays = 8; // Full Month (30 days): at least 8 active days
    }
  }

  const effectiveMinPeriodKm = options.minPeriodKm ?? (detectedPeriodDays <= 7 ? 120 : 250);

  // 2. Build Vehicle Profiles
  interface VehicleProfileBuilder {
    normKey: string;
    frota: string;
    placa: string;
    motorista: string;
    operacao: string;
    activeDates: Set<string>;
    totalKm: number;
    totalLitros: number;
    driverKmMap: Map<string, number>;
    weeklyRecords: Map<string, { weekInfo: ReturnType<typeof getISOWeekInfo>; km: number; litros: number; activeDays: Set<string> }>;
  }

  const vehicleMap = new Map<string, VehicleProfileBuilder>();

  // Helper to ensure builder exists
  const getOrCreateVehicle = (normKey: string, frota: string, placa: string, operacao: string, motorista: string) => {
    if (!vehicleMap.has(normKey)) {
      vehicleMap.set(normKey, {
        normKey,
        frota: frota || 'N/A',
        placa: placa || 'N/A',
        motorista: motorista || 'NÃO INFORMADO',
        operacao: operacao || 'OPERACIONAL',
        activeDates: new Set<string>(),
        totalKm: 0,
        totalLitros: 0,
        driverKmMap: new Map<string, number>(),
        weeklyRecords: new Map()
      });
    }
    const v = vehicleMap.get(normKey)!;
    if ((v.frota === 'N/A' || !v.frota) && frota) v.frota = frota;
    if ((v.placa === 'N/A' || !v.placa) && placa) v.placa = placa;
    if ((v.operacao === 'OPERACIONAL' || !v.operacao) && operacao) v.operacao = operacao;
    if ((v.motorista === 'NÃO INFORMADO' || !v.motorista) && motorista && motorista !== 'N/A' && motorista !== '-') v.motorista = motorista;
    return v;
  };

  // Populate from mergedData (raw trip & fueling entries)
  if (Array.isArray(mergedData) && mergedData.length > 0) {
    mergedData.forEach(r => {
      const placa = String(r.PLACA || r.placa || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      const frota = String(r.FROTA || r.frota || r.VEICULO || '').trim();
      const normKey = placa || (frota ? `FROTA_${frota.toUpperCase()}` : '');
      if (!normKey) return;

      const rawDriver = String(r.MOTORISTA || r.motorista || r.CONDUTOR || r.condutor || r.NOME_MOTORISTA || '').trim().toUpperCase();
      const cleanDriver = (rawDriver && rawDriver !== 'N/A' && rawDriver !== '-' && rawDriver !== 'NÃO INFORMADO' && rawDriver !== 'SEM MOTORISTA' && !rawDriver.startsWith('MOTORISTA ('))
        ? rawDriver
        : '';

      const operacao = String(r.OPERACAO || r.operacao || r.LINHA || '').trim();
      const d = parseDateHelper(r.DATA || r.data || r.parsedDate);

      const km = Number(r.KM_PRODUTIVO || r.KM_TOTAL || r.KM || r.km || 0);
      const litros = Number(r.LITROS || r.litros || 0);

      const v = getOrCreateVehicle(normKey, frota, placa, operacao, cleanDriver);

      if (d) {
        const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (km > 0) {
          v.activeDates.add(dateStr);
        }

        const weekInfo = getISOWeekInfo(d);
        if (!v.weeklyRecords.has(weekInfo.key)) {
          v.weeklyRecords.set(weekInfo.key, {
            weekInfo,
            km: 0,
            litros: 0,
            activeDays: new Set<string>()
          });
        }
        const w = v.weeklyRecords.get(weekInfo.key)!;
        w.km += km;
        w.litros += litros;
        if (km > 0) {
          w.activeDays.add(dateStr);
        }
      }

      v.totalKm += km;
      v.totalLitros += litros;

      if (cleanDriver && km > 0) {
        v.driverKmMap.set(cleanDriver, (v.driverKmMap.get(cleanDriver) || 0) + km);
      }
    });
  }

  // Complement from consolidatedReportData to ensure vehicles present in the period are captured
  const consVehicleBenchmarkMap = new Map<string, { km: number; litros: number; kml: number; frota: string; placa: string; operacao: string; motorista?: string }>();
  if (Array.isArray(consolidatedReportData) && consolidatedReportData.length > 0) {
    consolidatedReportData.forEach(item => {
      const placa = String(item.PLACA || item.placa || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
      const frota = String(item.FROTA || item.frota || item.VEICULO || '').trim();
      const normKey = placa || (frota ? `FROTA_${frota.toUpperCase()}` : '');
      if (!normKey) return;

      const driver = String(item.MOTORISTA || item.motorista || item.CONDUTOR || '').trim();
      const operacao = String(item.OPERACAO || item.operacao || item.LINHA || '').trim();
      const km = Number(item.kmProdutivo !== undefined && item.kmProdutivo > 0 ? item.kmProdutivo : (item.km !== undefined && item.km > 0 ? item.km : (item.kmTotal || item.KM || item.totalKm || 0)));
      const litros = Number(item.litros !== undefined ? item.litros : (item.LITROS || item.totalLitros || 0));
      const kml = Number(item.kml !== undefined && item.kml > 0 ? item.kml : (item.MEDIA || item.media || (litros > 0 ? km / litros : 0)));

      const rec = { km, litros, kml, frota: frota || placa, placa: placa || frota, operacao, motorista: driver };
      consVehicleBenchmarkMap.set(normKey, rec);
      if (placa) consVehicleBenchmarkMap.set(placa, rec);
      if (frota) consVehicleBenchmarkMap.set(`FROTA_${frota.toUpperCase()}`, rec);

      const v = getOrCreateVehicle(normKey, frota, placa, operacao, driver);
      // Ensure consolidated totals calibrate vehicle metrics
      if (km > 0) v.totalKm = km;
      if (litros > 0) v.totalLitros = litros;
      if (driver && driver !== 'N/A' && driver !== 'NÃO IDENTIFICADO' && !v.motorista) {
        v.motorista = driver;
      }
    });
  }

  // 3. Process Each Vehicle: Audit Eligibility & Check for 3 Consecutive Weeks
  const recurrentCases: RecurrentCase[] = [];
  const excludedAuditList: ExcludedVehicleAudit[] = [];
  let eligibleCount = 0;

  vehicleMap.forEach((v) => {
    const normKey = v.normKey;
    const consRec = consVehicleBenchmarkMap.get(normKey) || (v.placa ? consVehicleBenchmarkMap.get(v.placa.toUpperCase().replace(/[^A-Z0-9]/g, '')) : undefined) || (v.frota ? consVehicleBenchmarkMap.get(`FROTA_${v.frota.toUpperCase()}`) : undefined);
    const authoritativeKm = consRec && consRec.km > 0 ? consRec.km : v.totalKm;
    const authoritativeLitros = consRec && consRec.litros > 0 ? consRec.litros : v.totalLitros;
    const overallKml = consRec && consRec.kml > 0 ? consRec.kml : (authoritativeLitros > 0 && authoritativeKm > 0 ? authoritativeKm / authoritativeLitros : 0);

    const activeDaysCount = v.activeDates.size;
    const avgKmPerActiveDay = activeDaysCount > 0 ? Math.round(authoritativeKm / activeDaysCount) : 0;

    // Determine driver regime (1 vs 2+ drivers)
    const driverEntries = Array.from(v.driverKmMap.entries()).sort((a, b) => b[1] - a[1]);
    const totalDriverKm = driverEntries.reduce((acc, d) => acc + d[1], 0);

    const driversShare: DriverShare[] = driverEntries.map(([name, km]) => ({
      name,
      km,
      percent: totalDriverKm > 0 ? Math.round((km / totalDriverKm) * 100) : 0
    }));

    let driverRegime: 'titular' | 'dupla' | 'multiplo' | 'indefinido' = 'indefinido';
    let driverRegimeLabel = v.motorista || 'NÃO INFORMADO';

    if (driversShare.length === 1) {
      driverRegime = 'titular';
      driverRegimeLabel = `Condutor Titular: ${driversShare[0].name} (100% da condução)`;
    } else if (driversShare.length >= 2) {
      const top1 = driversShare[0];
      const top2 = driversShare[1];
      if (top1.percent >= 75) {
        driverRegime = 'titular';
        driverRegimeLabel = `Condutor Titular: ${top1.name} (${top1.percent}%)`;
      } else if (top1.percent + top2.percent >= 80) {
        driverRegime = 'dupla';
        driverRegimeLabel = `Operação em Dupla: ${top1.name} (${top1.percent}%) e ${top2.name} (${top2.percent}%)`;
      } else {
        driverRegime = 'multiplo';
        driverRegimeLabel = `Frota Compartilhada (${driversShare.length} condutores)`;
      }
    } else if (v.motorista && v.motorista !== 'NÃO INFORMADO' && v.motorista !== 'N/A') {
      driverRegime = 'titular';
      driverRegimeLabel = `Condutor Indicado: ${v.motorista}`;
    }

    // ELIGIBILITY CHECK:
    // Is the vehicle operating almost every day in the period?
    // Exclude parked vehicles (km <= 0) and vehicles with only 1 or 2 isolated runs.
    if (v.totalKm <= 0) {
      excludedAuditList.push({
        frota: v.frota,
        placa: v.placa,
        motorista: v.motorista,
        operacao: v.operacao,
        totalKm: 0,
        totalLitros: v.totalLitros,
        kml: 0,
        activeDays: 0,
        reason: 'Veículo sem rodagem no período (estático / oficina / garagem)'
      });
      return;
    }

    if (activeDaysCount < effectiveMinActiveDays || v.totalKm < effectiveMinPeriodKm) {
      excludedAuditList.push({
        frota: v.frota,
        placa: v.placa,
        motorista: v.motorista,
        operacao: v.operacao,
        totalKm: v.totalKm,
        totalLitros: v.totalLitros,
        kml: overallKml,
        activeDays: activeDaysCount,
        reason: activeDaysCount <= 2 
          ? `Deslocamento esporádico (${activeDaysCount} dia(s) ativo(s), ${v.totalKm.toLocaleString('pt-BR')} km) - Amostragem insuficiente`
          : `Baixa frequência operacional (${activeDaysCount} dias ativos de ${detectedPeriodDays} dias analisados, mínimo requerido: ${effectiveMinActiveDays})`
      });
      return;
    }

    // Vehicle IS ELIGIBLE (has regular, representative operation)
    eligibleCount++;

    // Analyze weekly progression
    const sortedWeeks = Array.from(v.weeklyRecords.values())
      .sort((a, b) => a.weekInfo.sortNum - b.weekInfo.sortNum)
      .map(w => {
        const effectiveLitros = w.litros > 0 ? w.litros : (overallKml > 0 && w.km >= minWeeklyKm ? (w.km / overallKml) : 0);
        const effectiveKml = (effectiveLitros > 0 && w.km >= minWeeklyKm) ? (w.km / effectiveLitros) : 0;
        return {
          semana: w.weekInfo.key,
          semanaLabel: w.weekInfo.label,
          sortNum: w.weekInfo.sortNum,
          km: w.km,
          litros: effectiveLitros,
          activeDays: w.activeDays.size,
          kml: effectiveKml,
          hasValidOperation: w.km >= minWeeklyKm && effectiveLitros > 0
        };
      });

    // Valid operating weeks (with real mileage and fuel)
    const validOperatingWeeks = sortedWeeks.filter(w => w.hasValidOperation);

    // Check vehicle against target evaluated weeks (e.g., Sem. 34, 35, 36)
    // Rule: "semana atual = 37, devem entrar em plano de ação caso as 3 últimas semanas foram de média baixa = 36 - 35 - 34"
    const targetEvalDetails: WeekDetail[] = [];
    let allTargetWeeksBelow = true;
    let targetValidWeeksCount = 0;
    let targetTotalKm = 0;
    let targetTotalLitros = 0;

    targetWeeks.forEach(tw => {
      const rec = v.weeklyRecords.get(tw.key);
      if (rec && rec.km >= minWeeklyKm && rec.litros > 0) {
        targetValidWeeksCount++;
        const weekKml = rec.km / rec.litros;
        targetTotalKm += rec.km;
        targetTotalLitros += rec.litros;
        const isBelow = weekKml < metaKml;
        if (!isBelow) {
          allTargetWeeksBelow = false;
        }
        targetEvalDetails.push({
          semana: tw.key,
          semanaLabel: tw.label,
          kml: Number(weekKml.toFixed(2)),
          km: Math.round(rec.km),
          litros: Math.round(rec.litros),
          activeDays: rec.activeDays.size
        });
      } else {
        allTargetWeeksBelow = false;
        if (rec && rec.km > 0) {
          targetEvalDetails.push({
            semana: tw.key,
            semanaLabel: tw.label,
            kml: rec.litros > 0 ? Number((rec.km / rec.litros).toFixed(2)) : 0,
            km: Math.round(rec.km),
            litros: Math.round(rec.litros),
            activeDays: rec.activeDays.size
          });
        }
      }
    });

    // Strict Corporate Rule:
    // A vehicle qualifies for Plano de Ação IF AND ONLY IF it is strictly below target
    // in ALL 3 target evaluated consecutive weeks (e.g. Sem. 36, Sem. 35, Sem. 34).
    // If the vehicle was within target in week 36 (kml >= metaKml) or was inactive,
    // or if the streak is broken in any of the evaluated weeks, NO ACTION PLAN OCCURS!
    const isQualifiedByTargetWeeks = targetWeeks.length >= 3 && targetValidWeeksCount >= 3 && allTargetWeeksBelow;

    if (isQualifiedByTargetWeeks) {
      const evaluatedWeeks = targetEvalDetails;
      const totalKmConsecutive = targetTotalKm;
      const totalLitrosConsecutive = targetTotalLitros;
      const avgKmlConsecutive = totalLitrosConsecutive > 0 ? totalKmConsecutive / totalLitrosConsecutive : 0;

      let suggestedAction = 'Abertura imediata de O.S. preventiva (injeção/filtros/pressão) e auditoria de rota com instrutor técnico.';
      if (driverRegime === 'dupla') {
        suggestedAction = `Alinhamento operacional obrigatório com a dupla de condutores (${driversShare[0]?.name || ''} e ${driversShare[1]?.name || ''}) + diagnóstico mecânico prioritário.`;
      } else if (driverRegime === 'titular' && driversShare[0]?.name) {
        suggestedAction = `Treinamento prático de direção econômica com o condutor titular ${driversShare[0].name} + inspeção de telemetria (RPM/marcha lenta).`;
      }

      recurrentCases.push({
        id: `case-${v.normKey}`,
        type: 'veiculo',
        frota: v.frota,
        placa: v.placa,
        motorista: v.motorista || driversShare[0]?.name || 'NÃO INFORMADO',
        operacao: v.operacao,
        consecutiveWeeksCount: evaluatedWeeks.length,
        weeksDetails: evaluatedWeeks,
        avgKmlConsecutive: Number(avgKmlConsecutive.toFixed(2)),
        totalKmConsecutive: Math.round(totalKmConsecutive),
        totalLitrosConsecutive: Math.round(totalLitrosConsecutive),
        suggestedAction,
        totalActiveDays: activeDaysCount,
        avgKmPerActiveDay,
        driverRegime,
        driverRegimeLabel,
        driversShare,
        periodTotalKm: Math.round(authoritativeKm),
        periodTotalLitros: Math.round(authoritativeLitros),
        periodOverallKml: Number(overallKml.toFixed(2)),
        isRegularOperation: true
      });
    } else {
      // Audit entry: if vehicle had low average in previous weeks but was within target in the most recent week:
      const recWeek1 = targetWeeks[0] ? v.weeklyRecords.get(targetWeeks[0].key) : undefined;
      const kmlWeek1 = recWeek1 && recWeek1.litros > 0 ? recWeek1.km / recWeek1.litros : 0;
      if (recWeek1 && recWeek1.litros > 0 && kmlWeek1 >= metaKml) {
        const recWeek2 = targetWeeks[1] ? v.weeklyRecords.get(targetWeeks[1].key) : undefined;
        const recWeek3 = targetWeeks[2] ? v.weeklyRecords.get(targetWeeks[2].key) : undefined;
        const kmlWeek2 = recWeek2 && recWeek2.litros > 0 ? recWeek2.km / recWeek2.litros : 0;
        const kmlWeek3 = recWeek3 && recWeek3.litros > 0 ? recWeek3.km / recWeek3.litros : 0;
        if ((recWeek2 && kmlWeek2 < metaKml) || (recWeek3 && kmlWeek3 < metaKml)) {
          excludedAuditList.push({
            frota: v.frota,
            placa: v.placa,
            motorista: v.motorista || driversShare[0]?.name || 'NÃO INFORMADO',
            operacao: v.operacao,
            totalKm: authoritativeKm,
            totalLitros: authoritativeLitros,
            kml: overallKml,
            activeDays: activeDaysCount,
            reason: `Dentro da meta na semana recente (${targetWeeks[0]?.label}: ${kmlWeek1.toFixed(2)} km/L >= ${metaKml.toFixed(2)}) - Sequência consecutiva interrompida (Sem plano de ação)`
          });
        }
      }
    }
  });

  // Sort recurrent cases by worst consumption first (lowest avgKmlConsecutive)
  recurrentCases.sort((a, b) => a.avgKmlConsecutive - b.avgKmlConsecutive);

  return {
    recurrentCases,
    totalVehiclesAnalyzed: vehicleMap.size,
    eligibleVehiclesCount: eligibleCount,
    excludedVehiclesCount: excludedAuditList.length,
    excludedAuditList,
    metaKml,
    activeCriteria: {
      minActiveDays: effectiveMinActiveDays,
      minPeriodKm: effectiveMinPeriodKm,
      minWeeklyKm,
      detectedPeriodDays
    },
    weekSelectionInfo: {
      referenceWeekKey: referenceWeekObj.key,
      referenceWeekLabel: referenceWeekObj.label,
      referenceWeekNo: referenceWeekObj.weekNo,
      referenceYear: referenceWeekObj.year,
      evalMode,
      targetWeeks: targetWeeks.map(tw => ({
        key: tw.key,
        label: tw.label,
        shortLabel: tw.shortLabel,
        weekNo: tw.weekNo,
        year: tw.year
      })),
      availableWeeks: availableWeeksList
    }
  };
}
