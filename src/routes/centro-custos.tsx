import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, BellRing, Building2, CalendarClock, Check, CheckCircle2, Pencil, Plus, RefreshCw, Search, Tags, Trash2, Wallet } from "lucide-react";
import { useApp, brl, uid, fmtDate, type DespesaFixa } from "@/lib/store";
import { PageHeader, Panel, Stat, Btn, Modal, Field, inputCls, Badge, pageHead } from "@/components/kit";
import { buscarDespesasMarketingGestaoIM, converterDespesasGestaoIM, mesclarDespesasGestaoIM } from "@/lib/gestaoim-marketing";
import { PaidTicketsCard } from "@/components/PaidTicketsCard";
import { competenciaAtiva, pagaNaCompetencia, vencimentoCompetencia } from "@/lib/despesas-fixas";

export const Route = createFileRoute("/centro-custos")({
  head: pageHead("Centro de Custos", "Custos reais e previstos do marketing das Lojas IM."),
  component: Page,
});

const CATEGORIAS = [
  "Tráfego Pago","Influencers","Propaganda Volante","Gráfica / Impressões","Reinauguração",
  "Eventos","Decoração","Brindes","Alimentação","Equipe / Prestadores","Transporte","Materiais","Outros",
];

function Page() {
  const { s, set } = useApp();
  const mesAtual = new Date().toISOString().slice(0,7);
  const [mes, setMes] = useState(mesAtual);
  const [categoria, setCategoria] = useState("");
  const [filialId, setFilialId] = useState("");
  const [origem, setOrigem] = useState("");
  const [busca, setBusca] = useState("");
  const [aba, setAba] = useState<"Resumo"|"Lançamentos"|"Filiais"|"Categorias"|"Fixas">("Resumo");
  const [open, setOpen] = useState(false);
  const [fixaOpen, setFixaOpen] = useState(false);
  const [fixaEditId, setFixaEditId] = useState<string | null>(null);
  const [fixaModo, setFixaModo] = useState<"Competência"|"Histórico">("Competência");
  const [fixaBusca, setFixaBusca] = useState("");
  const [fixaStatus, setFixaStatus] = useState<"Todos"|"Pagas"|"Pendentes">("Todos");
  const [gestaoSync, setGestaoSync] = useState<"idle"|"loading"|"ok"|"error">("idle");
  const [gestaoInfo, setGestaoInfo] = useState<{ total:number; valorTotal:number; fetchedAt?:string; endpoint?:string; scopeLabel?:string; scopeWarning?:string; error?:string; nextStep?:string }>({ total:0, valorTotal:0 });

  const sincronizarDespesas = async () => {
    setGestaoSync("loading");
    const data = await buscarDespesasMarketingGestaoIM(mes);
    if (!data.ok || !Array.isArray(data.despesas)) {
      setGestaoSync("error");
      setGestaoInfo({ total:0, valorTotal:0, error:data.error, nextStep:data.nextStep });
      return;
    }
    const sincronizadoEm = data.fetchedAt || new Date().toISOString();
    const custos = converterDespesasGestaoIM(data.despesas, s.filiais, sincronizadoEm);
    set((st)=>({ ...st, custos: mesclarDespesasGestaoIM(st.custos, custos, mes) }));
    setGestaoInfo({
      total:data.total || custos.length,
      valorTotal:data.valorTotal || custos.reduce((a,x)=>a+x.valor,0),
      fetchedAt:sincronizadoEm,
      endpoint:data.endpoint,
      scopeLabel:data.scopeLabel,
      scopeWarning:data.scopeWarning,
    });
    setGestaoSync("ok");
  };

  useEffect(() => {
    void sincronizarDespesas();
    // A competência é o gatilho; as filiais são cadastro estável do BI.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mes]);

  const custosMes = useMemo(
    () => s.custos.filter((c)=>c.data.startsWith(mes)),
    [s.custos, mes],
  );

  const origensDisponiveis = useMemo(
    () => [...new Set(custosMes.map((c)=>c.origem || (c.reinauguracaoId ? "Reinauguração" : "Manual")).filter(Boolean))].sort(),
    [custosMes],
  );

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return custosMes
      .filter((c) => !categoria || c.categoria === categoria)
      .filter((c) => !filialId || c.filialId === filialId)
      .filter((c) => {
        const fonte = c.origem || (c.reinauguracaoId ? "Reinauguração" : "Manual");
        return !origem || fonte === origem;
      })
      .filter((c) => {
        if (!termo) return true;
        const filial = s.filiais.find((f)=>f.id===c.filialId);
        return [c.descricao,c.categoria,c.origem,filial?.nome,filial?.codigo]
          .filter(Boolean).join(" ").toLowerCase().includes(termo);
      })
      .sort((a,b) => b.data.localeCompare(a.data) || b.valor-a.valor);
  }, [custosMes, categoria, filialId, origem, busca, s.filiais]);

  const total = lista.reduce((a,c) => a+c.valor,0);
  const totalMesRede = custosMes.reduce((a,c)=>a+c.valor,0);
  const totalGestao = custosMes.filter((c)=>c.origem==="GestãoIM").reduce((a,c)=>a+c.valor,0);
  const totalOutrasOrigens = totalMesRede - totalGestao;
  const fixasCompetencia = s.despesasFixas
    .filter((d)=>competenciaAtiva(d,mes))
    .sort((a,b)=>a.diaVencimento-b.diaVencimento);
  const totalFixasPrevisto = fixasCompetencia.reduce((a,d)=>a+d.valor,0);
  const totalFixasPendente = fixasCompetencia.filter((d)=>!pagaNaCompetencia(d,mes)).reduce((a,d)=>a+d.valor,0);
  const historicoFixas = useMemo(()=>{
    const hoje=new Date();
    const competenciaAtual=`${hoje.getFullYear()}-${String(hoje.getMonth()+1).padStart(2,"0")}`;
    const termo=fixaBusca.trim().toLowerCase();
    const itens:Array<{despesa:DespesaFixa;competencia:string;vencimento:string;pago:boolean;dataPago?:string;filialNome:string;responsavelNome:string}>=[];
    for(const d of s.despesasFixas){
      const inicio=d.inicio?.slice(0,7);
      if(!inicio) continue;
      const inicioDate=new Date(Number(inicio.slice(0,4)),Number(inicio.slice(5,7))-1,1);
      const limitePassado=new Date(hoje.getFullYear(),hoje.getMonth()-23,1);
      const cursor=new Date(Math.max(inicioDate.getTime(),limitePassado.getTime()));
      while(cursor<=hoje){
        const comp=`${cursor.getFullYear()}-${String(cursor.getMonth()+1).padStart(2,"0")}`;
        if(comp<=competenciaAtual && competenciaAtiva(d,comp)){
          const pagamento=d.pagamentos?.find((p)=>p.competencia===comp);
          const filial=s.filiais.find((f)=>f.id===d.filialId);
          const resp=s.funcionarios.find((f)=>f.id===d.responsavelFuncionarioId);
          const filialNome=filial?`${filial.codigo} · ${filial.nome}`:"Rede";
          const responsavelNome=resp?.nome||"Não definido";
          const pago=!!pagamento;
          const bateStatus=fixaStatus==="Todos" || (fixaStatus==="Pagas"&&pago) || (fixaStatus==="Pendentes"&&!pago);
          const bateBusca=!termo || [d.descricao,d.categoria,filialNome,responsavelNome,comp].join(" ").toLowerCase().includes(termo);
          if(bateStatus&&bateBusca){
            itens.push({despesa:d,competencia:comp,vencimento:vencimentoCompetencia(d,comp),pago,dataPago:pagamento?.dataPago,filialNome,responsavelNome});
          }
        }
        cursor.setMonth(cursor.getMonth()+1);
      }
    }
    return itens.sort((a,b)=>b.competencia.localeCompare(a.competencia)||a.despesa.diaVencimento-b.despesa.diaVencimento);
  },[s.despesasFixas,s.filiais,s.funcionarios,fixaBusca,fixaStatus]);

  // Compromissos operacionais ficam separados do realizado para não gerar dupla contagem.
  const previstoInfluencers = s.influencers.reduce((a,i)=>a+i.vinculos.filter((v)=>v.contrato==="Mensal").reduce((b,v)=>b+v.valor,0),0);
  const totalTrafego = s.trafegoPago.filter((x)=>x.competencia===mes).reduce((a,x)=>a+x.investimento,0);
  const totalVolante = s.volantes.filter((x)=>x.competencia===mes).reduce((a,x)=>a+x.custo,0);
  const compromissosOperacionais = previstoInfluencers + totalTrafego + totalVolante;

  const porCategoria = useMemo(() => {
    const m = new Map<string,number>();
    lista.forEach((c)=>m.set(c.categoria,(m.get(c.categoria)||0)+c.valor));
    return [...m.entries()].map(([nome,valor])=>({nome,valor})).sort((a,b)=>b.valor-a.valor);
  }, [lista]);

  const porFilial = useMemo(() => {
    const m = new Map<string,number>();
    lista.forEach((c)=>m.set(c.filialId,(m.get(c.filialId)||0)+c.valor));
    return [...m.entries()].map(([id,valor])=>({ id, nome:s.filiais.find((f)=>f.id===id)?.nome||"Rede", valor })).sort((a,b)=>b.valor-a.valor);
  }, [lista,s.filiais]);

  return (
    <>
      <PageHeader title="Despesas do Marketing" sub="Realizado, origem dos lançamentos, distribuição por filial e compromissos do marketing" action={<div className="flex flex-wrap gap-2"><Btn variant="outline" onClick={()=>void sincronizarDespesas()} disabled={gestaoSync==="loading"}><RefreshCw className={`h-4 w-4 ${gestaoSync==="loading"?"animate-spin":""}`}/>{gestaoSync==="loading"?"Atualizando...":"Atualizar GestãoIM"}</Btn><Btn onClick={()=>setOpen(true)}><Plus className="h-4 w-4" />Nova despesa</Btn></div>} />

      <PaidTicketsCard de={`${mes}-01`} ate={`${mes}-31`} />
      <div className={`mb-4 rounded-2xl border p-4 ${gestaoSync==="ok"?"border-success/20 bg-success/[.035]":gestaoSync==="error"?"border-warn/25 bg-warn/[.05]":"border-white/8 bg-white/[.02]"}`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="font-display font-black">Despesas Marketing · GestãoIM</div>
            <div className="mt-1 text-sm text-muted-foreground">
              {gestaoSync==="loading" ? "Consultando despesas..." :
               gestaoSync==="ok" ? `${gestaoInfo.total} lançamento(s) sincronizado(s) · ${brl(gestaoInfo.valorTotal)} em ${mes.split("-").reverse().join("/")}` :
               gestaoSync==="error" ? (gestaoInfo.error || "Não foi possível sincronizar as despesas.") :
               "Aguardando sincronização."}
            </div>
            {gestaoSync==="ok" && gestaoInfo.fetchedAt && <div className="mt-1 text-[11px] text-muted-foreground">Última consulta: {new Date(gestaoInfo.fetchedAt).toLocaleString("pt-BR")}</div>}
            {gestaoSync==="ok" && gestaoInfo.scopeLabel && <div className="mt-1 text-[11px] font-bold text-foreground">Escopo: {gestaoInfo.scopeLabel}</div>}
          </div>
          {gestaoSync==="ok" ? <div className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-success"/><Badge tone="success">SINCRONIZADO</Badge></div> : gestaoSync==="error" ? <Badge tone="warn">CONEXÃO PENDENTE</Badge> : <Badge tone="muted">GESTÃOIM</Badge>}
        </div>
        {gestaoSync==="ok" && gestaoInfo.scopeWarning && <div className="mt-3 flex items-start gap-2 rounded-xl border border-warn/20 bg-warn/[.04] p-3 text-xs text-muted-foreground">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warn"/>
          <span>{gestaoInfo.scopeWarning}</span>
        </div>}
        {gestaoSync==="error" && <div className="mt-3 flex items-start gap-2 rounded-xl border border-warn/20 bg-black/10 p-3 text-xs text-muted-foreground">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warn"/>
          <span>{gestaoInfo.nextStep || "Abra a tela de Despesas Marketing no GestãoIM e me envie um print do Network (Fetch/XHR) para eu fixar o endpoint exato."}</span>
        </div>}
      </div>

      <div className="mb-4 grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat accent label="Total lançado no mês" value={brl(totalMesRede)} hint={`${custosMes.length} lançamento(s) · pago aguardando rota`} />
        <Stat label="GestãoIM · enviados ao financeiro" value={brl(totalGestao)} hint={totalGestao ? "lançados, não confirmados como pagos" : "sem lançamento sincronizado"} />
        <Stat label="Outras origens" value={brl(totalOutrasOrigens)} hint="manual / BI / operações" />
        <Stat label="Compromissos operacionais" value={brl(compromissosOperacionais)} hint="não somados ao realizado" />
        <Stat label="Total filtrado" value={brl(total)} hint={`${lista.length} lançamento(s)`} />
      </div>

      <div className="mb-4 grid gap-2 rounded-2xl border border-white/8 bg-white/[.02] p-2 sm:grid-cols-5">
        {(["Resumo","Lançamentos","Filiais","Categorias","Fixas"] as const).map((item)=><button key={item} type="button" onClick={()=>setAba(item)} className={`rounded-xl px-4 py-2.5 text-sm font-black transition ${aba===item?"bg-primary text-white shadow-brand":"text-muted-foreground hover:bg-white/[.05] hover:text-foreground"}`}>{item}</button>)}
      </div>

      <Panel title="Filtros" className="mb-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <Field label="Competência"><div className="flex gap-2"><button type="button" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border bg-secondary/50 font-black hover:bg-secondary" onClick={()=>{const [y,m]=mes.split("-").map(Number);const d=new Date(y,m-2,1);setMes(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`);}}>‹</button><input type="month" className={inputCls} value={mes} onChange={(e)=>setMes(e.target.value)} /><button type="button" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-border bg-secondary/50 font-black hover:bg-secondary" onClick={()=>{const [y,m]=mes.split("-").map(Number);const d=new Date(y,m,1);setMes(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`);}}>›</button></div></Field>
          <Field label="Categoria"><select className={inputCls} value={categoria} onChange={(e)=>setCategoria(e.target.value)}><option value="">Todas</option>{CATEGORIAS.map((x)=><option key={x}>{x}</option>)}</select></Field>
          <Field label="Filial"><select className={inputCls} value={filialId} onChange={(e)=>setFilialId(e.target.value)}><option value="">Todas / Rede</option>{s.filiais.map((f)=><option key={f.id} value={f.id}>{f.codigo} — {f.nome}</option>)}</select></Field>
          <Field label="Origem"><select className={inputCls} value={origem} onChange={(e)=>setOrigem(e.target.value)}><option value="">Todas</option>{origensDisponiveis.map((x)=><option key={x}>{x}</option>)}</select></Field>
          <Field label="Buscar"><div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><input className={`${inputCls} pl-9`} placeholder="Descrição, filial..." value={busca} onChange={(e)=>setBusca(e.target.value)} /></div></Field>
        </div>
      </Panel>

      {(aba==="Resumo" || aba==="Categorias" || aba==="Filiais") && <div className="grid gap-4 lg:grid-cols-2">
        {(aba==="Resumo" || aba==="Categorias") && <Panel title="Distribuição por categoria">
          <div className="space-y-2">
            {porCategoria.map((x)=><div key={x.nome} className="flex items-center justify-between rounded-md border p-3 text-sm">
              <div className="flex items-center gap-2"><Tags className="h-4 w-4 text-primary" /><span className="font-semibold">{x.nome}</span></div><b>{brl(x.valor)}</b>
            </div>)}
            {!porCategoria.length && <Empty text="Nenhum custo encontrado com estes filtros." />}
          </div>
        </Panel>}

        {(aba==="Resumo" || aba==="Filiais") && <Panel title="Maiores custos por filial">
          <div className="space-y-2">
            {porFilial.slice(0,10).map((x,i)=><div key={x.id} className="flex items-center justify-between rounded-md border p-3 text-sm">
              <div className="flex items-center gap-3"><span className="grid h-6 w-6 place-items-center rounded-full bg-muted text-xs font-bold">{i+1}</span><Building2 className="h-4 w-4 text-muted-foreground" /><span className="font-semibold">{x.nome}</span></div><b>{brl(x.valor)}</b>
            </div>)}
            {!porFilial.length && <Empty text="Nenhum custo por filial neste período." />}
          </div>
        </Panel>}
      </div>}

      {aba==="Resumo" && <Panel title="Compromissos do mês · acompanhamento operacional" className="mt-4">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-xl border border-white/8 p-4"><div className="text-xs font-black uppercase tracking-[.1em] text-muted-foreground">Influencers contratados</div><div className="mt-2 font-display text-xl font-black">{brl(previstoInfluencers)}</div><div className="mt-1 text-xs text-muted-foreground">valor mensal previsto nos vínculos ativos</div></div>
          <div className="rounded-xl border border-white/8 p-4"><div className="text-xs font-black uppercase tracking-[.1em] text-muted-foreground">Tráfego pago registrado</div><div className="mt-2 font-display text-xl font-black">{brl(totalTrafego)}</div><div className="mt-1 text-xs text-muted-foreground">acompanhamento operacional; não soma novamente no realizado</div></div>
          <div className="rounded-xl border border-white/8 p-4"><div className="text-xs font-black uppercase tracking-[.1em] text-muted-foreground">Propaganda volante</div><div className="mt-2 font-display text-xl font-black">{brl(totalVolante)}</div><div className="mt-1 text-xs text-muted-foreground">ações cadastradas para a competência</div></div>
        </div>
      </Panel>}

      {(aba==="Resumo" || aba==="Lançamentos") && <Panel title="Lançamentos" className="mt-4">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead><tr className="border-b text-left text-xs uppercase text-muted-foreground"><th className="pb-2">Data</th><th>Categoria</th><th>Descrição</th><th>Filial</th><th>Origem</th><th className="text-right">Valor</th></tr></thead>
            <tbody>{lista.map((c)=>{
              const filial=s.filiais.find((f)=>f.id===c.filialId);
              const origem=c.origem || (c.reinauguracaoId?"Reinauguração":c.categoria==="Tráfego Pago"?"Tráfego":c.categoria==="Propaganda Volante"?"Propaganda volante":"Manual");
              return <tr key={c.id} className="border-b last:border-0"><td className="py-2">{fmtDate(c.data)}</td><td><Badge>{c.categoria}</Badge></td><td>{c.descricao}</td><td>{filial?.nome||"Rede"}</td><td>{origem}</td><td className="text-right font-bold">{brl(c.valor)}</td></tr>;
            })}</tbody>
          </table>
          {!lista.length && <Empty text="Nenhum lançamento nesta competência." />}
        </div>
      </Panel>}

      {aba==="Fixas" && <div className="space-y-4">
        <div className="flex flex-col gap-3 rounded-2xl border border-border bg-card p-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-wrap gap-2">
            {(["Competência","Histórico"] as const).map((x)=><button key={x} type="button" onClick={()=>setFixaModo(x)} className={`rounded-xl px-4 py-2 text-xs font-black transition ${fixaModo===x?"bg-primary text-primary-foreground":"border border-border bg-secondary/50 text-muted-foreground hover:text-foreground"}`}>{x}</button>)}
          </div>
          {fixaModo==="Histórico"&&<div className="grid flex-1 gap-2 sm:grid-cols-[1fr_170px] lg:max-w-2xl">
            <div className="relative"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"/><input className={`${inputCls} pl-9`} placeholder="Buscar despesa, filial ou responsável..." value={fixaBusca} onChange={(e)=>setFixaBusca(e.target.value)}/></div>
            <select className={inputCls} value={fixaStatus} onChange={(e)=>setFixaStatus(e.target.value as typeof fixaStatus)}><option>Todos</option><option>Pagas</option><option>Pendentes</option></select>
          </div>}
        </div>

        {fixaModo==="Competência"&&<>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat accent label="Fixas previstas" value={brl(totalFixasPrevisto)} hint={`${fixasCompetencia.length} compromisso(s) em ${mes.split("-").reverse().join("/")}`}/>
          <Stat label="Ainda pendente" value={brl(totalFixasPendente)} hint="aguardando pagamento"/>
          <Stat label="Pagas no período" value={String(fixasCompetencia.filter((d)=>pagaNaCompetencia(d,mes)).length)} hint="marcadas como pagas"/>
          <Stat label="Cadastros ativos" value={String(s.despesasFixas.filter((d)=>d.ativa).length)} hint="recorrências cadastradas"/>
        </div>

        <Panel title="Despesas fixas por filial" action={<Btn onClick={()=>{setFixaEditId(null);setFixaOpen(true);}}><Plus className="h-4 w-4"/>Nova despesa fixa</Btn>}>
          <div className="space-y-2">
            {fixasCompetencia.map((d)=>{
              const filial=s.filiais.find((f)=>f.id===d.filialId);
              const pago=pagaNaCompetencia(d,mes);
              const vencimento=vencimentoCompetencia(d,mes);
              const alertas=d.alertaUsuarioIds.map((id)=>s.usuarios.find((u)=>u.id===id)?.nome).filter(Boolean);
              const responsavel=s.funcionarios.find((f)=>f.id===d.responsavelFuncionarioId);
              return <div key={d.id} className={`rounded-2xl border p-4 ${pago?"border-success/20 bg-success/[.025]":"border-white/8 bg-white/[.02]"}`}>
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="font-display font-black">{d.descricao}</div>
                      <Badge tone={pago?"success":"warn"}>{pago?"PAGA":"PENDENTE"}</Badge>
                      <Badge>{d.recorrente===false?"ÚNICA":d.frequencia}</Badge>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">{filial?.codigo} · {filial?.nome} · {d.categoria}</div>
                    <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
                      <span><b>Valor:</b> {brl(d.valor)}</span>
                      <span><b>Vencimento:</b> {fmtDate(vencimento)}</span>
                      <span><b>Alerta:</b> {d.alertarDiasAntes} dia(s) antes</span>
                      <span><b>Responsável:</b> {responsavel?.nome || "Não definido"}</span>
                    </div>
                    <div className="mt-2 flex items-start gap-1.5 text-[11px] text-muted-foreground"><BellRing className="mt-0.5 h-3.5 w-3.5 shrink-0 text-warn"/><span>{alertas.length?`Sininho para: ${alertas.join(", ")}`:"Nenhum usuário configurado para receber alerta."}</span></div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {!pago&&<Btn onClick={()=>{
                      const hoje=new Date().toISOString().slice(0,10);
                      const externalId=`fixa:${d.id}:${mes}`;
                      set((st)=>({
                        ...st,
                        despesasFixas:st.despesasFixas.map((x)=>x.id===d.id?{...x,pagamentos:[...(x.pagamentos||[]),{competencia:mes,dataPago:hoje,valor:x.valor}]}:x),
                        custos:st.custos.some((x)=>x.externalId===externalId)?st.custos:[...st.custos,{id:uid(),categoria:d.categoria,descricao:d.descricao,valor:d.valor,filialId:d.filialId,data:hoje,origem:"Despesa fixa",externalId}],
                        funcionarios:st.funcionarios.map((func)=>({
                          ...func,
                          atividades:func.atividades.map((a)=>a.sourceDespesaFixaId===d.id && a.sourceDespesaFixaCompetencia===mes
                            ? {...a,feito:true,status:"Finalizado"}
                            : a
                          ),
                        })),
                      }));
                    }}><Check className="h-4 w-4"/>Marcar como paga</Btn>}
                    <Btn variant="outline" onClick={()=>{setFixaEditId(d.id);setFixaOpen(true);}}><Pencil className="h-4 w-4"/>Editar</Btn>
                    <Btn variant="danger" onClick={()=>set((st)=>({...st,despesasFixas:st.despesasFixas.filter((x)=>x.id!==d.id)}))}><Trash2 className="h-4 w-4"/>Excluir</Btn>
                  </div>
                </div>
              </div>;
            })}
            {!fixasCompetencia.length&&<div className="rounded-2xl border border-dashed border-white/10 p-10 text-center"><CalendarClock className="mx-auto h-8 w-8 text-muted-foreground/40"/><div className="mt-2 text-sm font-bold">Nenhuma despesa fixa prevista para esta competência</div><div className="mt-1 text-xs text-muted-foreground">Cadastre aluguel de mídia, contratos, ferramentas ou qualquer compromisso recorrente por filial.</div></div>}
          </div>
        </Panel>
        </>}

        {fixaModo==="Histórico"&&<Panel title="Histórico de despesas fixas · últimos 24 meses">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-sm">
              <thead><tr className="border-b text-left text-[10px] uppercase text-muted-foreground"><th className="pb-2">Competência</th><th>Despesa</th><th>Filial</th><th>Responsável</th><th>Vencimento</th><th>Status</th><th>Pago em</th><th className="text-right">Valor</th></tr></thead>
              <tbody>{historicoFixas.map((x)=><tr key={`${x.despesa.id}-${x.competencia}`} className="border-b last:border-0"><td className="py-2 font-bold">{x.competencia.split("-").reverse().join("/")}</td><td><div className="font-semibold">{x.despesa.descricao}</div><div className="text-[10px] text-muted-foreground">{x.despesa.categoria} · {x.despesa.recorrente===false?"Única":x.despesa.frequencia}</div></td><td>{x.filialNome}</td><td>{x.responsavelNome}</td><td>{fmtDate(x.vencimento)}</td><td><Badge tone={x.pago?"success":"warn"}>{x.pago?"PAGA":"PENDENTE"}</Badge></td><td>{x.dataPago?fmtDate(x.dataPago):"—"}</td><td className="text-right font-black">{brl(x.despesa.valor)}</td></tr>)}</tbody>
            </table>
            {!historicoFixas.length&&<Empty text="Nenhuma despesa fixa encontrada nesse histórico."/>}
          </div>
          <div className="mt-3 text-[11px] text-muted-foreground">O histórico mostra até 24 meses anteriores, incluindo competências pagas e pendentes. Use a busca para localizar despesas antigas por nome, filial ou responsável.</div>
        </Panel>}
      </div>}

      <CostModal open={open} onClose={()=>setOpen(false)} mes={mes} />
      <FixedExpenseModal key={`${fixaEditId||"novo"}-${fixaOpen}`} open={fixaOpen} onClose={()=>setFixaOpen(false)} despesaId={fixaEditId} mes={mes}/>
    </>
  );
}

function CostModal({open,onClose,mes}:{open:boolean;onClose:()=>void;mes:string}) {
  const { s, set } = useApp();
  const [f,setF]=useState({categoria:"Outros",descricao:"",valor:0,filialId:"fCD",data:(mes||new Date().toISOString().slice(0,7))+"-01"});
  return <Modal open={open} onClose={onClose} title="Adicionar custo">
    <div className="space-y-3">
      <Field label="Categoria"><select className={inputCls} value={f.categoria} onChange={(e)=>setF({...f,categoria:e.target.value})}>{CATEGORIAS.map((x)=><option key={x}>{x}</option>)}</select></Field>
      <Field label="Descrição"><input className={inputCls} placeholder="Ex.: impressão de tabloides" value={f.descricao} onChange={(e)=>setF({...f,descricao:e.target.value})} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Valor"><input type="number" min="0" className={inputCls} value={f.valor} onChange={(e)=>setF({...f,valor:Number(e.target.value)})} /></Field>
        <Field label="Data"><input type="date" className={inputCls} value={f.data} onChange={(e)=>setF({...f,data:e.target.value})} /></Field>
      </div>
      <Field label="Filial / Rede"><select className={inputCls} value={f.filialId} onChange={(e)=>setF({...f,filialId:e.target.value})}>{s.filiais.map((x)=><option key={x.id} value={x.id}>{x.codigo} — {x.nome}</option>)}</select></Field>
      <Btn className="w-full" disabled={!f.descricao.trim()||f.valor<=0} onClick={()=>{
        set((st)=>({...st,custos:[...st.custos,{id:uid(),...f,origem:"Manual"}]})); onClose();
      }}><Wallet className="h-4 w-4" />Salvar custo</Btn>
    </div>
  </Modal>;
}
function FixedExpenseModal({open,onClose,despesaId,mes}:{open:boolean;onClose:()=>void;despesaId:string|null;mes:string}) {
  const {s,set}=useApp();
  const existente=despesaId?s.despesasFixas.find((d)=>d.id===despesaId):undefined;
  const internos=s.usuarios.filter((u)=>u.ativo&&u.perfil!=="Influencer");
  const usuarioAtual=s.usuarioAtivoId;
  const [f,setF]=useState<DespesaFixa>(existente || {
    id:uid(),
    filialId:s.filiais.find((x)=>!x.isCD)?.id || s.filiais[0]?.id || "",
    categoria:"Outros",
    descricao:"",
    valor:0,
    recorrente:true,
    frequencia:"Mensal",
    inicio:`${mes}-01`,
    diaVencimento:10,
    alertarDiasAntes:5,
    responsavelFuncionarioId:"",
    alertaUsuarioIds:usuarioAtual?[usuarioAtual]:[],
    ativa:true,
    pagamentos:[],
  });

  const toggleAlerta=(id:string)=>setF((prev)=>({...prev,alertaUsuarioIds:prev.alertaUsuarioIds.includes(id)?prev.alertaUsuarioIds.filter((x)=>x!==id):[...prev.alertaUsuarioIds,id]}));
  const normalizaNome=(valor:string)=>valor.normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toUpperCase();
  const escolherResponsavel=(funcionarioId:string)=>{
    const func=s.funcionarios.find((x)=>x.id===funcionarioId);
    const usuario=s.usuarios.find((u)=>u.vinculoId===funcionarioId || (func && normalizaNome(u.nome)===normalizaNome(func.nome)));
    setF((prev)=>({
      ...prev,
      responsavelFuncionarioId:funcionarioId,
      alertaUsuarioIds:usuario && !prev.alertaUsuarioIds.includes(usuario.id)
        ? [...prev.alertaUsuarioIds,usuario.id]
        : prev.alertaUsuarioIds,
    }));
  };
  const salvar=()=>{
    if(!f.descricao.trim()||f.valor<=0||!f.filialId||!f.responsavelFuncionarioId)return;
    set((st)=>({...st,despesasFixas:existente?st.despesasFixas.map((d)=>d.id===f.id?{...f,descricao:f.descricao.trim()}:d):[...st.despesasFixas,{...f,descricao:f.descricao.trim()}]}));
    onClose();
  };

  return <Modal open={open} onClose={onClose} title={existente?"Editar despesa fixa":"Nova despesa fixa"} wide>
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Descrição"><input className={inputCls} placeholder="Ex.: ferramenta de CRM, aluguel, contrato mensal..." value={f.descricao} onChange={(e)=>setF({...f,descricao:e.target.value})}/></Field>
        <Field label="Categoria"><select className={inputCls} value={f.categoria} onChange={(e)=>setF({...f,categoria:e.target.value})}>{CATEGORIAS.map((x)=><option key={x}>{x}</option>)}</select></Field>
        <Field label="Filial"><select className={inputCls} value={f.filialId} onChange={(e)=>setF({...f,filialId:e.target.value})}>{s.filiais.map((x)=><option key={x.id} value={x.id}>{x.codigo} — {x.nome}</option>)}</select></Field>
        <Field label="Valor"><input type="number" min="0" step="0.01" className={inputCls} value={f.valor||""} onChange={(e)=>setF({...f,valor:Number(e.target.value)})}/></Field>
        <Field label="Responsável pelo pagamento"><select className={inputCls} value={f.responsavelFuncionarioId||""} onChange={(e)=>escolherResponsavel(e.target.value)}><option value="">Escolha o colaborador</option>{s.funcionarios.map((x)=><option key={x.id} value={x.id}>{x.nome} — {x.cargo}</option>)}</select></Field>
        <Field label={f.recorrente===false?"Data da despesa":"Início da recorrência"}><input type="date" className={inputCls} value={f.inicio} onChange={(e)=>setF({...f,inicio:e.target.value})}/></Field>
        {f.recorrente!==false&&<Field label="Frequência"><select className={inputCls} value={f.frequencia} onChange={(e)=>setF({...f,frequencia:e.target.value as DespesaFixa["frequencia"]})}><option>Mensal</option><option>Trimestral</option><option>Semestral</option><option>Anual</option></select></Field>}
        <Field label="Dia do vencimento"><input type="number" min="1" max="31" className={inputCls} value={f.diaVencimento} onChange={(e)=>setF({...f,diaVencimento:Math.max(1,Math.min(31,Number(e.target.value)))})}/></Field>
        <Field label="Criar atividade quantos dias antes"><input type="number" min="0" max="60" className={inputCls} value={f.alertarDiasAntes} onChange={(e)=>setF({...f,alertarDiasAntes:Math.max(0,Number(e.target.value))})}/></Field>
      </div>

      <label className="flex items-start gap-3 rounded-xl border border-border bg-secondary/30 p-3 text-sm">
        <input type="checkbox" className="mt-1 accent-[var(--primary)]" checked={f.recorrente!==false} onChange={(e)=>setF({...f,recorrente:e.target.checked})}/>
        <span><b>Despesa recorrente</b><div className="mt-0.5 text-xs text-muted-foreground">Quando marcada, o BI cria automaticamente uma nova atividade para o responsável em cada competência, conforme a frequência escolhida.</div></span>
      </label>

      <div className="rounded-xl border border-primary/20 bg-primary/[.04] p-3 text-xs leading-relaxed text-muted-foreground">
        <b className="text-foreground">Atividade automática:</b> o responsável receberá “Pagar despesa fixa · {f.descricao || "nome da despesa"}” em Atividades, na data do lembrete. Ao marcar a despesa como paga, essa atividade também será finalizada.
      </div>

      <div>
        <div className="mb-2 text-xs font-black uppercase tracking-[.1em] text-muted-foreground">Quem também recebe o alerta no sininho?</div>
        <div className="grid gap-2 sm:grid-cols-2">
          {internos.map((u)=><label key={u.id} className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-sm ${f.alertaUsuarioIds.includes(u.id)?"border-primary/35 bg-primary/[.04]":"border-white/8"}`}><input type="checkbox" className="accent-[var(--primary)]" checked={f.alertaUsuarioIds.includes(u.id)} onChange={()=>toggleAlerta(u.id)}/><div><div className="font-bold">{u.nome}</div><div className="text-[10px] text-muted-foreground">{u.perfil}</div></div></label>)}
        </div>
      </div>

      <label className="flex items-center gap-3 rounded-xl border border-white/8 p-3 text-sm"><input type="checkbox" className="accent-[var(--primary)]" checked={f.ativa} onChange={(e)=>setF({...f,ativa:e.target.checked})}/><span><b>Despesa ativa</b><div className="text-xs text-muted-foreground">Se desativar, ela deixa de gerar previsão e alerta.</div></span></label>
      <Btn className="w-full" disabled={!f.descricao.trim()||f.valor<=0||!f.filialId||!f.responsavelFuncionarioId} onClick={salvar}><CalendarClock className="h-4 w-4"/>{existente?"Salvar alterações":"Cadastrar despesa fixa"}</Btn>
    </div>
  </Modal>;
}

function Empty({text}:{text:string}){return <div className="grid min-h-28 place-items-center text-center text-sm text-muted-foreground">{text}</div>}