const PLACEHOLDER_ORIGIN = "https://micaso.invalid";

/** El destino de un `?next=` solo si es una ruta de este mismo sitio —
 * si no, `fallback`. SEP23-07 (AUDITORIA-2026-09-23.md): `new URL(next,
 * request.url)` con `next=https://evil.com` o `//evil.com` resolvía a
 * otro dominio, y un link `micaso.com.ar/login?next=…` le servía a un
 * phishing para mandar a la familia, ya logueada, a una página falsa.
 *
 * Resuelve la URL y compara el origen en vez de mirar cómo empieza el
 * string: el parser de URLs del navegador saca tabs y saltos de línea y
 * trata `\` como `/`, así que `/\t/evil.com` o `/\evil.com` también
 * terminan en otro dominio aunque empiecen con una sola barra. Sin
 * dependencias de Node: lo usan proxy.ts y componentes del cliente. */
export function safeNextPath(next: string | null | undefined, fallback: string): string {
  if (!next) return fallback;
  let url: URL;
  try {
    url = new URL(next, PLACEHOLDER_ORIGIN);
  } catch {
    return fallback;
  }
  if (url.origin !== PLACEHOLDER_ORIGIN) return fallback;
  return url.pathname + url.search + url.hash;
}
