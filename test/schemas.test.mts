import { test } from "node:test";
import assert from "node:assert/strict";
import {
  houseCreateSchema,
  housePatchSchema,
  peoplePatchSchema,
  pushSubscribeSchema,
  caseLoginSchema,
  checklistItemCreateSchema,
  brokerProfilePatchSchema,
} from "../lib/schemas";

test("COD-01: housePatchSchema rechaza priceUsd como string (el caso concreto del hallazgo)", () => {
  const result = housePatchSchema.safeParse({ priceUsd: "carísimo" });
  assert.equal(result.success, false);
});

test("houseCreateSchema exige addedBy y rechaza espacios en blanco (no solo string vacío)", () => {
  assert.equal(houseCreateSchema.safeParse({ title: "Casa" }).success, false);
  assert.equal(houseCreateSchema.safeParse({ addedBy: "   ", title: "Casa" }).success, false);
  const ok = houseCreateSchema.safeParse({ addedBy: "  Lucas  ", title: "Casa" });
  assert.equal(ok.success, true);
  if (ok.success) assert.equal(ok.data.addedBy, "Lucas"); // trim aplicado
});

test("houseCreateSchema descarta id/author/createdAt de initialComments — solo se guarda el texto", () => {
  const result = houseCreateSchema.safeParse({
    addedBy: "Lucas",
    title: "Casa",
    initialComments: ["  nota real  "],
  });
  assert.equal(result.success, true);
  if (result.success) assert.deepEqual(result.data.initialComments, ["nota real"]);
});

test("housePatchSchema nunca acepta comments ni checklist (RT-04 — reservado a los endpoints dedicados)", () => {
  const result = housePatchSchema.safeParse({
    priceUsd: 100000,
    comments: [{ id: "x", author: "Corredora", text: "confirmado", createdAt: "2020-01-01" }],
  });
  // Zod descarta claves desconocidas por default (no las rechaza, las ignora) — comments no
  // forma parte del schema, así que el resultado exitoso no puede tener ese campo.
  assert.equal(result.success, true);
  if (result.success) assert.equal("comments" in result.data, false);
});

test("housePatchSchema acepta un patch parcial típico de EditHouseModal", () => {
  const result = housePatchSchema.safeParse({
    title: "Depto 3 amb",
    priceUsd: 150000,
    zone: "Olivos",
    ambientes: 3,
    superficieM2: 80,
    cochera: null,
    images: ["https://example.com/foto.jpg"],
    contactoNombre: null,
    contactoTelefono: null,
    proximaAccion: null,
    proximaAccionFecha: null,
    visitaFecha: "2026-10-01T15:00",
  });
  assert.equal(result.success, true);
});

test("housePatchSchema acepta visitReview (VisitReview.tsx)", () => {
  const result = housePatchSchema.safeParse({
    visitReview: { bien: "Luminoso", faltante: "Cochera", aMejorar: "Nada" },
  });
  assert.equal(result.success, true);
});

test("peoplePatchSchema rechaza si falta people, con mensaje amigable", () => {
  const result = peoplePatchSchema.safeParse({});
  assert.equal(result.success, false);
  if (!result.success) assert.match(result.error.issues[0].message, /Falta la lista de personas/);
});

test("pushSubscribeSchema rechaza una suscripción incompleta en cualquier nivel", () => {
  assert.equal(pushSubscribeSchema.safeParse({}).success, false);
  assert.equal(pushSubscribeSchema.safeParse({ subscription: {} }).success, false);
  assert.equal(
    pushSubscribeSchema.safeParse({ subscription: { endpoint: "x", keys: { p256dh: "a" } } }).success,
    false
  );
  assert.equal(
    pushSubscribeSchema.safeParse({
      subscription: { endpoint: "x", keys: { p256dh: "a", auth: "b" } },
    }).success,
    true
  );
});

test("caseLoginSchema rechaza usuario/contraseña vacíos sin filtrar cuál falta", () => {
  const result = caseLoginSchema.safeParse({ username: "", password: "1234" });
  assert.equal(result.success, false);
  if (!result.success) assert.match(result.error.issues[0].message, /Usuario o contraseña incorrectos/);
});

test("checklistItemCreateSchema recorta espacios y exige categoría y tarea", () => {
  assert.equal(checklistItemCreateSchema.safeParse({ group: "  ", label: "Firmar boleto" }).success, false);
  const ok = checklistItemCreateSchema.safeParse({ group: " Papeles ", label: " Firmar boleto " });
  assert.equal(ok.success, true);
  if (ok.success) assert.deepEqual(ok.data, { group: "Papeles", label: "Firmar boleto" });
});

test("brokerProfilePatchSchema rechaza un body vacío (\"Nada para actualizar\")", () => {
  const result = brokerProfilePatchSchema.safeParse({});
  assert.equal(result.success, false);
  if (!result.success) assert.match(result.error.issues[0].message, /Nada para actualizar/);
});
