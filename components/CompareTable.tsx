"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Calendar, Check, Landmark, Phone, Pin, Star, X } from "lucide-react";
import { House, LoanInfo } from "@/lib/types";
import { formatDate, formatDateTime, formatUsd, proxiedImage, telHref } from "@/lib/format";
import { cashNeededRange, pricePerM2 } from "@/lib/mortgage";
import { apiErrorMessage } from "@/lib/http";
import StatusBadge from "@/components/StatusBadge";
import AddToCalendarButton from "@/components/AddToCalendarButton";

function cell(className = ""): string {
  return `whitespace-nowrap border-b px-4 py-3 align-top text-sm ${className}`;
}

export default function CompareTable({ houses, loan }: { houses: House[]; loan: LoanInfo }) {
  const router = useRouter();
  // Mismo criterio que HouseCard.tsx: sin bankMaxUsd ni ownFundsMaxUsd
  // cargados (caso recién creado, o de alquiler/otro, que nunca completan
  // estos campos) el cálculo de gastos de escritura no tiene con qué
  // compararse y el badge salía en rojo ("no te alcanza") sin ningún dato
  // real de crédito detrás.
  const loanConfigured = loan.bankMaxUsd > 0 || loan.ownFundsMaxUsd > 0;

  async function unstar(id: string) {
    const res = await fetch(`/api/houses/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ highlighted: false }),
    });
    if (!res.ok) {
      toast.error(await apiErrorMessage(res, "No se pudo quitar de la comparación."));
      return;
    }
    router.refresh();
  }

  const rows: { label: string; render: (h: House) => React.ReactNode }[] = [
    {
      label: "",
      render: (h) => (
        <a href={h.url ?? `/caso/casas#house-${h.id}`} target={h.url ? "_blank" : undefined} rel="noreferrer" className="block h-24 w-36 overflow-hidden rounded-lg" style={{ background: "var(--accent-soft)" }}>
          {h.images[0] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={proxiedImage(h.images[0])!} alt={h.title} loading="lazy" className="h-full w-full object-cover" />
          )}
        </a>
      ),
    },
    {
      label: "Título",
      render: (h) => (
        <a href={h.url ?? `/caso/casas#house-${h.id}`} target={h.url ? "_blank" : undefined} rel="noreferrer" className="font-semibold" style={{ color: "var(--accent)" }}>
          {h.title}
        </a>
      ),
    },
    { label: "Precio", render: (h) => <span className="mono">{formatUsd(h.priceUsd)}</span> },
    {
      label: "USD/m²",
      render: (h) => {
        const v = pricePerM2(h.priceUsd, h.superficieM2);
        return <span className="mono">{v ? `US$ ${v.toLocaleString("es-AR")}` : "—"}</span>;
      },
    },
    { label: "Superficie", render: (h) => (h.superficieM2 ? `${h.superficieM2} m²` : "—") },
    { label: "Zona", render: (h) => h.zone ?? "—" },
    { label: "Ambientes", render: (h) => h.ambientes ?? "—" },
    {
      label: "Cochera",
      render: (h) =>
        h.cochera === true ? (
          <span className="inline-flex items-center gap-1" style={{ color: "var(--status-gusto)" }}>
            <Check size={14} /> Sí
          </span>
        ) : h.cochera === false ? (
          <span className="inline-flex items-center gap-1" style={{ color: "var(--status-descartada)" }}>
            <X size={14} /> No
          </span>
        ) : (
          "Sin dato"
        ),
    },
    {
      label: "Plata necesaria",
      render: (h) => {
        if (!h.priceUsd || !loanConfigured) return "—";
        const cash = cashNeededRange(h.priceUsd, loan.hasCredit ? loan.bankMaxUsd : 0);
        const fit =
          cash.high <= loan.ownFundsMaxUsd ? "gusto" : cash.low <= loan.ownFundsMaxUsd ? "pendiente" : "descartada";
        return (
          <Link
            href={`/caso/calculadora?price=${h.priceUsd}`}
            title="Ver en la calculadora"
            className="mono rounded-lg px-2 py-1 text-xs font-medium transition-all hover:opacity-90 active:scale-95 inline-flex items-center gap-1"
            style={{ background: `var(--status-${fit}-bg)`, color: `var(--status-${fit})` }}
          >
            {formatUsd(cash.low)}–{formatUsd(cash.high)}
            <span className="text-[10px] opacity-60">→</span>
          </Link>
        );
      },
    },
    { label: "Estado", render: (h) => <StatusBadge status={h.status} /> },
    {
      label: "Visita / próxima acción",
      render: (h) => (
        <div className="flex flex-col gap-1 text-xs" style={{ color: "var(--ink-muted)" }}>
          {h.visitaFecha && (
            <span className="inline-flex items-center gap-1">
              <Calendar size={12} /> {formatDateTime(h.visitaFecha)}
              <AddToCalendarButton
                house={h}
                variant="pill"
                title="Descargar evento para el calendario (.ics)"
                className="rounded p-0.5 hover:bg-black/10 dark:hover:bg-white/10"
              />
            </span>
          )}
          {h.proximaAccion && (
            <span className="inline-flex items-center gap-1">
              <Pin size={12} /> {h.proximaAccion}
              {h.proximaAccionFecha && ` · ${formatDate(h.proximaAccionFecha)}`}
            </span>
          )}
          {!h.visitaFecha && !h.proximaAccion && "—"}
        </div>
      ),
    },
    {
      label: "Contacto",
      render: (h) =>
        h.contactoNombre || h.contactoTelefono ? (
          <span className="text-xs">
            {h.contactoNombre}
            {h.contactoNombre && h.contactoTelefono && " · "}
            {h.contactoTelefono && (
              <a
                href={telHref(h.contactoTelefono)}
                className="underline underline-offset-2 hover:opacity-80"
                style={{ color: "var(--accent)" }}
              >
                {h.contactoTelefono}
              </a>
            )}
          </span>
        ) : (
          "—"
        ),
    },
    {
      label: "",
      render: (h) => (
        <button
          onClick={() => unstar(h.id)}
          className="rounded-full border px-3 py-1 text-xs font-medium"
          style={{ borderColor: "var(--border)", color: "var(--ink-muted)" }}
        >
          Quitar de comparación
        </button>
      ),
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Vista Móvil: Tarjetas comparativas con scroll horizontal snap */}
      <div className="flex flex-col gap-2.5 sm:hidden">
        <p className="text-xs font-medium" style={{ color: "var(--ink-muted)" }}>
          Deslizá horizontalmente para comparar ({houses.length} favoritas) →
        </p>
        <div className="-mx-4 flex gap-3.5 overflow-x-auto px-4 pb-4 snap-x snap-mandatory [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
          {houses.map((h, index) => {
            const v = pricePerM2(h.priceUsd, h.superficieM2);
            const cash = h.priceUsd && loanConfigured ? cashNeededRange(h.priceUsd, loan.hasCredit ? loan.bankMaxUsd : 0) : null;
            const fit = cash
              ? cash.high <= loan.ownFundsMaxUsd
                ? "gusto"
                : cash.low <= loan.ownFundsMaxUsd
                  ? "pendiente"
                  : "descartada"
              : null;

            return (
              <div
                key={h.id}
                className="flex w-[82vw] max-w-[320px] shrink-0 snap-center flex-col overflow-hidden rounded-2xl border text-sm"
                style={{
                  background: "var(--surface)",
                  borderColor: "var(--border)",
                  boxShadow: "var(--shadow-card)",
                }}
              >
                {/* Imagen con badge de orden y botón para quitar de favoritas */}
                <div className="relative aspect-[16/10] w-full overflow-hidden" style={{ background: "var(--accent-soft)" }}>
                  {h.images[0] ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={proxiedImage(h.images[0])!} alt={h.title} loading="lazy" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs" style={{ color: "var(--ink-faint)" }}>
                      Sin imagen
                    </div>
                  )}
                  <span
                    className="absolute left-2.5 top-2.5 rounded-full px-2 py-0.5 text-[10px] font-bold backdrop-blur-md"
                    style={{ background: "rgba(18, 24, 31, 0.75)", color: "#fff" }}
                  >
                    {index + 1} de {houses.length}
                  </span>
                  <button
                    onClick={() => unstar(h.id)}
                    title="Quitar de favoritas"
                    aria-label="Quitar de favoritas"
                    className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full backdrop-blur-md transition-transform active:scale-90"
                    style={{
                      background: "rgba(18, 24, 31, 0.75)",
                      color: "var(--gold)",
                      border: "1px solid var(--gold)",
                    }}
                  >
                    <Star size={14} fill="var(--gold)" />
                  </button>
                </div>

                <div className="flex flex-1 flex-col gap-3 p-4">
                  {/* Título */}
                  <a
                    href={h.url ?? `/caso/casas#house-${h.id}`}
                    target={h.url ? "_blank" : undefined}
                    rel="noreferrer"
                    className="line-clamp-2 font-semibold leading-snug"
                    style={{ color: "var(--accent)" }}
                  >
                    {h.title}
                  </a>

                  <div className="flex items-center justify-between">
                    <StatusBadge status={h.status} />
                    <span className="text-xs" style={{ color: "var(--ink-muted)" }}>
                      {h.zone || "Sin zona"}
                    </span>
                  </div>

                  {/* Datos clave de comparación */}
                  <div
                    className="grid grid-cols-2 gap-2 rounded-xl border p-2.5"
                    style={{ borderColor: "var(--border)", background: "var(--paper)" }}
                  >
                    <div>
                      <p className="eyebrow text-[10px]">Precio</p>
                      <p className="mono font-bold text-sm">{formatUsd(h.priceUsd)}</p>
                      {v && <p className="mono text-[10px]" style={{ color: "var(--ink-faint)" }}>US$ {v.toLocaleString("es-AR")}/m²</p>}
                    </div>
                    <div>
                      <p className="eyebrow text-[10px]">Superficie / Amb</p>
                      <p className="font-medium text-xs">
                        {h.superficieM2 ? `${h.superficieM2} m²` : "—"} · {h.ambientes ? `${h.ambientes} amb` : "—"}
                      </p>
                      <p className="text-[11px]" style={{ color: "var(--ink-muted)" }}>
                        Cochera: {h.cochera === true ? "Sí" : h.cochera === false ? "No" : "Sin dato"}
                      </p>
                    </div>
                  </div>

                  {/* Apto crédito en mobile */}
                  <div className="flex items-center gap-1.5 text-xs font-medium">
                    <Landmark
                      size={12}
                      style={{
                        color:
                          h.aptoCredito === "si"
                            ? "var(--status-gusto)"
                            : h.aptoCredito === "no"
                              ? "var(--status-descartada)"
                              : "var(--gold)",
                      }}
                    />
                    <span style={{ color: "var(--ink-muted)" }}>
                      {h.aptoCredito === "si"
                        ? "Apto crédito: sí"
                        : h.aptoCredito === "no"
                          ? "Apto crédito: no"
                          : "Apto crédito: sin dato"}
                    </span>
                  </div>

                  {/* Contacto en mobile */}
                  {(h.contactoNombre || h.contactoTelefono) && (
                    <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--ink-muted)" }}>
                      <Phone size={12} className="shrink-0" />
                      <span>{h.contactoNombre}</span>
                      {h.contactoNombre && h.contactoTelefono && <span>·</span>}
                      {h.contactoTelefono && (
                        <a
                          href={telHref(h.contactoTelefono)}
                          className="font-medium underline underline-offset-2"
                          style={{ color: "var(--accent)" }}
                        >
                          {h.contactoTelefono}
                        </a>
                      )}
                    </div>
                  )}

                  {/* Plata de bolsillo */}
                  {cash && (
                    <div className="flex items-center justify-between text-xs">
                      <span style={{ color: "var(--ink-muted)" }}>Plata necesaria:</span>
                      <Link
                        href={`/caso/calculadora?price=${h.priceUsd}`}
                        title="Ver en la calculadora"
                        className="mono rounded-lg px-2 py-0.5 font-semibold transition-all hover:opacity-90 inline-flex items-center gap-1"
                        style={{ background: `var(--status-${fit}-bg)`, color: `var(--status-${fit})` }}
                      >
                        {formatUsd(cash.low)}–{formatUsd(cash.high)}
                        <span className="text-[10px] opacity-60">→</span>
                      </Link>
                    </div>
                  )}

                  {/* Próxima visita o acción */}
                  {(h.visitaFecha || h.proximaAccion) && (
                    <div
                      className="mt-auto flex flex-col gap-1.5 rounded-xl p-2.5 text-xs"
                      style={{ background: "var(--accent-soft)", color: "var(--ink)" }}
                    >
                      {h.visitaFecha && (
                        <div className="flex items-center justify-between gap-1">
                          <span className="flex items-center gap-1.5 font-medium">
                            <Calendar size={13} style={{ color: "var(--accent)" }} />
                            Visita: {formatDateTime(h.visitaFecha)}
                          </span>
                          <AddToCalendarButton house={h} variant="pill" title="Descargar o agendar visita" />
                        </div>
                      )}
                      {h.proximaAccion && (
                        <span className="flex items-center gap-1.5" style={{ color: "var(--ink-muted)" }}>
                          <Pin size={12} /> {h.proximaAccion}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Botón quitar de favoritas */}
                  <button
                    type="button"
                    onClick={() => unstar(h.id)}
                    className="mt-1 rounded-xl border py-1.5 text-xs font-medium transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                    style={{ borderColor: "var(--border)", color: "var(--ink-muted)" }}
                  >
                    Quitar de favoritas
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Vista Desktop: Tabla comparativa tabular */}
      <div className="hidden overflow-x-auto rounded-2xl border sm:block" style={{ borderColor: "var(--border)" }}>
        <table className="w-full border-collapse" style={{ background: "var(--surface)" }}>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                <th
                  scope="row"
                  className={cell("sticky left-0 text-left font-medium")}
                  style={{ background: "var(--paper)", color: "var(--ink-muted)", borderColor: "var(--border)" }}
                >
                  {row.label}
                </th>
                {houses.map((h) => (
                  <td key={h.id} className={cell()} style={{ borderColor: "var(--border)", color: "var(--ink)" }}>
                    {row.render(h)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
