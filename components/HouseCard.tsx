"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Car,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Landmark,
  ListChecks,
  MapPin,
  MessageCircle,
  Pencil,
  Phone,
  Pin,
  RefreshCw,
  RotateCcw,
  Share2,
  Star,
  Wallet,
  X,
} from "lucide-react";
import Image from "next/image";
import { AptoCredito, House, HouseStatus, LoanInfo, PIPELINE_STATUSES, STATUS_LABEL } from "@/lib/types";
import { formatDate, formatUsd, isOverdue, proxiedImage } from "@/lib/format";
import { apiErrorMessage } from "@/lib/http";
import { openWhatsapp } from "@/lib/whatsapp";
import { cashNeededRange, pricePerM2 } from "@/lib/mortgage";
import StatusBadge from "@/components/StatusBadge";
import EditHouseModal from "@/components/EditHouseModal";
import VisitReview from "@/components/VisitReview";
import Select from "@/components/Select";
import VisitaCoordinadaBadge from "@/components/VisitaCoordinadaBadge";

// Global (no por caso) a propósito: el nombre en sí no identifica un
// caso, y se valida contra `people` del caso actual antes de usarlo
// (ver el useEffect más abajo) — así no arrastra un nombre que no
// existe en este caso desde otro que se vio antes en el mismo navegador
// (por ejemplo, un corredor que entra a dos casos distintos con "Entrar
// al caso" desde el mismo panel).
const AUTHOR_KEY = "casa-comment-author";

const APTO_CREDITO_NEXT: Record<AptoCredito, AptoCredito> = {
  no_se: "si",
  si: "no",
  no: "no_se",
};

const APTO_CREDITO_LABEL: Record<AptoCredito, string> = {
  no_se: "Apto crédito: no sé",
  si: "Apto crédito: sí",
  no: "Apto crédito: no",
};

const APTO_CREDITO_COLOR: Record<AptoCredito, string> = {
  no_se: "var(--gold)",
  si: "var(--status-gusto)",
  no: "var(--status-descartada)",
};

const APTO_CREDITO_BG: Record<AptoCredito, string> = {
  no_se: "var(--gold-soft)",
  si: "var(--status-gusto-bg)",
  no: "var(--status-descartada-bg)",
};

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
  onChange: (id: string, patch: Partial<House>) => Promise<boolean>;
  onDelete: (id: string) => Promise<boolean>;
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
      if (saved && people.includes(saved)) {
        setTimeout(() => setCommentAuthor(saved), 0);
      }
    } catch {}
  }, [people]);

  async function postComment() {
    const text = commentText.trim();
    if (!text) return;
    setPosting(true);
    try {
      localStorage.setItem(AUTHOR_KEY, commentAuthor);
    } catch {}
    const res = await fetch(`/api/houses/${house.id}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ author: commentAuthor, text }),
    });
    setPosting(false);
    if (!res.ok) {
      toast.error(await apiErrorMessage(res, "No se pudo publicar el comentario."));
      return;
    }
    setCommentText("");
    router.refresh();
  }

  async function addChecklistItem() {
    const text = checklistText.trim();
    if (!text) return;
    setAddingItem(true);
    const res = await fetch(`/api/houses/${house.id}/checklist`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    setAddingItem(false);
    if (!res.ok) {
      toast.error(await apiErrorMessage(res, "No se pudo agregar el ítem."));
      return;
    }
    setChecklistText("");
    router.refresh();
  }

  async function toggleChecklistItem(itemId: string, done: boolean) {
    const res = await fetch(`/api/houses/${house.id}/checklist/${itemId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ done }),
    });
    if (!res.ok) {
      toast.error(await apiErrorMessage(res, "No se pudo actualizar el ítem."));
      return;
    }
    router.refresh();
  }

  async function deleteChecklistItem(itemId: string) {
    const res = await fetch(`/api/houses/${house.id}/checklist/${itemId}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error(await apiErrorMessage(res, "No se pudo eliminar el ítem."));
      return;
    }
    router.refresh();
  }

  const cash = house.priceUsd ? cashNeededRange(house.priceUsd, loan.hasCredit ? loan.bankMaxUsd : 0) : null;
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
      const data = await res.json().catch(() => ({}) as { error?: string });
      if (!res.ok || data.error) {
        toast.error(data.error || "No se pudo leer el aviso.");
        return;
      }
      const patch: Partial<House> = {};
      if (data.images?.length > house.images.length) patch.images = data.images;
      if (data.title && house.title === house.url) patch.title = data.title;
      if (data.priceUsd && !house.priceUsd) patch.priceUsd = data.priceUsd;
      if (Object.keys(patch).length > 0) {
        await onChange(house.id, patch);
      } else {
        toast.info("No encontramos nada nuevo en el aviso.");
      }
    } catch {
      toast.error("No se pudo leer el aviso.");
    } finally {
      setRefreshing(false);
    }
  }

  function compartirPorWhatsapp() {
    const precio = house.priceUsd !== null ? ` — ${formatUsd(house.priceUsd)}` : "";
    const link = house.url ? `\n${house.url}` : "";
    const mensaje = `Mirá esta casa que guardé en Micaso: ${house.title}${precio}${link}`;
    openWhatsapp(mensaje);
  }

  return (
    <div
      className="flex flex-col overflow-hidden rounded-2xl border transition-all"
      style={{
        background: "var(--surface)",
        borderColor: house.highlighted ? "var(--gold)" : "var(--border)",
        boxShadow: house.highlighted ? "0 0 0 1px var(--gold), var(--shadow-card)" : "var(--shadow-card)",
        opacity: isDiscarded ? 0.7 : 1,
      }}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden" style={{ background: "var(--accent-soft)" }}>
        <a
          href={house.url ?? undefined}
          target={house.url ? "_blank" : undefined}
          rel="noreferrer"
          className="block h-full w-full"
        >
          {showImage ? (
            <>
              <Image
                src={proxiedImage(currentImage)!}
                alt={house.title}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                onError={() => setImgFailed(true)}
                className="object-cover"
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
                    className="absolute left-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full"
                    style={{ background: "rgba(0,0,0,0.45)", color: "#fff" }}
                  >
                    <ChevronLeft size={16} />
                  </button>
                  <button
                    title="Foto siguiente"
                    onClick={(e) => {
                      e.preventDefault();
                      setImgFailed(false);
                      setPhotoIndex((i) => (i + 1) % house.images.length);
                    }}
                    className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full"
                    style={{ background: "rgba(0,0,0,0.45)", color: "#fff" }}
                  >
                    <ChevronRight size={16} />
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
              {house.url && (
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
              )}
            </div>
          )}
        </a>

        {/* Botón flotante de Favorito sobre la foto */}
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onChange(house.id, { highlighted: !house.highlighted });
          }}
          aria-label={house.highlighted ? "Quitar de favoritas" : "Marcar como favorita"}
          title={house.highlighted ? "Quitar de favoritas" : "Marcar como favorita"}
          className="absolute right-2.5 top-2.5 z-10 flex h-8 w-8 items-center justify-center rounded-full backdrop-blur-md transition-all active:scale-90 hover:scale-110 shadow-sm"
          style={{
            background: house.highlighted ? "rgba(20, 24, 30, 0.78)" : "rgba(20, 24, 30, 0.45)",
            color: house.highlighted ? "var(--gold)" : "#ffffff",
            border: house.highlighted ? "1.5px solid var(--gold)" : "1px solid rgba(255, 255, 255, 0.35)",
          }}
        >
          <Star
            size={16}
            fill={house.highlighted ? "var(--gold)" : "none"}
            stroke={house.highlighted ? "var(--gold)" : "currentColor"}
            className={house.highlighted ? "drop-shadow-[0_0_6px_rgba(234,179,8,0.6)]" : ""}
          />
        </button>

        {/* Badge Favorita en la esquina superior izquierda */}
        {house.highlighted && (
          <span
            className="pointer-events-none absolute left-2.5 top-2.5 z-10 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold backdrop-blur-md"
            style={{
              background: "rgba(20, 24, 30, 0.78)",
              color: "var(--gold)",
              border: "1px solid color-mix(in srgb, var(--gold) 40%, transparent)",
            }}
          >
            <Star size={10} fill="currentColor" /> Favorita
          </span>
        )}
      </div>

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

        <button
          type="button"
          onClick={() => onChange(house.id, { aptoCredito: APTO_CREDITO_NEXT[house.aptoCredito] })}
          title="Tocar para cambiar"
          className="inline-flex w-fit items-center gap-1.5 rounded-lg border border-dashed px-2 py-1 text-xs font-semibold transition-colors hover:brightness-95"
          style={{
            background: APTO_CREDITO_BG[house.aptoCredito],
            color: APTO_CREDITO_COLOR[house.aptoCredito],
            borderColor: "color-mix(in srgb, currentColor 40%, transparent)",
          }}
        >
          <Landmark size={13} /> {APTO_CREDITO_LABEL[house.aptoCredito]}
          <ChevronsUpDown size={12} className="opacity-60" />
        </button>

        <h3 className="line-clamp-2 text-sm font-semibold">{house.title}</h3>

        <VisitaCoordinadaBadge house={house} label="Visita: " linkToAgenda />

        {house.proximaAccion && (
          <div
            className="inline-flex w-fit items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium"
            style={{
              background: accionVencida ? "var(--status-descartada-bg)" : "var(--status-pendiente-bg)",
              color: accionVencida ? "var(--status-descartada)" : "var(--status-pendiente)",
            }}
          >
            <Pin size={13} /> {house.proximaAccion}
            {house.proximaAccionFecha && (
              <> · {accionVencida ? "venció" : "vence"} {formatDate(house.proximaAccionFecha)}</>
            )}
          </div>
        )}

        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs" style={{ color: "var(--ink-muted)" }}>
          {house.zone && (
            <span className="inline-flex items-center gap-1">
              <MapPin size={13} /> {house.zone}
            </span>
          )}
          {house.ambientes && <span>{house.ambientes} amb.</span>}
          {house.superficieM2 && <span>{house.superficieM2} m²</span>}
          {house.cochera && (
            <span className="inline-flex items-center gap-1">
              <Car size={13} /> cochera
            </span>
          )}
        </div>

        {(house.contactoNombre || house.contactoTelefono) && (
          <div className="inline-flex items-center gap-1.5 text-xs" style={{ color: "var(--ink-muted)" }}>
            <Phone size={13} />
            {house.contactoNombre}
            {house.contactoNombre && house.contactoTelefono && " · "}
            {house.contactoTelefono}
          </div>
        )}

        {cash && cashFit && (
          <div
            className="mono inline-flex w-fit items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium"
            style={{ background: `var(--status-${cashFit}-bg)`, color: `var(--status-${cashFit})` }}
          >
            <Wallet size={13} /> {formatUsd(cash.low)}–{formatUsd(cash.high)} de bolsillo
          </div>
        )}

        {(house.status === "gusto" || house.status === "no_gusto" || house.visitReview) && (
          <VisitReview house={house} onChange={onChange} />
        )}

        <div className="flex flex-col gap-2">
          <button
            onClick={() => setCommentsOpen((v) => !v)}
            className="inline-flex items-center gap-1.5 text-left text-xs font-medium"
            style={{ color: "var(--ink-faint)" }}
          >
            <MessageCircle size={13} />
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
                  <Select
                    value={commentAuthor}
                    onChange={(e) => setCommentAuthor(e.target.value)}
                    wrapperClassName="shrink-0"
                    className="rounded-lg border px-1.5 text-xs"
                    style={{ borderColor: "var(--border)", background: "var(--surface)", color: "var(--ink)" }}
                  >
                    {people.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </Select>
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
            className="inline-flex items-center gap-1.5 text-left text-xs font-medium"
            style={{ color: "var(--ink-faint)" }}
          >
            <ListChecks size={13} />
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
                        <X size={13} />
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
              className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border px-2 py-1.5 text-xs font-medium"
              style={{ borderColor: "var(--accent)", color: "var(--accent)" }}
            >
              <RotateCcw size={13} /> Restaurar
            </button>
            <button
              title="Eliminar definitivamente (no se puede deshacer)"
              onClick={() => {
                toast("¿Eliminar propiedad definitivamente?", {
                  description: "Esta acción no se puede deshacer. Se borrará la ficha, fotos y comentarios para siempre.",
                  duration: 10000,
                  action: {
                    label: "Sí, eliminar",
                    onClick: () => onDelete(house.id),
                  },
                  cancel: {
                    label: "Cancelar",
                    onClick: () => {},
                  },
                });
              }}
              className="rounded-lg border px-2 py-1.5 text-xs"
              style={{ borderColor: "var(--border)", color: "var(--status-descartada)" }}
            >
              Eliminar definitivamente
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2 border-t pt-3" style={{ borderColor: "var(--border)" }}>
            <Select
              value={house.status}
              onChange={(e) => onChange(house.id, { status: e.target.value as HouseStatus })}
              wrapperClassName="flex-1"
              className="rounded-lg border px-2 py-1.5 text-xs"
              style={{ borderColor: "var(--border)", background: "var(--paper)", color: "var(--ink)" }}
            >
              {PIPELINE_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABEL[s]}
                </option>
              ))}
            </Select>
            {house.url && (
              <button
                title="Actualizar imagen/precio desde el aviso"
                onClick={refreshFromSource}
                disabled={refreshing}
                className="flex items-center justify-center rounded-lg border px-2 py-1.5"
                style={{ borderColor: "var(--border)" }}
              >
                <RefreshCw size={14} className={refreshing ? "animate-spin" : undefined} />
              </button>
            )}
            <button
              title="Compartir por WhatsApp"
              onClick={compartirPorWhatsapp}
              className="flex items-center justify-center rounded-lg border px-2 py-1.5"
              style={{ borderColor: "var(--border)" }}
            >
              <Share2 size={14} />
            </button>
            <button
              title="Editar título, precio, zona, ambientes, cochera o imagen"
              onClick={() => setEditOpen(true)}
              className="flex items-center justify-center rounded-lg border px-2 py-1.5"
              style={{ borderColor: "var(--border)" }}
            >
              <Pencil size={14} />
            </button>
            <button
              title={house.highlighted ? "Quitar de favoritas" : "Marcar como favorita"}
              onClick={() => onChange(house.id, { highlighted: !house.highlighted })}
              className="flex items-center justify-center rounded-lg border px-2 py-1.5 transition-colors"
              style={{
                borderColor: house.highlighted ? "var(--gold)" : "var(--border)",
                color: house.highlighted ? "var(--gold)" : undefined,
                background: house.highlighted ? "var(--gold-soft)" : undefined,
              }}
            >
              <Star size={14} fill={house.highlighted ? "currentColor" : "none"} />
            </button>
            <button
              title="Archivar (se puede restaurar desde la pestaña Borradas)"
              onClick={() => onChange(house.id, { status: "borrada" })}
              className="flex items-center justify-center rounded-lg border px-2 py-1.5"
              style={{ borderColor: "var(--border)", color: "var(--status-descartada)" }}
            >
              <X size={14} />
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
