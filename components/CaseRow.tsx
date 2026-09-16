"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Copy, LogIn, Pencil, Share2 } from "lucide-react";
import { Case, CaseEstado, TipoCaso } from "@/lib/types";
import type { CaseSummary } from "@/lib/store";
import { daysAgoLabel } from "@/lib/format";
import { apiErrorMessage } from "@/lib/http";
import { buildCaseShareMessage, getCanonicalLoginUrl, openWhatsapp } from "@/lib/whatsapp";

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
  const [loading, setLoading] = useState<"rename" | "password" | "close" | "reopen" | "enter" | null>(null);

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

  function regenerarClave() {
    toast("¿Regenerar la contraseña de este caso?", {
      description: "La clave actual dejará de funcionar y deberás compartir la nueva con la familia.",
      duration: 12000,
      action: {
        label: "Sí, regenerar",
        onClick: async () => {
          setLoading("password");
          const res = await fetch(`/api/panel/cases/${kase.id}/regenerate-password`, { method: "POST" });
          setLoading(null);
          if (!res.ok) {
            toast.error(await apiErrorMessage(res, "No se pudo regenerar la contraseña."));
            return;
          }
          const updated = (await res.json()).case;
          setKase(updated);
          toast.success(`Nueva contraseña generada: ${updated.password}`, {
            action: {
              label: "Copiar",
              onClick: () => {
                navigator.clipboard.writeText(updated.password).catch(() => {});
              },
            },
          });
        },
      },
      cancel: {
        label: "Cancelar",
        onClick: () => {},
      },
    });
  }

  function cerrarCaso() {
    toast("¿Cerrar este caso?", {
      description: "Pasará a modo solo lectura: la familia conservará su historial pero no podrá agregar nuevas propiedades ni comentarios.",
      duration: 12000,
      action: {
        label: "Sí, cerrar caso",
        onClick: async () => {
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
        },
      },
      cancel: {
        label: "Cancelar",
        onClick: () => {},
      },
    });
  }

  function reabrirCaso() {
    toast("¿Reabrir este caso?", {
      description: "Vuelve a estar activo: la familia va a poder agregar propiedades y comentarios de nuevo.",
      duration: 12000,
      action: {
        label: "Sí, reabrir",
        onClick: async () => {
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
        },
      },
      cancel: {
        label: "Cancelar",
        onClick: () => {},
      },
    });
  }

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
    const loginUrl = getCanonicalLoginUrl(kase.username, kase.password);
    const texto = `Acceso Micaso para "${kase.titulo}":\nLink directo: ${loginUrl}\n\n🛡 Compartí este link solamente con las personas que te acompañen o ayuden en la búsqueda.\n\nUsuario: ${kase.username}\nContraseña: ${kase.password}`;
    await navigator.clipboard.writeText(texto);
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
            {kase.estado === "activo" ? (
              <button type="button" onClick={cerrarCaso} disabled={loading !== null} style={{ color: "var(--status-descartada)" }}>
                {loading === "close" ? "Cerrando…" : "Cerrar caso"}
              </button>
            ) : (
              <button type="button" onClick={reabrirCaso} disabled={loading !== null} style={{ color: "var(--status-gusto)" }}>
                {loading === "reopen" ? "Reabriendo…" : "Reabrir caso"}
              </button>
            )}
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
          <span style={{ color: "var(--ink-muted)" }}>
            Clave <span className="mono select-all font-medium" style={{ color: "var(--ink)" }}>{kase.password}</span>
          </span>
          <button
            type="button"
            onClick={copiarCredenciales}
            title="Copiar usuario, clave y link de acceso"
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
