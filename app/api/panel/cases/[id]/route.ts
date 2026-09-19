import { NextRequest, NextResponse } from "next/server";
import { getCurrentBroker } from "@/lib/brokers";
import { getCaseForBroker, renameCase } from "@/lib/cases";
import { caseRenameSchema, parseJsonBody } from "@/lib/schemas";

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

  const parsed = await parseJsonBody(request, caseRenameSchema);
  if ("error" in parsed) return parsed.error;

  const updated = await renameCase(id, broker.id, parsed.data.titulo);
  return NextResponse.json({ case: updated });
}
