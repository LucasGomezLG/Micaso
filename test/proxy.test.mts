// SEP23-22 (AUDITORIA-2026-09-23.md): proxy.ts es el control de acceso
// central de la app — rutas públicas, sesión de corredor y de admin,
// bloqueo de escritura para solo_lectura y el demo, casos archivados, los
// atajos de `/` y `/login` — y no tenía ningún test (ya tuvo un bug real
// por eso: el magic link vencido del 20 sept). Estos llaman al `proxy`
// exportado con requests armados, contra un store local temporal. La
// sesión de corredor se simula con la cookie de desarrollo
// `micaso_dev_user` (proxy.ts la acepta fuera de producción), así no hace
// falta un JWT real de Auth.js.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import crypto from "node:crypto";

const dbDir = mkdtempSync(join(tmpdir(), "micaso-test-proxy-"));
process.env.MICASO_LOCAL_DB_PATH = join(dbDir, "store.json");
process.env.CASE_SECRET_KEY ??= crypto.randomBytes(32).toString("base64");
process.env.AUTH_SECRET ??= crypto.randomBytes(32).toString("base64");

const { NextRequest } = await import("next/server");
const { proxy } = await import("../proxy");
const { ADMIN_EMAILS } = await import("../lib/auth");
const { closeCase, createCase, getCase, regeneratePassword } = await import("../lib/cases");
const { dbUpdate } = await import("../lib/db");
const { createCaseSessionToken, createMagicLinkToken } = await import("../lib/sessionToken");
const { DEMO_CASE_ID } = await import("../lib/seed");
type Case = import("../lib/types").Case;

after(() => rmSync(dbDir, { recursive: true, force: true }));

const BASE = "https://www.micaso.com.ar";
const BROKER_ID = "proxy-broker@example.com";
const ADMIN_EMAIL = [...ADMIN_EMAILS][0];

function request(path: string, { method = "GET", caseToken, devUser }: { method?: string; caseToken?: string; devUser?: string } = {}) {
  const cookies = [caseToken && `case_id=${caseToken}`, devUser && `micaso_dev_user=${devUser}`].filter(Boolean);
  const headers = new Headers();
  if (cookies.length) headers.set("cookie", cookies.join("; "));
  return new NextRequest(new URL(path, BASE), { method, headers });
}

async function run(path: string, options?: Parameters<typeof request>[1]): Promise<Response> {
  // El segundo argumento es el `event` de middleware; proxy.ts no lo usa.
  return (await proxy(request(path, options), {} as never)) as Response;
}

const passedThrough = (res: Response) => res.headers.get("x-middleware-next") === "1";

function redirectTarget(res: Response): URL {
  assert.ok(res.status >= 300 && res.status < 400, `esperaba un redirect, vino ${res.status}`);
  return new URL(res.headers.get("location")!);
}

async function newCase(): Promise<Case> {
  return createCase(BROKER_ID, "Familia proxy", "compra");
}

test("rutas públicas pasan sin sesión", async () => {
  for (const path of ["/", "/login", "/terminos", "/api/demo-access", "/sw.js", "/manifest.webmanifest"]) {
    assert.ok(passedThrough(await run(path)), path);
  }
});

test("panel del corredor: sin sesión redirige al login de Google (páginas) o da 401 (API)", async () => {
  const page = redirectTarget(await run("/panel"));
  assert.equal(page.pathname, "/panel/login");
  assert.equal(page.searchParams.get("next"), "/panel");
  assert.equal((await run("/api/panel/cases")).status, 401);
  assert.ok(passedThrough(await run("/panel", { devUser: BROKER_ID })));
});

test("super-admin: solo emails de la lista blanca; un corredor común vuelve a su panel o recibe 403", async () => {
  assert.equal(redirectTarget(await run("/superadmin")).pathname, "/panel/login");
  assert.equal(redirectTarget(await run("/superadmin", { devUser: BROKER_ID })).pathname, "/panel");
  assert.equal((await run("/api/superadmin/brokers", { devUser: BROKER_ID })).status, 403);
  assert.ok(passedThrough(await run("/superadmin", { devUser: ADMIN_EMAIL })));
});

test("caso: sin cookie o con una cookie alterada no entra", async () => {
  const login = redirectTarget(await run("/caso"));
  assert.equal(login.pathname, "/login");
  assert.equal(login.searchParams.get("next"), "/caso");
  assert.equal((await run("/api/houses")).status, 401);

  const kase = await newCase();
  const token = createCaseSessionToken(kase.id);
  const tampered = token.slice(0, -2) + (token.endsWith("AA") ? "BB" : "AA");
  assert.equal((await run("/api/houses", { caseToken: tampered })).status, 401);
  assert.equal((await run("/api/houses", { caseToken: `${kase.id}` })).status, 401, "formato viejo sin firmar");
});

test("caso activo: lee y escribe", async () => {
  const kase = await newCase();
  const caseToken = createCaseSessionToken(kase.id);
  assert.ok(passedThrough(await run("/caso", { caseToken })));
  assert.ok(passedThrough(await run("/api/houses", { method: "POST", caseToken })));
});

test("solo lectura: lee pero no escribe, y puede cerrar sesión", async () => {
  const kase = await newCase();
  await closeCase(kase.id, BROKER_ID);
  const caseToken = createCaseSessionToken(kase.id);
  assert.ok(passedThrough(await run("/caso", { caseToken })));
  assert.equal((await run("/api/houses", { method: "POST", caseToken })).status, 403);
  assert.equal((await run("/api/scrape", { method: "POST", caseToken })).status, 403, "SEP23-17: sin excepción para el scraper");
  assert.ok(passedThrough(await run("/api/caso/logout", { method: "POST", caseToken })));
});

test("demo público: no escribe ni usa el scraper, salvo el admin; sí puede cerrar sesión", async () => {
  await getCase(DEMO_CASE_ID); // siembra el demo
  const caseToken = createCaseSessionToken(DEMO_CASE_ID);
  assert.ok(passedThrough(await run("/caso", { caseToken })));
  assert.equal((await run("/api/houses", { method: "POST", caseToken })).status, 403);
  assert.equal((await run("/api/scrape", { method: "POST", caseToken })).status, 403, "SEP23-17");
  assert.ok(passedThrough(await run("/api/caso/logout", { method: "POST", caseToken })));
  assert.ok(passedThrough(await run("/api/houses", { method: "POST", caseToken, devUser: ADMIN_EMAIL })));
});

test("caso archivado: pierde el acceso del todo", async () => {
  const kase = await newCase();
  await dbUpdate<Case>(`case:${kase.id}:meta`, (current) => ({ ...current!, estado: "archivado" }));
  const caseToken = createCaseSessionToken(kase.id);
  assert.equal((await run("/api/houses", { caseToken })).status, 401);
  assert.equal(redirectTarget(await run("/caso", { caseToken })).pathname, "/login");
});

test("`/` con sesión de caso (la PWA instalada) va directo a /caso", async () => {
  const kase = await newCase();
  assert.equal(redirectTarget(await run("/", { caseToken: createCaseSessionToken(kase.id) })).pathname, "/caso");
});

test("SEP23-04: después de regenerar la clave, la sesión y el magic link anteriores no entran — y /login no entra en loop", async () => {
  const kase = await newCase();
  const oldSession = createCaseSessionToken(kase.id);
  const oldMagic = createMagicLinkToken(kase.id);
  await new Promise((resolve) => setTimeout(resolve, 5));
  await regeneratePassword(kase.id, BROKER_ID);

  assert.equal((await run("/api/houses", { caseToken: oldSession })).status, 401);
  assert.equal(redirectTarget(await run("/caso", { caseToken: oldSession })).pathname, "/login");
  // Con la cookie revocada, /login muestra el formulario en vez de mandar
  // de vuelta a /caso (que a su vez mandaría a /login...).
  assert.ok(passedThrough(await run("/login", { caseToken: oldSession })));
  assert.ok(passedThrough(await run(`/login?t=${oldMagic}`, { caseToken: oldSession })));

  const newSession = createCaseSessionToken(kase.id);
  assert.ok(passedThrough(await run("/api/houses", { caseToken: newSession })));
});

test("SEP23-07: `?next=` nunca manda a otro dominio", async () => {
  const kase = await newCase();
  const caseToken = createCaseSessionToken(kase.id);
  for (const next of ["https://evil.com", "//evil.com", "/\\evil.com", "/\t/evil.com", "javascript:alert(1)"]) {
    const target = redirectTarget(await run(`/login?next=${encodeURIComponent(next)}`, { caseToken }));
    assert.equal(target.origin, BASE, `next=${JSON.stringify(next)}`);
    const brokerTarget = redirectTarget(await run(`/panel/login?next=${encodeURIComponent(next)}`, { devUser: BROKER_ID }));
    assert.equal(brokerTarget.origin, BASE, `panel next=${JSON.stringify(next)}`);
  }
  const ok = redirectTarget(await run(`/login?next=${encodeURIComponent("/caso/casas?tab=1")}`, { caseToken }));
  assert.equal(ok.pathname + ok.search, "/caso/casas?tab=1", "una ruta propia se respeta");
});

test("SEP23-04: un corredor logueado que abre un magic link revocado va a su panel, no a un login que va a fallar", async () => {
  const kase = await newCase();
  const oldMagic = createMagicLinkToken(kase.id);
  await new Promise((resolve) => setTimeout(resolve, 5));
  await regeneratePassword(kase.id, BROKER_ID);
  const newMagic = createMagicLinkToken(kase.id);

  assert.equal(redirectTarget(await run(`/login?t=${oldMagic}`, { devUser: BROKER_ID })).pathname, "/panel");
  assert.ok(passedThrough(await run(`/login?t=${newMagic}`, { devUser: BROKER_ID })), "un link vigente sí deja entrar al caso");
});
