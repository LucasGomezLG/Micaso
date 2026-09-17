import { MICASO_HOUSE_PATH } from "@/components/MicasoMark";

export interface AppIconArtOptions {
  /**
   * - "badge": Ícono tipo app badge centrado, con esquinas redondeadas (~22.5% squircle),
   *   borde translúcido y sombra multicapa con profundidad. Ideal para Splash Screen
   *   y manifest con purpose "any".
   * - "full": Llena el 100% del lienzo de punta a punta. Ideal para apple-touch-icon
   *   y Android adaptive/maskable icons.
   */
  variant?: "badge" | "full";
}

export function renderAppIconArt(canvasSize: number, options: AppIconArtOptions = {}) {
  const { variant = "badge" } = options;

  if (variant === "full") {
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

  const badgeSize = Math.round(canvasSize * 0.82);
  const borderRadius = Math.round(badgeSize * 0.225);
  const glyphSize = Math.round(badgeSize * 0.58);
  const borderWidth = Math.max(1, Math.round(canvasSize * 0.005));
  const shadowSpread = Math.max(8, Math.round(canvasSize * 0.05));
  const shadowY = Math.max(4, Math.round(canvasSize * 0.025));

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "transparent",
      }}
    >
      <div
        style={{
          width: badgeSize,
          height: badgeSize,
          borderRadius,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #1d4e89 0%, #b8862e 100%)",
          border: `${borderWidth}px solid rgba(255, 255, 255, 0.22)`,
          boxShadow: `0 ${shadowY}px ${shadowSpread}px rgba(0, 0, 0, 0.45), 0 2px 6px rgba(0, 0, 0, 0.25)`,
        }}
      >
        <svg width={glyphSize} height={glyphSize} viewBox="0 0 24 24">
          <path fillRule="evenodd" clipRule="evenodd" d={MICASO_HOUSE_PATH} fill="#ffffff" />
        </svg>
      </div>
    </div>
  );
}
