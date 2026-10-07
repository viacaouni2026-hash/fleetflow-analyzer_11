import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signInWithRedirect, 
  signOut, 
  onAuthStateChanged,
  signInAnonymously
} from 'firebase/auth';
import { 
  getFirestore, 
  initializeFirestore,
  doc, 
  getDoc as originalGetDoc, 
  getDocFromServer,
  setDoc as originalSetDoc, 
  onSnapshot as originalOnSnapshot, 
  collection, 
  query, 
  getDocs as originalGetDocs, 
  updateDoc as originalUpdateDoc, 
  deleteDoc as originalDeleteDoc, 
  serverTimestamp 
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Support optional environment variable overrides (e.g. custom Netlify / Vercel deployment keys)
// When not provided, seamlessly defaults to the official provisioned firebase-applet-config.json
const metaEnv = (import.meta as any).env || {};

const safeEnv = (key: string) => {
  const val = metaEnv[key];
  if (typeof val === 'string' && val.trim().length > 0 && val.trim() !== key) {
    return val.trim();
  }
  return undefined;
};

// Clean up any stale or invalid database id stored in localStorage from older sessions
if (typeof window !== 'undefined') {
  try {
    const savedCustomDb = localStorage.getItem('fleet_custom_database_id');
    if (savedCustomDb && savedCustomDb !== firebaseConfig.firestoreDatabaseId) {
      console.warn('[Firebase] Removing obsolete database ID from localStorage:', savedCustomDb);
      localStorage.removeItem('fleet_custom_database_id');
    }
  } catch {}
}

// Validate that a string has the structure of a real Google/Firebase Web API key
export const isValidFirebaseApiKey = (key: unknown): boolean => {
  if (typeof key !== 'string') return false;
  const trimmed = key.trim();
  // Valid Web API keys start with alphanumeric characters (e.g. AIzaSy...)
  // They NEVER contain colons ':' (which indicate Firebase Web App IDs like 1:675272405968:web:6b3cf740f4e6c4f03a7fd5)
  // They NEVER contain slashes '/' or whitespace, and are at least 20 characters
  if (trimmed.includes(':') || trimmed.includes('/') || trimmed.includes(' ') || trimmed.length < 20) {
    return false;
  }
  if (trimmed.startsWith('MY_') || trimmed.includes('•••') || trimmed === '[Protegido no Servidor]') {
    return false;
  }
  return true;
};

const rawEnvApiKey = safeEnv('VITE_FIREBASE_API_KEY');
const activeApiKey = isValidFirebaseApiKey(rawEnvApiKey) ? rawEnvApiKey! : 'AIzaSyAjjKZYAmy8SfLu3Ahb37GawNf4BvwYpdo';

// Official deployment credentials (fluxo-frota-oficial)
export const OFFICIAL_FIREBASE_SECRETS = [
  { name: 'GEMINI_API_KEY', value: safeEnv('GEMINI_API_KEY') || '[Protegido no Servidor]', description: 'Chave de API Gemini (Backend / AI Studio)' },
  { name: 'VITE_FIREBASE_API_KEY', value: activeApiKey, description: 'Chave de API Web Firebase (fluxo-frota-oficial)' },
  { name: 'VITE_FIREBASE_AUTH_DOMAIN', value: safeEnv('VITE_FIREBASE_AUTH_DOMAIN') || 'fluxo-frota-oficial.firebaseapp.com', description: 'Domínio de Autenticação OAuth Firebase' },
  { name: 'VITE_FIREBASE_PROJECT_ID', value: safeEnv('VITE_FIREBASE_PROJECT_ID') || 'fluxo-frota-oficial', description: 'ID do Projeto Firebase Ativo' },
  { name: 'VITE_FIREBASE_STORAGE_BUCKET', value: safeEnv('VITE_FIREBASE_STORAGE_BUCKET') || 'fluxo-frota-oficial.firebasestorage.app', description: 'Bucket do Cloud Storage' },
  { name: 'VITE_FIREBASE_MESSAGING_SENDER_ID', value: safeEnv('VITE_FIREBASE_MESSAGING_SENDER_ID') || '675272405968', description: 'ID do Remetente de Mensagens Cloud' },
  { name: 'VITE_FIREBASE_APP_ID', value: safeEnv('VITE_FIREBASE_APP_ID') || '1:675272405968:web:6b3cf740f4e6c4f03a7fd5', description: 'ID do Aplicativo Web Firebase' },
  { name: 'VITE_FIREBASE_MEASUREMENT_ID', value: safeEnv('VITE_FIREBASE_MEASUREMENT_ID') || 'G-LVQLZYDG4Y', description: 'ID de Métricas do Firebase' },
  { name: 'VITE_FIREBASE_DATABASE_ID', value: safeEnv('VITE_FIREBASE_DATABASE_ID') || 'ai-studio-2af8958c-1110-4e80-9fb1-096885800583', description: 'ID da Instância Firestore (Enterprise Nativa)' },
  { name: 'VITE_GEMINI_API_KEY', value: safeEnv('VITE_GEMINI_API_KEY') || '[Protegido via Variável de Ambiente]', description: 'Chave Gemini Pública / Client' },
];

export const OFFICIAL_FIREBASE_SDK_CONFIG = {
  apiKey: activeApiKey,
  authDomain: safeEnv('VITE_FIREBASE_AUTH_DOMAIN') || "fluxo-frota-oficial.firebaseapp.com",
  projectId: safeEnv('VITE_FIREBASE_PROJECT_ID') || "fluxo-frota-oficial",
  storageBucket: safeEnv('VITE_FIREBASE_STORAGE_BUCKET') || "fluxo-frota-oficial.firebasestorage.app",
  messagingSenderId: safeEnv('VITE_FIREBASE_MESSAGING_SENDER_ID') || "675272405968",
  appId: safeEnv('VITE_FIREBASE_APP_ID') || "1:675272405968:web:6b3cf740f4e6c4f03a7fd5",
  measurementId: safeEnv('VITE_FIREBASE_MEASUREMENT_ID') || "G-LVQLZYDG4Y",
  firestoreDatabaseId: safeEnv('VITE_FIREBASE_DATABASE_ID') || "ai-studio-2af8958c-1110-4e80-9fb1-096885800583"
};

// Check if user selected official project in local storage
const isOfficialProjectSelected = typeof window !== 'undefined' && localStorage.getItem('fleet_use_official_firebase') === 'true';
const shouldForceOfficial = isOfficialProjectSelected && !!activeApiKey;

// Base config source: if official project is selected AND we have a valid api key, start from OFFICIAL_FIREBASE_SDK_CONFIG, otherwise firebaseConfig
const baseSourceConfig = shouldForceOfficial ? OFFICIAL_FIREBASE_SDK_CONFIG : firebaseConfig;

const currentTargetProjectId = shouldForceOfficial 
  ? (safeEnv('VITE_FIREBASE_PROJECT_ID') || OFFICIAL_FIREBASE_SDK_CONFIG.projectId) 
  : (safeEnv('VITE_FIREBASE_PROJECT_ID') || firebaseConfig.projectId);

const resolvedDatabaseId = (() => {
  if (typeof window !== 'undefined') {
    const localDb = localStorage.getItem('fleet_custom_database_id');
    if (localDb && localDb.trim()) {
      if (localDb.trim() !== firebaseConfig.firestoreDatabaseId) {
        localStorage.removeItem('fleet_custom_database_id');
      } else {
        return localDb.trim();
      }
    }
  }
  if (safeEnv('VITE_FIREBASE_DATABASE_ID')) {
    const envDb = safeEnv('VITE_FIREBASE_DATABASE_ID')!;
    if (envDb && envDb.trim()) {
      return envDb.trim();
    }
  }
  return firebaseConfig.firestoreDatabaseId || 'ai-studio-2af8958c-1110-4e80-9fb1-096885800583';
})();

// Only apply external environment overrides if a valid custom API key is present;
// otherwise, overriding projectId without matching API key causes cross-project auth/database failures.
const envOverrides: Record<string, string> = shouldForceOfficial ? {
  ...(activeApiKey ? { apiKey: activeApiKey } : {}),
  ...(safeEnv('VITE_FIREBASE_AUTH_DOMAIN') ? { authDomain: safeEnv('VITE_FIREBASE_AUTH_DOMAIN')! } : {}),
  ...(safeEnv('VITE_FIREBASE_PROJECT_ID') ? { projectId: safeEnv('VITE_FIREBASE_PROJECT_ID')! } : {}),
  ...(safeEnv('VITE_FIREBASE_STORAGE_BUCKET') ? { storageBucket: safeEnv('VITE_FIREBASE_STORAGE_BUCKET')! } : {}),
  ...(safeEnv('VITE_FIREBASE_MESSAGING_SENDER_ID') ? { messagingSenderId: safeEnv('VITE_FIREBASE_MESSAGING_SENDER_ID')! } : {}),
  ...(safeEnv('VITE_FIREBASE_APP_ID') ? { appId: safeEnv('VITE_FIREBASE_APP_ID')! } : {}),
  ...(safeEnv('VITE_FIREBASE_MEASUREMENT_ID') ? { measurementId: safeEnv('VITE_FIREBASE_MEASUREMENT_ID')! } : {}),
} : {};

const validFallbackApiKey = isValidFirebaseApiKey(firebaseConfig.apiKey) 
  ? firebaseConfig.apiKey 
  : firebaseConfig.apiKey;

const configToUse = {
  ...baseSourceConfig,
  ...envOverrides,
  apiKey: (shouldForceOfficial && activeApiKey) ? activeApiKey : validFallbackApiKey,
  firestoreDatabaseId: resolvedDatabaseId
};

let appInstance: any;
try {
  appInstance = initializeApp(configToUse);
} catch (appErr) {
  console.warn('[Firebase] initializeApp failed with configToUse, falling back to provisioned config:', appErr);
  appInstance = initializeApp(firebaseConfig);
}

let authInstance: any;
try {
  authInstance = getAuth(appInstance);
} catch (authErr) {
  console.warn('[Firebase] getAuth failed with active app, attempting fallback to default provisioned config:', authErr);
  try {
    const fallbackApp = initializeApp(firebaseConfig, 'applet-fallback');
    authInstance = getAuth(fallbackApp);
  } catch (fallbackErr) {
    console.error('[Firebase] Fatal getAuth initialization failure:', fallbackErr);
    authInstance = {
      currentUser: null,
      onAuthStateChanged: () => () => {},
      signInWithPopup: async () => {},
      signInWithRedirect: async () => {},
      signInAnonymously: async () => {},
      signOut: async () => {},
    };
  }
}

export const auth = authInstance;

// Helper to ensure authenticated state for safe Firestore writes on Netlify/hostings
export const ensureAuthenticated = async () => {
  if (auth && !auth.currentUser) {
    try {
      await signInAnonymously(auth);
      console.log('[Firebase] Signed in anonymously for seamless cloud sync');
    } catch (anonErr) {
      console.warn('[Firebase] Anonymous sign-in attempt warning:', anonErr);
    }
  }
};

const targetDbId = configToUse.firestoreDatabaseId && configToUse.firestoreDatabaseId !== "(default)" 
  ? configToUse.firestoreDatabaseId 
  : undefined;

// Preferred Firestore initialization adhering directly to standard SDK conventions
export const db = (() => {
  try {
    return getFirestore(appInstance, targetDbId);
  } catch {
    try {
      return initializeFirestore(appInstance, {
        experimentalAutoDetectLongPolling: true,
      }, targetDbId);
    } catch {
      try {
        return getFirestore(appInstance);
      } catch (err) {
        console.error('[Firebase] Firestore init failed:', err);
        return {} as any;
      }
    }
  }
})();

export const googleProvider = new GoogleAuthProvider();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid || null,
      email: auth.currentUser?.email || null,
      emailVerified: auth.currentUser?.emailVerified || null,
      isAnonymous: auth.currentUser?.isAnonymous || null,
      tenantId: auth.currentUser?.tenantId || null,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export async function getDoc(reference: any) {
  try {
    return await originalGetDoc(reference);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, reference.path || null);
  }
}

export async function getDocs(queryRef: any) {
  try {
    return await originalGetDocs(queryRef);
  } catch (error) {
    const path = queryRef.path || (queryRef.query ? queryRef.query.path : null) || null;
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function setDoc(reference: any, data: any, options?: any) {
  try {
    return await originalSetDoc(reference, data, options);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, reference.path || null);
  }
}

export async function updateDoc(reference: any, ...args: any[]) {
  try {
    return await (originalUpdateDoc as any)(reference, ...args);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, reference.path || null);
  }
}

export async function deleteDoc(reference: any) {
  try {
    return await originalDeleteDoc(reference);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, reference.path || null);
  }
}

export function onSnapshot(reference: any, ...args: any[]) {
  const path = reference.path || (reference.ref ? reference.ref.path : null) || null;
  
  if (typeof args[0] === 'function') {
    const onNext = args[0];
    const onError = args[1];
    const wrappedOnError = (error: any) => {
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (e) {
        if (onError) {
          onError(e);
        } else {
          throw e;
        }
      }
    };
    return originalOnSnapshot(reference, onNext, wrappedOnError);
  } else if (typeof args[0] === 'object' && typeof args[1] === 'function') {
    const secondArg = args[1];
    if (typeof secondArg === 'function') {
      const options = args[0];
      const onNext = args[1];
      const onError = args[2];
      const wrappedOnError = (error: any) => {
        try {
          handleFirestoreError(error, OperationType.GET, path);
        } catch (e) {
          if (onError) {
            onError(e);
          } else {
            throw e;
          }
        }
      };
      return originalOnSnapshot(reference, options, onNext, wrappedOnError);
    }
  }
  
  let observer = args[0];
  let options = undefined;
  if (args[1] !== undefined) {
    options = args[0];
    observer = args[1];
  }
  
  if (observer && typeof observer === 'object') {
    const originalError = observer.error;
    const wrappedObserver = {
      ...observer,
      error: (error: any) => {
        try {
          handleFirestoreError(error, OperationType.GET, path);
        } catch (e) {
          if (originalError) {
            originalError(e);
          } else {
            throw e;
          }
        }
      }
    };
    if (options) {
      return originalOnSnapshot(reference, options, wrappedObserver);
    } else {
      return originalOnSnapshot(reference, wrappedObserver);
    }
  }
  
  return (originalOnSnapshot as any)(reference, ...args);
}

export async function pingFirestoreConnection(): Promise<{
  ok: boolean;
  latencyMs: number;
  status: 'connected' | 'offline' | 'error';
  errorMessage?: string;
  projectId: string;
  databaseId: string;
  checkedAt: Date;
}> {
  const start = performance.now();
  const projId = (configToUse as any)?.projectId || firebaseConfig.projectId;
  const dbId = (configToUse as any)?.firestoreDatabaseId || firebaseConfig.firestoreDatabaseId;
  const apiKey = (configToUse as any)?.apiKey || firebaseConfig.apiKey;

  // 1. Try SDK server fetch first
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    const latency = Math.round(performance.now() - start);
    return {
      ok: true,
      latencyMs: latency,
      status: 'connected',
      projectId: projId,
      databaseId: dbId,
      checkedAt: new Date()
    };
  } catch (sdkError: any) {
    const sdkMsg = sdkError?.message || '';
    const sdkCode = sdkError?.code || '';

    // If permission-denied or not-found, server responded and is 100% online
    if (sdkCode === 'permission-denied' || sdkCode === 'not-found' || sdkMsg.includes('permission-denied') || sdkMsg.includes('Missing or insufficient permissions')) {
      const latency = Math.round(performance.now() - start);
      return {
        ok: true,
        latencyMs: latency,
        status: 'connected',
        projectId: projId,
        databaseId: dbId,
        checkedAt: new Date()
      };
    }

    // 2. Direct HTTP REST API ping fallback (robust against browser iframe WebChannel latency/polling)
    try {
      const restUrl = `https://firestore.googleapis.com/v1/projects/${projId}/databases/${dbId}/documents/test/connection?key=${apiKey}`;
      const restResp = await fetch(restUrl);
      if (restResp.ok || restResp.status === 404 || restResp.status === 403) {
        const latency = Math.round(performance.now() - start);
        return {
          ok: true,
          latencyMs: latency,
          status: 'connected',
          projectId: projId,
          databaseId: dbId,
          checkedAt: new Date()
        };
      }
    } catch (restErr) {
      console.warn('[Firebase] REST ping attempt:', restErr);
    }

    // 3. Fall back to cached getDoc if available
    try {
      await originalGetDoc(doc(db, 'test', 'connection'));
      const latency = Math.round(performance.now() - start);
      return {
        ok: true,
        latencyMs: latency,
        status: 'connected',
        projectId: projId,
        databaseId: dbId,
        checkedAt: new Date()
      };
    } catch {
      const latency = Math.round(performance.now() - start);
      const isOffline = sdkCode === 'unavailable' || sdkMsg.includes('offline') || sdkMsg.includes('unavailable');
      return {
        ok: false,
        latencyMs: latency,
        status: isOffline ? 'offline' : 'error',
        errorMessage: isOffline 
          ? `Não foi possível alcançar o Firestore no projeto "${projId}". Verifique se o Cloud Firestore está ativo no console (https://console.firebase.google.com/project/${projId}/firestore). Código retornado: [${sdkCode}] ${sdkMsg}`
          : `[${sdkCode}] ${sdkMsg}`,
        projectId: projId,
        databaseId: dbId,
        checkedAt: new Date()
      };
    }
  }
}

export { 
  signInWithPopup, 
  signInWithRedirect,
  signInAnonymously,
  signOut, 
  onAuthStateChanged,
  doc,
  collection,
  query,
  serverTimestamp,
  getDocFromServer,
  configToUse as firebaseActiveConfig
};
