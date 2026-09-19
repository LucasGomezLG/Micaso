"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bell, Check, Copy, Eye, EyeOff, LogIn, Pencil, Share2 } from "lucide-react";
import { Case, CaseEstado, TipoCaso } from "@/lib/types";
import type { CaseSummary } from "@/lib/store";
import { daysAgoLabel } from "@/lib/format";
import { apiErrorMessage } from "@/lib/http";
import { buildCaseShareMessage, openWhatsapp } from "@/lib/whatsapp";

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
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState<"rename" | "password" | "close" | "reopen" | "delete" | "enter" | null>(null);
  const [confirmAction, setConfirmAction] = useState<"password" | "close" | "reopen" | "delete" | null>(null);

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
    setConfirmAction(null);
    setLoading("password");
    const res = await fetch(`/api/panel/cases/${kase.id}/regenerate-password`, { method: "POST" });
    setLoading(null);
    if (!res.ok) {
      toast.error(await apiErrorMessage(res, "No se pudo regenerar la contraseña."));
      return;
    }
    const updated = (await res.json()).case;
    setKase(updated);
    setShowPassword(false);
    toast.success("Contraseña regenerada — la anterior dejó de funcionar.");
  }

  async function cerrarCaso() {
    setConfirmAction(null);
    setLoading("close");
    const res = await fetch(`/api/panel/cases/${kase.id}/close`, { method: "POST" });
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
    const res = await fetch(`/api/panel/cases/${kase.id}/reopen`, { method: "POST" });
    setLoading(null);
    if (!res.ok) {
      toast.error(await apiErrorMessage(res, "No se pudo reabrir el caso."));
      return;
    }
    setKase((await res.json()).case);
    toast.success("Caso reabierto — vuelve a estar activo.");
    router.refresh();
  }

  async function borrarCaso() {
    setConfirmAction(null);
    setLoading("delete");
    const res = await fetch(`/api/panel/cases/${kase.id}`, { method: "DELETE" });
    setLoading(null);
    if (!res.ok) {
      toast.error(await apiErrorMessage(res, "No se pudo borrar el caso."));
      return;
    }
    toast.success("Caso borrado.");
    router.refresh();
  }

  const CONFIRM_CONFIG: Record<
    "password" | "close" | "reopen" | "delete",
    { title: string; description: string; confirmLabel: string; onConfirm: () => void; danger?: boolean }
  > = {
    password: {
      title: "¿Regenerar la contraseña de este caso?",
      description: "La clave actual dejará de funcionar y deberás compartir la nueva con la familia.",
      confirmLabel: "Sí, regenerar",
      onConfirm: regenerarClave,
    },
    close: {
      title: "¿Cerrar este caso?",
      description: "Pasará a modo solo lectura: la familia conservará su historial pero no podrá agregar nuevas propiedades ni comentarios.",
      confirmLabel: "Sí, cerrar caso",
      onConfirm: cerrarCaso,
      danger: true,
    },
    reopen: {
      title: "¿Reabrir este caso?",
      description: "Vuelve a estar activo: la familia va a poder agregar propiedades y comentarios de nuevo.",
      confirmLabel: "Sí, reabrir",
      onConfirm: reabrirCaso,
    },
    delete: {
      title: "¿Borrar este caso definitivamente?",
      description: "No se puede deshacer. Se borran también todas sus propiedades, el checklist y los criterios.",
      confirmLabel: "Sí, borrar caso",
      onConfirm: borrarCaso,
      danger: true,
    },
  };

  async function entrarComoCaso() {
    setLoading("enter");
    const res = await fetch(`/api/panel/cases/${kase.id}/impersonate`, { method: "POST" });
    if (!res.ok) {
      setLoading(null);
      toast.error(await apiErrorMessage(res, "No se pudo entrar al caso."));
      return;
    }
    router.refresh();
    router.push("/caso");
  }

  const [copiedCreds, setCopiedCreds] = useState(false);

  async function copiarCredenciales() {
    await navigator.clipboard.writeText(buildCaseShareMessage(kase));
    setCopiedCreds(true);
    toast.success("Credenciales y link de acceso directo copiados");
    setTimeout(() => setCopiedCreds(false), 2000);
  }

  function compartirPorWhatsapp() {
    const mensaje = buildCaseShareMessage(kase);
    openWhatsapp(mensaje);
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
      className="card-hover relative flex scroll-mt-24 flex-col gap-4 overflow-hidden rounded-2xl border p-4 sm:p-5 sm:flex-row sm:items-center sm:justify-between"
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
              className="inline-flex items-center gap-1.5 text-base font-medium"
              style={{ fontFamily: "var(--font-display)" }}
              title={isArchivado ? undefined : "Cambiar título"}
            >
              {kase.titulo}
              {!isArchivado && <Pencil size={12} style={{ color: "var(--ink-faint)" }} />}
            </button>
          )}
          <span className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: "var(--gold-soft)", color: "var(--gold)" }}>
            {TIPO_LABEL[kase.tipoCaso]}
          </span>
          <span className="rounded-full px-2 py-0.5 text-xs font-medium" style={{ background: estadoColor.bg, color: estadoColor.fg }}>
            {ESTADO_LABEL[kase.estado]}
          </span>
          {summary && summary.unreadCount > 0 && (
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold"
              style={{
                background: "color-mix(in srgb, var(--accent) 15%, var(--surface))",
                color: "var(--accent)",
                border: "1px solid color-mix(in srgb, var(--accent) 35%, transparent)",
              }}
              title={summary.unreadSummary ?? undefined}
            >
              <Bell size={11} className="shrink-0 fill-current animate-pulse" />
              <span>{summary.unreadCount} novedad{summary.unreadCount === 1 ? "" : "es"}</span>
            </span>
          )}
        </div>
        {summary && (
          <p className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs" style={{ color: "var(--ink-muted)" }}>
            <span>
              <span className="mono font-semibold" style={{ color: "var(--ink)" }}>{summary.totalHouses}</span> {summary.totalHouses === 1 ? "propiedad" : "propiedades"}
            </span>
            <span>
              <span className="mono font-semibold" style={{ color: "var(--ink)" }}>{summary.pendientes}</span> por revisar
            </span>
            <span>
              <span className="mono font-semibold" style={{ color: "var(--ink)" }}>{summary.destacadas}</span> favoritas
            </span>
            <span style={{ color: alert === "overdue" ? "var(--status-descartada)" : "var(--ink-muted)" }}>
              {summary.lastActivity ? `última actividad: ${daysAgoLabel(summary.lastActivity)}` : "sin propiedades cargadas"}
            </span>
          </p>
        )}
        {summary && summary.unreadSummary && (
          <div
            className="mt-1.5 inline-flex max-w-full items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium"
            style={{
              background: "var(--accent-soft)",
              color: "var(--accent)",
              border: "1px solid var(--accent-soft-border)",
            }}
          >
            <span className="truncate">🔔 {summary.unreadSummary}</span>
          </div>
        )}
        <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs" style={{ color: "var(--ink-faint)" }}>
          <span>Creado el {new Date(kase.createdAt).toLocaleDateString("es-AR")}</span>
          {kase.familyLastSeenAt && (
            <>
              <span className="opacity-50">·</span>
              <span title={new Date(kase.familyLastSeenAt).toLocaleString("es-AR")}>
                Familia interactuó {daysAgoLabel(kase.familyLastSeenAt)}
              </span>
            </>
          )}
        </p>
        {!isArchivado && (
          <div className="mt-2 flex flex-wrap gap-4 text-xs">
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
          </div>
        )}
        {kase.estado !== "activo" && (
          <div className="mt-2 flex flex-wrap gap-4 text-xs">
            <button type="button" onClick={() => setConfirmAction("delete")} disabled={loading !== null} style={{ color: "var(--status-descartada)" }}>
              {loading === "delete" ? "Borrando…" : "Borrar caso"}
            </button>
          </div>
        )}
      </div>

      <div className="flex w-full flex-col gap-2 sm:w-auto sm:shrink-0 sm:items-end">
        <div
          className="flex w-full flex-wrap items-center justify-between gap-x-3 gap-y-1.5 rounded-xl border px-3 py-2 text-xs sm:w-auto sm:justify-start sm:text-sm"
          style={{ borderColor: "var(--border)", background: "var(--paper)" }}
        >
          <span style={{ color: "var(--ink-muted)" }}>
            Usuario <span className="mono select-all font-medium" style={{ color: "var(--ink)" }}>{kase.username}</span>
          </span>
          <span className="inline-flex items-center gap-1.5" style={{ color: "var(--ink-muted)" }}>
            Clave{" "}
            <span className="mono select-all font-medium" style={{ color: "var(--ink)" }}>
              {showPassword ? kase.password : "••••••••"}
            </span>
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              title={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
              aria-label={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
              className="p-0.5 rounded text-[var(--ink-faint)] hover:text-[var(--ink)] transition-colors cursor-pointer"
            >
              {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
            </button>
          </span>
          <button
            type="button"
            onClick={copiarCredenciales}
            title="Copiar usuario, clave y link de acceso"
            aria-label="Copiar usuario, clave y link de acceso"
            className="flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-semibold transition-all hover:opacity-80"
            style={{
              background: copiedCreds ? "var(--status-gusto-bg)" : "var(--accent-soft)",
              color: copiedCreds ? "var(--status-gusto)" : "var(--accent)",
            }}
          >
            {copiedCreds ? <Check size={12} /> : <Copy size={12} />}
            {copiedCreds ? "¡Copiado!" : "Copiar"}
          </button>
        </div>
        <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
          <button
            type="button"
            onClick={compartirPorWhatsapp}
            title="Compartir usuario y contraseña por WhatsApp"
            aria-label="Compartir usuario y contraseña por WhatsApp"
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
            aria-label="Entrar y ver/editar este caso como lo ve la familia"
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"
            style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
          >
            <LogIn size={13} /> {loading === "enter" ? "Entrando…" : "Entrar al caso"}
          </button>
        </div>
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
