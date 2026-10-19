import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Camera, Pencil, Plus, ShieldCheck, Trash2, UserRound, UsersRound } from "lucide-react";
import { useApp, PERFIS, uid, type Perfil, type Usuario } from "@/lib/store";
import { Avatar, PageHeader, Panel, Btn, Modal, Field, inputCls, Badge, pageHead } from "@/components/kit";

export const Route = createFileRoute("/usuarios")({ head: pageHead("Usuários", "Perfis e permissões do BI Lojas IM."), component: Page });

type FormUsuario = {
  nome: string;
  email: string;
  perfil: Perfil;
  observacao: string;
  senha: string;
  vinculoId: string;
  foto: string;
};

const vazio = (): FormUsuario => ({
  nome: "", email: "", perfil: "Funcionário", observacao: "", senha: "123456", vinculoId: "", foto: "",
});

const normaliza = (v:string) => v.normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toUpperCase();

async function prepararFoto(file: File): Promise<string> {
  const raw = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error("Imagem inválida."));
    el.src = raw;
  });

  const size = 320;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return raw;

  const escala = Math.max(size / img.width, size / img.height);
  const w = img.width * escala;
  const h = img.height * escala;
  ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h);
  return canvas.toDataURL("image/jpeg", 0.78);
}

function Page() {
  const { s, set } = useApp();
  const [open, setOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [f, setF] = useState<FormUsuario>(vazio());
  const [editF, setEditF] = useState<FormUsuario>(vazio());
  const [fotoErro, setFotoErro] = useState("");

  const perfis = PERFIS.map((p) => ({
    perfil: p,
    total: s.usuarios.filter((u) => u.perfil === p).length,
  }));

  const salvar = () => {
    if (!f.nome.trim()) return;
    const u: Usuario = {
      id: uid(),
      nome: f.nome.trim(),
      email: f.email.trim(),
      perfil: f.perfil,
      ativo: true,
      observacao: f.observacao.trim(),
      senha: f.senha.trim() || "123456",
      vinculoId: f.vinculoId || undefined,
      foto: f.foto || undefined,
    };
    set((st) => ({ ...st, usuarios: [...st.usuarios, u] }));
    setOpen(false);
    setF(vazio());
  };

  const abrirEdicao = (u: Usuario) => {
    setFotoErro("");
    setEditId(u.id);
    setEditF({
      nome: u.nome,
      email: u.email || "",
      perfil: u.perfil,
      observacao: u.observacao || "",
      senha: u.senha || "123456",
      vinculoId: u.vinculoId || "",
      foto: u.foto || "",
    });
  };

  const selecionarFoto = async (file: File | undefined, editar: boolean) => {
    if (!file) return;
    setFotoErro("");
    if (!file.type.startsWith("image/")) {
      setFotoErro("Escolha uma imagem JPG, PNG ou WEBP.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setFotoErro("A imagem precisa ter até 8 MB.");
      return;
    }
    try {
      const foto = await prepararFoto(file);
      if (editar) setEditF((x) => ({ ...x, foto }));
      else setF((x) => ({ ...x, foto }));
    } catch (error) {
      setFotoErro(error instanceof Error ? error.message : "Não foi possível preparar a foto.");
    }
  };

  const salvarEdicao = () => {
    if (!editId || !editF.nome.trim()) return;
    set((st) => {
      const atual = st.usuarios.find((u) => u.id === editId);
      if (!atual) return st;
      const novoNome = editF.nome.trim();
      const antigoNome = atual.nome;
      const vinculoId = editF.vinculoId || atual.vinculoId;
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
          vinculoId: editF.vinculoId || undefined,
          foto: editF.foto || undefined,
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
        } : func) : st.funcionarios,
        influencers: influencer ? st.influencers.map((inf)=>inf.id===influencer.id ? {...inf,nome:novoNome}:inf) : st.influencers,
        pendencias: funcionario ? st.pendencias.map((p)=>
          p.funcionarioId===funcionario.id || normaliza(p.responsavel)===antigoResponsavel
            ? {...p,responsavel:novoNome,funcionarioId:funcionario.id}
            : p
        ) : st.pendencias,
        reinauguracoes: funcionario ? st.reinauguracoes.map((rr)=>({
          ...rr,
          cards:rr.cards.map((card)=>({
            ...card,
            responsaveis:card.responsaveis.map((nome)=>normaliza(nome)===antigoResponsavel?novoNome:nome),
            checklist:card.checklist.map((item)=>
              item.responsavelId===funcionario.id || normaliza(item.responsavel||"")===antigoResponsavel
                ? {...item,responsavel:novoNome,responsavelId:funcionario.id}
                : item
            ),
          })),
        })) : st.reinauguracoes,
        coresResponsaveis: funcionario ? Object.fromEntries(Object.entries(st.coresResponsaveis).map(([nome,cor])=>[
          normaliza(nome)===antigoResponsavel?novoNome:nome,
          cor,
        ])) : st.coresResponsaveis,
      };
    });
    setEditId(null);
  };

  const fotoForm = (form: FormUsuario, editar: boolean) => (
    <div className="rounded-2xl border border-border bg-secondary/25 p-4">
      <div className="flex items-center gap-4">
        <Avatar src={form.foto} name={form.nome || "Usuário"} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="font-bold">Foto do usuário</div>
          <div className="mt-0.5 text-xs text-muted-foreground">A mesma foto aparecerá em Funcionários, Atividades e Avaliações Mensais.</div>
          <div className="mt-3 flex flex-wrap gap-2">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-secondary/70 px-3 py-2 text-xs font-bold hover:border-primary/35">
              <Camera className="h-4 w-4" />Escolher foto
              <input type="file" accept="image/*" className="hidden" onChange={(e)=>void selecionarFoto(e.target.files?.[0], editar)} />
            </label>
            {form.foto && <button type="button" onClick={()=>editar?setEditF((x)=>({...x,foto:""})):setF((x)=>({...x,foto:""}))} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-primary hover:bg-primary/5"><Trash2 className="h-4 w-4"/>Remover</button>}
          </div>
        </div>
      </div>
      {fotoErro && <div className="mt-3 text-xs font-semibold text-primary">{fotoErro}</div>}
    </div>
  );

  const campos = (form: FormUsuario, setForm: (v: FormUsuario)=>void, editar: boolean) => <>
    {fotoForm(form, editar)}
    <Field label="Nome"><input className={inputCls} value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></Field>
    <Field label="E-mail"><input className={inputCls} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
    <Field label="Perfil"><select className={inputCls} value={form.perfil} onChange={(e) => setForm({ ...form, perfil: e.target.value as Perfil })}>{PERFIS.map((p) => <option key={p}>{p}</option>)}</select></Field>
    {form.perfil !== "Influencer" && <Field label="Vínculo com funcionário">
      <select className={inputCls} value={form.vinculoId} onChange={(e)=>setForm({...form,vinculoId:e.target.value})}>
        <option value="">Sem vínculo</option>
        {s.funcionarios.map((func)=><option key={func.id} value={func.id}>{func.nome} — {func.cargo}</option>)}
      </select>
    </Field>}
    {editar && <Field label="Senha"><input className={inputCls} value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })} /></Field>}
    <Field label="Observação"><input className={inputCls} placeholder="Ex.: atende filial 03" value={form.observacao} onChange={(e) => setForm({ ...form, observacao: e.target.value })} /></Field>
  </>;

  return (
    <>
      <PageHeader title="Usuários" sub="Quem acessa o sistema e o que cada perfil pode visualizar" action={<Btn onClick={() => {setF(vazio());setFotoErro("");setOpen(true);}}><Plus className="h-4 w-4" />Adicionar usuário</Btn>} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {perfis.map((p) => <Panel key={p.perfil}>
          <div className="flex items-center justify-between">
            <div><div className="text-xs uppercase tracking-wider text-muted-foreground">{p.perfil}</div><div className="font-display text-2xl font-bold">{p.total}</div></div>
            {p.perfil === "Master" ? <ShieldCheck className="h-7 w-7 text-primary" /> : p.perfil === "Influencer" ? <UsersRound className="h-7 w-7 text-muted-foreground" /> : <UserRound className="h-7 w-7 text-muted-foreground" />}
          </div>
        </Panel>)}
      </div>

      <Panel title="Acessos cadastrados" className="mt-4">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead><tr className="border-b text-left text-xs uppercase text-muted-foreground"><th className="pb-2">Usuário</th><th>Perfil</th><th>E-mail</th><th>Vínculo</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {s.usuarios.map((u) => {
                const vinculo = s.funcionarios.find((x)=>x.id===u.vinculoId) || s.influencers.find((x)=>x.id===u.vinculoId);
                return <tr key={u.id} className="border-b last:border-0">
                  <td className="py-2"><div className="flex items-center gap-3"><Avatar src={u.foto} name={u.nome} size="sm"/><div><b>{u.nome}</b>{u.observacao && <div className="text-xs text-muted-foreground">{u.observacao}</div>}</div></div></td>
                  <td>{u.perfil}</td><td>{u.email || "A definir"}</td><td>{vinculo?.nome || "—"}</td>
                  <td><Badge tone={u.ativo ? "success" : "muted"}>{u.ativo ? "Ativo" : "Inativo"}</Badge></td>
                  <td className="text-right"><div className="flex justify-end gap-3">
                    <button className="inline-flex items-center gap-1 text-xs font-semibold text-primary" onClick={()=>abrirEdicao(u)}><Pencil className="h-3.5 w-3.5"/>Editar</button>
                    <button className="text-xs font-semibold text-primary" onClick={() => set((st) => ({ ...st, usuarios: st.usuarios.map((x) => x.id === u.id ? { ...x, ativo: !x.ativo } : x) }))}>{u.ativo ? "Desativar" : "Ativar"}</button>
                  </div></td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
      </Panel>

      <Panel title="Regra de visualização" className="mt-4">
        <div className="grid gap-3 text-sm md:grid-cols-2 lg:grid-cols-3">
          <div><b>Master · Bruna Marques</b><p className="text-muted-foreground">Acesso completo: usuários, integrações, relatórios, custos, metas, filiais e toda a operação.</p></div>
          <div><b>Diretoria</b><p className="text-muted-foreground">Resultados, metas, filiais, campanhas, influencers, reinaugurações, investimentos e relatórios.</p></div>
          <div><b>Gerente de Marketing</b><p className="text-muted-foreground">Gestão de campanhas, metas, custos, equipe, influencers e resultados.</p></div>
          <div><b>Coordenação</b><p className="text-muted-foreground">Operação diária, equipe, campanhas, influencers e reinaugurações.</p></div>
          <div><b>Funcionário</b><p className="text-muted-foreground">Próprias atividades, tarefas, campanhas relacionadas e histórico.</p></div>
          <div><b>Influencer</b><p className="text-muted-foreground">Acesso somente ao próprio portal: calendário de campanhas aprovadas, materiais e contratos próprios.</p></div>
        </div>
      </Panel>

      <Modal open={open} onClose={() => setOpen(false)} title="Adicionar usuário">
        <div className="space-y-3">{campos(f, setF, false)}<Btn className="w-full" onClick={salvar}>Salvar usuário</Btn></div>
      </Modal>

      <Modal open={!!editId} onClose={() => setEditId(null)} title="Editar usuário">
        <div className="space-y-3">{campos(editF, setEditF, true)}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs leading-relaxed text-muted-foreground">A foto e o nome deste usuário serão reutilizados automaticamente nas telas vinculadas ao funcionário.</div>
          <Btn className="w-full" onClick={salvarEdicao}><Pencil className="h-4 w-4"/>Salvar alterações</Btn>
        </div>
      </Modal>
    </>
  );
}
