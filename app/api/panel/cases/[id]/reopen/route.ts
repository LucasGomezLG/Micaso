import { NextResponse } from "next/server";
import { getCurrentBroker } from "@/lib/brokers";
import { getCaseForBroker, reopenCase } from "@/lib/cases";

export async function POST(
  _request: Request,
  ctx: RouteContext<"/api/panel/cases/[id]/reopen">
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
  if (kase.estado !== "solo_lectura") {
    return NextResponse.json({ error: "Este caso no está cerrado" }, { status: 400 });
  }

  try {
    const updated = await reopenCase(id, broker.id);
    return NextResponse.json({ case: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "No se pudo reabrir el caso.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
