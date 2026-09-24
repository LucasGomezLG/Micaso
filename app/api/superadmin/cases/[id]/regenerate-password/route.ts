import { NextResponse } from "next/server";
import { getCurrentAdminEmail } from "@/lib/brokers";
import { getCase, regeneratePassword } from "@/lib/cases";

export async function POST(
  _request: Request,
  ctx: RouteContext<"/api/superadmin/cases/[id]/regenerate-password">
) {
  const admin = await getCurrentAdminEmail();
  if (!admin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const kase = await getCase(id);
  if (!kase) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
  if (kase.estado === "archivado") {
    return NextResponse.json({ error: "El caso está archivado" }, { status: 400 });
  }

  const updated = await regeneratePassword(id, kase.brokerId);
  if (!updated) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
  // Sin la clave nueva: /superadmin la muestra solo a pedido, vía
  // reveal-password (SEP23-09, AUDITORIA-2026-09-23.md).
  return NextResponse.json({ case: { ...updated, password: "" } });
}
