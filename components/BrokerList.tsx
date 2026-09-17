"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { Broker, SubscriptionStatus, SUBSCRIPTION_STATUS_LABEL } from "@/lib/types";
import AdminBrokerRow from "@/components/AdminBrokerRow";

type TabFilter = "todos" | SubscriptionStatus;

const TABS: TabFilter[] = ["todos", "prueba", "activa", "atrasada", "cancelada"];

export default function BrokerList({
  brokers,
  casesCountByBroker,
}: {
  brokers: Broker[];
  casesCountByBroker: Record<string, { active: number; total: number }>;
}) {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<TabFilter>("todos");

  const countByStatus = useMemo(() => {
    const counts: Record<TabFilter, number> = { todos: brokers.length, prueba: 0, activa: 0, atrasada: 0, cancelada: 0 };
    for (const b of brokers) counts[b.subscriptionStatus]++;
    return counts;
  }, [brokers]);

  const filtered = useMemo(() => {
    let list = brokers;
    if (tab !== "todos") {
      list = list.filter((b) => b.subscriptionStatus === tab);
    }
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter((b) => b.nombreMarca.toLowerCase().includes(q) || b.email.toLowerCase().includes(q));
    }
    return list;
  }, [brokers, tab, search]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div
          className="inline-flex max-w-full overflow-x-auto items-center gap-1 rounded-xl border p-1 text-xs font-medium"
          style={{ background: "color-mix(in srgb, var(--surface) 80%, var(--paper))", borderColor: "var(--border)" }}
        >
          {TABS.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 sm:px-3 transition-all"
              style={{
                background: tab === t ? "var(--surface)" : "transparent",
                color: tab === t ? "var(--ink)" : "var(--ink-muted)",
                boxShadow: tab === t ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                fontWeight: tab === t ? 600 : 500,
              }}
            >
              <span>{t === "todos" ? "Todos" : SUBSCRIPTION_STATUS_LABEL[t]}</span>
              <span
                className="rounded-full px-1.5 py-0.2 text-[10px]"
                style={{
                  background: tab === t ? "var(--accent-soft)" : "transparent",
                  color: tab === t ? "var(--accent)" : "var(--ink-faint)",
                }}
              >
                {countByStatus[t]}
              </span>
            </button>
          ))}
        </div>

        <div className="relative w-full sm:max-w-xs">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--ink-faint)" }} />
          <input
            type="text"
            placeholder="Buscar por nombre o email…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl border py-1.5 pl-8 pr-7 text-xs sm:text-sm outline-none transition-colors"
            style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--ink)" }}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5"
              style={{ color: "var(--ink-faint)" }}
              aria-label="Limpiar búsqueda"
            >
              <X size={13} />
            </button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border p-8 text-center" style={{ background: "var(--surface)", borderColor: "var(--border)" }}>
          <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>
            {search ? `No se encontraron corredores para "${search}"` : "No hay corredores en esta vista."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((broker) => {
            const counts = casesCountByBroker[broker.id] ?? { active: 0, total: 0 };
            return <AdminBrokerRow key={broker.id} broker={broker} activeCases={counts.active} totalCases={counts.total} />;
          })}
        </div>
      )}
    </div>
  );
}
