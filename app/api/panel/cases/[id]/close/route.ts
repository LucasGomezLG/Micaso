import { NextResponse } from "next/server";
import { getCurrentBroker } from "@/lib/brokers";
import { closeCase, getCaseForBroker } from "@/lib/cases";

export async function POST(
  _request: Request,
  ctx: RouteContext<"/api/panel/cases/[id]/close">
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
  if (kase.estado === "archivado") {
    return NextResponse.json({ error: "El caso ya está archivado" }, { status: 400 });
  }

  const updated = await closeCase(id, broker.id);
  return NextResponse.json({ case: updated });
}
