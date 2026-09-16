"use client";

import { CalendarPlus } from "lucide-react";
import { buildVisitIcs, IcsHouse } from "@/lib/ics";

function slugify(text: string): string {
  return (
    text
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .toLowerCase() || "visita"
  );
}

export default function AddToCalendarButton({
  house,
  className,
  title,
  variant = "default",
  label,
}: {
  house: IcsHouse;
  className?: string;
  title?: string;
  variant?: "default" | "pill";
  label?: string;
}) {
  if (!house.visitaFecha) return null;

  function download(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    const ics = buildVisitIcs(house, `${window.location.origin}${window.location.pathname}`);
    if (!ics) return;
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `visita-${slugify(house.title)}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    // Revocar en el mismo tick puede cancelar la descarga en algunas
    // versiones de Safari/iOS, donde la navegación al blob: es async —
    // un delay chico le da tiempo al browser a tomar el archivo primero.
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const accessibleLabel = title ?? "Agregar al calendario (.ics)";

  if (variant === "pill") {
    return (
      <button
        type="button"
        title={accessibleLabel}
        onClick={download}
        className={
          className ??
          "flex h-full items-center justify-center px-2 py-1 text-inherit transition-all hover:bg-black/10 dark:hover:bg-white/10 active:scale-95"
        }
        aria-label={accessibleLabel}
      >
        <CalendarPlus size={13} />
        {label && <span>{label}</span>}
      </button>
    );
  }

  return (
    <button
      type="button"
      title={accessibleLabel}
      onClick={download}
      className={
        className ??
        "btn flex items-center justify-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors hover:border-[var(--border-strong)]"
      }
      style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--ink)" }}
      aria-label={accessibleLabel}
    >
      <CalendarPlus size={14} className="shrink-0" />
      {label && <span>{label}</span>}
    </button>
  );
}
