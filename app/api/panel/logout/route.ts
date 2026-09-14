import { NextResponse } from "next/server";
import { BROKER_COOKIE } from "@/lib/session";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete(BROKER_COOKIE);
  return res;
}
