import { createFileRoute } from "@tanstack/react-router";

/**
 * Tickets EFETIVAMENTE PAGOS no módulo financeiro do GestãoIM.
 *
 * Status atual: a rota real que expõe status de pagamento ainda não foi
 * confirmada. "Enviado ao financeiro" NÃO é "pago" — por isso este endpoint
 * nunca usa /api/despesas/minhas como realizado. Enquanto nenhuma rota com
 * status de pagamento + data de pagamento for confirmada, ele responde
 * `status: "awaiting-route"` e lista as rotas candidatas encontradas nos JS
 * do GestãoIM (somente caminhos, nunca cookies/tokens).
 *
 * Faltando: endpoint do módulo financeiro que retorne tickets com
 * status de pagamento e data de pagamento, e permissão da conta integrada
 * (GESTAOIM_EMAIL) para acessá-lo.
 */
const BASE = "https://gestaoim.com";
const PAID_FIELD = /(data_?pagamento|dt_?pagamento|paid_?at|pago_?em|status_?pagamento|payment_?status)/i;

export const Route = createFileRoute("/api/gestaoim/paid-tickets")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const headers = { "cache-control": "no-store" };
        const url = new URL(request.url);
        const de = url.searchParams.get("de") || "";
        const ate = url.searchParams.get("ate") || "";
        const email = process.env.GESTAOIM_EMAIL;
        const pass = process.env.GESTAOIM_PASSWORD;
        const missing = [!email && "GESTAOIM_EMAIL", !pass && "GESTAOIM_PASSWORD"].filter(Boolean);
        if (missing.length) {
          return Response.json({
            ok: false, status: "awaiting-route", de, ate,
            error: `Integração do GestãoIM não configurada. Variável ausente: ${missing.join(", ")}`,
            missing: "Credenciais da conta integrada e rota de tickets pagos do módulo financeiro.",
          }, { status: 503, headers });
        }
        try {
          const login = await fetch(BASE + "/api/auth/login", {
            method: "POST",
            headers: { "content-type": "application/json", accept: "application/json" },
            body: JSON.stringify({ email, password: pass }),
            signal: AbortSignal.timeout(10000),
          });
          if (!login.ok) throw new Error("Falha na autenticação do GestãoIM.");
          const cookie = (login.headers.get("set-cookie") || "").split(";")[0];
          const html = await fetch(BASE + "/dashboard.html", { headers: { cookie }, signal: AbortSignal.timeout(10000) }).then((r) => (r.ok ? r.text() : ""));
          const scripts = [...html.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)]
            .map((m) => { try { return new URL(m[1], BASE).toString(); } catch { return ""; } })
            .filter((s) => s.startsWith(BASE)).slice(0, 60);
          const candidates = new Set<string>();
          for (const src of scripts) {
            const js = await fetch(src, { headers: { cookie }, signal: AbortSignal.timeout(8000) }).then((r) => (r.ok ? r.text() : "")).catch(() => "");
            for (const m of js.matchAll(/["'`](\/api\/[A-Za-z0-9_./-]+)["'`]/g)) {
              const ctx = js.slice(Math.max(0, (m.index || 0) - 600), (m.index || 0) + 800);
              if (/(ticket|financ)/i.test(m[1]) && PAID_FIELD.test(ctx)) candidates.add(m[1]);
            }
          }
          return Response.json({
            ok: false, status: "awaiting-route", de, ate,
            candidates: [...candidates].sort(),
            error: "Aguardando rota de tickets pagos.",
            missing: candidates.size
              ? "Rotas candidatas localizadas; falta confirmar qual retorna tickets com status pago e data de pagamento."
              : "Nenhuma rota acessível à conta integrada expõe status/data de pagamento de tickets. Necessário endpoint do módulo financeiro ou permissão de acesso.",
          }, { status: 200, headers });
        } catch (e) {
          return Response.json({ ok: false, status: "awaiting-route", de, ate, error: e instanceof Error ? e.message : "Falha na consulta." }, { status: 502, headers });
        }
      },
    },
  },
});