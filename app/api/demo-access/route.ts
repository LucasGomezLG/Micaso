import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { CASE_COOKIE } from "@/lib/session";
import { createCaseSessionToken } from "@/lib/sessionToken";
import { DEMO_CASE_ID } from "@/lib/seed";

export async function GET(request: Request) {
  const cookieStore = await cookies();
  const expires = new Date();
  expires.setDate(expires.getDate() + 90);

  cookieStore.set(CASE_COOKIE, createCaseSessionToken(DEMO_CASE_ID), {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 90, // 90 days
    expires,
  });

  return NextResponse.redirect(new URL("/caso", request.url));
}
