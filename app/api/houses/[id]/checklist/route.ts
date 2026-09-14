import { NextRequest, NextResponse } from "next/server";
import { addHouseChecklistItem } from "@/lib/store";

export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/api/houses/[id]/checklist">
) {
  const { id } = await ctx.params;
  let body: { text?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }
  const text = body.text?.trim();
  if (!text) {
    return NextResponse.json({ error: "Falta el campo obligatorio: text" }, { status: 400 });
  }
  const house = await addHouseChecklistItem(id, text);
  if (!house) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }
  return NextResponse.json({ house });
}
