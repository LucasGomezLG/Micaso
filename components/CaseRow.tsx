"use client";

import { useState } from "react";
import { Case, CaseEstado, TipoCaso } from "@/lib/types";

const TIPO_LABEL: Record<TipoCaso, string> = {
  compra: "Compra",
  alquiler: "Alquiler",
  otro: "Otro",
};

const ESTADO_LABEL: Record<CaseEstado, string> = {
  activo: "Activo",
  solo_lectura: "Solo lectura",
  archivado: "Archivado",
};

const ESTADO_COLOR: Record<CaseEstado, { bg: string; fg: string }> = {
  activo: { bg: "var(--status-gusto-bg)", fg: "var(--status-gusto)" },
  solo_lectura: { bg: "var(--status-pendiente-bg)", fg: "var(--status-pendiente)" },
  archivado: { bg: "var(--status-borrada-bg)", fg: "var(--status-borrada)" },
};

export default function CaseRow({ initialCase }: { initialCase: Case }) {
  const [kase, setKase] = useState(initialCase);
  const [editing, setEditing] = useState(false);
  const [titulo, setTitulo] = useState(kase.titulo);
  const [loading, setLoading] = useState<"rename" | "password" | "close" | null>(null);

  async function saveTitulo() {
    const next = titulo.trim();
    setEditing(false);
    if (!next || next === kase.titulo) {
      setTitulo(kase.titulo);
      return;
    }
    setLoading("rename");
    const res = await fetch(`/api/panel/cases/${kase.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titulo: next }),
    });
    setLoading(null);
    if (res.ok) {
      setKase((await res.json()).case);
    } else {
      setTitulo(kase.titulo);
    }
  }

  async function regenerarClave() {
    if (!confirm("¿Regenerar la contraseña de este caso? La anterior deja de funcionar.")) return;
    setLoading("password");
    const res = await fetch(`/api/panel/cases/${kase.id}/regenerate-password`, { method: "POST" });
    setLoading(null);
    if (res.ok) setKase((await res.json()).case);
  }

  async function cerrarCaso() {
    if (!confirm("¿Cerrar este caso? Pasa a modo solo lectura: la familia conserva su historial, pero no puede seguir cargando nada nuevo.")) return;
    setLoading("close");
    const res = await fetch(`/api/panel/cases/${kase.id}/close`, { method: "POST" });
    setLoading(null);
    if (res.ok) setKase((await res.json()).case);
  }

  const estadoColor = ESTADO_COLOR[kase.estado];
  const isArchivado = kase.estado === "archivado";

  return (
    <div
      className="card-hover relative flex flex-col gap-4 overflow-hidden rounded-2xl border p-5 sm:flex-row sm:items-center sm:justify-between"
      style={{ borderColor: "var(--border)", background: "var(--surface)", boxShadow: "var(--shadow-card)" }}
    >
      <div aria-hidden className="absolute inset-y-0 left-0 w-1" style={{ background: estadoColor.fg, opacity: isArchivado ? 0.4 : 0.9 }} />
      <div className="min-w-0 pl-2">
        <div className="flex flex-wrap items-center gap-2">
          {editing ? (
            <input
              autoFocus
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              onBlur={saveTitulo}
              onKeyDown={(e) => {
                if (e.key === "Enter") (e.target as HTMLInputElement).blur();
                if (e.key === "Escape") {
                  setTitulo(kase.titulo);
                  setEditing(false);
                }
              }}
              className="rounded-lg border px-2 py-1 text-base font-medium"
              style={{ borderColor: "var(--border)", background: "var(--paper)", color: "var(--ink)", fontFamily: "var(--font-display)" }}
            />
          ) : (
            <button
              type="button"
              onClick={() => !isArchivado && setEditing(true)}
              disabled={isArchivado}
              className="text-base font-medium"
              style={{ fontFamily: "var(--font-display)", textDecoration: isArchivado ? "none" : "underline", textDecorationStyle: "dotted", textUnderlineOffset: "3px" }}
              title={isArchivado ? undefined : "Cambiar título"}
            >
              {kase.titulo}
            </button>
          )}
          <span className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: "var(--gold-soft)", color: "var(--gold)" }}>
            {TIPO_LABEL[kase.tipoCaso]}
          </span>
          <span className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: estadoColor.bg, color: estadoColor.fg }}>
            {ESTADO_LABEL[kase.estado]}
          </span>
        </div>
        <p className="mt-1 text-xs" style={{ color: "var(--ink-faint)" }}>
          Creado el {new Date(kase.createdAt).toLocaleDateString("es-AR")}
        </p>
        {!isArchivado && (
          <div className="mt-2 flex flex-wrap gap-4 text-xs">
            <button type="button" onClick={regenerarClave} disabled={loading !== null} style={{ color: "var(--accent)" }}>
              {loading === "password" ? "Regenerando…" : "Regenerar clave"}
            </button>
            <button type="button" onClick={cerrarCaso} disabled={loading !== null} style={{ color: "var(--status-descartada)" }}>
              {loading === "close" ? "Cerrando…" : "Cerrar caso"}
            </button>
          </div>
        )}
      </div>

      <div
        className="flex flex-wrap items-center gap-x-5 gap-y-1 rounded-xl border px-4 py-2.5 text-sm"
        style={{ borderColor: "var(--border)", background: "var(--paper)" }}
      >
        <span style={{ color: "var(--ink-muted)" }}>
          Usuario <span className="mono select-all">{kase.username}</span>
        </span>
        <span style={{ color: "var(--ink-muted)" }}>
          Clave <span className="mono select-all">{kase.password}</span>
        </span>
      </div>
    </div>
  );
}
