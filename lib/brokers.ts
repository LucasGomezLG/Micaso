import { auth } from "@/auth";
import { DEV_BROKER_ID, FOUNDER_EMAIL } from "./auth";
import { dbGet, dbSet } from "./db";
import { Broker } from "./types";

const BROKERS_KEY = "brokers";

/** El corredor real detrás de un email de Google. Casi siempre es el
 * email mismo (único y estable) — la única excepción es el mail del
 * propio Lucas, que se mapea al `dev-broker` de siempre para no migrar
 * el caso demo de Lucas y Abril a mano. Ver ARQUITECTURA.md sección 8,
 * "No es solo agregar código". */
export function resolveBrokerId(email: string): string {
  return email === FOUNDER_EMAIL ? DEV_BROKER_ID : email;
}

async function getAllBrokers(): Promise<Record<string, Broker>> {
  return (await dbGet<Record<string, Broker>>(BROKERS_KEY)) ?? {};
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
  const brokers = await getAllBrokers();
  const existing = brokers[id];
  if (existing) return existing;

  const broker: Broker = {
    id,
    email,
    nombreMarca: googleName || email,
    imagenUrl: googleImage ?? null,
    createdAt: new Date().toISOString(),
  };
  await dbSet(BROKERS_KEY, { ...brokers, [id]: broker });
  return broker;
}

export async function getBroker(id: string): Promise<Broker | null> {
  const brokers = await getAllBrokers();
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
