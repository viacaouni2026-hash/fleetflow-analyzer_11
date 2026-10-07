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

  console.log("Raw KM:", rawKm.length, "Comb:", rawComb.length, "Veic:", rawVeic.length);

  // Read App.tsx
  const appSrc = fs.readFileSync("src/App.tsx", "utf8");

  // Let us check all places where numbers are formatted or where totals are calculated:
  // Where is "316.072" or "316072" coming from?
  // Let us search for any .filter() or .reduce() in App.tsx that produces 316.072!
}

main().catch(console.error);
