/** Dominio canónico de producción — con "www." a propósito: Vercel
 * redirige el dominio apex (micaso.com.ar) hacia acá con un 308, y
 * WhatsApp descarta la previsualización de imagen (og:image) si la URL
 * declarada no es ya la final tras esa redirección.
 *
 * Usa `VERCEL_ENV` (no `NODE_ENV`, que Next pone en "production" para
 * cualquier build de Vercel, incluidos los previews de rama) para no
 * forzar el dominio real fuera de la producción real — un preview cae
 * en `NEXT_PUBLIC_SITE_URL` (si está configurada) o en localhost. Única
 * fuente: usado por metadataBase (app/layout.tsx), el OG de /login,
 * sitemap.xml y robots.txt. */
export const SITE_URL =
  process.env.VERCEL_ENV === "production"
    ? "https://www.micaso.com.ar"
    : (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000");

export const CONTACT_EMAIL = "hola@micaso.com.ar";
