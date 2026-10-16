import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowDownUp, CalendarDays, CheckCircle2, CircleDot, Clock3, Filter, ListChecks,
  Plus, Repeat2, Send, Trash2, UserRoundCog, XCircle, BellRing, ArrowRightLeft,
  PauseCircle, PlayCircle, MessageCircle, AtSign,
} from "lucide-react";
import {
  useApp, uid, fmtDate,
  type AppState, type Atividade, type AtividadeChecklistItem, type ComentarioAtividade, type PendenciaStatus,
} from "@/lib/store";
import { PageHeader, Panel, Stat, Btn, Modal, Field, inputCls, Badge, pageHead } from "@/components/kit";

export const Route = createFileRoute("/atividades")({
  head: pageHead("Atividades", "Atividades da equipe em formato de quadro."),
  component: Page,
});

const COLUNAS: PendenciaStatus[] = ["A fazer", "Realizando", "Finalizado"];
const PRIORIDADE_ORDEM: Record<NonNullable<Atividade["prioridade"]>, number> = { Alta: 0, "Média": 1, Baixa: 2 };
const hoje = () => new Date().toISOString().slice(0, 10);
const dataRotinaAtual = (rotina: AppState["rotinasDiarias"][number]) => {
  const hojeIso = hoje();
  if ((rotina.frequencia || "Diária") !== "Mensal") return hojeIso;
  const [ano, mes] = hojeIso.split("-").map(Number);
  const ultimoDia = new Date(ano, mes, 0).getDate();
  const dia = Math.min(Math.max(1, rotina.diaMes || 1), ultimoDia);
  return `${hojeIso.slice(0,7)}-${String(dia).padStart(2,"0")}`;
};

function funcionarioPorNome(s: AppState, nome?: string) {
  const alvo = String(nome || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();
  if (!alvo) return undefined;
  return s.funcionarios.find((f) => {
    const n = f.nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toUpperCase();
    return n === alvo || n.split(" ")[0] === alvo.split(" ")[0];
  });
}

function itemDaReinauguracao(s: AppState, a: Atividade) {
  if (!a.sourceReinauguracaoId || !a.sourceReinauguracaoCardId || !a.sourceReinauguracaoItemId) return undefined;
  const r = s.reinauguracoes.find((x) => x.id === a.sourceReinauguracaoId);
  return r?.cards.find((c) => c.id === a.sourceReinauguracaoCardId)?.checklist.find((i) => i.id === a.sourceReinauguracaoItemId);
}

function cardDaReinauguracao(s: AppState, a: Atividade) {
  if (!a.sourceReinauguracaoId || !a.sourceReinauguracaoCardId) return undefined;
  return s.reinauguracoes.find((x) => x.id === a.sourceReinauguracaoId)?.cards.find((c) => c.id === a.sourceReinauguracaoCardId);
}

function atividadePai(s: AppState, a: Atividade) {
  if (!a.sourceAtividadeId || !a.sourceAtividadeOwnerId) return undefined;
  const owner = s.funcionarios.find((f) => f.id === a.sourceAtividadeOwnerId);
  const atividade = owner?.atividades.find((x) => x.id === a.sourceAtividadeId);
  return owner && atividade ? { owner, atividade } : undefined;
}

function contextoReinauguracao(s: AppState, a: Atividade) {
  if (!a.sourceReinauguracaoId || !a.sourceReinauguracaoCardId) return undefined;
  const reinauguracao = s.reinauguracoes.find((r) => r.id === a.sourceReinauguracaoId);
  if (!reinauguracao) return undefined;
  const filial = s.filiais.find((f) => f.id === reinauguracao.filialId);
  const card = reinauguracao.cards.find((c) => c.id === a.sourceReinauguracaoCardId);
  return {
    reinauguracao, filial, card,
    etiqueta: `Reinauguração · ${filial?.nome || "Filial"}`,
    contexto: [filial?.codigo ? `Filial ${filial.codigo}` : "", card?.titulo || ""].filter(Boolean).join(" · "),
  };
}

function statusRealAtividade(s: AppState, a: Atividade): PendenciaStatus {
  const itemRe = itemDaReinauguracao(s, a);
  if (itemRe) return itemRe.statusAtividade || (itemRe.feito ? "Finalizado" : "A fazer");

  const pai = atividadePai(s, a);
  if (pai && a.sourceAtividadeChecklistItemId) {
    const item = pai.atividade.checklist?.find((i) => i.id === a.sourceAtividadeChecklistItemId);
    if (item) return item.statusAtividade || (item.feito ? "Finalizado" : "A fazer");
  }

  const card = cardDaReinauguracao(s, a);
  if (card && !a.sourceReinauguracaoItemId) {
    if (card.status === "Concluído") return "Finalizado";
    if (card.status === "Em andamento") return "Realizando";
    return "A fazer";
  }

  const p = a.sourcePendenciaId ? s.pendencias.find((x) => x.id === a.sourcePendenciaId) : undefined;
  return p?.status || a.status || (a.feito ? "Finalizado" : "A fazer");
}

function recalcularCard<T extends { checklist: { feito:boolean; statusAtividade?:PendenciaStatus }[]; status:string }>(card:T): T {
  if (!card.checklist.length) return card;
  const todos = card.checklist.every((i) => i.feito);
  const algum = card.checklist.some((i) => i.feito || i.statusAtividade === "Realizando");
  return { ...card, status: todos ? "Concluído" : algum ? "Em andamento" : "A fazer" } as T;
}

function aplicarPatch(st: AppState, funcionarioId: string, atividade: Atividade, patch: Partial<Atividade> & { status?: PendenciaStatus }): AppState {
  const statusAtual = statusRealAtividade(st, atividade);
  const novoStatus = patch.status ?? statusAtual;
  const feito = novoStatus === "Finalizado";

  let funcionarios = st.funcionarios;

  if (atividade.sourceAtividadeId && atividade.sourceAtividadeOwnerId && atividade.sourceAtividadeChecklistItemId) {
    funcionarios = funcionarios.map((f) => {
      if (f.id !== atividade.sourceAtividadeOwnerId) {
        return f.id === funcionarioId
          ? { ...f, atividades: f.atividades.map((a) => a.id === atividade.id ? { ...a, ...patch, status:novoStatus, feito } : a) }
          : f;
      }
      return {
        ...f,
        atividades: f.atividades.map((a) => {
          if (a.id !== atividade.sourceAtividadeId) return a;
          const checklist = patch.checklist || (a.checklist || []).map((item) =>
            item.id === atividade.sourceAtividadeChecklistItemId
              ? {
                  ...item,
                  texto: patch.titulo ?? item.texto,
                  prazo: patch.data !== undefined ? patch.data || undefined : item.prazo,
                  horario: patch.horario !== undefined ? patch.horario || undefined : item.horario,
                  feito,
                  statusAtividade: novoStatus,
                }
              : item
          );
          const todos = checklist.length > 0 && checklist.every((i) => i.feito);
          const algum = checklist.some((i) => i.feito || i.statusAtividade === "Realizando");
          return {
            ...a,
            checklist,
            status: todos ? "Finalizado" : algum ? "Realizando" : a.status,
            feito: todos,
          };
        }),
      };
    });
  } else {
    funcionarios = funcionarios.map((f) => f.id === funcionarioId ? {
      ...f,
      atividades: f.atividades.map((a) => a.id === atividade.id ? { ...a, ...patch, status:novoStatus, feito } : a),
    } : f);
  }

  const pendencias = atividade.sourcePendenciaId
    ? st.pendencias.map((p) => p.id === atividade.sourcePendenciaId ? {
        ...p,
        titulo: patch.titulo ?? p.titulo,
        prazo: patch.data ?? p.prazo,
        descricao: patch.descricao ?? p.descricao,
        prioridade: patch.prioridade ?? p.prioridade,
        checklist: patch.checklist ?? p.checklist,
        status: novoStatus,
        feito,
      } : p)
    : st.pendencias;

  const reinauguracoes = atividade.sourceReinauguracaoCardId
    ? st.reinauguracoes.map((r) => r.id === atividade.sourceReinauguracaoId ? {
        ...r,
        cards: r.cards.map((card) => {
          if (card.id !== atividade.sourceReinauguracaoCardId) return card;
          if (!atividade.sourceReinauguracaoItemId) {
            return {
              ...card,
              titulo: patch.titulo ?? card.titulo,
              prazo: patch.data !== undefined ? patch.data : card.prazo,
              status: novoStatus === "Finalizado" ? "Concluído" : novoStatus === "Realizando" ? "Em andamento" : "A fazer",
            };
          }
          const checklist = card.checklist.map((item) => item.id === atividade.sourceReinauguracaoItemId ? {
            ...item,
            texto: patch.titulo ?? item.texto,
            prazo: patch.data !== undefined ? patch.data || undefined : item.prazo,
            horario: patch.horario !== undefined ? patch.horario || undefined : item.horario,
            feito,
            statusAtividade: novoStatus,
          } : item);
          return recalcularCard({ ...card, checklist });
        }),
      } : r)
    : st.reinauguracoes;

  const rotinasDiarias = atividade.sourceRotinaId
    ? st.rotinasDiarias.map((r) => r.id === atividade.sourceRotinaId ? {
        ...r,
        titulo: patch.titulo ?? r.titulo,
        descricao: patch.descricao ?? r.descricao,
        horario: patch.horario !== undefined ? patch.horario : r.horario,
        prioridade: patch.prioridade ?? r.prioridade,
        checklist: patch.checklist ?? r.checklist,
      } : r)
    : st.rotinasDiarias;

  return { ...st, funcionarios, pendencias, reinauguracoes, rotinasDiarias };
}

function Page() {
  const { s, set } = useApp();
  const [sel, setSel] = useState(s.funcionarios[0]?.id ?? "");
  const [open, setOpen] = useState(false);
  const [openFixed, setOpenFixed] = useState(false);
  const [activityId, setActivityId] = useState<string | null>(null);
  const [filtroBloco, setFiltroBloco] = useState<"Todos" | PendenciaStatus>("Todos");
  const [filtroPrioridade, setFiltroPrioridade] = useState<"Todas" | "Alta" | "Média" | "Baixa">("Todas");
  const [ordenacao, setOrdenacao] = useState<"Prioridade" | "Prazo">("Prioridade");

  useEffect(()=>{
    try {
      const raw=sessionStorage.getItem("gi-open-activity");
      if(!raw) return;
      sessionStorage.removeItem("gi-open-activity");
      const alvo=JSON.parse(raw) as {funcionarioId?:string;atividadeId?:string};
      if(alvo.funcionarioId && alvo.atividadeId && s.funcionarios.some((f)=>f.id===alvo.funcionarioId&&f.atividades.some((a)=>a.id===alvo.atividadeId))){
        setSel(alvo.funcionarioId);
        setActivityId(alvo.atividadeId);
      }
    } catch {}
  },[s.funcionarios]);

  const func = s.funcionarios.find((x) => x.id === sel) ?? s.funcionarios[0];
  const podeGerirJustificativas = ["Master","Diretoria","Gerente de Marketing","Coordenação"].includes(s.perfil);

  const justificativasPendentes = useMemo(() => s.funcionarios.flatMap((f) =>
    f.atividades
      .filter((a) => a.justificativa?.status === "Pendente")
      .map((a) => ({ funcionario:f, atividade:a }))
  ), [s.funcionarios]);

  const resumo = useMemo(() => s.funcionarios.map((f) => {
    const total = f.atividades.length;
    const concluidas = f.atividades.filter((a) => statusRealAtividade(s, a) === "Finalizado" && a.justificativa?.status !== "Rejeitada").length;
    const negativos = f.atividades.filter((a) => a.justificativa?.status === "Rejeitada").length;
    return { ...f, total, concluidas, pendentes: total - f.atividades.filter((a)=>statusRealAtividade(s,a)==="Finalizado").length, negativos, taxa: total ? Math.round((concluidas / total) * 100) : 0 };
  }), [s]);

  const rotinasFixasHoje = useMemo(() => s.rotinasDiarias.map((rotina) => {
    const funcionario = s.funcionarios.find((f) => f.id === rotina.funcionarioId);
    const dataReferencia = dataRotinaAtual(rotina);
    const atividadeHoje = funcionario?.atividades.find((a) =>
      a.sourceRotinaId === rotina.id &&
      ((rotina.frequencia || "Diária") === "Mensal" ? a.data.startsWith(hoje().slice(0,7)) : a.data === dataReferencia)
    );
    const statusHoje = atividadeHoje ? statusRealAtividade(s, atividadeHoje) : "A fazer";
    return { rotina, funcionario, atividadeHoje, statusHoje, dataReferencia };
  }), [s]);

  const rotinasAtivasHoje = rotinasFixasHoje.filter((x) => x.rotina.ativa);
  const rotinasConcluidasHoje = rotinasAtivasHoje.filter((x) => x.statusHoje === "Finalizado").length;

  if (!func) return <PageHeader title="Atividades" sub="Nenhum funcionário cadastrado." />;
  const atual = resumo.find((x) => x.id === func.id)!;

  const concluirRapido = (a: Atividade) => {
    const novoStatus: PendenciaStatus = statusRealAtividade(s, a) === "Finalizado" ? "A fazer" : "Finalizado";
    set((st) => aplicarPatch(st, func.id, a, { status:novoStatus, justificativa: novoStatus === "A fazer" ? undefined : a.justificativa }));
  };

  const decidirJustificativa = (funcionarioId:string, atividadeId:string, decisao:"Aprovada"|"Rejeitada") => {
    set((st)=>({
      ...st,
      funcionarios:st.funcionarios.map((f)=>f.id===funcionarioId ? {
        ...f,
        atividades:f.atividades.map((a)=>a.id===atividadeId && a.justificativa ? {
          ...a,
          justificativa:{
            ...a.justificativa,
            status:decisao,
            decididaEm:new Date().toISOString(),
            decididoPor:st.usuarios.find((u)=>u.id===st.usuarioAtivoId)?.nome || st.perfil,
          },
        }:a),
      }:f),
    }));
  };

  const alternarRotinaHoje = (rotinaId:string) => {
    set((st) => {
      const rotina = st.rotinasDiarias.find((r) => r.id === rotinaId);
      if (!rotina || !rotina.ativa) return st;
      const funcionario = st.funcionarios.find((f) => f.id === rotina.funcionarioId);
      if (!funcionario) return st;

      const dataReferencia = dataRotinaAtual(rotina);
      let atividade = funcionario.atividades.find((a) =>
        a.sourceRotinaId === rotina.id &&
        ((rotina.frequencia || "Diária") === "Mensal" ? a.data.startsWith(hoje().slice(0,7)) : a.data === dataReferencia)
      );
      let base = st;

      if (!atividade) {
        atividade = {
          id:`rotina-${rotina.id}-${dataReferencia}`,
          titulo:rotina.titulo,
          data:dataReferencia,
          horario:rotina.horario,
          feito:false,
          status:"A fazer",
          sourceRotinaId:rotina.id,
          origem:"Rotina diária",
          descricao:rotina.descricao,
          prioridade:rotina.prioridade,
          checklist:rotina.checklist.map((item)=>({
            ...item,
            feito:false,
            prazo:dataReferencia,
            statusAtividade:"A fazer",
          })),
        };
        base = {
          ...st,
          funcionarios:st.funcionarios.map((f)=>f.id===rotina.funcionarioId
            ? {...f,atividades:[...f.atividades,atividade!]}
            : f),
        };
      }

      const atual = statusRealAtividade(base, atividade);
      return aplicarPatch(base, rotina.funcionarioId, atividade, {
        status: atual === "Finalizado" ? "A fazer" : "Finalizado",
        justificativa: undefined,
      });
    });
  };

  const alternarRotinaAtiva = (rotinaId:string) => {
    set((st)=>({
      ...st,
      rotinasDiarias:st.rotinasDiarias.map((r)=>r.id===rotinaId?{...r,ativa:!r.ativa}:r),
    }));
  };

  const excluirRotinaFixa = (rotinaId:string) => {
    if(!confirm("Excluir esta atividade fixa? O histórico dos dias anteriores será mantido.")) return;
    set((st)=>({
      ...st,
      rotinasDiarias:st.rotinasDiarias.filter((r)=>r.id!==rotinaId),
      funcionarios:st.funcionarios.map((f)=>({
        ...f,
        atividades:f.atividades.filter((a)=>{
          if(a.sourceRotinaId!==rotinaId) return true;
          const rotina=st.rotinasDiarias.find((r)=>r.id===rotinaId);
          if(!rotina) return true;
          return (rotina.frequencia || "Diária") === "Mensal"
            ? !a.data.startsWith(hoje().slice(0,7))
            : a.data !== hoje();
        }),
      })),
    }));
  };

  return (
    <>
      <PageHeader
        title="Atividades"
        sub="Acompanhe entregas, rotinas diárias e tarefas delegadas da equipe."
        action={<Btn onClick={() => setOpen(true)}><Plus className="h-4 w-4" />Registrar atividade</Btn>}
      />

      {podeGerirJustificativas && !!justificativasPendentes.length && <Panel className="mb-4" title="Justificativas aguardando aprovação" action={<Badge tone="warn">{justificativasPendentes.length}</Badge>}>
        <div className="space-y-2">
          {justificativasPendentes.map(({funcionario,atividade})=><div key={atividade.id} className="flex flex-col gap-3 rounded-xl border border-warn/20 bg-warn/[.035] p-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2"><BellRing className="h-4 w-4 text-warn"/><b>{funcionario.nome}</b><Badge tone="muted">{atividade.titulo}</Badge></div>
              <div className="mt-1 text-sm text-muted-foreground">{atividade.justificativa?.motivo}</div>
              <div className="mt-1 text-[11px] text-muted-foreground">{fmtDate(atividade.data)}{atividade.horario ? ` · ${atividade.horario}` : ""}</div>
            </div>
            <div className="flex gap-2">
              <Btn variant="outline" onClick={()=>decidirJustificativa(funcionario.id,atividade.id,"Aprovada")}><CheckCircle2 className="h-4 w-4"/>Aceitar</Btn>
              <Btn variant="danger" onClick={()=>decidirJustificativa(funcionario.id,atividade.id,"Rejeitada")}><XCircle className="h-4 w-4"/>Rejeitar</Btn>
            </div>
          </div>)}
        </div>
      </Panel>}

            <div className="mb-4 grid gap-3 lg:grid-cols-[300px_1fr]">
        <Panel title="Equipe">
          <div className="space-y-1">
            {s.funcionarios.map((f) => (
              <button
                key={f.id}
                onClick={() => { setSel(f.id); setActivityId(null); }}
                className={`w-full rounded-xl px-3 py-2.5 text-left text-sm transition ${sel === f.id ? "bg-primary text-primary-foreground shadow-brand" : "hover:bg-muted"}`}
              >
                <div className="font-black">{f.nome}</div>
                <div className={`text-xs ${sel === f.id ? "opacity-80" : "text-muted-foreground"}`}>{f.cargo}</div>
              </button>
            ))}
          </div>
        </Panel>

        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Stat label="Atividades" value={String(atual.total)} hint={func.cargo} />
          <Stat label="Concluídas" value={String(atual.concluidas)} hint="entregas válidas" />
          <Stat label="Pendentes" value={String(atual.pendentes)} hint="em aberto" />
          <Stat accent label="Taxa de conclusão" value={`${atual.taxa}%`} hint="desempenho operacional" />
          <Stat label="Pontos negativos" value={String(atual.negativos)} hint="justificativas rejeitadas" />
        </div>
      </div>

      <div className="mb-3 flex flex-wrap items-end gap-2 rounded-2xl border border-white/8 bg-white/[.02] p-3">
        <div className="mr-1 flex items-center gap-2 text-xs font-black uppercase tracking-[.1em] text-muted-foreground"><Filter className="h-4 w-4 text-primary"/>Filtros</div>
        <Field label="Bloco"><select className={inputCls} value={filtroBloco} onChange={(e)=>setFiltroBloco(e.target.value as "Todos" | PendenciaStatus)}><option>Todos</option>{COLUNAS.map((x)=><option key={x}>{x}</option>)}</select></Field>
        <Field label="Prioridade"><select className={inputCls} value={filtroPrioridade} onChange={(e)=>setFiltroPrioridade(e.target.value as typeof filtroPrioridade)}><option>Todas</option><option>Alta</option><option>Média</option><option>Baixa</option></select></Field>
        <Field label="Ordenar"><select className={inputCls} value={ordenacao} onChange={(e)=>setOrdenacao(e.target.value as typeof ordenacao)}><option>Prioridade</option><option>Prazo</option></select></Field>
        <div className="ml-auto hidden items-center gap-1 text-[11px] text-muted-foreground sm:flex"><ArrowDownUp className="h-3.5 w-3.5"/>até 10 blocos visíveis; o restante rola dentro da coluna</div>
      </div>

      <Panel title={`Atividades · ${func.nome}`} action={<Badge tone="primary">ESTILO TRELLO</Badge>}>
        <div className="grid gap-4 xl:grid-cols-4">
          {(filtroBloco === "Todos" || filtroBloco === "A fazer") && <div className="rounded-2xl border border-success/20 bg-success/[.025] p-3">
            {(()=>{
              const rotinas = rotinasFixasHoje.filter((x)=>x.rotina.funcionarioId===func.id);
              const ativas = rotinas.filter((x)=>x.rotina.ativa);
              const concluidas = ativas.filter((x)=>x.statusHoje==="Finalizado").length;
              return <>
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 font-display font-black"><Repeat2 className="h-4 w-4 text-success"/>Atividades fixas</div>
                    <div className="mt-0.5 text-[10px] text-muted-foreground">Renovam automaticamente por dia ou mês.</div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Badge tone={ativas.length&&concluidas===ativas.length?"success":"muted"}>{concluidas}/{ativas.length}</Badge>
                    <button type="button" title="Nova atividade fixa" onClick={()=>setOpenFixed(true)} className="grid h-8 w-8 place-items-center rounded-lg border border-success/25 bg-success/5 text-success transition hover:bg-success/10"><Plus className="h-4 w-4"/></button>
                  </div>
                </div>
                <div className="max-h-[760px] space-y-1.5 overflow-y-auto pr-1">
                  {rotinas.map(({rotina,atividadeHoje,statusHoje})=>{
                    const concluida=statusHoje==="Finalizado";
                    const checklistHoje=atividadeHoje?.checklist||rotina.checklist;
                    const feitos=checklistHoje.filter((i)=>i.feito).length;
                    return <div key={rotina.id} className={`rounded-xl border p-2.5 transition ${!rotina.ativa?"border-white/7 bg-white/[.015] opacity-55":concluida?"border-success/25 bg-success/[.04]":"border-white/8 bg-card"}`}>
                      <div className="flex items-start gap-2.5">
                        <button type="button" disabled={!rotina.ativa} aria-label={concluida?"Desmarcar atividade fixa":"Concluir atividade fixa"} onClick={()=>alternarRotinaHoje(rotina.id)} className="mt-0.5 shrink-0 disabled:cursor-not-allowed">
                          {concluida?<CheckCircle2 className="h-5 w-5 text-success"/>:<CircleDot className="h-5 w-5 text-muted-foreground hover:text-primary"/>}
                        </button>
                        <div className="min-w-0 flex-1">
                          <button type="button" disabled={!atividadeHoje} onClick={()=>{if(atividadeHoje)setActivityId(atividadeHoje.id);}} className={`block w-full text-left font-bold leading-snug ${concluida?"line-through text-muted-foreground":""}`}>{rotina.titulo}</button>
                          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[10px] text-muted-foreground">
                            <Badge tone={(rotina.frequencia || "Diária")==="Mensal"?"warn":"success"}>{(rotina.frequencia || "Diária").toUpperCase()}</Badge>
                            {(rotina.frequencia || "Diária")==="Mensal"&&<span className="inline-flex items-center gap-1"><CalendarDays className="h-3 w-3"/>{fmtDate(dataRotinaAtual(rotina))}</span>}
                            {rotina.horario&&<span className="inline-flex items-center gap-1"><Clock3 className="h-3 w-3"/>{rotina.horario}</span>}
                            <Badge tone={rotina.prioridade==="Alta"?"primary":rotina.prioridade==="Média"?"warn":"muted"}>{rotina.prioridade}</Badge>
                            {!!checklistHoje.length&&<span className="inline-flex items-center gap-1"><ListChecks className="h-3 w-3"/>{feitos}/{checklistHoje.length}</span>}
                          </div>
                          {rotina.descricao&&<div className="mt-1 line-clamp-2 text-[11px] text-muted-foreground">{rotina.descricao}</div>}
                        </div>
                      </div>
                      <div className="mt-2 flex justify-end gap-1 border-t border-white/7 pt-2">
                        <button type="button" title={rotina.ativa?"Pausar":"Reativar"} onClick={()=>alternarRotinaAtiva(rotina.id)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-white/[.06] hover:text-foreground">{rotina.ativa?<PauseCircle className="h-4 w-4"/>:<PlayCircle className="h-4 w-4"/>}</button>
                        <button type="button" title="Excluir atividade fixa" onClick={()=>excluirRotinaFixa(rotina.id)} className="rounded-lg p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-primary"><Trash2 className="h-4 w-4"/></button>
                      </div>
                    </div>;
                  })}
                  {!rotinas.length&&<div className="rounded-2xl border border-dashed border-white/10 p-6 text-center">
                    <Repeat2 className="mx-auto h-7 w-7 text-muted-foreground/45"/>
                    <div className="mt-2 text-xs font-bold">Nenhuma atividade fixa</div>
                    <button type="button" onClick={()=>setOpenFixed(true)} className="mt-2 text-[11px] font-black text-primary hover:underline">+ Cadastrar atividade fixa</button>
                  </div>}
                </div>
              </>;
            })()}
          </div>}

          {COLUNAS.filter((col) => filtroBloco === "Todos" || filtroBloco === col).map((col) => {
            const itens = func.atividades
              .filter((a) => statusRealAtividade(s,a) === col)
              .filter((a) => filtroPrioridade === "Todas" || (a.prioridade || "Média") === filtroPrioridade)
              .sort((a,b) => {
                if (ordenacao === "Prazo") return (a.data || "9999").localeCompare(b.data || "9999") || (a.horario || "99:99").localeCompare(b.horario || "99:99");
                const pa = PRIORIDADE_ORDEM[a.prioridade || "Média"];
                const pb = PRIORIDADE_ORDEM[b.prioridade || "Média"];
                return pa - pb || (a.data || "9999").localeCompare(b.data || "9999");
              });

            return <div key={col} className="rounded-2xl border border-white/8 bg-black/[.08] p-3">
              <div className="mb-3 flex items-center justify-between gap-2"><div className="font-display font-black">{col}</div><Badge tone={col === "Finalizado" ? "success" : col === "Realizando" ? "warn" : "muted"}>{itens.length}</Badge></div>
              <div className="max-h-[760px] space-y-1.5 overflow-y-auto pr-1">
                {itens.map((a) => {
                  const pai = atividadePai(s,a);
                  const checklist = pai?.atividade.checklist || (a.sourcePendenciaId ? s.pendencias.find((p)=>p.id===a.sourcePendenciaId)?.checklist : undefined) || a.checklist || [];
                  const feitos = checklist.filter((x)=>x.feito).length;
                  const origemRe = contextoReinauguracao(s,a);
                  return <div key={a.id} role="button" tabIndex={0} onClick={()=>setActivityId(a.id)} onKeyDown={(e)=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();setActivityId(a.id);}}} className="cursor-pointer rounded-xl border border-white/8 bg-card p-2.5 text-left transition hover:border-primary/35 hover:shadow-soft">
                    <div className="flex items-start gap-3">
                      <button type="button" aria-label={col==="Finalizado"?"Reabrir atividade":"Concluir atividade"} onClick={(e)=>{e.stopPropagation();concluirRapido(a);}} className="mt-0.5 shrink-0">
                        {col === "Finalizado" ? <CheckCircle2 className="h-5 w-5 text-success"/> : <Clock3 className="h-5 w-5 text-muted-foreground hover:text-primary"/>}
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className={`font-bold leading-snug ${col==="Finalizado"?"line-through text-muted-foreground":""}`}>{a.titulo}</div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-muted-foreground">
                          <button type="button" onClick={(e)=>{e.stopPropagation();setActivityId(a.id);}} className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 hover:bg-muted" title={a.data?"Editar prazo e horário":"Definir prazo e horário"}>
                            <CalendarDays className="h-3 w-3"/>{a.data ? fmtDate(a.data) : "Sem prazo"}{a.horario ? ` · ${a.horario}` : ""}
                          </button>
                          {!!checklist.length && <span className="inline-flex items-center gap-1"><ListChecks className="h-3 w-3"/>{feitos}/{checklist.length}</span>}
                          <Badge tone={(a.prioridade || "Média") === "Alta" ? "primary" : (a.prioridade || "Média") === "Média" ? "warn" : "muted"}>{a.prioridade || "Média"}</Badge>
                          {a.sourceRotinaId && <Badge tone="success">DIÁRIA</Badge>}
                          {a.sourceAtividadeId && <Badge tone="primary">CHECKLIST DELEGADO</Badge>}
                          {a.sourcePendenciaId && <Badge tone="primary">Pendências</Badge>}
                          {origemRe && <Link
                            to="/reinauguracao/$id"
                            params={{id:origemRe.reinauguracao.id}}
                            onClick={(e)=>e.stopPropagation()}
                            className="inline-flex"
                            title="Abrir quadro da reinauguração"
                          ><Badge tone="success">{origemRe.etiqueta}</Badge></Link>}
                          {a.justificativa && <Badge tone={a.justificativa.status==="Aprovada"?"success":a.justificativa.status==="Rejeitada"?"primary":"warn"}>Justificativa {a.justificativa.status.toLowerCase()}</Badge>}
                        </div>
                        {origemRe?.contexto && <div className="mt-1 truncate text-[10px] font-semibold uppercase tracking-[.04em] text-success">{origemRe.contexto}</div>}
                        {pai && <div className="mt-1 text-[10px] font-semibold uppercase tracking-[.04em] text-primary">Atividade principal: {pai.atividade.titulo}</div>}
                        {a.descricao && <div className="mt-1 line-clamp-1 text-[11px] leading-relaxed text-muted-foreground">{a.descricao}</div>}
                      </div>
                    </div>
                  </div>;
                })}
                {!itens.length && <div className="rounded-2xl border border-dashed border-white/10 p-6 text-center text-xs text-muted-foreground">Nenhuma atividade em {col.toLowerCase()}.</div>}
              </div>
            </div>;
          })}
        </div>
      </Panel>

      <ActivityModal key={`nova-${func.id}`} open={open} onClose={() => setOpen(false)} defaultFuncionarioId={func.id} />
      <ActivityModal key={`fixa-${func.id}-${openFixed}`} open={openFixed} onClose={() => setOpenFixed(false)} defaultFuncionarioId={func.id} fixedMode />
      <ActivityDetailModal funcionarioId={func.id} atividadeId={activityId} onClose={()=>setActivityId(null)} />
    </>
  );
}

type ChecklistForm = { id:string; texto:string; prazo:string; horario:string; responsavelId:string };

function ActivityModal({ open, onClose, defaultFuncionarioId, fixedMode = false }: { open: boolean; onClose: () => void; defaultFuncionarioId: string; fixedMode?: boolean }) {
  const { s, set } = useApp();
  const [f, setF] = useState({
    funcionarioId: defaultFuncionarioId,
    titulo: "",
    data: hoje(),
    horario: "",
    descricao: "",
    prioridade: "Média" as "Alta" | "Média" | "Baixa",
    diaria: fixedMode,
    frequencia: "Diária" as "Diária" | "Mensal",
    diaMes: 1,
  });
  const [checklistItens, setChecklistItens] = useState<ChecklistForm[]>([{ id:uid(), texto:"", prazo:"", horario:"", responsavelId:"" }]);

  const salvar = () => {
    if (!f.titulo.trim()) return;
    const checklist:AtividadeChecklistItem[] = checklistItens
      .filter((x)=>x.texto.trim())
      .flatMap((x)=>{
        const responsaveis = x.responsavelId === "__todos__"
          ? s.funcionarios
          : [s.funcionarios.find((u)=>u.id===x.responsavelId)].filter(Boolean);
        if (!responsaveis.length) {
          return [{
            id:x.id || uid(),
            texto:x.texto.trim(),
            feito:false,
            prazo:x.prazo || undefined,
            horario:x.horario || undefined,
            statusAtividade:"A fazer" as PendenciaStatus,
          }];
        }
        return responsaveis.map((resp, index)=>({
          id:index===0 ? (x.id || uid()) : uid(),
          texto:x.texto.trim(),
          feito:false,
          prazo:x.prazo || undefined,
          horario:x.horario || undefined,
          responsavelId:resp!.id,
          responsavel:resp!.nome,
          statusAtividade:"A fazer" as PendenciaStatus,
        }));
      });

    const referenciaRotina = f.diaria ? dataRotinaAtual({ frequencia:f.frequencia, diaMes:f.diaMes } as AppState["rotinasDiarias"][number]) : f.data;
    const destinatarios = f.funcionarioId === "__todos__" ? s.funcionarios.map((x)=>x.id) : [f.funcionarioId];

    set((st)=>{
      const novasRotinas = f.diaria ? destinatarios.map((funcionarioId)=>{
        const rotinaId=uid();
        return {
          id:rotinaId,
          funcionarioId,
          titulo:f.titulo.trim(),
          descricao:f.descricao.trim(),
          horario:f.horario || undefined,
          prioridade:f.prioridade,
          checklist:checklist.map((x)=>({...x,id:uid(),feito:false,statusAtividade:"A fazer" as PendenciaStatus})),
          ativa:true,
          frequencia:f.frequencia,
          diaMes:f.frequencia==="Mensal"?f.diaMes:undefined,
          criadaEm:new Date().toISOString(),
        };
      }) : [];

      return {
        ...st,
        rotinasDiarias:f.diaria ? [...st.rotinasDiarias,...novasRotinas] : st.rotinasDiarias,
        funcionarios:st.funcionarios.map((x)=>{
          if(!destinatarios.includes(x.id)) return x;
          const rotina=novasRotinas.find((r)=>r.funcionarioId===x.id);
          const atividade:Atividade={
            id:uid(),
            titulo:f.titulo.trim(),
            data:referenciaRotina || hoje(),
            horario:f.horario || undefined,
            feito:false,
            status:"A fazer",
            descricao:f.descricao.trim(),
            prioridade:f.prioridade,
            checklist:checklist.map((item)=>({...item,id:uid()})),
            origem:f.diaria?"Rotina diária":"Manual",
            sourceRotinaId:rotina?.id,
          };
          return {...x,atividades:[...x.atividades,atividade]};
        }),
      };
    });

    onClose();
    setF({...f,titulo:"",descricao:"",horario:"",diaria:fixedMode,frequencia:"Diária",diaMes:1});
    setChecklistItens([{id:uid(),texto:"",prazo:"",horario:"",responsavelId:""}]);
  };

  return <Modal open={open} onClose={onClose} title={fixedMode?"Cadastrar atividade fixa":"Registrar atividade"} wide>
    <div className="space-y-3">
      <Field label="Responsável geral"><select className={inputCls} value={f.funcionarioId} onChange={(e)=>setF({...f,funcionarioId:e.target.value})}><option value="__todos__">Todos os colaboradores</option>{s.funcionarios.map((x)=><option key={x.id} value={x.id}>{x.nome} — {x.cargo}</option>)}</select></Field>
      <Field label="Entrega / atividade"><input className={inputCls} placeholder="Ex.: Sorteio da Moto" value={f.titulo} onChange={(e)=>setF({...f,titulo:e.target.value})}/></Field>
      <Field label="Descrição"><textarea rows={3} className={inputCls} placeholder="Explique o que precisa ser feito..." value={f.descricao} onChange={(e)=>setF({...f,descricao:e.target.value})}/></Field>
      <div className={`grid gap-3 ${fixedMode?"sm:grid-cols-2":"sm:grid-cols-3"}`}>
        {!fixedMode&&<Field label="Data / prazo"><input type="date" className={inputCls} value={f.data} onChange={(e)=>setF({...f,data:e.target.value})}/></Field>}
        {fixedMode&&<Field label="Frequência"><select className={inputCls} value={f.frequencia} onChange={(e)=>setF({...f,frequencia:e.target.value as "Diária"|"Mensal"})}><option>Diária</option><option>Mensal</option></select></Field>}
        {fixedMode&&f.frequencia==="Mensal"&&<Field label="Dia do mês"><input type="number" min={1} max={31} className={inputCls} value={f.diaMes} onChange={(e)=>setF({...f,diaMes:Math.min(31,Math.max(1,Number(e.target.value)||1))})}/></Field>}
        <Field label={fixedMode?(f.frequencia==="Mensal"?"Horário da entrega":"Horário diário"):"Horário para conclusão"}><input type="time" className={inputCls} value={f.horario} onChange={(e)=>setF({...f,horario:e.target.value})}/></Field>
        <Field label="Prioridade"><select className={inputCls} value={f.prioridade} onChange={(e)=>setF({...f,prioridade:e.target.value as typeof f.prioridade})}><option>Alta</option><option>Média</option><option>Baixa</option></select></Field>
      </div>

      {fixedMode ? <div className="flex items-start gap-3 rounded-xl border border-success/30 bg-success/[.04] p-3">
        <Repeat2 className="mt-0.5 h-4 w-4 shrink-0 text-success"/>
        <div><div className="font-bold">Essa atividade será fixa</div><div className="mt-1 text-xs text-muted-foreground">{f.frequencia==="Mensal" ? `Ela reaparece todo mês no dia ${f.diaMes}. O check reinicia no mês seguinte.` : "Ela aparece todos os dias. O check reinicia automaticamente no dia seguinte."}</div></div>
      </div> : <label className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition ${f.diaria?"border-success/30 bg-success/[.04]":"border-white/8"}`}>
        <input type="checkbox" className="mt-1 accent-[var(--primary)]" checked={f.diaria} onChange={(e)=>setF({...f,diaria:e.target.checked})}/>
        <div><div className="flex items-center gap-2 font-bold"><Repeat2 className="h-4 w-4 text-success"/>Atividade diária fixa</div><div className="mt-1 text-xs text-muted-foreground">Cria automaticamente uma nova tarefa todos os dias com a data atualizada.</div></div>
      </label>}

      <div>
        <div className="mb-2 flex items-center justify-between gap-2">
          <div><div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Checklist delegado</div><div className="mt-1 text-[11px] text-muted-foreground">Cada item pode ser entregue por uma pessoa diferente. Ele cai automaticamente no quadro desse colaborador.</div></div>
          <Btn variant="outline" onClick={()=>setChecklistItens((itens)=>[...itens,{id:uid(),texto:"",prazo:"",horario:"",responsavelId:""}])}><Plus className="h-4 w-4"/>Item</Btn>
        </div>
        <div className="space-y-2">
          {checklistItens.map((item,idx)=><div key={item.id} className="grid min-w-0 gap-2 rounded-xl border border-white/8 bg-white/[.02] p-2.5 sm:grid-cols-2">
            <input className={inputCls} placeholder={idx===0?"Ex.: Organizar espaço de gravação":"Próxima etapa..."} value={item.texto} onChange={(e)=>setChecklistItens((itens)=>itens.map((x)=>x.id===item.id?{...x,texto:e.target.value}:x))}/>
            <select className={inputCls} value={item.responsavelId} onChange={(e)=>setChecklistItens((itens)=>itens.map((x)=>x.id===item.id?{...x,responsavelId:e.target.value}:x))}><option value="">Sem atribuição</option><option value="__todos__">Todos os colaboradores</option>{s.funcionarios.map((u)=><option key={u.id} value={u.id}>{u.nome}</option>)}</select>
            <input type="date" className={inputCls} value={item.prazo} onChange={(e)=>setChecklistItens((itens)=>itens.map((x)=>x.id===item.id?{...x,prazo:e.target.value}:x))}/>
            <input type="time" className={inputCls} value={item.horario} onChange={(e)=>setChecklistItens((itens)=>itens.map((x)=>x.id===item.id?{...x,horario:e.target.value}:x))}/>
            <button type="button" aria-label="Remover item" onClick={()=>setChecklistItens((itens)=>itens.length===1?[{...itens[0],texto:"",prazo:"",horario:"",responsavelId:""}]:itens.filter((x)=>x.id!==item.id))} className="grid h-10 w-10 place-items-center rounded-xl border border-white/8 text-muted-foreground hover:border-primary/30 hover:text-primary"><Trash2 className="h-4 w-4"/></button>
          </div>)}
        </div>
      </div>

      <Btn className="w-full" onClick={salvar}><UserRoundCog className="h-4 w-4"/>{fixedMode?"Salvar atividade fixa":"Salvar atividade"}</Btn>
    </div>
  </Modal>;
}

function ActivityDetailModal({ funcionarioId, atividadeId, onClose }: { funcionarioId:string; atividadeId:string|null; onClose:()=>void }) {
  const { s, set }=useApp();
  const [novoItem,setNovoItem]=useState("");
  const [novoItemPrazo,setNovoItemPrazo]=useState("");
  const [novoItemHorario,setNovoItemHorario]=useState("");
  const [novoItemResp,setNovoItemResp]=useState("");
  const [transferirPara,setTransferirPara]=useState("");
  const [motivo,setMotivo]=useState("");
  const [novoComentario,setNovoComentario]=useState("");

  const func=s.funcionarios.find((x)=>x.id===funcionarioId);
  const atividade=func?.atividades.find((x)=>x.id===atividadeId);
  const usuarioAtual=s.usuarios.find((u)=>u.id===s.usuarioAtivoId);

  useEffect(()=>{
    if(!usuarioAtual?.id || !atividade) return;
    const temNaoLido=(atividade.comentarios||[]).some((comentario)=>
      comentario.mencoesUsuarioIds?.includes(usuarioAtual.id) &&
      !comentario.lidaPorUsuarioIds?.includes(usuarioAtual.id)
    );
    if(!temNaoLido) return;
    set((st)=>{
      const f=st.funcionarios.find((x)=>x.id===funcionarioId);
      const atual=f?.atividades.find((a)=>a.id===atividade.id);
      if(!atual) return st;
      return aplicarPatch(st,funcionarioId,atual,{
        comentarios:(atual.comentarios||[]).map((comentario)=>
          comentario.mencoesUsuarioIds?.includes(usuarioAtual.id) && !comentario.lidaPorUsuarioIds?.includes(usuarioAtual.id)
            ? {...comentario,lidaPorUsuarioIds:[...(comentario.lidaPorUsuarioIds||[]),usuarioAtual.id]}
            : comentario
        ),
      });
    });
  },[atividade?.id,funcionarioId,usuarioAtual?.id,set]);

  if(!atividade) return null;

  const vinculada=atividade.sourcePendenciaId?s.pendencias.find((p)=>p.id===atividade.sourcePendenciaId):undefined;
  const pai=atividadePai(s,atividade);
  const origemRe=contextoReinauguracao(s,atividade);
  const status=statusRealAtividade(s,atividade);
  const checklist=(pai?.atividade.checklist || vinculada?.checklist || atividade.checklist || []) as AtividadeChecklistItem[];
  const isRotina=!!atividade.sourceRotinaId;
  const funcionarioAtual=usuarioAtual?.vinculoId
    ? s.funcionarios.find((f)=>f.id===usuarioAtual.vinculoId)
    : funcionarioPorNome(s,usuarioAtual?.nome);
  const comentarios=(atividade.comentarios || []) as ComentarioAtividade[];
  const usuariosMencionaveis=s.usuarios.filter((u)=>u.ativo && u.perfil!=="Influencer" && u.id!==usuarioAtual?.id);

  const atualizar=(patch:Partial<Atividade>&{status?:PendenciaStatus})=>set((st)=>aplicarPatch(st,funcionarioId,atividade,patch));

  const inserirMencao=(nome:string)=>{
    const primeiro=nome.trim().split(/\s+/)[0];
    setNovoComentario((atual)=>{
      const prefixo=atual && !/\s$/.test(atual) ? atual+" " : atual;
      return `${prefixo}@${primeiro} `;
    });
  };

  const enviarComentario=()=>{
    const texto=novoComentario.trim();
    if(!texto || !usuarioAtual) return;

    const textoNormalizado=texto.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
    const mencoes=usuariosMencionaveis.filter((u)=>{
      const nome=u.nome.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
      const primeiro=nome.split(/\s+/)[0];
      return textoNormalizado.includes(`@${nome}`) || textoNormalizado.includes(`@${primeiro}`);
    }).map((u)=>u.id);

    const comentario:ComentarioAtividade={
      id:uid(),
      autorUsuarioId:usuarioAtual.id,
      autorFuncionarioId:funcionarioAtual?.id,
      autorNome:usuarioAtual.nome,
      texto,
      criadoEm:new Date().toISOString(),
      mencoesUsuarioIds:[...new Set(mencoes)],
      lidaPorUsuarioIds:[usuarioAtual.id],
    };

    atualizar({comentarios:[...comentarios,comentario]});
    setNovoComentario("");
  };

  const transferir=()=>{
    if(!transferirPara||transferirPara===funcionarioId) return;
    const destino=s.funcionarios.find((f)=>f.id===transferirPara);
    if(!destino)return;

    set((st)=>{
      if(atividade.sourceAtividadeId&&atividade.sourceAtividadeOwnerId&&atividade.sourceAtividadeChecklistItemId){
        return {...st,funcionarios:st.funcionarios.map((f)=>f.id===atividade.sourceAtividadeOwnerId?{...f,atividades:f.atividades.map((a)=>a.id===atividade.sourceAtividadeId?{...a,checklist:(a.checklist||[]).map((i)=>i.id===atividade.sourceAtividadeChecklistItemId?{...i,responsavelId:destino.id,responsavel:destino.nome}:i)}:a)}:f)};
      }
      if(atividade.sourceReinauguracaoId&&atividade.sourceReinauguracaoCardId){
        const reinauguracoes=st.reinauguracoes.map((r)=>r.id===atividade.sourceReinauguracaoId?{...r,cards:r.cards.map((card)=>{
          if(card.id!==atividade.sourceReinauguracaoCardId)return card;
          if(atividade.sourceReinauguracaoItemId)return {...card,checklist:card.checklist.map((i)=>i.id===atividade.sourceReinauguracaoItemId?{...i,responsavelId:destino.id,responsavel:destino.nome}:i)};
          const nomeAtual=(func?.nome||"").toUpperCase();
          return {...card,responsaveis:[...new Set([...card.responsaveis.filter((n)=>n.toUpperCase()!==nomeAtual),destino.nome.toUpperCase()])]};
        })}:r);
        return {...st,reinauguracoes};
      }
      if(atividade.sourcePendenciaId){
        return {...st,pendencias:st.pendencias.map((p)=>p.id===atividade.sourcePendenciaId?{...p,funcionarioId:destino.id,responsavel:destino.nome}:p)};
      }
      if(atividade.sourceRotinaId){
        return {
          ...st,
          rotinasDiarias:st.rotinasDiarias.map((r)=>r.id===atividade.sourceRotinaId?{...r,funcionarioId:destino.id}:r),
          funcionarios:st.funcionarios.map((f)=>f.id===funcionarioId?{...f,atividades:f.atividades.filter((a)=>a.id!==atividade.id)}:f),
        };
      }

      let movida:Atividade|undefined;
      const funcionarios=st.funcionarios.map((f)=>{
        if(f.id!==funcionarioId)return f;
        movida=f.atividades.find((a)=>a.id===atividade.id);
        return {...f,atividades:f.atividades.filter((a)=>a.id!==atividade.id)};
      }).map((f)=>f.id===destino.id&&movida?{...f,atividades:[...f.atividades,movida]}:f);
      return {...st,funcionarios};
    });
    setTransferirPara("");
    onClose();
  };

  const excluir=()=>{
    if(!confirm("Excluir esta demanda? A exclusão também será refletida na origem vinculada."))return;
    set((st)=>{
      if(atividade.sourceAtividadeId&&atividade.sourceAtividadeOwnerId&&atividade.sourceAtividadeChecklistItemId){
        return {...st,funcionarios:st.funcionarios.map((f)=>f.id===atividade.sourceAtividadeOwnerId?{...f,atividades:f.atividades.map((a)=>a.id===atividade.sourceAtividadeId?{...a,checklist:(a.checklist||[]).filter((i)=>i.id!==atividade.sourceAtividadeChecklistItemId)}:a)}:f)};
      }
      if(atividade.sourceReinauguracaoId&&atividade.sourceReinauguracaoCardId){
        const nomeAtual=(func?.nome||"").toUpperCase();
        const reinauguracoes=st.reinauguracoes.map((r)=>r.id===atividade.sourceReinauguracaoId?{...r,cards:r.cards.map((card)=>{
          if(card.id!==atividade.sourceReinauguracaoCardId)return card;
          if(atividade.sourceReinauguracaoItemId)return recalcularCard({...card,checklist:card.checklist.filter((i)=>i.id!==atividade.sourceReinauguracaoItemId)});
          return {...card,responsaveis:card.responsaveis.filter((n)=>n.toUpperCase()!==nomeAtual)};
        })}:r);
        return {...st,reinauguracoes};
      }
      if(atividade.sourcePendenciaId)return {...st,pendencias:st.pendencias.filter((p)=>p.id!==atividade.sourcePendenciaId)};
      if(atividade.sourceRotinaId)return {...st,rotinasDiarias:st.rotinasDiarias.filter((r)=>r.id!==atividade.sourceRotinaId),funcionarios:st.funcionarios.map((f)=>({...f,atividades:f.atividades.filter((a)=>a.sourceRotinaId!==atividade.sourceRotinaId)}))};
      return {...st,funcionarios:st.funcionarios.map((f)=>f.id===funcionarioId?{...f,atividades:f.atividades.filter((a)=>a.id!==atividade.id)}:f)};
    });
    onClose();
  };

  const justificar=()=>{
    if(!motivo.trim())return;
    set((st)=>({
      ...st,
      funcionarios:st.funcionarios.map((f)=>f.id===funcionarioId?{...f,atividades:f.atividades.map((a)=>a.id===atividade.id?{
        ...a,
        status:"Finalizado",
        feito:false,
        justificativa:{motivo:motivo.trim(),status:"Pendente",enviadaEm:new Date().toISOString()},
      }:a)}:f),
    }));
    setMotivo("");
    onClose();
  };

  return <Modal open={!!atividadeId} onClose={onClose} title={atividade.titulo} extraWide>
    <div className="grid min-w-0 gap-4 xl:grid-cols-[minmax(0,1.35fr)_minmax(280px,.65fr)]">
      <div className="min-w-0 space-y-4">
        <Field label="Título"><input className={inputCls} value={atividade.titulo} onChange={(e)=>atualizar({titulo:e.target.value})}/></Field>
        <Field label="Descrição"><textarea rows={4} className={inputCls} value={atividade.descricao||""} onChange={(e)=>atualizar({descricao:e.target.value})}/></Field>
        <div className="grid min-w-0 grid-cols-2 gap-3 xl:grid-cols-4">
          <Field label="Prazo"><input type="date" className={inputCls} value={atividade.data||""} onChange={(e)=>atualizar({data:e.target.value})}/></Field>
          <Field label="Horário"><input type="time" className={inputCls} value={atividade.horario||""} onChange={(e)=>atualizar({horario:e.target.value})}/></Field>
          <Field label="Status"><select className={inputCls} value={status} onChange={(e)=>atualizar({status:e.target.value as PendenciaStatus})}>{COLUNAS.map((x)=><option key={x}>{x}</option>)}</select></Field>
          <Field label="Prioridade"><select className={inputCls} value={atividade.prioridade||"Média"} onChange={(e)=>atualizar({prioridade:e.target.value as Atividade["prioridade"]})}><option>Alta</option><option>Média</option><option>Baixa</option></select></Field>
        </div>

        <Panel title="Checklist e responsáveis" action={<ListChecks className="h-4 w-4 text-primary"/>}>
          {pai && <div className="mb-3 rounded-xl border border-primary/15 bg-primary/[.035] p-3 text-xs text-muted-foreground">Você está vendo o checklist completo da atividade <b className="text-foreground">{pai.atividade.titulo}</b>. Assim todos enxergam quem precisa entregar cada etapa.</div>}
          <div className="space-y-2">
            {checklist.map((x)=>{
              const atrasado=!!x.prazo&&x.prazo<hoje()&&!x.feito;
              const resp=s.funcionarios.find((u)=>u.id===x.responsavelId)?.nome||x.responsavel||"Sem responsável";
              return <div key={x.id} className={`rounded-xl border p-3 text-sm ${x.feito?"border-success/20 bg-success/[.035]":atrasado?"border-primary/25 bg-primary/[.035]":"border-white/8"}`}>
                <div className="flex items-start gap-3">
                  <input type="checkbox" checked={x.feito} onChange={()=>atualizar({checklist:checklist.map((i)=>i.id===x.id?{...i,feito:!i.feito,statusAtividade:!i.feito?"Finalizado":"A fazer"}:i)})} className="mt-1 h-4 w-4 shrink-0 accent-[var(--primary)]"/>
                  <div className="min-w-0 flex-1">
                    <div className={x.feito?"line-through text-muted-foreground":"font-medium"}>{x.texto}</div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                      <Badge tone={x.feito?"success":"muted"}>{resp}</Badge>
                      {x.prazo&&<span>{fmtDate(x.prazo)}</span>}
                      {x.horario&&<span>· {x.horario}</span>}
                      {atrasado&&<Badge tone="primary">Prazo vencido</Badge>}
                    </div>
                  </div>
                </div>
              </div>;
            })}

            {!pai && <div className="grid min-w-0 gap-2 sm:grid-cols-2">
              <input className={`${inputCls} sm:col-span-2`} placeholder="Novo item" value={novoItem} onChange={(e)=>setNovoItem(e.target.value)}/>
              <select className={inputCls} value={novoItemResp} onChange={(e)=>setNovoItemResp(e.target.value)}><option value="">Sem atribuição</option>{s.funcionarios.map((u)=><option key={u.id} value={u.id}>{u.nome}</option>)}</select>
              <input type="date" className={inputCls} value={novoItemPrazo} onChange={(e)=>setNovoItemPrazo(e.target.value)}/>
              <input type="time" className={inputCls} value={novoItemHorario} onChange={(e)=>setNovoItemHorario(e.target.value)}/>
              <Btn className="w-full sm:col-span-2" variant="outline" onClick={()=>{
                if(!novoItem.trim())return;
                const resp=s.funcionarios.find((u)=>u.id===novoItemResp);
                atualizar({checklist:[...checklist,{id:uid(),texto:novoItem.trim(),feito:false,prazo:novoItemPrazo||undefined,horario:novoItemHorario||undefined,responsavelId:novoItemResp||undefined,responsavel:resp?.nome,statusAtividade:"A fazer"}]});
                setNovoItem("");setNovoItemPrazo("");setNovoItemHorario("");setNovoItemResp("");
              }}><Plus className="h-4 w-4"/>Adicionar</Btn>
            </div>}
          </div>
        </Panel>

        <Panel title="Comentários e dúvidas" action={<div className="flex items-center gap-2"><MessageCircle className="h-4 w-4 text-primary"/><Badge tone="muted">{comentarios.length}</Badge></div>}>
          <div className="space-y-3">
            {!!comentarios.length && <div className="max-h-[340px] space-y-2 overflow-y-auto pr-1">
              {comentarios.map((comentario)=>{
                const proprio=comentario.autorUsuarioId===usuarioAtual?.id;
                return <div key={comentario.id} className={`rounded-xl border p-3 ${proprio?"border-primary/20 bg-primary/[.035]":"border-border bg-secondary/30"}`}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2"><b className="text-sm">{comentario.autorNome}</b>{proprio&&<Badge tone="muted">Você</Badge>}</div>
                    <span className="text-[10px] text-muted-foreground">{new Date(comentario.criadoEm).toLocaleString("pt-BR",{day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"})}</span>
                  </div>
                  <div className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{comentario.texto}</div>
                  {!!comentario.mencoesUsuarioIds?.length && <div className="mt-2 flex flex-wrap gap-1">
                    {comentario.mencoesUsuarioIds.map((id)=>{
                      const mencionado=s.usuarios.find((u)=>u.id===id);
                      return mencionado?<Badge key={id} tone="primary">@{mencionado.nome.split(" ")[0]}</Badge>:null;
                    })}
                  </div>}
                </div>;
              })}
            </div>}

            {!comentarios.length&&<div className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">Nenhum comentário ainda. Use este espaço para dúvidas, orientações e retornos sobre a atividade.</div>}

            <div className="rounded-xl border border-border bg-card p-3">
              <div className="mb-2 flex items-center gap-2 text-[10px] font-black uppercase tracking-[.1em] text-muted-foreground"><AtSign className="h-3.5 w-3.5"/>Mencionar alguém</div>
              <div className="mb-3 flex max-h-20 flex-wrap gap-1.5 overflow-y-auto">
                {usuariosMencionaveis.map((u)=><button key={u.id} type="button" onClick={()=>inserirMencao(u.nome)} className="rounded-full border border-border bg-secondary/50 px-2.5 py-1 text-[11px] font-bold transition hover:border-primary/35 hover:text-primary">@{u.nome.split(" ")[0]}</button>)}
              </div>
              <textarea rows={3} className={inputCls} placeholder="Ex.: @Jordan não consegui fazer isso porque..." value={novoComentario} onChange={(e)=>setNovoComentario(e.target.value)} onKeyDown={(e)=>{if(e.key==="Enter"&&(e.ctrlKey||e.metaKey)){e.preventDefault();enviarComentario();}}}/>
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-[10px] text-muted-foreground">Use @ para chamar alguém. Ctrl/Cmd + Enter envia.</span>
                <Btn disabled={!novoComentario.trim()} onClick={enviarComentario}><Send className="h-4 w-4"/>Comentar</Btn>
              </div>
            </div>
          </div>
        </Panel>
      </div>

      <div className="min-w-0 space-y-4">
        <Panel title="Resumo da atividade">
          <div className="space-y-3 text-sm">
            <div className="flex items-center gap-2"><CircleDot className="h-4 w-4 text-primary"/><b>{status}</b></div>
            <div className="flex items-center gap-2"><CalendarDays className="h-4 w-4 text-muted-foreground"/><span>{fmtDate(atividade.data)}{atividade.horario?` · ${atividade.horario}`:""}</span></div>
            <div className="flex items-center gap-2"><ListChecks className="h-4 w-4 text-muted-foreground"/><span>{checklist.filter((x)=>x.feito).length}/{checklist.length} itens concluídos</span></div>
            {isRotina&&<div className="flex items-center gap-2"><Repeat2 className="h-4 w-4 text-success"/><b className="text-success">Rotina diária</b></div>}
          </div>
        </Panel>

        {origemRe&&<Panel title="Integração com Reinauguração"><div className="space-y-2 text-sm text-muted-foreground"><Badge tone="success">{origemRe.etiqueta}</Badge><div>Alterações, transferência e exclusão aqui refletem automaticamente no quadro da reinauguração.</div></div></Panel>}
        {pai&&<Panel title="Atividade principal"><div className="text-sm text-muted-foreground">Esta demanda é um item delegado de <b className="text-foreground">{pai.atividade.titulo}</b>, criada por {pai.owner.nome}. O checklist é compartilhado por toda a equipe.</div></Panel>}

        <Panel title="Transferir demanda" action={<ArrowRightLeft className="h-4 w-4 text-primary"/>}>
          <div className="space-y-2">
            <select className={inputCls} value={transferirPara} onChange={(e)=>setTransferirPara(e.target.value)}><option value="">Escolha o colaborador</option>{s.funcionarios.filter((u)=>u.id!==funcionarioId).map((u)=><option key={u.id} value={u.id}>{u.nome} — {u.cargo}</option>)}</select>
            <Btn className="w-full" variant="outline" disabled={!transferirPara} onClick={transferir}><Send className="h-4 w-4"/>Transferir</Btn>
          </div>
        </Panel>

        {isRotina&&status!=="Finalizado"&&<Panel title="Não conseguiu realizar hoje?">
          <div className="space-y-2">
            <textarea rows={3} className={inputCls} placeholder="Justifique o motivo. O gestor receberá para aprovar ou rejeitar." value={motivo} onChange={(e)=>setMotivo(e.target.value)}/>
            <Btn className="w-full" variant="outline" disabled={!motivo.trim()} onClick={justificar}><BellRing className="h-4 w-4"/>Enviar justificativa e finalizar o dia</Btn>
          </div>
        </Panel>}

        {atividade.justificativa&&<Panel title="Justificativa">
          <div className="text-sm text-muted-foreground">{atividade.justificativa.motivo}</div>
          <div className="mt-2"><Badge tone={atividade.justificativa.status==="Aprovada"?"success":atividade.justificativa.status==="Rejeitada"?"primary":"warn"}>{atividade.justificativa.status}</Badge></div>
        </Panel>}

        <Btn className="w-full" variant={status==="Finalizado"?"outline":"primary"} onClick={()=>atualizar({status:status==="Finalizado"?"A fazer":"Finalizado",justificativa:undefined})}><CheckCircle2 className="h-4 w-4"/>{status==="Finalizado"?"Reabrir atividade":"Marcar como finalizada"}</Btn>
        <Btn className="w-full" variant="danger" onClick={excluir}><Trash2 className="h-4 w-4"/>Excluir demanda</Btn>
      </div>
    </div>
  </Modal>;
}