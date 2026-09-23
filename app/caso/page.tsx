import Link from "next/link";
import { Check, ExternalLink, Pin } from "lucide-react";
import { getCriteria, getHouses, countByStatus } from "@/lib/store";
import { getCaseId } from "@/lib/session";
import { getCase } from "@/lib/cases";
import { daysUntil, formatArs, formatDate, formatUsd, isOverdue, todayAr } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";
import CriteriaEditor from "@/components/CriteriaEditor";
import BriefEditor from "@/components/BriefEditor";
import PeopleEditor from "@/components/PeopleEditor";
import VisitaCoordinadaBadge from "@/components/VisitaCoordinadaBadge";
import HouseQuickView from "@/components/HouseQuickView";
import EmptyState from "@/components/EmptyState";
import PushNotificationPrompt from "@/components/PushNotificationPrompt";
import { House, HouseStatus, TipoCaso } from "@/lib/types";

export const dynamic = "force-dynamic";

const INTRO: Record<TipoCaso, string> = {
  compra: "Todo el crédito y la búsqueda de casa en un solo lugar: qué buscamos, qué propiedades vimos y qué falta para llegar a la escritura.",
  alquiler: "Toda la búsqueda de alquiler en un solo lugar: qué buscamos, qué propiedades vimos y qué falta para llegar a las llaves en mano.",
  otro: "Toda la búsqueda en un solo lugar: qué buscamos, qué propiedades vimos y qué falta para cerrar la operación.",
};

const STAT_TILES: { status: HouseStatus; label: string }[] = [
  { status: "pendiente", label: "Por revisar" },
  { status: "duda_visitar", label: "En duda" },
  { status: "a_coordinar", label: "A coordinar" },
  { status: "coordinada", label: "Visita agendada" },
  { status: "gusto", label: "Nos gustó" },
  { status: "no_gusto", label: "No convenció" },
  { status: "oferta", label: "En oferta" },
  { status: "comprada", label: "Comprada 🎉" },
  { status: "descartada", label: "Descartadas" },
];

/** Una visitaFecha ya pasada no es "próxima" — se excluye de este panel
 * (a diferencia de proximaAccionFecha vencida, que sigue siendo un
 * pendiente real y por eso se muestra en rojo en vez de ocultarse). */
function hasUpcomingVisit(house: House, today: string): boolean {
  return !!house.visitaFecha && house.visitaFecha.slice(0, 10) >= today;
}

function upcomingSortKey(house: House, today: string): string {
  const dates = [hasUpcomingVisit(house, today) ? house.visitaFecha : null, house.proximaAccionFecha].filter(
    (d): d is string => !!d
  );
  return dates.sort()[0] ?? "";
}

export default async function HomePage() {
  const caseId = await getCaseId();
  const [criteria, allHouses, kase] = await Promise.all([getCriteria(caseId), getHouses(caseId), getCase(caseId)]);
  const people = kase?.people ?? [];
  const tipoCaso = kase?.tipoCaso ?? "compra";
  const { loan, brief } = criteria;
  const houses = allHouses.filter((h) => h.status !== "borrada");
  const counts = countByStatus(houses);
  const recent = [...houses]
    .sort((a, b) => (a.addedAt < b.addedAt ? 1 : -1))
    .slice(0, 5);
  const remainingDays = daysUntil(loan.moveOutDeadline);
  const today = todayAr();
  const upcoming = houses
    .filter((h) => hasUpcomingVisit(h, today) || h.proximaAccionFecha)
    .sort((a, b) => {
      const keyA = upcomingSortKey(a, today);
      const keyB = upcomingSortKey(b, today);
      return keyA < keyB ? -1 : keyA > keyB ? 1 : 0;
    });

  return (
    <div className="flex flex-col gap-10">
      <section>
        <p className="eyebrow mb-2">Búsqueda activa</p>
        <h1 className="text-3xl sm:text-4xl">{kase?.titulo ?? "Tu búsqueda"}</h1>
        <p className="mt-2 max-w-2xl" style={{ color: "var(--ink-muted)" }}>
          {INTRO[tipoCaso]}
          {remainingDays > 0 && (
            <>
              {" "}
              Quedan{" "}
              <strong className="mono" style={{ color: "var(--ink)" }}>
                {remainingDays} días
              </strong>{" "}
              para tener que dejar el lugar actual.
            </>
          )}
        </p>
        <div className="mt-3">
          <p className="eyebrow mb-1.5">Buscan</p>
          <PeopleEditor initialPeople={people} />
        </div>
      </section>

      {caseId !== "demo" && <PushNotificationPrompt />}

      {upcoming.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg">Próximas visitas y acciones</h2>
          <div className="flex flex-col gap-2">
            {upcoming.map((house) => {
              const vencida = house.proximaAccionFecha ? isOverdue(house.proximaAccionFecha) : false;
              return (
                <div
                  key={house.id}
                  className="flex flex-col gap-2 rounded-xl border px-4 py-3 transition-colors hover:border-[var(--border-strong)] sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
                  style={{ background: "var(--surface)", borderColor: "var(--border)" }}
                >
                  <HouseQuickView
                    house={house}
                    loan={loan}
                    people={people}
                    className="flex min-w-0 flex-col gap-2 text-left sm:flex-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{house.title}</p>
                      <p className="truncate text-xs" style={{ color: "var(--ink-faint)" }}>
                        {house.address ?? house.zone ?? house.source}
                      </p>
                    </div>
                    {house.proximaAccion && (
                      <span
                        className="inline-flex w-fit items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-medium"
                        style={{
                          background: vencida ? "var(--status-descartada-bg)" : "var(--status-pendiente-bg)",
                          color: vencida ? "var(--status-descartada)" : "var(--status-pendiente)",
                        }}
                      >
                        <Pin size={13} /> {house.proximaAccion}
                        {house.proximaAccionFecha && (
                          <> · {vencida ? "venció" : "vence"} {formatDate(house.proximaAccionFecha)}</>
                        )}
                      </span>
                    )}
                  </HouseQuickView>
                  {hasUpcomingVisit(house, today) && (
                    <VisitaCoordinadaBadge house={house} label="Visita: " linkToAgenda />
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className={tipoCaso === "compra" ? "grid gap-4 sm:grid-cols-2" : "grid gap-4"}>
        <div
          className="rounded-2xl border p-5"
          style={{
            background: "var(--surface)",
            borderColor: "var(--border)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg">Lo que buscamos</h2>
            <BriefEditor brief={brief} />
          </div>
          <dl className="mt-4 flex flex-col gap-4 text-sm">
            {tipoCaso === "compra" && (
              <div>
                <dt className="eyebrow mb-1.5">Capital</dt>
                <dd style={{ color: "var(--ink-muted)" }}>
                  {loan.hasCredit ? (
                    <>
                      Hasta{" "}
                      <strong className="mono" style={{ color: "var(--ink)" }}>
                        {formatUsd(loan.bankMaxUsd)}
                      </strong>{" "}
                      de crédito, más{" "}
                      <strong className="mono" style={{ color: "var(--ink)" }}>
                        {formatUsd(loan.ownFundsMinUsd)}–{formatUsd(loan.ownFundsMaxUsd)}
                      </strong>{" "}
                      propios (incluye gastos administrativos).
                    </>
                  ) : (
                    <>
                      Al contado, con{" "}
                      <strong className="mono" style={{ color: "var(--ink)" }}>
                        {formatUsd(loan.ownFundsMinUsd)}–{formatUsd(loan.ownFundsMaxUsd)}
                      </strong>{" "}
                      disponibles (incluye gastos administrativos).
                    </>
                  )}
                </dd>
              </div>
            )}
            {brief.mustHave.length > 0 && (
              <div>
                <dt className="eyebrow mb-1.5">Imprescindible</dt>
                <dd>
                  <ul className="flex flex-col gap-1">
                    {brief.mustHave.map((item, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check size={15} className="mt-0.5 shrink-0" style={{ color: "var(--status-gusto)" }} />
                        <span style={{ color: "var(--ink-muted)" }}>{item}</span>
                      </li>
                    ))}
                  </ul>
                </dd>
              </div>
            )}
            {brief.flexible.length > 0 && (
              <div>
                <dt className="eyebrow mb-1.5">Puede variar</dt>
                <dd style={{ color: "var(--ink-muted)" }}>
                  {brief.flexible.join(" · ")}
                </dd>
              </div>
            )}
            {brief.zones.length > 0 && (
              <div>
                <dt className="eyebrow mb-1.5">Zonas de interés</dt>
                <dd className="flex flex-wrap gap-1.5">
                  {brief.zones.map((zone, i) => (
                    <span
                      key={i}
                      className="rounded-full px-2.5 py-1 text-xs font-medium"
                      style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
                    >
                      {zone}
                    </span>
                  ))}
                </dd>
              </div>
            )}
            {brief.capitalZones.length > 0 && (
              <div>
                <dt className="eyebrow mb-1.5">Si aparece algo en</dt>
                <dd className="flex flex-wrap gap-1.5">
                  {brief.capitalZones.map((zone, i) => (
                    <span
                      key={i}
                      className="rounded-full px-2.5 py-1 text-xs font-medium"
                      style={{ background: "var(--gold-soft)", color: "var(--gold)" }}
                    >
                      {zone}
                    </span>
                  ))}
                </dd>
              </div>
            )}
            {brief.mustHave.length === 0 &&
              brief.flexible.length === 0 &&
              brief.zones.length === 0 &&
              brief.capitalZones.length === 0 && (
                <p className="text-sm" style={{ color: "var(--ink-faint)" }}>
                  Tu corredor todavía no cargó los criterios de búsqueda.
                </p>
              )}
          </dl>
        </div>

        {tipoCaso === "compra" && (
          <div
            className="rounded-2xl border p-5"
            style={{
              background: "var(--surface)",
              borderColor: "var(--border)",
              boxShadow: "var(--shadow-card)",
            }}
          >
            {loan.hasCredit ? (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg">Crédito pre-aprobado{loan.bankName ? ` — ${loan.bankName}` : ""}</h2>
                  <CriteriaEditor criteria={criteria} />
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <dt className="eyebrow mb-1">Monto</dt>
                    <dd className="mono text-base">{formatArs(loan.approvedAmountArs)}</dd>
                  </div>
                  <div>
                    <dt className="eyebrow mb-1">Cuota aprox.</dt>
                    <dd className="mono text-base">{formatArs(loan.approvedInstallmentArs)}</dd>
                  </div>
                  <div>
                    <dt className="eyebrow mb-1">Tasa</dt>
                    <dd className="mono text-base">{loan.rateLabel}</dd>
                  </div>
                  <div>
                    <dt className="eyebrow mb-1">Plazo</dt>
                    <dd className="mono text-base">
                      {loan.termMonths} meses ({Math.round(loan.termMonths / 12)} años)
                    </dd>
                  </div>
                </dl>
                {loan.conditions.length > 0 && (
                  <div className="mt-4 border-t pt-4" style={{ borderColor: "var(--border)" }}>
                    <p className="eyebrow mb-1.5">Condiciones</p>
                    <ul className="flex flex-col gap-1 text-sm" style={{ color: "var(--ink-muted)" }}>
                      {loan.conditions.map((c) => (
                        <li key={c}>• {c}</li>
                      ))}
                    </ul>
                  </div>
                )}
                <Link
                  href="/caso/calculadora"
                  className="mt-4 inline-block text-sm font-medium"
                  style={{ color: "var(--accent)" }}
                >
                  Ir a la calculadora →
                </Link>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <h2 className="text-lg">Sin crédito</h2>
                  <CriteriaEditor criteria={criteria} />
                </div>
                <p className="mt-2 text-sm" style={{ color: "var(--ink-muted)" }}>
                  Esta compra es al contado, sin financiación bancaria.
                </p>
              </>
            )}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 text-lg">Estado de la búsqueda</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-9">
          {STAT_TILES.map((tile) => (
            <Link
              key={tile.status}
              href={`/caso/casas?status=${tile.status}`}
              className="rounded-2xl border p-4 transition-colors hover:border-[var(--border-strong)]"
              style={{ background: "var(--surface)", borderColor: "var(--border)" }}
            >
              <p className="mono text-2xl">{counts[tile.status]}</p>
              <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
                {tile.label}
              </p>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg">Propiedades en seguimiento</h2>
          {houses.length > 0 && (
            <Link href="/caso/casas" className="text-sm font-medium" style={{ color: "var(--accent)" }}>
              Ver todas ({houses.length}) →
            </Link>
          )}
        </div>
        {houses.length === 0 ? (
          <EmptyState icon="🏡" title="Todavía no hay propiedades cargadas">
            <p className="mt-2 max-w-md text-xs sm:text-sm leading-relaxed" style={{ color: "var(--ink-muted)" }}>
              Cuando encuentren una propiedad en ZonaProp, MercadoLibre o Argenprop que les llame la atención, péguenla acá para analizarla juntos y coordinar visitas.
            </p>
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/caso/casas"
                className="btn btn-primary inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs sm:text-sm font-semibold"
                style={{
                  background: "linear-gradient(135deg, var(--accent), var(--gold))",
                  color: "var(--accent-ink)",
                }}
              >
                + Cargar primer aviso
              </Link>
              <Link
                href="/caso/checklist"
                className="btn inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-xs sm:text-sm font-medium"
                style={{ border: "1px solid var(--border)", color: "var(--ink)" }}
              >
                Ver checklist de trámites
              </Link>
            </div>
          </EmptyState>
        ) : (
          <div className="flex flex-col gap-2">
            {recent.map((house) => (
              <div
                key={house.id}
                className="flex flex-col gap-2 rounded-xl border px-4 py-3 transition-colors hover:border-[var(--border-strong)] sm:flex-row sm:items-center sm:justify-between"
                style={{ background: "var(--surface)", borderColor: "var(--border)" }}
              >
                <Link
                  href={`/caso/casas#house-${house.id}`}
                  className="min-w-0 transition-colors hover:text-[var(--accent)] sm:flex-1"
                >
                  <p className="truncate text-sm font-medium">{house.title}</p>
                  <p className="mono truncate text-xs" style={{ color: "var(--ink-faint)" }}>
                    {house.zone ?? house.source} · agregó {house.addedBy} · {formatDate(house.addedAt)}
                  </p>
                </Link>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="mono text-sm">{formatUsd(house.priceUsd)}</span>
                  <StatusBadge status={house.status} />
                  {house.url && (
                    <a
                      href={house.url}
                      target="_blank"
                      rel="noreferrer"
                      title="Ver aviso original en el portal"
                      className="p-1 text-xs opacity-50 hover:opacity-100 transition-opacity"
                      style={{ color: "var(--ink-muted)" }}
                    >
                      <ExternalLink size={14} />
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
