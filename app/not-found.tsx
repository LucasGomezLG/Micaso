import Link from "next/link";
import { ArrowLeft, Home, LayoutDashboard } from "lucide-react";
import { MicasoMark } from "@/components/MicasoMark";
import ThemeToggle from "@/components/ThemeToggle";

export default function NotFound() {
  return (
    <div
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-16 text-center"
      style={{ background: "var(--paper)", color: "var(--ink)" }}
    >
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="bg-dot-grid absolute inset-0" style={{ opacity: 0.6 }} />
        <div
          className="animate-blob absolute -top-40 left-1/3 h-[28rem] w-[28rem] rounded-full blur-3xl"
          style={{ background: "var(--accent)", opacity: 0.3 }}
        />
        <div
          className="animate-blob absolute -bottom-40 right-1/4 h-[24rem] w-[24rem] rounded-full blur-3xl"
          style={{ background: "var(--gold)", opacity: 0.25, animationDelay: "-5s" }}
        />
      </div>

      <div className="absolute right-6 top-6 z-10">
        <ThemeToggle />
      </div>

      <div
        className="relative z-10 mx-auto flex w-full max-w-md flex-col items-center rounded-3xl border p-8 sm:p-10"
        style={{
          borderColor: "var(--border)",
          background: "var(--surface)",
          boxShadow: "var(--shadow-card)",
        }}
      >
        <span
          className="flex h-12 w-12 items-center justify-center rounded-2xl shadow-sm"
          style={{ background: "linear-gradient(135deg, var(--accent), var(--gold))" }}
        >
          <MicasoMark size={24} color="var(--accent-ink)" />
        </span>

        <span
          className="mt-6 rounded-full px-3 py-1 text-xs font-bold"
          style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
        >
          Error 404
        </span>

        <h1 className="mt-3 text-3xl font-semibold" style={{ fontFamily: "var(--font-display)" }}>
          Página no encontrada
        </h1>

        <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--ink-muted)" }}>
          La dirección que buscás no existe, fue movida o el link del caso cambió.
        </p>

        <div className="mt-8 flex w-full flex-col gap-2.5">
          <Link
            href="/"
            className="btn btn-primary inline-flex items-center justify-center gap-2 rounded-full py-2.5 text-xs sm:text-sm font-semibold shadow-sm"
            style={{
              background: "linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 70%, var(--gold)))",
              color: "var(--accent-ink)",
            }}
          >
            <Home size={15} /> Volver al inicio
          </Link>

          <Link
            href="/panel"
            className="btn inline-flex items-center justify-center gap-2 rounded-full border py-2.5 text-xs sm:text-sm font-medium"
            style={{ borderColor: "var(--border-strong)", color: "var(--ink)" }}
          >
            <LayoutDashboard size={15} /> Ir a mi panel de corredor
          </Link>

          <Link
            href="/login"
            className="inline-flex items-center justify-center gap-1.5 pt-2 text-xs font-medium hover:underline"
            style={{ color: "var(--ink-muted)" }}
          >
            <ArrowLeft size={13} /> Ingresar a un caso con credenciales
          </Link>
        </div>
      </div>
    </div>
  );
}
