import { NextRequest, NextResponse } from "next/server";
import { getCaseIdFromRequest } from "@/lib/session";
import { updatePeople } from "@/lib/cases";

export async function PATCH(request: NextRequest) {
  const caseId = getCaseIdFromRequest(request);

  let body: { people?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }
  if (!Array.isArray(body.people) || !body.people.every((p) => typeof p === "string")) {
    return NextResponse.json({ error: "Falta la lista de personas" }, { status: 400 });
  }

  const kase = await updatePeople(caseId, body.people);
  if (!kase) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
  return NextResponse.json({ case: kase });
}
