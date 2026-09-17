import { NextRequest, NextResponse } from "next/server";
import { getCaseIdFromRequest } from "@/lib/session";
import { getPublicVapidKey, removeCaseSubscription, saveCaseSubscription } from "@/lib/push";

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

  let body: { subscription?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  const sub = body.subscription as { endpoint?: string; keys?: { p256dh?: string; auth?: string } };
  if (!sub.endpoint || !sub.keys?.p256dh || !sub.keys?.auth) {
    return NextResponse.json({ error: "Suscripción incompleta" }, { status: 400 });
  }

  await saveCaseSubscription(caseId, {
    endpoint: sub.endpoint,
    keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
  });
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

  let body: { endpoint?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  if (body.endpoint) {
    await removeCaseSubscription(caseId, body.endpoint);
  }

  return NextResponse.json({ ok: true });
}
