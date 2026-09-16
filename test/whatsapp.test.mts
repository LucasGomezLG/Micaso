import { test } from "node:test";
import assert from "node:assert/strict";
import { buildCaseShareMessage, getCanonicalLoginUrl } from "../lib/whatsapp";

test("getCanonicalLoginUrl genera la URL canónica con parámetros", () => {
  const url = getCanonicalLoginUrl("usr123", "pass456");
  assert.ok(url.includes("u=usr123"));
  assert.ok(url.includes("p=pass456"));
  assert.ok(url.startsWith("https://www.micaso.com.ar/login?") || url.includes("/login?"));
});

test("buildCaseShareMessage incluye título, URL, credenciales y texto formateado sin caracteres corruptos", () => {
  const msg = buildCaseShareMessage({
    titulo: "Familia Curretti",
    username: "b8h45d",
    password: "XEN4Z5XB2SAU",
  });

  assert.ok(msg.includes('Familia Curretti'));
  assert.ok(msg.includes('Usuario: b8h45d'));
  assert.ok(msg.includes('Contraseña: XEN4Z5XB2SAU'));
  assert.ok(msg.includes('▶ *Entrá directo con 1 toque acá:*'));
  assert.ok(!msg.includes('\uFFFD'));
});
