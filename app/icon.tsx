import { ImageResponse } from "next/og";
import { MICASO_HOUSE_PATH } from "@/components/MicasoMark";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #1d4e89, #b8862e)",
          borderRadius: 7,
        }}
      >
        <svg width="20" height="20" viewBox="0 0 24 24">
          <path fillRule="evenodd" clipRule="evenodd" d={MICASO_HOUSE_PATH} fill="#ffffff" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
