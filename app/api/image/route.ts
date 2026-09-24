import { NextRequest } from "next/server";
import { getCurrentAdminEmail } from "@/lib/brokers";
import { checkAndConsumeQuota } from "@/lib/rateLimit";
import { DEMO_CASE_ID } from "@/lib/seed";
import { getCaseIdFromRequest } from "@/lib/session";
import { getHouses } from "@/lib/store";
import { fetchFollowingSafeRedirects, isSafeExternalUrl } from "@/lib/url-safety";

// Las fotos del demo, en memoria de la instancia por un minuto: una página
// del demo pide ~40 fotos, y leer todas sus casas de Redis por cada una
// era trabajo repetido en la ruta más pública. Un minuto alcanza para que
// un cambio de Lucas en el demo se vea enseguida.
const DEMO_PHOTOS_TTL_MS = 60_000;
let demoPhotos: { urls: Set<string>; loadedAt: number } | null = null;

async function getDemoPhotos(): Promise<Set<string>> {
  if (!demoPhotos || Date.now() - demoPhotos.loadedAt > DEMO_PHOTOS_TTL_MS) {
    const houses = await getHouses(DEMO_CASE_ID);
    demoPhotos = { urls: new Set(houses.flatMap((h) => h.images)), loadedAt: Date.now() };
  }
  return demoPhotos.urls;
}

// Proxy property photos through our own server: several listing sites
// (ArgenProp, etc.) hotlink-protect their CDN and 403 an <img> requested
// directly from a different domain, but allow it when the request's
// Referer matches their own site — which only a server-side fetch can set.
export async function GET(request: NextRequest) {
  const target = request.nextUrl.searchParams.get("u");
  if (!target) return new Response("Falta el parámetro u", { status: 400 });

  let url: URL;
  try {
    url = new URL(target);
  } catch {
    return new Response("URL inválida", { status: 400 });
  }
  // Chequeo barato primero; la resolución DNS la hace
  // fetchFollowingSafeRedirects en cada salto, recién después de la cuota
  // (si no, una sesión rechazada igual disparaba una consulta DNS a
  // cualquier host).
  if (!isSafeExternalUrl(url)) {
    return new Response("Host no permitido", { status: 400 });
  }

  // SEP23-03 (AUDITORIA-2026-09-23.md): la sesión del demo es pública
  // (/api/demo-access), así que sin esto cualquiera podía usar
  // micaso.com.ar como proxy de cualquier imagen. El demo no puede cargar
  // casas, así que solo necesita las fotos de las casas que ya tiene
  // (salvo Lucas, que lo edita y ve la vista previa de fotos todavía no
  // guardadas). El resto de los casos sí necesita fotos que todavía no
  // están guardadas (la vista previa de "Agregar casa"), así que ahí va
  // una cuota por caso, holgada para una lista larga de casas.
  const caseId = getCaseIdFromRequest(request);
  if (caseId === DEMO_CASE_ID) {
    if (!(await getDemoPhotos()).has(target) && !(await getCurrentAdminEmail())) {
      return new Response("Imagen no permitida", { status: 403 });
    }
  } else if (!(await checkAndConsumeQuota("image", caseId, 600, 5 * 60))) {
    return new Response("Demasiadas imágenes en poco tiempo", { status: 429 });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetchFollowingSafeRedirects(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "MicasoBot/1.0 (+https://www.micaso.com.ar/bot; luccaass96@gmail.com)",
        Accept: "image/*",
      },
    });
    clearTimeout(timeout);

    if (!res || !res.ok || !res.body) {
      return new Response("No se pudo obtener la imagen", { status: 502 });
    }

    const contentType = (res.headers.get("content-type") || "image/jpeg").toLowerCase();
    // Bloquear SVGs y HTML para evitar inyección de scripts/XSS en el dominio
    if (!contentType.startsWith("image/") || contentType.includes("svg") || contentType.includes("html")) {
      return new Response("Tipo de imagen no permitido", { status: 400 });
    }

    return new Response(res.body, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'",
      },
    });
  } catch {
    return new Response("No se pudo obtener la imagen", { status: 502 });
  }
}
