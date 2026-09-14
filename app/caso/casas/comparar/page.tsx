import Link from "next/link";
import { Star } from "lucide-react";
import { getCriteria, getHouses } from "@/lib/store";
import { getCaseId } from "@/lib/session";
import CompareTable from "@/components/CompareTable";

export const dynamic = "force-dynamic";

export default async function CompararPage() {
  const caseId = await getCaseId();
  const [houses, criteria] = await Promise.all([getHouses(caseId), getCriteria(caseId)]);
  const destacadas = houses.filter((h) => h.highlighted && h.status !== "borrada");

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl">Comparar destacadas</h1>
          <p className="inline-flex items-center gap-1 text-sm" style={{ color: "var(--ink-muted)" }}>
            Las casas marcadas con <Star size={14} fill="var(--gold)" color="var(--gold)" />, lado a lado.
          </p>
        </div>
        <Link href="/caso/casas" className="text-sm font-medium" style={{ color: "var(--accent)" }}>
          ← Volver a Casas
        </Link>
      </div>

      {destacadas.length === 0 ? (
        <p className="inline-flex flex-wrap items-center justify-center gap-1 py-16 text-center text-sm" style={{ color: "var(--ink-faint)" }}>
          Todavía no hay ninguna casa destacada. Marcá con <Star size={14} fill="var(--gold)" color="var(--gold)" /> las que quieras
          comparar desde la lista de Casas.
        </p>
      ) : (
        <CompareTable houses={destacadas} loan={criteria.loan} />
      )}
    </div>
  );
}
