import { test } from "node:test";
import assert from "node:assert/strict";
import { buildCaseShareMessage, getCanonicalLoginUrl } from "../lib/whatsapp";

test("getCanonicalLoginUrl genera la URL canónica con parámetros", () => {
  const url = getCanonicalLoginUrl("token_123");
  assert.ok(url.includes("t=token_123"));
  assert.ok(url.startsWith("https://www.micaso.com.ar/login?") || url.includes("/login?"));
});

test("buildCaseShareMessage incluye título, URL, credenciales y texto formateado sin caracteres corruptos", () => {
  const msg = buildCaseShareMessage({
    titulo: "Familia Curretti",
    magicLinkToken: "token_seguro_ab12",
  });

  assert.ok(msg.includes('Familia Curretti'));
  assert.ok(msg.includes('t=token_seguro_ab12'));
  assert.ok(!msg.includes('Usuario:'));
  assert.ok(!msg.includes('Contraseña:'));
  assert.ok(msg.includes('▶ *Entrá directo con 1 toque acá:*'));
  assert.ok(!msg.includes('\uFFFD'));
});
