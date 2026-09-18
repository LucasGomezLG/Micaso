"use client";

import Link from "next/link";
import { Calendar, CalendarDays } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import AddToCalendarButton from "@/components/AddToCalendarButton";
import { IcsHouse } from "@/lib/ics";

const dividerStyle = { background: "color-mix(in srgb, var(--status-coordinada) 35%, transparent)" };

/** Pill "Visita: <fecha>" + botón de calendario — usado tanto en la
 * ficha de casa (components/HouseCard.tsx) como en "Próximas visitas"
 * del inicio (app/caso/page.tsx). Antes vivía duplicado en los dos
 * lugares y ya había divergido (a uno le faltaba `w-fit`) — un único
 * componente evita que se vuelvan a desalinear. */
export default function VisitaCoordinadaBadge({
  house,
  label,
  linkToAgenda,
}: {
  house: IcsHouse;
  label?: string;
  linkToAgenda?: boolean;
}) {
  if (!house.visitaFecha) return null;

  return (
    <div
      className="inline-flex w-fit items-center rounded-lg border text-xs font-medium overflow-hidden transition-all shadow-xs"
      style={{
        background: "var(--status-coordinada-bg)",
        color: "var(--status-coordinada)",
        borderColor: "color-mix(in srgb, var(--status-coordinada) 28%, transparent)",
      }}
    >
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1">
        <Calendar size={13} /> {label}
        {formatDateTime(house.visitaFecha)}
      </span>
      <span className="h-3.5 w-px shrink-0" style={dividerStyle} />
      <AddToCalendarButton house={house} variant="pill" title="Descargar evento para el calendario (.ics)" />
      {linkToAgenda && (
        <>
          <span className="h-3.5 w-px shrink-0" style={dividerStyle} />
          <Link
            href="/caso/agenda"
            title="Ver en la agenda de visitas"
            aria-label="Ver en la agenda de visitas"
            onClick={(e) => e.stopPropagation()}
            className="flex h-full items-center justify-center px-2 py-1 text-inherit transition-all hover:bg-black/10 dark:hover:bg-white/10 active:scale-95"
          >
            <CalendarDays size={13} />
          </Link>
        </>
      )}
    </div>
  );
}
