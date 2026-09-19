import { NextRequest, NextResponse } from "next/server";
import { addHouseChecklistItem } from "@/lib/store";
import { getCaseIdFromRequest } from "@/lib/session";
import { houseChecklistItemCreateSchema, parseJsonBody } from "@/lib/schemas";

export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/api/houses/[id]/checklist">
) {
  const caseId = getCaseIdFromRequest(request);
  const { id } = await ctx.params;
  const parsed = await parseJsonBody(request, houseChecklistItemCreateSchema);
  if ("error" in parsed) return parsed.error;
  const house = await addHouseChecklistItem(caseId, id, parsed.data.text);
  if (!house) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }
  return NextResponse.json({ house });
}
