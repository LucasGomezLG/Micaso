import { NextRequest, NextResponse } from "next/server";
import { getCurrentBroker } from "@/lib/brokers";
import { createCase } from "@/lib/cases";
import { panelCaseCreateSchema, parseJsonBody } from "@/lib/schemas";

export async function POST(request: NextRequest) {
  const broker = await getCurrentBroker();
  if (!broker) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const parsed = await parseJsonBody(request, panelCaseCreateSchema);
  if ("error" in parsed) return parsed.error;
  const body = parsed.data;

  const tipoCaso = body.tipoCaso ?? "compra";

  let initialPeople: string[] = [];
  if (Array.isArray(body.people)) {
    initialPeople = body.people.filter((p) => p.trim().length > 0);
  } else if (typeof body.people === "string") {
    initialPeople = body.people.split(",").map((p) => p.trim()).filter(Boolean);
  }

  try {
    const kase = await createCase(broker.id, body.titulo, tipoCaso, initialPeople);
    return NextResponse.json({ case: kase }, { status: 201 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "No se pudo crear el caso.";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
