import { getChecklist } from "@/lib/store";
import ChecklistClient from "@/components/ChecklistClient";

export const dynamic = "force-dynamic";

export default async function ChecklistPage() {
  const items = await getChecklist();
  return <ChecklistClient items={items} />;
}
