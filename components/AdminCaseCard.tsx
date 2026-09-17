"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
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

/** Tarjeta de moderación de un caso desde /superadmin — la contraseña
 * queda oculta por default (un click en "Ver contraseña" la trae vía
 * /reveal-password) y no hay "Entrar al caso": el admin puede
 * cerrar/reabrir/regenerar clave, renombrar, eliminar para siempre (con
 * confirmación — pensado para limpiar casos de prueba) y, si hace falta
 * de verdad, ver la contraseña para ayudar al corredor — pero no puede
 * ver ni entrar al contenido real de la familia (casas, comentarios).
 * Control total sobre la cuenta del corredor, no visibilidad sobre lo
 * que cargan sus clientes. */
export default function AdminCaseCard({
  initialCase,
  summary,
}: {
  initialCase: Case;
  summary?: CaseSummary;
}) {
  const router = useRouter();
  const [kase, setKase] = useState(initialCase);
  const [editing, setEditing] = useState(false);
  const [titulo, setTitulo] = useState(kase.titulo);
  const [loading, setLoading] = useState<"rename" | "password" | "close" | "reopen" | "delete" | null>(null);
  const [confirmAction, setConfirmAction] = useState<"password" | "close" | "reopen" | "delete" | null>(null);
  const [revealedPassword, setRevealedPassword] = useState<string | null>(null);
  const [revealing, setRevealing] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [deleted, setDeleted] = useState(false);

  async function saveTitulo() {
    const next = titulo.trim();
    setEditing(false);
    if (!next || next === kase.titulo) {
      setTitulo(kase.titulo);
      return;
    }
    setLoading("rename");
    const res = await fetch(`/api/superadmin/cases/${kase.id}`, {
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
    setConfirmAction(null);
    setLoading("password");
    const res = await fetch(`/api/superadmin/cases/${kase.id}/regenerate-password`, { method: "POST" });
    setLoading(null);
    if (!res.ok) {
      toast.error(await apiErrorMessage(res, "No se pudo regenerar la contraseña."));
      return;
    }
    setKase((await res.json()).case);
    setRevealedPassword(null);
    toast.success("Contraseña regenerada — la anterior dejó de funcionar.");
  }

  async function toggleVerContrasena() {
    if (revealedPassword) {
      setRevealedPassword(null);
      return;
    }
    setRevealing(true);
    const res = await fetch(`/api/superadmin/cases/${kase.id}/reveal-password`, { method: "POST" });
    setRevealing(false);
    if (!res.ok) {
      toast.error(await apiErrorMessage(res, "No se pudo obtener la contraseña."));
      return;
    }
    setRevealedPassword((await res.json()).password);
  }

  async function copiarContrasena() {
    if (!revealedPassword) return;
    await navigator.clipboard.writeText(revealedPassword);
    setCopiedPassword(true);
    toast.success("Contraseña copiada");
    setTimeout(() => setCopiedPassword(false), 2000);
  }

  async function cerrarCaso() {
    setConfirmAction(null);
    setLoading("close");
    const res = await fetch(`/api/superadmin/cases/${kase.id}/close`, { method: "POST" });
    setLoading(null);
    if (!res.ok) {
      toast.error(await apiErrorMessage(res, "No se pudo cerrar el caso."));
      return;
    }
    setKase((await res.json()).case);
    toast.success("Caso cerrado — pasó a modo solo lectura.");
    router.refresh();
  }

  async function reabrirCaso() {
    setConfirmAction(null);
    setLoading("reopen");
    const res = await fetch(`/api/superadmin/cases/${kase.id}/reopen`, { method: "POST" });
    setLoading(null);
    if (!res.ok) {
      toast.error(await apiErrorMessage(res, "No se pudo reabrir el caso."));
      return;
    }
    setKase((await res.json()).case);
    toast.success("Caso reabierto — vuelve a estar activo.");
    router.refresh();
  }

  async function eliminarCaso() {
    setConfirmAction(null);
    setLoading("delete");
    const res = await fetch(`/api/superadmin/cases/${kase.id}`, { method: "DELETE" });
    setLoading(null);
    if (!res.ok) {
      toast.error(await apiErrorMessage(res, "No se pudo eliminar el caso."));
      return;
    }
    setDeleted(true);
    toast.success("Caso eliminado para siempre.");
    router.refresh();
  }

  const esDemo = kase.username === "casa";

  const CONFIRM_CONFIG: Record<
    "password" | "close" | "reopen" | "delete",
    { title: string; description: string; confirmLabel: string; onConfirm: () => void; danger?: boolean }
  > = {
    password: {
      title: "¿Regenerar la contraseña de este caso?",
      description: "La clave actual deja de funcionar. El corredor puede compartir la nueva con la familia desde su panel.",
      confirmLabel: "Sí, regenerar",
      onConfirm: regenerarClave,
    },
    close: {
      title: "¿Cerrar este caso?",
      description: "Pasa a modo solo lectura: la familia conserva su historial pero no puede agregar nada nuevo.",
      confirmLabel: "Sí, cerrar caso",
      onConfirm: cerrarCaso,
      danger: true,
    },
    reopen: {
      title: "¿Reabrir este caso?",
      description: "Vuelve a estar activo y a contar contra el tope de casos del plan del corredor.",
      confirmLabel: "Sí, reabrir",
      onConfirm: reabrirCaso,
    },
    delete: {
      title: esDemo ? "¿Eliminar el caso demo público?" : "¿Eliminar este caso para siempre?",
      description: esDemo
        ? 'Este es el caso demo público (usuario "casa", el que se ve en la landing). Se borran sus casas, checklist y criterios sin poder recuperarlos.'
        : "Se borran para siempre el caso, sus casas, checklist y criterios. No hay forma de deshacer esto.",
      confirmLabel: "Sí, eliminar para siempre",
      onConfirm: eliminarCaso,
      danger: true,
    },
  };

  if (deleted) return null;

  const estadoColor = ESTADO_COLOR[kase.estado];
  const isArchivado = kase.estado === "archivado";

  return (
    <div
      className="flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between"
      style={{ borderColor: "var(--border)", background: "var(--paper)", opacity: loading ? 0.7 : 1 }}
    >
      <div className="min-w-0">
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
              className="rounded-lg border px-2 py-1 text-sm font-medium"
              style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--ink)" }}
            />
          ) : (
            <button
              type="button"
              onClick={() => !isArchivado && setEditing(true)}
              disabled={isArchivado}
              className="inline-flex items-center gap-1.5 text-sm font-medium"
              title={isArchivado ? undefined : "Cambiar título"}
            >
              {kase.titulo}
              {!isArchivado && <Pencil size={11} style={{ color: "var(--ink-faint)" }} />}
            </button>
          )}
          <span className="rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ background: "var(--gold-soft)", color: "var(--gold)" }}>
            {TIPO_LABEL[kase.tipoCaso]}
          </span>
          <span className="rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ background: estadoColor.bg, color: estadoColor.fg }}>
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
            <span>{summary.lastActivity ? `última actividad: ${daysAgoLabel(summary.lastActivity)}` : "sin propiedades cargadas"}</span>
          </p>
        )}
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs" style={{ color: "var(--ink-faint)" }}>
          <span>
            Usuario <span className="mono">{kase.username}</span> · creado el {new Date(kase.createdAt).toLocaleDateString("es-AR")}
          </span>
          {!isArchivado && (
            <button
              type="button"
              onClick={toggleVerContrasena}
              disabled={revealing}
              className="font-medium underline underline-offset-2"
              style={{ color: "var(--accent)" }}
            >
              {revealing ? "Cargando…" : revealedPassword ? "Ocultar contraseña" : "Ver contraseña"}
            </button>
          )}
          {revealedPassword && (
            <span className="inline-flex items-center gap-1.5">
              <span className="mono select-all font-medium" style={{ color: "var(--ink)" }}>
                {revealedPassword}
              </span>
              <button type="button" onClick={copiarContrasena} className="font-medium underline underline-offset-2" style={{ color: "var(--accent)" }}>
                {copiedPassword ? "¡Copiado!" : "Copiar"}
              </button>
            </span>
          )}
        </p>
      </div>

      <div className="flex shrink-0 flex-wrap gap-4 text-xs sm:justify-end">
        {!isArchivado && (
          <>
            <button type="button" onClick={() => setConfirmAction("password")} disabled={loading !== null} style={{ color: "var(--accent)" }}>
              {loading === "password" ? "Regenerando…" : "Regenerar clave"}
            </button>
            {kase.estado === "activo" ? (
              <button type="button" onClick={() => setConfirmAction("close")} disabled={loading !== null} style={{ color: "var(--status-descartada)" }}>
                {loading === "close" ? "Cerrando…" : "Cerrar caso"}
              </button>
            ) : (
              <button type="button" onClick={() => setConfirmAction("reopen")} disabled={loading !== null} style={{ color: "var(--status-gusto)" }}>
                {loading === "reopen" ? "Reabriendo…" : "Reabrir caso"}
              </button>
            )}
          </>
        )}
        <button type="button" onClick={() => setConfirmAction("delete")} disabled={loading !== null} style={{ color: "var(--status-descartada)" }}>
          {loading === "delete" ? "Eliminando…" : "Eliminar caso"}
        </button>
      </div>

      {confirmAction &&
        createPortal(
          <div
            className="animate-overlay fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(18, 24, 31, 0.55)" }}
            onClick={() => setConfirmAction(null)}
          >
            <div
              className="animate-modal-pop w-full max-w-sm rounded-2xl border p-6"
              style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-card)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg">{CONFIRM_CONFIG[confirmAction].title}</h3>
              <p className="mt-1.5 text-sm" style={{ color: "var(--ink-muted)" }}>
                {CONFIRM_CONFIG[confirmAction].description}
              </p>
              <div className="mt-6 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmAction(null)}
                  className="rounded-full px-4 py-2 text-xs font-semibold"
                  style={{ border: "1px solid var(--border)", color: "var(--ink-muted)" }}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={CONFIRM_CONFIG[confirmAction].onConfirm}
                  className="rounded-full px-4 py-2 text-xs font-semibold"
                  style={
                    CONFIRM_CONFIG[confirmAction].danger
                      ? { background: "var(--status-descartada-bg)", color: "var(--status-descartada)" }
                      : { background: "var(--accent)", color: "var(--accent-ink)" }
                  }
                >
                  {CONFIRM_CONFIG[confirmAction].confirmLabel}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
