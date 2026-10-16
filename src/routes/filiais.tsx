import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, ExternalLink, RefreshCw, Search, TrendingUp, WalletCards } from "lucide-react";
import { useApp, brl, igHandle } from "@/lib/store";
import { valorMesFilial } from "@/lib/resultados-analytics";
import { buscarDespesasMarketingGestaoIM, converterDespesasGestaoIM, mesclarDespesasGestaoIM } from "@/lib/gestaoim-marketing";
import { buscarPerformanceFiliaisGestaoIM, converterPerformanceGestaoIM, mesclarPerformanceGestaoIM } from "@/lib/gestaoim-filiais";
import { Badge, Bar, Btn, inputCls, Stat, pageHead } from "@/components/kit";

export const Route = createFileRoute("/filiais")({
  head: pageHead("Filiais", "Visão consolidada de vendas, metas e investimentos por filial."),
  component: Page,
});

function shiftMonth(month: string, delta: number) {
  const [y, m] = month.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function Page() {
  const { s, set } = useApp();
  const [q, setQ] = useState("");
  const [mes, setMes] = useState(new Date().toISOString().slice(0, 7));
  const [sync, setSync] = useState<"idle"|"loading"|"ok"|"error">("idle");
  const [syncInfo, setSyncInfo] = useState<{ total:number; valor:number; fetchedAt?:string; error?:string }>({ total:0, valor:0 });
  const anterior = shiftMonth(mes, -1);

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

    if (!despesas.ok && !performance.ok) {
      setSync("error");
      setSyncInfo({ total:0, valor:0, error:despesas.error || performance.error });
      return;
    }

    setSyncInfo({
      total:despesas.total || novosCustos.length,
      valor:despesas.valorTotal || novosCustos.reduce((a,x)=>a+x.valor,0),
      fetchedAt:sincronizadoEm,
      error:performance.ok ? undefined : performance.error || "Meta e faturamento por filial ainda não foram localizados no GestãoIM.",
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
  }, [mes]);

  const dados = useMemo(() => s.filiais.map((f) => {
    const atual = valorMesFilial(s.resultadosDiarios, f.id, mes);
    const ant = valorMesFilial(s.resultadosDiarios, f.id, anterior);

    const existeGestaoNoMes = s.custos.some((c)=>c.origem==="GestãoIM" && c.data.startsWith(mes));
    const custosMes = s.custos.filter((c) => c.filialId === f.id && c.data.startsWith(mes));
    const custosGestao = custosMes.filter((c)=>c.origem==="GestãoIM");
    const baseCustos = existeGestaoNoMes ? custosGestao : custosMes;

    const investimento = baseCustos.reduce((a, c) => a + c.valor, 0);
    const vendasMes = atual.faturamento;
    const metaMes = atual.meta;
    const vendasAnterior = ant.faturamento;
    const variacao = vendasMes != null && vendasAnterior ? ((vendasMes - vendasAnterior) / vendasAnterior) * 100 : null;

    return {
      ...f,
      vendasMes,
      metaMes,
      vendasAnterior,
      investimento,
      variacao,
      dataBase: atual.dataBase || "",
      origemResultado: atual.origem,
      despesasGestao: custosGestao.length,
    };
  }).filter((f) => (f.codigo + " " + f.nome + " " + f.instagram).toLowerCase().includes(q.toLowerCase())), [s.filiais, s.resultadosDiarios, s.custos, mes, anterior, q]);

  const cd = dados.find((f) => f.isCD);
  const lojas = dados.filter((f) => !f.isCD);
  const totalVendas = lojas.reduce((a, f) => a + (f.vendasMes || 0), 0);
  const totalInvest = lojas.reduce((a, f) => a + f.investimento, 0);
  const metaRede = lojas.reduce((a, f) => a + (f.metaMes || 0), 0);
  const lojasComVendas = lojas.filter((f)=>f.vendasMes != null).length;
  const ating = metaRede ? (totalVendas / metaRede) * 100 : null;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-black">Filiais</h1>
          <p className="mt-1 text-sm text-muted-foreground">Quanto cada filial recebeu de investimento de marketing e quanto vendeu no mesmo período.</p>
        </div>
        <Btn variant="outline" onClick={()=>void sincronizar()} disabled={sync==="loading"}>
          <RefreshCw className={`h-4 w-4 ${sync==="loading"?"animate-spin":""}`}/>
          Sincronizar GestãoIM
        </Btn>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-white/7 bg-card p-4">
        <label className="text-xs font-black uppercase tracking-wider text-muted-foreground">Competência</label>
        <input type="month" className={`${inputCls} w-auto min-w-44`} value={mes} onChange={(e)=>setMes(e.target.value)} />
        <div className="ml-auto flex flex-wrap items-center gap-2 text-xs">
          {sync==="ok" && <><Badge tone="success">GESTÃOIM</Badge><span className="text-muted-foreground">{syncInfo.total} lançamento(s) de marketing · Meta e Vendas por filial atualizadas</span></>}
          {sync==="error" && <><Badge tone="warn">PARCIAL</Badge><span className="text-muted-foreground">{syncInfo.total ? `${syncInfo.total} lançamento(s) de marketing atualizados · ` : ""}{syncInfo.error || "Meta e Vendas por filial ainda não disponíveis."}</span></>}
          {syncInfo.fetchedAt && <span className="text-muted-foreground">Atualizado {new Date(syncInfo.fetchedAt).toLocaleString("pt-BR")}</span>}
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat accent label="Vendas das filiais" value={lojasComVendas ? brl(totalVendas) : "—"} hint={lojasComVendas ? `${lojasComVendas} filial(is) com base` : "aguardando faturamento por filial"} />
        <Stat label="Meta consolidada" value={metaRede ? brl(metaRede) : "—"} hint={ating == null ? "sem base de meta" : `${ating.toFixed(1)}% atingido`} />
        <Stat label="Investimento marketing" value={brl(totalInvest)} hint="Despesas Marketing do GestãoIM" />
        <Stat label="Investimento / vendas" value={totalVendas ? `${((totalInvest / totalVendas) * 100).toFixed(2)}%` : "—"} hint="relação financeira, não atribuição" />
        <Stat label="Filiais com investimento" value={String(lojas.filter((f)=>f.investimento>0).length)} hint="no período selecionado" />
      </div>

      {cd && (
        <div className="mb-4 rounded-2xl border border-primary/25 bg-card p-4 shadow-soft">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold uppercase tracking-wider text-primary">CD / Perfil Oficial</div>
              <div className="font-display text-xl font-bold">{cd.nome}</div>
              <div className="mt-1 text-xs text-muted-foreground">Investimento central no período: <b className="text-foreground">{brl(cd.investimento)}</b></div>
            </div>
            <a href={cd.instagram} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-xl border border-white/10 px-3 py-2 text-sm font-semibold hover:border-primary hover:text-primary">
              {igHandle(cd.instagram)} <ExternalLink className="h-4 w-4" />
            </a>
          </div>
        </div>
      )}

      <div className="relative mb-4">
        <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
        <input className={`${inputCls} pl-9`} placeholder="Buscar por código, filial ou @Instagram" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {lojas.map((f) => {
          const atingimento = f.metaMes && f.vendasMes != null ? (f.vendasMes / f.metaMes) * 100 : null;
          const relacao = f.vendasMes ? (f.investimento / f.vendasMes) * 100 : null;
          return (
            <Link
              key={f.id}
              to="/filiais/$id"
              params={{ id: f.id }}
              className="group rounded-2xl border border-white/7 bg-card p-4 shadow-soft transition hover:-translate-y-0.5 hover:border-primary/45"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-xs font-black uppercase tracking-[.14em] text-primary">Filial {f.codigo}</div>
                  <div className="mt-1 font-display text-lg font-black">{f.nome}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{igHandle(f.instagram)}</div>
                </div>
                <span className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[.035] text-muted-foreground transition group-hover:border-primary/30 group-hover:text-primary"><ArrowRight className="h-4 w-4" /></span>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-xl border border-success/15 bg-success/[.035] p-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Investido</div>
                  <div className="mt-1 font-display text-lg font-black">{brl(f.investimento)}</div>
                  <div className="mt-1 text-[10px] text-muted-foreground">{f.despesasGestao ? `${f.despesasGestao} lançamento(s) GestãoIM` : "sem despesa GestãoIM"}</div>
                </div>
                <div className="rounded-xl border border-primary/15 bg-primary/[.035] p-3">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Vendeu</div>
                  <div className="mt-1 font-display text-lg font-black">{f.vendasMes == null ? "—" : brl(f.vendasMes)}</div>
                  <div className="mt-1 text-[10px] text-muted-foreground">{f.dataBase ? `base ${f.dataBase.split("-").reverse().join("/")}` : "sem base por filial"}</div>
                </div>
              </div>

              <div className="mt-3 rounded-xl border border-white/7 bg-white/[.02] p-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Investimento / vendas</span>
                  <b>{relacao == null ? "—" : `${relacao.toFixed(2)}%`}</b>
                </div>
              </div>

              <div className="mt-4">
                <div className="mb-1.5 flex items-center justify-between text-xs"><span className="text-muted-foreground">Meta {f.metaMes == null ? "—" : brl(f.metaMes)}</span><b>{atingimento == null ? "—" : `${atingimento.toFixed(1)}%`}</b></div>
                <Bar value={atingimento || 0} />
              </div>

              <div className="mt-3 flex items-center justify-between gap-2 text-xs">
                <span className="inline-flex items-center gap-1 text-muted-foreground"><WalletCards className="h-3.5 w-3.5" /> abrir raio-X</span>
                <span className={`inline-flex items-center gap-1 text-right font-bold ${f.variacao == null ? "text-muted-foreground" : f.variacao >= 0 ? "text-success" : "text-primary"}`}>
                  <TrendingUp className="h-3.5 w-3.5" />
                  {f.variacao == null ? "sem base anterior" : `${f.variacao >= 0 ? "+" : ""}${f.variacao.toFixed(1)}% vendas`}
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      {!lojas.length && <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-muted-foreground">Nenhuma filial encontrada.</div>}
    </>
  );
}