import { NextRequest, NextResponse } from "next/server";
import { getCaseByCredentials } from "@/lib/cases";
import { CASE_COOKIE } from "@/lib/session";
import { createCaseSessionToken } from "@/lib/sessionToken";
import { clearAttempts, isRateLimited, recordFailedAttempt } from "@/lib/rateLimit";

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

  let body: { username?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  if (!body.username || !body.password) {
    await recordFailedAttempt("case-login", ip);
    return NextResponse.json({ error: "Usuario o contraseña incorrectos" }, { status: 401 });
  }

  const kase = await getCaseByCredentials(body.username, body.password);
  if (!kase || kase.estado === "archivado") {
    await recordFailedAttempt("case-login", ip);
    return NextResponse.json({ error: "Usuario o contraseña incorrectos" }, { status: 401 });
  }

  await clearAttempts("case-login", ip);

  const res = NextResponse.json({ ok: true });
  res.cookies.set(CASE_COOKIE, createCaseSessionToken(kase.id), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 90, // 90 días
  });
  return res;
}
