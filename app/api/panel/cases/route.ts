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

  let body: { titulo?: string; tipoCaso?: string; people?: unknown };
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

  let initialPeople: string[] = [];
  if (Array.isArray(body.people)) {
    initialPeople = body.people.filter((p): p is string => typeof p === "string" && p.trim().length > 0);
  } else if (typeof body.people === "string") {
    initialPeople = body.people.split(",").map((p) => p.trim()).filter(Boolean);
  }

  try {
    const kase = await createCase(broker.id, titulo, tipoCaso, initialPeople);
    return NextResponse.json({ case: kase }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "No se pudo crear el caso.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
