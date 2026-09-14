"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    setLoading(false);
    if (res.ok) {
      router.push(searchParams.get("next") || "/caso");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "No se pudo entrar.");
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10" style={{ background: "var(--paper)" }}>
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="bg-dot-grid absolute inset-0" style={{ opacity: 0.6 }} />
        <div
          className="animate-blob absolute -top-32 -left-24 h-[24rem] w-[24rem] rounded-full blur-3xl"
          style={{ background: "var(--accent)", opacity: 0.32 }}
        />
        <div
          className="animate-blob absolute -bottom-32 -right-24 h-[22rem] w-[22rem] rounded-full blur-3xl"
          style={{ background: "var(--gold)", opacity: 0.28, animationDelay: "-6s" }}
        />
      </div>

      <form
        onSubmit={submit}
        className="relative w-full max-w-sm rounded-2xl border p-6"
        style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "0 24px 48px -16px rgba(27, 36, 48, 0.22)" }}
      >
        <Link href="/" className="flex items-center gap-2">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold"
            style={{ background: "linear-gradient(135deg, var(--accent), var(--gold))", color: "var(--accent-ink)" }}
          >
            M
          </span>
          <span className="text-lg font-semibold" style={{ fontFamily: "var(--font-display)" }}>
            Micaso
          </span>
        </Link>
        <p className="mt-4 text-sm" style={{ color: "var(--ink-muted)" }}>
          Acceso a tu caso — entrá con el usuario y la contraseña que te compartió tu corredor.
        </p>
        <label className="mt-5 flex flex-col gap-1 text-sm">
          <span className="eyebrow">Usuario</span>
          <input
            type="text"
            autoFocus
            autoCapitalize="none"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="rounded-lg border px-3 py-2"
            style={{ borderColor: "var(--border)", background: "var(--paper)", color: "var(--ink)" }}
          />
        </label>
        <label className="mt-3 flex flex-col gap-1 text-sm">
          <span className="eyebrow">Contraseña</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="rounded-lg border px-3 py-2"
            style={{ borderColor: "var(--border)", background: "var(--paper)", color: "var(--ink)" }}
          />
        </label>
        {error && (
          <p className="mt-2 text-xs" style={{ color: "var(--status-descartada)" }}>
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={loading || !username || !password}
          className="btn btn-primary mt-4 w-full rounded-full px-4 py-2 text-sm font-semibold"
          style={{ background: "linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 65%, var(--gold)))", color: "var(--accent-ink)" }}
        >
          {loading ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
