import type { ResultadoDiario } from "@/lib/store";

export type ValorPeriodo = {
  meta: number | null;
  faturamento: number | null;
  baseCompleta: boolean;
  origem: "movimento" | "acumulado" | "sem-dados";
};

function somaMovimentos(registros: ResultadoDiario[], filialId: string, inicio: string, fim: string) {
  const rows = registros.filter((r) =>
    r.filialId === filialId &&
    (r.modo || "movimento") === "movimento" &&
    r.data >= inicio &&
    r.data <= fim
  );
  if (!rows.length) return null;
  return {
    meta: rows.reduce((a, r) => a + r.meta, 0),
    faturamento: rows.reduce((a, r) => a + r.faturamento, 0),
  };
}

function ultimoSnapshot(registros: ResultadoDiario[], filialId: string, ate: string) {
  return registros
    .filter((r) => r.filialId === filialId && r.modo === "acumulado" && r.data <= ate)
    .sort((a, b) => b.data.localeCompare(a.data))[0] || null;
}

function snapshotAnterior(registros: ResultadoDiario[], filialId: string, antesDe: string) {
  return registros
    .filter((r) => r.filialId === filialId && r.modo === "acumulado" && r.data < antesDe)
    .sort((a, b) => b.data.localeCompare(a.data))[0] || null;
}

export function valorPeriodo(
  registros: ResultadoDiario[],
  filialId: string,
  inicio: string,
  fim: string,
): ValorPeriodo {
  const movimento = somaMovimentos(registros, filialId, inicio, fim);
  if (movimento) {
    return { ...movimento, baseCompleta: true, origem: "movimento" };
  }

  const fimSnap = ultimoSnapshot(registros, filialId, fim);
  if (!fimSnap) return { meta: null, faturamento: null, baseCompleta: false, origem: "sem-dados" };

  const inicioAno = `${fim.slice(0, 4)}-01-01`;
  if (inicio === inicioAno) {
    return {
      meta: fimSnap.meta,
      faturamento: fimSnap.faturamento,
      baseCompleta: true,
      origem: "acumulado",
    };
  }

  const base = snapshotAnterior(registros, filialId, inicio);
  if (!base) {
    return {
      meta: null,
      faturamento: null,
      baseCompleta: false,
      origem: "acumulado",
    };
  }

  return {
    meta: Math.max(0, fimSnap.meta - base.meta),
    faturamento: Math.max(0, fimSnap.faturamento - base.faturamento),
    baseCompleta: true,
    origem: "acumulado",
  };
}

export function somaRedePeriodo(
  registros: ResultadoDiario[],
  filialIds: string[],
  inicio: string,
  fim: string,
) {
  const vals = filialIds.map((id) => valorPeriodo(registros, id, inicio, fim));
  const validos = vals.filter((v) => v.meta != null || v.faturamento != null);
  return {
    meta: validos.length ? validos.reduce((a, v) => a + (v.meta || 0), 0) : null,
    faturamento: validos.length ? validos.reduce((a, v) => a + (v.faturamento || 0), 0) : null,
    baseCompleta: vals.length > 0 && vals.every((v) => v.baseCompleta),
    filiaisComBase: vals.filter((v) => v.baseCompleta).length,
  };
}

export function intervaloPeriodo(tipo: "Dia" | "Mês" | "Ano", referencia: string) {
  if (tipo === "Dia") return { inicio: referencia, fim: referencia };
  if (tipo === "Mês") {
    const [y, m] = referencia.slice(0, 7).split("-").map(Number);
    const ultimo = new Date(y, m, 0).getDate();
    return {
      inicio: `${y}-${String(m).padStart(2, "0")}-01`,
      fim: `${y}-${String(m).padStart(2, "0")}-${String(ultimo).padStart(2, "0")}`,
    };
  }
  const y = referencia.slice(0, 4);
  return { inicio: `${y}-01-01`, fim: `${y}-12-31` };
}

export function diaAnterior(data: string) {
  const d = new Date(data + "T12:00:00");
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}


export function valorMesFilial(
  registros: ResultadoDiario[],
  filialId: string,
  mes: string,
): ValorPeriodo & { dataBase?: string } {
  const [y, m] = mes.split("-").map(Number);
  const inicio = `${mes}-01`;
  const fim = `${mes}-${String(new Date(y, m, 0).getDate()).padStart(2, "0")}`;

  const movimento = somaMovimentos(registros, filialId, inicio, fim);
  if (movimento) {
    return {
      ...movimento,
      baseCompleta: true,
      origem: "movimento",
      dataBase: fim,
    };
  }

  const snapshot = registros
    .filter((r) =>
      r.filialId === filialId &&
      r.modo === "acumulado" &&
      r.data.startsWith(mes)
    )
    .sort((a, b) => b.data.localeCompare(a.data))[0];

  if (snapshot) {
    return {
      meta: snapshot.meta,
      faturamento: snapshot.faturamento,
      baseCompleta: true,
      origem: "acumulado",
      dataBase: snapshot.data,
    };
  }

  const fallback = valorPeriodo(registros, filialId, inicio, fim);
  return { ...fallback };
}

export function somaRedeMes(
  registros: ResultadoDiario[],
  filialIds: string[],
  mes: string,
) {
  const vals = filialIds.map((id) => valorMesFilial(registros, id, mes));
  const validos = vals.filter((v) => v.meta != null || v.faturamento != null);
  const datas = vals.map((v) => v.dataBase).filter((x): x is string => !!x).sort().reverse();
  return {
    meta: validos.length ? validos.reduce((a, v) => a + (v.meta || 0), 0) : null,
    faturamento: validos.length ? validos.reduce((a, v) => a + (v.faturamento || 0), 0) : null,
    baseCompleta: vals.length > 0 && vals.every((v) => v.baseCompleta),
    filiaisComBase: vals.filter((v) => v.baseCompleta).length,
    dataBase: datas[0] || "",
  };
}