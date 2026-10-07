import React, { useState, useEffect, useCallback } from 'react';
import { 
  Database, 
  Activity, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  ExternalLink, 
  Copy, 
  Check, 
  ShieldCheck, 
  Server, 
  Clock, 
  HardDrive, 
  Fuel, 
  Truck, 
  FileSpreadsheet, 
  Package, 
  Receipt, 
  Navigation,
  Globe,
  Info,
  ChevronRight,
  ArrowRight
} from 'lucide-react';
import type { User as FirebaseUser } from 'firebase/auth';
import { pingFirestoreConnection, firebaseActiveConfig } from '../lib/firebase';
import { FirebaseDeploymentSecretsCard } from './FirebaseDeploymentSecretsCard';

export interface SheetSourceInfo {
  id: 'km' | 'comb' | 'veic' | 'gps' | 'estoque' | 'nf';
  name: string;
  category: string;
  url: string;
  recordCount: number;
}

export interface SheetHealthStatus {
  id: string;
  status: 'idle' | 'checking' | 'connected' | 'error' | 'unconfigured';
  latencyMs?: number;
  httpStatus?: number;
  rowCount?: number;
  errorMessage?: string;
  errorDetail?: string;
  checkedAt?: Date;
  endpointType?: string;
}

export interface FirebaseHealthState {
  status: 'checking' | 'connected' | 'error' | 'offline';
  latencyMs: number | null;
  lastChecked: Date | null;
  errorMessage?: string;
  projectId: string;
  databaseId: string;
}

export interface DiagnosticLogItem {
  id: string;
  timestamp: Date;
  service: string;
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  latencyMs?: number;
}

interface ConnectionHealthProps {
  kmUrl: string;
  combUrl: string;
  veicUrl: string;
  gpsUrl: string;
  estoqueUrl: string;
  nfAvulsoUrl: string;
  kmCount: number;
  combCount: number;
  veicCount: number;
  gpsCount: number;
  estoqueCount: number;
  nfCount: number;
  user: FirebaseUser | null;
  firebaseHealth: FirebaseHealthState;
  onRefreshFirebase: () => Promise<void>;
  fetchWithProxyFallback: (url: string) => Promise<Response>;
  transformUrl: (url: string) => string;
  getOneDriveDirectUrl: (url: string) => string;
  onSyncAll?: () => void;
  onOpenImportTab?: () => void;
}

export const ConnectionHealthView: React.FC<ConnectionHealthProps> = ({
  kmUrl,
  combUrl,
  veicUrl,
  gpsUrl,
  estoqueUrl,
  nfAvulsoUrl,
  kmCount,
  combCount,
  veicCount,
  gpsCount,
  estoqueCount,
  nfCount,
  user,
  firebaseHealth,
  onRefreshFirebase,
  fetchWithProxyFallback,
  transformUrl,
  getOneDriveDirectUrl,
  onSyncAll,
  onOpenImportTab
}) => {
  const [sheetStatuses, setSheetStatuses] = useState<Record<string, SheetHealthStatus>>({});
  const [isTestingAllSheets, setIsTestingAllSheets] = useState(false);
  const [isTestingFirebase, setIsTestingFirebase] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [diagnosticLogs, setDiagnosticLogs] = useState<DiagnosticLogItem[]>([]);
  const [storageStats, setStorageStats] = useState<{ idbCount: number; lsSizeKb: number }>({ idbCount: 0, lsSizeKb: 0 });

  const sources: SheetSourceInfo[] = [
    { id: 'km', name: 'Base KM (Logística & Trajetos)', category: 'Quilometragem', url: kmUrl, recordCount: kmCount },
    { id: 'comb', name: 'Combustível (Abastecimentos & Cartões)', category: 'Financeiro', url: combUrl, recordCount: combCount },
    { id: 'veic', name: 'Veículos & Frota (Metadados BI)', category: 'Frota', url: veicUrl, recordCount: veicCount },
    { id: 'gps', name: 'GPS & Telemetria (Velocidades & Rotas)', category: 'Rastreamento', url: gpsUrl, recordCount: gpsCount },
    { id: 'estoque', name: 'Estoque de Peças (Almoxarifado)', category: 'Manutenção', url: estoqueUrl, recordCount: estoqueCount },
    { id: 'nf', name: 'Notas Fiscais Avulsas (Serviços)', category: 'Manutenção', url: nfAvulsoUrl, recordCount: nfCount }
  ];

  const addLog = useCallback((service: string, type: 'success' | 'error' | 'info' | 'warning', message: string, latencyMs?: number) => {
    const newItem: DiagnosticLogItem = {
      id: Math.random().toString(36).substring(2, 9),
      timestamp: new Date(),
      service,
      type,
      message,
      latencyMs
    };
    setDiagnosticLogs(prev => [newItem, ...prev.slice(0, 39)]);
  }, []);

  // Calculate local storage size
  useEffect(() => {
    try {
      let totalBytes = 0;
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key) {
          const val = localStorage.getItem(key);
          totalBytes += (key.length + (val ? val.length : 0)) * 2;
        }
      }
      const totalRecords = kmCount + combCount + veicCount + gpsCount + estoqueCount + nfCount;
      setStorageStats({
        idbCount: totalRecords,
        lsSizeKb: Math.round(totalBytes / 1024)
      });
    } catch (e) {
      console.warn("Error calculating storage", e);
    }
  }, [kmCount, combCount, veicCount, gpsCount, estoqueCount, nfCount]);

  const testSingleSheet = async (source: SheetSourceInfo): Promise<SheetHealthStatus> => {
    if (!source.url || !source.url.trim()) {
      const res: SheetHealthStatus = {
        id: source.id,
        status: 'unconfigured',
        errorMessage: 'URL da planilha não configurada no sistema.',
        checkedAt: new Date()
      };
      setSheetStatuses(prev => ({ ...prev, [source.id]: res }));
      addLog(source.name, 'warning', 'URL não configurada');
      return res;
    }

    setSheetStatuses(prev => ({
      ...prev,
      [source.id]: { id: source.id, status: 'checking' }
    }));

    const start = performance.now();
    let directUrl = source.url.trim();

    // Determine endpoint type
    let endpointType = 'URL Genérica';
    if (directUrl.includes('docs.google.com/spreadsheets')) {
      if (directUrl.includes('/pub?')) endpointType = 'Google Sheets (Publicado na Web)';
      else if (directUrl.includes('/export?')) endpointType = 'Google Sheets (Export Direto CSV)';
      else if (directUrl.includes('/gviz/tq')) endpointType = 'Google Sheets (API GViz Query)';
      else endpointType = 'Google Sheets (Link de Navegador)';
      directUrl = transformUrl(directUrl);
    } else if (directUrl.includes('sharepoint.com') || directUrl.includes('1drv.ms') || directUrl.includes('onedrive.live.com')) {
      endpointType = 'Microsoft OneDrive / SharePoint';
      directUrl = getOneDriveDirectUrl(directUrl);
    }

    try {
      const resp = await fetchWithProxyFallback(directUrl);
      const latency = Math.round(performance.now() - start);

      if (!resp.ok) {
        const res: SheetHealthStatus = {
          id: source.id,
          status: 'error',
          latencyMs: latency,
          httpStatus: resp.status,
          errorMessage: `Servidor retornou HTTP ${resp.status} (${resp.statusText})`,
          errorDetail: 'Verifique se o link possui permissão pública de leitura ou se o arquivo foi excluído.',
          checkedAt: new Date(),
          endpointType
        };
        setSheetStatuses(prev => ({ ...prev, [source.id]: res }));
        addLog(source.name, 'error', `HTTP ${resp.status} - Falha ao acessar`, latency);
        return res;
      }

      const text = await resp.text();
      const trimmed = text.trim();

      // Check for HTML response (SPA fallback or login redirection)
      if (trimmed.toLowerCase().startsWith('<!doctype') || trimmed.toLowerCase().startsWith('<html') || trimmed.includes('<body')) {
        const res: SheetHealthStatus = {
          id: source.id,
          status: 'error',
          latencyMs: latency,
          httpStatus: resp.status,
          errorMessage: 'Resposta Inválida: O link retornou página HTML em vez de dados CSV.',
          errorDetail: 'A planilha provavelmente requer login ou não foi publicada como CSV. No Google Sheets: Arquivo > Compartilhar > Publicar na Web > Escolha "Valores separados por vírgula (.csv)".',
          checkedAt: new Date(),
          endpointType
        };
        setSheetStatuses(prev => ({ ...prev, [source.id]: res }));
        addLog(source.name, 'error', 'Página HTML retornada (Login exigido ou formato incorreto)', latency);
        return res;
      }

      // Valid CSV text
      const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
      const rowCount = Math.max(0, lines.length - 1);

      const res: SheetHealthStatus = {
        id: source.id,
        status: 'connected',
        latencyMs: latency,
        httpStatus: resp.status,
        rowCount,
        checkedAt: new Date(),
        endpointType
      };
      setSheetStatuses(prev => ({ ...prev, [source.id]: res }));
      addLog(source.name, 'success', `Conectado com sucesso (${rowCount} linhas identificadas)`, latency);
      return res;

    } catch (err: any) {
      const latency = Math.round(performance.now() - start);
      const msg = err?.message || String(err);
      const res: SheetHealthStatus = {
        id: source.id,
        status: 'error',
        latencyMs: latency,
        errorMessage: 'Erro de Conexão ou Bloqueio de Rede',
        errorDetail: msg.includes('Failed to fetch') 
          ? 'Falha de rede ou CORS: o servidor não respondeu. Certifique-se de que a planilha está publicada na web como pública.'
          : msg,
        checkedAt: new Date(),
        endpointType
      };
      setSheetStatuses(prev => ({ ...prev, [source.id]: res }));
      addLog(source.name, 'error', `Erro de rede: ${msg.substring(0, 60)}`, latency);
      return res;
    }
  };

  const handleTestAllSheets = async () => {
    setIsTestingAllSheets(true);
    addLog('Diagnóstico Geral', 'info', 'Iniciando teste de todas as conexões Google Sheets...');
    for (const source of sources) {
      await testSingleSheet(source);
    }
    setIsTestingAllSheets(false);
    addLog('Diagnóstico Geral', 'info', 'Diagnóstico de planilhas finalizado.');
  };

  const handleTestFirebase = async () => {
    setIsTestingFirebase(true);
    addLog('Firebase / Nuvem', 'info', 'Pingando servidor Firestore...');
    try {
      await onRefreshFirebase();
      addLog('Firebase / Nuvem', 'success', `Firestore respondendo em ${firebaseHealth.latencyMs || 0}ms`, firebaseHealth.latencyMs || undefined);
    } catch (e: any) {
      addLog('Firebase / Nuvem', 'error', `Falha ao pingar Firestore: ${e?.message || e}`);
    } finally {
      setIsTestingFirebase(false);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Count summaries
  const totalSheets = sources.length;
  const configuredSheets = sources.filter(s => s.url && s.url.trim()).length;
  const testedList = Object.values(sheetStatuses);
  const connectedSheets = testedList.filter(s => s.status === 'connected').length;
  const errorSheets = testedList.filter(s => s.status === 'error').length;

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Header Card */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-6 md:p-8 rounded-3xl text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl -z-0 pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 w-64 h-64 bg-blue-500/10 rounded-full blur-2xl -z-0 pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/20 border border-emerald-400/30 rounded-2xl text-emerald-400">
                <Activity size={24} className="animate-pulse" />
              </div>
              <div>
                <span className="text-[10px] font-bold tracking-widest text-emerald-400 uppercase">Centro de Diagnóstico & Integridade</span>
                <h3 className="text-2xl font-black tracking-tight text-white">Saúde das Conexões & Bancos de Dados</h3>
              </div>
            </div>
            <p className="text-slate-300 text-xs md:text-sm max-w-2xl leading-relaxed">
              Monitore a latência, estabilidade e integridade das conexões em tempo real com o banco de dados na nuvem 
              (<b className="text-white">Firebase Firestore</b>) e com as fontes de dados em planilhas (<b className="text-white">Google Sheets / Nuvem</b>).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 self-start md:self-center">
            <button
              onClick={handleTestFirebase}
              disabled={isTestingFirebase}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all border border-white/15 disabled:opacity-50"
            >
              <RefreshCw size={14} className={isTestingFirebase ? "animate-spin" : ""} />
              {isTestingFirebase ? 'Testando Firebase...' : 'Testar Firebase'}
            </button>
            <button
              onClick={handleTestAllSheets}
              disabled={isTestingAllSheets}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black rounded-xl text-xs transition-all shadow-lg shadow-emerald-500/20 disabled:opacity-50"
            >
              <RefreshCw size={14} className={isTestingAllSheets ? "animate-spin text-slate-950" : "text-slate-950"} />
              {isTestingAllSheets ? 'Testando Planilhas...' : 'Testar Todas Planilhas'}
            </button>
          </div>
        </div>

        {/* Global Summary Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-white/10">
          <div className="bg-white/5 backdrop-blur-sm p-3.5 rounded-2xl border border-white/10">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Nuvem Firebase</span>
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${
                firebaseHealth.status === 'connected' ? 'bg-emerald-400 animate-pulse' :
                firebaseHealth.status === 'checking' ? 'bg-amber-400 animate-ping' :
                'bg-rose-400'
              }`} />
              <span className="text-sm font-black text-white">
                {firebaseHealth.status === 'connected' ? 'Conectado' :
                 firebaseHealth.status === 'checking' ? 'Testando...' :
                 firebaseHealth.status === 'offline' ? 'Offline' : 'Falha'}
              </span>
              {firebaseHealth.latencyMs !== null && (
                <span className="text-[11px] text-emerald-400 font-mono font-bold">({firebaseHealth.latencyMs}ms)</span>
              )}
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm p-3.5 rounded-2xl border border-white/10">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Planilhas Google</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-white">
                {connectedSheets > 0 ? `${connectedSheets}/${configuredSheets} Online` : `${configuredSheets} Ativas`}
              </span>
              {errorSheets > 0 && (
                <span className="px-1.5 py-0.5 bg-rose-500/30 text-rose-300 text-[10px] font-bold rounded-md">
                  {errorSheets} com erro
                </span>
              )}
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm p-3.5 rounded-2xl border border-white/10">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Cache Local (IndexedDB)</span>
            <div className="flex items-center gap-2">
              <HardDrive size={14} className="text-blue-400" />
              <span className="text-sm font-black text-white">{storageStats.idbCount.toLocaleString('pt-BR')} regs</span>
            </div>
          </div>

          <div className="bg-white/5 backdrop-blur-sm p-3.5 rounded-2xl border border-white/10">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Status do Usuário</span>
            <div className="flex items-center gap-2">
              <ShieldCheck size={14} className={user ? "text-emerald-400" : "text-amber-400"} />
              <span className="text-xs font-bold text-white truncate max-w-[130px]">
                {user ? (user.displayName || user.email?.split('@')[0]) : 'Modo Convidado'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Firebase Details + Storage Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Firebase Deep Diagnostic Card */}
        <div className="lg:col-span-2 bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div className="flex items-center gap-3">
              <div className={`p-2.5 rounded-2xl ${
                firebaseHealth.status === 'connected' ? 'bg-emerald-50 text-emerald-600' :
                firebaseHealth.status === 'checking' ? 'bg-amber-50 text-amber-600' :
                'bg-rose-50 text-rose-600'
              }`}>
                <Server size={22} />
              </div>
              <div>
                <h4 className="text-lg font-bold text-slate-900">Banco de Dados Firebase / Cloud Firestore</h4>
                <p className="text-xs text-slate-500">Persistência na nuvem, regras de segurança e sincronização em tempo real</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`px-3 py-1 rounded-full text-xs font-black flex items-center gap-1.5 ${
                firebaseHealth.status === 'connected' ? 'bg-emerald-100 text-emerald-800' :
                firebaseHealth.status === 'checking' ? 'bg-amber-100 text-amber-800 animate-pulse' :
                'bg-rose-100 text-rose-800'
              }`}>
                <span className={`w-2 h-2 rounded-full ${
                  firebaseHealth.status === 'connected' ? 'bg-emerald-500' :
                  firebaseHealth.status === 'checking' ? 'bg-amber-500' :
                  'bg-rose-500'
                }`} />
                {firebaseHealth.status === 'connected' ? 'ONLINE (ATIVO)' :
                 firebaseHealth.status === 'checking' ? 'VERIFICANDO...' :
                 firebaseHealth.status === 'offline' ? 'OFFLINE' : 'ERRO'}
              </span>
            </div>
          </div>

          {/* Technical Info Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">ID do Projeto</span>
              <p className="text-xs font-mono font-bold text-slate-800 truncate" title={firebaseHealth.projectId}>
                {firebaseHealth.projectId || 'Não identificado'}
              </p>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 relative group">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Instância do Banco</span>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded">Ativo</span>
              </div>
              <p className="text-xs font-mono font-bold text-slate-800 truncate" title={firebaseHealth.databaseId}>
                {firebaseHealth.databaseId || (firebaseActiveConfig as any)?.firestoreDatabaseId || 'ai-studio-2af8958c-1110-4e80-9fb1-096885800583'}
              </p>
              <div className="mt-2 flex items-center gap-1.5 pt-1 border-t border-slate-200/50">
                <button
                  type="button"
                  onClick={() => {
                    localStorage.removeItem('fleet_custom_database_id');
                    localStorage.removeItem('fleet_use_official_firebase');
                    window.location.reload();
                  }}
                  className="text-[10px] font-bold px-2 py-0.5 bg-white border border-slate-200 hover:border-emerald-400 hover:text-emerald-700 rounded transition-colors text-slate-600 flex items-center gap-1"
                  title="Restaurar banco padrão oficial provisionado"
                >
                  <RefreshCw size={10} />
                  Restaurar Banco Padrão
                </button>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Latência do Ping</span>
              <div className="flex items-center gap-1.5">
                <Clock size={13} className={
                  (firebaseHealth.latencyMs || 0) < 300 ? 'text-emerald-500' :
                  (firebaseHealth.latencyMs || 0) < 800 ? 'text-amber-500' : 'text-rose-500'
                } />
                <span className="text-xs font-bold text-slate-800">
                  {firebaseHealth.latencyMs !== null ? `${firebaseHealth.latencyMs} ms` : 'Não testado'}
                </span>
                {firebaseHealth.latencyMs !== null && (
                  <span className="text-[10px] text-slate-400">
                    ({firebaseHealth.latencyMs < 200 ? 'Excelente' : firebaseHealth.latencyMs < 600 ? 'Normal' : 'Lento'})
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Auth & Last Checked Info */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-xs">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-500">Autenticação:</span>
              {user ? (
                <span className="text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200">
                  Conectado como {user.email}
                </span>
              ) : (
                <span className="text-slate-600 bg-slate-200 px-2 py-0.5 rounded-lg font-medium">
                  Leitura pública ativa (Não autenticado para salvar na nuvem)
                </span>
              )}
            </div>

            <div className="text-slate-400 flex items-center gap-1 text-[11px]">
              <Clock size={12} />
              Última checagem: {firebaseHealth.lastChecked ? firebaseHealth.lastChecked.toLocaleTimeString('pt-BR') : 'Ao carregar'}
            </div>
          </div>

          {/* Error / Warning Alert Box */}
          {firebaseHealth.errorMessage && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3 text-rose-800 text-xs">
              <AlertTriangle size={18} className="text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-2 flex-1">
                <p className="font-bold">Aviso / Detalhes da Conexão Firebase:</p>
                <p className="font-mono text-[11px] bg-white/70 p-2 rounded-lg border border-rose-200 leading-relaxed">{firebaseHealth.errorMessage}</p>
                <p className="text-[11px] text-rose-700 leading-relaxed">
                  Para o projeto <b className="font-mono">{firebaseHealth.projectId || 'fluxo-frota-oficial'}</b>, verifique se o <b>Cloud Firestore</b> está conectado à instância <b className="font-mono">ai-studio-2af8958c-1110-4e80-9fb1-096885800583</b> e se o domínio atual está autorizado.
                </p>
                <div className="pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      localStorage.removeItem('fleet_custom_database_id');
                      localStorage.removeItem('fleet_use_official_firebase');
                      window.location.reload();
                    }}
                    className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw size={12} />
                    Limpar Cache Local & Reconectar Agora
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Quick Firebase Project Actions & Guidance */}
          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-[11px] font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Server size={13} className="text-indigo-600" />
                Atalhos do Console ({firebaseHealth.projectId || 'fluxo-frota-oficial'})
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const host = typeof window !== 'undefined' ? window.location.hostname : '';
                    copyToClipboard(host, 'current-host');
                  }}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 shadow-xs"
                  title="Copiar domínio atual para colar em Domínios Autorizados no Firebase"
                >
                  {copiedId === 'current-host' ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                  {copiedId === 'current-host' ? 'Domínio Copiado!' : 'Copiar Domínio'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const rulesText = `rules_version = '2';\nservice cloud.firestore {\n  match /databases/{database}/documents {\n    match /{document=**} {\n      allow read, write: if false;\n    }\n    function isSignedIn() { return request.auth != null; }\n    function isValidId(id) { return id is string && id.size() <= 128 && id.matches('^[a-zA-Z0-9_\\\\-]+$'); }\n    function incoming() { return request.resource.data; }\n    match /settings/global {\n      allow read, write: if isSignedIn();\n    }\n    match /test/connection {\n      allow read: if true;\n    }\n    match /mappings/{mappingId} {\n      allow read, write: if isSignedIn();\n    }\n  }\n}`;
                    copyToClipboard(rulesText, 'firestore-rules');
                  }}
                  className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 shadow-xs"
                  title="Copiar regras de segurança para a aba Regras do Firestore"
                >
                  {copiedId === 'firestore-rules' ? <Check size={11} className="text-emerald-600" /> : <Copy size={11} />}
                  {copiedId === 'firestore-rules' ? 'Regras Copiadas!' : 'Copiar Regras Firestore'}
                </button>
                <a
                  href={`https://console.firebase.google.com/project/${firebaseHealth.projectId || 'fluxo-frota-oficial'}/firestore`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 shadow-xs"
                >
                  Abrir Console Firestore <ExternalLink size={11} />
                </a>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[11px] text-slate-600 pt-1">
              <a 
                href={`https://console.firebase.google.com/project/${firebaseHealth.projectId || 'fluxo-frota-oficial'}/firestore`}
                target="_blank" 
                rel="noreferrer"
                className="p-2 bg-white rounded-xl border border-slate-100 hover:border-indigo-200 transition-colors flex items-center justify-between"
              >
                <span>1. Criar Banco Firestore</span>
                <ExternalLink size={10} className="text-slate-400" />
              </a>
              <a 
                href={`https://console.firebase.google.com/project/${firebaseHealth.projectId || 'fluxo-frota-oficial'}/authentication/providers`}
                target="_blank" 
                rel="noreferrer"
                className="p-2 bg-white rounded-xl border border-slate-100 hover:border-indigo-200 transition-colors flex items-center justify-between"
              >
                <span>2. Ativar Provedor Google</span>
                <ExternalLink size={10} className="text-slate-400" />
              </a>
              <a 
                href={`https://console.firebase.google.com/project/${firebaseHealth.projectId || 'fluxo-frota-oficial'}/authentication/settings`}
                target="_blank" 
                rel="noreferrer"
                className="p-2 bg-white rounded-xl border border-slate-100 hover:border-indigo-200 transition-colors flex items-center justify-between"
              >
                <span>3. Domínios Autorizados</span>
                <ExternalLink size={10} className="text-slate-400" />
              </a>
            </div>
          </div>
        </div>

        {/* Local Cache & Persistence Diagnostics */}
        <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100">
              <div className="p-2.5 bg-blue-50 text-blue-600 rounded-2xl">
                <HardDrive size={22} />
              </div>
              <div>
                <h4 className="text-lg font-bold text-slate-900">Armazenamento Local</h4>
                <p className="text-xs text-slate-500">IndexedDB & Cache do Navegador</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-500 font-medium">Motor de Cache:</span>
                <span className="font-bold text-emerald-600">IndexedDB (50MB+ Ilimitado)</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-500 font-medium">Total de Registros Locais:</span>
                <span className="font-black text-slate-900">{storageStats.idbCount.toLocaleString('pt-BR')} itens</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-500 font-medium">Uso do LocalStorage:</span>
                <span className="font-bold text-slate-700">{storageStats.lsSizeKb} KB</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
                <span className="text-slate-500 font-medium">Persistência Offline:</span>
                <span className="font-bold text-emerald-600 flex items-center gap-1">
                  <CheckCircle2 size={13} /> Ativa & Segura
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <p className="text-[11px] text-slate-400 leading-relaxed mb-3">
              Os dados das planilhas são salvos automaticamente no IndexedDB do navegador. Isso garante que o sistema abra instantaneamente mesmo sem internet ou em novas visitas.
            </p>
            {onOpenImportTab && (
              <button
                onClick={onOpenImportTab}
                className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2"
              >
                Gerenciar Importação de Arquivos <ChevronRight size={14} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Seção Especial: Informações para Implantação e Incorporação no Firebase (Segredos & SDK) */}
      <FirebaseDeploymentSecretsCard onRefreshFirebase={handleTestFirebase} />

      {/* Google Sheets Connections Section */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-600 rounded-2xl">
              <FileSpreadsheet size={22} />
            </div>
            <div>
              <h4 className="text-lg font-bold text-slate-900">Conexões com Google Sheets & Planilhas</h4>
              <p className="text-xs text-slate-500">Status individual de cada fonte de dados, latência, linhas e diagnóstico de falhas</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleTestAllSheets}
              disabled={isTestingAllSheets}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm disabled:opacity-50"
            >
              <RefreshCw size={14} className={isTestingAllSheets ? "animate-spin" : ""} />
              {isTestingAllSheets ? 'Testando Todas...' : 'Testar Conexões'}
            </button>
            {onSyncAll && (
              <button
                onClick={onSyncAll}
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
              >
                <Activity size={14} />
                Sincronizar Dados
              </button>
            )}
          </div>
        </div>

        {/* Sheets Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {sources.map(source => {
            const status = sheetStatuses[source.id] || { id: source.id, status: 'idle' };
            const isConfigured = Boolean(source.url && source.url.trim());

            return (
              <div 
                key={source.id} 
                className={`p-5 rounded-2xl border transition-all flex flex-col justify-between space-y-4 ${
                  status.status === 'connected' ? 'bg-emerald-50/30 border-emerald-200' :
                  status.status === 'error' ? 'bg-rose-50/40 border-rose-200' :
                  status.status === 'checking' ? 'bg-amber-50/30 border-amber-200' :
                  !isConfigured ? 'bg-slate-50 border-dashed border-slate-200 opacity-80' :
                  'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="space-y-3">
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-xl text-xs font-bold ${
                        source.id === 'km' ? 'bg-blue-100 text-blue-700' :
                        source.id === 'comb' ? 'bg-emerald-100 text-emerald-700' :
                        source.id === 'veic' ? 'bg-purple-100 text-purple-700' :
                        source.id === 'gps' ? 'bg-indigo-100 text-indigo-700' :
                        source.id === 'estoque' ? 'bg-amber-100 text-amber-700' :
                        'bg-rose-100 text-rose-700'
                      }`}>
                        {source.id === 'km' ? <Truck size={16} /> :
                         source.id === 'comb' ? <Fuel size={16} /> :
                         source.id === 'veic' ? <Truck size={16} /> :
                         source.id === 'gps' ? <Navigation size={16} /> :
                         source.id === 'estoque' ? <Package size={16} /> :
                         <Receipt size={16} />}
                      </div>
                      <div>
                        <h5 className="text-xs font-bold text-slate-900 leading-tight">{source.name}</h5>
                        <span className="text-[10px] text-slate-400 uppercase font-semibold">{source.category}</span>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider shrink-0 flex items-center gap-1 ${
                      status.status === 'connected' ? 'bg-emerald-100 text-emerald-800' :
                      status.status === 'error' ? 'bg-rose-100 text-rose-800' :
                      status.status === 'checking' ? 'bg-amber-100 text-amber-800 animate-pulse' :
                      !isConfigured ? 'bg-slate-200 text-slate-500' :
                      'bg-slate-100 text-slate-600'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${
                        status.status === 'connected' ? 'bg-emerald-500' :
                        status.status === 'error' ? 'bg-rose-500' :
                        status.status === 'checking' ? 'bg-amber-500' :
                        !isConfigured ? 'bg-slate-400' : 'bg-slate-400'
                      }`} />
                      {status.status === 'connected' ? 'Online' :
                       status.status === 'error' ? 'Erro' :
                       status.status === 'checking' ? 'Testando...' :
                       !isConfigured ? 'Vazia' : 'Pronto'}
                    </span>
                  </div>

                  {/* URL Display with Copy & External Link */}
                  {isConfigured ? (
                    <div className="bg-slate-100/80 p-2 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
                      <span className="text-[11px] font-mono text-slate-600 truncate flex-1" title={source.url}>
                        {source.url}
                      </span>
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => copyToClipboard(source.url, source.id)}
                          className="p-1 hover:bg-white rounded text-slate-500 hover:text-slate-700 transition-colors"
                          title="Copiar URL"
                        >
                          {copiedId === source.id ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
                        </button>
                        <a
                          href={source.url}
                          target="_blank"
                          rel="noreferrer"
                          className="p-1 hover:bg-white rounded text-slate-500 hover:text-slate-700 transition-colors"
                          title="Abrir no navegador"
                        >
                          <ExternalLink size={12} />
                        </a>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2.5 bg-slate-100 rounded-xl text-center">
                      <span className="text-[11px] text-slate-400 italic">Nenhum link configurado para esta base</span>
                    </div>
                  )}

                  {/* Key Metrics */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                    <div className="p-2 bg-white/80 rounded-lg border border-slate-100">
                      <span className="text-slate-400 block text-[9px] uppercase font-bold">Em Memória</span>
                      <span className="font-bold text-slate-800">{source.recordCount.toLocaleString('pt-BR')} linhas</span>
                    </div>
                    <div className="p-2 bg-white/80 rounded-lg border border-slate-100">
                      <span className="text-slate-400 block text-[9px] uppercase font-bold">Latência do Ping</span>
                      <span className="font-bold text-slate-800">
                        {status.latencyMs !== undefined ? `${status.latencyMs} ms` : '-'}
                      </span>
                    </div>
                  </div>

                  {/* Error Box if any */}
                  {status.status === 'error' && (
                    <div className="p-2.5 bg-rose-100/70 border border-rose-200 rounded-xl text-[11px] text-rose-900 space-y-1">
                      <p className="font-bold flex items-center gap-1">
                        <XCircle size={13} className="text-rose-600 shrink-0" />
                        {status.errorMessage}
                      </p>
                      {status.errorDetail && (
                        <p className="text-[10px] text-rose-800 leading-tight">{status.errorDetail}</p>
                      )}
                    </div>
                  )}

                  {/* Success Endpoint Info */}
                  {status.status === 'connected' && status.endpointType && (
                    <div className="text-[10px] text-emerald-700 font-medium flex items-center gap-1">
                      <CheckCircle2 size={12} className="text-emerald-600 shrink-0" />
                      Protocolo: {status.endpointType}
                    </div>
                  )}
                </div>

                {/* Card Actions */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-[10px] text-slate-400">
                    {status.checkedAt ? `Testado ${status.checkedAt.toLocaleTimeString('pt-BR')}` : 'Não testado nesta sessão'}
                  </span>
                  <button
                    type="button"
                    onClick={() => testSingleSheet(source)}
                    disabled={status.status === 'checking' || !isConfigured}
                    className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-40 flex items-center gap-1.5"
                  >
                    <RefreshCw size={11} className={status.status === 'checking' ? "animate-spin" : ""} />
                    {status.status === 'checking' ? 'Testando' : 'Testar'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Diagnostic Log & Audit Trail */}
      <div className="bg-white p-6 md:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <Activity size={18} className="text-slate-500" />
            <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wider">Histórico de Eventos & Diagnóstico</h4>
          </div>
          <button
            type="button"
            onClick={() => setDiagnosticLogs([])}
            className="text-[11px] text-slate-400 hover:text-slate-600 font-bold transition-colors"
          >
            Limpar Registros
          </button>
        </div>

        {diagnosticLogs.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-xs">
            Nenhum evento registrado ainda. Clique em <b>"Testar Firebase"</b> ou <b>"Testar Todas Planilhas"</b> acima para gerar diagnósticos em tempo real.
          </div>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {diagnosticLogs.map(item => (
              <div 
                key={item.id} 
                className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between text-xs gap-3"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${
                    item.type === 'success' ? 'bg-emerald-500' :
                    item.type === 'error' ? 'bg-rose-500' :
                    item.type === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
                  }`} />
                  <span className="font-bold text-slate-700 shrink-0">[{item.service}]</span>
                  <span className="text-slate-600 truncate">{item.message}</span>
                </div>
                <div className="flex items-center gap-3 shrink-0 text-[10px] text-slate-400 font-mono">
                  {item.latencyMs !== undefined && (
                    <span className="font-bold text-emerald-600">{item.latencyMs}ms</span>
                  )}
                  <span>{item.timestamp.toLocaleTimeString('pt-BR')}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// Reusable Health Badge for Sidebar and Headers
export interface FirebaseHealthBadgeProps {
  health: FirebaseHealthState;
  variant?: 'sidebar' | 'header' | 'hero' | 'compact';
  collapsed?: boolean;
  onOpenDiagnostic?: () => void;
  onQuickPing?: () => void;
}

export const FirebaseHealthBadge: React.FC<FirebaseHealthBadgeProps> = ({
  health,
  variant = 'header',
  collapsed = false,
  onOpenDiagnostic,
  onQuickPing
}) => {
  const isConnected = health.status === 'connected';
  const isChecking = health.status === 'checking';
  const isError = health.status === 'error';
  const isOffline = health.status === 'offline';

  if (variant === 'sidebar') {
    if (collapsed) {
      return (
        <button
          type="button"
          onClick={onOpenDiagnostic}
          title={`Firebase: ${isConnected ? 'Conectado (' + (health.latencyMs || 0) + 'ms)' : isChecking ? 'Verificando...' : 'Falha'}`}
          className="w-full flex justify-center p-2 rounded-xl hover:bg-slate-100 transition-colors"
        >
          <div className="relative">
            <Server size={18} className={isConnected ? "text-emerald-600" : isError ? "text-rose-600" : "text-slate-400"} />
            <span className={`absolute -top-1 -right-1 w-2 h-2 rounded-full ${
              isConnected ? 'bg-emerald-500 animate-pulse' :
              isChecking ? 'bg-amber-400 animate-ping' :
              'bg-rose-500'
            }`} />
          </div>
        </button>
      );
    }

    return (
      <div 
        onClick={onOpenDiagnostic}
        className="cursor-pointer group p-3 bg-slate-50 hover:bg-slate-100/90 rounded-2xl border border-slate-200/80 transition-all space-y-1.5 shadow-sm"
        title="Clique para abrir a Central de Diagnóstico de Conexões"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-emerald-500 animate-pulse' :
              isChecking ? 'bg-amber-400 animate-ping' :
              'bg-rose-500'
            }`} />
            <span className="text-[10px] font-black text-slate-700 uppercase tracking-wider">
              Firebase Nuvem
            </span>
          </div>

          <div className="flex items-center gap-1">
            {onQuickPing && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onQuickPing();
                }}
                className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
                title="Re-testar ping do Firebase"
              >
                <RefreshCw size={11} className={isChecking ? "animate-spin text-emerald-600" : ""} />
              </button>
            )}
            <ChevronRight size={12} className="text-slate-400 group-hover:translate-x-0.5 transition-transform" />
          </div>
        </div>

        <div className="flex items-center justify-between text-xs">
          <span className={`font-bold ${
            isConnected ? 'text-emerald-600' :
            isChecking ? 'text-amber-600' :
            'text-rose-600'
          }`}>
            {isConnected ? 'Conectado' : isChecking ? 'Verificando...' : isOffline ? 'Offline' : 'Falha'}
          </span>
          {health.latencyMs !== null && isConnected && (
            <span className="text-[10px] font-mono text-slate-400 font-bold">
              {health.latencyMs}ms
            </span>
          )}
        </div>
      </div>
    );
  }

  if (variant === 'hero') {
    return (
      <div 
        onClick={onOpenDiagnostic}
        className="cursor-pointer inline-flex items-center gap-3 px-3.5 py-1.5 rounded-full bg-slate-900/5 hover:bg-slate-900/10 border border-slate-200 transition-all shadow-sm"
        title="Clique para ver detalhes e diagnóstico das conexões"
      >
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${
            isConnected ? 'bg-emerald-500 animate-pulse' :
            isChecking ? 'bg-amber-400 animate-ping' :
            'bg-rose-500'
          }`} />
          <span className="text-[11px] font-black text-slate-800 uppercase tracking-tight">
            Firebase: {isConnected ? 'Online' : isChecking ? 'Testando...' : 'Erro'}
          </span>
        </div>
        {health.latencyMs !== null && isConnected && (
          <span className="text-[10px] font-mono text-emerald-700 font-bold bg-emerald-100/80 px-2 py-0.5 rounded-full">
            {health.latencyMs}ms
          </span>
        )}
        <Activity size={13} className="text-slate-400" />
      </div>
    );
  }

  // Default: Header
  return (
    <button
      type="button"
      onClick={onOpenDiagnostic}
      className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 transition-all shadow-sm text-xs"
      title="Saúde da Conexão Firebase: Clique para abrir diagnóstico"
    >
      <div className="relative">
        <Server size={14} className={isConnected ? "text-emerald-600" : isError ? "text-rose-600" : "text-slate-400"} />
        <span className={`absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full ${
          isConnected ? 'bg-emerald-500 animate-pulse' :
          isChecking ? 'bg-amber-400 animate-ping' :
          'bg-rose-500'
        }`} />
      </div>
      <span className="font-bold text-slate-700 hidden sm:inline">Firebase:</span>
      <span className={`font-black ${
        isConnected ? 'text-emerald-600' :
        isChecking ? 'text-amber-600' :
        'text-rose-600'
      }`}>
        {isConnected ? 'Online' : isChecking ? '...' : 'Erro'}
      </span>
      {health.latencyMs !== null && isConnected && (
        <span className="text-[10px] font-mono text-slate-400 font-bold hidden md:inline">
          {health.latencyMs}ms
        </span>
      )}
    </button>
  );
};
