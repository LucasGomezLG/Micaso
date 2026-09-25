// House.visitaConfirmada — la confirmación es de un horario puntual, así
// que updateHouse la baja cuando la visita se mueve o se saca (ver
// lib/store.ts). Store local temporal propio, igual que isolation.test.mts.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dbDir = mkdtempSync(join(tmpdir(), "micaso-test-visita-"));
process.env.MICASO_LOCAL_DB_PATH = join(dbDir, "store.json");

const { addHouse, updateHouse, visitMoved } = await import("../lib/store");

after(() => rmSync(dbDir, { recursive: true, force: true }));

async function confirmedVisit(caseId: string) {
  const house = await addHouse(caseId, { url: "https://example.com/v", addedBy: "Test", visitaFecha: "2026-09-26T10:00" });
  const confirmed = await updateHouse(caseId, house.id, { visitaConfirmada: true });
  assert.equal(confirmed?.visitaConfirmada, true);
  return house.id;
}

test("una casa nueva arranca sin confirmar", async () => {
  const house = await addHouse("case-visita-1", { url: "https://example.com/n", addedBy: "Test", visitaFecha: "2026-09-26T10:00" });
  assert.equal(house.visitaConfirmada, false);
});

test("cambios que no tocan la visita no la desconfirman", async () => {
  const id = await confirmedVisit("case-visita-2");
  const updated = await updateHouse("case-visita-2", id, { highlighted: true, visitaFecha: "2026-09-26T10:00" });
  assert.equal(updated?.visitaConfirmada, true);
});

test("mover la visita a otro horario la desconfirma", async () => {
  const id = await confirmedVisit("case-visita-3");
  const updated = await updateHouse("case-visita-3", id, { visitaFecha: "2026-09-26T11:00" });
  assert.equal(updated?.visitaConfirmada, false);
});

test("mover la visita y confirmarla en el mismo cambio la deja confirmada", async () => {
  const id = await confirmedVisit("case-visita-4");
  const updated = await updateHouse("case-visita-4", id, { visitaFecha: "2026-09-27T09:00", visitaConfirmada: true });
  assert.equal(updated?.visitaConfirmada, true);
});

test("sin visita no hay nada confirmado", async () => {
  const id = await confirmedVisit("case-visita-5");
  const cleared = await updateHouse("case-visita-5", id, { visitaFecha: null });
  assert.equal(cleared?.visitaConfirmada, false);

  const house = await addHouse("case-visita-5", { url: "https://example.com/s", addedBy: "Test" });
  const forced = await updateHouse("case-visita-5", house.id, { visitaConfirmada: true });
  assert.equal(forced?.visitaConfirmada, false);
});

test("visitMoved: la misma fecha que ya tenía (como la reenvía Editar datos) no cuenta como mover", () => {
  const withVisit = { visitaFecha: "2026-09-26T10:00" };
  const withoutVisit = { visitaFecha: null };
  assert.equal(visitMoved(withVisit, { visitaFecha: "2026-09-26T10:00", priceUsd: 150000 }), false);
  assert.equal(visitMoved(withVisit, { priceUsd: 150000 }), false);
  assert.equal(visitMoved(withoutVisit, { visitaFecha: null }), false);
  assert.equal(visitMoved(withVisit, { visitaFecha: "2026-09-26T11:00" }), true);
  assert.equal(visitMoved(withoutVisit, { visitaFecha: "2026-09-26T10:00" }), true);
  assert.equal(visitMoved(withVisit, { visitaFecha: null }), true);
});
