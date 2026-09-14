"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Loguear el error en consola para diagnóstico
    console.error("Error no capturado en Micaso:", error);
  }, [error]);

  return (
    <div
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-16 text-center"
      style={{ background: "var(--paper)", color: "var(--ink)" }}
    >
      <div
        className="relative z-10 mx-auto flex w-full max-w-md flex-col items-center rounded-3xl border p-8 sm:p-10"
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

        <h1 className="mt-4 text-2xl font-semibold" style={{ fontFamily: "var(--font-display)" }}>
          Ocurrió un error inesperado
        </h1>

        <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--ink-muted)" }}>
          Hubo un inconveniente al cargar la información. Podés intentar recargar la página o volver al inicio.
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
            href="/"
            className="btn inline-flex items-center justify-center gap-2 rounded-full border py-2.5 text-xs sm:text-sm font-medium"
            style={{ borderColor: "var(--border-strong)", color: "var(--ink)" }}
          >
            <Home size={15} /> Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  );
}
