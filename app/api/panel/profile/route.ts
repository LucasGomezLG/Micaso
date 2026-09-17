import { NextRequest, NextResponse } from "next/server";
import { getCurrentBroker, updateBroker } from "@/lib/brokers";
import { Broker } from "@/lib/types";

// data URL de una imagen JPEG/PNG/WEBP ya comprimida en el navegador
// (ver components/BrokerAvatarEditor.tsx) — el límite es generoso para
// esa compresión (miniatura de 256px) pero corta cualquier intento de
// mandar un archivo gigante o algo que no sea una imagen.
const IMAGE_DATA_URL = /^data:image\/(jpeg|png|webp);base64,/;
const MAX_IMAGE_LENGTH = 700_000;

export async function PATCH(request: NextRequest) {
  const broker = await getCurrentBroker();
  if (!broker) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  let body: { nombreMarca?: string; imagenUrl?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  const patch: Partial<Pick<Broker, "nombreMarca" | "imagenUrl">> = {};

  if ("nombreMarca" in body) {
    const nombreMarca = body.nombreMarca?.trim();
    if (!nombreMarca) {
      return NextResponse.json({ error: "Falta el nombre" }, { status: 400 });
    }
    patch.nombreMarca = nombreMarca;
  }

  if ("imagenUrl" in body) {
    if (body.imagenUrl === null) {
      patch.imagenUrl = null;
    } else if (
      typeof body.imagenUrl === "string" && 
      (IMAGE_DATA_URL.test(body.imagenUrl) || body.imagenUrl.startsWith("https://")) && 
      body.imagenUrl.length <= MAX_IMAGE_LENGTH
    ) {
      patch.imagenUrl = body.imagenUrl;
    } else {
      return NextResponse.json({ error: "La imagen no es válida o es demasiado grande" }, { status: 400 });
    }
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Nada para actualizar" }, { status: 400 });
  }

  const updated = await updateBroker(broker.id, patch);
  return NextResponse.json({ broker: updated });
}
