import { NextResponse } from "next/server";
import { CASE_COOKIE } from "@/lib/session";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(CASE_COOKIE);
  return res;
}
