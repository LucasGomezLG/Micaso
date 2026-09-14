import { ImageResponse } from "next/og";
import { MICASO_HOUSE_PATH } from "@/components/MicasoMark";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #12181f 0%, #1d3550 62%, #12181f 100%)",
          color: "#f4f5f3",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 18, marginBottom: 56 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "linear-gradient(135deg, #1d4e89, #b8862e)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg width="32" height="32" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d={MICASO_HOUSE_PATH} fill="#ffffff" />
            </svg>
          </div>
          <div style={{ fontSize: 34, fontWeight: 600 }}>Micaso</div>
        </div>
        <div style={{ display: "flex", fontSize: 62, fontWeight: 600, lineHeight: 1.15, maxWidth: 940 }}>
          Cada familia, su propio link.
        </div>
        <div style={{ display: "flex", fontSize: 40, color: "#d9ab5c", marginTop: 14 }}>
          Cada búsqueda, bajo control.
        </div>
      </div>
    ),
    { ...size }
  );
}
