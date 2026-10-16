import { useEffect, useState } from "react";
import { Check, Copy, ExternalLink, LogOut, PlugZap, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { Badge, Btn, Panel } from "@/components/kit";

type GoogleAdsStatus = {
  configured: boolean;
  connected: boolean;
  user?: { id: string; email: string; name: string } | null;
  accounts: string[];
  apiVersion?: string;
  redirectUri?: string;
  clientIdHint?: string;
  oauthProjectNumber?: string;
  errors: string[];
};

const EMPTY: GoogleAdsStatus = {
  configured: false,
  connected: false,
  accounts: [],
  errors: [],
};

export function GoogleAdsConnectCard() {
  const [status, setStatus] = useState<GoogleAdsStatus>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const sync = async (silent = false) => {
    setLoading(true);
    try {
      const res = await fetch("/api/google-ads/status", { credentials: "include" });
      const data = await res.json() as GoogleAdsStatus;
      setStatus(data);
      if (!silent) {
        if (!data.configured) toast.error("A conexão do Google Ads ainda precisa das credenciais na Vercel.");
        else if (!data.connected) toast.error(data.errors[0] || "O Google Ads ainda não foi autorizado.");
        else toast.success(`Google Ads sincronizado: ${data.accounts.length} conta(s) encontrada(s).`);
      }
    } catch {
      if (!silent) toast.error("Não foi possível consultar o Google Ads.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void sync(true);
    const qs = new URLSearchParams(window.location.search);
    const oauth = qs.get("google_ads");
    if (oauth === "connected") toast.success("Google Ads conectado. Buscando suas contas...");
    if (oauth === "setup") toast.error("Falta configurar a conexão Google na Vercel.");
    const oauthError = qs.get("google_ads_error");
    if (oauth === "cancelled") toast.error(oauthError || "A autorização do Google Ads foi cancelada.");
    if (oauth === "state_error") toast.error("A autorização expirou. Tente novamente.");
    if (oauth === "error") toast.error(oauthError || "O Google não concluiu a conexão.");
  }, []);

  const connect = () => {
    window.location.href = "/api/google-ads/connect";
  };

  const disconnect = async () => {
    await fetch("/api/google-ads/disconnect", { method: "POST", credentials: "include" });
    setStatus(EMPTY);
    toast.success("Google Ads desconectado.");
  };

  return <Panel title="Google Ads" className="mt-4">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="font-display text-lg font-black">Integração automática</div>
          <Badge tone={status.connected ? "success" : status.configured ? "warn" : "muted"}>
            {status.connected ? "Conectado" : status.configured ? "Aguardando autorização" : "Configuração necessária"}
          </Badge>
        </div>
        <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
          Clique para autorizar sua conta Google. O BI identifica automaticamente as contas do Google Ads que você pode acessar.
        </p>
        {status.user && <div className="mt-2 text-xs text-muted-foreground"><b>Conta Google:</b> {status.user.email || status.user.name}</div>}
      </div>
      <div className="flex flex-wrap gap-2">
        {status.connected ? <>
          <Btn onClick={() => void sync()} disabled={loading}><RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />{loading ? "Sincronizando..." : "Sincronizar agora"}</Btn>
          <Btn variant="outline" onClick={() => void disconnect()}><LogOut className="h-4 w-4" />Desconectar</Btn>
        </> : <Btn onClick={connect}><PlugZap className="h-4 w-4" />Conectar Google Ads</Btn>}
      </div>
    </div>

    {!status.configured && <div className="mt-4 rounded-xl border border-warn/20 bg-warn/5 p-3 text-xs text-muted-foreground">
      O botão já está preparado. Falta cadastrar <b className="text-foreground">GOOGLE_ADS_CLIENT_ID</b> e <b className="text-foreground">GOOGLE_ADS_CLIENT_SECRET</b> no ambiente de produção.
    </div>}

    <div className="mt-4 rounded-xl border border-white/7 bg-white/[.02] p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <div className="text-xs font-black uppercase tracking-[.12em] text-muted-foreground">Configuração Google Cloud</div>
          <div className="mt-1 text-sm font-bold">URI de redirecionamento autorizado</div>
        </div>
        {status.apiVersion && <Badge tone="muted">Google Ads API {status.apiVersion}</Badge>}
      </div>

      <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
        No Google Cloud, abra o cliente OAuth do tipo <b className="text-foreground">Aplicativo da Web</b> e cadastre exatamente este endereço em <b className="text-foreground">URIs de redirecionamento autorizados</b>. Protocolo, domínio, caminho e barra final precisam ser idênticos.
      </p>

      <div className="mt-3 flex min-w-0 flex-col gap-2 sm:flex-row">
        <code className="min-w-0 flex-1 overflow-x-auto rounded-xl border border-white/8 bg-black/20 px-3 py-2.5 text-[11px] text-foreground">
          {status.redirectUri || (typeof window !== "undefined" ? `${window.location.origin}/api/google-ads/callback` : "/api/google-ads/callback")}
        </code>
        <Btn
          variant="outline"
          onClick={async () => {
            const value = status.redirectUri || `${window.location.origin}/api/google-ads/callback`;
            await navigator.clipboard.writeText(value);
            setCopied(true);
            window.setTimeout(() => setCopied(false), 1800);
          }}
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copied ? "Copiado" : "Copiar"}
        </Btn>
      </div>

      {(status.clientIdHint || status.oauthProjectNumber) && <div className="mt-3 rounded-xl border border-primary/20 bg-primary/[.04] p-3 text-xs">
        <div className="font-black text-primary">OAuth que o BI está usando agora</div>
        {status.clientIdHint && <div className="mt-1 break-all text-muted-foreground"><b className="text-foreground">Client ID:</b> {status.clientIdHint}</div>}
        {status.oauthProjectNumber && <div className="mt-1 text-muted-foreground"><b className="text-foreground">Número do projeto OAuth:</b> {status.oauthProjectNumber}</div>}
        <div className="mt-2 text-muted-foreground">Compare este Client ID com o cliente em <b className="text-foreground">Google Auth Platform → Clientes</b>. O usuário de teste precisa estar configurado no mesmo projeto desse cliente.</div>
      </div>}

      <div className="mt-3 grid gap-2 md:grid-cols-3">
        <div className="rounded-lg border border-white/7 p-3 text-xs">
          <b>1. OAuth</b>
          <p className="mt-1 text-muted-foreground">Client ID e Client Secret do mesmo projeto Google Cloud usado pelo BI.</p>
        </div>
        <div className="rounded-lg border border-white/7 p-3 text-xs">
          <b>2. API ativada</b>
          <p className="mt-1 text-muted-foreground">Ative a <b className="text-foreground">Google Ads API</b> em APIs e serviços → Biblioteca.</p>
        </div>
        <div className="rounded-lg border border-white/7 p-3 text-xs">
          <b>3. Acesso Google Ads</b>
          <p className="mt-1 text-muted-foreground">O projeto precisa ter acesso à API compatível com contas de produção e o e-mail autorizado precisa enxergar as contas.</p>
        </div>
      </div>

      <a
        href="https://console.cloud.google.com/apis/credentials"
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:underline"
      >
        Abrir credenciais no Google Cloud <ExternalLink className="h-3.5 w-3.5" />
      </a>
    </div>

    {status.connected && <div className="mt-4 rounded-xl border border-white/7 p-4">
      <div className="mb-3 text-xs font-black uppercase tracking-[.12em] text-muted-foreground">Contas encontradas</div>
      {status.accounts.length ? <div className="flex flex-wrap gap-2">{status.accounts.map((id) => <Badge key={id} tone="success">Google Ads · {id}</Badge>)}</div> : <div className="text-sm text-muted-foreground">Nenhuma conta do Google Ads foi encontrada para este usuário.</div>}
    </div>}

    {!!status.errors.length && <div className="mt-4 rounded-xl border border-warn/20 bg-warn/5 p-3 text-xs">
      <div className="font-black text-warn">O que está impedindo a conexão</div>
      <div className="mt-1 leading-relaxed text-muted-foreground">{status.errors.join(" · ")}</div>
    </div>}
  </Panel>;
}