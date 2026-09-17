import { NextRequest, NextResponse } from "next/server";
import { getCaseIdFromRequest } from "@/lib/session";
import { markCaseSeenByFamily } from "@/lib/cases";

export async function POST(request: NextRequest) {
  try {
    const caseId = getCaseIdFromRequest(request);
    if (!caseId || caseId === "demo") {
      return NextResponse.json({ success: true });
    }

    await markCaseSeenByFamily(caseId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error pinging family last seen:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
