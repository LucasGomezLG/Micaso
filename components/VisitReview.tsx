"use client";

import { useState } from "react";
import { House } from "@/lib/types";

export default function VisitReview({
  house,
  onChange,
}: {
  house: House;
  onChange: (id: string, patch: Partial<House>) => void | Promise<void>;
}) {
  const [open, setOpen] = useState(false);
  const [bien, setBien] = useState(house.visitReview?.bien ?? "");
  const [faltante, setFaltante] = useState(house.visitReview?.faltante ?? "");
  const [aMejorar, setAMejorar] = useState(house.visitReview?.aMejorar ?? "");
  const [saving, setSaving] = useState(false);

  const filled = house.visitReview && (house.visitReview.bien || house.visitReview.faltante || house.visitReview.aMejorar);

  async function save() {
    setSaving(true);
    await onChange(house.id, {
      visitReview: { bien: bien.trim(), faltante: faltante.trim(), aMejorar: aMejorar.trim() },
    });
    setSaving(false);
    setOpen(false);
  }

  return (
    <div className="flex flex-col gap-2">
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-left text-xs font-medium"
        style={{ color: filled ? "var(--status-gusto)" : "var(--ink-faint)" }}
      >
        {filled ? "✅ Revisión de la visita" : "📋 Completar revisión de la visita"}
      </button>

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
