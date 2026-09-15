import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { ADMIN_EMAILS } from "@/lib/auth";
import { getCase } from "@/lib/cases";
import { CASE_COOKIE } from "@/lib/session";

// "/" es la landing pública (marketing, dirigida al corredor) — ver
// ARQUITECTURA.md sección 6. /icon y /opengraph-image son generados por
// Next.js (favicon y preview al compartir el link) y tienen que cargar
// sin sesión, en cualquier página, no solo en la landing. /api/auth es
// Auth.js (Google OAuth) — sus propias rutas internas (signin,
// callback, signout, session) tienen que ser públicas. /api/cron lo
// llama Vercel Cron, sin cookie de caso ni sesión de Google — se
// protege con CRON_SECRET adentro de la propia ruta (ver
// app/api/cron/archive-stale-cases/route.ts), no acá.
const PUBLIC_PATHS = [
  "/",
  "/login",
  "/api/login",
  "/panel/login",
  "/api/dev-login",
  "/api/demo-access",
  "/terminos",
  "/privacidad",
  "/api/auth",
  "/api/cron",
  "/icon",
  "/opengraph-image",
  "/robots.txt",
  "/sitemap.xml",
];
const BROKER_PREFIXES = ["/panel", "/api/panel"];
const ADMIN_PREFIXES = ["/superadmin", "/api/superadmin"];

function isUnder(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export const proxy = auth((request) => {
  const { pathname } = request.nextUrl;

  if (isUnder(pathname, PUBLIC_PATHS)) {
    return NextResponse.next();
  }

  // Dev mock user support
  const devEmail =
    process.env.NODE_ENV !== "production" ? request.cookies.get("micaso_dev_user")?.value : null;
  const userEmail = request.auth?.user?.email || devEmail;

  // Panel del corredor: sesión de Google vía Auth.js o dev mock
  if (isUnder(pathname, BROKER_PREFIXES)) {
    if (userEmail) {
      return NextResponse.next();
    }
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }
    const loginUrl = new URL("/panel/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Panel de super-admin: mismo login de Google, pero el email tiene que
  // estar en ADMIN_EMAILS — ver ARQUITECTURA.md sección 7 y lib/auth.ts.
  if (isUnder(pathname, ADMIN_PREFIXES)) {
    if (userEmail && ADMIN_EMAILS.has(userEmail)) {
      return NextResponse.next();
    }
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "No autorizado" }, { status: userEmail ? 403 : 401 });
    }
    if (userEmail) {
      // Logueado pero no es admin: no tiene sentido mandarlo a loguearse
      // de nuevo, lo manda a su propio panel de corredor.
      return NextResponse.redirect(new URL("/panel", request.url));
    }
    const loginUrl = new URL("/panel/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Todo lo demás (el dashboard del caso en /caso/* y las API que usa)
  // requiere cookie con el id de caso, validado contra lo guardado en la
  // base (no una contraseña compartida) — un caso archivado (cerrado hace
  // más de 90 días en solo-lectura, o de baja) pierde el acceso del todo.
  return checkCaseAccess(request, pathname);
});

async function checkCaseAccess(
  request: Parameters<Parameters<typeof auth>[0]>[0],
  pathname: string
) {
  const caseId = request.cookies.get(CASE_COOKIE)?.value;
  const kase = caseId ? await getCase(caseId) : null;
  if (kase && kase.estado !== "archivado") {
    // Solo lectura (cerrado a mano, o impago en el período de gracia):
    // la familia sigue viendo su historial, pero no puede seguir
    // cargando casas, comentarios ni criterios nuevos. Ver
    // ARQUITECTURA.md sección 6.
    const isMutating = ["POST", "PUT", "PATCH", "DELETE"].includes(request.method);
    if (isMutating && pathname.startsWith("/api/")) {
      if (kase.estado === "solo_lectura") {
        return NextResponse.json({ error: "Este caso está en modo solo lectura" }, { status: 403 });
      }
      if (kase.id === "demo") {
        const session = await auth();
        const isOwner = session?.user?.email && ADMIN_EMAILS.has(session.user.email);
        if (!isOwner) {
          return NextResponse.json(
            { error: "El caso demo es de demostración pública protegida. ¡Creá tu propia cuenta gratis en Micaso para cargar y gestionar tus propios casos!" },
            { status: 403 }
          );
        }
      }
    }
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
