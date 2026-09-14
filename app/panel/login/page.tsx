"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

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
    const res = await fetch("/api/panel/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    setLoading(false);
    if (res.ok) {
      router.push(searchParams.get("next") || "/panel");
      router.refresh();
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "No se pudo entrar.");
    }
  }

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <form
        onSubmit={submit}
        className="w-full max-w-sm rounded-2xl border p-6"
        style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-card)" }}
      >
        <Link href="/" className="flex items-center gap-2">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold"
            style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
          >
            M
          </span>
          <span className="text-lg font-semibold" style={{ fontFamily: "var(--font-display)" }}>
            Micaso
          </span>
        </Link>
        <p className="mt-4 text-sm" style={{ color: "var(--ink-muted)" }}>
          Panel de corredor — entrá con tu usuario y contraseña.
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
          style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
        >
          {loading ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}

export default function PanelLoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
