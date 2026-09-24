import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdminEmail } from "@/lib/brokers";
import { deleteCase, getCase, renameCase } from "@/lib/cases";
import { deleteCaseData } from "@/lib/store";
import { adminCaseRenameSchema, parseJsonBody } from "@/lib/schemas";

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/superadmin/cases/[id]">
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

  const parsed = await parseJsonBody(request, adminCaseRenameSchema);
  if ("error" in parsed) return parsed.error;

  const updated = await renameCase(id, kase.brokerId, parsed.data.titulo);
  return NextResponse.json({ case: updated });
}

/** Borrado definitivo — pensado para limpiar casos de prueba, no para el
 * uso normal del corredor (que solo tiene "cerrar caso"). Borra el caso
 * y, aparte, sus casas/checklist/criterios (lib/store.ts). */
export async function DELETE(
  _request: NextRequest,
  ctx: RouteContext<"/api/superadmin/cases/[id]">
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

  await deleteCase(id, kase.brokerId);
  await deleteCaseData(id, kase.brokerId);
  return NextResponse.json({ ok: true });
}
