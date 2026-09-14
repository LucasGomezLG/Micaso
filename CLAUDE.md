# CLAUDE.md

Guía para Claude Code al trabajar en este repositorio.

## Estado del proyecto

Micaso es, a la fecha, **solo diseño — no hay código de producto en esta
carpeta**. Es la propuesta de convertir [Casa](../Casa) (una herramienta
privada de búsqueda de casa, en producción para 3 personas en `D:\Casa`)
en un SaaS que un corredor inmobiliario contrata para gestionar la
búsqueda de cada uno de sus clientes. Ver `README.md` para la estructura
del repo y `ARQUITECTURA.md` para el diseño completo — leerlo antes de
proponer cualquier cambio, es la fuente de verdad de todas las decisiones
tomadas hasta ahora.

**No empezar a construir sin confirmar primero con Lucas.** La sección 12
de `ARQUITECTURA.md` ("Camino de validación sugerido") es explícita: no
se escribe código real hasta que un corredor, además de Carolina, haya
confirmado que pagaría por esto. Si en una futura sesión se pide empezar
a programar, vale la pena preguntar si ese paso de validación ya pasó.

## Si llega el momento de construir

Este proyecto no arranca de cero: `ARQUITECTURA.md` sección 8 ("Qué
cambia respecto al código de Casa") tiene, archivo por archivo, qué se
extiende del código ya existente en `D:\Casa` (Next.js 16, React 19,
TypeScript, Tailwind v4, Redis vía Upstash) y qué es nuevo (Auth.js para
login de corredor/super-admin, Mercado Pago para el cobro, storage de
imágenes). La forma más simple de arrancar sería copiar o forkear
`D:\Casa` a esta carpeta como base, no reescribir desde cero.

## Decisiones ya cerradas (no volver a discutir sin motivo)

- Tres niveles de acceso: super-admin (Lucas, Google + lista blanca) →
  corredor (Google OAuth) → caso (usuario/contraseña simple, generado por
  caso).
- Una sola base de datos (Redis), namespacing por `case:{caseId}:...` —
  no una base por corredor.
- Mercado Pago para cobros, no Stripe (Argentina no es país soportado por
  Stripe para recibir pagos).
- Nombre público del producto: **Micaso**. "Casa" es y sigue siendo el
  nombre interno/histórico del proyecto original en `D:\Casa`.

Todo el resto de las decisiones, con su razonamiento completo, está en
`ARQUITECTURA.md`.
