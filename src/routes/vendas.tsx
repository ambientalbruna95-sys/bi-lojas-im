import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { Upload, Download, TrendingUp, Trophy } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { useApp, uid, brl, fmtDate, filialNome, type Venda } from "@/lib/store";
import { lerPlanilhaResultados, mesclarResultados } from "@/lib/resultados-import";
import { PageHeader, Panel, Btn, Stat, inputCls, Field, Badge, pageHead } from "@/components/kit";

export const Route = createFileRoute("/vendas")({ head: pageHead("Vendas", "Histórico anual de vendas por filial com importação CSV/XLSX."), component: Page });

const MESES=["Jan","Fev","Mar","Abr","Mai","Jun","Jul","Ago","Set","Out","Nov","Dez"];

function Page() {
  const { s, set } = useApp();
  const ref = useRef<HTMLInputElement>(null);
  const anos=[...new Set(s.vendas.map(v=>v.data.slice(0,4)))].sort().reverse();
  const [ano,setAno]=useState(anos[0]||String(new Date().getFullYear()));
  const [filial,setFilial]=useState("");

  const lista=s.vendas.filter(v=>v.data.startsWith(ano)&&(!filial||v.filialId===filial)).sort((a,b)=>b.data.localeCompare(a.data));
  const total=lista.reduce((a,v)=>a+v.valor,0);
  const meses=MESES.map((nome,i)=>{
    const chave=`${ano}-${String(i+1).padStart(2,"0")}`;
    return {mes:nome,valor:lista.filter(v=>v.data.startsWith(chave)).reduce((a,v)=>a+v.valor,0)};
  });
  const mesesComVenda=meses.filter(x=>x.valor>0);
  const mediaMensal=mesesComVenda.length?total/mesesComVenda.length:0;
  const melhorMes=[...meses].sort((a,b)=>b.valor-a.valor)[0];

  const ranking=useMemo(()=>s.filiais.filter(f=>!f.isCD).map(f=>({
    id:f.id,codigo:f.codigo,nome:f.nome,
    valor:s.vendas.filter(v=>v.filialId===f.id&&v.data.startsWith(ano)).reduce((a,v)=>a+v.valor,0)
  })).filter(x=>x.valor>0).sort((a,b)=>b.valor-a.valor),[s.vendas,s.filiais,ano]);

  async function importar(file: File) {
    try {
      const diario = await lerPlanilhaResultados(file, s.filiais);
      if (diario.registros.length) {
        const vendasNovas: Venda[] = diario.formato === "movimento_diario"
          ? diario.registros
              .filter((r) => r.faturamento > 0)
              .map((r) => ({ id: `v-${r.filialId}-${r.data}`, filialId: r.filialId, data: r.data, valor: r.faturamento }))
          : [];

        set((st) => {
          const chaves = new Set(vendasNovas.map((v) => `${v.filialId}|${v.data}`));
          const vendasSemDuplicar = st.vendas.filter((v) => !chaves.has(`${v.filialId}|${v.data}`));
          return {
            ...st,
            resultadosDiarios: mesclarResultados(st.resultadosDiarios, diario.registros),
            vendas: vendasNovas.length ? [...vendasNovas, ...vendasSemDuplicar] : st.vendas,
          };
        });

        toast.success(`${diario.registros.length} resultados diários atualizados`, {
          description: diario.ignoradas ? `${diario.ignoradas} linha(s) não puderam ser identificadas.` : "Meta e faturamento foram atualizados sem duplicar filial/data.",
        });
        return;
      }

      // Mantém suporte ao formato anual antigo de vendas.
      const XLSX = await import("xlsx");
      const wb = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[wb.SheetNames[0] ?? ""]!);
      const novas: Venda[] = [];

      const parseValor = (raw: unknown) => {
        const s = String(raw ?? "").trim().replace(/R\$/gi, "").replace(/\s/g, "");
        const cleaned = s.replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".").replace(/[^0-9.-]/g, "");
        const n = Number(cleaned);
        return Number.isFinite(n) ? n : 0;
      };

      for (const r of rows) {
        const low = Object.fromEntries<unknown>(Object.entries(r).map(([k,v])=>[k.toLowerCase().trim(),v]));
        const fil=String(low["filial"]??low["loja"]??low["código"]??low["codigo"]??"").trim();
        const loja=s.filiais.find(x=>x.id===fil||x.nome.toLowerCase()===fil.toLowerCase()||x.cidade.toLowerCase()===fil.toLowerCase()||x.codigo===fil.padStart(2,"0"));

        if (loja) {
          for (let i=0;i<12;i++) {
            const nomes=[MESES[i].toLowerCase(),String(i+1),String(i+1).padStart(2,"0")];
            const key=Object.keys(low).find(k=>nomes.some(n=>k===n||k.startsWith(n+" ")||k.includes(n)));
            if(!key) continue;
            const valor=parseValor(low[key]);
            if(valor) novas.push({id:uid(),filialId:loja.id,valor,data:`${ano}-${String(i+1).padStart(2,"0")}-01`});
          }
        }
      }
      set(st=>({...st,vendas:[...novas,...st.vendas]}));
      toast.success(`${novas.length} lançamentos importados`,{description:"O relatório anual foi atualizado."});
    } catch {
      toast.error("Não foi possível ler o arquivo");
    }
  }

  const modelo=()=>{
    const blob=new Blob(["filial,data,meta,faturamento\n02,2026-10-13,90000,84500\n03,2026-10-13,75000,78100\n"],{type:"text/csv"});
    const a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="modelo-meta-faturamento-diario.csv";a.click();
  };

  return <>
    <PageHeader title="Vendas" sub="Relatório anual, evolução mensal e ranking das 30 filiais" action={<div className="flex gap-2">
      <Btn variant="outline" onClick={modelo}><Download className="h-4 w-4"/>Modelo</Btn>
      <Btn onClick={()=>ref.current?.click()}><Upload className="h-4 w-4"/>Importar CSV/XLSX</Btn>
      <input ref={ref} type="file" accept=".csv,.xlsx,.xls" hidden onChange={e=>{const f=e.target.files?.[0];if(f)importar(f);e.target.value="";}}/>
    </div>} />

    <div className="mb-4 grid gap-3 md:grid-cols-2">
      <Field label="Ano"><select className={inputCls} value={ano} onChange={e=>setAno(e.target.value)}>{[...new Set([...anos,String(new Date().getFullYear())])].sort().reverse().map(x=><option key={x}>{x}</option>)}</select></Field>
      <Field label="Filial"><select className={inputCls} value={filial} onChange={e=>setFilial(e.target.value)}><option value="">Todas as filiais</option>{s.filiais.filter(f=>!f.isCD).map(f=><option key={f.id} value={f.id}>{f.codigo} — {f.nome}</option>)}</select></Field>
    </div>

    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <Stat accent label="Faturamento do ano" value={brl(total)} hint={filial?filialNome(s,filial):"rede"} />
      <Stat label="Média mensal" value={brl(mediaMensal)} hint={`${mesesComVenda.length} meses com dados`} />
      <Stat label="Melhor mês" value={melhorMes?.valor?brl(melhorMes.valor):"—"} hint={melhorMes?.valor?melhorMes.mes:"sem dados"} />
      <Stat label="Melhor filial" value={ranking[0]?brl(ranking[0].valor):"—"} hint={ranking[0]?.nome||"sem dados"} />
    </div>

    <div className="mt-4 grid gap-4 lg:grid-cols-2">
      <Panel title={`Evolução mensal · ${ano}`}>
        <div className="h-72"><ResponsiveContainer><LineChart data={meses}><CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/><XAxis dataKey="mes" fontSize={11}/><YAxis fontSize={11} tickFormatter={v=>`${Math.round(v/1000)}k`}/><Tooltip formatter={(v:number)=>brl(v)}/><Line dataKey="valor" stroke="var(--primary)" strokeWidth={3} dot={{r:3}}/></LineChart></ResponsiveContainer></div>
      </Panel>
      <Panel title="Ranking das filiais" action={<Trophy className="h-4 w-4 text-primary"/>}>
        <div className="max-h-72 overflow-auto space-y-2">{ranking.slice(0,15).map((x,i)=><div key={x.id} className="flex items-center justify-between rounded-md border p-3 text-sm"><div className="flex items-center gap-3"><span className="grid h-6 w-6 place-items-center rounded-full bg-muted text-xs font-bold">{i+1}</span><div><b>{x.codigo} — {x.nome}</b></div></div><b>{brl(x.valor)}</b></div>)}</div>
      </Panel>
    </div>

    <Panel title="Resumo mensal" className="mt-4">
      <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead><tr className="border-b text-left text-xs uppercase text-muted-foreground"><th className="pb-2">Mês</th><th>Faturamento</th><th>% do ano</th><th>Status</th></tr></thead><tbody>{meses.map(m=><tr key={m.mes} className="border-b last:border-0"><td className="py-2"><b>{m.mes}</b></td><td>{brl(m.valor)}</td><td>{total?((m.valor/total)*100).toFixed(1)+"%":"—"}</td><td><Badge tone={m.valor>0?"success":"muted"}>{m.valor>0?"Com dados":"Sem dados"}</Badge></td></tr>)}</tbody></table></div>
    </Panel>

    <Panel title="Lançamentos importados" className="mt-4">
      <div className="max-h-[420px] overflow-auto"><table className="w-full text-sm"><thead className="sticky top-0 bg-card text-left text-xs uppercase text-muted-foreground"><tr><th className="py-2">Filial</th><th>Data</th><th className="text-right">Valor</th></tr></thead><tbody>{lista.slice(0,300).map(v=><tr key={v.id} className="border-t"><td className="py-2">{filialNome(s,v.filialId)}</td><td>{fmtDate(v.data)}</td><td className="text-right font-medium">{brl(v.valor)}</td></tr>)}</tbody></table></div>
    </Panel>
  </>;
}