import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdminEmail, updateBroker } from "@/lib/brokers";
import { Plan, SubscriptionStatus } from "@/lib/types";

const VALID_PLANS: Plan[] = ["para_arrancar", "para_tu_cartera", "volumen_alto"];
const VALID_STATUSES: SubscriptionStatus[] = ["prueba", "activa", "atrasada", "cancelada"];

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
  let body: { plan?: string; subscriptionStatus?: string; trialEndsAt?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  const patch: Partial<{ plan: Plan; subscriptionStatus: SubscriptionStatus; trialEndsAt: string }> = {};
  if (body.plan !== undefined) {
    if (!VALID_PLANS.includes(body.plan as Plan)) {
      return NextResponse.json({ error: "Plan inválido" }, { status: 400 });
    }
    patch.plan = body.plan as Plan;
  }
  if (body.subscriptionStatus !== undefined) {
    if (!VALID_STATUSES.includes(body.subscriptionStatus as SubscriptionStatus)) {
      return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
    }
    patch.subscriptionStatus = body.subscriptionStatus as SubscriptionStatus;
  }
  if (body.trialEndsAt !== undefined) {
    if (Number.isNaN(Date.parse(body.trialEndsAt))) {
      return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
    }
    patch.trialEndsAt = body.trialEndsAt;
  }

  const updated = await updateBroker(id, patch);
  if (!updated) {
    return NextResponse.json({ error: "Corredor no encontrado" }, { status: 404 });
  }
  return NextResponse.json({ broker: updated });
}
