"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { House } from "@/lib/types";
import { proxiedImage } from "@/lib/format";

export default function EditHouseModal({
  house,
  onClose,
  onChange,
}: {
  house: House;
  onClose: () => void;
  onChange: (id: string, patch: Partial<House>) => void | Promise<void>;
}) {
  const [title, setTitle] = useState(house.title);
  const [priceUsd, setPriceUsd] = useState(house.priceUsd !== null ? String(house.priceUsd) : "");
  const [zone, setZone] = useState(house.zone ?? "");
  const [ambientes, setAmbientes] = useState(house.ambientes !== null ? String(house.ambientes) : "");
  const [superficieM2, setSuperficieM2] = useState(
    house.superficieM2 !== null ? String(house.superficieM2) : ""
  );
  const [cochera, setCochera] = useState<"unknown" | "yes" | "no">(
    house.cochera === true ? "yes" : house.cochera === false ? "no" : "unknown"
  );
  const [images, setImages] = useState<string[]>(house.images);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [contactoNombre, setContactoNombre] = useState(house.contactoNombre ?? "");
  const [contactoTelefono, setContactoTelefono] = useState(house.contactoTelefono ?? "");
  const [proximaAccion, setProximaAccion] = useState(house.proximaAccion ?? "");
  const [proximaAccionFecha, setProximaAccionFecha] = useState(house.proximaAccionFecha ?? "");
  const [visitaFecha, setVisitaFecha] = useState(house.visitaFecha ?? "");
  const [saving, setSaving] = useState(false);

  async function save() {
    setSaving(true);
    const patch: Partial<House> = {
      title: title.trim() || house.url,
      priceUsd: priceUsd ? Number(priceUsd) : null,
      zone: zone.trim() || null,
      ambientes: ambientes ? Number(ambientes) : null,
      superficieM2: superficieM2 ? Number(superficieM2) : null,
      cochera: cochera === "unknown" ? null : cochera === "yes",
      images,
      contactoNombre: contactoNombre.trim() || null,
      contactoTelefono: contactoTelefono.trim() || null,
      proximaAccion: proximaAccion.trim() || null,
      proximaAccionFecha: proximaAccionFecha || null,
      visitaFecha: visitaFecha || null,
    };
    await onChange(house.id, patch);
    setSaving(false);
    onClose();
  }

  return (
    <div
      className="animate-overlay fixed inset-0 z-20 flex items-end justify-center bg-black/30 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="animate-modal-pop max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border p-5"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-base font-semibold">Editar datos</h3>

        <div className="flex flex-col gap-3 text-sm">
          <p className="eyebrow -mb-1">Propiedad</p>

          <label className="flex flex-col gap-1">
            <span className="eyebrow">Título</span>
            <input className="field" value={title} onChange={(e) => setTitle(e.target.value)} />
          </label>

          <div className="grid grid-cols-3 gap-3">
            <label className="flex flex-col gap-1">
              <span className="eyebrow">Precio (USD)</span>
              <input
                type="number"
                className="field"
                value={priceUsd}
                onChange={(e) => setPriceUsd(e.target.value)}
                placeholder="Sin dato"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="eyebrow">Ambientes</span>
              <input
                type="number"
                className="field"
                value={ambientes}
                onChange={(e) => setAmbientes(e.target.value)}
                placeholder="Sin dato"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="eyebrow">Superficie (m²)</span>
              <input
                type="number"
                className="field"
                value={superficieM2}
                onChange={(e) => setSuperficieM2(e.target.value)}
                placeholder="Sin dato"
              />
            </label>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="eyebrow">Zona</span>
              <input
                className="field"
                value={zone}
                onChange={(e) => setZone(e.target.value)}
                placeholder="Sin dato"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="eyebrow">Cochera</span>
              <select
                className="field"
                value={cochera}
                onChange={(e) => setCochera(e.target.value as "unknown" | "yes" | "no")}
              >
                <option value="unknown">Sin dato</option>
                <option value="yes">Sí</option>
                <option value="no">No</option>
              </select>
            </label>
          </div>

          <div className="flex flex-col gap-1">
            <span className="eyebrow">Fotos</span>
            {images.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((img, i) => (
                  <div key={img} className="relative shrink-0">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={proxiedImage(img) ?? undefined}
                      alt=""
                      className="h-20 w-28 rounded-lg object-cover"
                      onError={(e) => (e.currentTarget.style.opacity = "0.3")}
                    />
                    <button
                      type="button"
                      onClick={() => setImages(images.filter((_, j) => j !== i))}
                      className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full"
                      style={{ background: "rgba(0,0,0,0.6)", color: "#fff" }}
                    >
                      <X size={12} />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                className="field"
                value={newImageUrl}
                onChange={(e) => setNewImageUrl(e.target.value)}
                placeholder="Pegar URL de una foto (si no se pudo traer sola)"
              />
              <button
                type="button"
                onClick={() => {
                  if (!newImageUrl.trim()) return;
                  setImages([...images, newImageUrl.trim()]);
                  setNewImageUrl("");
                }}
                className="shrink-0 rounded-lg border px-3 text-xs font-medium"
                style={{ borderColor: "var(--border)" }}
              >
                Agregar
              </button>
            </div>
          </div>

          <p className="eyebrow -mb-1 mt-2 border-t pt-3" style={{ borderColor: "var(--border)" }}>
            Seguimiento
          </p>

          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="eyebrow">Contacto (nombre)</span>
              <input
                className="field"
                value={contactoNombre}
                onChange={(e) => setContactoNombre(e.target.value)}
                placeholder="Inmobiliaria / dueño"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="eyebrow">Teléfono</span>
              <input
                className="field"
                value={contactoTelefono}
                onChange={(e) => setContactoTelefono(e.target.value)}
                placeholder="11-...."
              />
            </label>
          </div>

          <label className="flex flex-col gap-1">
            <span className="eyebrow">Fecha y hora de visita coordinada</span>
            <input
              type="datetime-local"
              className="field"
              value={visitaFecha}
              onChange={(e) => setVisitaFecha(e.target.value)}
            />
          </label>

          <div className="grid grid-cols-[1fr_auto] gap-3">
            <label className="flex flex-col gap-1">
              <span className="eyebrow">Próxima acción</span>
              <input
                className="field"
                value={proximaAccion}
                onChange={(e) => setProximaAccion(e.target.value)}
                placeholder="Ej: llamar a la inmobiliaria"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="eyebrow">Vence</span>
              <input
                type="date"
                className="field"
                value={proximaAccionFecha}
                onChange={(e) => setProximaAccionFecha(e.target.value)}
              />
            </label>
          </div>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
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
