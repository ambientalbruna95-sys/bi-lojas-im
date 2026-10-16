import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Pencil, Plus, ShieldCheck, UserRound, UsersRound } from "lucide-react";
import { useApp, PERFIS, uid, type Perfil, type Usuario } from "@/lib/store";
import { PageHeader, Panel, Btn, Modal, Field, inputCls, Badge, pageHead } from "@/components/kit";

export const Route = createFileRoute("/usuarios")({ head: pageHead("Usuários", "Perfis e permissões do BI Lojas IM."), component: Page });

function Page() {
  const { s, set } = useApp();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [f, setF] = useState({ nome: "", email: "", perfil: "Funcionário" as Perfil, observacao: "" });
  const [editF, setEditF] = useState({ nome: "", email: "", perfil: "Funcionário" as Perfil, observacao: "", senha: "" });

  const perfis = PERFIS.map((p) => ({
    perfil: p,
    total: s.usuarios.filter((u) => u.perfil === p).length,
  }));

  const salvar = () => {
    if (!f.nome.trim()) return;
    const u: Usuario = { id: uid(), nome: f.nome.trim(), email: f.email.trim(), perfil: f.perfil, ativo: true, observacao: f.observacao.trim(), senha: "123456" };
    set((st) => ({ ...st, usuarios: [...st.usuarios, u] }));
    setOpen(false);
    setF({ nome: "", email: "", perfil: "Funcionário", observacao: "" });
  };

  const abrirEdicao = (u: Usuario) => {
    setEditId(u.id);
    setEditF({
      nome: u.nome,
      email: u.email || "",
      perfil: u.perfil,
      observacao: u.observacao || "",
      senha: u.senha || "123456",
    });
  };

  const normaliza = (v:string) => v.normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toUpperCase();

  const salvarEdicao = () => {
    if (!editId || !editF.nome.trim()) return;
    set((st) => {
      const atual = st.usuarios.find((u) => u.id === editId);
      if (!atual) return st;
      const novoNome = editF.nome.trim();
      const antigoNome = atual.nome;
      const vinculoId = atual.vinculoId;
      const funcionario = vinculoId ? st.funcionarios.find((x)=>x.id===vinculoId) : undefined;
      const influencer = vinculoId ? st.influencers.find((x)=>x.id===vinculoId) : undefined;
      const antigoResponsavel = normaliza(funcionario?.nome || antigoNome);
      const novoResponsavel = normaliza(novoNome);

      return {
        ...st,
        usuarios: st.usuarios.map((u)=>u.id===editId ? {
          ...u,
          nome: novoNome,
          email: editF.email.trim(),
          perfil: editF.perfil,
          observacao: editF.observacao.trim(),
          senha: editF.senha.trim() || "123456",
        } : u),
        funcionarios: funcionario ? st.funcionarios.map((func)=>func.id===funcionario.id ? {
          ...func,
          nome: novoNome,
          atividades: func.atividades.map((a)=>({
            ...a,
            checklist:(a.checklist||[]).map((item)=>
              item.responsavelId===funcionario.id || normaliza(item.responsavel||"")===antigoResponsavel
                ? {...item,responsavel:novoNome}
                : item
            ),
          })),
        } : {
          ...func,
          atividades: func.atividades.map((a)=>({
            ...a,
            checklist:(a.checklist||[]).map((item)=>
              item.responsavelId===funcionario.id || normaliza(item.responsavel||"")===antigoResponsavel
                ? {...item,responsavel:novoNome}
                : item
            ),
          })),
        }) : st.funcionarios,
        influencers: influencer ? st.influencers.map((inf)=>inf.id===influencer.id ? {...inf,nome:novoNome}:inf) : st.influencers,
        pendencias: funcionario ? st.pendencias.map((p)=>
          p.funcionarioId===funcionario.id || normaliza(p.responsavel)===antigoResponsavel
            ? {...p,responsavel:novoNome,funcionarioId:funcionario.id}
            : p
        ) : st.pendencias,
        reinauguracoes: funcionario ? st.reinauguracoes.map((r)=>({
          ...r,
          cards:r.cards.map((card)=>({
            ...card,
            responsaveis:card.responsaveis.map((nome)=>normaliza(nome)===antigoResponsavel?novoResponsavel:nome),
            checklist:card.checklist.map((item)=>
              item.responsavelId===funcionario.id || normaliza(item.responsavel||"")===antigoResponsavel
                ? {...item,responsavel:novoNome,responsavelId:funcionario.id}
                : item
            ),
          })),
        })) : st.reinauguracoes,
        coresResponsaveis: funcionario ? Object.fromEntries(Object.entries(st.coresResponsaveis).map(([nome,cor])=>[
          normaliza(nome)===antigoResponsavel?novoResponsavel:nome,
          cor,
        ])) : st.coresResponsaveis,
      };
    });
    setEditId(null);
  };

  return (
    <>
      <PageHeader title="Usuários" sub="Quem acessa o sistema e o que cada perfil pode visualizar" action={<Btn onClick={() => setOpen(true)}><Plus className="h-4 w-4" />Adicionar usuário</Btn>} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {perfis.map((p) => <Panel key={p.perfil}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">{p.perfil}</div>
              <div className="font-display text-2xl font-bold">{p.total}</div>
            </div>
            {p.perfil === "Master" ? <ShieldCheck className="h-7 w-7 text-primary" /> : p.perfil === "Influencer" ? <UsersRound className="h-7 w-7 text-muted-foreground" /> : <UserRound className="h-7 w-7 text-muted-foreground" />}
          </div>
        </Panel>)}
      </div>

      <Panel title="Acessos cadastrados" className="mt-4">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead><tr className="border-b text-left text-xs uppercase text-muted-foreground"><th className="pb-2">Usuário</th><th>Perfil</th><th>E-mail</th><th>Vínculo</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {s.usuarios.map((u) => (
                <tr key={u.id} className="border-b last:border-0">
                  <td className="py-2"><b>{u.nome}</b>{u.observacao && <div className="text-xs text-muted-foreground">{u.observacao}</div>}</td>
                  <td>{u.perfil}</td>
                  <td>{u.email || "A definir"}</td>
                  <td>{u.vinculoId || "—"}</td>
                  <td><Badge tone={u.ativo ? "success" : "muted"}>{u.ativo ? "Ativo" : "Inativo"}</Badge></td>
                  <td className="text-right">
                    <div className="flex justify-end gap-3">
                      <button className="inline-flex items-center gap-1 text-xs font-semibold text-primary" onClick={()=>abrirEdicao(u)}><Pencil className="h-3.5 w-3.5"/>Editar</button>
                      <button className="text-xs font-semibold text-primary" onClick={() => set((st) => ({ ...st, usuarios: st.usuarios.map((x) => x.id === u.id ? { ...x, ativo: !x.ativo } : x) }))}>{u.ativo ? "Desativar" : "Ativar"}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Regra de visualização" className="mt-4">
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3 text-sm">
          <div><b>Master · Bruna Marques</b><p className="text-muted-foreground">Acesso completo: usuários, integrações, relatórios, custos, metas, filiais e toda a operação.</p></div>
          <div><b>Diretoria</b><p className="text-muted-foreground">Resultados, metas, filiais, campanhas, influencers, reinaugurações, investimentos e relatórios.</p></div>
          <div><b>Gerente de Marketing</b><p className="text-muted-foreground">Gestão de campanhas, metas, custos, equipe, influencers e resultados.</p></div>
          <div><b>Coordenação</b><p className="text-muted-foreground">Operação diária, equipe, campanhas, influencers e reinaugurações.</p></div>
          <div><b>Funcionário</b><p className="text-muted-foreground">Próprias atividades, tarefas, campanhas relacionadas e histórico.</p></div>
          <div><b>Influencer</b><p className="text-muted-foreground">Acesso somente ao próprio portal: calendário de campanhas aprovadas, materiais de Feed/Stories/Banner/Logo e contratos próprios.</p></div>
        </div>
      </Panel>

      <Modal open={open} onClose={() => setOpen(false)} title="Adicionar usuário">
        <div className="space-y-3">
          <Field label="Nome"><input className={inputCls} value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} /></Field>
          <Field label="E-mail"><input className={inputCls} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></Field>
          <Field label="Perfil"><select className={inputCls} value={f.perfil} onChange={(e) => setF({ ...f, perfil: e.target.value as Perfil })}>{PERFIS.map((p) => <option key={p}>{p}</option>)}</select></Field>
          <Field label="Observação"><input className={inputCls} placeholder="Ex.: atende filial 03" value={f.observacao} onChange={(e) => setF({ ...f, observacao: e.target.value })} /></Field>
          <Btn className="w-full" onClick={salvar}>Salvar usuário</Btn>
        </div>
      </Modal>

      <Modal open={!!editId} onClose={() => setEditId(null)} title="Editar usuário">
        <div className="space-y-3">
          <Field label="Nome"><input className={inputCls} value={editF.nome} onChange={(e) => setEditF({ ...editF, nome: e.target.value })} /></Field>
          <Field label="E-mail"><input className={inputCls} value={editF.email} onChange={(e) => setEditF({ ...editF, email: e.target.value })} /></Field>
          <Field label="Perfil"><select className={inputCls} value={editF.perfil} onChange={(e) => setEditF({ ...editF, perfil: e.target.value as Perfil })}>{PERFIS.map((p) => <option key={p}>{p}</option>)}</select></Field>
          <Field label="Senha"><input className={inputCls} value={editF.senha} onChange={(e) => setEditF({ ...editF, senha: e.target.value })} /></Field>
          <Field label="Observação"><input className={inputCls} value={editF.observacao} onChange={(e) => setEditF({ ...editF, observacao: e.target.value })} /></Field>
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs leading-relaxed text-muted-foreground">Se esse usuário estiver vinculado a um funcionário, a alteração do nome também atualiza atividades, responsáveis e quadros de reinauguração.</div>
          <Btn className="w-full" onClick={salvarEdicao}><Pencil className="h-4 w-4"/>Salvar alterações</Btn>
        </div>
      </Modal>
    </>
  );
}