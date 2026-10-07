import Papa from "papaparse";
import fs from "fs";

const KM_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1Tw2YN42YrMXqetgLbYwCdzO0jMNxTOwnR4l2oFVPp4M/gviz/tq?tqx=out:csv&sheet=LOGISTICA';
const COMB_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1k_sBpRhmokk02rhl72zSWC2j9U9jFBJjGfIbRs-dTPE/gviz/tq?tqx=out:csv&sheet=Combustivel';
const VEIC_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1UKMYrCErWztQXh7j4RHk9qAIJRMOEBvTjA-qV5JOerw/gviz/tq?tqx=out:csv&sheet=Info_BI';

const appSrc = fs.readFileSync("src/App.tsx", "utf8");
const coringaMatch = appSrc.match(/const CORINGA_MAPPING = (\[[\s\S]*?\]);/);
const CORINGA_MAPPING: any[] = coringaMatch ? eval(coringaMatch[1]) : [];

const fleetLookupMatch = appSrc.match(/const FLEET_LOOKUP = new Map<string, string>\(\[([\s\S]*?)\]\);/);
const FLEET_LOOKUP: Map<string, string> = fleetLookupMatch ? eval(`new Map([${fleetLookupMatch[1]}])`) : new Map();

const coringaLookupMatch = appSrc.match(/const CORINGA_LOOKUP = new Map<string, string>\(\[([\s\S]*?)\]\);/);
const CORINGA_LOOKUP: Map<string, string> = coringaLookupMatch ? eval(`new Map([${coringaLookupMatch[1]}])`) : new Map();

// Let us test the exact App.tsx lines 6454-6615!
async function main() {
  const [tKm, tComb, tVeic] = await Promise.all([
    fetch(KM_SHEET_URL).then(r => r.text()),
    fetch(COMB_SHEET_URL).then(r => r.text()),
    fetch(VEIC_SHEET_URL).then(r => r.text())
  ]);

  const rawKm = Papa.parse(tKm, { header: true, skipEmptyLines: true, transformHeader: h => h.trim().replace(/^\uFEFF/, "") }).data as any[];
  const rawComb = Papa.parse(tComb, { header: true, skipEmptyLines: true, transformHeader: h => h.trim().replace(/^\uFEFF/, "") }).data as any[];
  const rawVeic = Papa.parse(tVeic, { header: true, skipEmptyLines: true, transformHeader: h => h.trim().replace(/^\uFEFF/, "") }).data as any[];

  // Let us check all crossMonthAdjustments saved or referenced!
  // In App.tsx: crossMonthAdjustments default is {}
}

main().catch(console.error);
