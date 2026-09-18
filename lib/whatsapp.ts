/**
 * Utilidades para compartir enlaces y mensajes por WhatsApp de forma robusta.
 *
 * NOTA TÉCNICA SOBRE EMOJIS Y REDIRECCIONES DE WHATSAPP:
 * El acortador `https://wa.me/?text=...` tiene un bug en sus servidores:
 * al hacer la redirección 302 hacia api.whatsapp.com, procesa el query
 * string con decodificación ISO-8859-1 en vez de UTF-8, corrompiendo los
 * emojis de 4 bytes (como 👉 o 🔒) y transformándolos en `%EF%BF%BD` ().
 *
 * Para evitarlo:
 * 1. En desktop se abre directamente `https://web.whatsapp.com/send?text=...`,
 *    lo que saltea la redirección del servidor de Meta y permite que el cliente
 *    web de WhatsApp decodifique el UTF-8 completo en el navegador.
 * 2. En dispositivos móviles se abre `https://api.whatsapp.com/send?text=...`
 *    o el esquema nativo `whatsapp://send?text=...`.
 */

/** Solo fuerza el dominio canónico con www (ver lib/site.ts) cuando ya
 * estamos parados en micaso.com.ar — localhost y cualquier otro host
 * (un preview de Vercel, por ejemplo) usan su propio origin tal cual,
 * para no mandar un link de prueba a producción. */
function canonicalOrigin(): string {
  if (typeof window === "undefined") return "https://www.micaso.com.ar";
  const { hostname, origin } = window.location;
  if (hostname === "micaso.com.ar" || hostname === "www.micaso.com.ar") {
    return "https://www.micaso.com.ar";
  }
  return origin;
}

export function getCanonicalLoginUrl(username: string, password: string): string {
  const params = new URLSearchParams({ u: username, p: password });
  return `${canonicalOrigin()}/login?${params.toString()}`;
}

export function buildCaseShareMessage(kase: {
  titulo: string;
  username: string;
  password: string;
}): string {
  const loginUrl = getCanonicalLoginUrl(kase.username, kase.password);

  return [
    `¡Hola! Ya podés seguir la búsqueda de "${kase.titulo}" en Micaso.`,
    "",
    "▶ *Entrá directo con 1 toque acá:*",
    loginUrl,
    "",
    "🛡 *Compartí este link solamente con las personas que te acompañen o ayuden en la búsqueda.*",
    "",
    "(Tus datos de acceso por si entrás desde otro dispositivo:",
    `Usuario: ${kase.username}`,
    `Contraseña: ${kase.password})`,
    "",
    "Ahí vas a ver el presupuesto, las propiedades que vamos viendo, las visitas coordinadas y todo lo que vaya haciendo falta — todo junto, en un solo lugar.",
  ].join("\n");
}

export function buildCaseCredentialsText(kase: {
  titulo: string;
  username: string;
  password: string;
}): string {
  const loginUrl = getCanonicalLoginUrl(kase.username, kase.password);
  return `Acceso Micaso para "${kase.titulo}":\nLink directo: ${loginUrl}\n\n🛡 Compartí este link solamente con las personas que te acompañen o ayuden en la búsqueda.\n\nUsuario: ${kase.username}\nContraseña: ${kase.password}`;
}

export function openWhatsapp(text: string): void {
  const encoded = encodeURIComponent(text);
  // iPadOS 13+ manda un user-agent de escritorio ("Macintosh...") sin
  // "iPad" — se distingue por soporte táctil, que un Mac real no tiene.
  const isMobile =
    typeof navigator !== "undefined" &&
    (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
      (navigator.userAgent.includes("Macintosh") && navigator.maxTouchPoints > 1));

  // En móvil abrimos api.whatsapp.com (o wa.me) que dispara la app nativa.
  // En escritorio abrimos directamente web.whatsapp.com para evitar la corrupción
  // de caracteres del redireccionador wa.me.
  const url = isMobile
    ? `https://api.whatsapp.com/send?text=${encoded}`
    : `https://web.whatsapp.com/send?text=${encoded}`;

  window.open(url, "_blank", "noopener,noreferrer");
}
