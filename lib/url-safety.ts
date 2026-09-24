import dns from "dns/promises";
import net from "net";

const BLOCKED_HOSTS = /^(localhost|127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.|0\.0\.0\.0|^0$|\[::1\]|\[::\]|::)/i;

/** Reject internal/private targets before the server fetches a
 * user-supplied URL (scrape, image proxy) — basic SSRF guard on the
 * literal hostname/protocol. On its own this misses a domain that simply
 * *resolves* to a private IP (DNS rebinding, or a public-looking
 * shortener pointing at 169.254.169.254) and numeric IP formats other
 * than dotted-decimal (e.g. `http://2130706433/` == 127.0.0.1) — see
 * `isSafeResolvedUrl` below, which callers should use for the actual
 * fetch. This sync check stays as the cheap first filter (rejects
 * `file:`/`javascript:` etc. and obvious localhost typos before paying
 * for a DNS lookup). */
export function isSafeExternalUrl(url: URL): boolean {
  return /^https?:$/.test(url.protocol) && !BLOCKED_HOSTS.test(url.hostname);
}

/** Exportada solo para test/url-safety.test.mts — el sandbox donde corre
 * este repo no tiene salida de red real (ver ese archivo), así que la
 * única forma de probar de verdad esta clasificación es contra la
 * función pura, no contra un `fetch`/`dns.lookup` real. */
export function isPrivateIp(ip: string): boolean {
  if (!net.isIP(ip)) return true;

  if (net.isIPv4(ip)) {
    const parts = ip.split(".").map(Number);
    if (parts[0] === 0 || parts[0] === 127) return true; // "this network" / loopback
    if (parts[0] === 10) return true; // RFC 1918
    if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
    if (parts[0] === 192 && parts[1] === 168) return true;
    if (parts[0] === 169 && parts[1] === 254) return true; // link-local / cloud metadata
    if (parts[0] === 100 && parts[1] >= 64 && parts[1] <= 127) return true; // CGNAT, RFC 6598
    return false;
  }

  const lower = ip.toLowerCase();
  if (lower === "::1" || lower === "::") return true;
  if (lower.startsWith("::ffff:")) return isPrivateIp(lower.slice("::ffff:".length)); // IPv4-mapped IPv6

  // fe80::/10 (link-local) y fc00::/7 (unique local / ULA) son RANGOS, no
  // un prefijo de string fijo — "fe80:"/"fc00:" solo cubre el primer
  // valor de cada rango y deja pasar el resto (ej. fe9a::, febf::,
  // fd12:3456::, todas privadas igual). Los grupos de IPv6 son hex de
  // hasta 4 dígitos con ceros a la izquierda IMPLÍCITOS (no al final):
  // el primer grupo, tomado como número de 16 bits, tiene que enmascarar
  // contra el ancho real del rango (/10 y /7 respectivamente), no
  // compararse como texto.
  const firstGroup = parseInt(lower.split(":")[0] || "0", 16) || 0;
  if ((firstGroup & 0xffc0) === 0xfe80) return true; // fe80::/10
  if ((firstGroup & 0xfe00) === 0xfc00) return true; // fc00::/7
  return false;
}

/** Resuelve el hostname vía DNS y rechaza si CUALQUIERA de las IPs
 * devueltas es privada/reservada — a diferencia de `isSafeExternalUrl`
 * (que solo mira el string del hostname), esto cubre un dominio público
 * que apunta a una IP interna (DNS rebinding hacia 169.254.169.254 u
 * otro destino de la propia nube, por ejemplo) o formatos de IP no
 * decimales. No es hermético contra un rebinding que cambia la
 * respuesta DNS *entre* este chequeo y el fetch real que hace el
 * caller un instante después (fetch() vuelve a resolver el hostname, no
 * reusa esta IP) — cerrar eso del todo requeriría fijar la conexión a la
 * IP ya resuelta, bastante más complejidad de la que este caso de uso
 * justifica hoy. Igual sube mucho la vara: bloquea el caso simple y
 * realista (dominio que resuelve fijo a una IP privada, o una IP puesta
 * directo en formato numérico raro). */
type DnsLookupAll = (hostname: string, options: { all: true }) => Promise<{ address: string; family: number }[]>;

const defaultLookup: DnsLookupAll = (hostname, options) => dns.lookup(hostname, options);

export async function isSafeResolvedUrl(
  url: URL,
  lookup: DnsLookupAll = defaultLookup
): Promise<boolean> {
  if (!isSafeExternalUrl(url)) return false;
  try {
    const records = await lookup(url.hostname, { all: true });
    if (!records || records.length === 0) return false;
    return records.every((r) => !isPrivateIp(r.address));
  } catch {
    return false;
  }
}

const MAX_REDIRECT_HOPS = 5;

/** `fetch` a una URL que eligió el usuario, siguiendo los redirects a
 * mano (`redirect: "manual"`) y pasando CADA salto por
 * `isSafeResolvedUrl` antes de pedirlo. Con el default de `fetch`
 * (`redirect: "follow"`), un host público que responde
 * `302 → http://127.0.0.1/…` o a una IP interna hacía que el servidor le
 * pegara a ese destino aunque la URL inicial hubiera pasado el chequeo
 * (SEP23-03, AUDITORIA-2026-09-23.md). Devuelve null si algún salto no
 * es seguro o si hay demasiados redirects.
 *
 * El scraper (app/api/scrape) tiene su propio loop con la misma idea,
 * porque además mira en cada salto si el sitio bloquea el autocompletado. */
export async function fetchFollowingSafeRedirects(
  startUrl: URL,
  init: Omit<RequestInit, "redirect"> = {},
  lookup: DnsLookupAll = defaultLookup
): Promise<Response | null> {
  let current = startUrl;
  // Mismo límite que el loop del scraper: MAX_REDIRECT_HOPS pedidos en total.
  for (let hop = 0; hop < MAX_REDIRECT_HOPS; hop++) {
    if (!(await isSafeResolvedUrl(current, lookup))) return null;
    const res = await fetch(current, { ...init, redirect: "manual" });
    const location = res.status >= 300 && res.status < 400 ? res.headers.get("location") : null;
    if (!location) return res;
    await res.body?.cancel().catch(() => {});
    current = new URL(location, current);
  }
  return null;
}

/** Hosts de los servicios de Web Push de los navegadores: Chrome/Android,
 * Samsung y Opera (FCM), Firefox (Mozilla autopush), Edge (WNS) y
 * Safari/iOS (Apple). */
const PUSH_SERVICE_HOSTS = [
  { host: "fcm.googleapis.com", exact: true },
  { host: ".push.services.mozilla.com", exact: false },
  { host: ".notify.windows.com", exact: false },
  { host: ".push.apple.com", exact: false },
];

/** SEP23-06 (AUDITORIA-2026-09-23.md): el `endpoint` de una suscripción
 * push es una URL a la que el servidor le hace un POST cada vez que el
 * corredor carga una casa o agenda una visita — antes se aceptaba
 * cualquier string, así que una sesión de caso podía apuntarlo a una
 * dirección interna (SSRF ciego por POST). Solo se acepta https contra
 * un servicio de push conocido. */
export function isKnownPushEndpoint(endpoint: string): boolean {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }
  if (url.protocol !== "https:" || url.port !== "" || url.username || url.password) return false;
  const host = url.hostname.toLowerCase();
  return PUSH_SERVICE_HOSTS.some((s) => (s.exact ? host === s.host : host.endsWith(s.host)));
}
