import { auth } from "@/auth";
import { ADMIN_EMAILS, DEV_BROKER_ID, FOUNDER_EMAIL } from "./auth";
import { dbGet, dbUpdate } from "./db";
import { Broker } from "./types";

const BROKERS_KEY = "brokers";
const TRIAL_DAYS = 14;

/** El corredor real detrás de un email de Google. Casi siempre es el
 * email mismo (único y estable) — la única excepción es el mail del
 * propio Lucas, que se mapea al `dev-broker` de siempre para no migrar
 * el caso demo de Lucas y Abril a mano. Ver ARQUITECTURA.md sección 8,
 * "No es solo agregar código". */
export function resolveBrokerId(email: string): string {
  return email === FOUNDER_EMAIL ? DEV_BROKER_ID : email;
}

/** Backfill de los campos de plan/cobro (sumados con /superadmin, ver
 * ARQUITECTURA.md sección 7) para corredores guardados antes de que
 * existieran — mismo patrón que normalizeHouse en lib/store.ts. Sin
 * esto, un corredor viejo (el dev-broker de Lucas, por ejemplo) vendría
 * con `trialEndsAt: undefined` y rompería cualquier lectura que asuma
 * el campo presente. Arranca directo en "activa" (no "prueba") porque
 * estos corredores ya venían usando el panel antes de que la prueba de
 * 14 días existiera como concepto. */
type MaybeLegacyBroker = Omit<Broker, "plan" | "subscriptionStatus" | "trialEndsAt" | "mpPreapprovalId"> &
  Partial<Pick<Broker, "plan" | "subscriptionStatus" | "trialEndsAt" | "mpPreapprovalId">>;

function normalizeBroker(broker: MaybeLegacyBroker): Broker {
  if (broker.plan && broker.subscriptionStatus && broker.trialEndsAt) return broker as Broker;
  const trialEndsAt = new Date(Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString();
  return {
    plan: "para_arrancar",
    subscriptionStatus: "activa",
    trialEndsAt,
    mpPreapprovalId: null,
    ...broker,
  };
}

function normalizeBrokers(brokers: Record<string, Broker>): Record<string, Broker> {
  const normalized: Record<string, Broker> = {};
  for (const [id, broker] of Object.entries(brokers)) {
    normalized[id] = normalizeBroker(broker);
  }
  return normalized;
}

async function getAllBrokers(): Promise<Record<string, Broker>> {
  const brokers = await dbGet<Record<string, Broker>>(BROKERS_KEY);
  return normalizeBrokers(brokers ?? {});
}

/** Crea el corredor la primera vez que entra con Google; en los logins
 * siguientes devuelve el que ya existe tal cual (no pisa nombreMarca ni
 * imagenUrl con lo último de Google — son editables a mano después). */
export async function getOrCreateBroker(
  email: string,
  googleName: string | null | undefined,
  googleImage: string | null | undefined
): Promise<Broker> {
  const id = resolveBrokerId(email);
  const brokers = await dbUpdate<Record<string, Broker>>(BROKERS_KEY, (current) => {
    const brokers = current ?? {};
    if (brokers[id]) return brokers;
    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const broker: Broker = {
      id,
      email,
      nombreMarca: googleName || email,
      imagenUrl: googleImage ?? null,
      plan: "para_arrancar",
      subscriptionStatus: "prueba",
      trialEndsAt,
      mpPreapprovalId: null,
      createdAt: now.toISOString(),
    };
    return { ...brokers, [id]: broker };
  });
  return normalizeBroker(brokers[id]);
}

export async function getBroker(id: string): Promise<Broker | null> {
  const brokers = await getAllBrokers();
  return brokers[id] ?? null;
}

/** Edita a mano lo que `getOrCreateBroker` trajo de Google —
 * `nombreMarca`/`imagenUrl` los cambia el propio corredor desde su
 * panel; `plan`, `subscriptionStatus` y `trialEndsAt` los cambia un
 * admin desde /superadmin, a falta de Mercado Pago conectado (ver
 * ARQUITECTURA.md sección 7). */
export async function updateBroker(
  id: string,
  patch: Partial<Pick<Broker, "nombreMarca" | "imagenUrl" | "plan" | "subscriptionStatus" | "trialEndsAt">>
): Promise<Broker | null> {
  const brokers = await dbUpdate<Record<string, Broker>>(BROKERS_KEY, (current) => {
    const brokers = current ?? {};
    const existing = brokers[id];
    if (!existing) return brokers;
    return { ...brokers, [id]: { ...normalizeBroker(existing), ...patch } };
  });
  return brokers[id] ?? null;
}

/** El corredor de la sesión actual (Auth.js) — null si no hay sesión.
 * proxy.ts ya bloqueó `/panel/*` y `/api/panel/*` sin sesión antes de
 * llegar acá, así que null solo debería pasar si esto se llama desde
 * otro lado. */
export async function getCurrentBroker(): Promise<Broker | null> {
  const session = await auth();
  const email = session?.user?.email;
  if (!email) return null;
  return getOrCreateBroker(email, session.user?.name, session.user?.image);
}

/** El email de la sesión actual, solo si está en ADMIN_EMAILS — null en
 * cualquier otro caso (sin sesión, o logueado pero no admin). proxy.ts ya
 * bloqueó `/superadmin/*` y `/api/superadmin/*` sin esto antes de llegar
 * acá; las rutas lo vuelven a chequear igual, mismo criterio que
 * getCurrentBroker con `/panel/*`. */
export async function getCurrentAdminEmail(): Promise<string | null> {
  const session = await auth();
  const email = session?.user?.email;
  return email && ADMIN_EMAILS.has(email) ? email : null;
}

/** Todos los corredores, más recientes primero — para /superadmin. */
export async function listAllBrokers(): Promise<Broker[]> {
  const brokers = await getAllBrokers();
  return Object.values(brokers).sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}
