import { uid, type AppState, type Atividade, type PendenciaStatus } from "@/lib/store";

export type ImzinhoAction =
  | { type:"create_activity"; employeeId:string; title:string; date?:string; time?:string; priority?:"Alta"|"Média"|"Baixa"; description?:string }
  | { type:"transfer_activity"; activityId:string; fromEmployeeId?:string; toEmployeeId:string }
  | { type:"update_activity"; activityId:string; employeeId?:string; fields:{ title?:string; date?:string; time?:string; priority?:"Alta"|"Média"|"Baixa"; description?:string } }
  | { type:"set_activity_status"; activityId:string; employeeId?:string; status:PendenciaStatus };

type Result={ok:boolean;state:AppState;message:string};
const GESTORES=new Set(["Master","Diretoria","Gerente de Marketing","Coordenação"]);

function findActivity(s:AppState,id:string,employeeId?:string){
  if(employeeId){
    const employee=s.funcionarios.find(f=>f.id===employeeId);
    const activity=employee?.atividades.find(a=>a.id===id);
    if(employee&&activity)return{employee,activity};
  }
  for(const employee of s.funcionarios){
    const activity=employee.atividades.find(a=>a.id===id);
    if(activity)return{employee,activity};
  }
}
const empName=(s:AppState,id?:string)=>s.funcionarios.find(f=>f.id===id)?.nome||id||"colaborador";
const recalcCard=<T extends {checklist:{feito:boolean;statusAtividade?:PendenciaStatus}[];status:string}>(card:T):T=>{
  if(!card.checklist.length)return card;
  const todos=card.checklist.every(i=>i.feito);
  const algum=card.checklist.some(i=>i.feito||i.statusAtividade==="Realizando");
  return {...card,status:todos?"Concluído":algum?"Em andamento":"A fazer"} as T;
};
const recalcParent=(a:Atividade,checklist:NonNullable<Atividade["checklist"]>)=>{
  const todos=checklist.length>0&&checklist.every(i=>i.feito);
  const algum=checklist.some(i=>i.feito||i.statusAtividade==="Realizando");
  return {...a,checklist,feito:todos,status:todos?"Finalizado":algum?"Realizando":"A fazer"} as Atividade;
};
const gestor=(s:AppState)=>GESTORES.has(s.perfil);
const actorEmployee=(s:AppState)=>s.usuarios.find(u=>u.id===s.usuarioAtivoId)?.vinculoId;

export function describeImzinhoAction(s:AppState,a:ImzinhoAction){
  if(a.type==="create_activity"){
    const d=[a.date?a.date.split("-").reverse().join("/"):"",a.time||"",a.priority||"Média"].filter(Boolean).join(" · ");
    return{title:`Criar atividade para ${empName(s,a.employeeId)}`,details:`${a.title}${d?` · ${d}`:""}`};
  }
  const found=findActivity(s,a.activityId,a.type==="transfer_activity"?a.fromEmployeeId:a.employeeId);
  const titulo=found?.activity.titulo||"Atividade";
  const atual=found?.employee.nome||"colaborador";
  if(a.type==="transfer_activity")return{title:`Transferir para ${empName(s,a.toEmployeeId)}`,details:`${titulo} · atualmente com ${atual}`};
  if(a.type==="set_activity_status")return{title:a.status==="Finalizado"?"Finalizar atividade":a.status==="Realizando"?"Iniciar atividade":"Reabrir atividade",details:`${titulo} · ${atual}`};
  const m=[a.fields.title?`título: ${a.fields.title}`:"",a.fields.date?`prazo: ${a.fields.date.split("-").reverse().join("/")}`:"",a.fields.time?`horário: ${a.fields.time}`:"",a.fields.priority?`prioridade: ${a.fields.priority}`:""].filter(Boolean).join(" · ");
  return{title:"Alterar atividade",details:`${titulo}${m?` · ${m}`:""}`};
}

export function executeImzinhoAction(s:AppState,a:ImzinhoAction):Result{
  const actor=s.usuarios.find(u=>u.id===s.usuarioAtivoId);
  if(a.type==="create_activity"){
    if(!gestor(s))return{ok:false,state:s,message:"Seu perfil não tem permissão para criar atividades para a equipe."};
    const target=s.funcionarios.find(f=>f.id===a.employeeId);
    if(!target)return{ok:false,state:s,message:"Não encontrei o colaborador escolhido."};
    const activity:Atividade={id:uid(),titulo:a.title.trim(),data:a.date||new Date().toISOString().slice(0,10),horario:a.time||undefined,feito:false,status:"A fazer",origem:"Manual",descricao:a.description?.trim()||`Criada via IMzinho por ${actor?.nome||s.perfil}.`,prioridade:a.priority||"Média",checklist:[]};
    return{ok:true,state:{...s,funcionarios:s.funcionarios.map(f=>f.id===target.id?{...f,atividades:[...f.atividades,activity]}:f)},message:`Bão demais! Atividade “${activity.titulo}” criada para ${target.nome}.`};
  }

  const found=findActivity(s,a.activityId,a.type==="transfer_activity"?a.fromEmployeeId:a.employeeId);
  if(!found)return{ok:false,state:s,message:"Não encontrei essa atividade no quadro atual."};
  const {employee,activity}=found;
  if(!gestor(s)&&!(a.type==="set_activity_status"&&actorEmployee(s)===employee.id))return{ok:false,state:s,message:"Seu perfil não tem permissão para fazer essa alteração."};

  if(a.type==="transfer_activity"){
    const target=s.funcionarios.find(f=>f.id===a.toEmployeeId);
    if(!target)return{ok:false,state:s,message:"Não encontrei o colaborador de destino."};
    if(target.id===employee.id)return{ok:false,state:s,message:"Essa atividade já está com esse colaborador."};

    if(activity.sourceAtividadeId&&activity.sourceAtividadeOwnerId&&activity.sourceAtividadeChecklistItemId){
      return{ok:true,state:{...s,funcionarios:s.funcionarios.map(f=>f.id===activity.sourceAtividadeOwnerId?{...f,atividades:f.atividades.map(x=>x.id===activity.sourceAtividadeId?{...x,checklist:(x.checklist||[]).map(i=>i.id===activity.sourceAtividadeChecklistItemId?{...i,responsavelId:target.id,responsavel:target.nome}:i)}:x)}:f)},message:`Uaiii, transferido! “${activity.titulo}” agora é do ${target.nome}.`};
    }
    if(activity.sourceReinauguracaoId&&activity.sourceReinauguracaoCardId){
      return{ok:true,state:{...s,reinauguracoes:s.reinauguracoes.map(r=>r.id===activity.sourceReinauguracaoId?{...r,cards:r.cards.map(card=>{
        if(card.id!==activity.sourceReinauguracaoCardId)return card;
        if(activity.sourceReinauguracaoItemId)return{...card,checklist:card.checklist.map(i=>i.id===activity.sourceReinauguracaoItemId?{...i,responsavelId:target.id,responsavel:target.nome}:i)};
        const antigo=employee.nome.trim().toUpperCase();
        return{...card,responsaveis:[...card.responsaveis.filter(n=>n.trim().toUpperCase()!==antigo),target.nome.toUpperCase()]};
      })}:r)},message:`Bão demais! “${activity.titulo}” foi transferida para ${target.nome} e a Reinauguração foi atualizada junto.`};
    }
    if(activity.sourcePendenciaId)return{ok:true,state:{...s,pendencias:s.pendencias.map(p=>p.id===activity.sourcePendenciaId?{...p,funcionarioId:target.id,responsavel:target.nome}:p)},message:`Transferido! “${activity.titulo}” agora está com ${target.nome}.`};
    if(activity.sourceRotinaId)return{ok:true,state:{...s,rotinasDiarias:s.rotinasDiarias.map(r=>r.id===activity.sourceRotinaId?{...r,funcionarioId:target.id}:r),funcionarios:s.funcionarios.map(f=>f.id===employee.id?{...f,atividades:f.atividades.filter(x=>x.id!==activity.id)}:f)},message:`Uaiii, rotina fixa transferida para ${target.nome}.`};
    return{ok:true,state:{...s,funcionarios:s.funcionarios.map(f=>f.id===employee.id?{...f,atividades:f.atividades.filter(x=>x.id!==activity.id)}:f).map(f=>f.id===target.id?{...f,atividades:[...f.atividades,activity]}:f)},message:`Bão demais! “${activity.titulo}” foi transferida para ${target.nome}.`};
  }

  if(a.type==="set_activity_status"){
    const status=a.status,feito=status==="Finalizado";
    if(activity.sourceAtividadeId&&activity.sourceAtividadeOwnerId&&activity.sourceAtividadeChecklistItemId){
      return{ok:true,state:{...s,funcionarios:s.funcionarios.map(f=>f.id===activity.sourceAtividadeOwnerId?{...f,atividades:f.atividades.map(x=>{
        if(x.id!==activity.sourceAtividadeId)return x;
        const checklist=(x.checklist||[]).map(i=>i.id===activity.sourceAtividadeChecklistItemId?{...i,feito,statusAtividade:status}:i);
        return recalcParent(x,checklist);
      })}:f)},message:`${feito?"Finalizada":"Atualizada"}! “${activity.titulo}” foi marcada como ${status}.`};
    }
    if(activity.sourceReinauguracaoId&&activity.sourceReinauguracaoCardId){
      return{ok:true,state:{...s,reinauguracoes:s.reinauguracoes.map(r=>r.id===activity.sourceReinauguracaoId?{...r,cards:r.cards.map(card=>{
        if(card.id!==activity.sourceReinauguracaoCardId)return card;
        if(activity.sourceReinauguracaoItemId){const checklist=card.checklist.map(i=>i.id===activity.sourceReinauguracaoItemId?{...i,feito,statusAtividade:status}:i);return recalcCard({...card,checklist});}
        return{...card,status:status==="Finalizado"?"Concluído":status==="Realizando"?"Em andamento":"A fazer"};
      })}:r)},message:`${feito?"Finalizada":"Atualizada"}! A Reinauguração também foi sincronizada.`};
    }
    if(activity.sourcePendenciaId)return{ok:true,state:{...s,pendencias:s.pendencias.map(p=>p.id===activity.sourcePendenciaId?{...p,status,feito}:p)},message:`${feito?"Finalizada":"Atualizada"}! “${activity.titulo}” agora está como ${status}.`};
    return{ok:true,state:{...s,funcionarios:s.funcionarios.map(f=>f.id===employee.id?{...f,atividades:f.atividades.map(x=>x.id===activity.id?{...x,status,feito}:x)}:f)},message:`${feito?"Bão demais, finalizada":"Atualizada"}! “${activity.titulo}” agora está como ${status}.`};
  }

  const fields=a.fields;
  let next=s;
  if(activity.sourceAtividadeId&&activity.sourceAtividadeOwnerId&&activity.sourceAtividadeChecklistItemId){
    next={...s,funcionarios:s.funcionarios.map(f=>f.id===activity.sourceAtividadeOwnerId?{...f,atividades:f.atividades.map(x=>x.id===activity.sourceAtividadeId?{...x,prioridade:fields.priority||x.prioridade,descricao:fields.description??x.descricao,checklist:(x.checklist||[]).map(i=>i.id===activity.sourceAtividadeChecklistItemId?{...i,texto:fields.title??i.texto,prazo:fields.date??i.prazo,horario:fields.time??i.horario}:i)}:x)}:f)};
  }else if(activity.sourceReinauguracaoId&&activity.sourceReinauguracaoCardId){
    next={...s,reinauguracoes:s.reinauguracoes.map(r=>r.id===activity.sourceReinauguracaoId?{...r,cards:r.cards.map(card=>{
      if(card.id!==activity.sourceReinauguracaoCardId)return card;
      if(activity.sourceReinauguracaoItemId)return{...card,checklist:card.checklist.map(i=>i.id===activity.sourceReinauguracaoItemId?{...i,texto:fields.title??i.texto,prazo:fields.date??i.prazo,horario:fields.time??i.horario}:i)};
      return{...card,titulo:fields.title??card.titulo,prazo:fields.date??card.prazo,descricao:fields.description??card.descricao};
    })}:r),funcionarios:s.funcionarios.map(f=>f.id===employee.id?{...f,atividades:f.atividades.map(x=>x.id===activity.id?{...x,prioridade:fields.priority||x.prioridade,horario:fields.time??x.horario}:x)}:f)};
  }else if(activity.sourcePendenciaId){
    next={...s,pendencias:s.pendencias.map(p=>p.id===activity.sourcePendenciaId?{...p,titulo:fields.title??p.titulo,prazo:fields.date??p.prazo,prioridade:fields.priority??p.prioridade,descricao:fields.description??p.descricao}:p)};
  }else if(activity.sourceRotinaId){
    next={...s,rotinasDiarias:s.rotinasDiarias.map(r=>r.id===activity.sourceRotinaId?{...r,titulo:fields.title??r.titulo,horario:fields.time??r.horario,prioridade:fields.priority??r.prioridade,descricao:fields.description??r.descricao}:r),funcionarios:s.funcionarios.map(f=>f.id===employee.id?{...f,atividades:f.atividades.map(x=>x.id===activity.id?{...x,data:fields.date??x.data}:x)}:f)};
  }else{
    next={...s,funcionarios:s.funcionarios.map(f=>f.id===employee.id?{...f,atividades:f.atividades.map(x=>x.id===activity.id?{...x,titulo:fields.title??x.titulo,data:fields.date??x.data,horario:fields.time??x.horario,prioridade:fields.priority??x.prioridade,descricao:fields.description??x.descricao}:x)}:f)};
  }
  return{ok:true,state:next,message:`Prontinho! Atualizei “${fields.title||activity.titulo}”.`};
}