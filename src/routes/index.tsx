import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bar as RBar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { AlertTriangle, ArrowUpRight, CalendarDays, CheckCircle2, FileSpreadsheet, Megaphone, RefreshCw, TrendingDown, TrendingUp, Upload, WalletCards } from "lucide-react";
import { toast } from "sonner";
import { useApp, brl, type Venda, type Custo } from "@/lib/store";
import { lerPlanilhaResultados, mesclarResultados } from "@/lib/resultados-import";
import { intervaloPeriodo, somaRedePeriodo, valorPeriodo } from "@/lib/resultados-analytics";
import { buscarDespesasMarketingGestaoIM, converterDespesasGestaoIM, mesclarDespesasGestaoIM } from "@/lib/gestaoim-marketing";
import { buscarPerformanceFiliaisGestaoIM, converterPerformanceGestaoIM, mesclarPerformanceGestaoIM } from "@/lib/gestaoim-filiais";
import { Badge, Btn, Field, PageHeader, Panel, Stat, inputCls } from "@/components/kit";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard · BI Marketing Lojas IM" },
      { name: "description", content: "Meta, faturamento, ranking de filiais e relação entre investimento de marketing e vendas." },
    ],
  }),
  component: Dashboard,
});

type Periodo = "Dia" | "Mês" | "Ano";
type VisaoInvestimento = "Consolidado" | "Por propaganda";
type PeriodoDespesasResumo = "mes" | "mes_passado" | "90" | "tudo";
type RankingFiltro = "nao_bateram" | "percentual" | "faturamento" | "distancia";
type GestaoIMSummary = {
  meta_mes?: number;
  pct_achieved?: number;
  projecao_fechamento?: number;
  projecao_pct?: number;
  falta_mes?: number;
  dias_uteis_restantes?: number;
  meta_hoje?: number;
  meta_dia_hoje?: number;
  meta_dia_data?: string;
  mes_rotulo?: string;
  vendido_mes?: number;
  vendas_mes?: number;
  faturamento_mes?: number;
  faturamento?: number;
  realizado?: number;
  total_vendas?: number;
  categorias?: unknown;
  [key: string]: unknown;
};

const MESES = ["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];
const PALETA = ["var(--primary)","var(--chart-2)","var(--chart-3)","var(--chart-4)","var(--chart-5)","#8b5cf6","#06b6d4","#f59e0b"];

function Dashboard() {
  const { s, set } = useApp();
  const uploadRef = useRef<HTMLInputElement>(null);
  const hoje = new Date().toISOString().slice(0,10);
  const mesAtual = hoje.slice(0,7);
  const latestSaved = [...s.resultadosDiarios].sort((a,b)=>b.data.localeCompare(a.data))[0]?.data || "";
  // Dashboard operacional abre no mês atual. Antes, uma fotografia antiga salva
  // podia fazer a tela sincronizar setembro mesmo já estando em outubro.
  const referenciaInicial = latestSaved.startsWith(mesAtual) ? latestSaved : hoje;
  const [periodo, setPeriodo] = useState<Periodo>("Mês");
  const [referencia, setReferencia] = useState(referenciaInicial);
  const [visaoInvest, setVisaoInvest] = useState<VisaoInvestimento>("Consolidado");
  const [dataImportacao, setDataImportacao] = useState(new Date().toISOString().slice(0,10));
  const [gestaoSummary, setGestaoSummary] = useState<GestaoIMSummary | null>(null);
  const [gestaoSync, setGestaoSync] = useState<"idle" | "loading" | "ok" | "error">("idle");
  const [gestaoAtualizadoEm, setGestaoAtualizadoEm] = useState<string>("");
  const [despesasGestaoSync, setDespesasGestaoSync] = useState<"idle"|"loading"|"ok"|"error">("idle");
  const [despesasGestaoInfo, setDespesasGestaoInfo] = useState<{ total:number; valorTotal:number; fetchedAt?:string; error?:string }>({ total:0, valorTotal:0 });
  const [vendasDiariasGestao, setVendasDiariasGestao] = useState<Array<{data:string; faturamento:number}>>([]);
  const [vendasDiariasGestaoSync, setVendasDiariasGestaoSync] = useState<"idle"|"loading"|"ok"|"error">("idle");
  const [vendasDiariasGestaoInfo, setVendasDiariasGestaoInfo] = useState<{ loadedDays:number; totalDays:number; fetchedAt?:string; error?:string }>({ loadedDays:0, totalDays:0 });
  const [visaoDespesas, setVisaoDespesas] = useState<"Filial"|"Categoria">("Filial");
  const [rankingFiltro, setRankingFiltro] = useState<RankingFiltro>("nao_bateram");
  const [periodoDespesasResumo, setPeriodoDespesasResumo] = useState<PeriodoDespesasResumo>("tudo");
  const [despesasResumoGestao, setDespesasResumoGestao] = useState<Custo[]>([]);
  const [despesasResumoSync, setDespesasResumoSync] = useState<"idle"|"loading"|"ok"|"error">("idle");
  const [despesasResumoInfo, setDespesasResumoInfo] = useState<{ total:number; valorTotal:number; fetchedAt?:string; error?:string }>({ total:0, valorTotal:0 });
  const [filiaisGestaoSync, setFiliaisGestaoSync] = useState<"idle"|"loading"|"ok"|"error">("idle");
  const [filiaisGestaoInfo, setFiliaisGestaoInfo] = useState<{
    total:number;
    esperado?:number;
    completo?:boolean;
    faltantes?:{ codigo:string; nome:string }[];
    endpoints?:string[];
    dataBase?:string;
    fetchedAt?:string;
    error?:string;
    nextStep?:string;
  }>({ total:0 });
  const [gestaoRefreshKey, setGestaoRefreshKey] = useState(0);

  const sincronizarGestao = async (silencioso = false) => {
    if (!silencioso) setGestaoSync("loading");
    try {
      const res = await fetch("/api/gestaoim/summary", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok || !json?.ok || !json?.data) throw new Error(json?.error || "Falha");
      setGestaoSummary(json.data as GestaoIMSummary);
      setGestaoAtualizadoEm(json.fetchedAt || new Date().toISOString());
      setGestaoSync("ok");
      if (!silencioso) toast.success("Dados do GestãoIM sincronizados.");
    } catch {
      setGestaoSync("error");
      if (!silencioso) toast.error("Não foi possível sincronizar com o GestãoIM.");
    }
  };

  useEffect(() => {
    void sincronizarGestao(true);
    const timer = window.setInterval(() => void sincronizarGestao(true), 5 * 60 * 1000);
    return () => window.clearInterval(timer);
  }, []);

  const lojas = s.filiais.filter((f) => !f.isCD);
  const mes = referencia.slice(0,7);
  const ano = referencia.slice(0,4);

  const despesasResumoRange = useMemo(() => {
    const hojeDate = new Date(hoje + "T12:00:00");
    const iso = (d:Date) => d.toISOString().slice(0,10);

    if (periodoDespesasResumo === "mes") {
      return { de:hoje.slice(0,7) + "-01", ate:hoje, rotulo:"Este mês" };
    }

    if (periodoDespesasResumo === "mes_passado") {
      const primeiroAtual = new Date(hojeDate.getFullYear(), hojeDate.getMonth(), 1, 12);
      const ultimoAnterior = new Date(primeiroAtual);
      ultimoAnterior.setDate(0);
      const primeiroAnterior = new Date(ultimoAnterior.getFullYear(), ultimoAnterior.getMonth(), 1, 12);
      return { de:iso(primeiroAnterior), ate:iso(ultimoAnterior), rotulo:"Mês passado" };
    }

    if (periodoDespesasResumo === "90") {
      const inicio = new Date(hojeDate);
      inicio.setDate(inicio.getDate() - 89);
      return { de:iso(inicio), ate:hoje, rotulo:"Últimos 90 dias" };
    }

    return { de:"2020-01-01", ate:hoje, rotulo:"Tudo" };
  }, [periodoDespesasResumo, hoje]);

  useEffect(() => {
    let ativo = true;
    const carregarFiliaisGestao = async () => {
      setFiliaisGestaoSync("loading");
      const data = await buscarPerformanceFiliaisGestaoIM(mes);
      if (!ativo) return;
      if (!data.ok || !Array.isArray(data.filiais)) {
        setFiliaisGestaoSync("error");
        setFiliaisGestaoInfo({ total:0, error:data.error, nextStep:data.nextStep });
        return;
      }
      const novos = converterPerformanceGestaoIM(data.filiais, s.filiais);
      set((st)=>({ ...st, resultadosDiarios: mesclarPerformanceGestaoIM(st.resultadosDiarios, novos, mes) }));
      setFiliaisGestaoInfo({
        total:novos.length,
        esperado:data.esperado || lojas.length,
        completo:data.completo ?? novos.length >= lojas.length,
        faltantes:data.faltantes || [],
        endpoints:data.endpoints || [],
        dataBase:data.dataBase,
        fetchedAt:data.fetchedAt,
      });
      setFiliaisGestaoSync("ok");

      const dataMaisRecente = [...novos].sort((a,b)=>b.data.localeCompare(a.data))[0]?.data;
      if (dataMaisRecente && mes === mesAtual) {
        setReferencia(dataMaisRecente);
      }
    };
    void carregarFiliaisGestao();
    const timer = mes===mesAtual ? window.setInterval(()=>void carregarFiliaisGestao(),5*60*1000) : undefined;
    return () => {
      ativo=false;
      if (timer) window.clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mes, gestaoRefreshKey]);

  useEffect(() => {
    let ativo = true;
    const carregarDespesas = async () => {
      setDespesasGestaoSync("loading");
      const data = await buscarDespesasMarketingGestaoIM(mes);
      if (!ativo) return;
      if (!data.ok || !Array.isArray(data.despesas)) {
        setDespesasGestaoSync("error");
        setDespesasGestaoInfo({ total:0, valorTotal:0, error:data.error });
        return;
      }
      const sincronizadoEm = data.fetchedAt || new Date().toISOString();
      const custos = converterDespesasGestaoIM(data.despesas, s.filiais, sincronizadoEm);
      set((st)=>({ ...st, custos: mesclarDespesasGestaoIM(st.custos, custos, mes) }));
      setDespesasGestaoInfo({
        total:data.total || custos.length,
        valorTotal:data.valorTotal || custos.reduce((a,x)=>a+x.valor,0),
        fetchedAt:sincronizadoEm,
      });
      setDespesasGestaoSync("ok");
    };
    void carregarDespesas();
    return () => { ativo = false; };
    // A sincronização acompanha a competência escolhida no dashboard.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mes, gestaoRefreshKey]);

  useEffect(() => {
    let ativo = true;
    const carregarResumoDespesas = async () => {
      setDespesasResumoSync("loading");
      const data = await buscarDespesasMarketingGestaoIM(despesasResumoRange.ate.slice(0,7), {
        de:despesasResumoRange.de,
        ate:despesasResumoRange.ate,
      });
      if (!ativo) return;

      if (!data.ok || !Array.isArray(data.despesas)) {
        setDespesasResumoGestao([]);
        setDespesasResumoSync("error");
        setDespesasResumoInfo({ total:0, valorTotal:0, error:data.error });
        return;
      }

      const sincronizadoEm = data.fetchedAt || new Date().toISOString();
      const custos = converterDespesasGestaoIM(data.despesas, s.filiais, sincronizadoEm);
      setDespesasResumoGestao(custos);
      setDespesasResumoInfo({
        total:data.total ?? custos.length,
        valorTotal:data.valorTotal ?? custos.reduce((a,x)=>a+x.valor,0),
        fetchedAt:sincronizadoEm,
      });
      setDespesasResumoSync("ok");
    };

    void carregarResumoDespesas();
    return () => { ativo=false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [despesasResumoRange.de, despesasResumoRange.ate, gestaoRefreshKey]);

  useEffect(() => {
    let ativo = true;
    const carregarVendasDiariasGestao = async () => {
      setVendasDiariasGestaoSync("loading");
      try {
        const res = await fetch(`/api/gestaoim/daily-sales?month=${encodeURIComponent(mes)}`, { cache:"no-store" });
        const data = await res.json();
        if (!ativo) return;
        if (!res.ok || !data?.ok || !Array.isArray(data.rows)) {
          setVendasDiariasGestao([]);
          setVendasDiariasGestaoSync("error");
          setVendasDiariasGestaoInfo({ loadedDays:0, totalDays:Number(data?.totalDays||0), error:data?.error || "Não foi possível carregar o faturamento diário." });
          return;
        }
        setVendasDiariasGestao(data.rows);
        setVendasDiariasGestaoInfo({
          loadedDays:Number(data.loadedDays || data.rows.length),
          totalDays:Number(data.totalDays || data.rows.length),
          fetchedAt:data.fetchedAt,
        });
        setVendasDiariasGestaoSync("ok");
      } catch (error) {
        if (!ativo) return;
        setVendasDiariasGestao([]);
        setVendasDiariasGestaoSync("error");
        setVendasDiariasGestaoInfo({ loadedDays:0, totalDays:0, error:error instanceof Error ? error.message : "Falha no faturamento diário." });
      }
    };
    void carregarVendasDiariasGestao();
    return () => { ativo = false; };
  }, [mes, gestaoRefreshKey]);

  const intervalo = intervaloPeriodo(periodo, referencia);
  const custosPeriodo = s.custos.filter((c) => c.data >= intervalo.inicio && c.data <= intervalo.fim);
  const custosGestaoPeriodo = custosPeriodo.filter((c)=>c.origem==="GestãoIM");
  const custosInvestimentoBase = custosGestaoPeriodo.length ? custosGestaoPeriodo : custosPeriodo;
  const idsLojas = lojas.map((f) => f.id);
  const rede = somaRedePeriodo(s.resultadosDiarios, idsLojas, intervalo.inicio, intervalo.fim);

  const snapshotsNoPeriodo = useMemo(() => s.resultadosDiarios.filter((r) =>
    r.modo === "acumulado" &&
    r.data >= intervalo.inicio &&
    r.data <= intervalo.fim
  ), [s.resultadosDiarios, intervalo.inicio, intervalo.fim]);

  const dataFotografia = snapshotsNoPeriodo.length
    ? [...snapshotsNoPeriodo].sort((a,b)=>b.data.localeCompare(a.data))[0].data
    : "";

  const snapshotDaFilial = (filialId: string) => {
    if (!dataFotografia) return null;
    return snapshotsNoPeriodo
      .filter((r) => r.filialId === filialId && r.data === dataFotografia)
      .sort((a,b)=>b.data.localeCompare(a.data))[0] || null;
  };

  const temMovimentoNoPeriodo = s.resultadosDiarios.some((r) =>
    (r.modo || "movimento") === "movimento" &&
    r.data >= intervalo.inicio &&
    r.data <= intervalo.fim
  );
  const usarFotografiaFiliais = !temMovimentoNoPeriodo && !!dataFotografia;

  const numero = (...values: unknown[]) => {
    for (const v of values) if (typeof v === "number" && Number.isFinite(v)) return v;
    return null;
  };
  const gestaoFat = gestaoSummary ? numero(
    gestaoSummary.vendido_mes,
    gestaoSummary.vendas_mes,
    gestaoSummary.faturamento_mes,
    gestaoSummary.faturamento,
    gestaoSummary.realizado,
    gestaoSummary.total_vendas,
  ) : null;
  const mesAtualGestao = gestaoSummary?.mes_rotulo
    ? (() => {
        const [nome, y] = String(gestaoSummary.mes_rotulo).split("/");
        const idx = ["janeiro","fevereiro","março","abril","maio","junho","julho","agosto","setembro","outubro","novembro","dezembro"].indexOf(nome.toLowerCase());
        return idx >= 0 && y ? `${y}-${String(idx+1).padStart(2,"0")}` : "";
      })()
    : "";
  const usarGestao = periodo === "Mês" && !!gestaoSummary && (!mesAtualGestao || mesAtualGestao === mes);
  const metaTotal = usarGestao ? numero(gestaoSummary?.meta_mes) : rede.meta;
  const faturamentoTotal = usarGestao && gestaoFat != null ? gestaoFat : rede.faturamento;
  const atingimento = usarGestao && numero(gestaoSummary?.pct_achieved) != null
    ? numero(gestaoSummary?.pct_achieved)
    : metaTotal && faturamentoTotal != null ? (faturamentoTotal/metaTotal)*100 : null;
  const valorInvestido = custosInvestimentoBase.reduce((a,c)=>a+c.valor,0);
  const relacaoInvestido = faturamentoTotal ? (valorInvestido/faturamentoTotal)*100 : null;

  const valorDespesasResumo = despesasResumoGestao.reduce((a,c)=>a+c.valor,0);

  const despesasPorFilial = useMemo(() => {
    const mapa = new Map<string,{ id:string; codigo:string; nome:string; valor:number; lancamentos:number }>();
    for (const custo of despesasResumoGestao) {
      const filial = s.filiais.find((f)=>f.id===custo.filialId);
      const id = filial?.id || custo.filialId || "rede";
      const atual = mapa.get(id) || {
        id,
        codigo: filial?.codigo || "Rede",
        nome: filial?.nome || "Rede / não identificado",
        valor: 0,
        lancamentos: 0,
      };
      atual.valor += custo.valor;
      atual.lancamentos += 1;
      mapa.set(id, atual);
    }
    return [...mapa.values()].sort((a,b)=>b.valor-a.valor);
  }, [despesasResumoGestao, s.filiais]);

  const despesasPorCategoria = useMemo(() => {
    const mapa = new Map<string,{ nome:string; valor:number; lancamentos:number }>();
    for (const custo of despesasResumoGestao) {
      const nome = custo.categoria || "Outros";
      const atual = mapa.get(nome) || { nome, valor:0, lancamentos:0 };
      atual.valor += custo.valor;
      atual.lancamentos += 1;
      mapa.set(nome, atual);
    }
    return [...mapa.values()].sort((a,b)=>b.valor-a.valor);
  }, [despesasResumoGestao]);

  const filiaisComGastoGestao = despesasPorFilial.filter((x)=>x.valor>0).length;
  const mediaLancamentoGestao = despesasResumoGestao.length ? valorDespesasResumo / despesasResumoGestao.length : 0;

  const ranking = useMemo(() => lojas.map((f) => {
    const v = valorPeriodo(s.resultadosDiarios, f.id, intervalo.inicio, intervalo.fim);
    const foto = usarFotografiaFiliais ? snapshotDaFilial(f.id) : null;
    const meta = v.meta ?? foto?.meta ?? null;
    const faturamento = v.faturamento ?? foto?.faturamento ?? null;
    const percentual = meta && faturamento != null ? (faturamento/meta)*100 : null;
    return { id:f.id, codigo:f.codigo, nome:f.nome, meta, faturamento, percentual, baseCompleta:v.baseCompleta || !!foto, fotografia: !!foto };
  }).sort((a,b) => {
    if (a.percentual == null && b.percentual == null) return a.codigo.localeCompare(b.codigo);
    if (a.percentual == null) return 1;
    if (b.percentual == null) return -1;
    return a.percentual-b.percentual;
  }), [s.resultadosDiarios, lojas, intervalo.inicio, intervalo.fim, usarFotografiaFiliais, dataFotografia]);

  const rankingExibido = useMemo(() => {
    const base = ranking
      .filter((x) => x.meta != null && x.meta > 0 && x.faturamento != null)
      .map((x) => ({
        ...x,
        faltaMeta: Math.max(0, Number(x.meta || 0) - Number(x.faturamento || 0)),
      }));

    if (rankingFiltro === "nao_bateram") {
      return base
        .filter((x) => (x.percentual ?? 999) < 100)
        .sort((a,b) => (a.percentual ?? 999) - (b.percentual ?? 999) || (a.faturamento ?? 0) - (b.faturamento ?? 0));
    }

    if (rankingFiltro === "faturamento") {
      return [...base].sort((a,b) => (a.faturamento ?? Infinity) - (b.faturamento ?? Infinity) || (a.percentual ?? 999) - (b.percentual ?? 999));
    }

    if (rankingFiltro === "distancia") {
      return base
        .filter((x) => x.faltaMeta > 0)
        .sort((a,b) => b.faltaMeta - a.faltaMeta || (a.percentual ?? 999) - (b.percentual ?? 999));
    }

    return [...base].sort((a,b) => (a.percentual ?? 999) - (b.percentual ?? 999));
  }, [ranking, rankingFiltro]);

  const rankingTemDados = ranking.some((x)=>x.meta != null || x.faturamento != null);
  const temSerieDiariaMes = periodo === "Mês" && s.resultadosDiarios.some((r) =>
    (r.modo || "movimento") === "movimento" && r.data.startsWith(mes)
  );
  const graficoConsolidadoGestao = periodo === "Mês" &&
    usarGestao &&
    !usarFotografiaFiliais &&
    !temSerieDiariaMes &&
    metaTotal != null &&
    faturamentoTotal != null;

  const graficoMeta = useMemo(() => {
    if (usarFotografiaFiliais) {
      return lojas.map((f) => {
        const foto = snapshotDaFilial(f.id);
        return { eixo:f.codigo, meta:foto?.meta ?? null, realizado:foto?.faturamento ?? null, nome:f.nome };
      });
    }
    if (graficoConsolidadoGestao) {
      return [{
        eixo: String(gestaoSummary?.mes_rotulo || `${mes.slice(5)}/${mes.slice(0,4)}`),
        meta: metaTotal,
        realizado: faturamentoTotal,
        nome: "Consolidado da rede",
      }];
    }
    if (periodo === "Dia") {
      return lojas.map((f) => {
        const v = valorPeriodo(s.resultadosDiarios, f.id, referencia, referencia);
        return { eixo:f.codigo, meta:v.meta, realizado:v.faturamento, nome:f.nome };
      });
    }
    if (periodo === "Mês") {
      const [y,m] = mes.split("-").map(Number);
      const dias = new Date(y,m,0).getDate();
      return Array.from({length:dias},(_,i)=>{
        const data=`${mes}-${String(i+1).padStart(2,"0")}`;
        const v = somaRedePeriodo(s.resultadosDiarios, idsLojas, data, data);
        return { eixo:String(i+1).padStart(2,"0"), meta:v.meta, realizado:v.faturamento };
      });
    }
    return MESES.map((nome,i)=>{
      const chave=`${ano}-${String(i+1).padStart(2,"0")}`;
      const ultimo = new Date(Number(ano), i+1, 0).getDate();
      const v = somaRedePeriodo(s.resultadosDiarios, idsLojas, `${chave}-01`, `${chave}-${String(ultimo).padStart(2,"0")}`);
      return { eixo:nome, meta:v.meta, realizado:v.faturamento };
    });
  }, [periodo, referencia, mes, ano, lojas, idsLojas, s.resultadosDiarios, usarFotografiaFiliais, dataFotografia, graficoConsolidadoGestao, metaTotal, faturamentoTotal, gestaoSummary?.mes_rotulo]);

  const vendasDiariasGestaoMap = useMemo(
    () => new Map(vendasDiariasGestao.map((x)=>[x.data, x.faturamento])),
    [vendasDiariasGestao],
  );

  const timeline = useMemo(() => {
    const custos = s.custos;
    const usarSerieDiariaGestao = periodo === "Mês" && vendasDiariasGestaoSync === "ok" && vendasDiariasGestaoMap.size > 0;

    const monta = (eixo: string, inicio: string, fim: string) => {
      const v = somaRedePeriodo(s.resultadosDiarios, idsLojas, inicio, fim);
      const csTodos = custos.filter((c)=>c.data>=inicio && c.data<=fim);
      const csGestao = csTodos.filter((c)=>c.origem==="GestãoIM");
      const cs = csGestao.length ? csGestao : csTodos;

      let faturado: number | null = v.faturamento;
      if (usarSerieDiariaGestao && inicio === fim) {
        faturado = vendasDiariasGestaoMap.has(inicio) ? (vendasDiariasGestaoMap.get(inicio) ?? null) : null;
      }

      const row:Record<string,number|string|null>={
        eixo,
        faturado,
        investido:cs.reduce((a,c)=>a+c.valor,0),
      };
      for (const custo of cs) row[custo.categoria]=Number(row[custo.categoria]||0)+custo.valor;
      return row;
    };

    if (periodo === "Dia") {
      const fim = new Date(referencia+"T12:00:00");
      return Array.from({length:7},(_,i)=>{
        const d=new Date(fim); d.setDate(fim.getDate()-(6-i));
        const data=d.toISOString().slice(0,10);
        return monta(data.slice(8)+"/"+data.slice(5,7), data, data);
      });
    }

    if (periodo === "Mês") {
      const [y,m]=mes.split("-").map(Number);
      const dias=new Date(y,m,0).getDate();
      return Array.from({length:dias},(_,i)=>{
        const data=`${mes}-${String(i+1).padStart(2,"0")}`;
        return monta(String(i+1).padStart(2,"0"), data, data);
      });
    }

    return MESES.map((nome,i)=>{
      const chave=`${ano}-${String(i+1).padStart(2,"0")}`;
      const ultimo = new Date(Number(ano), i+1, 0).getDate();
      return monta(nome, `${chave}-01`, `${chave}-${String(ultimo).padStart(2,"0")}`);
    });
  }, [periodo, referencia, mes, ano, s.custos, s.resultadosDiarios, idsLojas, vendasDiariasGestaoMap, vendasDiariasGestaoSync]);

  const categoriasInvest = useMemo(() => [...new Set(
    s.custos.filter((c)=>{
      const noPeriodo = periodo==="Dia"
        ? (()=>{const inicio=new Date(referencia+"T12:00:00"); inicio.setDate(inicio.getDate()-6); return c.data>=inicio.toISOString().slice(0,10) && c.data<=referencia;})()
        : periodo==="Mês"?c.data.startsWith(mes):c.data.startsWith(ano);
      if (!noPeriodo) return false;
      const gestaoNoMesmoPeriodo = s.custos.some((x)=>{
        const xNoPeriodo = periodo==="Dia"
          ? (()=>{const inicio=new Date(referencia+"T12:00:00"); inicio.setDate(inicio.getDate()-6); return x.data>=inicio.toISOString().slice(0,10) && x.data<=referencia;})()
          : periodo==="Mês"?x.data.startsWith(mes):x.data.startsWith(ano);
        return xNoPeriodo && x.origem==="GestãoIM";
      });
      return gestaoNoMesmoPeriodo ? c.origem==="GestãoIM" : true;
    }).map((c)=>c.categoria)
  )], [s.custos, periodo, referencia, mes, ano]);

  const pontosSemInvestimento = timeline.filter((x)=>
    x.faturado != null &&
    Number(x.faturado||0) > 0 &&
    Number(x.investido||0) === 0
  );
  const semanasSemInvestimento = periodo === "Mês"
    ? Array.from({length:Math.ceil(timeline.length/7)},(_,i)=>timeline.slice(i*7,i*7+7)).filter((grupo)=>{
        const conhecidos = grupo.filter((x)=>x.faturado != null);
        return conhecidos.length > 0 &&
          conhecidos.some((x)=>Number(x.faturado||0)>0) &&
          conhecidos.every((x)=>Number(x.investido||0)===0);
      }).length
    : 0;

  async function importar(file: File) {
    try {
      const lido = await lerPlanilhaResultados(file, s.filiais, dataImportacao);
      if (!lido.registros.length) {
        toast.error("Não encontrei dados de filial, meta e vendido/faturamento nessa planilha.");
        return;
      }
      const vendasNovas: Venda[] = lido.formato === "movimento_diario"
        ? lido.registros.filter((r)=>r.faturamento>0).map((r)=>({
            id:`v-${r.filialId}-${r.data}`, filialId:r.filialId, data:r.data, valor:r.faturamento,
          }))
        : [];
      set((st)=>{
        const chaves=new Set(vendasNovas.map((v)=>`${v.filialId}|${v.data}`));
        return {
          ...st,
          resultadosDiarios:mesclarResultados(st.resultadosDiarios,lido.registros),
          vendas:vendasNovas.length ? [...vendasNovas,...st.vendas.filter((v)=>!chaves.has(`${v.filialId}|${v.data}`))] : st.vendas,
        };
      });
      const dataMaisRecente=[...lido.registros].sort((a,b)=>b.data.localeCompare(a.data))[0]?.data;
      if(dataMaisRecente) setReferencia(dataMaisRecente);
      toast.success("Dashboard atualizado com a planilha",{
        description:lido.formato === "gestaoim_snapshot"
          ? `${lido.registros.length} filiais do GestãoIM atualizadas. O gráfico principal e o ranking passam a usar esta fotografia por loja imediatamente. ${lido.ignoradas ? `${lido.ignoradas} linha(s) de vendedor/consolidado ignorada(s).` : ""}`
          : lido.formato === "metabase_acumulado"
            ? `${lido.registros.length} filiais salvas como fotografia acumulada em ${dataImportacao.split("-").reverse().join("/")}. ${lido.ignoradas ? `${lido.ignoradas} linha(s) ignorada(s).` : ""}`
            : `${lido.registros.length} filial/data atualizados${lido.ignoradas?` · ${lido.ignoradas} linhas ignoradas`:""}.`,
      });
    } catch {
      toast.error("Não foi possível ler a planilha.");
    }
  }

  const tituloPeriodo = periodo === "Dia" ? referencia.split("-").reverse().join("/") : periodo === "Mês" ? `${mes.slice(5)}/${mes.slice(0,4)}` : ano;
  const semDados = metaTotal == null && faturamentoTotal == null;
  const temAcumulado = s.resultadosDiarios.some((r)=>r.modo==="acumulado");
  const baseIncompleta = temAcumulado && !rede.baseCompleta && periodo !== "Ano";
  const gestaoNaoConfigurado = [filiaisGestaoInfo.error, despesasGestaoInfo.error, despesasResumoInfo.error]
    .some((erro) => /GESTAOIM_|não configurad/i.test(String(erro || "")));

  return (
    <>
      <PageHeader
        title="Dashboard de Resultados"
        sub="Meta, faturamento, ranking das filiais e impacto do investimento de marketing."
        action={<div className="flex flex-wrap gap-2">
          <Btn variant="outline" onClick={()=>{ void sincronizarGestao(false); setGestaoRefreshKey((x)=>x+1); }} disabled={gestaoSync==="loading" || filiaisGestaoSync==="loading" || despesasGestaoSync==="loading" || despesasResumoSync==="loading"}><RefreshCw className={`h-4 w-4 ${gestaoSync==="loading"||filiaisGestaoSync==="loading"||despesasGestaoSync==="loading"||despesasResumoSync==="loading"?"animate-spin":""}`}/>Sincronizar GestãoIM</Btn>
          <Link to="/vendas" className="inline-flex items-center gap-2 rounded-xl border border-white/10 px-3.5 py-2.5 text-sm font-bold hover:border-primary/30"><FileSpreadsheet className="h-4 w-4"/>Histórico</Link>
        </div>}
      />

      {gestaoNaoConfigurado ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-secondary/25 p-3">
          <div className="min-w-0">
            <div className="text-sm font-black">Dados de resultados</div>
            <div className="mt-0.5 text-xs text-muted-foreground">O BI está usando os dados já salvos e as importações do GestãoIM/Metabase. A conexão automática com o GestãoIM será reativada quando as credenciais deste ambiente forem vinculadas.</div>
          </div>
          <Badge tone="muted">INTEGRAÇÃO PENDENTE</Badge>
        </div>
      ) : (
        <div className={`mb-4 rounded-2xl border p-3 ${gestaoSync==="ok"?"border-success/20 bg-success/[.035]":gestaoSync==="error"?"border-warn/25 bg-warn/5":"border-white/7 bg-white/[.02]"}`}>
          <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <div><b>GestãoIM</b><span className="ml-2 text-muted-foreground">{gestaoSync==="ok"?"Conectado · resumo mensal automático":gestaoSync==="error"?"Não conectado nesta tentativa":"Verificando integração..."}</span></div>
            {gestaoAtualizadoEm && <span className="text-xs text-muted-foreground">Última sincronização: {new Date(gestaoAtualizadoEm).toLocaleString("pt-BR")}</span>}
          </div>
          {gestaoSync==="ok" && <p className="mt-1 text-xs text-muted-foreground">Meta e faturamento consolidados do mês usam o GestãoIM. A integração por filial também tenta atualizar automaticamente o ranking e o raio-X de cada loja.</p>}
          <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-white/7 pt-2 text-xs">
            <span className="font-bold">Metas e faturamento por filial:</span>
            {filiaisGestaoSync==="loading" && <span className="text-muted-foreground">sincronizando...</span>}
            {filiaisGestaoSync==="ok" && <>
              <Badge tone={filiaisGestaoInfo.completo ? "success" : "warn"}>{filiaisGestaoInfo.completo ? "30/30 · COMPLETO" : "PARCIAL"}</Badge>
              <span className="text-muted-foreground">{filiaisGestaoInfo.total}/{filiaisGestaoInfo.esperado || lojas.length} filial(is) atualizada(s)</span>
              {!!filiaisGestaoInfo.faltantes?.length && <span className="text-warn">Faltando: {filiaisGestaoInfo.faltantes.map((x)=>x.codigo).join(", ")}</span>}
            </>}
            {filiaisGestaoSync==="error" && <><Badge tone="warn">ROTA POR FILIAL NÃO LOCALIZADA</Badge><span className="text-muted-foreground">{filiaisGestaoInfo.error || "Ainda sem dados por filial."}</span></>}
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-white/7 pt-2 text-xs">
            <span className="font-bold">Despesas Marketing:</span>
            {despesasResumoSync==="loading" && <span className="text-muted-foreground">sincronizando resumo...</span>}
            {despesasResumoSync==="ok" && <><Badge tone="success">AUTOMÁTICO · {despesasResumoRange.rotulo.toUpperCase()}</Badge><span className="text-muted-foreground">{despesasResumoInfo.total} lançamento(s) · {brl(despesasResumoInfo.valorTotal)}</span></>}
            {despesasResumoSync==="error" && <><Badge tone="warn">RESUMO INDISPONÍVEL</Badge><span className="text-muted-foreground">{despesasResumoInfo.error || "Não foi possível ler o resumo de despesas agora."}</span></>}
          </div>
          {filiaisGestaoSync==="ok" && !filiaisGestaoInfo.completo && <div className="mt-2 rounded-xl border border-warn/20 bg-warn/[.045] p-3 text-xs text-muted-foreground">
            <b className="text-warn">Sincronização parcial da GestãoIM.</b> A Dashboard só usa valores reais recebidos. As filiais ausentes ficam sem Meta/Faturamento até a API da GestãoIM entregá-las. O BI agora continua procurando as lojas faltantes em vez de encerrar a busca ao encontrar apenas parte da rede.
          </div>}
        </div>

      )}
      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-2xl border border-primary/15 bg-primary/[.035] p-4">
        <div className="min-w-[240px] flex-1">
          <div className="font-display font-black">Importar Metas GestãoIM / Metabase</div>
          <p className="mt-1 text-xs text-muted-foreground">Exporte em XLSX ou CSV. O BI reconhece tanto o relatório do Metabase (C1, VR_META, VR_VENDA) quanto o export de Metas do GestãoIM (Nível, Nome, Meta, Vendido).</p>
        </div>
        <Field label="Data do relatório"><input type="date" className={inputCls} value={dataImportacao} onChange={(e)=>setDataImportacao(e.target.value)}/></Field>
        <Btn onClick={()=>uploadRef.current?.click()}><Upload className="h-4 w-4"/>Importar Metas</Btn>
        <input ref={uploadRef} type="file" accept=".xlsx,.xls,.csv" hidden onChange={(e)=>{const file=e.target.files?.[0];if(file)void importar(file);e.target.value="";}}/>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-3 rounded-2xl border border-white/7 bg-white/[.02] p-3">
        <div className="flex gap-1 rounded-xl border border-white/7 bg-black/10 p-1">
          {(["Dia","Mês","Ano"] as Periodo[]).map((p)=><button key={p} onClick={()=>setPeriodo(p)} className={`rounded-lg px-4 py-2 text-sm font-black transition ${periodo===p?"bg-primary text-primary-foreground":"text-muted-foreground hover:bg-white/[.05] hover:text-foreground"}`}>{p}</button>)}
        </div>
        {periodo==="Dia" && <Field label="Data"><input type="date" className={inputCls} value={referencia} onChange={(e)=>setReferencia(e.target.value)}/></Field>}
        {periodo==="Mês" && <Field label="Mês"><input type="month" className={inputCls} value={mes} onChange={(e)=>setReferencia(`${e.target.value}-01`)}/></Field>}
        {periodo==="Ano" && <Field label="Ano"><select className={inputCls} value={ano} onChange={(e)=>setReferencia(`${e.target.value}-01-01`)}>{[...new Set([ano,String(new Date().getFullYear()),...s.resultadosDiarios.map((r)=>r.data.slice(0,4))])].sort().reverse().map((x)=><option key={x}>{x}</option>)}</select></Field>}
        <div className="ml-auto text-xs text-muted-foreground"><CalendarDays className="mr-1 inline h-3.5 w-3.5"/>Período analisado: <b className="text-foreground">{tituloPeriodo}</b></div>
      </div>

      {semDados && <div className="mb-4 rounded-2xl border border-warn/25 bg-warn/5 p-4">
        <div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 text-warn"/><div><div className="font-bold">Aguardando dados por filial</div><p className="mt-1 text-sm text-muted-foreground">O consolidado do GestãoIM pode estar disponível mesmo quando a rota detalhada por filial ainda não foi localizada. O BI não inventa valores: ranking e raio-X só aparecem quando recebe Meta e Faturamento reais de cada loja.</p></div></div>
      </div>}

      {baseIncompleta && !usarFotografiaFiliais && <div className="mb-4 rounded-2xl border border-warn/25 bg-warn/5 p-4">
        <div className="flex items-start gap-3"><AlertTriangle className="mt-0.5 h-5 w-5 text-warn"/><div><div className="font-bold">O arquivo do Metabase é acumulado</div><p className="mt-1 text-sm text-muted-foreground">O BI salvou a fotografia do dia corretamente. Para calcular DIA e MÊS sem inventar valores, ele precisa também de uma fotografia anterior. O modo ANO já pode usar o acumulado atual; a partir dos próximos uploads diários, as diferenças passam a ser calculadas automaticamente.</p></div></div>
      </div>}


      {usarFotografiaFiliais && <div className="mb-4 rounded-2xl border border-primary/20 bg-primary/[.05] p-4">
        <div className="flex items-start gap-3">
          <FileSpreadsheet className="mt-0.5 h-5 w-5 text-primary"/>
          <div>
            <div className="font-bold">Filiais atualizadas pela última exportação do GestãoIM</div>
            <p className="mt-1 text-sm text-muted-foreground">O gráfico principal e o ranking abaixo usam diretamente Meta e Vendido de cada filial da fotografia de <b className="text-foreground">{dataFotografia.split("-").reverse().join("/")}</b>. Quando houver histórico de mais dias, o BI passa a montar a evolução diária/mensal sem inventar valores.</p>
          </div>
        </div>
      </div>}

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat accent label="Meta" value={metaTotal!=null?brl(metaTotal):"—"} hint={usarGestao?"GestãoIM · "+(gestaoSummary?.mes_rotulo || tituloPeriodo):tituloPeriodo} />
        <Stat label="Faturamento" value={faturamentoTotal!=null?brl(faturamentoTotal):"—"} hint={atingimento==null?"sem meta no período":`${atingimento.toFixed(1)}% da meta`} />
        <Stat label="% da meta" value={atingimento==null?"—":`${atingimento.toFixed(1)}%`} hint={atingimento==null?"aguardando dados":atingimento>=100?"meta atingida":"abaixo da meta"} />
        <Stat label={usarGestao&&numero(gestaoSummary?.projecao_fechamento)!=null?"Projeção de fechamento":"Diferença para meta"} value={usarGestao&&numero(gestaoSummary?.projecao_fechamento)!=null?brl(numero(gestaoSummary?.projecao_fechamento)!):metaTotal!=null&&faturamentoTotal!=null?brl(faturamentoTotal-metaTotal):"—"} hint={usarGestao&&numero(gestaoSummary?.projecao_pct)!=null?`${numero(gestaoSummary?.projecao_pct)!.toFixed(1)}% da meta`:metaTotal!=null&&faturamentoTotal!=null?(faturamentoTotal>=metaTotal?"acima da meta":"falta para atingir"):"sem base"} />
      </div>

      <Panel title={usarFotografiaFiliais ? `Meta x Realizado por filial · ${dataFotografia.split("-").reverse().join("/")}` : graficoConsolidadoGestao ? `Meta x Realizado · ${gestaoSummary?.mes_rotulo || tituloPeriodo}` : `Meta x Realizado · ${periodo}`} className="mt-4" action={<Badge tone="primary">GRÁFICO PRINCIPAL</Badge>}>
        <div className={periodo==="Dia" || usarFotografiaFiliais ? "overflow-x-auto" : ""}>
          <div className={periodo==="Dia" || usarFotografiaFiliais ? "h-[380px] min-w-[1650px]" : graficoConsolidadoGestao ? "h-[320px]" : "h-[360px]"}>
            <ResponsiveContainer>
              <BarChart data={graficoMeta} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
                <XAxis dataKey="eixo" fontSize={11}/>
                <YAxis fontSize={11} tickFormatter={(v)=>v>=1000000?`${(v/1000000).toFixed(1)}mi`:`${Math.round(v/1000)}k`}/>
                <Tooltip formatter={(v:number,name:string)=>[brl(v),name==="meta"?"Meta":"Realizado"]}/>
                <Legend formatter={(v)=>v==="meta"?"Meta":"Realizado"}/>
                <RBar dataKey="meta" name="meta" fill="var(--chart-2)" radius={[4,4,0,0]}/>
                <RBar dataKey="realizado" name="realizado" fill="var(--primary)" radius={[4,4,0,0]}/>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        {graficoConsolidadoGestao && <div className="mt-3 rounded-xl border border-success/15 bg-success/[.035] p-3 text-xs text-muted-foreground">
          <b className="text-foreground">Leitura do mês:</b> este gráfico usa os valores reais recebidos automaticamente do GestãoIM: <b className="text-foreground">{brl(metaTotal!)}</b> de meta e <b className="text-foreground">{brl(faturamentoTotal!)}</b> realizado até agora. O detalhamento por dia só aparece quando o BI recebe a série diária; enquanto isso, ele não distribui o faturamento artificialmente pelos dias.
        </div>}
        {(periodo==="Dia" || usarFotografiaFiliais) && <p className="mt-2 text-xs text-muted-foreground">{usarFotografiaFiliais ? "Cada par de barras representa uma filial da última fotografia importada: Meta x Vendido." : "No modo Dia, o eixo mostra todas as filiais para comparar rapidamente meta e faturamento de cada loja."}</p>}
      </Panel>

      <Panel
        title="Filiais que precisam de atenção"
        className="mt-4"
        action={<div className="flex flex-wrap items-center gap-2">
          <Badge tone="primary">{rankingExibido.filter((x)=>(x.percentual ?? 999)<100).length} abaixo da meta</Badge>
          <select
            className={`${inputCls} w-auto min-w-[210px] py-2 text-xs font-bold`}
            value={rankingFiltro}
            onChange={(e)=>setRankingFiltro(e.target.value as RankingFiltro)}
            aria-label="Filtro do ranking de filiais"
          >
            <option value="nao_bateram">Não bateram a meta · pior primeiro</option>
            <option value="percentual">Pior % da meta</option>
            <option value="faturamento">Menor faturamento</option>
            <option value="distancia">Maior valor faltante</option>
          </select>
        </div>}
      >
        <div className="mb-3 rounded-xl border border-primary/15 bg-primary/[.035] p-3 text-xs text-muted-foreground">
          <b className="text-foreground">Leitura do ranking:</b> o padrão mostra somente filiais abaixo de 100% da meta, começando pela pior performance. Assim a primeira loja da lista é a que exige atenção mais urgente no período selecionado.
        </div>

        {!rankingTemDados && usarGestao && <div className="mb-4 rounded-xl border border-warn/25 bg-warn/[.05] p-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warn"/>
              <div>
                <div className="text-sm font-bold">O total da rede está atualizado, mas o GestãoIM ainda não entregou o detalhamento por filial nesta integração.</div>
                <p className="mt-1 text-xs text-muted-foreground">Para o ranking mostrar Meta, Faturamento e % de cada loja sem inventar dados, importe o relatório por filial do GestãoIM. Depois do primeiro upload, a fotografia fica salva no BI deste navegador e o ranking atualiza imediatamente.</p>
              </div>
            </div>
            <Btn variant="outline" onClick={()=>uploadRef.current?.click()}><Upload className="h-4 w-4"/>Atualizar filiais</Btn>
          </div>
        </div>}

        <div className="max-h-[520px] overflow-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="sticky top-0 bg-card text-left text-[10px] font-black uppercase tracking-[.1em] text-muted-foreground">
              <tr><th className="py-2">Ranking</th><th>Filial</th><th>Meta</th><th>Faturamento</th><th>% da meta</th><th>Falta p/ meta</th><th>Situação</th></tr>
            </thead>
            <tbody>{rankingExibido.map((x,i)=><tr key={x.id} className={`border-t border-white/7 ${i===0&&rankingFiltro==="nao_bateram"?"bg-primary/[.045]":""}`}>
              <td className="py-2">
                <div className="flex items-center gap-2">
                  <span className={`grid h-7 w-7 place-items-center rounded-full text-xs font-black ${i===0?"bg-primary text-primary-foreground":"bg-muted text-foreground"}`}>{i+1}º</span>
                  {i===0&&rankingFiltro==="nao_bateram"&&<Badge tone="primary">MAIOR ATENÇÃO</Badge>}
                </div>
              </td>
              <td><b>{x.codigo}</b> · {x.nome}</td>
              <td>{x.meta!=null?brl(x.meta):"—"}</td>
              <td className="font-bold">{x.faturamento!=null?brl(x.faturamento):"—"}</td>
              <td><b className={x.percentual==null?"text-muted-foreground":x.percentual<80?"text-primary":x.percentual<100?"text-warn":"text-success"}>{x.percentual==null?"Sem meta":`${x.percentual.toFixed(1)}%`}</b></td>
              <td><b className={x.faltaMeta>0?"text-primary":"text-success"}>{x.faltaMeta>0?brl(x.faltaMeta):"Meta atingida"}</b></td>
              <td>{x.percentual==null?<Badge tone="muted">Sem dados</Badge>:x.percentual<80?<Badge tone="primary">Crítico</Badge>:x.percentual<100?<Badge tone="warn">Atenção</Badge>:<Badge tone="success">Meta atingida</Badge>}</td>
            </tr>)}</tbody>
          </table>

          {!rankingExibido.length && rankingTemDados && <div className="p-8 text-center">
            <CheckCircle2 className="mx-auto h-8 w-8 text-success"/>
            <div className="mt-2 font-display font-black">Nenhuma filial nesse filtro</div>
            <p className="mt-1 text-sm text-muted-foreground">{rankingFiltro==="nao_bateram"?"Todas as filiais com dados disponíveis atingiram a meta neste período.":"Troque o filtro para visualizar outra classificação."}</p>
          </div>}
        </div>
      </Panel>

      <Panel
        title="Despesas Marketing · GestãoIM"
        className="mt-4"
        action={<div className="flex gap-1 rounded-xl border border-white/7 p-1">{(["Filial","Categoria"] as const).map((v)=><button key={v} onClick={()=>setVisaoDespesas(v)} className={`rounded-lg px-3 py-1.5 text-xs font-black ${visaoDespesas===v?"bg-primary text-primary-foreground":"text-muted-foreground hover:bg-white/[.05]"}`}>Por {v.toLowerCase()}</button>)}</div>}
      >
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {([
            ["mes","Este mês"],
            ["mes_passado","Mês passado"],
            ["90","Últimos 90 dias"],
            ["tudo","Tudo"],
          ] as [PeriodoDespesasResumo,string][]).map(([k,label])=><button
            key={k}
            onClick={()=>setPeriodoDespesasResumo(k)}
            className={`rounded-xl border px-3 py-2 text-xs font-black transition ${periodoDespesasResumo===k?"border-primary bg-primary text-primary-foreground":"border-white/8 text-muted-foreground hover:border-primary/30 hover:text-foreground"}`}
          >{label}</button>)}
          <div className="ml-auto text-xs text-muted-foreground">
            {despesasResumoSync==="loading"
              ? "Atualizando GestãoIM..."
              : `${despesasResumoRange.de.split("-").reverse().join("/")} até ${despesasResumoRange.ate.split("-").reverse().join("/")}`}
          </div>
        </div>

        {despesasResumoGestao.length ? <>
          <div className="grid gap-3 md:grid-cols-3">
            <Stat accent label="Total no período" value={brl(valorDespesasResumo)} hint={`${despesasResumoGestao.length} lançamento(s)`} />
            <Stat label="Filiais com gasto" value={String(filiaisComGastoGestao)} hint={despesasPorFilial[0] ? `maior: ${despesasPorFilial[0].codigo}` : "—"} />
            <Stat label="Média por lançamento" value={brl(mediaLancamentoGestao)} hint={despesasResumoRange.rotulo} />
          </div>

          <div className="mt-4 max-h-[620px] overflow-auto">
            {visaoDespesas==="Filial" ? <table className="w-full min-w-[760px] text-sm">
              <thead className="sticky top-0 bg-card"><tr className="border-b text-left text-[10px] font-black uppercase tracking-[.1em] text-muted-foreground"><th className="pb-2">Filial</th><th>Lançamentos</th><th>% do total</th><th className="text-right">Valor</th></tr></thead>
              <tbody>{despesasPorFilial.map((x)=><tr key={x.id} className="border-b border-white/7 last:border-0">
                <td className="py-2.5"><b>{x.codigo}</b> · {x.nome}</td>
                <td>{x.lancamentos}</td>
                <td><div className="flex min-w-[180px] items-center gap-2"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/7"><div className="h-full rounded-full bg-success" style={{width:`${valorDespesasResumo ? Math.max(1,(x.valor/valorDespesasResumo)*100) : 0}%`}}/></div><b className="w-14 text-right text-xs">{valorDespesasResumo ? ((x.valor/valorDespesasResumo)*100).toFixed(1) : "0.0"}%</b></div></td>
                <td className="text-right font-black">{brl(x.valor)}</td>
              </tr>)}</tbody>
            </table> : <table className="w-full min-w-[680px] text-sm">
              <thead className="sticky top-0 bg-card"><tr className="border-b text-left text-[10px] font-black uppercase tracking-[.1em] text-muted-foreground"><th className="pb-2">Categoria</th><th>Lançamentos</th><th>% do total</th><th className="text-right">Valor</th></tr></thead>
              <tbody>{despesasPorCategoria.map((x)=><tr key={x.nome} className="border-b border-white/7 last:border-0">
                <td className="py-2.5 font-bold">{x.nome}</td>
                <td>{x.lancamentos}</td>
                <td><div className="flex min-w-[180px] items-center gap-2"><div className="h-1.5 flex-1 overflow-hidden rounded-full bg-white/7"><div className="h-full rounded-full bg-primary" style={{width:`${valorDespesasResumo ? Math.max(1,(x.valor/valorDespesasResumo)*100) : 0}%`}}/></div><b className="w-14 text-right text-xs">{valorDespesasResumo ? ((x.valor/valorDespesasResumo)*100).toFixed(1) : "0.0"}%</b></div></td>
                <td className="text-right font-black">{brl(x.valor)}</td>
              </tr>)}</tbody>
            </table>}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-success/15 bg-success/[.035] p-3 text-xs text-muted-foreground">
            <span><b className="text-foreground">Fonte:</b> Resumo de Despesas do GestãoIM · filtro {despesasResumoRange.rotulo}. Este bloco é independente do filtro de faturamento da Dashboard.</span>
            {despesasResumoInfo.fetchedAt && <span>Atualizado: {new Date(despesasResumoInfo.fetchedAt).toLocaleString("pt-BR")}</span>}
          </div>
        </> : <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center">
          <WalletCards className="mx-auto h-8 w-8 text-muted-foreground/50"/>
          <div className="mt-2 font-display font-black">{despesasResumoSync==="loading" ? "Atualizando resumo de despesas..." : "Nenhuma despesa encontrada no período"}</div>
          <p className="mx-auto mt-1 max-w-2xl text-sm text-muted-foreground">{despesasResumoSync==="error" ? (despesasResumoInfo.error || "Não foi possível ler o resumo do GestãoIM agora.") : `Filtro: ${despesasResumoRange.rotulo}`}</p>
        </div>}
      </Panel>

      <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat accent label="Valor investido" value={brl(valorInvestido)} hint="gasto real do Centro de Custos" />
        <Stat label="Investido x faturado" value={relacaoInvestido==null?"—":`${relacaoInvestido.toFixed(2)}%`} hint={faturamentoTotal?"percentual do faturamento":"sem faturamento no período"} />
        <Stat label="Dias/meses sem propaganda" value={String(pontosSemInvestimento.length)} hint={periodo==="Dia"?"nos últimos 7 dias":periodo==="Mês"?"dias sem investimento":"meses sem investimento"} />
        <Stat label="Semanas sem propaganda" value={periodo==="Mês"?String(semanasSemInvestimento):"—"} hint={periodo==="Mês"?"blocos de 7 dias com R$ 0":"visível no modo Mês"} />
      </div>

      <Panel title="Faturamento x investimento de marketing" className="mt-4" action={<div className="flex gap-1 rounded-xl border border-white/7 p-1">{(["Consolidado","Por propaganda"] as VisaoInvestimento[]).map((v)=><button key={v} onClick={()=>setVisaoInvest(v)} className={`rounded-lg px-3 py-1.5 text-xs font-black ${visaoInvest===v?"bg-primary text-primary-foreground":"text-muted-foreground hover:bg-white/[.05]"}`}>{v}</button>)}</div>}>
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs">
          {periodo==="Mês" && vendasDiariasGestaoSync==="loading" && <Badge tone="muted">Carregando faturamento diário...</Badge>}
          {periodo==="Mês" && vendasDiariasGestaoSync==="ok" && <><Badge tone="success">FATURAMENTO DIÁRIO · GESTÃOIM</Badge><span className="text-muted-foreground">{vendasDiariasGestaoInfo.loadedDays}/{vendasDiariasGestaoInfo.totalDays} dia(s) carregado(s)</span></>}
          {periodo==="Mês" && vendasDiariasGestaoSync==="error" && <><Badge tone="warn">SÉRIE DIÁRIA INDISPONÍVEL</Badge><span className="text-muted-foreground">usando a base local disponível</span></>}
          <span className="ml-auto text-muted-foreground">Eixo esquerdo: faturamento · eixo direito: investimento</span>
        </div>

        <div className="h-[380px]">
          <ResponsiveContainer>
            <LineChart data={timeline} margin={{top:8,right:8,left:8,bottom:0}}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
              <XAxis dataKey="eixo" fontSize={11}/>
              <YAxis yAxisId="fat" width={72} domain={[0,"auto"]} fontSize={10} tickFormatter={(v)=>v===0?"0":v>=1000000?`${(v/1000000).toFixed(1)}mi`:v>=1000?`${Math.round(v/1000)}k`:String(Math.round(v))}/>
              <YAxis yAxisId="inv" width={66} domain={[0,"auto"]} orientation="right" fontSize={10} tickFormatter={(v)=>v===0?"0":v>=1000?`${Math.round(v/1000)}k`:String(Math.round(v))}/>
              <Tooltip formatter={(v:number,name:string)=>[brl(Number(v||0)),name]}/>
              <Legend/>
              <Line yAxisId="fat" type="monotone" dataKey="faturado" name="Faturamento" stroke="var(--chart-2)" strokeWidth={3} dot={{r:2}} activeDot={{r:5}} connectNulls={false}/>
              {visaoInvest==="Consolidado"
                ? <Line yAxisId="inv" type="monotone" dataKey="investido" name="Investimento" stroke="var(--primary)" strokeWidth={3} dot={{r:3}} activeDot={{r:5}} connectNulls={false}/>
                : categoriasInvest.map((cat,i)=><Line key={cat} yAxisId="inv" type="monotone" dataKey={cat} name={cat} stroke={PALETA[i%PALETA.length]} strokeWidth={2.5} dot={{r:2}} connectNulls={false}/>)}
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="mt-3 rounded-xl border border-white/7 bg-white/[.02] p-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <Megaphone className="h-4 w-4 text-primary"/>
            <b>Leitura estratégica:</b>
            <span className="text-muted-foreground">{periodo==="Mês" && vendasDiariasGestaoSync==="ok"
              ? "o faturamento de cada dia vem diretamente do GestãoIM e é cruzado com as despesas registradas naquele mesmo dia. Dias futuros ficam sem faturamento, em vez de aparecerem como zero."
              : "o gráfico usa apenas os dados disponíveis no período e não distribui artificialmente o faturamento pelos dias."}</span>
          </div>
          {!!pontosSemInvestimento.length && <div className="mt-2 flex flex-wrap gap-1.5">{pontosSemInvestimento.slice(0,18).map((x,i)=><Badge key={`${x.eixo}-${i}`} tone="muted">Vendeu sem investimento · {x.eixo}</Badge>)}{pontosSemInvestimento.length>18&&<Badge tone="muted">+{pontosSemInvestimento.length-18}</Badge>}</div>}
        </div>
      </Panel>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
        <QuickLink to="/filiais" label="Abrir filiais" text="Detalhe de meta, faturamento e investimento por loja." icon={TrendingDown}/>
        <QuickLink to="/centro-custos" label="Centro de Custos" text="Confira de onde veio cada valor investido." icon={WalletCards}/>
        <QuickLink to="/trafego-pago" label="Propagandas" text="Cruze a evolução com tráfego, influencers e demais ações." icon={TrendingUp}/>
      </div>
    </>
  );
}

function QuickLink({to,label,text,icon:Icon}:{to:string;label:string;text:string;icon:any}) {
  return <Link to={to} className="group rounded-2xl border border-white/7 bg-white/[.025] p-4 transition hover:border-primary/30 hover:bg-white/[.05]">
    <div className="flex items-start justify-between gap-3"><div><div className="font-display font-black">{label}</div><p className="mt-1 text-sm text-muted-foreground">{text}</p></div><ArrowUpRight className="h-4 w-4 text-muted-foreground transition group-hover:text-primary"/></div>
  </Link>;
}