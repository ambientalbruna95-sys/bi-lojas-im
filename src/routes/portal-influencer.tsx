import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BarChart3, CalendarDays, Download, ExternalLink, FileImage, FileSignature, Image as ImageIcon, Megaphone, Plus, Sparkles, TrendingUp } from "lucide-react";
import { useApp, brl, fmtDate, num, uid, type Campanha, type Post } from "@/lib/store";
import { Badge, Btn, Field, Modal, PageHeader, Panel, Stat, inputCls, pageHead } from "@/components/kit";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ContractHub } from "@/components/ContractHub";

export const Route = createFileRoute("/portal-influencer")({
  head: pageHead("Portal da Influencer", "Calendário, materiais e contratos da influencer."),
  component: Page,
});

type Tab="Calendário"|"Materiais"|"Entregas"|"Contratos";
const TIPOS: Post["tipo"][]=["Reel","Feed","Stories","TikTok","YouTube"];
const DIAS=["D","S","T","Q","Q","S","S"];
const MESES=["Janeiro","Fevereiro","Março","Abril","Maio","Junho","Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];

function aplica(c:Campanha, ids:string[]){
  return c.aprovacao==="Aprovada" && (c.abrangencia==="Rede" || c.filialIds.some(id=>ids.includes(id)));
}
function noMes(c:Campanha,ano:string,mes:string){
  const ini=c.inicio||c.fim, fim=c.fim||c.inicio;
  if(!ini||!fim)return false;
  const primeiro=`${ano}-${mes}-01`;
  const ultimo=`${ano}-${mes}-${String(new Date(Number(ano),Number(mes),0).getDate()).padStart(2,"0")}`;
  return ini<=ultimo&&fim>=primeiro;
}
function noDia(c:Campanha,data:string){
  const ini=c.inicio||c.fim, fim=c.fim||c.inicio;
  return !!ini&&!!fim&&ini<=data&&fim>=data;
}

function Page(){
  const {s}=useApp();
  const usuario=s.usuarios.find(u=>u.id===s.usuarioAtivoId);
  const influencer=s.influencers.find(i=>i.id===(usuario?.vinculoId||s.influencerAtivaId));
  const [tab,setTab]=useState<Tab>("Calendário");
  const [postOpen,setPostOpen]=useState(false);
  const hoje=new Date();
  const [ano,setAno]=useState(String(hoje.getFullYear()));
  const [mes,setMes]=useState(String(hoje.getMonth()+1).padStart(2,"0"));

  if(!influencer) return <PageHeader title="Portal da Influencer" sub="Não foi possível localizar o perfil vinculado a este acesso."/>;

  const campanhas=useMemo(()=>s.campanhas.filter(c=>aplica(c,influencer.filialIds)),[s.campanhas,influencer.filialIds]);
  const doMes=campanhas.filter(c=>noMes(c,ano,mes)).sort((a,b)=>(a.inicio||"").localeCompare(b.inicio||""));
  const totalDias=new Date(Number(ano),Number(mes),0).getDate();
  const primeiroDia=new Date(Number(ano),Number(mes)-1,1).getDay();
  const alcance=influencer.posts.reduce((a,p)=>a+(p.alcance??p.views??0),0);
  const engajamentos=influencer.posts.reduce((a,p)=>a+(p.engajamentos??p.likes+p.comentarios),0);
  const vendas=influencer.posts.reduce((a,p)=>a+(p.vendasAtribuidas||0),0);
  const receita=influencer.posts.reduce((a,p)=>a+(p.receitaAtribuida||0),0);
  const investimento=influencer.vinculos.reduce((a,v)=>a+v.valor,0);
  const retorno=investimento>0?receita/investimento:0;
  const graf=influencer.posts.slice(-12).map((p,idx)=>({
    nome:`${p.tipo} ${idx+1}`,
    alcance:p.alcance??p.views??0,
    engajamentos:p.engajamentos??p.likes+p.comentarios,
  }));

  return <>
    <PageHeader title={`Oi, ${influencer.nome} 👋`} sub="Calendário, materiais, entregas, desempenho e contratos em um só lugar." action={<div className="grid h-11 w-11 place-items-center rounded-xl bg-primary/10 text-primary"><Sparkles className="h-5 w-5"/></div>}/>

    <div className="mb-4 flex flex-wrap gap-2 rounded-2xl border border-white/8 bg-white/[.02] p-2">
      {(["Calendário","Materiais","Entregas","Contratos"] as Tab[]).map(x=><button key={x} onClick={()=>setTab(x)} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-black transition ${tab===x?"bg-primary text-white shadow-brand":"text-muted-foreground hover:bg-white/[.05] hover:text-foreground"}`}>{x==="Calendário"?<CalendarDays className="h-4 w-4"/>:x==="Materiais"?<FileImage className="h-4 w-4"/>:x==="Entregas"?<BarChart3 className="h-4 w-4"/>:<FileSignature className="h-4 w-4"/>}{x}</button>)}
    </div>

    {tab==="Calendário"&&<div className="grid gap-4 xl:grid-cols-[320px_minmax(0,1fr)]">
      <Panel title="Campanhas do mês">
        <div className="mb-3 grid grid-cols-2 gap-2">
          <select className="rounded-xl border border-white/8 bg-background px-3 py-2 text-sm" value={mes} onChange={e=>setMes(e.target.value)}>{MESES.map((n,i)=><option key={n} value={String(i+1).padStart(2,"0")}>{n}</option>)}</select>
          <select className="rounded-xl border border-white/8 bg-background px-3 py-2 text-sm" value={ano} onChange={e=>setAno(e.target.value)}>{[2026,2027,2028].map(x=><option key={x}>{x}</option>)}</select>
        </div>
        <div className="space-y-2">
          {doMes.map(c=><div key={c.id} className="rounded-xl border border-white/8 p-3">
            <div className="flex items-start gap-3">
              <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-2xl border border-white/10 bg-white p-1">{c.logoCampanha?<img src={c.logoCampanha} alt="" className="h-full w-full object-contain p-1"/>:<Megaphone className="h-5 w-5 text-primary"/>}</div>
              <div className="min-w-0"><div className="font-display font-black">{c.nome}</div><div className="mt-0.5 text-[10px] font-bold text-primary">{fmtDate(c.inicio)} – {fmtDate(c.fim)}</div><div className="mt-1 text-xs leading-relaxed text-muted-foreground">{c.proposito||"Consulte os materiais aprovados da campanha."}</div></div>
            </div>
          </div>)}
          {!doMes.length&&<div className="rounded-xl border border-dashed border-white/10 p-6 text-center text-xs text-muted-foreground">Nenhuma campanha aprovada para suas filiais neste mês.</div>}
        </div>
      </Panel>

      <Panel title={`Calendário · ${MESES[Number(mes)-1]} ${ano}`}>
        <div className="overflow-x-auto">
          <div className="min-w-[680px]">
            <div className="grid grid-cols-7 gap-1">
              {DIAS.map((d,i)=><div key={i} className="py-2 text-center text-[10px] font-black text-muted-foreground">{d}</div>)}
              {Array.from({length:primeiroDia}).map((_,i)=><div key={`v-${i}`} className="min-h-[92px]"/>)}
              {Array.from({length:totalDias},(_,i)=>{
                const dia=i+1,data=`${ano}-${mes}-${String(dia).padStart(2,"0")}`,cd=doMes.filter(c=>noDia(c,data));
                return <div key={data} className="min-h-[92px] rounded-xl border border-white/7 bg-black/[.08] p-2"><div className="text-xs font-black text-muted-foreground">{dia}</div><div className="mt-2 flex flex-wrap gap-1">{cd.slice(0,5).map(c=><div key={c.id} title={c.nome} className="grid h-11 w-11 place-items-center overflow-hidden rounded-xl border border-primary/25 bg-white shadow-sm">{c.logoCampanha?<img src={c.logoCampanha} alt="" className="h-full w-full object-contain p-1"/>:<span className="text-[10px] font-black text-primary">{c.nome.slice(0,2).toUpperCase()}</span>}</div>)}</div></div>;
              })}
            </div>
          </div>
        </div>
      </Panel>
    </div>}

    {tab==="Materiais"&&<div className="grid gap-4 lg:grid-cols-2">
      {campanhas.map(c=><Panel key={c.id} title={c.nome} action={<Badge tone="success">Aprovada</Badge>}>
        <div className="mb-3 text-xs text-muted-foreground">{fmtDate(c.inicio)} – {fmtDate(c.fim)} · {c.proposito}</div>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Material label="Feed" src={c.artes?.Feed}/>
          <Material label="Stories" src={c.artes?.Stories}/>
          <Material label="Banner" src={c.artes?.Banner}/>
          <Material label="Logo" src={c.logoCampanha}/>
        </div>
      </Panel>)}
      {!campanhas.length&&<div className="col-span-full rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-muted-foreground">Ainda não há materiais aprovados para suas filiais.</div>}
    </div>}

    {tab==="Entregas"&&<div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><div className="font-display text-xl font-black">Minhas entregas e desempenho</div><div className="mt-1 text-sm text-muted-foreground">Registre cada publicação. Os dados atualizam automaticamente o painel interno da equipe.</div></div>
        <Btn onClick={()=>setPostOpen(true)}><Plus className="h-4 w-4"/>Registrar postagem</Btn>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Stat accent label="Entregas" value={String(influencer.posts.length)} hint="postagens registradas"/>
        <Stat label="Alcance" value={num(alcance)} />
        <Stat label="Engajamentos" value={num(engajamentos)} />
        <Stat label="Vendas atribuídas" value={String(vendas)} />
        <Stat label="Receita atribuída" value={brl(receita)} />
        <Stat label="Retorno" value={retorno?`${retorno.toFixed(2)}x`:"—"} hint={`sobre ${brl(investimento)} investidos`}/>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_1.15fr]">
        <Panel title="Alcance das últimas entregas">
          <div className="h-72">
            {graf.length?<ResponsiveContainer width="100%" height="100%"><BarChart data={graf}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/><XAxis dataKey="nome" fontSize={10}/><YAxis fontSize={10}/><Tooltip formatter={(v:number)=>num(v)}/><Bar dataKey="alcance" fill="var(--primary)" radius={[6,6,0,0]}/></BarChart></ResponsiveContainer>:<div className="grid h-full place-items-center text-center text-sm text-muted-foreground"><div><BarChart3 className="mx-auto mb-2 h-8 w-8 opacity-40"/>O gráfico aparece assim que você registrar a primeira entrega.</div></div>}
          </div>
        </Panel>

        <Panel title="Postagens registradas">
          <div className="max-h-[360px] overflow-auto">
            <table className="w-full min-w-[650px] text-sm">
              <thead><tr className="border-b text-left text-[10px] uppercase text-muted-foreground"><th className="pb-2">Data</th><th>Filial</th><th>Tipo</th><th>Link</th><th>Alcance</th><th>Engaj.</th><th>Receita</th></tr></thead>
              <tbody>{[...influencer.posts].reverse().map(p=>{const filial=s.filiais.find(f=>f.id===p.filialId);return <tr key={p.id} className="border-b last:border-0"><td className="py-2">{fmtDate(p.data)}</td><td>{filial?.nome||"—"}</td><td><Badge>{p.tipo}</Badge></td><td>{p.link?<a href={p.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary">Abrir <ExternalLink className="h-3 w-3"/></a>:"—"}</td><td>{num(p.alcance??p.views??0)}</td><td>{num(p.engajamentos??p.likes+p.comentarios)}</td><td>{brl(p.receitaAtribuida||0)}</td></tr>})}</tbody>
            </table>
            {!influencer.posts.length&&<div className="py-10 text-center text-sm text-muted-foreground">Nenhuma postagem registrada ainda.</div>}
          </div>
        </Panel>
      </div>
    </div>}

    {tab==="Contratos"&&<ContractHub mode="influencer" influencerId={influencer.id}/>}
    <InfluencerPostModal open={postOpen} onClose={()=>setPostOpen(false)} influencerId={influencer.id}/>
  </>;
}

function Material({label,src}:{label:string;src?:string}){
  return <div className="rounded-xl border border-white/8 bg-white/[.02] p-2">
    <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-black/10">{src?<img src={src} alt={label} className="h-full w-full object-contain"/>:<ImageIcon className="h-7 w-7 text-muted-foreground/40"/>}</div>
    <div className="mt-2 text-center text-xs font-black">{label}</div>
    {src?<a href={src} download className="mt-2 inline-flex w-full items-center justify-center gap-1 rounded-lg border border-primary/25 bg-primary/5 px-2 py-2 text-[10px] font-black text-primary hover:bg-primary/10"><Download className="h-3.5 w-3.5"/>Baixar</a>:<div className="mt-2 text-center text-[10px] text-muted-foreground">Não disponível</div>}
  </div>;
}


function InfluencerPostModal({open,onClose,influencerId}:{open:boolean;onClose:()=>void;influencerId:string}) {
  const {s,set}=useApp();
  const inf=s.influencers.find(i=>i.id===influencerId);
  const [f,setF]=useState({
    filialId:inf?.filialIds[0]??"",
    tipo:"Reel" as Post["tipo"],
    linkFeed:"",
    linkStories:"",
    data:new Date().toISOString().slice(0,10),
    alcance:0,
    engajamentos:0,
    vendas:0,
    receita:0,
  });
  if(!inf)return null;

  const salvar=()=>{
    const novos:Post[]=[];
    if(f.linkFeed.trim()) novos.push({
      id:uid(),filialId:f.filialId,tipo:f.tipo,link:f.linkFeed.trim(),data:f.data,
      views:f.alcance,likes:f.engajamentos,comentarios:0,alcance:f.alcance,engajamentos:f.engajamentos,
      vendasAtribuidas:f.vendas,receitaAtribuida:f.receita,
    });
    if(f.linkStories.trim()) novos.push({
      id:uid(),filialId:f.filialId,tipo:"Stories",link:f.linkStories.trim(),data:f.data,
      views:f.alcance,likes:f.engajamentos,comentarios:0,alcance:f.alcance,engajamentos:f.engajamentos,
      vendasAtribuidas:f.vendas,receitaAtribuida:f.receita,
    });
    if(!novos.length)return;
    set(st=>({...st,influencers:st.influencers.map(i=>i.id===influencerId?{...i,posts:[...i.posts,...novos]}:i)}));
    onClose();
  };

  return <Modal open={open} onClose={onClose} title="Registrar entrega">
    <div className="space-y-3">
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs leading-relaxed text-muted-foreground">Uaiii, é por aqui 😄 Cole os links e informe as métricas da publicação. Assim a equipe consegue mensurar seu desempenho no BI.</div>
      <Field label="Influencer"><input className={inputCls} value={inf.nome} disabled/></Field>
      <Field label="Filial"><select className={inputCls} value={f.filialId} onChange={e=>setF({...f,filialId:e.target.value})}>{inf.filialIds.map(id=>{const filial=s.filiais.find(x=>x.id===id);return <option key={id} value={id}>{filial?.codigo} — {filial?.nome}</option>})}</select></Field>
      <div className="grid grid-cols-2 gap-3"><Field label="Data"><input type="date" className={inputCls} value={f.data} onChange={e=>setF({...f,data:e.target.value})}/></Field><Field label="Tipo"><select className={inputCls} value={f.tipo} onChange={e=>setF({...f,tipo:e.target.value as Post["tipo"]})}>{TIPOS.map(t=><option key={t}>{t}</option>)}</select></Field></div>
      <Field label="Link do Feed / Reel"><input className={inputCls} placeholder="https://instagram.com/..." value={f.linkFeed} onChange={e=>setF({...f,linkFeed:e.target.value})}/></Field>
      <Field label="Link dos Stories"><input className={inputCls} placeholder="Cole o link dos stories, se houver" value={f.linkStories} onChange={e=>setF({...f,linkStories:e.target.value})}/></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Alcance / views"><input type="number" min="0" className={inputCls} value={f.alcance} onChange={e=>setF({...f,alcance:Number(e.target.value)})}/></Field>
        <Field label="Engajamentos"><input type="number" min="0" className={inputCls} value={f.engajamentos} onChange={e=>setF({...f,engajamentos:Number(e.target.value)})}/></Field>
        <Field label="Vendas atribuídas"><input type="number" min="0" className={inputCls} value={f.vendas} onChange={e=>setF({...f,vendas:Number(e.target.value)})}/></Field>
        <Field label="Receita atribuída (R$)"><input type="number" min="0" step="0.01" className={inputCls} value={f.receita} onChange={e=>setF({...f,receita:Number(e.target.value)})}/></Field>
      </div>
      <Btn className="w-full" disabled={!f.linkFeed.trim()&&!f.linkStories.trim()} onClick={salvar}><TrendingUp className="h-4 w-4"/>Salvar e atualizar meu desempenho</Btn>
    </div>
  </Modal>;
}