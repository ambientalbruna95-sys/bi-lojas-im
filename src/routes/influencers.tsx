import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BarChart3, ExternalLink, Plus, Search, Store, TrendingUp, UserRound } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useApp, brl, num, uid, type Post } from "@/lib/store";
import { PageHeader, Panel, Stat, Btn, Modal, Field, inputCls, Badge, pageHead } from "@/components/kit";

export const Route = createFileRoute("/influencers")({ head: pageHead("Influencers", "Gestão e desempenho das influencers das Lojas IM."), component: Page });
const TIPOS: Post["tipo"][] = ["Reel","Feed","Stories","TikTok","YouTube"];

function Page() {
  const { s } = useApp();
  const influencerOnly = s.perfil === "Influencer";
  const [modo,setModo] = useState<"filial"|"influencer">("filial");
  const [q,setQ] = useState("");
  const [detalhe,setDetalhe] = useState(influencerOnly ? s.influencerAtivaId : "");
  const [postOpen,setPostOpen] = useState(false);

  const totalInvestido = s.influencers.reduce((a,i)=>a+i.vinculos.reduce((b,v)=>b+v.valor,0),0);
  const mensal = s.influencers.reduce((a,i)=>a+i.vinculos.filter(v=>v.contrato==="Mensal").reduce((b,v)=>b+v.valor,0),0);
  const esporadico = s.influencers.reduce((a,i)=>a+i.vinculos.filter(v=>v.contrato==="Esporádico").reduce((b,v)=>b+v.valor,0),0);
  const cobertura = new Set(s.influencers.flatMap(i=>i.filialIds)).size;
  const receita = s.influencers.reduce((a,i)=>a+i.posts.reduce((b,p)=>b+(p.receitaAtribuida||0),0),0);

  const ranking = useMemo(()=>s.influencers.map(i=>{
    const investimento=i.vinculos.reduce((a,v)=>a+v.valor,0);
    const alcance=i.posts.reduce((a,p)=>a+(p.alcance??p.views??0),0);
    const eng=i.posts.reduce((a,p)=>a+(p.engajamentos??p.likes+p.comentarios),0);
    const rec=i.posts.reduce((a,p)=>a+(p.receitaAtribuida||0),0);
    return {...i,investimento,alcance,eng,rec,retorno:investimento&&rec?rec/investimento:0};
  }).sort((a,b)=>b.alcance-a.alcance),[s.influencers]);

  if (influencerOnly) {
    const inf=s.influencers.find(i=>i.id===s.influencerAtivaId);
    if(!inf) return <PageHeader title="Minha área" sub="Perfil de influencer não encontrado." />;
    return <>
      <PageHeader title={`Minha área · ${inf.nome}`} sub="Seus combinados, entregas, links e desempenho" action={<Btn onClick={()=>setPostOpen(true)}><Plus className="h-4 w-4"/>Registrar postagem</Btn>} />
      <InfluencerDetail infId={inf.id} embedded />
      <PostModal open={postOpen} onClose={()=>setPostOpen(false)} influencerId={inf.id}/>
    </>;
  }

  const cardsFiliais = s.filiais.filter(f=>!f.isCD).map(f=>({
    filial:f,
    influ:s.influencers.filter(i=>i.filialIds.includes(f.id))
  })).filter(x=>x.influ.length);

  const filteredInf = s.influencers.filter(i => (i.nome+" "+i.handle).toLowerCase().includes(q.toLowerCase()));
  const filteredFiliais = cardsFiliais.filter(x => (x.filial.nome+" "+x.filial.codigo+" "+x.influ.map(i=>i.nome).join(" ")).toLowerCase().includes(q.toLowerCase()));

  return <>
    <PageHeader title="Influencers" sub="Visão simples por filial ou por influencer" />
    <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
      <Stat accent label="Total investido" value={brl(totalInvestido)} hint="acordos cadastrados" />
      <Stat label="Mensal contratado" value={brl(mensal)} hint="contratos mensais" />
      <Stat label="Esporádico" value={brl(esporadico)} hint="ações pontuais" />
      <Stat label="Cobertura" value={`${cobertura} filiais`} hint={`${s.influencers.length} influencers`} />
      <Stat label="Receita rastreável" value={brl(receita)} hint="quando houver atribuição direta" />
    </div>

    <Panel title="Consultar" className="mb-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div className="flex gap-2">
          <Btn variant={modo==="filial"?"primary":"outline"} onClick={()=>setModo("filial")}><Store className="h-4 w-4"/>Por filial</Btn>
          <Btn variant={modo==="influencer"?"primary":"outline"} onClick={()=>setModo("influencer")}><UserRound className="h-4 w-4"/>Por influencer</Btn>
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground"/>
          <input className={`${inputCls} pl-9`} placeholder="Buscar filial, influencer ou @" value={q} onChange={e=>setQ(e.target.value)}/>
        </div>
      </div>
    </Panel>

    {modo==="filial" ? (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filteredFiliais.map(({filial,influ})=>(
          <div key={filial.id} className="rounded-xl border bg-card p-4 shadow-soft">
            <div className="mb-3"><div className="text-xs font-bold uppercase tracking-wider text-primary">Filial {filial.codigo}</div><div className="font-display text-lg font-bold">{filial.nome}</div></div>
            <div className="space-y-2">
              {influ.map(i=>{
                const v=i.vinculos.find(v=>v.filialId===filial.id)!;
                return <button key={i.id} onClick={()=>setDetalhe(i.id)} className="w-full rounded-lg border p-3 text-left transition hover:border-primary">
                  <div className="flex justify-between gap-2"><div><b>{i.nome}</b><div className="text-xs text-muted-foreground">{i.handle}</div></div><div className="font-bold text-primary">{brl(v.valor)}</div></div>
                  <div className="mt-2 text-xs text-muted-foreground">{v.pacote}</div>
                  <div className="mt-1 text-xs">{v.frequencia}</div>
                </button>;
              })}
            </div>
          </div>
        ))}
      </div>
    ) : (
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {filteredInf.map(i=>{
          const invest=i.vinculos.reduce((a,v)=>a+v.valor,0);
          return <button key={i.id} onClick={()=>setDetalhe(i.id)} className="rounded-xl border bg-card p-4 text-left shadow-soft transition hover:border-primary">
            <div className="flex items-start justify-between gap-3"><div><div className="font-display text-lg font-bold">{i.nome}</div><div className="text-sm text-muted-foreground">{i.handle}</div></div><div className="text-right"><div className="font-bold text-primary">{brl(invest)}</div><div className="text-xs text-muted-foreground">{i.filialIds.length} filial(is)</div></div></div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs"><div className="rounded bg-muted p-2">Entregas: <b>{i.posts.length}</b></div><div className="rounded bg-muted p-2">Frequência: <b>{i.frequencia}</b></div></div>
          </button>;
        })}
      </div>
    )}

    <Panel title="Ranking de desempenho" className="mt-4">
      <div className="overflow-x-auto"><table className="w-full min-w-[780px] text-sm">
        <thead><tr className="border-b text-left text-xs uppercase text-muted-foreground"><th className="pb-2">#</th><th>Influencer</th><th>Investimento</th><th>Entregas</th><th>Alcance</th><th>Engaj.</th><th>Receita</th><th>Retorno</th></tr></thead>
        <tbody>{ranking.map((i,idx)=><tr key={i.id} className="border-b last:border-0"><td className="py-2 font-bold">{idx+1}</td><td><button className="text-left" onClick={()=>setDetalhe(i.id)}><b>{i.nome}</b><div className="text-xs text-muted-foreground">{i.handle}</div></button></td><td>{brl(i.investimento)}</td><td>{i.posts.length}</td><td>{num(i.alcance)}</td><td>{num(i.eng)}</td><td>{brl(i.rec)}</td><td>{i.retorno?`${i.retorno.toFixed(2)}x`:"—"}</td></tr>)}</tbody>
      </table></div>
    </Panel>

    <Modal open={!!detalhe} onClose={()=>setDetalhe("")} title="Detalhes da influencer" wide>
      {detalhe && <InfluencerDetail infId={detalhe} onPost={()=>setPostOpen(true)} />}
    </Modal>
    {detalhe && <PostModal open={postOpen} onClose={()=>setPostOpen(false)} influencerId={detalhe}/>}
  </>;
}

function InfluencerDetail({infId,embedded=false,onPost}:{infId:string;embedded?:boolean;onPost?:()=>void}) {
  const { s } = useApp();
  const inf=s.influencers.find(i=>i.id===infId)!;
  const alcance=inf.posts.reduce((a,p)=>a+(p.alcance??p.views??0),0);
  const eng=inf.posts.reduce((a,p)=>a+(p.engajamentos??p.likes+p.comentarios),0);
  const rec=inf.posts.reduce((a,p)=>a+(p.receitaAtribuida||0),0);
  const vendas=inf.posts.reduce((a,p)=>a+(p.vendasAtribuidas||0),0);
  const investimento=inf.vinculos.reduce((a,v)=>a+v.valor,0);
  const graf=inf.posts.map((p,idx)=>({nome:`${p.tipo} ${idx+1}`,alcance:p.alcance??p.views??0,receita:p.receitaAtribuida||0}));

  return <div className={embedded?"space-y-4":"space-y-4"}>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><div className="font-display text-2xl font-bold">{inf.nome}</div><div className="text-sm text-muted-foreground">{inf.handle}</div></div>
      {onPost && <Btn onClick={onPost}><Plus className="h-4 w-4"/>Registrar postagem</Btn>}
    </div>
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      <Stat accent label="Investimento" value={brl(investimento)} hint={`${inf.vinculos.length} vínculo(s)`} />
      <Stat label="Entregas" value={String(inf.posts.length)} />
      <Stat label="Alcance" value={num(alcance)} />
      <Stat label="Vendas atribuídas" value={String(vendas)} />
      <Stat label="Receita atribuída" value={brl(rec)} />
    </div>
    <div className="grid gap-4 lg:grid-cols-2">
      <Panel title="Combinados por filial">
        <div className="space-y-2">{inf.vinculos.map(v=>{
          const filial=s.filiais.find(f=>f.id===v.filialId);
          return <div key={v.filialId} className="rounded-lg border p-3 text-sm">
            <div className="flex justify-between gap-2"><b>{filial?.codigo} — {filial?.nome}</b><b className="text-primary">{brl(v.valor)}</b></div>
            <div className="mt-2"><b>Postagens:</b> {v.pacote}</div>
            <div><b>Dia/Frequência:</b> {v.frequencia}</div>
            <div><b>Contrato:</b> {v.contrato||"—"}</div>
            {v.observacao && <div><b>Obs.:</b> {v.observacao}</div>}
          </div>;
        })}</div>
      </Panel>
      <Panel title="Alcance por postagem">
        <div className="h-64">{graf.length?<ResponsiveContainer><BarChart data={graf}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/><XAxis dataKey="nome" fontSize={11}/><YAxis fontSize={11}/><Tooltip formatter={(v:number)=>num(v)}/><Bar dataKey="alcance" fill="var(--primary)" radius={[4,4,0,0]}/></BarChart></ResponsiveContainer>:<Empty/>}</div>
      </Panel>
    </div>
    <Panel title="Postagens registradas">
      <div className="overflow-x-auto"><table className="w-full min-w-[720px] text-sm"><thead><tr className="border-b text-left text-xs uppercase text-muted-foreground"><th className="pb-2">Data</th><th>Filial</th><th>Tipo</th><th>Link</th><th>Alcance</th><th>Engaj.</th><th>Receita</th></tr></thead>
      <tbody>{inf.posts.map(p=>{const filial=s.filiais.find(f=>f.id===p.filialId);return <tr key={p.id} className="border-b last:border-0"><td className="py-2">{p.data.split("-").reverse().join("/")}</td><td>{filial?.nome||"—"}</td><td><Badge>{p.tipo}</Badge></td><td>{p.link?<a href={p.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary">Abrir <ExternalLink className="h-3 w-3"/></a>:"—"}</td><td>{num(p.alcance??p.views??0)}</td><td>{num(p.engajamentos??p.likes+p.comentarios)}</td><td>{brl(p.receitaAtribuida||0)}</td></tr>})}</tbody></table></div>
      {!inf.posts.length&&<div className="py-8 text-center text-sm text-muted-foreground">Nenhuma postagem registrada ainda.</div>}
    </Panel>
  </div>;
}

function Empty(){return <div className="grid h-full place-items-center text-center text-sm text-muted-foreground"><div><BarChart3 className="mx-auto mb-2 h-8 w-8 opacity-40"/>Os gráficos serão preenchidos conforme as entregas forem registradas.</div></div>}

function PostModal({open,onClose,influencerId}:{open:boolean;onClose:()=>void;influencerId:string}) {
  const { s,set }=useApp();
  const inf=s.influencers.find(i=>i.id===influencerId)!;
  const [f,setF]=useState({filialId:inf?.filialIds[0]??"",tipo:"Reel" as Post["tipo"],linkFeed:"",linkStories:"",data:new Date().toISOString().slice(0,10),alcance:0,engajamentos:0,vendas:0,receita:0});
  const salvar=()=>{
    const novos:Post[]=[];
    if(f.linkFeed.trim()) novos.push({id:uid(),filialId:f.filialId,tipo:f.tipo,link:f.linkFeed.trim(),data:f.data,views:f.alcance,likes:f.engajamentos,comentarios:0,alcance:f.alcance,engajamentos:f.engajamentos,vendasAtribuidas:f.vendas,receitaAtribuida:f.receita});
    if(f.linkStories.trim()) novos.push({id:uid(),filialId:f.filialId,tipo:"Stories",link:f.linkStories.trim(),data:f.data,views:0,likes:0,comentarios:0,alcance:0,engajamentos:0,vendasAtribuidas:0,receitaAtribuida:0});
    if(!novos.length)return;
    set(st=>({...st,influencers:st.influencers.map(i=>i.id===influencerId?{...i,posts:[...i.posts,...novos]}:i)}));onClose();
  };
  return <Modal open={open} onClose={onClose} title="Registrar postagem">
    <div className="space-y-3">
      <Field label="Influencer"><input className={inputCls} value={inf?.nome||""} disabled/></Field>
      <Field label="Filial"><select className={inputCls} value={f.filialId} onChange={e=>setF({...f,filialId:e.target.value})}>{inf?.filialIds.map(id=>{const filial=s.filiais.find(x=>x.id===id);return <option key={id} value={id}>{filial?.codigo} — {filial?.nome}</option>})}</select></Field>
      <div className="grid grid-cols-2 gap-3"><Field label="Data"><input type="date" className={inputCls} value={f.data} onChange={e=>setF({...f,data:e.target.value})}/></Field><Field label="Tipo"><select className={inputCls} value={f.tipo} onChange={e=>setF({...f,tipo:e.target.value as Post["tipo"]})}>{TIPOS.map(t=><option key={t}>{t}</option>)}</select></Field></div>
      <Field label="Link do Feed / Reel"><input className={inputCls} value={f.linkFeed} onChange={e=>setF({...f,linkFeed:e.target.value})}/></Field>
      <Field label="Link dos Stories"><input className={inputCls} value={f.linkStories} onChange={e=>setF({...f,linkStories:e.target.value})}/></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Alcance / views"><input type="number" className={inputCls} value={f.alcance} onChange={e=>setF({...f,alcance:Number(e.target.value)})}/></Field>
        <Field label="Engajamentos"><input type="number" className={inputCls} value={f.engajamentos} onChange={e=>setF({...f,engajamentos:Number(e.target.value)})}/></Field>
        <Field label="Vendas atribuídas"><input type="number" className={inputCls} value={f.vendas} onChange={e=>setF({...f,vendas:Number(e.target.value)})}/></Field>
        <Field label="Receita atribuída"><input type="number" className={inputCls} value={f.receita} onChange={e=>setF({...f,receita:Number(e.target.value)})}/></Field>
      </div>
      <Btn className="w-full" disabled={!f.linkFeed.trim()&&!f.linkStories.trim()} onClick={salvar}><TrendingUp className="h-4 w-4"/>Salvar e atualizar desempenho</Btn>
    </div>
  </Modal>;
}