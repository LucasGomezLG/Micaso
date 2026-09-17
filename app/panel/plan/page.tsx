import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Check, ArrowLeft, MessageSquare, Shield, Clock } from "lucide-react";
import { headers } from "next/headers";
import { getCurrentBroker, getBrokerPayments } from "@/lib/brokers";
import { listCasesForBroker } from "@/lib/cases";
import { formatDate } from "@/lib/format";
import {
  Plan,
  PLAN_CASE_LIMIT,
  PLAN_LABEL,
  SubscriptionStatus,
  SUBSCRIPTION_STATUS_LABEL,
} from "@/lib/types";
import { MicasoMark } from "@/components/MicasoMark";
import ThemeToggle from "@/components/ThemeToggle";
import PanelLogoutButton from "@/components/PanelLogoutButton";
import WhatsappLinkButton from "@/components/WhatsappLinkButton";
import PlanGatewayNotice from "@/components/PlanGatewayNotice";
import SubscribeButton from "@/components/SubscribeButton";
import CancelSubscriptionButton from "@/components/CancelSubscriptionButton";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Tu Plan y Suscripción — Micaso",
  description: "Estado de tu suscripción, días restantes de prueba y cambio de plan en Micaso.",
};

function getPlanDetails(isArg: boolean): Record<
  Plan,
  {
    name: string;
    price: string;
    priceSub: string;
    casesLimit: string;
    description: string;
    features: string[];
    ctaLabel: string;
    highlight?: boolean;
  }
> {
  return {
    para_arrancar: {
      name: "Inicial",
      price: isArg ? "$ 18.000" : "USD 13",
      priceSub: isArg ? "/mes" : "/mes (cobrado en pesos)",
      casesLimit: "Hasta 5 casos activos",
      description: "Para corredores independientes que arrancan a ordenar el seguimiento de sus clientes.",
      ctaLabel: "Elegir plan (5 casos)",
      features: [
        "Hasta 5 casos activos simultáneos",
        "Scraping de ZonaProp, Argenprop y MercadoLibre",
        "Tu foto y nombre de marca en cada caso",
        "Calculadora de crédito y gastos notariales (8,5%)",
        "Checklist de trámites, comparador y notas",
        "Soporte directo por WhatsApp",
      ],
    },
    para_tu_cartera: {
      name: "Profesional",
      price: isArg ? "$ 39.000" : "USD 29",
      priceSub: isArg ? "/mes" : "/mes (cobrado en pesos)",
      casesLimit: "Hasta 20 casos activos",
      description: "Para inmobiliarias y corredores activos que manejan varias familias en paralelo.",
      ctaLabel: "Elegir plan (20 casos)",
      highlight: true,
      features: [
        "Hasta 20 casos activos simultáneos (cuadriplica el cupo)",
        "Todas las funcionalidades incluidas sin restricciones",
        "Historial permanente de casos cerrados en solo lectura",
        "Atención y soporte prioritario por WhatsApp",
        "Ideal si manejás más de 5 clientes a la vez",
      ],
    },
    volumen_alto: {
      name: "A medida",
      price: "A convenir",
      priceSub: "acuerdo a medida",
      casesLimit: "Casos a medida o ilimitados",
      description: "Para inmobiliarias de gran escala con alto flujo continuo de clientes.",
      ctaLabel: "Consultar plan a medida",
      features: [
        "Cupo de casos activos a medida o sin límite fijo",
        "Canal de atención y soporte directo",
        "Facturación y condiciones comerciales a medida",
      ],
    },
  };
}

const STATUS_STYLE: Record<SubscriptionStatus, { bg: string; fg: string }> = {
  prueba: { bg: "var(--status-pendiente-bg)", fg: "var(--status-pendiente)" },
  activa: { bg: "var(--status-gusto-bg)", fg: "var(--status-gusto)" },
  atrasada: { bg: "var(--status-descartada-bg)", fg: "var(--status-descartada)" },
  cancelada: { bg: "var(--status-descartada-bg)", fg: "var(--status-descartada)" },
};

function computeDaysLeft(trialEndsAt: string): number {
  const trialEnd = new Date(trialEndsAt).getTime();
  const diffMs = trialEnd - Date.now();
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

export default async function PanelPlanPage() {
  const broker = await getCurrentBroker();
  if (!broker) {
    redirect("/panel/login");
  }

  const payments = await getBrokerPayments(broker.id);

  // Next.js 16 uses await headers()
  const headersList = await headers();
  const country = headersList.get("x-vercel-ip-country");
  const isArg = country === "AR" || !country; // Default to AR for local dev

  const planDetails = getPlanDetails(isArg);

  const cases = await listCasesForBroker(broker.id);
  const activeCases = cases.filter((c) => c.estado === "activo").length;
  const currentLimit = PLAN_CASE_LIMIT[broker.plan];

  const daysLeft = computeDaysLeft(broker.trialEndsAt);
  const isTrial = broker.subscriptionStatus === "prueba";

  function buildWhatsappMessage(planTarget: string) {
    return `¡Hola! Soy ${broker?.nombreMarca} (${broker?.email}). Estoy usando Micaso y me gustaría consultar por el plan "${planTarget}".`;
  }

  return (
    <div className="min-h-full overflow-x-clip" style={{ background: "var(--paper)", color: "var(--ink)" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-20 border-b backdrop-blur-md"
        style={{ borderColor: "var(--border)", background: "color-mix(in srgb, var(--surface) 88%, transparent)" }}
      >
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3.5 sm:gap-4 sm:px-6">
          <Link href="/panel" className="flex shrink-0 items-center gap-2">
            <span
              className="flex h-7 w-7 items-center justify-center rounded-lg"
              style={{ background: "linear-gradient(135deg, var(--accent), var(--gold))" }}
            >
              <MicasoMark size={16} color="var(--accent-ink)" />
            </span>
            <span className="text-lg font-semibold" style={{ fontFamily: "var(--font-display)" }}>
              Micaso
            </span>
            <span className="eyebrow ml-1 hidden sm:inline">Suscripción</span>
          </Link>

          <div className="flex min-w-0 items-center gap-2 sm:gap-3">
            <Link
              href="/panel"
              className="inline-flex shrink-0 items-center gap-1.5 text-xs font-semibold hover:underline"
              style={{ color: "var(--accent)" }}
            >
              <ArrowLeft size={14} />
              <span className="hidden sm:inline">Volver a mis casos</span>
              <span className="sm:hidden">Volver</span>
            </Link>
            <ThemeToggle />
            <PanelLogoutButton />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold" style={{ fontFamily: "var(--font-display)" }}>
            Tu Plan y Suscripción
          </h1>
          <p className="mt-1 text-sm" style={{ color: "var(--ink-muted)" }}>
            Gestioná el cupo de casos de tu cartera y el estado de tu cuenta en Micaso.
          </p>
        </div>

        {/* Aviso de pasarela en desarrollo (descartable con X) */}
        <PlanGatewayNotice />

        {/* Tarjeta de Estado Actual */}
        <div
          className="mb-10 overflow-hidden rounded-3xl border p-6 sm:p-8"
          style={{
            borderColor: "var(--border)",
            background: "var(--surface)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div className="grid gap-6 sm:grid-cols-3">
            {/* Plan actual */}
            <div className="flex flex-col gap-1 border-b pb-4 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-6" style={{ borderColor: "var(--border)" }}>
              <span className="eyebrow">Plan contratado</span>
              <span className="text-2xl font-bold" style={{ fontFamily: "var(--font-display)" }}>
                {PLAN_LABEL[broker.plan]}
              </span>
              <span className="text-xs" style={{ color: "var(--ink-muted)" }}>
                {planDetails[broker.plan].casesLimit}
              </span>
            </div>

            {/* Estado de suscripción */}
            <div className="flex flex-col gap-1 border-b pb-4 sm:border-b-0 sm:border-r sm:pb-0 sm:pr-6" style={{ borderColor: "var(--border)" }}>
              <span className="eyebrow">Estado de la cuenta</span>
              <div className="flex items-center gap-2">
                <span
                  className="rounded-full px-3 py-1 text-xs font-semibold"
                  style={{
                    background: STATUS_STYLE[broker.subscriptionStatus].bg,
                    color: STATUS_STYLE[broker.subscriptionStatus].fg,
                  }}
                >
                  {SUBSCRIPTION_STATUS_LABEL[broker.subscriptionStatus]}
                </span>
              </div>
              <span className="text-xs" style={{ color: "var(--ink-muted)" }}>
                {isTrial
                  ? `Prueba del ${formatDate(broker.createdAt)} al ${formatDate(broker.trialEndsAt)} (${daysLeft} días restantes)`
                  : "Suscripción mensual activa"}
              </span>
            </div>

            {/* Cupo de casos */}
            <div className="flex flex-col gap-1">
              <span className="eyebrow">Casos en seguimiento</span>
              <span className="mono text-2xl font-bold">
                {activeCases}
                {currentLimit !== null && (
                  <span className="text-base font-normal" style={{ color: "var(--ink-faint)" }}>
                    {" "}
                    / {currentLimit} activos
                  </span>
                )}
              </span>
              <span className="text-xs" style={{ color: "var(--ink-muted)" }}>
                {currentLimit !== null && activeCases >= currentLimit
                  ? "Llegaste al límite de tu plan"
                  : `${cases.length} casos totales creados`}
              </span>
            </div>
          </div>

          {/* Banner de suscripción / prueba */}
          {isTrial ? (
            <div
              className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4"
              style={{
                borderColor: "var(--accent-soft-border)",
                background: "var(--accent-soft)",
              }}
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm" style={{ color: "var(--accent)" }}>
                  <Clock size={18} />
                </span>
                <div>
                  <p className="text-xs sm:text-sm font-semibold" style={{ color: "var(--accent)" }}>
                    Te quedan {daysLeft} días de prueba gratuita sin tarjeta — vence el {formatDate(broker.trialEndsAt)}
                  </p>
                  <p className="text-[11px]" style={{ color: "var(--ink)" }}>
                    Podés probar todas las funciones libremente. Cuando termine, tu panel pasa a modo solo lectura hasta que decidas continuar.
                  </p>
                </div>
              </div>
            </div>
          ) : broker.subscriptionStatus === "activa" ? (
            <div
              className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-4"
              style={{
                borderColor: "var(--border)",
                background: "var(--paper)",
              }}
            >
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white shadow-sm text-green-600">
                  <Check size={18} />
                </span>
                <div>
                  <p className="text-xs sm:text-sm font-semibold text-green-700 dark:text-green-400">
                    Suscripción activa y al día
                  </p>
                  <p className="text-[11px]" style={{ color: "var(--ink-muted)" }}>
                    Tu plan se renueva automáticamente cada mes mediante Mercado Pago.
                  </p>
                </div>
              </div>

              <div className="flex flex-col sm:items-end gap-1">
                <CancelSubscriptionButton />
              </div>
            </div>
          ) : null}
        </div>

        {/* Historial de Pagos */}
        {payments.length > 0 && (
          <div className="mb-12">
            <div className="mb-4">
              <span className="eyebrow">Facturación</span>
              <h2 className="text-xl font-semibold" style={{ fontFamily: "var(--font-display)" }}>
                Historial de Pagos
              </h2>
            </div>
            <div className="overflow-hidden rounded-2xl border" style={{ borderColor: "var(--border)", background: "var(--surface)" }}>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b text-xs" style={{ borderColor: "var(--border)", background: "var(--paper)", color: "var(--ink-muted)" }}>
                    <tr>
                      <th className="px-4 py-3 font-medium">Fecha</th>
                      <th className="px-4 py-3 font-medium">Monto</th>
                      <th className="px-4 py-3 font-medium">Estado</th>
                      <th className="px-4 py-3 font-medium text-right">Comprobante</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y" style={{ borderColor: "var(--border)" }}>
                    {payments.map((p) => (
                      <tr key={p.id}>
                        <td className="px-4 py-3">{formatDate(p.date)}</td>
                        <td className="px-4 py-3 font-medium">
                          {p.currency === "ARS" ? "$ " : "USD "}{p.amount.toLocaleString("es-AR")}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className="inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                            style={{
                              background: p.status === "approved" ? "var(--status-gusto-bg)" : "var(--status-descartada-bg)",
                              color: p.status === "approved" ? "var(--status-gusto)" : "var(--status-descartada)",
                            }}
                          >
                            {p.status === "approved" ? "Aprobado" : p.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <span className="text-xs" style={{ color: "var(--ink-faint)" }}>#{p.id}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Comparativa de Planes */}
        <div className="mb-12">
          <div className="mb-6">
            <span className="eyebrow">Planes disponibles</span>
            <h2 className="text-2xl font-semibold" style={{ fontFamily: "var(--font-display)" }}>
              Elegí el plan que mejor se adapte a tu cartera
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            {(["para_arrancar", "para_tu_cartera", "volumen_alto"] as Plan[]).map((pKey) => {
              const p = planDetails[pKey];
              const isCurrent = broker.plan === pKey;

              return (
                <div
                  key={pKey}
                  className="card-hover relative flex flex-col justify-between rounded-3xl border p-6"
                  style={{
                    borderColor: isCurrent ? "var(--accent)" : p.highlight ? "var(--accent-soft-border)" : "var(--border)",
                    background: p.highlight
                      ? "linear-gradient(160deg, var(--surface), var(--accent-soft))"
                      : "var(--surface)",
                    boxShadow: isCurrent ? "0 0 0 2px var(--accent)" : "var(--shadow-card)",
                  }}
                >
                  {isCurrent && (
                    <span
                      className="absolute -top-3 left-6 rounded-full px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                      style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
                    >
                      Tu plan actual
                    </span>
                  )}

                  <div>
                    <h3 className="text-lg font-semibold">{p.name}</h3>
                    <p className="mt-1 text-xs" style={{ color: "var(--ink-muted)" }}>
                      {p.description}
                    </p>

                    <div className="my-5 border-y py-4" style={{ borderColor: "var(--border)" }}>
                      <span className="mono text-3xl font-bold">{p.price}</span>
                      <span className="ml-1 text-xs" style={{ color: "var(--ink-faint)" }}>
                        {p.priceSub}
                      </span>
                    </div>

                    <ul className="flex flex-col gap-2.5 text-xs">
                      {p.features.map((feat) => (
                        <li key={feat} className="flex items-start gap-2">
                          <Check size={14} className="mt-0.5 shrink-0" style={{ color: "var(--status-gusto)" }} />
                          <span>{feat}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-8">
                    {isCurrent ? (
                      <button
                        type="button"
                        disabled
                        className="btn w-full rounded-full py-2.5 text-center text-xs font-semibold"
                        style={{ background: "var(--border)", color: "var(--ink-muted)" }}
                      >
                        Plan en uso
                      </button>
                    ) : (
                      <div className="flex flex-col gap-2">
                        {pKey === "volumen_alto" ? (
                          <WhatsappLinkButton
                            message={buildWhatsappMessage(p.name)}
                            className="btn w-full rounded-full py-2.5 text-center text-xs font-semibold transition-transform active:scale-95"
                            style={{ border: "1px solid var(--border-strong)", color: "var(--ink)" }}
                          >
                            <MessageSquare size={13} className="inline mr-1" />
                            {p.ctaLabel} vía WhatsApp
                          </WhatsappLinkButton>
                        ) : (
                          <SubscribeButton 
                            plan={pKey as "para_arrancar" | "para_tu_cartera"}
                            label={p.ctaLabel}
                            highlight={p.highlight}
                          />
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Garantías y preguntas sobre cobro */}
        <div
          className="rounded-2xl border p-6 text-xs sm:text-sm"
          style={{ borderColor: "var(--border)", background: "var(--surface)" }}
        >
          <div className="flex items-center gap-2 font-semibold">
            <Shield size={16} style={{ color: "var(--status-gusto)" }} />
            <span>Condiciones de contratación claras y transparentes</span>
          </div>
          <ul className="mt-3 flex flex-col gap-2 text-xs leading-relaxed" style={{ color: "var(--ink-muted)" }}>
            <li>
              <strong>Cancelación sin penalidad:</strong> Podés cancelar en cualquier momento desde tu panel o escribiéndonos. Conservás acceso hasta la fecha de fin del mes ya abonado.
            </li>
            <li>
              <strong>Cobro en pesos argentinos:</strong> La pasarela automática con Mercado Pago está en desarrollo. Durante este período, las altas y renovaciones se acuerdan directamente por WhatsApp al valor de referencia en pesos.
            </li>
            <li>
              <strong>Tus datos nunca se pierden de golpe:</strong> Si interrumpís el pago, tu cuenta pasa a modo solo lectura durante 90 días para que puedas seguir consultando todo lo que cargaste.
            </li>
            <li>
              Consultá el detalle legal completo en nuestros{" "}
              <Link href="/terminos" className="underline hover:text-ink">
                Términos y Condiciones de Servicio
              </Link>.
            </li>
          </ul>
        </div>
      </main>
    </div>
  );
}
