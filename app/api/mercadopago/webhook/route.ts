import { NextResponse } from "next/server";
import crypto from "crypto";
import { updateBroker } from "@/lib/brokers";
import { getSubscription } from "@/lib/mercadopago";
import { Plan } from "@/lib/types";

const MP_WEBHOOK_SECRET = process.env.MP_WEBHOOK_SECRET;

// Mercado Pago envía eventos a esta URL
export async function POST(request: Request) {
  try {
    const rawBody = await request.text();
    const signatureHeader = request.headers.get("x-signature");
    const reqId = request.headers.get("x-request-id");

    // En desarrollo estricto, validamos la firma si el secret está configurado
    if (MP_WEBHOOK_SECRET && signatureHeader && reqId) {
      const parts = signatureHeader.split(",");
      let ts = "";
      let hash = "";

      for (const part of parts) {
        const [key, value] = part.split("=");
        if (key === "ts") ts = value;
        if (key === "v1") hash = value;
      }

      if (ts && hash) {
        const manifest = `id:${reqId};request-id:${reqId};ts:${ts};`;
        const hmac = crypto.createHmac("sha256", MP_WEBHOOK_SECRET);
        hmac.update(manifest);
        const computedHash = hmac.digest("hex");

        if (computedHash !== hash) {
          console.error("Firma de webhook inválida en Mercado Pago");
          return NextResponse.json({ error: "Invalid signature" }, { status: 403 });
        }
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
        } else if (status === "cancelled") {
          // Suscripción dada de baja
          await updateBroker(brokerId, {
            subscriptionStatus: "cancelada",
          });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error procesando webhook de MP:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
