import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { CASE_COOKIE } from "@/lib/session";
import { DEMO_CASE_ID } from "@/lib/seed";

export async function GET(request: Request) {
  const cookieStore = await cookies();
  cookieStore.set(CASE_COOKIE, DEMO_CASE_ID, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });

  return NextResponse.redirect(new URL("/caso", request.url));
}
