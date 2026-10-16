import { createFileRoute } from "@tanstack/react-router";

const BASE = "https://gestaoim.com";

export const Route = createFileRoute("/api/gestaoim/finance-discovery")({
  server: {
    handlers: {
      GET: async () => {
        const email=process.env.GESTAOIM_EMAIL;
        const pass=process.env.GESTAOIM_PASSWORD;
        if(!email||!pass) return Response.json({ok:false,error:"GestãoIM não configurado."},{status:503});

        try {
          const cookie=await autenticar(email,pass);
          const html=await fetch(BASE+"/dashboard.html",{
            headers:{cookie,accept:"text/html,*/*"},
            cache:"no-store",
            signal:AbortSignal.timeout(10000),
          }).then(r=>r.ok?r.text():"").catch(()=>"");

          const scripts=[...html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)]
            .map(m=>m[1])
            .filter(Boolean)
            .map(src=>{try{return new URL(src,BASE).toString()}catch{return""}})
            .filter(src=>src.startsWith(BASE));

          const apiPaths=new Map<string,{path:string;script:string;contexts:string[]}>();

          for(const src of scripts.slice(0,60)){
            const js=await fetch(src,{
              headers:{cookie,accept:"application/javascript,text/javascript,*/*",referer:BASE+"/dashboard.html"},
              cache:"no-store",
              signal:AbortSignal.timeout(8000),
            }).then(r=>r.ok?r.text():"").catch(()=>"");
            if(!js) continue;

            const apiMatches=[...js.matchAll(/["'`](\/api\/[A-Za-z0-9_./?=&%:+{}$()\[\]-]+)["'`]/g)];
            for(const m of apiMatches){
              const path=m[1];
              const idx=m.index||0;
              const ctx=js.slice(Math.max(0,idx-500),Math.min(js.length,idx+700));
              if(!/(ticket|finance|financ|pag[oa]|payment|quit|despesa|prestacao|prestação)/i.test(path+" "+ctx)) continue;
              const old=apiPaths.get(path)||{path,script:src.split("/").pop()||src,contexts:[]};
              if(old.contexts.length<3) old.contexts.push(limpar(ctx));
              apiPaths.set(path,old);
            }
          }

          return Response.json({
            ok:true,
            scripts:scripts.map(s=>s.split("/").pop()),
            candidates:[...apiPaths.values()].sort((a,b)=>a.path.localeCompare(b.path)),
            fetchedAt:new Date().toISOString(),
          },{headers:{"cache-control":"no-store"}});
        } catch(error) {
          return Response.json({ok:false,error:error instanceof Error?error.message:"Falha na descoberta."},{status:502,headers:{"cache-control":"no-store"}});
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
  if(!cookie) throw new Error("Sessão do GestãoIM não encontrada.");
  return cookie;
}

function limpar(v:string){
  return v.replace(/\s+/g," ").replace(/.{900}.+$/s,m=>m.slice(0,900)).trim();
}