import { NextResponse } from "next/server";
import crypto from "crypto";
import { addBrokerPayment, getBroker, updateBroker } from "@/lib/brokers";
import { downgradeCasesForInactiveBrokers } from "@/lib/cases";
import { cancelSubscription, getPayment, getSubscription } from "@/lib/mercadopago";
import { PaymentRecord, Plan } from "@/lib/types";

const MP_WEBHOOK_SECRET = process.env.MP_WEBHOOK_SECRET;

/** Cancela en Mercado Pago una suscripción que el corredor ya reemplazó.
 * cancelSubscription devuelve false (no tira) si Mercado Pago rechaza el
 * PUT — antes ese caso no dejaba ningún rastro. Si falla, se vuelve a
 * intentar con el próximo aviso de esa suscripción (ver
 * mpReplacedPreapprovalIds en lib/types.ts). */
async function cancelReplacedSubscription(oldId: string, brokerId: string, currentId: string | null): Promise<void> {
  const cancelled = await cancelSubscription(oldId).catch((err) => {
    console.error("Error cancelando una suscripción reemplazada:", err);
    return false;
  });
  if (!cancelled) {
    console.error(
      `No se pudo cancelar la suscripción reemplazada ${oldId} del corredor ${brokerId} (vigente: ${currentId}) — se reintenta con su próximo aviso; si sigue, revisarla a mano en Mercado Pago`
    );
  }
}

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
    if (!MP_WEBHOOK_SECRET) {
      console.error("FATAL: MP_WEBHOOK_SECRET no configurado");
      return NextResponse.json({ error: "Webhook signing secret missing" }, { status: 500 });
    }

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

    // La firma cubre el `data.id` del query string, no el del body — así
    // que ese es el único id que se procesa. Antes se tomaba el del body,
    // y un request firmado capturado se podía reusar con otro body
    // (SEP23-10, AUDITORIA-2026-09-23.md). Si el body trae un id distinto,
    // algo no cuadra: se rechaza en vez de elegir uno.
    const bodyId = body?.data?.id ?? body?.id;
    if (bodyId !== undefined && bodyId !== null && String(bodyId) !== dataIdParam) {
      console.error("Webhook de Mercado Pago con id del body distinto al firmado:", { dataIdParam, bodyId });
      return NextResponse.json({ error: "Resource id mismatch" }, { status: 400 });
    }
    const resourceId = dataIdParam;
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
        const broker = await getBroker(brokerId);
        // SEP23-01 (AUDITORIA-2026-09-23.md): pausas y bajas solo cuentan
        // si son de la suscripción VIGENTE del corredor. Cuando se
        // confirma una nueva, la vieja se cancela acá abajo, y Mercado
        // Pago avisa ese cambio con su propio webhook — sin este chequeo,
        // ese aviso marcaba `cancelada` (y pasaba sus casos a solo
        // lectura) a un corredor que acababa de pagar, mientras la nueva
        // le seguía cobrando. Con igualdad estricta, un checkout
        // abandonado que después vence tampoco toca a nadie.
        const isCurrentSubscription = broker?.mpPreapprovalId === resourceId;

        if (status === "authorized" && broker?.mpReplacedPreapprovalIds?.includes(resourceId)) {
          // Una suscripción que este corredor ya reemplazó por otra y que
          // sigue autorizada: su cancelación falló. Se reintenta, en vez de
          // volver a tomarla como vigente — si no, su próximo aviso (por
          // ejemplo, el cobro mensual) la ponía de nuevo como vigente y
          // cancelaba la que el corredor acababa de contratar.
          await cancelReplacedSubscription(resourceId, brokerId, broker.mpPreapprovalId);
        } else if (status === "authorized") {
          // CON-03: si el corredor ya tenía otra suscripción activa (cambio
          // de plan, o un checkout repetido), recién ACÁ es seguro
          // cancelarla — no antes de crear el checkout nuevo, porque si
          // ese checkout nuevo nunca se confirma, el corredor se quedaría
          // sin ninguna suscripción activa. Cancelar solo cuando la nueva
          // ya está confirmada evita el doble cobro sin ese riesgo.
          const previousPreapprovalId = broker?.mpPreapprovalId;
          const replacesAnother = !!previousPreapprovalId && previousPreapprovalId !== resourceId;
          // Primero guardar la nueva como vigente y recién después
          // cancelar la vieja (SEP23-01): al revés, si el aviso de la
          // vieja cancelada entraba en el medio, todavía figuraba como
          // vigente y pasaba el chequeo de arriba. La vieja queda anotada
          // como reemplazada (ver la rama de arriba).
          await updateBroker(brokerId, {
            subscriptionStatus: "activa",
            mpPreapprovalId: resourceId,
            plan: (planKey as Plan) || "para_arrancar",
            ...(replacesAnother && {
              mpReplacedPreapprovalIds: [
                ...(broker?.mpReplacedPreapprovalIds ?? []).filter((id) => id !== previousPreapprovalId),
                previousPreapprovalId,
              ].slice(-10),
            }),
          });
          if (replacesAnother) {
            await cancelReplacedSubscription(previousPreapprovalId, brokerId, resourceId);
          }
        } else if (status === "paused" && isCurrentSubscription) {
          // Cobro fallido / Tarjeta vencida / Fondos insuficientes
          await updateBroker(brokerId, {
            subscriptionStatus: "atrasada",
          });
          await downgradeCasesForInactiveBrokers(brokerId);
        } else if (status === "cancelled" && isCurrentSubscription) {
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
