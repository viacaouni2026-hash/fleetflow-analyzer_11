import Papa from "papaparse";

const KM_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1Tw2YN42YrMXqetgLbYwCdzO0jMNxTOwnR4l2oFVPp4M/gviz/tq?tqx=out:csv&sheet=LOGISTICA';
const COMB_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1k_sBpRhmokk02rhl72zSWC2j9U9jFBJjGfIbRs-dTPE/gviz/tq?tqx=out:csv&sheet=Combustivel';
const VEIC_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1UKMYrCErWztQXh7j4RHk9qAIJRMOEBvTjA-qV5JOerw/gviz/tq?tqx=out:csv&sheet=Info_BI';

// Let's import helper functions from App.tsx or copy the relevant definitions
async function run() {
  console.log("Loading data from sheets...");
  const [resKm, resComb, resVeic] = await Promise.all([
    fetch(KM_SHEET_URL).then(r => r.text()),
    fetch(COMB_SHEET_URL).then(r => r.text()),
    fetch(VEIC_SHEET_URL).then(r => r.text())
  ]);

  const kmDataRaw = Papa.parse(resKm, { header: true, skipEmptyLines: true }).data as any[];
  const combDataRaw = Papa.parse(resComb, { header: true, skipEmptyLines: true }).data as any[];
  const veicDataRaw = Papa.parse(resVeic, { header: true, skipEmptyLines: true }).data as any[];

  console.log(`Loaded ${kmDataRaw.length} KM, ${combDataRaw.length} Comb, ${veicDataRaw.length} Veic`);
}

run().catch(console.error);
