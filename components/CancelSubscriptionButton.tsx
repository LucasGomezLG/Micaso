"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

export default function CancelSubscriptionButton() {
  const [loading, setLoading] = useState(false);

  async function handleCancel() {
    if (!confirm("¿Estás seguro que querés cancelar tu suscripción? Perderás acceso para agregar casos o propiedades nuevas una vez finalizado tu período.")) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/panel/subscription", {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Error al cancelar la suscripción");
      }

      window.location.reload();
    } catch (err) {
      console.error(err);
      alert("Hubo un error al intentar cancelar la suscripción. Por favor, intentá de nuevo o contactanos.");
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleCancel}
      disabled={loading}
      className="btn inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-500/10 transition-colors disabled:opacity-70"
    >
      {loading && <Loader2 size={13} className="animate-spin" />}
      Cancelar Suscripción
    </button>
  );
}
