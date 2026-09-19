import { NextRequest, NextResponse } from "next/server";
import { getCaseIdFromRequest } from "@/lib/session";
import { updatePeople } from "@/lib/cases";
import { parseJsonBody, peoplePatchSchema } from "@/lib/schemas";

export async function PATCH(request: NextRequest) {
  const caseId = getCaseIdFromRequest(request);

  const parsed = await parseJsonBody(request, peoplePatchSchema);
  if ("error" in parsed) return parsed.error;

  const kase = await updatePeople(caseId, parsed.data.people);
  if (!kase) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }
  return NextResponse.json({ case: kase });
}
