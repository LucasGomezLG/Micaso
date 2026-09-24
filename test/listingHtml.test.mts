// Cubre lib/listingHtml.ts: lo que /api/scrape saca del HTML de un aviso.
// SEP23-17 (AUDITORIA-2026-09-23.md): las regex anteriores tardaban tiempo
// cuadrático con HTML armado a propósito (273KB ya eran 5,8 s en una
// sola regex, y el scraper acepta hasta 3MB). El parseo nuevo recorre el
// HTML una sola vez — los tests de tiempo de abajo, con 1MB armado para
// cada uno de los patrones viejos, tardaban minutos contra el código
// anterior.
import { test } from "node:test";
import assert from "node:assert/strict";

const { parseListingHtml } = await import("../lib/listingHtml");

test("og: título, descripción y fotos, con el valor antes o después del atributo", () => {
  const html = `<head><title>Portal</title>
    <meta property="og:title" content="Casa 4 ambientes en Castelar &amp; jardín">
    <meta content="Hermosa casa, 180 m2 cubiertos" property="og:description"/>
    <meta property="og:image" content="https://cdn.x/1.jpg">
    <meta property='og:image' content='https://cdn.x/2.jpg'>
    <meta name="twitter:image" content="https://cdn.x/tw.jpg">
  </head>`;
  const guess = parseListingHtml(html);
  assert.equal(guess.title, "Casa 4 ambientes en Castelar & jardín");
  assert.equal(guess.description, "Hermosa casa, 180 m2 cubiertos");
  assert.deepEqual(guess.images, ["https://cdn.x/1.jpg", "https://cdn.x/2.jpg", "https://cdn.x/tw.jpg"]);
  assert.equal(guess.ambientes, 4);
  assert.equal(guess.superficieM2, 180);
});

test("JSON-LD: saltea el bloque inválido y lee precio, ambientes, superficie y dirección", () => {
  const html = `<script type="application/ld+json">{no es json</script>
    <script type='application/ld+json'>{"image":["https://r.com/1.jpg"],"offers":{"price":"210000","priceCurrency":"USD"},
    "numberOfRooms":{"value":5},"floorSize":"220","address":{"streetAddress":"Av. Rivadavia 1234"}}</script>`;
  const guess = parseListingHtml(html);
  assert.deepEqual(guess.images, ["https://r.com/1.jpg"]);
  assert.equal(guess.priceUsd, 210000);
  assert.equal(guess.ambientes, 5);
  assert.equal(guess.superficieM2, 220);
  assert.equal(guess.address, "Av. Rivadavia 1234");
});

test("microdata, preload de MercadoLibre y <title> como último recurso", () => {
  const html = `<head><title>Depto en Palermo</title>
    <link rel="preload" as="image" href="https://http2.mlstatic.com/D_1.jpg"><link rel="preload" as="font" href="f.woff2">
    </head><div><span itemprop="priceCurrency" content="USD"></span><span itemprop="price" content="150000"></span>
    <img src="https://m.com/g.jpg" itemprop="image"><span itemprop="streetAddress" content=" Calle Falsa 123 "></span></div>`;
  const guess = parseListingHtml(html);
  assert.equal(guess.title, "Depto en Palermo");
  assert.equal(guess.priceUsd, 150000);
  assert.deepEqual(guess.images, ["https://m.com/g.jpg", "https://http2.mlstatic.com/D_1.jpg"]);
  assert.equal(guess.address, "Calle Falsa 123");
});

test("sin nada reconocible devuelve todo vacío", () => {
  assert.deepEqual(parseListingHtml("<html><body>hola</body></html>"), {
    title: null,
    description: null,
    images: [],
    priceUsd: null,
    ambientes: null,
    superficieM2: null,
    address: null,
  });
});

// Holgado a propósito para no fallar en una máquina lenta: el parseo
// lineal tarda unos pocos ms, el anterior tardaba minutos.
const MAX_MS = 500;
const ONE_MB = 1024 * 1024;

function crafted(unit: string): string {
  return unit.repeat(Math.ceil(ONE_MB / unit.length));
}

for (const [name, html] of [
  ["aperturas <meta sin >", crafted('<meta property="og:image" ')],
  ["aperturas <link sin >", crafted('<link rel="preload" as="image" ')],
  ["itemprop en tags sin cerrar", crafted('<a itemprop="image" ')],
  ["JSON-LD sin </script>", crafted('<script type="application/ld+json">{')],
  ["<title> sin cierre", crafted("<title>a")],
  ["un solo tag gigante con comillas sin cerrar", `<meta ${crafted(`a="b c='d `)}>`],
  ['"price" embebido repetido', crafted(' "price": 12345 USD')],
] as const) {
  test(`SEP23-17: 1MB armado (${name}) se parsea en menos de ${MAX_MS} ms`, () => {
    const start = performance.now();
    parseListingHtml(html);
    const elapsed = performance.now() - start;
    assert.ok(elapsed < MAX_MS, `tardó ${elapsed.toFixed(0)} ms`);
  });
}
