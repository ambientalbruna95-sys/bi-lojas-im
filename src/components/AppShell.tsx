import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import {
  LayoutDashboard, AlertCircle, Megaphone, Target, ShoppingCart, Store, Star, Users, Truck, Wallet,
  TrendingUp, FileText, UserCog, Plug, PartyPopper, ClipboardCheck, MousePointerClick, Menu, X,
  LogOut, LockKeyhole, ShieldAlert, Eye, EyeOff, Sparkles, BarChart3, Megaphone as MegaphoneIcon, ShieldCheck, Settings, ChevronDown, Share2, ListChecks,
  Bell, Clock3, CalendarDays, Repeat2, CheckCircle2, FileSignature, Moon, Sun, MessageCircle,
} from "lucide-react";
import { brl, uid, useApp, type Perfil } from "@/lib/store";
import { ImzinhoChat } from "@/components/ImzinhoChat";
import { competenciaAtiva, dataLembreteCompetencia, despesaAlertaAtual, pagaNaCompetencia, vencimentoCompetencia } from "@/lib/despesas-fixas";
import { authenticateCloudUser, clearCloudAuth, fetchCloudDirectory, setCloudAuth, type CloudDirectoryUser } from "@/lib/cloud-sync";

type NavItem = { to: string; label: string; icon: any; perfis: Perfil[] | "all" };

const ALL_GESTAO: Perfil[] = ["Master","Diretoria","Gerente de Marketing"];
const MKT: Perfil[] = ["Master","Diretoria","Gerente de Marketing","Coordenação"];
const OPERACAO: Perfil[] = ["Master","Gerente de Marketing","Coordenação","Funcionário"];
const LOGIN_MASCOTE = "data:image/jpeg;base64,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";
const NAV: NavItem[] = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, perfis: INTERNO },
  { to: "/portal-influencer", label: "Meu portal", icon: CalendarDays, perfis: ["Influencer"] },
  { to: "/pendencias", label: "Central de Pendências", icon: AlertCircle, perfis: OPERACAO },
  { to: "/campanhas", label: "Campanhas", icon: Megaphone, perfis: MKT },
  { to: "/metas", label: "Metas", icon: Target, perfis: ALL_GESTAO },
  { to: "/vendas", label: "Vendas", icon: ShoppingCart, perfis: ALL_GESTAO },
  { to: "/filiais", label: "Filiais", icon: Store, perfis: MKT },
  { to: "/influencers", label: "Influencers", icon: Star, perfis: ["Master","Diretoria","Gerente de Marketing","Coordenação"] },
  { to: "/contratos", label: "Contratos", icon: FileSignature, perfis: INTERNO },
  { to: "/funcionarios", label: "Funcionários", icon: Users, perfis: OPERACAO },
  { to: "/atividades", label: "Atividades", icon: ListChecks, perfis: OPERACAO },
  { to: "/avaliacoes", label: "Avaliações da Equipe", icon: ClipboardCheck, perfis: ALL_GESTAO },
  { to: "/reinauguracao", label: "Reinauguração", icon: PartyPopper, perfis: OPERACAO },
  { to: "/propaganda-volante", label: "Propaganda Volante", icon: Truck, perfis: MKT },
  { to: "/trafego-pago", label: "Tráfego Pago", icon: MousePointerClick, perfis: MKT },
  { to: "/redes-sociais", label: "Redes Sociais", icon: Share2, perfis: MKT },
  { to: "/centro-custos", label: "Centro de Custos", icon: Wallet, perfis: ALL_GESTAO },
  { to: "/resultados", label: "Resultados", icon: TrendingUp, perfis: ALL_GESTAO },
  { to: "/relatorios", label: "Relatórios", icon: FileText, perfis: ALL_GESTAO },
  { to: "/usuarios", label: "Usuários", icon: UserCog, perfis: ["Master"] },
  { to: "/integracoes", label: "APIs / Integrações", icon: Plug, perfis: ["Master","Gerente de Marketing"] },
  { to: "/configuracoes", label: "Configurações", icon: Settings, perfis: INTERNO },
];

type NavGroup = { label: string; items: string[] };

const NAV_GROUPS: NavGroup[] = [
  { label: "Meu acesso", items: ["/portal-influencer"] },
  { label: "Visão Geral", items: ["/", "/resultados", "/relatorios"] },
  { label: "Campanhas", items: ["/campanhas", "/metas", "/reinauguracao"] },
  { label: "Propaganda", items: ["/trafego-pago", "/redes-sociais", "/influencers", "/contratos", "/propaganda-volante"] },
  { label: "Operação", items: ["/filiais", "/vendas", "/pendencias"] },
  { label: "Equipe", items: ["/funcionarios", "/atividades", "/avaliacoes"] },
  { label: "Financeiro", items: ["/centro-custos"] },
  { label: "Administração", items: ["/usuarios", "/integracoes", "/configuracoes"] },
];

const pode = (item: NavItem, perfil: Perfil) => item.perfis === "all" || item.perfis.includes(perfil);

function LoginScreen({theme,setTheme}:{theme:"dark"|"light";setTheme:(v:"dark"|"light")=>void}) {
  const { s, set } = useApp();
  const locais = s.usuarios.filter((u) => u.ativo);
  const [directory, setDirectory] = useState<CloudDirectoryUser[]>([]);
  const ativos = directory.length ? directory : locais;
  const [userId, setUserId] = useState(ativos[0]?.id ?? "");
  const [senha, setSenha] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [erro, setErro] = useState("");
  const [entrando, setEntrando] = useState(false);

  useEffect(() => {
    let ativo = true;
    void fetchCloudDirectory()
      .then((result) => {
        if (!ativo || result.empty || !result.users?.length) return;
        setDirectory(result.users);
        setUserId((atual) => result.users?.some((u) => u.id === atual) ? atual : (result.users?.[0]?.id || ""));
      })
      .catch((error) => {
        console.warn("[CloudSync] Diretório central indisponível no login:", error);
      });
    return () => { ativo = false; };
  }, []);

  const entrar = async () => {
    if (entrando) return;
    setEntrando(true);
    setErro("");

    try {
      const remote = await authenticateCloudUser(userId, senha);

      if (!remote.empty && remote.user) {
        const u = remote.user;
        setCloudAuth({ userId: u.id, password: senha });
        set((st) => ({
          ...st,
          autenticado: true,
          usuarioAtivoId: u.id,
          perfil: u.perfil as Perfil,
          influencerAtivaId: u.perfil === "Influencer" ? (u.vinculoId || st.influencerAtivaId) : st.influencerAtivaId,
        }));
        return;
      }

      const local = locais.find((x) => x.id === userId);
      if (!local || local.perfil !== "Master") {
        setErro("A base central ainda precisa ser inicializada pelo Master.");
        return;
      }
      if (senha !== (local.senha || "123456")) {
        setErro("Senha incorreta.");
        return;
      }

      setCloudAuth({ userId: local.id, password: senha });
      set((st) => ({
        ...st,
        autenticado: true,
        usuarioAtivoId: local.id,
        perfil: local.perfil,
        influencerAtivaId: st.influencerAtivaId,
      }));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Não foi possível entrar.";
      if (message.toLowerCase().includes("senha incorreta")) {
        setErro("Senha incorreta.");
        return;
      }

      // Contingência: se a nuvem estiver momentaneamente indisponível, o login
      // local ainda permite acesso e a sincronização tenta se recuperar depois.
      const local = locais.find((x) => x.id === userId);
      if (!local || senha !== (local.senha || "123456")) {
        setErro(message);
        return;
      }

      setCloudAuth({ userId: local.id, password: senha });
      set((st) => ({
        ...st,
        autenticado: true,
        usuarioAtivoId: local.id,
        perfil: local.perfil,
        influencerAtivaId: local.perfil === "Influencer" ? (local.vinculoId || st.influencerAtivaId) : st.influencerAtivaId,
      }));
    } finally {
      setEntrando(false);
    }
  };

  return (
    <div className="login-shell relative min-h-[100dvh] bg-[#09090b] p-0 text-white sm:p-3 md:p-5">
      <button type="button" onClick={()=>setTheme(theme==="dark"?"light":"dark")} className="fixed right-4 top-4 z-[80] inline-flex h-11 items-center gap-2 rounded-xl border border-white/10 bg-[#151619]/90 px-3 text-xs font-black shadow-xl backdrop-blur transition hover:border-primary/35" aria-label={theme==="dark"?"Ativar modo claro":"Ativar modo escuro"}>
        {theme==="dark"?<Sun className="h-4 w-4"/>:<Moon className="h-4 w-4"/>}<span>{theme==="dark"?"Claro":"Escuro"}</span>
      </button>
      <div className="mx-auto grid min-h-[100dvh] max-w-[1540px] overflow-hidden border border-white/10 bg-[#111214] shadow-[0_28px_80px_rgba(0,0,0,.45)] sm:min-h-[calc(100vh-24px)] sm:rounded-[24px] md:min-h-[calc(100vh-40px)] md:rounded-[30px] lg:grid-cols-[1.12fr_.88fr]">

        <section className="relative hidden overflow-hidden bg-[#0d0e10] text-white lg:flex lg:min-h-[calc(100vh-40px)] lg:flex-col lg:justify-between">
          <img
            src={LOGIN_MASCOTE}
            alt="Mascote Lojas IM astronauta na lua"
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/20 via-black/15 to-[#111214]/85" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/35" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(229,22,40,.18),transparent_30%)]" />

          <div className="relative z-10 flex items-center justify-between p-8 xl:p-10">
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/25 p-3 pr-5 shadow-2xl backdrop-blur-md">
              <div aria-label="Lojas IM" className="grid h-12 w-12 place-items-center rounded-xl bg-primary text-[22px] font-black lowercase tracking-[-.08em] text-white shadow-brand">im</div>
              <div>
                <div className="font-display text-lg font-black tracking-tight">BI Marketing</div>
                <div className="text-[10px] font-bold uppercase tracking-[.18em] text-white/55">Lojas IM</div>
              </div>
            </div>
            <div className="rounded-full border border-white/10 bg-black/25 px-3 py-1.5 text-[10px] font-bold uppercase tracking-[.15em] text-white/65 backdrop-blur-md">
              Centro de comando
            </div>
          </div>

          <div className="relative z-10 mt-auto max-w-2xl p-8 xl:p-10">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-[#ff3348]/30 bg-black/35 px-3 py-1.5 text-[10px] font-extrabold uppercase tracking-[.18em] text-[#ff7c89] backdrop-blur-md">
              <Sparkles className="h-3.5 w-3.5" /> marketing em órbita
            </div>
            <h1 className="font-display text-5xl font-black leading-[.96] tracking-[-.045em] drop-shadow-2xl xl:text-6xl">
              Seu marketing<br/><span className="text-[#ff3348]">entrou em órbita.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-white/75 drop-shadow-lg">
              Campanhas, influencers, tráfego, lojas, custos e resultados conectados no mesmo centro de comando.
            </p>
            <div className="mt-6 flex flex-wrap gap-2">
              {["Campanhas","Influencers","Tráfego pago","Reinaugurações","Resultados"].map((x)=>
                <span key={x} className="rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-xs font-semibold text-white/72 backdrop-blur-md">{x}</span>
              )}
            </div>
          </div>
        </section>

        <section className="login-panel relative flex min-h-[100dvh] items-center justify-center bg-[#111214] px-4 py-6 sm:min-h-0 sm:px-5 sm:py-8 md:px-10 lg:px-12 lg:py-10">
          <div className="absolute right-8 top-8 hidden rounded-full border border-white/10 bg-white/[.04] px-3 py-1.5 text-[11px] font-semibold text-white/55 shadow-sm backdrop-blur md:block">Marketing Intelligence</div>
          <div className="w-full max-w-[470px] py-[max(8px,env(safe-area-inset-top))]">
            <div className="mb-5 flex items-center gap-3 sm:mb-7 lg:hidden">
              <div aria-label="Lojas IM" className="grid h-14 w-14 place-items-center rounded-xl bg-primary text-2xl font-black lowercase tracking-[-.08em] text-white shadow-brand">im</div>
              <div><div className="font-display text-xl font-black text-white">BI Marketing</div><div className="text-sm text-white/45">Lojas IM</div></div>
            </div>

            <div className="mb-6 sm:mb-8">
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-[#e51628]/8 px-3 py-1.5 text-[11px] font-extrabold uppercase tracking-[.17em] text-primary">
                <BarChart3 className="h-3.5 w-3.5" /> acesso ao centro de comando
              </div>
              <h2 className="font-display text-3xl font-black tracking-[-.035em] text-white sm:text-4xl">Pronto para decolar?</h2>
              <p className="mt-2 max-w-md leading-relaxed text-white/55">Entre para acompanhar tudo que o marketing está movimentando nas Lojas IM.</p>
            </div>

            <div className="space-y-4 sm:space-y-5">
              <label className="block">
                <span className="mb-2 block text-sm font-bold text-white">Quem está entrando?</span>
                <select className="h-14 w-full rounded-2xl border border-white/10 bg-[#242428] px-4 text-sm font-semibold text-white shadow-inner outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/10" value={userId} onChange={(e) => setUserId(e.target.value)} style={{colorScheme:"dark"}}>
                  {ativos.map((u) => <option key={u.id} value={u.id} className="bg-[#242428] text-white">{u.nome} — {u.perfil}</option>)}
                </select>
              </label>

              <label className="block">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-sm font-bold text-white">Senha de acesso</span>
                  <button type="button" className="text-xs font-bold text-primary hover:underline">Recuperar acesso</button>
                </div>
                <div className="relative">
                  <LockKeyhole className="absolute left-4 top-[17px] h-5 w-5 text-white/40" />
                  <input type={showSenha ? "text" : "password"} className="h-14 w-full rounded-2xl border border-white/10 bg-[#242428] py-2 pl-12 pr-12 text-sm font-semibold text-white shadow-inner outline-none transition placeholder:text-white/35 focus:border-primary focus:ring-4 focus:ring-primary/10" placeholder="Digite sua senha" value={senha} onChange={(e) => setSenha(e.target.value)} onKeyDown={(e)=>{if(e.key==="Enter") void entrar()}} />
                  <button type="button" aria-label={showSenha?"Ocultar senha":"Mostrar senha"} onClick={()=>setShowSenha(!showSenha)} className="absolute right-4 top-[17px] text-white/40 transition hover:text-white">{showSenha?<EyeOff className="h-5 w-5"/>:<Eye className="h-5 w-5"/>}</button>
                </div>
              </label>

              {erro && <div className="rounded-xl border border-primary/25 bg-primary/10 px-3 py-2.5 text-xs font-semibold text-primary">{erro}</div>}
              
              <button type="button" onClick={()=>void entrar()} disabled={entrando} className="group relative h-14 w-full overflow-hidden rounded-2xl bg-primary px-4 text-sm font-black text-primary-foreground shadow-[0_10px_30px_rgba(229,22,40,.28)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(229,22,40,.34)] disabled:cursor-wait disabled:opacity-70">
                <span className="relative z-10 inline-flex items-center gap-2">{entrando ? "Conectando à nuvem..." : "Entrar no centro de comando"} <TrendingUp className="h-4 w-4 transition-transform group-hover:translate-x-1"/></span>
                <span className="absolute inset-y-0 -left-24 w-24 skew-x-[-18deg] bg-white/20 transition-all duration-700 group-hover:left-[120%]" />
              </button>

              <div className="grid grid-cols-1 gap-2 pt-1 min-[390px]:grid-cols-3">
                <MiniLoginInfo value="Campanhas" label="planejamento" />
                <MiniLoginInfo value="Equipe" label="operação" />
                <MiniLoginInfo value="Resultados" label="performance" />
              </div>

              <div className="rounded-2xl border border-white/10 bg-white/[.035] p-4 text-xs leading-relaxed text-white/50">
                <b className="text-white">Acesso inteligente por perfil.</b> Master, Diretoria, Gerente, Coordenação, Funcionário e Influencer enxergam apenas o que precisam para trabalhar.
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function OrbitBadge({icon:Icon,label,value,className}:{icon:any;label:string;value:string;className?:string}) {
  return <div className={`absolute ${className || ""} min-w-[138px] rounded-2xl border border-white/10 bg-[#2a2a2e]/88 p-3 shadow-2xl backdrop-blur-xl`}>
    <div className="mb-2 grid h-9 w-9 place-items-center rounded-xl bg-[#e51628] shadow-[0_8px_24px_rgba(229,22,40,.24)]"><Icon className="h-4 w-4"/></div>
    <div className="text-sm font-bold">{label}</div>
    <div className="mt-0.5 text-[11px] text-white/45">{value}</div>
  </div>;
}

function MiniLoginInfo({value,label}:{value:string;label:string}) {
  return <div className="rounded-xl border border-white/10 bg-white/[.04] px-3 py-3 text-center shadow-sm">
    <div className="text-xs font-extrabold text-white">{value}</div>
    <div className="mt-0.5 text-[10px] text-white/40">{label}</div>
  </div>;
}

function SemAcesso({influencer=false}:{influencer?:boolean}) {
  return <div className="grid min-h-[65vh] place-items-center"><div className="max-w-md rounded-xl border bg-card p-8 text-center shadow-soft"><ShieldAlert className="mx-auto mb-3 h-10 w-10 text-primary" /><div className="font-display text-xl font-bold">Área não disponível para este perfil</div><p className="mt-2 text-sm text-muted-foreground">{influencer?"Seu acesso é restrito ao calendário, materiais aprovados e seus contratos.":"O menu e as páginas são liberados conforme a atribuição do usuário. Solicite acesso ao Master se precisar visualizar esta área."}</p><Link to={influencer?"/portal-influencer":"/"} className="mt-4 inline-block rounded-md bg-primary px-4 py-2 text-sm font-bold text-primary-foreground">{influencer?"Ir para meu portal":"Voltar ao Dashboard"}</Link></div></div>;
}

export function AppShell({ children }: { children: ReactNode }) {
  const { s, set } = useApp();
  const [open, setOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [groupOpen, setGroupOpen] = useState<Record<string, boolean>>({});
  const [theme,setTheme] = useState<"dark"|"light">(()=>{
    if(typeof window==="undefined") return "dark";
    return localStorage.getItem("gestaoim-theme")==="light" ? "light" : "dark";
  });
  const path = useLocation({ select: (l) => l.pathname });
  const navigate = useNavigate();
  const usuario = s.usuarios.find((u) => u.id === s.usuarioAtivoId);

  useEffect(() => {
    if (s.autenticado && s.perfil === "Influencer" && path !== "/portal-influencer") {
      navigate({ to: "/portal-influencer", replace: true });
    }
  }, [s.autenticado, s.perfil, path, navigate]);

  useEffect(()=>{
    const root=document.documentElement;
    root.classList.toggle("light",theme==="light");
    root.classList.toggle("dark",theme==="dark");
    localStorage.setItem("gestaoim-theme",theme);
  },[theme]);

  useEffect(()=>{
    const hoje=new Date();
    const competencias=Array.from({length:3},(_,i)=>{
      const d=new Date(hoje.getFullYear(),hoje.getMonth()+i,1);
      return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
    });

    const novasPorFuncionario=new Map<string, Array<{
      despesaId:string;
      competencia:string;
      titulo:string;
      data:string;
      descricao:string;
    }>>();

    for(const despesa of s.despesasFixas){
      if(!despesa.ativa || !despesa.responsavelFuncionarioId) continue;
      const filial=s.filiais.find((f)=>f.id===despesa.filialId);
      for(const competencia of competencias){
        if(!competenciaAtiva(despesa,competencia) || pagaNaCompetencia(despesa,competencia)) continue;
        const func=s.funcionarios.find((f)=>f.id===despesa.responsavelFuncionarioId);
        if(!func) continue;
        const jaExiste=func.atividades.some((a)=>a.sourceDespesaFixaId===despesa.id && a.sourceDespesaFixaCompetencia===competencia);
        if(jaExiste) continue;
        const vencimento=vencimentoCompetencia(despesa,competencia);
        const data=dataLembreteCompetencia(despesa,competencia);
        const arr=novasPorFuncionario.get(func.id)||[];
        arr.push({
          despesaId:despesa.id,
          competencia,
          titulo:`Pagar despesa fixa · ${despesa.descricao}`,
          data,
          descricao:`Filial: ${filial?`${filial.codigo} · ${filial.nome}`:"Não informada"}\nValor: ${brl(despesa.valor)}\nVencimento: ${vencimento.split("-").reverse().join("/")}\n${despesa.recorrente===false?"Despesa única":`Recorrência: ${despesa.frequencia}`}`,
        });
        novasPorFuncionario.set(func.id,arr);
      }
    }

    if(!novasPorFuncionario.size) return;

    set((st)=>({
      ...st,
      funcionarios:st.funcionarios.map((func)=>{
        const novas=novasPorFuncionario.get(func.id);
        if(!novas?.length) return func;
        return {
          ...func,
          atividades:[
            ...func.atividades,
            ...novas.map((n)=>({
              id:uid(),
              titulo:n.titulo,
              data:n.data,
              feito:false,
              status:"A fazer" as const,
              origem:"Despesa fixa" as const,
              prioridade:"Alta" as const,
              descricao:n.descricao,
              sourceDespesaFixaId:n.despesaId,
              sourceDespesaFixaCompetencia:n.competencia,
            })),
          ],
        };
      }),
    }));
  },[s.despesasFixas,s.funcionarios,s.filiais,set]);

  const alertasFixos = useMemo(() => {
    const hoje = new Date().toISOString().slice(0,10);
    const mesAtual = hoje.slice(0,7);
    const gestao = ["Master","Diretoria","Gerente de Marketing","Coordenação"].includes(s.perfil);
    const normalizaNome=(valor:string)=>valor.normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toUpperCase();
    const funcionarioLogin = usuario?.vinculoId
      ? s.funcionarios.find((f)=>f.id===usuario.vinculoId)
      : s.funcionarios.find((f)=>normalizaNome(f.nome)===normalizaNome(usuario?.nome||""));
    const idsPermitidos = new Set(funcionarioLogin ? [funcionarioLogin.id] : []);

    const itens = s.rotinasDiarias
      .filter((r)=>r.ativa && idsPermitidos.has(r.funcionarioId))
      .map((rotina)=>{
        const funcionario=s.funcionarios.find((f)=>f.id===rotina.funcionarioId);
        const frequencia=rotina.frequencia || "Diária";
        const [ano,mes]=hoje.split("-").map(Number);
        const ultimoDia=new Date(ano,mes,0).getDate();
        const dia=Math.min(Math.max(1,rotina.diaMes||1),ultimoDia);
        const dataReferencia=frequencia==="Mensal"
          ? `${mesAtual}-${String(dia).padStart(2,"0")}`
          : hoje;
        const atividade=funcionario?.atividades.find((a)=>
          a.sourceRotinaId===rotina.id &&
          (frequencia==="Mensal" ? a.data.startsWith(mesAtual) : a.data===hoje)
        );
        const finalizada=atividade?.status==="Finalizado" || atividade?.feito===true;
        const vencida=frequencia==="Mensal"
          ? dataReferencia < hoje && !finalizada
          : !!rotina.horario && new Date(`${hoje}T${rotina.horario}:00`).getTime() < Date.now() && !finalizada;
        return {rotina,funcionario,frequencia,dataReferencia,atividade,finalizada,vencida};
      });

    const pendentes=itens.filter((x)=>!x.finalizada && (x.frequencia==="Diária" || x.dataReferencia<=hoje));
    const diarias=pendentes.filter((x)=>x.frequencia==="Diária");
    const mensais=pendentes.filter((x)=>x.frequencia==="Mensal");
    const justificativas=gestao
      ? s.funcionarios.flatMap((f)=>f.atividades.filter((a)=>a.justificativa?.status==="Pendente").map((a)=>({funcionario:f,atividade:a})))
      : [];

    const atividadesPrazo=s.funcionarios
      .filter((f)=>idsPermitidos.has(f.id))
      .flatMap((funcionario)=>funcionario.atividades
        .filter((a)=>!!a.data && a.data<=hoje && !a.sourceRotinaId && a.status!=="Finalizado" && !a.feito)
        .map((atividade)=>({funcionario,atividade,atrasada:atividade.data<hoje})))
      .sort((a,b)=>(a.atividade.data||"").localeCompare(b.atividade.data||"") || (a.atividade.horario||"99:99").localeCompare(b.atividade.horario||"99:99"));

    const despesas=s.despesasFixas
      .filter((d)=>d.ativa && (
        (!!usuario?.id && d.alertaUsuarioIds.includes(usuario.id)) ||
        (!!funcionarioLogin?.id && d.responsavelFuncionarioId===funcionarioLogin.id)
      ))
      .map((despesa)=>{
        const alerta=despesaAlertaAtual(d,hoje);
        const filial=s.filiais.find((f)=>f.id===despesa.filialId);
        return alerta ? {despesa,alerta,filial} : null;
      })
      .filter(Boolean) as Array<{despesa:(typeof s.despesasFixas)[number];alerta:{competencia:string;vencimento:string;dias:number};filial:(typeof s.filiais)[number]|undefined}>;

    const mencoes=usuario?.id
      ? s.funcionarios.flatMap((funcionario)=>funcionario.atividades.flatMap((atividade)=>
          (atividade.comentarios||[])
            .filter((comentario)=>
              comentario.mencoesUsuarioIds?.includes(usuario.id) &&
              !comentario.lidaPorUsuarioIds?.includes(usuario.id)
            )
            .map((comentario)=>({funcionario,atividade,comentario}))
        )).sort((a,b)=>b.comentario.criadoEm.localeCompare(a.comentario.criadoEm))
      : [];

    return {itens,pendentes,diarias,mensais,justificativas,atividadesPrazo,despesas,mencoes,gestao,funcionarioLogin};
  }, [s.rotinasDiarias, s.funcionarios, s.despesasFixas, s.filiais, s.perfil, usuario?.vinculoId, usuario?.id, usuario?.nome]);

  if (!s.autenticado) return <LoginScreen theme={theme} setTheme={setTheme} />;

  const items = NAV.filter((n) => pode(n, s.perfil));
  const itemMap = new Map(items.map((n) => [n.to, n]));
  const rota = NAV.filter((n) => n.to !== "/").find((n) => path.startsWith(n.to)) || (path === "/" ? NAV[0] : undefined);
  const autorizado = !rota || pode(rota, s.perfil);

  const totalAlertas = alertasFixos.pendentes.length + alertasFixos.justificativas.length + alertasFixos.atividadesPrazo.length + alertasFixos.despesas.length + alertasFixos.mencoes.length;
  const sinoUrgente = alertasFixos.diarias.length > 0 || alertasFixos.justificativas.length > 0 || alertasFixos.atividadesPrazo.length > 0 || alertasFixos.despesas.some((x)=>x.alerta.dias<=0) || alertasFixos.mencoes.length > 0;

  const abrirMencao=(funcionarioId:string,atividadeId:string)=>{
    try { sessionStorage.setItem("gi-open-activity",JSON.stringify({funcionarioId,atividadeId})); } catch {}
    setNotifOpen(false);
    navigate({to:"/atividades"});
  };

  const sair = () => {
    clearCloudAuth();
    set((st) => ({ ...st, autenticado: false, usuarioAtivoId: "" }));
  };

  const nav = (
    <nav className="flex flex-col gap-2 px-3 pb-5">
      {NAV_GROUPS.map((g) => {
        const visible = g.items.map((to) => itemMap.get(to)).filter(Boolean) as NavItem[];
        if (!visible.length) return null;
        const groupActive = visible.some((n) => n.to === "/" ? path === "/" : path.startsWith(n.to));
        const expanded = groupOpen[g.label] || groupActive;
        return <div key={g.label} className="rounded-2xl border border-white/[.04] bg-white/[.015] p-1.5">
          <button
            type="button"
            onClick={() => setGroupOpen((prev) => ({ ...prev, [g.label]: !prev[g.label] }))}
            className="flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left"
          >
            <span className={`text-sm font-black tracking-[-.01em] ${groupActive ? "text-[#ff7c89]" : "text-sidebar-foreground/75"}`}>{g.label}</span>
            <ChevronDown className={`h-4 w-4 text-sidebar-foreground/40 transition-transform ${expanded ? "rotate-180" : ""}`} />
          </button>
          {expanded && <div className="space-y-1">
            {visible.map((n) => {
              const active = n.to === "/" ? path === "/" : path.startsWith(n.to);
              return <Link key={n.to} to={n.to} onClick={() => setOpen(false)}
                className={`group flex items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-semibold transition-all ${active ? "border-primary/25 bg-gradient-to-r from-primary to-[#a80f1e] text-primary-foreground shadow-brand" : "border-transparent text-sidebar-foreground/64 hover:border-white/5 hover:bg-sidebar-accent hover:text-sidebar-foreground"}`}>
                <span className={`grid h-7 w-7 place-items-center rounded-lg ${active ? "bg-white/12" : "bg-white/[.035] group-hover:bg-white/[.06]"}`}><n.icon className="h-4 w-4" /></span><span className="truncate">{n.label}</span>
              </Link>;
            })}
          </div>}
        </div>;
      })}
    </nav>
  );

  const brand = <div className="px-4 pb-4 pt-5">
    <div className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[.025] p-3">
      <div aria-label="Lojas IM" className="grid h-11 w-11 place-items-center rounded-xl bg-primary text-xl font-black lowercase tracking-[-.08em] text-white shadow-brand">im</div>
      <div className="min-w-0 leading-tight">
        <div className="font-display text-sm font-black text-sidebar-foreground">BI Marketing</div>
        <div className="mt-0.5 text-[10px] font-bold uppercase tracking-[.16em] text-sidebar-foreground/40">Lojas IM</div>
      </div>
    </div>
  </div>;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[272px] overflow-y-auto border-r border-white/5 bg-sidebar md:block"><div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-primary/10 to-transparent" />{brand}{nav}</aside>
      {open && <div className="fixed inset-0 z-50 md:hidden"><div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} /><aside className="absolute inset-y-0 left-0 w-[88vw] max-w-[320px] overflow-y-auto border-r border-white/5 bg-sidebar shadow-2xl"><div className="flex items-center justify-between pr-3">{brand}<button aria-label="Fechar" onClick={() => setOpen(false)} className="text-sidebar-foreground"><X /></button></div>{nav}</aside></div>}

      <div className="md:pl-[272px]">
        <header className="sticky top-0 z-20 flex min-h-16 items-center gap-3 border-b border-white/5 bg-background/88 px-3 py-3 backdrop-blur-xl sm:px-4 md:px-6">
          <button aria-label="Menu" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[.035] md:hidden" onClick={() => setOpen(true)}><Menu className="h-5 w-5" /></button>
          <div className="min-w-0 flex-1">
            <div className="truncate font-display text-sm font-extrabold">{usuario?.nome || (s.perfil === "Master" ? "Bruna Marques" : s.perfil)}</div>
            <div className="mt-0.5 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-success shadow-[0_0_9px_var(--success)]" />
              <span className="truncate text-[10px] font-bold uppercase tracking-[.14em] text-muted-foreground">{s.perfil}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={()=>setTheme(theme==="dark"?"light":"dark")}
            className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-white/[.025] px-3 text-xs font-black text-muted-foreground transition hover:border-primary/35 hover:text-foreground"
            aria-label={theme==="dark"?"Ativar modo claro":"Ativar modo escuro"}
            title={theme==="dark"?"Mudar para modo claro":"Mudar para modo escuro"}
          >
            {theme==="dark"?<Sun className="h-4 w-4"/>:<Moon className="h-4 w-4"/>}
            <span className="hidden sm:inline">{theme==="dark"?"Claro":"Escuro"}</span>
          </button>
          <div className="relative shrink-0">
            <button
              type="button"
              aria-label={totalAlertas ? `${totalAlertas} alerta(s) pendente(s)` : "Sem alertas pendentes"}
              onClick={()=>setNotifOpen((v)=>!v)}
              className={`relative grid h-10 w-10 place-items-center rounded-xl border transition ${totalAlertas ? (sinoUrgente ? "border-primary/35 bg-primary/10 text-primary" : "border-warn/30 bg-warn/10 text-warn") : "border-white/10 bg-white/[.025] text-muted-foreground hover:text-foreground"}`}
            >
              <Bell className={`h-5 w-5 ${totalAlertas ? "bell-pending" : ""}`} />
              {!!totalAlertas && <span className={`absolute -right-1 -top-1 grid min-h-5 min-w-5 place-items-center rounded-full px-1 text-[9px] font-black text-white shadow-lg ${sinoUrgente ? "bg-primary" : "bg-warn"}`}>{totalAlertas>99?"99+":totalAlertas}</span>}
            </button>

            {notifOpen && <div className="absolute right-0 top-12 z-[80] w-[min(92vw,420px)] overflow-hidden rounded-2xl border border-white/10 bg-popover text-popover-foreground shadow-[0_24px_70px_rgba(0,0,0,.30)]">
              <div className="flex items-center justify-between border-b border-white/8 px-4 py-3">
                <div>
                  <div className="font-display text-sm font-black">Central de alertas</div>
                  <div className="mt-0.5 text-[10px] text-muted-foreground">{totalAlertas ? `${totalAlertas} pendência(s) para acompanhar` : "Tudo em dia por aqui"}</div>
                </div>
                {!totalAlertas && <CheckCircle2 className="h-5 w-5 text-success"/>}
              </div>

              <div className="max-h-[65vh] overflow-y-auto p-3">
                {!!alertasFixos.mencoes.length && <div className="mb-4">
                  <div className="mb-2 flex items-center justify-between"><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.12em] text-primary"><MessageCircle className="h-3.5 w-3.5"/>Dúvidas e menções</div><span className="text-[10px] font-bold text-primary">{alertasFixos.mencoes.length}</span></div>
                  <div className="space-y-1.5">
                    {alertasFixos.mencoes.slice(0,8).map(({funcionario,atividade,comentario})=><button type="button" key={comentario.id} onClick={()=>abrirMencao(funcionario.id,atividade.id)} className="block w-full rounded-xl border border-primary/20 bg-primary/[.045] p-2.5 text-left transition hover:border-primary/40 hover:bg-primary/[.07]">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0"><div className="text-xs font-black">{comentario.autorNome} mencionou você</div><div className="mt-0.5 truncate text-[10px] font-bold text-muted-foreground">{atividade.titulo}</div></div>
                        <span className="shrink-0 rounded-full bg-primary/15 px-2 py-1 text-[8px] font-black text-primary">RESPONDER</span>
                      </div>
                      <div className="mt-2 line-clamp-2 text-xs text-foreground/85">{comentario.texto}</div>
                      <div className="mt-1 text-[9px] text-muted-foreground">{new Date(comentario.criadoEm).toLocaleString("pt-BR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})}</div>
                    </button>)}
                    {alertasFixos.mencoes.length>8&&<div className="text-center text-[10px] text-muted-foreground">+{alertasFixos.mencoes.length-8} menção(ões)</div>}
                  </div>
                </div>}

                {!!alertasFixos.atividadesPrazo.length && <div className="mb-4">
                  <div className="mb-2 flex items-center justify-between"><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.12em] text-primary"><ListChecks className="h-3.5 w-3.5"/>Minhas demandas · hoje e atrasadas</div><span className="text-[10px] font-bold text-primary">{alertasFixos.atividadesPrazo.length}</span></div>
                  <div className="space-y-1.5">
                    {alertasFixos.atividadesPrazo.slice(0,8).map(({funcionario,atividade,atrasada})=><div key={`${funcionario.id}-${atividade.id}`} className={`rounded-xl border p-2.5 ${atrasada?"border-primary/25 bg-primary/[.05]":"border-primary/15 bg-primary/[.035]"}`}>
                      <div className="flex items-start justify-between gap-2"><div className="text-xs font-bold">{atividade.titulo}</div><span className={`shrink-0 rounded-full px-2 py-1 text-[8px] font-black ${atrasada?"bg-primary/15 text-primary":"bg-success/10 text-success"}`}>{atrasada?"ATRASADA":"HOJE"}</span></div>
                      <div className="mt-1 flex flex-wrap items-center gap-1 text-[10px] text-muted-foreground"><span>{funcionario.nome}</span><span>·</span><span>{atividade.data.split("-").reverse().join("/")}</span>{atividade.horario&&<><span>·</span><span>{atividade.horario}</span></>}<span>·</span><span>{atividade.prioridade||"Média"}</span></div>
                    </div>)}
                    {alertasFixos.atividadesPrazo.length>8&&<div className="text-center text-[10px] text-muted-foreground">+{alertasFixos.atividadesPrazo.length-8} demanda(s)</div>}
                  </div>
                </div>}

                {!!alertasFixos.diarias.length && <div className="mb-4">
                  <div className="mb-2 flex items-center justify-between"><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.12em] text-primary"><Repeat2 className="h-3.5 w-3.5"/>Fixas de hoje</div><span className="text-[10px] font-bold text-primary">{alertasFixos.diarias.length}</span></div>
                  <div className="space-y-1.5">
                    {alertasFixos.diarias.slice(0,8).map(({rotina,funcionario,vencida})=><div key={rotina.id} className="rounded-xl border border-primary/15 bg-primary/[.035] p-2.5">
                      <div className="flex items-start justify-between gap-2"><div className="min-w-0"><div className="truncate text-xs font-bold">{rotina.titulo}</div><div className="mt-1 truncate text-[10px] text-muted-foreground">{funcionario?.nome || "Colaborador"}{rotina.horario?` · ${rotina.horario}`:""}</div></div>{vencida&&<span className="shrink-0 rounded-full bg-primary/15 px-2 py-1 text-[9px] font-black text-primary">ATRASADA</span>}</div>
                    </div>)}
                    {alertasFixos.diarias.length>8&&<div className="text-center text-[10px] text-muted-foreground">+{alertasFixos.diarias.length-8} atividade(s)</div>}
                  </div>
                </div>}

                {!!alertasFixos.mensais.length && <div className="mb-4">
                  <div className="mb-2 flex items-center justify-between"><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.12em] text-warn"><CalendarDays className="h-3.5 w-3.5"/>Fixas do mês</div><span className="text-[10px] font-bold text-warn">{alertasFixos.mensais.length}</span></div>
                  <div className="space-y-1.5">
                    {alertasFixos.mensais.slice(0,8).map(({rotina,funcionario,dataReferencia,vencida})=><div key={rotina.id} className="rounded-xl border border-warn/15 bg-warn/[.035] p-2.5">
                      <div className="flex items-start justify-between gap-2"><div className="min-w-0"><div className="truncate text-xs font-bold">{rotina.titulo}</div><div className="mt-1 flex flex-wrap items-center gap-1 text-[10px] text-muted-foreground"><span>{funcionario?.nome || "Colaborador"}</span><span>·</span><span>{dataReferencia.split("-").reverse().join("/")}</span>{rotina.horario&&<><span>·</span><span>{rotina.horario}</span></>}</div></div>{vencida&&<span className="shrink-0 rounded-full bg-primary/15 px-2 py-1 text-[9px] font-black text-primary">VENCIDA</span>}</div>
                    </div>)}
                  </div>
                </div>}

                {!!alertasFixos.despesas.length && <div className="mb-4">
                  <div className="mb-2 flex items-center justify-between"><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.12em] text-warn"><Wallet className="h-3.5 w-3.5"/>Despesas para acompanhar</div><span className="text-[10px] font-bold text-warn">{alertasFixos.despesas.length}</span></div>
                  <div className="space-y-1.5">
                    {alertasFixos.despesas.slice(0,8).map(({despesa,alerta,filial})=><div key={despesa.id} className="rounded-xl border border-warn/20 bg-warn/[.035] p-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0"><div className="truncate text-xs font-bold">{despesa.descricao}</div><div className="mt-1 text-[10px] text-muted-foreground">{filial?.codigo} · {filial?.nome} · vence {alerta.vencimento.split("-").reverse().join("/")}</div></div>
                        <span className={`shrink-0 rounded-full px-2 py-1 text-[9px] font-black ${alerta.dias<0?"bg-primary/15 text-primary":"bg-warn/15 text-warn"}`}>{alerta.dias<0?`ATRASADA ${Math.abs(alerta.dias)}d`:alerta.dias===0?"VENCE HOJE":`EM ${alerta.dias}d`}</span>
                      </div>
                    </div>)}
                  </div>
                </div>}

                {!!alertasFixos.justificativas.length && <div className="mb-4">
                  <div className="mb-2 flex items-center justify-between"><div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-[.12em] text-warn"><Clock3 className="h-3.5 w-3.5"/>Aprovações</div><span className="text-[10px] font-bold text-warn">{alertasFixos.justificativas.length}</span></div>
                  <div className="space-y-1.5">
                    {alertasFixos.justificativas.slice(0,6).map(({funcionario,atividade})=><div key={atividade.id} className="rounded-xl border border-white/8 bg-white/[.025] p-2.5"><div className="text-xs font-bold">{atividade.titulo}</div><div className="mt-1 text-[10px] text-muted-foreground">{funcionario.nome} · justificativa aguardando decisão</div></div>)}
                  </div>
                </div>}

                {!totalAlertas && <div className="py-8 text-center"><CheckCircle2 className="mx-auto h-8 w-8 text-success"/><div className="mt-2 text-sm font-black">Tudo em dia</div><div className="mt-1 text-xs text-muted-foreground">Nenhuma demanda, comentário, atividade fixa, despesa ou aprovação pendente.</div></div>}
              </div>

              <div className="grid grid-cols-2 gap-2 border-t border-white/8 p-2">
                <Link to="/atividades" onClick={()=>setNotifOpen(false)} className="flex w-full items-center justify-center rounded-xl bg-primary px-3 py-2.5 text-xs font-black text-primary-foreground shadow-brand">Atividades</Link>
                <Link to="/centro-custos" onClick={()=>setNotifOpen(false)} className="flex w-full items-center justify-center rounded-xl border border-white/10 px-3 py-2.5 text-xs font-black text-foreground">Despesas</Link>
              </div>
            </div>}
          </div>
                    <button onClick={sair} className="inline-flex h-10 shrink-0 items-center gap-2 rounded-xl border border-white/10 bg-white/[.025] px-3 text-xs font-bold text-muted-foreground transition hover:border-primary/35 hover:bg-primary/8 hover:text-foreground"><LogOut className="h-4 w-4" /><span className="hidden sm:inline">Sair</span></button>
        </header>
        <main className="relative mx-auto max-w-[1500px] overflow-x-hidden p-3 pb-[calc(92px+env(safe-area-inset-bottom))] sm:p-4 sm:pb-24 md:p-6 lg:p-7"><div className="pointer-events-none fixed right-0 top-14 h-64 w-64 rounded-full bg-primary/5 blur-3xl" />{autorizado ? children : <SemAcesso influencer={s.perfil==="Influencer"} />}</main>
      </div>
      {s.perfil !== "Influencer" && <ImzinhoChat path={path} />}
    </div>
  );
}