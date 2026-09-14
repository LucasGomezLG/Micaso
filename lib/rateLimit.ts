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
