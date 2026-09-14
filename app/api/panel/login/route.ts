import { NextRequest, NextResponse } from "next/server";
import { BROKER_PASSWORD, BROKER_USERNAME } from "@/lib/auth";
import { BROKER_COOKIE } from "@/lib/session";

export async function POST(request: NextRequest) {
  let body: { username?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  if (body.username !== BROKER_USERNAME || body.password !== BROKER_PASSWORD) {
    return NextResponse.json({ error: "Usuario o contraseña incorrectos" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(BROKER_COOKIE, BROKER_PASSWORD, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30, // 30 días
  });
  return res;
}
