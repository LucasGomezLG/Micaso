import { NextRequest, NextResponse } from "next/server";
import { getCriteria, saveCriteria } from "@/lib/store";

export async function GET() {
  const criteria = await getCriteria();
  return NextResponse.json({ criteria });
}

export async function PATCH(request: NextRequest) {
  let patch: { loan?: Record<string, unknown>; brief?: Record<string, unknown> };
  try {
    patch = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }
  const current = await getCriteria();
  const next = {
    loan: { ...current.loan, ...(patch.loan ?? {}) },
    brief: { ...current.brief, ...(patch.brief ?? {}) },
  };
  await saveCriteria(next);
  return NextResponse.json({ criteria: next });
}
