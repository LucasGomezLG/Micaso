import Link from "next/link";
import { daysAgoLabel, formatDate, formatDateTime } from "@/lib/format";
import { SubscriptionStatus } from "@/lib/types";

export interface AttentionItem {
  caseId: string;
  caseTitulo: string;
  kind: "overdue" | "soon";
  /** Solo para "overdue" — el texto de la próxima acción vencida. */
  text?: string;
  fecha: string;
}

export default function PanelDashboard({
  attentionItems,
  activeCount,
  planLimit,
  planLabel,
  subscriptionStatus,
  trialStartedAt,
  trialEndsAt,
  totalPropiedades,
  nextVisita,
}: {
  attentionItems: AttentionItem[];
  activeCount: number;
  planLimit: number | null;
  planLabel: string;
  subscriptionStatus: SubscriptionStatus;
  /** Cuándo arrancó la prueba de 14 días — hoy es siempre `broker.createdAt`
   * (no hay pago que reinicie el conteo todavía), pasado aparte para no
   * acoplar este componente de presentación al tipo Broker completo. */
  trialStartedAt: string;
  trialEndsAt: string;
  totalPropiedades: number;
  nextVisita: { caseId: string; caseTitulo: string; fecha: string } | null;
}) {
  // A propósito NO se oculta con activeCount === 0 (como antes) — ese es
  // exactamente el estado de un corredor al que se le vencieron todos los
  // casos por falta de pago, y esta es la única tarjeta de todo el panel
  // del corredor con un link a /panel/plan. Ocultar el bloque entero acá
  // le tapaba al corredor el único camino visible para reactivar su
  // suscripción justo cuando más lo necesitaba.
  const isTrial = subscriptionStatus === "prueba";

  return (
    <div className="mt-6 flex flex-col gap-4">
      {attentionItems.length > 0 && (
        <div
          className="flex flex-col gap-2.5 rounded-2xl border p-4"
          style={{
            borderColor: "var(--status-descartada-bg)",
            background: "color-mix(in srgb, var(--status-descartada-bg) 55%, var(--surface))",
          }}
        >
          <div className="flex items-center gap-2">
            <span aria-hidden className="h-2 w-2 shrink-0 rounded-full" style={{ background: "var(--status-descartada)" }} />
            <span className="text-sm font-semibold" style={{ color: "var(--status-descartada)" }}>
              Necesita tu atención
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            {attentionItems.map((item) => (
              <a
                key={`${item.caseId}-${item.kind}`}
                href={`#case-${item.caseId}`}
                className="card-hover flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3.5 py-2.5 text-sm"
                style={{ borderColor: "var(--border)", background: "var(--surface)" }}
              >
                <span className="min-w-0 break-words">
                  <span className="font-semibold">{item.caseTitulo}</span>{" "}
                  <span style={{ color: "var(--ink-muted)" }}>
                    {item.kind === "overdue"
                      ? `— "${item.text}" venció ${daysAgoLabel(item.fecha)}`
                      : `— visita coordinada ${formatDateTime(item.fecha)}`}
                  </span>
                </span>
                <span
                  className="shrink-0 rounded-full px-2.5 py-1 text-xs font-medium"
                  style={{
                    background: item.kind === "overdue" ? "var(--status-descartada-bg)" : "var(--status-coordinada-bg)",
                    color: item.kind === "overdue" ? "var(--status-descartada)" : "var(--status-coordinada)",
                  }}
                >
                  {item.kind === "overdue" ? "Vencida" : "Próxima"}
                </span>
              </a>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Link
          href="/panel/plan"
          className="card-hover flex flex-col justify-between gap-2 rounded-2xl border p-4 transition-all"
          style={{ borderColor: "var(--border)", background: "var(--surface)", boxShadow: "var(--shadow-card)" }}
        >
          <div className="flex flex-col gap-1">
            <span className="eyebrow">Casos activos</span>
            <span className="mono text-2xl font-semibold">
              {activeCount}
              {planLimit !== null && <span style={{ color: "var(--ink-faint)", fontSize: "0.75em" }}> / {planLimit}</span>}
            </span>
          </div>
          <div className="flex flex-col gap-1">
            <span className="text-xs" style={{ color: "var(--ink-faint)" }}>
              Plan {planLabel}
              {isTrial && ` · prueba del ${formatDate(trialStartedAt)} al ${formatDate(trialEndsAt)}`}
            </span>
            <span className="inline-flex items-center gap-1 text-xs font-semibold" style={{ color: "var(--accent)" }}>
              Gestionar plan →
            </span>
          </div>
        </Link>

        <div
          className="flex flex-col gap-1 rounded-2xl border p-4"
          style={{ borderColor: "var(--border)", background: "var(--surface)", boxShadow: "var(--shadow-card)" }}
        >
          <span className="eyebrow">Propiedades en seguimiento</span>
          <span className="mono text-2xl font-semibold">{totalPropiedades}</span>
          <span className="text-xs" style={{ color: "var(--ink-faint)" }}>
            en tus casos activos
          </span>
        </div>

        <a
          href={nextVisita ? `#case-${nextVisita.caseId}` : undefined}
          className="card-hover flex flex-col gap-1 rounded-2xl border p-4"
          style={{ borderColor: "var(--border)", background: "var(--surface)", boxShadow: "var(--shadow-card)" }}
        >
          <span className="eyebrow">Próxima visita</span>
          {nextVisita ? (
            <>
              <span className="text-base font-semibold" style={{ fontFamily: "var(--font-display)" }}>
                {formatDateTime(nextVisita.fecha)}
              </span>
              <span className="text-xs" style={{ color: "var(--ink-faint)" }}>
                {nextVisita.caseTitulo}
              </span>
            </>
          ) : (
            <span className="mt-1 text-sm" style={{ color: "var(--ink-faint)" }}>
              Sin visitas coordinadas
            </span>
          )}
        </a>
      </div>
    </div>
  );
}
