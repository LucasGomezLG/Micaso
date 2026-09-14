import Link from "next/link";
import { DEV_BROKER_ID } from "@/lib/auth";
import { listCasesForBroker } from "@/lib/cases";
import { CaseEstado, TipoCaso } from "@/lib/types";
import CreateCaseModal from "@/components/CreateCaseModal";
import PanelLogoutButton from "@/components/PanelLogoutButton";

export const dynamic = "force-dynamic";

const TIPO_LABEL: Record<TipoCaso, string> = {
  compra: "Compra",
  alquiler: "Alquiler",
  otro: "Otro",
};

const ESTADO_LABEL: Record<CaseEstado, string> = {
  activo: "Activo",
  solo_lectura: "Solo lectura",
  archivado: "Archivado",
};

const ESTADO_COLOR: Record<CaseEstado, { bg: string; fg: string }> = {
  activo: { bg: "var(--status-gusto-bg)", fg: "var(--status-gusto)" },
  solo_lectura: { bg: "var(--status-pendiente-bg)", fg: "var(--status-pendiente)" },
  archivado: { bg: "var(--status-borrada-bg)", fg: "var(--status-borrada)" },
};

export default async function PanelPage() {
  const cases = await listCasesForBroker(DEV_BROKER_ID);
  const activos = cases.filter((c) => c.estado !== "archivado").length;

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
          <PanelLogoutButton />
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
            {cases.map((kase) => {
              const estadoColor = ESTADO_COLOR[kase.estado];
              return (
                <div
                  key={kase.id}
                  className="flex flex-col gap-4 rounded-2xl border p-5 sm:flex-row sm:items-center sm:justify-between"
                  style={{ borderColor: "var(--border)", background: "var(--surface)", boxShadow: "var(--shadow-card)" }}
                >
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-base font-medium" style={{ fontFamily: "var(--font-display)" }}>
                        {kase.titulo}
                      </h2>
                      <span
                        className="rounded-full px-2 py-0.5 text-xs font-medium"
                        style={{ background: "var(--gold-soft)", color: "var(--gold)" }}
                      >
                        {TIPO_LABEL[kase.tipoCaso]}
                      </span>
                      <span
                        className="rounded-full px-2 py-0.5 text-xs font-medium"
                        style={{ background: estadoColor.bg, color: estadoColor.fg }}
                      >
                        {ESTADO_LABEL[kase.estado]}
                      </span>
                    </div>
                    <p className="mt-1 text-xs" style={{ color: "var(--ink-faint)" }}>
                      Creado el {new Date(kase.createdAt).toLocaleDateString("es-AR")}
                    </p>
                  </div>

                  <div
                    className="flex flex-wrap items-center gap-x-5 gap-y-1 rounded-xl border px-4 py-2.5 text-sm"
                    style={{ borderColor: "var(--border)", background: "var(--paper)" }}
                  >
                    <span style={{ color: "var(--ink-muted)" }}>
                      Usuario <span className="mono select-all">{kase.username}</span>
                    </span>
                    <span style={{ color: "var(--ink-muted)" }}>
                      Clave <span className="mono select-all">{kase.password}</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
