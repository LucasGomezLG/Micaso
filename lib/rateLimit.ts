import { dbDelete, dbIncrWithTtl, dbPeekCount } from "./db";

// ARQUITECTURA.md sección 8: "rate limiting de login de caso — contador
// de intentos fallidos en Redis con TTL de 15 min; bloquea después de
// 10 intentos — vive en la ruta de login de caso, no en proxy.ts".
const MAX_ATTEMPTS = 10;
const WINDOW_SECONDS = 15 * 60;

function key(scope: string, id: string): string {
  return `ratelimit:${scope}:${id}`;
}

export async function isRateLimited(scope: string, id: string): Promise<boolean> {
  const count = await dbPeekCount(key(scope, id));
  return count >= MAX_ATTEMPTS;
}

export async function recordFailedAttempt(scope: string, id: string): Promise<void> {
  await dbIncrWithTtl(key(scope, id), WINDOW_SECONDS);
}

export async function clearAttempts(scope: string, id: string): Promise<void> {
  await dbDelete(key(scope, id));
}

/** Cuota genérica de ventana fija — a diferencia de isRateLimited/
 * recordFailedAttempt (pensadas para intentos de login fallidos, que se
 * registran aparte del chequeo), esto suma 1 uso y devuelve si ya se
 * pasó del máximo en una sola llamada. Pensado para limitar cuánto puede
 * pegar una ruta cara (como /api/scrape, que hace un fetch saliente por
 * llamada) por sesión de caso, no por IP — el caso ya requiere sesión
 * válida (proxy.ts lo exige), así que lo que hay que evitar es que una
 * sola sesión comprometida o un script mal armado la use sin límite. */
export async function checkAndConsumeQuota(
  scope: string,
  id: string,
  max: number,
  windowSeconds: number
): Promise<boolean> {
  const count = await dbIncrWithTtl(key(scope, id), windowSeconds);
  return count <= max;
}
