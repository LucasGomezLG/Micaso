"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { formatDate } from "@/lib/format";
import { apiErrorMessage } from "@/lib/http";
import { Broker, Plan, PLAN_CASE_LIMIT, PLAN_LABEL, SubscriptionStatus, SUBSCRIPTION_STATUS_LABEL } from "@/lib/types";

const PLANS: Plan[] = ["para_arrancar", "para_tu_cartera", "volumen_alto"];
const STATUSES: SubscriptionStatus[] = ["prueba", "activa", "atrasada", "cancelada"];

const STATUS_COLOR: Record<SubscriptionStatus, string> = {
  prueba: "var(--status-pendiente)",
  activa: "var(--status-gusto)",
  atrasada: "var(--status-a-coordinar)",
  cancelada: "var(--status-descartada)",
};

export default function AdminBrokerRow({
  broker,
  activeCases,
  totalCases,
}: {
  broker: Broker;
  activeCases: number;
  totalCases: number;
}) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);

  async function patch(body: Record<string, string>) {
    // Reactivar acá no reabre solo los casos que quedaron en solo_lectura
    // por el corte automático (downgradeCasesForInactiveBrokers) — el
    // modelo no distingue eso de un cierre manual del corredor, así que
    // reabrir a ciegas podría deshacer un cierre que sí quería. Se avisa
    // en vez de reabrir solo.
    const reactivating = body.subscriptionStatus === "activa" && broker.subscriptionStatus !== "activa";
    setSaving(true);
    const res = await fetch(`/api/superadmin/brokers/${broker.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error(await apiErrorMessage(res, "No se pudo guardar el cambio."));
      return;
    }
    if (reactivating) {
      toast.success("Corredor reactivado", {
        description: "Si tenía casos en solo lectura por el corte automático, reabrilos a mano desde \"Gestionar →\" — esto no los reabre solo.",
        duration: 8000,
      });
    } else {
      toast.success("Cambio guardado");
    }
    router.refresh();
  }

  const limit = PLAN_CASE_LIMIT[broker.plan];

  return (
    <div
      className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between"
      style={{ borderColor: "var(--border)", background: "var(--surface)", opacity: saving ? 0.6 : 1 }}
    >
      <div className="min-w-0">
        <p className="truncate text-sm font-medium">{broker.nombreMarca}</p>
        <p className="mono truncate text-xs" style={{ color: "var(--ink-faint)" }}>
          {broker.email} · alta {formatDate(broker.createdAt)}
        </p>
        <p className="mt-1 text-xs" style={{ color: "var(--ink-muted)" }}>
          {activeCases} activo{activeCases === 1 ? "" : "s"} de {totalCases} en total
          {limit !== null && <> · tope {limit}</>}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <select
          value={broker.plan}
          disabled={saving}
          onChange={(e) => patch({ plan: e.target.value })}
          className="rounded-lg border px-2 py-1.5 text-xs"
          style={{ borderColor: "var(--border)", background: "var(--paper)", color: "var(--ink)" }}
        >
          {PLANS.map((p) => (
            <option key={p} value={p}>
              {PLAN_LABEL[p]}
            </option>
          ))}
        </select>

        <select
          value={broker.subscriptionStatus}
          disabled={saving}
          onChange={(e) => patch({ subscriptionStatus: e.target.value })}
          className="rounded-full px-2.5 py-1 text-xs font-medium"
          style={{ background: `color-mix(in srgb, ${STATUS_COLOR[broker.subscriptionStatus]} 16%, transparent)`, color: STATUS_COLOR[broker.subscriptionStatus], border: "none" }}
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {SUBSCRIPTION_STATUS_LABEL[s]}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={broker.trialEndsAt.slice(0, 10)}
          disabled={saving}
          title="Fin de la prueba"
          onChange={(e) => {
            if (!e.target.value) return;
            patch({ trialEndsAt: new Date(`${e.target.value}T23:59:59`).toISOString() });
          }}
          className="rounded-lg border px-2 py-1.5 text-xs mono"
          style={{ borderColor: "var(--border)", background: "var(--paper)", color: "var(--ink)" }}
        />

        <Link
          href={`/superadmin/brokers/${broker.id}`}
          className="inline-flex shrink-0 items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold"
          style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
        >
          Gestionar <ChevronRight size={13} />
        </Link>
      </div>
    </div>
  );
}
