import { guessAmbientesFromText, guessPriceUsd, guessSuperficieFromText } from "./listingText";

/** Lo que /api/scrape saca del HTML de un aviso para autocompletar el
 * alta de una casa. Vive acá y no en la ruta para poder probarlo solo
 * (test/listingHtml.test.mts) — un route.ts de Next.js solo puede
 * exportar los handlers.
 *
 * SEP23-17 (AUDITORIA-2026-09-23.md): antes esto eran regex del estilo
 * `<meta[^>]+property=…[^>]+content=…` sobre el HTML entero, que tardan
 * tiempo cuadrático con HTML armado a propósito (muchas aperturas `<meta`
 * sin `>`, o un JSON-LD sin `</script>`): 273KB ya eran 5,8 s en una sola
 * regex, y el HTML lo controla quien pega el link. Ahora los tags se
 * recorren con `indexOf` en una sola pasada — cada búsqueda arranca
 * donde terminó el tag anterior, nunca vuelve para atrás — y los
 * atributos se leen tag por tag. Tiempo lineal en el tamaño del HTML. */
export type ListingGuess = {
  title: string | null;
  description: string | null;
  images: string[];
  priceUsd: number | null;
  ambientes: number | null;
  superficieM2: number | null;
  address: string | null;
};

type Doc = {
  html: string;
  /** Mismo largo que `html` (solo pasa a minúscula A-Z), así los índices
   * que da `indexOf` sobre esto valen igual para `html`. `toLowerCase()`
   * no sirve: algunos caracteres Unicode cambian de largo al pasar a
   * minúscula y corren todos los índices. */
  lower: string;
};

function toDoc(html: string): Doc {
  return { html, lower: html.replace(/[A-Z]+/g, (s) => s.toLowerCase()) };
}

/** Atributos de un tag (el texto entre el nombre y el `>`), con el nombre
 * en minúscula. Valores entre comillas dobles, simples o sin comillas;
 * si un atributo se repite, gana el primero, como en el navegador. */
function parseAttributes(source: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  for (const m of source.matchAll(/([^\s"'<>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g)) {
    const name = m[1].toLowerCase();
    if (!(name in attrs)) attrs[name] = m[2] ?? m[3] ?? m[4] ?? "";
  }
  return attrs;
}

function isTagNameEnd(code: number): boolean {
  // espacio, tab, salto de línea, `/`, `>` — o el final del string (NaN)
  return Number.isNaN(code) || code === 0x20 || code === 0x09 || code === 0x0a || code === 0x0d || code === 0x0c || code === 0x2f || code === 0x3e;
}

/** Los tags `<name …>` en orden de aparición, desde el índice `from`. Un
 * tag sin `>` corta la búsqueda: no hay más tags completos después. */
function* openingTags(
  doc: Doc,
  name: string,
  from = 0
): Generator<{ attrs: Record<string, string>; end: number }> {
  const needle = "<" + name;
  for (;;) {
    const start = doc.lower.indexOf(needle, from);
    if (start === -1) return;
    // `<meta` tiene que ser el nombre entero, no el principio de `<metadata`.
    if (!isTagNameEnd(doc.lower.charCodeAt(start + needle.length))) {
      from = start + needle.length;
      continue;
    }
    const end = doc.html.indexOf(">", start);
    if (end === -1) return;
    yield { attrs: parseAttributes(doc.html.slice(start + needle.length, end)), end };
    from = end + 1;
  }
}

/** Todos los tags que tienen un atributo `itemprop`, sea cual sea su
 * nombre (`<span>`, `<img>`, `<meta>`...). */
function* tagsWithItemprop(doc: Doc): Generator<Record<string, string>> {
  let from = 0;
  for (;;) {
    const start = doc.html.indexOf("<", from);
    if (start === -1) return;
    const end = doc.html.indexOf(">", start);
    if (end === -1) return;
    // Mirar solo adentro del tag: un indexOf/lastIndexOf sobre el
    // documento entero puede recorrerlo completo por cada tag.
    if (doc.lower.slice(start + 1, end).includes("itemprop")) {
      yield parseAttributes(doc.html.slice(start + 1, end));
    }
    from = end + 1;
  }
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

/** Some sites emit one <meta property="og:image"> per photo instead of
 * just a cover image — collect every match, not just the first. Acepta
 * `property=` o `name=`, con el valor antes o después de `content=`. */
function extractMetaAll(doc: Doc, property: string): string[] {
  const found: string[] = [];
  for (const { attrs } of openingTags(doc, "meta")) {
    const matches = attrs.property?.toLowerCase() === property || attrs.name?.toLowerCase() === property;
    if (matches && attrs.content) found.push(decodeHtmlEntities(attrs.content));
  }
  return found;
}

function extractMeta(doc: Doc, property: string): string | null {
  return extractMetaAll(doc, property)[0] ?? null;
}

/** MercadoLibre (and others using the same preload pattern) list the
 * listing's photos as <link rel="preload" as="image"> tags even when
 * there's no matching og:image at all. */
function extractPreloadImages(doc: Doc): string[] {
  const found: string[] = [];
  for (const { attrs } of openingTags(doc, "link")) {
    if (attrs.rel?.toLowerCase() === "preload" && attrs.as?.toLowerCase() === "image" && attrs.href) {
      found.push(decodeHtmlEntities(attrs.href));
    }
  }
  return found;
}

/** Algunos sitios inmobiliarios todavía usan microdata de schema.org
 * (`itemprop="image"`, `itemprop="price"`) en vez de o además de
 * JSON-LD — el valor puede venir en `content`, `src` o `href`. */
function extractItemprop(doc: Doc, prop: string): string[] {
  const found: string[] = [];
  const wanted = prop.toLowerCase();
  for (const attrs of tagsWithItemprop(doc)) {
    if (attrs.itemprop?.toLowerCase() !== wanted) continue;
    const value = attrs.content ?? attrs.src ?? attrs.href;
    if (value !== undefined) found.push(decodeHtmlEntities(value));
  }
  return found;
}

/** Mismo criterio de cautela que `guessFromJsonLd`: solo confiar en el
 * precio si el propio microdata dice que la moneda es USD, no adivinar. */
function guessPriceFromMicrodata(doc: Doc): number | null {
  const currencies = extractItemprop(doc, "priceCurrency");
  if (!currencies.some((c) => c.toUpperCase() === "USD")) return null;
  const value = extractItemprop(doc, "price")
    .map(Number)
    .find((n) => !Number.isNaN(n) && n > 1000);
  return value ?? null;
}

/** El contenido de cada `<script type="application/ld+json">`. Un bloque
 * sin `</script>` corta la búsqueda (antes, `[\s\S]*?<\/script>` volvía
 * a recorrer hasta el final desde cada apertura). */
function* jsonLdBlocks(doc: Doc): Generator<string> {
  let from = 0;
  for (;;) {
    let tagEnd = -1;
    for (const tag of openingTags(doc, "script", from)) {
      if (tag.attrs.type?.trim().toLowerCase() === "application/ld+json") {
        tagEnd = tag.end;
        break;
      }
    }
    if (tagEnd === -1) return;
    const close = doc.lower.indexOf("</script", tagEnd + 1);
    if (close === -1) return;
    yield doc.html.slice(tagEnd + 1, close);
    from = close + "</script".length;
  }
}

type JsonLdGuess = {
  images: string[];
  priceUsd: number | null;
  ambientes: number | null;
  superficieM2: number | null;
  address: string | null;
};

/** schema.org da la dirección como string plano o como
 * `PostalAddress.streetAddress` — mismo criterio que
 * `numberFromQuantitativeValue` para las dos formas posibles. */
function addressFromJsonLdAddress(raw: unknown): string | null {
  if (typeof raw === "string") return raw.trim() || null;
  if (raw && typeof raw === "object") {
    const streetAddress = (raw as { streetAddress?: unknown }).streetAddress;
    if (typeof streetAddress === "string" && streetAddress.trim()) return streetAddress.trim();
  }
  return null;
}

/** schema.org a veces da `floorSize`/`numberOfRooms` como número/string
 * plano y a veces como `{ "@type": "QuantitativeValue", "value": N }` —
 * misma pinta en ambos casos, así que un solo helper alcanza. */
function numberFromQuantitativeValue(raw: unknown): number | null {
  if (typeof raw === "number") return raw;
  if (typeof raw === "string") {
    const n = Number(raw);
    return Number.isNaN(n) ? null : n;
  }
  if (raw && typeof raw === "object" && "value" in raw) {
    return numberFromQuantitativeValue((raw as { value: unknown }).value);
  }
  return null;
}

/** Some sites (MercadoLibre, etc.) skip og:image but still ship schema.org
 * JSON-LD with an image/offer/numberOfRooms/floorSize — read that as a
 * fallback for lo que no vino en meta tags ni en el texto visible. */
function guessFromJsonLd(doc: Doc): JsonLdGuess {
  for (const block of jsonLdBlocks(doc)) {
    try {
      const data = JSON.parse(block);
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        const rawImage = item?.image;
        const images = Array.isArray(rawImage)
          ? rawImage.filter((i): i is string => typeof i === "string")
          : typeof rawImage === "string"
            ? [rawImage]
            : rawImage?.url
              ? [rawImage.url]
              : [];
        const offer = Array.isArray(item?.offers) ? item.offers[0] : item?.offers;
        const priceUsd =
          offer?.priceCurrency === "USD" && offer?.price
            ? Number(offer.price)
            : null;
        const ambientes = numberFromQuantitativeValue(item?.numberOfRooms);
        const superficieM2 = numberFromQuantitativeValue(item?.floorSize);
        const address = addressFromJsonLdAddress(item?.address);
        if (images.length || priceUsd || ambientes || superficieM2 || address) {
          return { images, priceUsd, ambientes, superficieM2, address };
        }
      }
    } catch {
      // not valid JSON, or not the shape we expect — skip this block
    }
  }
  return { images: [], priceUsd: null, ambientes: null, superficieM2: null, address: null };
}

/** Some sites (RE/MAX, etc.) don't put the price in text or JSON-LD at
 * all — it's only in a client-hydration JSON blob embedded in the page,
 * e.g. `"price":100000,...,"currency":{"value":"USD"}`. Look for a bare
 * "price" key (not "expensesPrice" or similar) with USD mentioned
 * nearby, as a last-resort fallback.
 *
 * A page can embed more than one listing (a "similar properties"
 * carousel), so collect every match instead of trusting the first —
 * if they disagree, we can't tell which one is the actual listing, so
 * abstain rather than risk grabbing the wrong property's price. */
function guessPriceFromEmbeddedJson(html: string): number | null {
  const candidates = new Set<number>();
  for (const match of html.matchAll(/[^a-zA-Z"]"price"\s*:\s*(\d+)/g)) {
    const start = match.index ?? 0;
    const window = html.slice(start, start + 300);
    if (!/USD/i.test(window)) continue;
    const value = Number(match[1]);
    if (value > 1000) candidates.add(value);
  }
  return candidates.size === 1 ? [...candidates][0] : null;
}

/** El `<title>` del documento, como último recurso para el título. */
function extractTitleTag(doc: Doc): string | null {
  for (const { end } of openingTags(doc, "title")) {
    const close = doc.lower.indexOf("</title", end + 1);
    if (close === -1) return null;
    return doc.html.slice(end + 1, close);
  }
  return null;
}

export function parseListingHtml(html: string): ListingGuess {
  const doc = toDoc(html);
  const title = extractMeta(doc, "og:title") || extractTitleTag(doc) || null;
  const description = extractMeta(doc, "og:description");
  const jsonLd = guessFromJsonLd(doc);
  const images = [
    ...new Set([
      ...extractMetaAll(doc, "og:image"),
      ...extractMetaAll(doc, "twitter:image"),
      ...jsonLd.images,
      ...extractItemprop(doc, "image"),
      ...extractPreloadImages(doc),
    ]),
  ].slice(0, 8);
  const priceUsd =
    jsonLd.priceUsd ??
    guessPriceFromMicrodata(doc) ??
    guessPriceUsd(title, description) ??
    guessPriceFromEmbeddedJson(html);
  const ambientes = jsonLd.ambientes ?? guessAmbientesFromText(title, description);
  const superficieM2 = jsonLd.superficieM2 ?? guessSuperficieFromText(title, description);
  const address = jsonLd.address ?? extractItemprop(doc, "streetAddress")[0]?.trim() ?? null;

  return {
    title: title ? decodeHtmlEntities(title).trim() : null,
    description,
    images,
    priceUsd,
    ambientes,
    superficieM2,
    address: address || null,
  };
}
