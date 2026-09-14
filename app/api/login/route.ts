import { NextRequest, NextResponse } from "next/server";
import { SITE_PASSWORD, SITE_USERNAME } from "@/lib/auth";

const COOKIE_NAME = "casa_auth";

export async function POST(request: NextRequest) {
  let body: { username?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  if (body.username !== SITE_USERNAME || body.password !== SITE_PASSWORD) {
    return NextResponse.json({ error: "Usuario o contraseña incorrectos" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, SITE_PASSWORD, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 90, // 90 días
  });
  return res;
}
