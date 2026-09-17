import { NextResponse } from "next/server";
import { getCurrentAdminEmail } from "@/lib/brokers";
import { getCase, reopenCase } from "@/lib/cases";

export async function POST(
  _request: Request,
  ctx: RouteContext<"/api/superadmin/cases/[id]/reopen">
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
  if (kase.estado !== "solo_lectura") {
    return NextResponse.json({ error: "Este caso no está cerrado" }, { status: 400 });
  }

  try {
    const updated = await reopenCase(id, kase.brokerId);
    return NextResponse.json({ case: updated });
  } catch (err) {
    const message = err instanceof Error ? err.message : "No se pudo reabrir el caso.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
