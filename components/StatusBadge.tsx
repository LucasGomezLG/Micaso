import { HouseStatus, STATUS_LABEL } from "@/lib/types";

const DOT_COLOR: Record<HouseStatus, string> = {
  pendiente: "var(--status-pendiente)",
  duda_visitar: "var(--status-duda-visitar)",
  a_coordinar: "var(--status-a-coordinar)",
  coordinada: "var(--status-coordinada)",
  gusto: "var(--status-gusto)",
  no_gusto: "var(--status-no-gusto)",
  oferta: "var(--gold)",
  comprada: "var(--accent)",
  descartada: "var(--status-descartada)",
  borrada: "var(--status-borrada)",
};

const BG_COLOR: Record<HouseStatus, string> = {
  pendiente: "var(--status-pendiente-bg)",
  duda_visitar: "var(--status-duda-visitar-bg)",
  a_coordinar: "var(--status-a-coordinar-bg)",
  coordinada: "var(--status-coordinada-bg)",
  gusto: "var(--status-gusto-bg)",
  no_gusto: "var(--status-no-gusto-bg)",
  oferta: "var(--gold-soft)",
  comprada: "var(--accent-soft)",
  descartada: "var(--status-descartada-bg)",
  borrada: "var(--status-borrada-bg)",
};

export default function StatusBadge({ status }: { status: HouseStatus }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold"
      style={{ background: BG_COLOR[status], color: DOT_COLOR[status] }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ background: DOT_COLOR[status] }}
      />
      {STATUS_LABEL[status]}
    </span>
  );
}
