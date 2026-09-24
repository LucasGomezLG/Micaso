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

const { createCase, listCasesForBroker, renameCase, closeCase } = await import("../lib/cases");
const { getHouses, addHouse, updateHouse, getChecklist, deleteChecklistItem, ownBlobUrls, blobPhotosToDelete } = await import(
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

test("un corredor no puede renombrar ni cerrar el caso de otro corredor", async () => {
  const caseA = await createCase("broker-alpha", "Caso Alpha", "compra");
  const renamed = await renameCase(caseA.id, "broker-beta", "Hackeado");
  assert.equal(renamed, null);

  const closed = await closeCase(caseA.id, "broker-beta");
  assert.equal(closed, null);

  const legitClose = await closeCase(caseA.id, "broker-alpha");
  assert.ok(legitClose);
  assert.equal(legitClose.estado, "solo_lectura");
});

test("al borrar fotos de Blob, solo cuentan las subidas por ESTE caso (SEP23-08)", () => {
  const blob = "https://abc123.public.blob.vercel-storage.com";
  const images = [
    blob + "/case-photos/caso-a/foto-1.jpg",
    blob + "/case-photos/caso-b/foto-copiada.jpg",
    blob + "/otra-carpeta/foto.jpg",
    "https://http2.mlstatic.com/D_foto-del-portal.jpg",
    "no es una url",
  ];
  assert.deepEqual(ownBlobUrls("caso-a", images), [blob + "/case-photos/caso-a/foto-1.jpg"]);
  assert.deepEqual(ownBlobUrls("caso-b", images), [blob + "/case-photos/caso-b/foto-copiada.jpg"]);
  assert.deepEqual(ownBlobUrls("caso", images), [], "un caseId que es prefijo de otro no borra fotos ajenas");
});

test("SEP23-08: una foto del caso X que otro caso del mismo corredor usa no se borra al borrar en X", async () => {
  const blob = "https://abc123.public.blob.vercel-storage.com";
  const x = await createCase("broker-fotos", "Caso X", "compra");
  const y = await createCase("broker-fotos", "Caso Y", "compra");
  const compartida = blob + "/case-photos/" + x.id + "/compartida.jpg";
  const soloDeX = blob + "/case-photos/" + x.id + "/solo-x.jpg";
  await addHouse(x.id, { url: "https://example.com/casa", addedBy: "Test", images: [compartida, soloDeX] });
  await addHouse(y.id, { url: "https://example.com/casa", addedBy: "Test", images: [compartida] });

  assert.deepEqual(await blobPhotosToDelete(x.id, "broker-fotos", [compartida, soloDeX]), [soloDeX]);
  // Desde Y, ninguna de las dos es suya: no borra nada.
  assert.deepEqual(await blobPhotosToDelete(y.id, "broker-fotos", [compartida]), []);
});
