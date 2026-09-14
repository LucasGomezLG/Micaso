import { NextRequest, NextResponse } from "next/server";
import { addHouse, getHouses } from "@/lib/store";
import { House } from "@/lib/types";
import { getCaseIdFromRequest } from "@/lib/session";
import { getCase, updatePeople } from "@/lib/cases";

export async function GET(request: NextRequest) {
  const caseId = getCaseIdFromRequest(request);
  const houses = await getHouses(caseId);
  return NextResponse.json({ houses });
}

export async function POST(request: NextRequest) {
  const caseId = getCaseIdFromRequest(request);
  let body: Partial<House>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }
  if (!body?.url || !body?.addedBy?.trim()) {
    return NextResponse.json(
      { error: "Faltan campos obligatorios: url, addedBy" },
      { status: 400 }
    );
  }
  const house = await addHouse(caseId, body as Pick<House, "url" | "addedBy"> & Partial<House>);

  // Si el nombre de quien agregó la casa no figura todavía en la lista
  // de personas del caso, sumarlo automáticamente para que quede
  // disponible en futuros comentarios y asignaciones.
  const author = body.addedBy.trim();
  const kase = await getCase(caseId);
  if (kase && !kase.people.includes(author)) {
    await updatePeople(caseId, [...kase.people, author]);
  }

  return NextResponse.json({ house }, { status: 201 });
}
