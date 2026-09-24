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
process.env.CASE_SECRET_KEY ??= crypto.randomBytes(32).toString("base64");

const { getOrCreateBroker, getBroker, updateBroker } = await import("../lib/brokers");
const { createCase, getCase } = await import("../lib/cases");
const { POST } = await import("../app/api/mercadopago/webhook/route");

after(() => rmSync(dbDir, { recursive: true, force: true }));

type MockPreapproval = { status: string; external_reference: string };

const originalFetch = globalThis.fetch;
let cancelledIds: string[] = [];
let mockPreapproval: MockPreapproval | null = null;
// Estado propio por id, para los tests donde conviven dos suscripciones
// del mismo corredor (SEP23-01): el PUT de cancelación lo cambia de
// verdad, así el webhook siguiente de esa suscripción la lee cancelada.
// Los ids que no están acá caen en `mockPreapproval`.
let preapprovalsById: Record<string, MockPreapproval> = {};
// Para simular que el aviso de Mercado Pago de la suscripción cancelada
// llega mientras nuestro PUT todavía no terminó.
let onCancel: ((id: string) => Promise<void>) | null = null;
// Ids cuya cancelación Mercado Pago rechaza (500) — la suscripción sigue
// autorizada.
const failCancelFor = new Set<string>();

before(() => {
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
    const href = url.toString();
    const id = href.split("/preapproval/")[1];
    if (href.includes("/preapproval/") && (!init?.method || init.method === "GET")) {
      return new Response(JSON.stringify(preapprovalsById[id] ?? mockPreapproval), { status: 200 });
    }
    if (href.includes("/preapproval/") && init?.method === "PUT") {
      cancelledIds.push(id);
      if (failCancelFor.has(id)) return new Response("error", { status: 500 });
      if (preapprovalsById[id]) preapprovalsById[id] = { ...preapprovalsById[id], status: "cancelled" };
      if (onCancel) await onCancel(id);
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

test("SEP23-01: el aviso de la suscripción vieja (cancelada por nosotros) no cancela al corredor que acaba de pagar", async () => {
  const broker = await getOrCreateBroker("vuelve-a-pagar@example.com", "Corredor que vuelve a pagar", null);
  await updateBroker(broker.id, { subscriptionStatus: "activa" });
  await createCase(broker.id, "Familia", "compra");
  preapprovalsById = {};

  // A autorizada, después pausada por un cobro fallido → corredor atrasado
  preapprovalsById["sub-A"] = { status: "authorized", external_reference: `${broker.id}:para_arrancar` };
  await POST(signedWebhookRequest("sub-A"));
  preapprovalsById["sub-A"].status = "paused";
  await POST(signedWebhookRequest("sub-A"));
  assert.equal((await getBroker(broker.id))!.subscriptionStatus, "atrasada", "la pausa de la vigente sí cuenta");

  // Se vuelve a suscribir con B → el webhook cancela A en Mercado Pago
  preapprovalsById["sub-B"] = { status: "authorized", external_reference: `${broker.id}:para_arrancar` };
  cancelledIds = [];
  await POST(signedWebhookRequest("sub-B"));
  assert.deepEqual(cancelledIds, ["sub-A"]);

  // Mercado Pago avisa el cambio de estado de A
  await POST(signedWebhookRequest("sub-A"));
  const now = await getBroker(broker.id);
  assert.equal(now!.mpPreapprovalId, "sub-B");
  assert.equal(now!.subscriptionStatus, "activa", "acaba de pagar B y quedó cancelado");
});

test("SEP23-01: si el aviso de la vieja cancelada llega mientras la estamos cancelando, tampoco toca al corredor ni a sus casos", async () => {
  const broker = await getOrCreateBroker("aviso-en-el-medio@example.com", "Corredor con aviso en el medio", null);
  await updateBroker(broker.id, { subscriptionStatus: "activa", mpPreapprovalId: "sub-C" });
  const kase = await createCase(broker.id, "Familia", "compra");
  preapprovalsById = {
    "sub-C": { status: "authorized", external_reference: `${broker.id}:para_arrancar` },
    "sub-D": { status: "authorized", external_reference: `${broker.id}:para_tu_cartera` },
  };

  // El webhook de C entra justo después de que Mercado Pago la cancela,
  // antes de que nuestro PUT termine — si el handler cancelara C antes de
  // guardar D como vigente, C todavía figuraría como la vigente acá.
  onCancel = async (id) => {
    if (id === "sub-C") await POST(signedWebhookRequest("sub-C"));
  };
  try {
    await POST(signedWebhookRequest("sub-D"));
  } finally {
    onCancel = null;
  }

  const now = await getBroker(broker.id);
  assert.equal(now!.mpPreapprovalId, "sub-D");
  assert.equal(now!.subscriptionStatus, "activa");
  assert.equal((await getCase(kase.id))!.estado, "activo", "el caso quedó en solo lectura");
});

test("SEP23-01: la baja de una suscripción que nunca fue la vigente (checkout abandonado) no toca al corredor", async () => {
  const broker = await getOrCreateBroker("checkout-abandonado@example.com", "Corredor en prueba", null);
  preapprovalsById = {
    "sub-abandonada": { status: "cancelled", external_reference: `${broker.id}:para_arrancar` },
  };

  const res = await POST(signedWebhookRequest("sub-abandonada"));
  assert.equal(res.status, 200);

  const now = await getBroker(broker.id);
  assert.equal(now!.subscriptionStatus, "prueba");
  assert.equal(now!.mpPreapprovalId, null);
});

test("SEP23-10: si el id del body no es el que cubre la firma, no se procesa nada", async () => {
  const broker = await getOrCreateBroker("body-cambiado@example.com", "Corredor con body cambiado", null);
  preapprovalsById = {
    "sub-firmada": { status: "authorized", external_reference: `${broker.id}:para_arrancar` },
    "sub-inyectada": { status: "authorized", external_reference: `${broker.id}:para_tu_cartera` },
  };

  // Request firmado para sub-firmada, con el body cambiado a otra suscripción.
  const signed = signedWebhookRequest("sub-firmada");
  const tampered = new Request(signed.url, {
    method: "POST",
    headers: signed.headers,
    body: JSON.stringify({ data: { id: "sub-inyectada" } }),
  });

  const res = await POST(tampered);
  assert.equal(res.status, 400);
  const now = await getBroker(broker.id);
  assert.equal(now!.subscriptionStatus, "prueba");
  assert.equal(now!.mpPreapprovalId, null);
});

test("si falla la cancelación de la vieja, su próximo aviso (ej. el cobro mensual) la reintenta en vez de volver a ella", async () => {
  const broker = await getOrCreateBroker("cancelacion-fallida@example.com", "Corredor con cancelación fallida", null);
  await updateBroker(broker.id, { subscriptionStatus: "activa", mpPreapprovalId: "sub-E" });
  preapprovalsById = {
    "sub-E": { status: "authorized", external_reference: `${broker.id}:para_arrancar` },
    "sub-F": { status: "authorized", external_reference: `${broker.id}:para_tu_cartera` },
  };

  failCancelFor.add("sub-E");
  cancelledIds = [];
  try {
    await POST(signedWebhookRequest("sub-F"));
    assert.deepEqual(cancelledIds, ["sub-E"], "intentó cancelar la vieja");
    assert.equal(preapprovalsById["sub-E"].status, "authorized", "la cancelación falló: E sigue cobrando");
    assert.deepEqual((await getBroker(broker.id))!.mpReplacedPreapprovalIds, ["sub-E"]);

    // Aviso de E (sigue autorizada): no tiene que volver a E ni cancelar F.
    await POST(signedWebhookRequest("sub-E"));
    let now = await getBroker(broker.id);
    assert.equal(now!.mpPreapprovalId, "sub-F");
    assert.equal(now!.plan, "para_tu_cartera");
    assert.deepEqual(cancelledIds, ["sub-E", "sub-E"], "reintentó cancelar E, y nunca F");

    // Cuando Mercado Pago acepta, E queda cancelada y F sigue vigente.
    failCancelFor.delete("sub-E");
    await POST(signedWebhookRequest("sub-E"));
    assert.equal(preapprovalsById["sub-E"].status, "cancelled");
    now = await getBroker(broker.id);
    assert.equal(now!.mpPreapprovalId, "sub-F");
    assert.equal(now!.subscriptionStatus, "activa");
  } finally {
    failCancelFor.clear();
  }
});
