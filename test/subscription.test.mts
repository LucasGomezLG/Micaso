// Cubre el fix de CON-03 (ver ARQUITECTURA.md sección 9, addendum del 20
// sept 2026): cambiar de plan no debe dejar dos suscripciones activas en
// Mercado Pago cobrando en paralelo. La cancelación preventiva se sacó
// de app/api/panel/subscription/route.ts — la suscripción vieja se
// cancela ahora recién en el webhook, cuando la nueva ya está
// confirmada (`status: "authorized"`), nunca antes. Mockea `fetch` en
// vez de pegarle a la API real de Mercado Pago — mismo motivo que el
// resto de los tests no habla con servicios externos de verdad.
import { test, after, before } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import crypto from "node:crypto";

const dbDir = mkdtempSync(join(tmpdir(), "micaso-test-subscription-"));
process.env.MICASO_LOCAL_DB_PATH = join(dbDir, "store.json");
process.env.MP_ACCESS_TOKEN = "test-access-token";
process.env.MP_WEBHOOK_SECRET = "test-webhook-secret";

const { getOrCreateBroker, getBroker } = await import("../lib/brokers");
const { POST } = await import("../app/api/mercadopago/webhook/route");

after(() => rmSync(dbDir, { recursive: true, force: true }));

const originalFetch = globalThis.fetch;
let cancelledIds: string[] = [];
let mockPreapproval: { status: string; external_reference: string } | null = null;

before(() => {
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
    const href = url.toString();
    if (href.includes("/preapproval/") && (!init?.method || init.method === "GET")) {
      return new Response(JSON.stringify(mockPreapproval), { status: 200 });
    }
    if (href.includes("/preapproval/") && init?.method === "PUT") {
      const id = href.split("/preapproval/")[1];
      cancelledIds.push(id);
      return new Response(JSON.stringify({ status: "cancelled" }), { status: 200 });
    }
    throw new Error(`fetch no mockeado: ${init?.method ?? "GET"} ${href}`);
  }) as typeof fetch;
});

after(() => {
  globalThis.fetch = originalFetch;
});

function signedWebhookRequest(resourceId: string): Request {
  const ts = Date.now().toString();
  const reqId = "req-" + resourceId;
  const manifest = `id:${resourceId};request-id:${reqId};ts:${ts};`;
  const hash = crypto.createHmac("sha256", process.env.MP_WEBHOOK_SECRET!).update(manifest).digest("hex");

  return new Request(`https://www.micaso.com.ar/api/mercadopago/webhook?topic=preapproval&data.id=${resourceId}`, {
    method: "POST",
    headers: {
      "x-signature": `ts=${ts},v1=${hash}`,
      "x-request-id": reqId,
    },
    body: JSON.stringify({ data: { id: resourceId } }),
  });
}

test("webhook: al confirmar una suscripción nueva, cancela la vieja del mismo corredor (CON-03)", async () => {
  const broker = await getOrCreateBroker("cambia-plan@example.com", "Corredor que cambia de plan", null);
  await (await import("../lib/brokers")).updateBroker(broker.id, {
    subscriptionStatus: "activa",
    mpPreapprovalId: "old-sub-111",
  });

  cancelledIds = [];
  mockPreapproval = { status: "authorized", external_reference: `${broker.id}:para_tu_cartera` };

  const res = await POST(signedWebhookRequest("new-sub-222"));
  assert.equal(res.status, 200);

  assert.deepEqual(cancelledIds, ["old-sub-111"], "la suscripción vieja tiene que cancelarse en Mercado Pago");

  const updated = await getBroker(broker.id);
  assert.equal(updated!.mpPreapprovalId, "new-sub-222");
  assert.equal(updated!.subscriptionStatus, "activa");
  assert.equal(updated!.plan, "para_tu_cartera");
});

test("webhook: primera suscripción de un corredor (sin mpPreapprovalId previo) no intenta cancelar nada", async () => {
  const broker = await getOrCreateBroker("primera-vez@example.com", "Corredor nuevo", null);

  cancelledIds = [];
  mockPreapproval = { status: "authorized", external_reference: `${broker.id}:para_arrancar` };

  const res = await POST(signedWebhookRequest("sub-333"));
  assert.equal(res.status, 200);

  assert.deepEqual(cancelledIds, [], "no había suscripción previa — no debería llamarse a cancelar nada");

  const updated = await getBroker(broker.id);
  assert.equal(updated!.mpPreapprovalId, "sub-333");
});

test("webhook: un evento repetido para la MISMA suscripción no se cancela a sí misma", async () => {
  const broker = await getOrCreateBroker("evento-repetido@example.com", "Corredor con reintento de webhook", null);
  await (await import("../lib/brokers")).updateBroker(broker.id, {
    subscriptionStatus: "activa",
    mpPreapprovalId: "sub-444",
  });

  cancelledIds = [];
  mockPreapproval = { status: "authorized", external_reference: `${broker.id}:para_arrancar` };

  const res = await POST(signedWebhookRequest("sub-444"));
  assert.equal(res.status, 200);

  assert.deepEqual(cancelledIds, [], "el mismo id de suscripción no debe cancelarse a sí mismo");
});
