"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function CasoError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Loguear el error en consola para diagnóstico
    console.error("Error capturado en /caso:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div
        className="flex w-full max-w-md flex-col items-center rounded-3xl border p-8 sm:p-10"
        style={{
          borderColor: "var(--border)",
          background: "var(--surface)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <span
          className="flex h-12 w-12 items-center justify-center rounded-2xl"
          style={{ background: "var(--status-descartada-bg)", color: "var(--status-descartada)" }}
        >
          <AlertTriangle size={24} />
        </span>

        <h2 className="mt-4 text-xl font-semibold" style={{ color: "var(--ink)" }}>
          Error de conexión
        </h2>

        <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--ink-muted)" }}>
          Hubo un inconveniente al cargar la información del caso. Podés intentar recargar la página.
        </p>

        {error.digest && (
          <p className="mt-2 text-[10px] font-mono" style={{ color: "var(--ink-faint)" }}>
            Código: {error.digest}
          </p>
        )}

        <div className="mt-8 flex w-full flex-col gap-2.5">
          <button
            type="button"
            onClick={() => reset()}
            className="btn btn-primary inline-flex items-center justify-center gap-2 rounded-full py-2.5 text-xs sm:text-sm font-semibold shadow-sm"
            style={{
              background: "linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 70%, var(--gold)))",
              color: "var(--accent-ink)",
            }}
          >
            <RefreshCw size={15} /> Reintentar
          </button>
          
          <Link
            href="/caso"
            className="btn inline-flex items-center justify-center gap-2 rounded-full border py-2.5 text-xs sm:text-sm font-medium"
            style={{ borderColor: "var(--border-strong)", color: "var(--ink)" }}
          >
            <Home size={15} /> Volver al resumen del caso
          </Link>
        </div>
      </div>
    </div>
  );
}
