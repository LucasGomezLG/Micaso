import { NextRequest, NextResponse } from "next/server";
import { getCurrentBroker, updateBroker } from "@/lib/brokers";
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
