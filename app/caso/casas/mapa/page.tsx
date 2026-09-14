import Link from "next/link";
import { getHouses } from "@/lib/store";
import { getCaseId } from "@/lib/session";
import MapPageClient from "@/components/MapPageClient";

export const dynamic = "force-dynamic";

export default async function MapaPage() {
  const caseId = await getCaseId();
  const houses = (await getHouses(caseId)).filter((h) => h.status !== "borrada");

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl">Mapa</h1>
          <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
            Ubicación aproximada por zona — no es la dirección exacta, sirve
            para planear una ronda de visitas por cercanía.
          </p>
        </div>
        <Link href="/caso/casas" className="text-sm font-medium" style={{ color: "var(--accent)" }}>
          ← Volver a Casas
        </Link>
      </div>

      <MapPageClient houses={houses} />
    </div>
  );
}
