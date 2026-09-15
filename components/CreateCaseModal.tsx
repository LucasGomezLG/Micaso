"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { TipoCaso } from "@/lib/types";
import Select from "@/components/Select";

export default function CreateCaseModal({ label = "+ Nuevo caso" }: { label?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [tipoCaso, setTipoCaso] = useState<TipoCaso>("compra");
  const [personas, setPersonas] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const people = personas.split(",").map((p) => p.trim()).filter(Boolean);
    const res = await fetch("/api/panel/cases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titulo, tipoCaso, people }),
    });
    setLoading(false);
    if (res.ok) {
      toast.success("Caso creado.");
      setOpen(false);
      setTitulo("");
      setPersonas("");
      setTipoCaso("compra");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "No se pudo crear el caso.");
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
        {label}
      </button>

      {open && (
        <div
          className="animate-overlay fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(18, 24, 31, 0.55)" }}
          onClick={() => setOpen(false)}
        >
          <div
            className="animate-modal-pop w-full max-w-sm rounded-2xl border p-6"
            style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-card)" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg">Nuevo caso</h3>
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
              Usuario y contraseña se generan solos — los criterios se cargan
              después, desde adentro del caso.
            </p>
            <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
              <label className="flex flex-col gap-1 text-sm">
                <span className="eyebrow">Título (ej. &quot;Familia Pérez&quot;)</span>
                <input
                  required
                  autoFocus
                  value={titulo}
                  onChange={(e) => setTitulo(e.target.value)}
                  className="rounded-lg border px-3 py-2"
                  style={{ borderColor: "var(--border)", background: "var(--paper)", color: "var(--ink)" }}
                />
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="eyebrow">Tipo de búsqueda</span>
                <Select
                  value={tipoCaso}
                  onChange={(e) => setTipoCaso(e.target.value as TipoCaso)}
                  className="rounded-lg border px-3 py-2"
                  style={{ borderColor: "var(--border)", background: "var(--paper)", color: "var(--ink)" }}
                >
                  <option value="compra">Compra</option>
                  <option value="alquiler">Alquiler</option>
                  <option value="otro">Otro</option>
                </Select>
              </label>
              <label className="flex flex-col gap-1 text-sm">
                <span className="eyebrow">Integrantes de la familia (opcional)</span>
                <input
                  placeholder="Ej. Lucas, Abril (separados por coma)"
                  value={personas}
                  onChange={(e) => setPersonas(e.target.value)}
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
                disabled={loading || !titulo.trim()}
                className="btn btn-primary mt-1 rounded-full px-5 py-2.5 text-sm font-semibold"
                style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
              >
                {loading ? "Creando…" : "Crear caso"}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
