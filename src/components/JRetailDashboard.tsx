import { useMemo, useState } from "react";
import { Line, LineChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useApp, brl, type JRetailLote } from "@/lib/store";

function valorBR(v: unknown): number {
  if (typeof v === "number") return v;
  const s = String(v ?? "").replace(/[^0-9,.-]/g, "").trim();
  if (!s) return NaN;
  const normalized = s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : /^-?\d{1,3}(\.\d{3})+$/.test(s) ? s.replace(/\./g, "") : s;
  return Number(normalized);
}
function codigo(v: unknown): string {
  const match = String(v ?? "").match(/^\s*(\d{1,3})\s*-/);
  return match ? match[1].padStart(2,"0") : "";
}
function readCsv(raw: string): Record<string,string>[] {
  const lines=raw.replace(/^\uFEFF/,"").trim().split(/\r?\n/);
  const separator=lines[0]?.includes(";") ? ";" : ",";
  const header=lines.shift()?.split(separator).map(x=>x.replace(/^"|"$/g,"").trim()) ?? [];
  return lines.map(l=>Object.fromEntries(l.split(separator).map((v,i)=>[header[i],v.replace(/^"|"$/g,"").trim()])));
}
type Linha = { codigo:string; filial:string; vendas:number; pedidos:number|null; ticket:number|null };
export function JRetailDashboard() {
  const {s,set}=useApp();
  const [inicio,setInicio]=useState("");
  const [fim,setFim]=useState("");
  const [tipo,setTipo]=useState<"vendas"|"ticket">("vendas");
  const [fileName,setFileName]=useState("");
  const [preview,setPreview]=useState<Linha[]>([]);
  const [erro,setErro]=useState("");
  const [dataFiltro,setDataFiltro]=useState("");
  const filiais=new Map(s.filiais.filter(f=>!f.isCD).map(f=>[String(f.codigo).padStart(2,"0"),f]));
  const historico=s.jretailLotes ?? [];
  // Operational snapshots from the existing central state are cumulative.
  // Display them without pretending they are independent daily sales.
  const snapshots = useMemo(() => {
    const map = new Map<string, { data:string; filiais:Set<string>; meta:number; faturamento:number }>();
    for (const r of s.resultadosDiarios || []) {
      if (!r.data || !filiais.has(String(s.filiais.find(f=>f.id===r.filialId)?.codigo || "").padStart(2,"0"))) continue;
      const atual = map.get(r.data) || { data:r.data, filiais:new Set<string>(), meta:0, faturamento:0 };
      if (atual.filiais.has(r.filialId)) continue;
      atual.filiais.add(r.filialId);
      atual.meta += Number(r.meta) || 0;
      atual.faturamento += Number(r.faturamento) || 0;
      map.set(r.data, atual);
    }
    return [...map.values()].sort((a,b)=>a.data.localeCompare(b.data));
  }, [s.resultadosDiarios,s.filiais]);

  async function carregar(file:File) {
    setErro("");setPreview([]);setFileName(file.name);
    try {
      const raw=await file.text();
      const obj=file.name.toLowerCase().endsWith(".json") ? JSON.parse(raw) : readCsv(raw);
      if (!Array.isArray(obj)) throw Error("Esperado um conjunto de linhas JSON/CSV.");
      const parsed:Linha[]=obj.map((row:Record<string,unknown>)=>{
        const c=codigo(row.INDICADOR);
        const venda=valorBR(row.VR);
        const ticket=valorBR(row["Ticket Médio"]);
        const pedidos=valorBR(row["Qtde Pedido"]);
        return {codigo:c,filial:String(row.INDICADOR??""),vendas:Number.isFinite(venda)?venda:0,pedidos:Number.isFinite(pedidos)?pedidos:null,ticket:Number.isFinite(ticket)?ticket:null};
      });
      if(!parsed.length||parsed.some(x=>!x.codigo)) throw Error("Não foi possível identificar os códigos das filiais.");
      if(tipo==="vendas" && obj.some((x:Record<string,unknown>)=>x.VR===undefined)) throw Error("Este arquivo não tem coluna VR. Selecione o tipo Ticket médio.");
      if(tipo==="ticket" && obj.some((x:Record<string,unknown>)=>x["Qtde Pedido"]===undefined)) throw Error("Arquivo sem Qtde Pedido. Selecione Vendas.");
      setPreview(parsed);
    }catch(e){setErro(e instanceof Error?e.message:"Erro ao ler arquivo.");}
  }
  const validas=preview.filter(x=>filiais.has(x.codigo) && x.codigo!=="04");
  const excluidas=preview.filter(x=>!filiais.has(x.codigo)||x.codigo==="04");
  const soma=validas.reduce((a,v)=>a+v.vendas,0);
  function salvar(){
    if(!inicio||!fim||inicio>fim){setErro("Confirme o início e fim reais do período exportado.");return;}
    if(!validas.length){setErro("Nenhuma filial ativa correspondente.");return;}
    const id=[tipo,inicio,fim,fileName].join("|");
    if(historico.some(x=>x.id===id)){setErro("Este arquivo já foi importado para este período.");return;}
    const lote:JRetailLote={id,inicio,fim,tipo,arquivo:fileName,importadoEm:new Date().toISOString(),linhas:validas};
    set(st=>({...st,jretailLotes:[...(st.jretailLotes??[]),lote]}));
    setPreview([]);setErro("");setFileName("");
  }
  const dias=useMemo(()=>historico.filter(x=>x.tipo==="vendas"&&x.inicio===x.fim).map(x=>({data:x.inicio,valor:x.linhas.reduce((a,l)=>a+l.vendas,0)})).sort((a,b)=>a.data.localeCompare(b.data)),[historico]);
  const exibidos=historico.filter(x=>!dataFiltro||x.inicio<=dataFiltro&&x.fim>=dataFiltro);
  return <section className="mt-5 rounded-2xl border border-white/10 bg-white/[.025] p-4 md:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="text-lg font-bold">Integração JRetail · Histórico comercial</h2><p className="text-xs text-muted-foreground">Importação assistida, preservando as datas e o histórico de cada relatório.</p></div>
      <span className="rounded-full border border-white/10 px-3 py-1 text-xs">{historico.length} arquivos registrados</span>
    </div>
    <div className="mt-4 rounded-xl border border-white/10 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="font-semibold">Histórico de resultados já salvo na base central</h3>
        <span className="text-xs text-muted-foreground">{snapshots.length} datas · {s.resultadosDiarios?.length || 0} registros de filiais</span>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">Fotografias acumuladas por data: não somar os totais de dias diferentes. Relatórios JRetail importados separadamente aparecem abaixo.</p>
      {snapshots.length ? <>
        <div className="mt-3 overflow-x-auto"><table className="w-full min-w-[580px] text-left text-xs">
          <thead><tr className="border-b border-white/10 text-muted-foreground"><th className="py-2">Data</th><th>Filiais</th><th>Meta</th><th>Faturamento acumulado</th><th>Atingimento</th></tr></thead>
          <tbody>{snapshots.map(d=><tr key={d.data} className="border-b border-white/5"><td className="py-2">{d.data}</td><td>{d.filiais.size}</td><td>{brl(d.meta)}</td><td>{brl(d.faturamento)}</td><td>{d.meta>0?(100*d.faturamento/d.meta).toFixed(1)+"%":"—"}</td></tr>)}</tbody>
        </table></div>
        <div className="mt-4 h-56"><ResponsiveContainer><LineChart data={snapshots}><CartesianGrid strokeDasharray="3 3" opacity={.2}/><XAxis dataKey="data"/><YAxis/><Tooltip formatter={(v)=>brl(Number(v))}/><Line type="monotone" dataKey="faturamento" name="Faturamento acumulado" stroke="var(--primary)" connectNulls={false}/></LineChart></ResponsiveContainer></div>
      </> : <p className="mt-2 text-xs text-muted-foreground">Nenhuma fotografia comercial registrada.</p>}
    </div>
    <div className="mt-4 grid gap-3 md:grid-cols-4">
      <label className="text-xs">Tipo de relatório<select className="mt-1 w-full rounded-lg border border-white/15 bg-background p-2" value={tipo} onChange={e=>{setTipo(e.target.value as "vendas"|"ticket");setPreview([])}}><option value="vendas">Vendas (VR)</option><option value="ticket">Ticket e pedidos</option></select></label>
      <label className="text-xs">Início do período<input className="mt-1 w-full rounded-lg border border-white/15 bg-background p-2" type="date" value={inicio} onChange={e=>setInicio(e.target.value)}/></label>
      <label className="text-xs">Fim do período<input className="mt-1 w-full rounded-lg border border-white/15 bg-background p-2" type="date" value={fim} onChange={e=>setFim(e.target.value)}/></label>
      <label className="text-xs">Arquivo JSON ou CSV<input className="mt-1 w-full text-xs" type="file" accept=".json,.csv" onChange={e=>{const f=e.target.files?.[0];if(f)void carregar(f);e.target.value="";}}/></label>
    </div>
    {erro&&<p className="mt-3 text-sm text-red-400" role="alert">{erro}</p>}
    {!!preview.length&&<div className="mt-4 rounded-xl border border-white/10 p-3">
      <p className="text-sm font-semibold">Prévia de {fileName}</p>
      <p className="mt-1 text-xs text-muted-foreground">{validas.length} filiais reconhecidas · {excluidas.length} E-Commerce/desconhecidas excluídas · {tipo==="vendas"?brl(soma):"valores de ticket e pedidos"}</p>
      <div className="mt-2 max-h-52 overflow-auto text-xs">{validas.slice(0,50).map(x=><div key={x.codigo} className="flex justify-between border-b border-white/5 py-1"><span>{x.filial}</span><span>{tipo==="vendas"?brl(x.vendas):`${x.pedidos??"—"} pedidos · ${x.ticket===null?"—":brl(x.ticket)}`}</span></div>)}</div>
      <button className="mt-3 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground" onClick={salvar}>Confirmar e guardar histórico</button>
    </div>}
    <p className="mt-3 text-xs text-muted-foreground">Períodos acumulados são guardados como intervalos. Não são distribuídos artificialmente por dia e não serão somados a outros intervalos sobrepostos.</p>
    <div className="mt-4 flex items-center gap-3"><label className="text-xs">Consultar histórico em <input className="ml-2 rounded-lg border border-white/15 bg-background p-2" type="date" value={dataFiltro} onChange={e=>setDataFiltro(e.target.value)}/></label><button className="text-xs underline" onClick={()=>setDataFiltro("")}>Todos</button></div>
    <div className="mt-3 max-h-48 overflow-auto text-xs">{exibidos.length?exibidos.map(x=><div key={x.id} className="flex flex-wrap justify-between gap-2 border-b border-white/10 py-2"><span>{x.inicio===x.fim?x.inicio:`${x.inicio} → ${x.fim}`} · {x.tipo==="vendas"?"Vendas":"Ticket"} · {x.linhas.length} lojas</span><span>{x.tipo==="vendas"?brl(x.linhas.reduce((a,l)=>a+l.vendas,0)):"Pedidos/ticket"} · {x.arquivo}</span></div>):<p className="text-muted-foreground">Sem dados para esta seleção.</p>}</div>
    <h3 className="mt-5 text-sm font-semibold">Evolução das vendas diárias registradas</h3>
    {dias.length?<div className="mt-2 h-56 w-full"><ResponsiveContainer><LineChart data={dias}><CartesianGrid strokeDasharray="3 3" opacity={.2}/><XAxis dataKey="data"/><YAxis/><Tooltip formatter={(v)=>brl(Number(v))}/><Line type="monotone" dataKey="valor" stroke="var(--primary)" connectNulls={false}/></LineChart></ResponsiveContainer></div>:<p className="mt-2 text-xs text-muted-foreground">Sem registros de um único dia para desenhar a evolução. Exporte relatórios diários no JRetail.</p>}
  </section>;
}
