import { NextRequest, NextResponse } from "next/server";
import { deleteHouseChecklistItem, updateHouseChecklistItem } from "@/lib/store";
import { getCaseIdFromRequest } from "@/lib/session";
import { houseChecklistItemPatchSchema, parseJsonBody } from "@/lib/schemas";

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/houses/[id]/checklist/[itemId]">
) {
  const caseId = getCaseIdFromRequest(request);
  const { id, itemId } = await ctx.params;
  const parsed = await parseJsonBody(request, houseChecklistItemPatchSchema);
  if ("error" in parsed) return parsed.error;
  const house = await updateHouseChecklistItem(caseId, id, itemId, parsed.data);
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
