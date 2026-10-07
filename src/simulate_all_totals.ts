import Papa from "papaparse";
import fs from "fs";

const KM_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1Tw2YN42YrMXqetgLbYwCdzO0jMNxTOwnR4l2oFVPp4M/gviz/tq?tqx=out:csv&sheet=LOGISTICA';
const COMB_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1k_sBpRhmokk02rhl72zSWC2j9U9jFBJjGfIbRs-dTPE/gviz/tq?tqx=out:csv&sheet=Combustivel';
const VEIC_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1UKMYrCErWztQXh7j4RHk9qAIJRMOEBvTjA-qV5JOerw/gviz/tq?tqx=out:csv&sheet=Info_BI';

const appSrc = fs.readFileSync("src/App.tsx", "utf8");
const coringaMatch = appSrc.match(/const CORINGA_MAPPING = (\[[\s\S]*?\]);/);
const CORINGA_MAPPING: any[] = coringaMatch ? eval(coringaMatch[1]) : [];

// Extract FLEET_LOOKUP and CORINGA_LOOKUP from App.tsx
const fleetLookupMatch = appSrc.match(/const FLEET_LOOKUP = new Map<string, string>\(\[([\s\S]*?)\]\);/);
const FLEET_LOOKUP: Map<string, string> = fleetLookupMatch ? eval(`new Map([${fleetLookupMatch[1]}])`) : new Map();

const coringaLookupMatch = appSrc.match(/const CORINGA_LOOKUP = new Map<string, string>\(\[([\s\S]*?)\]\);/);
const CORINGA_LOOKUP: Map<string, string> = coringaLookupMatch ? eval(`new Map([${coringaLookupMatch[1]}])`) : new Map();

const normalizePlate = (plate: string | undefined | null): string => {
  if (!plate) return '';
  return plate.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
};

const normalizeFrota = (frota: any): string => {
  if (frota === undefined || frota === null || frota === '') return 'Sem Veic';
  const str = String(frota).trim();
  if (!str || str === '-' || str.toUpperCase() === 'N/A' || str.toUpperCase() === 'SEM VEIC') return 'Sem Veic';
  return str.toUpperCase();
};

const numToMercChar = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
const mercCharToNum: Record<string, string> = {
  A: "0", B: "1", C: "2", D: "3", E: "4",
  F: "5", G: "6", H: "7", I: "8", J: "9"
};

const getMercosulPlate = (plate: string): string => {
  if (!plate) return '';
  const clean = plate.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (clean.length !== 7) return clean;
  if (/^[A-Z]{3}[0-9]{4}$/.test(clean)) {
    const d = parseInt(clean[4], 10);
    return clean.slice(0, 4) + numToMercChar[d] + clean.slice(5);
  }
  return clean;
};

const getOldPlate = (plate: string): string => {
  if (!plate) return '';
  const clean = plate.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (clean.length !== 7) return clean;
  if (/^[A-Z]{3}[0-9][A-Z][0-9]{2}$/.test(clean)) {
    const c = clean[4];
    const d = mercCharToNum[c];
    if (d !== undefined) {
      return clean.slice(0, 4) + d + clean.slice(5);
    }
  }
  return clean;
};

const normalizeKey = (s: string) => {
  if (!s) return '';
  return String(s).trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/["']/g, '').replace(/[\s_]/g, '').replace(/[^\x20-\x7E]/g, '');
};

const getVal = (row: any, ...keys: string[]) => {
  if (!row) return undefined;
  for (const key of keys) {
    if (row[key] !== undefined) return row[key];
  }
  const rowKeys = Object.keys(row);
  for (const key of keys) {
    const normKey = normalizeKey(key);
    for (let i = 0; i < rowKeys.length; i++) {
      const rk = rowKeys[i];
      if (normalizeKey(rk) === normKey) return row[rk];
    }
  }
  return undefined;
};

const parseNumeric = (val: any, isInteger: boolean = false): number => {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const str = String(val).trim();
  if (!str || str === '-' || str.toUpperCase() === 'N/A' || str.toUpperCase() === 'NULL') return 0;
  let cleanStr = str.replace(/[^\d.,-]/g, '');
  const lastDot = cleanStr.lastIndexOf('.');
  const lastComma = cleanStr.lastIndexOf(',');
  if (lastDot !== -1 && lastComma !== -1) {
    if (lastComma > lastDot) {
      cleanStr = cleanStr.replace(/\./g, '').replace(',', '.');
    } else {
      cleanStr = cleanStr.replace(/,/g, '');
    }
  } else if (lastComma !== -1) {
    cleanStr = cleanStr.replace(',', '.');
  }
  const num = isInteger ? parseInt(cleanStr, 10) : parseFloat(cleanStr);
  return isNaN(num) ? 0 : num;
};

const normalizeDate = (d: Date): Date => {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate(), 12, 0, 0, 0);
};

const parseDataAuto = (data: any): Date | null => {
  if (!data) return null;
  if (data instanceof Date) return normalizeDate(data);
  if (typeof data === "number" || (!isNaN(data) && !String(data).includes("/") && !String(data).includes("-") && String(data).length >= 5)) {
    const num = Number(data);
    return normalizeDate(new Date((num - 25569) * 86400 * 1000));
  }
  if (typeof data === "string") {
    const str = data.trim();
    if (!str) return null;
    if (str.includes("/")) {
      const parts = str.split("/");
      if (parts.length === 3) {
        const p0 = parseInt(parts[0], 10);
        const p1 = parseInt(parts[1], 10);
        let ano = parseInt(parts[2], 10);
        if (ano < 100) ano += 2000;
        let dia = p0;
        let mes = p1;
        if (p0 <= 12 && p1 > 12) { dia = p1; mes = p0; }
        const d = new Date(ano, mes - 1, dia);
        if (!isNaN(d.getTime())) return normalizeDate(d);
      }
    }
    if (str.includes("-")) {
      const parts = str.split("-");
      if (parts.length === 3) {
        if (parts[0].length === 4) {
          const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
          if (!isNaN(d.getTime())) return normalizeDate(d);
        } else {
          const d = new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));
          if (!isNaN(d.getTime())) return normalizeDate(d);
        }
      }
    }
  }
  return null;
};

const km_prod_calc = (km: any) => {
  const tripKm = (km.KM_FINAL > km.KM_INICIAL && km.KM_INICIAL > 0) ? (km.KM_FINAL - km.KM_INICIAL) : 0;
  if (km.KM_PRODUTIVO > 0) return km.KM_PRODUTIVO;
  if (km.KM_TOTAL > 0) return km.KM_TOTAL;
  if (tripKm > 0) return tripKm;
  return 0;
};

async function main() {
  const [tKm, tComb, tVeic] = await Promise.all([
    fetch(KM_SHEET_URL).then(r => r.text()),
    fetch(COMB_SHEET_URL).then(r => r.text()),
    fetch(VEIC_SHEET_URL).then(r => r.text())
  ]);

  const rawKm = Papa.parse(tKm, { header: true, skipEmptyLines: true, transformHeader: h => h.trim().replace(/^\uFEFF/, "") }).data as any[];
  const rawComb = Papa.parse(tComb, { header: true, skipEmptyLines: true, transformHeader: h => h.trim().replace(/^\uFEFF/, "") }).data as any[];
  const rawVeic = Papa.parse(tVeic, { header: true, skipEmptyLines: true, transformHeader: h => h.trim().replace(/^\uFEFF/, "") }).data as any[];

  console.log("Raw KM:", rawKm.length, "Comb:", rawComb.length, "Veic:", rawVeic.length);

  // Replicate dynamicCatalog
  const pToFFreq = new Map<string, Map<string, number>>();
  const fToPFreq = new Map<string, Map<string, number>>();
  const cToFFreq = new Map<string, Map<string, number>>();
  const fToCFreq = new Map<string, Map<string, number>>();
  const cToPFreq = new Map<string, Map<string, number>>();
  const pToCFreq = new Map<string, Map<string, number>>();
  const coringaToPFreq = new Map<string, Map<string, number>>();
  const coringaToFFreq = new Map<string, Map<string, number>>();

  const incrementFreq = (map: Map<string, Map<string, number>>, key: string, val: string, weight = 1) => {
    if (!key || !val) return;
    const inner = map.get(key) || new Map<string, number>();
    inner.set(val, (inner.get(val) || 0) + weight);
    map.set(key, inner);
  };

  const getWinnerVal = (outerMap: Map<string, Map<string, number>>, key: string): string => {
    const inner = outerMap.get(key);
    if (!inner || inner.size === 0) return '';
    let best = '';
    let max = -1;
    inner.forEach((cnt, val) => {
      if (cnt > max) {
        max = cnt;
        best = val;
      }
    });
    return best;
  };

  CORINGA_MAPPING.forEach(m => {
    const rawSistema = m.sistema.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const mercSistema = getMercosulPlate(rawSistema);
    const coringa = m.coringa.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const frota = String(m.frota).trim();
    const isCard = /^\d{15,19}$/.test(coringa);
    const weight = 2000;

    if (frota && frota !== 'Sem Veic' && frota !== 'N/A') {
      incrementFreq(fToPFreq, frota, mercSistema, weight);
      incrementFreq(pToFFreq, mercSistema, frota, weight);
      if (isCard) {
        incrementFreq(cToFFreq, coringa, frota, weight);
        incrementFreq(fToCFreq, frota, coringa, weight);
      }
      if (coringa.startsWith('COR')) {
        incrementFreq(coringaToFFreq, coringa, frota, weight);
      }
    }
    if (mercSistema) {
      if (isCard) {
        incrementFreq(cToPFreq, coringa, mercSistema, weight);
        incrementFreq(pToCFreq, mercSistema, coringa, weight);
      }
      if (coringa.startsWith('COR')) {
        incrementFreq(coringaToPFreq, coringa, mercSistema, weight);
      }
    }
  });

  rawVeic.forEach(v => {
    const rawPlate = String(v.PLACA || '').trim().toUpperCase();
    const rawFrota = normalizeFrota(v.FROTA || (v as any)['NUMERO FROTA']);
    const rawCard = String(v.CARTAO || (v as any)['CARTÃO'] || (v as any)['NUMERO CARTAO'] || '').trim().toUpperCase();
    const rawCor = String(v.CORINGA || (v as any)['Coringa'] || (v as any)['PLACA_CORINGA'] || '').trim().toUpperCase();

    const p = rawPlate && rawPlate !== 'N/A' && rawPlate !== 'UNKNOWN' ? normalizePlate(rawPlate) : '';
    const mercP = getMercosulPlate(p);
    const f = rawFrota && rawFrota !== 'N/A' && rawFrota !== 'Sem Veic' ? rawFrota : '';
    const c = rawCard && rawCard !== 'N/A' && rawCard !== '-' ? rawCard : '';
    const cor = rawCor && rawCor !== 'N/A' && rawCor !== '-' ? rawCor : '';

    const weight = 1000;

    if (mercP && f) {
      incrementFreq(fToPFreq, f, mercP, weight);
      incrementFreq(pToFFreq, mercP, f, weight);
    }
    if (mercP && c) {
      incrementFreq(pToCFreq, mercP, c, weight);
      incrementFreq(cToPFreq, c, mercP, weight);
    }
    if (f && c) {
      incrementFreq(fToCFreq, f, c, weight);
      incrementFreq(cToFFreq, c, f, weight);
    }
    if (cor) {
      if (f) incrementFreq(coringaToFFreq, cor, f, weight);
      if (mercP) incrementFreq(coringaToPFreq, cor, mercP, weight);
    }
  });

  const dynamicCatalog = {
    frotaToPlate: new Map<string, string>(),
    plateToFrota: new Map<string, string>(),
    cardToFrota: new Map<string, string>(),
    cardToPlate: new Map<string, string>(),
    coringaToPlate: new Map<string, string>(),
    coringaToFrota: new Map<string, string>()
  };

  fToPFreq.forEach((_, f) => {
    const p = getWinnerVal(fToPFreq, f);
    if (p) dynamicCatalog.frotaToPlate.set(f, getMercosulPlate(p));
  });
  pToFFreq.forEach((_, p) => {
    const f = getWinnerVal(pToFFreq, p);
    if (f) dynamicCatalog.plateToFrota.set(p, f);
  });
  cToFFreq.forEach((_, c) => {
    const f = getWinnerVal(cToFFreq, c);
    if (f) dynamicCatalog.cardToFrota.set(c, f);
  });
  cToPFreq.forEach((_, c) => {
    const p = getWinnerVal(cToPFreq, c);
    if (p) dynamicCatalog.cardToPlate.set(c, getMercosulPlate(p));
  });
  coringaToPFreq.forEach((_, cor) => {
    const p = getWinnerVal(coringaToPFreq, cor);
    if (p) dynamicCatalog.coringaToPlate.set(cor, getMercosulPlate(p));
  });
  coringaToFFreq.forEach((_, cor) => {
    const f = getWinnerVal(coringaToFFreq, cor);
    if (f) dynamicCatalog.coringaToFrota.set(cor, f);
  });

  // Seeds
  CORINGA_LOOKUP.forEach((p, cor) => {
    if (!dynamicCatalog.coringaToPlate.has(cor)) dynamicCatalog.coringaToPlate.set(cor, p);
  });
  FLEET_LOOKUP.forEach((f, cor) => {
    if (!dynamicCatalog.coringaToFrota.has(cor)) dynamicCatalog.coringaToFrota.set(cor, f);
  });

  // Process raw data into kmData and combData
  const kmData = rawKm.map(row => {
    const placa = String(getVal(row, 'PLACA', 'VEICULO', 'VEÍCULO', 'PREFIXO', 'FROTA', 'CARRO', 'IDENTIFICACAO', 'PLACA_VEICULO', 'PLACA VEICULO', 'EQUIPAMENTO') || '').trim();
    const frota = normalizeFrota(getVal(row, 'FROTA', 'PREFIXO', 'CODIGO', 'CÓDIGO', 'ID_VEICULO', 'ID VEICULO', 'NUMERO_FROTA', 'NUMERO FROTA', 'NUME', 'CARRO', 'EQUIPAMENTO'));
    const rawDate = getVal(row, 'DATA', 'DATA_ABASTECIMENTO', 'DATA ABASTECIMENTO', 'DATA_MOVIMENTO', 'DATA MOVIMENTO', 'DATA_EMISSAO', 'DATA EMISSAO', 'DATA_MOVIM', 'DATA MOVIM', 'DT_MOVIM', 'DT MOVIM', 'DT_TRANS', 'DT TRANS');
    const dateObj = parseDataAuto(rawDate);
    const dateStr = dateObj ? `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}` : '';
    const kmIni = parseNumeric(getVal(row, 'KM INICIAL', 'KM_INICIAL', 'KM INI', 'KM_INI', 'ODOMETRO_INICIAL', 'HODOMETRO_INICIAL', 'KM_SAIDA', 'KM SAIDA'), true);
    const kmFin = parseNumeric(getVal(row, 'KM FINAL', 'KM_FINAL', 'KM FIM', 'KM_FIM', 'ODOMETRO_FINAL', 'HODOMETRO_FINAL', 'KM_RETORNO', 'KM RETORNO'), true);
    const kmProd = parseNumeric(getVal(row, 'KM Produtivo', 'KM_PRODUTIVO', 'KM PRODUTIVO', 'KM_PROD', 'KM PROD', 'KM_PERCORRIDO', 'KM PERCORRIDO', 'DISTANCIA', 'DISTÂNCIA', 'KM_PROD_TOTAL', 'KM Produtivo (Planilha)', 'Soma de KM Produtivo', 'KM_PROD_PLANILHA', 'KM_PRODUTIVO_REAL', 'KM PRODUTIVO REAL', 'KM_PERC', 'KM PERC', 'KM', 'KILOMETRAGEM', 'KM_RODADO', 'KM RODADO', 'DIST_PERC', 'DIST PERC', 'KM_VIAGEM', 'KM VEICULO'), true);
    
    return {
      PLACA: placa,
      FROTA: frota,
      DATA: dateStr,
      KM_INICIAL: kmIni,
      KM_FINAL: kmFin,
      KM_TOTAL: (kmFin > kmIni && kmIni > 0) ? (kmFin - kmIni) : 0,
      KM_PRODUTIVO: kmProd,
      parsedDate: dateObj,
      OPERACAO: String(getVal(row, 'OPERACAO', 'OPERAÇÃO') || '').trim()
    };
  }).filter(item => (item.PLACA || item.FROTA) && item.DATA);

  const combData = rawComb.map(row => {
    const placa = String(getVal(row, 'PLACA', 'VEICULO', 'VEÍCULO', 'PREFIXO', 'FROTA', 'CARRO', 'IDENTIFICACAO', 'PLACA_VEICULO', 'PLACA VEICULO', 'EQUIPAMENTO') || '').trim();
    const cartao = String(getVal(row, 'CARTAO', 'CARTÃO', 'CARTÃO TEXTO', 'NUMERO CARTAO', 'NÚMERO CARTÃO', 'CARTAO_FROTA', 'CARTAO_ABASTECIMENTO', 'NUMERO_CARTAO', 'NUMERO CARTAO', 'CARTAO_EMPRESA') || '').trim();
    const frota = normalizeFrota(getVal(row, 'FROTA', 'NUMERO FROTA', 'NUME', 'PREFIXO', 'N_FROTA', 'NUMERO_FROTA', 'FROTA_VEICULO', 'CARRO', 'CODIGO_VEICULO', 'CODIGO VEICULO')) || 'Sem Veic';
    const rawDate = getVal(row, 'DATA TRANSACAO', 'DATA', 'DATA_TRANSACAO', 'DATA TRANSACAO', 'DATA_ABASTECIMENTO', 'DATA ABASTECIMENTO', 'DATA_MOVIMENTO', 'DATA MOVIMENTO', 'DATA_EMISSAO', 'DATA EMISSAO', 'DATA_MOVIM', 'DATA MOVIM', 'DT_MOVIM', 'DT MOVIM', 'DT_TRANS', 'DT TRANS');
    const dateObj = parseDataAuto(rawDate);
    const dateStr = dateObj ? `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}-${String(dateObj.getDate()).padStart(2, '0')}` : '';
    const lit = parseNumeric(getVal(row, 'LITROS', 'Soma de LITROS', 'VOLUME', 'QUANTIDADE', 'QTD', 'LITRAGEM', 'LITROS_ABASTECIDOS', 'VOLUME_ABASTECIDO', 'QTD_LITROS', 'QTD LITROS', 'LITROS_TOTAIS', 'LITROS TOTAIS'), false);
    const val = parseNumeric(getVal(row, 'VALOR EMISSAO', 'Soma de VALOR EMISSAO', 'VALOR', 'PRECO TOTAL', 'TOTAL', 'VALOR_TOTAL', 'VALOR_ABASTECIMENTO', 'VALOR_PAGO', 'VALOR PAGO', 'VALOR_TOTAL_ABASTECIMENTO', 'VALOR TOTAL ABASTECIMENTO'), false);
    
    return {
      PLACA: placa,
      DATA: dateStr,
      LITROS: lit,
      VALOR: val,
      KM: 0,
      TIPO_COMBUSTIVEL: String(getVal(row, 'TIPO COMBUSTIVEL', 'COMBUSTIVEL', 'PRODUTO', 'TIPO_COMBUSTIVEL', 'DESC_PRODUTO', 'PRODUTO_ABASTECIMENTO') || '').trim(),
      CARTAO: cartao,
      FROTA: frota,
      OPERACAO: '',
      MOTORISTA: '',
      parsedDate: dateObj
    };
  }).filter(item => (item.PLACA || item.FROTA || item.CARTAO) && item.DATA);

  // Helper resolveVehicle
  const resolveVehicle = (row: any) => {
    const rawPlate = normalizePlate(row.PLACA || '');
    let frota = normalizeFrota(row.FROTA);
    const rawCartao = String(row.CARTAO || '').trim().toUpperCase();

    if (frota === 'Sem Veic' || frota === 'N/A' || !frota) {
      if (rawPlate && dynamicCatalog.plateToFrota.has(rawPlate)) {
        frota = dynamicCatalog.plateToFrota.get(rawPlate) || '';
      } else if (rawCartao && dynamicCatalog.cardToFrota.has(rawCartao)) {
        frota = dynamicCatalog.cardToFrota.get(rawCartao) || '';
      } else if (rawCartao && FLEET_LOOKUP.has(rawCartao)) {
        frota = FLEET_LOOKUP.get(rawCartao) || '';
      } else if (rawPlate.startsWith('COR') && dynamicCatalog.coringaToFrota.has(rawPlate)) {
        frota = dynamicCatalog.coringaToFrota.get(rawPlate) || '';
      } else if (rawPlate.startsWith('COR') && FLEET_LOOKUP.has(rawPlate)) {
        frota = FLEET_LOOKUP.get(rawPlate) || '';
      } else if (rawPlate) {
        const oldP = getOldPlate(rawPlate);
        const mercP = getMercosulPlate(rawPlate);
        if (oldP && dynamicCatalog.plateToFrota.has(oldP)) frota = dynamicCatalog.plateToFrota.get(oldP) || '';
        else if (mercP && dynamicCatalog.plateToFrota.has(mercP)) frota = dynamicCatalog.plateToFrota.get(mercP) || '';
        else if (FLEET_LOOKUP.has(rawPlate)) frota = FLEET_LOOKUP.get(rawPlate) || '';
      }
    }

    const hasValidFrota = Boolean(frota && frota !== 'Sem Veic' && frota !== 'N/A');
    
    let canonicalPlate = rawPlate;
    if (hasValidFrota) {
      const pFromFrota = dynamicCatalog.frotaToPlate.get(frota) || CORINGA_LOOKUP.get(frota);
      if (pFromFrota && pFromFrota !== 'UNKNOWN') {
        if (!pFromFrota.startsWith('COR')) {
          canonicalPlate = pFromFrota;
        } else if (rawPlate && !rawPlate.startsWith('COR')) {
          canonicalPlate = rawPlate;
        }
      }
    } else if (rawPlate.startsWith('COR')) {
      const pFromCor = dynamicCatalog.coringaToPlate.get(rawPlate) || CORINGA_LOOKUP.get(rawPlate);
      if (pFromCor) canonicalPlate = pFromCor;
    }
    
    const merc = getMercosulPlate(canonicalPlate);
    if (merc && merc.length === 7) {
      canonicalPlate = merc;
    }

    const key = hasValidFrota ? `FROTA_${frota}` : `PLACA_${canonicalPlate || 'SEM_PLACA'}`;
    return { key, frota: hasValidFrota ? frota : 'Sem Veic', plate: canonicalPlate };
  };

  // Now consolidatedMonthlyReportData logic:
  // In consolidatedMonthlyReportData:
  const monthlyMap = new Map<string, any>();
  const allPlates = new Set<string>();
  kmData.forEach(r => { const v = resolveVehicle(r); if (v.plate) allPlates.add(v.plate); });
  combData.forEach(r => { const v = resolveVehicle(r); if (v.plate) allPlates.add(v.plate); });

  const vehicleMonthlyData = new Map<string, any>();
  allPlates.forEach(placa => {
    const months: any = {};
    for (let m = 1; m <= 12; m++) {
      months[String(m).padStart(2, '0')] = { kmInicial: 999999999, kmFinal: 0, kmProdutivoSum: 0, kmTotal: 0, litros: 0, valor: 0 };
    }
    vehicleMonthlyData.set(placa, months);
  });

  kmData.forEach(row => {
    const v = resolveVehicle(row);
    const placa = v.plate;
    if (!placa) return;
    const months = vehicleMonthlyData.get(placa);
    if (!months) return;
    const d = row.parsedDate;
    if (!d || d.getFullYear() !== 2026) return;
    const monthStr = String(d.getMonth() + 1).padStart(2, '0');
    const mData = months[monthStr];
    if (!mData) return;

    mData.kmProdutivoSum += km_prod_calc(row);
    const tripKm = row.KM_TOTAL > 0 ? row.KM_TOTAL : ((row.KM_FINAL > row.KM_INICIAL && row.KM_INICIAL > 0) ? (row.KM_FINAL - row.KM_INICIAL) : 0);
    mData.kmTotal += tripKm;
    if (row.KM_INICIAL > 0 && row.KM_INICIAL < mData.kmInicial) mData.kmInicial = row.KM_INICIAL;
    if (row.KM_FINAL > mData.kmFinal) mData.kmFinal = row.KM_FINAL;
  });

  combData.forEach(row => {
    const v = resolveVehicle(row);
    const placa = v.plate;
    if (!placa) return;
    const months = vehicleMonthlyData.get(placa);
    if (!months) return;
    const d = row.parsedDate;
    if (!d || d.getFullYear() !== 2026) return;
    const monthStr = String(d.getMonth() + 1).padStart(2, '0');
    const mData = months[monthStr];
    if (!mData) return;

    mData.litros += row.LITROS;
    mData.valor += row.VALOR;
  });

  let monthlyKmProd = 0;
  let monthlyLitros = 0;
  let monthlyValor = 0;

  for (let m = 1; m <= 12; m++) {
    const monthStr = String(m).padStart(2, '0');
    let mProd = 0;
    let mLit = 0;
    let mVal = 0;

    allPlates.forEach(placa => {
      const months = vehicleMonthlyData.get(placa)!;
      const rM = months[monthStr];
      const rangeKm = (rM.kmFinal > rM.kmInicial && rM.kmInicial > 0) ? (rM.kmFinal - rM.kmInicial) : 0;
      const finalKmProd = rM.kmProdutivoSum > 0 ? rM.kmProdutivoSum : (rM.kmTotal > 0 ? rM.kmTotal : rangeKm);
      mProd += Math.round(finalKmProd * 100) / 100;
      mLit += rM.litros;
      mVal += rM.valor;
    });

    monthlyKmProd += mProd;
    monthlyLitros += mLit;
    monthlyValor += mVal;
    console.log(`Month ${monthStr}: KM Prod = ${mProd}, Litros = ${mLit.toFixed(2)}, Valor = ${mVal.toFixed(2)}`);
  }

  console.log(`\nMonthly Report Total: KM Prod = ${monthlyKmProd}, Litros = ${monthlyLitros.toFixed(2)}, Valor = ${monthlyValor.toFixed(2)}`);

  // NOW let us run the EXACT consolidatedReportData from App.tsx:
  // In App.tsx:
  const byId = new Map<string, any>();
  const firstKmMap = new Map<string, any>();
  for (let i = 0; i < kmData.length; i++) {
    const r = kmData[i];
    const vInfo = resolveVehicle(r);
    if (!firstKmMap.has(vInfo.key)) firstKmMap.set(vInfo.key, r);
  }
  const firstFuelMap = new Map<string, any>();
  for (let i = 0; i < combData.length; i++) {
    const r = combData[i];
    const vInfo = resolveVehicle(r);
    if (!firstFuelMap.has(vInfo.key)) firstFuelMap.set(vInfo.key, r);
  }

  [...kmData, ...combData].forEach(r => {
    const vInfo = resolveVehicle(r);
    if (!byId.has(vInfo.key)) {
      byId.set(vInfo.key, {
        id: vInfo.plate || vInfo.key,
        vehicleKey: vInfo.key,
        placa: vInfo.plate,
        frota: vInfo.frota,
        kmInicial: 999999999,
        kmFinal: 0,
        km: 0,
        kmTotal: 0,
        kmProdutivo: 0,
        kmProdutivoSum: 0,
        maxKmProdutivo: 0,
        litros: 0,
        valor: 0,
        kml: 0,
        recordCount: 0,
        fuelRecordCount: 0
      });
    }
  });

  kmData.forEach(row => {
    const vInfo = resolveVehicle(row);
    const existing = byId.get(vInfo.key);
    if (!existing) return;
    const tripKm = row.KM_TOTAL > 0 ? row.KM_TOTAL : ((row.KM_FINAL > row.KM_INICIAL && row.KM_INICIAL > 0) ? (row.KM_FINAL - row.KM_INICIAL) : 0);
    existing.kmTotal += tripKm;
    const prod = km_prod_calc(row);
    if (prod > (existing.maxKmProdutivo || 0)) existing.maxKmProdutivo = prod;
    existing.kmProdutivoSum += prod;
    existing.recordCount++;
    if (row.KM_INICIAL > 0 && row.KM_INICIAL < existing.kmInicial) existing.kmInicial = row.KM_INICIAL;
    if (row.KM_FINAL > existing.kmFinal) existing.kmFinal = row.KM_FINAL;
  });

  combData.forEach(row => {
    const vInfo = resolveVehicle(row);
    const existing = byId.get(vInfo.key);
    if (!existing) return;
    existing.litros += (row.LITROS || 0);
    existing.valor += (row.VALOR || 0);
    existing.fuelRecordCount++;
  });

  // Now check what byId.values() has:
  let statsLitros = 0;
  let statsValor = 0;
  let statsKmProd = 0;

  byId.forEach(v => {
    const rangeKm = (v.kmFinal > v.kmInicial && v.kmInicial > 0) ? (v.kmFinal - v.kmInicial) : 0;
    const finalKmProd = v.kmProdutivoSum > 0 ? v.kmProdutivoSum : (v.kmTotal > 0 ? v.kmTotal : rangeKm);
    v.kmProdutivo = Math.round(finalKmProd * 100) / 100;
    v.kmTotal = Math.round(finalKmProd * 100) / 100;
    v.km = v.kmProdutivo;
    statsKmProd += v.kmProdutivo;
    statsLitros += v.litros;
    statsValor += v.valor;
  });

  console.log(`\nConsolidated byId Total: KM Prod = ${statsKmProd}, Litros = ${statsLitros.toFixed(2)}, Valor = ${statsValor.toFixed(2)}`);

  // Now let us check: What if filterKmProdutivo or filterStatusLitros or hideZeroGerencial or something else filters it?
  const filteredVehicles = Array.from(byId.values()).filter(v => (v.km > 0 || v.kmProdutivo > 0 || (v.litros || 0) > 0 || (v.valor || 0) > 0));
  console.log(`Filtered vehicles count: ${filteredVehicles.length}`);

  let zeroKmCount = 0;
  let zeroKmLitros = 0;
  let zeroKmValor = 0;
  filteredVehicles.forEach(v => {
    if (v.kmProdutivo === 0) {
      zeroKmCount++;
      zeroKmLitros += v.litros;
      zeroKmValor += v.valor;
      console.log(`Zero KM vehicle: key=${v.vehicleKey}, placa=${v.placa}, frota=${v.frota}, litros=${v.litros.toFixed(2)}, valor=${v.valor.toFixed(2)}`);
    }
  });
  console.log(`\nVehicles with KM=0: count=${zeroKmCount}, totalLitros=${zeroKmLitros.toFixed(2)}, totalValor=${zeroKmValor.toFixed(2)}`);
  console.log(`If excluded: Remaining Litros = ${(statsLitros - zeroKmLitros).toFixed(2)}, Remaining Valor = ${(statsValor - zeroKmValor).toFixed(2)}`);

  // What about detailedDateReportTotals?
  // Let us compute detailedDateReportTotals:
  let dLitros = 0;
  let dValor = 0;
  let dKmProd = 0;

  // In App.tsx:
  // For each vehicle in consolidatedReportData:
  filteredVehicles.forEach(v => {
    dKmProd += v.kmProdutivo;
    dLitros += v.litros;
    dValor += v.valor;
  });
  console.log(`detailedDateReportTotals check: KM Prod = ${dKmProd}, Litros = ${dLitros.toFixed(2)}, Valor = ${dValor.toFixed(2)}`);
}

main().catch(console.error);
