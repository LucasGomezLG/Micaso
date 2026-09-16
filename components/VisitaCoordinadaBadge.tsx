import { Calendar } from "lucide-react";
import { formatDateTime } from "@/lib/format";
import AddToCalendarButton from "@/components/AddToCalendarButton";
import { IcsHouse } from "@/lib/ics";

/** Pill "Visita: <fecha>" + botón de calendario — usado tanto en la
 * ficha de casa (components/HouseCard.tsx) como en "Próximas visitas"
 * del inicio (app/caso/page.tsx). Antes vivía duplicado en los dos
 * lugares y ya había divergido (a uno le faltaba `w-fit`) — un único
 * componente evita que se vuelvan a desalinear. */
export default function VisitaCoordinadaBadge({ house, label }: { house: IcsHouse; label?: string }) {
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
      <span
        className="h-3.5 w-px shrink-0"
        style={{ background: "color-mix(in srgb, var(--status-coordinada) 35%, transparent)" }}
      />
      <AddToCalendarButton house={house} variant="pill" title="Descargar evento para el calendario (.ics)" />
    </div>
  );
}
