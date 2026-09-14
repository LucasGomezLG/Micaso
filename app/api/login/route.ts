import { NextRequest, NextResponse } from "next/server";
import { getCaseByCredentials } from "@/lib/cases";
import { CASE_COOKIE } from "@/lib/session";

export async function POST(request: NextRequest) {
  let body: { username?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  if (!body.username || !body.password) {
    return NextResponse.json({ error: "Usuario o contraseña incorrectos" }, { status: 401 });
  }

  const kase = await getCaseByCredentials(body.username, body.password);
  if (!kase || kase.estado === "archivado") {
    return NextResponse.json({ error: "Usuario o contraseña incorrectos" }, { status: 401 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(CASE_COOKIE, kase.id, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 90, // 90 días
  });
  return res;
}
