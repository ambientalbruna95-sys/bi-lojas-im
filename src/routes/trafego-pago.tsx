import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, BarChart3, CheckCircle2, Facebook, Plus, RefreshCw, Search, Upload, TrendingUp, MousePointerClick, Eye, CircleDollarSign, PlugZap } from "lucide-react";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useApp, brl, num, uid, type TrafegoPago } from "@/lib/store";
import { PageHeader, Panel, Stat, Btn, Modal, Field, inputCls, Badge, pageHead } from "@/components/kit";

export const Route = createFileRoute("/trafego-pago")({
  head: pageHead("Tráfego Pago", "Relatórios mensais de mídia paga das Lojas IM."),
  component: Page,
});

const PLATAFORMAS: TrafegoPago["plataforma"][] = ["Meta Ads", "Google Ads", "TikTok Ads", "YouTube Ads"];

type GoogleAdsMetricRow = {
  customerId: string;
  customerName: string;
  currency: string;
  campaignId: string;
  campaignName: string;
  channelType: string;
  cost: number;
  impressions: number;
  clicks: number;
  conversions: number;
  conversionValue: number;
};

type GoogleAdsMetricsResponse = {
  ok?: boolean;
  connected?: boolean;
  configured?: boolean;
  rows?: GoogleAdsMetricRow[];
  totals?: {
    cost: number;
    impressions: number;
    clicks: number;
    conversions: number;
    conversionValue: number;
  };
  conversionTrackingDetected?: boolean;
  errors?: Array<{ account?: string; message: string }>;
  fetchedAt?: string;
};

type MetaAdsMetricRow = {
  accountId: string;
  accountName: string;
  currency: string;
  campaignId: string;
  campaignName: string;
  spend: number;
  reach: number;
  impressions: number;
  clicks: number;
  results: number;
  resultType: string;
  conversionValue: number;
};

type MetaAdsMetricsResponse = {
  ok?: boolean;
  connected?: boolean;
  configured?: boolean;
  rows?: MetaAdsMetricRow[];
  totals?: {
    spend: number;
    reach: number;
    impressions: number;
    clicks: number;
    results: number;
    conversionValue: number;
  };
  resultTrackingDetected?: boolean;
  valueTrackingDetected?: boolean;
  errors?: string[];
  fetchedAt?: string;
};

type TrafegoTab = "geral" | "meta" | "google";

function Page() {
  const { s, set } = useApp();
  const mesAtual = new Date().toISOString().slice(0, 7);
  const [mes, setMes] = useState(mesAtual);
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<TrafegoTab>("geral");
  const [busca, setBusca] = useState("");
  const [googleRows, setGoogleRows] = useState<GoogleAdsMetricRow[]>([]);
  const [googleSync, setGoogleSync] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [googleInfo, setGoogleInfo] = useState<GoogleAdsMetricsResponse>({});
  const [metaRows, setMetaRows] = useState<MetaAdsMetricRow[]>([]);
  const [metaSync, setMetaSync] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [metaInfo, setMetaInfo] = useState<MetaAdsMetricsResponse>({});

  const syncGoogleAds = async (silent = false) => {
    setGoogleSync("loading");
    try {
      const res = await fetch(`/api/google-ads/metrics?month=${encodeURIComponent(mes)}`, { credentials: "include", cache: "no-store" });
      const data = await res.json() as GoogleAdsMetricsResponse;
      if (!res.ok || !data.ok) {
        setGoogleRows([]);
        setGoogleInfo(data);
        setGoogleSync("error");
        if (!silent) console.warn("Google Ads metrics:", data.errors);
        return;
      }
      setGoogleRows(data.rows || []);
      setGoogleInfo(data);
      setGoogleSync("ok");
    } catch (error) {
      setGoogleRows([]);
      setGoogleInfo({ errors: [{ message: error instanceof Error ? error.message : "Falha ao consultar Google Ads." }] });
      setGoogleSync("error");
    }
  };

  const syncMetaAds = async (silent = false) => {
    setMetaSync("loading");
    try {
      const res = await fetch(`/api/meta/ads-metrics?month=${encodeURIComponent(mes)}`, { credentials: "include", cache: "no-store" });
      const data = await res.json() as MetaAdsMetricsResponse;
      if (!res.ok || !data.ok) {
        setMetaRows([]);
        setMetaInfo(data);
        setMetaSync("error");
        if (!silent) console.warn("Meta Ads metrics:", data.errors);
        return;
      }
      setMetaRows(data.rows || []);
      setMetaInfo(data);
      setMetaSync("ok");
    } catch (error) {
      setMetaRows([]);
      setMetaInfo({ errors: [error instanceof Error ? error.message : "Falha ao consultar Meta Ads."] });
      setMetaSync("error");
    }
  };

  useEffect(() => {
    void syncGoogleAds(true);
    void syncMetaAds(true);
  }, [mes]);

  const dadosManuais = useMemo(() => s.trafegoPago.filter((x) => x.competencia === mes), [s.trafegoPago, mes]);
  const dadosGoogle = useMemo<TrafegoPago[]>(() => googleRows.map((x) => ({
    id: `google-${x.customerId}-${x.campaignId}`,
    competencia: mes,
    plataforma: "Google Ads",
    filialId: "",
    campanha: x.campaignName,
    objetivo: x.channelType.replaceAll("_", " "),
    investimento: x.cost,
    alcance: 0,
    impressoes: x.impressions,
    cliques: x.clicks,
    resultados: x.conversions,
    receitaAtribuida: x.conversionValue,
    observacao: `Google Ads API · conta ${x.customerName || x.customerId} · ${x.currency}`,
  })), [googleRows, mes]);

  const dadosMeta = useMemo<TrafegoPago[]>(() => metaRows.map((x) => ({
    id: `meta-${x.accountId}-${x.campaignId}`,
    competencia: mes,
    plataforma: "Meta Ads",
    filialId: "",
    campanha: x.campaignName,
    objetivo: x.resultType ? x.resultType.replaceAll("_", " ") : "Meta Ads",
    investimento: x.spend,
    alcance: x.reach,
    impressoes: x.impressions,
    cliques: x.clicks,
    resultados: x.results,
    receitaAtribuida: x.conversionValue,
    observacao: `Meta Business API · conta ${x.accountName || x.accountId} · ${x.currency}`,
  })), [metaRows, mes]);

  const dados = useMemo(() => {
    let base = dadosManuais;
    if (googleSync === "ok") base = base.filter((x) => x.plataforma !== "Google Ads");
    if (metaSync === "ok") base = base.filter((x) => x.plataforma !== "Meta Ads");
    return [
      ...base,
      ...(googleSync === "ok" ? dadosGoogle : []),
      ...(metaSync === "ok" ? dadosMeta : []),
    ];
  }, [dadosManuais, dadosGoogle, dadosMeta, googleSync, metaSync]);

  const dadosDaAba = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const filtrados = tab === "google"
      ? dados.filter((x) => x.plataforma === "Google Ads")
      : tab === "meta"
        ? dados.filter((x) => x.plataforma === "Meta Ads")
        : dados;

    if (!termo) return filtrados;
    return filtrados.filter((x) =>
      [x.campanha, x.objetivo, x.observacao, x.plataforma]
        .join(" ")
        .toLowerCase()
        .includes(termo),
    );
  }, [dados, tab, busca]);
  const investimento = dadosDaAba.reduce((a,x) => a + x.investimento, 0);
  const alcance = dadosDaAba.reduce((a,x) => a + x.alcance, 0);
  const impressoes = dadosDaAba.reduce((a,x) => a + x.impressoes, 0);
  const cliques = dadosDaAba.reduce((a,x) => a + x.cliques, 0);
  const resultados = dadosDaAba.reduce((a,x) => a + x.resultados, 0);
  const receita = dadosDaAba.reduce((a,x) => a + x.receitaAtribuida, 0);
  const ctr = impressoes ? (cliques / impressoes) * 100 : 0;
  const cpc = cliques ? investimento / cliques : 0;
  const cpm = impressoes ? investimento / impressoes * 1000 : 0;
  const cpr = resultados ? investimento / resultados : 0;
  const roas = investimento ? receita / investimento : 0;

  const porPlataforma = PLATAFORMAS.map((p) => {
    const arr = dadosDaAba.filter((x) => x.plataforma === p);
    return {
      plataforma: p,
      investimento: arr.reduce((a,x) => a+x.investimento,0),
      resultados: arr.reduce((a,x) => a+x.resultados,0),
      cliques: arr.reduce((a,x) => a+x.cliques,0),
    };
  }).filter((x) => x.investimento || x.resultados || x.cliques);

  const historico = useMemo(() => {
    const meses = [...new Set(s.trafegoPago.map((x) => x.competencia))].sort();
    return meses.map((m) => {
      const arr = s.trafegoPago.filter((x) => x.competencia === m);
      return {
        mes: m.slice(5) + "/" + m.slice(2,4),
        investimento: arr.reduce((a,x) => a+x.investimento,0),
        resultados: arr.reduce((a,x) => a+x.resultados,0),
      };
    });
  }, [s.trafegoPago]);

  return (
    <>
      <PageHeader
        title="Tráfego Pago"
        sub="Relatório mensal de Meta Ads, Google Ads, TikTok Ads e YouTube Ads"
        action={<div className="flex flex-wrap gap-2">
          {googleSync === "ok"
            ? <Btn variant="outline" onClick={() => void syncGoogleAds(false)} disabled={(googleSync as string) === "loading"}><RefreshCw className={`h-4 w-4 ${(googleSync as string) === "loading" ? "animate-spin" : ""}`} />Sincronizar Google Ads</Btn>
            : <Btn variant="outline" onClick={() => { window.location.href = "/api/google-ads/connect"; }}><PlugZap className="h-4 w-4" />Conectar Google Ads</Btn>}
          <Btn variant="outline"><Upload className="h-4 w-4" />Importar planilha</Btn>
          <Btn onClick={() => setOpen(true)}><Plus className="h-4 w-4" />Adicionar campanha</Btn>
        </div>}
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Field label="Competência"><input type="month" className={inputCls} value={mes} onChange={(e) => setMes(e.target.value)} /></Field>
        <div className="min-w-[220px] flex-1">
          <Field label="Buscar campanha"><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><input className={`${inputCls} pl-9`} placeholder="Nome, objetivo ou conta..." value={busca} onChange={(e)=>setBusca(e.target.value)} /></div></Field>
        </div>
      </div>

      <div className="mb-4 grid gap-2 rounded-2xl border border-white/8 bg-white/[.02] p-2 sm:grid-cols-3">
        <button type="button" onClick={()=>setTab("geral")} className={`flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-black transition ${tab==="geral" ? "bg-primary text-primary-foreground shadow-brand" : "text-muted-foreground hover:bg-white/[.04] hover:text-foreground"}`}><BarChart3 className="h-4 w-4"/>Visão Geral</button>
        <button type="button" onClick={()=>setTab("meta")} className={`flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-black transition ${tab==="meta" ? "bg-primary text-primary-foreground shadow-brand" : "text-muted-foreground hover:bg-white/[.04] hover:text-foreground"}`}><Facebook className="h-4 w-4"/>Meta Business</button>
        <button type="button" onClick={()=>setTab("google")} className={`flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-black transition ${tab==="google" ? "bg-primary text-primary-foreground shadow-brand" : "text-muted-foreground hover:bg-white/[.04] hover:text-foreground"}`}><Search className="h-4 w-4"/>Google Ads</button>
      </div>

      {(tab === "geral" || tab === "google") && <>
        {googleSync === "loading" && <div className="mb-4 rounded-xl border border-white/8 bg-white/[.02] p-3 text-sm text-muted-foreground">
                <RefreshCw className="mr-2 inline h-4 w-4 animate-spin text-primary" />Buscando investimento e resultados do Google Ads para {mes}...
              </div>}
        
              {googleSync === "ok" && <div className="mb-4 rounded-xl border border-success/20 bg-success/[.04] p-3 text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-success" />
                  <b>Google Ads sincronizado</b>
                  <Badge tone="success">{googleRows.length} campanha(s)</Badge>
                  {googleInfo.fetchedAt && <span className="text-xs text-muted-foreground">Atualizado {new Date(googleInfo.fetchedAt).toLocaleString("pt-BR")}</span>}
                </div>
                {!googleInfo.conversionTrackingDetected && (googleInfo.totals?.cost || 0) > 0 && <div className="mt-2 text-xs text-warn">
                  <AlertTriangle className="mr-1 inline h-3.5 w-3.5" />
                  O Google trouxe investimento, impressões e cliques, mas não encontrou conversões/valor de conversão neste período. Para mostrar resultado e ROAS reais, o acompanhamento de conversões precisa estar configurado no Google Ads.
                </div>}
                {!!googleInfo.errors?.length && <div className="mt-2 text-xs text-muted-foreground">
                  Algumas contas não puderam ser consultadas: {googleInfo.errors.map((x) => x.account ? `${x.account}: ${x.message}` : x.message).join(" · ")}
                </div>}
              </div>}
        
              {googleSync === "error" && <div className="mb-4 rounded-xl border border-warn/20 bg-warn/[.04] p-3 text-sm">
                <div className="font-bold text-warn">Google Ads conectado, mas as métricas ainda não puderam ser lidas.</div>
                <div className="mt-1 text-xs text-muted-foreground">{googleInfo.errors?.map((x) => x.message).join(" · ") || "Verifique o nível de acesso da Google Ads API no projeto do Google Cloud."}</div>
                <Btn className="mt-3" variant="outline" onClick={() => void syncGoogleAds(false)}><RefreshCw className="h-4 w-4" />Tentar novamente</Btn>
              </div>}
      </>}

      {(tab === "geral" || tab === "meta") && <>
        {metaSync === "loading" && <div className="mb-4 rounded-xl border border-white/8 bg-white/[.02] p-3 text-sm text-muted-foreground">
          <RefreshCw className="mr-2 inline h-4 w-4 animate-spin text-primary" />Buscando investimento e resultados do Meta Business para {mes}...
        </div>}

        {metaSync === "ok" && <div className="mb-4 rounded-xl border border-success/20 bg-success/[.04] p-3 text-sm">
          <div className="flex flex-wrap items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <b>Meta Business sincronizado</b>
            <Badge tone="success">{metaRows.length} campanha(s)</Badge>
            {metaInfo.fetchedAt && <span className="text-xs text-muted-foreground">Atualizado {new Date(metaInfo.fetchedAt).toLocaleString("pt-BR")}</span>}
          </div>
          {!metaInfo.resultTrackingDetected && (metaInfo.totals?.spend || 0) > 0 && <div className="mt-2 text-xs text-warn">
            <AlertTriangle className="mr-1 inline h-3.5 w-3.5" />
            A Meta trouxe investimento, alcance, impressões e cliques, mas não encontrou uma ação de resultado rastreável entre compra, lead, conversa, cadastro ou contato neste período.
          </div>}
          {!!metaInfo.errors?.length && <div className="mt-2 text-xs text-muted-foreground">Algumas contas não puderam ser consultadas: {metaInfo.errors.join(" · ")}</div>}
        </div>}

        {metaSync === "error" && <div className="mb-4 rounded-xl border border-warn/20 bg-warn/[.04] p-3 text-sm">
          <div className="font-bold text-warn">Meta Business ainda não conseguiu carregar as métricas de mídia paga.</div>
          <div className="mt-1 text-xs text-muted-foreground">{metaInfo.errors?.join(" · ") || "Reconecte a Meta concedendo acesso às contas de anúncio."}</div>
          <div className="mt-3 flex flex-wrap gap-2">
            <Btn variant="outline" onClick={() => void syncMetaAds(false)}><RefreshCw className="h-4 w-4"/>Tentar novamente</Btn>
            <Btn variant="outline" onClick={() => { window.location.href="/api/meta/connect"; }}><PlugZap className="h-4 w-4"/>Reconectar Meta</Btn>
          </div>
        </div>}
      </>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat accent label="Investimento" value={brl(investimento)} hint={tab==="google" ? "Google Ads" : tab==="meta" ? "Meta Business" : "todas as fontes"} />
        <Stat label="Impressões" value={num(impressoes)} hint={alcance ? `${num(alcance)} de alcance` : "alcance não informado"} />
        <Stat label="Cliques" value={num(cliques)} hint={`CTR ${ctr.toFixed(2)}%`} />
        <Stat label="Resultados" value={num(resultados)} hint={`Custo/result. ${brl(cpr)}`} />
        <Stat label="ROAS rastreável" value={roas ? `${roas.toFixed(2)}x` : "—"} hint={receita ? brl(receita) + " atribuídos" : "sem receita atribuída"} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel title="Eficiência do mês" className="lg:col-span-1">
          <div className="grid grid-cols-2 gap-3">
            <Mini icon={MousePointerClick} label="CPC" value={brl(cpc)} />
            <Mini icon={Eye} label="CPM" value={brl(cpm)} />
            <Mini icon={TrendingUp} label="CTR" value={ctr.toFixed(2) + "%"} />
            <Mini icon={CircleDollarSign} label="Custo/resultado" value={brl(cpr)} />
          </div>
          <div className="mt-4 rounded-md bg-muted p-3 text-xs text-muted-foreground">
            Receita atribuída e ROAS só entram quando houver rastreamento direto. Vendas gerais da loja ficam separadas como impacto/correlação.
          </div>
        </Panel>

        <Panel title={tab==="geral" ? "Investimento por plataforma" : tab==="google" ? "Investimento Google Ads" : "Investimento Meta Business"} className="lg:col-span-2">
          <div className="h-64"><ResponsiveContainer><BarChart data={porPlataforma}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="plataforma" fontSize={11} /><YAxis fontSize={11} tickFormatter={(v) => `${Math.round(v/1000)}k`} /><Tooltip formatter={(v: number) => brl(v)} /><Bar dataKey="investimento" fill="var(--primary)" radius={[4,4,0,0]} /></BarChart></ResponsiveContainer></div>
        </Panel>
      </div>

      <Panel title={tab==="geral" ? "Campanhas do relatório mensal" : tab==="google" ? "Campanhas · Google Ads" : "Campanhas · Meta Business"} className="mt-4">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1050px] text-sm">
            <thead><tr className="border-b text-left text-xs uppercase text-muted-foreground"><th className="pb-2">Plataforma</th><th>Campanha</th><th>Objetivo</th><th>Filial</th><th>Investimento</th><th>Impressões</th><th>Cliques</th><th>CTR</th><th>Resultados</th><th>Custo/result.</th></tr></thead>
            <tbody>{dadosDaAba.map((x) => {
              const filial = s.filiais.find((f) => f.id === x.filialId);
              const xctr = x.impressoes ? x.cliques / x.impressoes * 100 : 0;
              const xcpr = x.resultados ? x.investimento / x.resultados : 0;
              return <tr key={x.id} className="border-b last:border-0">
                <td className="py-2"><Badge>{x.plataforma}</Badge></td><td><b>{x.campanha}</b></td><td>{x.objetivo}</td><td>{filial?.nome ?? "Rede"}</td><td>{brl(x.investimento)}</td><td>{num(x.impressoes)}</td><td>{num(x.cliques)}</td><td>{xctr.toFixed(2)}%</td><td>{num(x.resultados)}</td><td>{brl(xcpr)}</td>
              </tr>;
            })}</tbody>
          </table>
          {!dadosDaAba.length && <div className="py-8 text-center text-sm text-muted-foreground">{googleSync === "loading" || metaSync === "loading" ? "Consultando plataformas..." : "Nenhuma campanha encontrada para esta aba e competência."}</div>}
        </div>
      </Panel>

      {tab !== "geral" && <Panel title="Origem dos dados" className="mt-4">
        <div className="grid gap-3 md:grid-cols-3 text-sm">
          <div className="rounded-xl border border-white/8 p-3"><div className="text-xs font-black uppercase tracking-[.1em] text-muted-foreground">Fonte</div><div className="mt-1 font-bold">{tab==="google" ? "Google Ads API" : "Meta Marketing API"}</div></div>
          <div className="rounded-xl border border-white/8 p-3"><div className="text-xs font-black uppercase tracking-[.1em] text-muted-foreground">Resultado</div><div className="mt-1 text-sm text-muted-foreground">{tab==="google" ? "Conversões configuradas na conta do Google Ads." : "Ação principal rastreável da campanha: compra, lead, conversa, cadastro ou contato."}</div></div>
          <div className="rounded-xl border border-white/8 p-3"><div className="text-xs font-black uppercase tracking-[.1em] text-muted-foreground">ROAS</div><div className="mt-1 text-sm text-muted-foreground">Só aparece quando a plataforma devolve valor de conversão. Faturamento geral das lojas não é tratado como venda atribuída ao anúncio.</div></div>
        </div>
      </Panel>}

      <Panel title="Evolução mensal" className="mt-4">
        <div className="h-72"><ResponsiveContainer><AreaChart data={historico}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="mes" fontSize={11} /><YAxis fontSize={11} /><Tooltip /><Area dataKey="investimento" name="Investimento" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.12} strokeWidth={2} /><Area dataKey="resultados" name="Resultados" stroke="var(--foreground)" fill="var(--foreground)" fillOpacity={0.04} strokeWidth={2} /></AreaChart></ResponsiveContainer></div>
      </Panel>

      <TrafegoModal open={open} onClose={() => setOpen(false)} mes={mes} />
    </>
  );
}

function Mini({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return <div className="rounded-md border p-3"><Icon className="mb-2 h-4 w-4 text-primary" /><div className="text-xs text-muted-foreground">{label}</div><div className="font-display text-lg font-bold">{value}</div></div>;
}

function TrafegoModal({ open, onClose, mes }: { open: boolean; onClose: () => void; mes: string }) {
  const { s, set } = useApp();
  const [f, setF] = useState<Omit<TrafegoPago,"id">>({
    competencia: mes, plataforma: "Meta Ads", filialId: "fCD", campanha: "", objetivo: "", investimento: 0,
    alcance: 0, impressoes: 0, cliques: 0, resultados: 0, receitaAtribuida: 0, observacao: "",
  });

  const salvar = () => {
    if (!f.campanha.trim()) return;
    const item: TrafegoPago = { id: uid(), ...f };
    set((st) => ({ ...st, trafegoPago: [...st.trafegoPago, item], custos: [...st.custos, {
      id: uid(), categoria: f.plataforma, descricao: f.campanha, valor: f.investimento, filialId: f.filialId, data: f.competencia + "-01",
    }] }));
    onClose();
  };

  return <Modal open={open} onClose={onClose} title="Adicionar campanha de tráfego" wide>
    <div className="space-y-3">
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Competência"><input type="month" className={inputCls} value={f.competencia} onChange={(e) => setF({...f,competencia:e.target.value})} /></Field>
        <Field label="Plataforma"><select className={inputCls} value={f.plataforma} onChange={(e) => setF({...f,plataforma:e.target.value as TrafegoPago["plataforma"]})}>{PLATAFORMAS.map((p)=><option key={p}>{p}</option>)}</select></Field>
      </div>
      <Field label="Campanha"><input className={inputCls} value={f.campanha} onChange={(e)=>setF({...f,campanha:e.target.value})} /></Field>
      <Field label="Objetivo"><input className={inputCls} placeholder="Ex.: mensagens, tráfego, reconhecimento, conversões" value={f.objetivo} onChange={(e)=>setF({...f,objetivo:e.target.value})} /></Field>
      <Field label="Filial / Rede"><select className={inputCls} value={f.filialId} onChange={(e)=>setF({...f,filialId:e.target.value})}>{s.filiais.map((x)=><option key={x.id} value={x.id}>{x.codigo} — {x.nome}</option>)}</select></Field>
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <Field label="Investimento"><input type="number" className={inputCls} value={f.investimento} onChange={(e)=>setF({...f,investimento:Number(e.target.value)})} /></Field>
        <Field label="Alcance"><input type="number" className={inputCls} value={f.alcance} onChange={(e)=>setF({...f,alcance:Number(e.target.value)})} /></Field>
        <Field label="Impressões"><input type="number" className={inputCls} value={f.impressoes} onChange={(e)=>setF({...f,impressoes:Number(e.target.value)})} /></Field>
        <Field label="Cliques"><input type="number" className={inputCls} value={f.cliques} onChange={(e)=>setF({...f,cliques:Number(e.target.value)})} /></Field>
        <Field label="Resultados"><input type="number" className={inputCls} value={f.resultados} onChange={(e)=>setF({...f,resultados:Number(e.target.value)})} /></Field>
        <Field label="Receita atribuída"><input type="number" className={inputCls} value={f.receitaAtribuida} onChange={(e)=>setF({...f,receitaAtribuida:Number(e.target.value)})} /></Field>
      </div>
      <Field label="Observação / análise do mês"><textarea rows={3} className={inputCls} value={f.observacao} onChange={(e)=>setF({...f,observacao:e.target.value})} /></Field>
      <Btn className="w-full" onClick={salvar}>Salvar e atualizar relatório</Btn>
    </div>
  </Modal>;
}