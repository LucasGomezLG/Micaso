import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdminEmail, updateBroker } from "@/lib/brokers";
import { deleteBrokerCascade } from "@/lib/brokerDeletion";
import { adminBrokerPatchSchema, parseJsonBody } from "@/lib/schemas";

/** Edición manual de plan/estado de cobro/prueba desde /superadmin — el
 * webhook de Mercado Pago (app/api/mercadopago/webhook/route.ts) ya
 * actualiza subscriptionStatus solo en altas/pausas/cancelaciones reales;
 * esto queda como override para soporte puntual (comps, correcciones,
 * corredores dados de alta a mano). Ver ARQUITECTURA.md sección 7. */
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
 * (con sus casas/checklist/criterios) y su suscripción en Mercado Pago —
 * misma cascada que "Eliminar mi cuenta", ver lib/brokerDeletion.ts.
 * Pensado para limpiar cuentas de prueba o dar de baja a pedido.
 * Irreversible a propósito. */
export async function DELETE(
  _request: NextRequest,
  ctx: RouteContext<"/api/superadmin/brokers/[id]">
) {
  const admin = await getCurrentAdminEmail();
  if (!admin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await ctx.params;
  if (!(await deleteBrokerCascade(id))) {
    return NextResponse.json({ error: "Corredor no encontrado" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
