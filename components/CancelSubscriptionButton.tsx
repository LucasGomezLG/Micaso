"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";
import { createPortal } from "react-dom";
import { toast } from "sonner";
import { apiErrorMessage } from "@/lib/http";
import { useModalScrollLock } from "@/lib/hooks";

export default function CancelSubscriptionButton() {
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useModalScrollLock(confirming, () => {
    if (!loading) setConfirming(false);
  });

  async function handleCancel() {
    setLoading(true);
    try {
      const res = await fetch("/api/panel/subscription", {
        method: "DELETE",
      });

      if (!res.ok) {
        toast.error(await apiErrorMessage(res, "Error al cancelar la suscripción."));
        setLoading(false);
        setConfirming(false);
        return;
      }

      window.location.reload();
    } catch (err) {
      console.error(err);
      toast.error("Hubo un error al intentar cancelar la suscripción. Por favor, intentá de nuevo o contactanos.");
      setLoading(false);
      setConfirming(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        disabled={loading}
        className="btn inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10 transition-colors disabled:opacity-70"
      >
        {loading && <Loader2 size={13} className="animate-spin" />}
        Cancelar Suscripción
      </button>

      {confirming &&
        createPortal(
          <div
            className="animate-overlay fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(18, 24, 31, 0.55)" }}
            onClick={() => {
              if (!loading) setConfirming(false);
            }}
          >
            <div
              className="animate-modal-pop w-full max-w-sm rounded-2xl border p-6"
              style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-card)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg">¿Cancelar tu suscripción?</h3>
              <p className="mt-1.5 text-sm" style={{ color: "var(--ink-muted)" }}>
                Perderás acceso para agregar casos o propiedades nuevas una vez finalizado tu período.
              </p>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirming(false)}
                  disabled={loading}
                  className="rounded-full px-4 py-2 text-xs font-semibold"
                  style={{ border: "1px solid var(--border)", color: "var(--ink-muted)" }}
                >
                  Mantener suscripción
                </button>
                <button
                  type="button"
                  onClick={handleCancel}
                  disabled={loading}
                  className="rounded-full px-4 py-2 text-xs font-semibold"
                  style={{ background: "var(--status-descartada-bg)", color: "var(--status-descartada)" }}
                >
                  {loading ? "Cancelando…" : "Sí, cancelar"}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
