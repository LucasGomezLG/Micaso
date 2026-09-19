// Cubre el esquema de claves nuevo de lib/cases.ts (migración
// ARC-01/DAT-01): sembrado perezoso del caso demo, los tres índices
// nuevos (broker:{id}:cases, all_case_ids, case_username:{username}) y
// los dos barridos masivos (downgradeCasesForInactiveBrokers,
// archiveStaleReadOnlyCases). Mismo patrón que test/isolation.test.mts —
// store local temporal propio, no `.data/store.json`.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dbDir = mkdtempSync(join(tmpdir(), "micaso-test-cases-"));
process.env.MICASO_LOCAL_DB_PATH = join(dbDir, "store.json");

const {
  createCase,
  getCase,
  deleteCase,
  listCasesForBroker,
  listAllCases,
  getCaseByCredentials,
  closeCase,
  downgradeCasesForInactiveBrokers,
  archiveStaleReadOnlyCases,
} = await import("../lib/cases");
const { getOrCreateBroker, updateBroker } = await import("../lib/brokers");
const { dbGet, dbSet } = await import("../lib/db");
const { DEMO_CASE_ID } = await import("../lib/seed");
const { DEV_BROKER_ID } = await import("../lib/auth");

after(() => rmSync(dbDir, { recursive: true, force: true }));

test("el caso demo se siembra solo en el primer acceso y queda indexado", async () => {
  const kase = await getCase(DEMO_CASE_ID);
  assert.ok(kase);
  assert.equal(kase!.brokerId, DEV_BROKER_ID);
  assert.equal(kase!.titulo, "Lucas y Abril");

  const forDevBroker = await listCasesForBroker(DEV_BROKER_ID);
  assert.ok(forDevBroker.some((c) => c.id === DEMO_CASE_ID));

  const viaLogin = await getCaseByCredentials("casa", "1234");
  assert.ok(viaLogin);
  assert.equal(viaLogin!.id, DEMO_CASE_ID);

  // Pedirlo de nuevo no lo vuelve a crear ni duplica el índice.
  const again = await getCase(DEMO_CASE_ID);
  assert.equal(again!.createdAt, kase!.createdAt);
  const idxCount = (await listCasesForBroker(DEV_BROKER_ID)).filter((c) => c.id === DEMO_CASE_ID).length;
  assert.equal(idxCount, 1);
});

test("createCase + getCaseByCredentials: login por username funciona con la clave real, falla con otra", async () => {
  const kase = await createCase("broker-login", "Caso Login", "compra");
  const ok = await getCaseByCredentials(kase.username, kase.password);
  assert.ok(ok);
  assert.equal(ok!.id, kase.id);

  const badPassword = await getCaseByCredentials(kase.username, "clave-incorrecta");
  assert.equal(badPassword, null);

  const badUsername = await getCaseByCredentials("no-existe-este-usuario", kase.password);
  assert.equal(badUsername, null);
});

test("deleteCase saca el caso de los tres índices — login y listado dejan de encontrarlo", async () => {
  const kase = await createCase("broker-delete", "Caso a borrar", "compra");
  assert.ok(await getCaseByCredentials(kase.username, kase.password));

  const deleted = await deleteCase(kase.id, "broker-delete");
  assert.equal(deleted, true);

  assert.equal(await getCase(kase.id), null);
  assert.equal(await getCaseByCredentials(kase.username, kase.password), null);
  assert.ok(!(await listCasesForBroker("broker-delete")).some((c) => c.id === kase.id));
  assert.ok(!(await listAllCases()).some((c) => c.id === kase.id));
});

test("downgradeCasesForInactiveBrokers(brokerId): baja solo los casos activos de ESE corredor", async () => {
  // createCase bloquea si el corredor ya está atrasado/cancelado (RT-02) —
  // el caso se crea primero con el corredor todavía en prueba, y recién
  // después se lo pasa a atrasada, igual que pasaría de verdad (un caso
  // ya existente cuyo corredor deja de pagar más adelante).
  await getOrCreateBroker("atrasado@example.com", "Atrasado", null);
  const caseAtrasado = await createCase("atrasado@example.com", "Caso de corredor atrasado", "compra");
  await updateBroker("atrasado@example.com", { subscriptionStatus: "atrasada" });

  const otroCaso = await createCase("broker-al-dia", "Caso de corredor al día", "compra");

  const downgraded = await downgradeCasesForInactiveBrokers("atrasado@example.com");
  assert.deepEqual(downgraded, [caseAtrasado.id]);

  const reloaded = await getCase(caseAtrasado.id);
  assert.equal(reloaded!.estado, "solo_lectura");
  const otroReloaded = await getCase(otroCaso.id);
  assert.equal(otroReloaded!.estado, "activo");
});

test("downgradeCasesForInactiveBrokers() sin brokerId recorre todos los corredores inactivos", async () => {
  await getOrCreateBroker("cancelado@example.com", "Cancelado", null);
  const caseCancelado = await createCase("cancelado@example.com", "Caso cancelado", "compra");
  await updateBroker("cancelado@example.com", { subscriptionStatus: "cancelada" });

  const downgraded = await downgradeCasesForInactiveBrokers();
  assert.ok(downgraded.includes(caseCancelado.id));
  assert.equal((await getCase(caseCancelado.id))!.estado, "solo_lectura");
});

test("archiveStaleReadOnlyCases archiva solo_lectura vencido hace más de 90 días, no uno reciente", async () => {
  const caseViejo = await createCase("broker-archivar", "Caso viejo cerrado", "compra");
  const caseReciente = await createCase("broker-archivar", "Caso recién cerrado", "compra");
  await closeCase(caseViejo.id, "broker-archivar");
  await closeCase(caseReciente.id, "broker-archivar");

  // Backdatea soloLecturaDesde del caso viejo a 100 días atrás escribiendo
  // directo la clave — closeCase siempre pone la fecha de "ahora".
  const oldDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString();
  const rawKey = `case:${caseViejo.id}:meta`;
  const rawCase = await dbGet<Record<string, unknown>>(rawKey);
  await dbSet(rawKey, { ...rawCase, soloLecturaDesde: oldDate });

  const archived = await archiveStaleReadOnlyCases();
  assert.ok(archived.includes(caseViejo.id));
  assert.ok(!archived.includes(caseReciente.id));

  assert.equal((await getCase(caseViejo.id))!.estado, "archivado");
  assert.equal((await getCase(caseReciente.id))!.estado, "solo_lectura");
});
