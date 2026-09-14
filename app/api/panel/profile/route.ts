import { NextRequest, NextResponse } from "next/server";
import { getCurrentBroker, updateBroker } from "@/lib/brokers";

export async function PATCH(request: NextRequest) {
  const broker = await getCurrentBroker();
  if (!broker) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let body: { nombreMarca?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }
  const nombreMarca = body.nombreMarca?.trim();
  if (!nombreMarca) {
    return NextResponse.json({ error: "Falta el nombre" }, { status: 400 });
  }

  const updated = await updateBroker(broker.id, { nombreMarca });
  return NextResponse.json({ broker: updated });
}
