"use client";

import { useEffect, useRef, useState } from "react";
import { PEOPLE } from "@/lib/types";
import { proxiedImage } from "@/lib/format";

const URL_PATTERN = /^https?:\/\/.+\..+/i;

type Draft = {
  url: string;
  title: string;
  images: string[];
  priceUsd: string;
  zone: string;
  ambientes: string;
  cochera: boolean;
  notes: string;
  addedBy: string;
};

const EMPTY: Draft = {
  url: "",
  title: "",
  images: [],
  priceUsd: "",
  zone: "",
  ambientes: "",
  cochera: false,
  notes: "",
  addedBy: "Lucas",
};

export default function AddHouseModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [fetching, setFetching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [scrapeMsg, setScrapeMsg] = useState<string | null>(null);
  const lastFetchedUrl = useRef<string | null>(null);
  const urlInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    urlInputRef.current?.focus();
  }, []);

  async function fetchPreview(url: string) {
    setFetching(true);
    setScrapeMsg(null);
    try {
      const res = await fetch("/api/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const data = await res.json();
      if (data.error) {
        setScrapeMsg(data.error);
      } else {
        setDraft((d) => (d.url === url ? {
          ...d,
          title: data.title || d.title,
          images: data.images?.length ? data.images : d.images,
          priceUsd: data.priceUsd ? String(data.priceUsd) : d.priceUsd,
        } : d));
        setScrapeMsg("Listo — revisá los datos y completá lo que falte.");
      }
    } catch {
      setScrapeMsg("No se pudo leer el link.");
    } finally {
      setFetching(false);
    }
  }

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft.url]);

  async function save() {
    if (!draft.url) return;
    setSaving(true);
    await fetch("/api/houses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        url: draft.url,
        title: draft.title || undefined,
        images: draft.images,
        priceUsd: draft.priceUsd ? Number(draft.priceUsd) : null,
        zone: draft.zone || null,
        ambientes: draft.ambientes ? Number(draft.ambientes) : null,
        cochera: draft.cochera,
        comments: draft.notes.trim()
          ? [{ id: crypto.randomUUID(), author: draft.addedBy, text: draft.notes.trim(), createdAt: new Date().toISOString() }]
          : [],
        addedBy: draft.addedBy,
      }),
    });
    setSaving(false);
    onCreated();
  }

  return (
    <div
      className="fixed inset-0 z-20 flex items-end justify-center bg-black/30 p-4 sm:items-center"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border p-5"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-base font-semibold">Agregar casa</h3>

        <div className="flex flex-col gap-3 text-sm">
          <label className="flex flex-col gap-1">
            <span className="eyebrow">Link del aviso</span>
            <input
              ref={urlInputRef}
              className="field"
              placeholder="Pegá el link (MercadoLibre, ZonaProp, ArgenProp...)"
              value={draft.url}
              onChange={(e) => setDraft({ ...draft, url: e.target.value })}
            />
            <div className="flex items-center gap-2 text-xs" style={{ color: "var(--ink-faint)" }}>
              {fetching && <span>Buscando título, foto y precio…</span>}
              {!fetching && scrapeMsg && (
                <>
                  <span>{scrapeMsg}</span>
                  <button
                    onClick={() => draft.url.trim() && fetchPreview(draft.url.trim())}
                    className="font-medium underline"
                    style={{ color: "var(--accent)" }}
                  >
                    Reintentar
                  </button>
                </>
              )}
            </div>
          </label>

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
                    className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full text-xs"
                    style={{ background: "rgba(0,0,0,0.6)", color: "#fff" }}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          <label className="flex flex-col gap-1">
            <span className="eyebrow">Título</span>
            <input
              className="field"
              value={draft.title}
              onChange={(e) => setDraft({ ...draft, title: e.target.value })}
            />
          </label>

          <div className="grid grid-cols-2 gap-3">
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
          </div>

          <label className="flex flex-col gap-1">
            <span className="eyebrow">Zona</span>
            <input
              className="field"
              value={draft.zone}
              onChange={(e) => setDraft({ ...draft, zone: e.target.value })}
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
            <select
              className="field"
              value={draft.addedBy}
              onChange={(e) => setDraft({ ...draft, addedBy: e.target.value })}
            >
              {PEOPLE.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
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
            disabled={saving || !draft.url}
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
