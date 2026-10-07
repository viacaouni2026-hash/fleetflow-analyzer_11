import fs from "fs";
import Papa from "papaparse";

const KM_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1Tw2YN42YrMXqetgLbYwCdzO0jMNxTOwnR4l2oFVPp4M/gviz/tq?tqx=out:csv&sheet=LOGISTICA';
const COMB_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1k_sBpRhmokk02rhl72zSWC2j9U9jFBJjGfIbRs-dTPE/gviz/tq?tqx=out:csv&sheet=Combustivel';
const VEIC_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1UKMYrCErWztQXh7j4RHk9qAIJRMOEBvTjA-qV5JOerw/gviz/tq?tqx=out:csv&sheet=Info_BI';

const appSrc = fs.readFileSync("src/App.tsx", "utf8");
const coringaMatch = appSrc.match(/const CORINGA_MAPPING = (\[[\s\S]*?\]);/);
const CORINGA_MAPPING: any[] = coringaMatch ? eval(coringaMatch[1]) : [];

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

  console.log(`Loaded rows: KM=${rawKm.length}, Comb=${rawComb.length}, Veic=${rawVeic.length}`);

  // 1. Process combData
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

  // 2. Process kmData
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

  console.log(`Processed kmData: ${kmData.length}, combData: ${combData.length}`);

  // Now dynamicCatalog
  const plateToFrota = new Map<string, string>();
  const frotaToPlate = new Map<string, string>();
  const cardToPlate = new Map<string, string>();
  const cardToFrota = new Map<string, string>();
  const coringaToPlate = new Map<string, string>();
  const coringaToFrota = new Map<string, string>();

  // From CORINGA_MAPPING
  CORINGA_MAPPING.forEach(m => {
    const cor = m.coringa.toUpperCase();
    const sis = m.sistema.toUpperCase();
    const fro = normalizeFrota(m.frota);
    if (/^\d{15,19}$/.test(cor)) {
      if (sis) cardToPlate.set(cor, sis);
      if (fro) cardToFrota.set(cor, fro);
    } else {
      if (sis) coringaToPlate.set(cor, sis);
      if (fro) coringaToFrota.set(cor, fro);
    }
    if (fro && sis) {
      plateToFrota.set(sis, fro);
      frotaToPlate.set(fro, sis);
    }
  });

  // From Info_BI (rawVeic)
  rawVeic.forEach(v => {
    const p = normalizePlate(getVal(v, 'PLACA'));
    const f = normalizeFrota(getVal(v, 'FROTA', 'PREFIXO', 'CARRO', 'NUMERO FROTA'));
    const c = String(getVal(v, 'CARTAO', 'CARTÃO') || '').trim();
    const cor = String(getVal(v, 'CORINGA') || '').trim().toUpperCase();
    if (p && f && f !== 'Sem Veic') {
      plateToFrota.set(p, f);
      frotaToPlate.set(f, p);
    }
    if (c) {
      if (p) cardToPlate.set(c, p);
      if (f && f !== 'Sem Veic') cardToFrota.set(c, f);
    }
    if (cor) {
      if (p) coringaToPlate.set(cor, p);
      if (f && f !== 'Sem Veic') coringaToFrota.set(cor, f);
    }
  });

  // Build getVehicleID
  const getVehicleID = (item: any) => {
    const rawPlate = normalizePlate(item.PLACA);
    let frota = normalizeFrota(item.FROTA);
    const cartao = String(item.CARTAO || '').trim();

    if (frota === 'Sem Veic' || frota === 'N/A' || !frota) {
      if (rawPlate && plateToFrota.has(rawPlate)) frota = plateToFrota.get(rawPlate)!;
      else if (cartao && cardToFrota.has(cartao)) frota = cardToFrota.get(cartao)!;
      else if (rawPlate.startsWith('COR') && coringaToFrota.has(rawPlate)) frota = coringaToFrota.get(rawPlate)!;
    }

    let canonical = rawPlate;
    if (frota !== 'Sem Veic' && frotaToPlate.has(frota)) {
      canonical = frotaToPlate.get(frota)!;
    } else if (cartao && cardToPlate.has(cartao)) {
      canonical = cardToPlate.get(cartao)!;
    } else if (rawPlate.startsWith('COR') && coringaToPlate.has(rawPlate)) {
      canonical = coringaToPlate.get(rawPlate)!;
    }

    const merc = getMercosulPlate(canonical);
    if (merc && merc.length === 7) canonical = merc;

    const hasValidFrota = Boolean(frota && frota !== 'Sem Veic' && frota !== 'N/A');
    const key = hasValidFrota ? `FROTA_${frota}` : `PLACA_${canonical || 'SEM_PLACA'}`;
    return { key, frota, plate: canonical };
  };

  // Now let us build byId like consolidatedReportData does:
  const byId = new Map<string, any>();

  // Add all KM records
  kmData.forEach(km => {
    const vInfo = getVehicleID(km);
    if (!byId.has(vInfo.key)) {
      byId.set(vInfo.key, {
        key: vInfo.key,
        frota: vInfo.frota,
        placa: vInfo.plate,
        kmProdutivoSum: 0,
        kmTotal: 0,
        kmInicial: 999999999,
        kmFinal: 0,
        litros: 0,
        valor: 0
      });
    }
    const existing = byId.get(vInfo.key);
    const prod = km_prod_calc(km);
    existing.kmProdutivoSum += prod;
    existing.kmTotal += km.KM_TOTAL;
    if (km.KM_INICIAL > 0 && km.KM_INICIAL < existing.kmInicial) existing.kmInicial = km.KM_INICIAL;
    if (km.KM_FINAL > existing.kmFinal) existing.kmFinal = km.KM_FINAL;
  });

  // Add all Fuel records
  combData.forEach(c => {
    const vInfo = getVehicleID(c);
    if (!byId.has(vInfo.key)) {
      byId.set(vInfo.key, {
        key: vInfo.key,
        frota: vInfo.frota,
        placa: vInfo.plate,
        kmProdutivoSum: 0,
        kmTotal: 0,
        kmInicial: 999999999,
        kmFinal: 0,
        litros: 0,
        valor: 0
      });
    }
    const existing = byId.get(vInfo.key);
    existing.litros += c.LITROS;
    existing.valor += c.VALOR;
  });

  let totalKmProdutivo = 0;
  let totalLitros = 0;
  let totalValor = 0;

  byId.forEach(v => {
    const rangeKm = (v.kmFinal > v.kmInicial && v.kmInicial > 0) ? (v.kmFinal - v.kmInicial) : 0;
    const finalKmProd = v.kmProdutivoSum > 0 ? v.kmProdutivoSum : (v.kmTotal > 0 ? v.kmTotal : rangeKm);
    v.kmProdutivo = Math.round(finalKmProd * 100) / 100;
    totalKmProdutivo += v.kmProdutivo;
    totalLitros += v.litros;
    totalValor += v.valor;
  });

  console.log(`Pipeline totals:`);
  console.log(`totalKmProdutivo = ${totalKmProdutivo.toLocaleString('pt-BR')}`);
  console.log(`totalLitros = ${totalLitros.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
  console.log(`totalValor = ${totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`);
}

main().catch(console.error);
