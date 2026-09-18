import { cookies } from "next/headers";
import { NextRequest } from "next/server";
import { verifyCaseSessionToken } from "./sessionToken";

export const CASE_COOKIE = "case_id";
// La sesión del corredor la maneja Auth.js (ver auth.ts) — no hay
// cookie propia acá.

// proxy.ts ya bloqueó cualquier request sin un caso válido antes de que
// llegue a un Server Component o Route Handler — si esto tira, es un bug
// de proxy.ts, no un caso a manejar con gracia acá. El valor de la
// cookie es un token firmado (ver lib/sessionToken.ts), no el caseId
// crudo — proxy.ts ya lo verificó también, así que si llega hasta acá
// sin firma válida es la misma situación: un bug de proxy.ts.

/** Server Components (`app/**\/page.tsx`). */
export async function getCaseId(): Promise<string> {
  const store = await cookies();
  const token = store.get(CASE_COOKIE)?.value;
  const caseId = token ? verifyCaseSessionToken(token) : null;
  if (!caseId) throw new Error("Falta case_id en la sesión — revisar proxy.ts");
  return caseId;
}

/** Route Handlers (`app/api/**\/route.ts`). */
export function getCaseIdFromRequest(request: NextRequest): string {
  const token = request.cookies.get(CASE_COOKIE)?.value;
  const caseId = token ? verifyCaseSessionToken(token) : null;
  if (!caseId) throw new Error("Falta case_id en la sesión — revisar proxy.ts");
  return caseId;
}
