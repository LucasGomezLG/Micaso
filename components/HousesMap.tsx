"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import { House, STATUS_LABEL } from "@/lib/types";
import { formatUsd } from "@/lib/format";
import { matchZoneCoord } from "@/lib/zoneCoords";

export default function HousesMap({ houses }: { houses: House[] }) {
  const mapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let map: import("leaflet").Map | undefined;
    let cancelled = false;

    import("leaflet").then((L) => {
      if (cancelled || !mapRef.current) return;

      const groups = new Map<string, { lat: number; lng: number; houses: House[] }>();
      for (const house of houses) {
        const coord = matchZoneCoord(house.zone);
        if (!coord) continue;
        if (!groups.has(coord.name)) groups.set(coord.name, { lat: coord.lat, lng: coord.lng, houses: [] });
        groups.get(coord.name)!.houses.push(house);
      }

      map = L.map(mapRef.current, { scrollWheelZoom: true }).setView([-34.535, -58.52], 12);
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
        maxZoom: 18,
      }).addTo(map);

      // Los marcadores son SVG con atributos de color directos — no
      // entienden var(), así que resolvemos los tokens una vez acá. El
      // contenido del popup sí es HTML real insertado en el documento, y
      // ese usa var(...) para seguir el tema claro/oscuro sin duplicar colores.
      const rootStyle = getComputedStyle(document.documentElement);
      const accent = rootStyle.getPropertyValue("--accent").trim() || "#1d4e89";

      for (const [zoneName, group] of groups) {
        const radius = Math.min(10 + group.houses.length * 3, 28);
        const marker = L.circleMarker([group.lat, group.lng], {
          radius,
          color: accent,
          fillColor: accent,
          fillOpacity: 0.45,
          weight: 2,
        }).addTo(map!);

        const items = group.houses
          .map((h) => {
            const title = h.title.replace(/</g, "&lt;");
            const titleHtml = h.url
              ? `<a href="${h.url}" target="_blank" rel="noreferrer" style="font-weight:600;color:var(--accent);text-decoration:none;">${title}</a>`
              : `<span style="font-weight:600;">${title}</span>`;
            return `
              <div style="padding:6px 0;border-top:1px solid var(--border);">
                ${titleHtml}
                <div style="font-size:12px;color:var(--ink-muted);">
                  ${formatUsd(h.priceUsd)} · ${STATUS_LABEL[h.status]}
                </div>
              </div>`;
          })
          .join("");

        marker.bindPopup(
          `<div style="min-width:220px;max-height:260px;overflow-y:auto;font-family:var(--font-body);color:var(--ink);">
             <div style="font-weight:700;margin-bottom:2px;">${zoneName} — ${group.houses.length} casa${group.houses.length > 1 ? "s" : ""}</div>
             ${items}
           </div>`
        );
      }
    });

    return () => {
      cancelled = true;
      map?.remove();
    };
  }, [houses]);

  return (
    <div
      ref={mapRef}
      className="h-[70vh] w-full rounded-2xl border"
      style={{ borderColor: "var(--border)" }}
    />
  );
}
