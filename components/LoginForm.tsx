"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { MicasoMark } from "@/components/MicasoMark";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialUser = searchParams.get("u") || "";
  const initialPass = searchParams.get("p") || "";

  const [username, setUsername] = useState(initialUser);
  const [password, setPassword] = useState(initialPass);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [autoLoggingIn, setAutoLoggingIn] = useState(Boolean(initialUser && initialPass));

  async function performLogin(u: string, p: string, isAuto = false) {
    setLoading(true);
    if (isAuto) setAutoLoggingIn(true);
    setError(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: u, password: p }),
      });
      if (res.ok) {
        // router.replace para que los parámetros ?u=...&p=... no queden en el historial del navegador
        router.replace(searchParams.get("next") || "/caso");
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "No se pudo entrar.");
        setAutoLoggingIn(false);
        setLoading(false);
      }
    } catch {
      setError("Error de conexión al intentar ingresar.");
      setAutoLoggingIn(false);
      setLoading(false);
    }
  }

  useEffect(() => {
    if (initialUser && initialPass) {
      performLogin(initialUser, initialPass, true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    performLogin(username, password, false);
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
            className="flex h-7 w-7 items-center justify-center rounded-lg"
            style={{ background: "linear-gradient(135deg, var(--accent), var(--gold))" }}
          >
            <MicasoMark size={16} color="var(--accent-ink)" />
          </span>
          <span className="text-lg font-semibold" style={{ fontFamily: "var(--font-display)" }}>
            Micaso
          </span>
        </Link>
        <p className="mt-4 text-sm" style={{ color: "var(--ink-muted)" }}>
          Acceso a tu caso — entrá con el usuario y la contraseña que te compartió tu corredor.
        </p>

        {autoLoggingIn ? (
          <div className="my-8 flex flex-col items-center justify-center text-center gap-3 py-4">
            <span
              className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
              style={{ borderColor: "var(--accent)", borderTopColor: "transparent" }}
            />
            <div>
              <p className="text-sm font-semibold" style={{ color: "var(--ink)" }}>
                Ingresando a tu caso…
              </p>
              <p className="text-xs mt-0.5" style={{ color: "var(--ink-muted)" }}>
                Acceso directo verificado
              </p>
            </div>
          </div>
        ) : (
          <>
            <label className="mt-5 flex flex-col gap-1 text-sm">
              <span className="eyebrow">Usuario</span>
              <input
                type="text"
                autoFocus={!initialUser}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
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
          </>
        )}

        <div className="mt-4 border-t pt-3 text-center flex flex-col gap-2" style={{ borderColor: "var(--border)" }}>
          <Link
            href="/panel/login"
            className="inline-flex items-center justify-center gap-1.5 text-xs font-semibold"
            style={{ color: "var(--accent)" }}
          >
            ¿Sos corredor inmobiliario? Entrá a tu panel con Google →
          </Link>
          <a
            href="/api/demo-access"
            className="inline-flex items-center justify-center gap-1 text-xs hover:underline"
            style={{ color: "var(--ink-muted)" }}
          >
            ¿Querés probar la app? Ver caso demo interactivo →
          </a>
        </div>

        <p className="mt-4 text-center text-[11px] leading-relaxed" style={{ color: "var(--ink-faint)" }}>
          El uso de tu caso se rige por la{" "}
          <Link href="/privacidad" className="underline underline-offset-2" style={{ color: "var(--ink-muted)" }}>
            Política de privacidad
          </Link>{" "}
          y los{" "}
          <Link href="/terminos" className="underline underline-offset-2" style={{ color: "var(--ink-muted)" }}>
            Términos de servicio
          </Link>.
        </p>
      </form>
    </div>
  );
}
