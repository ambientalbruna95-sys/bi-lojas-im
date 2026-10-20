import { createFileRoute } from "@tanstack/react-router";

const BASE = "https://gestaoim.com";

type Candidate = { path: string; source: string; scoreHint: number };
type Row = {
  codigo: string;
  filial: string;
  meta: number | null;
  faturamento: number | null;
  percentual: number | null;
  dataBase: string;
};

type CrmFilial = {
  id: string;
  name: string;
};

const FILIAIS = [
  ["02","varginha"],["03","tres pontas loja 03"],["05","tres pontas loja 05"],
  ["06","carmo cachoeira"],["08","campo do meio"],["10","conc dos ouros"],
  ["11","areado"],["12","conc aparecida"],["13","santana vargem"],["14","careacu"],
  ["15","congonhal"],["16","coqueiral"],["18","cabo verde"],["19","monte sto minas"],
  ["20","arceburgo"],["21","nova resende"],["22","juruaia"],["23","cachoeira minas"],
  ["24","bandeira do sul"],["25","bueno brandao"],["26","ipuiuna"],["27","caldas"],
  ["28","alterosa"],["29","pocos de caldas"],["30","corrego do ouro"],["31","muzambinho"],
  ["32","nepomuceno"],["33","campos gerais"],["35","divisa nova"],["38","bom repouso"],
] as const;

const DIRECT: Candidate[] = [
  { path:"/api/metas/cascade", source:"known-metas-cascade", scoreHint:30 },
  { path:"/api/push/meta-summary", source:"known-summary", scoreHint:1 },
  { path:"/api/metas", source:"guess", scoreHint:8 },
  { path:"/api/push/metas", source:"guess", scoreHint:8 },
  { path:"/api/metas/filiais", source:"guess", scoreHint:12 },
  { path:"/api/push/metas-filiais", source:"guess", scoreHint:12 },
  { path:"/api/filiais/metas", source:"guess", scoreHint:12 },
  { path:"/api/filiais/resumo", source:"guess", scoreHint:10 },
  { path:"/api/push/filiais", source:"guess", scoreHint:10 },
  { path:"/api/ranking", source:"guess", scoreHint:10 },
  { path:"/api/push/ranking", source:"guess", scoreHint:10 },
  { path:"/api/vendas/resumo", source:"guess", scoreHint:8 },
  { path:"/api/push/vendas", source:"guess", scoreHint:8 },
  { path:"/api/faturamento", source:"guess", scoreHint:8 },
  { path:"/api/push/faturamento", source:"guess", scoreHint:8 },
  { path:"/api/dashboard/filiais", source:"guess", scoreHint:12 },
];

export const Route = createFileRoute("/api/gestaoim/filiais-performance")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const email = process.env.GESTAOIM_EMAIL;
        const pass = process.env.GESTAOIM_PASSWORD;
        if (!email || !pass) {
          return Response.json({ ok:false, error: `Integração do GestãoIM não configurada. Variável ausente: ${["GESTAOIM_EMAIL","GESTAOIM_PASSWORD"].filter((k) => !process.env[k]).join(", ")}` }, { status:503 });
        }

        const url = new URL(request.url);
        const competenciaParam = normalizaCompetencia(url.searchParams.get("competencia"));
        const startParam = normalizaData(url.searchParams.get("start"));
        const endParam = normalizaData(url.searchParams.get("end"));
        const rangeMode = !!(startParam && endParam);
        const competencia = competenciaParam || startParam?.slice(0,7) || new Date().toISOString().slice(0,7);

        try {
          const cookie = await autenticar(email, pass);
          const dataBase = rangeMode ? endParam! : fimConsulta(competencia);
          const inicioPeriodo = rangeMode ? startParam! : competencia + "-01";
          const crmFiliais = await buscarFiliaisCrm(cookie);

          const tentativas: string[] = [];
          const resultados = new Map<string,{ row:Row; score:number; endpoint:string }>();

          // Rota oficial confirmada no frontend do GestãoIM.
          // Ela devolve a cascata Rede > Regional > Loja > Vendedor com
          // total_goal, cumulative_actual e pct_achieved por filial.
          const cascadePath = `/api/metas/cascade?start=${encodeURIComponent(inicioPeriodo)}&end=${encodeURIComponent(dataBase)}`;
          tentativas.push(cascadePath);
          const cascadeRes = await fetch(BASE + cascadePath, {
            headers:{ accept:"application/json,text/plain,*/*", cookie, referer:BASE+"/dashboard.html" },
            cache:"no-store",
            signal:AbortSignal.timeout(10000),
          }).catch(()=>null);

          if (cascadeRes?.ok) {
            const cascadePayload = await cascadeRes.json().catch(()=>null);
            if (cascadePayload != null) {
              const cascadeRows = extrair(cascadePayload, competencia, dataBase);
              for (const row of cascadeRows) {
                const completeness=(row.meta!=null?8:0)+(row.faturamento!=null?8:0)+(row.percentual!=null?2:0);
                const atual=resultados.get(row.codigo);
                const score=50+completeness;
                if (!atual || score>atual.score) {
                  resultados.set(row.codigo,{row,score,endpoint:"/api/metas/cascade"});
                }
              }
            }
          }

          if (!rangeMode) {
            const directResult = await consultarCandidatos(cookie, variants(DIRECT, competencia, dataBase), competencia, dataBase, tentativas, resultados, 60);
            if (!directResult || resultados.size < FILIAIS.length) {
              const descobertos = await descobrir(cookie);
              await consultarCandidatos(cookie, variants(descobertos, competencia, dataBase), competencia, dataBase, tentativas, resultados, 100);
            }
          }

          let rows = [...resultados.values()]
            .map((x)=>x.row)
            .filter((x)=>x.meta != null || x.faturamento != null)
            .sort((a,b)=>a.codigo.localeCompare(b.codigo));

          // Mesmo quando já encontramos parte das filiais, tentamos preencher as
          // que faltam consultando o resumo por loja. Antes esta sondagem só rodava
          // quando ZERO filiais eram encontradas, o que deixava a Dashboard parcial.
          if (!rangeMode && rows.length < FILIAIS.length) {
            const sondados = await sondarMetaSummaryPorFilial(cookie, competencia, dataBase, crmFiliais);
            for (const row of sondados) {
              const atual = resultados.get(row.codigo);
              if (!atual) {
                resultados.set(row.codigo, { row, score:40, endpoint:"/api/push/meta-summary?filial=<codigo>" });
              } else {
                const merged = { ...atual.row };
                if (merged.meta == null && row.meta != null) merged.meta = row.meta;
                if (merged.faturamento == null && row.faturamento != null) merged.faturamento = row.faturamento;
                if (merged.percentual == null && row.percentual != null) merged.percentual = row.percentual;
                resultados.set(row.codigo, { ...atual, row: merged });
              }
            }
            rows = [...resultados.values()]
              .map((x)=>x.row)
              .filter((x)=>x.meta != null || x.faturamento != null)
              .sort((a,b)=>a.codigo.localeCompare(b.codigo));
          }

          if (!rows.length) {
            const descobertos = await descobrir(cookie);
            return Response.json({
              ok:false,
              configured:true,
              competencia,
              start: inicioPeriodo,
              end: dataBase,
              crmFiliais,
              attempted:tentativas.slice(0,35),
              discovered:descobertos.map((x)=>x.path).slice(0,35),
              error:"O GestãoIM autenticou e a lista oficial de filiais do CRM foi localizada, mas a rota que devolve Meta e Faturamento por filial ainda não foi confirmada.",
              nextStep:"No Network do GestãoIM, selecione uma filial e procure a requisição que muda quando a filial muda. Agora já sabemos que /api/crm/filtros entrega os IDs oficiais das lojas.",
            }, { status:404, headers:{ "cache-control":"no-store" } });
          }

          const endpoints = [...new Set([...resultados.values()].map((x)=>x.endpoint))];
          const codigosEncontrados = new Set(rows.map((x)=>x.codigo));
          const faltantes = FILIAIS
            .filter(([codigo])=>!codigosEncontrados.has(codigo))
            .map(([codigo,nome])=>({ codigo, nome }));
          return Response.json({
            ok:true,
            competencia,
            start: inicioPeriodo,
            end: dataBase,
            dataBase,
            fetchedAt:new Date().toISOString(),
            total:rows.length,
            esperado:FILIAIS.length,
            completo:rows.length === FILIAIS.length,
            faltantes,
            endpoints,
            crmFiliais,
            filiais:rows,
          }, { headers:{ "cache-control":"no-store" } });
        } catch (error) {
          return Response.json({
            ok:false,
            error:error instanceof Error ? error.message : "Falha ao consultar Meta e Faturamento por filial.",
          }, { status:502, headers:{ "cache-control":"no-store" } });
        }
      },
    },
  },
});

async function autenticar(email:string,password:string) {
  const auth = await fetch(BASE+"/api/auth/login", {
    method:"POST",
    headers:{ "content-type":"application/json", accept:"application/json" },
    body:JSON.stringify({ email, password }),
    cache:"no-store",
    signal:AbortSignal.timeout(10000),
  });
  if (!auth.ok) throw new Error("Falha na autenticação do GestãoIM.");
  const cookie=(auth.headers.get("set-cookie")||"").split(";")[0];
  if (!cookie) throw new Error("O GestãoIM não devolveu uma sessão válida.");
  return cookie;
}

async function consultarCandidatos(
  cookie:string,
  candidatos:Candidate[],
  competencia:string,
  dataBase:string,
  tentativas:string[],
  resultados:Map<string,{ row:Row; score:number; endpoint:string }>,
  limite:number,
) {
  for (const cand of candidatos) {
    if (tentativas.length >= limite) break;
    if (tentativas.includes(cand.path)) continue;
    tentativas.push(cand.path);

    const res = await fetch(BASE+cand.path, {
      headers:{ accept:"application/json,text/plain,*/*", cookie, referer:BASE+"/dashboard.html" },
      cache:"no-store",
      signal:AbortSignal.timeout(6500),
    }).catch(()=>null);
    if (!res || !res.ok) continue;

    const ct=res.headers.get("content-type")||"";
    let payload:unknown=null;
    if (ct.includes("application/json")) payload=await res.json().catch(()=>null);
    else {
      const t=await res.text().catch(()=>"");
      if (!t || /<html|<!doctype/i.test(t.slice(0,200))) continue;
      payload=safeJson(t);
    }
    if (payload == null) continue;

    const rows=extrair(payload, competencia, dataBase);
    if (!rows.length) continue;

    for (const row of rows) {
      const completeness=(row.meta!=null?8:0)+(row.faturamento!=null?8:0)+(row.percentual!=null?2:0);
      const score=cand.scoreHint+completeness+rows.length;
      const atual=resultados.get(row.codigo);
      if (!atual || score>atual.score) resultados.set(row.codigo,{row,score,endpoint:cand.path});
      else {
        const merged={...atual.row};
        if (merged.meta==null && row.meta!=null) merged.meta=row.meta;
        if (merged.faturamento==null && row.faturamento!=null) merged.faturamento=row.faturamento;
        if (merged.percentual==null && row.percentual!=null) merged.percentual=row.percentual;
        resultados.set(row.codigo,{...atual,row:merged});
      }
    }

    const completos=[...resultados.values()].filter((x)=>x.row.meta!=null && x.row.faturamento!=null).length;
    if (completos>=FILIAIS.length || resultados.size>=FILIAIS.length) return true;
  }
  return false;
}

async function sondarMetaSummaryPorFilial(
  cookie:string,
  competencia:string,
  dataBase:string,
  crmFiliais:CrmFilial[],
):Promise<Row[]> {
  const params = ["filial","branch","loja"];
  const encontrados = new Map<string,Row>();

  const alvos = crmFiliais.length
    ? crmFiliais.map((f) => ({
        id: String(f.id),
        name: f.name,
        oficial: identificarFilial(f.name, { id:f.id, name:f.name }),
      }))
    : FILIAIS.map(([codigo,nome]) => ({
        id: String(Number(codigo)),
        name: nome,
        oficial: { codigo, nome },
      }));

  for (const param of params) {
    const grupos = chunk(alvos, 8);
    for (const grupo of grupos) {
      const respostas = await Promise.all(grupo.map(async (alvo) => {
        const path = `/api/push/meta-summary?${param}=${encodeURIComponent(alvo.id)}`;
        const res = await fetch(BASE+path, {
          headers:{accept:"application/json,text/plain,*/*",cookie,referer:BASE+"/dashboard.html"},
          cache:"no-store",
          signal:AbortSignal.timeout(5000),
        }).catch(()=>null);
        if (!res || !res.ok) return [] as Row[];

        const payload = await res.json().catch(()=>null);
        if (payload == null) return [] as Row[];

        let rows = extrair(payload, competencia, dataBase);

        // O meta-summary por filial pode manter o label genérico/sem código.
        // Quando isso acontecer, vinculamos a resposta ao ID/nome oficial do CRM
        // que foi usado na própria consulta.
        if (!rows.length && alvo.oficial && payload && typeof payload === "object") {
          const obj = payload as Record<string, unknown>;
          const meta = firstNumber(obj,[
            "meta","meta_mes","meta_mensal","meta_vendas","meta_faturamento","target","goal","valor_meta","vl_meta","meta_total","total_goal","total_goal",
          ]);
          const faturamento = firstNumber(obj,[
            "faturamento","faturamento_mes","faturado","realizado","vendido","vendido_mes","vendas","vendas_mes",
            "valor_vendido","valor_vendas","total_vendas","sales","revenue","receita","receita_mes","valor_realizado",
          ]);
          let percentual = firstNumber(obj,["pct","percentual","percentual_meta","pct_meta","pct_achieved","atingimento","atingimento_meta"]);
          if (percentual!=null && percentual>0 && percentual<=1) percentual*=100;

          if (meta!=null || faturamento!=null || percentual!=null) {
            rows = [{
              codigo: alvo.oficial.codigo,
              filial: alvo.oficial.nome,
              meta,
              faturamento,
              percentual: percentual ?? (meta && faturamento!=null ? faturamento/meta*100 : null),
              dataBase,
            }];
          }
        }

        if (alvo.oficial) {
          rows = rows.filter((r)=>r.codigo===alvo.oficial?.codigo);
        }
        return rows;
      }));

      for (const arr of respostas) {
        for (const row of arr) encontrados.set(row.codigo,row);
      }
    }
    if (encontrados.size >= FILIAIS.length) break;
  }

  return [...encontrados.values()];
}

async function buscarFiliaisCrm(cookie:string):Promise<CrmFilial[]> {
  const res = await fetch(BASE+"/api/crm/filtros", {
    headers:{accept:"application/json,text/plain,*/*",cookie,referer:BASE+"/dashboard.html"},
    cache:"no-store",
    signal:AbortSignal.timeout(7000),
  }).catch(()=>null);

  if (!res || !res.ok) return [];

  const data = await res.json().catch(()=>null) as {
    filiais?: Array<{id?:string|number; name?:string}>;
    filiais_crm?: Array<string|number>;
  } | null;

  if (!data) return [];

  const permitidas = new Set((data.filiais_crm || []).map((x)=>String(x)));
  return (data.filiais || [])
    .filter((f)=>f?.id != null && (!permitidas.size || permitidas.has(String(f.id))))
    .map((f)=>({ id:String(f.id), name:String(f.name || "") }))
    .filter((f)=>f.id && f.name);
}

function chunk<T>(arr:T[], size:number) {
  const out:T[][]=[];
  for (let i=0;i<arr.length;i+=size) out.push(arr.slice(i,i+size));
  return out;
}

async function descobrir(cookie:string):Promise<Candidate[]> {
  const html=await fetch(BASE+"/dashboard.html", {
    headers:{cookie,accept:"text/html,*/*"},
    cache:"no-store",
    signal:AbortSignal.timeout(9000),
  }).then((r)=>r.ok?r.text():"").catch(()=>"");
  if (!html) return [];

  const scripts=[...html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)]
    .map((m)=>m[1])
    .filter(Boolean)
    .map((src)=>{ try{return new URL(src,BASE).toString();}catch{return "";} })
    .filter((src)=>src.startsWith(BASE))
    .slice(0,28);

  const found:Candidate[]=[];
  for (const src of scripts) {
    const js=await fetch(src,{
      headers:{cookie,accept:"application/javascript,text/javascript,*/*",referer:BASE+"/dashboard.html"},
      cache:"no-store",
      signal:AbortSignal.timeout(6500),
    }).then((r)=>r.ok?r.text():"").catch(()=>"");
    if (!js) continue;

    const literals=[...js.matchAll(/["'`](\/api\/[A-Za-z0-9_./?=&%:+-]+)["'`]/g)].map((m)=>m[1]);
    for (const path of literals) {
      if (!/(meta|filial|loja|venda|fatur|ranking|performance|resumo|resultado)/i.test(path)) continue;
      const strong=/(filial|loja|ranking|performance)/i.test(path);
      found.push({path,source:"javascript",scoreHint:strong?14:7});
    }

    for (const hit of js.matchAll(/por_filial|por filial|meta.*filial|fatur.*filial|ranking.*meta|vendas.*filial/gi)) {
      const idx=hit.index||0;
      const chunk=js.slice(Math.max(0,idx-1200),Math.min(js.length,idx+1200));
      for (const api of chunk.matchAll(/["'`](\/api\/[A-Za-z0-9_./?=&%:+-]+)["'`]/g)) {
        found.push({path:api[1],source:"javascript-context",scoreHint:18});
      }
    }
  }
  return uniq(found);
}

function variants(candidates:Candidate[], competencia:string, fim:string) {
  const inicio=competencia+"-01";
  const out:Candidate[]=[];
  for (const c of uniq(candidates)) {
    const p=c.path.replace(BASE,"");
    out.push({...c,path:p});
    if (!p.includes("?")) {
      out.push({...c,path:p+"?competencia="+encodeURIComponent(competencia)});
      out.push({...c,path:p+"?mes="+encodeURIComponent(competencia)});
      out.push({...c,path:p+"?month="+encodeURIComponent(competencia)});
      out.push({...c,path:p+"?start="+inicio+"&end="+fim});
      out.push({...c,path:p+"?data_inicio="+inicio+"&data_fim="+fim});
      out.push({...c,path:p+"?date_start="+inicio+"&date_end="+fim});
      out.push({...c,path:p+"?payment_start="+inicio+"&payment_end="+fim});
    }
  }
  return uniq(out);
}

function extrair(payload:unknown, competencia:string, dataBase:string):Row[] {
  const objects=collectObjects(payload);
  const map=new Map<string,Row>();

  for (const obj of objects) {
    const filialRaw=firstString(obj,[
      "filial","filial_nome","nome_filial","loja","loja_nome","unidade","branch","branch_name",
      "codigo_filial","cod_filial","filial_codigo","codigo_loja","cod_loja","branch_id","filial_id",
      "label","nome","name",
    ]);
    const match=identificarFilial(filialRaw,obj);
    if (!match) continue;

    const meta=firstNumber(obj,[
      "meta","meta_mes","meta_mensal","meta_vendas","meta_faturamento","target","goal","total_goal","valor_meta","vl_meta","meta_total",
    ]);
    const faturamento=firstNumber(obj,[
      "faturamento","faturamento_mes","faturado","realizado","vendido","vendido_mes","vendas","vendas_mes",
      "valor_vendido","valor_vendas","total_vendas","sales","revenue","receita","receita_mes","valor_realizado","cumulative_actual",
    ]);
    let percentual=firstNumber(obj,["pct","percentual","percentual_meta","pct_meta","pct_achieved","atingimento","atingimento_meta"]);
    if (percentual!=null && percentual>0 && percentual<=1) percentual*=100;

    if (meta==null && faturamento==null && percentual==null) continue;

    const row:Row={
      codigo:match.codigo,
      filial:match.nome,
      meta,
      faturamento,
      percentual: percentual ?? (meta && faturamento!=null ? faturamento/meta*100 : null),
      dataBase:firstDate(obj,competencia,dataBase),
    };

    const old=map.get(row.codigo);
    if (!old) map.set(row.codigo,row);
    else map.set(row.codigo,{
      ...old,
      meta:old.meta ?? row.meta,
      faturamento:old.faturamento ?? row.faturamento,
      percentual:old.percentual ?? row.percentual,
      dataBase:row.dataBase || old.dataBase,
    });
  }

  return [...map.values()];
}

function identificarFilial(raw:string,obj:Record<string,unknown>) {
  const texts=[raw, ...Object.values(obj).filter((v)=>typeof v==="string").slice(0,10).map(String)].filter(Boolean);
  for (const text of texts) {
    const norm=normaliza(text);
    const codeMatch=String(text).match(/(?:^|\D)(0?\d{1,2})(?:\D|$)/);
    if (codeMatch) {
      const code=codeMatch[1].padStart(2,"0");
      const found=FILIAIS.find(([c])=>c===code);
      if (found) return {codigo:found[0],nome:found[1]};
    }
    const byName=FILIAIS.find(([,nome])=>norm.includes(nome)||nome.includes(norm));
    if (byName && norm.length>=4) return {codigo:byName[0],nome:byName[1]};
  }
  return null;
}

function collectObjects(value:unknown,depth=0):Record<string,unknown>[] {
  if (depth>7 || value==null) return [];
  if (Array.isArray(value)) return value.flatMap((x)=>collectObjects(x,depth+1));
  if (typeof value==="object") {
    const obj=value as Record<string,unknown>;
    return [obj,...Object.values(obj).flatMap((x)=>collectObjects(x,depth+1))];
  }
  return [];
}

function firstString(obj:Record<string,unknown>,aliases:string[]) {
  const entries=Object.entries(obj);
  for (const alias of aliases.map(normalizeKey)) {
    const found=entries.find(([k])=>normalizeKey(k)===alias);
    if (!found) continue;
    const v=found[1];
    if (typeof v==="string" && v.trim()) return v.trim();
    if (typeof v==="number") return String(v);
    if (v && typeof v==="object") {
      const n=v as Record<string,unknown>;
      const nested=n.nome??n.name??n.codigo??n.code??n.id;
      if (typeof nested==="string"||typeof nested==="number") return String(nested);
    }
  }
  return "";
}

function firstNumber(obj:Record<string,unknown>,aliases:string[]) {
  const entries=Object.entries(obj);
  for (const alias of aliases.map(normalizeKey)) {
    const found=entries.find(([k])=>normalizeKey(k)===alias);
    if (!found) continue;
    const parsed=parseNumber(found[1]);
    if (parsed!=null) return parsed;
  }
  return null;
}

function firstDate(obj:Record<string,unknown>,competencia:string,fallback:string) {
  const raw=firstString(obj,["data","data_base","data_atualizacao","dt_atualizacao","competencia","mes","referencia"]);
  if (!raw) return fallback;
  const iso=raw.match(/(20\d{2})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const br=raw.match(/(\d{1,2})\/(\d{1,2})\/(20\d{2})/);
  if (br) return `${br[3]}-${br[2].padStart(2,"0")}-${br[1].padStart(2,"0")}`;
  return competencia===fallback.slice(0,7)?fallback:competencia+"-01";
}

function parseNumber(value:unknown) {
  if (typeof value==="number"&&Number.isFinite(value)) return value;
  if (typeof value!=="string") return null;
  let t=value.trim().replace(/R\$/gi,"").replace(/\s/g,"");
  if (!t) return null;
  if (t.includes(",")) t=t.replace(/\.(?=\d{3}(?:\D|$))/g,"").replace(",",".");
  const n=Number(t.replace(/[^0-9.-]/g,""));
  return Number.isFinite(n)?n:null;
}

function uniq(items:Candidate[]) {
  const map=new Map<string,Candidate>();
  for (const x of items) {
    if (!x.path.startsWith("/api/")) continue;
    const old=map.get(x.path);
    if (!old||x.scoreHint>old.scoreHint) map.set(x.path,x);
  }
  return [...map.values()].sort((a,b)=>b.scoreHint-a.scoreHint);
}

function normalizaCompetencia(v:string|null){ return v&&/^20\d{2}-\d{2}$/.test(v)?v:""; }
function normalizaData(v:string|null){ return v&&/^20\d{2}-\d{2}-\d{2}$/.test(v)?v:""; }
function fimConsulta(competencia:string){
  const hoje=new Date().toISOString().slice(0,10);
  if (hoje.startsWith(competencia)) return hoje;
  const [y,m]=competencia.split("-").map(Number);
  return `${competencia}-${String(new Date(y,m,0).getDate()).padStart(2,"0")}`;
}
function normalizeKey(v:string){return normaliza(v).replace(/[^a-z0-9]+/g,"_").replace(/^_|_$/g,"");}
function normaliza(v:string){return String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();}
function safeJson(t:string){try{return JSON.parse(t);}catch{return null;}}