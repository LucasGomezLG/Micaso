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

// withLock (SEP23-20): el tope de casos del plan depende de leer varias
// claves y después escribir, algo que dbUpdate no cubre. El test de
// SEP23-20 en concurrency.test.mts pasa incluso sin el lock en modo local
// (el lock de archivo del store termina serializando las altas de hecho),
// así que el que prueba de verdad la exclusión es este.
test("withLock: dos secciones con el mismo nombre nunca corren a la vez; con nombres distintos sí", async () => {
  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  const track = () => {
    const state = { inside: 0, max: 0 };
    const run = async () => {
      state.inside++;
      state.max = Math.max(state.max, state.inside);
      await sleep(15);
      state.inside--;
    };
    return { state, run };
  };

  const same = track();
  await Promise.all(Array.from({ length: 5 }, () => dbA.withLock("seccion", same.run)));
  assert.equal(same.state.max, 1);

  // Con nombres distintos: la primera sección no sale hasta que la
  // segunda entró. Si se bloquearan entre sí, la segunda nunca entraría
  // y la primera se rinde a los 3 s. Con una barrera en vez de medir
  // tiempos, así no depende de qué tan cargada esté la máquina.
  let otherEntered!: () => void;
  const entered = new Promise<void>((resolve) => (otherEntered = resolve));
  const first = dbA.withLock("uno", () =>
    Promise.race([
      entered,
      sleep(3000).then(() => {
        throw new Error("la sección con otro nombre no pudo entrar mientras esta estaba adentro");
      }),
    ])
  );
  const second = dbB.withLock("otro", async () => otherEntered());
  await Promise.all([first, second]);
});

test("withLock: se puede usar dbUpdate adentro sin trabarse, y el lock se libera aunque fn tire", async () => {
  const result = await dbA.withLock("anidado", () => dbA.dbUpdate<number>("contador-anidado", (n) => (n ?? 0) + 1));
  assert.equal(result, 1);

  await assert.rejects(dbA.withLock("con-error", async () => { throw new Error("boom"); }), /boom/);
  // Si el lock hubiera quedado tomado, esto esperaría los 10 s del lock vencido.
  const start = Date.now();
  await dbB.withLock("con-error", async () => {});
  assert.ok(Date.now() - start < 2000, "el lock quedó tomado después del error");
});
