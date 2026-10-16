import { createFileRoute } from "@tanstack/react-router";

type LinhaProduto = {
  sku: string;
  nome: string;
  precoAnterior: number | null;
  precoVista: number;
  precoParcelado: number;
  parcelas: number;
  juros: "Sem juros" | "Com juros";
  observacao: string;
};

export const Route = createFileRoute("/api/campanhas/import-sheet")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { url?: string };
        try {
          body = await request.json();
        } catch {
          return Response.json({ ok: false, error: "Link inválido." }, { status: 400 });
        }

        const sourceUrl = String(body.url || "").trim();
        const parsed = parseGoogleSheetUrl(sourceUrl);
        if (!parsed) {
          return Response.json(
            { ok: false, error: "Cole um link válido de uma planilha do Google Sheets." },
            { status: 400 },
          );
        }

        const exportUrl =
          `https://docs.google.com/spreadsheets/d/${parsed.id}/export?format=csv&gid=${encodeURIComponent(parsed.gid)}`;

        try {
          const res = await fetch(exportUrl, {
            redirect: "follow",
            headers: {
              "User-Agent": "Mozilla/5.0 (compatible; BI-Lojas-IM/1.0)",
              "Accept": "text/csv,text/plain,*/*",
            },
            signal: AbortSignal.timeout(20000),
          });

          const text = await res.text();

          if (!res.ok || /accounts\.google\.com|ServiceLogin|Sign in/i.test(text.slice(0, 2000))) {
            return Response.json(
              {
                ok: false,
                error: "Não consegui ler essa planilha. No Google Sheets, deixe o arquivo acessível para quem tem o link e tente novamente.",
              },
              { status: 403 },
            );
          }

          const rows = parseCsv(text);
          if (!rows.length) {
            return Response.json({ ok: false, error: "A planilha está vazia ou não pôde ser interpretada." }, { status: 422 });
          }

          const headerIndex = findHeaderRow(rows);
          if (headerIndex < 0) {
            return Response.json(
              { ok: false, error: "Não encontrei uma coluna de SKU na planilha." },
              { status: 422 },
            );
          }

          const headers = rows[headerIndex].map(norm);
          const dataRows = rows.slice(headerIndex + 1);

          const skuIdx = findCol(headers, ["sku", "codigo", "código", "cod", "ref"]);
          const nomeIdx = findCol(headers, ["produto", "descricao", "descrição", "nome"]);
          const anteriorIdx = findCol(headers, ["preco de tabela", "preço de tabela", "preco tabela", "preço tabela", "de", "preco anterior", "preço anterior"]);
          const vistaIdx = findCol(headers, ["a vista", "à vista", "avista", "preco a vista", "preço à vista"]);
          const obsIdx = findCol(headers, ["observacao", "observação", "obs"]);
          const parceladoIdx = headers.findIndex((h) => /cartao|cartão|cdc|bradescard|carne|carnê|parcel/.test(h));
          const parcelasHeader = parceladoIdx >= 0 ? parseInstallments(headers[parceladoIdx]) : 10;

          const produtos: LinhaProduto[] = [];

          for (const row of dataRows) {
            const sku = cell(row, skuIdx).replace(/\.0+$/, "").trim();
            const nome = cell(row, nomeIdx).trim();
            if (!sku || !nome) continue;

            const precoAnterior = money(cell(row, anteriorIdx));
            const precoVista = money(cell(row, vistaIdx)) ?? 0;
            const totalParcelado = money(cell(row, parceladoIdx));
            const parcelas = parcelasHeader || 10;
            const precoParcelado = totalParcelado && parcelas ? Number((totalParcelado / parcelas).toFixed(2)) : 0;
            const observacao = cell(row, obsIdx).trim();

            produtos.push({
              sku,
              nome,
              precoAnterior,
              precoVista,
              precoParcelado,
              parcelas,
              juros: totalParcelado && precoVista && totalParcelado > precoVista ? "Com juros" : "Sem juros",
              observacao,
            });
          }

          return Response.json({
            ok: true,
            sourceUrl,
            sheetId: parsed.id,
            gid: parsed.gid,
            produtos,
            total: produtos.length,
          }, { headers: { "cache-control": "no-store" } });
        } catch (error) {
          return Response.json(
            {
              ok: false,
              error: error instanceof Error ? error.message : "Não foi possível acessar a planilha.",
            },
            { status: 502 },
          );
        }
      },
    },
  },
});

function parseGoogleSheetUrl(url: string) {
  try {
    const u = new URL(url);
    if (!/docs\.google\.com$/i.test(u.hostname)) return null;
    const match = u.pathname.match(/\/spreadsheets\/d\/([^/]+)/i);
    if (!match) return null;
    const hashParams = new URLSearchParams(u.hash.replace(/^#/, ""));
    const gid = u.searchParams.get("gid") || hashParams.get("gid") || "0";
    return { id: match[1], gid };
  } catch {
    return null;
  }
}

function parseCsv(input: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];

    if (quoted) {
      if (ch === '"' && input[i + 1] === '"') {
        value += '"';
        i++;
      } else if (ch === '"') {
        quoted = false;
      } else {
        value += ch;
      }
      continue;
    }

    if (ch === '"') {
      quoted = true;
    } else if (ch === ",") {
      row.push(value);
      value = "";
    } else if (ch === "\n") {
      row.push(value.replace(/\r$/, ""));
      rows.push(row);
      row = [];
      value = "";
    } else {
      value += ch;
    }
  }

  if (value.length || row.length) {
    row.push(value.replace(/\r$/, ""));
    rows.push(row);
  }

  return rows;
}

function findHeaderRow(rows: string[][]) {
  return rows.slice(0, 15).findIndex((row) => row.some((cell) => /^sku$|c[oó]digo|produto/i.test(cell.trim())));
}

function norm(s: string) {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function findCol(headers: string[], names: string[]) {
  const normalized = names.map(norm);
  let idx = headers.findIndex((h) => normalized.includes(h));
  if (idx >= 0) return idx;
  idx = headers.findIndex((h) => normalized.some((n) => h.includes(n)));
  return idx;
}

function cell(row: string[], index: number) {
  return index >= 0 ? String(row[index] ?? "") : "";
}

function parseInstallments(header: string) {
  const m = header.match(/(\d+)\s*x/i);
  return m ? Math.max(1, Number(m[1])) : 10;
}

function money(value: string): number | null {
  let s = String(value || "").trim();
  if (!s || /^#n\/?a$/i.test(s)) return null;
  s = s.replace(/R\$/gi, "").replace(/\s/g, "");
  if (s.includes(",")) {
    s = s.replace(/\.(?=\d{3}(?:\D|$))/g, "").replace(",", ".");
  } else if (/^\d{1,3}(?:\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, "");
  }
  const n = Number(s.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}