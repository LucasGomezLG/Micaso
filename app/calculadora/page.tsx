import { getCriteria } from "@/lib/store";
import CalculadoraClient from "@/components/CalculadoraClient";

export const dynamic = "force-dynamic";

export default async function CalculadoraPage() {
  const criteria = await getCriteria();
  return <CalculadoraClient loan={criteria.loan} />;
}
