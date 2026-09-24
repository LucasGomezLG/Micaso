import { NextRequest, NextResponse } from "next/server";
import { getCurrentBroker } from "@/lib/brokers";
import { deleteCase, getCaseForBroker, renameCase } from "@/lib/cases";
import { caseRenameSchema, parseJsonBody } from "@/lib/schemas";
import { deleteCaseData } from "@/lib/store";

export async function PATCH(
  request: NextRequest,
  ctx: RouteContext<"/api/panel/cases/[id]">
) {
  const { id } = await ctx.params;
  const broker = await getCurrentBroker();
  if (!broker) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
  const kase = await getCaseForBroker(id, broker.id);
  if (!kase) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const parsed = await parseJsonBody(request, caseRenameSchema);
  if ("error" in parsed) return parsed.error;

  const updated = await renameCase(id, broker.id, parsed.data.titulo);
  return NextResponse.json({ case: updated });
}

/** Borrado definitivo desde el panel del corredor — a diferencia del de
 * /superadmin (pensado para limpiar casos de prueba), este exige que el
 * caso ya esté cerrado (solo_lectura o archivado) antes de poder
 * borrarlo, para que no sea un atajo accidental frente a "Cerrar caso".
 * Borra también casas/checklist/criterios (lib/store.ts). */
export async function DELETE(
  _request: NextRequest,
  ctx: RouteContext<"/api/panel/cases/[id]">
) {
  const { id } = await ctx.params;
  const broker = await getCurrentBroker();
  if (!broker) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
  const kase = await getCaseForBroker(id, broker.id);
  if (!kase) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
  if (kase.estado === "activo") {
    return NextResponse.json({ error: "Cerrá el caso antes de borrarlo." }, { status: 400 });
  }

  await deleteCase(id, broker.id);
  await deleteCaseData(id, broker.id);
  return NextResponse.json({ ok: true });
}
