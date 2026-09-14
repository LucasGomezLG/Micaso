import { NextRequest, NextResponse } from "next/server";
import { getCurrentBroker } from "@/lib/brokers";
import { createCase } from "@/lib/cases";
import { TipoCaso } from "@/lib/types";

const VALID_TIPOS: TipoCaso[] = ["compra", "alquiler", "otro"];

export async function POST(request: NextRequest) {
  const broker = await getCurrentBroker();
  if (!broker) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let body: { titulo?: string; tipoCaso?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  const titulo = body.titulo?.trim();
  if (!titulo) {
    return NextResponse.json({ error: "Falta el título del caso" }, { status: 400 });
  }
  const tipoCaso = VALID_TIPOS.includes(body.tipoCaso as TipoCaso) ? (body.tipoCaso as TipoCaso) : "compra";

  try {
    const kase = await createCase(broker.id, titulo, tipoCaso);
    return NextResponse.json({ case: kase }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "No se pudo crear el caso.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
