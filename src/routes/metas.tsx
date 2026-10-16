import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CalendarRange, Lightbulb, Plus, Sparkles, TrendingUp, Trash2 } from "lucide-react";
import { useApp, uid, num, fmtDate, brl } from "@/lib/store";
import { somaRedePeriodo } from "@/lib/resultados-analytics";
import { PageHeader, Panel, Btn, Modal, Field, inputCls, Bar, Badge, Stat, pageHead } from "@/components/kit";

export const Route = createFileRoute("/metas")({
  head: pageHead("Metas", "Acompanhe metas e receba sugestões com base no faturamento e sazonalidade."),
  component: Page,
});

const SAZONALIDADE = [
  { mes: 1, nome: "Janeiro", fator: 0.92, ideias: "Liquidação, renovação da casa, férias e queima de estoque." },
  { mes: 2, nome: "Fevereiro", fator: 0.90, ideias: "Volta à rotina, Carnaval e ofertas de oportunidade." },
  { mes: 3, nome: "Março", fator: 1.03, ideias: "Mês do Consumidor, condições comerciais e giro de estoque." },
  { mes: 4, nome: "Abril", fator: 1.00, ideias: "Páscoa, organização da casa e campanhas de categoria." },
  { mes: 5, nome: "Maio", fator: 1.12, ideias: "Dia das Mães, casa, conforto, presentes e linha branca." },
  { mes: 6, nome: "Junho", fator: 1.08, ideias: "Dia dos Namorados, inverno, colchões, estofados e aconchego." },
  { mes: 7, nome: "Julho", fator: 0.98, ideias: "Férias, limpa estoque e campanhas de oportunidade." },
  { mes: 8, nome: "Agosto", fator: 1.08, ideias: "Dia dos Pais, tecnologia, móveis e ofertas de ticket médio." },
  { mes: 9, nome: "Setembro", fator: 1.02, ideias: "Primavera, renovação da casa e preparação para o último trimestre." },
  { mes: 10, nome: "Outubro", fator: 1.12, ideias: "Dia das Crianças, aniversário da rede e antecipação de compras." },
  { mes: 11, nome: "Novembro", fator: 1.35, ideias: "Black Friday, Black November, alto volume e campanhas agressivas." },
  { mes: 12, nome: "Dezembro", fator: 1.32, ideias: "Natal, 13º salário, presentes, casa nova e fechamento do ano." },
] as const;

function monthBounds(chave: string) {
  const [y,m] = chave.split("-").map(Number);
  const ultimo = new Date(y,m,0).getDate();
  return { inicio: `${chave}-01`, fim: `${chave}-${String(ultimo).padStart(2,"0")}` };
}

function shiftMonth(chave: string, delta: number) {
  const [y,m] = chave.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
}

function Page() {
  const { s, set } = useApp();
  const hoje = new Date();
  const atualMes = `${hoje.getFullYear()}-${String(hoje.getMonth()+1).padStart(2,"0")}`;
  const [mesSugestao, setMesSugestao] = useState(atualMes);
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ titulo: "", alvo: 100, atual: 0, unidade: "R$", prazo: "" });

  const idsLojas = useMemo(() => s.filiais.filter((x)=>!x.isCD).map((x)=>x.id), [s.filiais]);

  const historico = useMemo(() => {
    const meses = [-3,-2,-1].map((delta) => shiftMonth(mesSugestao, delta));
    return meses.map((mes) => {
      const { inicio, fim } = monthBounds(mes);
      const v = somaRedePeriodo(s.resultadosDiarios, idsLojas, inicio, fim);
      return { mes, faturamento: v.faturamento, meta: v.meta, completo: v.baseCompleta };
    });
  }, [mesSugestao, s.resultadosDiarios, idsLojas]);

  const baseHistorica = useMemo(() => {
    const vals = historico.map((x)=>x.faturamento).filter((x): x is number => typeof x === "number" && x > 0);
    if (vals.length) return vals.reduce((a,b)=>a+b,0) / vals.length;

    const snapshots = s.resultadosDiarios
      .filter((r)=>r.modo==="acumulado")
      .sort((a,b)=>b.data.localeCompare(a.data));
    if (!snapshots.length) return null;
    const data = snapshots[0].data;
    const ultimos = snapshots.filter((r)=>r.data===data);
    const total = ultimos.reduce((a,r)=>a+r.faturamento,0);
    return total > 0 ? total : null;
  }, [historico, s.resultadosDiarios]);

  const sazonal = SAZONALIDADE[Number(mesSugestao.slice(5,7))-1];
  const sugestoes = useMemo(() => {
    if (!baseHistorica) return [];
    const saz = baseHistorica * sazonal.fator;
    return [
      { nome:"Conservadora", percentual:-0.04, valor:Math.round(saz*0.96), texto:"Protege a operação em um cenário de menor ritmo." },
      { nome:"Recomendada", percentual:0, valor:Math.round(saz), texto:"Combina a média recente com o fator sazonal do mês." },
      { nome:"Agressiva", percentual:0.08, valor:Math.round(saz*1.08), texto:"Pressiona crescimento quando campanha e verba suportarem." },
    ];
  }, [baseHistorica, sazonal]);

  const usarSugestao = (valor: number, nome: string) => {
    const [y,m] = mesSugestao.split("-").map(Number);
    const ultimo = new Date(y,m,0).getDate();
    setF({
      titulo: `Meta de vendas · ${sazonal.nome}/${y} · ${nome}`,
      alvo: valor,
      atual: 0,
      unidade: "R$",
      prazo: `${mesSugestao}-${String(ultimo).padStart(2,"0")}`,
    });
    setOpen(true);
  };

  return (
    <>
      <PageHeader
        title="Metas"
        sub="Metas cadastradas + sugestões orientativas com base no faturamento disponível e na sazonalidade."
        action={<Btn onClick={() => setOpen(true)}><Plus className="h-4 w-4" />Adicionar meta</Btn>}
      />

      <Panel className="mb-4" title="Sugestão inteligente de meta" action={<Sparkles className="h-4 w-4 text-primary"/>}>
        <div className="grid gap-4 lg:grid-cols-[260px_1fr]">
          <div className="space-y-3">
            <Field label="Mês para planejar">
              <input type="month" className={inputCls} value={mesSugestao} onChange={(e)=>setMesSugestao(e.target.value)} />
            </Field>
            <div className="rounded-2xl border border-primary/15 bg-primary/[.04] p-4">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.12em] text-primary"><CalendarRange className="h-4 w-4"/>{sazonal.nome}</div>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{sazonal.ideias}</p>
              <div className="mt-3 text-[10px] leading-relaxed text-muted-foreground">Fator sazonal interno orientativo: <b className="text-foreground">{sazonal.fator.toLocaleString("pt-BR",{style:"percent",minimumFractionDigits:0,maximumFractionDigits:0})}</b>. Ele não substitui previsão financeira nem histórico completo.</div>
            </div>
          </div>

          <div>
            <div className="mb-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <Stat label="Base histórica" value={baseHistorica ? brl(baseHistorica) : "—"} hint={historico.some((x)=>x.faturamento!=null) ? "média dos meses disponíveis" : "aguardando histórico"} />
              {historico.map((h) => <Stat key={h.mes} label={h.mes.split("-").reverse().join("/")} value={h.faturamento!=null?brl(h.faturamento):"—"} hint={h.faturamento==null?"sem base":h.completo?"base completa":"base parcial"} />)}
            </div>

            {sugestoes.length ? <div className="grid gap-3 md:grid-cols-3">
              {sugestoes.map((x,i)=><div key={x.nome} className={`rounded-2xl border p-4 ${i===1?"border-primary/35 bg-primary/[.06]":"border-white/8 bg-white/[.02]"}`}>
                <div className="flex items-center justify-between gap-2">
                  <div className="font-display font-black">{x.nome}</div>
                  {i===1&&<Badge tone="primary">SUGESTÃO</Badge>}
                </div>
                <div className="mt-3 font-display text-2xl font-black">{brl(x.valor)}</div>
                <p className="mt-2 min-h-10 text-xs leading-relaxed text-muted-foreground">{x.texto}</p>
                <Btn variant={i===1?"primary":"outline"} className="mt-4 w-full" onClick={()=>usarSugestao(x.valor,x.nome)}><TrendingUp className="h-4 w-4"/>Usar esta meta</Btn>
              </div>)}
            </div> : <div className="grid min-h-48 place-items-center rounded-2xl border border-dashed border-white/10 p-6 text-center">
              <div><Lightbulb className="mx-auto h-8 w-8 text-muted-foreground/50"/><div className="mt-2 font-bold">Ainda não há faturamento suficiente para sugerir um valor</div><p className="mt-1 text-sm text-muted-foreground">Assim que o dashboard tiver faturamentos importados, as sugestões passam a ser calculadas automaticamente.</p></div>
            </div>}
          </div>
        </div>
      </Panel>

      <div className="grid gap-4 md:grid-cols-2">
        {s.metas.map((m) => {
          const pct = m.alvo > 0 ? Math.round((m.atual / m.alvo) * 100) : 0;
          return (
            <Panel key={m.id}>
              <div className="flex items-start justify-between gap-2">
                <div><div className="font-display font-bold">{m.titulo}</div><div className="text-xs text-muted-foreground">Prazo {fmtDate(m.prazo)}</div></div>
                <button aria-label="Excluir" onClick={() => set((st) => ({ ...st, metas: st.metas.filter((x) => x.id !== m.id) }))} className="text-muted-foreground hover:text-primary"><Trash2 className="h-4 w-4" /></button>
              </div>
              <div className="my-3 font-display text-3xl font-bold text-primary">{pct}%</div>
              <Bar value={pct} />
              <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                <span className="text-muted-foreground">Atual</span>
                <input type="number" className={`${inputCls} w-40`} value={m.atual} onChange={(e) => set((st) => ({ ...st, metas: st.metas.map((x) => x.id === m.id ? { ...x, atual: +e.target.value } : x) }))} />
                <span className="text-muted-foreground">de {m.unidade === "R$" ? "R$ " : ""}{num(m.alvo)} {m.unidade !== "R$" ? m.unidade : ""}</span>
              </div>
            </Panel>
          );
        })}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Adicionar meta">
        <div className="space-y-3">
          <Field label="Título"><input className={inputCls} value={f.titulo} onChange={(e) => setF({ ...f, titulo: e.target.value })} /></Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Alvo"><input type="number" className={inputCls} value={f.alvo} onChange={(e) => setF({ ...f, alvo: +e.target.value })} /></Field>
            <Field label="Atual"><input type="number" className={inputCls} value={f.atual} onChange={(e) => setF({ ...f, atual: +e.target.value })} /></Field>
            <Field label="Unidade"><input className={inputCls} value={f.unidade} onChange={(e) => setF({ ...f, unidade: e.target.value })} /></Field>
          </div>
          <Field label="Prazo"><input type="date" className={inputCls} value={f.prazo} onChange={(e) => setF({ ...f, prazo: e.target.value })} /></Field>
          <Btn className="w-full" disabled={!f.titulo || !f.alvo} onClick={() => {
            set((st) => ({ ...st, metas: [...st.metas, { id: uid(), ...f }] }));
            setOpen(false);
            setF({ titulo: "", alvo: 100, atual: 0, unidade: "R$", prazo: "" });
          }}>Salvar meta</Btn>
        </div>
      </Modal>
    </>
  );
}