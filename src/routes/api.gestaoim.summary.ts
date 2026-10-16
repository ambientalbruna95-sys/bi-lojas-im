import { createFileRoute } from "@tanstack/react-router";

const BASE = "https://gestaoim.com";

export const Route = createFileRoute("/api/gestaoim/summary")({
  server: {
    handlers: {
      GET: async () => {
        const email = process.env.GESTAOIM_EMAIL;
        const pass = process.env.GESTAOIM_PASSWORD;
        if (!email || !pass) return Response.json({ ok:false, error:`Integração do GestãoIM não configurada. Variável ausente: ${[!email && "GESTAOIM_EMAIL", !pass && "GESTAOIM_PASSWORD"].filter(Boolean).join(", ")}`, missingEnv:[!email && "GESTAOIM_EMAIL", !pass && "GESTAOIM_PASSWORD"].filter(Boolean) }, { status:503 });
        const auth = await fetch(BASE + "/api/auth/login", {
          method:"POST",
          headers:{ "content-type":"application/json", "accept":"application/json" },
          body:JSON.stringify({ email, password:pass }),
          cache:"no-store"
        });
        if (!auth.ok) return Response.json({ ok:false, error:"Falha na autenticação do GestãoIM" }, { status:502 });
        const cookie = (auth.headers.get("set-cookie") || "").split(";")[0];
        if (!cookie) return Response.json({ ok:false, error:"Sessão não recebida" }, { status:502 });
        const res = await fetch(BASE + "/api/push/meta-summary", {
          headers:{ "accept":"application/json", "cookie":cookie, "referer":BASE + "/dashboard.html" },
          cache:"no-store"
        });
        const data = await res.json().catch(() => null);
        if (!res.ok) return Response.json({ ok:false, error:"Falha ao consultar resumo", details:data }, { status:502 });
        return Response.json({ ok:true, fetchedAt:new Date().toISOString(), data }, { headers:{ "cache-control":"no-store" } });
      }
    }
  }
});