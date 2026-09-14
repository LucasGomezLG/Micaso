import Link from "next/link";
import { getCurrentAdminEmail, getCurrentBroker } from "@/lib/brokers";
import { listCasesForBroker } from "@/lib/cases";
import { getCaseSummary } from "@/lib/store";
import { PLAN_CASE_LIMIT, PLAN_LABEL } from "@/lib/types";
import CreateCaseModal from "@/components/CreateCaseModal";
import PanelLogoutButton from "@/components/PanelLogoutButton";
import CaseRow from "@/components/CaseRow";
import PanelDashboard, { AttentionItem } from "@/components/PanelDashboard";
import { MicasoMark } from "@/components/MicasoMark";
import BrokerNameEditor from "@/components/BrokerNameEditor";

export const dynamic = "force-dynamic";

// Una visita coordinada dentro de esta ventana aparece en "Necesita tu
// atención" además de en la franja de KPIs — para que no se pase por
// alto una visita de mañana entre el resto de los casos.
const SOON_WINDOW_MS = 48 * 60 * 60 * 1000;

export default async function PanelPage() {
  const [broker, adminEmail] = await Promise.all([getCurrentBroker(), getCurrentAdminEmail()]);
  const cases = broker ? await listCasesForBroker(broker.id) : [];
  const activeCases = cases.filter((c) => c.estado === "activo");
  const activos = activeCases.length;

  // Resumen de propiedades por caso (pendientes/destacadas/última
  // actividad) — una lectura por caso, aceptable a la escala actual
  // (tope de 20 casos por plan, ver ARQUITECTURA.md sección 6). Se
  // calcula para todos los casos, no solo los activos, porque también
  // se muestra en la fila de un caso en solo lectura.
  const summaryEntries = await Promise.all(cases.map(async (c) => [c.id, await getCaseSummary(c.id)] as const));
  const summaries = Object.fromEntries(summaryEntries);

  const attentionItems: AttentionItem[] = [];
  let totalPropiedades = 0;
  let nextVisita: { caseId: string; caseTitulo: string; fecha: string } | null = null;
  const now = Date.now();

  for (const kase of activeCases) {
    const summary = summaries[kase.id];
    totalPropiedades += summary.totalHouses;
    if (summary.overdueAccion) {
      attentionItems.push({ caseId: kase.id, caseTitulo: kase.titulo, kind: "overdue", text: summary.overdueAccion.text, fecha: summary.overdueAccion.fecha });
    }
    if (summary.nextVisita) {
      if (!nextVisita || summary.nextVisita < nextVisita.fecha) {
        nextVisita = { caseId: kase.id, caseTitulo: kase.titulo, fecha: summary.nextVisita };
      }
      if (new Date(summary.nextVisita).getTime() - now <= SOON_WINDOW_MS) {
        attentionItems.push({ caseId: kase.id, caseTitulo: kase.titulo, kind: "soon", fecha: summary.nextVisita });
      }
    }
  }
  attentionItems.sort((a, b) => (a.kind === b.kind ? (a.fecha < b.fecha ? -1 : 1) : a.kind === "overdue" ? -1 : 1));

  function alertFor(caseId: string): "overdue" | "soon" | null {
    const hit = attentionItems.find((item) => item.caseId === caseId);
    return hit?.kind ?? null;
  }

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
            {adminEmail && (
              <Link href="/superadmin" className="eyebrow" style={{ color: "var(--accent)" }}>
                Super-admin
              </Link>
            )}
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
                <BrokerNameEditor key={broker.nombreMarca} initialName={broker.nombreMarca} />
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

        {broker && cases.length > 0 && (
          <PanelDashboard
            attentionItems={attentionItems}
            activeCount={activos}
            planLimit={PLAN_CASE_LIMIT[broker.plan]}
            planLabel={PLAN_LABEL[broker.plan]}
            totalPropiedades={totalPropiedades}
            nextVisita={nextVisita}
          />
        )}

        {cases.length === 0 ? (
          <div
            className="relative mt-10 overflow-hidden rounded-2xl border p-8 sm:p-10"
            style={{ borderColor: "var(--border)", background: "var(--surface)", boxShadow: "var(--shadow-card)" }}
          >
            <div
              aria-hidden
              className="absolute inset-x-0 top-0 h-1.5"
              style={{ background: "linear-gradient(90deg, var(--accent), var(--gold))" }}
            />
            <p className="eyebrow mb-2">Bienvenido</p>
            <h2 className="text-2xl" style={{ fontFamily: "var(--font-display)" }}>
              ¡Arrancamos{broker ? `, ${broker.nombreMarca}` : ""}!
            </h2>
            <p className="mt-2 max-w-lg text-sm" style={{ color: "var(--ink-muted)" }}>
              Un caso es la búsqueda de un cliente tuyo: le compartís un link
              con usuario y contraseña, y ahí ve presupuesto, propiedades,
              visitas y checklist — todo junto, con tu marca, no la de
              Micaso.
            </p>

            {broker && (
              <div
                className="mt-6 flex flex-col gap-2 rounded-xl border px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-3"
                style={{ borderColor: "var(--border)", background: "var(--paper)" }}
              >
                <span className="text-sm" style={{ color: "var(--ink-muted)" }}>
                  Así te va a ver cada familia:
                </span>
                <BrokerNameEditor
                  key={broker.nombreMarca}
                  initialName={broker.nombreMarca}
                  className="text-sm font-semibold"
                  style={{ color: "var(--accent)" }}
                />
              </div>
            )}

            <div className="mt-6">
              <CreateCaseModal label="Crear tu primer caso" />
            </div>
          </div>
        ) : (
          <div className="mt-8 flex flex-col gap-3">
            {cases.map((kase) => (
              <CaseRow key={kase.id} initialCase={kase} summary={summaries[kase.id]} alert={alertFor(kase.id)} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
