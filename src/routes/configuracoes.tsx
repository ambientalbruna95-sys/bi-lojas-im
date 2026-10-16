import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Eye, EyeOff, KeyRound, Save, UserRound } from "lucide-react";
import { useApp } from "@/lib/store";
import { PageHeader, Panel, Btn, Field, inputCls, Badge, pageHead } from "@/components/kit";

export const Route = createFileRoute("/configuracoes")({
  head: pageHead("Configurações", "Configurações pessoais de acesso ao BI Lojas IM."),
  component: Page,
});

function Page() {
  const { s, set } = useApp();
  const usuario = s.usuarios.find((u) => u.id === s.usuarioAtivoId);
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [mostrar, setMostrar] = useState(false);
  const [msg, setMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);

  if (!usuario) return null;

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
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-primary/10 text-primary">
              <UserRound className="h-6 w-6" />
            </div>
            <div>
              <div className="font-display text-xl font-black">{usuario.nome}</div>
              <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                <Badge tone="primary">{usuario.perfil}</Badge>
                <span>{usuario.email || "E-mail ainda não cadastrado"}</span>
              </div>
            </div>
          </div>
          <div className="mt-5 rounded-2xl border border-white/8 bg-white/[.025] p-4 text-sm text-muted-foreground">
            A senha padrão do sistema é <b className="text-foreground">123456</b>. Você pode continuar usando essa senha ou alterar quando quiser.
          </div>
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
    </>
  );
}