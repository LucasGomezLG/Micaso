"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { formatDate } from "@/lib/format";
import { apiErrorMessage } from "@/lib/http";
import { Broker, Plan, PLAN_LABEL, SubscriptionStatus, SUBSCRIPTION_STATUS_LABEL } from "@/lib/types";

const PLANS: Plan[] = ["para_arrancar", "para_tu_cartera", "volumen_alto"];
const STATUSES: SubscriptionStatus[] = ["prueba", "activa", "atrasada", "cancelada"];

const STATUS_COLOR: Record<SubscriptionStatus, string> = {
  prueba: "var(--status-pendiente)",
  activa: "var(--status-gusto)",
  atrasada: "var(--status-a-coordinar)",
  cancelada: "var(--status-descartada)",
};

export default function AdminBrokerEditor({ broker, caseCount }: { broker: Broker; caseCount: number }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nombreMarca, setNombreMarca] = useState(broker.nombreMarca);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function patch(body: Record<string, string>) {
    setSaving(true);
    const res = await fetch(`/api/superadmin/brokers/${broker.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error(await apiErrorMessage(res, "No se pudo guardar el cambio."));
      return false;
    }
    router.refresh();
    return true;
  }

  async function saveName() {
    const next = nombreMarca.trim();
    setEditingName(false);
    if (!next || next === broker.nombreMarca) {
      setNombreMarca(broker.nombreMarca);
      return;
    }
    const ok = await patch({ nombreMarca: next });
    if (!ok) setNombreMarca(broker.nombreMarca);
  }

  async function eliminarCorredor() {
    setConfirmDelete(false);
    setDeleting(true);
    const res = await fetch(`/api/superadmin/brokers/${broker.id}`, { method: "DELETE" });
    if (!res.ok) {
      setDeleting(false);
      toast.error(await apiErrorMessage(res, "No se pudo eliminar el corredor."));
      return;
    }
    toast.success("Corredor eliminado junto con todos sus casos.");
    router.push("/superadmin");
  }

  return (
    <div
      className="flex flex-col gap-4 rounded-2xl border p-5"
      style={{ borderColor: "var(--border)", background: "var(--surface)", boxShadow: "var(--shadow-card)", opacity: saving ? 0.7 : 1 }}
    >
      <div className="flex flex-wrap items-center gap-3">
        {broker.imagenUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={broker.imagenUrl} alt="" loading="lazy" className="h-12 w-12 shrink-0 rounded-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <span
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-lg font-semibold"
            style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
          >
            {broker.nombreMarca.slice(0, 1).toUpperCase()}
          </span>
        )}
        <div className="min-w-0">
          {editingName ? (
            <input
              autoFocus
              value={nombreMarca}
              disabled={saving}
              onChange={(e) => setNombreMarca(e.target.value)}
              onBlur={saveName}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                if (e.key === "Escape") {
                  setNombreMarca(broker.nombreMarca);
                  setEditingName(false);
                }
              }}
              className="rounded-lg border px-2 py-1 text-base font-semibold"
              style={{ borderColor: "var(--border)", background: "var(--paper)", color: "var(--ink)" }}
            />
          ) : (
            <button
              type="button"
              onClick={() => setEditingName(true)}
              title="Cambiar nombre de marca"
              className="inline-flex items-center gap-1.5 text-base font-semibold"
            >
              {broker.nombreMarca}
              <Pencil size={12} style={{ color: "var(--ink-faint)" }} />
            </button>
          )}
          <p className="mono truncate text-xs" style={{ color: "var(--ink-faint)" }}>
            {broker.email} · alta {formatDate(broker.createdAt)}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-xs">
          <span className="eyebrow">Plan</span>
          <select
            value={broker.plan}
            disabled={saving}
            onChange={(e) => patch({ plan: e.target.value })}
            className="rounded-lg border px-2 py-1.5 text-sm"
            style={{ borderColor: "var(--border)", background: "var(--paper)", color: "var(--ink)" }}
          >
            {PLANS.map((p) => (
              <option key={p} value={p}>
                {PLAN_LABEL[p]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs">
          <span className="eyebrow">Estado de cuenta</span>
          <select
            value={broker.subscriptionStatus}
            disabled={saving}
            onChange={(e) => patch({ subscriptionStatus: e.target.value })}
            className="rounded-full px-2.5 py-1.5 text-sm font-medium"
            style={{ background: `color-mix(in srgb, ${STATUS_COLOR[broker.subscriptionStatus]} 16%, transparent)`, color: STATUS_COLOR[broker.subscriptionStatus], border: "none" }}
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {SUBSCRIPTION_STATUS_LABEL[s]}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1 text-xs">
          <span className="eyebrow">Fin de prueba</span>
          <input
            type="date"
            value={broker.trialEndsAt.slice(0, 10)}
            disabled={saving}
            onChange={(e) => {
              if (!e.target.value) return;
              patch({ trialEndsAt: new Date(`${e.target.value}T23:59:59`).toISOString() });
            }}
            className="mono rounded-lg border px-2 py-1.5 text-sm"
            style={{ borderColor: "var(--border)", background: "var(--paper)", color: "var(--ink)" }}
          />
        </label>
      </div>

      <div className="flex justify-end border-t pt-3" style={{ borderColor: "var(--border)" }}>
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          disabled={deleting}
          className="text-xs font-medium"
          style={{ color: "var(--status-descartada)" }}
        >
          {deleting ? "Eliminando…" : "Eliminar corredor"}
        </button>
      </div>

      {confirmDelete &&
        createPortal(
          <div
            className="animate-overlay fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(18, 24, 31, 0.55)" }}
            onClick={() => setConfirmDelete(false)}
          >
            <div
              className="animate-modal-pop w-full max-w-sm rounded-2xl border p-6"
              style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-card)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg">¿Eliminar a {broker.nombreMarca} para siempre?</h3>
              <p className="mt-1.5 text-sm" style={{ color: "var(--ink-muted)" }}>
                {caseCount > 0
                  ? `Se borran también sus ${caseCount} caso${caseCount === 1 ? "" : "s"} — con casas, checklist y criterios. `
                  : "Este corredor no tiene casos cargados. "}
                No hay forma de deshacer esto.
              </p>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="rounded-full px-4 py-2 text-xs font-semibold"
                  style={{ border: "1px solid var(--border)", color: "var(--ink-muted)" }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={eliminarCorredor}
                  className="rounded-full px-4 py-2 text-xs font-semibold"
                  style={{ background: "var(--status-descartada-bg)", color: "var(--status-descartada)" }}
                >
                  Sí, eliminar para siempre
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
