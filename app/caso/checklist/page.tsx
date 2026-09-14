import { getChecklist } from "@/lib/store";
import { getCaseId } from "@/lib/session";
import { getCase } from "@/lib/cases";
import ChecklistClient from "@/components/ChecklistClient";

export const dynamic = "force-dynamic";

export default async function ChecklistPage() {
  const caseId = await getCaseId();
  const [items, kase] = await Promise.all([getChecklist(caseId), getCase(caseId)]);
  return <ChecklistClient items={items} people={kase?.people ?? []} />;
}
