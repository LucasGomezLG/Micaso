import { NextRequest, NextResponse } from "next/server";
import { addComment } from "@/lib/store";
import { getCaseIdFromRequest } from "@/lib/session";
import { houseCommentCreateSchema, parseJsonBody } from "@/lib/schemas";

export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/api/houses/[id]/comments">
) {
  const caseId = getCaseIdFromRequest(request);
  const { id } = await ctx.params;
  const parsed = await parseJsonBody(request, houseCommentCreateSchema);
  if ("error" in parsed) return parsed.error;
  const body = parsed.data;
  const house = await addComment(caseId, id, body.author, body.text);
  if (!house) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }
  return NextResponse.json({ house });
}
