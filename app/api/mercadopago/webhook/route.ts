import { NextResponse } from "next/server";
import crypto from "crypto";
import { addBrokerPayment, updateBroker } from "@/lib/brokers";
import { downgradeCasesForInactiveBrokers } from "@/lib/cases";
import { getPayment, getSubscription } from "@/lib/mercadopago";
import { PaymentRecord, Plan } from "@/lib/types";

const MP_WEBHOOK_SECRET = process.env.MP_WEBHOOK_SECRET;

// Mercado Pago envía eventos a esta URL
export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signatureHeader = request.headers.get("x-signature");
    const reqId = request.headers.get("x-request-id");
    const dataIdParam = new URL(request.url).searchParams.get("data.id");

    // Si el secret está configurado, la firma es obligatoria — antes,
    // si el llamador simplemente no mandaba los headers de firma, la
    // validación entera se saltaba (la condición de abajo era `if
    // (secret && header && reqId)`, false con headers ausentes). El
    // manifest también estaba mal armado: usaba x-request-id en vez del
    // id real del recurso (`data.id`, el que exige la spec de MP) — con
    // esto puesto así, la firma de un webhook legítimo de Mercado Pago
    // nunca iba a coincidir el día que MP_WEBHOOK_SECRET se configurara
    // en producción.
    if (MP_WEBHOOK_SECRET) {
      if (!signatureHeader || !reqId) {
        console.error("Webhook de Mercado Pago sin headers de firma");
        return NextResponse.json({ error: "Missing signature headers" }, { status: 401 });
      }

      let ts = "";
      let hash = "";
      for (const part of signatureHeader.split(",")) {
        const [key, value] = part.split("=");
        if (key === "ts") ts = value;
        if (key === "v1") hash = value;
      }

      if (!ts || !hash) {
        return NextResponse.json({ error: "Malformed x-signature" }, { status: 401 });
      }

      const manifest = `id:${dataIdParam ?? ""};request-id:${reqId};ts:${ts};`;
      const hmac = crypto.createHmac("sha256", MP_WEBHOOK_SECRET);
      hmac.update(manifest);
      const computedHash = hmac.digest("hex");

      const hashBuf = Buffer.from(hash, "utf8");
      const compBuf = Buffer.from(computedHash, "utf8");
      if (hashBuf.length !== compBuf.length || !crypto.timingSafeEqual(hashBuf, compBuf)) {
        console.error("Firma de webhook inválida en Mercado Pago");
        return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
      }
    }

    // Parsea el evento
    const body = JSON.parse(rawBody);

    // El id del recurso viene en body.data.id o en body.id según la versión del webhook
    const resourceId = body?.data?.id || body?.id;
    const type = body?.type || body?.action; // type="subscription_preapproval"
    const topic = new URL(request.url).searchParams.get("topic") || type;

    // Solo procesamos eventos de suscripciones por el momento
    if (topic === "subscription_preapproval" || topic === "preapproval") {
      if (!resourceId) return NextResponse.json({ success: true });

      // Consultamos la fuente de la verdad (API de Mercado Pago) para obtener el estado real
      const preapproval = await getSubscription(resourceId);
      
      if (!preapproval) {
        console.error("Suscripción no encontrada en MP:", resourceId);
        return NextResponse.json({ error: "Suscripción no encontrada" }, { status: 404 });
      }

      const status = preapproval.status;
      const externalReference = preapproval.external_reference; // Ej: "dev-broker:para_arrancar"

      if (externalReference) {
        const [brokerId, planKey] = externalReference.split(":");
        
        if (status === "authorized") {
          await updateBroker(brokerId, {
            subscriptionStatus: "activa",
            mpPreapprovalId: resourceId,
            plan: (planKey as Plan) || "para_arrancar",
          });
        } else if (status === "paused") {
          // Cobro fallido / Tarjeta vencida / Fondos insuficientes
          await updateBroker(brokerId, {
            subscriptionStatus: "atrasada",
          });
          await downgradeCasesForInactiveBrokers(brokerId);
        } else if (status === "cancelled") {
          // Suscripción dada de baja
          await updateBroker(brokerId, {
            subscriptionStatus: "cancelada",
          });
          await downgradeCasesForInactiveBrokers(brokerId);
        }
      }
    } else if (topic === "payment") {
      if (!resourceId) return NextResponse.json({ success: true });

      const payment = await getPayment(resourceId);
      if (!payment) {
        console.error("Pago no encontrado en MP:", resourceId);
        return NextResponse.json({ error: "Pago no encontrado" }, { status: 404 });
      }

      // Si el pago pertenece a una preaprobación de Micaso, guardarlo
      const externalReference = payment.external_reference;
      if (externalReference && externalReference.includes(":")) {
        const [brokerId] = externalReference.split(":");
        
        const record: PaymentRecord = {
          id: payment.id.toString(),
          amount: payment.transaction_amount,
          currency: payment.currency_id,
          status: payment.status,
          date: payment.date_created,
        };
        
        await addBrokerPayment(brokerId, record);
      }
    }


    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error procesando webhook de MP:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
