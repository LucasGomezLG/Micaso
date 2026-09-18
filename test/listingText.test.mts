import { test } from "node:test";
import assert from "node:assert/strict";
import {
  guessPriceUsd,
  guessAmbientesFromText,
  guessSuperficieFromText,
  parseListingText,
} from "../lib/listingText";

test("guessPriceUsd extrae precios en dólares y prioriza USD sobre expensas en pesos", () => {
  const textWithExpensas = "Casa en Belgrano. Expensas $ 65.000. Valor de venta: USD 185.000.";
  assert.equal(guessPriceUsd(textWithExpensas), 185000);

  assert.equal(guessPriceUsd("Departamento U$S 120.000 excelente estado"), 120000);
  assert.equal(guessPriceUsd("Precio: US$ 95.500"), 95500);
  assert.equal(guessPriceUsd("Oportunidad: $ 80.000"), 80000);
});

test("guessAmbientesFromText extrae cantidad de ambientes correctamente", () => {
  assert.equal(guessAmbientesFromText("Hermoso 3 ambientes con balcón"), 3);
  assert.equal(guessAmbientesFromText("Semipiso 4 amb al frente"), 4);
  assert.equal(guessAmbientesFromText("Sin mención de distribución"), null);
  // Si hay números contradictorios, se abstiene por seguridad
  assert.equal(guessAmbientesFromText("2 ambientes o 3 ambientes"), null);
});

test("guessSuperficieFromText extrae m2 y m²", () => {
  assert.equal(guessSuperficieFromText("Superficie total 84 m2 cubiertos"), 84);
  assert.equal(guessSuperficieFromText("Excelente lote 250 m²"), 250);
  assert.equal(guessSuperficieFromText("No especifica medidas"), null);
});

test("parseListingText combina precio, ambientes, superficie y zona conocida", () => {
  const description = `
    OPORTUNIDAD EN PALERMO SOHO
    Hermoso departamento de 3 ambientes, 75 m² totales.
    Living comedor, balcón aterrazado, cocina equipada.
    Expensas: $ 45.000
    Precio de venta: USD 165.000
  `;
  const knownZones = ["Palermo", "Belgrano", "Caballito"];

  const res = parseListingText(description, knownZones);
  assert.equal(res.priceUsd, 165000);
  assert.equal(res.ambientes, 3);
  assert.equal(res.superficieM2, 75);
  assert.equal(res.zone, "Palermo");
});
