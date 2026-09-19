import { dbGet, dbSet, dbIncrWithTtl } from "./db";
import { ZoneCoord } from "./zoneCoords";

const GEOCODE_CACHE_KEY = (zone: string) => `geo:zone:${zone.trim().toLowerCase()}`;

/** Geocodes a zone string using Nominatim API — se llama de forma
 * sincrónica al guardar/editar una casa (POST /api/houses, PATCH
 * /api/houses/[id]), así que un Nominatim lento colgaba el guardado
 * entero: sin timeout propio, y sin caché para zonas repetidas
 * ("Palermo" se geocodifica de nuevo en cada casa nueva de esa zona).
 * Cachea en Redis indefinidamente (una zona no se mueve de lugar) y
 * limita a 2.5s — si Nominatim no contesta a tiempo, mejor guardar la
 * casa sin coordenadas que hacer esperar al usuario. El User-Agent con
 * contacto es requisito de la política de uso de Nominatim (ver
 * ARQUITECTURA.md), no solo cortesía — sin eso arriesga un ban de IP
 * sobre el bloque de Vercel, compartido con el resto de la app.
 *
 * Server-only a propósito (usa lib/db.ts, que depende de `fs`) — separado
 * de lib/zoneCoords.ts, que sí importan componentes cliente. */
export async function geocodeZone(zone: string): Promise<ZoneCoord | null> {
  if (!zone?.trim()) return null;
  const cacheKey = GEOCODE_CACHE_KEY(zone);

  const cached = await dbGet<ZoneCoord>(cacheKey);
  if (cached !== null) return cached;

  // Throttling: máximo 1 petición por segundo global a Nominatim (CON-07 / #10).
  // Intentamos hasta 3 veces (3 segundos) si hay mucha concurrencia.
  let allowed = false;
  for (let i = 0; i < 3; i++) {
    const count = await dbIncrWithTtl("ratelimit:nominatim:global", 1);
    if (count <= 1) {
      allowed = true;
      break;
    }
    // Si count > 1, otro request está consumiendo este segundo. Esperamos 1000ms.
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  if (!allowed) {
    console.warn("Geocode omitido: limitador de frecuencia excedido (1 req/s) tras reintentos.");
    return null;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2500);
  try {
    const q = encodeURIComponent(`${zone}, Argentina`);
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`, {
      signal: controller.signal,
      headers: {
        "User-Agent": "MicasoApp/1.0 (+https://www.micaso.com.ar; luccaass96@gmail.com)",
      },
    });

    if (!res.ok) return null;

    const data = await res.json();
    if (data && data.length > 0) {
      const coords = { lat: Number(data[0].lat), lng: Number(data[0].lon) };
      await dbSet(cacheKey, coords);
      return coords;
    }
  } catch (error) {
    console.error("Error geocoding zone:", error);
  } finally {
    clearTimeout(timeout);
  }

  return null;
}
