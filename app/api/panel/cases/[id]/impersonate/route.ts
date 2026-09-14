import { NextResponse } from "next/server";
import { getCurrentBroker } from "@/lib/brokers";
import { getCase } from "@/lib/cases";
import { CASE_COOKIE } from "@/lib/session";

/** Le da al corredor la misma cookie de sesión que usa la familia, para
 * que entre a /caso con la sesión de Google que ya tiene — reutiliza el
 * dashboard del caso tal cual, sin duplicar páginas ni API. Ver
 * ARQUITECTURA.md sección 4 y 8 ("el corredor los carga... desde la
 * misma pantalla de Criterios que ya existe hoy"). Solo el dueño del
 * caso puede entrar así; un caso archivado no se puede ver ni así. */
export async function POST(
  _request: Request,
  ctx: RouteContext<"/api/panel/cases/[id]/impersonate">
) {
  const { id } = await ctx.params;
  const [broker, kase] = await Promise.all([getCurrentBroker(), getCase(id)]);
  if (!kase || !broker || kase.brokerId !== broker.id) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
  if (kase.estado === "archivado") {
    return NextResponse.json({ error: "Este caso está archivado" }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true });
  res.cookies.set(CASE_COOKIE, kase.id, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 90,
  });
  return res;
}
