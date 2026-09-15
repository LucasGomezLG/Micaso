import { getCriteria } from "@/lib/store";
import { getCaseId } from "@/lib/session";
import CalculadoraClient from "@/components/CalculadoraClient";

export const dynamic = "force-dynamic";

export default async function CalculadoraPage() {
  const caseId = await getCaseId();
  const criteria = await getCriteria(caseId);
  return <CalculadoraClient loan={criteria.loan} caseId={caseId} />;
}
