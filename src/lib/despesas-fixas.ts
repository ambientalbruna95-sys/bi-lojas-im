import type { DespesaFixa } from "@/lib/store";

const meses = { Mensal:1, Trimestral:3, Semestral:6, Anual:12 } as const;

function ymToIndex(ym:string){
  const [y,m]=ym.slice(0,7).split("-").map(Number);
  return y*12+(m-1);
}

export function competenciaAtiva(d:DespesaFixa, competencia:string){
  if(!d.ativa || !d.inicio) return false;
  const inicio=d.inicio.slice(0,7);
  const diff=ymToIndex(competencia)-ymToIndex(inicio);
  if(diff<0) return false;
  if(d.recorrente===false) return competencia===inicio;
  return diff%(meses[d.frequencia]||1)===0;
}

export function dataLembreteCompetencia(d:DespesaFixa, competencia:string){
  const vencimento=vencimentoCompetencia(d,competencia);
  const dt=new Date(vencimento+"T12:00:00");
  dt.setDate(dt.getDate()-Math.max(0,d.alertarDiasAntes||0));
  return dt.toISOString().slice(0,10);
}

export function vencimentoCompetencia(d:DespesaFixa, competencia:string){
  const [ano,mes]=competencia.split("-").map(Number);
  const ultimo=new Date(ano,mes,0).getDate();
  const dia=Math.min(Math.max(1,d.diaVencimento||1),ultimo);
  return `${competencia}-${String(dia).padStart(2,"0")}`;
}

export function pagaNaCompetencia(d:DespesaFixa, competencia:string){
  return d.pagamentos?.some((p)=>p.competencia===competencia) || false;
}

export function despesaAlertaAtual(d:DespesaFixa, hojeIso:string){
  const atual=hojeIso.slice(0,7);
  if(competenciaAtiva(d,atual) && !pagaNaCompetencia(d,atual)){
    const vencimento=vencimentoCompetencia(d,atual);
    const dias=Math.ceil((new Date(vencimento+"T12:00:00").getTime()-new Date(hojeIso+"T12:00:00").getTime())/86400000);
    if(dias<=Math.max(0,d.alertarDiasAntes||0)) return {competencia:atual,vencimento,dias};
  }

  const [y,m]=atual.split("-").map(Number);
  for(let i=1;i<=12;i++){
    const dt=new Date(y,m-1+i,1);
    const comp=`${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,"0")}`;
    if(competenciaAtiva(d,comp) && !pagaNaCompetencia(d,comp)){
      const vencimento=vencimentoCompetencia(d,comp);
      const dias=Math.ceil((new Date(vencimento+"T12:00:00").getTime()-new Date(hojeIso+"T12:00:00").getTime())/86400000);
      if(dias<=Math.max(0,d.alertarDiasAntes||0)) return {competencia:comp,vencimento,dias};
      return null;
    }
  }
  return null;
}