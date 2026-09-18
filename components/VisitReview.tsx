"use client";

import { useState } from "react";
import { toast } from "sonner";
import { ClipboardCheck, ClipboardList } from "lucide-react";
import { House } from "@/lib/types";

export default function VisitReview({
  house,
  onChange,
}: {
  house: House;
  onChange: (id: string, patch: Partial<House>) => Promise<boolean>;
}) {
  const [open, setOpen] = useState(false);
  const [bien, setBien] = useState(house.visitReview?.bien ?? "");
  const [faltante, setFaltante] = useState(house.visitReview?.faltante ?? "");
  const [aMejorar, setAMejorar] = useState(house.visitReview?.aMejorar ?? "");
  const [saving, setSaving] = useState(false);

  const filled = house.visitReview && (house.visitReview.bien || house.visitReview.faltante || house.visitReview.aMejorar);

  async function save() {
    setSaving(true);
    const ok = await onChange(house.id, {
      visitReview: { bien: bien.trim(), faltante: faltante.trim(), aMejorar: aMejorar.trim() },
    });
    setSaving(false);
    if (ok) {
      toast.success("Revisión guardada.");
      setOpen(false);
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="inline-flex items-center gap-1.5 text-left text-xs font-medium cursor-pointer"
          style={{ color: filled ? "var(--status-gusto)" : "var(--ink-faint)" }}
        >
          {filled ? (
            <>
              <ClipboardCheck size={13} /> Revisión de la visita
              <span className="text-[10px] text-[var(--accent)] underline ml-1">
                {open ? "Cerrar" : "Editar"}
              </span>
            </>
          ) : (
            <>
              <ClipboardList size={13} /> Completar revisión de la visita
            </>
          )}
        </button>
      </div>

      {!open && filled && (
        <div
          onClick={() => setOpen(true)}
          className="cursor-pointer rounded-xl border p-2 text-xs transition-colors hover:border-[var(--border-strong)] flex flex-col gap-1"
          style={{ background: "var(--paper)", borderColor: "var(--border)" }}
          title="Tocar para ver o editar revisión completa"
        >
          {house.visitReview?.bien && (
            <p className="line-clamp-1" style={{ color: "var(--ink)" }}>
              <strong style={{ color: "var(--status-gusto)" }}>✓ Bien:</strong> {house.visitReview.bien}
            </p>
          )}
          {house.visitReview?.faltante && (
            <p className="line-clamp-1" style={{ color: "var(--ink-muted)" }}>
              <strong style={{ color: "var(--status-descartada)" }}>✗ Faltó:</strong> {house.visitReview.faltante}
            </p>
          )}
          {house.visitReview?.aMejorar && (
            <p className="line-clamp-1" style={{ color: "var(--ink-faint)" }}>
              <strong style={{ color: "var(--gold)" }}>⚡ A mejorar:</strong> {house.visitReview.aMejorar}
            </p>
          )}
        </div>
      )}

      {open && (
        <div className="flex flex-col gap-2 rounded-lg p-2.5" style={{ background: "var(--paper)" }}>
          <label className="flex flex-col gap-1">
            <span className="eyebrow">Lo que está bien</span>
            <textarea
              rows={2}
              value={bien}
              onChange={(e) => setBien(e.target.value)}
              className="rounded-lg border px-2 py-1 text-xs"
              style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--ink)" }}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="eyebrow">Lo que faltó</span>
            <textarea
              rows={2}
              value={faltante}
              onChange={(e) => setFaltante(e.target.value)}
              className="rounded-lg border px-2 py-1 text-xs"
              style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--ink)" }}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="eyebrow">A mejorar</span>
            <textarea
              rows={2}
              value={aMejorar}
              onChange={(e) => setAMejorar(e.target.value)}
              className="rounded-lg border px-2 py-1 text-xs"
              style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--ink)" }}
            />
          </label>
          <button
            onClick={save}
            disabled={saving}
            className="self-end rounded-lg px-3 py-1 text-xs font-semibold"
            style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
          >
            {saving ? "Guardando…" : "Guardar revisión"}
          </button>
        </div>
      )}
    </div>
  );
}
