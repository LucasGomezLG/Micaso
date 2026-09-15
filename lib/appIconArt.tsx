import { MICASO_HOUSE_PATH } from "@/components/MicasoMark";

/** Mismo glifo y degradé que ya usa app/icon.tsx (el favicon), a
 * cualquier tamaño - lo reusan apple-icon.tsx (ícono de iOS) y las
 * rutas de app/icons/* (192/512px, para el manifest de PWA). Sin
 * borderRadius acá a propósito: iOS/Android le aplican su propia
 * máscara redondeada al ícono de pantalla de inicio, uno propio se
 * vería doblemente redondeado. */
export function renderAppIconArt(canvasSize: number) {
  const glyphSize = Math.round(canvasSize * 0.6);
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #1d4e89, #b8862e)",
      }}
    >
      <svg width={glyphSize} height={glyphSize} viewBox="0 0 24 24">
        <path fillRule="evenodd" clipRule="evenodd" d={MICASO_HOUSE_PATH} fill="#ffffff" />
      </svg>
    </div>
  );
}
