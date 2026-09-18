import { WifiOff } from "lucide-react";
import Link from "next/link";

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 text-center">
      <div className="mb-6 rounded-full p-4" style={{ background: "var(--surface)", color: "var(--ink-faint)" }}>
        <WifiOff size={48} strokeWidth={1.5} />
      </div>
      <h1 className="mb-3 text-2xl font-bold">Estás sin conexión</h1>
      <p className="mb-8 max-w-sm text-sm" style={{ color: "var(--ink-muted)" }}>
        No hay problema. Micaso guardó la información vital para que puedas seguir leyendo, pero necesitamos red para sincronizar cualquier cambio nuevo.
      </p>
      <Link
        href="/"
        className="rounded-full px-6 py-2.5 text-sm font-semibold transition-transform active:scale-95"
        style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
      >
        Reintentar conexión
      </Link>
    </div>
  );
}
