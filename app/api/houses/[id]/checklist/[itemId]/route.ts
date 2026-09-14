import { NextRequest, NextResponse } from "next/server";
import { deleteHouseChecklistItem, updateHouseChecklistItem } from "@/lib/store";
import { getCaseIdFromRequest } from "@/lib/session";

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/houses/[id]/checklist/[itemId]">
) {
  const caseId = getCaseIdFromRequest(request);
  const { id, itemId } = await ctx.params;
  let patch: Record<string, unknown>;
  try {
    patch = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }
  const house = await updateHouseChecklistItem(caseId, id, itemId, patch);
  if (!house) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }
  return NextResponse.json({ house });
}

export async function DELETE(
  request: NextRequest,
  ctx: RouteContext<"/api/houses/[id]/checklist/[itemId]">
) {
  const caseId = getCaseIdFromRequest(request);
  const { id, itemId } = await ctx.params;
  const house = await deleteHouseChecklistItem(caseId, id, itemId);
  if (!house) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }
  return NextResponse.json({ house });
}
