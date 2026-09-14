import { getCriteria, getHouses } from "@/lib/store";
import CasasBoard from "@/components/CasasBoard";

export const dynamic = "force-dynamic";

export default async function CasasPage(props: PageProps<"/casas">) {
  const searchParams = await props.searchParams;
  const initialStatus =
    typeof searchParams.status === "string" ? searchParams.status : "todas";
  const [houses, criteria] = await Promise.all([getHouses(), getCriteria()]);

  return (
    <CasasBoard
      houses={houses}
      zones={[...criteria.brief.zones, ...criteria.brief.capitalZones]}
      initialStatus={initialStatus}
      loan={criteria.loan}
    />
  );
}
