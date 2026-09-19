import { createHmac, timingSafeEqual } from "crypto";

/** Firma criptográfica del valor de la cookie `case_id` (ver lib/session.ts)
 * — antes era el UUID del caso en texto plano, así que quien conociera o
 * adivinara un ID podía setear la cookie a mano y entrar sin contraseña
 * (IDOR). En la práctica los IDs son UUIDs random de 128 bits
 * (`crypto.randomUUID()`, ver lib/cases.ts createCase) así que no son
 * adivinables — el riesgo real que esto tapa es más acotado: que un UUID
 * se filtre (historial de navegador, Referer, captura de pantalla) y
 * quede utilizable para siempre sin forma de revocarlo server-side. Firmar
 * con HMAC y un `issuedAt` le pone fecha de vencimiento a esa filtración
 * y evita que se pueda fabricar o alterar un token sin conocer la clave.
 * Reusa CASE_SECRET_KEY (ya exigida por lib/crypto.ts) en vez de pedir una
 * variable de entorno más. */
function getSecret(): string {
  const raw = process.env.CASE_SECRET_KEY;
  if (!raw) {
    throw new Error(
      "Falta CASE_SECRET_KEY en las variables de entorno (32 bytes en base64, ej. crypto.randomBytes(32).toString('base64'))."
    );
  }
  return raw;
}

const MAX_SESSION_AGE_MS = 90 * 24 * 60 * 60 * 1000; // 90 días, igual al maxAge de la cookie

function sign(caseId: string, issuedAt: number): string {
  const hmac = createHmac("sha256", getSecret());
  hmac.update(`${caseId}.${issuedAt}`);
  return hmac.digest("base64url");
}

/** Genera el valor a guardar en la cookie `case_id` — usado por
 * app/api/login, app/api/demo-access y el impersonate del panel, los
 * únicos tres lugares que le dan sesión de caso a un browser. */
export function createCaseSessionToken(caseId: string): string {
  const issuedAt = Date.now();
  return `${caseId}.${issuedAt}.${sign(caseId, issuedAt)}`;
}

/** Valida el token de la cookie y devuelve el caseId real si la firma
 * coincide y no venció — null en cualquier otro caso (formato viejo sin
 * firmar, alterado, o vencido), que los callers tratan igual que "no hay
 * sesión". No usa `===` para comparar la firma: `timingSafeEqual` evita
 * filtrar por tiempo de respuesta cuánto de la firma esperada acertó un
 * intento (mismo criterio que timingSafeStringEqual en lib/crypto.ts). */
export function verifyCaseSessionToken(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [caseId, issuedAtStr, signature] = parts;
  const issuedAt = Number(issuedAtStr);
  if (!caseId || Number.isNaN(issuedAt) || Date.now() - issuedAt > MAX_SESSION_AGE_MS) return null;

  const expected = sign(caseId, issuedAt);
  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!timingSafeEqual(sigBuf, expectedBuf)) return null;
  return caseId;
}

const MAGIC_LINK_MAX_AGE_MS = 15 * 24 * 60 * 60 * 1000; // 15 días para Magic Links

function signMagicLink(caseId: string, issuedAt: number): string {
  const hmac = createHmac("sha256", getSecret());
  hmac.update(`magic.${caseId}.${issuedAt}`);
  return hmac.digest("base64url");
}

/** Genera un token de uso temporal (15 días) para acceder al caso
 * vía enlace directo (Magic Link) desde WhatsApp, evitando contraseñas en URLs. */
export function createMagicLinkToken(caseId: string): string {
  const issuedAt = Date.now();
  return `${caseId}.${issuedAt}.${signMagicLink(caseId, issuedAt)}`;
}

/** Valida el token del Magic Link y devuelve el caseId si es válido. */
export function verifyMagicLinkToken(token: string): string | null {
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [caseId, issuedAtStr, signature] = parts;
  const issuedAt = Number(issuedAtStr);
  if (!caseId || Number.isNaN(issuedAt) || Date.now() - issuedAt > MAGIC_LINK_MAX_AGE_MS) return null;

  const expected = signMagicLink(caseId, issuedAt);
  const sigBuf = Buffer.from(signature);
  const expectedBuf = Buffer.from(expected);
  if (sigBuf.length !== expectedBuf.length) return null;
  if (!timingSafeEqual(sigBuf, expectedBuf)) return null;
  return caseId;
}
