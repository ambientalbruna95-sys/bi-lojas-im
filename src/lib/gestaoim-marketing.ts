import type { Custo, Filial } from "@/lib/store";

export type GestaoMarketingExpense = {
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

export type GestaoMarketingResponse = {
  ok: boolean;
  fetchedAt?: string;
  competencia?: string;
  de?: string;
  ate?: string;
  endpoint?: string;
  source?: string;
  total?: number;
  valorTotal?: number;
  despesas?: GestaoMarketingExpense[];
  scope?: "connected-user" | "discovered";
  scopeLabel?: string;
  scopeWarning?: string;
  error?: string;
  nextStep?: string;
};

export async function buscarDespesasMarketingGestaoIM(
  competencia: string,
  range?: { de:string; ate:string },
): Promise<GestaoMarketingResponse> {
  const qs = new URLSearchParams({ competencia });
  if (range?.de && range?.ate) {
    qs.set("de", range.de);
    qs.set("ate", range.ate);
  }
  const res = await fetch(`/api/gestaoim/marketing-expenses?${qs.toString()}`, { cache: "no-store" });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    return {
      ok: false,
      ...(data || {}),
      error: data?.error || "Não foi possível consultar as Despesas Marketing do GestãoIM.",
    };
  }
  return data as GestaoMarketingResponse;
}

export function converterDespesasGestaoIM(
  despesas: GestaoMarketingExpense[],
  filiais: Filial[],
  sincronizadoEm: string,
): Custo[] {
  const rede = filiais.find((f) => f.isCD)?.id || "fCD";
  return despesas.map((d, idx) => {
    const filialId = localizarFilial(d.filial, filiais) || rede;
    return {
      id: `gestaoim-mkt-${d.id || idx}-${d.data}`,
      categoria: normalizarCategoria(d.categoria, d.descricao),
      descricao: d.descricao || d.fornecedor || "Despesa GestãoIM",
      valor: Number(d.valor || 0),
      filialId,
      data: d.data,
      origem: "GestãoIM",
      externalId: String(d.id || idx),
      sincronizadoEm,
    };
  });
}

export function mesclarDespesasGestaoIM(
  atuais: Custo[],
  novas: Custo[],
  competencia: string,
): Custo[] {
  const preservados = atuais.filter((c) => !(c.origem === "GestãoIM" && c.data.startsWith(competencia)));
  return [...preservados, ...novas];
}

export function mesclarDespesasGestaoIMPeriodo(
  atuais: Custo[],
  novas: Custo[],
  inicio: string,
  fim: string,
): Custo[] {
  const preservados = atuais.filter((c) => !(c.origem === "GestãoIM" && c.data >= inicio && c.data <= fim));
  return [...preservados, ...novas];
}

function localizarFilial(valor: string, filiais: Filial[]) {
  const raw = String(valor || "").trim();
  if (!raw || /^rede$/i.test(raw)) return "";

  const norm = normaliza(raw);
  const digits = raw.match(/\d+/)?.[0]?.replace(/^0+/, "") || "";

  const exact = filiais.find((f) => {
    const codeDigits = f.codigo.replace(/^0+/, "");
    return normaliza(f.codigo) === norm ||
      normaliza(f.nome) === norm ||
      normaliza(f.cidade) === norm ||
      (!!digits && codeDigits === digits);
  });
  if (exact) return exact.id;

  const loose = filiais.find((f) =>
    norm.includes(normaliza(f.nome)) ||
    normaliza(f.nome).includes(norm) ||
    norm.includes(normaliza(f.cidade)) ||
    normaliza(f.cidade).includes(norm)
  );
  return loose?.id || "";
}

function normalizarCategoria(categoria: string, descricao: string) {
  const text = normaliza(`${categoria} ${descricao}`);

  if (/google ads|meta ads|facebook|instagram|tiktok|trafego/.test(text)) return "Tráfego Pago";
  if (/influenc/.test(text)) return "Influencers";
  if (/carro de som|propaganda volante|volante/.test(text)) return "Propaganda Volante";
  if (/grafica|impress|banner|faixa|adesivo|panfleto|tabloide/.test(text)) return "Gráfica / Impressões";
  if (/reinaug/.test(text)) return "Reinauguração";
  if (/evento/.test(text)) return "Eventos";
  if (/decoracao|balao|crepom/.test(text)) return "Decoração";
  if (/brinde|mochila|garrafa|porta-joia/.test(text)) return "Brindes";
  if (/alimentacao|lanche|pipoca/.test(text)) return "Alimentação";
  if (/equipe|prestador|locutor|designer|filmagem|fotograf/.test(text)) return "Equipe / Prestadores";
  if (/transporte|combustivel|frete|viagem/.test(text)) return "Transporte";
  if (/material/.test(text)) return "Materiais";

  return categoria?.trim() || "Outros";
}

function normaliza(value: string) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}