"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Map, Plus, Search, Star, Trash2, X } from "lucide-react";
import { House, HouseStatus, LoanInfo, PIPELINE_STATUSES, STATUS_LABEL } from "@/lib/types";
import { apiErrorMessage } from "@/lib/http";
import HouseCard from "@/components/HouseCard";
import AddHouseModal from "@/components/AddHouseModal";
import Select from "@/components/Select";

export type StageId = "todas" | "por_revisar" | "visitas" | "finalistas" | "descartadas" | "borrada";

interface StageDef {
  id: StageId;
  label: string;
  statuses: HouseStatus[];
  subLabels?: Partial<Record<HouseStatus, string>>;
}

const STAGES: StageDef[] = [
  {
    id: "todas",
    label: "Todas",
    statuses: [],
  },
  {
    id: "por_revisar",
    label: "Por revisar",
    statuses: ["pendiente", "duda_visitar"],
    subLabels: {
      pendiente: "Nuevas",
      duda_visitar: "En duda",
    },
  },
  {
    id: "visitas",
    label: "Visitas",
    statuses: ["a_coordinar", "coordinada"],
    subLabels: {
      a_coordinar: "A coordinar",
      coordinada: "Visita agendada",
    },
  },
  {
    id: "finalistas",
    label: "Finalistas",
    statuses: ["gusto", "oferta", "comprada"],
    subLabels: {
      gusto: "Nos gustó",
      oferta: "En oferta",
      comprada: "Comprada 🎉",
    },
  },
  {
    id: "descartadas",
    label: "Descartadas",
    statuses: ["no_gusto", "descartada"],
    subLabels: {
      no_gusto: "No convenció",
      descartada: "Descartadas",
    },
  },
];

function getInitialState(initialStatus: string): { stage: StageId; subStatus: "todas" | HouseStatus } {
  if (initialStatus === "borrada") {
    return { stage: "borrada", subStatus: "todas" };
  }
  for (const s of STAGES) {
    if (s.statuses.includes(initialStatus as HouseStatus)) {
      return { stage: s.id, subStatus: initialStatus as HouseStatus };
    }
  }
  return { stage: "todas", subStatus: "todas" };
}

type Sort = "recientes" | "precio-asc" | "precio-desc";

export default function CasasBoard({
  houses,
  zones,
  initialStatus,
  loan,
  people,
}: {
  houses: House[];
  zones: string[];
  initialStatus: string;
  loan: LoanInfo;
  people: string[];
}) {
  const router = useRouter();
  const initial = useMemo(() => getInitialState(initialStatus), [initialStatus]);
  const [stage, setStage] = useState<StageId>(initial.stage);
  const [subStatus, setSubStatus] = useState<"todas" | HouseStatus>(initial.subStatus);
  const [zone, setZone] = useState("todas");
  const [sort, setSort] = useState<Sort>("recientes");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  const activeHouses = useMemo(() => houses.filter((h) => h.status !== "borrada"), [houses]);
  const destacadasCount = useMemo(() => activeHouses.filter((h) => h.highlighted).length, [activeHouses]);

  const counts = useMemo(() => {
    const byStatus = { todas: activeHouses.length, borrada: 0 } as Record<string, number>;
    for (const status of PIPELINE_STATUSES) byStatus[status] = 0;
    for (const house of houses) {
      byStatus[house.status] = (byStatus[house.status] || 0) + 1;
    }

    const byStage: Record<StageId, number> = {
      todas: activeHouses.length,
      por_revisar: (byStatus.pendiente || 0) + (byStatus.duda_visitar || 0),
      visitas: (byStatus.a_coordinar || 0) + (byStatus.coordinada || 0),
      finalistas: (byStatus.gusto || 0) + (byStatus.oferta || 0) + (byStatus.comprada || 0),
      descartadas: (byStatus.no_gusto || 0) + (byStatus.descartada || 0),
      borrada: byStatus.borrada || 0,
    };

    return { byStatus, byStage };
  }, [houses, activeHouses]);

  const visible = useMemo(() => {
    let list: House[];
    if (stage === "todas") {
      list = activeHouses;
    } else if (stage === "borrada") {
      list = houses.filter((h) => h.status === "borrada");
    } else {
      const activeStage = STAGES.find((s) => s.id === stage);
      if (!activeStage) {
        list = activeHouses;
      } else if (subStatus !== "todas" && activeStage.statuses.includes(subStatus)) {
        list = houses.filter((h) => h.status === subStatus);
      } else {
        list = houses.filter((h) => activeStage.statuses.includes(h.status));
      }
    }

    if (zone !== "todas") list = list.filter((h) => h.zone === zone);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter(
        (h) =>
          h.title.toLowerCase().includes(q) ||
          (h.zone && h.zone.toLowerCase().includes(q)) ||
          h.source.toLowerCase().includes(q) ||
          (h.contactoNombre && h.contactoNombre.toLowerCase().includes(q)) ||
          h.addedBy.toLowerCase().includes(q) ||
          h.comments.some((c) => c.text.toLowerCase().includes(q))
      );
    }
    list = [...list].sort((a, b) => {
      if (sort === "precio-asc") return (a.priceUsd ?? Infinity) - (b.priceUsd ?? Infinity);
      if (sort === "precio-desc") return (b.priceUsd ?? -Infinity) - (a.priceUsd ?? -Infinity);
      return a.addedAt < b.addedAt ? 1 : -1;
    });
    return list;
  }, [houses, activeHouses, stage, subStatus, zone, sort, searchQuery]);

  function handleSelectStage(newStage: StageId) {
    setStage(newStage);
    setSubStatus("todas");
  }

  const currentStageDef = STAGES.find((s) => s.id === stage);

  async function handleChange(id: string, patch: Partial<House>): Promise<boolean> {
    const res = await fetch(`/api/houses/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      toast.error(await apiErrorMessage(res, "No se pudo guardar el cambio."));
      return false;
    }
    router.refresh();
    return true;
  }

  async function handleDelete(id: string): Promise<boolean> {
    const res = await fetch(`/api/houses/${id}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error(await apiErrorMessage(res, "No se pudo eliminar la propiedad."));
      return false;
    }
    toast.success("Casa eliminada para siempre.");
    router.refresh();
    return true;
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl">Casas</h1>
          <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
            {activeHouses.length} propiedades cargadas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/caso/casas/mapa"
            className="inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium"
            style={{ borderColor: "var(--border)", color: "var(--ink-muted)" }}
          >
            <Map size={15} /> Mapa
          </Link>
          {destacadasCount > 0 && (
            <Link
              href="/caso/casas/comparar"
              className="inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium"
              style={{ borderColor: "var(--border)", color: "var(--ink-muted)" }}
            >
              <Star size={15} /> Comparar destacadas ({destacadasCount})
            </Link>
          )}
          <button
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-semibold"
            style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
          >
            <Plus size={15} /> Agregar casa
          </button>
        </div>
      </div>

      {/* Barra de etapas (Embudo simplificado) */}
      <div className="flex flex-col gap-2.5">
        <div className="-mx-4 flex items-center justify-between gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden [scrollbar-width:none] [-ms-overflow-style:none]">
          <div className="flex shrink-0 items-center gap-2">
            {STAGES.map((s) => {
              const active = stage === s.id;
              const count = counts.byStage[s.id];
              return (
                <button
                  key={s.id}
                  onClick={() => handleSelectStage(s.id)}
                  className="inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-1.5 text-sm font-medium transition-all"
                  style={{
                    background: active ? "var(--accent)" : "var(--surface)",
                    color: active ? "var(--accent-ink)" : "var(--ink-muted)",
                    border: `1px solid ${active ? "var(--accent)" : "var(--border)"}`,
                    boxShadow: active ? "0 2px 8px -2px rgba(0,0,0,0.14)" : "none",
                  }}
                >
                  <span>{s.label}</span>
                  <span
                    className="rounded-full px-1.5 py-0.5 text-xs font-semibold"
                    style={{
                      background: active
                        ? "color-mix(in srgb, var(--accent-ink) 18%, transparent)"
                        : "color-mix(in srgb, var(--ink) 8%, transparent)",
                      color: active ? "var(--accent-ink)" : "var(--ink-muted)",
                    }}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex shrink-0 items-center pl-2">
            <span aria-hidden className="mr-2 h-4 w-px shrink-0" style={{ background: "var(--border)" }} />
            <button
              onClick={() => handleSelectStage("borrada")}
              title="Papelera de propiedades eliminadas"
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-colors"
              style={{
                background: stage === "borrada" ? "var(--status-descartada-bg)" : "transparent",
                color: stage === "borrada" ? "var(--status-descartada)" : "var(--ink-faint)",
                border: `1px solid ${stage === "borrada" ? "var(--status-descartada)" : "transparent"}`,
              }}
            >
              <Trash2 size={13} />
              <span>Papelera</span>
              {counts.byStage.borrada > 0 && <span>· {counts.byStage.borrada}</span>}
            </button>
          </div>
        </div>

        {/* Fila secundaria: sub-filtros de la etapa activa (si tiene sub-estados) */}
        {currentStageDef && currentStageDef.statuses.length > 0 && (
          <div
            className="flex flex-wrap items-center gap-1.5 rounded-xl border p-1.5 text-xs transition-all animate-fade-in"
            style={{
              borderColor: "var(--border)",
              background: "color-mix(in srgb, var(--surface) 65%, var(--paper))",
            }}
          >
            <span className="px-2 font-medium" style={{ color: "var(--ink-faint)" }}>
              Filtrar {currentStageDef.label.toLowerCase()}:
            </span>
            <button
              onClick={() => setSubStatus("todas")}
              className="rounded-lg px-2.5 py-1 font-medium transition-all"
              style={{
                background: subStatus === "todas" ? "var(--surface)" : "transparent",
                color: subStatus === "todas" ? "var(--ink)" : "var(--ink-muted)",
                boxShadow: subStatus === "todas" ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                border: `1px solid ${subStatus === "todas" ? "var(--border-strong)" : "transparent"}`,
              }}
            >
              Todas ({counts.byStage[currentStageDef.id]})
            </button>
            {currentStageDef.statuses.map((st) => {
              const label = currentStageDef.subLabels?.[st] || STATUS_LABEL[st];
              const active = subStatus === st;
              const count = counts.byStatus[st] || 0;
              return (
                <button
                  key={st}
                  onClick={() => setSubStatus(st)}
                  className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 font-medium transition-all"
                  style={{
                    background: active ? "var(--surface)" : "transparent",
                    color: active ? "var(--ink)" : count === 0 ? "var(--ink-faint)" : "var(--ink-muted)",
                    boxShadow: active ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                    border: `1px solid ${active ? "var(--border-strong)" : "transparent"}`,
                  }}
                >
                  <span>{label}</span>
                  <span style={{ opacity: count === 0 ? 0.5 : 0.8 }}>({count})</span>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-xs">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
            style={{ color: "var(--ink-faint)" }}
          />
          <input
            type="text"
            placeholder="Buscar por calle, barrio o inmobiliaria…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border py-1.5 pl-9 pr-8 text-sm outline-none transition-colors"
            style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--ink)" }}
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-0.5"
              style={{ color: "var(--ink-faint)" }}
              aria-label="Limpiar búsqueda"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Select
            value={zone}
            onChange={(e) => setZone(e.target.value)}
            className="rounded-lg border px-3 py-1.5 text-sm"
            style={{ borderColor: "var(--border)", background: "var(--surface)" }}
          >
            <option value="todas">Todas las zonas</option>
            {zones.map((z) => (
              <option key={z} value={z}>
                {z}
              </option>
            ))}
          </Select>
          <Select
            value={sort}
            onChange={(e) => setSort(e.target.value as Sort)}
            className="rounded-lg border px-3 py-1.5 text-sm"
            style={{ borderColor: "var(--border)", background: "var(--surface)" }}
          >
            <option value="recientes">Más recientes</option>
            <option value="precio-asc">Precio: menor a mayor</option>
            <option value="precio-desc">Precio: mayor a menor</option>
          </Select>
        </div>
      </div>

      {stage === "visitas" && (
        <div
          className="flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 text-xs animate-fade-in"
          style={{ background: "var(--accent-soft)", borderColor: "var(--accent-soft-border)", color: "var(--ink)" }}
        >
          <span className="text-base shrink-0">🤝</span>
          <span>
            <strong>Despreocupate del ida y vuelta:</strong> cuando una casa te interese, marcala como <em>&quot;A coordinar&quot;</em>. Tu corredor se encarga de contactar a la inmobiliaria y coordinar la visita para ustedes.
          </span>
        </div>
      )}

      {visible.length === 0 ? (
        <p className="py-12 text-center text-sm" style={{ color: "var(--ink-faint)" }}>
          {searchQuery ? "No se encontraron propiedades para tu búsqueda." : "No hay propiedades en esta vista todavía."}
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((house) => (
            <HouseCard key={house.id} house={house} loan={loan} people={people} onChange={handleChange} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {/* Floating Action Button en móvil */}
      <button
        onClick={() => setShowAdd(true)}
        aria-label="Agregar propiedad"
        className="fixed bottom-20 right-4 z-20 flex h-13 w-13 items-center justify-center rounded-full shadow-lg transition-transform active:scale-95 sm:hidden"
        style={{
          background: "linear-gradient(135deg, var(--accent), var(--gold))",
          color: "var(--accent-ink)",
          boxShadow: "0 8px 24px rgba(0, 0, 0, 0.28)",
        }}
      >
        <Plus size={24} strokeWidth={2.5} />
      </button>

      {showAdd && (
        <AddHouseModal
          people={people}
          existingUrls={houses.map((h) => h.url).filter((u): u is string => u !== null)}
          onClose={() => setShowAdd(false)}
          onCreated={() => {
            setShowAdd(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
