import { NextRequest, NextResponse } from "next/server";
import { isSafeExternalUrl, isSafeResolvedUrl } from "@/lib/url-safety";
import { parseListingHtml } from "@/lib/listingHtml";
import { checkAndConsumeQuota } from "@/lib/rateLimit";
import { getCaseIdFromRequest } from "@/lib/session";
import { parseJsonBody, scrapeRequestSchema } from "@/lib/schemas";

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
    address: null,
    blocked: true,
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
  "MicasoBot/1.0 (+https://www.micaso.com.ar/bot; luccaass96@gmail.com)",
];

const MAX_REDIRECT_HOPS = 5;
const MAX_BODY_BYTES = 3 * 1024 * 1024; // 3MB — un aviso inmobiliario normal pesa una fracción de esto

/** Lee el body con un tope de bytes duro, sin soltar el AbortController
 * hasta terminar — antes `clearTimeout(timeout)` se ejecutaba apenas
 * llegaban los headers, así que un sitio lento (o malicioso) podía
 * mandar el body a cuentagotas indefinidamente sin que ningún timeout lo
 * cortara (slow-read / Slowloris), y sin límite de tamaño un body
 * gigante podía agotar la memoria de la función serverless. */
async function readLimitedBody(res: Response, controller: AbortController): Promise<string> {
  if (!res.body) return "";
  const reader = res.body.getReader();
  const decoder = new TextDecoder("utf-8");
  let total = 0;
  let text = "";
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BODY_BYTES) {
        controller.abort();
        throw new Error("Respuesta demasiado pesada");
      }
      text += decoder.decode(value, { stream: true });
    }
  } finally {
    reader.releaseLock();
  }
  return text + decoder.decode();
}

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
    if (!(await isSafeResolvedUrl(current))) return { error: "Host no permitido" };
    if (isBlockedForAutoFill(current)) return { blockedUrl: current };

    const fetchTarget = stripDisallowedQuery(current).toString();
    let lastStatus: number | null = null;
    let nextHop: URL | null = null;
    for (const userAgent of USER_AGENTS) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 8000);
      try {
        const res = await fetch(fetchTarget, {
          signal: controller.signal,
          redirect: "manual",
          headers: { "User-Agent": userAgent, Accept: "text/html" },
        });
        if (res.status >= 300 && res.status < 400) {
          const location = res.headers.get("location");
          if (location) {
            nextHop = new URL(location, fetchTarget);
            break;
          }
        }
        if (res.ok) return { html: await readLimitedBody(res, controller) };
        lastStatus = res.status;
      } catch {
        // network error/timeout — try the next user agent
      } finally {
        clearTimeout(timeout);
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
  const caseId = getCaseIdFromRequest(request);
  const withinQuota = await checkAndConsumeQuota("scrape", caseId, 40, 5 * 60);
  if (!withinQuota) {
    return NextResponse.json(
      { error: "Demasiados links pegados en poco tiempo — probá de nuevo en unos minutos." },
      { status: 429 }
    );
  }

  const parsedBody = await parseJsonBody(request, scrapeRequestSchema);
  if ("error" in parsedBody) return parsedBody.error;
  const { url } = parsedBody.data;

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
      return NextResponse.json({ error: fetched.error }, { status: 502 });
    }
    if ("blockedUrl" in fetched) {
      return NextResponse.json(blockedAutoFillResponse(fetched.blockedUrl));
    }
    // Parseo en tiempo lineal — ver lib/listingHtml.ts (SEP23-17).
    return NextResponse.json(parseListingHtml(fetched.html));
  } catch {
    return NextResponse.json(
      { error: "No se pudo leer el link (puede bloquear bots)." },
      { status: 502 }
    );
  }
}
