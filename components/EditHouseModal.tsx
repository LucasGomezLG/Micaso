"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";
import { House } from "@/lib/types";
import { proxiedImage } from "@/lib/format";
import { uploadHousePhoto } from "@/lib/photoUpload";
import { useModalScrollLock } from "@/lib/hooks";
import Select from "@/components/Select";

export default function EditHouseModal({
  house,
  onClose,
  onChange,
}: {
  house: House;
  onClose: () => void;
  onChange: (id: string, patch: Partial<House>) => Promise<boolean>;
}) {
  const [title, setTitle] = useState(house.title);
  const [priceUsd, setPriceUsd] = useState(house.priceUsd !== null ? String(house.priceUsd) : "");
  const [zone, setZone] = useState(house.zone ?? "");
  const [address, setAddress] = useState(house.address ?? "");
  const [ambientes, setAmbientes] = useState(house.ambientes !== null ? String(house.ambientes) : "");
  const [superficieM2, setSuperficieM2] = useState(
    house.superficieM2 !== null ? String(house.superficieM2) : ""
  );
  const [cochera, setCochera] = useState<"unknown" | "yes" | "no">(
    house.cochera === true ? "yes" : house.cochera === false ? "no" : "unknown"
  );
  const [aptoCredito, setAptoCredito] = useState<House["aptoCredito"]>(house.aptoCredito);
  const [images, setImages] = useState<string[]>(house.images);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [contactoNombre, setContactoNombre] = useState(house.contactoNombre ?? "");
  const [contactoTelefono, setContactoTelefono] = useState(house.contactoTelefono ?? "");
  const [proximaAccion, setProximaAccion] = useState(house.proximaAccion ?? "");
  const [proximaAccionFecha, setProximaAccionFecha] = useState(house.proximaAccionFecha ?? "");
  const [visitaFecha, setVisitaFecha] = useState(house.visitaFecha ?? "");
  const [saving, setSaving] = useState(false);

  useModalScrollLock(true, onClose);

  async function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadHousePhoto(file);
      setImages((prev) => [...prev, url]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo subir la foto.");
    } finally {
      setUploading(false);
    }
  }

  async function save() {
    setSaving(true);
    const patch: Partial<House> = {
      title: title.trim() || house.url || "Propiedad sin título",
      priceUsd: priceUsd ? Number(priceUsd) : null,
      zone: zone.trim() || null,
      address: address.trim() || null,
      ambientes: ambientes ? Number(ambientes) : null,
      superficieM2: superficieM2 ? Number(superficieM2) : null,
      cochera: cochera === "unknown" ? null : cochera === "yes",
      aptoCredito,
      images,
      contactoNombre: contactoNombre.trim() || null,
      contactoTelefono: contactoTelefono.trim() || null,
      proximaAccion: proximaAccion.trim() || null,
      proximaAccionFecha: proximaAccionFecha || null,
      visitaFecha: visitaFecha || null,
    };
    const ok = await onChange(house.id, patch);
    setSaving(false);
    if (ok) {
      toast.success("Cambios guardados.");
      onClose();
    }
  }

  return (
    <div
      className="animate-overlay fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="animate-modal-pop max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border p-5"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold">Editar datos</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-7 w-7 items-center justify-center rounded-full text-xl leading-none transition-colors hover:bg-black/5 dark:hover:bg-white/5"
            style={{ color: "var(--ink-faint)" }}
          >
            ×
          </button>
        </div>

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
            <label className="col-span-2 flex flex-col gap-1">
              <span className="eyebrow">Zona</span>
              <input
                className="field"
                value={zone}
                onChange={(e) => setZone(e.target.value)}
                placeholder="Sin dato"
              />
            </label>
            <label className="col-span-2 flex flex-col gap-1">
              <span className="eyebrow">Dirección</span>
              <input
                className="field"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Calle y altura, para el mapa y el calendario"
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="eyebrow">Cochera</span>
              <Select
                className="field"
                value={cochera}
                onChange={(e) => setCochera(e.target.value as "unknown" | "yes" | "no")}
              >
                <option value="unknown">Sin dato</option>
                <option value="yes">Sí</option>
                <option value="no">No</option>
              </Select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="eyebrow">Apto crédito</span>
              <Select
                className="field"
                value={aptoCredito}
                onChange={(e) => setAptoCredito(e.target.value as House["aptoCredito"])}
              >
                <option value="no_se">Sin dato</option>
                <option value="si">Sí</option>
                <option value="no">No</option>
              </Select>
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
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="mt-1 self-start rounded-lg border px-3 py-1.5 text-xs font-medium"
              style={{ borderColor: "var(--border)", color: "var(--ink-muted)" }}
            >
              {uploading ? "Subiendo…" : "o subir una foto desde el dispositivo"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={onFileChange}
              className="hidden"
            />
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

          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between">
              <span className="eyebrow">Fecha y hora de visita coordinada</span>
              {visitaFecha && (
                <button
                  type="button"
                  onClick={() => setVisitaFecha("")}
                  className="text-[11px] font-medium hover:underline"
                  style={{ color: "var(--status-descartada)" }}
                >
                  Limpiar fecha
                </button>
              )}
            </div>
            <input
              type="datetime-local"
              className="field"
              value={visitaFecha}
              onChange={(e) => setVisitaFecha(e.target.value)}
            />
          </div>

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
            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between gap-1">
                <span className="eyebrow">Vence</span>
                {proximaAccionFecha && (
                  <button
                    type="button"
                    onClick={() => setProximaAccionFecha("")}
                    className="text-[10px] font-medium hover:underline"
                    style={{ color: "var(--status-descartada)" }}
                  >
                    Borrar
                  </button>
                )}
              </div>
              <input
                type="date"
                className="field"
                value={proximaAccionFecha}
                onChange={(e) => setProximaAccionFecha(e.target.value)}
              />
            </div>
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
