import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, Clock3, LogOut, PlugZap, RefreshCw, ShieldCheck, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { useApp, uid, type SocialMetric, type SocialPlatform } from "@/lib/store";
import { PageHeader, Panel, Stat, Btn, Modal, Field, inputCls, Badge, pageHead } from "@/components/kit";
import { GoogleAdsConnectCard } from "@/components/GoogleAdsConnectCard";

export const Route = createFileRoute("/integracoes")({
  head: pageHead("APIs / Integrações", "Conexão das redes sociais e sincronização de métricas das Lojas IM."),
  component: Page,
});

const API_INFO: Record<SocialPlatform, { api: string; escopo: string }> = {
  Facebook: { api: "Meta Graph API", escopo: "Páginas, alcance, impressões, engajamento e cliques" },
  Instagram: { api: "Instagram Graph API", escopo: "Conta profissional, posts, alcance, impressões e engajamento" },
  TikTok: { api: "TikTok for Developers / Business API", escopo: "Vídeos, visualizações, alcance, engajamento e perfil" },
  LinkedIn: { api: "LinkedIn Marketing APIs", escopo: "Página da empresa, posts, impressões, cliques e engajamento" },
  YouTube: { api: "YouTube Data API + Analytics API", escopo: "Canal, vídeos, visualizações, alcance e engajamento" },
};

type MetaStatus = {
  configured: boolean;
  connected: boolean;
  profile?: { id: string; name: string };
  pages: Array<{ id: string; name: string }>;
  instagram: Array<{ id: string; username: string; name: string; pageId: string; pageName: string }>;
  businesses: Array<{ id: string; name: string }>;
  adAccounts: Array<{ id: string; name: string; account_status?: number; currency?: string }>;
  errors: string[];
};

const EMPTY_META: MetaStatus = {
  configured: false,
  connected: false,
  pages: [],
  instagram: [],
  businesses: [],
  adAccounts: [],
  errors: [],
};

function Page() {
  const { s, set } = useApp();
  const [setupId, setSetupId] = useState<string | null>(null);
  const [metricOpen, setMetricOpen] = useState(false);
  const [meta, setMeta] = useState<MetaStatus>(EMPTY_META);
  const [syncing, setSyncing] = useState(false);

  const syncMeta = async (silent = false) => {
    setSyncing(true);
    try {
      const res = await fetch("/api/meta/status", { credentials: "include" });
      const data = await res.json() as MetaStatus;
      setMeta(data);

      const now = new Date().toISOString();
      const fbConta = data.pages.map((x) => x.name).join(", ");
      const igConta = data.instagram.map((x) => x.username ? `@${x.username}` : x.name).filter(Boolean).join(", ");

      set((st) => ({
        ...st,
        conexoesSociais: st.conexoesSociais.map((x) => {
          if (x.plataforma === "Facebook") {
            return {
              ...x,
              status: data.connected ? (data.pages.length ? "Conectado" : "Pendente") : "Desconectado",
              conta: data.pages.length ? fbConta : "",
              ultimaSincronizacao: data.connected ? now : x.ultimaSincronizacao,
              observacao: data.connected ? "Meta OAuth autorizado" : x.observacao,
            };
          }
          if (x.plataforma === "Instagram") {
            return {
              ...x,
              status: data.connected ? (data.instagram.length ? "Conectado" : "Pendente") : "Desconectado",
              conta: data.instagram.length ? igConta : "",
              ultimaSincronizacao: data.connected ? now : x.ultimaSincronizacao,
              observacao: data.connected ? "Meta OAuth autorizado" : x.observacao,
            };
          }
          return x;
        }),
      }));

      if (!silent) {
        if (!data.configured) toast.error("A integração Meta ainda precisa das credenciais na Vercel.");
        else if (!data.connected) toast.error("A Meta ainda não está autorizada.");
        else toast.success("Facebook, Instagram e ativos do Meta Business sincronizados.");
      }
    } catch {
      if (!silent) toast.error("Não foi possível consultar a integração da Meta.");
    } finally {
      setSyncing(false);
    }
  };

  useEffect(() => {
    void syncMeta(true);
    const status = new URLSearchParams(window.location.search).get("meta");
    if (status === "connected") toast.success("Meta conectada. Buscando os ativos autorizados...");
    if (status === "setup") toast.error("Falta configurar o App ID, App Secret e a versão da Graph API na Vercel.");
    if (status === "cancelled") toast.error("A autorização da Meta foi cancelada.");
    if (status === "state_error") toast.error("A autorização expirou. Tente conectar novamente.");
    if (status === "error") toast.error("A Meta não concluiu a conexão. Tente novamente.");
  }, []);

  const conectarMeta = () => {
    window.location.href = "/api/meta/connect";
  };

  const desconectarMeta = async () => {
    await fetch("/api/meta/disconnect", { method: "POST", credentials: "include" });
    setMeta(EMPTY_META);
    set((st) => ({
      ...st,
      conexoesSociais: st.conexoesSociais.map((x) =>
        x.plataforma === "Facebook" || x.plataforma === "Instagram"
          ? { ...x, status: "Desconectado", conta: "", ultimaSincronizacao: "" }
          : x,
      ),
    }));
    toast.success("Meta desconectada deste navegador.");
  };

  const conectadas = s.conexoesSociais.filter((x) => x.status === "Conectado").length;
  const pendentes = s.conexoesSociais.filter((x) => x.status === "Pendente").length;
  const metricas = s.metricasSociais.length;
  const ultima = [...s.conexoesSociais].map((x) => x.ultimaSincronizacao).filter(Boolean).sort().at(-1) || "";

  return (
    <>
      <PageHeader
        title="APIs / Integrações"
        sub="Conecte Facebook e Instagram com autorização oficial da Meta e sincronize os ativos disponíveis."
        action={<div className="flex flex-wrap gap-2">
          {meta.connected
            ? <Btn onClick={() => void syncMeta()} disabled={syncing}><RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} />{syncing ? "Sincronizando..." : "Sincronizar agora"}</Btn>
            : <Btn onClick={conectarMeta}><PlugZap className="h-4 w-4" />Conectar Meta</Btn>}
          <Btn variant="outline" onClick={() => setMetricOpen(true)}><UploadCloud className="h-4 w-4" />Importar métricas</Btn>
        </div>}
      />

      {!meta.configured && <div className="mb-4 rounded-2xl border border-warn/25 bg-warn/5 p-4 text-sm">
        <div className="font-bold text-warn">Conexão automática pronta para configuração</div>
        <p className="mt-1 text-muted-foreground">O botão já usa OAuth seguro. Falta apenas cadastrar as credenciais do aplicativo da Meta nas variáveis de ambiente da Vercel para a primeira autorização.</p>
      </div>}

      {meta.connected && <div className="mb-4 rounded-2xl border border-success/20 bg-success/5 p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><div className="font-display text-lg font-black">Meta conectada</div><div className="text-sm text-muted-foreground">{meta.profile?.name || "Conta autorizada"} · os tokens ficam protegidos no servidor.</div></div>
          <Btn variant="outline" onClick={() => void desconectarMeta()}><LogOut className="h-4 w-4" />Desconectar</Btn>
        </div>
      </div>}

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat accent label="Conectadas" value={String(conectadas)} hint={`de ${s.conexoesSociais.length} redes`} />
        <Stat label="Pendentes" value={String(pendentes)} hint="ativos ainda não autorizados" />
        <Stat label="Registros de métricas" value={String(metricas)} hint="histórico importado/sincronizado" />
        <Stat label="Última sincronização" value={ultima ? new Date(ultima).toLocaleDateString("pt-BR") : "—"} hint="última consulta às APIs" />
      </div>

      <Panel title="Conexões sociais">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {s.conexoesSociais.map((c) => {
            const info = API_INFO[c.plataforma];
            const tone = c.status === "Conectado" ? "success" : c.status === "Pendente" ? "warn" : c.status === "Erro" ? "primary" : "muted";
            const isMeta = c.plataforma === "Facebook" || c.plataforma === "Instagram";
            return <div key={c.id} className="rounded-xl border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-display text-lg font-bold">{c.plataforma}</div>
                  <div className="text-xs text-muted-foreground">{info.api}</div>
                </div>
                <Badge tone={tone}>{c.status}</Badge>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{info.escopo}</p>
              <div className="mt-3 space-y-1 text-xs">
                <div><b>Conta:</b> {c.conta || "não vinculada"}</div>
                <div><b>Última sincronização:</b> {c.ultimaSincronizacao ? new Date(c.ultimaSincronizacao).toLocaleString("pt-BR") : "—"}</div>
              </div>
              <div className="mt-4 flex gap-2">
                <Btn className="flex-1" variant={c.status === "Conectado" ? "outline" : "primary"} onClick={isMeta ? conectarMeta : () => setSetupId(c.id)}>
                  <PlugZap className="h-4 w-4" />{isMeta ? (meta.connected ? "Reconectar" : "Conectar") : (c.status === "Conectado" ? "Reconfigurar" : "Configurar")}
                </Btn>
                {isMeta && meta.connected && <Btn variant="outline" onClick={() => void syncMeta()} disabled={syncing}><RefreshCw className={`h-4 w-4 ${syncing ? "animate-spin" : ""}`} /></Btn>}
              </div>
            </div>;
          })}
        </div>
      </Panel>

      {meta.connected && <Panel title="Ativos encontrados no Meta Business" className="mt-4">
        <div className="grid gap-4 lg:grid-cols-2">
          <AssetList title="Páginas do Facebook" items={meta.pages.map((x) => x.name)} empty="Nenhuma Página liberada na autorização." />
          <AssetList title="Instagram profissional" items={meta.instagram.map((x) => x.username ? `@${x.username}` : x.name)} empty="Nenhuma conta profissional vinculada às Páginas autorizadas." />
          <AssetList title="Meta Business" items={meta.businesses.map((x) => x.name)} empty="Nenhum Business disponível para este usuário." />
          <AssetList title="Contas de anúncios" items={meta.adAccounts.map((x) => `${x.name}${x.currency ? ` · ${x.currency}` : ""}`)} empty="Nenhuma conta de anúncios disponível." />
        </div>
        {!!meta.errors.length && <div className="mt-4 rounded-xl border border-warn/20 bg-warn/5 p-3 text-xs text-muted-foreground">Alguns ativos não puderam ser lidos: {meta.errors.join(" · ")}</div>}
      </Panel>}

      <GoogleAdsConnectCard />

      <Panel title="Conexão segura e automática" className="mt-4">
        <div className="grid gap-3 md:grid-cols-3 text-sm">
          <div className="rounded-lg border p-3"><ShieldCheck className="mb-2 h-5 w-5 text-primary" /><b>1. Você autoriza</b><p className="mt-1 text-muted-foreground">Ao clicar em Conectar Meta, o login oficial da Meta é aberto para você escolher e autorizar os ativos.</p></div>
          <div className="rounded-lg border p-3"><RefreshCw className="mb-2 h-5 w-5 text-primary" /><b>2. O BI descobre os ativos</b><p className="mt-1 text-muted-foreground">Páginas, Instagram profissional, Business Managers e contas de anúncios disponíveis são identificados automaticamente.</p></div>
          <div className="rounded-lg border p-3"><CheckCircle2 className="mb-2 h-5 w-5 text-primary" /><b>3. Sincronizar agora</b><p className="mt-1 text-muted-foreground">O botão atualiza a lista de ativos sem expor App Secret ou token no navegador.</p></div>
        </div>
      </Panel>

      <SetupModal id={setupId} onClose={() => setSetupId(null)} />
      <MetricModal open={metricOpen} onClose={() => setMetricOpen(false)} />
    </>
  );
}

function AssetList({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return <div className="rounded-xl border border-white/7 p-4">
    <div className="mb-3 text-xs font-black uppercase tracking-[.12em] text-muted-foreground">{title}</div>
    {items.length ? <div className="flex flex-wrap gap-2">{items.map((x, i) => <Badge key={`${x}-${i}`} tone="success">{x}</Badge>)}</div> : <div className="text-sm text-muted-foreground">{empty}</div>}
  </div>;
}

function SetupModal({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { s, set } = useApp();
  const c = s.conexoesSociais.find((x) => x.id === id);
  const [conta, setConta] = useState(c?.conta || "");
  if (!c) return null;

  return <Modal open={!!id} onClose={onClose} title={`Configurar ${c.plataforma}`}>
    <div className="space-y-3">
      <Field label="Conta / página / canal"><input className={inputCls} placeholder="@conta ou nome da página" value={conta} onChange={(e) => setConta(e.target.value)} /></Field>
      <div className="rounded-md bg-muted p-3 text-xs leading-relaxed text-muted-foreground">
        API prevista: <b>{API_INFO[c.plataforma].api}</b>. Esta integração ainda depende do OAuth oficial da própria plataforma.
      </div>
      <Btn className="w-full" onClick={() => {
        set((st) => ({ ...st, conexoesSociais: st.conexoesSociais.map((x) => x.id === c.id ? { ...x, conta, status: "Pendente", observacao: `${x.observacao} · OAuth pendente` } : x) }));
        onClose();
      }}><Clock3 className="h-4 w-4" />Salvar como pendente</Btn>
    </div>
  </Modal>;
}

function MetricModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { s, set } = useApp();
  const [f, setF] = useState<Omit<SocialMetric,"id">>({
    plataforma: "Instagram", competencia: new Date().toISOString().slice(0,7), filialId: "fCD",
    seguidores: 0, alcance: 0, impressoes: 0, engajamentos: 0, cliques: 0, visualizacoesVideo: 0, posts: 0,
  });

  const salvar = () => {
    const novo: SocialMetric = { id: uid(), ...f };
    set((st) => ({ ...st, metricasSociais: [...st.metricasSociais, novo] }));
    onClose();
  };

  return <Modal open={open} onClose={onClose} title="Importar métricas manualmente" wide>
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-3">
        <Field label="Plataforma"><select className={inputCls} value={f.plataforma} onChange={(e)=>setF({...f,plataforma:e.target.value as SocialPlatform})}>{s.conexoesSociais.map((x)=><option key={x.id}>{x.plataforma}</option>)}</select></Field>
        <Field label="Competência"><input type="month" className={inputCls} value={f.competencia} onChange={(e)=>setF({...f,competencia:e.target.value})} /></Field>
        <Field label="Filial / Rede"><select className={inputCls} value={f.filialId} onChange={(e)=>setF({...f,filialId:e.target.value})}>{s.filiais.map((x)=><option key={x.id} value={x.id}>{x.codigo} — {x.nome}</option>)}</select></Field>
      </div>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {[
          ["Seguidores","seguidores"],["Alcance","alcance"],["Impressões","impressoes"],["Engajamentos","engajamentos"],
          ["Cliques","cliques"],["Views de vídeo","visualizacoesVideo"],["Posts","posts"],
        ].map(([label,key]) => <Field key={key} label={label}><input type="number" className={inputCls} value={(f as any)[key]} onChange={(e)=>setF({...f,[key]:Number(e.target.value)})} /></Field>)}
      </div>
      <Btn className="w-full" onClick={salvar}>Salvar métricas</Btn>
    </div>
  </Modal>;
}