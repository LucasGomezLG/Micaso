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
          <h1 className="text-2xl">Comparar favoritas</h1>
          <p className="inline-flex items-center gap-1 text-sm" style={{ color: "var(--ink-muted)" }}>
            Tus casas favoritas marcadas con <Star size={14} fill="var(--gold)" color="var(--gold)" />, lado a lado.
          </p>
        </div>
        <Link href="/caso/casas" className="text-sm font-medium" style={{ color: "var(--accent)" }}>
          ← Volver a Casas
        </Link>
      </div>

      {destacadas.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-center text-sm" style={{ color: "var(--ink-faint)" }}>
          <span className="text-3xl">⭐</span>
          <p className="font-semibold text-base" style={{ color: "var(--ink)" }}>
            Todavía no tenés casas favoritas
          </p>
          <p className="max-w-md text-xs" style={{ color: "var(--ink-muted)" }}>
            Marcá con la estrella ⭐ las propiedades que más te gusten desde la lista de Casas para compararlas acá.
          </p>
          <Link
            href="/caso/casas"
            className="mt-2 rounded-full border px-4 py-1.5 text-xs font-semibold"
            style={{ borderColor: "var(--border)", color: "var(--accent)" }}
          >
            Ir a Casas
          </Link>
        </div>
      ) : (
        <CompareTable houses={destacadas} loan={criteria.loan} />
      )}
    </div>
  );
}
