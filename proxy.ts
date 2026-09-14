import { NextRequest, NextResponse } from "next/server";
import { BROKER_PASSWORD } from "@/lib/auth";
import { getCase } from "@/lib/cases";
import { BROKER_COOKIE, CASE_COOKIE } from "@/lib/session";

const PUBLIC_PATHS = ["/login", "/api/login", "/panel/login", "/api/panel/login"];
const BROKER_PREFIXES = ["/panel", "/api/panel"];

function isUnder(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isUnder(pathname, PUBLIC_PATHS)) {
    return NextResponse.next();
  }

  // Panel del corredor: login placeholder simple hasta que se conecte
  // Auth.js (Google OAuth) — ver ARQUITECTURA.md sección 8 y lib/auth.ts.
  if (isUnder(pathname, BROKER_PREFIXES)) {
    if (request.cookies.get(BROKER_COOKIE)?.value === BROKER_PASSWORD) {
      return NextResponse.next();
    }
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const loginUrl = new URL("/panel/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Todo lo demás es un caso: cookie con el id, validado contra lo
  // guardado en la base (no una contraseña compartida) — un caso
  // archivado (cerrado o de baja hace más de 90 días) pierde el acceso.
  const caseId = request.cookies.get(CASE_COOKIE)?.value;
  const kase = caseId ? await getCase(caseId) : null;
  if (kase && kase.estado !== "archivado") {
    return NextResponse.next();
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
