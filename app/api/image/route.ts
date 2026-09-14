import { NextRequest } from "next/server";
import { isSafeExternalUrl } from "@/lib/url-safety";

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
  if (!isSafeExternalUrl(url)) {
    return new Response("Host no permitido", { status: 400 });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
        Referer: `${url.origin}/`,
        Accept: "image/*",
      },
    });
    clearTimeout(timeout);

    if (!res.ok || !res.body) {
      return new Response("No se pudo obtener la imagen", { status: 502 });
    }

    return new Response(res.body, {
      headers: {
        "Content-Type": res.headers.get("content-type") || "image/jpeg",
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    });
  } catch {
    return new Response("No se pudo obtener la imagen", { status: 502 });
  }
}
