"use client";

import { useFormStatus } from "react-dom";
import { LogOut, Loader2 } from "lucide-react";

/** Separado de PanelLogoutButton.tsx (server component, tiene el <form>
 * con el server action inline) porque useFormStatus necesita ser un
 * descendiente del form, no el form mismo, y solo funciona en un client
 * component — Next.js no permite un server action inline dentro de un
 * client component. Evita doble toque mientras el server action (borrar
 * cookies + signOut) todavía está en curso. */
export default function PanelLogoutSubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      title="Cerrar sesión"
      aria-label="Cerrar sesión"
      className="inline-flex items-center gap-1.5 text-sm font-medium hover:underline disabled:opacity-60 disabled:pointer-events-none"
      style={{ color: "var(--ink-muted)" }}
    >
      {pending ? <Loader2 size={16} className="animate-spin sm:hidden" /> : <LogOut size={16} className="sm:hidden" />}
      <span className="hidden sm:inline">{pending ? "Cerrando…" : "Cerrar sesión"}</span>
    </button>
  );
}
