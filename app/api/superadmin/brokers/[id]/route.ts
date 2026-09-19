import { NextRequest, NextResponse } from "next/server";
import { deleteBroker, getBroker, getCurrentAdminEmail, updateBroker } from "@/lib/brokers";
import { deleteBrokerCaseIndex, deleteCase, listCasesForBroker } from "@/lib/cases";
import { deleteCaseData } from "@/lib/store";
import { adminBrokerPatchSchema, parseJsonBody } from "@/lib/schemas";

/** Edición manual de plan/estado de cobro/prueba desde /superadmin — a
 * falta de Mercado Pago conectado (ver ARQUITECTURA.md sección 7). */
export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/superadmin/brokers/[id]">
) {
  const admin = await getCurrentAdminEmail();
  if (!admin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const parsed = await parseJsonBody(request, adminBrokerPatchSchema);
  if ("error" in parsed) return parsed.error;

  const updated = await updateBroker(id, parsed.data);
  if (!updated) {
    return NextResponse.json({ error: "Corredor no encontrado" }, { status: 404 });
  }
  return NextResponse.json({ broker: updated });
}

/** Borrado definitivo de un corredor y, en cascada, de TODOS sus casos
 * (con sus casas/checklist/criterios) — pensado para limpiar cuentas de
 * prueba, no algo que un corredor pueda hacerse a sí mismo. Irreversible
 * a propósito. */
export async function DELETE(
  _request: NextRequest,
  ctx: RouteContext<"/api/superadmin/brokers/[id]">
) {
  const admin = await getCurrentAdminEmail();
  if (!admin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const broker = await getBroker(id);
  if (!broker) {
    return NextResponse.json({ error: "Corredor no encontrado" }, { status: 404 });
  }

  const cases = await listCasesForBroker(id);
  for (const kase of cases) {
    await deleteCase(kase.id, id);
    await deleteCaseData(kase.id);
  }
  await deleteBrokerCaseIndex(id);
  await deleteBroker(id);

  return NextResponse.json({ ok: true });
}
