# CLAUDE.md

Guía para Claude Code al trabajar en este repositorio.

## Estado del proyecto

Micaso es la propuesta de convertir [Casa](../Casa) (una herramienta
privada de búsqueda de casa, en producción para 3 personas en `D:\Casa`)
en un SaaS que un corredor inmobiliario contrata para gestionar la
búsqueda de cada uno de sus clientes. Ver `README.md` para la estructura
del repo y `ARQUITECTURA.md` para el diseño completo — leerlo antes de
proponer cualquier cambio, es la fuente de verdad de todas las decisiones
tomadas hasta ahora.

**El código que hay acá (`app/`, `components/`, `lib/`, `proxy.ts`) es
una copia sin modificar de `D:\Casa`, no el producto SaaS.** Se copió el
14 de septiembre de 2026 como punto de partida (ver README.md) — sigue
siendo la app de un solo caso, con el login hardcodeado y las 41
propiedades semilla de Lucas. Ninguna línea de la capa multi-corredor
(auth de corredor, cobro, paneles) está escrita todavía.

**Decisión (14 sept 2026): se construye igual, sin esperar validación de
pago.** La sección 12 de `ARQUITECTURA.md` ("Camino de validación
sugerido") describía un gate — no escribir código hasta que un corredor,
además de Carolina, confirmara que pagaría. Lucas decidió que no importa:
quiere construirlo igual como proyecto personal para aprender, y ver más
adelante si alguien paga. La validación de pago ya no bloquea el
desarrollo — sigue siendo relevante como señal de negocio, no como
condición para escribir código.

## Cómo se está construyendo

Este proyecto no arranca de cero: `ARQUITECTURA.md` sección 8 ("Qué
cambia respecto al código de Casa") tiene, archivo por archivo, qué se
extiende del código ya existente en `D:\Casa` (Next.js 16, React 19,
TypeScript, Tailwind v4, Redis vía Upstash) y qué es nuevo (Auth.js para
login de corredor/super-admin, Mercado Pago para el cobro, storage de
imágenes). La base ya se copió acá (14 sept 2026, sin modificar).

Orden de construcción elegido: primero el núcleo multi-caso que no
depende de credenciales externas (`lib/types.ts`, `lib/store.ts`, nuevo
`lib/cases.ts`, plantillas de `lib/seed.ts`) — es la base de la que todo
lo demás cuelga. Auth.js (necesita credenciales de Google OAuth) y
Mercado Pago (necesita cuenta y API keys) se dejan para cuando Lucas
tenga esas credenciales a mano; mientras tanto se puede seguir avanzando
con un login placeholder simple para el panel del corredor.

## Decisiones ya cerradas (no volver a discutir sin motivo)

- Tres niveles de acceso: super-admin (Lucas, Google + lista blanca) →
  corredor (Google OAuth) → caso (usuario/contraseña simple, generado por
  caso).
- **Un solo repositorio, no front/back separados.** Next.js App Router ya
  une ambos — las rutas de `app/api/*` corren en el mismo proyecto que
  las páginas, sin llamada de red real entre "front" y "back". Separar
  solo tendría sentido si aparece una razón concreta (app mobile nativa,
  equipos distintos dueños de cada lado), y ese cambio es barato de hacer
  después; partir en dos ahora sería complejidad sin ningún beneficio.
- Una sola base de datos (Redis vía Upstash), namespacing por
  `case:{caseId}:...` — no una base por corredor. La base en sí es un
  servicio externo (no vive en el repo): se accede por variables de
  entorno configuradas en Vercel, nunca commiteadas. Lo único que vive en
  el repo es el código que la usa (`lib/db.ts`, `lib/store.ts`).
- Mercado Pago para cobros, no Stripe (Argentina no es país soportado por
  Stripe para recibir pagos).
- Nombre público del producto: **Micaso**. "Casa" es y sigue siendo el
  nombre interno/histórico del proyecto original en `D:\Casa`.

Todo el resto de las decisiones, con su razonamiento completo, está en
`ARQUITECTURA.md`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
