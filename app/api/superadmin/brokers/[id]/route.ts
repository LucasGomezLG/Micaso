import { NextRequest, NextResponse } from "next/server";
import { deleteBroker, getBroker, getCurrentAdminEmail, updateBroker } from "@/lib/brokers";
import { deleteBrokerCaseIndex, deleteCase, listCasesForBroker } from "@/lib/cases";
import { deleteCaseData } from "@/lib/store";
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
  let body: { plan?: string; subscriptionStatus?: string; trialEndsAt?: string; nombreMarca?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  const patch: Partial<{ plan: Plan; subscriptionStatus: SubscriptionStatus; trialEndsAt: string; nombreMarca: string }> = {};
  if (body.nombreMarca !== undefined) {
    if (typeof body.nombreMarca !== "string" || !body.nombreMarca.trim()) {
      return NextResponse.json({ error: "Falta el nombre" }, { status: 400 });
    }
    patch.nombreMarca = body.nombreMarca.trim();
  }
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
