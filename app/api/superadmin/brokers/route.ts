import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdminEmail, getOrCreateBroker } from "@/lib/brokers";
import { adminBrokerCreateSchema, parseJsonBody } from "@/lib/schemas";

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

  const parsed = await parseJsonBody(request, adminBrokerCreateSchema);
  if ("error" in parsed) return parsed.error;

  const broker = await getOrCreateBroker(parsed.data.email, parsed.data.nombreMarca, null);
  return NextResponse.json({ broker }, { status: 201 });
}
