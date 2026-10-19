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
import { clearCloudAuth, setCloudAuth } from "@/lib/cloud-sync";

type NavItem = { to: string; label: string; icon: any; perfis: Perfil[] | "all" };

const ALL_GESTAO: Perfil[] = ["Master","Diretoria","Gerente de Marketing"];
const MKT: Perfil[] = ["Master","Diretoria","Gerente de Marketing","Coordenação"];
const OPERACAO: Perfil[] = ["Master","Gerente de Marketing","Coordenação","Funcionário"];
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
  const ativos = s.usuarios.filter((u) => u.ativo);
  const [userId, setUserId] = useState(ativos[0]?.id ?? "");
  const [senha, setSenha] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [erro, setErro] = useState("");

  const entrar = () => {
    const u = ativos.find((x) => x.id === userId);
    if (!u) return;
    const senhaCorreta = u.senha || "123456";
    if (senha !== senhaCorreta) {
      setErro("Senha incorreta.");
      return;
    }
    setErro("");
    setCloudAuth({ userId: u.id, password: senha });
    set((st) => ({
      ...st,
      autenticado: true,
      usuarioAtivoId: u.id,
      perfil: u.perfil,
      influencerAtivaId: u.perfil === "Influencer" ? (u.vinculoId || st.influencerAtivaId) : st.influencerAtivaId,
    }));
  };

  return (
    <div className="login-shell relative min-h-[100dvh] bg-[#09090b] p-0 text-white sm:p-3 md:p-5">
      <button type="button" onClick={()=>setTheme(theme==="dark"?"light":"dark")} className="fixed right-4 top-4 z-[80] inline-flex h-11 items-center gap-2 rounded-xl border border-white/10 bg-[#151619]/90 px-3 text-xs font-black shadow-xl backdrop-blur transition hover:border-primary/35" aria-label={theme==="dark"?"Ativar modo claro":"Ativar modo escuro"}>
        {theme==="dark"?<Sun className="h-4 w-4"/>:<Moon className="h-4 w-4"/>}<span>{theme==="dark"?"Claro":"Escuro"}</span>
      </button>
      <div className="mx-auto grid min-h-[100dvh] max-w-[1540px] overflow-hidden border border-white/10 bg-[#111214] shadow-[0_28px_80px_rgba(0,0,0,.45)] sm:min-h-[calc(100vh-24px)] sm:rounded-[24px] md:min-h-[calc(100vh-40px)] md:rounded-[30px] lg:grid-cols-[1.12fr_.88fr]">

        <section className="relative hidden overflow-hidden bg-[#0d0e10] text-white lg:flex lg:min-h-[calc(100vh-40px)] lg:flex-col lg:justify-between">
          <img
            src="/mascote-login.webp"
            alt="Mascote Lojas IM astronauta na lua"
            className="absolute inset-0 h-full w-full object-cover object-center"
          />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-black/20 via-black/15 to-[#111214]/85" />
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/35" />
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_18%_18%,rgba(229,22,40,.18),transparent_30%)]" />

          <div className="relative z-10 flex items-center justify-between p-8 xl:p-10">
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/25 p-3 pr-5 shadow-2xl backdrop-blur-md">
              <img src="/logo-lojas-im.png" alt="Lojas IM" className="h-12 w-12 rounded-xl object-contain shadow-brand" />
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
              <img src="/logo-lojas-im.png" alt="Lojas IM" className="h-14 w-14 rounded-xl object-contain" />
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
                  <input type={showSenha ? "text" : "password"} className="h-14 w-full rounded-2xl border border-white/10 bg-[#242428] py-2 pl-12 pr-12 text-sm font-semibold text-white shadow-inner outline-none transition placeholder:text-white/35 focus:border-primary focus:ring-4 focus:ring-primary/10" placeholder="Digite sua senha" value={senha} onChange={(e) => setSenha(e.target.value)} onKeyDown={(e)=>{if(e.key==="Enter")entrar()}} />
                  <button type="button" aria-label={showSenha?"Ocultar senha":"Mostrar senha"} onClick={()=>setShowSenha(!showSenha)} className="absolute right-4 top-[17px] text-white/40 transition hover:text-white">{showSenha?<EyeOff className="h-5 w-5"/>:<Eye className="h-5 w-5"/>}</button>
                </div>
              </label>

              {erro && <div className="rounded-xl border border-primary/25 bg-primary/10 px-3 py-2.5 text-xs font-semibold text-primary">{erro}</div>}
              
              <button type="button" onClick={entrar} className="group relative h-14 w-full overflow-hidden rounded-2xl bg-primary px-4 text-sm font-black text-primary-foreground shadow-[0_10px_30px_rgba(229,22,40,.28)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_34px_rgba(229,22,40,.34)]">
                <span className="relative z-10 inline-flex items-center gap-2">Entrar no centro de comando <TrendingUp className="h-4 w-4 transition-transform group-hover:translate-x-1"/></span>
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
      <img src="/logo-lojas-im.png" alt="Lojas IM" className="h-11 w-11 rounded-xl object-contain shadow-brand" />
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