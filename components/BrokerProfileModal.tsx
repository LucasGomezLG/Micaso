"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/http";
import BrokerAvatarEditor from "@/components/BrokerAvatarEditor";

/** Editor de perfil del corredor para mobile: en el header angosto solo
 * entra el círculo de foto (BrokerNameEditor se oculta con `hidden
 * sm:inline-flex`), así que tocarlo abre este modal en vez de intentar
 * editar el nombre inline sin espacio. */
export default function BrokerProfileModal({
  initialImagenUrl,
  initialName,
  className,
}: {
  initialImagenUrl: string | null;
  initialName: string;
  className?: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);

  async function saveName() {
    const next = name.trim();
    if (!next || next === initialName) {
      setName(initialName);
      setOpen(false);
      return;
    }
    setSaving(true);
    const res = await fetch("/api/panel/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombreMarca: next }),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error(await apiErrorMessage(res, "No se pudo cambiar el nombre."));
      return;
    }
    router.refresh();
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Editar tu perfil"
        aria-label="Editar tu perfil"
        className={["shrink-0 overflow-hidden rounded-full", className].filter(Boolean).join(" ")}
        style={{ width: 32, height: 32, background: "var(--accent-soft)" }}
      >
        {initialImagenUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={initialImagenUrl} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
        ) : (
          <span className="flex h-full w-full items-center justify-center text-xs font-semibold" style={{ color: "var(--accent)" }}>
            {initialName.slice(0, 1).toUpperCase()}
          </span>
        )}
      </button>

      {open &&
        createPortal(
          <div
            className="animate-overlay fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(18, 24, 31, 0.55)" }}
            onClick={() => setOpen(false)}
          >
            <div
              className="animate-modal-pop w-full max-w-sm rounded-2xl border p-6"
              style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-card)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg">Tu perfil</h3>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Cerrar"
                  className="text-2xl leading-none"
                  style={{ color: "var(--ink-faint)" }}
                >
                  ×
                </button>
              </div>

              <div className="mt-5 flex flex-col items-center gap-2">
                <BrokerAvatarEditor initialImagenUrl={initialImagenUrl} nombreMarca={initialName} size={72} />
                <p className="text-xs" style={{ color: "var(--ink-faint)" }}>
                  Tocá la foto para cambiarla
                </p>
              </div>

              <label className="mt-5 flex flex-col gap-1 text-sm">
                <span className="eyebrow">Nombre de marca</span>
                <input
                  value={name}
                  disabled={saving}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") saveName();
                  }}
                  className="rounded-lg border px-3 py-2"
                  style={{ borderColor: "var(--border)", background: "var(--paper)", color: "var(--ink)" }}
                />
                <span className="text-xs" style={{ color: "var(--ink-faint)" }}>
                  Así te ven tus clientes en cada caso.
                </span>
              </label>

              <div className="mt-5 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-full px-4 py-2 text-xs font-semibold"
                  style={{ border: "1px solid var(--border)", color: "var(--ink-muted)" }}
                >
                  Cerrar
                </button>
                <button
                  type="button"
                  onClick={saveName}
                  disabled={saving || !name.trim()}
                  className="rounded-full px-4 py-2 text-xs font-semibold"
                  style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
                >
                  {saving ? "Guardando…" : "Guardar"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
