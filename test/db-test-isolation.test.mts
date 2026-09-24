// `npm test` carga `.env.local`, y un `vercel env pull` le agrega las
// credenciales de Redis de producción (KV_REST_API_URL/TOKEN). Con el
// override de tests puesto (MICASO_LOCAL_DB_PATH), lib/db.ts tiene que
// ignorarlas y seguir en el archivo local — si no, los tests crean y
// borran corredores y casos en la base real. Las credenciales de acá son
// falsas a propósito: si el chequeo se rompe, esto falla contra un host
// inexistente en vez de tocar nada de verdad.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const dbDir = mkdtempSync(join(tmpdir(), "micaso-test-db-isolation-"));
const dbPath = join(dbDir, "store.json");
process.env.KV_REST_API_URL = "https://no-usar-en-tests.invalid";
process.env.KV_REST_API_TOKEN = "no-usar-en-tests";
process.env.MICASO_LOCAL_DB_PATH = dbPath;

const { dbGet, dbSet, isUsingRemoteDb } = await import("../lib/db");

after(() => rmSync(dbDir, { recursive: true, force: true }));

test("con MICASO_LOCAL_DB_PATH puesto, nunca se usa Redis aunque haya credenciales cargadas", async () => {
  assert.equal(isUsingRemoteDb(), false);

  await dbSet("clave-de-prueba", { ok: true });
  assert.deepEqual(await dbGet("clave-de-prueba"), { ok: true });
  assert.ok(existsSync(dbPath), "no escribió en el archivo local del test");
});
