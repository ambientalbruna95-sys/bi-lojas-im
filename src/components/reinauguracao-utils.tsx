import { useState, type CSSProperties } from "react";
import { Palette, RotateCcw } from "lucide-react";
import { useApp, EQUIPE, type Reinauguracao } from "@/lib/store";
import { Btn, Modal } from "@/components/kit";

export const hoje = () => new Date().toISOString().slice(0, 10);

export function resumo(r: Reinauguracao) {
  const cardsNormalizados = r.cards.map((c) => {
    const checklistConcluido = c.checklist.length > 0 && c.checklist.every((i) => i.feito);
    return { ...c, efetivamenteConcluido: c.status === "Concluído" || checklistConcluido };
  });
  const itens = cardsNormalizados.flatMap((c) => c.checklist);
  const feitosCheck = itens.filter((i) => i.feito).length;
  const concl = cardsNormalizados.filter((c) => c.efetivamenteConcluido).length;
  const pend = cardsNormalizados.length - concl;
  const atras = cardsNormalizados.filter((c) => !c.efetivamenteConcluido && c.prazo && c.prazo < hoje()).length;
  const total = cardsNormalizados.length + itens.length;
  const pct = total ? Math.min(100, Math.round(((concl + feitosCheck) / total) * 100)) : 0;
  const tudoConcluido = cardsNormalizados.length > 0 && cardsNormalizados.every((c) => c.efetivamenteConcluido);
  const pctFinal = tudoConcluido ? 100 : pct;
  const status = pctFinal === 100 ? "Concluída" : atras ? "Atrasada" : pctFinal > 0 ? "Em andamento" : "Não iniciada";
  return { pct: pctFinal, pend, atras, concl, total: r.cards.length, status };
}

export const nomeResponsavel = (nome: string) => nome.trim().toUpperCase();

export function textoDaCor(cor: string) {
  const canais = [1, 3, 5].map((inicio) => {
    const v = parseInt(cor.slice(inicio, inicio + 2), 16) / 255;
    return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  const luminancia = canais[0] * 0.2126 + canais[1] * 0.7152 + canais[2] * 0.0722;
  return luminancia > 0.179 ? "var(--responsavel-text-dark)" : "var(--responsavel-text-light)";
}

export function Chip({ nome, onRemove }: { nome: string; onRemove?: () => void }) {
  const { s } = useApp();
  const cor = s.coresResponsaveis[nomeResponsavel(nome)];
  const style = cor ? { "--responsavel-bg": cor, "--responsavel-text": textoDaCor(cor) } as CSSProperties : undefined;
  return (
    <span data-responsavel={nomeResponsavel(nome)} style={style} className={`inline-flex max-w-full items-center gap-1 break-words rounded-full px-2 py-0.5 text-[11px] font-bold ${cor ? "responsavel-chip-custom" : "bg-muted text-foreground"}`}>
      {nome.toUpperCase()}
      {onRemove && <button aria-label={`Remover ${nome}`} onClick={onRemove}>×</button>}
    </span>
  );
}

export function CoresResponsaveis() {
  const { s, set } = useApp();
  const [open, setOpen] = useState(false);
  const nomesUsados = s.reinauguracoes.flatMap((r) => r.cards.flatMap((c) => [
    ...c.responsaveis,
    ...c.checklist.map((i) => i.responsavel || "").filter(Boolean),
  ]));
  const nomes = [...new Set([...EQUIPE, ...nomesUsados].map(nomeResponsavel).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR"));
  const salvar = (nome: string, cor?: string) => set((st) => {
    const cores = { ...st.coresResponsaveis };
    if (cor) cores[nome] = cor;
    else delete cores[nome];
    return { ...st, coresResponsaveis: cores };
  });
  return <>
    <Btn variant="outline" onClick={() => setOpen(true)}><Palette className="h-4 w-4 shrink-0" />Cores dos responsáveis</Btn>
    <Modal open={open} onClose={() => setOpen(false)} title="Cores dos responsáveis">
      <div className="space-y-3">
        {nomes.map((nome) => <div key={nome} className="min-w-0 space-y-3 border-b pb-3 last:border-0">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Chip nome={nome} />
            <div className="flex items-center gap-2">
              <input type="color" aria-label={`Cor de ${nome}`} value={s.coresResponsaveis[nome] || "#64748b"} onChange={(e) => salvar(nome, e.target.value)} className="h-10 w-12 cursor-pointer rounded-md border bg-background p-1" />
              <Btn variant="ghost" disabled={!s.coresResponsaveis[nome]} aria-label={`Restaurar cor de ${nome}`} title="Restaurar padrão" onClick={() => salvar(nome)}><RotateCcw className="h-4 w-4" /></Btn>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5, 6].map((n) => <Btn key={n} variant="outline" className="h-10 w-10 rounded-md p-2" aria-label={`Preset ${n} para ${nome}`} onClick={(e) => salvar(nome, getComputedStyle(e.currentTarget).getPropertyValue(`--responsavel-preset-${n}`).trim())}>
              <span className="h-5 w-5 rounded-full border" style={{ backgroundColor: `var(--responsavel-preset-${n})` }} />
            </Btn>)}
          </div>
        </div>)}
        {!nomes.length && <p className="text-sm text-muted-foreground">Nenhum responsável nos cartões.</p>}
      </div>
    </Modal>
  </>;
}