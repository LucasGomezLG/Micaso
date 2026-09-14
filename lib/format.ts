/** Route an external listing photo through our own server — several
 * sites (ArgenProp, etc.) hotlink-protect their CDN and 403 an <img>
 * loaded straight from another domain. */
export function proxiedImage(url: string | null): string | null {
  if (!url) return null;
  return `/api/image?u=${encodeURIComponent(url)}`;
}

export function formatUsd(value: number | null): string {
  if (value === null) return "—";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatArs(value: number | null): string {
  if (value === null) return "—";
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

const AR_TZ = "America/Argentina/Buenos_Aires";

function hasTimezoneDesignator(iso: string): boolean {
  return /Z$|[+-]\d{2}:\d{2}$/.test(iso);
}

/** A bare "YYYY-MM-DD" or "YYYY-MM-DDTHH:mm" (no offset — what a
 * plain <input type="date"/datetime-local"> gives) is wall-clock
 * numbers someone typed in, not an instant. Parsing it with `new
 * Date()` directly hands the ambiguity to the runtime's local
 * timezone, which differs between the server (renders once at
 * request time) and each viewer's browser (hydrates client-side) —
 * the same string can display a different day depending on who's
 * looking. Read the digits ourselves and anchor them to UTC so
 * formatting with timeZone:"UTC" always echoes the same numbers back. */
function parseNaive(iso: string): Date {
  const [datePart, timePart] = iso.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hour, minute] = (timePart ?? "00:00").split(":").map(Number);
  return new Date(Date.UTC(year, month - 1, day, hour, minute));
}

function formatWith(iso: string, options: Intl.DateTimeFormatOptions): string {
  if (hasTimezoneDesignator(iso)) {
    return new Intl.DateTimeFormat("es-AR", { ...options, timeZone: AR_TZ }).format(new Date(iso));
  }
  return new Intl.DateTimeFormat("es-AR", { ...options, timeZone: "UTC" }).format(parseNaive(iso));
}

export function formatDate(iso: string): string {
  return formatWith(iso, { day: "2-digit", month: "short" });
}

export function formatDateTime(iso: string): string {
  return formatWith(iso, {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function isOverdue(isoDate: string): boolean {
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: AR_TZ }).format(new Date());
  return isoDate.slice(0, 10) < today;
}

/** Whole calendar days from today (Argentina-local) to a naive
 * "YYYY-MM-DD" date — negative if it's already past. */
export function daysUntil(isoDate: string): number {
  const target = parseNaive(isoDate).getTime();
  const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: AR_TZ }).format(new Date());
  const today = parseNaive(todayStr).getTime();
  return Math.round((target - today) / (1000 * 60 * 60 * 24));
}

/** "hoy" / "ayer" / "hace N días" a partir de una fecha o datetime ISO
 * — usa solo la parte de fecha (ver daysUntil) para no romper con
 * milisegundos u hora. Para mostrar cuánto hace de algo en vez de la
 * fecha cruda (última actividad de un caso, próxima acción vencida). */
export function daysAgoLabel(iso: string): string {
  const daysAgo = -daysUntil(iso.slice(0, 10));
  if (daysAgo <= 0) return "hoy";
  if (daysAgo === 1) return "ayer";
  return `hace ${daysAgo} días`;
}

export function formatPercent(value: number): string {
  return new Intl.NumberFormat("es-AR", {
    style: "percent",
    maximumFractionDigits: 1,
  }).format(value);
}
