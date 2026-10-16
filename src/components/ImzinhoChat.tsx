import { useEffect, useMemo, useRef, useState } from "react";
import { CheckCircle2, Loader2, MessageCircle, Send, ShieldCheck, Sparkles, Trash2, X, XCircle } from "lucide-react";
import { useApp, type AppState } from "@/lib/store";
import { describeImzinhoAction, executeImzinhoAction, type ImzinhoAction } from "@/lib/imzinho-actions";
import { IMZINHO_CHAT_IMAGE } from "@/assets/imzinhoChatImage";

type Message = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

const WELCOME: Message = {
  id: "welcome",
  role: "assistant",
  text: "Oi! Eu sou o IMzinho 👋 Posso te ajudar com metas, filiais, campanhas, produtos, pendências, propagandas e com o uso do BI. O que você quer saber?",
};

const QUICK_QUESTIONS = [
  "Qual filial está pior em relação à meta?",
  "Quais pendências estão atrasadas?",
  "Como atualizo as metas das filiais?",
  "Quais campanhas ainda precisam de aprovação?",
];

function money(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

function compactContext(s: AppState, path: string) {
  const usuario = s.usuarios.find((u) => u.id === s.usuarioAtivoId);
  const resultadosOrdenados = [...s.resultadosDiarios].sort((a, b) => b.data.localeCompare(a.data));
  const ultimaBase = resultadosOrdenados[0]?.data || "";
  const ultimaFoto = ultimaBase
    ? resultadosOrdenados.filter((r) => r.data === ultimaBase)
    : [];

  const resultadoPorFilial = new Map(
    ultimaFoto.map((r) => [r.filialId, r]),
  );

  const filiais = s.filiais
    .filter((f) => !f.isCD)
    .map((f) => {
      const r = resultadoPorFilial.get(f.id);
      const meta = r?.meta ?? null;
      const faturamento = r?.faturamento ?? null;
      return {
        codigo: f.codigo,
        nome: f.nome,
        cidade: f.cidade,
        gerente: f.gerente,
        meta,
        faturamento,
        percentualMeta: meta && faturamento != null ? Number(((faturamento / meta) * 100).toFixed(1)) : null,
      };
    });

  const campanhas = s.campanhas.map((c) => ({
    id: c.id,
    nome: c.nome,
    status: c.status,
    aprovacao: c.aprovacao,
    proposito: c.proposito,
    inicio: c.inicio,
    fim: c.fim,
    verba: c.verba,
    abrangencia: c.abrangencia,
    filiais: c.filialIds
      .map((id) => s.filiais.find((f) => f.id === id))
      .filter(Boolean)
      .map((f) => ({ codigo: f!.codigo, nome: f!.nome })),
    artes: c.pecas,
    produtos: (c.produtosPromocionais || []).map((p) => ({
      sku: p.sku,
      nome: p.nome,
      precoAnterior: p.precoAnterior,
      precoVista: p.precoVista,
      parcelas: p.parcelas,
      valorParcela: p.precoParcelado,
      juros: p.juros,
      jurosPercentual: p.jurosPercentual || 0,
      pronto: p.feito,
      growth: !!p.growthVideo,
    })),
  }));

  const pendencias = [...s.pendencias]
    .sort((a, b) => (a.prazo || "").localeCompare(b.prazo || ""))
    .slice(0, 80)
    .map((p) => ({
      id: p.id,
      funcionarioId: p.funcionarioId,
      titulo: p.titulo,
      responsavel: p.responsavel,
      prazo: p.prazo,
      prioridade: p.prioridade,
      status: p.status,
      feito: p.feito,
      area: p.area,
    }));

  const custos = [...s.custos]
    .sort((a, b) => b.data.localeCompare(a.data))
    .slice(0, 80)
    .map((c) => ({
      data: c.data,
      categoria: c.categoria,
      descricao: c.descricao,
      valor: c.valor,
      filial: s.filiais.find((f) => f.id === c.filialId)?.codigo || c.filialId,
    }));

  const influencers = s.influencers.slice(0, 60).map((i) => ({
    nome: i.nome,
    handle: i.handle,
    cache: i.cache,
    filiais: (i.filialIds || [i.filialId])
      .map((id) => s.filiais.find((f) => f.id === id)?.codigo)
      .filter(Boolean),
    pacote: i.pacote,
  }));

  const trafegoPago = s.trafegoPago.slice(0, 60).map((t) => ({
    competencia: t.competencia,
    plataforma: t.plataforma,
    campanha: t.campanha,
    objetivo: t.objetivo,
    investimento: t.investimento,
    cliques: t.cliques,
    resultados: t.resultados,
  }));

  const volantes = s.volantes.slice(0, 60).map((v) => ({
    filial: s.filiais.find((f) => f.id === v.filialId)?.codigo || v.filialId,
    data: v.data,
    veiculo: v.veiculo,
    custo: v.custo,
    horas: v.horas,
    rota: v.rota,
  }));

  const funcionarios = s.funcionarios.map((f) => ({
    id: f.id,
    nome: f.nome,
    cargo: f.cargo,
    filial: s.filiais.find((x) => x.id === f.filialId)?.codigo || f.filialId,
    atividades: f.atividades.slice(-80).map((a) => ({
      id: a.id,
      titulo: a.titulo,
      data: a.data,
      horario: a.horario,
      status: a.status || (a.feito ? "Finalizado" : "A fazer"),
      prioridade: a.prioridade,
      origem: a.origem,
      descricao: a.descricao,
      justificativa: a.justificativa?.status,
      reinauguracaoId: a.sourceReinauguracaoId,
      campanhaId: a.sourceCampanhaId,
      rotinaFixa: !!a.sourceRotinaId,
      checklistDelegado: !!a.sourceAtividadeChecklistItemId,
      sourcePendenciaId: a.sourcePendenciaId,
      sourceReinauguracaoId: a.sourceReinauguracaoId,
      sourceReinauguracaoCardId: a.sourceReinauguracaoCardId,
      sourceReinauguracaoItemId: a.sourceReinauguracaoItemId,
      sourceAtividadeId: a.sourceAtividadeId,
      sourceAtividadeOwnerId: a.sourceAtividadeOwnerId,
      sourceAtividadeChecklistItemId: a.sourceAtividadeChecklistItemId,
      sourceRotinaId: a.sourceRotinaId,
    })),
  }));

  const rotinasFixas = s.rotinasDiarias.map((r) => ({
    id: r.id,
    funcionarioId: r.funcionarioId,
    colaborador: s.funcionarios.find((f) => f.id === r.funcionarioId)?.nome || r.funcionarioId,
    titulo: r.titulo,
    descricao: r.descricao,
    frequencia: r.frequencia || "Diária",
    diaMes: r.diaMes,
    horario: r.horario,
    prioridade: r.prioridade,
    ativa: r.ativa,
  }));

  const reinauguracoes = s.reinauguracoes.map((r) => {
    const filial = s.filiais.find((f) => f.id === r.filialId);
    const itens = r.cards.flatMap((card) => card.checklist);
    const concluidos = r.cards.filter((card) => card.status === "Concluído" || (card.checklist.length > 0 && card.checklist.every((i) => i.feito))).length;
    return {
      id: r.id,
      filial: filial ? `${filial.codigo} · ${filial.nome}` : r.filialId,
      data: r.data,
      cards: r.cards.length,
      cardsConcluidos: concluidos,
      checklistTotal: itens.length,
      checklistConcluido: itens.filter((i) => i.feito).length,
      progresso: r.cards.length ? Math.round((concluidos / r.cards.length) * 100) : 0,
      tarefas: r.cards.slice(0, 80).map((card) => ({
        id: card.id,
        titulo: card.titulo,
        prazo: card.prazo,
        status: card.status,
        responsaveis: card.responsaveis,
        checklist: card.checklist.map((i) => ({
          id: i.id,
          responsavelId: i.responsavelId,
          texto: i.texto,
          feito: i.feito,
          prazo: i.prazo,
          horario: i.horario,
          responsavel: i.responsavel,
          status: i.statusAtividade,
        })),
      })),
    };
  });

  return {
    agora: new Date().toISOString(),
    paginaAtual: path,
    usuario: {
      id: usuario?.id,
      nome: usuario?.nome || s.perfil,
      perfil: s.perfil,
      vinculoFuncionarioId: usuario?.vinculoId,
      podeGerirEquipe: ["Master","Diretoria","Gerente de Marketing","Coordenação"].includes(s.perfil),
    },
    dadosResultados: {
      ultimaBasePorFilial: ultimaBase || null,
      filiais,
      observacao: ultimaBase
        ? "Meta e faturamento por filial refletem a última base importada disponível no navegador."
        : "Ainda não há base por filial importada nesta sessão/navegador.",
    },
    campanhas,
    pendencias,
    equipe: {
      funcionarios,
      rotinasFixas,
    },
    reinauguracoes,
    marketing: {
      custos,
      totalCustosListados: money(custos.reduce((a, c) => a + c.valor, 0)),
      trafegoPago,
      propagandaVolante: volantes,
      influencers,
    },
    integracoesSociais: s.conexoesSociais.map((x) => ({
      plataforma: x.plataforma,
      status: x.status,
      conta: x.conta,
      ultimaSincronizacao: x.ultimaSincronizacao,
    })),
    mapaDoSistema: {
      "/": "Dashboard: meta, faturamento, gráfico principal, ranking e investimento.",
      "/campanhas": "Campanhas: propósito, filiais e verba, artes, produtos promocionais, produtos para Growth e apoiadores.",
      "/filiais": "Filiais: visão individual de meta, faturamento, investimento e histórico.",
      "/pendencias": "Central de Pendências: tarefas atribuídas à equipe.",
      "/atividades": "Atividades: quadro da equipe, checklist delegado, transferência, rotinas fixas diárias/mensais e justificativas.",
      "/reinauguracao": "Reinaugurações: quadros por filial com checklist, responsáveis, prazos, progresso e vínculo automático com Atividades.",
      "/metas": "Metas: cadastro e acompanhamento de metas.",
      "/vendas": "Vendas: histórico e dados de faturamento.",
      "/trafego-pago": "Tráfego Pago: Google Ads, Meta Ads e demais mídias pagas.",
      "/redes-sociais": "Redes Sociais: conexões e métricas orgânicas.",
      "/influencers": "Influencers: contratos, filiais, cachês e entregas.",
      "/propaganda-volante": "Propaganda Volante: carro de som, rota, horas e custo.",
      "/centro-custos": "Centro de Custos: gastos reais de marketing.",
      "/resultados": "Resultados: consolidação de investimentos e retorno.",
      "/relatorios": "Relatórios: análises e comparativos.",
      "/funcionarios": "Funcionários: equipe e atividades.",
      "/avaliacoes": "Avaliações: desempenho da equipe.",
      "/integracoes": "APIs / Integrações: Google Ads, Meta e demais conexões.",
      "/configuracoes": "Configurações do BI.",
    },
  };
}

export function ImzinhoChat({ path }: { path: string }) {
  const { s, set } = useApp();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<ImzinhoAction | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const context = useMemo(() => compactContext(s, path), [s, path]);
  const actionPreview = pendingAction ? describeImzinhoAction(s, pendingAction) : null;

  const confirmAction = () => {
    if (!pendingAction) return;
    const result = executeImzinhoAction(s, pendingAction);
    if (result.ok) set(() => result.state);
    const actor = s.usuarios.find((u) => u.id === s.usuarioAtivoId)?.nome || s.perfil;
    const hora = new Date().toLocaleTimeString("pt-BR", { hour:"2-digit", minute:"2-digit" });
    setMessages((prev) => [...prev, {
      id: `a-action-${Date.now()}`,
      role: "assistant",
      text: result.ok ? `${result.message}\nExecutado por ${actor} via IMzinho · ${hora}` : result.message,
    }]);
    setPendingAction(null);
  };

  const cancelAction = () => {
    setPendingAction(null);
    setMessages((prev) => [...prev, {
      id: `a-cancel-${Date.now()}`,
      role: "assistant",
      text: "Beleza, não alterei nada. 👍",
    }]);
  };

  useEffect(() => {
    if (open) window.setTimeout(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), 30);
  }, [open, messages, loading, pendingAction]);

  const send = async (question?: string) => {
    const value = (question ?? text).trim();
    if (!value || loading) return;

    if (pendingAction && /^(sim|pode|confirmar|confirma|confirmo|ok|pode fazer|faz)$/i.test(value)) {
      setText("");
      confirmAction();
      return;
    }
    if (pendingAction && /^(não|nao|cancela|cancelar|deixa|não faça|nao faca)$/i.test(value)) {
      setText("");
      cancelAction();
      return;
    }
    if (pendingAction) setPendingAction(null);

    const userMessage: Message = {
      id: `u-${Date.now()}`,
      role: "user",
      text: value,
    };

    const next = [...messages, userMessage];
    setMessages(next);
    setText("");
    setLoading(true);

    try {
      const res = await fetch("/api/imzinho/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: next
            .filter((m) => m.id !== "welcome")
            .map((m) => ({ role: m.role, text: m.text })),
          context,
        }),
      });

      const data = await res.json().catch(() => null);

      if (!res.ok || !data?.ok) {
        const missingKey = data?.configured === false;
        const message = missingKey
          ? "Eu já estou instalado no BI 😊 Falta só conectar minha inteligência do Gemini no ambiente de produção com a chave GEMINI_API_KEY. Depois disso eu respondo normalmente."
          : `Tive um probleminha para consultar o Gemini: ${data?.error || "tente novamente em instantes."}`;

        setMessages((prev) => [...prev, {
          id: `a-${Date.now()}`,
          role: "assistant",
          text: message,
        }]);
        return;
      }

      setMessages((prev) => [...prev, {
        id: `a-${Date.now()}`,
        role: "assistant",
        text: data.reply,
      }]);
      if (data.action && typeof data.action === "object") {
        setPendingAction(data.action as ImzinhoAction);
      }
    } catch {
      setMessages((prev) => [...prev, {
        id: `a-${Date.now()}`,
        role: "assistant",
        text: "Não consegui falar com o Gemini agora. Tenta novamente em alguns instantes.",
      }]);
    } finally {
      setLoading(false);
    }
  };

  const clear = () => {
    setMessages([WELCOME]);
    setText("");
    setPendingAction(null);
  };

  return (
    <>
      {open && (
        <div className="fixed inset-0 z-[70] bg-black/55 backdrop-blur-sm sm:bg-transparent sm:backdrop-blur-none" onClick={() => setOpen(false)}>
          <section
            className="absolute inset-x-2 bottom-2 flex h-[min(78dvh,720px)] flex-col overflow-hidden rounded-[26px] border border-white/10 bg-[#111214] shadow-[0_28px_90px_rgba(0,0,0,.62)] sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-[430px]"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="flex items-center gap-3 border-b border-white/8 bg-gradient-to-r from-primary/18 via-[#17181b] to-[#17181b] p-4">
              <div className="relative flex h-16 w-16 shrink-0 items-end justify-center">
                <img src={IMZINHO_CHAT_IMAGE} alt="IMzinho astronauta" className="h-16 w-16 object-contain drop-shadow-[0_8px_18px_rgba(0,0,0,.45)]" />
                <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[#17181b] bg-success" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <div className="font-display text-base font-black">IMzinho</div>
                  <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-0.5 text-[9px] font-black uppercase tracking-[.12em] text-[#ff9ca6]">IA</span>
                </div>
                <div className="mt-0.5 text-[11px] text-muted-foreground">Assistente do BI · Gemini</div>
              </div>
              <button type="button" onClick={clear} title="Limpar conversa" className="grid h-9 w-9 place-items-center rounded-xl text-muted-foreground transition hover:bg-white/[.06] hover:text-foreground">
                <Trash2 className="h-4 w-4" />
              </button>
              <button type="button" onClick={() => setOpen(false)} aria-label="Fechar IMzinho" className="grid h-9 w-9 place-items-center rounded-xl text-muted-foreground transition hover:bg-white/[.06] hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </header>

            <div className="flex-1 space-y-4 overflow-y-auto p-4">
              {messages.map((m) => (
                <div key={m.id} className={`flex gap-2.5 ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  {m.role === "assistant" && (
                    <div className="mt-0.5 flex h-10 w-10 shrink-0 items-end justify-center">
                      <img src={IMZINHO_CHAT_IMAGE} alt="" className="h-10 w-10 object-contain" />
                    </div>
                  )}
                  <div className={`max-w-[82%] whitespace-pre-wrap rounded-2xl px-3.5 py-3 text-sm leading-relaxed ${m.role === "user"
                    ? "rounded-br-md bg-primary text-white shadow-brand"
                    : "rounded-bl-md border border-white/8 bg-white/[.045] text-foreground"}`}>
                    {m.text}
                  </div>
                </div>
              ))}

              {messages.length === 1 && (
                <div className="grid gap-2 pl-10">
                  {QUICK_QUESTIONS.map((q) => (
                    <button key={q} type="button" onClick={() => void send(q)} className="rounded-xl border border-white/8 bg-white/[.025] px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground transition hover:border-primary/30 hover:bg-primary/5 hover:text-foreground">
                      {q}
                    </button>
                  ))}
                </div>
              )}

              {pendingAction && actionPreview && (
                <div className="ml-10 rounded-2xl border border-primary/30 bg-primary/[.055] p-3.5 shadow-[0_12px_35px_rgba(0,0,0,.2)]">
                  <div className="flex items-start gap-2.5">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-primary/12 text-primary"><ShieldCheck className="h-4 w-4"/></div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] font-black uppercase tracking-[.12em] text-[#ff9ca6]">Confirmação necessária</div>
                      <div className="mt-1 text-sm font-black">{actionPreview.title}</div>
                      <div className="mt-1 text-xs leading-relaxed text-muted-foreground">{actionPreview.details}</div>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button type="button" onClick={cancelAction} className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-white/10 px-3 py-2.5 text-xs font-bold text-muted-foreground transition hover:bg-white/[.05] hover:text-foreground"><XCircle className="h-4 w-4"/>Cancelar</button>
                    <button type="button" onClick={confirmAction} className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-primary px-3 py-2.5 text-xs font-black text-white shadow-brand transition hover:bg-primary/90"><CheckCircle2 className="h-4 w-4"/>Confirmar</button>
                  </div>
                  <div className="mt-2 text-center text-[9px] text-muted-foreground/70">Nada é alterado antes da confirmação.</div>
                </div>
              )}

              {loading && (
                <div className="flex items-center gap-2.5">
                  <div className="flex h-10 w-10 items-end justify-center">
                    <img src={IMZINHO_CHAT_IMAGE} alt="" className="h-10 w-10 object-contain" />
                  </div>
                  <div className="inline-flex items-center gap-2 rounded-2xl rounded-bl-md border border-white/8 bg-white/[.045] px-3.5 py-3 text-xs text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" /> Pensando...
                  </div>
                </div>
              )}
              <div ref={endRef} />
            </div>

            <div className="border-t border-white/8 bg-[#151619] p-3">
              <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-[#222328] p-2 focus-within:border-primary/45">
                <textarea
                  rows={1}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void send();
                    }
                  }}
                  placeholder="Pergunte sobre o BI..."
                  className="max-h-28 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-white outline-none placeholder:text-white/35"
                />
                <button type="button" disabled={!text.trim() || loading} onClick={() => void send()} className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-primary text-white shadow-brand transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-40">
                  <Send className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-2 flex items-center justify-center gap-1 text-[9px] text-muted-foreground/70">
                <Sparkles className="h-3 w-3" /> O IMzinho consulta o BI e só executa ações depois da sua confirmação.
              </div>
            </div>
          </section>
        </div>
      )}

      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-[max(18px,env(safe-area-inset-bottom))] right-3 z-[60] flex min-h-[76px] items-center gap-2 rounded-[26px] border border-primary/35 bg-[#17181b]/95 px-3 py-1.5 pr-4 text-left shadow-[0_14px_42px_rgba(0,0,0,.5)] backdrop-blur-xl transition hover:-translate-y-1 hover:border-primary/60 sm:bottom-5 sm:right-5"
        aria-label="Abrir assistente IMzinho"
      >
        <span className="relative -mb-1 -ml-2 flex h-[88px] w-[88px] shrink-0 items-end justify-center sm:h-[96px] sm:w-[96px]">
          <img src={IMZINHO_CHAT_IMAGE} alt="IMzinho astronauta" className="h-full w-full object-contain drop-shadow-[0_10px_22px_rgba(0,0,0,.5)]" />
          <span className="absolute bottom-2 right-1 grid h-5 w-5 place-items-center rounded-full bg-primary text-white shadow-brand"><MessageCircle className="h-3 w-3" /></span>
        </span>
        <span className="hidden sm:block">
          <span className="block text-[10px] font-black uppercase tracking-[.13em] text-[#ff9ca6]">Pergunte ao</span>
          <span className="block font-display text-sm font-black text-white">IMzinho</span>
        </span>
      </button>
    </>
  );
}