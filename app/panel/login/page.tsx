import Link from "next/link";
import { signIn } from "@/auth";
import { MicasoMark } from "@/components/MicasoMark";

export default async function PanelLoginPage(props: PageProps<"/panel/login">) {
  const searchParams = await props.searchParams;
  const next = typeof searchParams.next === "string" ? searchParams.next : "/panel";

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-10" style={{ background: "var(--paper)" }}>
      <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="bg-dot-grid absolute inset-0" style={{ opacity: 0.6 }} />
        <div
          className="animate-blob absolute -top-32 -right-24 h-[24rem] w-[24rem] rounded-full blur-3xl"
          style={{ background: "var(--accent)", opacity: 0.32 }}
        />
        <div
          className="animate-blob absolute -bottom-32 -left-24 h-[22rem] w-[22rem] rounded-full blur-3xl"
          style={{ background: "var(--gold)", opacity: 0.28, animationDelay: "-6s" }}
        />
      </div>

      <div
        className="relative w-full max-w-sm rounded-2xl border p-6 text-center"
        style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "0 24px 48px -16px rgba(27, 36, 48, 0.22)" }}
      >
        <Link href="/" className="flex items-center justify-center gap-2">
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
        <p className="mt-4 text-lg" style={{ fontFamily: "var(--font-display)" }}>
          Panel de corredor
        </p>
        <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
          Entrá con tu cuenta de Google para ver y crear tus casos.
        </p>
        <form
          className="mt-6"
          action={async () => {
            "use server";
            await signIn("google", { redirectTo: next });
          }}
        >
          <button
            type="submit"
            className="btn card-hover flex w-full items-center justify-center gap-2.5 rounded-full border px-4 py-2.5 text-sm font-semibold"
            style={{ background: "var(--surface)", borderColor: "var(--border-strong)", color: "var(--ink)" }}
          >
            <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden>
              <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.8 2.72v2.26h2.9c1.7-1.56 2.68-3.86 2.68-6.62z" />
              <path fill="#34A853" d="M9 18c2.43 0 4.47-.8 5.96-2.18l-2.9-2.26c-.8.54-1.84.86-3.06.86-2.35 0-4.34-1.59-5.05-3.72H.96v2.33A9 9 0 0 0 9 18z" />
              <path fill="#FBBC05" d="M3.95 10.7A5.4 5.4 0 0 1 3.67 9c0-.59.1-1.17.28-1.7V4.97H.96A9 9 0 0 0 0 9c0 1.45.35 2.83.96 4.03l2.99-2.33z" />
              <path fill="#EA4335" d="M9 3.58c1.32 0 2.51.46 3.44 1.35l2.58-2.58C13.46.89 11.43 0 9 0A9 9 0 0 0 .96 4.97l2.99 2.33C4.66 5.17 6.65 3.58 9 3.58z" />
            </svg>
            Continuar con Google
          </button>
        </form>
        <p className="mt-5 text-xs" style={{ color: "var(--ink-faint)" }}>
          ¿Sos cliente de un corredor? <Link href="/login" style={{ color: "var(--accent)" }}>Entrá a tu caso acá →</Link>
        </p>
      </div>
    </div>
  );
}
