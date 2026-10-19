import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Camera, Eye, EyeOff, KeyRound, Save, Trash2, UsersRound } from "lucide-react";
import { useApp } from "@/lib/store";
import { Avatar, PageHeader, Panel, Btn, Field, inputCls, Badge, pageHead } from "@/components/kit";
import { setCloudAuth } from "@/lib/cloud-sync";

export const Route = createFileRoute("/configuracoes")({
  head: pageHead("Configurações", "Configurações pessoais de acesso ao BI Lojas IM."),
  component: Page,
});

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
  const usuario = s.usuarios.find((u) => u.id === s.usuarioAtivoId);
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [mostrar, setMostrar] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const [fotoMsg, setFotoMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  if (!usuario) return null;

  const alterarFoto = async (userId: string, file?: File) => {
    if (!file) return;
    setFotoMsg(null);
    if (!file.type.startsWith("image/")) {
      setFotoMsg({ tipo: "erro", texto: "Escolha uma imagem JPG, PNG ou WEBP." });
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setFotoMsg({ tipo: "erro", texto: "A imagem precisa ter até 8 MB." });
      return;
    }
    try {
      const foto = await prepararFoto(file);
      set((st) => ({ ...st, usuarios: st.usuarios.map((u) => u.id === userId ? { ...u, foto } : u) }));
      setFotoMsg({ tipo: "ok", texto: "Foto atualizada e sincronizada com a equipe." });
    } catch (error) {
      setFotoMsg({ tipo: "erro", texto: error instanceof Error ? error.message : "Não foi possível atualizar a foto." });
    }
  };

  const removerFoto = (userId: string) => {
    set((st) => ({ ...st, usuarios: st.usuarios.map((u) => u.id === userId ? { ...u, foto: undefined } : u) }));
    setFotoMsg({ tipo: "ok", texto: "Foto removida." });
  };

  const salvarSenha = () => {
    const senhaAtual = usuario.senha || "123456";
    if (atual !== senhaAtual) {
      setMsg({ tipo: "erro", texto: "A senha atual está incorreta." });
      return;
    }
    if (nova.length < 6) {
      setMsg({ tipo: "erro", texto: "A nova senha precisa ter pelo menos 6 caracteres." });
      return;
    }
    if (nova !== confirmar) {
      setMsg({ tipo: "erro", texto: "A confirmação não corresponde à nova senha." });
      return;
    }
    set((st) => ({
      ...st,
      usuarios: st.usuarios.map((u) => u.id === usuario.id ? { ...u, senha: nova } : u),
    }));
    setCloudAuth({ userId: usuario.id, password: nova });
    setAtual("");
    setNova("");
    setConfirmar("");
    setMsg({ tipo: "ok", texto: "Senha alterada com sucesso." });
  };

  return (
    <>
      <PageHeader title="Configurações" sub="Ajustes pessoais da sua conta e acesso ao sistema" />

      <div className="grid gap-4 lg:grid-cols-[.8fr_1.2fr]">
        <Panel title="Seu acesso">
          <div className="flex items-center gap-4">
            <Avatar src={usuario.foto} name={usuario.nome} size="lg" />
            <div className="min-w-0 flex-1">
              <div className="font-display text-xl font-black">{usuario.nome}</div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                <Badge tone="primary">{usuario.perfil}</Badge>
                <span>{usuario.email || "E-mail ainda não cadastrado"}</span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-secondary/70 px-3 py-2 text-xs font-bold transition hover:border-primary/35">
                  <Camera className="h-4 w-4" />Trocar minha foto
                  <input type="file" accept="image/*" className="hidden" onChange={(e)=>void alterarFoto(usuario.id,e.target.files?.[0])} />
                </label>
                {usuario.foto && <button type="button" onClick={()=>removerFoto(usuario.id)} className="inline-flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-bold text-primary hover:bg-primary/5"><Trash2 className="h-4 w-4"/>Remover</button>}
              </div>
            </div>
          </div>
          <div className="mt-5 rounded-2xl border border-white/8 bg-white/[.025] p-4 text-sm text-muted-foreground">
            Sua foto aparece automaticamente nas telas de Funcionários, Atividades e Avaliações Mensais quando seu usuário está vinculado ao funcionário.
          </div>
          {fotoMsg && <div className={`mt-3 rounded-xl border px-3 py-2 text-xs font-semibold ${fotoMsg.tipo==="ok"?"border-success/20 bg-success/10 text-success":"border-primary/25 bg-primary/10 text-[#ff8a95]"}`}>{fotoMsg.texto}</div>}
        </Panel>

        <Panel title="Alterar minha senha">
          <div className="space-y-4">
            <Field label="Senha atual">
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-3 h-4 w-4 text-muted-foreground" />
                <input type={mostrar ? "text" : "password"} className={inputCls + " pl-10 pr-11"} value={atual} onChange={(e)=>setAtual(e.target.value)} placeholder="Digite a senha atual" />
                <button type="button" onClick={()=>setMostrar(!mostrar)} className="absolute right-3 top-2.5 rounded-lg p-1 text-muted-foreground hover:text-foreground">
                  {mostrar ? <EyeOff className="h-4 w-4"/> : <Eye className="h-4 w-4"/>}
                </button>
              </div>
            </Field>
            <Field label="Nova senha">
              <input type={mostrar ? "text" : "password"} className={inputCls} value={nova} onChange={(e)=>setNova(e.target.value)} placeholder="Mínimo de 6 caracteres" />
            </Field>
            <Field label="Confirmar nova senha">
              <input type={mostrar ? "text" : "password"} className={inputCls} value={confirmar} onChange={(e)=>setConfirmar(e.target.value)} placeholder="Digite novamente" />
            </Field>

            {msg && <div className={`rounded-xl border px-3 py-2.5 text-xs font-semibold ${msg.tipo === "ok" ? "border-success/20 bg-success/10 text-success" : "border-primary/25 bg-primary/10 text-[#ff8a95]"}`}>{msg.texto}</div>}

            <Btn onClick={salvarSenha}><Save className="h-4 w-4"/>Salvar nova senha</Btn>
          </div>
        </Panel>
      </div>

      {(s.perfil === "Master" || s.perfil === "Gerente de Marketing") && (
        <Panel title="Fotos da equipe" className="mt-4" action={<Badge tone="primary"><UsersRound className="mr-1 h-3.5 w-3.5"/>GESTÃO</Badge>}>
          <div className="mb-4 text-sm text-muted-foreground">
            Master e Gerente de Marketing podem trocar a foto de qualquer usuário. A alteração é sincronizada automaticamente para todos os computadores.
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {s.usuarios.filter((u)=>u.ativo).map((u)=>(
              <div key={u.id} className="flex items-center gap-3 rounded-2xl border border-border bg-secondary/20 p-3">
                <Avatar src={u.foto} name={u.nome} size="md"/>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-black">{u.nome}</div>
                  <div className="truncate text-xs text-muted-foreground">{u.perfil}</div>
                </div>
                <div className="flex shrink-0 gap-1">
                  <label title="Trocar foto" className="grid h-9 w-9 cursor-pointer place-items-center rounded-xl border border-border bg-secondary/70 text-muted-foreground transition hover:border-primary/35 hover:text-primary">
                    <Camera className="h-4 w-4"/>
                    <input type="file" accept="image/*" className="hidden" onChange={(e)=>void alterarFoto(u.id,e.target.files?.[0])}/>
                  </label>
                  {u.foto && <button type="button" title="Remover foto" onClick={()=>removerFoto(u.id)} className="grid h-9 w-9 place-items-center rounded-xl text-muted-foreground hover:bg-primary/5 hover:text-primary"><Trash2 className="h-4 w-4"/></button>}
                </div>
              </div>
            ))}
          </div>
        </Panel>
      )}

    </>
  );
}