import { Plan } from "./types";

const MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN;

export const MP_PLAN_PRICES: Record<"para_arrancar" | "para_tu_cartera", number> = {
  para_arrancar: 18000,
  para_tu_cartera: 39000,
};

export interface SubscriptionCheckoutParams {
  brokerId: string;
  email: string;
  plan: "para_arrancar" | "para_tu_cartera";
  backUrl: string;
}

export async function createSubscriptionCheckout({
  brokerId,
  email,
  plan,
  backUrl,
}: SubscriptionCheckoutParams): Promise<{ id: string; initPoint: string }> {
  if (!MP_ACCESS_TOKEN) {
    throw new Error("MP_ACCESS_TOKEN is not configured");
  }

    const payload: any = {
      reason: `Micaso — Plan ${plan === "para_arrancar" ? "Para arrancar" : "Para tu cartera"}`,
      auto_recurring: {
        frequency: 1,
        frequency_type: "months",
        transaction_amount: MP_PLAN_PRICES[plan],
        currency_id: "ARS",
      },
      back_url: backUrl,
      external_reference: `${brokerId}:${plan}`,
    };
    
    if (email) {
      payload.payer_email = email;
    }

    console.log("PAYLOAD A MERCADO PAGO:", payload);

  const res = await fetch("https://api.mercadopago.com/preapproval", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("MP create preapproval error:", errorText);
    throw new Error(`Failed to create Mercado Pago subscription: ${res.status}`);
  }

  const data = await res.json();
  return {
    id: data.id,
    initPoint: data.init_point,
  };
}

export async function getSubscription(preapprovalId: string): Promise<any> {
  if (!MP_ACCESS_TOKEN) return null;

  const res = await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
    headers: {
      Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
    },
  });

  if (!res.ok) {
    return null;
  }

  return res.json();
}

export async function cancelSubscription(preapprovalId: string): Promise<boolean> {
  if (!MP_ACCESS_TOKEN) return false;

  const res = await fetch(`https://api.mercadopago.com/preapproval/${preapprovalId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ status: "cancelled" }),
  });

  return res.ok;
}
