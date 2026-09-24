import { NextResponse } from "next/server";
import { getCurrentBroker } from "@/lib/brokers";
import { getCaseForBroker, regeneratePassword } from "@/lib/cases";
import { createMagicLinkToken } from "@/lib/sessionToken";

export async function POST(
  _request: Request,
  ctx: RouteContext<"/api/panel/cases/[id]/regenerate-password">
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
    return NextResponse.json({ error: "El caso está archivado" }, { status: 400 });
  }

  const updated = await regeneratePassword(id, broker.id);
  if (!updated) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
  // Link nuevo, emitido después de la rotación: el que tenía el panel
  // quedó revocado (SEP23-04), y sin magicLinkToken el botón Compartir/
  // Copiar del CaseRow no tiene qué mandar (buildCaseShareMessage).
  return NextResponse.json({ case: { ...updated, magicLinkToken: createMagicLinkToken(id) } });
}
