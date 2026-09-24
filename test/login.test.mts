// SEP23-04 (AUDITORIA-2026-09-23.md) del lado de app/api/login: después de
// "Regenerar clave", ni la clave vieja ni un magic link compartido antes
// dejan entrar; la clave y el link nuevos sí. proxy.ts tiene su propio
// test (test/proxy.test.mts) para las cookies ya emitidas.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import crypto from "node:crypto";

const dbDir = mkdtempSync(join(tmpdir(), "micaso-test-login-"));
process.env.MICASO_LOCAL_DB_PATH = join(dbDir, "store.json");
process.env.CASE_SECRET_KEY ??= crypto.randomBytes(32).toString("base64");

const { NextRequest } = await import("next/server");
const { POST } = await import("../app/api/login/route");
const { createCase, regeneratePassword } = await import("../lib/cases");
const { createMagicLinkToken } = await import("../lib/sessionToken");

after(() => rmSync(dbDir, { recursive: true, force: true }));

let ipCounter = 0;
function login(body: Record<string, string>) {
  // Una IP distinta por intento, para que el rate limit de logins fallidos
  // no mezcle un test con otro.
  const ip = `10.0.0.${++ipCounter}`;
  return POST(
    new NextRequest("https://www.micaso.com.ar/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-forwarded-for": ip },
      body: JSON.stringify(body),
    })
  );
}

test("SEP23-04: después de regenerar, la clave y el magic link viejos no entran; los nuevos sí", async () => {
  const kase = await createCase("broker-login", "Familia login", "compra");
  const oldMagic = createMagicLinkToken(kase.id);
  const oldPassword = kase.password;

  const before = await login({ token: oldMagic });
  assert.equal(before.status, 200, "antes de regenerar el link entra");
  assert.match(before.headers.get("set-cookie") ?? "", /case_id=/);

  await new Promise((resolve) => setTimeout(resolve, 5));
  const rotated = await regeneratePassword(kase.id, "broker-login");
  const newMagic = createMagicLinkToken(kase.id);

  assert.equal((await login({ token: oldMagic })).status, 401, "el link viejo sigue entrando");
  assert.equal((await login({ username: kase.username, password: oldPassword })).status, 401, "la clave vieja sigue entrando");
  assert.equal((await login({ token: newMagic })).status, 200);
  assert.equal((await login({ username: kase.username, password: rotated!.password })).status, 200);
});
