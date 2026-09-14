import { NextRequest, NextResponse } from "next/server";
import { getCurrentBroker } from "@/lib/brokers";
import { getCase, renameCase } from "@/lib/cases";

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/panel/cases/[id]">
) {
  const { id } = await ctx.params;
  const [broker, kase] = await Promise.all([getCurrentBroker(), getCase(id)]);
  if (!kase || !broker || kase.brokerId !== broker.id) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  let body: { titulo?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }
  const titulo = body.titulo?.trim();
  if (!titulo) {
    return NextResponse.json({ error: "Falta el título" }, { status: 400 });
  }

  const updated = await renameCase(id, titulo);
  return NextResponse.json({ case: updated });
}
