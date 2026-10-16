import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ExternalLink, TrendingDown, TrendingUp, WalletCards, Target, Megaphone, MousePointerClick, Star, Truck } from "lucide-react";
import { Bar as RBar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useApp, brl, num, igHandle } from "@/lib/store";
import { valorMesFilial } from "@/lib/resultados-analytics";
import { buscarDespesasMarketingGestaoIM, converterDespesasGestaoIM, mesclarDespesasGestaoIM } from "@/lib/gestaoim-marketing";
import { buscarPerformanceFiliaisGestaoIM, converterPerformanceGestaoIM, mesclarPerformanceGestaoIM } from "@/lib/gestaoim-filiais";
import { Badge, Bar, Field, PageHeader, Panel, Stat, inputCls, pageHead } from "@/components/kit";

export const Route = createFileRoute("/filiais/$id")({
  head: pageHead("Detalhes da filial", "Metas, vendas, investimentos e histórico por filial."),
  component: Page,
});

type Tab = "resumo" | "vendas" | "investimentos" | "campanhas" | "trafego" | "influencers" | "volante" | "historico";
type Compare = "anterior" | "ano" | "media3" | "media6";

const TABS: { id: Tab; label: string }[] = [
  { id: "resumo", label: "Resumo" },
  { id: "vendas", label: "Vendas e Metas" },
  { id: "investimentos", label: "Investimentos" },
  { id: "campanhas", label: "Campanhas" },
  { id: "trafego", label: "Tráfego" },
  { id: "influencers", label: "Influencers" },
  { id: "volante", label: "Propaganda Volante" },
  { id: "historico", label: "Histórico" },
];

function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}
function monthLabel(month: string) {
  const [y, m] = month.split("-");
  return `${m}/${y.slice(2)}`;
}
function pct(current: number | null, base: number | null) {
  if (current == null || !base) return null;
  return ((current - base) / base) * 100;
}
function monthsForCompare(month: string, compare: Compare) {
  if (compare === "anterior") return [shiftMonth(month, -1)];
  if (compare === "ano") return [shiftMonth(month, -12)];
  const n = compare === "media3" ? 3 : 6;
  return Array.from({ length: n }, (_, i) => shiftMonth(month, -(i + 1)));
}
function avg(values: (number | null)[]) {
  const validos = values.filter((v): v is number => typeof v === "number");
  return validos.length ? validos.reduce((a, b) => a + b, 0) / validos.length : null;
}

function Page() {
  const { id } = Route.useParams();
  const { s, set } = useApp();
  const filial = s.filiais.find((f) => f.id === id);
  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7));
  const [compare, setCompare] = useState<Compare>("anterior");
  const [tab, setTab] = useState<Tab>("resumo");
  const [sync, setSync] = useState<"idle"|"loading"|"ok"|"error">("idle");
  const [syncInfo, setSyncInfo] = useState<{ total:number; valor:number; fetchedAt?:string; error?:string }>({ total:0, valor:0 });

  if (!filial) {
    return <div className="space-y-4"><Link to="/filiais" className="inline-flex items-center gap-2 text-sm font-bold text-primary"><ArrowLeft className="h-4 w-4" />Voltar</Link><Panel><div className="py-12 text-center text-muted-foreground">Filial não encontrada.</div></Panel></div>;
  }

  const sincronizar = async (silencioso = false) => {
    if (!silencioso) setSync("loading");
    const [despesas, performance] = await Promise.all([
      buscarDespesasMarketingGestaoIM(mes),
      buscarPerformanceFiliaisGestaoIM(mes),
    ]);
    const sincronizadoEm = despesas.fetchedAt || performance.fetchedAt || new Date().toISOString();

    const novosCustos = despesas.ok && Array.isArray(despesas.despesas)
      ? converterDespesasGestaoIM(despesas.despesas, s.filiais, sincronizadoEm)
      : [];
    const novosResultados = performance.ok && Array.isArray(performance.filiais)
      ? converterPerformanceGestaoIM(performance.filiais, s.filiais)
      : [];

    set((st)=>({
      ...st,
      custos: novosCustos.length ? mesclarDespesasGestaoIM(st.custos, novosCustos, mes) : st.custos,
      resultadosDiarios: novosResultados.length ? mesclarPerformanceGestaoIM(st.resultadosDiarios, novosResultados, mes) : st.resultadosDiarios,
    }));

    const destaFilial = novosCustos.filter((x)=>x.filialId===filial.id);
    if (!despesas.ok && !performance.ok) {
      setSync("error");
      setSyncInfo({ total:0, valor:0, error:despesas.error || performance.error });
      return;
    }
    setSyncInfo({
      total:destaFilial.length,
      valor:destaFilial.reduce((a,x)=>a+x.valor,0),
      fetchedAt:sincronizadoEm,
      error:performance.ok ? undefined : performance.error || "Meta e vendas da filial ainda não foram localizadas no GestãoIM.",
    });
    setSync(performance.ok ? "ok" : "error");
  };

  useEffect(() => {
    void sincronizar(true);
    const atual = new Date().toISOString().slice(0,7);
    if (mes !== atual) return;
    const timer = window.setInterval(() => void sincronizar(true), 5 * 60 * 1000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mes, filial.id]);

  const resultadoDoMes = (m: string) => valorMesFilial(s.resultadosDiarios, filial.id, m);
  const custosListaDoMes = (m: string) => {
    const existeGestaoNoMes = s.custos.some((c)=>c.origem==="GestãoIM" && c.data.startsWith(m));
    const todos = s.custos.filter((c) => c.filialId === filial.id && c.data.startsWith(m));
    const gestao = todos.filter((c)=>c.origem==="GestãoIM");
    return existeGestaoNoMes ? gestao : todos;
  };
  const custosDoMes = (m: string) => custosListaDoMes(m).reduce((a, c) => a + c.valor, 0);

  const resultadoAtual = resultadoDoMes(mes);
  const vendas = resultadoAtual.faturamento;
  const metaMes = resultadoAtual.meta;
  const investimento = custosDoMes(mes);
  const atingimento = metaMes && vendas != null ? (vendas / metaMes) * 100 : null;
  const baseMonths = monthsForCompare(mes, compare);
  const baseVendas = avg(baseMonths.map((m)=>resultadoDoMes(m).faturamento));
  const baseInvest = avg(baseMonths.map((m)=>custosDoMes(m)));
  const varVendas = pct(vendas, baseVendas);
  const varInvest = pct(investimento, baseInvest);

  const custosMes = custosListaDoMes(mes);
  const categorias = Object.entries(custosMes.reduce<Record<string, number>>((acc, c) => {
    acc[c.categoria] = (acc[c.categoria] || 0) + c.valor;
    return acc;
  }, {})).map(([categoria, valor]) => ({ categoria, valor })).sort((a, b) => b.valor - a.valor);

  const historico = useMemo(() => Array.from({ length: 12 }, (_, i) => shiftMonth(mes, i - 11)).map((m) => ({
    mes: monthLabel(m),
    vendas: valorMesFilial(s.resultadosDiarios, filial.id, m).faturamento,
    investimento: custosDoMes(m),
  })), [mes, s.resultadosDiarios, s.custos, filial.id]);

  const trafego = s.trafegoPago.filter((x) => x.filialId === filial.id && x.competencia === mes);
  const trafegoInvest = trafego.reduce((a, x) => a + x.investimento, 0);
  const trafegoResultados = trafego.reduce((a, x) => a + x.resultados, 0);
  const trafegoReceita = trafego.reduce((a, x) => a + x.receitaAtribuida, 0);

  const influencers = s.influencers.filter((i) => i.filialIds.includes(filial.id));
  const influContratado = influencers.reduce((a, i) => a + (i.vinculos.find((v) => v.filialId === filial.id)?.valor || 0), 0);
  const influReceita = influencers.reduce((a, i) => a + i.posts.filter((p) => p.filialId === filial.id && p.data.startsWith(mes)).reduce((b, p) => b + (p.receitaAtribuida || 0), 0), 0);
  const influEntregas = influencers.reduce((a, i) => a + i.posts.filter((p) => p.filialId === filial.id && p.data.startsWith(mes)).length, 0);

  const volantes = s.volantes.filter((v) => v.filialId === filial.id && v.competencia === mes);
  const volanteGasto = volantes.reduce((a, v) => a + v.custo, 0);
  const volanteHoras = volantes.reduce((a, v) => a + v.horas, 0);

  const [y, m] = mes.split("-").map(Number);
  const monthStart = `${mes}-01`;
  const monthEnd = `${mes}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;
  const campanhasFilial = s.campanhas.filter((c) =>
    (c.abrangencia === "Rede" || c.filialIds.includes(filial.id)) &&
    c.inicio <= monthEnd &&
    c.fim >= monthStart
  );

  const compareLabel = {
    anterior: "mês anterior",
    ano: "mesmo mês do ano anterior",
    media3: "média dos 3 meses anteriores",
    media6: "média dos 6 meses anteriores",
  }[compare];

  return (
    <>
      <div className="mb-4">
        <Link to="/filiais" className="inline-flex items-center gap-2 text-sm font-bold text-muted-foreground hover:text-primary"><ArrowLeft className="h-4 w-4" />Filiais</Link>
      </div>

      <PageHeader
        title={`${filial.codigo} · ${filial.nome}`}
        sub="Raio-X da filial: meta, vendas, investimento de marketing, composição dos gastos e evolução mensal."
        action={<a href={filial.instagram} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/[.035] px-3.5 py-2.5 text-sm font-bold hover:border-primary/35">{igHandle(filial.instagram)} <ExternalLink className="h-4 w-4" /></a>}
      />

      <div className="mb-4 grid gap-3 md:grid-cols-2">
        <Field label="Competência"><input type="month" className={inputCls} value={mes} onChange={(e) => setMes(e.target.value)} /></Field>
        <Field label="Comparar com"><select className={inputCls} value={compare} onChange={(e) => setCompare(e.target.value as Compare)}><option value="anterior">Mês anterior</option><option value="ano">Mesmo mês do ano anterior</option><option value="media3">Média dos últimos 3 meses</option><option value="media6">Média dos últimos 6 meses</option></select></Field>
      </div>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/7 bg-card p-3">
        <div className="text-xs text-muted-foreground">
          <b className="text-foreground">GestãoIM da filial:</b> {sync==="loading" ? " sincronizando investimento, meta e vendas..." : sync==="ok" ? ` ${syncInfo.total} lançamento(s) de marketing · Meta e Vendas atualizadas` : sync==="error" ? ` sincronização parcial · ${syncInfo.error || "Meta e Vendas ainda não disponíveis"}` : " aguardando sincronização."}
          {syncInfo.fetchedAt && <span> · atualizado {new Date(syncInfo.fetchedAt).toLocaleString("pt-BR")}</span>}
        </div>
        <button type="button" onClick={()=>void sincronizar()} className="rounded-xl border border-white/10 px-3 py-2 text-xs font-bold hover:border-primary/30 hover:text-primary">Atualizar investimentos</button>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat accent label="Meta" value={metaMes == null ? "—" : brl(metaMes)} hint={atingimento == null ? "sem base de meta da filial" : `${atingimento.toFixed(1)}% atingido`} />
        <Stat label="Vendas" value={vendas == null ? "—" : brl(vendas)} hint={resultadoAtual.dataBase ? `base ${resultadoAtual.dataBase.split("-").reverse().join("/")}` : "aguardando faturamento por filial"} />
        <Stat label="Investimento marketing" value={brl(investimento)} hint={custosMes.some((x)=>x.origem==="GestãoIM") ? "Despesas Marketing · GestãoIM" : "Centro de Custos"} />
        <Stat label="Investimento / vendas" value={vendas ? `${((investimento / vendas) * 100).toFixed(2)}%` : "—"} hint="relação, não atribuição" />
        <Stat label="Receita atribuída" value={trafegoReceita || influReceita ? brl(trafegoReceita + influReceita) : "—"} hint="somente rastreável" />
      </div>

      <div className="mb-4 grid gap-3 md:grid-cols-2">
        <VariationCard label="Vendas" current={vendas} base={baseVendas} variation={varVendas} compareLabel={compareLabel} />
        <VariationCard label="Investimento" current={investimento} base={baseInvest} variation={varInvest} compareLabel={compareLabel} />
      </div>

      <div className="mb-4 overflow-x-auto">
        <div className="flex min-w-max gap-2 rounded-2xl border border-white/7 bg-white/[.02] p-2">
          {TABS.map((t) => <button key={t.id} onClick={() => setTab(t.id)} className={`rounded-xl px-3 py-2 text-sm font-bold transition ${tab === t.id ? "bg-primary text-primary-foreground shadow-brand" : "text-muted-foreground hover:bg-white/[.05] hover:text-foreground"}`}>{t.label}</button>)}
        </div>
      </div>

      {tab === "resumo" && <>
        <div className="grid gap-4 lg:grid-cols-3">
          <Panel title="Vendas x investimento · 12 meses" className="lg:col-span-2">
            <div className="h-72"><ResponsiveContainer><BarChart data={historico}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="mes" fontSize={11} /><YAxis fontSize={11} tickFormatter={(v) => `${Math.round(v / 1000)}k`} /><Tooltip formatter={(v: number) => brl(v)} /><RBar dataKey="vendas" name="Vendas" fill="var(--chart-1)" radius={[4,4,0,0]} /><RBar dataKey="investimento" name="Investimento" fill="var(--primary)" radius={[4,4,0,0]} /></BarChart></ResponsiveContainer></div>
          </Panel>
          <Panel title="Composição do investimento">
            <div className="space-y-3">{categorias.length ? categorias.map((c) => <div key={c.categoria}><div className="mb-1 flex items-center justify-between text-sm"><span>{c.categoria}</span><b>{brl(c.valor)}</b></div><Bar value={investimento ? (c.valor / investimento) * 100 : 0} /></div>) : <Empty text="Sem custos registrados nesta competência." />}</div>
          </Panel>
        </div>
        <Panel title="Diagnóstico do período" className="mt-4">
          <div className="grid gap-3 md:grid-cols-3">
            <Insight icon={Target} title="Meta" text={atingimento == null ? "Sem base de meta e faturamento da filial nesta competência." : `A filial atingiu ${atingimento.toFixed(1)}% da meta disponível.`} />
            <Insight icon={WalletCards} title="Investimento" text={investimento ? `Foram registrados ${brl(investimento)} em marketing no período.` : "Sem investimento registrado no período."} />
            <Insight icon={TrendingUp} title="Comparação" text={varVendas == null ? "Não há base suficiente para comparar vendas." : `As vendas estão ${Math.abs(varVendas).toFixed(1)}% ${varVendas >= 0 ? "acima" : "abaixo"} de ${compareLabel}.`} />
          </div>
          <p className="mt-3 text-xs text-muted-foreground">Este diagnóstico descreve os dados cadastrados. Crescimento de vendas e investimento no mesmo período não significa, sozinho, causalidade ou ROI de marketing.</p>
        </Panel>
      </>}

      {tab === "vendas" && <>
        <Panel title="Meta e vendas">
          <div className="grid gap-4 lg:grid-cols-2">
            <div><div className="mb-2 flex justify-between text-sm"><span>Progresso da meta</span><b>{atingimento == null ? "—" : `${atingimento.toFixed(1)}%`}</b></div><Bar value={atingimento || 0} /><div className="mt-3 grid grid-cols-2 gap-2"><Mini label="Meta" value={metaMes == null ? "—" : brl(metaMes)} /><Mini label="Vendas" value={vendas == null ? "—" : brl(vendas)} /></div></div>
            <div className="rounded-xl border border-white/7 p-4"><div className="text-xs font-black uppercase tracking-wider text-muted-foreground">Comparativo</div><div className="mt-3 grid grid-cols-2 gap-2"><Mini label="Período atual" value={vendas == null ? "—" : brl(vendas)} /><Mini label={compareLabel} value={baseVendas == null ? "—" : brl(baseVendas)} /></div><div className="mt-3 text-sm">{varVendas == null ? "Sem base comparável." : <><b className={varVendas >= 0 ? "text-success" : "text-primary"}>{varVendas >= 0 ? "+" : ""}{varVendas.toFixed(1)}%</b> de variação nas vendas.</>}</div></div>
          </div>
        </Panel>
        <Panel title="Histórico de vendas" className="mt-4">
          <div className="h-72"><ResponsiveContainer><BarChart data={historico}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)" /><XAxis dataKey="mes" fontSize={11} /><YAxis fontSize={11} tickFormatter={(v) => `${Math.round(v / 1000)}k`} /><Tooltip formatter={(v: number) => brl(v)} /><RBar dataKey="vendas" name="Vendas" fill="var(--chart-1)" radius={[4,4,0,0]} /></BarChart></ResponsiveContainer></div>
        </Panel>
      </>}

      {tab === "investimentos" && <>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat accent label="Investimento no mês" value={brl(investimento)} />
          <Stat label="Categorias" value={String(categorias.length)} />
          <Stat label="Lançamentos" value={String(custosMes.length)} />
          <Stat label="Variação" value={varInvest == null ? "—" : `${varInvest >= 0 ? "+" : ""}${varInvest.toFixed(1)}%`} hint={compareLabel} />
        </div>
        <Panel title="Gastos por categoria" className="mt-4">
          <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead><tr className="border-b text-left text-xs uppercase text-muted-foreground"><th className="pb-2">Categoria</th><th>Descrição</th><th>Data</th><th>Valor</th><th>% do investimento</th></tr></thead><tbody>{custosMes.sort((a,b)=>b.valor-a.valor).map((c)=><tr key={c.id} className="border-b last:border-0"><td className="py-2"><Badge>{c.categoria}</Badge></td><td>{c.descricao}</td><td>{c.data.split("-").reverse().join("/")}</td><td><b>{brl(c.valor)}</b></td><td>{investimento ? ((c.valor/investimento)*100).toFixed(1) : "0"}%</td></tr>)}</tbody></table></div>
          {!custosMes.length && <Empty text="Sem lançamentos de marketing para esta filial nesta competência." />}
        </Panel>
      </>}

      {tab === "campanhas" && <Panel title="Campanhas da filial">
        <div className="grid gap-3 md:grid-cols-2">{campanhasFilial.map((c)=>{
          const plano = c.planosFiliais?.find((p) => p.filialId === filial.id);
          const distribuido = plano?.acoes.reduce((a, x) => a + x.valor, 0) || 0;
          const saldo = (plano?.verba || 0) - distribuido;
          return <div key={c.id} className="rounded-xl border border-white/7 p-4">
            <div className="flex items-start justify-between gap-2">
              <div><div className="font-display text-lg font-black">{c.nome}</div><div className="text-xs text-muted-foreground">{c.inicio.split("-").reverse().join("/")} → {c.fim.split("-").reverse().join("/")}</div></div>
              <div className="flex flex-wrap justify-end gap-1.5"><Badge tone={c.status==="Ativa"?"success":c.status==="Planejada"?"warn":"muted"}>{c.status}</Badge><Badge tone="primary">{c.abrangencia === "Rede" ? "Rede" : "Filial selecionada"}</Badge></div>
            </div>
            {c.proposito && <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{c.proposito}</p>}
            <div className="mt-3 text-sm">Verba da campanha: <b>{brl(c.verba)}</b></div>
            {c.abrangencia === "Filiais" && plano && <div className="mt-3 rounded-xl border border-primary/15 bg-primary/[.04] p-3">
              <div className="flex items-center justify-between gap-2"><span className="text-xs font-black uppercase tracking-[.12em] text-primary">Verba autorizada da filial</span><b>{brl(plano.verba)}</b></div>
              <div className="mt-3 space-y-2">
                {plano.acoes.map((acao) => <div key={acao.id} className="flex items-center justify-between gap-3 text-sm"><span>{acao.nome || "Ação sem nome"}</span><b>{brl(acao.valor)}</b></div>)}
                {!plano.acoes.length && <div className="text-xs text-muted-foreground">Nenhuma ação definida para esta filial.</div>}
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-white/7 pt-2 text-xs"><span className="text-muted-foreground">Distribuído: {brl(distribuido)}</span><b className={saldo < 0 ? "text-primary" : ""}>Saldo: {brl(saldo)}</b></div>
            </div>}
            <div className="mt-2 text-xs text-muted-foreground">{c.abrangencia === "Rede" ? "Campanha válida para toda a rede." : `Campanha direcionada a ${c.filialIds.length} filial(is).`}</div>
          </div>;
        })}</div>
        {!campanhasFilial.length && <Empty text="Nenhuma campanha vinculada a esta filial nesta competência." />}
      </Panel>}

      {tab === "trafego" && <>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><Stat accent label="Investimento" value={brl(trafegoInvest)} /><Stat label="Campanhas" value={String(trafego.length)} /><Stat label="Resultados" value={num(trafegoResultados)} /><Stat label="Receita atribuída" value={trafegoReceita ? brl(trafegoReceita) : "—"} /></div>
        <Panel title="Campanhas de mídia paga" className="mt-4"><div className="overflow-x-auto"><table className="w-full min-w-[850px] text-sm"><thead><tr className="border-b text-left text-xs uppercase text-muted-foreground"><th className="pb-2">Plataforma</th><th>Campanha</th><th>Investimento</th><th>Cliques</th><th>Resultados</th><th>Receita atribuída</th></tr></thead><tbody>{trafego.map((x)=><tr key={x.id} className="border-b last:border-0"><td className="py-2"><Badge>{x.plataforma}</Badge></td><td><b>{x.campanha}</b></td><td>{brl(x.investimento)}</td><td>{num(x.cliques)}</td><td>{num(x.resultados)}</td><td>{x.receitaAtribuida?brl(x.receitaAtribuida):"—"}</td></tr>)}</tbody></table></div>{!trafego.length&&<Empty text="Sem campanhas de tráfego vinculadas à filial nesta competência." />}</Panel>
      </>}

      {tab === "influencers" && <>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><Stat accent label="Contratado" value={brl(influContratado)} hint="valor dos vínculos cadastrados" /><Stat label="Influencers" value={String(influencers.length)} /><Stat label="Entregas no mês" value={String(influEntregas)} /><Stat label="Receita atribuída" value={influReceita?brl(influReceita):"—"} /></div>
        <Panel title="Influencers vinculadas" className="mt-4"><div className="grid gap-3 md:grid-cols-2">{influencers.map((i)=>{const v=i.vinculos.find(v=>v.filialId===filial.id);return <div key={i.id} className="rounded-xl border border-white/7 p-4"><div className="flex justify-between gap-3"><div><div className="font-display text-lg font-black">{i.nome}</div><div className="text-xs text-muted-foreground">{i.handle}</div></div><b className="text-primary">{brl(v?.valor||0)}</b></div><div className="mt-3 text-sm">{v?.pacote||"Sem pacote informado"}</div><div className="mt-1 text-xs text-muted-foreground">{v?.frequencia||"Sem frequência informada"}</div></div>})}</div>{!influencers.length&&<Empty text="Sem influencer vinculada à filial." />}</Panel>
      </>}

      {tab === "volante" && <>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4"><Stat accent label="Investimento" value={brl(volanteGasto)} /><Stat label="Horas" value={`${volanteHoras}h`} /><Stat label="Ações" value={String(volantes.length)} /><Stat label="Custo por hora" value={volanteHoras?brl(volanteGasto/volanteHoras):"—"} /></div>
        <Panel title="Ações de propaganda volante" className="mt-4"><div className="grid gap-3 md:grid-cols-2">{volantes.map((v)=><div key={v.id} className="rounded-xl border border-white/7 p-4"><div className="flex justify-between gap-2"><div><div className="font-display font-black">{v.veiculo}</div><div className="text-xs text-muted-foreground">{v.data.split("-").reverse().join("/")}</div></div><b>{brl(v.custo)}</b></div><div className="mt-3 text-sm"><b>{v.horas}h</b> · {v.fornecedor||"Fornecedor não informado"}</div><div className="mt-1 text-xs text-muted-foreground">{v.rota||"Sem rota informada"}</div></div>)}</div>{!volantes.length&&<Empty text="Sem ações de propaganda volante nesta competência." />}</Panel>
      </>}

      {tab === "historico" && <Panel title="Histórico consolidado · 12 meses">
        <div className="overflow-x-auto"><table className="w-full min-w-[700px] text-sm"><thead><tr className="border-b text-left text-xs uppercase text-muted-foreground"><th className="pb-2">Mês</th><th>Vendas</th><th>Investimento</th><th>Invest./Vendas</th></tr></thead><tbody>{historico.slice().reverse().map((h)=><tr key={h.mes} className="border-b last:border-0"><td className="py-2"><b>{h.mes}</b></td><td>{h.vendas == null ? "—" : brl(h.vendas)}</td><td>{brl(h.investimento)}</td><td>{h.vendas?`${((h.investimento/h.vendas)*100).toFixed(2)}%`:"—"}</td></tr>)}</tbody></table></div>
      </Panel>}
    </>
  );
}

function VariationCard({ label, current, base, variation, compareLabel }: { label: string; current: number | null; base: number | null; variation: number | null; compareLabel: string }) {
  const up = variation != null && variation >= 0;
  return <div className="rounded-2xl border border-white/7 bg-white/[.025] p-4"><div className="flex items-start justify-between gap-3"><div><div className="text-[10px] font-black uppercase tracking-[.14em] text-muted-foreground">{label}</div><div className="mt-1 font-display text-xl font-black">{current == null ? "—" : brl(current)}</div></div><div className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-black ${variation == null ? "border-white/10 text-muted-foreground" : up ? "border-success/20 bg-success/10 text-success" : "border-primary/20 bg-primary/10 text-primary"}`}>{variation == null ? "—" : <>{up?<TrendingUp className="h-3.5 w-3.5"/>:<TrendingDown className="h-3.5 w-3.5"/>}{variation>=0?"+":""}{variation.toFixed(1)}%</>}</div></div><div className="mt-2 text-xs text-muted-foreground">Base: {base == null ? "—" : brl(base)} · {compareLabel}</div></div>;
}

function Insight({ icon: Icon, title, text }: { icon: any; title: string; text: string }) {
  return <div className="rounded-xl border border-white/7 bg-white/[.02] p-4"><Icon className="mb-2 h-5 w-5 text-primary" /><div className="font-display font-black">{title}</div><p className="mt-1 text-sm text-muted-foreground">{text}</p></div>;
}
function Mini({ label, value }: { label: string; value: string }) {
  return <div className="rounded-xl border border-white/7 bg-white/[.02] p-3"><div className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">{label}</div><div className="mt-1 font-display font-black">{value}</div></div>;
}
function Empty({ text }: { text: string }) {
  return <div className="py-10 text-center text-sm text-muted-foreground">{text}</div>;
}