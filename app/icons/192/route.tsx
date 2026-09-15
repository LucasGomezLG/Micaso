import { ImageResponse } from "next/og";
import { renderAppIconArt } from "@/lib/appIconArt";

const size = { width: 192, height: 192 };

export const dynamic = "force-static";

export async function GET() {
  return new ImageResponse(renderAppIconArt(size.width), { ...size });
}
