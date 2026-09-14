const BLOCKED_HOSTS = /^(localhost|127\.|10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.|169\.254\.|\[::1\])/i;

/** Reject internal/private targets before the server fetches a
 * user-supplied URL (scrape, image proxy) — basic SSRF guard. */
export function isSafeExternalUrl(url: URL): boolean {
  return /^https?:$/.test(url.protocol) && !BLOCKED_HOSTS.test(url.hostname);
}
