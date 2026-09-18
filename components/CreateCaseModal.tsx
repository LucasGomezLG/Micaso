"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Copy, Eye, EyeOff, LogIn, Share2 } from "lucide-react";
import { Case, TipoCaso } from "@/lib/types";
import { buildCaseCredentialsText, buildCaseShareMessage, openWhatsapp } from "@/lib/whatsapp";
import Select from "@/components/Select";

export default function CreateCaseModal({ label = "+ Nuevo caso", disabledReason }: { label?: string; disabledReason?: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [titulo, setTitulo] = useState("");
  const [tipoCaso, setTipoCaso] = useState<TipoCaso>("compra");
  const [personas, setPersonas] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [createdCase, setCreatedCase] = useState<Case | null>(null);
  const [copied, setCopied] = useState(false);
  const [entering, setEntering] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  function resetAndClose() {
    setOpen(false);
    setCreatedCase(null);
    setTitulo("");
    setPersonas("");
    setTipoCaso("compra");
    setShowPassword(false);
    router.refresh();
  }

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (createdCase) {
          resetAndClose();
        } else {
          setOpen(false);
        }
      }
    }
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, createdCase]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const people = personas.split(",").map((p) => p.trim()).filter(Boolean);
    const res = await fetch("/api/panel/cases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ titulo, tipoCaso, people }),
    });
    setLoading(false);
    if (res.ok) {
      const data = await res.json();
      setCreatedCase(data.case);
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "No se pudo crear el caso.");
    }
  }

  async function entrarComoCaso(caseId: string) {
    setEntering(true);
    const res = await fetch(`/api/panel/cases/${caseId}/impersonate`, { method: "POST" });
    if (!res.ok) {
      setEntering(false);
      toast.error("No se pudo entrar al caso.");
      return;
    }
    router.refresh();
    router.push("/caso");
  }


  return (
    <>
      <button
        type="button"
        onClick={() => {
          if (disabledReason) {
            toast.error(disabledReason);
          } else {
            setOpen(true);
          }
        }}
        className={`btn btn-primary rounded-full px-4 py-2 text-sm font-semibold ${disabledReason ? "opacity-50 cursor-not-allowed" : ""}`}
        style={{ background: "linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 65%, var(--gold)))", color: "var(--accent-ink)" }}
      >
        {label}
      </button>

      {open &&
        createPortal(
          <div
            className="animate-overlay fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto overscroll-contain"
            style={{ background: "rgba(18, 24, 31, 0.65)", backdropFilter: "blur(2px)" }}
            onClick={() => (createdCase ? resetAndClose() : setOpen(false))}
          >
            <div
              className="animate-modal-pop my-auto w-full max-w-sm rounded-2xl border p-6 max-h-[90dvh] overflow-y-auto"
              style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-card)" }}
              onClick={(e) => e.stopPropagation()}
            >
              {createdCase ? (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold" style={{ background: "var(--status-gusto-bg)", color: "var(--status-gusto)" }}>
                        ✓
                      </span>
                      <h3 className="text-lg font-semibold" style={{ color: "var(--ink)" }}>
                        ¡Caso creado con éxito!
                      </h3>
                    </div>
                    <button
                      type="button"
                      onClick={resetAndClose}
                      aria-label="Cerrar"
                      className="flex h-8 w-8 items-center justify-center rounded-full text-2xl leading-none transition-colors hover:bg-[var(--border)]"
                      style={{ color: "var(--ink-faint)" }}
                    >
                      ×
                    </button>
                  </div>

                  <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
                    Ya podés compartir el acceso con la familia para que sigan las propiedades y el presupuesto juntos.
                  </p>

                  <div
                    className="flex flex-col gap-2 rounded-xl border p-3.5 text-xs"
                    style={{ borderColor: "var(--border)", background: "var(--paper)" }}
                  >
                    <p className="font-semibold text-sm" style={{ color: "var(--ink)" }}>
                      {createdCase.titulo}
                    </p>
                    <div className="flex justify-between border-t pt-2" style={{ borderColor: "var(--border)" }}>
                      <span style={{ color: "var(--ink-muted)" }}>Usuario:</span>
                      <span className="mono font-semibold" style={{ color: "var(--ink)" }}>
                        {createdCase.username}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span style={{ color: "var(--ink-muted)" }}>Contraseña:</span>
                      <div className="flex items-center gap-1.5">
                        <span className="mono font-semibold" style={{ color: "var(--ink)" }}>
                          {showPassword ? createdCase.password : "••••••••"}
                        </span>
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          title={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                          aria-label={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                          className="p-0.5 rounded text-[var(--ink-faint)] hover:text-[var(--ink)] transition-colors cursor-pointer"
                        >
                          {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        openWhatsapp(buildCaseShareMessage(createdCase));
                      }}
                      className="btn inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold shadow-xs transition-transform active:scale-95"
                      style={{ background: "#25D366", color: "#ffffff" }}
                    >
                      <Share2 size={16} /> Compartir por WhatsApp
                    </button>

                    <button
                      type="button"
                      onClick={async () => {
                        await navigator.clipboard.writeText(buildCaseCredentialsText(createdCase));
                        setCopied(true);
                        toast.success("Credenciales y link copiados");
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className="btn inline-flex items-center justify-center gap-2 rounded-full border px-4 py-2.5 text-xs font-semibold transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                      style={{ borderColor: "var(--border)", color: "var(--ink)" }}
                    >
                      {copied ? <Check size={14} style={{ color: "var(--status-gusto)" }} /> : <Copy size={14} />}
                      {copied ? "¡Copiado!" : "Copiar datos y link directo"}
                    </button>

                    <div className="mt-2 flex items-center justify-between border-t pt-3" style={{ borderColor: "var(--border)" }}>
                      <button
                        type="button"
                        onClick={resetAndClose}
                        className="text-xs font-medium hover:underline"
                        style={{ color: "var(--ink-muted)" }}
                      >
                        Listo, volver al panel
                      </button>
                      <button
                        type="button"
                        disabled={entering}
                        onClick={() => entrarComoCaso(createdCase.id)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold hover:underline"
                        style={{ color: "var(--accent)" }}
                      >
                        <LogIn size={13} /> {entering ? "Entrando…" : "Entrar al caso →"}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg">Nuevo caso</h3>
                    <button
                      type="button"
                      onClick={() => setOpen(false)}
                      aria-label="Cerrar"
                      className="flex h-8 w-8 items-center justify-center rounded-full text-2xl leading-none transition-colors hover:bg-[var(--border)]"
                      style={{ color: "var(--ink-faint)" }}
                    >
                      ×
                    </button>
                  </div>
                  <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
                    Usuario y contraseña se generan solos — los criterios se cargan
                    después, desde adentro del caso.
                  </p>
                  <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
                    <label className="flex flex-col gap-1 text-sm">
                      <span className="eyebrow">Título (ej. &quot;Familia Pérez&quot;)</span>
                      <input
                        required
                        autoFocus
                        value={titulo}
                        onChange={(e) => setTitulo(e.target.value)}
                        className="rounded-lg border px-3 py-2"
                        style={{ borderColor: "var(--border)", background: "var(--paper)", color: "var(--ink)" }}
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-sm">
                      <span className="eyebrow">Tipo de búsqueda</span>
                      <Select
                        value={tipoCaso}
                        onChange={(e) => setTipoCaso(e.target.value as TipoCaso)}
                        className="rounded-lg border px-3 py-2"
                        style={{ borderColor: "var(--border)", background: "var(--paper)", color: "var(--ink)" }}
                      >
                        <option value="compra">Compra</option>
                        <option value="alquiler">Alquiler</option>
                        <option value="otro">Otro</option>
                      </Select>
                    </label>
                    <label className="flex flex-col gap-1 text-sm">
                      <span className="eyebrow">Integrantes de la familia (opcional)</span>
                      <input
                        placeholder="Ej. Lucas, Abril (separados por coma)"
                        value={personas}
                        onChange={(e) => setPersonas(e.target.value)}
                        className="rounded-lg border px-3 py-2"
                        style={{ borderColor: "var(--border)", background: "var(--paper)", color: "var(--ink)" }}
                      />
                    </label>
                    {error && (
                      <p className="text-xs" style={{ color: "var(--status-descartada)" }}>
                        {error}
                      </p>
                    )}
                    <button
                      type="submit"
                      disabled={loading || !titulo.trim()}
                      className="btn btn-primary mt-1 rounded-full px-5 py-2.5 text-sm font-semibold"
                      style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
                    >
                      {loading ? "Creando…" : "Crear caso"}
                    </button>
                  </form>
                </>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
