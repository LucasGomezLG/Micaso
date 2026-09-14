"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";
import { Criteria } from "@/lib/types";
import { apiErrorMessage } from "@/lib/http";

export default function CriteriaEditor({ criteria }: { criteria: Criteria }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(criteria.loan);
  const [newCondition, setNewCondition] = useState("");

  async function save() {
    setSaving(true);
    const res = await fetch("/api/criteria", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ loan: form }),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error(await apiErrorMessage(res, "No se pudo guardar el crédito."));
      return;
    }
    toast.success("Crédito actualizado.");
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
      className="animate-overlay fixed inset-0 z-20 flex items-end justify-center bg-black/30 p-4 sm:items-center"
      onClick={() => setOpen(false)}
    >
      <div
        className="animate-modal-pop max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border p-5"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-base font-semibold">Editar crédito</h3>
        <div className="flex flex-col gap-3 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={form.hasCredit}
              onChange={(e) => setForm({ ...form, hasCredit: e.target.checked })}
            />
            <span>La compra usa crédito hipotecario</span>
          </label>

          {form.hasCredit && (
            <>
              <Field label="Banco">
                <input
                  type="text"
                  className="field"
                  value={form.bankName}
                  onChange={(e) => setForm({ ...form, bankName: e.target.value })}
                />
              </Field>
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
              <Field label="Condiciones del banco">
                <div className="flex flex-col gap-1.5">
                  {form.conditions.map((c, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <span className="flex-1 rounded-lg border px-2 py-1.5 text-sm" style={{ borderColor: "var(--border)", background: "var(--paper)" }}>
                        {c}
                      </span>
                      <button
                        type="button"
                        onClick={() => setForm({ ...form, conditions: form.conditions.filter((_, j) => j !== i) })}
                        className="shrink-0"
                        style={{ color: "var(--ink-faint)" }}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={newCondition}
                      onChange={(e) => setNewCondition(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key !== "Enter" || !newCondition.trim()) return;
                        e.preventDefault();
                        setForm({ ...form, conditions: [...form.conditions, newCondition.trim()] });
                        setNewCondition("");
                      }}
                      placeholder="Ej. seguro de auto contratado con el banco…"
                      className="field"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!newCondition.trim()) return;
                        setForm({ ...form, conditions: [...form.conditions, newCondition.trim()] });
                        setNewCondition("");
                      }}
                      disabled={!newCondition.trim()}
                      className="shrink-0 rounded-lg px-2.5 text-xs font-semibold"
                      style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
                    >
                      Agregar
                    </button>
                  </div>
                </div>
              </Field>
            </>
          )}

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
