import { ImageResponse } from "next/og";
import { renderAppIconArt } from "@/lib/appIconArt";

const size = { width: 512, height: 512 };

export const dynamic = "force-static";

export async function GET() {
  return new ImageResponse(renderAppIconArt(size.width, { variant: "full" }), { ...size });
}
