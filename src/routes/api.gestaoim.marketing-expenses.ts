import { createFileRoute } from "@tanstack/react-router";

const BASE = "https://gestaoim.com";

type Candidate = { path: string; marketingHint: boolean; source: string };

type MarketingExpense = {
  id: string;
  data: string;
  descricao: string;
  categoria: string;
  valor: number;
  filial: string;
  fornecedor?: string;
  status?: string;
  formaPagamento?: string;
  observacao?: string;
  ticketCodigo?: string;
};

const DIRECT_CANDIDATES: Candidate[] = [
  { path: "/api/despesas/minhas", marketingHint: true, source: "confirmed-despesas-tela" },
  { path: "/api/marketing-expenses", marketingHint: true, source: "legacy-network" },
  { path: "/api/despesas-marketing", marketingHint: true, source: "guess" },
  { path: "/api/despesas/marketing", marketingHint: true, source: "guess" },
  { path: "/api/marketing/despesas", marketingHint: true, source: "guess" },
  { path: "/api/financeiro/despesas-marketing", marketingHint: true, source: "guess" },
  { path: "/api/push/despesas-marketing", marketingHint: true, source: "guess" },
  { path: "/api/relatorios/despesas-marketing", marketingHint: true, source: "guess" },
  { path: "/api/despesas", marketingHint: false, source: "guess" },
  { path: "/api/financeiro/despesas", marketingHint: false, source: "guess" },
];

export const Route = createFileRoute("/api/gestaoim/marketing-expenses")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const email = process.env.GESTAOIM_EMAIL;
        const pass = process.env.GESTAOIM_PASSWORD;
        if (!email || !pass) {
          return Response.json({ ok: false, error: `Integração do GestãoIM não configurada. Variável ausente: ${["GESTAOIM_EMAIL","GESTAOIM_PASSWORD"].filter((k) => !process.env[k]).join(", ")}` }, { status: 503 });
        }

        const url = new URL(request.url);
        const competenciaParam = normalizaCompetencia(url.searchParams.get("competencia"));
        const deParam = normalizaData(url.searchParams.get("de"));
        const ateParam = normalizaData(url.searchParams.get("ate"));
        const rangeMode = !!(deParam && ateParam);
        const competencia = competenciaParam || deParam?.slice(0,7) || new Date().toISOString().slice(0, 7);

        try {
          const cookie = await autenticar(email, pass);
          const discovered = await discoverCandidates(cookie);
          const candidates = uniqueCandidates([...DIRECT_CANDIDATES, ...discovered]);

          const fim = rangeMode ? ateParam! : fimConsulta(competencia);
          const inicio = rangeMode ? deParam! : competencia + "-01";

          let best: { endpoint: string; expenses: MarketingExpense[]; score: number; source: string } | null = null;
          const attempted: string[] = [];

          // Rota oficial confirmada no despesas-tela.js do GestãoIM.
          // A tela usa "de" e "ate" para carregar os lançamentos do período.
          const officialPath = `/api/despesas/minhas?de=${inicio}&ate=${fim}`;
          attempted.push(officialPath);

          const officialRes = await fetch(BASE + officialPath, {
            method: "GET",
            headers: {
              accept: "application/json,text/plain,*/*",
              cookie,
              referer: BASE + "/dashboard.html",
            },
            cache: "no-store",
            signal: AbortSignal.timeout(10000),
          }).catch(() => null);

          if (officialRes?.ok) {
            const officialData = await officialRes.json().catch(() => null);
            if (officialData != null) {
              const officialExpenses = normalizeMinhasDespesas(officialData, competencia);
              if (officialExpenses.length) {
                best = {
                  endpoint: officialPath,
                  expenses: officialExpenses,
                  score: 100000 + officialExpenses.length,
                  source: "confirmed-despesas-tela",
                };
              }
            }
          }

          const variants = makeVariants(candidates, competencia, fim).slice(0, 80);

          for (const variant of variants) {
            if (best?.source === "confirmed-despesas-tela") break;
            if (attempted.length >= 40) break;
            attempted.push(variant.path);

            const res = await fetch(BASE + variant.path, {
              method: "GET",
              headers: {
                accept: "application/json,text/plain,*/*",
                cookie,
                referer: BASE + "/dashboard.html",
              },
              cache: "no-store",
              signal: AbortSignal.timeout(8000),
            }).catch(() => null);

            if (!res || !res.ok) continue;

            const contentType = res.headers.get("content-type") || "";
            let data: unknown = null;

            if (contentType.includes("application/json")) {
              data = await res.json().catch(() => null);
            } else {
              const text = await res.text().catch(() => "");
              if (!text || /<html|<!doctype/i.test(text.slice(0, 200))) continue;
              data = safeJson(text);
            }

            if (data == null) continue;

            const normalized = normalizePayload(data, competencia, variant.marketingHint || /marketing|mkt|propaganda|publicidade/i.test(variant.path));
            if (!normalized.length) continue;

            const score =
              normalized.length * 8 +
              normalized.filter((x) => x.valor > 0).length * 3 +
              normalized.filter((x) => x.data.startsWith(competencia)).length * 4 +
              (variant.marketingHint ? 20 : 0);

            if (!best || score > best.score) {
              best = { endpoint: variant.path, expenses: normalized, score, source: variant.source };
            }

            if (best && best.expenses.length >= 3 && best.score >= 45) break;
          }

          if (!best) {
            return Response.json({
              ok: false,
              configured: true,
              discovered: discovered.map((x) => x.path).slice(0, 20),
              attempted: attempted.slice(0, 20),
              error: "O GestãoIM autenticou, mas /api/despesas/minhas não devolveu lançamentos utilizáveis neste período.",
              nextStep: "Abra uma requisição /api/despesas/minhas no Network e envie somente a aba Response para eu confirmar os nomes exatos dos campos.",
            }, { status: 404, headers: { "cache-control": "no-store" } });
          }

          const deduped = dedupe(best.expenses)
            .filter((x) => {
              if (!x.data) return true;
              return rangeMode ? x.data >= inicio && x.data <= fim : x.data.startsWith(competencia);
            })
            .sort((a, b) => b.data.localeCompare(a.data));

          return Response.json({
            ok: true,
            fetchedAt: new Date().toISOString(),
            competencia,
            de: inicio,
            ate: fim,
            endpoint: best.endpoint,
            source: best.source,
            total: deduped.length,
            valorTotal: deduped.reduce((sum, item) => sum + item.valor, 0),
            despesas: deduped,
            scope: best.source === "confirmed-despesas-tela" ? "connected-user" : "discovered",
            scopeLabel: best.source === "confirmed-despesas-tela" ? "Meus lançamentos da conta conectada" : "Fonte descoberta no GestãoIM",
            scopeWarning: best.source === "confirmed-despesas-tela"
              ? "A rota oficial /api/despesas/minhas é individual da conta autenticada. Ela não comprova, sozinha, que estamos vendo todas as despesas do departamento de Marketing."
              : undefined,
          }, { headers: { "cache-control": "no-store" } });
        } catch (error) {
          return Response.json({
            ok: false,
            error: error instanceof Error ? error.message : "Falha ao consultar Despesas Marketing do GestãoIM.",
          }, { status: 502, headers: { "cache-control": "no-store" } });
        }
      },
    },
  },
});

async function autenticar(email: string, password: string) {
  const auth = await fetch(BASE + "/api/auth/login", {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ email, password }),
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  });

  if (!auth.ok) throw new Error("Falha na autenticação do GestãoIM.");

  const cookie = (auth.headers.get("set-cookie") || "").split(";")[0];
  if (!cookie) throw new Error("O GestãoIM não devolveu uma sessão válida.");
  return cookie;
}

async function discoverCandidates(cookie: string): Promise<Candidate[]> {
  const dashboard = await fetch(BASE + "/dashboard.html", {
    headers: { cookie, accept: "text/html,*/*" },
    cache: "no-store",
    signal: AbortSignal.timeout(10000),
  }).then((r) => r.ok ? r.text() : "").catch(() => "");

  if (!dashboard) return [];

  const scripts = [...dashboard.matchAll(/<script[^>]+src=["']([^"']+)["']/gi)]
    .map((m) => m[1])
    .filter(Boolean)
    .map((src) => {
      try { return new URL(src, BASE).toString(); } catch { return ""; }
    })
    .filter((src) => src.startsWith(BASE))
    .slice(0, 40);

  const found: Candidate[] = [];

  for (const src of scripts) {
    const js = await fetch(src, {
      headers: { cookie, accept: "application/javascript,text/javascript,*/*", referer: BASE + "/dashboard.html" },
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    }).then((r) => r.ok ? r.text() : "").catch(() => "");

    if (!js) continue;

    const apiPaths = [...js.matchAll(/["'`](\/api\/[A-Za-z0-9_./?=&%{}:+$-]+)["'`]/g)]
      .map((m) => m[1])
      .filter((path) => !/[{}$+]/.test(path));

    for (const path of apiPaths) {
      if (/despes|marketing|custo|expense|invest|publicidade|propaganda/i.test(path)) {
        found.push({ path, marketingHint: /marketing|mkt|publicidade|propaganda/i.test(path), source: "javascript" });
      }
    }

    for (const match of js.matchAll(/despes|marketing|custo|investimento|publicidade|propaganda/gi)) {
      const start = Math.max(0, (match.index || 0) - 900);
      const end = Math.min(js.length, (match.index || 0) + 900);
      const chunk = js.slice(start, end);
      for (const api of chunk.matchAll(/["'`](\/api\/[A-Za-z0-9_./?=&%{}:+$-]+)["'`]/g)) {
        const path = api[1];
        if (/[{}$+]/.test(path)) continue;
        found.push({ path, marketingHint: true, source: "javascript-context" });
      }
    }
  }

  return uniqueCandidates(found);
}

function makeVariants(candidates: Candidate[], competencia: string, fim: string): Candidate[] {
  const inicio = competencia + "-01";
  const variants: Candidate[] = [];

  for (const c of candidates) {
    const clean = c.path.replace(BASE, "");
    variants.push({ ...c, path: clean });

    if (!clean.includes("?")) {
      if (clean === "/api/despesas/minhas") {
        variants.unshift({
          ...c,
          path: clean + "?de=" + inicio + "&ate=" + fim,
          marketingHint: true,
          source: "confirmed-despesas-tela",
        });
      }
      if (clean === "/api/marketing-expenses") {
        variants.unshift({
          ...c,
          path: clean + "?payment_start=" + inicio + "&payment_end=" + fim,
          marketingHint: true,
          source: "confirmed-network",
        });
      }
      variants.push({ ...c, path: clean + "?competencia=" + encodeURIComponent(competencia) });
      variants.push({ ...c, path: clean + "?mes=" + encodeURIComponent(competencia) });
      variants.push({ ...c, path: clean + "?data_inicio=" + inicio + "&data_fim=" + fim });
      variants.push({ ...c, path: clean + "?de=" + inicio + "&ate=" + fim });
    }
  }

  return uniqueCandidates(variants);
}

function uniqueCandidates(items: Candidate[]) {
  const map = new Map<string, Candidate>();
  for (const item of items) {
    if (!item.path.startsWith("/api/")) continue;
    const existing = map.get(item.path);
    if (!existing || (!existing.marketingHint && item.marketingHint)) map.set(item.path, item);
  }
  return [...map.values()];
}

function normalizeMinhasDespesas(payload: unknown, competencia: string): MarketingExpense[] {
  if (!payload || typeof payload !== "object") return [];
  const itens = Array.isArray((payload as Record<string, unknown>).itens)
    ? (payload as Record<string, unknown>).itens as Record<string, unknown>[]
    : [];

  return itens.map((obj, i) => {
    const categoria = String(obj.categoria || "").trim();
    const estabelecimento = String(obj.estabelecimento || "").trim();
    const observacao = String(obj.observacao || "").trim();
    const formaPagamento = String(obj.forma_pagamento || "").trim();
    const status = String(obj.status || "").trim();
    const ticketCodigo = String(obj.ticket_codigo || "").trim();
    const filial = firstString(obj, [
      "filial","filial_nome","nome_filial","codigo_filial","cod_filial","filial_id","id_filial",
      "loja","unidade","branch","branch_name","branch_code","branch_id",
    ]);

    const partesDescricao = [
      estabelecimento || (categoria ? categoria.charAt(0).toUpperCase() + categoria.slice(1) : "Despesa"),
      formaPagamento ? `Pagamento: ${formaPagamento}` : "",
      observacao,
      ticketCodigo ? `Ticket: ${ticketCodigo}` : "",
    ].filter(Boolean);

    return {
      id: String(obj.id ?? `item-${i}`),
      data: parseDate(String(obj.data_despesa || ""), competencia),
      descricao: partesDescricao.join(" · "),
      categoria: categoria || "Outros",
      valor: parseMoney(obj.valor) || 0,
      filial: filial || "Rede",
      fornecedor: estabelecimento || undefined,
      status: status || undefined,
      formaPagamento: formaPagamento || undefined,
      observacao: observacao || undefined,
      ticketCodigo: ticketCodigo || undefined,
    };
  }).filter((x) => x.valor >= 0);
}

function normalizePayload(payload: unknown, competencia: string, marketingHint: boolean): MarketingExpense[] {
  const arrays = collectObjectArrays(payload);
  const out: MarketingExpense[] = [];

  for (const arr of arrays) {
    for (let i = 0; i < arr.length; i++) {
      const obj = arr[i];
      const valor = firstNumber(obj, [
        "valor", "valor_total", "vr_valor", "vl_valor", "vr_despesa", "vl_despesa",
        "valor_despesa", "total", "amount", "custo", "valor_pago", "valor_lancamento",
      ]);
      if (valor == null || valor < 0) continue;

      const categoria = firstString(obj, [
        "categoria", "category", "category_name", "nome_categoria", "classificacao", "classificação", "grupo", "tipo", "natureza",
        "centro_custo", "centro_de_custo", "conta", "setor", "departamento",
      ]);
      const descricao = firstString(obj, [
        "descricao", "descrição", "description", "historico", "histórico", "nome", "titulo", "título",
        "observacao", "observação", "obs", "favorecido", "fornecedor",
      ]);
      const fornecedor = firstString(obj, ["fornecedor", "favorecido", "beneficiario", "beneficiário"]);
      const filial = firstString(obj, [
        "filial", "filial_nome", "nome_filial", "codigo_filial", "cod_filial", "filial_id", "id_filial",
        "loja", "unidade", "branch", "branch_name", "branch_code", "branch_id",
        "store", "store_name", "store_code", "unit", "unit_name", "unit_code",
      ]);
      const status = firstString(obj, ["status", "situacao", "situação"]);
      const data = firstDate(obj, competencia);

      const search = normalizeText([
        categoria, descricao, fornecedor, firstString(obj, ["area", "área", "modulo", "módulo", "origem"]),
      ].filter(Boolean).join(" "));

      if (!marketingHint && !isMarketingText(search)) continue;

      const idRaw = firstString(obj, ["id", "despesa_id", "id_despesa", "codigo", "código", "uuid"]) || String(i);
      out.push({
        id: String(idRaw),
        data,
        descricao: descricao || fornecedor || "Despesa de marketing",
        categoria: categoria || "Despesas Marketing",
        valor,
        filial: filial || "Rede",
        fornecedor: fornecedor || undefined,
        status: status || undefined,
      });
    }
  }

  return out;
}

function collectObjectArrays(value: unknown, depth = 0): Record<string, unknown>[][] {
  if (depth > 5 || value == null) return [];
  if (Array.isArray(value)) {
    const objects = value.filter((x): x is Record<string, unknown> => !!x && typeof x === "object" && !Array.isArray(x));
    const nested = value.flatMap((x) => collectObjectArrays(x, depth + 1));
    return objects.length ? [objects, ...nested] : nested;
  }
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).flatMap((x) => collectObjectArrays(x, depth + 1));
  }
  return [];
}

function firstString(obj: Record<string, unknown>, aliases: string[]) {
  const entries = Object.entries(obj);
  for (const alias of aliases.map(normalizeKey)) {
    const found = entries.find(([k]) => normalizeKey(k) === alias);
    if (!found) continue;
    const value = found[1];
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
    if (value && typeof value === "object") {
      const nested = value as Record<string, unknown>;
      const nestedValue = nested.nome ?? nested.name ?? nested.codigo ?? nested.id;
      if (typeof nestedValue === "string" || typeof nestedValue === "number") return String(nestedValue);
    }
  }
  return "";
}

function firstNumber(obj: Record<string, unknown>, aliases: string[]) {
  const entries = Object.entries(obj);
  for (const alias of aliases.map(normalizeKey)) {
    const found = entries.find(([k]) => normalizeKey(k) === alias);
    if (!found) continue;
    const parsed = parseMoney(found[1]);
    if (parsed != null) return parsed;
  }
  return null;
}

function firstDate(obj: Record<string, unknown>, competencia: string) {
  const value = firstString(obj, [
    "data", "data_despesa", "dt_despesa", "data_lancamento", "dt_lancamento",
    "competencia", "competência", "mes", "mês", "vencimento", "data_pagamento",
    "payment_date", "payment_at", "utilization_date", "utilizacao", "utilização", "usage_date",
  ]);
  return parseDate(value, competencia);
}

function parseDate(value: string, competencia: string) {
  if (!value) return competencia + "-01";

  const iso = value.match(/(20\d{2})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;

  const br = value.match(/(\d{1,2})\/(\d{1,2})\/(20\d{2})/);
  if (br) return `${br[3]}-${br[2].padStart(2, "0")}-${br[1].padStart(2, "0")}`;

  const ym = value.match(/(20\d{2})[-/](\d{1,2})/);
  if (ym) return `${ym[1]}-${ym[2].padStart(2, "0")}-01`;

  return competencia + "-01";
}

function parseMoney(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  let text = value.trim().replace(/R\$/gi, "").replace(/\s/g, "");
  if (!text) return null;
  if (text.includes(",")) text = text.replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", ".");
  const num = Number(text.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(num) ? num : null;
}

function isMarketingText(text: string) {
  return /(marketing|mkt|trafego|tráfego|google ads|meta ads|facebook|instagram|tiktok|influenc|propaganda|publicidade|midia|mídia|grafica|gráfica|impress|outdoor|radio|rádio|carro de som|volante|brinde|evento|reinaug|decoracao|decoração|filmagem|video|vídeo|social media)/i.test(text);
}

function normalizeKey(value: string) {
  return normalizeText(value).replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
}

function normalizeText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
}

function normalizaData(value: string | null) {
  return value && /^20\d{2}-\d{2}-\d{2}$/.test(value) ? value : "";
}

function normalizaCompetencia(value: string | null) {
  return value && /^20\d{2}-\d{2}$/.test(value) ? value : "";
}

function ultimoDia(competencia: string) {
  const [y, m] = competencia.split("-").map(Number);
  return `${competencia}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;
}

function fimConsulta(competencia: string) {
  const hoje = new Date().toISOString().slice(0, 10);
  const mesAtual = hoje.slice(0, 7);
  if (competencia === mesAtual) return hoje;
  return ultimoDia(competencia);
}

function safeJson(text: string) {
  try { return JSON.parse(text); } catch { return null; }
}

function dedupe(items: MarketingExpense[]) {
  const map = new Map<string, MarketingExpense>();
  for (const item of items) {
    const key = `${item.id}|${item.data}|${item.valor}|${normalizeText(item.descricao)}|${normalizeText(item.filial)}`;
    if (!map.has(key)) map.set(key, item);
  }
  return [...map.values()];
}