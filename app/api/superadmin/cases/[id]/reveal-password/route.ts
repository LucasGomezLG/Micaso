import { NextResponse } from "next/server";
import { getCurrentAdminEmail } from "@/lib/brokers";
import { getCase } from "@/lib/cases";

/** Único lugar de /superadmin que devuelve la contraseña real de un
 * caso — a pedido explícito (botón "Ver contraseña" en AdminCaseCard),
 * no mostrada por default en la lista. La contraseña vive encriptada en
 * la base (ver lib/crypto.ts); getCase ya la desencripta antes de
 * devolverla acá. */
export async function POST(
  _request: Request,
  ctx: RouteContext<"/api/superadmin/cases/[id]/reveal-password">
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

  return NextResponse.json({ password: kase.password });
}
