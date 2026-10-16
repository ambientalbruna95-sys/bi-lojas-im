import { createFileRoute, Link } from "@tanstack/react-router";
import { ResponsiveContainer, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Tooltip, BarChart, Bar, CartesianGrid, XAxis, YAxis } from "recharts";
import { useApp, brl, num, CRITERIOS_GERAIS, mediaNotas } from "@/lib/store";
import { PageHeader, Panel, Stat, pageHead } from "@/components/kit";

export const Route = createFileRoute("/resultados")({ head: pageHead("Resultados", "Resultados consolidados das Lojas IM."), component: Page });

function Page() {
  const { s } = useApp();
  const mesAtual = new Date().toISOString().slice(0,7);
  const avaliacoesMes = s.avaliacoes.filter((a) => a.mes === mesAtual);
  const notasEquipe = avaliacoesMes.map((a) => (mediaNotas(a.gerais) + mediaNotas(a.funcao)) / 2);
  const mediaEquipe = notasEquipe.length ? notasEquipe.reduce((a,b)=>a+b,0)/notasEquipe.length : 0;

  const radarEquipe = CRITERIOS_GERAIS.map((criterio) => {
    const vals = avaliacoesMes.map((a) => a.gerais.find((n) => n.criterio === criterio)?.nota).filter((x): x is number => typeof x === "number");
    return { criterio, equipe: vals.length ? vals.reduce((a,b)=>a+b,0)/vals.length : 0 };
  });

  const rankingEquipe = s.funcionarios.map((f) => {
    const a = avaliacoesMes.find((x) => x.funcionarioId === f.id);
    return { nome: f.nome, media: a ? (mediaNotas(a.gerais)+mediaNotas(a.funcao))/2 : 0 };
  });

  const trafego = s.trafegoPago.filter((x) => x.competencia === mesAtual);
  const investimentoTrafego = trafego.reduce((a,x)=>a+x.investimento,0);
  const resultadosTrafego = trafego.reduce((a,x)=>a+x.resultados,0);
  const receitaTrafego = trafego.reduce((a,x)=>a+x.receitaAtribuida,0);
  const vendas = s.vendas.reduce((a,v)=>a+v.valor,0);
  const custos = s.custos.reduce((a,c)=>a+c.valor,0);
  const receitaInflu = s.influencers.reduce((a,i)=>a+i.posts.reduce((b,p)=>b+(p.receitaAtribuida||0),0),0);

  return (
    <>
      <PageHeader title="Resultados" sub="Equipe, mídia paga, influencers, vendas e investimentos em uma visão consolidada" />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat accent label="Vendas" value={brl(vendas)} hint="base importada" />
        <Stat label="Custos de marketing" value={brl(custos)} hint="centro de custos" />
        <Stat label="Tráfego pago" value={brl(investimentoTrafego)} hint={`${num(resultadosTrafego)} resultados`} />
        <Stat label="Receita atribuída" value={brl(receitaTrafego + receitaInflu)} hint="somente rastreável" />
        <Stat label="Equipe" value={mediaEquipe ? mediaEquipe.toFixed(1) : "—"} hint="média da avaliação mensal" />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="Desempenho consolidado da equipe" action={<Link to="/avaliacoes" className="text-xs font-semibold text-primary">Detalhar avaliações</Link>}>
          {avaliacoesMes.length ? <div className="h-80"><ResponsiveContainer><RadarChart data={radarEquipe} outerRadius="72%"><PolarGrid /><PolarAngleAxis dataKey="criterio" fontSize={11} /><PolarRadiusAxis domain={[0,5]} tickCount={6} fontSize={10} /><Radar name="Equipe" dataKey="equipe" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.18} strokeWidth={2} /><Tooltip /></RadarChart></ResponsiveContainer></div> : <div className="grid h-80 place-items-center text-center text-sm text-muted-foreground">O gráfico será preenchido após as avaliações mensais.</div>}
        </Panel>

        <Panel title="Nota individual da equipe">
          <div className="h-80"><ResponsiveContainer><BarChart data={rankingEquipe} layout="vertical"><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis type="number" domain={[0,5]} /><YAxis type="category" dataKey="nome" width={100} fontSize={11} /><Tooltip formatter={(v:number)=>v.toFixed(1)} /><Bar dataKey="media" fill="var(--primary)" radius={[0,4,4,0]} /></BarChart></ResponsiveContainer></div>
        </Panel>

        <Panel title="Tráfego pago do mês" action={<Link to="/trafego-pago" className="text-xs font-semibold text-primary">Abrir relatório mensal</Link>}>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-md border p-3"><div className="text-xs text-muted-foreground">Investimento</div><div className="font-display text-xl font-bold">{brl(investimentoTrafego)}</div></div>
            <div className="rounded-md border p-3"><div className="text-xs text-muted-foreground">Resultados</div><div className="font-display text-xl font-bold">{num(resultadosTrafego)}</div></div>
            <div className="rounded-md border p-3"><div className="text-xs text-muted-foreground">Custo por resultado</div><div className="font-display text-xl font-bold">{resultadosTrafego ? brl(investimentoTrafego/resultadosTrafego) : "—"}</div></div>
            <div className="rounded-md border p-3"><div className="text-xs text-muted-foreground">ROAS direto</div><div className="font-display text-xl font-bold">{investimentoTrafego && receitaTrafego ? (receitaTrafego/investimentoTrafego).toFixed(2)+"x" : "—"}</div></div>
          </div>
        </Panel>

        <Panel title="Leitura correta do retorno">
          <div className="space-y-3 text-sm">
            <div className="rounded-md border p-3"><b>Resultado direto / rastreável</b><p className="mt-1 text-muted-foreground">Receita ou venda ligada a um link, campanha, influencer ou origem identificável.</p></div>
            <div className="rounded-md border p-3"><b>Impacto / correlação</b><p className="mt-1 text-muted-foreground">Vendas e evolução da filial durante ações de marketing, sem atribuir automaticamente toda a venda ao marketing.</p></div>
          </div>
        </Panel>
      </div>
    </>
  );
}