import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, CheckSquare, MessageSquare, Calendar, ArrowLeft, Trash2, RotateCcw, Check, DollarSign, ReceiptText, Search, Filter, ArrowUpDown, X } from "lucide-react";
import { useApp, uid, fmtDate, brl, COLUNAS, excluirReinauguracaoEmCascata, type Card, type CardStatus } from "@/lib/store";
import { Btn, Modal, Field, inputCls, Badge, Bar, Panel, Stat, pageHead } from "@/components/kit";
import { resumo, Chip, hoje, CoresResponsaveis } from "@/components/reinauguracao-utils";

export const Route = createFileRoute("/reinauguracao/$id")({ head: pageHead("Quadro da reinauguração", "Kanban da reinauguração da filial."), component: Page });

const STATUS: CardStatus[] = ["A fazer", "Em andamento", "Concluído", "Bloqueado"];

function Page() {
  const { id } = Route.useParams();
  const { s, set } = useApp();
  const nav = useNavigate();
  const [cid, setCid] = useState<string | null>(null);
  const [txt, setTxt] = useState("");
  const [novoResp, setNovoResp] = useState("");
  const [openCusto, setOpenCusto] = useState(false);
  const [custoForm, setCustoForm] = useState({ categoria: "Decoração", descricao: "", valor: 0, data: new Date().toISOString().slice(0,10) });
  const [faturamento, setFaturamento] = useState("");
  const [busca, setBusca] = useState("");
  const [filtroColuna, setFiltroColuna] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [filtroResponsavel, setFiltroResponsavel] = useState("");
  const [filtroPrazo, setFiltroPrazo] = useState<"" | "Atrasadas" | "Hoje" | "Sem prazo">("");
  const [ordenacao, setOrdenacao] = useState<"Prazo" | "Título" | "Status">("Prazo");
  const r = s.reinauguracoes.find((x) => x.id === id);
  if (!r) return <div className="py-16 text-center"><p className="mb-4">Reinauguração não encontrada.</p><Link to="/reinauguracao" className="font-semibold text-primary">Voltar à lista</Link></div>;
  const f = s.filiais.find((x) => x.id === r.filialId);
  const m = resumo(r);
  const custosReinaug = s.custos.filter((c) => c.reinauguracaoId === r.id);
  const custoTotal = custosReinaug.reduce((a,c) => a + c.valor, 0);
  const resultadoBruto = (r.faturamentoFinal || 0) - custoTotal;
  const relacaoVendaCusto = custoTotal > 0 && r.faturamentoFinal > 0 ? r.faturamentoFinal / custoTotal : 0;
  const card = r.cards.find((c) => c.id === cid);
  const setCards = (fn: (c: Card[]) => Card[]) => set((st) => ({ ...st, reinauguracoes: st.reinauguracoes.map((x) => (x.id === id ? { ...x, cards: fn(x.cards) } : x)) }));
  const upd = (c: Card) => setCards((cs) => cs.map((k) => (k.id === c.id ? c : k)));
  const add = (col: string) => { const c: Card = { id: uid(), coluna: col, titulo: "Novo cartão", descricao: "", responsaveis: [], prazo: "", checklist: [], comentarios: [], status: "A fazer" }; setCards((cs) => [...cs, c]); setCid(c.id); };
  const addResp = (c: Card, n: string) => { const v = n.trim().toUpperCase(); if (v && !c.responsaveis.map((x) => x.toUpperCase()).includes(v)) upd({ ...c, responsaveis: [...c.responsaveis, v] }); };
  const addTodosResp = (c: Card) => upd({ ...c, responsaveis: [...new Set(s.funcionarios.map((func)=>func.nome.trim().toUpperCase()))] });

  const equipeAtual = s.funcionarios.map((func)=>func.nome.trim().toUpperCase()).filter(Boolean);
  const responsaveisDisponiveis = [...new Set([
    ...equipeAtual,
    ...s.reinauguracoes.flatMap((reinauguracao) => reinauguracao.cards.flatMap((cartao) => [
      ...cartao.responsaveis,
      ...cartao.checklist.map((item) => item.responsavel || "").filter(Boolean),
    ])),
  ].map((nome) => nome.trim().toUpperCase()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR"));

  const cardsFiltrados = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    const hojeIso = hoje();
    const pesoStatus: Record<CardStatus, number> = { "A fazer": 0, "Em andamento": 1, "Bloqueado": 2, "Concluído": 3 };

    return r.cards
      .filter((c) => !filtroColuna || c.coluna === filtroColuna)
      .filter((c) => !filtroStatus || c.status === filtroStatus)
      .filter((c) => {
        if (!filtroResponsavel) return true;
        const alvo = filtroResponsavel.toUpperCase();
        return c.responsaveis.some((n) => n.toUpperCase() === alvo) ||
          c.checklist.some((i) => (i.responsavel || "").trim().toUpperCase() === alvo);
      })
      .filter((c) => {
        if (!filtroPrazo) return true;
        if (filtroPrazo === "Atrasadas") return c.status !== "Concluído" && !!c.prazo && c.prazo < hojeIso;
        if (filtroPrazo === "Hoje") return c.status !== "Concluído" && c.prazo === hojeIso;
        return !c.prazo;
      })
      .filter((c) => {
        if (!termo) return true;
        return [
          c.titulo,
          c.descricao,
          c.coluna,
          ...c.responsaveis,
          ...c.checklist.map((i) => i.texto),
          ...c.checklist.map((i) => i.responsavel || ""),
        ].join(" ").toLowerCase().includes(termo);
      })
      .sort((a, b) => {
        if (ordenacao === "Título") return a.titulo.localeCompare(b.titulo, "pt-BR");
        if (ordenacao === "Status") return pesoStatus[a.status] - pesoStatus[b.status] || a.titulo.localeCompare(b.titulo, "pt-BR");

        const prazoA = a.prazo || "9999-12-31";
        const prazoB = b.prazo || "9999-12-31";
        return prazoA.localeCompare(prazoB) || pesoStatus[a.status] - pesoStatus[b.status] || a.titulo.localeCompare(b.titulo, "pt-BR");
      });
  }, [r.cards, busca, filtroColuna, filtroStatus, filtroResponsavel, filtroPrazo, ordenacao]);

  const filtrosAtivos = [busca, filtroColuna, filtroStatus, filtroResponsavel, filtroPrazo].filter(Boolean).length;
  const limparFiltros = () => {
    setBusca("");
    setFiltroColuna("");
    setFiltroStatus("");
    setFiltroResponsavel("");
    setFiltroPrazo("");
    setOrdenacao("Prazo");
  };

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <Link to="/reinauguracao" className="inline-flex items-center gap-1 text-sm font-semibold text-muted-foreground hover:text-primary"><ArrowLeft className="h-4 w-4" />Voltar às reinaugurações</Link>
        <CoresResponsaveis />
      </div>
      <div className="mb-4 flex flex-col gap-3 rounded-lg border bg-card p-4 shadow-soft sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-primary">{f?.isCD ? "CD" : `Filial ${f?.codigo}`}</div>
          <h1 className="font-display text-2xl font-bold">{f?.nome}</h1>
          <div className="flex items-center gap-1 text-sm text-muted-foreground"><Calendar className="h-4 w-4" />{r.data ? fmtDate(r.data) : "Data a definir"}</div>
          <label className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">{r.data ? "Alterar data:" : "Definir data:"}<input type="date" aria-label="Data da reinauguração" className="rounded-md border bg-background px-2 py-1 text-xs text-foreground" value={r.data} onChange={(e) => set((st) => ({ ...st, reinauguracoes: st.reinauguracoes.map((x) => (x.id === id ? { ...x, data: e.target.value } : x)) }))} /></label>
        </div>
        <div className="w-full space-y-1 sm:w-72">
          <div className="flex justify-between text-xs"><span>{m.status} · {m.pend} pendentes · {m.atras} atrasadas</span><b>{m.pct}%</b></div>
          <Bar value={m.pct} />
          <div className="flex justify-end pt-1"><Btn variant="danger" onClick={() => { if (confirm("Excluir esta reinauguração? As atividades vinculadas também serão removidas.")) { set((st) => excluirReinauguracaoEmCascata(st,id)); nav({ to: "/reinauguracao" }); } }}><Trash2 className="h-4 w-4" />Excluir quadro</Btn></div>
        </div>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Custo total da reinauguração" value={brl(custoTotal)} hint={`${custosReinaug.length} lançamentos`} />
        <Stat accent label="Faturamento final" value={r.faturamentoFinal ? brl(r.faturamentoFinal) : "A informar"} hint="resultado de vendas da ação" />
        <Stat label="Resultado bruto" value={r.faturamentoFinal ? brl(resultadoBruto) : "—"} hint="faturamento menos custos da ação" />
        <Stat label="Venda por R$ 1 gasto" value={relacaoVendaCusto ? `${relacaoVendaCusto.toFixed(2)}x` : "—"} hint="comparativo de eficiência" />
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Panel title="Custos da reinauguração" action={<Btn onClick={() => setOpenCusto(true)}><Plus className="h-4 w-4" />Adicionar custo</Btn>}>
          <div className="space-y-2">
            {custosReinaug.map((k) => <div key={k.id} className="flex items-center justify-between gap-3 rounded-md border p-3 text-sm">
              <div>
                <div className="font-semibold">{k.categoria} · {k.descricao}</div>
                <div className="text-xs text-muted-foreground">{fmtDate(k.data)}</div>
              </div>
              <div className="font-bold">{brl(k.valor)}</div>
            </div>)}
            {!custosReinaug.length && <div className="py-8 text-center text-sm text-muted-foreground">Nenhum custo lançado ainda. Inclua decoração, gráfica, influencer, carro de som, alimentação, equipe, brindes e demais despesas.</div>}
          </div>
          {!!custosReinaug.length && <div className="mt-3 flex justify-between border-t pt-3 text-sm"><b>Total investido</b><b className="text-primary">{brl(custoTotal)}</b></div>}
        </Panel>

        <Panel title="Resultado financeiro final">
          <div className="space-y-3">
            <Field label="Faturamento final da reinauguração">
              <div className="flex gap-2">
                <input className={inputCls} type="number" min="0" placeholder="Ex.: 185000" value={faturamento} onChange={(e) => setFaturamento(e.target.value)} />
                <Btn onClick={() => {
                  const valor = Number(faturamento);
                  if (!valor) return;
                  set((st) => ({ ...st, reinauguracoes: st.reinauguracoes.map((x) => x.id === id ? { ...x, faturamentoFinal: valor } : x) }));
                  setFaturamento("");
                }}><DollarSign className="h-4 w-4" />Salvar</Btn>
              </div>
            </Field>
            <Field label="Observação do resultado">
              <textarea rows={3} className={inputCls} value={r.observacaoResultado} onChange={(e) => set((st) => ({ ...st, reinauguracoes: st.reinauguracoes.map((x) => x.id === id ? { ...x, observacaoResultado: e.target.value } : x) }))} placeholder="Ex.: vendas dos dias da ação, comportamento da loja, pontos positivos..." />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md border p-3"><div className="text-xs text-muted-foreground">Faturamento</div><div className="font-display text-xl font-bold">{r.faturamentoFinal ? brl(r.faturamentoFinal) : "—"}</div></div>
              <div className="rounded-md border p-3"><div className="text-xs text-muted-foreground">Custos</div><div className="font-display text-xl font-bold">{brl(custoTotal)}</div></div>
              <div className="rounded-md border p-3"><div className="text-xs text-muted-foreground">Resultado bruto</div><div className="font-display text-xl font-bold">{r.faturamentoFinal ? brl(resultadoBruto) : "—"}</div></div>
              <div className="rounded-md border p-3"><div className="text-xs text-muted-foreground">Faturamento/custo</div><div className="font-display text-xl font-bold">{relacaoVendaCusto ? `${relacaoVendaCusto.toFixed(2)}x` : "—"}</div></div>
            </div>
            <p className="text-xs text-muted-foreground">Esse indicador compara o faturamento informado com os custos desta reinauguração. Ele não representa lucro líquido contábil da loja.</p>
          </div>
        </Panel>
      </div>

      <Panel className="mb-4" title="Filtrar quadro" action={<div className="flex items-center gap-2 text-xs text-muted-foreground"><Filter className="h-4 w-4 text-primary"/>{cardsFiltrados.length}/{r.cards.length} cartões</div>}>
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <Field label="Buscar">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/>
              <input className={`${inputCls} pl-9`} placeholder="Título, checklist, responsável..." value={busca} onChange={(e)=>setBusca(e.target.value)} />
            </div>
          </Field>
          <Field label="Bloco">
            <select className={inputCls} value={filtroColuna} onChange={(e)=>setFiltroColuna(e.target.value)}>
              <option value="">Todos os blocos</option>
              {COLUNAS.map((x)=><option key={x}>{x}</option>)}
            </select>
          </Field>
          <Field label="Status">
            <select className={inputCls} value={filtroStatus} onChange={(e)=>setFiltroStatus(e.target.value)}>
              <option value="">Todos</option>
              {STATUS.map((x)=><option key={x}>{x}</option>)}
            </select>
          </Field>
          <Field label="Responsável">
            <select className={inputCls} value={filtroResponsavel} onChange={(e)=>setFiltroResponsavel(e.target.value)}>
              <option value="">Todos</option>
              {responsaveisDisponiveis.map((x)=><option key={x}>{x}</option>)}
            </select>
          </Field>
          <Field label="Prazo">
            <select className={inputCls} value={filtroPrazo} onChange={(e)=>setFiltroPrazo(e.target.value as typeof filtroPrazo)}>
              <option value="">Todos</option>
              <option>Atrasadas</option>
              <option>Hoje</option>
              <option>Sem prazo</option>
            </select>
          </Field>
          <Field label="Ordenar">
            <select className={inputCls} value={ordenacao} onChange={(e)=>setOrdenacao(e.target.value as typeof ordenacao)}>
              <option>Prazo</option>
              <option>Título</option>
              <option>Status</option>
            </select>
          </Field>
        </div>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/7 pt-3">
          <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
            <Badge tone="muted">A fazer {cardsFiltrados.filter((c)=>c.status==="A fazer").length}</Badge>
            <Badge tone="warn">Em andamento {cardsFiltrados.filter((c)=>c.status==="Em andamento").length}</Badge>
            <Badge tone="primary">Bloqueado {cardsFiltrados.filter((c)=>c.status==="Bloqueado").length}</Badge>
            <Badge tone="success">Concluído {cardsFiltrados.filter((c)=>c.status==="Concluído").length}</Badge>
          </div>
          {filtrosAtivos > 0 && <Btn variant="ghost" onClick={limparFiltros}><X className="h-4 w-4"/>Limpar filtros ({filtrosAtivos})</Btn>}
        </div>
      </Panel>

      <div className="mb-2 flex items-center justify-end gap-1 text-[11px] text-muted-foreground"><ArrowUpDown className="h-3.5 w-3.5"/>Cada bloco tem rolagem própria para manter o quadro compacto.</div>
      <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-4 md:-mx-6 md:px-6">
        {COLUNAS.filter((col) => !filtroColuna || col === filtroColuna).map((col) => {
          const cs = cardsFiltrados.filter((c) => c.coluna === col);
          const totalColuna = r.cards.filter((c) => c.coluna === col).length;
          return (
            <div key={col} className="w-72 shrink-0 snap-start rounded-lg bg-muted p-2">
              <div className="mb-2 flex justify-between px-1 text-xs font-bold tracking-wider"><span>{col}</span><span className="text-muted-foreground">{cs.length}/{totalColuna}</span></div>
              <div className="max-h-[680px] space-y-2 overflow-y-auto pr-1">
                {cs.map((c) => {
                  const late = c.status !== "Concluído" && c.prazo && c.prazo < hoje();
                  return (
                    <button key={c.id} onClick={() => setCid(c.id)} className={`w-full rounded-md border bg-card p-2.5 text-left text-sm shadow-soft transition hover:border-primary ${c.status === "Concluído" ? "opacity-60" : ""}`}>
                      <div className={`mb-1.5 line-clamp-2 font-medium leading-snug ${c.status === "Concluído" ? "line-through" : ""}`}>{c.titulo}</div>
                      {!!c.responsaveis.length && <div className="mb-1.5 flex flex-wrap gap-1">{c.responsaveis.map((n) => <Chip key={n} nome={n} />)}</div>}
                      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <Badge tone={c.status === "Concluído" ? "success" : c.status === "Bloqueado" ? "primary" : c.status === "Em andamento" ? "warn" : "muted"}>{c.status}</Badge>
                        {c.prazo && <span className={`flex items-center gap-1 ${late ? "font-bold text-primary" : ""}`}><Calendar className="h-3 w-3" />{fmtDate(c.prazo)}</span>}
                        {!!c.checklist.length && <span className="flex items-center gap-1"><CheckSquare className="h-3 w-3" />{c.checklist.filter((i) => i.feito).length}/{c.checklist.length}</span>}
                        {!!c.comentarios.length && <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" />{c.comentarios.length}</span>}
                      </div>
                    </button>
                  );
                })}
                {!cs.length && <div className="rounded-md border border-dashed border-white/10 px-3 py-6 text-center text-xs text-muted-foreground">Nenhum cartão com estes filtros.</div>}
                <Btn variant="ghost" className="w-full" onClick={() => add(col)}><Plus className="h-4 w-4" />Adicionar cartão</Btn>
              </div>
            </div>
          );
        })}
      </div>

      <Modal open={openCusto} onClose={() => setOpenCusto(false)} title="Adicionar custo da reinauguração">
        <div className="space-y-3">
          <Field label="Categoria"><select className={inputCls} value={custoForm.categoria} onChange={(e) => setCustoForm({ ...custoForm, categoria: e.target.value })}>
            {["Decoração","Gráfica / Impressões","Influencer","Propaganda Volante","Tráfego Pago","Alimentação","Equipe / Prestadores","Brindes","Transporte","Materiais","Outros"].map((x) => <option key={x}>{x}</option>)}
          </select></Field>
          <Field label="Descrição"><input className={inputCls} value={custoForm.descricao} onChange={(e) => setCustoForm({ ...custoForm, descricao: e.target.value })} placeholder="Ex.: decoração de balões" /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Valor"><input type="number" min="0" className={inputCls} value={custoForm.valor} onChange={(e) => setCustoForm({ ...custoForm, valor: Number(e.target.value) })} /></Field>
            <Field label="Data"><input type="date" className={inputCls} value={custoForm.data} onChange={(e) => setCustoForm({ ...custoForm, data: e.target.value })} /></Field>
          </div>
          <Btn className="w-full" disabled={!custoForm.descricao.trim() || custoForm.valor <= 0} onClick={() => {
            set((st) => ({ ...st, custos: [...st.custos, { id: uid(), categoria: custoForm.categoria, descricao: custoForm.descricao.trim(), valor: custoForm.valor, filialId: r.filialId, data: custoForm.data, reinauguracaoId: r.id }] }));
            setCustoForm({ categoria: "Decoração", descricao: "", valor: 0, data: new Date().toISOString().slice(0,10) });
            setOpenCusto(false);
          }}><ReceiptText className="h-4 w-4" />Salvar custo</Btn>
        </div>
      </Modal>

      <Modal open={!!card} onClose={() => setCid(null)} title={card?.titulo || "Cartão"} wide>
        {card && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {card.status === "Concluído"
                ? <Btn variant="outline" onClick={() => upd({ ...card, status: "A fazer" })}><RotateCcw className="h-4 w-4" />Reabrir</Btn>
                : <Btn onClick={() => upd({ ...card, status: "Concluído" })}><Check className="h-4 w-4" />Concluir</Btn>}
              <Btn variant="danger" onClick={() => { setCards((cs) => cs.filter((k) => k.id !== card.id)); setCid(null); }}><Trash2 className="h-4 w-4" />Excluir</Btn>
            </div>
            <Field label="Título"><input className={inputCls} value={card.titulo} onChange={(e) => upd({ ...card, titulo: e.target.value })} /></Field>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              <Field label="Status"><select className={inputCls} value={card.status} onChange={(e) => upd({ ...card, status: e.target.value as CardStatus })}>{STATUS.map((x) => <option key={x}>{x}</option>)}</select></Field>
              <Field label="Prazo"><input type="date" className={inputCls} value={card.prazo} onChange={(e) => upd({ ...card, prazo: e.target.value })} /></Field>
              <Field label="Coluna"><select className={inputCls} value={card.coluna} onChange={(e) => upd({ ...card, coluna: e.target.value })}>{COLUNAS.map((x) => <option key={x}>{x}</option>)}</select></Field>
            </div>
            <div>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Responsáveis</div>
              <div className="mb-2 flex flex-wrap gap-1">{card.responsaveis.map((n) => <Chip key={n} nome={n} onRemove={() => upd({ ...card, responsaveis: card.responsaveis.filter((x) => x !== n) })} />)}{!card.responsaveis.length && <span className="text-xs text-muted-foreground">Nenhum</span>}</div>
              <div className="flex flex-wrap gap-1">
                <button onClick={() => addTodosResp(card)} className="rounded-full border border-primary/30 bg-primary/5 px-2 py-0.5 text-[11px] font-black text-primary hover:bg-primary/10">+ TODOS</button>
                {equipeAtual.filter((n) => !card.responsaveis.includes(n)).map((n) => <button key={n} onClick={() => addResp(card, n)} className="rounded-full border px-2 py-0.5 text-[11px] font-bold hover:bg-muted">+ {n}</button>)}
                <input className="rounded-full border bg-background px-2 py-0.5 text-xs" placeholder="Outro nome + Enter" value={novoResp} onChange={(e) => setNovoResp(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { addResp(card, novoResp); setNovoResp(""); } }} />
              </div>
            </div>
            <Field label="Descrição"><textarea rows={3} className={inputCls} value={card.descricao} onChange={(e) => upd({ ...card, descricao: e.target.value })} /></Field>
            <div>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Checklist ({card.checklist.filter((i) => i.feito).length}/{card.checklist.length})</div>
              <datalist id="responsaveis-checklist">
                {responsaveisDisponiveis.map((nome) => <option key={nome} value={nome} />)}
              </datalist>
              {card.checklist.map((i) => {
                const atrasado = !i.feito && !!i.prazo && i.prazo < hoje();
                const responsavel = i.responsavel?.trim().toUpperCase() || "";
                const responsavelId = i.responsavelId || s.funcionarios.find((func) => func.nome.trim().toUpperCase() === responsavel)?.id || "";
                const setItem = (patch: Partial<typeof i>) => {
                  const checklist = card.checklist.map((k) => (k.id === i.id ? { ...k, ...patch } : k));
                  const todosConcluidos = checklist.length > 0 && checklist.every((item) => item.feito);
                  const algumEmAndamento = checklist.some((item) => item.feito || item.statusAtividade === "Realizando");
                  upd({
                    ...card,
                    checklist,
                    status: todosConcluidos ? "Concluído" : algumEmAndamento ? "Em andamento" : "A fazer",
                  });
                };
                return (
                <div key={i.id} className="flex items-start gap-2 border-b border-border/50 py-2.5 text-sm last:border-0">
                  <input type="checkbox" aria-label={`Concluir ${i.texto}`} className="mt-1 h-4 w-4 shrink-0 accent-[var(--primary)]" checked={i.feito} onChange={() => { const feito = !i.feito; setItem({ feito, statusAtividade: feito ? "Finalizado" : "A fazer" }); }} />
                  <div className="min-w-0 flex-1 space-y-2">
                    <input className={`w-full min-w-0 bg-transparent ${i.feito ? "text-muted-foreground line-through" : ""}`} value={i.texto} onChange={(e) => setItem({ texto: e.target.value })} />
                    <div className="grid gap-2 sm:grid-cols-[minmax(10rem,1fr)_auto_auto_auto] sm:items-end">
                      <div className="min-w-0">
                        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Atribuído a</div>
                        <select
                          aria-label={`Responsável por ${i.texto}`}
                          className="w-full rounded-md border bg-background px-2 py-1 text-xs text-foreground"
                          value={responsavelId}
                          onChange={(e) => {
                            if (e.target.value === "__todos__") {
                              const clones = s.funcionarios.map((func)=>({
                                ...i,
                                id:uid(),
                                responsavelId:func.id,
                                responsavel:func.nome,
                                statusAtividade:i.feito ? "Finalizado" as const : (i.statusAtividade || "A fazer" as const),
                              }));
                              const checklist = card.checklist.flatMap((item)=>item.id===i.id ? clones : [item]);
                              upd({ ...card, checklist });
                              return;
                            }
                            const colaborador = s.funcionarios.find((func) => func.id === e.target.value);
                            setItem({
                              responsavelId: colaborador?.id,
                              responsavel: colaborador?.nome,
                              statusAtividade: i.feito ? "Finalizado" : (i.statusAtividade || "A fazer"),
                            });
                          }}
                        >
                          <option value="">Sem responsável</option>
                          <option value="__todos__">Todos os colaboradores</option>
                          {s.funcionarios.map((func) => <option key={func.id} value={func.id}>{func.nome} — {func.cargo}</option>)}
                        </select>
                        {responsavel && <div className={`mt-1 flex flex-wrap items-center gap-1 ${i.feito ? "opacity-60" : ""}`}><Chip nome={responsavel} />{i.statusAtividade === "Realizando" && <span className="text-[10px] font-bold uppercase text-warn">Em andamento</span>}</div>}
                      </div>
                      <div>
                        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Prazo</div>
                        <div className="flex flex-wrap items-center gap-1">
                          <input type="date" aria-label={`Prazo de ${i.texto}`} title={i.prazo ? "Prazo do item" : "Sem prazo"} className={`w-[8.5rem] rounded-md border bg-background px-1.5 py-1 text-xs ${atrasado ? "border-primary text-primary" : i.prazo ? "text-foreground" : "text-muted-foreground"}`} value={i.prazo || ""} onChange={(e) => setItem({ prazo: e.target.value || undefined })} />
                          {atrasado && <span className="text-[10px] font-bold uppercase text-primary">Atrasado</span>}
                          {!i.prazo && <span className="text-[10px] text-muted-foreground">Sem prazo</span>}
                          {i.prazo && <button aria-label="Remover prazo do item" onClick={() => setItem({ prazo: undefined })} className="px-1 text-xs text-muted-foreground hover:text-primary">×</button>}
                        </div>
                      </div>
                      <div>
                        <div className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Horário</div>
                        <input type="time" aria-label={`Horário de ${i.texto}`} className="w-[7.5rem] rounded-md border bg-background px-1.5 py-1 text-xs text-foreground" value={i.horario || ""} onChange={(e) => setItem({ horario: e.target.value || undefined })} />
                      </div>
                      <button aria-label="Remover item" title="Remover item" onClick={() => upd({ ...card, checklist: card.checklist.filter((k) => k.id !== i.id) })} className="justify-self-start rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-primary sm:justify-self-end"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                </div>
                );
              })}
              <Btn variant="ghost" onClick={() => upd({ ...card, checklist: [...card.checklist, { id: uid(), texto: "Novo item", feito: false, statusAtividade: "A fazer" }] })}><Plus className="h-4 w-4" />Item</Btn>
            </div>
            <div>
              <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Comentários</div>
              {card.comentarios.map((c) => <div key={c.id} className="mb-2 rounded bg-muted p-2 text-sm"><b>{c.autor}</b> <span className="text-xs text-muted-foreground">{c.data}</span><div>{c.texto}</div></div>)}
              <div className="flex gap-2">
                <input className={inputCls} placeholder="Escreva um comentário" value={txt} onChange={(e) => setTxt(e.target.value)} />
                <Btn disabled={!txt} onClick={() => { upd({ ...card, comentarios: [...card.comentarios, { id: uid(), autor: s.perfil === "Master" ? "Bruna Marques" : s.perfil, texto: txt, data: new Date().toLocaleString("pt-BR") }] }); setTxt(""); }}>Enviar</Btn>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}