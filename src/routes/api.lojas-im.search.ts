import { createFileRoute } from "@tanstack/react-router";

type ProdutoBusca = {
  url: string;
  nome: string;
  sku: string;
  descricao: string;
  imagem: string;
  precoSite: number | null;
  precoAnterior: number | null;
};

const BASE = "https://www.lojasim.com.br";

export const Route = createFileRoute("/api/lojas-im/search")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const q = (url.searchParams.get("q") || "").trim();
        if (!q) return Response.json({ produtos: [], query: q });

        try {
          const busca = q.startsWith("http")
            ? { links: [q], fonte: "link-direto", tentativas: [] as string[] }
            : await buscarLinks(q);

          const candidatos = (await Promise.all(
            busca.links.slice(0, 24).map((link) => carregarProduto(link).catch(() => null)),
          )).filter(Boolean) as ProdutoBusca[];

          const termo = normalizar(q);
          const somenteNumero = /^\d{3,}$/.test(q.replace(/\D/g, ""));
          const skuBuscado = q.replace(/\D/g, "");

          const produtos = candidatos
            .filter((produto) => {
              if (!somenteNumero) return true;
              return produto.sku.replace(/\D/g, "") === skuBuscado ||
                normalizar(produto.nome).includes(termo);
            })
            .sort((a, b) => {
              const skuA = skuBuscado && a.sku.replace(/\D/g, "") === skuBuscado ? 0 : 1;
              const skuB = skuBuscado && b.sku.replace(/\D/g, "") === skuBuscado ? 0 : 1;
              if (skuA !== skuB) return skuA - skuB;

              const nomeA = normalizar(a.nome).includes(termo) ? 0 : 1;
              const nomeB = normalizar(b.nome).includes(termo) ? 0 : 1;
              return nomeA - nomeB;
            })
            .slice(0, 12);

          return Response.json({
            produtos,
            query: q,
            conectado: true,
            fonte: busca.fonte,
            tentativas: busca.tentativas,
            encontradosNoSite: busca.links.length,
          }, { headers: { "cache-control": "no-store" } });
        } catch (error) {
          return Response.json(
            {
              produtos: [],
              query: q,
              conectado: false,
              error: error instanceof Error ? error.message : String(error),
            },
            { status: 502 },
          );
        }
      },
    },
  },
});

async function buscarLinks(q: string) {
  const rotas = [
    BASE + "/Busca/?busca=" + encodeURIComponent(q) + "&pagina=1",
    BASE + "/busca?busca=" + encodeURIComponent(q) + "&pagina=1",
    BASE + "/busca?busca=" + encodeURIComponent(q),
  ];

  const links = new Set<string>();
  const tentativas: string[] = [];
  let fonte = "";

  for (const target of rotas) {
    try {
      const html = await fetchText(target);
      tentativas.push(target);

      const encontrados = extrairLinksProduto(html);
      encontrados.forEach((link) => links.add(link));

      if (encontrados.length) {
        fonte = target;
        break;
      }
    } catch (error) {
      tentativas.push(`${target} · ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Se a busca não encontrou links, tenta a listagem geral como último recurso.
  // Isso é especialmente útil para SKU quando o mecanismo interno do site estiver instável.
  if (!links.size) {
    try {
      const target = BASE + "/busca";
      const html = await fetchText(target);
      tentativas.push(target);
      extrairLinksProduto(html).forEach((link) => links.add(link));
      if (links.size) fonte = target;
    } catch (error) {
      tentativas.push(`/busca · ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  if (!links.size) {
    throw new Error("O site respondeu, mas nenhum link de produto foi localizado na busca.");
  }

  return { links: [...links], fonte, tentativas };
}

function extrairLinksProduto(html: string) {
  const links = new Set<string>();
  const normal = html.replace(/\\\//g, "/").replace(/&amp;/g, "&");

  for (const m of normal.matchAll(/href=["']([^"']*\/produto\/[^"'?#<>\s]+)["']/gi)) {
    links.add(abs(m[1]));
  }

  for (const m of normal.matchAll(/["'](https?:\/\/[^"']+\/produto\/[^"'?#<>\s]+)["']/gi)) {
    links.add(m[1]);
  }

  // Wake/loja pode serializar a URL em JSON em vez de colocar href diretamente.
  for (const m of normal.matchAll(/(?:url|link|href)["']?\s*[:=]\s*["']([^"']*\/produto\/[^"'?#<>\s]+)["']/gi)) {
    links.add(abs(m[1]));
  }

  // Último fallback: qualquer ocorrência clara de /produto/<slug>.
  for (const m of normal.matchAll(/(\/produto\/[a-z0-9][a-z0-9._~!$&'()*+,;=:@%\/-]*)/gi)) {
    links.add(abs(m[1]));
  }

  return [...links];
}

async function carregarProduto(url: string): Promise<ProdutoBusca> {
  const html = await fetchText(url);
  const jsonProduct = findProductJsonLd(html);

  const nome =
    asText(jsonProduct?.name) ||
    meta(html, "property", "og:title") ||
    tagTitle(html) ||
    slugName(url);

  const sku =
    asText(jsonProduct?.sku) ||
    first(html, /"sku"\s*:\s*"([^"]+)"/i) ||
    first(html, /SKU\s*[:#-]?\s*([0-9A-Za-z.-]+)/i) ||
    "";

  const descricao = cleanText(asText(jsonProduct?.description) || meta(html, "name", "description") || "");
  const imagem = firstImage(jsonProduct?.image) || meta(html, "property", "og:image") || "";

  const precoSite =
    numericPrice(jsonProduct?.offers?.price) ??
    numericPrice(jsonProduct?.offers?.lowPrice) ??
    numericPrice(meta(html, "property", "product:price:amount")) ??
    moneyFrom(html, [
      /"price"\s*:\s*"?(\d+[\d.,]*)"?/i,
      /R\$\s*([\d.]+,\d{2})\s*(?:à vista|a vista)/i,
    ]);

  const precoAnterior = moneyFrom(html, [
    /"oldPrice"\s*:\s*"?(\d+[\d.,]*)"?/i,
    /"priceFrom"\s*:\s*"?(\d+[\d.,]*)"?/i,
    /"precoDe"\s*:\s*"?(\d+[\d.,]*)"?/i,
    /(?:de|era)\s*R\$\s*([\d.]+,\d{2})/i,
  ]);

  return {
    url,
    nome: cleanText(nome),
    sku,
    descricao,
    imagem,
    precoSite,
    precoAnterior,
  };
}

async function fetchText(url: string) {
  const res = await fetch(url, {
    redirect: "follow",
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
      "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.7",
      "Cache-Control": "no-cache",
      "Pragma": "no-cache",
    },
    signal: AbortSignal.timeout(15000),
  });

  if (!res.ok) throw new Error("Lojas IM respondeu " + res.status);

  const html = await res.text();
  if (!html || html.length < 500) throw new Error("O site devolveu uma página vazia/incompleta.");
  return html;
}

function findProductJsonLd(html: string): any | null {
  for (const match of html.matchAll(/<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)) {
    try {
      const parsed = JSON.parse(match[1].trim());
      const found = deepFindProduct(parsed);
      if (found) return found;
    } catch {}
  }
  return null;
}

function deepFindProduct(value: any): any | null {
  if (!value) return null;
  if (Array.isArray(value)) {
    for (const x of value) {
      const found = deepFindProduct(x);
      if (found) return found;
    }
    return null;
  }
  if (typeof value === "object") {
    const type = value["@type"];
    if (type === "Product" || (Array.isArray(type) && type.includes("Product"))) return value;
    for (const x of Object.values(value)) {
      const found = deepFindProduct(x);
      if (found) return found;
    }
  }
  return null;
}

function meta(html: string, attr: "property" | "name", value: string) {
  const re = new RegExp("<meta[^>]*" + attr + "=[\"']" + escapeRegExp(value) + "[\"'][^>]*content=[\"']([^\"']*)[\"'][^>]*>", "i");
  const inv = new RegExp("<meta[^>]*content=[\"']([^\"']*)[\"'][^>]*" + attr + "=[\"']" + escapeRegExp(value) + "[\"'][^>]*>", "i");
  return first(html, re) || first(html, inv) || "";
}

function tagTitle(html: string) {
  return cleanText(first(html, /<title[^>]*>([\s\S]*?)<\/title>/i) || "");
}

function first(html: string, re: RegExp) {
  return html.match(re)?.[1] || "";
}

function firstImage(v: any) {
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return typeof v[0] === "string" ? v[0] : asText(v[0]?.url);
  if (v && typeof v === "object") return asText(v.url);
  return "";
}

function asText(v: any) {
  return typeof v === "string" || typeof v === "number" ? String(v) : "";
}

function moneyFrom(html: string, patterns: RegExp[]) {
  for (const re of patterns) {
    const raw = first(html, re);
    const n = numericPrice(raw);
    if (n != null) return n;
  }
  return null;
}

function numericPrice(value: any): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  let s = raw.replace(/R\$/gi, "").replace(/\s/g, "");
  if (s.includes(",")) s = s.replace(/\.(?=\d{3}(\D|$))/g, "").replace(",", ".");
  const n = Number(s.replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function normalizar(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function cleanText(s: string) {
  return decodeEntities(s.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}

function decodeEntities(s: string) {
  const map: Record<string,string> = {
    "&amp;":"&","&quot;":"\"","&#39;":"'","&apos;":"'","&lt;":"<","&gt;":">","&nbsp;":" ",
  };
  return s.replace(/&(amp|quot|#39|apos|lt|gt|nbsp);/g, (m) => map[m] || m)
    .replace(/&#(\d+);/g, (_,n)=>String.fromCharCode(Number(n)));
}

function abs(href: string) {
  try { return new URL(href, BASE).toString(); } catch { return href; }
}

function slugName(url: string) {
  const slug = url.split("/produto/")[1]?.split("?")[0] || "";
  return slug.replace(/-\d+$/, "").replace(/-/g, " ");
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^$()|[\]\\{}]/g, "\\$&");
}