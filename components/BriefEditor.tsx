"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { X } from "lucide-react";
import { SearchBrief } from "@/lib/types";
import { apiErrorMessage } from "@/lib/http";

export default function BriefEditor({ brief }: { brief: SearchBrief }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(brief);

  async function save() {
    setSaving(true);
    const res = await fetch("/api/criteria", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ brief: form }),
    });
    setSaving(false);
    if (!res.ok) {
      toast.error(await apiErrorMessage(res, "No se pudo guardar."));
      return;
    }
    toast.success("Cambios guardados.");
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="text-xs font-medium"
        style={{ color: "var(--accent)" }}
      >
        Editar
      </button>
    );
  }

  return (
    <div
      className="animate-overlay fixed inset-0 z-20 flex items-end justify-center bg-black/30 p-4 sm:items-center"
      onClick={() => setOpen(false)}
    >
      <div
        className="animate-modal-pop max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border p-5"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-base font-semibold">Editar lo que buscamos</h3>
        <div className="flex flex-col gap-5 text-sm">
          <TagList
            label="Imprescindible"
            items={form.mustHave}
            onChange={(items) => setForm({ ...form, mustHave: items })}
            placeholder="Ej. cochera…"
          />
          <TagList
            label="Puede variar"
            items={form.flexible}
            onChange={(items) => setForm({ ...form, flexible: items })}
            placeholder="Ej. tamaño…"
          />
          <TagList
            label="Zonas de interés"
            items={form.zones}
            onChange={(items) => setForm({ ...form, zones: items })}
            placeholder="Ej. Villa Urquiza…"
            pill
          />
          <TagList
            label="Si aparece algo en Capital"
            items={form.capitalZones}
            onChange={(items) => setForm({ ...form, capitalZones: items })}
            placeholder="Ej. Villa Devoto…"
            pill
          />
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={() => setOpen(false)}
            className="rounded-full px-4 py-2 text-sm font-medium"
            style={{ color: "var(--ink-muted)" }}
          >
            Cancelar
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="rounded-full px-4 py-2 text-sm font-semibold"
            style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
          >
            {saving ? "Guardando…" : "Guardar"}
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

function TagList({
  label,
  items,
  onChange,
  placeholder,
  pill,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
  pill?: boolean;
}) {
  const [draft, setDraft] = useState("");

  function add() {
    const text = draft.trim();
    if (!text) return;
    onChange([...items, text]);
    setDraft("");
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="eyebrow">{label}</span>
      {pill ? (
        <div className="flex flex-wrap gap-1.5">
          {items.map((item, i) => (
            <span
              key={i}
              className="inline-flex items-center gap-1 rounded-full py-1 pl-2.5 pr-1.5 text-xs font-medium"
              style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
            >
              {item}
              <button type="button" onClick={() => onChange(items.filter((_, j) => j !== i))}>
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      ) : (
        items.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {items.map((item, i) => (
              <div key={i} className="flex items-center gap-1.5">
                <span
                  className="flex-1 rounded-lg border px-2 py-1.5 text-sm"
                  style={{ borderColor: "var(--border)", background: "var(--paper)" }}
                >
                  {item}
                </span>
                <button
                  type="button"
                  onClick={() => onChange(items.filter((_, j) => j !== i))}
                  style={{ color: "var(--ink-faint)" }}
                >
                  <X size={14} />
                </button>
              </div>
            ))}
          </div>
        )
      )}
      <div className="flex gap-1.5">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          className="field"
        />
        <button
          type="button"
          onClick={add}
          disabled={!draft.trim()}
          className="shrink-0 rounded-lg px-2.5 text-xs font-semibold"
          style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
        >
          Agregar
        </button>
      </div>
    </div>
  );
}
