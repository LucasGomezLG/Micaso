import { NextRequest, NextResponse } from "next/server";
import { deleteHouse, updateHouse } from "@/lib/store";
import { getCaseIdFromRequest } from "@/lib/session";

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
  const house = await updateHouse(caseId, id, patch);
  if (!house) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
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
