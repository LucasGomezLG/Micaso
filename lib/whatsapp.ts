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

import { formatTime24, formatWeekdayShortDate } from "./format";

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

export function getCanonicalLoginUrl(magicLinkToken: string): string {
  const params = new URLSearchParams({ t: magicLinkToken });
  return `${canonicalOrigin()}/login?${params.toString()}`;
}

export function buildCaseShareMessage(kase: {
  titulo: string;
  magicLinkToken?: string;
}): string {
  if (!kase.magicLinkToken) {
    throw new Error("Se requiere magicLinkToken para compartir el caso de forma segura (CON-02)");
  }
  const loginUrl = getCanonicalLoginUrl(kase.magicLinkToken);

  return [
    `¡Hola! Ya podés seguir la búsqueda de "${kase.titulo}" en Micaso.`,
    "",
    "▶ *Entrá directo con 1 toque acá:*",
    loginUrl,
    "",
    "🛡 *Compartí este link solamente con las personas que te acompañen o ayuden en la búsqueda.*",
    "",
    "Ahí vas a ver el presupuesto, las propiedades que vamos viendo, las visitas coordinadas y todo lo que vaya haciendo falta — todo junto, en un solo lugar.",
  ].join("\n");
}

export type VisitShareItem = {
  title: string;
  address: string | null;
  zone: string | null;
  visitaFecha: string;
  visitaConfirmada: boolean;
};

/** Las visitas de un día, listas para mandar por WhatsApp (botón
 * "Compartir" de cada día en app/caso/agenda) — el mismo formato del
 * mensaje que se armaba a mano: ubicación y hora de cada visita, con ✅ en
 * las que la inmobiliaria o el dueño ya confirmó. La ubicación es la
 * dirección exacta si está cargada; si no, la zona o, en último caso, el
 * título, para que ninguna visita quede sin decir adónde ir. */
export function buildVisitDayMessage(day: string, visits: VisitShareItem[]): string {
  const sorted = [...visits].sort((a, b) => (a.visitaFecha < b.visitaFecha ? -1 : a.visitaFecha > b.visitaFecha ? 1 : 0));
  const lines = [
    sorted.length === 1 ? "🏠 VISITA PROGRAMADA" : "🏠 VISITAS PROGRAMADAS",
    `📅 Fecha: ${formatWeekdayShortDate(day)}`,
  ];
  for (const visit of sorted) {
    const ubicacion = visit.address?.trim() || visit.zone?.trim() || visit.title;
    lines.push(
      "",
      `📍 Ubicación: ${ubicacion}`,
      `⌚ Hora: ${formatTime24(visit.visitaFecha)}hs${visit.visitaConfirmada ? " ✅" : ""}`
    );
  }
  return lines.join("\n");
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
