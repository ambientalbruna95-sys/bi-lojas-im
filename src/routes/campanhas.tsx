import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowDownUp, ArrowLeft, CalendarRange, Check, CheckCircle2, ChevronDown, ExternalLink, Film, Filter, FolderOpen, Handshake, ImagePlus, Link2, Loader2, PackageSearch, Pencil, Plus, Search, Send, ShieldCheck, Trash2, Store, Network, Upload, Video, WalletCards } from "lucide-react";
import { toast } from "sonner";
import { useApp, uid, brl, fmtDate, type Campanha, type Apoiador, type Filial, type PlanoCampanhaFilial, type ProdutoPromocional  } from "@/lib/store";
import { PageHeader, Panel, Stat, Btn, Modal, Field, inputCls, Badge, pageHead } from "@/components/kit";

export const Route = createFileRoute("/campanhas")({
  head: pageHead("Campanhas", "Campanhas, identidade visual, apoiadores e patrocinadores."),
  component: Page,
});

type AbaCampanha = "Atividades" | "Resumo" | "Filiais e verba" | "Artes" | "Produtos" | "Produtos para vídeo de Growth" | "Apoiadores";
type FormatoPeca = "Feed" | "Stories" | "Banner";

const ABAS_CAMPANHA: AbaCampanha[] = ["Resumo", "Atividades", "Filiais e verba", "Artes", "Produtos", "Produtos para vídeo de Growth", "Apoiadores"];

const FORMATOS = [
  { k: "Feed", ratio: "aspect-square", dim: "1080×1080" },
  { k: "Stories", ratio: "aspect-[9/16]", dim: "1080×1920" },
  { k: "Banner", ratio: "aspect-[3/1]", dim: "1200×400" },
] as const;

const DIAS_SEMANA = ["D","S","T","Q","Q","S","S"];

function campanhaNoMes(c: Campanha, ano: string, mes: string) {
  const inicio = c.inicio || c.fim;
  const fim = c.fim || c.inicio;
  if (!inicio || !fim) return false;
  const primeiro = `${ano}-${mes}-01`;
  const ultimoDia = new Date(Number(ano), Number(mes), 0).getDate();
  const ultimo = `${ano}-${mes}-${String(ultimoDia).padStart(2,"0")}`;
  return inicio <= ultimo && fim >= primeiro;
}

function campanhaNoDia(c: Campanha, data: string) {
  const inicio = c.inicio || c.fim;
  const fim = c.fim || c.inicio;
  return !!inicio && !!fim && inicio <= data && fim >= data;
}

function Peca({ c, k, ratio }: { c: Campanha; k: FormatoPeca; ratio: string }) {
  const arte = c.artes?.[k];

  if (arte) {
    return (
      <div className={`${ratio} relative w-full overflow-hidden rounded-xl border border-white/10 bg-black`}>
        <img src={arte} alt={`Prévia ${k} · ${c.nome}`} className="h-full w-full object-contain" />
        <div className="absolute bottom-2 left-2 rounded-lg bg-black/70 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-white backdrop-blur">
          Prévia real · {k}
        </div>
      </div>
    );
  }

  return (
    <div className={`${ratio} relative flex w-full flex-col justify-between overflow-hidden rounded-xl bg-primary p-3 text-white`} style={{ filter: `hue-rotate(${c.tom}deg)` }}>
      <div className="text-[10px] font-bold uppercase tracking-widest opacity-80">Lojas IM · {k}</div>
      <div className="font-display text-sm font-extrabold leading-tight sm:text-base">{c.nome}</div>
      <div className="space-y-1">
        {!!c.apoiadores.length && (
          <div className="flex flex-wrap items-center gap-1 rounded bg-white/90 p-1 text-[8px] text-black">
            <span className="font-bold uppercase">Apoio:</span>
            {c.apoiadores.slice(0,4).map((a) => a.logo
              ? <img key={a.id} src={a.logo} alt={a.nome} title={a.nome} className="h-4 max-w-12 object-contain" />
              : <span key={a.id} className="font-semibold">{a.nome}</span>
            )}
          </div>
        )}
        <div className="self-start rounded bg-card px-2 py-0.5 text-[10px] font-bold text-foreground">Prévia sem arte enviada</div>
      </div>
    </div>
  );
}

function Page() {
  const { s, set } = useApp();
  const [open, setOpen] = useState(false);
  const [selId, setSelId] = useState<string | null>(null);
  const [abaCampanha, setAbaCampanha] = useState<AbaCampanha>("Resumo");
  const [observacaoRecusa, setObservacaoRecusa] = useState("");
  const [tarefa, setTarefa] = useState({ titulo: "", descricao: "", funcionarioId: "", data: "", horario: "", prioridade: "Média" as "Alta" | "Média" | "Baixa" });
  const [editandoTarefa, setEditandoTarefa] = useState<{ funcionarioId: string; atividadeId: string } | null>(null);
  const [anoSelecionado, setAnoSelecionado] = useState<string | null>(String(new Date().getFullYear()));
  const [mesSelecionado, setMesSelecionado] = useState<string | null>(null);
  const [filtroBloco, setFiltroBloco] = useState<"Todos" | Campanha["status"]>("Todos");
  const [filtroPrioridade, setFiltroPrioridade] = useState<"Todas" | "Alta" | "Média" | "Baixa">("Todas");
  const [ordenacao, setOrdenacao] = useState<"Prioridade" | "Data">("Prioridade");
  const [f, setF] = useState<{ nome: string; proposito: string; inicio: string; fim: string; verba: number; prioridade: "Alta" | "Média" | "Baixa"; abrangencia: "Rede" | "Filiais"; filialIds: string[]; planosFiliais: PlanoCampanhaFilial[] }>({ nome: "", proposito: "", inicio: "", fim: "", verba: 5000, prioridade: "Média", abrangencia: "Rede", filialIds: [], planosFiliais: [] });
  const sel = s.campanhas.find((c) => c.id === selId) ?? null;
  const podeAprovar = s.perfil === "Diretoria" || s.perfil === "Master";
  const podeMontarTabela = podeAprovar;
  const tarefasCampanha = sel ? s.funcionarios.flatMap((f) => f.atividades.filter((a) => a.sourceCampanhaId === sel.id).map((a) => ({ ...a, funcionarioId: f.id, funcionarioNome: f.nome }))).sort((a,b)=>(a.data||"").localeCompare(b.data||"") || (a.horario||"").localeCompare(b.horario||"")) : [];
  const salvarTarefaCampanha = () => {
    if (!sel || !tarefa.titulo.trim() || !tarefa.funcionarioId || !tarefa.data) { toast.error("Informe a atividade, o colaborador e a data."); return; }
    set((st) => {
      const anterior = editandoTarefa && st.funcionarios.find((f)=>f.id===editandoTarefa.funcionarioId)?.atividades.find((a)=>a.id===editandoTarefa.atividadeId);
      const atividade = {
        ...anterior,
        id: anterior?.id || uid(), titulo: tarefa.titulo.trim(), descricao: tarefa.descricao.trim(),
        data: tarefa.data, horario: tarefa.horario || undefined, prioridade: tarefa.prioridade,
        feito: anterior?.feito || false, status: anterior?.status || ("A fazer" as const),
        sourceCampanhaId: sel.id, origem: "Campanha" as const,
      };
      return { ...st, funcionarios: st.funcionarios.map((f)=>({
        ...f, atividades: [
          ...f.atividades.filter((a)=>!(editandoTarefa && f.id===editandoTarefa.funcionarioId && a.id===editandoTarefa.atividadeId)),
          ...(f.id===tarefa.funcionarioId ? [atividade] : []),
        ],
      })) };
    });
    setTarefa({ titulo:"", descricao:"", funcionarioId:"", data:"", horario:"", prioridade:"Média" });
    setEditandoTarefa(null);
    toast.success("Atividade enviada ao quadro do colaborador.");
  };
  const editarTarefaCampanha = (a: typeof tarefasCampanha[number]) => {
    setEditandoTarefa({funcionarioId:a.funcionarioId, atividadeId:a.id});
    setTarefa({titulo:a.titulo, descricao:a.descricao || "", funcionarioId:a.funcionarioId, data:a.data, horario:a.horario || "", prioridade:a.prioridade || "Média"});
  };
  const campanhasPendentes = s.campanhas.filter((c) => c.aprovacao === "Aguardando Diretoria").sort((a,b)=>(a.inicio||"").localeCompare(b.inicio||""));
  const artesPendentes = s.campanhas.flatMap((campanha) =>
    (["Feed", "Stories", "Banner"] as const)
      .filter((formato) => !!campanha.artes?.[formato] && !campanha.pecas[formato] && campanha.aprovacoesArtes?.[formato]?.status !== "Ajustes solicitados")
      .map((formato) => ({ campanha, formato }))
  );
  const abrirArteParaAprovacao = (campanha: Campanha) => {
    setSelId(campanha.id);
    setAbaCampanha("Artes");
  };
  const abrirParaAprovacao = (campanha: Campanha) => { setSelId(campanha.id); setAbaCampanha("Resumo"); setObservacaoRecusa(""); };

  const upd = (c: Campanha) => {
    set((st) => ({ ...st, campanhas: st.campanhas.map((x) => x.id === c.id ? c : x) }));
  };

  const totalApoio = s.campanhas.reduce((a,c) => a + c.apoiadores.reduce((b,p) => b + p.valor,0),0);
  const campanhasComApoio = s.campanhas.filter((c) => c.apoiadores.length).length;
  const apoiadoresUnicos = new Set(s.campanhas.flatMap((c) => c.apoiadores.map((a) => a.nome.toLowerCase()))).size;

  const MESES_NOME = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

  const anosCampanhas = useMemo(() => {
    const anos = new Set(s.campanhas.map((c) => (c.inicio || c.fim || "").slice(0,4)).filter(Boolean));
    anos.add(String(new Date().getFullYear()));
    return [...anos].sort((a,b)=>b.localeCompare(a));
  }, [s.campanhas]);

  const mesesDoAno = useMemo(() => {
    if (!anoSelecionado) return [];
    return MESES_NOME.map((nome, i) => {
      const chave = `${anoSelecionado}-${String(i+1).padStart(2,"0")}`;
      const numero = String(i+1).padStart(2,"0");
      const campanhas = s.campanhas.filter((c) => campanhaNoMes(c, anoSelecionado, numero));
      return { numero, nome, chave, campanhas };
    });
  }, [anoSelecionado, s.campanhas]);

  const campanhasVisiveis = useMemo(() => {
    if (!anoSelecionado || !mesSelecionado) return [];
    const prioridadePeso = { Alta: 0, "Média": 1, Baixa: 2 } as const;
    return s.campanhas
      .filter((c) => campanhaNoMes(c, anoSelecionado, mesSelecionado))
      .filter((c) => filtroBloco === "Todos" || c.status === filtroBloco)
      .filter((c) => filtroPrioridade === "Todas" || (c.prioridade || "Média") === filtroPrioridade)
      .sort((a,b) => {
        if (ordenacao === "Data") return (b.inicio || "").localeCompare(a.inicio || "");
        const pa = prioridadePeso[a.prioridade || "Média"];
        const pb = prioridadePeso[b.prioridade || "Média"];
        return pa - pb || (a.inicio || "").localeCompare(b.inicio || "");
      });
  }, [anoSelecionado, mesSelecionado, s.campanhas, filtroBloco, filtroPrioridade, ordenacao]);

  const calendarioMes = useMemo(() => {
    if (!anoSelecionado || !mesSelecionado) return null;
    const ano = Number(anoSelecionado);
    const mes = Number(mesSelecionado);
    const totalDias = new Date(ano, mes, 0).getDate();
    const primeiroDiaSemana = new Date(ano, mes - 1, 1).getDay();
    const campanhas = s.campanhas
      .filter((campanha) => campanhaNoMes(campanha, anoSelecionado, mesSelecionado))
      .sort((a,b)=>(a.inicio || "").localeCompare(b.inicio || ""));
    return { totalDias, primeiroDiaSemana, campanhas };
  }, [anoSelecionado, mesSelecionado, s.campanhas]);

  const abrirNovaCampanha = () => {
    if (anoSelecionado && mesSelecionado) {
      const inicio = `${anoSelecionado}-${mesSelecionado}-01`;
      const ultimo = new Date(Number(anoSelecionado), Number(mesSelecionado), 0).getDate();
      const fim = `${anoSelecionado}-${mesSelecionado}-${String(ultimo).padStart(2,"0")}`;
      setF((atual) => ({ ...atual, inicio, fim }));
    }
    setOpen(true);
  };

  return (
    <>
      <PageHeader title="Campanhas" sub="Organize por ano e mês antes de abrir cada campanha." action={<Btn onClick={abrirNovaCampanha}><Plus className="h-4 w-4" />Nova campanha</Btn>} />

      {podeAprovar && <Panel title={`Aguardando aprovação da Diretoria · ${campanhasPendentes.length}`}>
        {campanhasPendentes.length ? <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {campanhasPendentes.map((campanha) => <button key={campanha.id} type="button" onClick={() => abrirParaAprovacao(campanha)} className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 text-left transition hover:border-primary/50">
            <div className="flex items-center justify-between gap-2"><span className="font-bold">{campanha.nome}</span><Badge tone="warn">Pendente</Badge></div>
            <p className="mt-2 text-xs text-muted-foreground">{fmtDate(campanha.inicio)} – {fmtDate(campanha.fim)} · {brl(campanha.verba)}</p>
            <p className="mt-2 line-clamp-2 text-xs text-muted-foreground">{campanha.proposito || "Sem descrição"}</p>
            <span className="mt-3 inline-block text-xs font-bold text-primary">Analisar campanha →</span>
          </button>)}
        </div> : <p className="text-sm text-muted-foreground">Nenhuma campanha aguardando aprovação no momento.</p>}
      </Panel>}

      {podeAprovar && <Panel title={`Artes aguardando aprovação · ${artesPendentes.length}`}>
        {artesPendentes.length ? <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
          {artesPendentes.map(({ campanha, formato }) => <button key={`${campanha.id}-${formato}`} type="button" onClick={() => abrirArteParaAprovacao(campanha)} className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-3 text-left hover:border-primary/50">
            <div className="font-bold">{campanha.nome}</div>
            <div className="mt-1 text-xs text-muted-foreground">{formato} · Aguardando análise</div>
            <span className="mt-2 inline-block text-xs font-bold text-primary">Analisar arte →</span>
          </button>)}
        </div> : <p className="text-sm text-muted-foreground">Nenhuma arte aguardando aprovação.</p>}
      </Panel>}

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Campanhas" value={String(s.campanhas.length)} hint={`${s.campanhas.filter(c=>c.status==="Ativa").length} ativas`} />
        <Stat label="Com apoiadores" value={String(campanhasComApoio)} hint="campanhas patrocinadas" />
        <Stat label="Apoiadores únicos" value={String(apoiadoresUnicos)} hint="marcas cadastradas" />
        <Stat accent label="Apoio captado" value={brl(totalApoio)} hint="valor informado nos apoios" />
      </div>

      <Panel className="mb-4">
        <div className="mb-4 flex flex-wrap items-center gap-2 text-sm">
          <button
            type="button"
            onClick={() => { setAnoSelecionado(null); setMesSelecionado(null); }}
            className={`rounded-xl border px-3 py-2 font-bold transition ${!anoSelecionado ? "border-primary/35 bg-primary/10 text-primary" : "border-white/8 text-muted-foreground hover:border-primary/25 hover:text-foreground"}`}
          >
            Campanhas
          </button>
          {anoSelecionado && <>
            <span className="text-muted-foreground">/</span>
            <button type="button" onClick={() => setMesSelecionado(null)} className={`rounded-xl border px-3 py-2 font-bold transition ${!mesSelecionado ? "border-primary/35 bg-primary/10 text-primary" : "border-white/8 text-muted-foreground hover:border-primary/25 hover:text-foreground"}`}>{anoSelecionado}</button>
          </>}
          {anoSelecionado && mesSelecionado && <>
            <span className="text-muted-foreground">/</span>
            <span className="rounded-xl border border-primary/35 bg-primary/10 px-3 py-2 font-black text-primary">{MESES_NOME[Number(mesSelecionado)-1]}</span>
          </>}
        </div>

        {!anoSelecionado && <div>
          <div className="mb-3 flex items-center gap-2"><FolderOpen className="h-5 w-5 text-primary"/><div className="font-display text-lg font-black">Escolha o ano</div></div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {anosCampanhas.map((ano) => {
              const total = s.campanhas.filter((c) => (c.inicio || c.fim || "").startsWith(ano)).length;
              return <button key={ano} type="button" onClick={() => { setAnoSelecionado(ano); setMesSelecionado(null); }} className="rounded-2xl border border-white/8 bg-white/[.02] p-5 text-left transition hover:-translate-y-0.5 hover:border-primary/35 hover:bg-primary/[.04]">
                <CalendarRange className="h-5 w-5 text-primary"/>
                <div className="mt-3 font-display text-2xl font-black">{ano}</div>
                <div className="mt-1 text-xs text-muted-foreground">{total} campanha(s)</div>
              </button>;
            })}
          </div>
        </div>}

        {anoSelecionado && !mesSelecionado && <div>
          <div className="mb-3 flex items-center justify-between gap-3">
            <div><div className="font-display text-lg font-black">Escolha o mês de {anoSelecionado}</div><div className="text-xs text-muted-foreground">Depois você verá somente as campanhas daquele mês.</div></div>
            <Btn variant="outline" onClick={() => setAnoSelecionado(null)}><ArrowLeft className="h-4 w-4"/>Anos</Btn>
          </div>
          <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6">
            {mesesDoAno.map((m) => <button key={m.numero} type="button" onClick={() => setMesSelecionado(m.numero)} className={`rounded-2xl border p-4 text-left transition hover:border-primary/35 ${m.campanhas.length ? "border-white/8 bg-white/[.025]" : "border-white/5 bg-white/[.01]"}`}>
              <div className="text-[10px] font-black uppercase tracking-[.14em] text-primary">{m.numero}</div>
              <div className="mt-1 font-display font-black">{m.nome}</div>
              <div className="mt-2 text-xs text-muted-foreground">{m.campanhas.length} campanha(s)</div>
            </button>)}
          </div>
        </div>}

        {anoSelecionado && mesSelecionado && <div>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-display text-xl font-black">{MESES_NOME[Number(mesSelecionado)-1]} de {anoSelecionado}</div>
              <div className="text-xs text-muted-foreground">{campanhasVisiveis.length} campanha(s) após os filtros</div>
            </div>
            <div className="flex gap-2"><Btn variant="outline" onClick={() => setMesSelecionado(null)}><ArrowLeft className="h-4 w-4"/>Meses</Btn><Btn onClick={abrirNovaCampanha}><Plus className="h-4 w-4"/>Nova campanha</Btn></div>
          </div>

          <div className="mb-3 flex flex-wrap items-end gap-2 rounded-2xl border border-white/8 bg-white/[.02] p-3">
            <div className="mr-1 flex items-center gap-2 text-xs font-black uppercase tracking-[.1em] text-muted-foreground"><Filter className="h-4 w-4 text-primary"/>Filtros</div>
            <Field label="Bloco">
              <select className={inputCls} value={filtroBloco} onChange={(e)=>setFiltroBloco(e.target.value as typeof filtroBloco)}>
                <option>Todos</option><option>Planejada</option><option>Ativa</option><option>Encerrada</option>
              </select>
            </Field>
            <Field label="Prioridade">
              <select className={inputCls} value={filtroPrioridade} onChange={(e)=>setFiltroPrioridade(e.target.value as typeof filtroPrioridade)}>
                <option>Todas</option><option>Alta</option><option>Média</option><option>Baixa</option>
              </select>
            </Field>
            <Field label="Ordenar">
              <select className={inputCls} value={ordenacao} onChange={(e)=>setOrdenacao(e.target.value as typeof ordenacao)}>
                <option>Prioridade</option><option>Data</option>
              </select>
            </Field>
            <div className="ml-auto hidden items-center gap-1 text-[11px] text-muted-foreground sm:flex"><ArrowDownUp className="h-3.5 w-3.5"/>visão compacta com rolagem interna</div>
          </div>

          {calendarioMes && <div className="mb-4 grid gap-4 xl:grid-cols-[330px_minmax(0,1fr)]">
            <div className="rounded-2xl border border-white/8 bg-white/[.02] p-4">
              <div className="mb-3">
                <div className="text-[10px] font-black uppercase tracking-[.14em] text-primary">Legenda do calendário</div>
                <div className="mt-1 font-display text-lg font-black">Objetivo das campanhas</div>
                <div className="mt-1 text-xs text-muted-foreground">As campanhas aparecem automaticamente de acordo com o período cadastrado.</div>
              </div>

              <div className="max-h-[560px] space-y-2 overflow-y-auto pr-1">
                {calendarioMes.campanhas.map((campanha)=><button
                  key={campanha.id}
                  type="button"
                  onClick={()=>{setSelId(campanha.id);setAbaCampanha("Resumo");}}
                  className="w-full rounded-xl border border-white/8 bg-black/10 p-3 text-left transition hover:border-primary/35 hover:bg-primary/[.035]"
                >
                  <div className="flex items-start gap-3">
                    <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/10 bg-white p-1">
                      {campanha.logoCampanha
                        ? <img src={campanha.logoCampanha} alt="" className="h-full w-full object-contain p-1"/>
                        : <span className="font-display text-lg font-black text-primary">{campanha.nome.slice(0,1).toUpperCase()}</span>}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-display text-sm font-black">{campanha.nome}</div>
                      <div className="mt-0.5 text-[10px] font-bold text-primary">{fmtDate(campanha.inicio)} – {fmtDate(campanha.fim)}</div>
                      <div className="mt-1 line-clamp-3 text-[11px] leading-relaxed text-muted-foreground">{campanha.proposito || "Objetivo ainda não informado."}</div>
                    </div>
                  </div>
                </button>)}
                {!calendarioMes.campanhas.length && <div className="rounded-xl border border-dashed border-white/10 p-6 text-center text-xs text-muted-foreground">Nenhuma campanha cadastrada neste mês.</div>}
              </div>
            </div>

            <div className="overflow-hidden rounded-2xl border border-white/8 bg-white/[.02]">
              <div className="flex items-center justify-between gap-3 border-b border-white/8 p-4">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-[.14em] text-primary">Calendário de campanhas</div>
                  <div className="font-display text-xl font-black">{MESES_NOME[Number(mesSelecionado)-1]} {anoSelecionado}</div>
                </div>
                <Badge tone="primary">{calendarioMes.campanhas.length} campanha(s)</Badge>
              </div>

              <div className="overflow-x-auto p-3">
                <div className="min-w-[700px]">
                  <div className="grid grid-cols-7 gap-1">
                    {DIAS_SEMANA.map((dia,i)=><div key={`${dia}-${i}`} className="py-2 text-center text-[10px] font-black uppercase tracking-[.13em] text-muted-foreground">{dia}</div>)}
                    {Array.from({length:calendarioMes.primeiroDiaSemana}).map((_,i)=><div key={`vazio-${i}`} className="min-h-[100px] rounded-xl border border-transparent"/>)}
                    {Array.from({length:calendarioMes.totalDias},(_,index)=>{
                      const dia=index+1;
                      const data=`${anoSelecionado}-${mesSelecionado}-${String(dia).padStart(2,"0")}`;
                      const campanhasDia=calendarioMes.campanhas.filter((campanha)=>campanhaNoDia(campanha,data));
                      const hojeIso=new Date().toISOString().slice(0,10);
                      return <div key={data} className={`min-h-[100px] rounded-xl border p-2 ${data===hojeIso?"border-primary/45 bg-primary/[.045]":"border-white/7 bg-black/[.08]"}`}>
                        <div className="flex items-center justify-between"><span className={`text-xs font-black ${data===hojeIso?"text-primary":"text-muted-foreground"}`}>{dia}</span>{data===hojeIso&&<span className="text-[8px] font-black uppercase text-primary">Hoje</span>}</div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {campanhasDia.slice(0,5).map((campanha)=><button
                            key={campanha.id}
                            type="button"
                            title={`${campanha.nome} · ${campanha.proposito || "Sem objetivo"}`}
                            onClick={()=>{setSelId(campanha.id);setAbaCampanha("Resumo");}}
                            className="group relative grid h-11 w-11 place-items-center overflow-hidden rounded-xl border border-primary/25 bg-white shadow-sm transition hover:scale-110 hover:border-primary"
                          >
                            {campanha.logoCampanha
                              ? <img src={campanha.logoCampanha} alt={campanha.nome} className="h-full w-full object-contain p-1"/>
                              : <span className="font-display text-[11px] font-black text-primary">{campanha.nome.slice(0,2).toUpperCase()}</span>}
                          </button>)}
                          {campanhasDia.length>5&&<span className="grid h-8 min-w-8 place-items-center rounded-lg bg-primary/10 px-1 text-[9px] font-black text-primary">+{campanhasDia.length-5}</span>}
                        </div>
                        {!!campanhasDia.length&&<div className="mt-2 h-1 rounded-full bg-primary/70"/>}
                      </div>;
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>}

          <div className="max-h-[690px] overflow-y-auto pr-1">
            <div className="grid gap-2 sm:grid-cols-2">
            {campanhasVisiveis.map((c) => (
              <button key={c.id} onClick={() => { setSelId(c.id); setAbaCampanha("Resumo"); }} className="rounded-xl border border-white/8 bg-card p-3 text-left shadow-soft transition hover:border-primary/35">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2.5">
                    {c.logoCampanha&&<div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg border border-white/10 bg-white"><img src={c.logoCampanha} alt="" className="h-full w-full object-contain p-1"/></div>}
                    <div className="min-w-0">
                    <div className="truncate font-display font-black">{c.nome}</div>
                    {c.proposito && <div className="mt-0.5 line-clamp-1 text-[11px] leading-relaxed text-muted-foreground">{c.proposito}</div>}
                    </div>
                  </div>
                  <Badge tone={(c.prioridade || "Média") === "Alta" ? "primary" : (c.prioridade || "Média") === "Média" ? "warn" : "muted"}>{c.prioridade || "Média"}</Badge>
                </div>
                <div className="mt-2 flex flex-wrap gap-1">
                  <Badge tone={c.status === "Ativa" ? "success" : c.status === "Planejada" ? "warn" : "muted"}>{c.status}</Badge>
                  <Badge tone={c.aprovacao === "Aprovada" ? "success" : c.aprovacao === "Aguardando Diretoria" ? "warn" : c.aprovacao === "Ajustes solicitados" ? "primary" : "muted"}>{c.aprovacao}</Badge>
                  <Badge tone="muted">Feed {c.pecas.Feed ? "✓" : "—"}</Badge>
                  <Badge tone="muted">Stories {c.pecas.Stories ? "✓" : "—"}</Badge>
                  <Badge tone="muted">Banner {c.pecas.Banner ? "✓" : "—"}</Badge>
                </div>
                <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
                  <span>{fmtDate(c.inicio)} – {fmtDate(c.fim)}</span>
                  <span className="font-bold text-foreground">{brl(c.verba)}</span>
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  <Badge tone="primary">{c.abrangencia === "Rede" ? "Rede toda" : `${c.filialIds.length} filial(is)`}</Badge>
                  <Badge tone={(c.produtosPromocionais?.length || 0) && c.produtosPromocionais.every((p)=>p.feito) ? "success" : "muted"}>{c.produtosPromocionais?.filter((p)=>p.feito).length || 0}/{c.produtosPromocionais?.length || 0} produtos</Badge>
                  {!!c.apoiadores.length && <Badge tone="muted">{c.apoiadores.length} apoiador(es)</Badge>}
                </div>
              </button>
            ))}
            </div>
          </div>

          {!campanhasVisiveis.length && <div className="rounded-2xl border border-dashed border-white/10 p-10 text-center">
            <CalendarRange className="mx-auto h-8 w-8 text-muted-foreground/50"/>
            <div className="mt-2 font-display font-black">Nenhuma campanha neste mês</div>
            <p className="mt-1 text-sm text-muted-foreground">Crie a primeira campanha de {MESES_NOME[Number(mesSelecionado)-1]}.</p>
          </div>}
        </div>}
      </Panel>

      <Modal open={!!sel} onClose={() => { setSelId(null); setObservacaoRecusa(""); }} title={sel?.nome ?? ""} extraWide>
        {sel && (
          <div>
            <div className="mb-4 flex justify-end">
              <Btn variant="danger" onClick={() => {
                if (!confirm(`Excluir a campanha "${sel.nome}"? As atividades e pendências vinculadas também serão excluídas.`)) return;
                set((st) => {
                  const pendenciasRemovidas = new Set(st.pendencias.filter((p) => p.campanhaId === sel.id).map((p) => p.id));
                  return {
                    ...st,
                    campanhas: st.campanhas.filter((c) => c.id !== sel.id),
                    pendencias: st.pendencias.filter((p) => p.campanhaId !== sel.id),
                    funcionarios: st.funcionarios.map((func) => ({
                      ...func,
                      atividades: func.atividades.filter((a) =>
                        a.sourceCampanhaId !== sel.id &&
                        !(a.sourcePendenciaId && pendenciasRemovidas.has(a.sourcePendenciaId))
                      ),
                    })),
                  };
                });
                setSelId(null);
                toast.success("Campanha e atividades vinculadas excluídas.");
              }}><Trash2 className="h-4 w-4" />Excluir campanha</Btn>
            </div>
            <div className="mb-5 overflow-x-auto">
              <div className="flex min-w-max gap-1 rounded-2xl border border-white/8 bg-black/10 p-1.5">
                {ABAS_CAMPANHA.map((aba) => {
                  const count = aba === "Atividades" ? tarefasCampanha.length : aba === "Produtos"
                    ? sel.produtosPromocionais?.length || 0
                    : aba === "Produtos para vídeo de Growth"
                      ? sel.produtosPromocionais?.filter((p) => p.growthVideo).length || 0
                    : aba === "Apoiadores"
                      ? sel.apoiadores.length
                      : aba === "Filiais e verba" && sel.abrangencia === "Filiais"
                        ? sel.filialIds.length
                        : null;
                  return <button
                    key={aba}
                    type="button"
                    onClick={() => setAbaCampanha(aba)}
                    className={`rounded-xl px-4 py-2.5 text-sm font-black transition ${abaCampanha === aba ? "bg-primary text-white shadow-brand" : "text-muted-foreground hover:bg-white/[.06] hover:text-foreground"}`}
                  >
                    {aba}{count != null ? ` · ${count}` : ""}
                  </button>;
                })}
              </div>
            </div>

            {abaCampanha === "Atividades" && <div className="space-y-4">
              <Panel title={editandoTarefa ? "Editar atividade da campanha" : "Distribuir nova atividade"}>
                <div className="grid gap-3 md:grid-cols-2">
                  <Field label="Atividade"><input className={inputCls} value={tarefa.titulo} onChange={(e)=>setTarefa((x)=>({...x,titulo:e.target.value}))} placeholder="Ex.: Produzir vídeo da oferta" /></Field>
                  <Field label="Colaborador responsável"><select className={inputCls} value={tarefa.funcionarioId} onChange={(e)=>setTarefa((x)=>({...x,funcionarioId:e.target.value}))}><option value="">Selecione um colaborador</option>{s.funcionarios.map((f)=><option key={f.id} value={f.id}>{f.nome} · {f.cargo}</option>)}</select></Field>
                  <Field label="Data de entrega"><input type="date" className={inputCls} value={tarefa.data} onChange={(e)=>setTarefa((x)=>({...x,data:e.target.value}))}/></Field>
                  <Field label="Horário"><input type="time" className={inputCls} value={tarefa.horario} onChange={(e)=>setTarefa((x)=>({...x,horario:e.target.value}))}/></Field>
                  <Field label="Prioridade"><select className={inputCls} value={tarefa.prioridade} onChange={(e)=>setTarefa((x)=>({...x,prioridade:e.target.value as typeof tarefa.prioridade}))}><option>Alta</option><option>Média</option><option>Baixa</option></select></Field>
                  <Field label="Orientações"><textarea rows={2} className={inputCls} value={tarefa.descricao} onChange={(e)=>setTarefa((x)=>({...x,descricao:e.target.value}))} placeholder="Instruções, formatos, links e detalhes" /></Field>
                </div>
                <div className="mt-3 flex flex-wrap gap-2"><Btn onClick={salvarTarefaCampanha}><Plus className="h-4 w-4"/>{editandoTarefa ? "Salvar alterações" : "Atribuir atividade"}</Btn>{editandoTarefa && <Btn variant="outline" onClick={()=>{setEditandoTarefa(null);setTarefa({titulo:"",descricao:"",funcionarioId:"",data:"",horario:"",prioridade:"Média"});}}>Cancelar edição</Btn>}</div>
              </Panel>
              <Panel title={`Atividades vinculadas · ${tarefasCampanha.length}`}>
                <div className="grid gap-2">
                  {tarefasCampanha.map((a)=><div key={a.id+"-"+a.funcionarioId} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/10 p-3">
                    <div className="min-w-0"><div className="font-bold">{a.titulo}</div><div className="mt-1 text-xs text-muted-foreground">{a.funcionarioNome} · {fmtDate(a.data)}{a.horario ? ` às ${a.horario}` : ""} · {a.prioridade || "Média"}</div></div>
                    <div className="flex items-center gap-2"><Badge tone={a.feito || a.status==="Finalizado" ? "success" : a.status==="Realizando" ? "warn" : "muted"}>{a.feito || a.status==="Finalizado" ? "Finalizada" : a.status || "A fazer"}</Badge><Btn variant="outline" onClick={()=>editarTarefaCampanha(a)}><Pencil className="h-4 w-4"/>Editar</Btn></div>
                  </div>)}
                  {!tarefasCampanha.length && <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma atividade atribuída. Cadastre acima para ela aparecer automaticamente no quadro do colaborador.</p>}
                </div>
              </Panel>
            </div>}

            {abaCampanha === "Resumo" && <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-white/8 bg-white/[.02] p-4">
                  <div className="text-[10px] font-black uppercase tracking-[.13em] text-muted-foreground">Status</div>
                  <div className="mt-2"><Badge tone={sel.status === "Ativa" ? "success" : sel.status === "Planejada" ? "warn" : "muted"}>{sel.status}</Badge></div>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[.02] p-4">
                  <div className="text-[10px] font-black uppercase tracking-[.13em] text-muted-foreground">Período</div>
                  <div className="mt-2 font-bold">{fmtDate(sel.inicio)} – {fmtDate(sel.fim)}</div>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[.02] p-4">
                  <div className="text-[10px] font-black uppercase tracking-[.13em] text-muted-foreground">Verba</div>
                  <div className="mt-2 font-display text-lg font-black">{brl(sel.verba)}</div>
                </div>
                <div className="rounded-2xl border border-white/8 bg-white/[.02] p-4">
                  <div className="text-[10px] font-black uppercase tracking-[.13em] text-muted-foreground">Abrangência</div>
                  <div className="mt-2 font-bold">{sel.abrangencia === "Rede" ? "Rede inteira" : `${sel.filialIds.length} filial(is)`}</div>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <Field label="Status da campanha"><select className={inputCls} value={sel.status} onChange={(e) => upd({ ...sel, status: e.target.value as Campanha["status"] })}><option>Planejada</option><option>Ativa</option><option>Encerrada</option></select></Field>
                <Field label="Prioridade"><select className={inputCls} value={sel.prioridade || "Média"} onChange={(e)=>upd({ ...sel, prioridade:e.target.value as "Alta" | "Média" | "Baixa" })}><option>Alta</option><option>Média</option><option>Baixa</option></select></Field>
                <Field label="Verba total da campanha (R$)"><input type="number" min={0} step="0.01" className={inputCls} value={sel.verba || ""} onChange={(e) => upd({ ...sel, verba: Number(e.target.value) })} /></Field>
              </div>

              <Panel title="Fluxo de aprovação da campanha" action={<ShieldCheck className="h-4 w-4 text-primary" />}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge tone={sel.aprovacao === "Aprovada" ? "success" : sel.aprovacao === "Aguardando Diretoria" ? "warn" : sel.aprovacao === "Ajustes solicitados" ? "primary" : "muted"}>{sel.aprovacao || "Rascunho"}</Badge>
                      {sel.aprovadoPor && <span className="text-xs text-muted-foreground">por {sel.aprovadoPor}{sel.aprovadoEm ? ` · ${new Date(sel.aprovadoEm).toLocaleString("pt-BR")}` : ""}</span>}
                    </div>
                    <p className="mt-2 max-w-2xl text-sm text-muted-foreground">O Gerente de Marketing estrutura a campanha e envia para aprovação. A Diretoria aprova a campanha, as peças e monta a tabela de produtos promocionais.</p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {!podeAprovar && (sel.aprovacao === "Rascunho" || sel.aprovacao === "Ajustes solicitados") && <Btn onClick={() => { upd({ ...sel, aprovacao: "Aguardando Diretoria", observacaoAprovacao: undefined, aprovadoPor: undefined, aprovadoEm: undefined }); toast.success("Campanha enviada para aprovação da Diretoria."); }}><Send className="h-4 w-4" />Enviar para Diretoria</Btn>}
                    {podeAprovar && sel.aprovacao !== "Aprovada" && <Btn onClick={() => {
                      const usuario = s.usuarios.find((u) => u.id === s.usuarioAtivoId);
                      upd({ ...sel, aprovacao: "Aprovada", observacaoAprovacao: observacaoRecusa.trim() || undefined, aprovadoPor: usuario?.nome || "Diretoria", aprovadoEm: new Date().toISOString() });
                      toast.success("Campanha aprovada.");
                    }}><CheckCircle2 className="h-4 w-4" />Aprovar campanha</Btn>}
                    {podeAprovar && sel.aprovacao !== "Ajustes solicitados" && <Btn variant="outline" onClick={() => {
                      const motivo = observacaoRecusa.trim();
                      if (!motivo) { toast.error("Informe o motivo da não aprovação antes de solicitar ajustes."); return; }
                      const usuario = s.usuarios.find((u) => u.id === s.usuarioAtivoId);
                      upd({ ...sel, aprovacao: "Ajustes solicitados", observacaoAprovacao: motivo, aprovadoPor: usuario?.nome || "Diretoria", aprovadoEm: new Date().toISOString() });
                      setObservacaoRecusa("");
                      toast.success("Campanha devolvida com justificativa para ajustes.");
                    }}>Não aprovar / Solicitar ajustes</Btn>}
                  </div>
                </div>
                {podeAprovar && sel.aprovacao !== "Aprovada" && <div className="mt-4">
                  <Field label="Observação da Diretoria (opcional ao aprovar; obrigatória ao solicitar ajustes)">
                    <textarea rows={3} className={inputCls} value={observacaoRecusa} onChange={(e) => setObservacaoRecusa(e.target.value)} placeholder="Comentários sobre a campanha, ou explique o que precisa mudar antes de aprovar..." />
                  </Field>
                </div>}
                {sel.observacaoAprovacao && (sel.aprovacao === "Ajustes solicitados" || sel.aprovacao === "Aprovada") && <div className="mt-4 rounded-xl border border-primary/25 bg-primary/5 p-3 text-sm">
                  <div className="font-bold">{sel.aprovacao === "Aprovada" ? "Observação da aprovação" : "Motivo da não aprovação"}</div>
                  <p className="mt-1 whitespace-pre-wrap">{sel.observacaoAprovacao}</p>
                </div>}
              </Panel>

              <Panel title="Propósito da campanha">
                <Field label="O que esta campanha pretende alcançar?">
                  <textarea rows={5} className={inputCls} placeholder="Ex.: gerar fluxo nas lojas, aumentar vendas de sofás, divulgar a raspadinha e reforçar o aniversário da rede..." value={sel.proposito} onChange={(e) => upd({ ...sel, proposito: e.target.value })} />
                </Field>
                <p className="mt-2 text-xs text-muted-foreground">Registre objetivo, lógica comercial e resultado esperado para a equipe executar a campanha com o mesmo direcionamento.</p>
              </Panel>
            </div>}

            {abaCampanha === "Filiais e verba" && <div className="space-y-4">
              <Panel title="Abrangência da campanha">
                <div className="grid gap-3 md:grid-cols-2">
                  <button type="button" onClick={() => upd({ ...sel, abrangencia: "Rede", filialIds: [], planosFiliais: [] })} className={`rounded-xl border p-4 text-left transition ${sel.abrangencia === "Rede" ? "border-primary bg-primary/8" : "border-white/10 hover:border-primary/30"}`}>
                    <div className="flex items-center gap-2 font-bold"><Network className="h-4 w-4 text-primary" />Rede inteira</div>
                    <p className="mt-1 text-xs text-muted-foreground">A campanha aparece em todas as filiais.</p>
                  </button>
                  <button type="button" onClick={() => upd({ ...sel, abrangencia: "Filiais" })} className={`rounded-xl border p-4 text-left transition ${sel.abrangencia === "Filiais" ? "border-primary bg-primary/8" : "border-white/10 hover:border-primary/30"}`}>
                    <div className="flex items-center gap-2 font-bold"><Store className="h-4 w-4 text-primary" />Filiais específicas</div>
                    <p className="mt-1 text-xs text-muted-foreground">Selecione apenas as lojas participantes.</p>
                  </button>
                </div>
                {sel.abrangencia === "Filiais" && <div className="mt-4 grid max-h-72 gap-2 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
                  {s.filiais.filter((x) => !x.isCD).map((x) => {
                    const checked = sel.filialIds.includes(x.id);
                    return <label key={x.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm transition ${checked ? "border-primary/40 bg-primary/8" : "border-white/8 hover:border-primary/25"}`}>
                      <input type="checkbox" checked={checked} onChange={(e) => {
                        const planos = sel.planosFiliais || [];
                        upd({
                          ...sel,
                          filialIds: e.target.checked ? [...sel.filialIds, x.id] : sel.filialIds.filter((id) => id !== x.id),
                          planosFiliais: e.target.checked
                            ? (planos.some((p) => p.filialId === x.id) ? planos : [...planos, { filialId: x.id, verba: 0, acoes: [] }])
                            : planos.filter((p) => p.filialId !== x.id),
                        });
                      }} className="accent-[var(--primary)]" />
                      <span><b>{x.codigo}</b> · {x.nome}</span>
                    </label>;
                  })}
                </div>}
              </Panel>

              {sel.abrangencia === "Filiais" && !!sel.filialIds.length
                ? <PlanosFiliaisEditor
                    filiais={s.filiais}
                    filialIds={sel.filialIds}
                    planos={sel.planosFiliais || []}
                    onChange={(planosFiliais) => upd({ ...sel, planosFiliais })}
                    verbaCampanha={sel.verba}
                  />
                : <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-muted-foreground">Selecione “Filiais específicas” para definir quanto cada loja pode investir e em quais ações.</div>}
            </div>}

            {abaCampanha === "Artes" && <div className="space-y-4">
              <Panel title="Logo da campanha · marcador do calendário">
                <div className="grid gap-4 sm:grid-cols-[150px_1fr] sm:items-center">
                  <div className="grid aspect-square w-full max-w-[150px] place-items-center overflow-hidden rounded-2xl border border-white/10 bg-white p-3">
                    {sel.logoCampanha
                      ? <img src={sel.logoCampanha} alt={`Logo ${sel.nome}`} className="h-full w-full object-contain"/>
                      : <div className="text-center"><ImagePlus className="mx-auto h-7 w-7 text-primary"/><div className="mt-2 text-[10px] font-black uppercase text-muted-foreground">Sem logo</div></div>}
                  </div>
                  <div>
                    <div className="font-bold">PNG com fundo transparente</div>
                    <p className="mt-1 text-xs leading-relaxed text-muted-foreground">Essa imagem é independente de Feed, Stories e Banner. Ela será usada como marcador da campanha no calendário mensal.</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-primary/35 bg-primary/[.035] px-4 py-2.5 text-sm font-bold transition hover:bg-primary/[.07]">
                        <Upload className="h-4 w-4"/>
                        {sel.logoCampanha ? "Trocar logo PNG" : "Enviar logo PNG"}
                        <input
                          type="file"
                          className="hidden"
                          accept="image/png"
                          onChange={(e)=>{
                            const file=e.target.files?.[0];
                            if(!file)return;
                            if(file.type!=="image/png" && !file.name.toLowerCase().endsWith(".png")){
                              toast.error("Envie a logo em PNG.");
                              return;
                            }
                            if(file.size>2*1024*1024){
                              toast.error("A logo precisa ter no máximo 2 MB.");
                              return;
                            }
                            const reader=new FileReader();
                            reader.onload=()=>{upd({...sel,logoCampanha:String(reader.result||"")});toast.success("Logo salva como marcador do calendário.");};
                            reader.readAsDataURL(file);
                          }}
                        />
                      </label>
                      {sel.logoCampanha&&<Btn variant="danger" onClick={()=>upd({...sel,logoCampanha:undefined})}><Trash2 className="h-4 w-4"/>Remover logo</Btn>}
                    </div>
                  </div>
                </div>
              </Panel>

              <Panel title="Artes da campanha">
                <div className="mb-4 rounded-xl border border-white/8 bg-white/[.02] p-3 text-sm">
                  <div className="font-bold">Envie a arte final para visualizar exatamente como ela ficou.</div>
                  <p className="mt-1 text-xs text-muted-foreground">Feed: 1080×1080 · Stories: 1080×1920 · Banner: 1200×400. Enquanto não houver arquivo, aparece somente a prévia simples da campanha.</p>
                </div>

                <div className="grid gap-5 lg:grid-cols-3">
                  {FORMATOS.map((x) => {
                    const formato = x.k as FormatoPeca;
                    const temArte = !!sel.artes?.[formato];
                    const aprovacaoArte = sel.aprovacoesArtes?.[formato];
                    const observacaoArte = aprovacaoArte?.observacao || "";
                    const registrarDecisaoArte = (status: "Aprovada" | "Ajustes solicitados") => {
                      const motivo = (document.getElementById(`observacao-arte-${sel.id}-${formato}`) as HTMLTextAreaElement | null)?.value?.trim() || "";
                      if (status === "Ajustes solicitados" && !motivo) {
                        toast.error("Informe o que precisa ser corrigido na arte.");
                        return;
                      }
                      const usuario = s.usuarios.find((u) => u.id === s.usuarioAtivoId);
                      upd({
                        ...sel,
                        pecas: { ...sel.pecas, [formato]: status === "Aprovada" },
                        aprovacoesArtes: {
                          ...(sel.aprovacoesArtes || {}),
                          [formato]: { status, observacao: motivo, avaliadoPor: usuario?.nome || "Diretoria", avaliadoEm: new Date().toISOString() },
                        },
                      });
                      toast.success(status === "Aprovada" ? `Arte de ${formato} aprovada.` : `Ajustes solicitados para ${formato}.`);
                    };


                    const carregarArte = (file?: File) => {
                      if (!file) return;
                      if (file.size > 8 * 1024 * 1024) {
                        toast.error("A imagem precisa ter no máximo 8 MB.");
                        return;
                      }
                      const reader = new FileReader();
                      reader.onload = () => {
                        upd({
                          ...sel,
                          artes: { ...(sel.artes || {}), [formato]: String(reader.result || "") },
                          pecas: { ...sel.pecas, [formato]: false },
                          aprovacoesArtes: { ...(sel.aprovacoesArtes || {}), [formato]: { status: "Aguardando aprovação" } },
                        });
                        toast.success(`Arte de ${formato} carregada para conferência.`);
                      };
                      reader.readAsDataURL(file);
                    };

                    return <div key={x.k} className="space-y-3 rounded-2xl border border-white/8 bg-white/[.015] p-3">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="font-display font-black">{x.k}</div>
                          <div className="text-xs text-muted-foreground">{x.dim}</div>
                        </div>
                        <Badge tone={temArte ? (sel.pecas[formato] ? "success" : "primary") : "muted"}>
                          {temArte ? (sel.pecas[formato] ? "Arte aprovada" : "Arte enviada") : "Sem arquivo"}
                        </Badge>
                      </div>

                      <div className={x.k === "Stories" ? "mx-auto w-2/3" : ""}><Peca c={sel} k={formato} ratio={x.ratio} /></div>

                      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 px-3 py-2.5 text-sm font-bold transition hover:border-primary/45 hover:bg-primary/5">
                        <Upload className="h-4 w-4" />
                        {temArte ? "Trocar imagem" : "Enviar imagem"}
                        <input type="file" className="hidden" accept="image/png,image/jpeg,image/webp" onChange={(e) => carregarArte(e.target.files?.[0])} />
                      </label>

                      {temArte && <div className="space-y-2">
                        {podeAprovar && <Field label={`Observações da Diretoria · ${formato}`}>
                          <textarea key={`${sel.id}-${formato}-${aprovacaoArte?.avaliadoEm || "pending"}`} id={`observacao-arte-${sel.id}-${formato}`} rows={3} className={inputCls} defaultValue={observacaoArte} placeholder="Comente a aprovação ou explique os ajustes necessários..." />
                        </Field>}
                        {podeAprovar
                          ? <div className="flex flex-wrap gap-2">
                              <Btn className="flex-1" onClick={() => registrarDecisaoArte("Aprovada")}><Check className="h-4 w-4" />Aprovar arte</Btn>
                              <Btn variant="outline" className="flex-1" onClick={() => registrarDecisaoArte("Ajustes solicitados")}>Solicitar ajustes</Btn>
                            </div>
                          : <div className="rounded-xl border border-white/8 p-2.5 text-center text-xs text-muted-foreground">{sel.pecas[formato] ? "✓ Aprovada pela Diretoria" : aprovacaoArte?.status || "Aguardando aprovação"}</div>}
                        {aprovacaoArte?.status && aprovacaoArte.status !== "Aguardando aprovação" && <div className="rounded-xl border border-white/10 p-3 text-xs">
                          <strong>{aprovacaoArte.status}</strong>{aprovacaoArte.avaliadoPor ? ` · ${aprovacaoArte.avaliadoPor}` : ""}
                          {aprovacaoArte.avaliadoEm ? ` · ${new Date(aprovacaoArte.avaliadoEm).toLocaleString("pt-BR")}` : ""}
                          {observacaoArte && <p className="mt-1 whitespace-pre-wrap">{observacaoArte}</p>}
                        </div>}
                        <Btn variant="danger" onClick={() => {
                          const artes = { ...(sel.artes || {}) };
                          delete artes[formato];
                          const aprovacoesArtes = { ...(sel.aprovacoesArtes || {}) };
                          delete aprovacoesArtes[formato];
                          upd({ ...sel, artes, aprovacoesArtes, pecas: { ...sel.pecas, [formato]: false } });
                        }}><Trash2 className="h-4 w-4" />Remover arte</Btn>
                      </div>}
                    </div>;
                  })}
                </div>
              </Panel>

              <Panel title="O que é o kit da campanha?">
                <p className="text-sm text-muted-foreground">O kit é o conjunto das artes finais aprovadas (Feed, Stories e Banner) que a equipe usa para distribuir para as filiais. O botão antigo “Enviar kit” não fazia um envio real; ele era apenas uma confirmação visual. Para não confundir, deixei esta etapa somente como conferência das artes aprovadas.</p>
              </Panel>
            </div>}

            {abaCampanha === "Produtos" && <ProdutosPromocionais campanha={sel} podeEditar={podeMontarTabela} onChange={upd} />}

            {abaCampanha === "Produtos para vídeo de Growth" && <ProdutosGrowth campanha={sel} podeEditar={podeMontarTabela} onChange={upd} />}

            {abaCampanha === "Apoiadores" && <Apoiadores campanha={sel} onChange={upd} />}
          </div>
        )}
      </Modal>

      <Modal open={open} onClose={() => setOpen(false)} title="Nova campanha">
        <div className="space-y-3">
          <Field label="Nome"><input className={inputCls} value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} /></Field>
          <Field label="Propósito da campanha"><textarea rows={4} className={inputCls} placeholder="Explique o objetivo da campanha, o que queremos provocar no cliente e qual resultado esperamos." value={f.proposito} onChange={(e) => setF({ ...f, proposito: e.target.value })} /></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Início"><input type="date" className={inputCls} value={f.inicio} onChange={(e) => setF({ ...f, inicio: e.target.value })} /></Field>
            <Field label="Fim"><input type="date" className={inputCls} value={f.fim} onChange={(e) => setF({ ...f, fim: e.target.value })} /></Field>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Verba (R$)"><input type="number" className={inputCls} value={f.verba} onChange={(e) => setF({ ...f, verba: +e.target.value })} /></Field>
            <Field label="Prioridade"><select className={inputCls} value={f.prioridade} onChange={(e)=>setF({ ...f, prioridade:e.target.value as "Alta" | "Média" | "Baixa" })}><option>Alta</option><option>Média</option><option>Baixa</option></select></Field>
          </div>
          <Field label="Abrangência"><select className={inputCls} value={f.abrangencia} onChange={(e) => setF({ ...f, abrangencia: e.target.value as "Rede" | "Filiais", filialIds: e.target.value === "Rede" ? [] : f.filialIds, planosFiliais: e.target.value === "Rede" ? [] : f.planosFiliais })}><option value="Rede">Rede inteira</option><option value="Filiais">Filiais específicas</option></select></Field>
          {f.abrangencia === "Filiais" && <div className="max-h-56 space-y-2 overflow-y-auto rounded-xl border border-white/8 p-3">
            {s.filiais.filter((x) => !x.isCD).map((x) => {
              const checked = f.filialIds.includes(x.id);
              return <label key={x.id} className="flex cursor-pointer items-center gap-3 text-sm">
                <input type="checkbox" checked={checked} onChange={(e) => setF({
                  ...f,
                  filialIds: e.target.checked ? [...f.filialIds, x.id] : f.filialIds.filter((id) => id !== x.id),
                  planosFiliais: e.target.checked
                    ? (f.planosFiliais.some((p) => p.filialId === x.id) ? f.planosFiliais : [...f.planosFiliais, { filialId: x.id, verba: 0, acoes: [] }])
                    : f.planosFiliais.filter((p) => p.filialId !== x.id),
                })} className="accent-[var(--primary)]" />
                <span><b>{x.codigo}</b> · {x.nome}</span>
              </label>;
            })}
          </div>}
          {f.abrangencia === "Filiais" && !!f.filialIds.length && <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">Depois de criar a campanha, a aba <b className="text-foreground">Filiais e verba</b> será aberta para você distribuir o valor por loja e definir ações como carro de som, locutor e pipoca.</div>}
          <Btn className="w-full" disabled={!f.nome || (f.abrangencia === "Filiais" && !f.filialIds.length)} onClick={() => {
            const id = uid();
            const nova: Campanha = { id, ...f, status: "Planejada", aprovacao: "Rascunho", produtosPromocionais: [], pecas: { Feed: false, Stories: false, Banner: false }, videos: [], fonteProdutosUrl: "", tom: 0, apoiadores: [] };
            set((st) => ({ ...st, campanhas: [nova, ...st.campanhas] }));
            setOpen(false);
            setSelId(id);
            setAbaCampanha(f.abrangencia === "Filiais" ? "Filiais e verba" : "Resumo");
            setF({ nome: "", proposito: "", inicio: "", fim: "", verba: 5000, prioridade: "Média", abrangencia: "Rede", filialIds: [], planosFiliais: [] });
          }}>Criar campanha</Btn>
        </div>
      </Modal>
    </>
  );
}

type ProdutoBusca = {
  url: string;
  nome: string;
  sku: string;
  descricao: string;
  imagem: string;
  precoSite: number | null;
  precoAnterior: number | null;
};

function ValorInput({ value, onChange, disabled = false }: { value: number | null; onChange: (value: number) => void; disabled?: boolean }) {
  return <div className="relative">
    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-muted-foreground">R$</span>
    <input
      type="number"
      min={0}
      step="0.01"
      inputMode="decimal"
      disabled={disabled}
      className={`${inputCls} pl-10 text-right font-bold disabled:opacity-70`}
      value={value && value > 0 ? value : ""}
      placeholder="0,00"
      onChange={(e) => onChange(Number(e.target.value))}
    />
  </div>;
}

function ProdutosPromocionais({
  campanha,
  podeEditar,
  onChange,
}: {
  campanha: Campanha;
  podeEditar: boolean;
  onChange: (c: Campanha) => void;
}) {
  const [q, setQ] = useState("");
  const [buscando, setBuscando] = useState(false);
  const [resultados, setResultados] = useState<ProdutoBusca[]>([]);
  const [siteStatus, setSiteStatus] = useState<"idle" | "ok" | "error">("idle");
  const [siteMensagem, setSiteMensagem] = useState("");
  const [produtoAberto, setProdutoAberto] = useState<string | null>(null);
  const [descricaoAberta, setDescricaoAberta] = useState<Record<string, boolean>>({});
  const [sheetUrl, setSheetUrl] = useState(campanha.fonteProdutosUrl || "");
  const [importandoSheet, setImportandoSheet] = useState(false);
  const produtos = campanha.produtosPromocionais || [];
  const concluidos = produtos.filter((p) => p.feito).length;
  const brl2 = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const buscar = async () => {
    if (!q.trim()) return;
    setBuscando(true);
    setSiteMensagem("");
    try {
      const res = await fetch(`/api/lojas-im/search?q=${encodeURIComponent(q.trim())}`, { cache: "no-store" });
      const data = await res.json().catch(() => null);

      if (!res.ok || data?.conectado === false) {
        const mensagem = data?.error || "O site das Lojas IM não respondeu à busca.";
        setResultados([]);
        setSiteStatus("error");
        setSiteMensagem(mensagem);
        toast.error("Falha na consulta ao site", { description: mensagem });
        return;
      }

      const lista = (data?.produtos || []) as ProdutoBusca[];
      setResultados(lista);
      setSiteStatus("ok");
      setSiteMensagem(lista.length
        ? `${lista.length} produto(s) encontrado(s) no site.`
        : "O site respondeu normalmente, mas não encontrou produto para este termo.");

      if (!lista.length) {
        toast.error("Nenhum produto encontrado no site.", {
          description: "Tente pelo SKU exato, por parte do nome ou cole o link do produto.",
        });
      }
    } catch (error) {
      const mensagem = error instanceof Error ? error.message : "Não foi possível consultar o site das Lojas IM.";
      setResultados([]);
      setSiteStatus("error");
      setSiteMensagem(mensagem);
      toast.error("Não foi possível consultar o site das Lojas IM.", { description: mensagem });
    } finally {
      setBuscando(false);
    }
  };

  const adicionar = (p: ProdutoBusca) => {
    if (produtos.some((x) => (p.sku && x.sku === p.sku) || x.url === p.url)) {
      toast.error("Esse produto já está na campanha.");
      return;
    }
    const novo: ProdutoPromocional = {
      id: uid(),
      sku: p.sku,
      nome: p.nome,
      descricao: p.descricao,
      imagem: p.imagem,
      url: p.url,
      precoSite: p.precoSite,
      precoAnterior: p.precoAnterior ?? p.precoSite,
      precoVista: 0,
      precoParcelado: 0,
      parcelas: 10,
      juros: "Sem juros",
      jurosPercentual: 0,
      observacao: "",
      feito: false,
      growthVideo: false,
    };
    onChange({ ...campanha, produtosPromocionais: [...produtos, novo] });
    setResultados([]);
    setQ("");
    setProdutoAberto(novo.id);
    toast.success("Produto adicionado. Agora preencha a condição promocional.");
  };

  const recalcularCondicao = (produto: ProdutoPromocional, patch: Partial<ProdutoPromocional>) => {
    const prox = { ...produto, ...patch };
    const preco = Math.max(0, Number(prox.precoVista) || 0);
    const parcelas = Math.max(1, Number(prox.parcelas) || 1);
    const pct = prox.juros === "Com juros" ? Math.max(0, Number(prox.jurosPercentual) || 0) : 0;
    const total = preco * (1 + pct / 100);
    return {
      ...prox,
      jurosPercentual: prox.juros === "Com juros" ? pct : 0,
      precoParcelado: preco > 0 ? Number((total / parcelas).toFixed(2)) : 0,
    };
  };

  const atualizar = (id: string, patch: Partial<ProdutoPromocional>, recalcular = false) => {
    onChange({
      ...campanha,
      produtosPromocionais: produtos.map((p) => {
        if (p.id !== id) return p;
        return recalcular ? recalcularCondicao(p, patch) : { ...p, ...patch };
      }),
    });
  };


  const importarPlanilha = async () => {
    if (!sheetUrl.trim() || importandoSheet) return;
    setImportandoSheet(true);
    try {
      const res = await fetch("/api/campanhas/import-sheet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: sheetUrl.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.ok) throw new Error(data?.error || "Não foi possível ler a planilha.");

      const linhas = Array.isArray(data.produtos) ? data.produtos : [];
      const existentes = new Set(produtos.map((p) => p.sku).filter(Boolean));
      const novas = linhas.filter((p: any) => p?.sku && !existentes.has(String(p.sku))).map((p: any): ProdutoPromocional => ({
        id: uid(),
        sku: String(p.sku || ""),
        nome: String(p.nome || ""),
        descricao: "",
        imagem: "",
        url: "",
        precoSite: null,
        precoAnterior: typeof p.precoAnterior === "number" ? p.precoAnterior : null,
        precoVista: Number(p.precoVista || 0),
        precoParcelado: Number(p.precoParcelado || 0),
        parcelas: Number(p.parcelas || 10),
        juros: p.juros === "Com juros" ? "Com juros" : "Sem juros",
        jurosPercentual: 0,
        observacao: String(p.observacao || ""),
        feito: false,
        growthVideo: false,
      }));

      const enriquecidas = await Promise.all(novas.slice(0, 50).map(async (p: ProdutoPromocional) => {
        try {
          const busca = await fetch(`/api/lojas-im/search?q=${encodeURIComponent(p.sku)}`);
          const json = await busca.json();
          const encontrado = Array.isArray(json?.produtos) ? json.produtos[0] : null;
          if (!encontrado) return p;
          return {
            ...p,
            nome: encontrado.nome || p.nome,
            descricao: encontrado.descricao || "",
            imagem: encontrado.imagem || "",
            url: encontrado.url || "",
            precoSite: typeof encontrado.precoSite === "number" ? encontrado.precoSite : null,
            precoAnterior: p.precoAnterior ?? encontrado.precoAnterior ?? encontrado.precoSite ?? null,
          } as ProdutoPromocional;
        } catch {
          return p;
        }
      }));

      const resto = novas.slice(50);
      onChange({
        ...campanha,
        fonteProdutosUrl: sheetUrl.trim(),
        produtosPromocionais: [...produtos, ...enriquecidas, ...resto],
      });
      toast.success(`${novas.length} produto(s) importado(s) da planilha`, {
        description: linhas.length !== novas.length ? `${linhas.length - novas.length} SKU(s) já estavam na campanha e foram ignorados.` : "SKU, valores e condições foram adicionados à campanha.",
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível importar a planilha.");
    } finally {
      setImportandoSheet(false);
    }
  };

  const remover = (id: string) => {
    onChange({ ...campanha, produtosPromocionais: produtos.filter((p) => p.id !== id) });
    if (produtoAberto === id) setProdutoAberto(null);
  };

  return <div className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-3">
      <Stat label="Produtos" value={String(produtos.length)} hint="na campanha" />
      <Stat label="Prontos" value={String(concluidos)} hint="condição finalizada" />
      <Stat accent label="Pendentes" value={String(Math.max(0, produtos.length - concluidos))} hint="para revisar" />
    </div>

    <Panel title="Carregar produtos por link da planilha" action={<Link2 className="h-4 w-4 text-primary" />}>
      <p className="mb-3 text-xs text-muted-foreground">Cole o link do Google Sheets usado pela campanha. O BI lê SKU, produto, preço anterior, preço à vista, parcelamento e observação e adiciona os itens automaticamente.</p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <input className={inputCls} placeholder="https://docs.google.com/spreadsheets/d/..." value={sheetUrl} onChange={(e)=>setSheetUrl(e.target.value)} />
        <Btn onClick={()=>void importarPlanilha()} disabled={!sheetUrl.trim() || importandoSheet}>
          {importandoSheet ? <Loader2 className="h-4 w-4 animate-spin"/> : <Upload className="h-4 w-4"/>}
          {importandoSheet ? "Importando..." : "Carregar produtos"}
        </Btn>
      </div>
      {campanha.fonteProdutosUrl && <div className="mt-2 text-[11px] text-muted-foreground">Fonte atual: <a href={campanha.fonteProdutosUrl} target="_blank" rel="noreferrer" className="font-bold text-primary hover:underline">abrir planilha <ExternalLink className="inline h-3 w-3"/></a></div>}
      <p className="mt-2 text-[10px] text-muted-foreground">Se a planilha for restrita, no Google Sheets ajuste o compartilhamento para “qualquer pessoa com o link — leitor”. O BI não solicita nem armazena sua senha do Google.</p>
    </Panel>

    <Panel
      title="Buscar e adicionar produto"
      action={<PackageSearch className="h-4 w-4 text-primary" />}
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">Busque por SKU, nome ou cole o link do produto. Foto, nome e preço são consultados diretamente em lojasim.com.br.</p>
        <div className="flex items-center gap-2">
          {siteStatus === "ok" && <Badge tone="success">Site Lojas IM conectado</Badge>}
          {siteStatus === "error" && <Badge tone="warn">Falha na consulta ao site</Badge>}
          <a href="https://www.lojasim.com.br/busca" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline">Abrir site <ExternalLink className="h-3 w-3"/></a>
        </div>
      </div>
      {siteMensagem && <div className={`mb-3 rounded-xl border p-3 text-xs ${siteStatus === "error" ? "border-warn/20 bg-warn/[.04] text-warn" : "border-success/15 bg-success/[.035] text-muted-foreground"}`}>{siteMensagem}</div>}
      {podeEditar ? <div className="relative">
        <div className="flex flex-col gap-2 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <input
              className={`${inputCls} pl-9`}
              placeholder="Ex.: 83048, armário aéreo ou link do produto..."
              value={q}
              onChange={(e)=>setQ(e.target.value)}
              onKeyDown={(e)=>{ if(e.key==="Enter") void buscar(); }}
            />
          </div>
          <Btn className="sm:min-w-32" onClick={()=>void buscar()} disabled={buscando || !q.trim()}>{buscando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}{buscando ? "Buscando..." : "Buscar"}</Btn>
        </div>

        {!!resultados.length && <div className="absolute z-30 mt-2 max-h-96 w-full overflow-auto rounded-2xl border border-white/10 bg-card p-2 shadow-2xl">
          {resultados.map((p, i)=><button key={p.url || `${p.sku}-${i}`} type="button" onClick={()=>adicionar(p)} className="flex w-full items-center gap-3 rounded-xl p-3 text-left transition hover:bg-white/[.05]">
            <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-white">
              {p.imagem ? <img src={p.imagem} alt={p.nome} className="h-full w-full object-contain" /> : <PackageSearch className="h-6 w-6 text-black/30" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-bold">{p.nome}</div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">{p.sku && <span className="rounded-lg border border-primary/35 bg-primary/10 px-2 py-1 font-black tracking-wide text-primary">SKU {p.sku}</span>}{p.precoSite != null && <span>Site: {brl2(p.precoSite)}</span>}</div>
              {p.descricao && <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{p.descricao}</div>}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {p.url && <a href={p.url} target="_blank" rel="noreferrer" onClick={(e)=>e.stopPropagation()} className="grid h-9 w-9 place-items-center rounded-lg border border-white/10 text-muted-foreground transition hover:border-primary/30 hover:text-primary" title="Abrir produto no site"><ExternalLink className="h-4 w-4"/></a>}
              <Plus className="h-5 w-5 text-primary" />
            </div>
          </button>)}
        </div>}
      </div> : <div className="rounded-xl border border-warn/20 bg-warn/5 p-3 text-xs text-muted-foreground">A tabela promocional é montada pela Diretoria. Você pode acompanhar os produtos, valores e andamento aqui.</div>}
    </Panel>

    <div className="space-y-3">
      {produtos.map((p, index) => {
        const aberto = produtoAberto === p.id;
        const anterior = p.precoAnterior || p.precoSite || 0;
        const desconto = anterior > 0 && p.precoVista > 0 ? ((anterior - p.precoVista) / anterior) * 100 : null;
        const totalParcelado = p.precoParcelado > 0 && p.parcelas > 0 ? p.precoParcelado * p.parcelas : 0;

        return <div key={p.id} className={`overflow-hidden rounded-2xl border transition ${p.feito ? "border-success/25 bg-success/[.025]" : "border-white/8 bg-white/[.015]"}`}>
          <div className="grid gap-3 p-3 sm:grid-cols-[76px_minmax(0,1fr)_auto] sm:items-center sm:p-4">
            <div className="grid h-[76px] w-[76px] place-items-center overflow-hidden rounded-xl bg-white">
              {p.imagem ? <img src={p.imagem} alt={p.nome} className="h-full w-full object-contain" /> : <PackageSearch className="h-7 w-7 text-black/30" />}
            </div>

            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-black text-muted-foreground">#{index + 1}</span>
                <Badge tone={p.feito ? "success" : "muted"}>{p.feito ? "Pronto" : "Pendente"}</Badge>
                {p.sku && <span className="inline-flex rounded-lg border border-primary/45 bg-primary/12 px-3 py-1 text-sm font-black tracking-[.08em] text-primary">SKU {p.sku}</span>}
              </div>
              <div className="mt-1.5 font-display font-black leading-tight">{p.nome}</div>
              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                <span className="text-muted-foreground">Anterior <b className="text-foreground">{anterior ? brl2(anterior) : "—"}</b></span>
                <span className="text-muted-foreground">À vista <b className="text-foreground">{p.precoVista ? brl2(p.precoVista) : "—"}</b></span>
                <span className="text-muted-foreground">Parcelado <b className="text-foreground">{p.precoParcelado ? `${p.parcelas}x ${brl2(p.precoParcelado)}` : "—"}</b></span>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 sm:justify-end">
              {podeEditar && <Btn variant="outline" onClick={() => setProdutoAberto(aberto ? null : p.id)}><Pencil className="h-4 w-4" />{aberto ? "Fechar" : "Editar valores"}<ChevronDown className={`h-4 w-4 transition ${aberto ? "rotate-180" : ""}`} /></Btn>}
              {!podeEditar && <Btn variant="outline" onClick={() => setProdutoAberto(aberto ? null : p.id)}>{aberto ? "Ocultar" : "Ver condição"}<ChevronDown className={`h-4 w-4 transition ${aberto ? "rotate-180" : ""}`} /></Btn>}
            </div>
          </div>

          {aberto && <div className="border-t border-white/8 p-4">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
              <div>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <div className="font-display font-black">Condição promocional</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">Preencha somente os valores que vão aparecer na oferta.</div>
                  </div>
                  {p.precoSite != null && <div className="text-xs text-muted-foreground">Preço atual no site: <b className="text-foreground">{brl2(p.precoSite)}</b></div>}
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="Preço anterior">
                    {podeEditar ? <div>
                      <ValorInput value={p.precoAnterior} onChange={(value)=>atualizar(p.id,{precoAnterior:value})} />
                      {p.precoSite != null && <button type="button" onClick={()=>atualizar(p.id,{precoAnterior:p.precoSite})} className="mt-1 text-[10px] font-bold text-primary hover:underline">Usar preço do site</button>}
                    </div> : <div className="rounded-xl border border-white/8 px-3 py-2.5 text-sm font-bold">{anterior ? brl2(anterior) : "—"}</div>}
                  </Field>

                  <Field label="Preço à vista">
                    {podeEditar ? <ValorInput value={p.precoVista} onChange={(value)=>atualizar(p.id,{precoVista:value}, true)} /> : <div className="rounded-xl border border-white/8 px-3 py-2.5 text-sm font-bold">{p.precoVista ? brl2(p.precoVista) : "—"}</div>}
                  </Field>

                  <Field label="Quantidade de parcelas">
                    {podeEditar ? <input type="number" min={1} max={36} className={`${inputCls} text-center font-bold`} value={p.parcelas || ""} onChange={(e)=>atualizar(p.id,{parcelas:Number(e.target.value)}, true)} /> : <div className="rounded-xl border border-white/8 px-3 py-2.5 text-sm font-bold">{p.parcelas}x</div>}
                  </Field>

                  <Field label="Juros">
                    {podeEditar ? <select className={inputCls} value={p.juros} onChange={(e)=>atualizar(p.id,{juros:e.target.value as ProdutoPromocional["juros"]}, true)}><option>Sem juros</option><option>Com juros</option></select> : <div className="pt-1"><Badge tone={p.juros==="Sem juros"?"success":"warn"}>{p.juros}</Badge></div>}
                  </Field>

                  {p.juros === "Com juros" && <Field label="Percentual de juros (%)">
                    {podeEditar ? <input type="number" min={0} step="0.01" className={`${inputCls} text-right font-bold`} value={p.jurosPercentual || ""} placeholder="0,00" onChange={(e)=>atualizar(p.id,{jurosPercentual:Number(e.target.value)}, true)} /> : <div className="rounded-xl border border-white/8 px-3 py-2.5 text-sm font-bold">{(p.jurosPercentual || 0).toLocaleString("pt-BR")}%</div>}
                    {podeEditar && <div className="mt-1 text-[10px] text-muted-foreground">O percentual é aplicado uma vez sobre o preço promocional e depois dividido pelas parcelas.</div>}
                  </Field>}

                  <Field label="Valor de cada parcela · automático">
                    <div className="rounded-xl border border-primary/20 bg-primary/5 px-3 py-2.5 text-right text-sm font-black text-foreground">{p.precoParcelado ? brl2(p.precoParcelado) : "—"}</div>
                  </Field>

                  <div className="rounded-xl border border-white/8 bg-white/[.02] p-3">
                    <div className="text-[10px] font-black uppercase tracking-[.12em] text-muted-foreground">Resumo da oferta</div>
                    <div className="mt-1.5 text-sm font-bold">{p.precoVista ? brl2(p.precoVista) + " à vista" : "À vista não definido"}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{p.precoParcelado ? `${p.parcelas}x de ${brl2(p.precoParcelado)} · ${p.juros.toLowerCase()}` : "Parcelamento não definido"}</div>
                    {totalParcelado > 0 && <div className="mt-1 text-[10px] text-muted-foreground">Total parcelado: {brl2(totalParcelado)}</div>}
                    {desconto != null && desconto > 0 && <div className="mt-1 text-[10px] font-bold text-success">{desconto.toFixed(1)}% abaixo do preço anterior</div>}
                  </div>
                </div>

                <div className="mt-3">
                  <Field label="Observação / condição comercial">
                    {podeEditar ? <input className={inputCls} placeholder="Ex.: válido até 31/10 · CDC / Bradescard / Carnê..." value={p.observacao} onChange={(e)=>atualizar(p.id,{observacao:e.target.value})} /> : <div className="rounded-xl border border-white/8 px-3 py-2.5 text-sm text-muted-foreground">{p.observacao || "—"}</div>}
                  </Field>
                </div>

                {podeEditar && <div className="mt-4 flex flex-wrap gap-2">
                  <Btn onClick={()=>atualizar(p.id,{feito:!p.feito})}>{p.feito ? <><CheckCircle2 className="h-4 w-4" />Produto pronto</> : <><Check className="h-4 w-4" />Marcar como pronto</>}</Btn>
                  <Btn variant="outline" onClick={()=>setProdutoAberto(null)}>Concluir edição</Btn>
                </div>}
              </div>

              <div className="space-y-3">
                <div className="overflow-hidden rounded-2xl bg-white p-3">
                  {p.imagem ? <img src={p.imagem} alt={p.nome} className="mx-auto h-44 w-full object-contain" /> : <div className="grid h-44 place-items-center"><PackageSearch className="h-9 w-9 text-black/30" /></div>}
                </div>
                {p.descricao && <div>
                  <button type="button" onClick={() => setDescricaoAberta((atual) => ({ ...atual, [p.id]: !atual[p.id] }))} className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline">
                    {descricaoAberta[p.id] ? "Ocultar descrição" : "Ver descrição"}
                    <ChevronDown className={`h-3 w-3 transition ${descricaoAberta[p.id] ? "rotate-180" : ""}`} />
                  </button>
                  {descricaoAberta[p.id] && <p className="mt-2 rounded-xl border border-white/8 bg-white/[.02] p-3 text-xs leading-relaxed text-muted-foreground">{p.descricao}</p>}
                </div>}
                {p.url && <a href={p.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs font-bold text-primary">Abrir produto no site <ExternalLink className="h-3 w-3" /></a>}
                {podeEditar && <Btn variant="danger" className="w-full" onClick={()=>remover(p.id)}><Trash2 className="h-4 w-4" />Remover produto</Btn>}
              </div>
            </div>
          </div>}
        </div>;
      })}

      {!produtos.length && <div className="grid min-h-48 place-items-center rounded-2xl border border-dashed border-white/10 p-6 text-center">
        <div><PackageSearch className="mx-auto h-9 w-9 text-muted-foreground/45" /><div className="mt-2 font-semibold">Nenhum produto promocional ainda</div><p className="mt-1 text-sm text-muted-foreground">{podeEditar ? "Busque no site das Lojas IM e monte a tabela desta campanha sem precisar de planilha." : "Aguardando a Diretoria montar a tabela de produtos e descontos."}</p></div>
      </div>}
    </div>
  </div>;
}

function ProdutosGrowth({ campanha, podeEditar, onChange }: { campanha: Campanha; podeEditar: boolean; onChange: (c: Campanha) => void }) {
  const produtos = campanha.produtosPromocionais || [];
  const selecionados = produtos.filter((p) => p.growthVideo);
  const [videoForm, setVideoForm] = useState({ titulo: "", url: "", observacao: "" });
  const videos = campanha.videos || [];

  const adicionarVideo = () => {
    if (!videoForm.url.trim()) return;
    onChange({
      ...campanha,
      videos: [...videos, {
        id: uid(),
        titulo: videoForm.titulo.trim() || `Vídeo ${videos.length + 1}`,
        url: videoForm.url.trim(),
        observacao: videoForm.observacao.trim(),
        criadoEm: new Date().toISOString(),
      }],
    });
    setVideoForm({ titulo: "", url: "", observacao: "" });
    toast.success("Link do vídeo adicionado à campanha.");
  };

  const marcar = (id: string, growthVideo: boolean) => {
    onChange({
      ...campanha,
      produtosPromocionais: produtos.map((p) => p.id === id ? { ...p, growthVideo } : p),
    });
  };

  return <div className="space-y-4">
    <div className="grid gap-3 sm:grid-cols-2">
      <Stat label="Produtos da campanha" value={String(produtos.length)} hint="disponíveis para seleção" />
      <Stat accent label="Selecionados para Growth" value={String(selecionados.length)} hint="para roteiro / gravação" />
    </div>

    <Panel title="Produtos para vídeo de Growth" action={<Film className="h-4 w-4 text-primary" />}>
      <p className="mb-4 text-sm text-muted-foreground">Marque os produtos que devem entrar nos vídeos de Growth. A seleção fica vinculada a esta campanha e mantém SKU, foto e condição comercial juntos para facilitar roteiro e gravação.</p>

      {!!produtos.length && podeEditar && <div className="mb-4 flex flex-wrap gap-2">
        <Btn variant="outline" onClick={() => onChange({ ...campanha, produtosPromocionais: produtos.map((p) => ({ ...p, growthVideo: true })) })}>Selecionar todos</Btn>
        <Btn variant="outline" onClick={() => onChange({ ...campanha, produtosPromocionais: produtos.map((p) => ({ ...p, growthVideo: false })) })}>Limpar seleção</Btn>
      </div>}

      <div className="grid gap-3 md:grid-cols-2">
        {produtos.map((p) => <label key={p.id} className={`flex items-center gap-3 rounded-2xl border p-3 transition ${p.growthVideo ? "border-primary/45 bg-primary/[.07]" : "border-white/8 bg-white/[.015]"} ${podeEditar ? "cursor-pointer hover:border-primary/35" : ""}`}>
          <input type="checkbox" disabled={!podeEditar} checked={!!p.growthVideo} onChange={(e) => marcar(p.id, e.target.checked)} className="h-5 w-5 shrink-0 accent-[var(--primary)]" />
          <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-white">
            {p.imagem ? <img src={p.imagem} alt={p.nome} className="h-full w-full object-contain" /> : <PackageSearch className="h-6 w-6 text-black/30" />}
          </div>
          <div className="min-w-0 flex-1">
            {p.sku && <div className="inline-flex rounded-lg border border-primary/45 bg-primary/12 px-2.5 py-1 text-sm font-black tracking-[.08em] text-primary">SKU {p.sku}</div>}
            <div className="mt-1.5 line-clamp-2 font-bold leading-tight">{p.nome}</div>
            <div className="mt-1 text-xs text-muted-foreground">{p.precoVista ? `${brl(p.precoVista)} à vista` : "Preço promocional ainda não definido"}</div>
          </div>
        </label>)}

        {!produtos.length && <div className="md:col-span-2 rounded-2xl border border-dashed border-white/10 p-8 text-center">
          <Film className="mx-auto h-9 w-9 text-muted-foreground/45" />
          <div className="mt-2 font-bold">Nenhum produto disponível</div>
          <p className="mt-1 text-sm text-muted-foreground">Adicione os produtos primeiro na aba “Produtos” e depois volte aqui para selecionar os que entram no vídeo de Growth.</p>
        </div>}
      </div>
    </Panel>

    <Panel title="Links dos vídeos da campanha" action={<Video className="h-4 w-4 text-primary" />}>
      <p className="mb-3 text-sm text-muted-foreground">Cole aqui os links de vídeos prontos, rascunhos, Reels, Drive, YouTube ou referências. Eles ficam vinculados à campanha e aos produtos selecionados para Growth.</p>
      {podeEditar && <div className="grid gap-2 lg:grid-cols-[1fr_1.5fr]">
        <Field label="Título do vídeo"><input className={inputCls} placeholder="Ex.: Growth · Sofás" value={videoForm.titulo} onChange={(e)=>setVideoForm({...videoForm,titulo:e.target.value})}/></Field>
        <Field label="Link"><input className={inputCls} placeholder="https://..." value={videoForm.url} onChange={(e)=>setVideoForm({...videoForm,url:e.target.value})}/></Field>
        <div className="lg:col-span-2"><Field label="Observação"><input className={inputCls} placeholder="Ex.: aprovado / aguardando edição / versão para Reels" value={videoForm.observacao} onChange={(e)=>setVideoForm({...videoForm,observacao:e.target.value})}/></Field></div>
        <div className="lg:col-span-2"><Btn onClick={adicionarVideo} disabled={!videoForm.url.trim()}><Plus className="h-4 w-4"/>Adicionar link do vídeo</Btn></div>
      </div>}

      <div className="mt-4 space-y-2">
        {videos.map((v) => <div key={v.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-white/8 bg-white/[.02] p-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"><Film className="h-5 w-5"/></div>
          <div className="min-w-0 flex-1">
            <div className="font-bold">{v.titulo}</div>
            {v.observacao && <div className="mt-0.5 text-xs text-muted-foreground">{v.observacao}</div>}
            <a href={v.url} target="_blank" rel="noreferrer" className="mt-1 inline-flex max-w-full items-center gap-1 truncate text-xs font-bold text-primary hover:underline">{v.url}<ExternalLink className="h-3 w-3 shrink-0"/></a>
          </div>
          {podeEditar && <button type="button" aria-label="Remover vídeo" onClick={()=>onChange({...campanha,videos:videos.filter((x)=>x.id!==v.id)})} className="grid h-9 w-9 place-items-center rounded-xl border border-white/8 text-muted-foreground hover:border-primary/30 hover:text-primary"><Trash2 className="h-4 w-4"/></button>}
        </div>)}
        {!videos.length && <div className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-muted-foreground">Nenhum link de vídeo adicionado ainda.</div>}
      </div>
    </Panel>
  </div>;
}

function PlanosFiliaisEditor({
  filiais,
  filialIds,
  planos,
  onChange,
  verbaCampanha,
  compact = false,
}: {
  filiais: Filial[];
  filialIds: string[];
  planos: PlanoCampanhaFilial[];
  onChange: (planos: PlanoCampanhaFilial[]) => void;
  verbaCampanha: number;
  compact?: boolean;
}) {
  const atualizarPlano = (filialId: string, patch: Partial<PlanoCampanhaFilial>) => {
    const atual = planos.find((p) => p.filialId === filialId) || { filialId, verba: 0, acoes: [] };
    const novo = { ...atual, ...patch };
    onChange(planos.some((p) => p.filialId === filialId) ? planos.map((p) => p.filialId === filialId ? novo : p) : [...planos, novo]);
  };

  const totalPlanejado = planos.filter((p) => filialIds.includes(p.filialId)).reduce((a, p) => a + p.verba, 0);

  return <Panel title="Verba e ações permitidas por filial" action={<WalletCards className="h-4 w-4 text-primary" />}>
    <div className="mb-3 rounded-xl border border-white/7 bg-white/[.02] p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-muted-foreground">Total de verba distribuída entre as filiais</span>
        <b className={totalPlanejado > verbaCampanha && verbaCampanha > 0 ? "text-primary" : ""}>{brl(totalPlanejado)} de {brl(verbaCampanha)}</b>
      </div>
      {verbaCampanha > 0 && totalPlanejado > verbaCampanha && <div className="mt-1 text-xs text-primary">A soma das verbas das filiais ultrapassa a verba total da campanha em {brl(totalPlanejado - verbaCampanha)}.</div>}
      <div className="mt-1 text-xs text-muted-foreground">Esses valores são limites planejados/autorizados. O gasto real continua sendo lançado no Centro de Custos.</div>
    </div>

    <div className={compact ? "max-h-[520px] space-y-3 overflow-y-auto pr-1" : "space-y-3"}>
      {filialIds.map((filialId) => {
        const filial = filiais.find((x) => x.id === filialId);
        if (!filial) return null;
        const plano = planos.find((p) => p.filialId === filialId) || { filialId, verba: 0, acoes: [] };
        const usado = plano.acoes.reduce((a, x) => a + x.valor, 0);
        const saldo = plano.verba - usado;
        return <div key={filialId} className="rounded-2xl border border-white/8 bg-white/[.015] p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <div className="text-xs font-black uppercase tracking-[.12em] text-primary">Filial {filial.codigo}</div>
              <div className="font-display text-lg font-black">{filial.nome}</div>
            </div>
            <div className="min-w-40">
              <Field label="Valor para investimento">
                <input type="number" min={0} step="0.01" className={inputCls} value={plano.verba} onChange={(e) => atualizarPlano(filialId, { verba: Number(e.target.value) })} />
              </Field>
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between gap-2">
              <div className="text-xs font-black uppercase tracking-[.12em] text-muted-foreground">Utilizar em</div>
              <div className={`text-xs font-bold ${saldo < 0 ? "text-primary" : "text-muted-foreground"}`}>{saldo < 0 ? `Excedeu ${brl(Math.abs(saldo))}` : `Saldo ${brl(saldo)}`}</div>
            </div>

            <div className="space-y-2">
              {plano.acoes.map((acao) => <div key={acao.id} className="grid gap-2 rounded-xl border border-white/7 p-2 sm:grid-cols-[1fr_150px_auto]">
                <input className={inputCls} placeholder="Ex.: Carro de som" value={acao.nome} onChange={(e) => atualizarPlano(filialId, { acoes: plano.acoes.map((x) => x.id === acao.id ? { ...x, nome: e.target.value } : x) })} />
                <input type="number" min={0} step="0.01" className={inputCls} placeholder="Valor" value={acao.valor} onChange={(e) => atualizarPlano(filialId, { acoes: plano.acoes.map((x) => x.id === acao.id ? { ...x, valor: Number(e.target.value) } : x) })} />
                <button type="button" aria-label="Remover ação" onClick={() => atualizarPlano(filialId, { acoes: plano.acoes.filter((x) => x.id !== acao.id) })} className="grid h-10 w-10 place-items-center rounded-xl border border-white/8 text-muted-foreground transition hover:border-primary/30 hover:text-primary"><Trash2 className="h-4 w-4" /></button>
              </div>)}
              {!plano.acoes.length && <div className="rounded-xl border border-dashed border-white/10 p-4 text-center text-xs text-muted-foreground">Nenhuma ação definida para esta filial.</div>}
            </div>

            <Btn variant="outline" className="mt-2" onClick={() => atualizarPlano(filialId, { acoes: [...plano.acoes, { id: uid(), nome: "", valor: 0 }] })}><Plus className="h-4 w-4" />Adicionar ação</Btn>
          </div>

          <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
            <div className="rounded-xl border border-white/7 p-2"><div className="text-muted-foreground">Autorizado</div><b>{brl(plano.verba)}</b></div>
            <div className="rounded-xl border border-white/7 p-2"><div className="text-muted-foreground">Distribuído</div><b>{brl(usado)}</b></div>
            <div className={`rounded-xl border p-2 ${saldo < 0 ? "border-primary/30 bg-primary/5" : "border-white/7"}`}><div className="text-muted-foreground">Saldo</div><b className={saldo < 0 ? "text-primary" : ""}>{brl(saldo)}</b></div>
          </div>
        </div>;
      })}
    </div>
  </Panel>;
}

function Apoiadores({ campanha, onChange }: { campanha: Campanha; onChange: (c: Campanha) => void }) {
  const [form, setForm] = useState({ nome: "", logo: "", site: "", cota: "Apoiador", valor: 0 });

  const lerLogo = (file?: File) => {
    if (!file) return;
    const r = new FileReader();
    r.onload = () => setForm((x) => ({ ...x, logo: String(r.result || "") }));
    r.readAsDataURL(file);
  };

  const add = () => {
    if (!form.nome.trim()) return;
    const novo: Apoiador = { id: uid(), nome: form.nome.trim(), logo: form.logo, site: form.site.trim(), cota: form.cota.trim() || "Apoiador", valor: form.valor };
    onChange({ ...campanha, apoiadores: [...campanha.apoiadores, novo] });
    setForm({ nome: "", logo: "", site: "", cota: "Apoiador", valor: 0 });
  };

  return <Panel title="Apoiadores / Patrocinadores" action={<Handshake className="h-4 w-4 text-primary" />}>
    <div className="grid gap-4 lg:grid-cols-[1fr_1.3fr]">
      <div className="space-y-3 rounded-lg border p-3">
        <Field label="Nome da marca"><input className={inputCls} value={form.nome} onChange={(e)=>setForm({...form,nome:e.target.value})} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Cota / tipo"><input className={inputCls} placeholder="Ex.: Ouro, Apoio" value={form.cota} onChange={(e)=>setForm({...form,cota:e.target.value})} /></Field>
          <Field label="Valor do apoio"><input type="number" className={inputCls} value={form.valor} onChange={(e)=>setForm({...form,valor:Number(e.target.value)})} /></Field>
        </div>
        <Field label="Site / link"><input className={inputCls} placeholder="https://..." value={form.site} onChange={(e)=>setForm({...form,site:e.target.value})} /></Field>
        <Field label="Logo do apoiador">
          <label className="flex cursor-pointer items-center justify-center gap-2 rounded-md border border-dashed p-3 text-sm hover:border-primary">
            <ImagePlus className="h-4 w-4" />{form.logo ? "Logo carregada · trocar arquivo" : "Enviar PNG/JPG/SVG"}
            <input className="hidden" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(e)=>lerLogo(e.target.files?.[0])} />
          </label>
        </Field>
        {form.logo && <div className="grid place-items-center rounded-md bg-muted p-3"><img src={form.logo} alt="Prévia" className="h-16 max-w-40 object-contain" /></div>}
        <Btn className="w-full" disabled={!form.nome.trim()} onClick={add}><Plus className="h-4 w-4" />Adicionar apoiador</Btn>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between text-sm"><b>Apoiadores vinculados</b><span className="text-muted-foreground">{brl(campanha.apoiadores.reduce((a,p)=>a+p.valor,0))} captados</span></div>
        <div className="space-y-2">
          {campanha.apoiadores.map((a) => <div key={a.id} className="flex items-center gap-3 rounded-lg border p-3">
            <div className="grid h-14 w-20 place-items-center rounded bg-white p-1">{a.logo ? <img src={a.logo} alt={a.nome} className="max-h-12 max-w-full object-contain" /> : <span className="text-xs font-bold text-black">{a.nome}</span>}</div>
            <div className="min-w-0 flex-1">
              <div className="font-semibold">{a.nome}</div>
              <div className="text-xs text-muted-foreground">{a.cota} · {brl(a.valor)}</div>
              {a.site && <a href={a.site} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-primary">Abrir site <ExternalLink className="h-3 w-3" /></a>}
            </div>
            <button aria-label="Remover apoiador" onClick={() => onChange({ ...campanha, apoiadores: campanha.apoiadores.filter((x)=>x.id!==a.id) })} className="rounded p-2 text-muted-foreground hover:bg-muted hover:text-primary"><Trash2 className="h-4 w-4" /></button>
          </div>)}
          {!campanha.apoiadores.length && <div className="grid min-h-44 place-items-center rounded-lg border border-dashed text-center text-sm text-muted-foreground">Quando houver patrocinadores, cadastre a marca e envie a logo aqui. Ela aparecerá vinculada à identidade da campanha.</div>}
        </div>
      </div>
    </div>
  </Panel>;
}