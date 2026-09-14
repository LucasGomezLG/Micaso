"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Criteria } from "@/lib/types";

export default function CriteriaEditor({ criteria }: { criteria: Criteria }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(criteria.loan);

  async function save() {
    setSaving(true);
    await fetch("/api/criteria", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loan: form }),
    });
    setSaving(false);
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs font-medium"
        style={{ color: "var(--accent)" }}
      >
        Editar
      </button>
    );
  }

  return (
    <div
      className="fixed inset-0 z-20 flex items-end justify-center bg-black/30 p-4 sm:items-center"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-md rounded-2xl border p-5"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-base font-semibold">Editar crédito</h3>
        <div className="flex flex-col gap-3 text-sm">
          <Field label="Monto aprobado (ARS)">
            <input
              type="number"
              className="field"
              value={form.approvedAmountArs}
              onChange={(e) =>
                setForm({ ...form, approvedAmountArs: Number(e.target.value) })
              }
            />
          </Field>
          <Field label="Cuota aproximada (ARS)">
            <input
              type="number"
              className="field"
              value={form.approvedInstallmentArs}
              onChange={(e) =>
                setForm({ ...form, approvedInstallmentArs: Number(e.target.value) })
              }
            />
          </Field>
          <Field label="Tasa">
            <input
              type="text"
              className="field"
              value={form.rateLabel}
              onChange={(e) => setForm({ ...form, rateLabel: e.target.value })}
            />
          </Field>
          <Field label="Plazo (meses)">
            <input
              type="number"
              className="field"
              value={form.termMonths}
              onChange={(e) => setForm({ ...form, termMonths: Number(e.target.value) })}
            />
          </Field>
          <Field label="Préstamo máximo del banco (USD)">
            <input
              type="number"
              className="field"
              value={form.bankMaxUsd}
              onChange={(e) => setForm({ ...form, bankMaxUsd: Number(e.target.value) })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Ahorro propio mín. (USD)">
              <input
                type="number"
                className="field"
                value={form.ownFundsMinUsd}
                onChange={(e) =>
                  setForm({ ...form, ownFundsMinUsd: Number(e.target.value) })
                }
              />
            </Field>
            <Field label="Ahorro propio máx. (USD)">
              <input
                type="number"
                className="field"
                value={form.ownFundsMaxUsd}
                onChange={(e) =>
                  setForm({ ...form, ownFundsMaxUsd: Number(e.target.value) })
                }
              />
            </Field>
          </div>
          <Field label="Fecha límite para mudarse">
            <input
              type="date"
              className="field"
              value={form.moveOutDeadline}
              onChange={(e) => setForm({ ...form, moveOutDeadline: e.target.value })}
            />
          </Field>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={() => setOpen(false)}
            className="rounded-full px-4 py-2 text-sm font-medium"
            style={{ color: "var(--ink-muted)" }}
          >
            Cancelar
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="rounded-full px-4 py-2 text-sm font-semibold"
            style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
          >
            {saving ? "Guardando…" : "Guardar"}
          </button>
        </div>
      </div>
      <style jsx>{`
        :global(.field) {
          width: 100%;
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 8px 10px;
          background: var(--paper);
          color: var(--ink);
        }
      `}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="eyebrow">{label}</span>
      {children}
    </label>
  );
}
