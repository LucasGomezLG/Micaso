const MAX_DIMENSION = 1600;
const JPEG_QUALITY = 0.85;

/** Reduce la foto antes de subirla - ni tan chica como la miniatura de
 * perfil (BrokerAvatarEditor, 256px, porque ahí solo se ve como avatar)
 * ni el tamaño original de la cámara del celular, que puede pesar varios
 * MB y tarda en subir sin necesidad. */
async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("No se pudo procesar la imagen.");
  ctx.drawImage(bitmap, 0, 0, width, height);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("No se pudo procesar la imagen."))),
      "image/jpeg",
      JPEG_QUALITY
    );
  });
}

/** Comprime y sube una foto de casa a `/api/houses/photo` (Vercel Blob,
 * ver ARQUITECTURA.md sección 5) - usado tanto por EditHouseModal como
 * por la carga manual de AddHouseModal, mismo camino para las dos. */
export async function uploadHousePhoto(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("Elegí un archivo de imagen.");
  }
  const compressed = await compressImage(file);
  const formData = new FormData();
  formData.append("file", compressed, "foto.jpg");
  const res = await fetch("/api/houses/photo", { method: "POST", body: formData });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}) as { error?: string });
    throw new Error(data.error || "No se pudo subir la foto.");
  }
  const { url } = await res.json();
  return url as string;
}
