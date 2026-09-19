"use client";

import { useState } from "react";
import Link from "next/link";

interface BrokerLoginFormProps {
  signInAction: () => Promise<void>;
}

export default function BrokerLoginForm({ signInAction }: BrokerLoginFormProps) {
  const [accepted, setAccepted] = useState(false);
  const [loading, setLoading] = useState(false);

  return (
    <form
      className="mt-6 flex flex-col gap-4 text-left"
      action={async () => {
        if (!accepted) return;
        setLoading(true);
        await signInAction();
      }}
    >
      <label className="flex items-start gap-2.5 text-xs cursor-pointer select-none">
        <input
          type="checkbox"
          required
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 rounded border-[var(--border)] accent-[var(--accent)] cursor-pointer"
        />
        <span style={{ color: "var(--ink-muted)" }} className="leading-snug">
          He leído y acepto los{" "}
          <Link href="/terminos" target="_blank" className="underline underline-offset-2 hover:text-[var(--ink)]" style={{ color: "var(--ink)" }}>
            Términos de servicio
          </Link>{" "}
          y la{" "}
          <Link href="/privacidad" target="_blank" className="underline underline-offset-2 hover:text-[var(--ink)]" style={{ color: "var(--ink)" }}>
            Política de privacidad
          </Link>.
        </span>
      </label>

      <button
        type="submit"
        disabled={!accepted || loading}
        className="btn card-hover flex w-full items-center justify-center gap-2.5 rounded-full border px-4 py-2.5 text-sm font-semibold transition-opacity disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
        style={{ background: "var(--surface)", borderColor: "var(--border-strong)", color: "var(--ink)" }}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
          <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.56 2.68-3.86 2.68-6.62z" />
          <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18z" />
          <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.03l2.99-2.33z" />
          <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.97l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58z" />
        </svg>
        {loading ? "Conectando con Google…" : "Continuar con Google"}
      </button>
    </form>
  );
}
