"use client";

import { Share2 } from "lucide-react";
import { buildVisitDayMessage, openWhatsapp, type VisitShareItem } from "@/lib/whatsapp";

/** Manda por WhatsApp las visitas de un día de la agenda, con ✅ en las
 * confirmadas — ver buildVisitDayMessage. */
export default function ShareVisitDayButton({ day, visits }: { day: string; visits: VisitShareItem[] }) {
  return (
    <button
      type="button"
      onClick={() => openWhatsapp(buildVisitDayMessage(day, visits))}
      title="Compartir las visitas del día por WhatsApp"
      aria-label="Compartir las visitas del día por WhatsApp"
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold transition-all hover:border-[var(--accent)] hover:text-[var(--accent)] active:scale-95"
      style={{ borderColor: "var(--border-strong)", color: "var(--ink-muted)" }}
    >
      <Share2 size={13} /> Compartir
    </button>
  );
}
