import { NextResponse } from "next/server";
import { getCurrentBroker, updateBroker } from "@/lib/brokers";
import { downgradeCasesForInactiveBrokers } from "@/lib/cases";
import { cancelSubscription, createSubscriptionCheckout } from "@/lib/mercadopago";
import { parseJsonBody, subscriptionCreateSchema } from "@/lib/schemas";

export async function POST(request: Request) {
  const broker = await getCurrentBroker();
  if (!broker) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const parsed = await parseJsonBody(request, subscriptionCreateSchema);
  if ("error" in parsed) return parsed.error;
  const { plan } = parsed.data;

  try {
    // Si ya tenía una suscripción activa (cambio de plan, o reintento de
    // checkout sin haber cancelado antes), cancelarla primero — si no,
    // Mercado Pago termina cobrando las dos por separado cada mes. Un
    // error al cancelar en MP no debería trabar el flujo (mejor dejar
    // pasar a que el corredor pueda suscribirse igual y resolver el
    // duplicado a mano después, que dejarlo sin poder pagar nunca).
    // NOTA LEGAL (CON-03): Cancelación preventiva suspendida. Conservar
    // la suscripción anterior y cancelarla solo en el webhook al confirmar.

    const { url } = request;
    const origin = new URL(url).origin;
    // Mercado Pago requiere una URL HTTPS válida para el back_url de suscripciones
    const safeOrigin = origin.includes("localhost") ? "https://www.micaso.com.ar" : origin;
    const backUrl = `${safeOrigin}/panel/plan?payment=success`;

    const { initPoint } = await createSubscriptionCheckout({
      brokerId: broker.id,
      email: broker.email,
      plan,
      backUrl,
    });

    return NextResponse.json({ initPoint });
  } catch (err) {
    console.error("Error creating subscription:", err);
    return NextResponse.json(
      { error: "Error al generar la suscripción" },
      { status: 500 }
    );
  }
}

export async function DELETE() {
  const broker = await getCurrentBroker();
  if (!broker) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (!broker.mpPreapprovalId || broker.subscriptionStatus !== "activa") {
    return NextResponse.json(
      { error: "No tienes una suscripción activa para cancelar" },
      { status: 400 }
    );
  }

  try {
    const success = await cancelSubscription(broker.mpPreapprovalId);
    if (!success) {
      throw new Error("Mercado Pago returned an error on cancel");
    }

    // Actualizamos localmente el estado del broker
    await updateBroker(broker.id, {
      subscriptionStatus: "cancelada",
    });
    await downgradeCasesForInactiveBrokers(broker.id);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error cancelling subscription:", err);
    return NextResponse.json(
      { error: "Error al cancelar la suscripción" },
      { status: 500 }
    );
  }
}
