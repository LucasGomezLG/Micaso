import { Redis } from "@upstash/redis";
import { promises as fs } from "fs";
import path from "path";

const url =
  process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const token =
  process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

const redis = url && token ? new Redis({ url, token }) : null;

// Override solo para tests (ver test/isolation.test.ts) — así corren
// contra un archivo temporal propio en vez de pisar `.data/store.json`,
// que además usa el dev server local mientras se prueba a mano.
const LOCAL_DB_PATH =
  process.env.MICASO_LOCAL_DB_PATH || path.join(process.cwd(), ".data", "store.json");

async function readLocalStore(): Promise<Record<string, unknown>> {
  try {
    const raw = await fs.readFile(/*turbopackIgnore: true*/ LOCAL_DB_PATH, "utf-8");
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

async function writeLocalStore(data: Record<string, unknown>): Promise<void> {
  await fs.mkdir(path.dirname(LOCAL_DB_PATH), { recursive: true });
  await fs.writeFile(LOCAL_DB_PATH, JSON.stringify(data, null, 2), "utf-8");
}

/** El fallback local no tiene transacciones — cada operación hace su
 * propio read-modify-write de todo el archivo. Sin este lock, dos
 * requests concurrentes (dos tabs, un login mientras se prueba otra
 * cosa) intercalan sus read-modify-write y la segunda escritura pisa
 * por completo lo que la primera acababa de guardar — pasó de verdad
 * una vez (perdió `brokers` y los datos del caso demo). En Redis
 * (producción) esto no existe: SET/INCR ya son atómicos del lado del
 * servidor, este lock solo aplica al fallback de archivo local.
 *
 * Tiene que ser un lock de ARCHIVO, no una promesa en memoria (15 sept
 * 2026): en `next dev` con Turbopack cada route handler (y el
 * middleware, aparte) se compila bajo demanda como su propio módulo, así
 * que este archivo se carga como una instancia separada por cada uno,
 * cada una con su propia variable de módulo — una promesa en memoria acá
 * solo serializa llamadas dentro de la MISMA instancia, no entre rutas
 * distintas. Se encontró probando la carga a mano de una casa con el
 * navegador real: el caso recién creado desaparecía porque el load de
 * /caso/casas dispara varios fetches en paralelo (houses, checklist,
 * criteria, ...) que la primera vez cada uno compila su propio módulo, y
 * dos de esos módulos pisaban el archivo entero sin verse entre sí. Un
 * archivo de lock en disco sí es compartido por todas las instancias del
 * mismo proceso (y protegería igual si hubiera más de un proceso). */
const LOCK_PATH = LOCAL_DB_PATH + ".lock";
const LOCK_STALE_MS = 10_000;
const LOCK_RETRY_MS = 20;

async function acquireFileLock(): Promise<void> {
  for (;;) {
    try {
      const handle = await fs.open(LOCK_PATH, "wx");
      await handle.close();
      return;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "EEXIST") throw err;
      try {
        const stat = await fs.stat(LOCK_PATH);
        if (Date.now() - stat.mtimeMs > LOCK_STALE_MS) {
          // Nadie debería tardar 10s en un read-modify-write de un
          // archivo JSON local - si el lock lleva más que eso, es de un
          // proceso que murió sin liberarlo (ctrl-C a mitad de camino),
          // no una operación legítima en curso.
          await fs.unlink(LOCK_PATH).catch(() => {});
          continue;
        }
      } catch {
        // El lock desapareció entre el open fallido y este stat (otro
        // proceso ya lo liberó) - reintentar ya mismo.
      }
      await new Promise((resolve) => setTimeout(resolve, LOCK_RETRY_MS));
    }
  }
}

async function releaseFileLock(): Promise<void> {
  await fs.unlink(LOCK_PATH).catch(() => {});
}

async function withLocalStoreLock<T>(fn: () => Promise<T>): Promise<T> {
  await acquireFileLock();
  try {
    return await fn();
  } finally {
    await releaseFileLock();
  }
}

export async function dbGet<T>(key: string): Promise<T | null> {
  if (redis) {
    const value = await redis.get<T>(key);
    return value ?? null;
  }
  return withLocalStoreLock(async () => {
    const store = await readLocalStore();
    return (store[key] as T) ?? null;
  });
}

export async function dbSet<T>(key: string, value: T): Promise<void> {
  if (redis) {
    await redis.set(key, value);
    return;
  }
  await withLocalStoreLock(async () => {
    const store = await readLocalStore();
    store[key] = value;
    await writeLocalStore(store);
  });
}

/** Lee, modifica y guarda una clave como una sola operación — a
 * diferencia de hacer `dbGet` y `dbSet` por separado (lo que rompió de
 * verdad una vez: dos requests concurrentes leen el mismo valor viejo,
 * y el segundo `dbSet` pisa por completo lo que el primero acababa de
 * guardar). `mutate` debe ser sincrónica: no debe leer ni escribir
 * ninguna otra clave — si lo hiciera, reentraría en el mismo lock
 * local y quedaría trabada para siempre. Si necesitás datos de otra
 * clave para decidir el nuevo valor, resolvelos ANTES de llamar a
 * dbUpdate y pasáselos ya calculados a `mutate`.
 *
 * En Redis no es una transacción real (no hay WATCH/MULTI acá) — dos
 * requests concurrentes en producción podrían todavía pisarse. Es un
 * riesgo menor que el del fallback local (Vercel rara vez sirve dos
 * requests al mismo tiempo para el mismo caso) pero sigue abierto; ver
 * ARQUITECTURA.md sección 9. */
export async function dbUpdate<T>(key: string, mutate: (current: T | null) => T): Promise<T> {
  if (redis) {
    const current = await redis.get<T>(key);
    const next = mutate(current ?? null);
    await redis.set(key, next);
    return next;
  }
  return withLocalStoreLock(async () => {
    const store = await readLocalStore();
    const next = mutate((store[key] as T) ?? null);
    store[key] = next;
    await writeLocalStore(store);
    return next;
  });
}

/** True when reads/writes go to real Redis instead of the local dev file. */
export function isUsingRemoteDb(): boolean {
  return redis !== null;
}

type Counter = { count: number; expiresAt: number };

/** Suma 1 a un contador con vencimiento — lo crea con el TTL dado si no
 * existe o si ya venció. Usado para rate limiting (ver lib/rateLimit.ts). */
export async function dbIncrWithTtl(key: string, ttlSeconds: number): Promise<number> {
  if (redis) {
    const count = await redis.incr(key);
    if (count === 1) await redis.expire(key, ttlSeconds);
    return count;
  }
  return withLocalStoreLock(async () => {
    const store = await readLocalStore();
    const existing = store[key] as Counter | undefined;
    const now = Date.now();
    if (existing && existing.expiresAt > now) {
      existing.count += 1;
      store[key] = existing;
      await writeLocalStore(store);
      return existing.count;
    }
    const fresh: Counter = { count: 1, expiresAt: now + ttlSeconds * 1000 };
    store[key] = fresh;
    await writeLocalStore(store);
    return 1;
  });
}

/** Lee el contador actual sin incrementarlo (0 si no existe o venció). */
export async function dbPeekCount(key: string): Promise<number> {
  if (redis) {
    return (await redis.get<number>(key)) ?? 0;
  }
  return withLocalStoreLock(async () => {
    const store = await readLocalStore();
    const existing = store[key] as Counter | undefined;
    if (!existing || existing.expiresAt <= Date.now()) return 0;
    return existing.count;
  });
}

/** Resuelve varias claves en un solo viaje — a diferencia de disparar un
 * `dbGet` por clave con `Promise.all` (que igual manda N requests HTTP
 * separadas a Upstash), esto usa `MGET`, una sola request para todas.
 * Pensado para resolver una lista de IDs (el índice de casos de un
 * corredor, por ejemplo) a sus objetos completos sin que el costo crezca
 * con la cantidad de IDs. El orden del resultado respeta el de `keys`, y
 * una clave inexistente devuelve `null` en su posición. */
export async function dbMultiGet<T>(keys: string[]): Promise<(T | null)[]> {
  if (keys.length === 0) return [];
  if (redis) {
    const values = await redis.mget<T[]>(...keys);
    return values.map((v) => v ?? null);
  }
  return withLocalStoreLock(async () => {
    const store = await readLocalStore();
    return keys.map((key) => (store[key] as T) ?? null);
  });
}

export async function dbDelete(key: string): Promise<void> {
  if (redis) {
    await redis.del(key);
    return;
  }
  await withLocalStoreLock(async () => {
    const store = await readLocalStore();
    delete store[key];
    await writeLocalStore(store);
  });
}
