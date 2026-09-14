import Link from "next/link";
import { getCurrentBroker } from "@/lib/brokers";
import { listCasesForBroker } from "@/lib/cases";
import CreateCaseModal from "@/components/CreateCaseModal";
import PanelLogoutButton from "@/components/PanelLogoutButton";
import CaseRow from "@/components/CaseRow";
import { MicasoMark } from "@/components/MicasoMark";

export const dynamic = "force-dynamic";

export default async function PanelPage() {
  const broker = await getCurrentBroker();
  const cases = broker ? await listCasesForBroker(broker.id) : [];
  const activos = cases.filter((c) => c.estado === "activo").length;

  return (
    <div className="min-h-full" style={{ background: "var(--paper)", color: "var(--ink)" }}>
      <header
        className="sticky top-0 z-20 border-b backdrop-blur-md"
        style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--surface) 85%, transparent)" }}
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
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
          <div className="flex items-center gap-3">
            {broker && (
              <span className="flex items-center gap-2 text-sm" style={{ color: "var(--ink-muted)" }}>
                {broker.imagenUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={broker.imagenUrl} alt="" className="h-6 w-6 rounded-full" referrerPolicy="no-referrer" />
                ) : (
                  <span
                    className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold"
                    style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
                  >
                    {broker.nombreMarca.slice(0, 1).toUpperCase()}
                  </span>
                )}
                {broker.nombreMarca}
              </span>
            )}
            <PanelLogoutButton />
          </div>
        </div>
      </header>

      <div aria-hidden className="pointer-events-none relative h-0 overflow-visible">
        <div
          className="absolute -top-16 left-1/2 h-64 w-[36rem] -translate-x-1/2 rounded-full blur-3xl"
          style={{ background: "var(--accent)", opacity: 0.12 }}
        />
      </div>

      <main className="relative mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl">Tus casos</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
              <span
                className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 font-medium"
                style={{ background: "var(--status-gusto-bg)", color: "var(--status-gusto)" }}
              >
                {activos} activo{activos === 1 ? "" : "s"}
              </span>
              <span style={{ color: "var(--ink-faint)" }}>de {cases.length} en total</span>
            </div>
          </div>
          <CreateCaseModal />
        </div>

        {cases.length === 0 ? (
          <div
            className="relative mt-10 overflow-hidden rounded-2xl border p-10 text-center"
            style={{ borderColor: "var(--border)", background: "var(--surface)" }}
          >
            <div
              aria-hidden
              className="absolute inset-x-0 top-0 h-1.5"
              style={{ background: "linear-gradient(90deg, var(--accent), var(--gold))" }}
            />
            <p className="text-lg" style={{ fontFamily: "var(--font-display)" }}>
              Todavía no tenés ningún caso.
            </p>
            <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
              Creá el primero para tu próximo cliente.
            </p>
          </div>
        ) : (
          <div className="mt-8 flex flex-col gap-3">
            {cases.map((kase) => (
              <CaseRow key={kase.id} initialCase={kase} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
