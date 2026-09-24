import { cache } from "react";
import { auth } from "@/auth";
import { ADMIN_EMAILS, DEV_BROKER_ID, FOUNDER_EMAIL } from "./auth";
import { dbDelete, dbGet, dbMultiGet, dbUpdate } from "./db";
import { Broker, PaymentRecord } from "./types";

// Esquema de claves (migración ARC-01/DAT-01, sept 2026): antes
// "brokers" era un único blob JSON con todos los corredores — ver el
// mismo comentario en lib/cases.ts, que tenía exactamente el mismo
// problema con "cases". `DELETED_BROKERS_KEY` queda como blob único a
// propósito: son tombstones de bajas manuales desde /superadmin, una
// lista chica y acotada que no crece con la plataforma (a diferencia de
// "brokers", que crecía con cada corredor nuevo).
const brokerKey = (id: string) => `broker:${id}:meta`;
const ALL_BROKER_IDS_KEY = "all_broker_ids";
const TRIAL_DAYS = 14;

/** IDs de corredores borrados a mano desde /superadmin — un tombstone,
 * no un valor derivable de `brokers` (que ya no tiene el registro una
 * vez borrado). Sin esto, un corredor dado de baja podía "resucitar"
 * solo con tener su cookie de sesión de Google todavía viva (dura hasta
 * 30 días, ver auth.ts): getCurrentBroker() llamaba a getOrCreateBroker
 * sin distinguir "nunca existió" de "existió y se borró", así que lo
 * recreaba con un período de prueba nuevo de 14 días. */
const DELETED_BROKERS_KEY = "deleted_broker_ids";

export async function isBrokerDeleted(id: string): Promise<boolean> {
  const deleted = await dbGet<Record<string, true>>(DELETED_BROKERS_KEY);
  return Boolean(deleted && Object.prototype.hasOwnProperty.call(deleted, id));
}

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

async function addToAllBrokerIds(id: string): Promise<void> {
  await dbUpdate<string[]>(ALL_BROKER_IDS_KEY, (current) => {
    const ids = current ?? [];
    return ids.includes(id) ? ids : [id, ...ids];
  });
}

async function removeFromAllBrokerIds(id: string): Promise<void> {
  await dbUpdate<string[]>(ALL_BROKER_IDS_KEY, (current) => (current ?? []).filter((existing) => existing !== id));
}

/** Crea el corredor la primera vez que entra con Google; en los logins
 * siguientes devuelve el que ya existe tal cual (no pisa nombreMarca ni
 * imagenUrl con lo último de Google — son editables a mano después). El
 * chequeo y la creación pasan por dbUpdate sobre la clave de ESTE
 * corredor puntual, para que dos requests casi simultáneas del primer
 * login de alguien no se pisen entre sí (antes competían con la clave
 * "brokers" completa, compartida por todo el mundo). */
export async function getOrCreateBroker(
  email: string,
  googleName: string | null | undefined,
  googleImage: string | null | undefined
): Promise<Broker> {
  const id = resolveBrokerId(email);
  // Camino común (el corredor ya existe): una sola lectura. getCurrentBroker
  // llama a esto en cada render del panel y en cada ruta de /api/panel/*,
  // y el dbUpdate de abajo son ~6 comandos de Redis con lock aunque no
  // cambie nada (SEP23-19, AUDITORIA-2026-09-23.md) — queda solo para la
  // primera vez, donde sí importa que dos requests simultáneas no se pisen.
  const existing = await dbGet<Broker>(brokerKey(id));
  if (existing) return normalizeBroker(existing);

  let created = false;
  const broker = await dbUpdate<Broker>(brokerKey(id), (current) => {
    if (current) return current;
    created = true;
    const now = new Date();
    const trialEndsAt = new Date(now.getTime() + TRIAL_DAYS * 24 * 60 * 60 * 1000).toISOString();
    return {
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
  });
  if (created) {
    // Una creación real (a mano desde /superadmin, o un corredor nuevo de
    // verdad) saca cualquier tombstone previo — si alguna vez se lo borró y
    // ahora un admin lo vuelve a dar de alta a propósito, no debería seguir
    // bloqueado (ver isBrokerDeleted, usado por getCurrentBroker).
    await Promise.all([
      addToAllBrokerIds(id),
      dbUpdate<Record<string, true>>(DELETED_BROKERS_KEY, (current) => {
        if (!current || !Object.prototype.hasOwnProperty.call(current, id)) return current ?? {};
        const next = { ...current };
        delete next[id];
        return next;
      }),
    ]);
  }
  return normalizeBroker(broker);
}

export const getBroker = cache(async function getBroker(id: string): Promise<Broker | null> {
  const broker = await dbGet<Broker>(brokerKey(id));
  return broker ? normalizeBroker(broker) : null;
});

/** Edita a mano lo que `getOrCreateBroker` trajo de Google —
 * `nombreMarca`/`imagenUrl` los cambia el propio corredor desde su
 * panel; `plan`, `subscriptionStatus` y `trialEndsAt` los cambia un
 * admin desde /superadmin, a falta de Mercado Pago conectado (ver
 * ARQUITECTURA.md sección 7). */
export async function updateBroker(
  id: string,
  patch: Partial<
    Pick<Broker, "nombreMarca" | "imagenUrl" | "plan" | "subscriptionStatus" | "trialEndsAt" | "mpPreapprovalId" | "mpReplacedPreapprovalIds">
  >
): Promise<Broker | null> {
  return dbUpdate<Broker | null>(brokerKey(id), (current) =>
    current === null ? null : { ...normalizeBroker(current), ...patch }
  );
}

/** El corredor de la sesión actual (Auth.js) — null si no hay sesión.
 * proxy.ts ya bloqueó `/panel/*` y `/api/panel/*` sin sesión antes de
 * llegar acá, así que null solo debería pasar si esto se llama desde
 * otro lado. */
export async function getCurrentBroker(): Promise<Broker | null> {
  const session = await auth();
  let email = session?.user?.email;
  if (!email && process.env.NODE_ENV !== "production") {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    email = cookieStore.get("micaso_dev_user")?.value;
  }
  if (!email) return null;
  const id = resolveBrokerId(email);
  if (await isBrokerDeleted(id)) return null;
  return getOrCreateBroker(email, session?.user?.name, session?.user?.image);
}

/** El email de la sesión actual, solo si está en ADMIN_EMAILS — null en
 * cualquier otro caso (sin sesión, o logueado pero no admin). proxy.ts ya
 * bloqueó `/superadmin/*` y `/api/superadmin/*` sin esto antes de llegar
 * acá; las rutas lo vuelven a chequear igual, mismo criterio que
 * getCurrentBroker con `/panel/*`. */
export async function getCurrentAdminEmail(): Promise<string | null> {
  const session = await auth();
  let email = session?.user?.email;
  if (!email && process.env.NODE_ENV !== "production") {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    email = cookieStore.get("micaso_dev_user")?.value;
  }
  return email && ADMIN_EMAILS.has(email) ? email : null;
}

/** Borrado definitivo de un corredor — sin cascada acá a propósito, para
 * no acoplar este archivo a lib/cases.ts (que ya importa de este). No
 * llamarla directo desde una ruta: deleteBrokerCascade
 * (lib/brokerDeletion.ts) borra antes sus casos y su suscripción, y
 * termina llamando a esta. */
export async function deleteBroker(id: string): Promise<boolean> {
  const existing = await dbGet<Broker>(brokerKey(id));
  if (!existing) return false;
  await dbDelete(brokerKey(id));
  await Promise.all([
    removeFromAllBrokerIds(id),
    dbUpdate<Record<string, true>>(DELETED_BROKERS_KEY, (current) => ({ ...(current ?? {}), [id]: true })),
  ]);
  return true;
}

/** Todos los corredores, más recientes primero — para /superadmin. */
export async function listAllBrokers(): Promise<Broker[]> {
  const ids = await dbGet<string[]>(ALL_BROKER_IDS_KEY);
  if (!ids || ids.length === 0) return [];
  const brokers = await dbMultiGet<Broker>(ids.map(brokerKey));
  return brokers
    .filter((b): b is Broker => b !== null)
    .map(normalizeBroker)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

const brokerPaymentsKey = (brokerId: string) => `broker:${brokerId}:payments`;

/** Registra un nuevo pago recibido por Mercado Pago */
export async function addBrokerPayment(brokerId: string, payment: PaymentRecord): Promise<void> {
  await dbUpdate<PaymentRecord[]>(brokerPaymentsKey(brokerId), (current) => {
    const list = current ?? [];
    // Evitar registrar pagos duplicados por ID de Mercado Pago
    if (list.some((p) => p.id === payment.id)) return list;
    return [payment, ...list];
  });
}

/** Devuelve el historial de pagos de un corredor, los más recientes primero */
export async function getBrokerPayments(brokerId: string): Promise<PaymentRecord[]> {
  const payments = await dbGet<PaymentRecord[]>(brokerPaymentsKey(brokerId));
  return (payments ?? []).sort((a, b) => (a.date < b.date ? 1 : -1));
}
