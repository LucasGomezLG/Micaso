import { NextResponse } from "next/server";
import { getCurrentBroker } from "@/lib/brokers";
import { markCaseSeenByBroker } from "@/lib/cases";

export async function POST(
  _request: Request,
  ctx: RouteContext<"/api/panel/cases/[id]/seen">
) {
  const { id } = await ctx.params;
  const broker = await getCurrentBroker();
  if (!broker) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
  const updated = await markCaseSeenByBroker(id, broker.id);
  if (!updated) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
  return NextResponse.json({ ok: true, case: updated });
}
