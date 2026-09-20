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

  // CON-03: la pantalla de /panel/plan ya no muestra este botón si
  // subscriptionStatus es "activa", pero esa es una restricción de UI,
  // no de la API — sin este chequeo, pegarle directo a esta ruta creaba
  // una segunda suscripción sin cancelar la primera, y Mercado Pago
  // termina cobrando las dos. La suscripción vieja se cancela en el
  // webhook recién cuando la nueva se confirma (ver app/api/mercadopago/
  // webhook/route.ts), nunca antes de eso — si se cancelara antes de
  // crear el checkout nuevo, un corredor que abandona el checkout
  // quedaría sin ninguna suscripción activa.
  if (broker.mpPreapprovalId && broker.subscriptionStatus === "activa") {
    return NextResponse.json(
      { error: "Ya tenés una suscripción activa. Cancelala antes de generar una nueva." },
      { status: 400 }
    );
  }

  try {
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
