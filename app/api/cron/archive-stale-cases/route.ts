import { NextRequest, NextResponse } from "next/server";
import { archiveStaleReadOnlyCases, downgradeCasesForInactiveBrokers } from "@/lib/cases";

/** Vercel Cron llama a esto una vez por día (ver vercel.json) mandando
 * `Authorization: Bearer $CRON_SECRET` — solo se exige si CRON_SECRET
 * está configurado, así funciona sin fricción en local. Sin la
 * variable puesta en Vercel, esta ruta quedaría abierta a cualquiera
 * que la llame, así que hay que configurarla antes de tener casos
 * reales en solo_lectura. */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (process.env.NODE_ENV === "production" && !secret) {
    return NextResponse.json({ error: "CRON_SECRET no configurado" }, { status: 500 });
  }
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
  }

  // Primero baja a solo_lectura los casos de corredores sin suscripción
  // vigente (venció la prueba, atrasada, cancelada) — así entran al mismo
  // conteo de 90 días de gracia que archiva la llamada de abajo.
  const downgraded = await downgradeCasesForInactiveBrokers();
  const archived = await archiveStaleReadOnlyCases();
  return NextResponse.json({ downgraded, archived });
}
