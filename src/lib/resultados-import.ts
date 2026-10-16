import type { Filial, ResultadoDiario } from "@/lib/store";

const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

function parseNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  const raw = String(value ?? "").trim();
  if (!raw) return 0;
  const cleaned = raw
    .replace(/R\$/gi, "")
    .replace(/\s/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(",", ".")
    .replace(/[^0-9.-]/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : 0;
}

function keyOf(row: Record<string, unknown>, aliases: string[]) {
  const entries = Object.keys(row);
  const normalized = aliases.map(norm);
  return entries.find((k) => normalized.includes(norm(k))) ||
    entries.find((k) => normalized.some((a) => norm(k).includes(a)));
}

function findFilial(raw: unknown, filiais: Filial[]) {
  const value = String(raw ?? "").trim();
  if (!value) return undefined;
  const n = norm(value);
  const leadingCode = value.match(/^\s*(\d{1,2})\b/)?.[1]?.padStart(2, "0");
  const digitsOnly = /^\d{1,2}$/.test(value) ? value.padStart(2, "0") : "";
  return filiais.find((f) =>
    f.id === value ||
    norm(f.nome) === n ||
    norm(f.cidade) === n ||
    (!!leadingCode && f.codigo === leadingCode) ||
    (!!digitsOnly && f.codigo === digitsOnly)
  );
}

function isoFromValue(raw: unknown, XLSX: typeof import("xlsx")) {
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) return raw.toISOString().slice(0, 10);
  if (typeof raw === "number") {
    const parsed = XLSX.SSF.parse_date_code(raw);
    if (parsed) return `${parsed.y}-${String(parsed.m).padStart(2, "0")}-${String(parsed.d).padStart(2, "0")}`;
  }
  const s = String(raw ?? "").trim();
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(s)) {
    const [d, m, y] = s.split("/");
    return `${y}-${m}-${d}`;
  }
  if (/^\d{2}\/\d{2}\/\d{2}$/.test(s)) {
    const [d, m, y] = s.split("/");
    return `20${y}-${m}-${d}`;
  }
  return "";
}

export async function lerPlanilhaResultados(file: File, filiais: Filial[], dataFallback = new Date().toISOString().slice(0, 10)) {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0] ?? ""];
  if (!sheet) throw new Error("A planilha não possui uma aba legível.");

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
  const registros: ResultadoDiario[] = [];
  let ignoradas = 0;
  let formatoGestaoIM = false;

  for (const row of rows) {
    const nivelKey = keyOf(row, ["nível", "nivel", "tipo"]);
    const filialKey = keyOf(row, ["filial", "loja", "nome", "codigo", "código", "cod loja", "cod. loja", "c1"]);
    const dataKey = keyOf(row, ["data", "dia", "data referencia", "data de referencia", "referencia"]);
    const metaKey = keyOf(row, ["vr_meta", "vr meta", "meta", "meta diaria", "meta do dia", "meta faturamento", "objetivo"]);
    const fatKey = keyOf(row, ["vr_venda", "vr venda", "vendido", "faturamento", "realizado", "vendas", "venda", "valor realizado", "faturado"]);

    if (nivelKey) {
      formatoGestaoIM = true;
      const nivel = norm(String(row[nivelKey] ?? ""));
      if (nivel && nivel !== "filial") {
        ignoradas += 1;
        continue;
      }
    }

    const filial = filialKey ? findFilial(row[filialKey], filiais) : undefined;
    const data = dataKey ? isoFromValue(row[dataKey], XLSX) : dataFallback;
    const meta = metaKey ? parseNumber(row[metaKey]) : 0;
    const faturamento = fatKey ? parseNumber(row[fatKey]) : 0;
    const modo: ResultadoDiario["modo"] = dataKey ? "movimento" : "acumulado";

    if (!filial || !data || (!meta && !faturamento)) {
      ignoradas += 1;
      continue;
    }

    registros.push({
      id: `${filial.id}-${data}`,
      filialId: filial.id,
      data,
      meta,
      faturamento,
      origem: file.name,
      modo,
    });
  }

  const acumulados = registros.filter((r) => r.modo === "acumulado").length;
  return {
    registros,
    ignoradas,
    linhas: rows.length,
    formato: formatoGestaoIM
      ? "gestaoim_snapshot" as const
      : acumulados
        ? "metabase_acumulado" as const
        : "movimento_diario" as const,
  };
}

export function mesclarResultados(
  atuais: ResultadoDiario[],
  novos: ResultadoDiario[],
) {
  const map = new Map<string, ResultadoDiario>();
  for (const r of atuais) map.set(`${r.filialId}|${r.data}|${r.modo || "movimento"}`, r);
  for (const r of novos) map.set(`${r.filialId}|${r.data}|${r.modo || "movimento"}`, r);
  return [...map.values()].sort((a, b) => b.data.localeCompare(a.data));
}