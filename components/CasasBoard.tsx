"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Map, Plus, Star, Trash2 } from "lucide-react";
import { House, HouseStatus, LoanInfo, PIPELINE_STATUSES, STATUS_LABEL } from "@/lib/types";
import { apiErrorMessage } from "@/lib/http";
import HouseCard from "@/components/HouseCard";
import AddHouseModal from "@/components/AddHouseModal";
import Select from "@/components/Select";

type Tab = "todas" | HouseStatus;

const TABS: Tab[] = ["todas", ...PIPELINE_STATUSES, "borrada"];
// Visual grouping only — a thin divider is drawn before the first tab of
// each of these groups (deal-progress stages, then the trash).
const GROUP_STARTS = new Set<Tab>(["oferta", "borrada"]);
const TAB_LABEL: Record<Tab, string> = {
  todas: "Todas",
  ...STATUS_LABEL,
};

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
  const [tab, setTab] = useState<Tab>(
    TABS.includes(initialStatus as Tab) ? (initialStatus as Tab) : "todas"
  );
  const [zone, setZone] = useState("todas");
  const [sort, setSort] = useState<Sort>("recientes");
  const [showAdd, setShowAdd] = useState(false);

  const activeHouses = useMemo(() => houses.filter((h) => h.status !== "borrada"), [houses]);
  const destacadasCount = useMemo(() => activeHouses.filter((h) => h.highlighted).length, [activeHouses]);

  const counts = useMemo(() => {
    const base = { todas: activeHouses.length } as Record<Tab, number>;
    for (const status of PIPELINE_STATUSES) base[status] = 0;
    base.borrada = 0;
    for (const house of houses) base[house.status]++;
    return base;
  }, [houses, activeHouses]);

  const visible = useMemo(() => {
    let list = tab === "todas" ? activeHouses : houses.filter((h) => h.status === tab);
    if (zone !== "todas") list = list.filter((h) => h.zone === zone);
    list = [...list].sort((a, b) => {
      if (sort === "precio-asc") return (a.priceUsd ?? Infinity) - (b.priceUsd ?? Infinity);
      if (sort === "precio-desc") return (b.priceUsd ?? -Infinity) - (a.priceUsd ?? -Infinity);
      return a.addedAt < b.addedAt ? 1 : -1;
    });
    return list;
  }, [houses, tab, zone, sort]);

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

      <div className="-mx-4 flex items-center gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0">
        {TABS.map((t) => (
          <span key={t} className="flex shrink-0 items-center gap-2">
            {GROUP_STARTS.has(t) && (
              <span aria-hidden className="mx-1 h-5 w-px shrink-0" style={{ background: "var(--border)" }} />
            )}
            <button
              onClick={() => setTab(t)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium"
              style={{
                background: tab === t ? "var(--accent)" : "var(--surface)",
                color:
                  tab === t
                    ? "var(--accent-ink)"
                    : t === "borrada"
                      ? "var(--ink-faint)"
                      : "var(--ink-muted)",
                border: `1px solid ${tab === t ? "var(--accent)" : "var(--border)"}`,
              }}
            >
              {t === "borrada" && <Trash2 size={13} />}
              {TAB_LABEL[t]} · {counts[t]}
            </button>
          </span>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
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

      {visible.length === 0 ? (
        <p className="py-12 text-center text-sm" style={{ color: "var(--ink-faint)" }}>
          No hay propiedades en esta vista todavía.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((house) => (
            <HouseCard key={house.id} house={house} loan={loan} people={people} onChange={handleChange} onDelete={handleDelete} />
          ))}
        </div>
      )}

      {showAdd && (
        <AddHouseModal
          people={people}
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
