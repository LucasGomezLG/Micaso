import { NextRequest, NextResponse } from "next/server";
import { deleteHouse, getHouses, updateHouse } from "@/lib/store";
import { getCaseIdFromRequest } from "@/lib/session";
import { notifyCaseClients } from "@/lib/push";
import { formatUsd } from "@/lib/format";
import { geocodeZone } from "@/lib/zoneCoords";

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/houses/[id]">
) {
  const caseId = getCaseIdFromRequest(request);
  const { id } = await ctx.params;
  let patch: Record<string, unknown>;
  try {
    patch = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  // Si el patch trae un precio nuevo, guardar el anterior para poder avisar
  // del cambio — se pierde después de `updateHouse`, así que hay que leerlo
  // antes. Solo se lee cuando hace falta (no en cada cambio de estado/favorito).
  const previousHouse = (await getHouses(caseId)).find((h) => h.id === id);
  const previousPriceUsd =
    typeof patch.priceUsd === "number"
      ? (previousHouse?.priceUsd ?? null)
      : null;

  if (typeof patch.zone === "string" && patch.zone !== previousHouse?.zone) {
    const coords = await geocodeZone(patch.zone);
    if (coords) {
      patch.lat = coords.lat;
      patch.lng = coords.lng;
    }
  }

  const house = await updateHouse(caseId, id, patch);
  if (!house) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }

  // Notificar a los clientes si se coordinó o actualizó una visita
  if (patch.visitaFecha) {
    const fechaFormatted = String(patch.visitaFecha).slice(0, 10);
    notifyCaseClients(caseId, {
      title: "Micaso · Visita agendada",
      body: `Visita confirmada: ${house.title || "Propiedad"} (${fechaFormatted})`,
      url: "/caso/agenda",
    }).catch(() => {});
  }

  // Notificar si el precio cambió de verdad (no la primera vez que se carga)
  if (previousPriceUsd !== null && typeof house.priceUsd === "number" && house.priceUsd !== previousPriceUsd) {
    notifyCaseClients(caseId, {
      title: "Micaso · Cambio de precio",
      body: `${house.title || "Una propiedad"}: ${formatUsd(previousPriceUsd)} → ${formatUsd(house.priceUsd)}`,
      url: "/caso/casas",
    }).catch(() => {});
  }

  return NextResponse.json({ house });
}

export async function DELETE(
  request: NextRequest,
  ctx: RouteContext<"/api/houses/[id]">
) {
  const caseId = getCaseIdFromRequest(request);
  const { id } = await ctx.params;
  await deleteHouse(caseId, id);
  return NextResponse.json({ ok: true });
}
