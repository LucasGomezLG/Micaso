import { NextRequest, NextResponse } from "next/server";
import { getCriteria, updateCriteria } from "@/lib/store";
import { getCaseIdFromRequest } from "@/lib/session";
import { criteriaPatchSchema, parseJsonBody } from "@/lib/schemas";

export async function GET(request: NextRequest) {
  const caseId = getCaseIdFromRequest(request);
  const criteria = await getCriteria(caseId);
  return NextResponse.json({ criteria });
}

export async function PATCH(request: NextRequest) {
  const caseId = getCaseIdFromRequest(request);
  const parsed = await parseJsonBody(request, criteriaPatchSchema);
  if ("error" in parsed) return parsed.error;
  const criteria = await updateCriteria(caseId, parsed.data);
  return NextResponse.json({ criteria });
}
