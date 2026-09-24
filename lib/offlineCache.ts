/** Caches del service worker (app/sw.ts) que guardan datos de la familia
 * para poder ver `/caso` sin señal (SEP23-16, AUDITORIA-2026-09-23.md;
 * decisión de Lucas del 23 sept 2026). Se borran al cerrar sesión y al
 * entrar a un caso, para que en un dispositivo compartido no queden
 * datos de nadie en disco. Sin dependencias: lo importan tanto el
 * service worker como componentes del cliente. */
export const CASO_PAGES_CACHE = "caso-pages";
export const CASO_IMAGES_CACHE = "caso-images";

/** Los caches que armaba el `defaultCache` de Serwist antes de este
 * cambio: guardaban cualquier página y cualquier `GET /api/*`, incluidos
 * `/panel` (con la clave y el magic link de cada caso) y el backup
 * completo de /superadmin. `static-image-assets` también: su regla mira
 * si la URL termina en .jpg/.webp, y `/api/image?u=…foto.jpg` termina así,
 * así que ahí quedaban las fotos de las casas de la familia. El service
 * worker nuevo los borra al activarse (los assets estáticos de verdad se
 * vuelven a bajar solos). */
export const LEGACY_PRIVATE_CACHES = ["apis", "pages", "pages-rsc", "pages-rsc-prefetch", "others", "static-image-assets"];

/** `cross-origin` guarda, entre otras cosas, las fotos que la familia o el
 * corredor subieron a Vercel Blob (se piden directo, no por /api/image). */
const PRIVATE_CACHES = [CASO_PAGES_CACHE, CASO_IMAGES_CACHE, "cross-origin", ...LEGACY_PRIVATE_CACHES];

/** Borra del dispositivo todo lo que el service worker guardó de un caso.
 * Nunca tira: si el navegador no tiene Cache Storage (o lo bloquea), no
 * hay nada que borrar. */
export async function clearPrivateCaches(): Promise<void> {
  if (typeof caches === "undefined") return;
  try {
    await Promise.all(PRIVATE_CACHES.map((name) => caches.delete(name)));
  } catch {
    // Cache Storage no disponible (modo privado, permisos) — nada que borrar.
  }
}
