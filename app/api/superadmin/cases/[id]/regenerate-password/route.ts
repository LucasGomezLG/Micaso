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
  return NextResponse.json({ case: updated });
}
