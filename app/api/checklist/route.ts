import { NextRequest, NextResponse } from "next/server";
import { addChecklistItem } from "@/lib/store";
import { getCaseIdFromRequest } from "@/lib/session";

export async function POST(request: NextRequest) {
  const caseId = getCaseIdFromRequest(request);
  let body: { group?: string; label?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }
  const group = body.group?.trim();
  const label = body.label?.trim();
  if (!group || !label) {
    return NextResponse.json({ error: "Falta la categoría o la tarea" }, { status: 400 });
  }
  const item = await addChecklistItem(caseId, group, label);
  return NextResponse.json({ item }, { status: 201 });
}
