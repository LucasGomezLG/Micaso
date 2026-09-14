import { NextRequest, NextResponse } from "next/server";
import { getCriteria, updateCriteria } from "@/lib/store";
import { getCaseIdFromRequest } from "@/lib/session";

export async function GET(request: NextRequest) {
  const caseId = getCaseIdFromRequest(request);
  const criteria = await getCriteria(caseId);
  return NextResponse.json({ criteria });
}

export async function PATCH(request: NextRequest) {
  const caseId = getCaseIdFromRequest(request);
  let patch: { loan?: Record<string, unknown>; brief?: Record<string, unknown> };
  try {
    patch = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }
  const criteria = await updateCriteria(caseId, patch);
  return NextResponse.json({ criteria });
}
