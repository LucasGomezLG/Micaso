import { NextRequest, NextResponse } from "next/server";
import { deleteHouse, updateHouse } from "@/lib/store";

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/houses/[id]">
) {
  const { id } = await ctx.params;
  let patch: Record<string, unknown>;
  try {
    patch = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }
  const house = await updateHouse(id, patch);
  if (!house) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }
  return NextResponse.json({ house });
}

export async function DELETE(
  _request: NextRequest,
  ctx: RouteContext<"/api/houses/[id]">
) {
  const { id } = await ctx.params;
  await deleteHouse(id);
  return NextResponse.json({ ok: true });
}
