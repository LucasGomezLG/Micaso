import { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from "crypto";

// AES-256-GCM, no un hash: la contraseña de un caso tiene que poder
// mostrarse de nuevo (botón "Compartir" y "Regenerar clave" en
// CaseRow/AdminCaseCard le muestran el valor real al corredor/admin
// para reenviarlo) — un hash de un solo sentido rompería esa función.
// Reversible pero solo con CASE_SECRET_KEY, que vive en una variable de
// entorno, nunca en la base: si se filtra el JSON de
// /api/superadmin/backup o la base entera queda expuesta, lo que sale
// es texto cifrado, no la contraseña. Ver ARQUITECTURA.md sección 9.
const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;
// Prefijo para distinguir un valor ya encriptado con este esquema de un
// valor legado guardado en texto plano de antes de este cambio —
// decryptSecret devuelve los legados tal cual, sin migración manual.
const PREFIX = "enc1:";

function getKey(): Buffer {
  const raw = process.env.CASE_SECRET_KEY;
  if (!raw) {
    throw new Error(
      "Falta CASE_SECRET_KEY en las variables de entorno (32 bytes en base64, ej. crypto.randomBytes(32).toString('base64'))."
    );
  }
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("CASE_SECRET_KEY debe decodificar a exactamente 32 bytes (AES-256).");
  }
  return key;
}

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return PREFIX + Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

/** Legado sin el prefijo `enc1:` (contraseñas generadas antes de este
 * cambio) se devuelve tal cual, sin encriptar — se re-encripta solo la
 * próxima vez que se regenere esa contraseña puntual, no hace falta una
 * migración aparte. */
export function decryptSecret(stored: string): string {
  if (!stored.startsWith(PREFIX)) {
    return stored;
  }
  const raw = Buffer.from(stored.slice(PREFIX.length), "base64");
  const iv = raw.subarray(0, IV_LENGTH);
  const authTag = raw.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const encrypted = raw.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, getKey(), iv);
  decipher.setAuthTag(authTag);
  const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
  return decrypted.toString("utf8");
}

/** Compara dos strings en tiempo constante — evita que alguien adivine
 * una contraseña de caso carácter por carácter midiendo cuánto tarda
 * cada intento (antes: `===`, que corta apenas encuentra la primera
 * diferencia). Largos distintos igual comparan contra sí mismos para no
 * volver instantáneo el caso más fácil de descartar. */
export function timingSafeStringEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) {
    timingSafeEqual(bufA, bufA);
    return false;
  }
  return timingSafeEqual(bufA, bufB);
}
