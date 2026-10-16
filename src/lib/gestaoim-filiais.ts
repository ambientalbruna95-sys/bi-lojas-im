import type { Filial, ResultadoDiario } from "@/lib/store";

export type GestaoFilialPerformance = {
  codigo: string;
  filial: string;
  meta: number | null;
  faturamento: number | null;
  percentual: number | null;
  dataBase: string;
};

export type GestaoFiliaisResponse = {
  ok: boolean;
  competencia?: string;
  start?: string;
  end?: string;
  dataBase?: string;
  fetchedAt?: string;
  total?: number;
  esperado?: number;
  completo?: boolean;
  faltantes?: { codigo: string; nome: string }[];
  endpoints?: string[];
  filiais?: GestaoFilialPerformance[];
  error?: string;
  nextStep?: string;
};

export async function buscarPerformanceFiliaisGestaoIM(
  competencia: string,
  range?: { start:string; end:string },
): Promise<GestaoFiliaisResponse> {
  const qs = new URLSearchParams({ competencia });
  if (range?.start && range?.end) {
    qs.set("start", range.start);
    qs.set("end", range.end);
  }
  const res = await fetch(`/api/gestaoim/filiais-performance?${qs.toString()}`, { cache:"no-store" });
  const data = await res.json().catch(()=>null);
  if (!res.ok) {
    return {
      ok:false,
      ...(data || {}),
      error:data?.error || "Não foi possível consultar Meta e Faturamento por filial no GestãoIM.",
    };
  }
  return data as GestaoFiliaisResponse;
}

export function converterPerformanceGestaoIM(
  rows: GestaoFilialPerformance[],
  filiais: Filial[],
): ResultadoDiario[] {
  return rows.flatMap((r, idx) => {
    const filial = localizarFilial(r.codigo, r.filial, filiais);
    if (!filial || (r.meta == null && r.faturamento == null)) return [];
    return [{
      id:`gestaoim-filial-${filial.id}-${r.dataBase || idx}`,
      filialId:filial.id,
      data:r.dataBase || new Date().toISOString().slice(0,10),
      meta:Number(r.meta || 0),
      faturamento:Number(r.faturamento || 0),
      origem:"GestãoIM · Filiais",
      modo:"acumulado" as const,
    }];
  });
}

export function mesclarPerformanceGestaoIM(
  atuais: ResultadoDiario[],
  novas: ResultadoDiario[],
  competencia: string,
) {
  const idsNovos = new Set(novas.map((r)=>r.filialId));
  const preservados = atuais.filter((r) =>
    !(
      r.origem === "GestãoIM · Filiais" &&
      r.data.startsWith(competencia) &&
      idsNovos.has(r.filialId)
    )
  );
  return [...preservados, ...novas];
}

function localizarFilial(codigo: string, nome: string, filiais: Filial[]) {
  const code = String(codigo || "").replace(/\D/g,"").padStart(2,"0");
  const porCodigo = filiais.find((f)=>f.codigo.replace(/\D/g,"").padStart(2,"0") === code);
  if (porCodigo) return porCodigo;

  const norm = normaliza(nome);
  return filiais.find((f)=>{
    const fn=normaliza(f.nome);
    const fc=normaliza(f.cidade);
    return !!norm && (fn===norm || fc===norm || fn.includes(norm) || norm.includes(fn) || fc.includes(norm) || norm.includes(fc));
  });
}

function normaliza(v:string){
  return String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
}