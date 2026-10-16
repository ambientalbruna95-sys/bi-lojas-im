import { createFileRoute } from "@tanstack/react-router";

const BASE = "https://gestaoim.com";

type MonthlyRow = {
  data: string;
  faturamento: number;
  meta: number | null;
};

export const Route = createFileRoute("/api/gestaoim/monthly-sales")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const email = process.env.GESTAOIM_EMAIL;
        const pass = process.env.GESTAOIM_PASSWORD;
        if (!email || !pass) {
          return Response.json({ ok:false, rows:[], error:"Integração do GestãoIM não configurada." }, { status:503 });
        }

        const url = new URL(request.url);
        const yearParam = url.searchParams.get("year");
        const year = yearParam && /^20\d{2}$/.test(yearParam) ? yearParam : new Date().toISOString().slice(0,4);

        try {
          const cookie = await autenticar(email, pass);
          const hoje = new Date().toISOString().slice(0,10);
          const anoHoje = hoje.slice(0,4);
          const mesHoje = Number(hoje.slice(5,7));
          const limite = year === anoHoje ? mesHoje : 12;
          const alvos = Array.from({length:limite},(_,i)=>i+1);
          const rows: MonthlyRow[] = [];

          for (const grupo of chunk(alvos, 4)) {
            const respostas = await Promise.all(grupo.map(async (m) => {
              const mm=String(m).padStart(2,"0");
              const inicio=`${year}-${mm}-01`;
              const ultimo=String(new Date(Number(year),m,0).getDate()).padStart(2,"0");
              const fimCompleto=`${year}-${mm}-${ultimo}`;
              const fim = year===anoHoje && m===mesHoje ? hoje : fimCompleto;
              const path=`/api/metas/cascade?start=${inicio}&end=${fim}`;
              const res=await fetch(BASE+path,{
                headers:{accept:"application/json,text/plain,*/*",cookie,referer:BASE+"/dashboard.html"},
                cache:"no-store",
                signal:AbortSignal.timeout(10000),
              }).catch(()=>null);
              if(!res?.ok) return null;
              const payload=await res.json().catch(()=>null);
              if(!payload || typeof payload!=="object") return null;
              const root=payload as Record<string,unknown>;
              const company=root.company && typeof root.company==="object" ? root.company as Record<string,unknown> : root;
              const faturamento=numero(company.cumulative_actual);
              const meta=numero(company.total_goal);
              if(faturamento==null && meta==null) return null;
              return {data:`${year}-${mm}`,faturamento:faturamento||0,meta};
            }));
            rows.push(...respostas.filter((x):x is MonthlyRow=>!!x));
          }

          rows.sort((a,b)=>a.data.localeCompare(b.data));
          return Response.json({
            ok:rows.length>0,
            year,
            rows,
            loadedMonths:rows.length,
            totalMonths:limite,
            fetchedAt:new Date().toISOString(),
          },{status:rows.length?200:502,headers:{"cache-control":"no-store"}});
        } catch(error) {
          return Response.json({ok:false,year,rows:[],error:error instanceof Error?error.message:"Falha ao carregar série mensal."},{status:502,headers:{"cache-control":"no-store"}});
        }
      },
    },
  },
});

async function autenticar(email:string,password:string){
  const auth=await fetch(BASE+"/api/auth/login",{
    method:"POST",
    headers:{"content-type":"application/json",accept:"application/json"},
    body:JSON.stringify({email,password}),
    cache:"no-store",
    signal:AbortSignal.timeout(10000),
  });
  if(!auth.ok) throw new Error("Falha na autenticação do GestãoIM.");
  const cookie=(auth.headers.get("set-cookie")||"").split(";")[0];
  if(!cookie) throw new Error("O GestãoIM não devolveu uma sessão válida.");
  return cookie;
}

function numero(value:unknown){
  if(typeof value==="number"&&Number.isFinite(value)) return value;
  if(typeof value!=="string") return null;
  const n=Number(value.replace(/\./g,"").replace(",",".").replace(/[^0-9.-]/g,""));
  return Number.isFinite(n)?n:null;
}

function chunk<T>(items:T[],size:number){
  const out:T[][]=[];
  for(let i=0;i<items.length;i+=size) out.push(items.slice(i,i+size));
  return out;
}