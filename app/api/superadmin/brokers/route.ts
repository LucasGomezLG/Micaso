import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdminEmail, getOrCreateBroker } from "@/lib/brokers";

/** Alta manual de un corredor sin pasar por su propio login de Google —
 * pensado para dar de alta a Carolina antes de que la landing esté
 * pública (ver ARQUITECTURA.md sección 7). Reutiliza getOrCreateBroker:
 * si el email ya existe, no lo pisa (mismo comportamiento que un
 * corredor entrando por primera vez con Google). */
export async function POST(request: NextRequest) {
  const admin = await getCurrentAdminEmail();
  if (!admin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let body: { email?: string; nombreMarca?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }
  const email = body.email?.trim().toLowerCase();
  const nombreMarca = body.nombreMarca?.trim();
  if (!email || !nombreMarca) {
    return NextResponse.json({ error: "Falta el email o el nombre" }, { status: 400 });
  }

  const broker = await getOrCreateBroker(email, nombreMarca, null);
  return NextResponse.json({ broker }, { status: 201 });
}
