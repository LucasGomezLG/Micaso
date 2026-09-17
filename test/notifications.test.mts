import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dbDir = mkdtempSync(join(tmpdir(), "micaso-test-notif-"));
process.env.MICASO_LOCAL_DB_PATH = join(dbDir, "store.json");

const { createCase, markCaseSeenByBroker, getCase } = await import("../lib/cases");
const { addHouse, getCaseSummary } = await import("../lib/store");
const { getCaseSubscriptions, removeCaseSubscription, saveCaseSubscription } = await import("../lib/push");

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
