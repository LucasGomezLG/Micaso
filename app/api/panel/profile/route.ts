import { NextRequest, NextResponse } from "next/server";
import { getCurrentBroker, updateBroker } from "@/lib/brokers";
import { deleteBrokerCascade } from "@/lib/brokerDeletion";
import { brokerProfilePatchSchema, parseJsonBody } from "@/lib/schemas";

export async function PATCH(request: NextRequest) {
  const broker = await getCurrentBroker();
  if (!broker) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const parsed = await parseJsonBody(request, brokerProfilePatchSchema);
  if ("error" in parsed) return parsed.error;

  const updated = await updateBroker(broker.id, parsed.data);
  return NextResponse.json({ broker: updated });
}

export async function DELETE() {
  const broker = await getCurrentBroker();
  if (!broker) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    // En cascada: suscripción, casos y datos de cada caso — ver
    // lib/brokerDeletion.ts (SEP23-02).
    await deleteBrokerCascade(broker.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error al eliminar cuenta:", err);
    return NextResponse.json({ error: "No se pudo eliminar la cuenta" }, { status: 500 });
  }
}
