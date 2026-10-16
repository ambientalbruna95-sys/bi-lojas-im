import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Plus, Truck, Wallet, Clock3 } from "lucide-react";
import { useApp, brl, uid, type Volante } from "@/lib/store";
import { PageHeader, Panel, Stat, Btn, Modal, Field, inputCls, Badge, pageHead } from "@/components/kit";

export const Route = createFileRoute("/propaganda-volante")({ head: pageHead("Propaganda Volante", "Controle mensal dos carros de som por cidade, horas e orçamento."), component: Page });

function Page() {
  const { s, set } = useApp();
  const [open, setOpen] = useState(false);
  const mesAtual = new Date().toISOString().slice(0, 7);
  const [mes, setMes] = useState(mesAtual);
  const [f, setF] = useState({
    filialId: "f02", competencia: mesAtual, veiculo: "Carro de som", fornecedor: "", spot: "", data: new Date().toISOString().slice(0,10),
    horas: 1, custo: 0, limiteMensal: 0, rota: "",
  });

  const dados = useMemo(() => s.volantes.filter((v) => v.competencia === mes), [s.volantes, mes]);
  const agrupado = useMemo(() => {
    const map = new Map<string, { filialId: string; horas: number; gasto: number; limite: number; acoes: number }>();
    dados.forEach((v) => {
      const atual = map.get(v.filialId) || { filialId: v.filialId, horas: 0, gasto: 0, limite: 0, acoes: 0 };
      atual.horas += v.horas;
      atual.gasto += v.custo;
      atual.limite = Math.max(atual.limite, v.limiteMensal);
      atual.acoes += 1;
      map.set(v.filialId, atual);
    });
    return [...map.values()].sort((a,b) => b.gasto - a.gasto);
  }, [dados]);

  const totalHoras = dados.reduce((a,v) => a + v.horas, 0);
  const totalGasto = dados.reduce((a,v) => a + v.custo, 0);
  const totalLimite = agrupado.reduce((a,v) => a + v.limite, 0);
  const saldo = totalLimite - totalGasto;

  const salvar = () => {
    const item: Volante = { id: uid(), ...f };
    set((st) => ({ ...st, volantes: [...st.volantes, item], custos: [...st.custos, {
      id: uid(), categoria: "Propaganda Volante", descricao: `${st.filiais.find((x) => x.id === f.filialId)?.nome ?? "Filial"} · ${f.horas}h · ${f.veiculo}`,
      valor: f.custo, filialId: f.filialId, data: f.data,
    }] }));
    setOpen(false);
  };

  return (
    <>
      <PageHeader title="Propaganda Volante" sub="Controle mensal por cidade, horas utilizadas e limite de investimento" action={<Btn onClick={() => setOpen(true)}><Plus className="h-4 w-4" />Registrar ação</Btn>} />

      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Field label="Competência"><input type="month" className={inputCls} value={mes} onChange={(e) => setMes(e.target.value)} /></Field>
        <div className="text-xs text-muted-foreground">Cada registro também entra automaticamente no Centro de Custos.</div>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat label="Horas no mês" value={String(totalHoras)} hint="todas as cidades" />
        <Stat label="Investido" value={brl(totalGasto)} hint="propaganda volante" />
        <Stat label="Limite mensal" value={brl(totalLimite)} hint="soma dos limites cadastrados" />
        <Stat accent label="Saldo disponível" value={brl(Math.max(0, saldo))} hint={saldo < 0 ? `${brl(Math.abs(saldo))} acima do limite` : "orçamento ainda disponível"} />
      </div>

      <Panel title="Resumo por cidade" className="mt-4">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] text-sm">
            <thead><tr className="border-b text-left text-xs uppercase text-muted-foreground"><th className="pb-2">Cidade / filial</th><th>Ações</th><th>Horas</th><th>Utilizado</th><th>Limite mensal</th><th>Saldo</th><th>Status</th></tr></thead>
            <tbody>
              {agrupado.map((a) => {
                const filial = s.filiais.find((x) => x.id === a.filialId);
                const rest = a.limite - a.gasto;
                return <tr key={a.filialId} className="border-b last:border-0">
                  <td className="py-2"><b>{filial?.codigo} — {filial?.nome}</b></td>
                  <td>{a.acoes}</td><td>{a.horas}h</td><td>{brl(a.gasto)}</td><td>{brl(a.limite)}</td><td>{brl(rest)}</td>
                  <td><Badge tone={rest < 0 ? "primary" : rest === 0 ? "warn" : "success"}>{rest < 0 ? "Acima do limite" : rest === 0 ? "Limite usado" : "Disponível"}</Badge></td>
                </tr>;
              })}
            </tbody>
          </table>
          {!agrupado.length && <div className="py-8 text-center text-sm text-muted-foreground">Nenhuma ação cadastrada nesta competência.</div>}
        </div>
      </Panel>

      <Panel title="Lançamentos do mês" className="mt-4">
        <div className="grid gap-3 lg:grid-cols-2">
          {dados.map((v) => {
            const filial = s.filiais.find((x) => x.id === v.filialId);
            return <div key={v.id} className="rounded-lg border p-4">
              <div className="flex items-start justify-between gap-3"><div><div className="text-xs font-bold uppercase text-primary">{filial?.codigo} — {filial?.nome}</div><div className="font-display text-lg font-bold">{v.veiculo}</div></div><Badge>{v.data.split("-").reverse().join("/")}</Badge></div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                <div className="flex items-center gap-2"><Clock3 className="h-4 w-4 text-muted-foreground" /><span><b>{v.horas}h</b> utilizadas</span></div>
                <div className="flex items-center gap-2"><Wallet className="h-4 w-4 text-muted-foreground" /><span><b>{brl(v.custo)}</b></span></div>
                <div className="col-span-2"><b>Spot:</b> {v.spot || "—"}</div>
                <div className="col-span-2"><b>Fornecedor:</b> {v.fornecedor || "—"}</div>
                <div className="col-span-2"><b>Rota:</b> {v.rota || "—"}</div>
              </div>
            </div>;
          })}
        </div>
      </Panel>

      <Modal open={open} onClose={() => setOpen(false)} title="Registrar propaganda volante">
        <div className="space-y-3">
          <Field label="Cidade / filial"><select className={inputCls} value={f.filialId} onChange={(e) => setF({ ...f, filialId: e.target.value })}>{s.filiais.filter((x) => !x.isCD).map((x) => <option key={x.id} value={x.id}>{x.codigo} — {x.nome}</option>)}</select></Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Competência"><input type="month" className={inputCls} value={f.competencia} onChange={(e) => setF({ ...f, competencia: e.target.value })} /></Field>
            <Field label="Data"><input type="date" className={inputCls} value={f.data} onChange={(e) => setF({ ...f, data: e.target.value })} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Quantidade de horas"><input type="number" min="0" step="0.5" className={inputCls} value={f.horas} onChange={(e) => setF({ ...f, horas: Number(e.target.value) })} /></Field>
            <Field label="Valor utilizado"><input type="number" min="0" className={inputCls} value={f.custo} onChange={(e) => setF({ ...f, custo: Number(e.target.value) })} /></Field>
          </div>
          <Field label="Limite mensal desta cidade"><input type="number" min="0" className={inputCls} value={f.limiteMensal} onChange={(e) => setF({ ...f, limiteMensal: Number(e.target.value) })} /></Field>
          <Field label="Veículo"><input className={inputCls} value={f.veiculo} onChange={(e) => setF({ ...f, veiculo: e.target.value })} /></Field>
          <Field label="Fornecedor"><input className={inputCls} value={f.fornecedor} onChange={(e) => setF({ ...f, fornecedor: e.target.value })} /></Field>
          <Field label="Spot / áudio"><input className={inputCls} placeholder="Ex.: Spot Aniversário IM" value={f.spot} onChange={(e) => setF({ ...f, spot: e.target.value })} /></Field>
          <Field label="Rota / observação"><textarea rows={3} className={inputCls} value={f.rota} onChange={(e) => setF({ ...f, rota: e.target.value })} /></Field>
          <Btn className="w-full" onClick={salvar}><Truck className="h-4 w-4" />Salvar lançamento</Btn>
        </div>
      </Modal>
    </>
  );
}