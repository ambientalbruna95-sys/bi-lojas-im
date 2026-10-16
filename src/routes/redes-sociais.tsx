import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BarChart3, ExternalLink, Plug, Share2 } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useApp, num, type SocialMetric } from "@/lib/store";
import { Badge, Field, PageHeader, Panel, Stat, inputCls, pageHead } from "@/components/kit";

export const Route = createFileRoute("/redes-sociais")({
  head: pageHead("Redes Sociais", "Desempenho orgânico de Facebook, Instagram, TikTok, LinkedIn e YouTube."),
  component: Page,
});

const PLATAFORMAS: SocialMetric["plataforma"][] = ["Facebook", "Instagram", "TikTok", "LinkedIn", "YouTube"];

function Page() {
  const { s } = useApp();
  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7));

  const dados = useMemo(() => s.metricasSociais.filter((x) => x.competencia === mes), [s.metricasSociais, mes]);
  const alcance = dados.reduce((a, x) => a + x.alcance, 0);
  const impressoes = dados.reduce((a, x) => a + x.impressoes, 0);
  const engajamentos = dados.reduce((a, x) => a + x.engajamentos, 0);
  const cliques = dados.reduce((a, x) => a + x.cliques, 0);
  const views = dados.reduce((a, x) => a + x.visualizacoesVideo, 0);
  const posts = dados.reduce((a, x) => a + x.posts, 0);

  const porPlataforma = PLATAFORMAS.map((p) => {
    const arr = dados.filter((x) => x.plataforma === p);
    return {
      plataforma: p,
      alcance: arr.reduce((a, x) => a + x.alcance, 0),
      engajamentos: arr.reduce((a, x) => a + x.engajamentos, 0),
      posts: arr.reduce((a, x) => a + x.posts, 0),
      seguidores: arr.reduce((a, x) => a + x.seguidores, 0),
    };
  }).filter((x) => x.alcance || x.engajamentos || x.posts || x.seguidores);

  const conexoes = s.conexoesSociais.filter((x) => x.status === "Conectado").length;

  return (
    <>
      <PageHeader
        title="Redes Sociais"
        sub="Desempenho orgânico por plataforma e filial. Os números só aparecem quando houver dados importados ou sincronizados."
        action={<Link to="/integracoes" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.035] px-3.5 py-2.5 text-sm font-bold hover:border-primary/35"><Plug className="h-4 w-4" />APIs / Integrações</Link>}
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Field label="Competência"><input type="month" className={inputCls} value={mes} onChange={(e) => setMes(e.target.value)} /></Field>
        <div className="text-xs text-muted-foreground">{conexoes} conexão(ões) ativa(s) · {dados.length} registro(s) nesta competência</div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Stat accent label="Alcance" value={num(alcance)} hint="orgânico" />
        <Stat label="Impressões" value={num(impressoes)} />
        <Stat label="Engajamentos" value={num(engajamentos)} />
        <Stat label="Cliques" value={num(cliques)} />
        <Stat label="Views de vídeo" value={num(views)} />
        <Stat label="Posts" value={num(posts)} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        <Panel title="Alcance por plataforma" className="lg:col-span-2">
          <div className="h-72">
            {porPlataforma.length ? <ResponsiveContainer><BarChart data={porPlataforma}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="plataforma" fontSize={11} /><YAxis fontSize={11} /><Tooltip formatter={(v: number) => num(v)} /><Bar dataKey="alcance" fill="var(--primary)" radius={[4,4,0,0]} /></BarChart></ResponsiveContainer> : <Empty />}
          </div>
        </Panel>
        <Panel title="Status das plataformas">
          <div className="space-y-2">
            {s.conexoesSociais.map((x) => <div key={x.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/7 p-3"><div><div className="font-bold">{x.plataforma}</div><div className="text-xs text-muted-foreground">{x.conta || "conta não vinculada"}</div></div><Badge tone={x.status === "Conectado" ? "success" : x.status === "Pendente" ? "warn" : x.status === "Erro" ? "primary" : "muted"}>{x.status}</Badge></div>)}
          </div>
        </Panel>
      </div>

      <Panel title="Resumo por plataforma" className="mt-4">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[780px] text-sm">
            <thead><tr className="border-b text-left text-xs uppercase text-muted-foreground"><th className="pb-2">Plataforma</th><th>Seguidores</th><th>Posts</th><th>Alcance</th><th>Engajamentos</th></tr></thead>
            <tbody>{porPlataforma.map((x) => <tr key={x.plataforma} className="border-b last:border-0"><td className="py-2"><Badge>{x.plataforma}</Badge></td><td>{num(x.seguidores)}</td><td>{num(x.posts)}</td><td>{num(x.alcance)}</td><td>{num(x.engajamentos)}</td></tr>)}</tbody>
          </table>
        </div>
        {!porPlataforma.length && <div className="py-8 text-center text-sm text-muted-foreground">Ainda não há métricas orgânicas para esta competência.</div>}
      </Panel>

      <Panel title="Detalhamento por filial / conta" className="mt-4">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-sm">
            <thead><tr className="border-b text-left text-xs uppercase text-muted-foreground"><th className="pb-2">Plataforma</th><th>Filial</th><th>Seguidores</th><th>Posts</th><th>Alcance</th><th>Impressões</th><th>Engaj.</th><th>Cliques</th><th>Views vídeo</th></tr></thead>
            <tbody>{dados.map((x) => {
              const filial = s.filiais.find((f) => f.id === x.filialId);
              return <tr key={x.id} className="border-b last:border-0"><td className="py-2"><Badge>{x.plataforma}</Badge></td><td><b>{filial?.codigo}</b> · {filial?.nome || "Rede"}</td><td>{num(x.seguidores)}</td><td>{num(x.posts)}</td><td>{num(x.alcance)}</td><td>{num(x.impressoes)}</td><td>{num(x.engajamentos)}</td><td>{num(x.cliques)}</td><td>{num(x.visualizacoesVideo)}</td></tr>;
            })}</tbody>
          </table>
        </div>
        {!dados.length && <Empty />}
      </Panel>
    </>
  );
}

function Empty() {
  return <div className="grid h-full min-h-40 place-items-center text-center text-sm text-muted-foreground"><div><Share2 className="mx-auto mb-2 h-8 w-8 opacity-40" /><div className="font-semibold text-foreground">Sem dados nesta competência</div><div className="mt-1">Conecte as APIs ou importe as métricas para preencher esta visão.</div></div></div>;
}