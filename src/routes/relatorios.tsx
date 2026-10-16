import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useApp, brl, num, mediaNotas } from "@/lib/store";
import { PageHeader, Panel, Stat, Field, inputCls, Badge, pageHead } from "@/components/kit";

export const Route = createFileRoute("/relatorios")({
  head: pageHead("Relatórios", "Relatório consolidado de redes sociais, vendas, equipe, influencers e mídia paga."),
  component: Page,
});

function Page() {
  const { s } = useApp();
  const [mes, setMes] = useState(new Date().toISOString().slice(0,7));

  const sociais = useMemo(() => s.metricasSociais.filter((x) => x.competencia === mes), [s.metricasSociais, mes]);
  const trafego = useMemo(() => s.trafegoPago.filter((x) => x.competencia === mes), [s.trafegoPago, mes]);
  const avaliacoes = useMemo(() => s.avaliacoes.filter((x) => x.mes === mes), [s.avaliacoes, mes]);
  const vendasMes = useMemo(() => s.vendas.filter((x) => x.data.startsWith(mes)), [s.vendas, mes]);

  const alcance = sociais.reduce((a,x)=>a+x.alcance,0);
  const impressoes = sociais.reduce((a,x)=>a+x.impressoes,0);
  const eng = sociais.reduce((a,x)=>a+x.engajamentos,0);
  const cliques = sociais.reduce((a,x)=>a+x.cliques,0);
  const posts = sociais.reduce((a,x)=>a+x.posts,0);

  const investTrafego = trafego.reduce((a,x)=>a+x.investimento,0);
  const receitaTrafego = trafego.reduce((a,x)=>a+x.receitaAtribuida,0);
  const vendas = vendasMes.reduce((a,x)=>a+x.valor,0);

  const investimentoInflu = s.influencers.reduce((a,i)=>a+i.vinculos.reduce((b,v)=>b+v.valor,0),0);
  const receitaInflu = s.influencers.reduce((a,i)=>a+i.posts.filter((p)=>p.data.startsWith(mes)).reduce((b,p)=>b+(p.receitaAtribuida||0),0),0);

  const notas = avaliacoes.map((a)=>(mediaNotas(a.gerais)+mediaNotas(a.funcao))/2);
  const mediaEquipe = notas.length ? notas.reduce((a,b)=>a+b,0)/notas.length : 0;

  const socialChart = s.conexoesSociais.map((c) => {
    const arr = sociais.filter((x)=>x.plataforma===c.plataforma);
    return { plataforma:c.plataforma, alcance:arr.reduce((a,x)=>a+x.alcance,0), engajamentos:arr.reduce((a,x)=>a+x.engajamentos,0) };
  }).filter((x)=>x.alcance||x.engajamentos);

  return (
    <>
      <PageHeader title="Relatórios" sub="Visão mensal consolidada do marketing das Lojas IM" />
      <div className="mb-4 flex items-end gap-3">
        <Field label="Competência"><input type="month" className={inputCls} value={mes} onChange={(e)=>setMes(e.target.value)} /></Field>
        <div className="text-xs text-muted-foreground">Quando as APIs estiverem conectadas, as métricas de redes sociais entram automaticamente aqui.</div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat accent label="Vendas no mês" value={brl(vendas)} hint="base de vendas importada" />
        <Stat label="Alcance social" value={num(alcance)} hint={`${num(impressoes)} impressões`} />
        <Stat label="Engajamentos" value={num(eng)} hint={`${num(cliques)} cliques · ${posts} posts`} />
        <Stat label="Tráfego pago" value={brl(investTrafego)} hint={receitaTrafego ? `${(receitaTrafego/investTrafego).toFixed(2)}x ROAS direto` : "sem receita atribuída"} />
        <Stat label="Equipe" value={mediaEquipe ? mediaEquipe.toFixed(1) : "—"} hint={`${avaliacoes.length} avaliações no mês`} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="Redes sociais">
          <div className="h-72">
            {socialChart.length ? <ResponsiveContainer><BarChart data={socialChart}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="plataforma" fontSize={11} /><YAxis fontSize={11} /><Tooltip formatter={(v:number)=>num(v)} /><Bar dataKey="alcance" fill="var(--primary)" radius={[4,4,0,0]} /><Bar dataKey="engajamentos" fill="var(--foreground)" radius={[4,4,0,0]} /></BarChart></ResponsiveContainer> : <Empty text="Aguardando sincronização das APIs ou importação manual de métricas." />}
          </div>
        </Panel>

        <Panel title="Status das integrações">
          <div className="space-y-2">
            {s.conexoesSociais.map((c) => <div key={c.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
              <div><b>{c.plataforma}</b><div className="text-xs text-muted-foreground">{c.conta || "Conta não configurada"}</div></div>
              <Badge tone={c.status==="Conectado"?"success":c.status==="Pendente"?"warn":c.status==="Erro"?"primary":"muted"}>{c.status}</Badge>
            </div>)}
          </div>
        </Panel>

        <Panel title="Influencers">
          <div className="grid grid-cols-2 gap-3">
            <Box label="Investimento cadastrado" value={brl(investimentoInflu)} />
            <Box label="Receita atribuída no mês" value={brl(receitaInflu)} />
            <Box label="Influencers" value={String(s.influencers.length)} />
            <Box label="Filiais atendidas" value={String(new Set(s.influencers.flatMap((i)=>i.filialIds)).size)} />
          </div>
        </Panel>

        <Panel title="Tráfego pago">
          <div className="space-y-2">
            {trafego.map((t)=><div key={t.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
              <div><b>{t.plataforma}</b><div className="text-xs text-muted-foreground">{t.campanha}</div></div>
              <div className="text-right"><b>{brl(t.investimento)}</b><div className="text-xs text-muted-foreground">{num(t.resultados)} resultados</div></div>
            </div>)}
            {!trafego.length && <Empty text="Nenhuma campanha de tráfego cadastrada neste mês." />}
          </div>
        </Panel>

        <Panel title="Equipe">
          <div className="space-y-2">
            {s.funcionarios.map((f) => {
              const a = avaliacoes.find((x)=>x.funcionarioId===f.id);
              const media = a ? (mediaNotas(a.gerais)+mediaNotas(a.funcao))/2 : 0;
              return <div key={f.id} className="flex items-center justify-between rounded-md border p-3 text-sm"><div><b>{f.nome}</b><div className="text-xs text-muted-foreground">{f.cargo}</div></div><div className="font-display text-xl font-bold">{media ? media.toFixed(1) : "—"}</div></div>;
            })}
          </div>
        </Panel>

        <Panel title="Leitura do relatório">
          <div className="space-y-3 text-sm">
            <div className="rounded-md border p-3"><b>Dados diretos</b><p className="mt-1 text-muted-foreground">Métricas vindas das APIs, vendas importadas, links de influencers e receita atribuída.</p></div>
            <div className="rounded-md border p-3"><b>Dados de correlação</b><p className="mt-1 text-muted-foreground">Crescimento de venda, alcance e presença de marketing sem atribuir automaticamente toda a receita a uma ação.</p></div>
          </div>
        </Panel>
      </div>
    </>
  );
}

function Box({label,value}:{label:string;value:string}) {
  return <div className="rounded-md border p-3"><div className="text-xs text-muted-foreground">{label}</div><div className="font-display text-xl font-bold">{value}</div></div>;
}
function Empty({text}:{text:string}) {
  return <div className="grid min-h-28 place-items-center text-center text-sm text-muted-foreground">{text}</div>;
}