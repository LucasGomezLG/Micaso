"use client";

import { useRouter } from "next/navigation";
import { Calendar, Check, Pin, X } from "lucide-react";
import { House, LoanInfo, STATUS_LABEL } from "@/lib/types";
import { formatDate, formatDateTime, formatUsd, proxiedImage } from "@/lib/format";
import { cashNeededRange, pricePerM2 } from "@/lib/mortgage";
import StatusBadge from "@/components/StatusBadge";

function cell(className = ""): string {
  return `whitespace-nowrap border-b px-4 py-3 align-top text-sm ${className}`;
}

export default function CompareTable({ houses, loan }: { houses: House[]; loan: LoanInfo }) {
  const router = useRouter();

  async function unstar(id: string) {
    await fetch(`/api/houses/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ highlighted: false }),
    });
    router.refresh();
  }

  const rows: { label: string; render: (h: House) => React.ReactNode }[] = [
    {
      label: "",
      render: (h) => (
        <a href={h.url} target="_blank" rel="noreferrer" className="block h-24 w-36 overflow-hidden rounded-lg" style={{ background: "var(--accent-soft)" }}>
          {h.images[0] && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={proxiedImage(h.images[0])!} alt={h.title} className="h-full w-full object-cover" />
          )}
        </a>
      ),
    },
    {
      label: "Título",
      render: (h) => (
        <a href={h.url} target="_blank" rel="noreferrer" className="font-semibold" style={{ color: "var(--accent)" }}>
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
        if (!h.priceUsd) return "—";
        const cash = cashNeededRange(h.priceUsd, loan.bankMaxUsd);
        const fit =
          cash.high <= loan.ownFundsMaxUsd ? "gusto" : cash.low <= loan.ownFundsMaxUsd ? "pendiente" : "descartada";
        return (
          <span
            className="mono rounded-lg px-2 py-1 text-xs font-medium"
            style={{ background: `var(--status-${fit}-bg)`, color: `var(--status-${fit})` }}
          >
            {formatUsd(cash.low)}–{formatUsd(cash.high)}
          </span>
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
            {h.contactoTelefono}
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
    <div className="overflow-x-auto rounded-2xl border" style={{ borderColor: "var(--border)" }}>
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
  );
}
