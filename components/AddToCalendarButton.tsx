"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Calendar, CalendarPlus, Download, ExternalLink } from "lucide-react";
import { buildGoogleCalendarUrl, buildVisitIcs, IcsHouse } from "@/lib/ics";

function slugify(text: string): string {
  return (
    text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
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
  const [open, setOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (
        containerRef.current &&
        !containerRef.current.contains(target) &&
        menuRef.current &&
        !menuRef.current.contains(target)
      ) {
        setOpen(false);
      }
    }
    function handleReposition() {
      setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    // Reposicionar en scroll/resize es más trabajo que vale la pena acá —
    // como el menú está portado (para no quedar recortado por overflow-hidden
    // de la card o overflow-x-auto de la tabla), simplemente lo cerramos.
    window.addEventListener("scroll", handleReposition, true);
    window.addEventListener("resize", handleReposition);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      window.removeEventListener("scroll", handleReposition, true);
      window.removeEventListener("resize", handleReposition);
    };
  }, [open]);

  function toggleOpen(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    if (!open && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setMenuPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
    }
    setOpen((prev) => !prev);
  }

  if (!house.visitaFecha) return null;

  const caseUrl = typeof window !== "undefined" ? `${window.location.origin}${window.location.pathname}` : "";

  function downloadIcs(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    setOpen(false);
    const ics = buildVisitIcs(house, caseUrl);
    if (!ics) return;
    const blob = new Blob([ics], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `visita-${slugify(house.title)}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function openGoogleCalendar(e: React.MouseEvent) {
    e.stopPropagation();
    e.preventDefault();
    setOpen(false);
    const gUrl = buildGoogleCalendarUrl(house, caseUrl);
    if (gUrl) {
      window.open(gUrl, "_blank", "noopener,noreferrer");
    }
  }

  const accessibleLabel = title ?? "Agregar visita al calendario";

  return (
    <div ref={containerRef} className="relative inline-flex items-center">
      {variant === "pill" ? (
        <button
          type="button"
          title={accessibleLabel}
          onClick={toggleOpen}
          className={
            className ??
            "flex h-full items-center justify-center px-2 py-1 text-inherit transition-all hover:bg-black/10 dark:hover:bg-white/10 active:scale-95"
          }
          aria-label={accessibleLabel}
          aria-expanded={open}
        >
          <CalendarPlus size={13} />
          {label && <span>{label}</span>}
        </button>
      ) : (
        <button
          type="button"
          title={accessibleLabel}
          onClick={toggleOpen}
          className={
            className ??
            "btn flex items-center justify-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors hover:border-[var(--border-strong)]"
          }
          style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--ink)" }}
          aria-label={accessibleLabel}
          aria-expanded={open}
        >
          <CalendarPlus size={14} className="shrink-0" />
          {label && <span>{label}</span>}
        </button>
      )}

      {open &&
        menuPos &&
        createPortal(
          <div
            ref={menuRef}
            className="fixed z-40 min-w-[220px] rounded-xl border p-1 text-xs shadow-lg backdrop-blur-md"
            style={{
              top: menuPos.top,
              right: menuPos.right,
              background: "var(--surface)",
              borderColor: "var(--border)",
              boxShadow: "0 8px 24px -4px rgba(0, 0, 0, 0.18)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
          <p className="px-2.5 py-1 text-[11px] font-medium" style={{ color: "var(--ink-faint)" }}>
            Agregar visita a:
          </p>
          <button
            type="button"
            onClick={openGoogleCalendar}
            className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/5"
            style={{ color: "var(--ink)" }}
          >
            <span className="flex items-center gap-2">
              <Calendar size={14} style={{ color: "var(--accent)" }} />
              Google Calendar
            </span>
            <ExternalLink size={12} style={{ color: "var(--ink-faint)" }} />
          </button>
          <button
            type="button"
            onClick={downloadIcs}
            className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/5"
            style={{ color: "var(--ink)" }}
          >
            <span className="flex items-center gap-2">
              <Download size={14} style={{ color: "var(--ink-muted)" }} />
              Archivo .ics (Apple / Outlook)
            </span>
          </button>
          </div>,
          document.body
        )}
    </div>
  );
}

