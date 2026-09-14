import { cookies } from "next/headers";
import { NextRequest } from "next/server";

export const CASE_COOKIE = "case_id";
export const BROKER_COOKIE = "broker_auth";

// proxy.ts ya bloqueó cualquier request sin un caso válido antes de que
// llegue a un Server Component o Route Handler — si esto tira, es un bug
// de proxy.ts, no un caso a manejar con gracia acá.

/** Server Components (`app/**\/page.tsx`). */
export async function getCaseId(): Promise<string> {
  const store = await cookies();
  const caseId = store.get(CASE_COOKIE)?.value;
  if (!caseId) throw new Error("Falta case_id en la sesión — revisar proxy.ts");
  return caseId;
}

/** Route Handlers (`app/api/**\/route.ts`). */
export function getCaseIdFromRequest(request: NextRequest): string {
  const caseId = request.cookies.get(CASE_COOKIE)?.value;
  if (!caseId) throw new Error("Falta case_id en la sesión — revisar proxy.ts");
  return caseId;
}
