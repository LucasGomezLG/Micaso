/** El isotipo de Micaso: una casa geométrica simple con la puerta como
 * hueco (fill-rule evenodd) para que se lea bien hasta en el favicon de
 * 16px. Mismo path se usa en el ícono/OG (renderizados con next/og,
 * que soporta SVG) y en los badges de marca de la UI normal — una sola
 * fuente de verdad para la forma. */
export const MICASO_HOUSE_PATH =
  "M12 2.5L21 10V21H3V10L12 2.5ZM10.5 21V14H13.5V21H10.5Z";

export function MicasoMark({
  size = 18,
  color = "currentColor",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <path fillRule="evenodd" clipRule="evenodd" d={MICASO_HOUSE_PATH} fill={color} />
    </svg>
  );
}
