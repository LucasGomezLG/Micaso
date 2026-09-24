// Regresión para una condición de carrera real encontrada probando la
// carga manual de casas (15 sept 2026): getHouses() (y getChecklist,
// getCriteria) inicializaban una clave nueva con un dbGet seguido de un
// dbSet separado — si en el medio otra request ya escribía la primera
// casa vía addHouse() (que sí es atómico, dbUpdate), ese dbSet la pisaba
// con un array vacío. Nunca se había notado porque hace falta una
// request concurrente sobre un caso recién creado, algo que no pasaba
// en el uso de una sola persona (D:\Casa) pero sí puede pasar ahora con
// un corredor y una familia entrando casi al mismo tiempo a un caso
// nuevo. Arreglado reemplazando el dbSet ciego por un dbUpdate que
// vuelve a chequear `current` adentro del mismo lock (ver lib/store.ts).
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dbDir = mkdtempSync(join(tmpdir(), "micaso-test-"));
process.env.MICASO_LOCAL_DB_PATH = join(dbDir, "store.json");

const { createCase } = await import("../lib/cases");
const { getHouses, addHouse, getChecklist, addChecklistItem } = await import("../lib/store");

after(() => rmSync(dbDir, { recursive: true, force: true }));

test("agregar una casa a un caso nuevo no se pierde si algo más lo lee al mismo tiempo", async () => {
  const kase = await createCase("broker-race", "Caso carrera", "compra");

  // Nadie tocó `case:{id}:houses` todavía — es exactamente la ventana
  // donde pasaba la carrera: un lector (getHouses) que la inicializa de
  // forma perezosa, en paralelo con la primera escritura real.
  const [, added] = await Promise.all([
    getHouses(kase.id),
    addHouse(kase.id, { url: "https://example.com/race", addedBy: "Test" }),
  ]);

  const houses = await getHouses(kase.id);
  assert.equal(houses.length, 1);
  assert.equal(houses[0].id, added.id);
});

test("agregar un item de checklist a un caso nuevo no se pierde si algo más lo lee al mismo tiempo", async () => {
  const kase = await createCase("broker-race2", "Caso carrera 2", "compra");

  // Igual que el test anterior: nadie leyó ni escribió el checklist de
  // este caso todavía, así que getChecklist todavía tiene que inicializar
  // la clave — la misma ventana donde se perdía addChecklistItem.
  const [, added] = await Promise.all([
    getChecklist(kase.id),
    addChecklistItem(kase.id, "Extra", "Item agregado en la carrera"),
  ]);

  const items = await getChecklist(kase.id);
  assert.ok(items.some((item) => item.id === added.id));
});

// SEP23-20 (AUDITORIA-2026-09-23.md): el tope de casos activos del plan
// se contaba y después se creaba, sin lock entre las dos cosas — dos altas
// simultáneas con el corredor en el tope menos uno pasaban las dos (en
// Redis). Ojo: en modo local este test pasa incluso sin el lock, porque el
// lock de archivo del store termina serializando las altas de hecho; la
// exclusión en sí la prueba withLock en db-file-lock.test.mts. Este queda
// como test de comportamiento del tope con altas y reaperturas mezcladas.
test("SEP23-20: altas y reaperturas simultáneas no pasan el tope de casos del plan", async () => {
  process.env.CASE_SECRET_KEY ??= (await import("node:crypto")).randomBytes(32).toString("base64");
  const { getOrCreateBroker } = await import("../lib/brokers");
  const { closeCase, listCasesForBroker } = await import("../lib/cases");
  const broker = await getOrCreateBroker("tope@example.com", "Corredor en el tope", null); // para_arrancar: 5
  const countActive = async () => (await listCasesForBroker(broker.id)).filter((c) => c.estado === "activo").length;

  for (let i = 0; i < 4; i++) await createCase(broker.id, `Caso ${i}`, "compra");
  const altas = await Promise.allSettled([1, 2, 3].map((i) => createCase(broker.id, `Simultáneo ${i}`, "compra")));
  assert.equal(altas.filter((r) => r.status === "fulfilled").length, 1, "tenía lugar para uno solo");
  assert.equal(await countActive(), 5);

  // Dos lugares libres y tres intentos a la vez (dos reaperturas y un alta).
  const [a, b] = await listCasesForBroker(broker.id);
  await closeCase(a.id, broker.id);
  await closeCase(b.id, broker.id);
  const { reopenCase } = await import("../lib/cases");
  const intentos = await Promise.allSettled([
    reopenCase(a.id, broker.id),
    reopenCase(b.id, broker.id),
    createCase(broker.id, "Otro simultáneo", "compra"),
  ]);
  assert.equal(intentos.filter((r) => r.status === "fulfilled").length, 2);
  assert.equal(await countActive(), 5);
});
