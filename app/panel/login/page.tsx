import Link from "next/link";
import { redirect } from "next/navigation";
import { auth, signIn } from "@/auth";
import { MicasoMark } from "@/components/MicasoMark";
import { safeNextPath } from "@/lib/safeNextPath";
import BrokerLoginForm from "./BrokerLoginForm";

export default async function PanelLoginPage(props: PageProps<"/panel/login">) {
  const searchParams = await props.searchParams;
  // Mismo filtro que proxy.ts (SEP23-07): solo rutas de este sitio.
  const next = safeNextPath(typeof searchParams.next === "string" ? searchParams.next : null, "/panel");

  const session = await auth();
  if (session?.user?.email) {
    redirect(next);
  }

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
        <BrokerLoginForm
          signInAction={async () => {
            "use server";
            await signIn("google", { redirectTo: next });
          }}
        />
        <p className="mt-5 text-xs" style={{ color: "var(--ink-faint)" }}>
          ¿Sos cliente de un corredor? <Link href="/login" style={{ color: "var(--accent)" }}>Entrá a tu caso acá →</Link>
        </p>

        {process.env.NODE_ENV !== "production" && (
          <div
            className="mt-6 rounded-xl border p-3.5 text-left"
            style={{
              borderColor: "var(--accent-soft-border)",
              background: "var(--accent-soft)",
            }}
          >
            <p className="eyebrow text-[10px]" style={{ color: "var(--accent)" }}>
              Mock Auth (Solo desarrollo)
            </p>
            <p className="mt-1 text-xs" style={{ color: "var(--ink-muted)" }}>
              Entrá directo sin pasar por Google OAuth:
            </p>
            <div className="mt-3 flex flex-col gap-2">
              <a
                href={`/api/dev-login?role=superadmin&next=${encodeURIComponent(next === "/panel" ? "/superadmin" : next)}`}
                className="btn card-hover flex items-center justify-center rounded-lg py-1.5 text-xs font-semibold"
                style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
              >
                Entrar como Super-admin (Lucas)
              </a>
              <a
                href={`/api/dev-login?role=corredor&next=${encodeURIComponent(next)}`}
                className="btn card-hover flex items-center justify-center rounded-lg border py-1.5 text-xs font-medium"
                style={{ borderColor: "var(--border-strong)", background: "var(--surface)", color: "var(--ink)" }}
              >
                Entrar como Corredor (Carolina)
              </a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
