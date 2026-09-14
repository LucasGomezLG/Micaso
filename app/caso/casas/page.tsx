import { getCriteria, getHouses } from "@/lib/store";
import { getCaseId } from "@/lib/session";
import { getCase } from "@/lib/cases";
import CasasBoard from "@/components/CasasBoard";

export const dynamic = "force-dynamic";

export default async function CasasPage(props: PageProps<"/caso/casas">) {
  const searchParams = await props.searchParams;
  const initialStatus =
    typeof searchParams.status === "string" ? searchParams.status : "todas";
  const caseId = await getCaseId();
  const [houses, criteria, kase] = await Promise.all([getHouses(caseId), getCriteria(caseId), getCase(caseId)]);

  return (
    <CasasBoard
      houses={houses}
      zones={[...criteria.brief.zones, ...criteria.brief.capitalZones]}
      initialStatus={initialStatus}
      loan={criteria.loan}
      people={kase?.people ?? []}
    />
  );
}
