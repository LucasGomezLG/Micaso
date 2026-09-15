// Regresión para un segundo hallazgo real (15 sept 2026), distinto del
// de concurrency.test.mts: en `next dev` con Turbopack cada route
// handler (y el middleware, aparte) compila lib/db.ts como su propia
// instancia de módulo bajo demanda - cada una con su propia variable de
// módulo. Un lock en memoria (una promesa encadenada) solo serializa
// llamadas dentro de la MISMA instancia; entre instancias distintas no
// protege nada, aunque las dos escriban el mismo store.json. Se detectó
// probando a mano con el navegador real: un caso recién creado
// desaparecía porque el load de /caso/casas dispara varios fetches en
// paralelo que compilan rutas distintas la primera vez.
//
// Este test simula exactamente eso: importa lib/db.ts dos veces con un
// query string distinto para forzar que Node lo evalúe como dos módulos
// separados (dos `localStoreQueue`/lock en memoria independientes, si
// existieran) apuntando al mismo archivo - igual que dos chunks de
// Turbopack. El fix real es un lock de archivo (ver lib/db.ts), que sí
// es compartido por cualquier cantidad de instancias del módulo.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type * as Db from "../lib/db";

const dbDir = mkdtempSync(join(tmpdir(), "micaso-lock-test-"));
const dbPath = join(dbDir, "store.json");
process.env.MICASO_LOCAL_DB_PATH = dbPath;

after(() => rmSync(dbDir, { recursive: true, force: true }));

const dbModuleUrl = new URL("../lib/db.ts", import.meta.url).href;
const dbA = (await import(`${dbModuleUrl}?instance=a`)) as typeof Db;
const dbB = (await import(`${dbModuleUrl}?instance=b`)) as typeof Db;

test("dos instancias distintas del módulo db.ts (como dos rutas compiladas por separado en dev) no pierden escrituras concurrentes sobre la misma clave", async () => {
  const KEY = "shared-list";
  const totalPerSide = 15;

  const writesA = Array.from({ length: totalPerSide }, (_, i) =>
    dbA.dbUpdate<string[]>(KEY, (current) => [...(current ?? []), `a${i}`])
  );
  const writesB = Array.from({ length: totalPerSide }, (_, i) =>
    dbB.dbUpdate<string[]>(KEY, (current) => [...(current ?? []), `b${i}`])
  );

  await Promise.all([...writesA, ...writesB]);

  const finalFromA = await dbA.dbGet<string[]>(KEY);
  const finalFromB = await dbB.dbGet<string[]>(KEY);
  assert.equal(finalFromA?.length, totalPerSide * 2);
  assert.deepEqual(finalFromA, finalFromB);
});
