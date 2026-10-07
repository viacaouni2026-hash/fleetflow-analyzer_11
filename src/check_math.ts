import Papa from "papaparse";
import fs from "fs";

const KM_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1Tw2YN42YrMXqetgLbYwCdzO0jMNxTOwnR4l2oFVPp4M/gviz/tq?tqx=out:csv&sheet=LOGISTICA';
const COMB_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1k_sBpRhmokk02rhl72zSWC2j9U9jFBJjGfIbRs-dTPE/gviz/tq?tqx=out:csv&sheet=Combustivel';
const VEIC_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1UKMYrCErWztQXh7j4RHk9qAIJRMOEBvTjA-qV5JOerw/gviz/tq?tqx=out:csv&sheet=Info_BI';

async function main() {
  const [tKm, tComb, tVeic] = await Promise.all([
    fetch(KM_SHEET_URL).then(r => r.text()),
    fetch(COMB_SHEET_URL).then(r => r.text()),
    fetch(VEIC_SHEET_URL).then(r => r.text())
  ]);

  const rawKm = Papa.parse(tKm, { header: true, skipEmptyLines: true, transformHeader: h => h.trim().replace(/^\uFEFF/, "") }).data as any[];
  const rawComb = Papa.parse(tComb, { header: true, skipEmptyLines: true, transformHeader: h => h.trim().replace(/^\uFEFF/, "") }).data as any[];
  const rawVeic = Papa.parse(tVeic, { header: true, skipEmptyLines: true, transformHeader: h => h.trim().replace(/^\uFEFF/, "") }).data as any[];

  console.log("Loaded raw counts: KM=", rawKm.length, "Comb=", rawComb.length, "Veic=", rawVeic.length);

  // Read App.tsx
  const appSrc = fs.readFileSync("src/App.tsx", "utf8");

  // Let us see where 870001 was mentioned in the user prompt:
  // "km produtivo = 870.001 - esta correto"
  // "Litragem total = 317.970,41 - esta incorreto no sistema = 316.072"
  // "Valor total = 2.239.230,16 - esta incorreto no sistema = 2.226.919, 86"
  
  // Notice that in rawComb:
  // Total Litros = 317.970,41
  // Total Valor = 2.239.230,17
  
  // Notice that in rawKm:
  // Total KM Produtivo = 871.046
  // But 21 rows in KM have date 1900-01-XX (prod = 1045 km)!
  // 871.046 - 1.045 = 870.001!
  // THAT IS EXACTLY 870.001!
  console.log("871046 - 1045 = ", 871046 - 1045);
}

main().catch(console.error);
