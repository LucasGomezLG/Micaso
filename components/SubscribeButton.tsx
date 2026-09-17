"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

interface SubscribeButtonProps {
  plan: "para_arrancar" | "para_tu_cartera";
  label: string;
  highlight?: boolean;
}

export default function SubscribeButton({ plan, label, highlight }: SubscribeButtonProps) {
  const [loading, setLoading] = useState(false);

  async function handleSubscribe() {
    setLoading(true);
    try {
      const res = await fetch("/api/panel/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });

      if (!res.ok) {
        throw new Error("Error al procesar la suscripción");
      }

      const data = await res.json();
      if (data.initPoint) {
        window.location.href = data.initPoint;
      }
    } catch (err) {
      console.error(err);
      alert("Hubo un error al intentar conectarse con Mercado Pago. Por favor, intentá de nuevo.");
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleSubscribe}
      disabled={loading}
      className="btn w-full flex items-center justify-center gap-2 rounded-full py-2.5 text-center text-xs font-semibold transition-transform active:scale-95 disabled:opacity-70 disabled:active:scale-100"
      style={
        highlight
          ? {
              background: "linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 70%, var(--gold)))",
              color: "var(--accent-ink)",
            }
          : { border: "1px solid var(--border-strong)", color: "var(--ink)" }
      }
    >
      {loading && <Loader2 size={13} className="animate-spin" />}
      {!loading && (
        <svg viewBox="0 0 100 100" className="h-3 w-3 fill-current">
          <path d="M50 0C22.4 0 0 22.4 0 50s22.4 50 50 50 50-22.4 50-50S77.6 0 50 0zm0 85.3C30.5 85.3 14.7 69.5 14.7 50S30.5 14.7 50 14.7 85.3 30.5 85.3 50 69.5 85.3 50 85.3zm-6-23.8v-7c0-2.3 1.9-4.2 4.2-4.2h1.4c2.8 0 5.1-2.3 5.1-5.1s-2.3-5.1-5.1-5.1H34.4v-8.1h15V25c0-2.3 1.9-4.2 4.2-4.2h1.4c2.8 0 5.1-2.3 5.1-5.1s-2.3-5.1-5.1-5.1H66v8.1H51.4v7.3c0 2.3-1.9 4.2-4.2 4.2h-1.4c-2.8 0-5.1 2.3-5.1 5.1s2.3 5.1 5.1 5.1h15v8.1H50v7c0 2.3-1.9 4.2-4.2 4.2h-1.4z" />
        </svg>
      )}
      {label}
    </button>
  );
}
