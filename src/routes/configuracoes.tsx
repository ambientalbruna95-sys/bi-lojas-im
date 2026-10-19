import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Download, Eye, EyeOff, HardDriveDownload, KeyRound, Save, Upload, UserRound } from "lucide-react";
import { useApp, type AppState } from "@/lib/store";
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
  const [backupMsg, setBackupMsg] = useState<{ tipo: "ok" | "erro"; texto: string } | null>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);

  if (!usuario) return null;

  const exportarBackup = () => {
    const dados: Partial<AppState> = {
      despesasFixas: s.despesasFixas,
      campanhas: s.campanhas,
      contratos: s.contratos,
      influencers: s.influencers,
      usuarios: s.usuarios,
      metas: s.metas,
      pendencias: s.pendencias,
      funcionarios: s.funcionarios,
      custos: s.custos,
      reinauguracoes: s.reinauguracoes,
      rotinasDiarias: s.rotinasDiarias,
      coresResponsaveis: s.coresResponsaveis,
      resultadosDiarios: s.resultadosDiarios,
    };

    const payload = {
      produto: "BI Lojas IM",
      tipo: "backup-local",
      versao: 1,
      criadoEm: new Date().toISOString(),
      usuario: usuario.nome,
      dados,
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const agora = new Date();
    const stamp = [
      agora.getFullYear(),
      String(agora.getMonth() + 1).padStart(2, "0"),
      String(agora.getDate()).padStart(2, "0"),
      "-",
      String(agora.getHours()).padStart(2, "0"),
      String(agora.getMinutes()).padStart(2, "0"),
    ].join("");
    a.href = url;
    a.download = `backup-bi-lojas-im-${stamp}.json`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    setBackupMsg({ tipo: "ok", texto: "Backup exportado. Guarde esse arquivo em um local seguro." });
  };

  const restaurarBackup = async (file?: File) => {
    if (!file) return;
    try {
      const texto = await file.text();
      const payload = JSON.parse(texto) as {
        produto?: string;
        tipo?: string;
        versao?: number;
        dados?: Partial<AppState>;
      };

      if (payload.produto !== "BI Lojas IM" || !payload.dados || typeof payload.dados !== "object") {
        throw new Error("Arquivo de backup inválido.");
      }

      if (!confirm("Restaurar este backup neste computador? Os dados locais atuais serão substituídos pelos dados do arquivo.")) {
        if (backupInputRef.current) backupInputRef.current.value = "";
        return;
      }

      const dados = payload.dados;
      set((st) => ({
        ...st,
        ...(Array.isArray(dados.despesasFixas) ? { despesasFixas: dados.despesasFixas } : {}),
        ...(Array.isArray(dados.campanhas) ? { campanhas: dados.campanhas } : {}),
        ...(Array.isArray(dados.contratos) ? { contratos: dados.contratos } : {}),
        ...(Array.isArray(dados.influencers) ? { influencers: dados.influencers } : {}),
        ...(Array.isArray(dados.usuarios) ? { usuarios: dados.usuarios } : {}),
        ...(Array.isArray(dados.metas) ? { metas: dados.metas } : {}),
        ...(Array.isArray(dados.pendencias) ? { pendencias: dados.pendencias } : {}),
        ...(Array.isArray(dados.funcionarios) ? { funcionarios: dados.funcionarios } : {}),
        ...(Array.isArray(dados.custos) ? { custos: dados.custos } : {}),
        ...(Array.isArray(dados.reinauguracoes) ? { reinauguracoes: dados.reinauguracoes } : {}),
        ...(Array.isArray(dados.rotinasDiarias) ? { rotinasDiarias: dados.rotinasDiarias } : {}),
        ...(Array.isArray(dados.resultadosDiarios) ? { resultadosDiarios: dados.resultadosDiarios } : {}),
        ...(dados.coresResponsaveis && typeof dados.coresResponsaveis === "object" ? { coresResponsaveis: dados.coresResponsaveis } : {}),
      }));

      setBackupMsg({ tipo: "ok", texto: "Backup restaurado com sucesso neste computador." });
    } catch (error) {
      setBackupMsg({ tipo: "erro", texto: error instanceof Error ? error.message : "Não foi possível restaurar o backup." });
    } finally {
      if (backupInputRef.current) backupInputRef.current.value = "";
    }
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

      {usuario.perfil === "Master" && (
        <div className="mt-4">
          <Panel
            title="Backup deste computador"
            action={<Badge tone="primary">Somente Master</Badge>}
          >
            <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
              <div className="flex min-w-0 items-start gap-4">
                <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-primary/10 text-primary">
                  <HardDriveDownload className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <div className="font-display text-lg font-black">Cópia de segurança local</div>
                  <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted-foreground">
                    Exporte uma cópia dos dados salvos neste navegador antes de trocar de computador, limpar o navegador ou fazer mudanças grandes no sistema.
                    O arquivo pode ser restaurado depois em outro computador.
                  </p>
                  <div className="mt-3 text-xs font-semibold text-muted-foreground">
                    Inclui campanhas, atividades, usuários, influencers, reinaugurações, custos, metas e resultados importados.
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
                <Btn onClick={exportarBackup}>
                  <Download className="h-4 w-4" />
                  Exportar backup
                </Btn>
                <Btn variant="outline" onClick={() => backupInputRef.current?.click()}>
                  <Upload className="h-4 w-4" />
                  Restaurar backup
                </Btn>
                <input
                  ref={backupInputRef}
                  type="file"
                  accept=".json,application/json"
                  className="hidden"
                  onChange={(e) => restaurarBackup(e.target.files?.[0])}
                />
              </div>
            </div>

            {backupMsg && (
              <div className={`mt-4 rounded-xl border px-3 py-2.5 text-xs font-semibold ${backupMsg.tipo === "ok" ? "border-success/20 bg-success/10 text-success" : "border-primary/25 bg-primary/10 text-[#ff8a95]"}`}>
                {backupMsg.texto}
              </div>
            )}
          </Panel>
        </div>
      )}
    </>
  );
}