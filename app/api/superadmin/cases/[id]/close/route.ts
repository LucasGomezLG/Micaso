import { NextResponse } from "next/server";
import { getCurrentAdminEmail } from "@/lib/brokers";
import { closeCase, getCase } from "@/lib/cases";

/** Moderación de super-admin sobre el caso de cualquier corredor — mismo
 * closeCase() que usa el corredor desde su panel, pasándole el brokerId
 * real del caso (getCaseForBroker adentro solo verifica que coincidan,
 * así que no hace falta una función nueva). Ver ARQUITECTURA.md sección
 * 7: control total, pero sin exponer contenido de los casos (houses,
 * comentarios) — esto solo cambia el estado del caso. */
export async function POST(
  _request: Request,
  ctx: RouteContext<"/api/superadmin/cases/[id]/close">
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
    return NextResponse.json({ error: "El caso ya está archivado" }, { status: 400 });
  }

  const updated = await closeCase(id, kase.brokerId);
  return NextResponse.json({ case: updated });
}
