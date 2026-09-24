"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { X } from "lucide-react";
import { Criteria } from "@/lib/types";
import { apiErrorMessage } from "@/lib/http";
import { formatDecimalInput, parseDecimalInput } from "@/lib/format";
import { useModalScrollLock } from "@/lib/hooks";

export default function CriteriaEditor({ criteria }: { criteria: Criteria }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(criteria.loan);
  const [newCondition, setNewCondition] = useState("");

  useModalScrollLock(open, () => setOpen(false));

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

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setForm(criteria.loan);
          setOpen(true);
        }}
        className="text-xs font-medium cursor-pointer"
        style={{ color: "var(--accent)" }}
      >
        Editar
      </button>

      {open &&
        createPortal(
          <div
            className="animate-overlay fixed inset-0 z-50 flex items-end justify-center p-4 sm:items-center"
            style={{ background: "rgba(18, 24, 31, 0.65)", backdropFilter: "blur(2px)" }}
            onClick={() => setOpen(false)}
          >
            <div
              className="animate-modal-pop max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border p-5"
              style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-card)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-base font-semibold">Editar crédito</h3>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Cerrar"
                  className="flex h-7 w-7 items-center justify-center rounded-full text-xl leading-none transition-colors hover:bg-black/5 dark:hover:bg-white/5 cursor-pointer"
                  style={{ color: "var(--ink-faint)" }}
                >
                  ×
                </button>
              </div>
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
              <DecimalField
                label="Monto aprobado (ARS)"
                value={form.approvedAmountArs}
                onChange={(n) => setForm({ ...form, approvedAmountArs: n })}
              />
              <DecimalField
                label="Cuota aproximada (ARS)"
                value={form.approvedInstallmentArs}
                onChange={(n) => setForm({ ...form, approvedInstallmentArs: n })}
              />
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
                  onChange={(e) => setForm({ ...form, termMonths: Number(e.target.value) || 0 })}
                />
              </Field>
              <DecimalField
                label="Cotización del dólar (ARS)"
                value={form.fxRateArs}
                onChange={(n) => setForm({ ...form, fxRateArs: n })}
              />
              <Field label="Préstamo máximo del banco (USD)">
                <div className="flex gap-1.5">
                  <input
                    type="number"
                    className="field"
                    value={form.bankMaxUsd}
                    onChange={(e) => setForm({ ...form, bankMaxUsd: Number(e.target.value) || 0 })}
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        bankMaxUsd: Math.round(form.approvedAmountArs / form.fxRateArs),
                      })
                    }
                    disabled={!(form.approvedAmountArs > 0 && form.fxRateArs > 0)}
                    title="Recalcular a partir del Monto aprobado y la cotización del dólar"
                    className="shrink-0 rounded-lg px-2.5 text-xs font-semibold disabled:opacity-40"
                    style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
                  >
                    Autocalcular
                  </button>
                </div>
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
                  setForm({ ...form, ownFundsMinUsd: Number(e.target.value) || 0 })
                }
              />
            </Field>
            <Field label="Ahorro propio máx. (USD)">
              <input
                type="number"
                className="field"
                value={form.ownFundsMaxUsd}
                onChange={(e) =>
                  setForm({ ...form, ownFundsMaxUsd: Number(e.target.value) || 0 })
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
        </div>,
        document.body
      )}
    </>
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

/** Input de plata con coma decimal (formato argentino) — un
 * `type="number"` nativo no deja tipear "," como separador decimal en la
 * mayoría de los navegadores. Mantiene su propio string mientras se
 * escribe (en vez de derivarlo de `value` en cada tecleo) para no borrar
 * la coma que el usuario recién tipeó antes de que pueda seguir
 * escribiendo los decimales; sincroniza el texto mostrado con el número
 * real recién al perder el foco. */
function DecimalField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
}) {
  const [text, setText] = useState(() => formatDecimalInput(value));

  return (
    <Field label={label}>
      <input
        type="text"
        inputMode="decimal"
        className="field"
        value={text}
        onChange={(e) => {
          const raw = e.target.value;
          if (!/^\d*([.,]\d{0,2})?$/.test(raw)) return;
          setText(raw);
          onChange(parseDecimalInput(raw));
        }}
        onBlur={() => setText(formatDecimalInput(value))}
      />
    </Field>
  );
}
