
import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";

import fs from "fs";
import Database from "better-sqlite3";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { GoogleGenAI } from "@google/genai";
import "dotenv/config";

const MONTH_NAMES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
];



// Database initialization with corruption/malformed file self-repair
const dbPath = path.join(process.cwd(), "maintenance.db");
let db: Database.Database;

function deleteDatabaseFile() {
  try {
    if (fs.existsSync(dbPath)) {
      console.warn(`[Database] Deleting malformed/corrupted database file at ${dbPath}`);
      fs.unlinkSync(dbPath);
    }
  } catch (unlinkErr) {
    console.error("[Database] Failed to delete database file:", unlinkErr);
  }
}

function initDb() {
  try {
    db = new Database(dbPath);
    // Dynamic schema migration: Drop maintenance table if it contains the old UNIQUE constraint
    const tblSchema = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='maintenance'").get() as any;
    if (tblSchema && tblSchema.sql.includes('UNIQUE')) {
      console.log("[Migration] Old database table schema with UNIQUE constraint detected. Recreating table to preserve duplicate invoice lines...");
      db.exec("DROP TABLE IF EXISTS maintenance");
    }
  } catch (migError: any) {
    const isMalformed = migError.message && (
      migError.message.includes("malformed") || 
      migError.message.includes("corrupt") || 
      migError.message.includes("disk image") ||
      migError.code === "SQLITE_CORRUPT"
    );
    if (isMalformed) {
      console.error("[Database] Malformed database detected during setup. Recreating a fresh database file...", migError);
      deleteDatabaseFile();
      db = new Database(dbPath);
    } else {
      console.error("Failed to check or perform database schema migration:", migError);
      // Ensure we have a db instance anyway
      if (!db) {
        db = new Database(dbPath);
      }
    }
  }

  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS maintenance (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type TEXT,
        prefix TEXT,
        date TEXT,
        document TEXT,
        quantity REAL,
        value REAL,
        discount REAL,
        nf TEXT,
        os TEXT,
        material_code TEXT,
        material_desc TEXT,
        grc_code TEXT,
        grc_desc TEXT,
        gre_code TEXT,
        gre_desc TEXT,
        grd_code TEXT,
        grd_desc TEXT,
        classification TEXT,
        month_year TEXT,
        month_year_order TEXT,
        year TEXT,
        month_name TEXT,
        company_code TEXT,
        branch_code TEXT,
        supplier_num TEXT,
        supplier_name TEXT,
        service TEXT,
        material_avulso_code TEXT,
        ncm_code TEXT,
        original_desc TEXT,
        historico TEXT,
        codigogrc TEXT,
        codigogre TEXT,
        codigogrd TEXT,
        data_emissao TEXT
      )
    `);
    try {
      db.exec("ALTER TABLE maintenance ADD COLUMN data_emissao TEXT");
    } catch (_) {}
  } catch (schemaError: any) {
    console.error("Failed to execute database schema creation:", schemaError);
    const isMalformed = schemaError.message && (
      schemaError.message.includes("malformed") || 
      schemaError.message.includes("corrupt") || 
      schemaError.message.includes("disk image") ||
      schemaError.code === "SQLITE_CORRUPT"
    );
    if (isMalformed) {
      deleteDatabaseFile();
      db = new Database(dbPath);
      db.exec(`
        CREATE TABLE IF NOT EXISTS maintenance (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          type TEXT,
          prefix TEXT,
          date TEXT,
          document TEXT,
          quantity REAL,
          value REAL,
          discount REAL,
          nf TEXT,
          os TEXT,
          material_code TEXT,
          material_desc TEXT,
          grc_code TEXT,
          grc_desc TEXT,
          gre_code TEXT,
          gre_desc TEXT,
          grd_code TEXT,
          grd_desc TEXT,
          classification TEXT,
          month_year TEXT,
          month_year_order TEXT,
          year TEXT,
          month_name TEXT,
          company_code TEXT,
          branch_code TEXT,
          supplier_num TEXT,
          supplier_name TEXT,
          service TEXT,
          material_avulso_code TEXT,
          ncm_code TEXT,
          original_desc TEXT,
          historico TEXT,
          codigogrc TEXT,
          codigogre TEXT,
          codigogrd TEXT
        )
      `);
    }
  }
}

initDb();

// Config file for OneDrive/Google Sheets URLs
const CONFIG_FILE = path.join(process.cwd(), "app_config.json");
const DEFAULT_CONFIG = { 
  oneDriveUrl: "https://1drv.ms/f/c/993c15d8c13fa4d2/IgCPEFS-TLtST7TdOTygegK2AdVt7xbxCXRKjqzNX0_ZTGY?e=Dch8IB",
  estoqueUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vQmJuXEr94hmA1Cun37S9yaMVHnU8FdHtg7F2uR63lFtigmtwIX0k-rpwwrav0Jk3dLhPZftL4d_EFy/pub?output=csv",
  nfAvulsoUrl: "https://docs.google.com/spreadsheets/d/e/2PACX-1vRLlbkl-opP9VkdTH32p9z_vdwDyV-hOo8jqjdwxi5vFIkdvWrSL1jHjYJjUMWJFlaJrd0NjbGQLFOG/pub?output=csv"
};

if (!fs.existsSync(CONFIG_FILE)) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(DEFAULT_CONFIG, null, 2));
}

function getAppConfig() {
  try {
    const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    let migrated = false;
    
    // Auto-migrate old URLs (including ones with old gid parameters) to full default Google Sheets URLs
    if (!config.estoqueUrl || config.estoqueUrl.includes("gid=") || config.estoqueUrl.includes("11USLGKuFlRBNlLTyhA4GShWNadS0dCjCfhsYeoRY6Kc") || config.estoqueUrl.includes("1drv.ms") || config.estoqueUrl.includes("onedrive")) {
      config.estoqueUrl = DEFAULT_CONFIG.estoqueUrl;
      migrated = true;
    }
    if (!config.nfAvulsoUrl || config.nfAvulsoUrl.includes("gid=") || config.nfAvulsoUrl.includes("1073179911") || config.nfAvulsoUrl.includes("1drv.ms") || config.nfAvulsoUrl.includes("onedrive")) {
      config.nfAvulsoUrl = DEFAULT_CONFIG.nfAvulsoUrl;
      migrated = true;
    }
    
    if (migrated) {
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
      console.log("[Migration] Config file migrated to new default Google Sheets URLs.");
      // Clear maintenance table so boot sync re-fetches the new datasets
      try {
        db.prepare("DELETE FROM maintenance").run();
        console.log("[Migration] Cleared existing maintenance database records to trigger fresh sync.");
      } catch (err) {
        console.warn("[Migration] Could not clear old maintenance table:", err);
      }
    }
    
    return { ...DEFAULT_CONFIG, ...config };
  } catch (e) {
    return DEFAULT_CONFIG;
  }
}

function saveAppConfig(config: any) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
}

async function fetchWithRetry(url: string, options: any = {}, retries = 3, delayMs = 1500): Promise<Response> {
  const defaultHeaders = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,*/*;q=0.9',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache'
  };

  let lastError: any = null;
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);
      const res = await fetch(url, {
        ...options,
        signal: controller.signal,
        headers: {
          ...defaultHeaders,
          ...(options.headers || {})
        }
      });
      clearTimeout(timeoutId);
      if (res.ok) return res;
      lastError = new Error(`HTTP ${res.status} ${res.statusText}`);
    } catch (err: any) {
      lastError = err;
    }
    if (attempt < retries) {
      await new Promise(r => setTimeout(r, delayMs * attempt));
    }
  }
  throw lastError || new Error(`Falha ao conectar na URL após ${retries} tentativas: ${url}`);
}

async function getOneDriveDownloadBuffer(sharedUrl: string): Promise<Buffer> {
  const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36';
  
  try {
    const r1 = await fetchWithRetry(sharedUrl, { 
      headers: { 'User-Agent': UA }, 
      redirect: 'manual' 
    }, 2, 1000);
    
    if (r1.status >= 400) {
      throw new Error(`OneDrive step 1 failed: ${r1.status} ${r1.statusText}`);
    }
    
    let loc1 = r1.headers.get("location");
    if (!loc1) {
      loc1 = sharedUrl;
    }
    
    if (loc1.includes('?')) {
      loc1 = loc1.replace('?', '?download=1&');
    } else {
      loc1 += '?download=1';
    }
    
    let cookie1 = r1.headers.get("set-cookie") || "";
    
    const r2 = await fetchWithRetry(loc1, { 
      headers: { 'User-Agent': UA, 'Cookie': cookie1 }, 
      redirect: 'manual' 
    }, 2, 1000);
    
    if (r2.status === 200) {
      return Buffer.from(await r2.arrayBuffer());
    }
    
    if (r2.status >= 300 && r2.status < 400) {
      let loc2 = r2.headers.get("location") || "";
      if (loc2.startsWith("/")) {
         const u = new URL(loc1);
         loc2 = u.origin + loc2;
      }
      let cookie2 = (cookie1 + "; " + (r2.headers.get("set-cookie") || "")).replace(/;/g, '; ');
      const r3 = await fetchWithRetry(loc2, { 
        headers: { 'User-Agent': UA, 'Cookie': cookie2 } 
      }, 2, 1000);
      
      if (!r3.ok) throw new Error(`OneDrive Download failed: ${r3.status} ${r3.statusText}`);
      return Buffer.from(await r3.arrayBuffer());
    }
    
    throw new Error(`OneDrive step 2 failed: ${r2.status} ${r2.statusText}`);
  } catch (error: any) {
    throw new Error(`OneDrive fetch failed: ${error.message}`);
  }
}

async function fetchUrlBuffer(url: string): Promise<Buffer> {
  let targetUrl = (url || '').trim();
  if (!targetUrl) throw new Error("URL vazia.");

  const isOneDrive = targetUrl.includes("1drv.ms") || targetUrl.includes("sharepoint.com") || targetUrl.includes("onedrive.live.com");

  if (isOneDrive) {
    return getOneDriveDownloadBuffer(targetUrl);
  }

  if (targetUrl.includes("docs.google.com/spreadsheets")) {
    if (targetUrl.includes("1k_sBpRhmokk02rhl72zSWC2j9U9jFBJjGfIbRs-dTPE")) {
      targetUrl = "https://docs.google.com/spreadsheets/d/1k_sBpRhmokk02rhl72zSWC2j9U9jFBJjGfIbRs-dTPE/export?format=csv&gid=718807157";
    } else if (targetUrl.includes("/pub")) {
      targetUrl = targetUrl.split("/pub")[0] + "/pub?output=csv";
    } else if (targetUrl.includes("/edit")) {
      const idMatch = targetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
      const gidMatch = targetUrl.match(/gid=([0-9]+)/);
      if (idMatch) {
        targetUrl = `https://docs.google.com/spreadsheets/d/${idMatch[1]}/gviz/tq?tqx=out:csv` + (gidMatch ? `&gid=${gidMatch[1]}` : '');
      }
    }
  }

  const cacheBusterUrl = targetUrl + (targetUrl.includes('?') ? '&' : '?') + '_cb=' + Date.now();
  console.log(`[Buffer Fetch] Fetching URL: ${cacheBusterUrl}`);

  try {
    const res = await fetchWithRetry(cacheBusterUrl, {}, 3, 1000);
    return Buffer.from(await res.arrayBuffer());
  } catch (err: any) {
    console.warn(`[Buffer Fetch] Requisição com cache-buster falhou (${err.message}). Tentando URL direta: ${targetUrl}`);
    const fallbackRes = await fetchWithRetry(targetUrl, {}, 3, 1500);
    return Buffer.from(await fallbackRes.arrayBuffer());
  }
}

// Auto boot-sync if DB is empty or missing data_emissao with graceful retry
async function performBootSync(attempt = 1) {
  try {
    const rowCountResult = db.prepare(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN type = 'nf' THEN 1 END) as total_nf,
        COUNT(CASE WHEN type = 'nf' AND (data_emissao IS NOT NULL AND data_emissao != '' AND data_emissao != '-') THEN 1 END) as with_emissao
      FROM maintenance
    `).get() as { total: number, total_nf: number, with_emissao: number };

    if (rowCountResult && rowCountResult.total > 0 && (rowCountResult.total_nf === 0 || rowCountResult.with_emissao > 0)) {
      console.log(`Banco de dados SQLite carregado. Contém ${rowCountResult.total} registros (${rowCountResult.with_emissao} NFs com data de emissão).`);
      return;
    }

    console.log(`[Boot Sync] Banco de dados de manutenção precisa de sincronização (Total: ${rowCountResult?.total || 0}, NFs com emissão: ${rowCountResult?.with_emissao || 0}). Iniciando tentativa ${attempt}...`);
    const config = getAppConfig();

    if (config.estoqueUrl) {
      try {
        console.log("[Boot Sync] Iniciando download de Estoque...");
        const data = await fetchAndParseOneDrive(config.estoqueUrl);
        if (data && data.length > 0) {
          processMaintenanceData(data, 'estoque');
          console.log(`[Boot Sync] Carregados ${data.length} registros de estoque com sucesso!`);
        }
      } catch (e: any) {
        console.warn(`[Boot Sync] Aviso ao carregar estoque: ${e.message || e}`);
      }
    }

    if (config.nfAvulsoUrl) {
      try {
        console.log("[Boot Sync] Iniciando download de NF Avulso...");
        const data = await fetchAndParseOneDrive(config.nfAvulsoUrl);
        if (data && data.length > 0) {
          processMaintenanceData(data, 'nf');
          console.log(`[Boot Sync] Carregados ${data.length} registros de NF Avulso com sucesso!`);
        }
      } catch (e: any) {
        console.warn(`[Boot Sync] Aviso ao carregar NF Avulso: ${e.message || e}`);
      }
    }

    const checkRows = db.prepare("SELECT COUNT(*) as total FROM maintenance").get() as { total: number };
    if ((!checkRows || checkRows.total === 0) && attempt < 3) {
      console.log(`[Boot Sync] Tentativa ${attempt} não obteve registros. Reagendando em 6 segundos...`);
      setTimeout(() => performBootSync(attempt + 1), 6000);
    }
  } catch (bootErr: any) {
    console.warn("[Boot Sync] Informação na sincronização em background:", bootErr.message || bootErr);
    if (attempt < 3) {
      setTimeout(() => performBootSync(attempt + 1), 6000);
    }
  }
}

try {
  setTimeout(() => performBootSync(1), 2500);
} catch (cntErr: any) {
  console.error("Falha ao checar registros existentes no banco de dados:", cntErr);
}

async function fetchAndParseOneDrive(url: string) {
  console.log(`Fetching from standardized URL: ${url}`);
  const buffer = await fetchUrlBuffer(url);
  
  // Try to parse as Excel first if it looks like one, or based on URL
  if (url.includes('/x/') || url.toLowerCase().endsWith('.xlsx') || url.includes('format=xlsx')) {
    const workbook = XLSX.read(buffer, { type: 'buffer' });
    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
    return XLSX.utils.sheet_to_json(firstSheet);
  }
  
  // Fallback to CSV
  const content = buffer.toString('utf8');
  let results = Papa.parse(content, { header: true, skipEmptyLines: true, delimiter: ';', transformHeader: (h) => h.trim().replace(/^\uFEFF/, '') });
  if (results.data.length > 0) {
    const firstRow: any = results.data[0];
    const keys = Object.keys(firstRow);
    if (keys.length <= 1 || keys[0].includes(',') || (!firstRow.DATAMOVTO && !firstRow.DOCUMENTO && !firstRow.NUMERONF && !firstRow.ENTRADASAIDANF && !firstRow.DATAEMISSAONF && !firstRow.VLR_TOTAL && !firstRow.vlr_total && !firstRow.VALORITEM && !firstRow.valoritem)) {
      results = Papa.parse(content, { header: true, skipEmptyLines: true, delimiter: ',', transformHeader: (h) => h.trim().replace(/^\uFEFF/, '') });
    }
  }
  return results.data;
}

const insertMaintenanceStmt = db.prepare(`
  INSERT OR IGNORE INTO maintenance (
    type, prefix, date, document, quantity, value, discount, nf, os, 
    material_code, material_desc, grc_desc, gre_desc, grd_desc, classification, month_year, year, month_name, 
    month_year_order, company_code, branch_code, supplier_num, supplier_name, service, 
    material_avulso_code, ncm_code, original_desc, historico, codigogrc, codigogre, codigogrd, data_emissao
  ) VALUES (
    ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
  )
`);

function parseCorruptedNumeric(valStr: any): number {
  if (typeof valStr === 'number') {
    let n = valStr;
    while (n > 1000000) n /= 1000;
    return n;
  }
  if (!valStr) return 0;
  let s = String(valStr).trim();
  
  if (s.toLowerCase().includes('e')) {
    s = s.replace(',', '.');
    let parsed = parseFloat(s);
    if (isNaN(parsed)) return 0;
    while (parsed > 1000000) parsed /= 1000;
    return parsed;
  }

  s = s.replace(/[R$\s]/g, '');

  if (s.includes(",") && s.includes(".")) {
    if (s.lastIndexOf(",") > s.lastIndexOf(".")) {
      s = s.replace(/\./g, "").replace(",", ".");
    } else {
      s = s.replace(/,/g, "");
    }
  } else if (s.includes(",") && !s.includes(".")) {
    s = s.replace(",", ".");
  } else if (s.includes(".")) {
    const dotsCount = s.split(".").length - 1;
    const digitsOnly = s.replace(/\./g, "");
    const lastPart = s.split(".").pop() || "";
    
    if (dotsCount > 1 || (dotsCount === 1 && digitsOnly.length >= 7 && lastPart.length === 3)) {
      if (digitsOnly.length > 6) {
        const intPart = digitsOnly.substring(0, digitsOnly.length - 6);
        const decPart = digitsOnly.substring(digitsOnly.length - 6);
        s = intPart + "." + decPart;
      } else {
        s = "0." + digitsOnly.padStart(6, '0');
      }
    }
  }

  let parsed = parseFloat(s) || 0;
  while (parsed > 1000000) {
    parsed /= 1000;
  }
  return parsed;
}

const normalizeCompare = (str: string) => {
  return String(str || '')
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // Remove accents
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, ''); // Keep only letters and digits
};

function processMaintenanceData(data: any[], forcedType?: 'nf' | 'estoque') {
  if (forcedType) {
    db.prepare("DELETE FROM maintenance WHERE type = ?").run(forcedType);
    console.log(`[Database Clear] Deleted existing records of type '${forcedType}' before fresh sync.`);
    
    // Reset SQLite auto-increment sequence if table is empty to keep IDs stable
    try {
      const rowCountResult = db.prepare("SELECT COUNT(*) as total FROM maintenance").get() as { total: number };
      if (rowCountResult && rowCountResult.total === 0) {
        db.exec("DELETE FROM sqlite_sequence WHERE name = 'maintenance'");
        console.log("[Database Sequence Reset] sqlite_sequence cleared as database is now completely empty.");
      }
    } catch (seqError) {
      console.warn("Failed to reset sqlite_sequence:", seqError);
    }
  }

  const uniqueKeys = new Set<string>();

  const MONTH_NAMES = [
    'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
    'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
  ];

  const getFVal = (row: any, ...keys: string[]) => {
    if (!row) return '';
    const rKeys = Object.keys(row);
    for (const k of keys) {
      const normK = k.trim().toLowerCase();
      const found = rKeys.find(rk => rk.trim().toLowerCase() === normK);
      if (found && row[found] !== undefined && row[found] !== null && String(row[found]).trim() !== '') {
        return String(row[found]).trim();
      }
    }
    return '';
  };

  const transaction = db.transaction((rows: any[]) => {
    rows.forEach((r, idx) => {
      const nfNum = getFVal(r, 'NUMERONF', 'numeronf', 'nf', 'NUMERO_NF');
      let type = forcedType || ((nfNum && nfNum !== "") ? 'nf' : 'estoque');
      
      // SQL FILTERS
      if (type === 'nf') {
        const empCode = parseInt(getFVal(r, 'codigoempresa', 'CODIGOEMPRESA') || '0');
        if (empCode === 5 || empCode === 8) return;
      } else {
        const histVal = getFVal(r, 'HISTORICO', 'historico');
        const hasHist = Object.keys(r).some(k => k.trim().toLowerCase() === 'historico');
        if (hasHist && histVal) {
          const normHist = String(histVal).trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
          if (!normHist.startsWith('saida') && !normHist.includes('requis')) return;
        }
      }

      let valStr = '0';
      if (type === 'nf') {
        valStr = getFVal(r, 'vlr_total', 'VLR_TOTAL', 'valornfservico', 'VALORNFSERVICO', 'VALOR_AVULSO', 'VALOR_NF_SERVICO') || '0';
      } else {
        valStr = getFVal(r, 'VALORITEM', 'valoritem', 'Valor Estoque', 'VALOR_ESTOQUE', 'VALOR_TOTAL') || '0';
      }
      
      const val = parseCorruptedNumeric(valStr);
      let prefix = getFVal(r, 'PREFIXOVEIC', 'prefixoveic', 'FROTA', 'pre', 'PREFIXO');
      const codIntOs = getFVal(r, 'CODINTOS', 'codintos');
      if (!prefix && codIntOs && String(codIntOs).match(/^0+\d+$/)) {
        prefix = codIntOs;
      }
      if (!prefix) prefix = 'N/A';

      const date = type === 'nf'
        ? getFVal(r, 'ENTRADASAIDANF', 'entradasaidanf', 'ENTRADA_SAIDA', 'DATAMOVTO', 'DATAMOV_TO', 'dat', 'DATA', 'data')
        : getFVal(r, 'DATAMOVTO', 'DATAMOV_TO', 'ENTRADASAIDANF', 'entradasaidanf', 'dat', 'DATA', 'data');
      const doc = getFVal(r, 'DOCUMENTO', 'numeronf', 'numeroos', 'NUMERONF', 'doc', 'NUMERO_NF');
      const quantity = parseFloat(getFVal(r, 'QTDEITEM', 'qtd', 'QUANTIDADE') || '1') || 1;
      const discount = parseFloat(getFVal(r, 'VALORDESCONTOITEM', 'dsc') || '0') || 0;
      const os = getFVal(r, 'NUMEROOS', 'numeroos', 'os', 'NUM_OS');
      const matCode = getFVal(r, 'CODIGOINTERNOMATERIAL', 'CODIGOMATAVULSO', 'codigomatavulso', 'cod', 'COD_MATERIAL');
      const matDesc = getFVal(r, 'DESCRICAONFSERVICO', 'descricaonfservico', 'DESCRICAOMAT', 'descricaomatavulso', 'mat', 'MATERIAL', 'DES_ORIGINAL', 'des_original');

      // Deduplicate safely without dropping valid distinct invoice line items
      const uniqueKey = [type, prefix, date, doc, matCode, quantity, val, os, nfNum, matDesc, idx].join('|');
      if (uniqueKeys.has(uniqueKey)) return;
      uniqueKeys.add(uniqueKey);

      let monthYear = '';
      let year = '';
      let monthName = '';
      let monthYearOrder = '';

      if (date) {
        const parts = date.split('/');
        if (parts.length === 3) {
          const monthNum = parseInt(parts[1], 10);
          const yearNum = parts[2].trim();
          if (monthNum >= 1 && monthNum <= 12 && yearNum.length === 4) {
            monthName = MONTH_NAMES[monthNum - 1];
            year = yearNum;
            monthYear = `${monthName}/${year}`;
            monthYearOrder = `${year}-${String(monthNum).padStart(2, '0')}`;
          }
        }
      }

      if (!year) year = getFVal(r, 'Ano', 'ano');
      if (!monthYear) monthYear = getFVal(r, 'Mes/Ano', 'ma');
      if (!monthName) monthName = getFVal(r, 'Nome do Mês', 'm');
      if (!monthYearOrder) monthYearOrder = getFVal(r, 'Mes/Ano Ordem', 'mao');

      const dataEmissao = type === 'nf'
        ? getFVal(r, 'DATAEMISSAONF', 'dataemissaonf', 'DATA_EMISSAO_NF', 'DATA_EMISSAO', 'DT_EMISSAO', 'DataEmissaoNf', 'DataEmissaoNF', 'EMISSAO', 'emissao', 'DATAEMISSAO', 'DTEMISSAO', 'DATA_EMIS', 'DT_EMIS', 'data_emissao')
        : '';

      insertMaintenanceStmt.run(
        type, prefix, date, doc, quantity, val, discount, 
        nfNum, os, matCode,
        matDesc, 
        getFVal(r, 'DESCRICAOGRC', 'descricaogrc', 'grupo_compra', 'grc', 'GRC'), 
        getFVal(r, 'DESCRICAOGRE', 'descricaogre', 'grupo_Estoque', 'gre', 'GRE'), 
        getFVal(r, 'DESCRICAOGRD', 'descricaogrd', 'grupo_despesa', 'grd', 'GRD'), 
        getFVal(r, 'Classificacao Despesa Estoque', 'cls'),
        monthYear, year, monthName, 
        monthYearOrder, getFVal(r, 'codigoempresa', 'CODIGOEMPRESA'), getFVal(r, 'codigofl', 'CODIGOFL'), 
        getFVal(r, 'nrforn', 'NRFORN'), getFVal(r, 'rsocialforn', 'RSOCIALFORN'), getFVal(r, 'servico', 'SERVICO'), getFVal(r, 'codigomatavulso', 'CODIGOMATAVULSO'), 
        getFVal(r, 'codncm', 'CODNCM'), getFVal(r, 'des_original'),
        getFVal(r, 'HISTORICO', 'historico'),
        getFVal(r, 'codigogrc', 'CODIGOGRC'),
        getFVal(r, 'codigogre', 'CODIGOGRE'),
        getFVal(r, 'codigogrd', 'CODIGOGRD'),
        dataEmissao
      );
    });
  });
  transaction(data);
}

function seedDatabase() {
  const rootFiles = fs.readdirSync(process.cwd());
  
  const targetFiles = {
    estoque: 'dados_movimentos_estoque.csv',
    nf: 'dados_notas_fiscais.csv'
  };

  const csvFiles = rootFiles.filter(f => f.endsWith('.csv'));
  
  console.log(`Found ${csvFiles.length} local CSV files. Seeding database...`);

  csvFiles.forEach(file => {
    try {
      const content = fs.readFileSync(file, 'utf8');
      let results = Papa.parse(content, { header: true, skipEmptyLines: true, delimiter: ';' });
      if (results.data.length > 0 && !(results.data[0] as any).DATAMOVTO && !(results.data[0] as any).DOCUMENTO && !(results.data[0] as any)['Valor Estoque']) {
        results = Papa.parse(content, { header: true, skipEmptyLines: true, delimiter: ',' });
      }

      const isExactEstoque = file.toLowerCase() === targetFiles.estoque.toLowerCase();
      const isExactNf = file.toLowerCase() === targetFiles.nf.toLowerCase();
      const forcedType = isExactEstoque ? 'estoque' : (isExactNf ? 'nf' : undefined);

      processMaintenanceData(results.data as any[], forcedType);
    } catch (e) {
      console.error(`Error loading local CSV ${file}:`, e);
    }
  });

  const count = db.prepare("SELECT COUNT(*) as total FROM maintenance").get() as { total: number };
  console.log(`Database seeded with ${count.total} local records.`);
}

seedDatabase();

async function startServer() {
  try {
    const app = express();
    const PORT = 3000;

  app.use(express.json());

  app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  const generateMockKM = () => {
    const rows = db.prepare("SELECT DISTINCT prefix FROM maintenance").all() as { prefix: string }[];
    const prefixesData = [...new Set([...rows.map(r => r.prefix).filter(p => !!p), '45', '46', '47', '48', '73', '74', '75', '79', '107', '109', '110', '263', '264', '268', '270', '271', '274', '275', '276', '277', '350', '351', '903', '904', '906', '917', '918', '922', 'V1'])]; 
    
    const results: any[] = [];
    const years = [2025, 2026];
    const months = Array.from({ length: 12 }, (_, i) => i + 1);
    const TODAY = new Date("2026-05-11T16:43:22Z");

    years.forEach(year => {
      months.forEach(month => {
        prefixesData.forEach(id => {
          const day = 5 + Math.floor(Math.random() * 20);
          const date = new Date(year, month - 1, day);
          if (date > TODAY) return;
          const dateStr = date.toISOString().split('T')[0];
          results.push({
            PLACA: id,
            FROTA: id,
            DATA: dateStr,
            KM_INICIAL: 100000 + ((year - 2025) * 24000) + (month * 2000),
            KM_FINAL: 100000 + ((year - 2025) * 24000) + (month * 2000) + 500,
            OPERACAO: 'URBANO',
            TIPO_COMBUSTIVEL: 'DIESEL S10'
          });
        });
      });
    });
    return results;
  };

  const generateMockFuel = () => {
    const rows = db.prepare("SELECT DISTINCT prefix FROM maintenance").all() as { prefix: string }[];
    const prefixesData = [...new Set([...rows.map(r => r.prefix).filter(p => !!p), '45', '46', '47', '48', '73', '74', '75', '79', '107', '109', '110', '263', '264', '268', '270', '271', '274', '275', '276', '277', '350', '351', '903', '904', '906', '917', '918', '922', 'V1'])]; 

    const results: any[] = [];
    const years = [2025, 2026];
    const months = Array.from({ length: 12 }, (_, i) => i + 1);
    const TODAY = new Date("2026-05-11T16:43:22Z");

    years.forEach(year => {
      months.forEach(month => {
        prefixesData.forEach(id => {
          const day = 5 + Math.floor(Math.random() * 20);
          const date = new Date(year, month - 1, day);
          if (date > TODAY) return;
          const dateStr = date.toISOString().split('T')[0];
          results.push({
            PLACA: id,
            FROTA: id,
            DATA: dateStr,
            LITROS: 100 + Math.random() * 50,
            VALOR: 600 + Math.random() * 300,
            TIPO_COMBUSTIVEL: 'DIESEL S10',
            CARTAO: '123456789'
          });
        });
      });
    });
    return results;
  };

    app.get("/api/performance/km", (req, res) => {
      res.json(generateMockKM());
    });

    app.get("/api/proxy", async (req, res) => {
      const targetUrl = req.query.url as string;
      if (!targetUrl) {
        return res.status(400).json({ error: "Parâmetro 'url' é obrigatório." });
      }
      try {
        console.log(`[Proxy] Proxying URL fetch: ${targetUrl}`);
        const buffer = await fetchUrlBuffer(targetUrl);
        
        // Disable browser caching completely for proxy requests
        res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');
        res.setHeader('Pragma', 'no-cache');
        res.setHeader('Expires', '0');

        const isXls = targetUrl.includes('/x/') || targetUrl.toLowerCase().endsWith('.xlsx') || targetUrl.includes('format=xlsx') || targetUrl.includes('format=xls');
        if (isXls) {
          res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        } else {
          res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        }
        res.send(buffer);
      } catch (error: any) {
        console.error("[Proxy Error] Sync failed for url:", targetUrl, error);
        res.status(500).json({ error: "Falha ao ler dados remotos via proxy do servidor", details: error.message });
      }
    });

    app.get("/api/performance/combustivel", (req, res) => {
      res.json(generateMockFuel());
    });

    app.get("/api/config/onedrive", (req, res) => {
      res.json(getAppConfig());
    });

    app.post("/api/config/onedrive", (req, res) => {
      const { oneDriveUrl, estoqueUrl, nfAvulsoUrl } = req.body;
      const config = getAppConfig();
      if (oneDriveUrl !== undefined) config.oneDriveUrl = oneDriveUrl;
      if (estoqueUrl !== undefined) config.estoqueUrl = estoqueUrl;
      if (nfAvulsoUrl !== undefined) config.nfAvulsoUrl = nfAvulsoUrl;
      saveAppConfig(config);
      res.json({ success: true, config });
    });

    app.post("/api/manutencao/sync", async (req, res) => {
      try {
        const config = getAppConfig();
        const { estoqueUrl, nfAvulsoUrl } = req.body || {};
        if (estoqueUrl) config.estoqueUrl = estoqueUrl;
        if (nfAvulsoUrl) config.nfAvulsoUrl = nfAvulsoUrl;
        if (estoqueUrl || nfAvulsoUrl) {
          saveAppConfig(config);
        }

        const results = [];
        
        if (config.estoqueUrl) {
          try {
            const data = await fetchAndParseOneDrive(config.estoqueUrl);
            processMaintenanceData(data, 'estoque');
            results.push({ type: 'estoque', success: true, count: data.length });
          } catch (e: any) {
            results.push({ type: 'estoque', success: false, error: e.message });
          }
        }
        
        if (config.nfAvulsoUrl) {
          try {
            const data = await fetchAndParseOneDrive(config.nfAvulsoUrl);
            processMaintenanceData(data, 'nf');
            results.push({ type: 'nf', success: true, count: data.length });
          } catch (e: any) {
            results.push({ type: 'nf', success: false, error: e.message });
          }
        }
        
        const count = db.prepare("SELECT COUNT(*) as total FROM maintenance").get() as { total: number };
        res.json({ success: true, results, totalRecords: count.total });
      } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    app.get("/api/manutencao/nf-avulso", async (req, res) => {
      try {
        const rows = db.prepare("SELECT * FROM maintenance WHERE type = 'nf' ORDER BY id ASC").all();
        const normalized = rows.map((r: any) => ({
            id: r.id + 100000,
            PREFIXOVEIC: r.prefix,
            DATAMOVTO: r.date,
            ENTRADASAIDANF: r.date,
            DATAEMISSAONF: r.data_emissao || '-',
            DOCUMENTO: r.document,
            QTDEITEM: r.quantity,
            VALORITEM: r.value,
            "Valor Avulso": r.value,
            VALOR_AVULSO: r.value,
            VALORDESCONTOITEM: r.discount,
            NUMERONF: r.nf,
            NUMEROOS: r.os,
            CODIGOINTERNOMATERIAL: r.material_code,
            DESCRICAOMAT: r.material_desc,
            DESCRICAONFSERVICO: r.material_desc,
            DESCRICAOGRC: r.grc_desc,
            DESCRICAOGRE: r.gre_desc,
            DESCRICAOGRD: r.grd_desc,
            "Mes/Ano": r.month_year,
            "Mes/Ano Ordem": r.month_year_order,
            Ano: r.year,
            "Nome do Mês": r.month_name,
            codigoempresa: r.company_code,
            codigofl: r.branch_code,
            nrforn: r.supplier_num,
            rsocialforn: r.supplier_name,
            servico: r.service,
            codigomatavulso: r.material_avulso_code,
            codncm: r.ncm_code,
            des_original: r.original_desc
        }));
        res.json(normalized);
      } catch (dbError) {
        res.status(500).json({ error: "Failed to fetch data" });
      }
    });

    app.get("/api/manutencao/estoque", async (req, res) => {
      try {
        const rows = db.prepare("SELECT * FROM maintenance WHERE type = 'estoque' ORDER BY id ASC").all();
        const normalized = rows.map((r: any) => ({
            id: r.id,
            PREFIXOVEIC: r.prefix,
            DATAMOVTO: r.date,
            DOCUMENTO: r.document,
            QTDEITEM: r.quantity,
            VALORITEM: r.value,
            "Valor Estoque": r.value,
            VALORDESCONTOITEM: r.discount,
            NUMERONF: r.nf,
            NUMEROOS: r.os,
            CODIGOINTERNOMATERIAL: r.material_code,
            DESCRICAOMAT: r.material_desc,
            DESCRICAOGRC: r.grc_desc,
            DESCRICAOGRE: r.gre_desc,
            DESCRICAOGRD: r.grd_desc,
            "Classificacao Despesa Estoque": r.classification || "Estoque",
            "Mes/Ano": r.month_year,
            "Mes/Ano Ordem": r.month_year_order,
            Ano: r.year,
            "Nome do Mês": r.month_name
        }));
        res.json(normalized);
      } catch (dbError) {
        res.status(500).json({ error: "Failed to fetch data" });
      }
    });

    // Endpoint seguro de proxy do Gemini: mantem a chave no servidor e nunca a expoe no GitHub ou no navegador
    app.post("/api/ai/insights", async (req, res) => {
      try {
        const { anomalies, stats, topBottom, customApiKey } = req.body || {};
        const apiKey = customApiKey || process.env.GEMINI_API_KEY;

        if (!apiKey) {
          return res.status(400).json({
            success: false,
            error: "Chave de API do Gemini não configurada no servidor (GEMINI_API_KEY).",
          });
        }

        const ai = new GoogleGenAI({ apiKey });

        const prompt = `
          Você é um analista de frota sênior e especialista em logística e eficiência energética.
          Analise os seguintes dados da frota e forneça um relatório executivo estratégico em português (Brasil).

          Estatísticas Gerais do Período:
          - KM Total Percorrido: ${stats?.totalKm ? stats.totalKm.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) : '0'} km
          - KM Produtivo (Informado): ${stats?.totalKmProdutivo ? stats.totalKmProdutivo.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) : '0'} km
          - Consumo Total: ${stats?.totalLitros ? stats.totalLitros.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) : '0'} litros
          - Eficiência Média (KM/L): ${stats?.avgKml ? stats.avgKml.toFixed(2) : '0.00'} km/l
          - Custo Total com Combustível: R$ ${stats?.totalValor ? stats.totalValor.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}
          - Custo por KM: R$ ${stats?.totalValor && stats?.totalKm ? (stats.totalValor / stats.totalKm).toFixed(2) : '0.00'} / km

          ${topBottom ? `
          Destaques de Performance:
          - Melhores Médias: ${topBottom.top3?.map((v: any) => `${v.name} (${v.kml?.toFixed(2)} km/l)`).join(', ') || 'N/A'}
          - Piores Médias: ${topBottom.bottom3?.map((v: any) => `${v.name} (${v.kml?.toFixed(2)} km/l)`).join(', ') || 'N/A'}
          - Maior Custo: ${topBottom.highestCost?.name || 'N/A'} (R$ ${topBottom.highestCost?.valor ? topBottom.highestCost.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : '0,00'})
          ` : ''}

          Anomalias e Alertas Críticos (${anomalies?.length || 0} totais):
          ${anomalies && anomalies.length > 0 ? anomalies.slice(0, 15).map((a: any) => `- ${a.PLACA || ''} (${a.DATA || ''}): ${a.reason || ''} [KM: ${a.DISTANCE || ''}, L: ${a.LITROS || ''}, KML: ${a.KML ? a.KML.toFixed(2) : ''}]`).join('\n') : 'Nenhuma anomalia crítica identificada.'}
          ${anomalies && anomalies.length > 15 ? `... e mais ${anomalies.length - 15} outras anomalias que requerem atenção.` : ''}

          Seu relatório deve conter:
          1. **Sumário Executivo**: Uma frase impactante sobre a saúde da frota.
          2. **Análise de Eficiência**: Comentário sobre a média de ${stats?.avgKml ? stats.avgKml.toFixed(2) : '0.00'} km/l e o custo por KM.
          3. **Pontos de Atenção**: Destaque as anomalias mais graves (ex: consumos impossíveis ou falta de dados).
          4. **Plano de Ação**: 3 a 5 recomendações práticas para reduzir custos e melhorar a coleta de dados.

          Use Markdown para formatação, com títulos claros e emojis para facilitar a leitura.
        `;

        const response = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: [{ parts: [{ text: prompt }] }],
        });

        res.json({
          success: true,
          text: response.text || "Não foi possível gerar insights no momento.",
        });
      } catch (err: any) {
        console.error("[Gemini AI Server Error]:", err);
        res.status(500).json({
          success: false,
          error: err.message || "Erro interno ao processar insights do Gemini.",
        });
      }
    });

    // Vite middleware for development
    if (process.env.NODE_ENV !== "production") {
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
    } else {
      const distPath = path.join(process.cwd(), "dist");
      app.use(express.static(distPath));
      app.get("*", (req, res) => {
        res.sendFile(path.join(distPath, "index.html"));
      });
    }

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
}

startServer();
