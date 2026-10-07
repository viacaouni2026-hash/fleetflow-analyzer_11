import fs from "fs";
import Papa from "papaparse";

const KM_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1Tw2YN42YrMXqetgLbYwCdzO0jMNxTOwnR4l2oFVPp4M/gviz/tq?tqx=out:csv&sheet=LOGISTICA';
const COMB_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1k_sBpRhmokk02rhl72zSWC2j9U9jFBJjGfIbRs-dTPE/gviz/tq?tqx=out:csv&sheet=Combustivel';
const VEIC_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1UKMYrCErWztQXh7j4RHk9qAIJRMOEBvTjA-qV5JOerw/gviz/tq?tqx=out:csv&sheet=Info_BI';

const appSrc = fs.readFileSync("src/App.tsx", "utf8");
const coringaMatch = appSrc.match(/const CORINGA_MAPPING = (\[[\s\S]*?\]);/);
const CORINGA_MAPPING = coringaMatch ? eval(coringaMatch[1]) : [];

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

const formatDateISO = (date: Date | null): string => {
  if (!date || isNaN(date.getTime())) return '';
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const km_prod_calc = (km: any) => {
  const tripKm = (km.KM_FINAL > km.KM_INICIAL && km.KM_INICIAL > 0) ? (km.KM_FINAL - km.KM_INICIAL) : 0;
  if (km.KM_PRODUTIVO > 0) return km.KM_PRODUTIVO;
  if (km.KM_TOTAL > 0) return km.KM_TOTAL;
  if (tripKm > 0) return tripKm;
  return 0;
};

// Mercosul plate conversion table: 5th character digit to letter
const numToMercChar = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
const toMercosulPlate = (plate: string): string => {
  if (!plate || plate.length !== 7) return plate;
  // If LLLDDDD (e.g. CUE0189)
  if (/^[A-Z]{3}[0-9]{4}$/.test(plate)) {
    const d = parseInt(plate[4], 10);
    return plate.slice(0, 4) + numToMercChar[d] + plate.slice(5);
  }
  return plate;
};

async function main() {
  const [tKm, tComb, tVeic] = await Promise.all([
    fetch(KM_SHEET_URL).then(r => r.text()),
    fetch(COMB_SHEET_URL).then(r => r.text()),
    fetch(VEIC_SHEET_URL).then(r => r.text())
  ]);

  const rawKm = Papa.parse(tKm, { header: true, skipEmptyLines: true }).data as any[];
  const rawComb = Papa.parse(tComb, { header: true, skipEmptyLines: true }).data as any[];
  const rawVeic = Papa.parse(tVeic, { header: true, skipEmptyLines: true }).data as any[];

  // Comb processing
  const combData = rawComb.map(row => {
    const rawDate = getVal(row, 'DATA TRANSACAO', 'DATA', 'DATA_TRANSACAO', 'DATA TRANSACAO', 'DATA_ABASTECIMENTO', 'DATA ABASTECIMENTO', 'DATA_MOVIMENTO', 'DATA MOVIMENTO', 'DATA_EMISSAO', 'DATA EMISSAO', 'DATA_MOVIM', 'DATA MOVIM', 'DT_MOVIM', 'DT MOVIM', 'DT_TRANS', 'DT TRANS');
    const dateObj = parseDataAuto(rawDate);
    const dateStr = formatDateISO(dateObj);
    const placa = String(getVal(row, 'PLACA', 'VEICULO', 'VEÍCULO', 'PREFIXO', 'FROTA', 'CARRO', 'IDENTIFICACAO', 'PLACA_VEICULO', 'PLACA VEICULO', 'EQUIPAMENTO') || '').trim();
    const cartao = String(getVal(row, 'CARTAO', 'CARTÃO', 'CARTÃO TEXTO', 'NUMERO CARTAO', 'NÚMERO CARTÃO', 'CARTAO_FROTA', 'CARTAO_ABASTECIMENTO', 'NUMERO_CARTAO', 'NUMERO CARTAO', 'CARTAO_EMPRESA') || '').trim();
    const frota = normalizeFrota(getVal(row, 'FROTA', 'NUMERO FROTA', 'NUME', 'PREFIXO', 'N_FROTA', 'NUMERO_FROTA', 'FROTA_VEICULO', 'CARRO', 'CODIGO_VEICULO', 'CODIGO VEICULO')) || 'N/A';
    
    return {
      PLACA: placa,
      DATA: dateStr,
      LITROS: parseNumeric(getVal(row, 'LITROS', 'Soma de LITROS', 'VOLUME', 'QUANTIDADE', 'QTD', 'LITRAGEM', 'LITROS_ABASTECIDOS', 'VOLUME_ABASTECIDO', 'QTD_LITROS', 'QTD LITROS', 'LITROS_TOTAIS', 'LITROS TOTAIS'), false),
      VALOR: parseNumeric(getVal(row, 'VALOR EMISSAO', 'Soma de VALOR EMISSAO', 'VALOR', 'PRECO TOTAL', 'TOTAL', 'VALOR_TOTAL', 'VALOR_ABASTECIMENTO', 'VALOR_PAGO', 'VALOR PAGO', 'VALOR_TOTAL_ABASTECIMENTO', 'VALOR TOTAL ABASTECIMENTO'), false),
      KM: parseNumeric(getVal(row, 'KM', 'ODOMETRO', 'ODÔMETRO', 'KILOMETRAGEM', 'KM_ABASTECIMENTO', 'KM_ATUAL', 'KM_ANT', 'KM_ATU', 'KM_ODOMETRO', 'KM ODOMETRO', 'KM_VEICULO', 'KM VEICULO'), true),
      TIPO_COMBUSTIVEL: String(getVal(row, 'TIPO COMBUSTIVEL', 'COMBUSTIVEL', 'PRODUTO', 'TIPO_COMBUSTIVEL', 'DESC_PRODUTO', 'PRODUTO_ABASTECIMENTO') || '').trim(),
      CARTAO: cartao,
      FROTA: frota,
      OPERACAO: 'N/A',
      parsedDate: dateObj
    };
  }).filter(item => (item.PLACA || item.FROTA || item.CARTAO) && item.DATA);

  // KM processing
  const kmData = rawKm.map(row => {
    const rawDate = getVal(row, 'Data', 'DATA', 'DATA_VIAGEM', 'DATA VIAGEM', 'DATA_EMISSAO', 'DATA EMISSAO', 'DATA_MOVIMENTO', 'DATA MOVIMENTO', 'DATA_SAIDA', 'DATA SAIDA', 'DATA_INICIO', 'DATA INICIO', 'DataInicio');
    const dateObj = parseDataAuto(rawDate);
    const dateStr = formatDateISO(dateObj);
    const placa = String(getVal(row, 'Placa', 'PLACA', 'VEICULO', 'VEÍCULO', 'CARRO', 'IDENTIFICACAO', 'PLACA_VEICULO', 'PLACA VEICULO', 'EQUIPAMENTO') || '').trim();
    const frota = normalizeFrota(getVal(row, 'Frota', 'FROTA', 'PREFIXO', 'CARRO', 'ID_VEICULO', 'ID VEICULO', 'NUMERO_FROTA', 'NUMERO FROTA', 'NUME', 'EQUIPAMENTO', 'CODIGO_VEICULO', 'CODIGO VEICULO')) || 'N/A';
    
    return {
      PLACA: placa,
      DATA: dateStr,
      KM_INICIAL: parseNumeric(getVal(row, 'KM Inicial', 'KM_INICIAL', 'KM INICIAL', 'KM_INI', 'KM INI', 'ODOMETRO_INICIAL', 'ODOMETRO INICIAL', 'KM_SAIDA', 'KM SAIDA', 'KM_ORIGEM', 'KM ORIGEM', 'HODOMETRO_INICIAL', 'HODOMETRO INICIAL'), true),
      KM_FINAL: parseNumeric(getVal(row, 'KM Final', 'KM_FINAL', 'KM FINAL', 'KM_FIM', 'KM FIM', 'ODOMETRO_FINAL', 'ODOMETRO FINAL', 'KM_RETORNO', 'KM RETORNO', 'KM_DESTINO', 'KM DESTINO', 'HODOMETRO_FINAL', 'HODOMETRO FINAL'), true),
      KM_TOTAL: parseNumeric(getVal(row, 'KM_TOTAL', 'KM TOTAL', 'KM_RODADO', 'KM RODADO', 'KM_PERCORRIDO', 'KM PERCORRIDO', 'DISTANCIA', 'DISTÂNCIA', 'TOTAL_KM', 'TOTAL KM', 'KM_LIQUIDO', 'KM LIQUIDO'), true),
      KM_PRODUTIVO: parseNumeric(getVal(row, 'KM Produtivo', 'KM_PRODUTIVO', 'KM PRODUTIVO', 'KM_PROD', 'KM PROD', 'KM_PERCORRIDO', 'KM PERCORRIDO', 'DISTANCIA', 'DISTÂNCIA', 'KM_PROD_TOTAL', 'KM Produtivo (Planilha)', 'Soma de KM Produtivo', 'KM_PROD_PLANILHA', 'KM_PRODUTIVO_REAL', 'KM PRODUTIVO REAL', 'KM_PERC', 'KM PERC', 'KM', 'KILOMETRAGEM', 'KM_RODADO', 'KM RODADO', 'DIST_PERC', 'DIST PERC', 'KM_VIAGEM', 'KM VEICULO'), true),
      OPERACAO: String(getVal(row, 'Operação', 'OPERACAO', 'OPERAÇÃO', 'LINHA', 'ROTA', 'MARGEM', 'SERVICO', 'SERVIÇO', 'PROJETO', 'CENTRO_CUSTO', 'CENTRO CUSTO', 'CC', 'DEPARTAMENTO', 'SETOR') || 'N/A').toUpperCase().trim(),
      FROTA: frota,
      parsedDate: dateObj
    };
  }).filter(item => (item.PLACA || item.FROTA) && item.DATA);

  // Dynamic Catalog exactly as in App.tsx
  const fToPFreq = new Map<string, Map<string, number>>();
  const pToFFreq = new Map<string, Map<string, number>>();
  const cToFFreq = new Map<string, Map<string, number>>();
  const fToCFreq = new Map<string, Map<string, number>>();
  const cToPFreq = new Map<string, Map<string, number>>();
  const pToCFreq = new Map<string, Map<string, number>>();

  const incrementFreq = (outerMap: Map<string, Map<string, number>>, key1: string, key2: string, weight = 1) => {
    if (!key1 || !key2) return;
    if (!outerMap.has(key1)) outerMap.set(key1, new Map<string, number>());
    const inner = outerMap.get(key1)!;
    inner.set(key2, (inner.get(key2) || 0) + weight);
  };

  const getWinnerVal = (outerMap: Map<string, Map<string, number>>, key: string): string => {
    const inner = outerMap.get(key);
    if (!inner || inner.size === 0) return '';
    let best = '';
    let max = -1;
    inner.forEach((cnt, val) => {
      if (cnt > max) { max = cnt; best = val; }
    });
    return best;
  };

  rawVeic.forEach(v => {
    const p = normalizePlate(v.PLACA);
    const f = normalizeFrota(v.FROTA);
    const c = String(v.CARTAO || '').trim().toUpperCase();
    const weight = 1000;
    if (p && f && f !== 'Sem Veic') { incrementFreq(fToPFreq, f, p, weight); incrementFreq(pToFFreq, p, f, weight); }
    if (p && c) { incrementFreq(pToCFreq, p, c, weight); incrementFreq(cToPFreq, c, p, weight); }
    if (f && c && f !== 'Sem Veic') { incrementFreq(fToCFreq, f, c, weight); incrementFreq(cToFFreq, c, f, weight); }
  });

  kmData.forEach(k => {
    const p = normalizePlate(k.PLACA);
    const f = normalizeFrota(k.FROTA);
    if (p && f && f !== 'Sem Veic') { incrementFreq(fToPFreq, f, p, 10); incrementFreq(pToFFreq, p, f, 10); }
  });

  combData.forEach(c => {
    const p = normalizePlate(c.PLACA);
    const f = normalizeFrota(c.FROTA);
    const card = c.CARTAO;
    if (p && f && f !== 'Sem Veic') { incrementFreq(fToPFreq, f, p, 5); incrementFreq(pToFFreq, p, f, 5); }
    if (p && card) { incrementFreq(pToCFreq, p, card, 5); incrementFreq(cToPFreq, card, p, 5); }
    if (f && card && f !== 'Sem Veic') { incrementFreq(fToCFreq, f, card, 5); incrementFreq(cToFFreq, card, f, 5); }
  });

  const dynamicCatalog = {
    frotaToPlate: new Map<string, string>(),
    plateToFrota: new Map<string, string>(),
    cardToPlate: new Map<string, string>(),
    plateToCard: new Map<string, string>(),
    cardToFrota: new Map<string, string>(),
    frotaToCard: new Map<string, string>()
  };

  fToPFreq.forEach((_, f) => { const w = getWinnerVal(fToPFreq, f); if (w) dynamicCatalog.frotaToPlate.set(f, w); });
  pToFFreq.forEach((_, p) => { const w = getWinnerVal(pToFFreq, p); if (w) dynamicCatalog.plateToFrota.set(p, w); });
  cToPFreq.forEach((_, c) => { const w = getWinnerVal(cToPFreq, c); if (w) dynamicCatalog.cardToPlate.set(c, w); });
  pToCFreq.forEach((_, p) => { const w = getWinnerVal(pToCFreq, p); if (w) dynamicCatalog.plateToCard.set(p, w); });
  cToFFreq.forEach((_, c) => { const w = getWinnerVal(cToFFreq, c); if (w) dynamicCatalog.cardToFrota.set(c, w); });
  fToCFreq.forEach((_, f) => { const w = getWinnerVal(fToCFreq, f); if (w) dynamicCatalog.frotaToCard.set(f, w); });

  // CORINGA Maps
  const CORINGA_LOOKUP = new Map<string, string>();
  const FLEET_LOOKUP = new Map<string, string>();
  CORINGA_MAPPING.forEach((m: any) => {
    const sistema = m.sistema.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const coringa = m.coringa.toUpperCase().replace(/[^A-Z0-9]/g, '');
    const frota = String(m.frota).trim();
    CORINGA_LOOKUP.set(coringa, sistema);
    CORINGA_LOOKUP.set(sistema, sistema);
    FLEET_LOOKUP.set(coringa, frota);
    FLEET_LOOKUP.set(sistema, frota);
  });

  // KM Plates set
  const kmPlatesSet = new Set<string>();
  kmData.forEach(k => {
    const p = normalizePlate(k.PLACA);
    if (p) kmPlatesSet.add(p);
  });

  // SMART RESOLVER
  const getVehicleID_IMPROVED = (item: any, type?: 'km' | 'fuel') => {
    const rawPlate = String(getVal(item, 'PLACA', 'VEICULO', 'VEÍCULO', 'CARRO', 'EQUIPAMENTO', 'PLACA_VEICULO', 'PLACA VEICULO', 'IDENTIFICACAO') || '').trim().toUpperCase();
    const rawFrota = normalizeFrota(getVal(item, 'FROTA', 'PREFIXO', 'CODIGO', 'CÓDIGO', 'ID_VEICULO', 'ID VEICULO', 'NUMERO_FROTA', 'NUMERO FROTA', 'NUME', 'CARRO', 'EQUIPAMENTO'));
    const rawCartao = String(getVal(item, 'CARTAO', 'Cartão', 'CARTÃO', 'CARTÃO TEXTO', 'NUMERO_CARTAO', 'NUMERO CARTAO', 'CARTAO_FROTA', 'CARTAO_ABASTECIMENTO', 'CARTAO_EMPRESA', 'NUMERO_CARTAO_FROTA') || '').trim().toUpperCase();

    const normPlate = normalizePlate(rawPlate);
    const normFrota = rawFrota !== 'Sem Veic' && rawFrota !== 'N/A' ? rawFrota : '';
    const normCartao = (rawCartao && rawCartao !== 'N/A' && rawCartao !== '-') ? rawCartao : '';

    let canonical = 'UNKNOWN';
    let frota = 'Sem Veic';

    // 1. First check if normPlate has a Coringa or Mercosul mapping
    if (normPlate && normPlate !== 'UNKNOWN') {
      const fromCoringa = CORINGA_LOOKUP.get(normPlate);
      if (fromCoringa) {
        canonical = fromCoringa;
      } else {
        const merc = toMercosulPlate(normPlate);
        if (CORINGA_LOOKUP.has(merc)) {
          canonical = CORINGA_LOOKUP.get(merc)!;
        } else if (kmPlatesSet.has(merc)) {
          canonical = merc;
        } else {
          canonical = normPlate;
        }
      }
    }

    // 2. Resolve frota
    if (normFrota) {
      frota = normFrota;
    } else if (canonical && canonical !== 'UNKNOWN') {
      frota = dynamicCatalog.plateToFrota.get(canonical) || FLEET_LOOKUP.get(canonical) || 'Sem Veic';
    } else if (normPlate) {
      frota = dynamicCatalog.plateToFrota.get(normPlate) || FLEET_LOOKUP.get(normPlate) || 'Sem Veic';
    }

    if (frota === 'Sem Veic' && normCartao) {
      frota = dynamicCatalog.cardToFrota.get(normCartao) || FLEET_LOOKUP.get(normCartao) || 'Sem Veic';
    }

    // 3. If canonical is UNKNOWN or a placeholder COR..., try frota or card
    if (canonical === 'UNKNOWN' || canonical.startsWith('COR') || !kmPlatesSet.has(canonical)) {
      if (frota && frota !== 'Sem Veic') {
        const pFromFrota = dynamicCatalog.frotaToPlate.get(frota) || CORINGA_LOOKUP.get(frota);
        if (pFromFrota && pFromFrota !== 'UNKNOWN' && !pFromFrota.startsWith('COR')) {
          canonical = pFromFrota;
        }
      }
      if ((canonical === 'UNKNOWN' || canonical.startsWith('COR')) && normCartao) {
        const pFromCard = dynamicCatalog.cardToPlate.get(normCartao) || CORINGA_LOOKUP.get(normCartao);
        if (pFromCard && pFromCard !== 'UNKNOWN' && !pFromCard.startsWith('COR')) {
          canonical = pFromCard;
        }
      }
    }

    if (canonical === 'UNKNOWN') {
      canonical = normPlate || normCartao || normFrota || 'UNKNOWN';
    }

    return { plate: canonical, frota };
  };

  // Evaluate with IMPROVED resolver
  const kmPlatesNew = new Set<string>();
  kmData.forEach(k => {
    const { plate } = getVehicleID_IMPROVED(k, 'km');
    kmPlatesNew.add(plate);
  });

  const combPlatesNew = new Map<string, { count: number, litros: number, valor: number }>();
  combData.forEach(c => {
    const { plate } = getVehicleID_IMPROVED(c, 'fuel');
    const entry = combPlatesNew.get(plate) || { count: 0, litros: 0, valor: 0 };
    entry.count++;
    entry.litros += c.LITROS;
    entry.valor += c.VALOR;
    combPlatesNew.set(plate, entry);
  });

  console.log(`IMPROVED getVehicleID: KM unique plates = ${kmPlatesNew.size}`);
  console.log(`IMPROVED getVehicleID: Comb unique plates = ${combPlatesNew.size}`);

  let matchedLitros = 0;
  let matchedValor = 0;
  let unmatchedLitros = 0;
  let unmatchedValor = 0;

  combPlatesNew.forEach((stats, plate) => {
    if (kmPlatesNew.has(plate)) {
      matchedLitros += stats.litros;
      matchedValor += stats.valor;
    } else {
      unmatchedLitros += stats.litros;
      unmatchedValor += stats.valor;
      console.log(`STILL UNMATCHED Plate: ${plate} -> Litros = ${stats.litros.toFixed(2)}, Valor = ${stats.valor.toFixed(2)} (${stats.count} abastecimentos)`);
    }
  });

  console.log(`Matched with KM: Litros = ${matchedLitros.toFixed(2)}, Valor = ${matchedValor.toFixed(2)}`);
  console.log(`UNMATCHED: Litros = ${unmatchedLitros.toFixed(2)}, Valor = ${unmatchedValor.toFixed(2)}`);
}

main().catch(console.error);
