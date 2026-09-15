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
