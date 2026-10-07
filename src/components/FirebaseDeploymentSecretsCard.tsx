import React, { useState } from 'react';
import { 
  KeyRound, 
  Copy, 
  Check, 
  Eye, 
  EyeOff, 
  ExternalLink, 
  ShieldCheck, 
  Server, 
  Code2, 
  FileCode, 
  Sparkles, 
  Download, 
  CheckCircle2, 
  RefreshCw,
  Terminal,
  Layers,
  Database
} from 'lucide-react';
import { 
  OFFICIAL_FIREBASE_SECRETS, 
  OFFICIAL_FIREBASE_SDK_CONFIG,
  firebaseActiveConfig 
} from '../lib/firebase';

interface FirebaseDeploymentSecretsCardProps {
  className?: string;
  onRefreshFirebase?: () => Promise<void>;
}

export const FirebaseDeploymentSecretsCard: React.FC<FirebaseDeploymentSecretsCardProps> = ({
  className = '',
  onRefreshFirebase
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showValues, setShowValues] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'database' | 'netlify' | 'secrets' | 'sdk' | 'env'>('database');
  const [isPinging, setIsPinging] = useState(false);
  const [livePingResult, setLivePingResult] = useState<any>(null);

  const isOfficialActive = typeof window !== 'undefined' && localStorage.getItem('fleet_use_official_firebase') === 'true';
  const currentProjectId = (firebaseActiveConfig as any)?.projectId || 'fluxo-frota-oficial';
  const currentDbId = (firebaseActiveConfig as any)?.firestoreDatabaseId || 'ai-studio-2af8958c-1110-4e80-9fb1-096885800583';
  const currentHost = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  const isNetlifyEnv = typeof window !== 'undefined' && window.location.hostname.includes('netlify.app');

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(id);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  const handleManualPing = async () => {
    setIsPinging(true);
    try {
      const { pingFirestoreConnection } = await import('../lib/firebase');
      const res = await pingFirestoreConnection();
      setLivePingResult(res);
      if (onRefreshFirebase) {
        await onRefreshFirebase();
      }
    } catch (e: any) {
      setLivePingResult({ ok: false, errorMessage: e?.message || String(e), latencyMs: 0 });
    } finally {
      setIsPinging(false);
    }
  };

  const handleToggleOfficialProject = (enable: boolean) => {
    if (typeof window !== 'undefined') {
      if (enable) {
        localStorage.setItem('fleet_use_official_firebase', 'true');
        if (OFFICIAL_FIREBASE_SDK_CONFIG.firestoreDatabaseId) {
          localStorage.setItem('fleet_custom_database_id', OFFICIAL_FIREBASE_SDK_CONFIG.firestoreDatabaseId);
        }
      } else {
        localStorage.removeItem('fleet_use_official_firebase');
        localStorage.removeItem('fleet_custom_database_id');
      }
      window.location.reload();
    }
  };

  // Generate full .env text for one-click copy
  const fullEnvText = OFFICIAL_FIREBASE_SECRETS.map(s => `${s.name}="${s.value}"`).join('\n') + 
    '\nAPP_URL="https://' + currentHost + '"';

  // Generate JavaScript SDK initialization code snippet (Image 2 style)
  const sdkCodeSnippet = `// Configuração do Firebase para Implantação e Incorporação Web
export const firebaseConfig = {
  apiKey: "${OFFICIAL_FIREBASE_SDK_CONFIG.apiKey}",
  authDomain: "${OFFICIAL_FIREBASE_SDK_CONFIG.authDomain}",
  projectId: "${OFFICIAL_FIREBASE_SDK_CONFIG.projectId}",
  storageBucket: "${OFFICIAL_FIREBASE_SDK_CONFIG.storageBucket}",
  messagingSenderId: "${OFFICIAL_FIREBASE_SDK_CONFIG.messagingSenderId}",
  appId: "${OFFICIAL_FIREBASE_SDK_CONFIG.appId}",
  measurementId: "${OFFICIAL_FIREBASE_SDK_CONFIG.measurementId}"
};

// Instância do Banco Firestore:
// VITE_FIREBASE_DATABASE_ID: ${OFFICIAL_FIREBASE_SDK_CONFIG.firestoreDatabaseId}`;

  // Generate JSON config string
  const jsonConfigSnippet = JSON.stringify({
    ...OFFICIAL_FIREBASE_SDK_CONFIG,
    geminiApiKey: "•••••••• [Configurado via GEMINI_API_KEY no Servidor]",
    viteGeminiApiKey: ((import.meta as any).env?.VITE_GEMINI_API_KEY as string) || "•••••••• [Configurado via VITE_GEMINI_API_KEY]"
  }, null, 2);

  return (
    <div className={`bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden ${className}`}>
      {/* Top Banner Header */}
      <div className="p-6 md:p-8 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white border-b border-slate-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-lime-500/20 border border-lime-400/40 rounded-2xl text-lime-400">
                <KeyRound size={24} />
              </div>
              <div>
                <span className="text-[10px] font-black tracking-widest text-lime-400 uppercase">
                  Credenciais de Produção
                </span>
                <h3 className="text-xl md:text-2xl font-black text-white tracking-tight">
                  Implantação & Incorporação no Firebase
                </h3>
              </div>
            </div>
            <p className="text-xs md:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Informações oficiais de conexão, chaves de API e variáveis de ambiente para publicação externa 
              (Firebase Hosting, Netlify, Vercel ou contêineres Cloud Run).
            </p>
          </div>

          {/* Quick Actions & Mode Pill */}
          <div className="flex flex-wrap items-center gap-2 self-start md:self-center">
            <button
              type="button"
              onClick={() => setShowValues(!showValues)}
              className="flex items-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all border border-white/15 cursor-pointer shadow-xs"
              title={showValues ? "Ocultar valores dos segredos" : "Revelar valores dos segredos"}
            >
              {showValues ? <EyeOff size={14} /> : <Eye size={14} />}
              <span>{showValues ? "Ocultar Valores" : "Mostrar Valores"}</span>
            </button>

            <button
              type="button"
              onClick={() => copyToClipboard(fullEnvText, 'full-env-top')}
              className="flex items-center gap-1.5 px-3 py-2 bg-lime-500 hover:bg-lime-400 text-slate-950 rounded-xl text-xs font-black transition-all cursor-pointer shadow-md shadow-lime-500/20"
              title="Copiar todas as variáveis de ambiente (.env)"
            >
              {copiedKey === 'full-env-top' ? <Check size={14} className="text-slate-950" /> : <Copy size={14} />}
              <span>{copiedKey === 'full-env-top' ? "Copiado!" : "Copiar Todas (.env)"}</span>
            </button>
          </div>
        </div>

        {/* Status Bar / Active Project Indicator */}
        <div className="mt-6 pt-5 border-t border-white/10 flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2.5">
            <span className="text-slate-400 font-medium">Projeto Ativo no App:</span>
            <span className="font-mono font-bold bg-white/10 px-2.5 py-1 rounded-lg text-lime-300 border border-white/15 flex items-center gap-1.5">
              <Server size={13} className="text-lime-400" />
              {currentProjectId}
            </span>
            {isOfficialActive ? (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-lime-500/20 text-lime-300 border border-lime-400/30">
                Oficial Ativado
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-700 text-slate-300">
                Padrão AI Studio
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!isOfficialActive ? (
              <button
                type="button"
                onClick={() => handleToggleOfficialProject(true)}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                title="Ativar e conectar diretamente ao projeto fluxo-frota-oficial"
              >
                <Sparkles size={13} className="text-amber-300" />
                Ativar Projeto fluxo-frota-oficial
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleToggleOfficialProject(false)}
                className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all border border-white/10 cursor-pointer"
                title="Voltar para a conexão padrão do AI Studio"
              >
                Restaurar Padrão AI Studio
              </button>
            )}

            <a
              href="https://console.firebase.google.com/project/fluxo-frota-oficial/overview"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-bold transition-all border border-white/15 flex items-center gap-1.5"
            >
              Console Firebase <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="px-6 md:px-8 pt-6 pb-2 border-b border-slate-100 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-2xl">
          <button
            type="button"
            onClick={() => setActiveTab('secrets')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'secrets'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <KeyRound size={14} className={activeTab === 'secrets' ? 'text-lime-600' : 'text-slate-400'} />
            <span>Tabela de Segredos</span>
            <span className="text-[10px] bg-lime-100 text-lime-800 font-bold px-1.5 py-0.2 rounded-full">
              {OFFICIAL_FIREBASE_SECRETS.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('sdk')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'sdk'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Code2 size={14} className={activeTab === 'sdk' ? 'text-amber-500' : 'text-slate-400'} />
            <span>Configuração SDK (Anexo 2)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('env')}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === 'env'
                ? 'bg-white text-slate-900 shadow-sm'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <FileCode size={14} className={activeTab === 'env' ? 'text-indigo-600' : 'text-slate-400'} />
            <span>Arquivo .env Completo</span>
          </button>
        </div>

        <div className="text-xs text-slate-400 font-medium">
          Dica: Clique no botão de copiar em qualquer item para transferir para a área de transferência.
        </div>
      </div>

      {/* TAB 1: TABELA DE SEGREDOS (ESTILO ANEXO 1) */}
      {activeTab === 'secrets' && (
        <div className="p-6 md:p-8 space-y-6 animate-fadeIn">
          {/* Replica of the exact Green Banner Table Header from Image 1 */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
            {/* The Distinctive Green Title Bar (Header "Segredos" as in screenshot) */}
            <div className="bg-[#78b326] text-white py-2.5 px-4 text-center select-none shadow-xs">
              <span className="font-bold text-base md:text-lg italic tracking-wide drop-shadow-xs">
                Segredos
              </span>
            </div>

            {/* Sub-header with column titles "Nome" and "Valor" */}
            <div className="grid grid-cols-12 bg-slate-900 text-white text-xs font-black uppercase tracking-wider py-2.5 px-4 select-none">
              <div className="col-span-5 md:col-span-4 text-center border-r border-slate-700">
                Nome
              </div>
              <div className="col-span-7 md:col-span-8 text-center">
                Valor
              </div>
            </div>

            {/* Rows matching Image 1 exactly */}
            <div className="divide-y divide-slate-100 bg-white text-xs">
              {OFFICIAL_FIREBASE_SECRETS.map((secret, idx) => {
                const isCopied = copiedKey === `secret-${secret.name}`;
                return (
                  <div 
                    key={secret.name}
                    className={`grid grid-cols-12 items-center p-3 md:p-3.5 transition-colors hover:bg-slate-50 ${
                      idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'
                    }`}
                  >
                    {/* Column: Nome */}
                    <div className="col-span-5 md:col-span-4 pr-3 border-r border-slate-200/80">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-bold text-slate-900 text-[11px] md:text-xs break-all">
                          {secret.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyToClipboard(secret.name, `name-${secret.name}`)}
                          className="text-slate-400 hover:text-slate-700 transition-colors p-1 rounded hover:bg-slate-100"
                          title="Copiar nome da variável"
                        >
                          {copiedKey === `name-${secret.name}` ? (
                            <Check size={12} className="text-emerald-600" />
                          ) : (
                            <Copy size={12} />
                          )}
                        </button>
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5 line-clamp-1">
                        {secret.description}
                      </span>
                    </div>

                    {/* Column: Valor */}
                    <div className="col-span-7 md:col-span-8 pl-4 flex items-center justify-between gap-3">
                      <div className="font-mono text-[11px] md:text-xs text-slate-800 break-all select-all font-medium py-1 px-2 rounded-lg bg-slate-50 border border-slate-200/60 flex-1">
                        {showValues ? (
                          secret.value
                        ) : (
                          <span className="tracking-widest text-slate-400">••••••••••••••••••••••••••••••••</span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => copyToClipboard(secret.value, `secret-${secret.name}`)}
                          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer ${
                            isCopied 
                              ? 'bg-emerald-600 text-white' 
                              : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                          }`}
                          title={`Copiar valor de ${secret.name}`}
                        >
                          {isCopied ? <Check size={12} /> : <Copy size={12} />}
                          <span className="hidden sm:inline">{isCopied ? 'Copiado!' : 'Copiar'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => copyToClipboard(`${secret.name}="${secret.value}"`, `line-${secret.name}`)}
                          className="px-2 py-1.5 rounded-lg text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-600 transition-all"
                          title="Copiar formato NOME=VALOR"
                        >
                          .env
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Additional Guidance Footer */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1.5">
              <span className="font-black text-slate-800 flex items-center gap-1.5">
                <Database size={14} className="text-emerald-600" />
                Banco de Dados Dedicado
              </span>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                A variável <b className="font-mono text-slate-700">VITE_FIREBASE_DATABASE_ID</b> aponta para a instância Enterprise 
                <span className="font-mono text-emerald-700 font-bold block mt-1">{currentDbId}</span>
              </p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1.5">
              <span className="font-black text-slate-800 flex items-center gap-1.5">
                <Sparkles size={14} className="text-amber-500" />
                Inteligência Artificial (Gemini)
              </span>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                As chaves <b className="font-mono text-slate-700">GEMINI_API_KEY</b> e <b className="font-mono text-slate-700">VITE_GEMINI_API_KEY</b> 
                habilitam os recursos de auditoria preditiva, copiloto de frotas e análises de consumo.
              </p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-1.5">
              <span className="font-black text-slate-800 flex items-center gap-1.5">
                <ShieldCheck size={14} className="text-indigo-600" />
                Autenticação & Segurança
              </span>
              <p className="text-slate-500 text-[11px] leading-relaxed">
                O domínio <b className="font-mono text-slate-700">fluxo-frota-oficial.firebaseapp.com</b> 
                gerencia o login com conta Google para salvar e sincronizar os relatórios na nuvem.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: CONFIGURAÇÃO SDK (ESTILO ANEXO 2 - BLOCO AMARELO / HIGHLIGHT) */}
      {activeTab === 'sdk' && (
        <div className="p-6 md:p-8 space-y-6 animate-fadeIn">
          {/* Card replicating the Yellow Highlight from Image 2 */}
          <div className="bg-[#fff952] border-2 border-amber-400 p-6 md:p-8 rounded-2xl shadow-sm text-slate-900 font-mono text-xs md:text-sm leading-relaxed space-y-3 relative overflow-hidden">
            <div className="flex items-center justify-between pb-3 border-b border-amber-400/60 mb-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-amber-900 flex items-center gap-1.5">
                <Code2 size={15} className="text-amber-800" />
                Configuração SDK / Objeto de Incorporação Firebase (Anexo 2)
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(sdkCodeSnippet, 'sdk-code')}
                className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                {copiedKey === 'sdk-code' ? <Check size={12} /> : <Copy size={12} />}
                <span>{copiedKey === 'sdk-code' ? 'Snippet Copiado!' : 'Copiar Snippet SDK'}</span>
              </button>
            </div>

            {/* Verbatim lines matching Image 2 */}
            <div className="space-y-1.5 text-slate-950 font-bold select-all">
              <p>apiKey: &quot;{OFFICIAL_FIREBASE_SDK_CONFIG.apiKey}&quot;,</p>
              <p>authDomain: &quot;{OFFICIAL_FIREBASE_SDK_CONFIG.authDomain}&quot;,</p>
              <p>projectId: &quot;{OFFICIAL_FIREBASE_SDK_CONFIG.projectId}&quot;,</p>
              <p>storageBucket: &quot;{OFFICIAL_FIREBASE_SDK_CONFIG.storageBucket}&quot;,</p>
              <p>messagingSenderId: &quot;{OFFICIAL_FIREBASE_SDK_CONFIG.messagingSenderId}&quot;,</p>
              <p>appId: &quot;{OFFICIAL_FIREBASE_SDK_CONFIG.appId}&quot;,</p>
              <p>measurementId: &quot;{OFFICIAL_FIREBASE_SDK_CONFIG.measurementId}&quot;</p>
              <p className="pt-2 font-black text-amber-950">
                VITE_FIREBASE_DATABASE_ID: {OFFICIAL_FIREBASE_SDK_CONFIG.firestoreDatabaseId}
              </p>
            </div>
          </div>

          {/* Action Row & JSON format */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => copyToClipboard(jsonConfigSnippet, 'json-code')}
                className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl font-bold transition-all flex items-center gap-1.5 shadow-xs"
              >
                {copiedKey === 'json-code' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                <span>Copiar como JSON</span>
              </button>

              <button
                type="button"
                onClick={() => copyToClipboard(fullEnvText, 'env-from-sdk')}
                className="px-3 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl font-bold transition-all flex items-center gap-1.5 shadow-xs"
              >
                {copiedKey === 'env-from-sdk' ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
                <span>Copiar como .env</span>
              </button>
            </div>

            <div className="text-slate-500 text-[11px]">
              Compatível com <span className="font-mono font-bold">firebase/app</span> e <span className="font-mono font-bold">firebase/firestore</span> versão 10+.
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ARQUIVO .ENV COMPLETO */}
      {activeTab === 'env' && (
        <div className="p-6 md:p-8 space-y-6 animate-fadeIn">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Terminal size={14} className="text-indigo-600" />
                Conteúdo pronto para colar em seu arquivo <b className="font-mono">.env</b> ou no painel de Environment Variables:
              </span>
              <button
                type="button"
                onClick={() => copyToClipboard(fullEnvText, 'env-tab-copy')}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                {copiedKey === 'env-tab-copy' ? <Check size={13} /> : <Copy size={13} />}
                <span>{copiedKey === 'env-tab-copy' ? 'Copiado!' : 'Copiar Tudo'}</span>
              </button>
            </div>

            <pre className="p-5 bg-slate-900 text-emerald-400 font-mono text-xs rounded-2xl overflow-x-auto border border-slate-800 leading-relaxed shadow-inner select-all">
              {fullEnvText}
            </pre>
          </div>

          <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl text-blue-900 text-xs space-y-1">
            <p className="font-bold flex items-center gap-1.5">
              <CheckCircle2 size={14} className="text-blue-600" />
              Implantação no Netlify, Vercel ou Firebase Hosting:
            </p>
            <p className="text-[11px] text-blue-800 leading-relaxed">
              No painel do Netlify ou Vercel, acesse <b>Site configuration &gt; Environment variables</b> e importe todas as variáveis acima. 
              O Vite carregará as variáveis com prefixo <b className="font-mono">VITE_</b> automaticamente em tempo de compilação.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
