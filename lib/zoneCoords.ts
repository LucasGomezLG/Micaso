export interface ZoneCoord {
  lat: number;
  lng: number;
}

/** Approximate centroid per zone — not exact addresses, just enough to
 * see which part of the map a house falls in and plan a visit route by
 * proximity. Ordered roughly north-to-south along the Mitre/San Martín
 * lines, since that's how a same-day visit round would actually go. */
const ZONE_COORDS: Record<string, ZoneCoord> = {
  "Martínez": { lat: -34.4922, lng: -58.5001 },
  "Olivos": { lat: -34.5093, lng: -58.4889 },
  "Vicente López": { lat: -34.5265, lng: -58.4771 },
  "Florida": { lat: -34.5289, lng: -58.4979 },
  "Villa Martelli": { lat: -34.5321, lng: -58.5103 },
  "Munro": { lat: -34.5351, lng: -58.5231 },
  "Carapachay": { lat: -34.5266, lng: -58.5335 },
  "Villa Adelina": { lat: -34.5176, lng: -58.5526 },
  "Villa Maipú": { lat: -34.5281, lng: -58.5491 },
  "San Andrés": { lat: -34.5590, lng: -58.5491 },
  "Villa Ballester": { lat: -34.5496, lng: -58.5566 },
  "Malaver": { lat: -34.5581, lng: -58.5651 },
  "San Martín": { lat: -34.5719, lng: -58.5289 },
  "Villa Lynch": { lat: -34.5961, lng: -58.5471 },
  "José León Suárez": { lat: -34.5351, lng: -58.5851 },
  "Villa Urquiza": { lat: -34.5761, lng: -58.4891 },
  "Villa Pueyrredón": { lat: -34.5871, lng: -58.5051 },
  "Villa Devoto": { lat: -34.5991, lng: -58.5241 },
  "Villa del Parque": { lat: -34.6051, lng: -58.4901 },
};

const ZONE_NAMES = Object.keys(ZONE_COORDS);

/** A house's `zone` is freeform ("Villa Ballester (Geodesia)", "Olivos
 * / Vicente López"), not one of the known names exactly — match by
 * checking which known zone name it contains. */
export function matchZoneCoord(zone: string | null): (ZoneCoord & { name: string }) | null {
  if (!zone) return null;
  if (ZONE_COORDS[zone]) return { ...ZONE_COORDS[zone], name: zone };
  const found = ZONE_NAMES.find((name) => zone.includes(name));
  return found ? { ...ZONE_COORDS[found], name: found } : null;
}

/** Geocodes a zone string using Nominatim API */
export async function geocodeZone(zone: string): Promise<{ lat: number; lng: number } | null> {
  if (!zone) return null;
  
  try {
    const q = encodeURIComponent(`${zone}, Argentina`);
    const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`, {
      headers: {
        "User-Agent": "Micaso/1.0",
      },
    });
    
    if (!res.ok) return null;
    
    const data = await res.json();
    if (data && data.length > 0) {
      return {
        lat: Number(data[0].lat),
        lng: Number(data[0].lon),
      };
    }
  } catch (error) {
    console.error("Error geocoding zone:", error);
  }
  
  return null;
}
