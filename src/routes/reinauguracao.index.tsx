import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Calendar, AlertTriangle, ListTodo, DollarSign, Trophy, Trash2 } from "lucide-react";
import { useApp, uid, fmtDate, defaultCards, brl, excluirReinauguracaoEmCascata } from "@/lib/store";
import { PageHeader, Btn, Modal, Field, inputCls, Badge, Bar, Panel, Stat, pageHead } from "@/components/kit";
import { resumo, CoresResponsaveis } from "@/components/reinauguracao-utils";

export const Route = createFileRoute("/reinauguracao/")({
  head: pageHead("Reinaugurações", "Reinaugurações por cidade e filial com progresso, custos e resultado financeiro."),
  component: Page,
});

function Page() {
  const { s, set } = useApp();
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [nf, setNf] = useState({ filialId: "f02", data: "" });
  const podeExcluir = s.perfil !== "Influencer";

  const excluirCidade = (reinauguracaoId:string, nome:string) => {
    if(!podeExcluir) return;
    if(!confirm(`Excluir a reinauguração de ${nome}? O quadro, custos vinculados e atividades originadas dela serão removidos.`)) return;
    set((st)=>excluirReinauguracaoEmCascata(st,reinauguracaoId));
  };

  const lista = [...s.reinauguracoes].sort((a, b) => (a.data || "9999").localeCompare(b.data || "9999"));

  const financeiro = useMemo(() => lista.map((r) => {
    const f = s.filiais.find((x) => x.id === r.filialId);
    const custo = s.custos.filter((c) => c.reinauguracaoId === r.id).reduce((a,c) => a + c.valor, 0);
    const faturamento = r.faturamentoFinal || 0;
    const retornoBruto = faturamento - custo;
    const roasEvento = custo > 0 && faturamento > 0 ? faturamento / custo : 0;
    return { id: r.id, filial: f, custo, faturamento, retornoBruto, roasEvento };
  }), [lista, s.custos, s.filiais]);

  const comparaveis = financeiro.filter((x) => x.faturamento > 0).sort((a,b) => b.faturamento - a.faturamento);
  const custoTotal = financeiro.reduce((a,x) => a + x.custo, 0);
  const faturamentoTotal = financeiro.reduce((a,x) => a + x.faturamento, 0);
  const melhorVenda = comparaveis[0];

  return (
    <>
      <PageHeader
        title="Reinaugurações"
        sub={`${lista.length} cidades cadastradas · planejamento, custos e resultado de cada ação`}
        action={<div className="flex flex-wrap gap-2"><CoresResponsaveis /><Btn onClick={() => setOpen(true)}><Plus className="h-4 w-4" />Nova reinauguração</Btn></div>}
      />

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Reinaugurações" value={String(lista.length)} hint="cidades cadastradas" />
        <Stat label="Custo total" value={brl(custoTotal)} hint="custos vinculados às reinaugurações" />
        <Stat accent label="Faturamento informado" value={brl(faturamentoTotal)} hint="resultado final cadastrado" />
        <Stat label="Maior venda" value={melhorVenda ? brl(melhorVenda.faturamento) : "—"} hint={melhorVenda?.filial?.nome ?? "aguardando resultados"} />
      </div>

      {!!comparaveis.length && (
        <Panel title="Comparativo financeiro das reinaugurações" className="mb-4" action={<Trophy className="h-4 w-4 text-primary" />}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                  <th className="pb-2">Ranking</th><th>Filial</th><th>Faturamento</th><th>Custo total</th><th>Resultado bruto</th><th>Faturamento / custo</th>
                </tr>
              </thead>
              <tbody>
                {comparaveis.map((x, i) => <tr key={x.id} className="border-b last:border-0">
                  <td className="py-2 font-bold">{i + 1}º</td>
                  <td><b>{x.filial?.codigo} — {x.filial?.nome}</b></td>
                  <td className="font-bold">{brl(x.faturamento)}</td>
                  <td>{brl(x.custo)}</td>
                  <td className={x.retornoBruto >= 0 ? "font-semibold" : "font-semibold text-primary"}>{brl(x.retornoBruto)}</td>
                  <td>{x.roasEvento ? `${x.roasEvento.toFixed(2)}x` : "—"}</td>
                </tr>)}
              </tbody>
            </table>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">“Faturamento / custo” mostra quantos reais foram vendidos para cada R$ 1,00 gasto na ação. Não representa margem líquida da loja.</p>
        </Panel>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {lista.map((r) => {
          const f = s.filiais.find((x) => x.id === r.filialId);
          const m = resumo(r);
          const fin = financeiro.find((x) => x.id === r.id)!;
          const tone = m.status === "Concluída" ? "success" : m.status === "Atrasada" ? "primary" : m.status === "Em andamento" ? "warn" : "muted";
          return (
            <div key={r.id} className="group relative rounded-lg border bg-card p-4 text-left shadow-soft transition hover:border-primary">
              <button type="button" onClick={() => nav({ to: "/reinauguracao/$id", params: { id: r.id } })} className="block w-full text-left">
                <div className="flex items-start justify-between gap-2 pr-9">
                  <div>
                    <div className="text-xs font-bold uppercase tracking-wider text-primary">{f?.isCD ? "CD" : `Filial ${f?.codigo}`}</div>
                    <div className="font-display text-xl font-bold">{f?.nome}</div>
                  </div>
                  <Badge tone={tone}>{m.status}</Badge>
                </div>
                <div className="mt-2 flex items-center gap-1 text-sm text-muted-foreground"><Calendar className="h-4 w-4" />{r.data ? fmtDate(r.data) : "Data a definir"}</div>
                <div className="mt-3 mb-1 flex justify-between text-xs"><span className="text-muted-foreground">Progresso do checklist</span><span className="font-bold">{m.pct}%</span></div>
                <Bar value={m.pct} />
                <div className="mt-3 flex gap-4 text-xs">
                  <span className="flex items-center gap-1"><ListTodo className="h-3.5 w-3.5" />{m.pend} pendentes</span>
                  <span className={`flex items-center gap-1 ${m.atras ? "font-bold text-primary" : "text-muted-foreground"}`}><AlertTriangle className="h-3.5 w-3.5" />{m.atras} atrasadas</span>
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 border-t pt-3 text-xs">
                  <div><div className="text-muted-foreground">Custo</div><div className="font-bold">{brl(fin.custo)}</div></div>
                  <div><div className="text-muted-foreground">Faturamento final</div><div className="font-bold">{r.faturamentoFinal ? brl(r.faturamentoFinal) : "A informar"}</div></div>
                </div>
              </button>
              {podeExcluir && <button
                type="button"
                title="Excluir reinauguração"
                aria-label={`Excluir reinauguração de ${f?.nome || "filial"}`}
                onClick={(e)=>{e.stopPropagation();excluirCidade(r.id,f?.nome || "esta filial");}}
                className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-lg border border-primary/20 bg-primary/[.05] text-primary opacity-80 transition hover:bg-primary/10 hover:opacity-100"
              ><Trash2 className="h-4 w-4"/></button>}
            </div>
          );
        })}
        {!lista.length && <p className="text-sm text-muted-foreground">Nenhuma reinauguração. Crie a primeira.</p>}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Nova reinauguração">
        <div className="space-y-3">
          <Field label="Cidade / filial"><select className={inputCls} value={nf.filialId} onChange={(e) => setNf({ ...nf, filialId: e.target.value })}>{s.filiais.filter((f) => !f.isCD).map((f) => <option key={f.id} value={f.id}>{f.codigo} — {f.nome}</option>)}</select></Field>
          <Field label="Data da reinauguração"><input type="date" className={inputCls} value={nf.data} onChange={(e) => setNf({ ...nf, data: e.target.value })} /></Field>
          <p className="text-xs text-muted-foreground">A data pode ficar em branco e ser definida depois. O quadro padrão será criado só para esta cidade. Custos e faturamento serão acompanhados separadamente por reinauguração.</p>
          <Btn className="w-full" onClick={() => {
            const id = uid();
            set((st) => ({ ...st, reinauguracoes: [...st.reinauguracoes, { id, ...nf, cards: defaultCards(), faturamentoFinal: 0, observacaoResultado: "" }] }));
            setOpen(false);
            nav({ to: "/reinauguracao/$id", params: { id } });
          }}>Criar e abrir quadro</Btn>
        </div>
      </Modal>
    </>
  );
}