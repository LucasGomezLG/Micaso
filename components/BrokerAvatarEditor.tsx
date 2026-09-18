"use client";

import { useRef, useState, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Camera, X } from "lucide-react";
import { apiErrorMessage } from "@/lib/http";

const MAX_DIMENSION = 256;
const JPEG_QUALITY = 0.82;

/** Reduce cualquier foto a una miniatura cuadrada liviana antes de
 * mandarla al server — así la foto de perfil se guarda como data URL
 * junto con el resto del corredor (ver lib/brokers.ts updateBroker) sin
 * necesitar un storage de archivos aparte (Vercel Blob u otro, ver
 * ARQUITECTURA.md sección 5) que hoy no está configurado. */
async function compressToDataUrl(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo procesar la imagen.");
  ctx.drawImage(bitmap, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", JPEG_QUALITY);
}

export default function BrokerAvatarEditor({
  initialImagenUrl,
  nombreMarca,
  size = 24,
}: {
  initialImagenUrl: string | null;
  nombreMarca: string;
  size?: number;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [imagenUrl, setImagenUrl] = useState(initialImagenUrl);
  const [saving, setSaving] = useState(false);

  async function save(next: string | null) {
    setSaving(true);
    const res = await fetch("/api/panel/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imagenUrl: next }),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error(await apiErrorMessage(res, "No se pudo guardar la foto."));
      return;
    }
    setImagenUrl(next);
    router.refresh();
  }

  async function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Elegí un archivo de imagen.");
      return;
    }
    try {
      const dataUrl = await compressToDataUrl(file);
      await save(dataUrl);
      toast.success("Foto actualizada.");
    } catch {
      toast.error("No se pudo procesar esa imagen.");
    }
  }

  return (
    <span className="group relative inline-flex shrink-0" style={{ width: size, height: size }}>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={saving}
        title="Cambiar foto de perfil"
        className="relative flex items-center justify-center overflow-hidden rounded-full"
        style={{ width: size, height: size, background: "var(--accent-soft)" }}
      >
        {imagenUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imagenUrl} alt="" loading="lazy" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <span className="font-semibold" style={{ color: "var(--accent)", fontSize: size * 0.46 }}>
            {nombreMarca.slice(0, 1).toUpperCase()}
          </span>
        )}
        <span className="absolute inset-0 hidden items-center justify-center bg-black/40 group-hover:flex" aria-hidden>
          <Camera size={Math.max(11, size * 0.42)} color="#fff" />
        </span>
      </button>
      {imagenUrl && (
        <button
          type="button"
          onClick={() => save(null)}
          disabled={saving}
          title="Quitar foto"
          className="absolute -right-1 -top-1 hidden items-center justify-center rounded-full group-hover:flex"
          style={{ width: 14, height: 14, background: "var(--status-descartada)", color: "#fff" }}
        >
          <X size={9} />
        </button>
      )}
      <input ref={inputRef} type="file" accept="image/*" onChange={onFileChange} className="hidden" />
    </span>
  );
}
