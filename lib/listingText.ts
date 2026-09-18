/** Parseo de texto libre (título, descripción) para adivinar precio,
 * ambientes y superficie — sin pedirle nada a ningún sitio. Usado tanto
 * por `app/api/scrape/route.ts` (sobre el HTML ya traído del servidor)
 * como por `AddHouseModal` (sobre texto que el usuario pega a mano desde
 * un sitio bloqueado por ToS) — en ese segundo caso no hay ningún fetch
 * de por medio, es el mismo criterio que `guessFromBlockedUrlSlug`. */

/** Busca "N ambientes"/"N amb". Un solo número esperado; si el texto
 * trae más de una mención y no coinciden, mejor abstenerse que adivinar
 * mal (mismo criterio que el resto de los "guess" de este módulo). */
export function guessAmbientesFromText(...texts: (string | null)[]): number | null {
  const found = new Set<number>();
  for (const text of texts) {
    if (!text) continue;
    for (const match of text.matchAll(/(\d{1,2})\s*amb(?:iente)?s?\b/gi)) {
      found.add(Number(match[1]));
    }
  }
  return found.size === 1 ? [...found][0] : null;
}

/** Mismo criterio que `guessAmbientesFromText`, para "NNN m2"/"NNN m²"/"NNN mts2".
 * Nota: '²' no es un carácter \w en regex JS, por lo que no se usa \b después de '²'. */
export function guessSuperficieFromText(...texts: (string | null)[]): number | null {
  const found = new Set<number>();
  for (const text of texts) {
    if (!text) continue;
    for (const match of text.matchAll(/(\d{2,4})\s*(?:m2\b|m²(?!\w)|mts?2?\b|metros?\s*(?:cuadrados?)?\b)/gi)) {
      found.add(Number(match[1]));
    }
  }
  return found.size === 1 ? [...found][0] : null;
}

/** Busca un precio en USD/US$/U$S/U$D, o como último recurso "$" si no
 * hay símbolo de dólar explícito. Prioriza siempre USD para no confundir
 * expensas en pesos ("Expensas $ 60.000") con el precio de venta en el texto. */
export function guessPriceUsd(...texts: (string | null)[]): number | null {
  // Primero: mención explícita de dólares
  for (const text of texts) {
    if (!text) continue;
    const match = text.match(/(?:USD|US\$|U\$S|U\$D)\s?([\d.,]{4,})/i);
    if (match) {
      const digits = match[1].replace(/[.,](?=\d{3}\b)/g, "").replace(",", ".");
      const value = parseFloat(digits);
      if (!Number.isNaN(value) && value > 1000) return Math.round(value);
    }
  }

  // Segundo (último recurso): símbolo de moneda genérico "$"
  for (const text of texts) {
    if (!text) continue;
    const match = text.match(/\$\s?([\d.,]{4,})/);
    if (match) {
      const digits = match[1].replace(/[.,](?=\d{3}\b)/g, "").replace(",", ".");
      const value = parseFloat(digits);
      if (!Number.isNaN(value) && value > 1000) return Math.round(value);
    }
  }
  return null;
}

export type ListingTextGuess = {
  priceUsd: number | null;
  ambientes: number | null;
  superficieM2: number | null;
  zone: string | null;
};

/** Parsea un bloque de texto libre (por ejemplo la descripción copiada de un
 * portal bloqueado) extrayendo precio, ambientes, superficie y zona si matchea. */
export function parseListingText(text: string, knownZones: string[] = []): ListingTextGuess {
  const priceUsd = guessPriceUsd(text);
  const ambientes = guessAmbientesFromText(text);
  const superficieM2 = guessSuperficieFromText(text);
  const lower = text.toLowerCase();
  const zone = knownZones.find((z) => z && lower.includes(z.toLowerCase())) ?? null;
  return { priceUsd, ambientes, superficieM2, zone };
}

