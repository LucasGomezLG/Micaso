import { test } from "node:test";
import assert from "node:assert/strict";
import { buildCaseShareMessage, buildVisitDayMessage, getCanonicalLoginUrl } from "../lib/whatsapp";

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

test("buildVisitDayMessage arma el día con ubicación, hora en 24 h y ✅ solo en las confirmadas", () => {
  const msg = buildVisitDayMessage("2026-09-26", [
    { title: "PH en Villa Urquiza", address: "Pelagio B. Luna 2763", zone: "Villa Urquiza", visitaFecha: "2026-09-26T12:15", visitaConfirmada: false },
    { title: "Casa en Saavedra", address: "Catamarca 3368", zone: "Saavedra", visitaFecha: "2026-09-26T10:00", visitaConfirmada: true },
    { title: "Depto en Coghlan", address: null, zone: "Coghlan", visitaFecha: "2026-09-26T13:30", visitaConfirmada: true },
    { title: "Casa sin dirección", address: "  ", zone: null, visitaFecha: "2026-09-26T16:05", visitaConfirmada: false },
  ]);

  assert.equal(
    msg,
    [
      "🏠 VISITAS PROGRAMADAS",
      "📅 Fecha: sábado 26/09/26",
      "",
      "📍 Ubicación: Catamarca 3368",
      "⌚ Hora: 10:00hs ✅",
      "",
      "📍 Ubicación: Pelagio B. Luna 2763",
      "⌚ Hora: 12:15hs",
      "",
      "📍 Ubicación: Coghlan",
      "⌚ Hora: 13:30hs ✅",
      "",
      "📍 Ubicación: Casa sin dirección",
      "⌚ Hora: 16:05hs",
    ].join("\n")
  );
  assert.ok(!msg.includes("\uFFFD"));
});

test("buildVisitDayMessage usa el singular con una sola visita", () => {
  const msg = buildVisitDayMessage("2026-09-28", [
    { title: "Casa", address: "D. Pombo 3245", zone: null, visitaFecha: "2026-09-28T11:30", visitaConfirmada: false },
  ]);
  assert.ok(msg.startsWith("🏠 VISITA PROGRAMADA\n📅 Fecha: lunes 28/09/26\n"));
});
