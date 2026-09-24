// Cubre SEP23-02 (AUDITORIA-2026-09-23.md): "Eliminar mi cuenta" solo
// borraba al corredor, no sus casos — la familia seguía entrando y el
// cron no los bajaba nunca, porque recorre corredores que ya no existían.
// Ahora las dos bajas (autoservicio y /superadmin) pasan por
// deleteBrokerCascade (lib/brokerDeletion.ts). Mockea `fetch` para la
// cancelación en Mercado Pago, mismo criterio que test/subscription.
import { test, after, before } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import crypto from "node:crypto";

const dbDir = mkdtempSync(join(tmpdir(), "micaso-test-broker-deletion-"));
process.env.MICASO_LOCAL_DB_PATH = join(dbDir, "store.json");
process.env.MP_ACCESS_TOKEN = "test-access-token";
process.env.CASE_SECRET_KEY ??= crypto.randomBytes(32).toString("base64");

const { getOrCreateBroker, getBroker, updateBroker } = await import("../lib/brokers");
const { createCase, getCase, getCaseByCredentials, listCasesForBroker, downgradeCasesForInactiveBrokers } =
  await import("../lib/cases");
const { addHouse } = await import("../lib/store");
const { dbGet } = await import("../lib/db");
const { deleteBrokerCascade } = await import("../lib/brokerDeletion");

after(() => rmSync(dbDir, { recursive: true, force: true }));

const originalFetch = globalThis.fetch;
let cancelledIds: string[] = [];

before(() => {
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
    const href = url.toString();
    if (href.includes("/preapproval/") && init?.method === "PUT") {
      cancelledIds.push(href.split("/preapproval/")[1]);
      return new Response(JSON.stringify({ status: "cancelled" }), { status: 200 });
    }
    throw new Error(`fetch no mockeado: ${init?.method ?? "GET"} ${href}`);
  }) as typeof fetch;
});

after(() => {
  globalThis.fetch = originalFetch;
});

test("SEP23-02: después de la baja del corredor, sus casos y sus datos dejan de existir", async () => {
  const broker = await getOrCreateBroker("se-va@example.com", "Corredor que se va", null);
  const kase = await createCase(broker.id, "Familia", "compra");
  await addHouse(kase.id, { url: "https://example.com/casa", addedBy: "Test" });

  assert.equal(await deleteBrokerCascade(broker.id), true);
  await downgradeCasesForInactiveBrokers(); // cron diario

  assert.equal(await getBroker(broker.id), null);
  assert.equal(await getCase(kase.id), null, "el caso sigue existiendo — proxy.ts lo dejaría entrar");
  assert.equal(await getCaseByCredentials(kase.username, kase.password), null, "la familia sigue entrando");
  assert.deepEqual(await listCasesForBroker(broker.id), []);
  assert.equal(await dbGet(`broker:${broker.id}:cases`), null, "quedó el índice de casos huérfano");
  assert.equal(await dbGet(`case:${kase.id}:houses`), null, "quedaron las casas del caso");
});

test("la baja cancela en Mercado Pago una suscripción atrasada (paused), no solo una activa", async () => {
  const broker = await getOrCreateBroker("atrasado@example.com", "Corredor atrasado", null);
  await updateBroker(broker.id, { subscriptionStatus: "atrasada", mpPreapprovalId: "sub-pausada" });

  cancelledIds = [];
  await deleteBrokerCascade(broker.id);

  assert.deepEqual(cancelledIds, ["sub-pausada"]);
});

test("la baja no vuelve a cancelar una suscripción que ya está cancelada", async () => {
  const broker = await getOrCreateBroker("ya-cancelo@example.com", "Corredor que ya canceló", null);
  await updateBroker(broker.id, { subscriptionStatus: "cancelada", mpPreapprovalId: "sub-vieja" });

  cancelledIds = [];
  await deleteBrokerCascade(broker.id);

  assert.deepEqual(cancelledIds, []);
  assert.equal(await getBroker(broker.id), null);
});

test("deleteBrokerCascade devuelve false para un corredor que no existe", async () => {
  assert.equal(await deleteBrokerCascade("no-existe@example.com"), false);
});

test("SEP23-02: un caso que se crea mientras corre la baja no queda huérfano", async () => {
  const broker = await getOrCreateBroker("baja-y-alta@example.com", "Corredor que se va mientras crea", null);
  await createCase(broker.id, "Caso existente", "compra");

  // La baja y un alta desde otra pestaña, a la vez.
  const [baja, alta] = await Promise.allSettled([
    deleteBrokerCascade(broker.id),
    createCase(broker.id, "Caso nuevo en otra pestaña", "compra"),
  ]);
  assert.equal(baja.status, "fulfilled");

  // O el alta entró antes (y la baja la borró) o falló después: en ningún
  // caso queda un caso de un corredor que ya no existe.
  if (alta.status === "fulfilled") {
    assert.equal(await getCase(alta.value.id), null, "el caso creado durante la baja quedó huérfano");
  } else {
    assert.match(String(alta.reason), /dado de baja/);
  }
  assert.deepEqual(await listCasesForBroker(broker.id), []);
});
