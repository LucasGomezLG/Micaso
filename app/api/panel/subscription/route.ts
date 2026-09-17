import { NextResponse } from "next/server";
import { getCurrentBroker, updateBroker } from "@/lib/brokers";
import { cancelSubscription, createSubscriptionCheckout } from "@/lib/mercadopago";
import { Plan } from "@/lib/types";

export async function POST(request: Request) {
  const broker = await getCurrentBroker();
  if (!broker) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const { plan } = await request.json();

    if (plan !== "para_arrancar" && plan !== "para_tu_cartera") {
      return NextResponse.json({ error: "Plan inválido" }, { status: 400 });
    }

    const { url } = request;
    const origin = new URL(url).origin;
    // Mercado Pago requiere una URL HTTPS válida para el back_url de suscripciones
    const safeOrigin = origin.includes("localhost") ? "https://www.micaso.com.ar" : origin;
    const backUrl = `${safeOrigin}/panel/plan?payment=success`;

    const { id, initPoint } = await createSubscriptionCheckout({
      brokerId: broker.id,
      email: broker.email,
      plan: plan as "para_arrancar" | "para_tu_cartera",
      backUrl,
    });

    return NextResponse.json({ initPoint });
  } catch (err: any) {
    console.error("Error creating subscription:", err);
    return NextResponse.json(
      { error: "Error al generar la suscripción" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
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

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Error cancelling subscription:", err);
    return NextResponse.json(
      { error: "Error al cancelar la suscripción" },
      { status: 500 }
    );
  }
}
