export type HouseStatus =
  | "pendiente"
  | "coordinada"
  | "gusto"
  | "no_gusto"
  | "oferta"
  | "comprada"
  | "descartada"
  | "borrada";

export interface HouseComment {
  id: string;
  author: string;
  text: string;
  createdAt: string;
}

/** Per-house due-diligence checklist (e.g. "pedir informe de dominio") —
 * separate from the case-wide Checklist page, and from VisitReview
 * (which is a retrospective after visiting, not a todo list). */
export interface HouseChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

/** Post-visit evaluation — filled in once a house moves to "gusto" or
 * "no_gusto", so impressions from the actual visit don't just live in
 * someone's memory (or get buried in the freeform comments). */
export interface VisitReview {
  bien: string;
  faltante: string;
  aMejorar: string;
}

export interface House {
  id: string;
  url: string;
  title: string;
  source: string;
  priceUsd: number | null;
  zone: string | null;
  ambientes: number | null;
  dormitorios: number | null;
  cochera: boolean | null;
  superficieM2: number | null;
  images: string[];
  comments: HouseComment[];
  checklist: HouseChecklistItem[];
  status: HouseStatus;
  highlighted: boolean;
  contactoNombre: string | null;
  contactoTelefono: string | null;
  proximaAccion: string | null;
  /** ISO date (YYYY-MM-DD) — no specific time, just a deadline. */
  proximaAccionFecha: string | null;
  /** ISO datetime — when a coordinated visit is actually scheduled. */
  visitaFecha: string | null;
  visitReview: VisitReview | null;
  addedBy: string;
  addedAt: string;
  updatedAt: string;
}

export interface ChecklistItem {
  id: string;
  group: string;
  label: string;
  done: boolean;
  assignedTo: string | null;
  notes: string;
}

export interface LoanInfo {
  bankMaxUsd: number;
  ownFundsMinUsd: number;
  ownFundsMaxUsd: number;
  approvedAmountArs: number;
  approvedInstallmentArs: number;
  rateLabel: string;
  termMonths: number;
  conditions: string[];
  moveOutDeadline: string;
}

export interface SearchBrief {
  mustHave: string[];
  flexible: string[];
  zones: string[];
  capitalZones: string[];
}

export interface Criteria {
  loan: LoanInfo;
  brief: SearchBrief;
}

export const PEOPLE = ["Lucas", "Abril", "Carolina"] as const;
export type Person = (typeof PEOPLE)[number];

export type TipoCaso = "compra" | "alquiler" | "otro";

/** `activo`: en uso normal. `solo_lectura`: impago en el período de
 * gracia de 90 días — reservado para cuando exista cobro (Mercado
 * Pago), todavía no se llega a este estado desde ningún lado.
 * `archivado`: cerrado (a mano, de inmediato) o venció la gracia de
 * impago — el link deja de funcionar. Ver ARQUITECTURA.md sección 9. */
export type CaseEstado = "activo" | "solo_lectura" | "archivado";

/** Un corredor — dueño de uno o más casos. `id` es el email de su
 * cuenta de Google (única y estable, no hace falta generar un UUID
 * aparte) salvo el alias histórico `dev-broker` (ver lib/brokers.ts).
 * `nombreMarca`/`imagenUrl` vienen del perfil de Google la primera vez
 * que entra — editables después desde el panel (todavía sin UI para
 * eso). Ver ARQUITECTURA.md sección 8. */
export interface Broker {
  id: string;
  email: string;
  nombreMarca: string;
  imagenUrl: string | null;
  createdAt: string;
}

/** Un caso: el acceso privado de una familia, dentro del panel de un
 * corredor. Namespacing de datos (houses/checklist/criteria) se hace
 * por `id` — ver lib/store.ts. */
export interface Case {
  id: string;
  brokerId: string;
  titulo: string;
  tipoCaso: TipoCaso;
  estado: CaseEstado;
  username: string;
  password: string;
  /** Nombres de la familia — hoy sin usar en la UI (PIPELINE/comments
   * siguen leyendo el `PEOPLE` global de arriba); wiring pendiente,
   * ver ARQUITECTURA.md sección 8. */
  people: string[];
  createdAt: string;
  updatedAt: string;
}

export const STATUS_LABEL: Record<HouseStatus, string> = {
  pendiente: "Pendiente",
  coordinada: "Visita coordinada",
  gusto: "Visitada — gustó",
  no_gusto: "Visitada — no gustó",
  oferta: "Oferta hecha",
  comprada: "Comprada 🎉",
  descartada: "Descartada",
  borrada: "Borrada",
};

/** Statuses shown as regular search-pipeline tabs, in funnel order
 * (excludes "borrada", which lives in its own recovery tab). */
export const PIPELINE_STATUSES: HouseStatus[] = [
  "pendiente",
  "coordinada",
  "gusto",
  "no_gusto",
  "oferta",
  "comprada",
  "descartada",
];
