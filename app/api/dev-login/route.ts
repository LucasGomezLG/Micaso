import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { safeNextPath } from "@/lib/safeNextPath";
import { FOUNDER_EMAIL } from "@/lib/auth";

export async function GET(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "No disponible en producción" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const role = searchParams.get("role") || "superadmin";
  const email = role === "superadmin" ? FOUNDER_EMAIL : "carolina@inmobiliaria.com";
  const next = safeNextPath(searchParams.get("next"), role === "superadmin" ? "/superadmin" : "/panel");

  const cookieStore = await cookies();
  cookieStore.set("micaso_dev_user", email, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
  });

  return NextResponse.redirect(new URL(next, request.url));
}
