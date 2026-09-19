import { NextRequest, NextResponse } from "next/server";
import { getCaseIdFromRequest } from "@/lib/session";
import { getPublicVapidKey, removeCaseSubscription, saveCaseSubscription } from "@/lib/push";
import { parseJsonBody, pushSubscribeSchema, pushUnsubscribeSchema } from "@/lib/schemas";

/** Devuelve la clave pública VAPID para que el cliente pueda suscribirse */
export async function GET() {
  try {
    const publicKey = await getPublicVapidKey();
    return NextResponse.json({ publicKey });
  } catch {
    return NextResponse.json({ error: "No se pudo obtener la clave de notificaciones" }, { status: 500 });
  }
}

/** Registra una suscripción Web Push para el caso activo */
export async function POST(request: NextRequest) {
  let caseId: string;
  try {
    caseId = getCaseIdFromRequest(request);
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (caseId === "demo") {
    return NextResponse.json(
      { error: "Las notificaciones no están disponibles en el caso de demostración" },
      { status: 403 }
    );
  }

  const parsed = await parseJsonBody(request, pushSubscribeSchema);
  if ("error" in parsed) return parsed.error;

  await saveCaseSubscription(caseId, parsed.data.subscription);
  return NextResponse.json({ ok: true });
}

/** Elimina una suscripción Web Push */
export async function DELETE(request: NextRequest) {
  let caseId: string;
  try {
    caseId = getCaseIdFromRequest(request);
  } catch {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  if (caseId === "demo") {
    return NextResponse.json({ ok: true });
  }

  const parsed = await parseJsonBody(request, pushUnsubscribeSchema);
  if ("error" in parsed) return parsed.error;

  if (parsed.data.endpoint) {
    await removeCaseSubscription(caseId, parsed.data.endpoint);
  }

  return NextResponse.json({ ok: true });
}
