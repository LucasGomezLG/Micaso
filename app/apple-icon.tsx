import { ImageResponse } from "next/og";
import { renderAppIconArt } from "@/lib/appIconArt";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(renderAppIconArt(size.width), { ...size });
}
