import { NextRequest, NextResponse } from "next/server";
import { isSafeExternalUrl } from "@/lib/url-safety";

function extractMeta(html: string, property: string): string | null {
  return extractMetaAll(html, property)[0] ?? null;
}

/** Some sites emit one <meta property="og:image"> per photo instead of
 * just a cover image — collect every match, not just the first. */
function extractMetaAll(html: string, property: string): string[] {
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']*)["']`, "gi"),
    new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]+property=["']${property}["']`, "gi"),
    new RegExp(`<meta[^>]+name=["']${property}["'][^>]+content=["']([^"']*)["']`, "gi"),
  ];
  const found: string[] = [];
  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) found.push(decodeHtmlEntities(match[1]));
  }
  return found;
}

/** MercadoLibre (and others using the same preload pattern) list the
 * listing's photos as <link rel="preload" as="image"> tags even when
 * there's no matching og:image at all. */
function extractPreloadImages(html: string): string[] {
  const found: string[] = [];
  for (const match of html.matchAll(/<link[^>]+rel=["']preload["'][^>]+as=["']image["'][^>]+href=["']([^"']+)["']/gi)) {
    found.push(decodeHtmlEntities(match[1]));
  }
  return found;
}

/** Algunos sitios inmobiliarios todavía usan microdata de schema.org
 * (`itemprop="image"`, `itemprop="price"`) en vez de o además de
 * JSON-LD — mismo truco que `extractMetaAll`: el atributo puede venir
 * antes o después del valor según el sitio. */
function extractItemprop(html: string, prop: string): string[] {
  const patterns = [
    new RegExp(`<[^>]+itemprop=["']${prop}["'][^>]*(?:content|src|href)=["']([^"']*)["']`, "gi"),
    new RegExp(`<[^>]+(?:content|src|href)=["']([^"']*)["'][^>]*itemprop=["']${prop}["']`, "gi"),
  ];
  const found: string[] = [];
  for (const pattern of patterns) {
    for (const match of html.matchAll(pattern)) found.push(decodeHtmlEntities(match[1]));
  }
  return found;
}

/** Mismo criterio de cautela que `guessFromJsonLd`: solo confiar en el
 * precio si el propio microdata dice que la moneda es USD, no adivinar. */
function guessPriceFromMicrodata(html: string): number | null {
  const currencies = extractItemprop(html, "priceCurrency");
  if (!currencies.some((c) => c.toUpperCase() === "USD")) return null;
  const value = extractItemprop(html, "price")
    .map(Number)
    .find((n) => !Number.isNaN(n) && n > 1000);
  return value ?? null;
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

type JsonLdGuess = {
  images: string[];
  priceUsd: number | null;
  ambientes: number | null;
  superficieM2: number | null;
};

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
function guessFromJsonLd(html: string): JsonLdGuess {
  const blocks = html.matchAll(
    /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi
  );
  for (const block of blocks) {
    try {
      const data = JSON.parse(block[1]);
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
        if (images.length || priceUsd || ambientes || superficieM2) {
          return { images, priceUsd, ambientes, superficieM2 };
        }
      }
    } catch {
      // not valid JSON, or not the shape we expect — skip this block
    }
  }
  return { images: [], priceUsd: null, ambientes: null, superficieM2: null };
}

/** Busca "N ambientes"/"N amb" en el título o la descripción del aviso —
 * cubre los sitios que no traen `numberOfRooms` en JSON-LD, que en avisos
 * argentinos son la mayoría. Un solo número esperado; si el texto trae
 * más de una mención y no coinciden, mejor abstenerse que adivinar mal
 * (mismo criterio que `guessPriceFromEmbeddedJson`). */
function guessAmbientesFromText(...texts: (string | null)[]): number | null {
  const found = new Set<number>();
  for (const text of texts) {
    if (!text) continue;
    for (const match of text.matchAll(/(\d{1,2})\s*amb(?:iente)?s?\b/gi)) {
      found.add(Number(match[1]));
    }
  }
  return found.size === 1 ? [...found][0] : null;
}

/** Mismo criterio que `guessAmbientesFromText`, para "NNN m2"/"NNN m²". */
function guessSuperficieFromText(...texts: (string | null)[]): number | null {
  const found = new Set<number>();
  for (const text of texts) {
    if (!text) continue;
    for (const match of text.matchAll(/(\d{2,4})\s*m(?:2|²)\b/gi)) {
      found.add(Number(match[1]));
    }
  }
  return found.size === 1 ? [...found][0] : null;
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

function guessPriceUsd(...texts: (string | null)[]): number | null {
  for (const text of texts) {
    if (!text) continue;
    // Soporta USD, US$, U$S, U$D y como último recurso $ si no hay símbolo de dólar explícito
    const match = text.match(/(?:USD|US\$|U\$S|U\$D|\$)\s?([\d.,]{4,})/i);
    if (match) {
      const digits = match[1].replace(/[.,](?=\d{3}\b)/g, "").replace(",", ".");
      const value = parseFloat(digits);
      if (!Number.isNaN(value) && value > 1000) return Math.round(value);
    }
  }
  return null;
}

/** Sitios/rutas donde no se autocompleta porque el sitio no lo permite
 * (robots.txt o términos de uso) — verificado 15 sept 2026, ver
 * ARQUITECTURA.md sección 9. El link se sigue pegando y guardando tal
 * cual (eso no es scraping, es solo un texto que un humano ya
 * compartió); lo que se corta es el fetch automático para sacar
 * título/foto/precio.
 * - MercadoLibre: términos de uso art. 12 — prohíbe cualquier acceso
 *   automatizado al sitio sin importar el User-Agent, no es solo el
 *   robots.txt (que además bloquea por nombre a los bots de IA).
 * - ArgenProp: términos de uso art. 26.3 — nombra "scraping"
 *   explícitamente como uso prohibido del sitio.
 * - Mudafy: `robots.txt` prohíbe crawlear `/ficha/*` para cualquier
 *   bot; el resto del sitio (ej. `/casas/*`) no está vedado.
 * - ZonaProp: términos y condiciones de uso, cláusulas 1.5.4 y 1.3.2
 *   (verificado 18 sept 2026, ver ARQUITECTURA.md sección 9) — prohíben
 *   "el uso... de cualquier máquina, software, herramienta, agente u
 *   otro mecanismo para navegar o buscar en este Sitio Web" que no sea
 *   su propio buscador, y por separado "la reproducción y/o
 *   comercialización no autorizada del Contenido" (texto, imágenes). */
function isBlockedForAutoFill(url: URL): boolean {
  const host = url.hostname.toLowerCase();
  if (/(^|\.)mercadolibre\.com\.ar$/.test(host)) return true;
  if (/(^|\.)argenprop\.com$/.test(host)) return true;
  if (/(^|\.)mudafy\.com\.ar$/.test(host) && url.pathname.startsWith("/ficha/")) return true;
  if (/(^|\.)zonaprop\.com\.ar$/.test(host)) return true;
  return false;
}

type SlugGuess = { titleGuess: string | null; ambientes: number | null };

/** Para un sitio bloqueado, lo único que se puede sacar sin pedirle nada
 * a su servidor es el texto que el propio sitio ya metió en la URL como
 * slug SEO — parsear ESE string no es "acceso automatizado al sitio" en
 * ningún sentido: es leer un texto que el usuario ya pegó en el input,
 * igual que si lo hubiera tipeado él mismo pero más rápido. Los tres
 * portales bloqueados meten título (y a veces ambientes) ahí; probado a
 * mano contra avisos reales de los tres (18 sept 2026, ver
 * ARQUITECTURA.md sección 9). */
function guessFromBlockedUrlSlug(url: URL): SlugGuess {
  const host = url.hostname.toLowerCase();
  let slug = url.pathname.replace(/\.html$/i, "");

  // Mudafy a veces termina el slug con un hash en vez de un ID numérico
  // (ej. /ficha/propiedad/<slug>/01196e6407cce600705f8e45aa08625b).
  slug = slug.replace(/\/[0-9a-f]{16,}$/i, "");

  if (/(^|\.)mercadolibre\.com\.ar$/.test(host)) {
    // MLA-<id>-<slug>-_JM
    slug = slug.replace(/^\/?MLA-\d+-/i, "/").replace(/-_JM$/i, "");
  } else {
    if (/(^|\.)zonaprop\.com\.ar$/.test(host)) {
      slug = slug.replace(/^\/?propiedades\/clasificado\//i, "/");
    }
    if (/(^|\.)mudafy\.com\.ar$/.test(host)) {
      slug = slug.replace(/^\/?ficha\/propiedad\//i, "/");
    }
    // ArgenProp y ZonaProp terminan el slug con el ID del aviso.
    slug = slug.replace(/-{1,2}\d+$/i, "");
  }

  const words = slug.replace(/^\/+|\/+$/g, "").split(/[-/]+/).filter(Boolean);
  if (words.length === 0) return { titleGuess: null, ambientes: null };

  const ambientesMatch = words.join(" ").match(/(\d{1,2})\s*amb/i);
  const ambientes = ambientesMatch ? Number(ambientesMatch[1]) : null;

  const joined = words.join(" ");
  const titleGuess = joined.charAt(0).toUpperCase() + joined.slice(1);

  return { titleGuess, ambientes };
}

function blockedAutoFillResponse(blockedUrl: URL) {
  const guess = guessFromBlockedUrlSlug(blockedUrl);
  return {
    title: guess.titleGuess,
    images: [],
    description: null,
    priceUsd: null,
    ambientes: guess.ambientes,
    superficieM2: null,
    notice:
      "Este sitio no permite autocompletar foto ni precio — completamos lo que pudimos sacar del link, cargá el resto a mano.",
  };
}

/** RE/MAX (`robots.txt`, `User-agent: *`) prohíbe crawlear cualquier URL
 * con el parámetro `associate` — es el ID del agente que comparte el
 * link, no cambia el contenido del aviso, así que sacarlo antes de
 * pedir la página no pierde nada y deja de pisar esa regla. */
function stripDisallowedQuery(url: URL): URL {
  if (!/(^|\.)remax\.com\.ar$/i.test(url.hostname)) return url;
  const cleaned = new URL(url);
  cleaned.searchParams.delete("associate");
  return cleaned;
}

const USER_AGENTS = [
  // Most sites special-case this UA to serve a full page for link previews.
  "Mozilla/5.0 (compatible; facebookexternalhit/1.1; +http://www.facebook.com/externalhit_uatext.php)",
  // Some sites do the opposite and block known crawler UAs — a plain
  // desktop browser UA gets through those.
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
];

const MAX_REDIRECT_HOPS = 5;

/** Sigue redirects a mano (`redirect: "manual"`) en vez de dejar que
 * `fetch` los siga solo — un acortador (share.google, bit.ly, o
 * cualquier otro) que apunte a un sitio bloqueado terminaría trayendo su
 * contenido igual si se dejara al fetch nativo resolver la cadena entera
 * antes de mirar el resultado. Acá se chequea `isBlockedForAutoFill` en
 * cada hop ANTES de pedirlo, así nunca se le manda un request al sitio
 * bloqueado, ni siquiera para descartar la respuesta después (encontrado
 * probando con un link acortado apuntando a MercadoLibre, 18 sept
 * 2026 — ver ARQUITECTURA.md sección 9). */
async function fetchHtml(
  startUrl: URL
): Promise<{ html: string } | { error: string } | { blockedUrl: URL }> {
  let current = startUrl;
  for (let hop = 0; hop < MAX_REDIRECT_HOPS; hop++) {
    if (!isSafeExternalUrl(current)) return { error: "Host no permitido" };
    if (isBlockedForAutoFill(current)) return { blockedUrl: current };

    const fetchTarget = stripDisallowedQuery(current).toString();
    let lastStatus: number | null = null;
    let nextHop: URL | null = null;
    for (const userAgent of USER_AGENTS) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);
        const res = await fetch(fetchTarget, {
          signal: controller.signal,
          redirect: "manual",
          headers: { "User-Agent": userAgent, Accept: "text/html" },
        });
        clearTimeout(timeout);
        if (res.status >= 300 && res.status < 400) {
          const location = res.headers.get("location");
          if (location) {
            nextHop = new URL(location, fetchTarget);
            break;
          }
        }
        if (res.ok) return { html: await res.text() };
        lastStatus = res.status;
      } catch {
        // network error/timeout — try the next user agent
      }
    }
    if (nextHop) {
      current = nextHop;
      continue;
    }
    return {
      error: lastStatus
        ? `El sitio respondió ${lastStatus}`
        : "No se pudo leer el link (puede bloquear bots).",
    };
  }
  return { error: "Demasiados redirects." };
}

export async function POST(request: NextRequest) {
  let url: unknown;
  try {
    ({ url } = await request.json());
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "Falta la URL" }, { status: 400 });
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
    if (!isSafeExternalUrl(parsed)) {
      return NextResponse.json({ error: "Host no permitido" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "URL inválida" }, { status: 400 });
  }
  if (isBlockedForAutoFill(parsed)) {
    return NextResponse.json(blockedAutoFillResponse(parsed));
  }

  try {
    const fetched = await fetchHtml(parsed);
    if ("error" in fetched) {
      return NextResponse.json({ error: fetched.error }, { status: 200 });
    }
    if ("blockedUrl" in fetched) {
      return NextResponse.json(blockedAutoFillResponse(fetched.blockedUrl));
    }
    const html = fetched.html;
    const title =
      extractMeta(html, "og:title") ||
      html.match(/<title>([^<]*)<\/title>/i)?.[1] ||
      null;
    const description = extractMeta(html, "og:description");
    const jsonLd = guessFromJsonLd(html);
    const images = [
      ...new Set([
        ...extractMetaAll(html, "og:image"),
        ...extractMetaAll(html, "twitter:image"),
        ...jsonLd.images,
        ...extractItemprop(html, "image"),
        ...extractPreloadImages(html),
      ]),
    ].slice(0, 8);
    const priceUsd =
      jsonLd.priceUsd ??
      guessPriceFromMicrodata(html) ??
      guessPriceUsd(title, description) ??
      guessPriceFromEmbeddedJson(html);
    const ambientes = jsonLd.ambientes ?? guessAmbientesFromText(title, description);
    const superficieM2 = jsonLd.superficieM2 ?? guessSuperficieFromText(title, description);

    return NextResponse.json({
      title: title ? decodeHtmlEntities(title).trim() : null,
      images,
      description,
      priceUsd,
      ambientes,
      superficieM2,
    });
  } catch {
    return NextResponse.json(
      { error: "No se pudo leer el link (puede bloquear bots)." },
      { status: 200 }
    );
  }
}
