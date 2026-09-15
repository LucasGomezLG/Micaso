import { NextRequest, NextResponse } from "next/server";
import { getCurrentBroker } from "@/lib/brokers";
import { getCaseForBroker, renameCase } from "@/lib/cases";

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/panel/cases/[id]">
) {
  const { id } = await ctx.params;
  const broker = await getCurrentBroker();
  if (!broker) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
  const kase = await getCaseForBroker(id, broker.id);
  if (!kase) {
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

  const updated = await renameCase(id, broker.id, titulo);
  return NextResponse.json({ case: updated });
}
