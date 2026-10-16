import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CalendarDays, CheckCircle2, CircleDot, Clock3, MessageSquare, Plus, Tag, Trash2, UserRound } from "lucide-react";
import { useApp, uid, fmtDate, type Pendencia, type PendenciaStatus } from "@/lib/store";
import { PageHeader, Panel, Btn, Modal, Field, inputCls, Badge, pageHead, Stat } from "@/components/kit";

export const Route = createFileRoute("/pendencias")({
  head: pageHead("Central de Pendências", "Kanban de tarefas da equipe de marketing."),
  component: Page,
});

const COLUNAS: PendenciaStatus[] = ["A fazer","Realizando","Finalizado"];

function Page() {
  const { s, set } = useApp();
  const usuario = s.usuarios.find((u)=>u.id===s.usuarioAtivoId);
  const funcionarioRestrito = s.perfil === "Funcionário" ? usuario?.vinculoId : undefined;
  const funcionarios = s.funcionarios.filter((f)=>!funcionarioRestrito || f.id===funcionarioRestrito);
  const [funcId,setFuncId] = useState(funcionarioRestrito || funcionarios[0]?.id || "");
  const [open,setOpen] = useState(false);
  const [cardId,setCardId] = useState<string|null>(null);

  const func = s.funcionarios.find((f)=>f.id===funcId);
  const pendencias = s.pendencias.filter((p)=>(p.funcionarioId || s.funcionarios.find(f=>f.nome===p.responsavel)?.id)===funcId);
  const total=pendencias.length;
  const fazendo=pendencias.filter(p=>(p.status || (p.feito?"Finalizado":"A fazer"))==="Realizando").length;
  const feitas=pendencias.filter(p=>(p.status || (p.feito?"Finalizado":"A fazer"))==="Finalizado").length;
  const atrasadas=pendencias.filter(p=>(p.status || (p.feito?"Finalizado":"A fazer"))!=="Finalizado" && p.prazo && p.prazo<new Date().toISOString().slice(0,10)).length;
  const card=s.pendencias.find((p)=>p.id===cardId);

  return <>
    <PageHeader title="Central de Pendências" sub="Cada funcionário com seu próprio quadro de tarefas: A Fazer, Realizando e Finalizado" action={(s.perfil!=="Funcionário")?<Btn onClick={()=>setOpen(true)}><Plus className="h-4 w-4"/>Nova tarefa</Btn>:undefined}/>

    <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Stat label="Tarefas" value={String(total)} hint={func?.nome || "Equipe"} />
      <Stat label="Realizando" value={String(fazendo)} hint="em andamento" />
      <Stat label="Finalizadas" value={String(feitas)} hint="entregues" />
      <Stat accent label="Atrasadas" value={String(atrasadas)} hint="precisam de atenção" />
    </div>

    <Panel title="Equipe" className="mb-4">
      <div className="flex flex-wrap gap-2">
        {funcionarios.map((f)=>(
          <button key={f.id} onClick={()=>setFuncId(f.id)} className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${f.id===funcId?"border-primary bg-primary text-primary-foreground":"hover:border-primary"}`}>
            {f.nome} <span className={`ml-1 text-xs ${f.id===funcId?"opacity-80":"text-muted-foreground"}`}>· {f.cargo}</span>
          </button>
        ))}
      </div>
    </Panel>

    <div className="grid gap-4 xl:grid-cols-3">
      {COLUNAS.map((col)=> {
        const itens=pendencias.filter((p)=>(p.status || (p.feito?"Finalizado":"A fazer"))===col).sort((a,b)=>a.prazo.localeCompare(b.prazo));
        return <Panel key={col} title={col} action={<Badge tone={col==="Finalizado"?"success":col==="Realizando"?"warn":"muted"}>{itens.length}</Badge>}>
          <div className="space-y-3">
            {itens.map((p)=>(
              <button key={p.id} onClick={()=>setCardId(p.id)} className="w-full rounded-xl border bg-card p-3 text-left transition hover:border-primary hover:shadow-soft">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="font-semibold">{p.titulo}</div>
                  <Badge tone={p.prioridade==="Alta"?"primary":p.prioridade==="Média"?"warn":"muted"}>{p.prioridade}</Badge>
                </div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1"><Tag className="h-3.5 w-3.5"/>{p.area}</div>
                  <div className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5"/>{fmtDate(p.prazo)}</div>
                  {!!p.checklist?.length && <div className="flex items-center gap-1"><CheckCircle2 className="h-3.5 w-3.5"/>{p.checklist.filter(x=>x.feito).length}/{p.checklist.length} checklist</div>}
                </div>
              </button>
            ))}
            {!itens.length&&<div className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">Nenhuma tarefa em {col.toLowerCase()}.</div>}
          </div>
        </Panel>
      })}
    </div>

    <TaskModal open={open} onClose={()=>setOpen(false)} funcionarioId={funcId}/>
    <DetailModal card={card} onClose={()=>setCardId(null)}/>
  </>;
}

function TaskModal({open,onClose,funcionarioId}:{open:boolean;onClose:()=>void;funcionarioId:string}) {
  const { s,set }=useApp();
  const initialFunc = funcionarioId || s.funcionarios[0]?.id || "";
  const [f,setF]=useState({
    titulo:"", funcionarioId:initialFunc, prazo:"", prioridade:"Média" as Pendencia["prioridade"],
    area:"Geral", descricao:"", status:"A fazer" as PendenciaStatus,
  });

  const salvar=()=>{
    const func=s.funcionarios.find(x=>x.id===f.funcionarioId);
    if(!f.titulo.trim()||!func)return;
    const item:Pendencia={id:uid(),titulo:f.titulo.trim(),responsavel:func.nome,funcionarioId:func.id,prazo:f.prazo,prioridade:f.prioridade,feito:f.status==="Finalizado",status:f.status,area:f.area,descricao:f.descricao,checklist:[],comentarios:[]};
    set(st=>({
      ...st,
      pendencias:[...st.pendencias,item],
      funcionarios:st.funcionarios.map((x)=>x.id===func.id?{
        ...x,
        atividades:[...x.atividades,{
          id:`task-${item.id}`,
          titulo:item.titulo,
          data:item.prazo || new Date().toISOString().slice(0,10),
          feito:item.status==="Finalizado",
          status:item.status,
          sourcePendenciaId:item.id,
          area:item.area,
          descricao:item.descricao,
          prioridade:item.prioridade,
          checklist:item.checklist || [],
        }],
      }:x),
    }));
    onClose();
  };

  return <Modal open={open} onClose={onClose} title="Nova tarefa">
    <div className="space-y-3">
      <Field label="Título"><input className={inputCls} value={f.titulo} onChange={e=>setF({...f,titulo:e.target.value})}/></Field>
      <Field label="Responsável"><select className={inputCls} value={f.funcionarioId} onChange={e=>setF({...f,funcionarioId:e.target.value})}>{s.funcionarios.map(x=><option key={x.id} value={x.id}>{x.nome} — {x.cargo}</option>)}</select></Field>
      <Field label="Descrição"><textarea rows={3} className={inputCls} value={f.descricao} onChange={e=>setF({...f,descricao:e.target.value})}/></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Prazo"><input type="date" className={inputCls} value={f.prazo} onChange={e=>setF({...f,prazo:e.target.value})}/></Field>
        <Field label="Prioridade"><select className={inputCls} value={f.prioridade} onChange={e=>setF({...f,prioridade:e.target.value as Pendencia["prioridade"]})}><option>Alta</option><option>Média</option><option>Baixa</option></select></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Área"><input className={inputCls} placeholder="Ex.: Campanhas" value={f.area} onChange={e=>setF({...f,area:e.target.value})}/></Field>
        <Field label="Status inicial"><select className={inputCls} value={f.status} onChange={e=>setF({...f,status:e.target.value as PendenciaStatus})}>{COLUNAS.map(x=><option key={x}>{x}</option>)}</select></Field>
      </div>
      <Btn className="w-full" onClick={salvar}><Plus className="h-4 w-4"/>Criar tarefa</Btn>
    </div>
  </Modal>;
}

function DetailModal({card,onClose}:{card?:Pendencia;onClose:()=>void}) {
  const { s,set }=useApp();
  const [novoItem,setNovoItem]=useState("");
  const [comentario,setComentario]=useState("");
  if(!card)return null;

  const atualizar=(patch:Partial<Pendencia>)=>set(st=>{
    const updated = { ...card, ...patch };
    return {
      ...st,
      pendencias:st.pendencias.map(p=>p.id===card.id?updated:p),
      funcionarios:st.funcionarios.map((f)=>f.id===updated.funcionarioId?{
        ...f,
        atividades:f.atividades.map((a)=>a.sourcePendenciaId===card.id?{
          ...a,
          titulo:updated.titulo,
          data:updated.prazo || a.data,
          feito:(updated.status || (updated.feito?"Finalizado":"A fazer"))==="Finalizado",
          status:updated.status || (updated.feito?"Finalizado":"A fazer"),
          area:updated.area,
          descricao:updated.descricao,
          prioridade:updated.prioridade,
          checklist:updated.checklist || [],
        }:a),
      }:f),
    };
  });
  const funcionario=s.funcionarios.find(f=>f.id===card.funcionarioId);

  return <Modal open={!!card} onClose={onClose} title={card.titulo} wide>
    <div className="grid gap-4 lg:grid-cols-[1.3fr_.7fr]">
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Badge tone="primary">{funcionario?.nome || card.responsavel}</Badge>
          <Badge>{card.area}</Badge>
          <Badge tone={card.prioridade==="Alta"?"primary":card.prioridade==="Média"?"warn":"muted"}>{card.prioridade}</Badge>
        </div>
        <Field label="Descrição"><textarea rows={4} className={inputCls} value={card.descricao||""} onChange={e=>atualizar({descricao:e.target.value})}/></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Prazo"><input type="date" className={inputCls} value={card.prazo} onChange={e=>atualizar({prazo:e.target.value})}/></Field>
          <Field label="Status"><select className={inputCls} value={card.status || (card.feito?"Finalizado":"A fazer")} onChange={e=>{const status=e.target.value as PendenciaStatus;atualizar({status,feito:status==="Finalizado"})}}>{COLUNAS.map(x=><option key={x}>{x}</option>)}</select></Field>
        </div>

        <Panel title="Checklist">
          <div className="space-y-2">
            {(card.checklist||[]).map(x=><label key={x.id} className="flex items-center gap-2 rounded-md border p-2 text-sm"><input type="checkbox" checked={x.feito} onChange={()=>atualizar({checklist:(card.checklist||[]).map(i=>i.id===x.id?{...i,feito:!i.feito}:i)})}/><span className={x.feito?"line-through text-muted-foreground":""}>{x.texto}</span></label>)}
            <div className="flex gap-2"><input className={inputCls} placeholder="Adicionar item" value={novoItem} onChange={e=>setNovoItem(e.target.value)}/><Btn variant="outline" onClick={()=>{if(!novoItem.trim())return;atualizar({checklist:[...(card.checklist||[]),{id:uid(),texto:novoItem.trim(),feito:false}]});setNovoItem("")}}>Adicionar</Btn></div>
          </div>
        </Panel>
      </div>

      <div className="space-y-4">
        <Panel title="Resumo">
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2"><UserRound className="h-4 w-4 text-muted-foreground"/><span>{funcionario?.nome || card.responsavel}</span></div>
            <div className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-muted-foreground"/><span>{fmtDate(card.prazo)}</span></div>
            <div className="flex items-center gap-2"><CircleDot className="h-4 w-4 text-muted-foreground"/><span>{card.status || (card.feito?"Finalizado":"A fazer")}</span></div>
          </div>
        </Panel>
        <Panel title="Comentários">
          <div className="space-y-2">
            {(card.comentarios||[]).map(c=><div key={c.id} className="rounded-md bg-muted p-2 text-sm"><b>{c.autor}</b><div>{c.texto}</div><div className="mt-1 text-[11px] text-muted-foreground">{new Date(c.data).toLocaleString("pt-BR")}</div></div>)}
            <textarea rows={3} className={inputCls} placeholder="Adicionar comentário" value={comentario} onChange={e=>setComentario(e.target.value)}/>
            <Btn variant="outline" className="w-full" onClick={()=>{if(!comentario.trim())return;atualizar({comentarios:[...(card.comentarios||[]),{id:uid(),autor:s.usuarios.find(u=>u.id===s.usuarioAtivoId)?.nome||s.perfil,texto:comentario.trim(),data:new Date().toISOString()}]});setComentario("")}}><MessageSquare className="h-4 w-4"/>Comentar</Btn>
          </div>
        </Panel>
        {s.perfil!=="Funcionário"&&<Btn variant="outline" className="w-full" onClick={()=>{set(st=>({
          ...st,
          pendencias:st.pendencias.filter(p=>p.id!==card.id),
          funcionarios:st.funcionarios.map((f)=>({...f,atividades:f.atividades.filter((a)=>a.sourcePendenciaId!==card.id)})),
        }));onClose()}}><Trash2 className="h-4 w-4"/>Excluir tarefa</Btn>}
      </div>
    </div>
  </Modal>;
}