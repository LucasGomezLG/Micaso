import { NextRequest, NextResponse } from "next/server";
import { updateChecklistItem } from "@/lib/store";

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/checklist/[id]">
) {
  const { id } = await ctx.params;
  let patch: Record<string, unknown>;
  try {
    patch = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }
  const item = await updateChecklistItem(id, patch);
  if (!item) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
  return NextResponse.json({ item });
}
