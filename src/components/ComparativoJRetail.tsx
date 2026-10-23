import { useMemo, useState } from "react";
import { useApp, brl } from "@/lib/store";

type Granularidade = "dia" | "mes" | "ano";
type Dado = { valor: number; origem: string; valido: boolean };

function limites(tipo: Granularidade, periodo: string) {
  if (tipo === "dia" && /^\d{4}-\d{2}-\d{2}$/.test(periodo)) return { inicio: periodo, fim: periodo };
  if (tipo === "mes" && /^\d{4}-\d{2}$/.test(periodo)) {
    const [ano, mes] = periodo.split("-").map(Number);
    return { inicio: periodo + "-01", fim: `${periodo}-${new Date(ano, mes, 0).getDate()}` };
  }
  if (tipo === "ano" && /^\d{4}$/.test(periodo)) return { inicio: periodo + "-01-01", fim: periodo + "-12-31" };
  return null;
}

export function ComparativoJRetail() {
  const { s } = useApp();
  const [tipo, setTipo] = useState<Granularidade>("dia");
  const [periodoA, setPeriodoA] = useState("");
  const [periodoB, setPeriodoB] = useState("");
  const [filialId, setFilialId] = useState("todas");
  const filiais = useMemo(() => s.filiais.filter(f => !f.isCD), [s.filiais]);
  const codigos = useMemo(() => new Set(filiais.filter(f => filialId === "todas" || f.id === filialId).map(f => String(f.codigo).padStart(2, "0"))), [filiais, filialId]);
  const ids = useMemo(() => new Set(filiais.filter(f => filialId === "todas" || f.id === filialId).map(f => f.id)), [filiais, filialId]);
  const analisar = (periodo: string): Dado => {
    const faixa = limites(tipo, periodo);
    if (!faixa) return { valor: 0, origem: "Selecione um período", valido: false };
    const lotes = (s.jretailLotes || []).filter(l => l.tipo === "vendas" && l.inicio === faixa.inicio && l.fim === faixa.fim);
    if (lotes.length === 1) {
      return { valor: lotes[0].linhas.filter(l => codigos.has(l.codigo)).reduce((sum, l) => sum + l.vendas, 0), origem: "JRetail · período exato", valido: true };
    }
    if (lotes.length > 1) return { valor: 0, origem: "Há relatórios sobrepostos: escolha uma fonte", valido: false };
    if (tipo === "dia") {
      const dados = s.resultadosDiarios.filter(r => r.data === faixa.inicio && ids.has(r.filialId));
      if (dados.length > 0) {
        return { valor: dados.reduce((sum, r) => sum + r.faturamento, 0), origem: "Fotografia acumulada até o dia (não é venda diária)", valido: true };
      }
    }
    return { valor: 0, origem: "Sem dados consolidados para o período exato", valido: false };
  };
  const a = analisar(periodoA);
  const b = analisar(periodoB);
  const comparavel = a.valido && b.valido && a.origem === b.origem && periodoA !== periodoB;
  const diferenca = b.valor - a.valor;
  const percentual = a.valor !== 0 ? (diferenca / Math.abs(a.valor)) * 100 : null;
  const campo = (rotulo: string, valor: string, alterar: (v: string) => void) => <label className="flex flex-col gap-1 text-xs font-medium">{rotulo}<input className="rounded-lg border border-border bg-background px-3 py-2 text-sm" aria-label={rotulo} type={tipo === "dia" ? "date" : tipo === "mes" ? "month" : "number"} min={tipo === "ano" ? 2020 : undefined} max={tipo === "ano" ? 2100 : undefined} placeholder={tipo === "ano" ? "2026" : undefined} value={valor} onChange={e => alterar(e.target.value)} /></label>;
  return <section className="mt-4 rounded-xl border border-border p-4">
    <h3 className="font-bold">Comparar períodos JRetail</h3>
    <p className="mt-1 text-xs text-muted-foreground">Compare dias, meses ou anos escolhidos manualmente. Só usamos relatórios de período exato ou fotografias acumuladas de mesma natureza. Nunca somamos intervalos sobrepostos.</p>
    <div className="mt-4 grid gap-3 md:grid-cols-4">
      <label className="flex flex-col gap-1 text-xs font-medium">Visualização<select className="rounded-lg border border-border bg-background px-3 py-2 text-sm" value={tipo} onChange={e=>{setTipo(e.target.value as Granularidade);setPeriodoA("");setPeriodoB("");}}><option value="dia">Dia</option><option value="mes">Mês</option><option value="ano">Ano</option></select></label>
      <label className="flex flex-col gap-1 text-xs font-medium">Filial<select className="rounded-lg border border-border bg-background px-3 py-2 text-sm" value={filialId} onChange={e=>setFilialId(e.target.value)}><option value="todas">30 filiais ativas</option>{filiais.map(f=><option key={f.id} value={f.id}>{f.codigo} - {f.nome}</option>)}</select></label>
      {campo("Período A", periodoA, setPeriodoA)}
      {campo("Período B", periodoB, setPeriodoB)}
    </div>
    <div className="mt-4 grid gap-3 sm:grid-cols-2">
      {[{titulo:"Período A", periodo:periodoA, dado:a},{titulo:"Período B", periodo:periodoB,dado:b}].map(item=><div key={item.titulo} className="rounded-lg border border-border p-3"><div className="text-xs text-muted-foreground">{item.titulo} · {item.periodo || "—"}</div><div className="mt-1 text-xl font-bold">{item.dado.valido ? brl(item.dado.valor) : "—"}</div><div className="mt-1 text-xs text-muted-foreground">{item.dado.origem}</div></div>)}
    </div>
    {comparavel ? <div className="mt-3 rounded-lg border border-border p-3 text-sm"><strong>Diferença: {brl(diferenca)}</strong> · {percentual === null ? "Percentual indisponível (base zero)" : `${percentual >= 0 ? "+" : ""}${percentual.toFixed(1)}%`}<p className="mt-1 text-xs text-muted-foreground">{tipo === "dia" && a.origem.startsWith("Fotografia") ? "Comparação de totais acumulados até cada data; a diferença não equivale necessariamente à venda de um dia." : "Comparação entre os períodos selecionados."}</p></div> : <p className="mt-3 text-xs text-muted-foreground">Para calcular a diferença, selecione dois períodos distintos com dados da mesma origem e natureza.</p>}
  </section>;
}
