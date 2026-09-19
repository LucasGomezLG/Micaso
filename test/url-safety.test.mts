import { test } from "node:test";
import assert from "node:assert/strict";
import { isPrivateIp, isSafeExternalUrl, isSafeResolvedUrl } from "../lib/url-safety";

// SEC-02: este sandbox no tiene salida de red real (`fetch`/`dns.lookup`
// contra un host real siempre falla acá, incluso para dominios legítimos
// como example.com o para un literal decimal como 2130706433 — Windows
// getaddrinfo no lo resuelve localmente como glibc). Probar contra la red
// real solo demostraría "todo falla", no que la clasificación
// privada/pública sea correcta — por eso estos tests mockean el lookup.

test("isPrivateIp: rangos IPv4 privados/reservados", () => {
  assert.equal(isPrivateIp("127.0.0.1"), true); // loopback
  assert.equal(isPrivateIp("0.0.0.0"), true);
  assert.equal(isPrivateIp("10.0.0.5"), true); // RFC 1918
  assert.equal(isPrivateIp("172.16.0.1"), true);
  assert.equal(isPrivateIp("172.31.255.255"), true);
  assert.equal(isPrivateIp("172.32.0.1"), false); // justo fuera del rango 172.16-31
  assert.equal(isPrivateIp("192.168.1.1"), true);
  assert.equal(isPrivateIp("169.254.169.254"), true); // metadata de nube (AWS/GCP/Azure)
  assert.equal(isPrivateIp("100.64.0.1"), true); // CGNAT (RFC 6598)
  assert.equal(isPrivateIp("100.128.0.1"), false); // justo fuera del rango CGNAT
});

test("isPrivateIp: IPs públicas reales no se bloquean", () => {
  assert.equal(isPrivateIp("8.8.8.8"), false); // Google DNS
  assert.equal(isPrivateIp("1.1.1.1"), false); // Cloudflare
  assert.equal(isPrivateIp("93.184.216.34"), false); // example.com
});

test("isPrivateIp: rangos IPv6 privados/reservados, incluyendo IPv4-mapped", () => {
  assert.equal(isPrivateIp("::1"), true); // loopback
  assert.equal(isPrivateIp("::"), true);
  assert.equal(isPrivateIp("fe80::1"), true); // link-local
  assert.equal(isPrivateIp("fc00::1"), true); // ULA
  assert.equal(isPrivateIp("fd12:3456::1"), true); // ULA, fuera del prefijo literal "fd00:"
  assert.equal(isPrivateIp("fe9a::1"), true); // link-local, fuera del prefijo literal "fe80:"
  assert.equal(isPrivateIp("febf::1"), true); // último grupo aún dentro de fe80::/10
  assert.equal(isPrivateIp("fec0::1"), false); // justo fuera de fe80::/10
  assert.equal(isPrivateIp("fdff:ffff::1"), true); // último grupo aún dentro de fc00::/7
  assert.equal(isPrivateIp("fe00::1"), false); // justo fuera de fc00::/7
  assert.equal(isPrivateIp("::ffff:127.0.0.1"), true); // IPv4-mapped loopback
  assert.equal(isPrivateIp("::ffff:169.254.169.254"), true); // IPv4-mapped metadata
  assert.equal(isPrivateIp("2001:4860:4860::8888"), false); // Google DNS IPv6, pública
});

test("isPrivateIp: input que no es una IP válida se trata como no seguro", () => {
  assert.equal(isPrivateIp("no-es-una-ip"), true);
  assert.equal(isPrivateIp(""), true);
});

test("isSafeExternalUrl: protocolo y hostname literal", () => {
  assert.equal(isSafeExternalUrl(new URL("https://example.com")), true);
  assert.equal(isSafeExternalUrl(new URL("http://localhost:3000")), false);
  assert.equal(isSafeExternalUrl(new URL("file:///etc/passwd")), false);
  assert.equal(isSafeExternalUrl(new URL("http://127.0.0.1")), false);
});

test("isSafeResolvedUrl: permite un dominio que resuelve a una IP pública", async () => {
  const fakeLookup = async () => [{ address: "93.184.216.34", family: 4 as const }];
  const ok = await isSafeResolvedUrl(new URL("https://example.com"), fakeLookup);
  assert.equal(ok, true);
});

test("isSafeResolvedUrl: bloquea DNS rebinding — dominio público que resuelve a metadata de nube", async () => {
  const fakeLookup = async () => [{ address: "169.254.169.254", family: 4 as const }];
  const blocked = await isSafeResolvedUrl(new URL("https://looks-legit.example"), fakeLookup);
  assert.equal(blocked, false);
});

test("isSafeResolvedUrl: bloquea si CUALQUIERA de las IPs resueltas es privada (multi-A record)", async () => {
  const fakeLookup = async () => [
    { address: "93.184.216.34", family: 4 as const },
    { address: "127.0.0.1", family: 4 as const },
  ];
  const blocked = await isSafeResolvedUrl(new URL("https://mixed.example"), fakeLookup);
  assert.equal(blocked, false);
});

test("isSafeResolvedUrl: falla cerrado si la resolución DNS tira un error", async () => {
  const fakeLookup = async () => {
    throw new Error("ENOTFOUND");
  };
  const blocked = await isSafeResolvedUrl(new URL("https://no-existe.example"), fakeLookup);
  assert.equal(blocked, false);
});

test("isSafeResolvedUrl: nunca llega a resolver si el host ya está bloqueado por isSafeExternalUrl", async () => {
  let called = false;
  const fakeLookup = async () => {
    called = true;
    return [{ address: "93.184.216.34", family: 4 as const }];
  };
  const blocked = await isSafeResolvedUrl(new URL("http://localhost:3000"), fakeLookup);
  assert.equal(blocked, false);
  assert.equal(called, false, "no debería llamar a dns.lookup para un host ya bloqueado por regex");
});
