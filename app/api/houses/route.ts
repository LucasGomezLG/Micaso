import { NextRequest, NextResponse } from "next/server";
import { addHouse, getHouses } from "@/lib/store";
import { getCaseIdFromRequest } from "@/lib/session";
import { getCase, updatePeople } from "@/lib/cases";
import { getCurrentBroker } from "@/lib/brokers";
import { notifyCaseClients } from "@/lib/push";
import { geocodeZone } from "@/lib/geocode";
import { houseCreateSchema, parseJsonBody } from "@/lib/schemas";

export async function GET(request: NextRequest) {
  const caseId = getCaseIdFromRequest(request);
  const houses = await getHouses(caseId);
  return NextResponse.json({ houses });
}

export async function POST(request: NextRequest) {
  const caseId = getCaseIdFromRequest(request);
  const parsed = await parseJsonBody(request, houseCreateSchema);
  if ("error" in parsed) return parsed.error;
  const body = parsed.data;

  if (!body.url && !body.title) {
    return NextResponse.json(
      { error: "Falta el link del aviso o, para carga manual, el título" },
      { status: 400 }
    );
  }

  let lat: number | undefined;
  let lng: number | undefined;
  if (body.zone) {
    const coords = await geocodeZone(body.zone);
    if (coords) {
      lat = coords.lat;
      lng = coords.lng;
    }
  }

  const house = await addHouse(caseId, { ...body, lat, lng });

  // Si el nombre de quien agregó la casa no figura todavía en la lista
  // de personas del caso, sumarlo automáticamente para que quede
  // disponible en futuros comentarios y asignaciones.
  const author = body.addedBy;
  const kase = await getCase(caseId);
  if (kase && !kase.people.includes(author)) {
    await updatePeople(caseId, [...kase.people, author]);
  }

  // Si la propiedad fue agregada por el asesor/corredor, notificar a los clientes vía Web Push
  const broker = await getCurrentBroker();
  if (broker) {
    notifyCaseClients(caseId, {
      title: "Micaso · Nueva propiedad",
      body: `Tu asesor cargó: ${house.title || "Nueva propiedad"}`,
      url: "/caso/casas",
    }).catch(() => {});
  }

  return NextResponse.json({ house }, { status: 201 });
}
