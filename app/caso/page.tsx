import Link from "next/link";
import { getCriteria, getHouses, countByStatus } from "@/lib/store";
import { getCaseId } from "@/lib/session";
import { getCase } from "@/lib/cases";
import { daysUntil, formatArs, formatDate, formatDateTime, formatUsd, isOverdue } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";
import CriteriaEditor from "@/components/CriteriaEditor";
import PeopleEditor from "@/components/PeopleEditor";
import { House, HouseStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const STAT_TILES: { status: HouseStatus; label: string }[] = [
  { status: "pendiente", label: "Pendientes" },
  { status: "coordinada", label: "Visita coordinada" },
  { status: "gusto", label: "Gustó" },
  { status: "no_gusto", label: "No gustó" },
  { status: "oferta", label: "Oferta hecha" },
  { status: "descartada", label: "Descartadas" },
];

function upcomingSortKey(house: House): string {
  return [house.visitaFecha, house.proximaAccionFecha].filter((d): d is string => !!d).sort()[0];
}

export default async function HomePage() {
  const caseId = await getCaseId();
  const [criteria, allHouses, kase] = await Promise.all([getCriteria(caseId), getHouses(caseId), getCase(caseId)]);
  const people = kase?.people ?? [];
  const { loan, brief } = criteria;
  const houses = allHouses.filter((h) => h.status !== "borrada");
  const counts = countByStatus(houses);
  const recent = [...houses]
    .sort((a, b) => (a.addedAt < b.addedAt ? 1 : -1))
    .slice(0, 5);
  const remainingDays = daysUntil(loan.moveOutDeadline);
  const upcoming = houses
    .filter((h) => h.visitaFecha || h.proximaAccionFecha)
    .sort((a, b) => (upcomingSortKey(a) < upcomingSortKey(b) ? -1 : 1));

  return (
    <div className="flex flex-col gap-10">
      <section>
        <p className="eyebrow mb-2">Búsqueda activa</p>
        <h1 className="text-3xl sm:text-4xl">Casa</h1>
        <p className="mt-2 max-w-2xl" style={{ color: "var(--ink-muted)" }}>
          Todo lo del crédito BBVA y la búsqueda de casa en un solo lugar:
          qué buscamos, qué propiedades vimos y qué falta para llegar a la
          escritura.
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

      {upcoming.length > 0 && (
        <section>
          <h2 className="mb-3 text-lg">Próximas visitas y acciones</h2>
          <div className="flex flex-col gap-2">
            {upcoming.map((house) => {
              const vencida = house.proximaAccionFecha ? isOverdue(house.proximaAccionFecha) : false;
              return (
                <Link
                  key={house.id}
                  href="/caso/casas"
                  className="flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-colors hover:border-[var(--border-strong)]"
                  style={{ background: "var(--surface)", borderColor: "var(--border)" }}
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">{house.title}</p>
                    <p className="text-xs" style={{ color: "var(--ink-faint)" }}>
                      {house.zone ?? house.source}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {house.visitaFecha && (
                      <span
                        className="rounded-lg px-2 py-1 text-xs font-medium"
                        style={{ background: "var(--status-coordinada-bg)", color: "var(--status-coordinada)" }}
                      >
                        🗓 {formatDateTime(house.visitaFecha)}
                      </span>
                    )}
                    {house.proximaAccion && (
                      <span
                        className="rounded-lg px-2 py-1 text-xs font-medium"
                        style={{
                          background: vencida ? "var(--status-descartada-bg)" : "var(--status-pendiente-bg)",
                          color: vencida ? "var(--status-descartada)" : "var(--status-pendiente)",
                        }}
                      >
                        📌 {house.proximaAccion}
                        {house.proximaAccionFecha && (
                          <> · {vencida ? "venció" : "vence"} {formatDate(house.proximaAccionFecha)}</>
                        )}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        </section>
      )}

      <section className="grid gap-4 sm:grid-cols-2">
        <div
          className="rounded-2xl border p-5"
          style={{
            background: "var(--surface)",
            borderColor: "var(--border)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <h2 className="text-lg">Lo que buscamos</h2>
          <dl className="mt-4 flex flex-col gap-4 text-sm">
            <div>
              <dt className="eyebrow mb-1.5">Capital</dt>
              <dd style={{ color: "var(--ink-muted)" }}>
                Hasta{" "}
                <strong className="mono" style={{ color: "var(--ink)" }}>
                  {formatUsd(loan.bankMaxUsd)}
                </strong>{" "}
                de crédito, más{" "}
                <strong className="mono" style={{ color: "var(--ink)" }}>
                  {formatUsd(loan.ownFundsMinUsd)}–{formatUsd(loan.ownFundsMaxUsd)}
                </strong>{" "}
                propios (incluye gastos administrativos).
              </dd>
            </div>
            <div>
              <dt className="eyebrow mb-1.5">Imprescindible</dt>
              <dd>
                <ul className="flex flex-col gap-1">
                  {brief.mustHave.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span style={{ color: "var(--status-gusto)" }}>✓</span>
                      <span style={{ color: "var(--ink-muted)" }}>{item}</span>
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
            <div>
              <dt className="eyebrow mb-1.5">Puede variar</dt>
              <dd style={{ color: "var(--ink-muted)" }}>
                {brief.flexible.join(" · ")}
              </dd>
            </div>
            <div>
              <dt className="eyebrow mb-1.5">Zonas de interés</dt>
              <dd className="flex flex-wrap gap-1.5">
                {brief.zones.map((zone) => (
                  <span
                    key={zone}
                    className="rounded-full px-2.5 py-1 text-xs font-medium"
                    style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
                  >
                    {zone}
                  </span>
                ))}
              </dd>
            </div>
            <div>
              <dt className="eyebrow mb-1.5">Si aparece algo en Capital</dt>
              <dd className="flex flex-wrap gap-1.5">
                {brief.capitalZones.map((zone) => (
                  <span
                    key={zone}
                    className="rounded-full px-2.5 py-1 text-xs font-medium"
                    style={{ background: "var(--gold-soft)", color: "var(--gold)" }}
                  >
                    {zone}
                  </span>
                ))}
              </dd>
            </div>
          </dl>
        </div>

        <div
          className="rounded-2xl border p-5"
          style={{
            background: "var(--surface)",
            borderColor: "var(--border)",
            boxShadow: "var(--shadow-card)",
          }}
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg">Crédito pre-aprobado</h2>
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
          <div className="mt-4 border-t pt-4" style={{ borderColor: "var(--border)" }}>
            <p className="eyebrow mb-1.5">Condiciones</p>
            <ul className="flex flex-col gap-1 text-sm" style={{ color: "var(--ink-muted)" }}>
              {loan.conditions.map((c) => (
                <li key={c}>• {c}</li>
              ))}
            </ul>
          </div>
          <Link
            href="/caso/calculadora"
            className="mt-4 inline-block text-sm font-medium"
            style={{ color: "var(--accent)" }}
          >
            Ir a la calculadora →
          </Link>
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg">Estado de la búsqueda</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {STAT_TILES.map((tile) => (
            <Link
              key={tile.status}
              href={`/casas?status=${tile.status}`}
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
          <h2 className="text-lg">Agregadas hace poco</h2>
          <Link href="/caso/casas" className="text-sm font-medium" style={{ color: "var(--accent)" }}>
            Ver todas ({houses.length}) →
          </Link>
        </div>
        <div className="flex flex-col gap-2">
          {recent.map((house) => (
            <a
              key={house.id}
              href={house.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-colors hover:border-[var(--border-strong)]"
              style={{ background: "var(--surface)", borderColor: "var(--border)" }}
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{house.title}</p>
                <p className="mono text-xs" style={{ color: "var(--ink-faint)" }}>
                  {house.zone ?? house.source} · agregó {house.addedBy} · {formatDate(house.addedAt)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="mono text-sm">{formatUsd(house.priceUsd)}</span>
                <StatusBadge status={house.status} />
              </div>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
