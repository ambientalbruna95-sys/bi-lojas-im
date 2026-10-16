import { createFileRoute } from "@tanstack/react-router";

const BASE = "https://gestaoim.com";

type DailySale = {
  data: string;
  faturamento: number;
};

export const Route = createFileRoute("/api/gestaoim/daily-sales")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const email = process.env.GESTAOIM_EMAIL;
        const pass = process.env.GESTAOIM_PASSWORD;

        if (!email || !pass) {
          return Response.json(
            {
              ok: false,
              error: `Integração do GestãoIM não configurada. Variável ausente: ${["GESTAOIM_EMAIL","GESTAOIM_PASSWORD"].filter((k)=>!process.env[k]).join(", ")}`,
            },
            { status: 503 },
          );
        }

        const url = new URL(request.url);
        const month = normalizaMes(url.searchParams.get("month")) || new Date().toISOString().slice(0,7);

        try {
          const cookie = await autenticar(email, pass);
          const datas = diasConsultaveis(month);
          const rows: DailySale[] = [];
          const errors: Array<{data:string;message:string}> = [];

          for (const grupo of chunk(datas, 6)) {
            const respostas = await Promise.all(grupo.map(async (data) => {
              const path = `/api/metas/cascade?start=${data}&end=${data}`;
              const res = await fetch(BASE + path, {
                headers: {
                  accept: "application/json,text/plain,*/*",
                  cookie,
                  referer: BASE + "/dashboard.html",
                },
                cache: "no-store",
                signal: AbortSignal.timeout(10000),
              }).catch((error) => {
                errors.push({ data, message: error instanceof Error ? error.message : String(error) });
                return null;
              });

              if (!res) return null;
              if (!res.ok) {
                errors.push({ data, message: `HTTP ${res.status}` });
                return null;
              }

              const payload = await res.json().catch(() => null);
              if (payload == null) {
                errors.push({ data, message: "Resposta inválida" });
                return null;
              }

              const faturamento = extrairFaturamento(payload);
              if (faturamento == null) {
                errors.push({ data, message: "cumulative_actual não localizado" });
                return null;
              }

              return { data, faturamento };
            }));

            rows.push(...respostas.filter((x): x is DailySale => !!x));
          }

          rows.sort((a,b)=>a.data.localeCompare(b.data));

          return Response.json({
            ok: rows.length > 0,
            month,
            source: "/api/metas/cascade?start=DATA&end=DATA",
            totalDays: datas.length,
            loadedDays: rows.length,
            complete: rows.length === datas.length,
            rows,
            errors: errors.slice(0,10),
            fetchedAt: new Date().toISOString(),
          }, {
            status: rows.length ? 200 : 502,
            headers: { "cache-control": "no-store" },
          });
        } catch (error) {
          return Response.json(
            { ok:false, month, rows:[], error:error instanceof Error ? error.message : "Falha ao consultar faturamento diário no GestãoIM." },
            { status:502, headers:{ "cache-control":"no-store" } },
          );
        }
      },
    },
  },
});

async function autenticar(email:string,password:string) {
  const auth = await fetch(BASE + "/api/auth/login", {
    method:"POST",
    headers:{ "content-type":"application/json", accept:"application/json" },
    body:JSON.stringify({email,password}),
    cache:"no-store",
    signal:AbortSignal.timeout(10000),
  });
  if (!auth.ok) throw new Error("Falha na autenticação do GestãoIM.");
  const cookie=(auth.headers.get("set-cookie")||"").split(";")[0];
  if (!cookie) throw new Error("O GestãoIM não devolveu uma sessão válida.");
  return cookie;
}

function extrairFaturamento(payload: unknown): number | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, unknown>;

  const company = root.company;
  if (company && typeof company === "object") {
    const value = numero((company as Record<string, unknown>).cumulative_actual);
    if (value != null) return value;
  }

  const own = numero(root.cumulative_actual);
  if (own != null) return own;

  const branches = coletarBranches(root);
  if (branches.length) {
    return branches.reduce((sum, branch) => sum + (numero(branch.cumulative_actual) || 0), 0);
  }

  return null;
}

function coletarBranches(root: Record<string, unknown>) {
  const out: Record<string, unknown>[] = [];
  const seen = new Set<string>();

  const add = (value: unknown) => {
    if (!Array.isArray(value)) return;
    for (const item of value) {
      if (!item || typeof item !== "object" || Array.isArray(item)) continue;
      const obj = item as Record<string, unknown>;
      const key = String(obj.branch_id ?? obj.id ?? obj.branch_name ?? "");
      if (!key || seen.has(key)) continue;
      if ("branch_id" in obj || "branch_name" in obj) {
        seen.add(key);
        out.push(obj);
      }
    }
  };

  add(root.branches);
  add(root.unassigned_branches);

  if (Array.isArray(root.regionals)) {
    for (const regional of root.regionals) {
      if (!regional || typeof regional !== "object" || Array.isArray(regional)) continue;
      add((regional as Record<string, unknown>).branches);
    }
  }

  return out;
}

function numero(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value !== "string") return null;
  const n=Number(value.replace(/\./g,"").replace(",",".").replace(/[^0-9.-]/g,""));
  return Number.isFinite(n)?n:null;
}

function normalizaMes(value:string|null) {
  return value && /^20\d{2}-\d{2}$/.test(value) ? value : "";
}

function diasConsultaveis(month:string) {
  const [year,mon]=month.split("-").map(Number);
  const ultimo=new Date(year,mon,0).getDate();
  const hoje=new Date().toISOString().slice(0,10);
  const mesHoje=hoje.slice(0,7);

  if (month > mesHoje) return [];

  const limite = month === mesHoje ? Number(hoje.slice(8,10)) : ultimo;
  return Array.from({length:limite},(_,i)=>`${month}-${String(i+1).padStart(2,"0")}`);
}

function chunk<T>(items:T[],size:number) {
  const out:T[][]=[];
  for(let i=0;i<items.length;i+=size) out.push(items.slice(i,i+size));
  return out;
}