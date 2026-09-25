"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, CircleDashed } from "lucide-react";
import { apiErrorMessage } from "@/lib/http";

/** Marca a mano si la inmobiliaria o el dueño ya confirmó una visita
 * (House.visitaConfirmada) — sale como ✅ en el mensaje de WhatsApp del
 * día (ShareVisitDayButton). Solo el corredor del caso la cambia
 * (`editable`, y el PATCH lo vuelve a chequear); la familia ve el estado
 * como un indicador, no como un botón. */
export default function VisitConfirmToggle({
  houseId,
  confirmed,
  editable,
}: {
  houseId: string;
  confirmed: boolean;
  editable: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState(confirmed);
  const [saving, setSaving] = useState(false);
  // Hasta que llega el refresh, el botón "Compartir" del día (que lee los
  // datos del servidor) todavía tiene el valor viejo: el toggle queda
  // deshabilitado mientras tanto, así se ve cuándo ya se puede compartir y
  // un segundo toque no se cruza con el refresh del primero.
  const [refreshing, startRefresh] = useTransition();
  // Si el valor cambia del lado del servidor (moverle la fecha a la visita
  // la desconfirma), el router.refresh() trae la prop nueva: seguirla.
  const [lastConfirmed, setLastConfirmed] = useState(confirmed);
  if (confirmed !== lastConfirmed) {
    setLastConfirmed(confirmed);
    setValue(confirmed);
  }

  async function toggle() {
    const next = !value;
    setValue(next);
    setSaving(true);
    const res = await fetch(`/api/houses/${houseId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ visitaConfirmada: next }),
    });
    setSaving(false);
    if (!res.ok) {
      setValue(!next);
      toast.error(await apiErrorMessage(res, "No se pudo actualizar la visita."));
      return;
    }
    startRefresh(() => router.refresh());
  }

  if (!editable) {
    return (
      <span
        // Mismo ancho confirmada o no: en mobile el botón Calendario de al
        // lado queda alineado entre una tarjeta y la siguiente.
        className="inline-flex min-w-[7.5rem] shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold"
        style={
          confirmed
            ? { background: "var(--status-gusto-bg)", color: "var(--status-gusto)" }
            : { color: "var(--ink-faint)" }
        }
        title={
          confirmed
            ? "La inmobiliaria o el dueño ya confirmó esta visita"
            : "Todavía no está confirmada por la inmobiliaria o el dueño"
        }
      >
        {confirmed ? <Check size={14} className="shrink-0" /> : <CircleDashed size={14} className="shrink-0" />}
        {confirmed ? "Confirmada" : "Sin confirmar"}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={saving || refreshing}
      aria-pressed={value}
      title={value ? "Visita confirmada — tocá para desmarcarla" : "Marcar la visita como confirmada por la inmobiliaria o el dueño"}
      className="btn flex w-full items-center justify-center gap-1.5 whitespace-nowrap rounded-xl border px-3 py-2 text-xs font-semibold transition-all hover:border-[var(--border-strong)] active:scale-95 disabled:opacity-60 sm:w-auto"
      style={
        value
          ? { borderColor: "var(--status-gusto)", background: "var(--status-gusto-bg)", color: "var(--status-gusto)" }
          : { borderColor: "var(--border)", background: "var(--surface)", color: "var(--ink-muted)" }
      }
    >
      {value ? <Check size={14} className="shrink-0" /> : <CircleDashed size={14} className="shrink-0" />}
      {value ? "Confirmada" : "Marcar confirmada"}
    </button>
  );
}
