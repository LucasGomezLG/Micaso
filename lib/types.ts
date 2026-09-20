export type AptoCredito = "no_se" | "si" | "no";

export type Plan = "para_arrancar" | "para_tu_cartera" | "volumen_alto";

export const PLAN_LABEL: Record<Plan, string> = {
  para_arrancar: "Inicial",
  para_tu_cartera: "Profesional",
  volumen_alto: "A medida",
};

export interface PaymentRecord {
  id: string;
  amount: number;
  currency: string;
  status: string;
  date: string;
}


/** Tope de casos activos simultáneos por plan — ver ARQUITECTURA.md
 * sección 6. `null` en "volumen_alto" es a medida, sin número fijo, así
 * que no bloquea la creación de casos. */
export const PLAN_CASE_LIMIT: Record<Plan, number | null> = {
  para_arrancar: 5,
  para_tu_cartera: 20,
  volumen_alto: null,
};

/** Estado del cobro de un corredor. Mercado Pago todavía no está
 * conectado (ver ARQUITECTURA.md sección 7 y 12), así que hoy este
 * campo solo se edita a mano desde /superadmin — "prueba" mientras
 * dura la prueba de 14 días sin tarjeta, "activa" mientras paga,
 * "atrasada" si falló un cobro o venció la prueba sin cargar tarjeta
 * (mismo tratamiento que un caso en solo_lectura, ver sección 9),
 * "cancelada" si dio de baja. */
export type SubscriptionStatus = "prueba" | "activa" | "atrasada" | "cancelada";

export const SUBSCRIPTION_STATUS_LABEL: Record<SubscriptionStatus, string> = {
  prueba: "Prueba",
  activa: "Activa",
  atrasada: "Atrasada",
  cancelada: "Cancelada",
};

export type HouseStatus =
  | "pendiente"
  | "duda_visitar"
  | "a_coordinar"
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
  /** null para una casa cargada a mano (dueño directo, ficha privada de
   * un colega) - no hay un aviso de portal al que apuntar. */
  url: string | null;
  title: string;
  source: string;
  priceUsd: number | null;
  zone: string | null;
  lat: number | null;
  lng: number | null;
  ambientes: number | null;
  dormitorios: number | null;
  cochera: boolean | null;
  superficieM2: number | null;
  /** Si la propiedad es apta para el crédito hipotecario del caso — a
   * diferencia de `cochera` (dato de la propiedad), esto lo toca la
   * familia/corredor a mano tras averiguar con la inmobiliaria, así que
   * arranca en "no_se". */
  aptoCredito: AptoCredito;
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
  /** Si la compra usa crédito hipotecario o es de contado — cuando es
   * `false`, el resto de los campos de este tipo (banco, monto, cuota,
   * tasa, plazo, condiciones) no se muestran ni se usan en los cálculos
   * de plata necesaria (ver lib/mortgage.ts y sus llamadas). */
  hasCredit: boolean;
  bankName: string;
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

export type TipoCaso = "compra" | "alquiler" | "otro";

/** `activo`: en uso normal. `solo_lectura`: cerrado a mano desde el
 * panel (lib/cases.ts closeCase()) o impago en el período de gracia de
 * 90 días (Mercado Pago, todavía no construido) — la familia sigue
 * viendo su historial pero no puede cargar nada nuevo (bloqueado en
 * proxy.ts). `archivado`: venció la gracia de impago, o de baja — el
 * link deja de funcionar del todo. Ver ARQUITECTURA.md sección 6 y 9. */
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
  plan: Plan;
  subscriptionStatus: SubscriptionStatus;
  /** Fin de la prueba de 14 días sin tarjeta (ver ARQUITECTURA.md
   * sección 6) — se ignora una vez que subscriptionStatus pasa a
   * "activa". */
  trialEndsAt: string;
  /** ID de la suscripción en Mercado Pago — null hasta que esa
   * integración exista (ver ARQUITECTURA.md sección 7/12); mientras
   * tanto subscriptionStatus se edita a mano desde /superadmin. */
  mpPreapprovalId: string | null;
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
  magicLinkToken?: string;
  /** Nombres de la familia — empieza vacío al crear el caso; se edita
   * desde adentro del caso (components/PeopleEditor.tsx, app/api/case/
   * people), no desde el panel del corredor. Alimenta los selectores de
   * autor/asignado en comentarios y checklist (antes un `PEOPLE` global
   * hardcodeado a Lucas/Abril/Carolina). */
  people: string[];
  /** Cuándo pasó a `solo_lectura` (cierre manual o, más adelante,
   * impago) — separado de `updatedAt` porque ese campo se pisa con
   * cualquier cambio (renombrar, regenerar clave) y el cron de 90 días
   * necesita el momento real del cierre, no el de la última edición.
   * `null` mientras el caso está `activo`. Ver ARQUITECTURA.md sección 9. */
  soloLecturaDesde: string | null;
  /** Cuándo inspeccionó el corredor este caso por última vez — para calcular
   * novedades y apagar el badge de cambios no leídos en el panel. */
  brokerLastSeenAt?: string | null;
  /** Cuándo fue la última vez que la familia ingresó o interactuó
   * con este caso. Se actualiza mediante un ping background. */
  familyLastSeenAt?: string | null;
  /** Prueba de consentimiento expreso (clickwrap) de los Términos y la
   * Política de privacidad — versión aceptada y fecha del primer
   * "acepto" real, no del último login. `null`/ausente en casos
   * creados antes de que esto existiera. Ver lib/legal.ts y
   * lib/cases.ts recordTermsAcceptance. */
  terminos?: { version: string; aceptadoEn: string } | null;
  createdAt: string;
  updatedAt: string;
}

export const STATUS_LABEL: Record<HouseStatus, string> = {
  pendiente: "Por revisar",
  duda_visitar: "En duda",
  a_coordinar: "A coordinar",
  coordinada: "Visita agendada",
  gusto: "Nos gustó",
  no_gusto: "No convenció",
  oferta: "En oferta",
  comprada: "Comprada 🎉",
  descartada: "Descartadas",
  borrada: "Papelera",
};

/** Statuses shown as regular search-pipeline tabs, in funnel order
 * (excludes "borrada", which lives in its own recovery tab). */
export const PIPELINE_STATUSES: HouseStatus[] = [
  "pendiente",
  "duda_visitar",
  "a_coordinar",
  "coordinada",
  "gusto",
  "no_gusto",
  "oferta",
  "comprada",
  "descartada",
];
