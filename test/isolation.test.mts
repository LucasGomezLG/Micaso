// Tests de aislamiento entre casos y entre corredores — ARQUITECTURA.md
// sección 9 pedía "un puñado de tests de integración que confirmen que
// las claves de case:{caseId}:... nunca se cruzan entre casos distintos"
// en vez de un framework completo. Esto corre con el test runner nativo
// de Node (`npm test` -> `node --import tsx --test`), sin dependencias
// de testing nuevas — tsx solo resuelve los mismos alias (`@/...`) y
// paths sin extensión que ya usa el código, para poder correr los
// módulos de lib/ tal cual están.
//
// Corre contra un store local temporal propio (ver MICASO_LOCAL_DB_PATH
// en lib/db.ts), no contra `.data/store.json` — así no compite con un
// `npm run dev` local ni con el caso demo real.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dbDir = mkdtempSync(join(tmpdir(), "micaso-test-"));
process.env.MICASO_LOCAL_DB_PATH = join(dbDir, "store.json");

const { createCase, listCasesForBroker } = await import("../lib/cases");
const { getHouses, addHouse, updateHouse, getChecklist, deleteChecklistItem } = await import(
  "../lib/store"
);

after(() => rmSync(dbDir, { recursive: true, force: true }));

test("las casas de un caso no aparecen en otro caso", async () => {
  const caseA = await createCase("broker-a", "Caso A", "compra");
  const caseB = await createCase("broker-b", "Caso B", "compra");
  const houseA = await addHouse(caseA.id, { url: "https://example.com/a", addedBy: "Test" });

  assert.deepEqual(await getHouses(caseB.id), []);
  const housesA = await getHouses(caseA.id);
  assert.equal(housesA.length, 1);
  assert.equal(housesA[0].id, houseA.id);
});

test("no se puede modificar la casa de otro caso pasando su id con el caseId equivocado", async () => {
  const caseA = await createCase("broker-a", "Caso A2", "compra");
  const caseB = await createCase("broker-b", "Caso B2", "compra");
  const houseA = await addHouse(caseA.id, { url: "https://example.com/a2", addedBy: "Test" });

  const result = await updateHouse(caseB.id, houseA.id, { highlighted: true });
  assert.equal(result, null);

  const stillA = await getHouses(caseA.id);
  assert.equal(stillA[0].highlighted, false);
});

test("el checklist de un caso no se puede leer ni borrar desde otro caso", async () => {
  const caseA = await createCase("broker-a", "Caso A3", "compra");
  const caseB = await createCase("broker-b", "Caso B3", "compra");
  const itemsA = await getChecklist(caseA.id);
  const itemsB = await getChecklist(caseB.id);

  assert.ok(itemsA.length > 0);
  assert.ok(!itemsB.some((item) => item.id === itemsA[0].id));

  const deleted = await deleteChecklistItem(caseB.id, itemsA[0].id);
  assert.equal(deleted, false);

  const stillThereInA = await getChecklist(caseA.id);
  assert.ok(stillThereInA.some((item) => item.id === itemsA[0].id));
});

test("listCasesForBroker solo devuelve los casos de ese corredor", async () => {
  const caseA = await createCase("broker-x", "Caso X", "compra");
  const caseB = await createCase("broker-y", "Caso Y", "compra");

  const forX = await listCasesForBroker("broker-x");
  assert.ok(forX.some((c) => c.id === caseA.id));
  assert.ok(!forX.some((c) => c.id === caseB.id));
});
