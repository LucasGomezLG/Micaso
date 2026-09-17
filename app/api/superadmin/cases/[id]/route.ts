import { NextRequest, NextResponse } from "next/server";
import { getCurrentAdminEmail } from "@/lib/brokers";
import { getCase, renameCase } from "@/lib/cases";

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/superadmin/cases/[id]">
) {
  const admin = await getCurrentAdminEmail();
  if (!admin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const kase = await getCase(id);
  if (!kase) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  let body: { titulo?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }
  const titulo = body.titulo?.trim();
  if (!titulo) {
    return NextResponse.json({ error: "Falta el título" }, { status: 400 });
  }

  const updated = await renameCase(id, kase.brokerId, titulo);
  return NextResponse.json({ case: updated });
}
