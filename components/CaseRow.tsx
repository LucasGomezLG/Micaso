"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { LogIn, Share2 } from "lucide-react";
import { Case, CaseEstado, TipoCaso } from "@/lib/types";
import type { CaseSummary } from "@/lib/store";
import { daysAgoLabel } from "@/lib/format";
import { apiErrorMessage } from "@/lib/http";

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

export default function CaseRow({
  initialCase,
  summary,
  alert,
}: {
  initialCase: Case;
  /** Resumen de propiedades del caso (pendientes/destacadas/última
   * actividad) — calculado una vez en el server al cargar /panel, ver
   * lib/store.ts getCaseSummary. Opcional por si algún día se reusa
   * CaseRow en un lugar sin ese dato. */
  summary?: CaseSummary;
  /** Si este caso tiene algo que atender ahora — determina el color del
   * borde izquierdo. Lo decide el padre (PanelPage) porque necesita
   * comparar contra "ahora" una sola vez para todos los casos. */
  alert?: "overdue" | "soon" | null;
}) {
  const router = useRouter();
  const [kase, setKase] = useState(initialCase);
  const [editing, setEditing] = useState(false);
  const [titulo, setTitulo] = useState(kase.titulo);
  const [loading, setLoading] = useState<"rename" | "password" | "close" | "enter" | null>(null);

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
    if (!res.ok) {
      setTitulo(kase.titulo);
      toast.error(await apiErrorMessage(res, "No se pudo cambiar el título."));
      return;
    }
    setKase((await res.json()).case);
  }

  async function regenerarClave() {
    if (!confirm("¿Regenerar la contraseña de este caso? La anterior deja de funcionar.")) return;
    setLoading("password");
    const res = await fetch(`/api/panel/cases/${kase.id}/regenerate-password`, { method: "POST" });
    setLoading(null);
    if (!res.ok) {
      toast.error(await apiErrorMessage(res, "No se pudo regenerar la contraseña."));
      return;
    }
    const updated = (await res.json()).case;
    setKase(updated);
    toast.success(`Nueva contraseña: ${updated.password}`, {
      action: {
        label: "Copiar",
        onClick: () => {
          navigator.clipboard.writeText(updated.password).catch(() => {});
        },
      },
    });
  }

  async function cerrarCaso() {
    if (!confirm("¿Cerrar este caso? Pasa a modo solo lectura: la familia conserva su historial, pero no puede seguir cargando nada nuevo.")) return;
    setLoading("close");
    const res = await fetch(`/api/panel/cases/${kase.id}/close`, { method: "POST" });
    setLoading(null);
    if (!res.ok) {
      toast.error(await apiErrorMessage(res, "No se pudo cerrar el caso."));
      return;
    }
    setKase((await res.json()).case);
    toast.success("Caso cerrado — pasó a modo solo lectura.");
    // Cerrar un caso lo saca de los KPIs y de "Necesita tu atención" de
    // arriba — esos se calculan en el server, así que hace falta un
    // refresh para que dejen de contarlo (setKase solo actualiza esta fila).
    router.refresh();
  }

  async function entrarComoCaso() {
    setLoading("enter");
    const res = await fetch(`/api/panel/cases/${kase.id}/impersonate`, { method: "POST" });
    if (!res.ok) {
      setLoading(null);
      toast.error(await apiErrorMessage(res, "No se pudo entrar al caso."));
      return;
    }
    router.push("/caso");
  }

  function compartirPorWhatsapp() {
    const loginUrl = `${window.location.origin}/login`;
    const mensaje = `¡Hola! Ya podés seguir la búsqueda de "${kase.titulo}" en Micaso.\n\nEntrá acá: ${loginUrl}\nUsuario: ${kase.username}\nContraseña: ${kase.password}\n\nAhí vas a ver el presupuesto, las propiedades que vamos viendo, las visitas coordinadas y todo lo que vaya haciendo falta — todo junto, en un solo lugar.`;
    window.open(`https://wa.me/?text=${encodeURIComponent(mensaje)}`, "_blank", "noopener,noreferrer");
  }

  const estadoColor = ESTADO_COLOR[kase.estado];
  const isArchivado = kase.estado === "archivado";
  const railColor = isArchivado
    ? ESTADO_COLOR.archivado.fg
    : alert === "overdue"
    ? "var(--status-descartada)"
    : alert === "soon"
    ? "var(--status-coordinada)"
    : estadoColor.fg;

  return (
    <div
      id={`case-${kase.id}`}
      className="card-hover relative flex scroll-mt-24 flex-col gap-4 overflow-hidden rounded-2xl border p-5 sm:flex-row sm:items-center sm:justify-between"
      style={{ borderColor: "var(--border)", background: "var(--surface)", boxShadow: "var(--shadow-card)" }}
    >
      <div aria-hidden className="absolute inset-y-0 left-0 w-1" style={{ background: railColor, opacity: isArchivado ? 0.4 : 0.9 }} />
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
        {summary && (
          <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs" style={{ color: "var(--ink-muted)" }}>
            <span>
              <span className="mono font-semibold" style={{ color: "var(--ink)" }}>{summary.pendientes}</span> pendientes
            </span>
            <span>
              <span className="mono font-semibold" style={{ color: "var(--ink)" }}>{summary.destacadas}</span> destacadas
            </span>
            <span style={{ color: alert === "overdue" ? "var(--status-descartada)" : "var(--ink-muted)" }}>
              {summary.lastActivity ? `última actividad: ${daysAgoLabel(summary.lastActivity)}` : "sin propiedades cargadas"}
            </span>
          </p>
        )}
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

      <div className="flex shrink-0 flex-col items-end gap-2">
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
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={compartirPorWhatsapp}
            title="Compartir usuario y contraseña por WhatsApp"
            className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold"
            style={{ borderColor: "var(--border-strong)", color: "var(--ink-muted)" }}
          >
            <Share2 size={13} /> Compartir
          </button>
          <button
            type="button"
            onClick={entrarComoCaso}
            disabled={loading !== null}
            title="Entrar y ver/editar este caso como lo ve la familia"
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"
            style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
          >
            <LogIn size={13} /> {loading === "enter" ? "Entrando…" : "Entrar al caso"}
          </button>
        </div>
      </div>
    </div>
  );
}
