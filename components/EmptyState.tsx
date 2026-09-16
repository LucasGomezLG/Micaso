import { ReactNode } from "react";

/** Tarjeta de "no hay nada todavía" — ícono + título + contenido libre
 * (texto/CTA). Compartida por el inicio y la agenda, que antes tenían
 * cada uno su propia copia del mismo armazón y ya habían empezado a
 * divergir (una con emoji, otra con ícono de lucide). */
export default function EmptyState({ icon, title, children }: { icon: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-3xl border p-8 text-center sm:p-12"
      style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-card)" }}
    >
      <span
        className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl text-2xl shadow-sm"
        style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
      >
        {icon}
      </span>
      <h3 className="text-xl font-semibold" style={{ fontFamily: "var(--font-display)" }}>
        {title}
      </h3>
      {children}
    </div>
  );
}
