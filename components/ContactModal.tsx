"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";

const CONTACT_EMAIL = "luccaass96@gmail.com";

export default function ContactModal({
  label = "Escribinos",
  className,
  style,
}: {
  label?: string;
  className?: string;
  style?: CSSProperties;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const subject = `Consulta sobre Micaso — ${name}`;
    const body = `${message}\n\n— ${name}${email ? ` (${email})` : ""}`;
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    setOpen(false);
    setName("");
    setEmail("");
    setMessage("");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={className ?? "text-sm font-medium underline-offset-2 hover:underline"}
        style={style ?? { color: "var(--accent)" }}
      >
        {label}
      </button>

      {open && mounted &&
        createPortal(
          <div
            className="animate-overlay fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto overscroll-contain"
            style={{ background: "rgba(18, 24, 31, 0.65)", backdropFilter: "blur(2px)" }}
            onClick={() => setOpen(false)}
          >
            <div
              className="animate-modal-pop my-auto w-full max-w-sm rounded-2xl border p-6 max-h-[90dvh] overflow-y-auto"
              style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-card)" }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between">
                <h3 className="text-lg">Escribinos</h3>
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
                Te abrimos tu mail con esto ya redactado, directo a nuestra
                bandeja — no hay ningún formulario oculto ni base de datos de
                por medio.
              </p>
              <form onSubmit={submit} className="mt-4 flex flex-col gap-3">
                <label className="flex flex-col gap-1 text-sm">
                  <span className="eyebrow">Nombre</span>
                  <input
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="rounded-lg border px-3 py-2"
                    style={{ borderColor: "var(--border)", background: "var(--paper)", color: "var(--ink)" }}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="eyebrow">Tu mail</span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="rounded-lg border px-3 py-2"
                    style={{ borderColor: "var(--border)", background: "var(--paper)", color: "var(--ink)" }}
                  />
                </label>
                <label className="flex flex-col gap-1 text-sm">
                  <span className="eyebrow">Mensaje</span>
                  <textarea
                    required
                    rows={4}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    className="rounded-lg border px-3 py-2"
                    style={{ borderColor: "var(--border)", background: "var(--paper)", color: "var(--ink)" }}
                  />
                </label>
                <button
                  type="submit"
                  className="btn btn-primary mt-1 rounded-full px-5 py-2.5 text-sm font-semibold"
                  style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
                >
                  Abrir mi mail para enviarlo
                </button>
              </form>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
