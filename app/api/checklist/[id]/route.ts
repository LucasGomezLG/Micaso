import { NextRequest, NextResponse } from "next/server";
import { deleteChecklistItem, updateChecklistItem } from "@/lib/store";
import { getCaseIdFromRequest } from "@/lib/session";

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/checklist/[id]">
) {
  const caseId = getCaseIdFromRequest(request);
  const { id } = await ctx.params;
  let patch: Record<string, unknown>;
  try {
    patch = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }
  const item = await updateChecklistItem(caseId, id, patch);
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
