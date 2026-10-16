import { createFileRoute } from "@tanstack/react-router";

const BASE = "https://gestaoim.com";
const CHAT_HINT = /(chat|assist|assistant|ia\b|ai\b|gemini|openai|prompt|message|mensagem|bot|copilot|llm)/i;

export const Route = createFileRoute("/api/gestaoim/chat-discovery")({
  server: {
    handlers: {
      GET: async () => {
        const email = process.env.GESTAOIM_EMAIL;
        const pass = process.env.GESTAOIM_PASSWORD;
        if (!email || !pass) {
          return Response.json({ ok:false, error:"GestãoIM não configurado." }, { status:503 });
        }

        try {
          const cookie = await autenticar(email, pass);
          const html = await fetch(BASE + "/dashboard.html", {
            headers:{ cookie, accept:"text/html,*/*" },
            cache:"no-store",
            signal:AbortSignal.timeout(10000),
          }).then((r)=>r.ok?r.text():"").catch(()=>"");

          if (!html) return Response.json({ ok:false, error:"Dashboard do GestãoIM não acessível." }, { status:502 });

          const scripts = [...html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)]
            .map((m)=>m[1])
            .filter(Boolean)
            .map((src)=>{ try { return new URL(src, BASE).toString(); } catch { return ""; } })
            .filter((src)=>src.startsWith(BASE))
            .slice(0,80);

          const candidates = new Map<string,{ path:string; script:string; contexts:string[] }>();
          const scriptsComChat:string[] = [];

          for (const src of scripts) {
            const js = await fetch(src, {
              headers:{ cookie, accept:"application/javascript,text/javascript,*/*", referer:BASE + "/dashboard.html" },
              cache:"no-store",
              signal:AbortSignal.timeout(8000),
            }).then((r)=>r.ok?r.text():"").catch(()=>"");

            if (!js) continue;
            if (CHAT_HINT.test(js)) scriptsComChat.push(src.split("/").pop() || src);

            for (const m of js.matchAll(/["'`](\/api\/[A-Za-z0-9_./?=&%:+{}$()\[\]-]+)["'`]/g)) {
              const idx = m.index || 0;
              const ctx = js.slice(Math.max(0, idx - 1100), Math.min(js.length, idx + 1500));
              if (!CHAT_HINT.test(m[1] + " " + ctx)) continue;
              const clean = limpar(ctx);
              const prev = candidates.get(m[1]) || { path:m[1], script:src.split("/").pop() || src, contexts:[] };
              if (prev.contexts.length < 4) prev.contexts.push(clean);
              candidates.set(m[1], prev);
            }
          }

          return Response.json({
            ok:true,
            fetchedAt:new Date().toISOString(),
            scriptsComChat:[...new Set(scriptsComChat)],
            candidates:[...candidates.values()].sort((a,b)=>a.path.localeCompare(b.path)),
            note:"Somente caminhos e pequenos contextos do JavaScript são retornados. Cookies, senhas e tokens não são expostos.",
          }, { headers:{ "cache-control":"no-store" } });
        } catch (e) {
          return Response.json({ ok:false, error:e instanceof Error?e.message:"Falha na descoberta do chat." }, { status:502, headers:{ "cache-control":"no-store" } });
        }
      },
    },
  },
});

async function autenticar(email:string,password:string){
  const auth = await fetch(BASE + "/api/auth/login", {
    method:"POST",
    headers:{ "content-type":"application/json", accept:"application/json" },
    body:JSON.stringify({ email, password }),
    cache:"no-store",
    signal:AbortSignal.timeout(10000),
  });
  if (!auth.ok) throw new Error("Falha na autenticação do GestãoIM.");
  const cookie = (auth.headers.get("set-cookie") || "").split(";")[0];
  if (!cookie) throw new Error("Sessão do GestãoIM não encontrada.");
  return cookie;
}

function limpar(v:string){
  return v.replace(/\s+/g," ").slice(0,1400).trim();
}