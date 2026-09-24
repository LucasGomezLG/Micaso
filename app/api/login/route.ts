import { NextRequest, NextResponse } from "next/server";
import { getCaseByCredentials, getCase, recordTermsAcceptance } from "@/lib/cases";
import { CASE_COOKIE } from "@/lib/session";
import { createCaseSessionToken, readMagicLinkToken, wasIssuedBeforeRotation } from "@/lib/sessionToken";
import { clearAttempts, isRateLimited, recordFailedAttempt } from "@/lib/rateLimit";
import { caseLoginSchema, parseJsonBody } from "@/lib/schemas";

function getClientIp(request: NextRequest): string {
  const forwarded = request.headers.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request);

  if (await isRateLimited("case-login", ip)) {
    return NextResponse.json(
      { error: "Demasiados intentos fallidos. Probá de nuevo en unos minutos." },
      { status: 429 }
    );
  }

  const parsed = await parseJsonBody(request, caseLoginSchema);
  if ("error" in parsed) {
    await recordFailedAttempt("case-login", ip);
    return parsed.error;
  }
  const body = parsed.data;

  let kase = null;

  if (body.token) {
    const magic = readMagicLinkToken(body.token);
    if (magic) {
      kase = await getCase(magic.caseId);
      // Un link compartido antes de "Regenerar clave" ya no entra
      // (SEP23-04, ver wasIssuedBeforeRotation).
      if (kase && wasIssuedBeforeRotation(magic.issuedAt, kase.credencialesRotadasEn)) kase = null;
    }
  } else if (body.username && body.password) {
    kase = await getCaseByCredentials(body.username, body.password);
  } else {
    return NextResponse.json({ error: "Credenciales o token incompletos" }, { status: 400 });
  }

  if (!kase || kase.estado === "archivado") {
    await recordFailedAttempt("case-login", ip);
    return NextResponse.json({ error: "Credenciales inválidas o acceso caducado" }, { status: 401 });
  }

  await clearAttempts("case-login", ip);

  if (body.acceptedTermsVersion) {
    await recordTermsAcceptance(kase.id, body.acceptedTermsVersion);
  }

  const expires = new Date();
  expires.setDate(expires.getDate() + 90);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(CASE_COOKIE, createCaseSessionToken(kase.id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 90, // 90 días
    expires,
  });
  return res;
}
