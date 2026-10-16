import { useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3, Download, FilePenLine, FileSignature, History, ImageUp, PenLine, Plus, RotateCcw, Send, ShieldCheck, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useApp, uid, brl, fmtDate, type ContratoInfluencer, type AssinaturaContrato, type StatusContrato } from "@/lib/store";
import { Badge, Btn, Field, Modal, Panel, Stat, inputCls } from "@/components/kit";

type Mode = "management" | "influencer";

const statusTone = (status:StatusContrato) => {
  if(status==="Vigente") return "success" as const;
  if(status==="Rascunho") return "muted" as const;
  if(status==="Cancelado" || status==="Encerrado") return "primary" as const;
  return "warn" as const;
};

function diasAte(data:string){
  if(!data) return 9999;
  const alvo=new Date(data+"T12:00:00").getTime();
  const hoje=new Date(); hoje.setHours(12,0,0,0);
  return Math.ceil((alvo-hoje.getTime())/86400000);
}

function todasAssinadas(c:ContratoInfluencer){
  return !!(c.assinaturaInfluencer && c.assinaturaEmpresa && c.assinaturaTestemunha1 && c.assinaturaTestemunha2);
}

function temAlgumaAssinatura(c:ContratoInfluencer){
  return !!(c.assinaturaInfluencer || c.assinaturaEmpresa || c.assinaturaTestemunha1 || c.assinaturaTestemunha2);
}

function statusVisual(c:ContratoInfluencer):StatusContrato{
  if(c.status==="Cancelado") return c.status;
  const dias=diasAte(c.fimVigencia);
  if(dias<0 && todasAssinadas(c)) return "Encerrado";
  return c.status;
}

function assinaturaLabel(a?:AssinaturaContrato){
  if(!a) return "Pendente";
  return `${a.nome} · ${new Date(a.assinadoEm).toLocaleString("pt-BR")}`;
}

const contratoVazio = (nome:string) => `CONTRATO DE PRESTAÇÃO DE SERVIÇOS DE PARCERIA PARA DIVULGAÇÃO EM MÍDIAS DIGITAIS

CONTRATANTE: LOJAS IM – ELETRO CASA NOVA LTDA.

CONTRATADO(A): ${nome}

CLÁUSULA PRIMEIRA – DO OBJETO
[Descreva o objeto da parceria.]

CLÁUSULA SEGUNDA – DAS OBRIGAÇÕES DO CONTRATADO
[Descreva entregas, frequência, prazos de aprovação e diretrizes.]

CLÁUSULA TERCEIRA – DAS OBRIGAÇÕES DA CONTRATANTE
[Descreva materiais, aprovações e pagamentos.]

CLÁUSULA QUARTA – DA REMUNERAÇÃO
[Descreva valor, forma e data de pagamento.]

CLÁUSULA QUINTA – DA EXCLUSIVIDADE
[Descreva as regras acordadas.]

CLÁUSULA SEXTA – DA PROPRIEDADE INTELECTUAL
[Descreva cessão e prazo de uso.]

CLÁUSULA SÉTIMA – DA CONFIDENCIALIDADE
[Descreva as regras de sigilo.]

CLÁUSULA OITAVA – DO PRAZO E DA RESCISÃO
[Descreva vigência e condições de rescisão.]

CLÁUSULA NONA – DA CLÁUSULA PENAL
[Descreva penalidades, se houver.]

CLÁUSULA DÉCIMA – DAS DISPOSIÇÕES FINAIS
[Descreva foro e demais disposições.]

ASSINATURAS
CONTRATANTE: ______________________________
CONTRATADO(A): ____________________________`;

function escHtml(v:string){
  return v.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}

function assinaturaHtml(titulo:string,a?:AssinaturaContrato){
  if(!a) return `<div class="assinatura"><div class="rotulo">${escHtml(titulo)}</div><div class="pendente">Aguardando assinatura.</div></div>`;
  const visual=a.modalidade==="Imagem"
    ? `<img src="${a.valor}" alt="Assinatura" />`
    : `<div class="assinatura-digitada">${escHtml(a.valor)}</div>`;
  return `<div class="assinatura"><div class="rotulo">${escHtml(titulo)}</div><div class="assinatura-box">${visual}</div><div class="assinante">${escHtml(a.nome)}</div>${a.cpf?`<div class="cpf">CPF: ${escHtml(a.cpf)}</div>`:""}<div class="data">${new Date(a.assinadoEm).toLocaleString("pt-BR")} · ${escHtml(a.modalidade)}</div></div>`;
}

function abrirContratoParaPdf(c:ContratoInfluencer,influencerNome:string,filialNome:string){
  const w=window.open("","_blank","noopener,noreferrer,width=900,height=1100");
  if(!w){toast.error("O navegador bloqueou a janela do PDF. Libere pop-ups e tente novamente.");return;}
  const conteudo=escHtml(c.conteudo).replace(/\n/g,"<br/>");
  const html=`<!doctype html><html><head><meta charset="utf-8"/><title>${escHtml(c.titulo)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Great+Vibes&family=Inter:wght@400;600;700&display=swap">
  <style>
    @page{size:A4;margin:18mm}
    *{box-sizing:border-box}
    body{font-family:Inter,Arial,sans-serif;color:#151515;background:white;margin:0;font-size:10.5pt;line-height:1.55}
    .topo{border-bottom:2px solid #e51628;padding-bottom:12px;margin-bottom:20px}
    h1{font-size:16pt;margin:0 0 8px}
    .meta{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;font-size:8.5pt}
    .meta div{border:1px solid #ddd;border-radius:7px;padding:7px}.meta b{display:block}
    .doc{white-space:normal}.assinaturas{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:28px;page-break-inside:avoid}
    .assinatura{border-top:1px solid #bbb;padding-top:8px;min-height:125px}.rotulo{font-size:8pt;font-weight:700;text-transform:uppercase;color:#555}
    .assinatura-box{height:72px;display:flex;align-items:center;justify-content:center;margin-top:6px}.assinatura-box img{max-height:65px;max-width:100%}
    .assinatura-digitada{font-family:'Great Vibes',cursive;font-size:31pt;line-height:1;color:#111}.assinante{font-weight:700;text-align:center}.cpf,.data,.pendente{font-size:8pt;color:#666;text-align:center}
    .rodape{margin-top:25px;padding-top:10px;border-top:1px solid #ddd;font-size:7.5pt;color:#666}
    @media print{button{display:none!important}}
  </style></head><body>
  <div class="topo"><h1>${escHtml(c.titulo)}</h1>
  <div class="meta">
    <div><span>Status</span><b>${escHtml(statusVisual(c))}</b></div>
    <div><span>Versão</span><b>${c.versao}</b></div>
    <div><span>Vigência</span><b>${fmtDate(c.inicioVigencia)} a ${fmtDate(c.fimVigencia)}</b></div>
    <div><span>Valor</span><b>${brl(c.valor)}</b></div>
  </div>
  <div style="margin-top:8px;font-size:8.5pt;color:#555">${escHtml(influencerNome)}${filialNome?` · ${escHtml(filialNome)}`:""}</div></div>
  <div class="doc">${conteudo}</div>
  <div class="assinaturas">${assinaturaHtml("Assinatura da influencer",c.assinaturaInfluencer)}${assinaturaHtml("Assinatura da empresa",c.assinaturaEmpresa)}${assinaturaHtml("Testemunha 1",c.assinaturaTestemunha1)}${assinaturaHtml("Testemunha 2",c.assinaturaTestemunha2)}</div>
  <div class="rodape">Documento gerado pelo BI Marketing Lojas IM · versão ${c.versao}. O registro da plataforma contém data/hora e histórico das assinaturas.</div>
  <script>window.onload=()=>setTimeout(()=>window.print(),500);<\/script>
  </body></html>`;
  w.document.open();w.document.write(html);w.document.close();
}

export function ContractHub({mode,influencerId}:{mode:Mode;influencerId?:string}){
  const {s,set}=useApp();
  const [selectedId,setSelectedId]=useState<string|null>(null);
  const [novoOpen,setNovoOpen]=useState(false);
  const [assinaturaOpen,setAssinaturaOpen]=useState(false);
  const [assinaturaLado,setAssinaturaLado]=useState<"influencer"|"empresa"|"testemunha1"|"testemunha2">(mode==="influencer"?"influencer":"empresa");
  const [assinaturaModoInicial,setAssinaturaModoInicial]=useState<"Digitada"|"Imagem">("Digitada");
  const [editing,setEditing]=useState(false);
  const [draftText,setDraftText]=useState("");
  const [filtro,setFiltro]=useState<"Todos"|"Rascunho"|"Pendentes"|"Vigentes"|"A vencer">("Todos");
  const usuario=s.usuarios.find(u=>u.id===s.usuarioAtivoId);
  const podeEditar=mode==="management";

  const contratos=useMemo(()=>{
    const base=mode==="influencer" ? s.contratos.filter(c=>c.influencerId===influencerId) : s.contratos;
    return [...base].sort((a,b)=>(b.atualizadoEm||"").localeCompare(a.atualizadoEm||""));
  },[s.contratos,mode,influencerId]);

  const filtrados=contratos.filter(c=>{
    const st=statusVisual(c);
    const dias=diasAte(c.fimVigencia);
    if(filtro==="Todos") return true;
    if(filtro==="Rascunho") return st==="Rascunho";
    if(filtro==="Pendentes") return st==="Aguardando influencer" || st==="Aguardando empresa" || st==="Aguardando testemunhas";
    if(filtro==="Vigentes") return st==="Vigente";
    return dias>=0 && dias<=30 && st!=="Encerrado" && st!=="Cancelado";
  });

  const selected=s.contratos.find(c=>c.id===selectedId) || null;
  const totalVigentes=contratos.filter(c=>statusVisual(c)==="Vigente").length;
  const totalPendentes=contratos.filter(c=>["Aguardando influencer","Aguardando empresa","Aguardando testemunhas"].includes(statusVisual(c))).length;
  const aVencer=contratos.filter(c=>{const d=diasAte(c.fimVigencia);return d>=0&&d<=30&&statusVisual(c)!=="Encerrado";}).length;

  const updateContract=(id:string,fn:(c:ContratoInfluencer)=>ContratoInfluencer)=>set(st=>({...st,contratos:st.contratos.map(c=>c.id===id?fn(c):c)}));

  const abrirAssinatura=(lado:"influencer"|"empresa"|"testemunha1"|"testemunha2",modalidade:"Digitada"|"Imagem")=>{
    setAssinaturaLado(lado);
    setAssinaturaModoInicial(modalidade);
    setAssinaturaOpen(true);
  };

  const abrir=(id:string)=>{
    setSelectedId(id);
    setEditing(false);
    const c=s.contratos.find(x=>x.id===id);
    setDraftText(c?.conteudo||"");
  };

  const salvarEdicao=()=>{
    if(!selected || mode!=="management" || todasAssinadas(selected) || selected.status==="Cancelado" || selected.status==="Encerrado") return;
    const now=new Date().toISOString();
    updateContract(selected.id,c=>{
      const tinhaAssinatura=temAlgumaAssinatura(c);
      const historico=[...c.historico,{
        id:uid(),
        data:now,
        tipo:"Editado" as const,
        usuario:usuario?.nome||s.perfil,
        detalhe:tinhaAssinatura
          ? "Texto alterado antes da conclusão de todas as assinaturas."
          : "Texto do contrato atualizado antes da conclusão das assinaturas.",
      }];
      if(tinhaAssinatura) historico.push({
        id:uid(),
        data:now,
        tipo:"Assinaturas invalidadas" as const,
        usuario:usuario?.nome||s.perfil,
        detalhe:"As assinaturas já registradas foram invalidadas porque o conteúdo do contrato foi alterado. Todos deverão assinar novamente.",
      });
      return {
        ...c,
        conteudo:draftText,
        status:c.status==="Rascunho"?"Rascunho":"Aguardando influencer",
        assinaturaInfluencer:undefined,
        assinaturaEmpresa:undefined,
        assinaturaTestemunha1:undefined,
        assinaturaTestemunha2:undefined,
        atualizadoEm:now,
        historico,
      };
    });
    setEditing(false);
    toast.success(temAlgumaAssinatura(selected) ? "Contrato atualizado. As assinaturas anteriores foram invalidadas." : "Contrato atualizado.");
  };

  const enviar=()=>{
    if(!selected || selected.status!=="Rascunho") return;
    const now=new Date().toISOString();
    updateContract(selected.id,c=>({...c,status:"Aguardando influencer",atualizadoEm:now,historico:[...c.historico,{id:uid(),data:now,tipo:"Enviado",usuario:usuario?.nome||s.perfil,detalhe:"Enviado para coleta de assinaturas."}]}));
    toast.success("Contrato enviado para assinatura.");
  };

  const novaVersao=()=>{
    if(!selected) return;
    const now=new Date().toISOString();
    updateContract(selected.id,c=>({...c,versao:c.versao+1,status:"Rascunho",assinaturaInfluencer:undefined,assinaturaEmpresa:undefined,assinaturaTestemunha1:undefined,assinaturaTestemunha2:undefined,atualizadoEm:now,historico:[...c.historico,{id:uid(),data:now,tipo:"Nova versão",usuario:usuario?.nome||s.perfil,detalhe:`Versão ${c.versao+1} criada e assinaturas anteriores invalidadas para esta nova versão.`}]}));
    setDraftText(selected.conteudo);
    setEditing(true);
    toast.success("Nova versão criada.");
  };

  return <div className="space-y-4">
    {mode==="management"&&<div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Stat accent label="Contratos" value={String(contratos.length)} hint="cadastrados na plataforma"/>
      <Stat label="Vigentes" value={String(totalVigentes)} hint="com as quatro assinaturas"/>
      <Stat label="Aguardando assinatura" value={String(totalPendentes)} hint="influencer, empresa ou testemunhas"/>
      <Stat label="Finalizando em 30 dias" value={String(aVencer)} hint="atenção para renovação"/>
    </div>}

    <Panel title={mode==="management"?"Central de contratos":"Meus contratos"} action={mode==="management"?<Btn onClick={()=>setNovoOpen(true)}><Plus className="h-4 w-4"/>Novo contrato</Btn>:undefined}>
      <div className="mb-4 flex flex-wrap gap-2">
        {(["Todos","Rascunho","Pendentes","Vigentes","A vencer"] as const).map(x=><button key={x} type="button" onClick={()=>setFiltro(x)} className={`rounded-xl border px-3 py-2 text-xs font-black transition ${filtro===x?"border-primary bg-primary text-white":"border-white/8 text-muted-foreground hover:border-primary/30 hover:text-foreground"}`}>{x}</button>)}
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        {filtrados.map(c=>{
          const inf=s.influencers.find(i=>i.id===c.influencerId);
          const filial=s.filiais.find(f=>f.id===c.filialId);
          const st=statusVisual(c);
          const dias=diasAte(c.fimVigencia);
          return <button key={c.id} type="button" onClick={()=>abrir(c.id)} className="rounded-2xl border border-white/8 bg-white/[.02] p-4 text-left transition hover:-translate-y-0.5 hover:border-primary/35">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate font-display font-black">{c.titulo}</div>
                <div className="mt-1 text-xs text-muted-foreground">{inf?.nome||"Influencer"}{filial?` · ${filial.codigo} · ${filial.nome}`:""}</div>
              </div>
              <Badge tone={statusTone(st)}>{st}</Badge>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
              <div className="rounded-xl bg-black/10 p-2.5"><div className="text-muted-foreground">Vigência</div><b>{fmtDate(c.inicioVigencia)} – {fmtDate(c.fimVigencia)}</b></div>
              <div className="rounded-xl bg-black/10 p-2.5"><div className="text-muted-foreground">Valor</div><b>{brl(c.valor)}</b></div>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] font-bold">
              <span className="rounded-full border border-white/8 px-2 py-1">Versão {c.versao}</span>
              {dias>=0&&dias<=30&&st!=="Encerrado"&&<span className="inline-flex items-center gap-1 rounded-full border border-warn/30 bg-warn/5 px-2 py-1 text-warn"><AlertTriangle className="h-3 w-3"/>vence em {dias} dia(s)</span>}
              {c.assinaturaInfluencer&&<span className="inline-flex items-center gap-1 text-success"><CheckCircle2 className="h-3 w-3"/>Influencer assinou</span>}
              {c.assinaturaEmpresa&&<span className="inline-flex items-center gap-1 text-success"><CheckCircle2 className="h-3 w-3"/>Empresa assinou</span>}
              {c.assinaturaTestemunha1&&<span className="inline-flex items-center gap-1 text-success"><CheckCircle2 className="h-3 w-3"/>Testemunha 1 assinou</span>}
              {c.assinaturaTestemunha2&&<span className="inline-flex items-center gap-1 text-success"><CheckCircle2 className="h-3 w-3"/>Testemunha 2 assinou</span>}
            </div>
          </button>;
        })}
      </div>
      {!filtrados.length&&<div className="rounded-2xl border border-dashed border-white/10 p-10 text-center text-sm text-muted-foreground">Nenhum contrato neste filtro.</div>}
    </Panel>

    <Modal open={!!selected} onClose={()=>setSelectedId(null)} title={selected?.titulo||"Contrato"} extraWide>
      {selected&&<div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-xl border border-white/8 p-3"><div className="text-[10px] font-black uppercase text-muted-foreground">Status</div><div className="mt-2"><Badge tone={statusTone(statusVisual(selected))}>{statusVisual(selected)}</Badge></div></div>
          <div className="rounded-xl border border-white/8 p-3"><div className="text-[10px] font-black uppercase text-muted-foreground">Versão</div><div className="mt-2 font-black">{selected.versao}</div></div>
          <div className="rounded-xl border border-white/8 p-3"><div className="text-[10px] font-black uppercase text-muted-foreground">Vigência</div><div className="mt-2 text-sm font-bold">{fmtDate(selected.inicioVigencia)} – {fmtDate(selected.fimVigencia)}</div></div>
          <div className="rounded-xl border border-white/8 p-3"><div className="text-[10px] font-black uppercase text-muted-foreground">Valor</div><div className="mt-2 font-black">{brl(selected.valor)}</div></div>
        </div>

        {mode==="management"&&<div className="flex flex-wrap gap-2">
          <Btn variant="outline" onClick={()=>{
            const inf=s.influencers.find(i=>i.id===selected.influencerId);
            const filial=s.filiais.find(f=>f.id===selected.filialId);
            abrirContratoParaPdf(selected,inf?.nome||"Influencer",filial?`${filial.codigo} · ${filial.nome}`:"");
          }}><Download className="h-4 w-4"/>Baixar PDF</Btn>
          {!todasAssinadas(selected) && selected.status!=="Cancelado" && selected.status!=="Encerrado" && !editing && <Btn onClick={()=>setEditing(true)}><FilePenLine className="h-4 w-4"/>Editar contrato</Btn>}
          {selected.status==="Rascunho"&&!editing&&<Btn variant="outline" onClick={enviar}><Send className="h-4 w-4"/>Enviar para assinatura</Btn>}
          {(todasAssinadas(selected) || selected.status==="Encerrado")&&<Btn variant="outline" onClick={novaVersao}><RotateCcw className="h-4 w-4"/>Criar nova versão</Btn>}
          {!selected.assinaturaEmpresa&&<Btn onClick={()=>abrirAssinatura("empresa","Digitada")}><FileSignature className="h-4 w-4"/>Assinar pela empresa</Btn>}
        </div>}

        {mode==="influencer"&&<div className="flex justify-end"><Btn variant="outline" onClick={()=>{
          const inf=s.influencers.find(i=>i.id===selected.influencerId);
          const filial=s.filiais.find(f=>f.id===selected.filialId);
          abrirContratoParaPdf(selected,inf?.nome||"Influencer",filial?`${filial.codigo} · ${filial.nome}`:"");
        }}><Download className="h-4 w-4"/>Baixar PDF</Btn></div>}

        {mode==="influencer"&&selected.status!=="Rascunho"&&!selected.assinaturaInfluencer&&<div className="rounded-2xl border border-primary/25 bg-primary/5 p-4">
          <div className="font-bold">Sua assinatura está pendente</div>
          <p className="mt-1 text-xs text-muted-foreground">Leia o documento completo e, se estiver de acordo, assine pela plataforma.</p>
          <div className="mt-3 flex flex-wrap gap-2"><Btn onClick={()=>abrirAssinatura("influencer","Digitada")}><PenLine className="h-4 w-4"/>Digitar assinatura</Btn><Btn variant="outline" onClick={()=>abrirAssinatura("influencer","Imagem")}><ImageUp className="h-4 w-4"/>Subir assinatura</Btn></div>
        </div>}

        {mode==="management" && !todasAssinadas(selected) && temAlgumaAssinatura(selected) && <div className="rounded-xl border border-warn/30 bg-warn/[.05] p-3 text-xs leading-relaxed text-warn">
          <AlertTriangle className="mr-1 inline h-4 w-4"/> O contrato ainda pode ser editado. Se o texto for alterado agora, todas as assinaturas já registradas serão invalidadas e precisarão ser feitas novamente.
        </div>}

        <Panel title="Documento">
          {editing
            ? <div className="space-y-3"><textarea className={`${inputCls} min-h-[520px] font-mono text-xs leading-relaxed`} value={draftText} onChange={e=>setDraftText(e.target.value)}/><div className="flex justify-end gap-2"><Btn variant="outline" onClick={()=>{setEditing(false);setDraftText(selected.conteudo);}}>Cancelar</Btn><Btn onClick={salvarEdicao}><PenLine className="h-4 w-4"/>Salvar alterações</Btn></div></div>
            : <div className="max-h-[620px] overflow-y-auto whitespace-pre-wrap rounded-xl bg-black/10 p-4 text-sm leading-7">{selected.conteudo}</div>}
        </Panel>

        <div className="grid gap-3 md:grid-cols-2">
          <SignatureCard
            titulo="Assinatura da influencer"
            assinatura={selected.assinaturaInfluencer}
            canSign={mode==="influencer" && !selected.assinaturaInfluencer && selected.status!=="Rascunho"}
            waitingText={selected.status==="Rascunho" ? "A assinatura da influencer será liberada quando o contrato for enviado." : "Aguardando assinatura da influencer."}
            onTyped={()=>abrirAssinatura("influencer","Digitada")}
            onUpload={()=>abrirAssinatura("influencer","Imagem")}
          />
          <SignatureCard
            titulo="Assinatura da empresa"
            assinatura={selected.assinaturaEmpresa}
            canSign={mode==="management" && !selected.assinaturaEmpresa}
            waitingText={mode==="management" ? "Aguardando assinatura da empresa." : "Aguardando assinatura da empresa."}
            onTyped={()=>abrirAssinatura("empresa","Digitada")}
            onUpload={()=>abrirAssinatura("empresa","Imagem")}
          />
          <SignatureCard
            titulo="Testemunha 1"
            assinatura={selected.assinaturaTestemunha1}
            canSign={mode==="management" && !selected.assinaturaTestemunha1}
            waitingText="Aguardando nome, CPF e assinatura da primeira testemunha."
            onTyped={()=>abrirAssinatura("testemunha1","Digitada")}
            onUpload={()=>abrirAssinatura("testemunha1","Imagem")}
          />
          <SignatureCard
            titulo="Testemunha 2"
            assinatura={selected.assinaturaTestemunha2}
            canSign={mode==="management" && !selected.assinaturaTestemunha2}
            waitingText="Aguardando nome, CPF e assinatura da segunda testemunha."
            onTyped={()=>abrirAssinatura("testemunha2","Digitada")}
            onUpload={()=>abrirAssinatura("testemunha2","Imagem")}
          />
        </div>

        <Panel title="Histórico do contrato">
          <div className="space-y-2">
            {[...selected.historico].reverse().map(ev=><div key={ev.id} className="flex gap-3 rounded-xl border border-white/7 p-3 text-sm"><div className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/[.04]"><History className="h-4 w-4 text-primary"/></div><div><div className="font-bold">{ev.tipo}</div><div className="text-xs text-muted-foreground">{new Date(ev.data).toLocaleString("pt-BR")} · {ev.usuario}</div>{ev.detalhe&&<div className="mt-1 text-xs text-muted-foreground">{ev.detalhe}</div>}</div></div>)}
          </div>
        </Panel>

        <div className="rounded-xl border border-white/8 bg-white/[.02] p-3 text-[11px] leading-relaxed text-muted-foreground">
          <ShieldCheck className="mr-1 inline h-3.5 w-3.5"/> A plataforma registra aceite, signatário e data/hora para influencer, empresa e testemunhas. A assinatura digitada ou por imagem é uma assinatura eletrônica interna; não é apresentada como certificado digital ICP-Brasil.
        </div>
      </div>}
    </Modal>

    {selected&&<SignatureModal key={`${selected.id}-${assinaturaLado}-${assinaturaModoInicial}-${assinaturaOpen}`} open={assinaturaOpen} onClose={()=>setAssinaturaOpen(false)} contrato={selected} lado={assinaturaLado} modalidadeInicial={assinaturaModoInicial} onSign={(assinatura)=>{
      const now=new Date().toISOString();
      updateContract(selected.id,c=>{
        const influencer=assinaturaLado==="influencer" ? assinatura : c.assinaturaInfluencer;
        const empresa=assinaturaLado==="empresa" ? assinatura : c.assinaturaEmpresa;
        const testemunha1=assinaturaLado==="testemunha1" ? assinatura : c.assinaturaTestemunha1;
        const testemunha2=assinaturaLado==="testemunha2" ? assinatura : c.assinaturaTestemunha2;
        let status:StatusContrato;
        if(influencer&&empresa&&testemunha1&&testemunha2) status="Vigente";
        else if(!influencer) status=c.status==="Rascunho" ? "Rascunho" : "Aguardando influencer";
        else if(!empresa) status="Aguardando empresa";
        else status="Aguardando testemunhas";
        const tipo = assinaturaLado==="influencer"
          ? "Assinado influencer"
          : assinaturaLado==="empresa"
            ? "Assinado empresa"
            : assinaturaLado==="testemunha1"
              ? "Assinado testemunha 1"
              : "Assinado testemunha 2";
        return {
          ...c,
          assinaturaInfluencer:influencer,
          assinaturaEmpresa:empresa,
          assinaturaTestemunha1:testemunha1,
          assinaturaTestemunha2:testemunha2,
          status,
          atualizadoEm:now,
          historico:[...c.historico,{id:uid(),data:now,tipo,usuario:assinatura.nome,detalhe:`Assinatura ${assinatura.modalidade.toLowerCase()} registrada na versão ${c.versao}.`}],
        };
      });
      setAssinaturaOpen(false);
      toast.success("Assinatura registrada.");
    }}/>}

    {mode==="management"&&<NewContractModal open={novoOpen} onClose={()=>setNovoOpen(false)} />}
  </div>;
}

function SignatureCard({
  titulo,
  assinatura,
  canSign=false,
  waitingText="Aguardando assinatura.",
  onTyped,
  onUpload,
}:{
  titulo:string;
  assinatura?:AssinaturaContrato;
  canSign?:boolean;
  waitingText?:string;
  onTyped?:()=>void;
  onUpload?:()=>void;
}){
  return <div className={`rounded-2xl border p-4 ${assinatura?"border-success/25 bg-success/[.035]":canSign?"border-primary/25 bg-primary/[.025]":"border-white/8"}`}>
    <div className="flex items-center justify-between gap-2">
      <div className="text-xs font-black uppercase tracking-[.11em] text-muted-foreground">{titulo}</div>
      {assinatura?<CheckCircle2 className="h-4 w-4 text-success"/>:canSign?<FileSignature className="h-4 w-4 text-primary"/>:<Clock3 className="h-4 w-4 text-muted-foreground"/>}
    </div>
    {assinatura?<div className="mt-4">
      {assinatura.modalidade==="Imagem"?<div className="flex h-24 items-center justify-center rounded-xl bg-white p-2"><img src={assinatura.valor} alt="Assinatura" className="max-h-full max-w-full object-contain"/></div>:<div className="flex h-24 items-center justify-center rounded-xl bg-white px-4 text-center text-3xl text-black" style={{fontFamily:"'Great Vibes', cursive"}}>{assinatura.valor}</div>}
      <div className="mt-2 text-xs font-bold">{assinaturaLabel(assinatura)}</div>
      {assinatura.cpf&&<div className="text-[10px] text-muted-foreground">CPF: {assinatura.cpf}</div>}
      <div className="text-[10px] text-muted-foreground">Modalidade: {assinatura.modalidade}</div>
    </div>:<div className="mt-4">
      <div className="text-sm text-muted-foreground">{waitingText}</div>
      {canSign&&<div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
        <button type="button" onClick={onTyped} className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-3 py-2.5 text-xs font-black text-white transition hover:bg-primary/90"><PenLine className="h-4 w-4"/>Digitar assinatura</button>
        <button type="button" onClick={onUpload} className="inline-flex items-center justify-center gap-2 rounded-xl border border-primary/25 bg-primary/5 px-3 py-2.5 text-xs font-black text-primary transition hover:bg-primary/10"><ImageUp className="h-4 w-4"/>Subir assinatura</button>
      </div>}
    </div>}
  </div>;
}

function SignatureModal({open,onClose,contrato,lado,modalidadeInicial,onSign}:{open:boolean;onClose:()=>void;contrato:ContratoInfluencer;lado:"influencer"|"empresa"|"testemunha1"|"testemunha2";modalidadeInicial:"Digitada"|"Imagem";onSign:(a:AssinaturaContrato)=>void}){
  const {s}=useApp();
  const usuario=s.usuarios.find(u=>u.id===s.usuarioAtivoId);
  const influencer=s.influencers.find(i=>i.id===contrato.influencerId);
  const [modalidade,setModalidade]=useState<"Digitada"|"Imagem">(modalidadeInicial);
  const testemunha=lado==="testemunha1"||lado==="testemunha2";
  const [nome,setNome]=useState(lado==="influencer"?(influencer?.nome||usuario?.nome||""):lado==="empresa"?(usuario?.nome||"Representante Lojas IM"):"");
  const [cpf,setCpf]=useState("");
  const [valor,setValor]=useState("");
  const [aceite,setAceite]=useState(false);

  const upload=(file?:File)=>{
    if(!file)return;
    if(file.size>800*1024){toast.error("A imagem da assinatura precisa ter no máximo 800 KB.");return;}
    const reader=new FileReader();reader.onload=()=>setValor(String(reader.result||""));reader.readAsDataURL(file);
  };

  const assinar=()=>{
    const finalValue=modalidade==="Digitada"?(valor.trim()||nome.trim()):valor;
    if(!nome.trim()||!finalValue||!aceite||(testemunha&&!cpf.trim()))return;
    onSign({modalidade,nome:nome.trim(),valor:finalValue,fonte:modalidade==="Digitada"?"Great Vibes":undefined,cpf:testemunha?cpf.trim():undefined,assinadoEm:new Date().toISOString(),usuarioId:usuario?.id||lado,aceite:true});
  };

  const tituloModal=lado==="influencer"?"Assinar como influencer":lado==="empresa"?"Assinar pela empresa":lado==="testemunha1"?"Assinar como Testemunha 1":"Assinar como Testemunha 2";
  return <Modal open={open} onClose={onClose} title={tituloModal} wide>
    <div className="space-y-4">
      <div className="rounded-xl border border-white/8 bg-white/[.02] p-3 text-sm">
        <div className="font-bold">{contrato.titulo}</div>
        <div className="mt-1 text-xs text-muted-foreground">Versão {contrato.versao} · vigência {fmtDate(contrato.inicioVigencia)} a {fmtDate(contrato.fimVigencia)}</div>
      </div>
      <Field label={testemunha?"Nome completo da testemunha":"Nome do signatário"}><input className={inputCls} value={nome} onChange={e=>setNome(e.target.value)}/></Field>
      {testemunha&&<Field label="CPF da testemunha"><input className={inputCls} inputMode="numeric" placeholder="000.000.000-00" value={cpf} onChange={e=>setCpf(e.target.value)}/></Field>}
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={()=>{setModalidade("Digitada");setValor("");}} className={`rounded-xl border p-3 text-sm font-bold ${modalidade==="Digitada"?"border-primary bg-primary/5 text-primary":"border-white/8"}`}><PenLine className="mx-auto mb-1 h-4 w-4"/>Digitar assinatura</button>
        <button type="button" onClick={()=>{setModalidade("Imagem");setValor("");}} className={`rounded-xl border p-3 text-sm font-bold ${modalidade==="Imagem"?"border-primary bg-primary/5 text-primary":"border-white/8"}`}><ImageUp className="mx-auto mb-1 h-4 w-4"/>Subir assinatura</button>
      </div>
      {modalidade==="Digitada"?<div>
        <Field label="Assinatura digitada"><input className={inputCls} placeholder="Digite como deseja assinar" value={valor} onChange={e=>setValor(e.target.value)}/></Field>
        <div className="mt-2 flex min-h-28 items-center justify-center rounded-xl border border-white/8 bg-white px-4 text-center text-4xl text-black" style={{fontFamily:"'Great Vibes', cursive"}}>{valor||nome||"Sua assinatura"}</div>
      </div>:<div>
        <label className="flex min-h-36 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-primary/35 bg-primary/[.025] p-5 text-center">
          {valor?<img src={valor} alt="Prévia da assinatura" className="max-h-28 max-w-full object-contain"/>:<><ImageUp className="h-7 w-7 text-primary"/><div className="mt-2 text-sm font-bold">Enviar PNG, JPG ou WEBP</div><div className="mt-1 text-xs text-muted-foreground">Preferencialmente assinatura em fundo transparente.</div></>}
          <input type="file" className="hidden" accept="image/png,image/jpeg,image/webp" onChange={e=>upload(e.target.files?.[0])}/>
        </label>
      </div>}
      <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-white/8 p-3 text-sm"><input type="checkbox" className="mt-1 accent-[var(--primary)]" checked={aceite} onChange={e=>setAceite(e.target.checked)}/><span>{testemunha?"Declaro que li o documento apresentado nesta versão e assino como testemunha, confirmando minha identificação e assinatura eletrônica.":"Declaro que li o documento apresentado nesta versão e concordo com seu conteúdo, registrando minha assinatura eletrônica na plataforma."}</span></label>
      <Btn className="w-full" disabled={!aceite||!nome.trim()||(testemunha&&!cpf.trim())||(modalidade==="Imagem"&&!valor)} onClick={assinar}><FileSignature className="h-4 w-4"/>Confirmar assinatura</Btn>
    </div>
  </Modal>;
}

function NewContractModal({open,onClose}:{open:boolean;onClose:()=>void}){
  const {s,set}=useApp();
  const [f,setF]=useState({influencerId:s.influencers[0]?.id||"",filialId:s.influencers[0]?.filialIds[0]||"",titulo:"",inicio:"",fim:"",valor:0});
  const inf=s.influencers.find(i=>i.id===f.influencerId);
  const criar=()=>{
    if(!inf||!f.titulo.trim())return;
    const now=new Date().toISOString();
    const user=s.usuarios.find(u=>u.id===s.usuarioAtivoId)?.nome||s.perfil;
    const novo:ContratoInfluencer={id:uid(),influencerId:inf.id,filialId:f.filialId||undefined,titulo:f.titulo.trim(),conteudo:contratoVazio(inf.nome),versao:1,status:"Rascunho",inicioVigencia:f.inicio,fimVigencia:f.fim,valor:Number(f.valor)||0,criadoEm:now,atualizadoEm:now,historico:[{id:uid(),data:now,tipo:"Criado",usuario:user,detalhe:"Contrato criado na plataforma."}]};
    set(st=>({...st,contratos:[novo,...st.contratos]}));
    onClose();toast.success("Contrato criado como rascunho.");
  };
  return <Modal open={open} onClose={onClose} title="Novo contrato">
    <div className="space-y-3">
      <Field label="Influencer"><select className={inputCls} value={f.influencerId} onChange={e=>{const i=s.influencers.find(x=>x.id===e.target.value);setF({...f,influencerId:e.target.value,filialId:i?.filialIds[0]||""});}}>{s.influencers.map(i=><option key={i.id} value={i.id}>{i.nome}</option>)}</select></Field>
      <Field label="Filial"><select className={inputCls} value={f.filialId} onChange={e=>setF({...f,filialId:e.target.value})}>{(inf?.filialIds||[]).map(id=>{const filial=s.filiais.find(x=>x.id===id);return <option key={id} value={id}>{filial?.codigo} · {filial?.nome}</option>})}</select></Field>
      <Field label="Título"><input className={inputCls} placeholder="Ex.: Prestação de Serviços · Maio 2027" value={f.titulo} onChange={e=>setF({...f,titulo:e.target.value})}/></Field>
      <div className="grid grid-cols-2 gap-3"><Field label="Início da vigência"><input type="date" className={inputCls} value={f.inicio} onChange={e=>setF({...f,inicio:e.target.value})}/></Field><Field label="Fim da vigência"><input type="date" className={inputCls} value={f.fim} onChange={e=>setF({...f,fim:e.target.value})}/></Field></div>
      <Field label="Valor (R$)"><input type="number" className={inputCls} value={f.valor||""} onChange={e=>setF({...f,valor:Number(e.target.value)})}/></Field>
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs text-muted-foreground">O contrato nasce como <b className="text-foreground">Rascunho</b>. Depois você abre o documento, edita o texto e só então envia para assinatura.</div>
      <Btn className="w-full" disabled={!f.titulo.trim()||!f.influencerId} onClick={criar}><Plus className="h-4 w-4"/>Criar rascunho</Btn>
    </div>
  </Modal>;
}