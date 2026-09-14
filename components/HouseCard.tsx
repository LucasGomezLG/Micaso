"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { House, HouseStatus, LoanInfo, PIPELINE_STATUSES, STATUS_LABEL } from "@/lib/types";
import { formatDate, formatDateTime, formatUsd, isOverdue, proxiedImage } from "@/lib/format";
import { cashNeededRange, pricePerM2 } from "@/lib/mortgage";
import StatusBadge from "@/components/StatusBadge";
import EditHouseModal from "@/components/EditHouseModal";
import VisitReview from "@/components/VisitReview";

const AUTHOR_KEY = "casa-comment-author";

export default function HouseCard({
  house,
  loan,
  people,
  onChange,
  onDelete,
}: {
  house: House;
  loan: LoanInfo;
  people: string[];
  onChange: (id: string, patch: Partial<House>) => void;
  onDelete: (id: string) => void;
}) {
  const router = useRouter();
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentAuthor, setCommentAuthor] = useState<string>(people[0] ?? "");
  const [posting, setPosting] = useState(false);
  const [checklistOpen, setChecklistOpen] = useState(false);
  const [checklistText, setChecklistText] = useState("");
  const [addingItem, setAddingItem] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [imgFailed, setImgFailed] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const isDiscarded = ["descartada", "no_gusto", "borrada"].includes(house.status);
  const currentImage = house.images[photoIndex] ?? house.images[0] ?? null;
  const showImage = currentImage && !imgFailed;

  useEffect(() => {
    try {
      const saved = localStorage.getItem(AUTHOR_KEY);
      if (saved) setCommentAuthor(saved);
    } catch {}
  }, []);

  async function postComment() {
    const text = commentText.trim();
    if (!text) return;
    setPosting(true);
    try {
      localStorage.setItem(AUTHOR_KEY, commentAuthor);
    } catch {}
    await fetch(`/api/houses/${house.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ author: commentAuthor, text }),
    });
    setCommentText("");
    setPosting(false);
    router.refresh();
  }

  async function addChecklistItem() {
    const text = checklistText.trim();
    if (!text) return;
    setAddingItem(true);
    await fetch(`/api/houses/${house.id}/checklist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    setChecklistText("");
    setAddingItem(false);
    router.refresh();
  }

  async function toggleChecklistItem(itemId: string, done: boolean) {
    await fetch(`/api/houses/${house.id}/checklist/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done }),
    });
    router.refresh();
  }

  async function deleteChecklistItem(itemId: string) {
    await fetch(`/api/houses/${house.id}/checklist/${itemId}`, { method: "DELETE" });
    router.refresh();
  }

  const cash = house.priceUsd ? cashNeededRange(house.priceUsd, loan.bankMaxUsd) : null;
  const cashFit = cash
    ? cash.high <= loan.ownFundsMaxUsd
      ? "gusto"
      : cash.low <= loan.ownFundsMaxUsd
        ? "pendiente"
        : "descartada"
    : null;
  const perM2 = pricePerM2(house.priceUsd, house.superficieM2);
  const accionVencida = house.proximaAccionFecha ? isOverdue(house.proximaAccionFecha) : false;

  async function refreshFromSource() {
    setRefreshing(true);
    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: house.url }),
      });
      const data = await res.json();
      const patch: Partial<House> = {};
      if (data.images?.length > house.images.length) patch.images = data.images;
      if (data.title && house.title === house.url) patch.title = data.title;
      if (data.priceUsd && !house.priceUsd) patch.priceUsd = data.priceUsd;
      if (Object.keys(patch).length > 0) onChange(house.id, patch);
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <div
      className="flex flex-col overflow-hidden rounded-2xl border transition-opacity"
      style={{
        background: "var(--surface)",
        borderColor: "var(--border)",
        boxShadow: "var(--shadow-card)",
        opacity: isDiscarded ? 0.7 : 1,
      }}
    >
      <a
        href={house.url}
        target="_blank"
        rel="noreferrer"
        className="relative block aspect-[4/3] w-full"
        style={{ background: "var(--accent-soft)" }}
      >
        {showImage ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={proxiedImage(currentImage)!}
              alt={house.title}
              onError={() => setImgFailed(true)}
              className="h-full w-full object-cover"
            />
            {house.images.length > 1 && (
              <>
                <button
                  title="Foto anterior"
                  onClick={(e) => {
                    e.preventDefault();
                    setImgFailed(false);
                    setPhotoIndex((i) => (i - 1 + house.images.length) % house.images.length);
                  }}
                  className="absolute left-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-sm"
                  style={{ background: "rgba(0,0,0,0.45)", color: "#fff" }}
                >
                  ‹
                </button>
                <button
                  title="Foto siguiente"
                  onClick={(e) => {
                    e.preventDefault();
                    setImgFailed(false);
                    setPhotoIndex((i) => (i + 1) % house.images.length);
                  }}
                  className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-sm"
                  style={{ background: "rgba(0,0,0,0.45)", color: "#fff" }}
                >
                  ›
                </button>
                <div className="absolute bottom-1.5 left-1/2 flex -translate-x-1/2 gap-1">
                  {house.images.map((_, i) => (
                    <span
                      key={i}
                      className="h-1.5 w-1.5 rounded-full"
                      style={{ background: i === photoIndex ? "#fff" : "rgba(255,255,255,0.5)" }}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="flex h-full w-full flex-col items-center justify-center gap-2">
            <HouseIcon />
            <button
              onClick={(e) => {
                e.preventDefault();
                refreshFromSource();
              }}
              disabled={refreshing}
              className="rounded-full px-2.5 py-1 text-xs font-medium"
              style={{ background: "var(--surface)", color: "var(--accent)" }}
            >
              {refreshing ? "buscando…" : "buscar imagen"}
            </button>
          </div>
        )}
        {house.highlighted && (
          <span
            className="absolute right-2 top-2 rounded-full px-2 py-1 text-xs font-semibold"
            style={{ background: "var(--gold-soft)", color: "var(--gold)" }}
          >
            ★ destacada
          </span>
        )}
      </a>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <p className="mono text-lg leading-none">
            {formatUsd(house.priceUsd)}
            {perM2 && (
              <span className="ml-1.5 text-xs font-normal" style={{ color: "var(--ink-faint)" }}>
                (US$ {perM2.toLocaleString("es-AR")}/m²)
              </span>
            )}
          </p>
          <StatusBadge status={house.status} />
        </div>

        <h3 className="line-clamp-2 text-sm font-semibold">{house.title}</h3>

        {house.visitaFecha && (
          <div
            className="w-fit rounded-lg px-2 py-1 text-xs font-medium"
            style={{ background: "var(--status-coordinada-bg)", color: "var(--status-coordinada)" }}
          >
            🗓 Visita: {formatDateTime(house.visitaFecha)}
          </div>
        )}

        {house.proximaAccion && (
          <div
            className="w-fit rounded-lg px-2 py-1 text-xs font-medium"
            style={{
              background: accionVencida ? "var(--status-descartada-bg)" : "var(--status-pendiente-bg)",
              color: accionVencida ? "var(--status-descartada)" : "var(--status-pendiente)",
            }}
          >
            📌 {house.proximaAccion}
            {house.proximaAccionFecha && (
              <> · {accionVencida ? "venció" : "vence"} {formatDate(house.proximaAccionFecha)}</>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs" style={{ color: "var(--ink-muted)" }}>
          {house.zone && <span>📍 {house.zone}</span>}
          {house.ambientes && <span>{house.ambientes} amb.</span>}
          {house.superficieM2 && <span>{house.superficieM2} m²</span>}
          {house.cochera && <span>🚗 cochera</span>}
        </div>

        {(house.contactoNombre || house.contactoTelefono) && (
          <div className="text-xs" style={{ color: "var(--ink-muted)" }}>
            ☎️ {house.contactoNombre}
            {house.contactoNombre && house.contactoTelefono && " · "}
            {house.contactoTelefono}
          </div>
        )}

        {cash && cashFit && (
          <div
            className="mono w-fit rounded-lg px-2 py-1 text-xs font-medium"
            style={{ background: `var(--status-${cashFit}-bg)`, color: `var(--status-${cashFit})` }}
          >
            💰 {formatUsd(cash.low)}–{formatUsd(cash.high)} de bolsillo
          </div>
        )}

        {(house.status === "gusto" || house.status === "no_gusto" || house.visitReview) && (
          <VisitReview house={house} onChange={onChange} />
        )}

        <div className="flex flex-col gap-2">
          <button
            onClick={() => setCommentsOpen((v) => !v)}
            className="text-left text-xs font-medium"
            style={{ color: "var(--ink-faint)" }}
          >
            💬{" "}
            {house.comments.length > 0
              ? `${house.comments.length} comentario${house.comments.length > 1 ? "s" : ""}`
              : "Agregar comentario"}
          </button>

          {commentsOpen && (
            <div className="flex flex-col gap-2 rounded-lg p-2.5" style={{ background: "var(--paper)" }}>
              {house.comments.length > 0 && (
                <div className="flex flex-col gap-2">
                  {house.comments.map((c) => (
                    <div key={c.id} className="text-xs">
                      <span className="font-semibold">{c.author}</span>{" "}
                      <span style={{ color: "var(--ink-faint)" }}>· {formatDate(c.createdAt)}</span>
                      <p style={{ color: "var(--ink-muted)" }}>{c.text}</p>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-1.5">
                {people.length > 0 ? (
                  <select
                    value={commentAuthor}
                    onChange={(e) => setCommentAuthor(e.target.value)}
                    className="rounded-lg border px-1.5 text-xs"
                    style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--ink)" }}
                  >
                    {people.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={commentAuthor}
                    onChange={(e) => setCommentAuthor(e.target.value)}
                    placeholder="Tu nombre"
                    className="w-20 shrink-0 rounded-lg border px-1.5 text-xs"
                    style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--ink)" }}
                  />
                )}
                <input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") postComment();
                  }}
                  placeholder="Escribir un comentario…"
                  className="min-w-0 flex-1 rounded-lg border px-2 py-1 text-xs"
                  style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--ink)" }}
                />
                <button
                  onClick={postComment}
                  disabled={posting || !commentText.trim()}
                  className="shrink-0 rounded-lg px-2.5 text-xs font-semibold"
                  style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
                >
                  {posting ? "…" : "Enviar"}
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <button
            onClick={() => setChecklistOpen((v) => !v)}
            className="text-left text-xs font-medium"
            style={{ color: "var(--ink-faint)" }}
          >
            ✅{" "}
            {house.checklist.length > 0
              ? `${house.checklist.filter((i) => i.done).length}/${house.checklist.length} checklist`
              : "Agregar checklist"}
          </button>

          {checklistOpen && (
            <div className="flex flex-col gap-2 rounded-lg p-2.5" style={{ background: "var(--paper)" }}>
              {house.checklist.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  {house.checklist.map((item) => (
                    <div key={item.id} className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={item.done}
                        onChange={(e) => toggleChecklistItem(item.id, e.target.checked)}
                        className="h-3.5 w-3.5 shrink-0"
                      />
                      <span
                        className="flex-1"
                        style={{
                          textDecoration: item.done ? "line-through" : "none",
                          color: item.done ? "var(--ink-faint)" : "var(--ink-muted)",
                        }}
                      >
                        {item.text}
                      </span>
                      <button
                        onClick={() => deleteChecklistItem(item.id)}
                        title="Eliminar"
                        className="shrink-0"
                        style={{ color: "var(--ink-faint)" }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex gap-1.5">
                <input
                  value={checklistText}
                  onChange={(e) => setChecklistText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addChecklistItem();
                  }}
                  placeholder="Ej. verificar informe de dominio…"
                  className="min-w-0 flex-1 rounded-lg border px-2 py-1 text-xs"
                  style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--ink)" }}
                />
                <button
                  onClick={addChecklistItem}
                  disabled={addingItem || !checklistText.trim()}
                  className="shrink-0 rounded-lg px-2.5 text-xs font-semibold"
                  style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
                >
                  {addingItem ? "…" : "Agregar"}
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="mono mt-auto text-xs" style={{ color: "var(--ink-faint)" }}>
          {house.source} · agregó {house.addedBy} · {formatDate(house.addedAt)}
        </p>

        {house.status === "borrada" ? (
          <div className="flex items-center gap-2 border-t pt-3" style={{ borderColor: "var(--border)" }}>
            <button
              onClick={() => onChange(house.id, { status: "pendiente" })}
              className="flex-1 rounded-lg border px-2 py-1.5 text-xs font-medium"
              style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
            >
              ↺ Restaurar
            </button>
            <button
              title="Eliminar definitivamente (no se puede deshacer)"
              onClick={() => {
                if (confirm("Esto borra la propiedad para siempre, no se puede deshacer. ¿Seguir?")) {
                  onDelete(house.id);
                }
              }}
              className="rounded-lg border px-2 py-1.5 text-xs"
              style={{ borderColor: "var(--border)", color: "var(--status-descartada)" }}
            >
              Eliminar definitivamente
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 border-t pt-3" style={{ borderColor: "var(--border)" }}>
            <select
              value={house.status}
              onChange={(e) => onChange(house.id, { status: e.target.value as HouseStatus })}
              className="flex-1 rounded-lg border px-2 py-1.5 text-xs"
              style={{ borderColor: "var(--border)", background: "var(--paper)", color: "var(--ink)" }}
            >
              {PIPELINE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </select>
            <button
              title="Actualizar imagen/precio desde el aviso"
              onClick={refreshFromSource}
              disabled={refreshing}
              className="rounded-lg border px-2 py-1.5 text-xs"
              style={{ borderColor: "var(--border)" }}
            >
              {refreshing ? "…" : "↻"}
            </button>
            <button
              title="Editar título, precio, zona, ambientes, cochera o imagen"
              onClick={() => setEditOpen(true)}
              className="rounded-lg border px-2 py-1.5 text-xs"
              style={{ borderColor: "var(--border)" }}
            >
              ✏️
            </button>
            <button
              title={house.highlighted ? "Quitar destacada" : "Destacar"}
              onClick={() => onChange(house.id, { highlighted: !house.highlighted })}
              className="rounded-lg border px-2 py-1.5 text-xs"
              style={{ borderColor: "var(--border)" }}
            >
              {house.highlighted ? "★" : "☆"}
            </button>
            <button
              title="Archivar (se puede restaurar desde la pestaña Borradas)"
              onClick={() => onChange(house.id, { status: "borrada" })}
              className="rounded-lg border px-2 py-1.5 text-xs"
              style={{ borderColor: "var(--border)", color: "var(--status-descartada)" }}
            >
              ✕
            </button>
          </div>
        )}
      </div>

      {editOpen && (
        <EditHouseModal house={house} onClose={() => setEditOpen(false)} onChange={onChange} />
      )}
    </div>
  );
}

function HouseIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" style={{ color: "var(--accent)" }}>
      <path
        d="M3 11.5 12 4l9 7.5M5.5 10v9a1 1 0 0 0 1 1H10v-5.5a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1V20h3.5a1 1 0 0 0 1-1v-9"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
