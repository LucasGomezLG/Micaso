import { NextResponse } from "next/server";
import { getCurrentBroker } from "@/lib/brokers";
import { getCase, regeneratePassword } from "@/lib/cases";

export async function POST(
  _request: Request,
  ctx: RouteContext<"/api/panel/cases/[id]/regenerate-password">
) {
  const { id } = await ctx.params;
  const [broker, kase] = await Promise.all([getCurrentBroker(), getCase(id)]);
  if (!kase || !broker || kase.brokerId !== broker.id) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
  if (kase.estado === "archivado") {
    return NextResponse.json({ error: "El caso está archivado" }, { status: 400 });
  }

  const updated = await regeneratePassword(id);
  return NextResponse.json({ case: updated });
}
