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
import BrokerOnboarding from "@/components/BrokerOnboarding";
import ThemeToggle from "@/components/ThemeToggle";

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
  const cases = broker ? await listCasesForBroker(broker.id) : [];
  const activeCases = cases.filter((c) => c.estado === "activo");
  const inactiveCases = cases.filter((c) => c.estado !== "activo");
  const activos = activeCases.length;

  // Resumen de propiedades por caso (pendientes/destacadas/última
  // actividad) — una lectura por caso, aceptable a la escala actual
  // (tope de 20 casos por plan, ver ARQUITECTURA.md sección 6). Se
  // calcula para todos los casos, no solo los activos, porque también
  // se muestra en la fila de un caso en solo lectura.
  const summaryEntries = await Promise.all(cases.map(async (c) => [c.id, await getCaseSummary(c.id)] as const));
  const summaries = Object.fromEntries(summaryEntries);

  const { attentionItems, totalPropiedades, nextVisita } = buildAttentionData(activeCases, summaries);

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
                <BrokerAvatarEditor
                  key={broker.imagenUrl}
                  initialImagenUrl={broker.imagenUrl}
                  nombreMarca={broker.nombreMarca}
                  size={24}
                />
                <BrokerNameEditor key={broker.nombreMarca} initialName={broker.nombreMarca} />
              </span>
            )}
            <ThemeToggle />
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
          {cases.length > 0 && <CreateCaseModal />}
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
