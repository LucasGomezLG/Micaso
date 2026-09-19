import Link from "next/link";
import { getCurrentAdminEmail, getCurrentBroker } from "@/lib/brokers";
import { listCasesForBroker } from "@/lib/cases";
import { getCaseSummary } from "@/lib/store";
import { PLAN_CASE_LIMIT, PLAN_LABEL } from "@/lib/types";
import CreateCaseModal from "@/components/CreateCaseModal";
import PanelLogoutButton from "@/components/PanelLogoutButton";
import CaseList from "@/components/CaseList";
import PanelDashboard, { AttentionItem } from "@/components/PanelDashboard";
import { MicasoMark } from "@/components/MicasoMark";
import BrokerNameEditor from "@/components/BrokerNameEditor";
import BrokerAvatarEditor from "@/components/BrokerAvatarEditor";
import BrokerProfileModal from "@/components/BrokerProfileModal";
import BrokerOnboarding from "@/components/BrokerOnboarding";
import ThemeToggle from "@/components/ThemeToggle";
import InstallAppButton from "@/components/InstallAppButton";

export const dynamic = "force-dynamic";

// Una visita coordinada dentro de esta ventana aparece en "Necesita tu
// atención" además de en la franja de KPIs — para que no se pase por
// alto una visita de mañana entre el resto de los casos.
const SOON_WINDOW_MS = 48 * 60 * 60 * 1000;

function buildAttentionData(
  activeCases: { id: string; titulo: string }[],
  summaries: Record<string, Awaited<ReturnType<typeof getCaseSummary>>>
) {
  const attentionItems: AttentionItem[] = [];
  let totalPropiedades = 0;
  let nextVisita: { caseId: string; caseTitulo: string; fecha: string } | null = null;
  const now = Date.now();

  for (const kase of activeCases) {
    const summary = summaries[kase.id];
    if (!summary) continue;
    totalPropiedades += summary.totalHouses;
    if (summary.overdueAccion) {
      attentionItems.push({
        caseId: kase.id,
        caseTitulo: kase.titulo,
        kind: "overdue",
        text: summary.overdueAccion.text,
        fecha: summary.overdueAccion.fecha,
      });
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
  return { attentionItems, totalPropiedades, nextVisita };
}

export default async function PanelPage() {
  const [broker, adminEmail] = await Promise.all([getCurrentBroker(), getCurrentAdminEmail()]);
  const { createMagicLinkToken } = await import("@/lib/sessionToken");
  const casesRaw = broker ? await listCasesForBroker(broker.id) : [];
  const cases = casesRaw.map((c) => ({ ...c, magicLinkToken: createMagicLinkToken(c.id) }));
  const activeCases = cases.filter((c) => c.estado === "activo");
  const activos = activeCases.length;

  // Resumen de propiedades por caso (pendientes/destacadas/última
  // actividad) — una lectura por caso, aceptable a la escala actual
  // (tope de 20 casos por plan, ver ARQUITECTURA.md sección 6). Se
  // calcula para todos los casos, no solo los activos, porque también
  // se muestra en la fila de un caso en solo lectura.
  const summaryEntries = await Promise.all(
    cases.map(async (c) => [c.id, await getCaseSummary(c.id, c.brokerLastSeenAt)] as const)
  );
  const summaries = Object.fromEntries(summaryEntries);

  const { attentionItems, totalPropiedades, nextVisita } = buildAttentionData(activeCases, summaries);

  let createCaseDisabledReason: string | undefined = undefined;
  if (broker) {
    if (broker.subscriptionStatus === "atrasada") {
      createCaseDisabledReason = "Suscripción atrasada. Por favor, regularizá tu plan para seguir creando casos.";
    } else if (broker.subscriptionStatus === "cancelada") {
      createCaseDisabledReason = "Tu suscripción fue cancelada. Suscribite a un plan para seguir creando casos.";
    } else if (broker.subscriptionStatus === "prueba" && new Date() > new Date(broker.trialEndsAt)) {
      createCaseDisabledReason = "Tu período de prueba finalizó. Elegí un plan para seguir creando casos.";
    }
  }

  return (
    <div className="min-h-full overflow-x-clip" style={{ background: "var(--paper)", color: "var(--ink)" }}>
      <header
        className="sticky top-0 z-20 border-b backdrop-blur-md"
        style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--surface) 85%, transparent)" }}
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-4 sm:gap-4 sm:px-6">
          <Link href="/" className="flex shrink-0 items-center gap-2">
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
          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            {adminEmail && (
              <Link
                href="/superadmin"
                className="eyebrow shrink-0 rounded-full border px-2 py-0.5 text-[10px] sm:border-0 sm:p-0 sm:text-xs"
                style={{ color: "var(--accent)", borderColor: "var(--accent-soft-border)" }}
              >
                <span className="hidden sm:inline">Super-admin</span>
                <span className="sm:hidden">Admin</span>
              </Link>
            )}
            {broker && (
              <span className="flex min-w-0 items-center gap-1.5 text-sm sm:gap-2" style={{ color: "var(--ink-muted)" }}>
                <span className="hidden items-center gap-1.5 sm:flex sm:gap-2">
                  <BrokerAvatarEditor
                    key={broker.imagenUrl}
                    initialImagenUrl={broker.imagenUrl}
                    nombreMarca={broker.nombreMarca}
                    size={24}
                  />
                  <BrokerNameEditor
                    key={broker.nombreMarca}
                    initialName={broker.nombreMarca}
                    className="inline-flex max-w-[150px] truncate"
                  />
                </span>
                <BrokerProfileModal
                  key={`${broker.imagenUrl}-${broker.nombreMarca}`}
                  initialImagenUrl={broker.imagenUrl}
                  initialName={broker.nombreMarca}
                  className="sm:hidden"
                />
              </span>
            )}
            <InstallAppButton />
            <ThemeToggle />
            <PanelLogoutButton />
          </div>
        </div>
      </header>

      <div aria-hidden className="pointer-events-none relative h-0 overflow-hidden">
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
          {cases.length > 0 && <CreateCaseModal disabledReason={createCaseDisabledReason} />}
        </div>

        {broker && cases.length > 0 && (
          <PanelDashboard
            attentionItems={attentionItems}
            activeCount={activos}
            planLimit={PLAN_CASE_LIMIT[broker.plan]}
            planLabel={PLAN_LABEL[broker.plan]}
            subscriptionStatus={broker.subscriptionStatus}
            trialStartedAt={broker.createdAt}
            trialEndsAt={broker.trialEndsAt}
            totalPropiedades={totalPropiedades}
            nextVisita={nextVisita}
          />
        )}

        {cases.length === 0 ? (
          broker ? (
            <BrokerOnboarding broker={broker} />
          ) : null
        ) : (
          <CaseList
            cases={cases}
            summaries={summaries}
            attentionItems={attentionItems}
          />
        )}

        <footer className="mt-14 border-t pt-6 pb-4" style={{ borderColor: "var(--border)" }}>
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs" style={{ color: "var(--ink-faint)" }}>
            <span>Micaso · Panel de corredor</span>
            <div className="flex items-center gap-4">
              <Link href="/terminos" className="hover:underline" style={{ color: "var(--ink-muted)" }}>
                Términos de servicio
              </Link>
              <Link href="/privacidad" className="hover:underline" style={{ color: "var(--ink-muted)" }}>
                Privacidad
              </Link>
              <Link href="/" className="hover:underline" style={{ color: "var(--ink-muted)" }}>
                Inicio
              </Link>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
