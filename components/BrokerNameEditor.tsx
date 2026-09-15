"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil } from "lucide-react";
import { apiErrorMessage } from "@/lib/http";

export default function BrokerNameEditor({
  initialName,
  className,
  style,
  hint,
}: {
  initialName: string;
  className?: string;
  style?: React.CSSProperties;
  hint?: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  async function save() {
    const next = name.trim();
    setEditing(false);
    if (!next || next === initialName) {
      setName(initialName);
      return;
    }
    setSaving(true);
    const res = await fetch("/api/panel/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ nombreMarca: next }),
    });
    setSaving(false);
    if (!res.ok) {
      setName(initialName);
      toast.error(await apiErrorMessage(res, "No se pudo cambiar el nombre."));
      return;
    }
    router.refresh();
  }

  if (editing) {
    return (
      <input
        autoFocus
        value={name}
        disabled={saving}
        onChange={(e) => setName(e.target.value)}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") {
            setName(initialName);
            setEditing(false);
          }
        }}
        className={className ?? "rounded-lg border px-2 py-1 text-sm"}
        style={style ?? { borderColor: "var(--border)", background: "var(--paper)", color: "var(--ink)" }}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditing(true)}
      title={hint ?? "Cambiar cómo te ven tus clientes"}
      className={[className, "inline-flex items-center gap-1.5"].filter(Boolean).join(" ")}
      style={style}
    >
      {saving ? "Guardando…" : name}
      <Pencil size={11} style={{ color: "var(--ink-faint)" }} />
    </button>
  );
}
