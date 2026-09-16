import { test } from "node:test";
import assert from "node:assert/strict";
import { buildVisitIcs, IcsHouse } from "../lib/ics";

test("buildVisitIcs devuelve null si la casa no tiene visitaFecha", () => {
  const house: IcsHouse = {
    id: "h-test-1",
    title: "Casa sin visita",
    zone: "Palermo",
    url: null,
    visitaFecha: null,
    contactoNombre: null,
    contactoTelefono: null,
  };
  assert.equal(buildVisitIcs(house, "http://localhost:3000/caso/casas"), null);
});

test("buildVisitIcs genera un archivo .ics RFC5545 válido con offset UTC-3 y 1 hora de duración", () => {
  const house: IcsHouse = {
    id: "h-test-2",
    title: "Depto 3 amb, luminoso; con cochera",
    zone: "Belgrano, CABA",
    url: "https://example.com/aviso-123",
    visitaFecha: "2026-09-17T15:30",
    contactoNombre: "Juan Pérez",
    contactoTelefono: "+5491122334455",
  };

  const ics = buildVisitIcs(house, "https://micaso.com.ar/caso/casas");
  assert.ok(ics !== null);

  // RFC5545 terminadores de línea CRLF
  assert.ok(ics.startsWith("BEGIN:VCALENDAR\r\n"));
  assert.ok(ics.endsWith("END:VCALENDAR\r\n"));

  // Evento
  assert.ok(ics.includes("BEGIN:VEVENT\r\n"));
  assert.ok(ics.includes("END:VEVENT\r\n"));
  assert.ok(ics.includes("UID:h-test-2@micaso.com.ar\r\n"));

  // 15:30 hora de Argentina (UTC-3) -> 18:30:00Z en UTC
  assert.ok(ics.includes("DTSTART:20260917T183000Z\r\n"));
  // 1 hora de duración fija -> 19:30:00Z en UTC
  assert.ok(ics.includes("DTEND:20260917T193000Z\r\n"));

  // Escape de texto: comas y punto y coma
  assert.ok(ics.includes("SUMMARY:Visita: Depto 3 amb\\, luminoso\\; con cochera\r\n"));
  assert.ok(ics.includes("LOCATION:Belgrano\\, CABA\r\n"));

  // Folding: ninguna línea individual debe superar los 75 caracteres antes de doblarse
  const rawLines = ics.split("\r\n");
  for (const line of rawLines) {
    assert.ok(
      line.length <= 75,
      `La línea supera los 75 caracteres: "${line}" (${line.length} chars)`
    );
  }
});
