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

function isPrivateIp(ip: string): boolean {
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
  if (lower.startsWith("fe80:") || lower.startsWith("fc00:") || lower.startsWith("fd00:")) return true; // link-local / ULA
  if (lower.startsWith("::ffff:")) return isPrivateIp(lower.slice("::ffff:".length)); // IPv4-mapped IPv6
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
export async function isSafeResolvedUrl(url: URL): Promise<boolean> {
  if (!isSafeExternalUrl(url)) return false;
  try {
    const records = await dns.lookup(url.hostname, { all: true });
    if (!records || records.length === 0) return false;
    return records.every((r) => !isPrivateIp(r.address));
  } catch {
    return false;
  }
}
