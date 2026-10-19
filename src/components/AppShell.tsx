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
const LOGIN_MASCOTE = "data:image/webp;base64,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";

const INTERNO: Perfil[] = ["Master","Diretoria","Gerente de Marketing","Coordenação","Funcionário"];

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
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[272px] overflow-y-auto border-r border-white/5 bg-sidebar lg:block"><div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-primary/10 to-transparent" />{brand}{nav}</aside>
      {open && <div className="fixed inset-0 z-50 lg:hidden"><div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} /><aside className="absolute inset-y-0 left-0 w-[88vw] max-w-[320px] overflow-y-auto border-r border-white/5 bg-sidebar shadow-2xl"><div className="flex items-center justify-between pr-3">{brand}<button aria-label="Fechar" onClick={() => setOpen(false)} className="text-sidebar-foreground"><X /></button></div>{nav}</aside></div>}

      <div className="lg:pl-[272px]">
        <header className="sticky top-0 z-20 flex min-h-16 items-center gap-3 border-b border-white/5 bg-background/88 px-3 py-3 backdrop-blur-xl sm:px-4 md:px-6">
          <button aria-label="Menu" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[.035] lg:hidden" onClick={() => setOpen(true)}><Menu className="h-5 w-5" /></button>
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