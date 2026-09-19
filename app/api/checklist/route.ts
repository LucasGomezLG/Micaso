import { NextRequest, NextResponse } from "next/server";
import { addChecklistItem } from "@/lib/store";
import { getCaseIdFromRequest } from "@/lib/session";
import { checklistItemCreateSchema, parseJsonBody } from "@/lib/schemas";

export async function POST(request: NextRequest) {
  const caseId = getCaseIdFromRequest(request);
  const parsed = await parseJsonBody(request, checklistItemCreateSchema);
  if ("error" in parsed) return parsed.error;
  const item = await addChecklistItem(caseId, parsed.data.group, parsed.data.label);
  return NextResponse.json({ item }, { status: 201 });
}
