import Link from "next/link";
import { getCurrentBroker } from "@/lib/brokers";
import { listCasesForBroker } from "@/lib/cases";
import CreateCaseModal from "@/components/CreateCaseModal";
import PanelLogoutButton from "@/components/PanelLogoutButton";
import CaseRow from "@/components/CaseRow";

export const dynamic = "force-dynamic";

export default async function PanelPage() {
  const broker = await getCurrentBroker();
  const cases = broker ? await listCasesForBroker(broker.id) : [];
  const activos = cases.filter((c) => c.estado === "activo").length;

  return (
    <div className="min-h-full" style={{ background: "var(--paper)", color: "var(--ink)" }}>
      <header className="border-b" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
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
          <div className="flex items-center gap-3">
            {broker && (
              <span className="flex items-center gap-2 text-sm" style={{ color: "var(--ink-muted)" }}>
                {broker.imagenUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={broker.imagenUrl} alt="" className="h-6 w-6 rounded-full" referrerPolicy="no-referrer" />
                )}
                {broker.nombreMarca}
              </span>
            )}
            <PanelLogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl">Tus casos</h1>
            <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
              {activos} activo{activos === 1 ? "" : "s"} de {cases.length} en total.
            </p>
          </div>
          <CreateCaseModal />
        </div>

        {cases.length === 0 ? (
          <div
            className="mt-10 rounded-2xl border p-10 text-center"
            style={{ borderColor: "var(--border)", background: "var(--surface)" }}
          >
            <p className="text-base">Todavía no tenés ningún caso.</p>
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
