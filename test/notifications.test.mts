import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dbDir = mkdtempSync(join(tmpdir(), "micaso-test-notif-"));
process.env.MICASO_LOCAL_DB_PATH = join(dbDir, "store.json");

const { createCase, markCaseSeenByBroker, getCase } = await import("../lib/cases");
const { addHouse, deleteCaseData, getCaseSummary } = await import("../lib/store");
const { getCaseSubscriptions, removeCaseSubscription, saveCaseSubscription, MAX_SUBSCRIPTIONS_PER_CASE } = await import("../lib/push");

after(() => rmSync(dbDir, { recursive: true, force: true }));

test("el contador de novedades del asesor se actualiza y se resetea al marcar el caso visto", async () => {
  const kase = await createCase("broker-notif", "Caso Novedades", "compra");
  assert.ok(kase.brokerLastSeenAt, "debe inicializar brokerLastSeenAt al crear el caso");

  // Al inicio, no hay casas ni comentarios nuevos
  let summary = await getCaseSummary(kase.id, kase.brokerLastSeenAt);
  assert.equal(summary.unreadCount, 0);
  assert.equal(summary.unreadSummary, null);

  // Simulamos que el cliente agrega una casa 2 segundos después
  const pastSeen = new Date(Date.now() - 5000).toISOString();
  await addHouse(kase.id, {
    title: "Depto en Belgrano",
    addedBy: "Cliente Juan",
    addedAt: new Date().toISOString(),
  });

  summary = await getCaseSummary(kase.id, pastSeen);
  assert.ok(summary.unreadCount >= 1);
  assert.match(summary.unreadSummary || "", /1 casa/);

  // Marcar como visto actualiza brokerLastSeenAt y resetea las novedades
  await markCaseSeenByBroker(kase.id);
  const updatedCase = await getCase(kase.id);
  assert.ok(updatedCase?.brokerLastSeenAt);
  
  const resetSummary = await getCaseSummary(kase.id, updatedCase!.brokerLastSeenAt);
  assert.equal(resetSummary.unreadCount, 0);
  assert.equal(resetSummary.unreadSummary, null);
});

test("las suscripciones Web Push se aíslan estrictamente por caseId", async () => {
  const caseA = await createCase("broker-notif", "Caso Push A", "compra");
  const caseB = await createCase("broker-notif", "Caso Push B", "compra");

  const subA = {
    endpoint: "https://fcm.googleapis.com/fcm/send/fake-endpoint-a",
    keys: { p256dh: "key-a", auth: "auth-a" },
  };
  const subB = {
    endpoint: "https://fcm.googleapis.com/fcm/send/fake-endpoint-b",
    keys: { p256dh: "key-b", auth: "auth-b" },
  };

  await saveCaseSubscription(caseA.id, subA);
  await saveCaseSubscription(caseB.id, subB);

  const savedA = await getCaseSubscriptions(caseA.id);
  const savedB = await getCaseSubscriptions(caseB.id);
  assert.deepEqual(savedA.map((s) => s.endpoint), [subA.endpoint]);
  assert.deepEqual(savedB.map((s) => s.endpoint), [subB.endpoint]);

  // Eliminar la suscripción de A no debe afectar a la de B
  await removeCaseSubscription(caseA.id, subA.endpoint);

  assert.deepEqual(await getCaseSubscriptions(caseA.id), []);
  assert.deepEqual((await getCaseSubscriptions(caseB.id)).map((s) => s.endpoint), [subB.endpoint]);
});

test("deleteCaseData borra las suscripciones Web Push del caso, no deja push_subscriptions huérfano (Gemini CON-05)", async () => {
  const kase = await createCase("broker-notif", "Caso a borrar", "compra");
  const sub = {
    endpoint: "https://fcm.googleapis.com/fcm/send/fake-endpoint-borrado",
    keys: { p256dh: "key-borrado", auth: "auth-borrado" },
  };
  await saveCaseSubscription(kase.id, sub);
  assert.deepEqual((await getCaseSubscriptions(kase.id)).map((s) => s.endpoint), [sub.endpoint]);

  await deleteCaseData(kase.id, kase.brokerId);

  assert.deepEqual(await getCaseSubscriptions(kase.id), [], "no debe quedar ninguna suscripción tras borrar el caso");
});

test("el caso demo bloquea y rechaza suscripciones Web Push y no emite notificaciones", async () => {
  const { notifyCaseClients } = await import("../lib/push");
  const subDemo = {
    endpoint: "https://fcm.googleapis.com/fcm/send/fake-endpoint-demo",
    keys: { p256dh: "key-demo", auth: "auth-demo" },
  };

  // Intentar guardar suscripción en demo debe ser ignorado silenciosamente
  await saveCaseSubscription("demo", subDemo);
  const demoSubs = await getCaseSubscriptions("demo");
  assert.deepEqual(demoSubs, [], "el caso demo nunca debe registrar suscripciones push");

  // Intentar notificar a demo siempre retorna 0 sin enviar nada
  const sent = await notifyCaseClients("demo", {
    title: "Propiedad agregada",
    body: "Test en demo",
  });
  assert.equal(sent, 0);
});

test("SEP23-06: no se guarda un endpoint que no sea de un servicio de push conocido", async () => {
  const kase = await createCase("broker-notif", "Caso endpoint interno", "compra");
  await saveCaseSubscription(kase.id, { endpoint: "http://127.0.0.1:6379/", keys: { p256dh: "k", auth: "a" } });
  await saveCaseSubscription(kase.id, { endpoint: "https://intranet.example/hook", keys: { p256dh: "k", auth: "a" } });
  assert.deepEqual(await getCaseSubscriptions(kase.id), []);
});

test("SEP23-06: un caso guarda como máximo MAX_SUBSCRIPTIONS_PER_CASE suscripciones, descartando las más viejas", async () => {
  const kase = await createCase("broker-notif", "Caso muchas suscripciones", "compra");
  const total = MAX_SUBSCRIPTIONS_PER_CASE + 5;
  for (let i = 0; i < total; i++) {
    await saveCaseSubscription(kase.id, {
      endpoint: `https://fcm.googleapis.com/fcm/send/dispositivo-${i}`,
      keys: { p256dh: "k", auth: "a" },
    });
  }
  const saved = await getCaseSubscriptions(kase.id);
  assert.equal(saved.length, MAX_SUBSCRIPTIONS_PER_CASE);
  assert.equal(saved[0].endpoint, "https://fcm.googleapis.com/fcm/send/dispositivo-5", "tenía que descartar las 5 más viejas");
  assert.equal(saved.at(-1)!.endpoint, `https://fcm.googleapis.com/fcm/send/dispositivo-${total - 1}`);
});

test("SEP23-06: las suscripciones guardadas antes del chequeo no reciben avisos y se limpian al enviar", async () => {
  const { notifyCaseClients } = await import("../lib/push");
  const { dbSet } = await import("../lib/db");
  const kase = await createCase("broker-notif", "Caso con suscripciones viejas", "compra");
  // Como las dejaba la versión anterior: sin validar el endpoint.
  await dbSet(`case:${kase.id}:push_subscriptions`, [
    { endpoint: "http://169.254.169.254/latest/meta-data", keys: { p256dh: "k", auth: "a" }, createdAt: "2026-09-01T00:00:00Z" },
    { endpoint: "https://intranet.example/hook", keys: { p256dh: "k", auth: "a" }, createdAt: "2026-09-01T00:00:00Z" },
  ]);

  // Sin el filtro, web-push intentaría el POST (y un error que no es
  // 404/410 no las borraría); con el filtro, no se envía nada y se limpian.
  const sent = await notifyCaseClients(kase.id, { title: "Nueva casa", body: "x" });
  assert.equal(sent, 0);
  assert.deepEqual(await getCaseSubscriptions(kase.id), [], "tenía que borrar las suscripciones inválidas");
});
