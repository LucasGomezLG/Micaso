import Link from "next/link";
import { CalendarDays, MapPin, Phone } from "lucide-react";
import { getCriteria, getHouses } from "@/lib/store";
import { getCaseId } from "@/lib/session";
import { getCase } from "@/lib/cases";
import { dayLabel, daysUntil, formatTime, formatUsd, todayAr } from "@/lib/format";
import { House, LoanInfo, STATUS_LABEL } from "@/lib/types";
import AddToCalendarButton from "@/components/AddToCalendarButton";
import EmptyState from "@/components/EmptyState";
import HouseQuickView from "@/components/HouseQuickView";

export const dynamic = "force-dynamic";

type VisitHouse = House & { visitaFecha: string };

function groupByDay(list: VisitHouse[]): Record<string, VisitHouse[]> {
  const groups: Record<string, VisitHouse[]> = {};
  for (const house of list) {
    const day = house.visitaFecha.slice(0, 10);
    (groups[day] ??= []).push(house);
  }
  return groups;
}

export default async function AgendaPage() {
  const caseId = await getCaseId();
  const [houses, criteria, kase] = await Promise.all([
    getHouses(caseId),
    getCriteria(caseId),
    getCase(caseId),
  ]);
  const loan = criteria.loan;
  const people = kase?.people ?? [];
  const today = todayAr();

  const activeHouses = houses.filter((h) => h.status !== "borrada");
  const aCoordinarCount = activeHouses.filter((h) => h.status === "a_coordinar").length;

  const visitasConFecha = activeHouses.filter((h): h is VisitHouse => !!h.visitaFecha);
  const proximas = visitasConFecha
    .filter((h) => h.visitaFecha.slice(0, 10) >= today)
    .sort((a, b) => (a.visitaFecha < b.visitaFecha ? -1 : a.visitaFecha > b.visitaFecha ? 1 : 0));
  // Más recientes primero, para que lo último que pasó quede arriba.
  const pasadas = visitasConFecha
    .filter((h) => h.visitaFecha.slice(0, 10) < today)
    .sort((a, b) => (a.visitaFecha > b.visitaFecha ? -1 : a.visitaFecha < b.visitaFecha ? 1 : 0));

  const proximasGroups = groupByDay(proximas);
  const pasadasGroups = groupByDay(pasadas);

  return (
    <div className="flex flex-col gap-10">
      <section>
        <p className="eyebrow mb-2">Itinerario</p>
        <h1 className="text-3xl sm:text-4xl">Agenda de visitas</h1>
        <p className="mt-2 max-w-2xl" style={{ color: "var(--ink-muted)" }}>
          Las visitas coordinadas, en orden, para organizar el recorrido del día o de la semana.
        </p>
      </section>

      {proximas.length === 0 && pasadas.length === 0 ? (
        <EmptyState icon={<CalendarDays size={24} />} title="Todavía no hay visitas coordinadas">
          {aCoordinarCount > 0 ? (
            <>
              <p className="mt-2 max-w-md text-xs sm:text-sm leading-relaxed" style={{ color: "var(--ink-muted)" }}>
                Tenés <strong style={{ color: "var(--ink)" }}>{aCoordinarCount} {aCoordinarCount === 1 ? "propiedad lista" : "propiedades listas"}</strong> en estado &ldquo;A coordinar&rdquo; para ponerles fecha y hora.
              </p>
              <Link
                href="/caso/casas?status=a_coordinar"
                className="btn btn-primary mt-6 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs sm:text-sm font-semibold transition-transform active:scale-95"
                style={{ background: "linear-gradient(135deg, var(--accent), var(--gold))", color: "var(--accent-ink)" }}
              >
                Ver propiedades a coordinar ({aCoordinarCount}) →
              </Link>
            </>
          ) : (
            <>
              <p className="mt-2 max-w-md text-xs sm:text-sm leading-relaxed" style={{ color: "var(--ink-muted)" }}>
                Cuando le pongan fecha y hora a una visita desde una propiedad, va a aparecer acá en orden cronológico.
              </p>
              <Link
                href="/caso/casas"
                className="btn btn-primary mt-6 inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-xs sm:text-sm font-semibold transition-transform active:scale-95"
                style={{ background: "linear-gradient(135deg, var(--accent), var(--gold))", color: "var(--accent-ink)" }}
              >
                Ir a propiedades →
              </Link>
            </>
          )}
        </EmptyState>
      ) : (
        <div className="flex flex-col gap-10">
          {proximas.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--ink-muted)" }}>
              No tenés visitas próximas coordinadas.
            </p>
          ) : (
            <div className="flex flex-col gap-8">
              {Object.entries(proximasGroups).map(([day, dayHouses]) => (
                <DayGroup key={day} day={day} today={today} houses={dayHouses} loan={loan} people={people} />
              ))}
            </div>
          )}

          {pasadas.length > 0 && (
            <section className="flex flex-col gap-4 border-t pt-8" style={{ borderColor: "var(--border)" }}>
              <div className="flex items-center gap-2">
                <p className="eyebrow">Visitas pasadas</p>
                <span className="text-xs" style={{ color: "var(--ink-faint)" }}>
                  · {pasadas.length} {pasadas.length === 1 ? "visita realizada" : "visitas realizadas"}
                </span>
              </div>
              <div className="flex flex-col gap-6 opacity-75">
                {Object.entries(pasadasGroups).map(([day, dayHouses]) => (
                  <DayGroup key={day} day={day} today={today} houses={dayHouses} loan={loan} people={people} past />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}

function DayGroup({
  day,
  today,
  houses,
  loan,
  people,
  past = false,
}: {
  day: string;
  today: string;
  houses: VisitHouse[];
  loan: LoanInfo;
  people: string[];
  past?: boolean;
}) {
  const isToday = !past && day === today;
  const isTomorrow = !past && daysUntil(day) === 1;
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center gap-2.5">
        <h2 className="text-lg font-semibold" style={{ fontFamily: "var(--font-display)" }}>
          {dayLabel(day)}
        </h2>
        {isToday && (
          <span
            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-xs animate-pulse"
            style={{ background: "var(--accent)", color: "var(--accent-ink)" }}
          >
            Hoy
          </span>
        )}
        {isTomorrow && (
          <span
            className="inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider shadow-xs"
            style={{ background: "var(--gold-soft)", color: "var(--gold)" }}
          >
            Mañana
          </span>
        )}
        <span className="text-xs" style={{ color: "var(--ink-faint)" }}>
          · {houses.length} {houses.length === 1 ? "visita" : "visitas"}
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {houses.map((house) => (
          <div
            key={house.id}
            className="card-hover flex flex-col gap-3 rounded-2xl border px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between transition-all"
            style={{
              background: "var(--surface)",
              borderColor: isToday ? "color-mix(in srgb, var(--accent) 45%, var(--border))" : "var(--border)",
              boxShadow: isToday ? "0 0 0 1px color-mix(in srgb, var(--accent) 30%, transparent), var(--shadow-card)" : "var(--shadow-card)",
            }}
          >
            <div className="flex items-start gap-3.5 sm:items-center min-w-0">
              <span
                className="mono flex h-11 shrink-0 items-center justify-center whitespace-nowrap rounded-xl px-3 text-xs font-semibold shadow-2xs"
                style={{
                  background: past ? "var(--border)" : "var(--status-coordinada-bg)",
                  color: past ? "var(--ink-muted)" : "var(--status-coordinada)",
                }}
              >
                {formatTime(house.visitaFecha)}
              </span>
              <div className="min-w-0 flex-1">
                <HouseQuickView
                  house={house}
                  loan={loan}
                  people={people}
                  className="block truncate text-left text-sm font-semibold hover:text-[var(--accent)] transition-colors"
                >
                  {house.title}
                </HouseQuickView>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs" style={{ color: "var(--ink-faint)" }}>
                  {(house.address || house.zone) && (
                    <span className="inline-flex items-center gap-1 font-medium" style={{ color: "var(--ink-muted)" }}>
                      <MapPin size={12} className="shrink-0" /> {house.address || house.zone}
                    </span>
                  )}
                  {house.priceUsd !== null && (
                    <span className="mono font-semibold" style={{ color: "var(--ink)" }}>
                      {formatUsd(house.priceUsd)}
                    </span>
                  )}
                  {house.contactoTelefono && (
                    <a
                      href={`tel:${house.contactoTelefono}`}
                      className="inline-flex items-center gap-1 font-medium hover:underline hover:text-[var(--accent)]"
                      style={{ color: "var(--ink-muted)" }}
                    >
                      <Phone size={12} className="shrink-0 text-emerald-500" />
                      {house.contactoNombre ? `${house.contactoNombre} · ` : ""}
                      {house.contactoTelefono}
                    </a>
                  )}
                </p>
              </div>
            </div>
            {!past ? (
              <div
                className="flex w-full shrink-0 items-center gap-2 border-t pt-2.5 sm:w-auto sm:self-auto sm:border-t-0 sm:pt-0"
                style={{ borderColor: "var(--border)" }}
              >
                <AddToCalendarButton
                  house={house}
                  title="Descargar evento .ics para agregar a tu calendario"
                  label="Calendario"
                  fullWidth
                  className="btn flex w-full items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold transition-all hover:border-[var(--border-strong)] active:scale-95 sm:w-auto"
                />
              </div>
            ) : house.status === "coordinada" ? (
              <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto pt-1 sm:pt-0">
                <HouseQuickView
                  house={house}
                  loan={loan}
                  people={people}
                  className="inline-flex items-center gap-1 rounded-xl border px-3 py-1.5 text-xs font-semibold transition-all hover:brightness-95 active:scale-95"
                  style={{
                    borderColor: "var(--status-coordinada)",
                    color: "var(--status-coordinada)",
                    background: "var(--status-coordinada-bg)",
                  }}
                >
                  ¿Cómo les fue? Calificar →
                </HouseQuickView>
              </div>
            ) : (
              <div className="flex shrink-0 items-center gap-2 self-end sm:self-auto pt-1 sm:pt-0">
                <span
                  className="rounded-full px-2.5 py-0.5 text-xs font-medium"
                  style={{
                    background: `var(--status-${house.status}-bg, var(--paper))`,
                    color: `var(--status-${house.status}, var(--ink-muted))`,
                  }}
                >
                  {STATUS_LABEL[house.status]}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
