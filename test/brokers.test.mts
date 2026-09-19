// Cubre el esquema de claves nuevo de lib/brokers.ts (migración
// ARC-01/DAT-01): broker:{id}:meta por corredor + índice global
// all_broker_ids, en vez del blob único "brokers". Mismo patrón que
// test/isolation.test.mts — store local temporal propio.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dbDir = mkdtempSync(join(tmpdir(), "micaso-test-brokers-"));
process.env.MICASO_LOCAL_DB_PATH = join(dbDir, "store.json");

const { getOrCreateBroker, getBroker, updateBroker, deleteBroker, listAllBrokers } = await import("../lib/brokers");
const { dbGet } = await import("../lib/db");

after(() => rmSync(dbDir, { recursive: true, force: true }));

test("getOrCreateBroker crea una vez y devuelve el mismo corredor en llamadas siguientes", async () => {
  const first = await getOrCreateBroker("nuevo@example.com", "Nuevo Corredor", null);
  assert.equal(first.id, "nuevo@example.com");
  assert.equal(first.nombreMarca, "Nuevo Corredor");
  assert.equal(first.subscriptionStatus, "prueba");

  const second = await getOrCreateBroker("nuevo@example.com", "Nombre distinto de Google", null);
  assert.equal(second.createdAt, first.createdAt);
  // No pisa nombreMarca con el nuevo nombre de Google en logins siguientes.
  assert.equal(second.nombreMarca, "Nuevo Corredor");
});

test("getBroker devuelve null para un id que no existe", async () => {
  assert.equal(await getBroker("no-existe@example.com"), null);
});

test("updateBroker patchea campos y devuelve null si el corredor no existe", async () => {
  await getOrCreateBroker("editable@example.com", "Editable", null);
  const updated = await updateBroker("editable@example.com", { nombreMarca: "Nombre Nuevo" });
  assert.equal(updated!.nombreMarca, "Nombre Nuevo");

  assert.equal(await updateBroker("fantasma@example.com", { nombreMarca: "x" }), null);
});

test("listAllBrokers incluye los corredores creados, más recientes primero", async () => {
  await getOrCreateBroker("viejo@example.com", "Viejo", null);
  await new Promise((r) => setTimeout(r, 5));
  await getOrCreateBroker("nuevo2@example.com", "Nuevo2", null);

  const all = await listAllBrokers();
  const ids = all.map((b) => b.id);
  assert.ok(ids.includes("viejo@example.com"));
  assert.ok(ids.includes("nuevo2@example.com"));
  assert.ok(ids.indexOf("nuevo2@example.com") < ids.indexOf("viejo@example.com"));
});

test("deleteBroker lo saca de getBroker/listAllBrokers y deja tombstone; recrearlo limpia el tombstone", async () => {
  await getOrCreateBroker("borrar@example.com", "A Borrar", null);
  const deleted = await deleteBroker("borrar@example.com");
  assert.equal(deleted, true);

  assert.equal(await getBroker("borrar@example.com"), null);
  assert.ok(!(await listAllBrokers()).some((b) => b.id === "borrar@example.com"));

  const tombstones = await dbGet<Record<string, true>>("deleted_broker_ids");
  assert.equal(tombstones!["borrar@example.com"], true);

  // Volver a borrar algo que ya no existe no rompe nada.
  assert.equal(await deleteBroker("borrar@example.com"), false);

  // Una alta real después del borrado (a mano desde /superadmin, o un
  // login nuevo si nunca se chequeara el tombstone) limpia la marca.
  await getOrCreateBroker("borrar@example.com", "Recreado", null);
  const tombstonesAfter = await dbGet<Record<string, true>>("deleted_broker_ids");
  assert.equal(Object.prototype.hasOwnProperty.call(tombstonesAfter ?? {}, "borrar@example.com"), false);
});
