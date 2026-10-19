import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useApp } from "@/lib/store";
import { Avatar, PageHeader, Panel, Stat, Badge, pageHead } from "@/components/kit";

export const Route = createFileRoute("/funcionarios")({
  head: pageHead("Funcionários", "Equipe de marketing, funções e desempenho."),
  component: Page,
});

const normaliza = (v:string) => v.normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toUpperCase();

function Page() {
  const { s } = useApp();
  const [sel, setSel] = useState(s.funcionarios[0]?.id ?? "");
  const func = s.funcionarios.find((x) => x.id === sel) ?? s.funcionarios[0];
  const usuarioDo = (id:string,nome:string) => s.usuarios.find((u)=>u.vinculoId===id) || s.usuarios.find((u)=>normaliza(u.nome)===normaliza(nome));

  const resumo = useMemo(() => s.funcionarios.map((f) => {
    const total = f.atividades.length;
    const concluidas = f.atividades.filter((a) => {
      const p = a.sourcePendenciaId ? s.pendencias.find((x) => x.id === a.sourcePendenciaId) : undefined;
      return (p?.status || a.status || (a.feito ? "Finalizado" : "A fazer")) === "Finalizado";
    }).length;
    return { ...f, total, concluidas, pendentes: total - concluidas, taxa: total ? Math.round((concluidas / total) * 100) : 0 };
  }), [s.funcionarios, s.pendencias]);

  if (!func) return <PageHeader title="Funcionários" sub="Nenhum funcionário cadastrado." />;
  const atual = resumo.find((x) => x.id === func.id)!;
  const userAtual = usuarioDo(func.id,func.nome);

  return (
    <>
      <PageHeader title="Funcionários" sub="Perfis da equipe, funções, competências e visão geral de desempenho." />

      <div className="grid gap-3 lg:grid-cols-[1fr_2fr]">
        <Panel title="Equipe de Marketing">
          <div className="space-y-1">
            {s.funcionarios.map((f) => {
              const u=usuarioDo(f.id,f.nome);
              return <button key={f.id} onClick={() => setSel(f.id)}
                className={`flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition ${sel === f.id ? "bg-primary text-primary-foreground shadow-brand" : "hover:bg-muted"}`}>
                <Avatar src={u?.foto} name={f.nome} size="sm" className={sel===f.id?"ring-white/25":""}/>
                <div className="min-w-0"><div className="truncate font-black">{f.nome}</div><div className={`truncate text-xs ${sel === f.id ? "opacity-80" : "text-muted-foreground"}`}>{f.cargo}</div></div>
              </button>;
            })}
          </div>
        </Panel>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Stat label="Atividades" value={String(atual.total)} hint={func.cargo} />
            <Stat label="Concluídas" value={String(atual.concluidas)} hint="entregas finalizadas" />
            <Stat label="Pendentes" value={String(atual.pendentes)} hint="em aberto" />
            <Stat accent label="Taxa de conclusão" value={`${atual.taxa}%`} hint="desempenho operacional" />
          </div>

          <Panel title="Perfil profissional">
            <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
              <Avatar src={userAtual?.foto} name={func.nome} size="xl"/>
              <div className="grid flex-1 gap-4 md:grid-cols-2">
                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Função</div>
                  <div className="font-display text-xl font-black">{func.nome}</div>
                  <div className="text-sm font-semibold text-primary">{func.cargo}</div>
                </div>
                <div>
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Responsabilidade no fluxo</div>
                  <p className="text-sm text-muted-foreground">
                    {func.id === "e-jordan" ? "Gestão da equipe, planejamento, acompanhamento de campanhas, metas, relatórios e aprovações." :
                     func.id === "e-hellen" ? "Apoio operacional ao marketing, organização de materiais, fornecedores, rotinas e suporte às ações." :
                     func.id === "e-bruna" ? "Criação visual, identidade de campanhas, peças para Feed/Stories/Banner e apoio criativo." :
                     "Análise de marketing, mídia, métricas digitais, vídeos, impulsionamentos e acompanhamento de performance."}
                  </p>
                </div>
              </div>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <div><div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Hard Skills</div><div className="flex flex-wrap gap-2">{func.hardSkills.map((x) => <span key={x} className="rounded-full bg-muted px-3 py-1 text-xs font-semibold">{x}</span>)}</div></div>
              <div><div className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">Soft Skills</div><div className="flex flex-wrap gap-2">{func.softSkills.map((x) => <span key={x} className="rounded-full border px-3 py-1 text-xs font-semibold">{x}</span>)}</div></div>
            </div>
          </Panel>
        </div>
      </div>

      <Panel title="Relatório da equipe" className="mt-4">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead><tr className="border-b text-left text-xs uppercase text-muted-foreground"><th className="pb-2">Funcionário</th><th>Função</th><th>Total</th><th>Concluídas</th><th>Pendentes</th><th>Taxa</th><th>Status</th></tr></thead>
            <tbody>{resumo.map((f) => {
              const u=usuarioDo(f.id,f.nome);
              return <tr key={f.id} className="border-b last:border-0">
                <td className="py-2"><div className="flex items-center gap-2.5"><Avatar src={u?.foto} name={f.nome} size="sm"/><b>{f.nome}</b></div></td>
                <td>{f.cargo}</td><td>{f.total}</td><td>{f.concluidas}</td><td>{f.pendentes}</td><td>{f.taxa}%</td>
                <td><Badge tone={f.taxa >= 80 ? "success" : f.taxa >= 50 ? "warn" : "muted"}>{f.total === 0 ? "Sem lançamentos" : f.taxa >= 80 ? "Ótimo" : f.taxa >= 50 ? "Acompanhar" : "Atenção"}</Badge></td>
              </tr>;
            })}</tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
