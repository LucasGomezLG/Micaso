"use client";

import { useState, useSyncExternalStore } from "react";
import { Clock, X } from "lucide-react";

const STORAGE_KEY = "micaso_plan_gateway_notice_dismissed";

function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getSnapshot() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function getServerSnapshot() {
  return true;
}

export default function PlanGatewayNotice() {
  const isPersistedDismissed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const [localDismissed, setLocalDismissed] = useState(false);

  if (isPersistedDismissed || localDismissed) return null;

  function handleDismiss() {
    setLocalDismissed(true);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
      window.dispatchEvent(new Event("storage"));
    } catch {}
  }

  return (
    <div
      className="mb-8 flex items-start justify-between gap-3 rounded-2xl border p-4 text-xs sm:text-sm"
      style={{
        borderColor: "var(--accent-soft-border)",
        background: "color-mix(in srgb, var(--accent-soft) 50%, var(--surface))",
      }}
    >
      <div className="flex items-start gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
          <Clock size={16} />
        </span>
        <div className="leading-relaxed">
          <p className="font-semibold text-amber-700 dark:text-amber-300">
            Pasarela de cobro automático con tarjeta en desarrollo
          </p>
          <p className="mt-0.5 text-xs" style={{ color: "var(--ink-muted)" }}>
            Estamos finalizando la integración directa con Mercado Pago. Mientras tanto, tu prueba gratuita de 14 días está 100% activa sin costo y cualquier cambio o activación de plan se coordina de manera personalizada y directa por WhatsApp.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={handleDismiss}
        title="Cerrar aviso y no volver a mostrar"
        aria-label="Cerrar aviso y no volver a mostrar"
        className="-mr-1 -mt-1 shrink-0 rounded-lg p-1.5 transition-colors hover:bg-black/5 dark:hover:bg-white/5"
        style={{ color: "var(--ink-faint)" }}
      >
        <X size={16} />
      </button>
    </div>
  );
}
