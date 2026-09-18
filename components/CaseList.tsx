"use client";

import { useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { Case } from "@/lib/types";
import type { CaseSummary } from "@/lib/store";
import { AttentionItem } from "@/components/PanelDashboard";
import CaseRow from "@/components/CaseRow";
import Select from "@/components/Select";

interface CaseListProps {
  cases: Case[];
  summaries: Record<string, CaseSummary>;
  attentionItems: AttentionItem[];
}

type TabFilter = "todos" | "activos" | "cerrados";
type CaseSort = "recientes" | "alfabetico" | "propiedades";

export default function CaseList({ cases, summaries, attentionItems }: CaseListProps) {
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState<TabFilter>("activos");
  const [sort, setSort] = useState<CaseSort>("recientes");

  function alertFor(caseId: string): "overdue" | "soon" | null {
    const hit = attentionItems.find((item) => item.caseId === caseId);
    return hit?.kind ?? null;
  }

  const activeCount = useMemo(() => cases.filter((c) => c.estado === "activo").length, [cases]);
  const closedCount = useMemo(() => cases.filter((c) => c.estado !== "activo").length, [cases]);

  const filteredCases = useMemo(() => {
    let list = cases;

    // Filtro por pestaña
    if (tab === "activos") {
      list = list.filter((c) => c.estado === "activo");
    } else if (tab === "cerrados") {
      list = list.filter((c) => c.estado !== "activo");
    }

    // Filtro por búsqueda de texto
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (c) =>
          c.titulo.toLowerCase().includes(q) ||
          c.people.some((p) => p.toLowerCase().includes(q)) ||
          c.username.toLowerCase().includes(q)
      );
    }

    // Ordenamiento
    const sorted = [...list];
    if (sort === "alfabetico") {
      sorted.sort((a, b) => a.titulo.localeCompare(b.titulo, "es-AR"));
    } else if (sort === "propiedades") {
      sorted.sort((a, b) => {
        const countA = summaries[a.id]?.totalHouses ?? 0;
        const countB = summaries[b.id]?.totalHouses ?? 0;
        return countB - countA;
      });
    } else {
      // Recientes (por última actividad o fecha de creación)
      sorted.sort((a, b) => {
        const actA = summaries[a.id]?.lastActivity ?? a.createdAt;
        const actB = summaries[b.id]?.lastActivity ?? b.createdAt;
        if (actA === actB) return 0;
        return actA < actB ? 1 : -1;
      });
    }

    return sorted;
  }, [cases, tab, search, sort, summaries]);

  return (
    <div className="mt-8 flex flex-col gap-4">
      {/* Barra de Filtros y Búsqueda */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Pestañas de estado */}
        <div
          className="inline-flex max-w-full overflow-x-auto items-center gap-1 rounded-xl border p-1 text-xs font-medium"
          style={{
            background: "color-mix(in srgb, var(--surface) 80%, var(--paper))",
            borderColor: "var(--border)",
          }}
        >
          <button
            type="button"
            onClick={() => setTab("activos")}
            className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 sm:px-3 transition-all"
            style={{
              background: tab === "activos" ? "var(--surface)" : "transparent",
              color: tab === "activos" ? "var(--ink)" : "var(--ink-muted)",
              boxShadow: tab === "activos" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              fontWeight: tab === "activos" ? 600 : 500,
            }}
          >
            <span>Activos</span>
            <span
              className="rounded-full px-1.5 py-0.2 text-[10px]"
              style={{
                background: tab === "activos" ? "var(--status-gusto-bg)" : "transparent",
                color: tab === "activos" ? "var(--status-gusto)" : "var(--ink-faint)",
              }}
            >
              {activeCount}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTab("todos")}
            className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 sm:px-3 transition-all"
            style={{
              background: tab === "todos" ? "var(--surface)" : "transparent",
              color: tab === "todos" ? "var(--ink)" : "var(--ink-muted)",
              boxShadow: tab === "todos" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              fontWeight: tab === "todos" ? 600 : 500,
            }}
          >
            <span>Todos</span>
            <span
              className="rounded-full px-1.5 py-0.2 text-[10px]"
              style={{
                background: tab === "todos" ? "var(--accent-soft)" : "transparent",
                color: tab === "todos" ? "var(--accent)" : "var(--ink-faint)",
              }}
            >
              {cases.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTab("cerrados")}
            className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 sm:px-3 transition-all"
            style={{
              background: tab === "cerrados" ? "var(--surface)" : "transparent",
              color: tab === "cerrados" ? "var(--ink)" : "var(--ink-muted)",
              boxShadow: tab === "cerrados" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
              fontWeight: tab === "cerrados" ? 600 : 500,
            }}
          >
            <span>Cerrados</span>
            <span
              className="rounded-full px-1.5 py-0.2 text-[10px]"
              style={{
                background: tab === "cerrados" ? "var(--status-pendiente-bg)" : "transparent",
                color: tab === "cerrados" ? "var(--status-pendiente)" : "var(--ink-faint)",
              }}
            >
              {closedCount}
            </span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <Select
            value={sort}
            onChange={(e) => setSort(e.target.value as CaseSort)}
            className="rounded-xl border py-1.5 px-2.5 text-xs sm:text-sm"
            style={{
              borderColor: "var(--border)",
              background: "var(--surface)",
              color: "var(--ink)",
            }}
          >
            <option value="recientes">Más recientes</option>
            <option value="alfabetico">A–Z (Nombre)</option>
            <option value="propiedades">Más propiedades</option>
          </Select>

          {/* Buscador de casos */}
          <div className="relative flex-1 sm:w-60">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: "var(--ink-faint)" }}
            />
            <input
              type="text"
              placeholder="Buscar por caso o cliente…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border py-1.5 pl-8 pr-7 text-xs sm:text-sm outline-none transition-colors"
              style={{
                borderColor: "var(--border)",
                background: "var(--surface)",
                color: "var(--ink)",
              }}
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
      </div>

      {/* Lista de Casos filtrados */}
      {filteredCases.length === 0 ? (
        <div
          className="rounded-2xl border p-8 text-center"
          style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        >
          <p className="text-sm font-medium" style={{ color: "var(--ink)" }}>
            {search ? `No se encontraron casos para "${search}"` : "No hay casos en esta vista."}
          </p>
          <p className="mt-1 text-xs" style={{ color: "var(--ink-muted)" }}>
            {search ? "Probá buscando por otro término o limpiá la barra de búsqueda." : "Cambiá de pestaña para ver otros casos."}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredCases.map((kase) => (
            <CaseRow
              key={kase.id}
              initialCase={kase}
              summary={summaries[kase.id]}
              alert={alertFor(kase.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
