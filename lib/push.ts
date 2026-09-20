import webpush from "web-push";
import { dbDelete, dbGet, dbSet, dbUpdate } from "./db";

export interface StoredPushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
  createdAt: string;
}

interface VapidKeys {
  publicKey: string;
  privateKey: string;
}

const VAPID_DB_KEY = "micaso:vapid_keys";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:hola@micaso.com.ar";

const pushKey = (caseId: string) => `case:${caseId}:push_subscriptions`;

/** Obtiene o genera las llaves VAPID persistentes necesarias para firmar Web Push */
export async function getVapidKeys(): Promise<VapidKeys> {
  const envPublic = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || process.env.VAPID_PUBLIC_KEY;
  const envPrivate = process.env.VAPID_PRIVATE_KEY;

  if (envPublic && envPrivate) {
    return { publicKey: envPublic, privateKey: envPrivate };
  }

  // Fallback: buscar o generar llaves estables en base de datos
  const existing = await dbGet<VapidKeys>(VAPID_DB_KEY);
  if (existing?.publicKey && existing?.privateKey) {
    return existing;
  }

  const generated = webpush.generateVAPIDKeys();
  await dbSet(VAPID_DB_KEY, generated);
  return generated;
}

/** Obtiene la clave pública VAPID para que el navegador del cliente se suscriba */
export async function getPublicVapidKey(): Promise<string> {
  const keys = await getVapidKeys();
  return keys.publicKey;
}

/** Guarda una suscripción Web Push asociada estrictamente a un caseId */
export async function saveCaseSubscription(
  caseId: string,
  subscription: webpush.PushSubscription | { endpoint: string; keys: { p256dh: string; auth: string } }
): Promise<void> {
  if (caseId === "demo") return;

  if (!subscription.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
    return;
  }

  const entry: StoredPushSubscription = {
    endpoint: subscription.endpoint,
    keys: {
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
    createdAt: new Date().toISOString(),
  };

  await dbUpdate<StoredPushSubscription[]>(pushKey(caseId), (current) => {
    const list = current ?? [];
    // Evitar duplicados por endpoint
    const filtered = list.filter((s) => s.endpoint !== entry.endpoint);
    return [...filtered, entry];
  });
}

/** Elimina una suscripción Web Push (ej: al cerrar sesión o revocar permisos) */
export async function removeCaseSubscription(caseId: string, endpoint: string): Promise<void> {
  await dbUpdate<StoredPushSubscription[]>(pushKey(caseId), (current) => {
    const list = current ?? [];
    return list.filter((s) => s.endpoint !== endpoint);
  });
}

/** Borra TODAS las suscripciones Web Push de un caso de una sola vez —
 * usado por deleteCaseData (lib/store.ts) al borrar un caso para
 * siempre. Sin esto, `case:{caseId}:push_subscriptions` quedaba
 * huérfano en Redis después de borrar el caso (Gemini CON-05, ver
 * ARQUITECTURA.md sección 9) — nada de seguridad (nadie puede leer eso
 * desde afuera), solo una clave que nunca se limpiaba. */
export async function deleteCaseSubscriptions(caseId: string): Promise<void> {
  await dbDelete(pushKey(caseId));
}

/** Suscripciones Web Push guardadas para un caso puntual — usado por los
 * tests de aislamiento (ver test/notifications.test.mts) y disponible
 * para cualquier pantalla futura que quiera mostrar cuántos dispositivos
 * tiene suscriptos un caso. */
export async function getCaseSubscriptions(caseId: string): Promise<StoredPushSubscription[]> {
  return (await dbGet<StoredPushSubscription[]>(pushKey(caseId))) ?? [];
}

/** Notifica a todos los dispositivos registrados en este caso (aislamiento total por caseId) */
export async function notifyCaseClients(
  caseId: string,
  payload: { title: string; body: string; url?: string }
): Promise<number> {
  if (caseId === "demo") return 0;

  const subscriptions = (await dbGet<StoredPushSubscription[]>(pushKey(caseId))) ?? [];
  if (subscriptions.length === 0) return 0;

  const { publicKey, privateKey } = await getVapidKeys();
  webpush.setVapidDetails(VAPID_SUBJECT, publicKey, privateKey);

  const payloadString = JSON.stringify({
    title: payload.title,
    body: payload.body,
    url: payload.url || "/caso",
  });

  const deadEndpoints: string[] = [];
  let sentCount = 0;

  await Promise.all(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.keys.p256dh,
              auth: sub.keys.auth,
            },
          },
          payloadString
        );
        sentCount++;
      } catch (err: unknown) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        // 404 Not Found o 410 Gone indican que la suscripción expiró o fue revocada en el navegador
        if (statusCode === 404 || statusCode === 410) {
          deadEndpoints.push(sub.endpoint);
        }
      }
    })
  );

  // Limpieza en segundo plano de tokens caducados
  if (deadEndpoints.length > 0) {
    await dbUpdate<StoredPushSubscription[]>(pushKey(caseId), (current) => {
      const list = current ?? [];
      return list.filter((s) => !deadEndpoints.includes(s.endpoint));
    });
  }

  return sentCount;
}
