import { House } from "./types";

/** Argentina está fija en UTC-3 todo el año (sin horario de verano
 * desde 2009) — sumar 3 horas a la hora de pared alcanza para anclar
 * `visitaFecha` (naive, sin offset — ver lib/format.ts) al instante UTC
 * real que un archivo .ics necesita. */
const AR_UTC_OFFSET_HOURS = 3;
const VISIT_DURATION_MINUTES = 60;

function arNaiveToUtc(iso: string): Date {
  const [datePart, timePart] = iso.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = (timePart ?? "00:00").split(":").map(Number);
  return new Date(Date.UTC(year, month - 1, day, hour + AR_UTC_OFFSET_HOURS, minute));
}

function toIcsUtcStamp(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function escapeIcsText(value: string): string {
  return value
    .replace(/\r\n?/g, "\n") // normaliza CRLF/CR sueltos antes de escapar el \n
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/** Para valores de una sola línea que no pasan por escapeIcsText (como
 * `URL:`) — un \r o \n sin escapar ahí inyectaría propiedades .ics
 * arbitrarias (CRLF injection) si `house.url` viniera con saltos de
 * línea. No debería poder pasar `new URL()` con eso adentro, pero
 * house.url es un string guardado tal cual (ver lib/store.ts addHouse),
 * así que esto no depende de esa validación para ser seguro. */
function stripCrlf(value: string): string {
  return value.replace(/[\r\n]/g, "");
}

function utf8ByteLength(text: string): number {
  return new TextEncoder().encode(text).length;
}

/** RFC5545 pide no superar 75 octetos por línea — continuar con un
 * espacio al principio de la siguiente. Mide bytes UTF-8 reales (no
 * `.length`, que cuenta unidades UTF-16): un título con tildes puede
 * tener menos caracteres que bytes, y `.length` solo lo subestimaría.
 * Itera por code point (no por byte) para nunca partir un carácter
 * multi-byte a la mitad. */
function foldLine(line: string): string {
  const max = 74;
  if (utf8ByteLength(line) <= max) return line;

  const chunks: string[] = [];
  let current = "";
  let currentBytes = 0;
  let budget = max;
  for (const char of line) {
    const charBytes = utf8ByteLength(char);
    if (currentBytes + charBytes > budget) {
      chunks.push(current);
      current = "";
      currentBytes = 0;
      budget = max - 1; // las líneas de continuación pierden 1 octeto por el espacio inicial
    }
    current += char;
    currentBytes += charBytes;
  }
  if (current) chunks.push(current);
  return chunks.join("\r\n ");
}

export type IcsHouse = Pick<
  House,
  "id" | "title" | "zone" | "address" | "url" | "visitaFecha" | "contactoNombre" | "contactoTelefono"
>;

/** Genera el contenido de un archivo .ics para la visita coordinada de
 * una propiedad — null si todavía no tiene fecha. Asume 1 hora de
 * duración (el modelo no guarda una hora de fin explícita, ver
 * lib/types.ts House.visitaFecha). */
export function buildVisitIcs(house: IcsHouse, caseUrl: string): string | null {
  if (!house.visitaFecha) return null;

  const start = arNaiveToUtc(house.visitaFecha);
  const end = new Date(start.getTime() + VISIT_DURATION_MINUTES * 60 * 1000);

  const descriptionLines = [`Visita coordinada — ${house.title}`];
  if (house.contactoNombre || house.contactoTelefono) {
    descriptionLines.push(`Contacto: ${[house.contactoNombre, house.contactoTelefono].filter(Boolean).join(" · ")}`);
  }
  if (house.url) descriptionLines.push(`Aviso: ${house.url}`);
  descriptionLines.push(`Ver en Micaso: ${caseUrl}`);

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Micaso//Visitas//ES",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${house.id}@micaso.com.ar`,
    `DTSTAMP:${toIcsUtcStamp(new Date())}`,
    `DTSTART:${toIcsUtcStamp(start)}`,
    `DTEND:${toIcsUtcStamp(end)}`,
    `SUMMARY:${escapeIcsText(`Visita: ${house.title}`)}`,
    ...(house.address || house.zone
      ? [`LOCATION:${escapeIcsText(house.address || house.zone || "")}`]
      : []),
    `DESCRIPTION:${escapeIcsText(descriptionLines.join("\n"))}`,
    ...(house.url ? [`URL:${stripCrlf(house.url)}`] : []),
    "END:VEVENT",
    "END:VCALENDAR",
  ];

  return lines.map(foldLine).join("\r\n") + "\r\n";
}

/** Genera la URL de plantilla para agendar la visita directamente en Google Calendar. */
export function buildGoogleCalendarUrl(house: IcsHouse, caseUrl: string): string | null {
  if (!house.visitaFecha) return null;

  const start = arNaiveToUtc(house.visitaFecha);
  const end = new Date(start.getTime() + VISIT_DURATION_MINUTES * 60 * 1000);

  const startStamp = toIcsUtcStamp(start);
  const endStamp = toIcsUtcStamp(end);

  const descriptionLines = [`Visita coordinada — ${house.title}`];
  if (house.contactoNombre || house.contactoTelefono) {
    descriptionLines.push(`Contacto: ${[house.contactoNombre, house.contactoTelefono].filter(Boolean).join(" · ")}`);
  }
  if (house.url) descriptionLines.push(`Aviso: ${house.url}`);
  descriptionLines.push(`Ver en Micaso: ${caseUrl}`);

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `Visita: ${house.title}`,
    dates: `${startStamp}/${endStamp}`,
    details: descriptionLines.join("\n"),
  });
  if (house.address || house.zone) {
    params.set("location", house.address || house.zone || "");
  }

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
