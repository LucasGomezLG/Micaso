import Link from "next/link";
import { signIn } from "@/auth";

export default async function PanelLoginPage(props: PageProps<"/panel/login">) {
  const searchParams = await props.searchParams;
  const next = typeof searchParams.next === "string" ? searchParams.next : "/panel";

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4">
      <div
        className="w-full max-w-sm rounded-2xl border p-6 text-center"
        style={{ background: "var(--surface)", borderColor: "var(--border)", boxShadow: "var(--shadow-card)" }}
      >
        <Link href="/" className="flex items-center justify-center gap-2">
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
          Panel de corredor — entrá con tu cuenta de Google.
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
            className="btn btn-primary flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold"
            style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
          >
            Continuar con Google
          </button>
        </form>
      </div>
    </div>
  );
}
