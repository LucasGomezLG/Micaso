import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { ADMIN_EMAILS } from "@/lib/auth";
import { getCase } from "@/lib/cases";
import { CASE_COOKIE } from "@/lib/session";
import { verifyCaseSessionToken, verifyMagicLinkToken } from "@/lib/sessionToken";

// "/" es la landing pública (marketing, dirigida al corredor) — ver
// ARQUITECTURA.md sección 6. /icon, /apple-icon, /icons/* y
// /opengraph-image son generados por Next.js (favicon, ícono de iOS,
// íconos del manifest, preview al compartir el link) y tienen que
// cargar sin sesión, en cualquier página, no solo en la landing —
// /manifest.webmanifest por el mismo motivo (el navegador lo pide para
// ofrecer "agregar a pantalla de inicio" incluso en /login, antes de
// cualquier sesión). /sw.js (service worker de Web Push, ver lib/push.ts)
// necesita lo mismo por una razón más estricta: `navigator.serviceWorker
// .register()` pide el script directo, sin cookies previsibles ni
// tolerancia a redirects — si esto devolviera el HTML de /login en vez
// del JS, el registro del service worker fallaría en el navegador.
// /api/auth es Auth.js (Google OAuth) — sus propias rutas internas
// (signin, callback, signout, session) tienen que ser públicas.
// /api/cron lo llama Vercel Cron, sin cookie de caso ni sesión de
// Google — se protege con CRON_SECRET adentro de la propia ruta (ver
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
  "/apple-icon",
  "/icons",
  "/manifest.webmanifest",
  "/opengraph-image",
  "/robots.txt",
  "/sitemap.xml",
  "/sw.js",
];
const BROKER_PREFIXES = ["/panel", "/api/panel"];
const ADMIN_PREFIXES = ["/superadmin", "/api/superadmin"];

function isUnder(pathname: string, prefixes: string[]): boolean {
  return prefixes.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export const proxy = auth(async (request) => {
  const { pathname } = request.nextUrl;

  // Dev mock user support
  const devEmail =
    process.env.NODE_ENV !== "production" ? request.cookies.get("micaso_dev_user")?.value : null;
  const userEmail = request.auth?.user?.email || devEmail;

  // Si entran explícitamente a /login (ej. clickeando de nuevo el link de WhatsApp)
  // o a / (abriendo la PWA desde el celular), revisamos si ya tienen sesión activa.
  if (pathname === "/login" || pathname === "/") {
    const caseCookie = request.cookies.get(CASE_COOKIE)?.value;
    const loggedCaseId = caseCookie ? verifyCaseSessionToken(caseCookie) : null;
    
    if (loggedCaseId) {
      const kase = await getCase(loggedCaseId);
      if (kase && kase.estado !== "archivado") {
        if (pathname === "/") {
          // Si el cliente entra a la raíz (ej. abriendo la app instalada PWA)
          // lo mandamos directo a su caso para que no vea la landing de marketing.
          // Si es un corredor logueado (userEmail), lo dejamos ver la landing si quiere.
          if (!userEmail) {
            return NextResponse.redirect(new URL("/caso", request.url));
          }
        } else if (pathname === "/login") {
          const magicToken = request.nextUrl.searchParams.get("t");
          const hasCredentialsParams = request.nextUrl.searchParams.has("u") && request.nextUrl.searchParams.has("p");

          let shouldRedirectToCaso = false;

          if (!hasCredentialsParams) {
            if (!magicToken) {
              shouldRedirectToCaso = true; // /login sin parámetros, ya logueado
            } else {
              const targetCaseId = verifyMagicLinkToken(magicToken);
              // El magic link dura 15 días (bastante menos que los 90 de la
              // cookie de sesión, ver lib/sessionToken.ts) — si venció, no
              // significa "hay OTRO caso vigente que este link señala",
              // significa simplemente que no hay nada que honrar de la URL,
              // así que no debe tapar la sesión que ya tiene. Si el token
              // es válido pero apunta a otro caso, ahí sí lo dejamos entrar
              // a mano a ese caso distinto (a propósito).
              if (targetCaseId === null || targetCaseId === loggedCaseId) {
                shouldRedirectToCaso = true;
              }
            }
          }

          if (shouldRedirectToCaso) {
            const targetUrl = request.nextUrl.searchParams.get("next") || "/caso";
            return NextResponse.redirect(new URL(targetUrl, request.url));
          }
        }
      }
    }
  }

  // Si ya tiene sesión activa de Google y va a /panel/login o /login:
  // no volver a pedirle login de Google, mandarlo directo a su panel o destino
  // (a menos que venga a /login con parámetros de caso ?u=..., en cuyo caso quiere entrar al caso puntual):
  const isCaseLoginWithParams = pathname === "/login" && request.nextUrl.searchParams.has("u");
  if (userEmail && !isCaseLoginWithParams && (pathname === "/panel/login" || pathname === "/login")) {
    const next = request.nextUrl.searchParams.get("next");
    if (next && next !== "/login" && next !== "/panel/login") {
      return NextResponse.redirect(new URL(next, request.url));
    }
    return NextResponse.redirect(new URL("/panel", request.url));
  }

  if (isUnder(pathname, PUBLIC_PATHS)) {
    return NextResponse.next();
  }

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
  return checkCaseAccess(request, pathname, userEmail);
});

async function checkCaseAccess(
  request: Parameters<Parameters<typeof auth>[0]>[0],
  pathname: string,
  userEmail?: string | null
) {
  const token = request.cookies.get(CASE_COOKIE)?.value;
  const caseId = token ? verifyCaseSessionToken(token) : null;
  const kase = caseId ? await getCase(caseId) : null;
  if (kase && kase.estado !== "archivado") {
    // Solo lectura (cerrado a mano, o impago en el período de gracia):
    // la familia sigue viendo su historial, pero no puede seguir
    // cargando casas, comentarios ni criterios nuevos. /api/scrape es un
    // POST por el body JSON, pero no muta la base de datos de Redis;
    // /api/caso/logout tampoco muta nada del caso, solo borra la cookie
    // del navegador — sin esta excepción quedaba atrapado por el mismo
    // bloqueo que el caso demo y solo_lectura le ponen a cualquier POST
    // de /api/*, así que ni el demo ni un caso pausado por impago podían
    // cerrar sesión (403 acá mismo).
    const isMutating =
      pathname !== "/api/scrape" &&
      pathname !== "/api/caso/logout" &&
      ["POST", "PUT", "PATCH", "DELETE"].includes(request.method);
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

  // Si es un corredor logueado con Google que intentó acceder a /caso pero no tiene cookie de caso:
  // en vez de tirarlo a la pantalla de usuario/contraseña de cliente, mandarlo a su panel para que elija su caso
  if (userEmail) {
    return NextResponse.redirect(new URL("/panel", request.url));
  }

  const loginUrl = new URL("/login", request.url);
  loginUrl.searchParams.set("next", pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
