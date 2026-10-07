const http = require('https');

const KM_URL = 'https://docs.google.com/spreadsheets/d/1Tw2YN42YrMXqetgLbYwCdzO0jMNxTOwnR4l2oFVPp4M/gviz/tq?tqx=out:csv&sheet=LOGISTICA';
const COMB_URL = 'https://docs.google.com/spreadsheets/d/1k_sBpRhmokk02rhl72zSWC2j9U9jFBJjGfIbRs-dTPE/gviz/tq?tqx=out:csv&sheet=Combustivel';

function fetch(url) {
  return new Promise((resolve, reject) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

function parseCSV(text) {
  const lines = text.split('\n');
  if (lines.length === 0) return [];
  const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    
    const cells = [];
    let insideQuote = false;
    let current = '';
    for (let j = 0; j < line.length; j++) {
      const char = line[j];
      if (char === '"') {
        insideQuote = !insideQuote;
      } else if (char === ',' && !insideQuote) {
        cells.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }
    cells.push(current.trim());
    
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = (cells[idx] || '').replace(/^"|"$/g, '').trim();
    });
    rows.push(row);
  }
  return { headers, rows };
}

async function run() {
  console.log('Fetching KM...');
  const kmText = await fetch(KM_URL);
  const kmData = parseCSV(kmText);
  console.log('KM Headers:', kmData.headers);
  console.log('Total KM rows:', kmData.rows.length);

  console.log('Fetching COMB...');
  const combText = await fetch(COMB_URL);
  const combData = parseCSV(combText);
  console.log('Comb Headers:', combData.headers);
  console.log('Total COMB rows:', combData.rows.length);

  const targetFrotas = ['733', '802', '803', '809', '810', '812', '813', '3288', '5432'];
  
  console.log('\n--- KM Records for Target Frotas ---');
  kmData.rows.forEach(r => {
    const rawFrota = r.FROTA || r.PREFIXO || r.prefixo;
    if (targetFrotas.includes(String(rawFrota).trim())) {
      console.log(`KM -> FROTA:${rawFrota}, PLACA:${r.PLACA || r.VEICULO}, DATA:${r.DATA}`);
    }
  });

  console.log('\n--- COMB Records for Target Frotas ---');
  combData.rows.forEach(r => {
    const rawFrota = r.FROTA || r.PREFIXO || r.prefixo || r.CODIGO || r.CÓDIGO || r.Veiculo || r.VEICULO;
    if (targetFrotas.includes(String(rawFrota).trim())) {
      console.log(`COMB -> FROTA:${rawFrota}, PLACA:${r.PLACA || r.Veiculo || r.VEICULO}, DATA:${r.DATA}, LITROS:${r.LITROS || r.Litros}`);
    }
  });
}

run().catch(console.error);
