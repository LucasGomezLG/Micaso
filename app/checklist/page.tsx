import { getChecklist } from "@/lib/store";
import { getCaseId } from "@/lib/session";
import ChecklistClient from "@/components/ChecklistClient";

export const dynamic = "force-dynamic";

export default async function ChecklistPage() {
  const caseId = await getCaseId();
  const items = await getChecklist(caseId);
  return <ChecklistClient items={items} />;
}
