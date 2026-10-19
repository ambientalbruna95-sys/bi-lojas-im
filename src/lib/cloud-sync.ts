const CLOUD_SYNC_URL = "https://gyyclpfcevohrrgbmkqn.supabase.co/functions/v1/bi-sync";
const CLOUD_AUTH_KEY = "bi-lojas-im-cloud-auth-v1";

export type CloudAuth = {
  userId: string;
  password: string;
};


export type CloudDirectoryUser = {
  id: string;
  nome: string;
  perfil: string;
  ativo: boolean;
  vinculoId?: string;
  email?: string;
  observacao?: string;
};

async function timedFetch(body: Record<string, unknown>, timeoutMs: number) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(CLOUD_SYNC_URL, {
      method: "POST",
      // text/plain mantém a chamada como "simple request" e evita o preflight
      // OPTIONS que estava atrasando ou expirando no navegador.
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } finally {
    window.clearTimeout(timer);
  }
}

async function publicRequest<T extends Record<string, unknown>>(
  action: string,
  payload: Record<string, unknown> = {},
): Promise<T & { ok: boolean; error?: string }> {
  const response = await timedFetch({ action, ...payload }, 1800);

  const data = await response.json().catch(() => ({})) as T & { ok?: boolean; error?: string };
  if (!response.ok || data.ok === false) {
    throw new Error(data.error || "Não foi possível acessar a base central.");
  }
  return { ...data, ok: true } as T & { ok: boolean; error?: string };
}

export function fetchCloudDirectory() {
  return publicRequest<{ empty?: boolean; users?: CloudDirectoryUser[]; version?: number }>("directory");
}

export function authenticateCloudUser(userId: string, password: string) {
  return publicRequest<{ empty?: boolean; user?: CloudDirectoryUser; version?: number }>("authenticate", {
    userId,
    password,
  });
}

export type CloudPullResponse = {
  ok: boolean;
  empty?: boolean;
  state?: Record<string, unknown>;
  version?: number;
  updatedAt?: string;
  updatedBy?: string;
  alreadyInitialized?: boolean;
  initialized?: boolean;
  error?: string;
};

export function setCloudAuth(auth: CloudAuth) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(CLOUD_AUTH_KEY, JSON.stringify(auth));
}

export function getCloudAuth(): CloudAuth | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(CLOUD_AUTH_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<CloudAuth>;
    if (!parsed.userId || !parsed.password) return null;
    return { userId: parsed.userId, password: parsed.password };
  } catch {
    return null;
  }
}

export function clearCloudAuth() {
  if (typeof window === "undefined") return;
  window.sessionStorage.removeItem(CLOUD_AUTH_KEY);
}

async function requestCloud<T extends Record<string, unknown>>(
  action: string,
  payload: Record<string, unknown> = {},
): Promise<T & { ok: boolean; error?: string }> {
  const auth = getCloudAuth();
  if (!auth) throw new Error("Sessão de sincronização não encontrada. Entre novamente no sistema.");

  const response = await timedFetch({
    action,
    userId: auth.userId,
    password: auth.password,
    ...payload,
  }, action === "pull" ? 3500 : 6000);

  const data = await response.json().catch(() => ({})) as T & { ok?: boolean; error?: string };
  if (!response.ok || data.ok === false) {
    throw new Error(data.error || "Não foi possível sincronizar com a nuvem.");
  }
  return { ...data, ok: true } as T & { ok: boolean; error?: string };
}

export function pullCloudState() {
  return requestCloud<CloudPullResponse>("pull");
}

export function initCloudState(state: Record<string, unknown>) {
  return requestCloud<CloudPullResponse>("init", { state });
}

export function pushCloudState(state: Record<string, unknown>) {
  return requestCloud<{ version?: number; updatedAt?: string; updatedBy?: string }>("push", { state });
}

export function createCloudBackup() {
  return requestCloud<{ version?: number; createdAt?: string }>("backup");
}

export function mergeLegacyCloudState(state: Record<string, unknown>) {
  return requestCloud<CloudPullResponse>("merge-legacy", { state });
}
