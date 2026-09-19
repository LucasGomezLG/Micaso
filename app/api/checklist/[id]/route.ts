import { NextRequest, NextResponse } from "next/server";
import { deleteChecklistItem, updateChecklistItem } from "@/lib/store";
import { getCaseIdFromRequest } from "@/lib/session";
import { checklistItemPatchSchema, parseJsonBody } from "@/lib/schemas";

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/checklist/[id]">
) {
  const caseId = getCaseIdFromRequest(request);
  const { id } = await ctx.params;
  const parsed = await parseJsonBody(request, checklistItemPatchSchema);
  if ("error" in parsed) return parsed.error;
  const item = await updateChecklistItem(caseId, id, parsed.data);
  if (!item) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
  return NextResponse.json({ item });
}

export async function DELETE(
  request: NextRequest,
  ctx: RouteContext<"/api/checklist/[id]">
) {
  const caseId = getCaseIdFromRequest(request);
  const { id } = await ctx.params;
  const deleted = await deleteChecklistItem(caseId, id);
  if (!deleted) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
  return NextResponse.json({ ok: true });
}
