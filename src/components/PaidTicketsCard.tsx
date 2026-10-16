import { useEffect, useState } from "react";
import { AlertTriangle, BadgeCheck } from "lucide-react";
import { Badge } from "@/components/kit";

type Resp = { ok: boolean; status?: string; error?: string; missing?: string; candidates?: string[] };

/** "Realizado/Pago" — only tickets confirmed as paid in GestãoIM's finance module. */
export function PaidTicketsCard({ de, ate }: { de: string; ate: string }) {
  const [r, setR] = useState<Resp | null>(null);
  useEffect(() => {
    let alive = true;
    setR(null);
    fetch(`/api/gestaoim/paid-tickets?${new URLSearchParams({ de, ate })}`, { cache: "no-store" })
      .then((x) => x.json()).catch(() => ({ ok: false, error: "Falha na consulta." }))
      .then((d) => alive && setR(d));
    return () => { alive = false; };
  }, [de, ate]);

  return (
    <div className="mb-4 rounded-2xl border border-warn/25 bg-warn/[.05] p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 font-display font-black"><BadgeCheck className="h-4 w-4"/>Realizado / Pago · Tickets pagos · GestãoIM</div>
          <div className="mt-1 text-sm text-muted-foreground">
            {!r ? "Consultando tickets pagos..." : r.ok ? "Sincronizado" : "Aguardando rota de tickets pagos — nenhum valor é contado como pago."}
          </div>
        </div>
        <Badge tone="warn">AGUARDANDO ROTA</Badge>
      </div>
      {r && !r.ok && <div className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warn"/>
        <span>{r.error}{r.missing ? ` ${r.missing}` : ""}{r.candidates?.length ? ` Candidatas: ${r.candidates.join(", ")}` : ""}</span>
      </div>}
      <p className="mt-2 text-[11px] text-muted-foreground">Os lançamentos abaixo são <b>lançados/enviados ao financeiro</b> e não são somados como realizado pago.</p>
    </div>
  );
}