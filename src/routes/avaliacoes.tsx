import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Save, UserRoundCheck } from "lucide-react";
import {
  Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ResponsiveContainer, Tooltip, Bar, BarChart, CartesianGrid, XAxis, YAxis,
} from "recharts";
import {
  useApp, uid, CRITERIOS_GERAIS, CRITERIOS_FUNCAO, mediaNotas,
  type AvaliacaoMensal, type NotaAvaliacao,
} from "@/lib/store";
import { Avatar, PageHeader, Panel, Stat, Btn, Modal, Field, inputCls, Badge, pageHead } from "@/components/kit";

export const Route = createFileRoute("/avaliacoes")({
  head: pageHead("Avaliações da Equipe", "Avaliação mensal individual e consolidada da equipe de marketing."),
  component: Page,
});

const notasIniciais = (criterios: string[]): NotaAvaliacao[] => criterios.map((criterio) => ({ criterio, nota: 3 }));

function Page() {
  const { s, set } = useApp();
  const mesAtual = new Date().toISOString().slice(0, 7);
  const [mes, setMes] = useState(mesAtual);
  const [funcId, setFuncId] = useState(s.funcionarios[0]?.id ?? "");
  const [open, setOpen] = useState(false);

  const avaliacoesMes = s.avaliacoes.filter((a) => a.mes === mes);
  const selecionada = avaliacoesMes.find((a) => a.funcionarioId === funcId);
  const func = s.funcionarios.find((f) => f.id === funcId) ?? s.funcionarios[0];
  const usuarioDoFuncionario = (id:string,nome:string) => {
    const n=(v:string)=>v.normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toUpperCase();
    return s.usuarios.find((u)=>u.vinculoId===id) || s.usuarios.find((u)=>n(u.nome)===n(nome));
  };
  const userFunc = func ? usuarioDoFuncionario(func.id,func.nome) : undefined;

  const mediaEquipePorCriterio = useMemo(() => CRITERIOS_GERAIS.map((criterio) => {
    const vals = avaliacoesMes
      .map((a) => a.gerais.find((n) => n.criterio === criterio)?.nota)
      .filter((x): x is number => typeof x === "number");
    return { criterio, equipe: vals.length ? vals.reduce((a,b) => a+b,0) / vals.length : 0 };
  }), [avaliacoesMes]);

  const radar = CRITERIOS_GERAIS.map((criterio) => ({
    criterio,
    colaborador: selecionada?.gerais.find((n) => n.criterio === criterio)?.nota ?? 0,
    equipe: mediaEquipePorCriterio.find((n) => n.criterio === criterio)?.equipe ?? 0,
  }));

  const ranking = s.funcionarios.map((f) => {
    const a = avaliacoesMes.find((x) => x.funcionarioId === f.id);
    const media = a ? (mediaNotas(a.gerais) + mediaNotas(a.funcao)) / 2 : 0;
    return { nome: f.nome, cargo: f.cargo, media };
  }).sort((a,b) => b.media - a.media);

  const mediaEquipe = ranking.filter((r) => r.media > 0).length
    ? ranking.filter((r) => r.media > 0).reduce((a,r) => a+r.media,0) / ranking.filter((r) => r.media > 0).length
    : 0;

  return (
    <>
      <PageHeader
        title="Avaliações Mensais"
        sub="Jordan registra as notas da reunião mensal e o sistema consolida o desempenho individual e da equipe"
        action={(s.perfil === "Master" || s.perfil === "Gerente de Marketing") ? <Btn onClick={() => setOpen(true)}><Plus className="h-4 w-4" />Nova avaliação</Btn> : undefined}
      />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Field label="Mês da reunião"><input type="month" className={inputCls} value={mes} onChange={(e) => setMes(e.target.value)} /></Field>
        <Field label="Funcionário"><select className={inputCls} value={funcId} onChange={(e) => setFuncId(e.target.value)}>{s.funcionarios.map((f) => <option key={f.id} value={f.id}>{f.nome} — {f.cargo}</option>)}</select></Field>
      </div>

      <Panel className="mb-4" title="Equipe">
        <div className="flex flex-wrap gap-2">
          {s.funcionarios.map((f)=>{
            const u=usuarioDoFuncionario(f.id,f.nome);
            const ativa=f.id===funcId;
            return <button type="button" key={f.id} onClick={()=>setFuncId(f.id)}
              className={`flex min-w-[220px] items-center gap-3 rounded-xl border px-3 py-3 text-left transition ${ativa?"border-primary/30 bg-primary/10":"border-border bg-secondary/25 hover:border-primary/25"}`}>
              <Avatar src={u?.foto} name={f.nome} size="lg"/>
              <div className="min-w-0"><div className="truncate text-sm font-black">{f.nome}</div><div className="truncate text-xs text-muted-foreground">{f.cargo}</div></div>
            </button>;
          })}
        </div>
      </Panel>

      {func && <div className="mb-4 flex flex-col items-start gap-5 rounded-2xl border border-border bg-secondary/20 p-5 sm:flex-row sm:items-center sm:p-6">
        <Avatar src={userFunc?.foto} name={func.nome} size="xl" className="ring-2 ring-primary/25"/>
        <div className="min-w-0 flex-1">
          <div className="mb-1 text-[11px] font-black uppercase tracking-[.16em] text-muted-foreground">Ficha do colaborador</div>
          <div className="font-display text-2xl font-black tracking-tight sm:text-3xl">{func.nome}</div>
          <div className="mt-1 text-sm font-medium text-muted-foreground">{func.cargo}</div>
          <div className="mt-3 inline-flex rounded-full border border-border px-3 py-1 text-xs font-bold text-muted-foreground">{selecionada ? "Avaliação registrada" : "Avaliação pendente"}</div>
        </div>
      </div>



      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Média da equipe" value={mediaEquipe ? mediaEquipe.toFixed(1) : "—"} hint="escala de 1 a 5" />
        <Stat label="Avaliados no mês" value={String(avaliacoesMes.length)} hint={`de ${s.funcionarios.length} funcionários`} />
        <Stat label="Média individual" value={selecionada ? (((mediaNotas(selecionada.gerais)+mediaNotas(selecionada.funcao))/2).toFixed(1)) : "—"} hint={func?.nome ?? ""} />
        <Stat accent label="Status" value={selecionada ? "Avaliado" : "Pendente"} hint={selecionada ? "reunião registrada" : "aguardando avaliação"} />
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title={`Radar geral · ${func?.nome ?? ""}`}>
          <div className="h-[360px]">
            <ResponsiveContainer>
              <RadarChart data={radar} outerRadius="75%">
                <PolarGrid />
                <PolarAngleAxis dataKey="criterio" fontSize={11} />
                <PolarRadiusAxis domain={[0,5]} tickCount={6} fontSize={10} />
                <Radar name={func?.nome ?? "Colaborador"} dataKey="colaborador" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.18} strokeWidth={2} />
                <Radar name="Média da equipe" dataKey="equipe" stroke="var(--foreground)" fill="var(--foreground)" fillOpacity={0.05} strokeWidth={2} />
                <Tooltip />
              </RadarChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex gap-4 text-xs text-muted-foreground"><span><b className="text-primary">●</b> Colaborador</span><span><b className="text-foreground">●</b> Média da equipe</span></div>
        </Panel>

        <Panel title="Resultado por funcionário">
          <div className="h-[360px]">
            <ResponsiveContainer>
              <BarChart data={ranking} layout="vertical" margin={{ left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis type="number" domain={[0,5]} />
                <YAxis type="category" dataKey="nome" width={110} fontSize={11} />
                <Tooltip formatter={(v: number) => v.toFixed(1)} />
                <Bar dataKey="media" fill="var(--primary)" radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Panel title="Critérios da função">
          {selecionada ? <div className="space-y-3">
            {selecionada.funcao.map((n) => <div key={n.criterio} className="flex items-center justify-between gap-3 border-b pb-2 text-sm last:border-0"><span>{n.criterio}</span><Badge tone={n.nota >= 4 ? "success" : n.nota >= 3 ? "warn" : "primary"}>{n.nota.toFixed(1)}</Badge></div>)}
          </div> : <Empty text="Ainda não há avaliação desse funcionário neste mês." />}
        </Panel>

        <Panel title="Resumo da reunião">
          {selecionada ? <div className="space-y-3 text-sm">
            <div><b>Pontos fortes</b><p className="text-muted-foreground">{selecionada.pontosFortes || "—"}</p></div>
            <div><b>Pontos de melhoria</b><p className="text-muted-foreground">{selecionada.pontosMelhoria || "—"}</p></div>
            <div><b>Plano de ação</b><p className="text-muted-foreground">{selecionada.planoAcao || "—"}</p></div>
            <div><b>Comentário geral</b><p className="text-muted-foreground">{selecionada.comentario || "—"}</p></div>
            <div className="text-xs text-muted-foreground">Avaliado por {selecionada.avaliador}</div>
          </div> : <Empty text="O resumo aparecerá depois que Jordan ou o Master registrar a reunião." />}
        </Panel>
      </div>

      <EvaluationModal open={open} onClose={() => setOpen(false)} mesPadrao={mes} funcionarioPadrao={funcId} />
    </>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="grid min-h-40 place-items-center text-center text-sm text-muted-foreground"><div><UserRoundCheck className="mx-auto mb-2 h-8 w-8 opacity-40" />{text}</div></div>;
}

function EvaluationModal({ open, onClose, mesPadrao, funcionarioPadrao }: { open: boolean; onClose: () => void; mesPadrao: string; funcionarioPadrao: string }) {
  const { s, set } = useApp();
  const [funcionarioId, setFuncionarioId] = useState(funcionarioPadrao || s.funcionarios[0]?.id || "");
  const [mes, setMes] = useState(mesPadrao);
  const criteriosFuncao = CRITERIOS_FUNCAO[funcionarioId] || [];
  const [gerais, setGerais] = useState<NotaAvaliacao[]>(notasIniciais(CRITERIOS_GERAIS));
  const [funcao, setFuncao] = useState<NotaAvaliacao[]>(notasIniciais(criteriosFuncao));
  const [comentario, setComentario] = useState("");
  const [pontosFortes, setPontosFortes] = useState("");
  const [pontosMelhoria, setPontosMelhoria] = useState("");
  const [planoAcao, setPlanoAcao] = useState("");

  const trocarFuncionario = (id: string) => {
    setFuncionarioId(id);
    setFuncao(notasIniciais(CRITERIOS_FUNCAO[id] || []));
  };

  const setNota = (tipo: "gerais" | "funcao", criterio: string, nota: number) => {
    const setter = tipo === "gerais" ? setGerais : setFuncao;
    setter((arr) => arr.map((n) => n.criterio === criterio ? { ...n, nota } : n));
  };

  const salvar = () => {
    const avaliacao: AvaliacaoMensal = {
      id: uid(), funcionarioId, mes, avaliador: "Jordan", gerais, funcao,
      comentario, pontosFortes, pontosMelhoria, planoAcao,
      criadoEm: new Date().toISOString(),
    };
    set((st) => ({
      ...st,
      avaliacoes: [...st.avaliacoes.filter((a) => !(a.funcionarioId === funcionarioId && a.mes === mes)), avaliacao],
    }));
    onClose();
  };

  return <Modal open={open} onClose={onClose} title="Avaliação mensal" wide>
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Funcionário"><select className={inputCls} value={funcionarioId} onChange={(e) => trocarFuncionario(e.target.value)}>{s.funcionarios.map((f) => <option key={f.id} value={f.id}>{f.nome} — {f.cargo}</option>)}</select></Field>
        <Field label="Mês da reunião"><input type="month" className={inputCls} value={mes} onChange={(e) => setMes(e.target.value)} /></Field>
      </div>

      <Scores title="Competências gerais" notas={gerais} onChange={(c,n) => setNota("gerais",c,n)} />
      <Scores title="Critérios da função" notas={funcao} onChange={(c,n) => setNota("funcao",c,n)} />

      <div className="grid gap-3 md:grid-cols-2">
        <Field label="Pontos fortes"><textarea rows={3} className={inputCls} value={pontosFortes} onChange={(e) => setPontosFortes(e.target.value)} /></Field>
        <Field label="Pontos de melhoria"><textarea rows={3} className={inputCls} value={pontosMelhoria} onChange={(e) => setPontosMelhoria(e.target.value)} /></Field>
      </div>
      <Field label="Plano de ação para o próximo mês"><textarea rows={3} className={inputCls} value={planoAcao} onChange={(e) => setPlanoAcao(e.target.value)} /></Field>
      <Field label="Comentário geral da reunião"><textarea rows={3} className={inputCls} value={comentario} onChange={(e) => setComentario(e.target.value)} /></Field>

      <Btn className="w-full" onClick={salvar}><Save className="h-4 w-4" />Salvar avaliação e atualizar gráficos</Btn>
    </div>
  </Modal>;
}

function Scores({ title, notas, onChange }: { title: string; notas: NotaAvaliacao[]; onChange: (criterio: string, nota: number) => void }) {
  return <div>
    <div className="mb-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">{title} · notas de 1 a 5</div>
    <div className="grid gap-2 md:grid-cols-2">
      {notas.map((n) => <div key={n.criterio} className="rounded-md border p-3">
        <div className="mb-2 flex items-center justify-between text-sm"><span className="font-medium">{n.criterio}</span><b className="text-primary">{n.nota}</b></div>
        <input aria-label={n.criterio} type="range" min="1" max="5" step="1" value={n.nota} onChange={(e) => onChange(n.criterio, Number(e.target.value))} className="w-full accent-[var(--primary)]" />
      </div>)}
    </div>
  </div>;
}