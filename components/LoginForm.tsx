"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { MicasoMark } from "@/components/MicasoMark";

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialUser = searchParams.get("u") || "";
  const initialPass = searchParams.get("p") || "";
  const initialToken = searchParams.get("t") || "";
  const [magicToken, setMagicToken] = useState(initialToken);

  const [username, setUsername] = useState(initialUser);
  const [password, setPassword] = useState(initialPass);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  async function performLogin() {
    if (!acceptedTerms) {
      setError("Tenés que aceptar los Términos y la Política de privacidad para continuar.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const payload = magicToken ? { token: magicToken } : { username, password };
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        // router.replace para que los parámetros no queden en el historial del navegador
        router.replace(searchParams.get("next") || "/caso");
        router.refresh();
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "No se pudo entrar.");
        setMagicToken(""); // Limpiamos el token fallido para permitir login manual
        setLoading(false);
      }
    } catch {
      setError("Error de conexión al intentar ingresar.");
      setLoading(false);
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    performLogin();
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

        {magicToken ? (
          <div
            className="mt-4 rounded-xl border p-3 text-xs leading-relaxed"
            style={{
              borderColor: "var(--accent-soft-border)",
              background: "var(--accent-soft)",
              color: "var(--ink)",
            }}
          >
            👋 <strong>¡Hola!</strong> Tu corredor te compartió este acceso seguro. Marcá la casilla para aceptar los términos e ingresar a tu caso.
          </div>
        ) : (
          <>
            {error && initialToken && (
               <div className="mb-4 text-xs font-medium" style={{ color: "var(--status-descartada)" }}>
                 El link seguro expiró o es inválido. Por favor ingresá las credenciales manualmente o pedile a tu corredor un nuevo link.
               </div>
            )}
            {initialUser && initialPass && !initialToken && (
              <div
                className="mt-4 rounded-xl border p-3 text-xs leading-relaxed"
                style={{
                  borderColor: "var(--accent-soft-border)",
                  background: "var(--accent-soft)",
                  color: "var(--ink)",
                }}
              >
                👋 <strong>¡Hola!</strong> Tu corredor ya configuró tu acceso directo. Marcá la casilla para aceptar los términos e ingresar a tu caso.
              </div>
            )}

            <label className="mt-5 flex flex-col gap-1 text-sm">
              <span className="eyebrow">Usuario</span>
              <input
                type="text"
                autoFocus={!initialUser}
                autoCapitalize="none"
                autoCorrect="off"
                spellCheck={false}
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="rounded-lg border px-3 py-2"
                style={{ borderColor: "var(--border)", background: "var(--paper)", color: "var(--ink)" }}
              />
            </label>
            <label className="mt-3 flex flex-col gap-1 text-sm">
              <span className="eyebrow">Contraseña</span>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  className="w-full rounded-lg border px-3 py-2 pr-10"
                  style={{ borderColor: "var(--border)", background: "var(--paper)", color: "var(--ink)" }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                  title={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[var(--ink-faint)] hover:text-[var(--ink)] transition-colors"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </label>
          </>
        )}
        {error && (
          <p className="mt-2 text-xs" style={{ color: "var(--status-descartada)" }}>
            {error}
          </p>
        )}

        <label className="mt-4 flex items-start gap-2.5 text-xs cursor-pointer select-none">
          <input
            type="checkbox"
            required
            checked={acceptedTerms}
            onChange={(e) => setAcceptedTerms(e.target.checked)}
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
          disabled={loading || (!magicToken && (!username || !password)) || !acceptedTerms}
          className="btn btn-primary mt-4 w-full rounded-full px-4 py-2.5 text-sm font-semibold transition-opacity disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
          style={{ background: "linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 65%, var(--gold)))", color: "var(--accent-ink)" }}
        >
          {loading ? "Entrando…" : "Entrar a mi caso"}
        </button>

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
      </form>
    </div>
  );
}
