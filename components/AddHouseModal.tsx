"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { toast } from "sonner";
import { ClipboardPaste, Sparkles, X } from "lucide-react";
import { AptoCredito } from "@/lib/types";
import { proxiedImage } from "@/lib/format";
import { apiErrorMessage } from "@/lib/http";
import { uploadHousePhoto } from "@/lib/photoUpload";
import { parseListingText } from "@/lib/listingText";
import { useModalScrollLock } from "@/lib/hooks";
import Select from "@/components/Select";

const URL_PATTERN = /^https?:\/\/.+\..+/i;

type Draft = {
  manual: boolean;
  url: string;
  title: string;
  images: string[];
  priceUsd: string;
  zone: string;
  address: string;
  ambientes: string;
  superficieM2: string;
  cochera: boolean;
  aptoCredito: AptoCredito;
  notes: string;
  addedBy: string;
};

function emptyDraft(people: string[]): Draft {
  return {
    manual: false,
    url: "",
    title: "",
    images: [],
    priceUsd: "",
    zone: "",
    address: "",
    ambientes: "",
    superficieM2: "",
    cochera: false,
    aptoCredito: "no_se",
    notes: "",
    addedBy: people[0] ?? "",
  };
}

export default function AddHouseModal({
  people,
  zones = [],
  existingUrls = [],
  onClose,
  onCreated,
}: {
  people: string[];
  zones?: string[];
  existingUrls?: string[];
  onClose: () => void;
  onCreated: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(() => emptyDraft(people));
  const [fetching, setFetching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [scrapeMsg, setScrapeMsg] = useState<string | null>(null);
  const [isBlockedSite, setIsBlockedSite] = useState(false);
  const [isScrapeError, setIsScrapeError] = useState(false);
  const [showTextRecovery, setShowTextRecovery] = useState(false);
  const [rawListingText, setRawListingText] = useState("");
  const lastFetchedUrl = useRef<string | null>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isDuplicate = useMemo(() => {
    if (!draft.url || existingUrls.length === 0) return false;
    const clean = (u: string) => {
      try {
        const parsed = new URL(u.trim());
        return `${parsed.origin}${parsed.pathname}`.replace(/\/+$/, "").toLowerCase();
      } catch {
        return u.trim().replace(/\/+$/, "").toLowerCase();
      }
    };
    const target = clean(draft.url);
    return existingUrls.some((u) => clean(u) === target);
  }, [draft.url, existingUrls]);

  useEffect(() => {
    urlInputRef.current?.focus();
  }, []);

  useModalScrollLock(true, onClose);

  async function pasteFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      const trimmed = text.trim();
      if (trimmed) {
        setDraft((d) => ({ ...d, url: trimmed }));
        toast.success("Link pegado del portapapeles");
      } else {
        toast.info("El portapapeles está vacío.");
      }
    } catch {
      toast.error("No se pudo leer el portapapeles. Pegalo manualmente.");
    }
  }

  function applyListingText(text: string) {
    const trimmed = text.trim();
    if (!trimmed) {
      toast.info("Pegá el texto o descripción del aviso primero.");
      return;
    }
    const result = parseListingText(trimmed, zones);
    const found: string[] = [];

    setDraft((d) => {
      const next = { ...d };
      if (result.priceUsd) {
        next.priceUsd = String(result.priceUsd);
        found.push(`US$ ${result.priceUsd.toLocaleString("es-AR")}`);
      }
      if (result.ambientes) {
        next.ambientes = String(result.ambientes);
        found.push(`${result.ambientes} amb`);
      }
      if (result.superficieM2) {
        next.superficieM2 = String(result.superficieM2);
        found.push(`${result.superficieM2} m²`);
      }
      if (result.zone) {
        next.zone = result.zone;
        found.push(result.zone);
      }
      return next;
    });

    if (found.length > 0) {
      toast.success(`Datos detectados: ${found.join(" · ")}`);
    } else {
      toast.info("No detectamos precio ni ambientes en ese texto. Podés cargarlos a mano.");
    }
  }

  async function pasteDescriptionFromClipboard() {
    try {
      const text = await navigator.clipboard.readText();
      const trimmed = text.trim();
      if (trimmed) {
        setRawListingText(trimmed);
        applyListingText(trimmed);
      } else {
        toast.info("El portapapeles está vacío.");
      }
    } catch {
      toast.error("No se pudo leer el portapapeles. Pegalo manualmente en el recuadro.");
    }
  }

  const fetchPreview = useCallback(async (url: string) => {
    setFetching(true);
    setScrapeMsg(null);
    setIsBlockedSite(false);
    setIsScrapeError(false);
    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (data.error) {
        setScrapeMsg(data.error);
        setIsScrapeError(true);
      } else {
        const isBlocked = Boolean(data.blocked || data.notice);
        setIsBlockedSite(isBlocked);
        if (isBlocked) {
          setShowTextRecovery(true);
        }
        const zoneMatch = zones.find(
          (z) => z && (data.title as string | null)?.toLowerCase().includes(z.toLowerCase())
        );
        setDraft((d) => (d.url === url ? {
          ...d,
          title: data.title || d.title,
          images: data.images?.length ? data.images : d.images,
          priceUsd: data.priceUsd ? String(data.priceUsd) : d.priceUsd,
          ambientes: data.ambientes ? String(data.ambientes) : d.ambientes,
          superficieM2: data.superficieM2 ? String(data.superficieM2) : d.superficieM2,
          zone: zoneMatch || d.zone,
          address: data.address || d.address,
        } : d));
        setScrapeMsg(data.notice || "Listo — revisá los datos y completá lo que falte.");
      }
    } catch {
      setScrapeMsg("No se pudo leer el link.");
      setIsScrapeError(true);
    } finally {
      setFetching(false);
    }
  }, [zones]);

  // Auto-fetch as soon as a full URL lands in the field — pasted or typed —
  // instead of making people press a separate button.
  useEffect(() => {
    const url = draft.url.trim();
    if (!URL_PATTERN.test(url) || url === lastFetchedUrl.current) return;
    const timer = setTimeout(() => {
      lastFetchedUrl.current = url;
      fetchPreview(url);
    }, 400);
    return () => clearTimeout(timer);
  }, [draft.url, fetchPreview]);

  async function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const url = await uploadHousePhoto(file);
      setDraft((d) => ({ ...d, images: [...d.images, url] }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo subir la foto.");
    } finally {
      setUploading(false);
    }
  }

  const canSave = draft.manual ? Boolean(draft.title.trim()) : Boolean(draft.url && draft.title.trim());

  async function save() {
    if (!canSave) return;
    setSaving(true);
    const res = await fetch("/api/houses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: draft.manual ? null : draft.url,
        title: draft.title || undefined,
        images: draft.images,
        priceUsd: draft.priceUsd ? Number(draft.priceUsd) : null,
        zone: draft.zone || null,
        address: draft.address || null,
        ambientes: draft.ambientes ? Number(draft.ambientes) : null,
        superficieM2: draft.superficieM2 ? Number(draft.superficieM2) : null,
        cochera: draft.cochera,
        aptoCredito: draft.aptoCredito,
        initialComments: draft.notes.trim() ? [draft.notes.trim()] : undefined,
        addedBy: draft.addedBy,
      }),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error(await apiErrorMessage(res, "No se pudo agregar la casa."));
      return;
    }
    toast.success("Casa agregada.");
    onCreated();
  }

  return (
    <div
      className="animate-overlay fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="animate-modal-pop max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border p-5"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-base font-semibold">Agregar casa</h3>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar"
            className="flex h-7 w-7 items-center justify-center rounded-full text-xl leading-none transition-colors hover:bg-black/5 dark:hover:bg-white/5"
            style={{ color: "var(--ink-faint)" }}
          >
            ×
          </button>
        </div>

        <div className="flex flex-col gap-3 text-sm">
          {!draft.manual ? (
            <label className="flex flex-col gap-1">
              <div className="flex items-center justify-between">
                <span className="eyebrow">Link del aviso</span>
                <button
                  type="button"
                  onClick={pasteFromClipboard}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--accent)] hover:underline"
                >
                  <ClipboardPaste size={12} /> Pegar link copiado
                </button>
              </div>
              <input
                ref={urlInputRef}
                className="field"
                placeholder="Pegá el link (MercadoLibre, ZonaProp, ArgenProp...)"
                value={draft.url}
                onChange={(e) => setDraft({ ...draft, url: e.target.value })}
              />
              {isDuplicate && (
                <p
                  className="mt-1 rounded-lg px-2.5 py-1.5 text-xs font-medium"
                  style={{ background: "var(--status-pendiente-bg)", color: "var(--status-pendiente)" }}
                >
                  ⚠️ Esta propiedad ya fue agregada en este caso.
                </p>
              )}
              <div className="flex items-center gap-2 text-xs" style={{ color: "var(--ink-faint)" }}>
                {fetching && <span>Buscando título, foto y precio…</span>}
                {!fetching && scrapeMsg && (
                  <>
                    <span>{scrapeMsg}</span>
                    {isScrapeError && !isBlockedSite && (
                      <button
                        type="button"
                        onClick={() => draft.url.trim() && fetchPreview(draft.url.trim())}
                        className="font-medium underline"
                        style={{ color: "var(--accent)" }}
                      >
                        Reintentar
                      </button>
                    )}
                  </>
                )}
              </div>
              <button
                type="button"
                onClick={() => setDraft((d) => ({ ...d, manual: true, url: "" }))}
                className="mt-1 self-start text-xs underline underline-offset-2"
                style={{ color: "var(--ink-muted)" }}
              >
                ¿No tenés un link? Cargar los datos a mano
              </button>
            </label>
          ) : (
            <div
              className="flex items-center justify-between rounded-lg border px-3 py-2 text-xs"
              style={{ borderColor: "var(--border)", color: "var(--ink-muted)" }}
            >
              <span>Carga manual — sin link de portal (dueño directo, ficha privada, etc.)</span>
              <button
                type="button"
                onClick={() => setDraft((d) => ({ ...d, manual: false }))}
                className="shrink-0 font-medium underline underline-offset-2"
                style={{ color: "var(--accent)" }}
              >
                Volver a pegar un link
              </button>
            </div>
          )}

          {/* Segunda vuelta: recuperación de datos pegando el texto de la descripción */}
          {(!draft.manual || showTextRecovery) && (
            <div
              className="rounded-xl border p-3 text-xs"
              style={{
                background: isBlockedSite ? "var(--accent-soft)" : "var(--paper)",
                borderColor: isBlockedSite ? "var(--accent)" : "var(--border)",
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 font-medium" style={{ color: "var(--ink)" }}>
                  <Sparkles size={13} style={{ color: "var(--accent)" }} />
                  Segunda vuelta: autocompletar con texto del aviso
                </span>
                <button
                  type="button"
                  onClick={() => setShowTextRecovery((v) => !v)}
                  className="text-[11px] underline"
                  style={{ color: "var(--ink-muted)" }}
                >
                  {showTextRecovery ? "Ocultar" : "Abrir"}
                </button>
              </div>

              {showTextRecovery && (
                <div className="mt-2.5 flex flex-col gap-2">
                  <p style={{ color: "var(--ink-muted)" }}>
                    Pegá acá la descripción o especificaciones del aviso para extraer precio, ambientes y m²:
                  </p>
                  <textarea
                    className="field w-full text-xs"
                    rows={2}
                    placeholder="Ej: Oportunidad USD 140.000, 3 ambientes, 75 m², balcón..."
                    value={rawListingText}
                    onChange={(e) => {
                      const val = e.target.value;
                      setRawListingText(val);
                      if (val.trim()) applyListingText(val);
                    }}
                  />
                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <button
                      type="button"
                      onClick={pasteDescriptionFromClipboard}
                      className="inline-flex items-center gap-1 font-medium text-[var(--accent)] hover:underline"
                    >
                      <ClipboardPaste size={12} /> Pegar del portapapeles y procesar
                    </button>
                    {rawListingText.trim() && (
                      <button
                        type="button"
                        onClick={() => applyListingText(rawListingText)}
                        className="rounded-md border px-2 py-1 font-medium hover:bg-black/5 dark:hover:bg-white/5"
                        style={{ borderColor: "var(--border)", color: "var(--ink)" }}
                      >
                        Re-procesar
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {draft.images.length > 0 && (
            <div className="flex gap-2 overflow-x-auto pb-1">
              {draft.images.map((img, i) => (
                <div key={img} className="relative shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={proxiedImage(img)!}
                    alt=""
                    className="h-24 w-32 rounded-lg object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => setDraft({ ...draft, images: draft.images.filter((_, j) => j !== i) })}
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full"
                    style={{ background: "rgba(0,0,0,0.6)", color: "#fff" }}
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="flex flex-col gap-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="self-start rounded-lg border px-3 py-1.5 text-xs font-medium"
              style={{ borderColor: "var(--border)", color: "var(--ink-muted)" }}
            >
              {uploading ? "Subiendo…" : "Subir una foto desde el dispositivo"}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={onFileChange}
              className="hidden"
            />
          </div>

          <label className="flex flex-col gap-1">
            <span className="eyebrow">Título (obligatorio)</span>
            <input
              className="field"
              placeholder={draft.manual ? "Ej: Casa 3 ambientes en Villa Ballester" : "Se completa solo al pegar el link, o escribilo a mano"}
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
          </label>

          <div className="grid grid-cols-3 gap-3">
            <label className="flex flex-col gap-1">
              <span className="eyebrow">Precio (USD)</span>
              <input
                type="number"
                className="field"
                value={draft.priceUsd}
                onChange={(e) => setDraft({ ...draft, priceUsd: e.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="eyebrow">Ambientes</span>
              <input
                type="number"
                className="field"
                value={draft.ambientes}
                onChange={(e) => setDraft({ ...draft, ambientes: e.target.value })}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="eyebrow">Superficie (m²)</span>
              <input
                type="number"
                className="field"
                value={draft.superficieM2}
                onChange={(e) => setDraft({ ...draft, superficieM2: e.target.value })}
              />
            </label>
          </div>

          <label className="flex flex-col gap-1">
            <span className="eyebrow">Zona</span>
            <input
              className="field"
              value={draft.zone}
              onChange={(e) => setDraft({ ...draft, zone: e.target.value })}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="eyebrow">Dirección (opcional)</span>
            <input
              className="field"
              placeholder="Calle y altura, para el mapa y el calendario"
              value={draft.address}
              onChange={(e) => setDraft({ ...draft, address: e.target.value })}
            />
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={draft.cochera}
              onChange={(e) => setDraft({ ...draft, cochera: e.target.checked })}
            />
            <span className="text-sm">Tiene cochera</span>
          </label>

          <label className="flex flex-col gap-1">
            <span className="eyebrow">Apto crédito</span>
            <Select
              className="field"
              value={draft.aptoCredito}
              onChange={(e) => setDraft({ ...draft, aptoCredito: e.target.value as AptoCredito })}
            >
              <option value="no_se">Sin dato</option>
              <option value="si">Sí</option>
              <option value="no">No</option>
            </Select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="eyebrow">Comentario inicial (opcional)</span>
            <textarea
              className="field"
              rows={2}
              value={draft.notes}
              onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="eyebrow">Quién la agrega</span>
            {people.length > 0 ? (
              <Select
                className="field"
                value={draft.addedBy}
                onChange={(e) => setDraft({ ...draft, addedBy: e.target.value })}
              >
                {people.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </Select>
            ) : (
              <input
                className="field"
                placeholder="Tu nombre"
                value={draft.addedBy}
                onChange={(e) => setDraft({ ...draft, addedBy: e.target.value })}
              />
            )}
          </label>
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-full px-4 py-2 text-sm font-medium"
            style={{ color: "var(--ink-muted)" }}
          >
            Cancelar
          </button>
          <button
            onClick={save}
            disabled={saving || !canSave}
            className="rounded-full px-4 py-2 text-sm font-semibold"
            style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
          >
            {saving ? "Guardando…" : "Agregar"}
          </button>
        </div>
      </div>
      <style jsx>{`
        :global(.field) {
          width: 100%;
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 8px 10px;
          background: var(--paper);
          color: var(--ink);
        }
      `}</style>
    </div>
  );
}
