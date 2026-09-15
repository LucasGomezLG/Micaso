import { NextRequest, NextResponse } from "next/server";
import { put } from "@vercel/blob";
import { getCaseIdFromRequest } from "@/lib/session";

// El cliente ya comprime la foto antes de mandarla (ver EditHouseModal) —
// este tope es solo defensa contra un archivo que se cuele sin pasar por
// esa compresión, no el límite normal esperado.
const MAX_BYTES = 6 * 1024 * 1024;

/** Sube una foto de una casa a Vercel Blob (ver ARQUITECTURA.md sección
 * 5, "Almacenamiento de imágenes subidas") — a diferencia de la foto de
 * perfil del corredor (que se guarda como data URL adentro del mismo
 * registro por ser una sola miniatura chica), una casa puede tener
 * varias fotos y comparte el objeto Redis del resto de las casas del
 * caso, así que embeberlas ahí agrandaría esa clave en cada mutación. */
export async function POST(request: NextRequest) {
  const caseId = getCaseIdFromRequest(request);

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Falta el archivo" }, { status: 400 });
  }
  if (!file.type.startsWith("image/") || file.type.includes("svg")) {
    return NextResponse.json({ error: "Elegí un archivo de imagen." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "La imagen es muy pesada." }, { status: 400 });
  }

  const extension = file.type === "image/png" ? "png" : "jpg";
  try {
    const blob = await put(`case-photos/${caseId}/${crypto.randomUUID()}.${extension}`, file, {
      access: "public",
      contentType: file.type,
    });
    return NextResponse.json({ url: blob.url });
  } catch {
    return NextResponse.json({ error: "No se pudo subir la foto." }, { status: 502 });
  }
}
