import { NextRequest, NextResponse } from "next/server";
import { addComment } from "@/lib/store";
import { getCaseIdFromRequest } from "@/lib/session";

export async function POST(
  request: NextRequest,
  ctx: RouteContext<"/api/houses/[id]/comments">
) {
  const caseId = getCaseIdFromRequest(request);
  const { id } = await ctx.params;
  let body: { author?: string; text?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida" }, { status: 400 });
  }
  const text = body.text?.trim();
  if (!body.author || !text) {
    return NextResponse.json(
      { error: "Faltan campos obligatorios: author, text" },
      { status: 400 }
    );
  }
  const house = await addComment(caseId, id, body.author, text);
  if (!house) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }
  return NextResponse.json({ house });
}
