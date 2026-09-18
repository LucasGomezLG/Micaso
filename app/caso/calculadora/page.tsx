import { getCriteria } from "@/lib/store";
import { getCaseId } from "@/lib/session";
import CalculadoraClient from "@/components/CalculadoraClient";

export const dynamic = "force-dynamic";

export default async function CalculadoraPage(props: PageProps<"/caso/calculadora">) {
  const searchParams = await props.searchParams;
  const rawPrice = typeof searchParams.price === "string" ? parseFloat(searchParams.price) : undefined;
  const initialPrice = rawPrice && !isNaN(rawPrice) && rawPrice > 0 ? Math.round(rawPrice) : undefined;

  const caseId = await getCaseId();
  const criteria = await getCriteria(caseId);
  return <CalculadoraClient key={initialPrice || "default"} loan={criteria.loan} caseId={caseId} initialPropertyValue={initialPrice} />;
}

