import Papa from "papaparse";
import fs from "fs";

const COMB_SHEET_URL = "https://docs.google.com/spreadsheets/d/1k_sBpRhmokk02rhl72zSWC2j9U9jFBJjGfIbRs-dTPE/gviz/tq?tqx=out:csv&sheet=Combustivel";
const KM_SHEET_URL = "https://docs.google.com/spreadsheets/d/1Tw2YN42YrMXqetgLbYwCdzO0jMNxTOwnR4l2oFVPp4M/gviz/tq?tqx=out:csv&sheet=LOGISTICA";
const VEIC_SHEET_URL = "https://docs.google.com/spreadsheets/d/1UKMYrCErWztQXh7j4RHk9qAIJRMOEBvTjA-qV5JOerw/gviz/tq?tqx=out:csv&sheet=Info_BI";

// Parse functions
const normalizePlate = (plate: string | undefined | null): string => {
  if (!plate) return "";
  return plate.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
};

const normalizeFrota = (frota: any): string => {
  if (frota === undefined || frota === null || frota === "") return "Sem Veic";
  const str = String(frota).trim();
  if (!str || str === "-" || str.toUpperCase() === "N/A" || str.toUpperCase() === "SEM VEIC") return "Sem Veic";
  return str.toUpperCase();
};

const numToMercChar = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
const mercCharToNum: Record<string, string> = {
  A: "0", B: "1", C: "2", D: "3", E: "4",
  F: "5", G: "6", H: "7", I: "8", J: "9"
};

const getMercosulPlate = (plate: string): string => {
  if (!plate) return "";
  const clean = plate.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (clean.length !== 7) return clean;
  if (/^[A-Z]{3}[0-9]{4}$/.test(clean)) {
    const d = parseInt(clean[4], 10);
    return clean.slice(0, 4) + numToMercChar[d] + clean.slice(5);
  }
  return clean;
};

const getOldPlate = (plate: string): string => {
  if (!plate) return "";
  const clean = plate.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
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
  if (!s) return "";
  return String(s).trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase().replace(/["']/g, "").replace(/[\s_]/g, "").replace(/[^\x20-\x7E]/g, "");
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
  if (val === undefined || val === null || val === "") return 0;
  if (typeof val === "number") return isNaN(val) ? 0 : val;
  const str = String(val).trim();
  if (!str || str === "-" || str.toUpperCase() === "N/A" || str.toUpperCase() === "NULL") return 0;
  let cleanStr = str.replace(/[^\d.,-]/g, "");
  const lastDot = cleanStr.lastIndexOf(".");
  const lastComma = cleanStr.lastIndexOf(",");
  if (lastDot !== -1 && lastComma !== -1) {
    if (lastComma > lastDot) {
      cleanStr = cleanStr.replace(/\./g, "").replace(",", ".");
    } else {
      cleanStr = cleanStr.replace(/,/g, "");
    }
  } else if (lastComma !== -1) {
    cleanStr = cleanStr.replace(",", ".");
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
  if (!date || isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const km_prod_calc = (km: any) => {
  const tripKm = (km.KM_FINAL > km.KM_INICIAL && km.KM_INICIAL > 0) ? (km.KM_FINAL - km.KM_INICIAL) : 0;
  if (km.KM_PRODUTIVO > 0) return km.KM_PRODUTIVO;
  if (km.KM_TOTAL > 0) return km.KM_TOTAL;
  if (tripKm > 0) return tripKm;
  return 0;
};

async function run() {
  const [tKm, tComb, tVeic] = await Promise.all([
    fetch(KM_SHEET_URL).then(r => r.text()),
    fetch(COMB_SHEET_URL).then(r => r.text()),
    fetch(VEIC_SHEET_URL).then(r => r.text())
  ]);

  const rawKm = Papa.parse(tKm, { header: true, skipEmptyLines: true }).data as any[];
  const rawComb = Papa.parse(tComb, { header: true, skipEmptyLines: true }).data as any[];
  const rawVeic = Papa.parse(tVeic, { header: true, skipEmptyLines: true }).data as any[];

  console.log("Raw KM rows:", rawKm.length);
  console.log("Raw Comb rows:", rawComb.length);

  let rawTotalLit = 0;
  let rawTotalVal = 0;
  rawComb.forEach(r => {
    rawTotalLit += parseNumeric(getVal(r, "LITROS", "Soma de LITROS", "VOLUME", "QUANTIDADE", "QTD", "LITRAGEM", "LITROS_ABASTECIDOS", "VOLUME_ABASTECIDO", "QTD_LITROS", "QTD LITROS", "LITROS_TOTAIS", "LITROS TOTAIS"), false);
    rawTotalVal += parseNumeric(getVal(r, "VALOR EMISSAO", "Soma de VALOR EMISSAO", "VALOR", "PRECO TOTAL", "TOTAL", "VALOR_TOTAL", "VALOR_ABASTECIMENTO", "VALOR_PAGO", "VALOR PAGO", "VALOR_TOTAL_ABASTECIMENTO", "VALOR TOTAL ABASTECIMENTO"), false);
  });
  console.log(`Raw Total: Litros = ${rawTotalLit.toFixed(2)}, Valor = ${rawTotalVal.toFixed(2)}`);

  let rawKmProd = 0;
  rawKm.forEach(k => {
    const prod = parseNumeric(getVal(k, "KM Produtivo", "KM_PRODUTIVO", "KM PRODUTIVO", "KM_PROD", "KM PROD", "KM_PERCORRIDO", "KM PERCORRIDO", "DISTANCIA", "DISTÂNCIA", "KM_PROD_TOTAL", "KM Produtivo (Planilha)", "Soma de KM Produtivo", "KM_PROD_PLANILHA", "KM_PRODUTIVO_REAL", "KM PRODUTIVO REAL", "KM_PERC", "KM PERC", "KM", "KILOMETRAGEM", "KM_RODADO", "KM RODADO", "DIST_PERC", "DIST PERC", "KM_VIAGEM", "KM VEICULO"), true);
    rawKmProd += prod;
  });
  console.log(`Raw KM Produtivo = ${rawKmProd}`);

  // Now let us see what App.tsx produces in mergedData and consolidatedReportData!
  // Read App.tsx
  const appSrc = fs.readFileSync("src/App.tsx", "utf8");

  // Let us check all places where getAdjustedMonthlyValues is used!
  // In consolidatedReportData:
  // "hasOverlapAdjusted"
  // "getAdjustedMonthlyValues"
  console.log("\nChecking App.tsx cross-month adjustments or overlap adjustments...");
}

run();
