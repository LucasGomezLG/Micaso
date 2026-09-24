// Chequeo rápido de que las operaciones de lib/db.ts funcionan contra un
// Redis real (Upstash), no solo contra el archivo local de desarrollo y
// los tests. Lo que no se puede probar sin la base real (AUDITORIA-2026-09-23.md):
// - dbIncrWithTtl: MULTI con INCR + EXPIRE … NX (SEP23-18). Si Upstash
//   no lo aceptara, fallarían las fotos por /api/image, el scraper y el
//   rate limit del login.
// - withLock (SEP23-20) y dbUpdate, que usan SET NX EX.
//
// Solo toca claves `smoke-test:<uuid>:*`, con vencimiento de 60 s, y las
// borra al terminar — no lee ni cambia ningún dato de la app. Se puede
// correr contra producción.
//
// Uso (credenciales en un archivo aparte, nunca en .env.local):
//   vercel env pull .env.produccion --environment=production
//   node --env-file=.env.produccion --import tsx scripts/check-redis.mts
import { Redis } from "@upstash/redis";
import { dbDelete, dbIncrWithTtl, dbUpdate, isUsingRemoteDb, withLock } from "../lib/db";

const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  if (!ok) failures++;
  console.log(`${ok ? "✔" : "✖"} ${name}${detail ? ` — ${detail}` : ""}`);
}

async function main() {
  if (!isUsingRemoteDb() || !url || !token) {
    console.log("No hay credenciales de Redis: esto correría contra el archivo local. Pasale un --env-file con las de Upstash.");
    process.exit(1);
  }
  console.log(`Redis: ${new URL(url).host}\n`);
  const raw = new Redis({ url, token });
  const prefix = `smoke-test:${crypto.randomUUID()}`;
  const counter = `${prefix}:counter`;
  const stuck = `${prefix}:stuck`;
  const data = `${prefix}:data`;

  try {
    // 1. Contador con vencimiento (MULTI + INCR + EXPIRE NX).
    const first = await dbIncrWithTtl(counter, 60);
    const second = await dbIncrWithTtl(counter, 60);
    const ttl = await raw.ttl(counter);
    check("dbIncrWithTtl cuenta", first === 1 && second === 2, `devolvió ${first}, ${second}`);
    check("dbIncrWithTtl deja vencimiento", ttl > 0 && ttl <= 60, `TTL ${ttl} s`);

    // 2. Una clave que quedó sin vencimiento (como con el INCR + EXPIRE
    //    viejo) recupera uno con el primer uso.
    await raw.set(stuck, 5);
    const healed = await dbIncrWithTtl(stuck, 60);
    const healedTtl = await raw.ttl(stuck);
    check("una clave sin vencimiento se arregla sola", healed === 6 && healedTtl > 0, `valor ${healed}, TTL ${healedTtl} s`);

    // 3. dbUpdate (lock SET NX EX + read-modify-write).
    await Promise.all([1, 2, 3].map(() => dbUpdate<number>(data, (n) => (n ?? 0) + 1)));
    const total = await raw.get<number>(data);
    check("dbUpdate no pierde escrituras concurrentes", total === 3, `quedó ${total}`);

    // 4. withLock: dos secciones con el mismo nombre no se pisan.
    let inside = 0;
    let maxInside = 0;
    const section = async () => {
      inside++;
      maxInside = Math.max(maxInside, inside);
      await new Promise((resolve) => setTimeout(resolve, 150));
      inside--;
    };
    await Promise.all([withLock(`${prefix}:lock`, section), withLock(`${prefix}:lock`, section)]);
    check("withLock excluye", maxInside === 1, `máximo adentro a la vez: ${maxInside}`);
  } catch (err) {
    failures++;
    console.log(`✖ error: ${(err as Error).message}`);
  } finally {
    for (const key of [counter, stuck, data]) await dbDelete(key).catch(() => {});
  }

  console.log(failures === 0 ? "\nTodo OK." : `\n${failures} chequeo(s) fallaron.`);
  process.exit(failures === 0 ? 0 : 1);
}

main();
