"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ChecklistItem, TipoCaso } from "@/lib/types";
import { apiErrorMessage } from "@/lib/http";
import Select from "@/components/Select";

const SUBTITLE: Record<TipoCaso, string> = {
  compra: "Todo lo que falta para llegar de un pre-aprobado a la escritura.",
  alquiler: "Todo lo que falta para llegar de la búsqueda a las llaves en mano.",
  otro: "Todo lo que falta para cerrar la operación.",
};

export default function ChecklistClient({
  items,
  people,
  tipoCaso,
}: {
  items: ChecklistItem[];
  people: string[];
  tipoCaso: TipoCaso;
}) {
  const router = useRouter();
  const [pending, setPending] = useState<Set<string>>(new Set());

  const groups = useMemo(() => {
    const map = new Map<string, ChecklistItem[]>();
    for (const item of items) {
      if (!map.has(item.group)) map.set(item.group, []);
      map.get(item.group)!.push(item);
    }
    return Array.from(map.entries());
  }, [items]);

  const done = items.filter((i) => i.done).length;
  const progress = items.length ? Math.round((done / items.length) * 100) : 0;

  // Arranca en 0 y sube al progreso real después del primer render, para
  // que la barra se llene animada al entrar a la página (no solo cuando
  // cambia un ítem más tarde).
  const [barWidth, setBarWidth] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setBarWidth(progress));
    return () => cancelAnimationFrame(id);
  }, [progress]);

  async function patch(id: string, body: Partial<ChecklistItem>) {
    setPending((s) => new Set(s).add(id));
    const res = await fetch(`/api/checklist/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    setPending((s) => {
      const next = new Set(s);
      next.delete(id);
      return next;
    });
    if (!res.ok) {
      toast.error(await apiErrorMessage(res, "No se pudo actualizar el ítem."));
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl">Checklist</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
          {SUBTITLE[tipoCaso]}
        </p>
      </div>

      <div>
        <div className="flex items-center justify-between text-sm">
          <span style={{ color: "var(--ink-muted)" }}>Progreso</span>
          <span className="mono">{done}/{items.length}</span>
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full" style={{ background: "var(--border)" }}>
          <div
            className="h-full rounded-full transition-[width] duration-700 ease-out"
            style={{ width: `${barWidth}%`, background: "var(--status-gusto)" }}
          />
        </div>
      </div>

      <div className="flex flex-col gap-5">
        {groups.map(([group, groupItems]) => (
          <div
            key={group}
            className="rounded-2xl border p-5"
            style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-card)" }}
          >
            <h2 className="mb-3 text-base font-semibold">{group}</h2>
            <div className="flex flex-col divide-y" style={{ borderColor: "var(--border)" }}>
              {groupItems.map((item) => (
                <div key={item.id} className="flex flex-wrap items-center gap-3 py-2.5" style={{ opacity: pending.has(item.id) ? 0.6 : 1 }}>
                  <input
                    type="checkbox"
                    checked={item.done}
                    onChange={(e) => patch(item.id, { done: e.target.checked })}
                    className="h-4 w-4"
                  />
                  <span
                    className="flex-1 text-sm"
                    style={{
                      textDecoration: item.done ? "line-through" : "none",
                      color: item.done ? "var(--ink-faint)" : "var(--ink)",
                    }}
                  >
                    {item.label}
                  </span>
                  <Select
                    value={item.assignedTo ?? ""}
                    onChange={(e) => patch(item.id, { assignedTo: e.target.value || null })}
                    wrapperClassName="shrink-0"
                    className="rounded-lg border px-2 py-1 text-xs"
                    style={{ borderColor: "var(--border)", background: "var(--paper)", color: "var(--ink)" }}
                  >
                    <option value="">Sin asignar</option>
                    {people.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </Select>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
