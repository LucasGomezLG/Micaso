"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateBrokerModal() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [nombreMarca, setNombreMarca] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/superadmin/brokers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, nombreMarca }),
    });
    setLoading(false);
    if (res.ok) {
      setOpen(false);
      setEmail("");
      setNombreMarca("");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "No se pudo dar de alta.");
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn btn-primary rounded-full px-4 py-2 text-sm font-semibold"
        style={{ background: "linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 65%, var(--gold)))", color: "var(--accent-ink)" }}
      >
        + Dar de alta un corredor
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(18, 24, 31, 0.55)" }}
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border p-6"
            style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-card)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg">Alta manual de corredor</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
                className="text-2xl leading-none"
                style={{ color: "var(--ink-faint)" }}
              >
                ×
              </button>
            </div>
            <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
              Para sumar un corredor sin esperar a que entre solo con
              Google — arranca en plan Para arrancar, prueba de 14 días.
            </p>
            <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="eyebrow">Email de Google</span>
                <input
                  required
                  autoFocus
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="rounded-lg border px-3 py-2"
                  style={{ borderColor: "var(--border)", background: "var(--paper)", color: "var(--ink)" }}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="eyebrow">Nombre de marca</span>
                <input
                  required
                  value={nombreMarca}
                  onChange={(e) => setNombreMarca(e.target.value)}
                  className="rounded-lg border px-3 py-2"
                  style={{ borderColor: "var(--border)", background: "var(--paper)", color: "var(--ink)" }}
                />
              </label>
              {error && (
                <p className="text-xs" style={{ color: "var(--status-descartada)" }}>
                  {error}
                </p>
              )}
              <button
                type="submit"
                disabled={loading || !email.trim() || !nombreMarca.trim()}
                className="btn btn-primary mt-1 rounded-full px-5 py-2.5 text-sm font-semibold"
                style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
              >
                {loading ? "Dando de alta…" : "Dar de alta"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
