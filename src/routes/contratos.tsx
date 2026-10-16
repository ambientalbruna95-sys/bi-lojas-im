import { createFileRoute } from "@tanstack/react-router";
import { FileSignature } from "lucide-react";
import { ContractHub } from "@/components/ContractHub";
import { PageHeader, pageHead } from "@/components/kit";

export const Route = createFileRoute("/contratos")({
  head: pageHead("Contratos de Influencers", "Gestão, vigência e assinaturas dos contratos de influencers."),
  component: Page,
});

function Page(){
  return <>
    <PageHeader title="Contratos de Influencers" sub="Edite rascunhos, acompanhe vigências e colete assinaturas na plataforma." action={<div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary"><FileSignature className="h-5 w-5"/></div>} />
    <ContractHub mode="management"/>
  </>;
}