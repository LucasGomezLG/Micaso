# CLAUDE.md

Guía para Claude Code al trabajar en este repositorio.

---

## 🧠 Protocolo de inicio — Antes de hacer cualquier cosa

**Antes de escribir una sola línea de código o tomar cualquier decisión**, Claude debe seguir este protocolo:

### 1. Actuar como experto en la materia
Identificar qué dominio o disciplina requiere la tarea solicitada y adoptar ese rol de experto. Ejemplos:
- Si la tarea involucra **autenticación**, actuar como experto en seguridad web y Auth.js.
- Si involucra **base de datos / Redis**, actuar como experto en arquitectura de datos y Upstash.
- Si involucra **UI/UX**, actuar como experto en diseño de interfaces con Next.js App Router, React 19 y Tailwind v4.
- Si involucra **pagos**, actuar como experto en integración de Mercado Pago.
- Si involucra **arquitectura o diseño del sistema**, actuar como arquitecto de software senior con experiencia en SaaS multi-tenant.

### 2. Analizar el entorno antes de actuar
Siempre leer y comprender el contexto antes de proponer cambios:
- Leer `ARQUITECTURA.md` (es la fuente de verdad del sistema).
- Leer `README.md` para entender la estructura del repo.
- Revisar los archivos relevantes a la tarea (`lib/`, `app/`, `components/`, etc.).
- Entender qué ya existe y qué falta, para no duplicar ni contradecir decisiones tomadas.

### 3. Principios de actuación
- **No inventar soluciones que ya están documentadas**: si `ARQUITECTURA.md` describe cómo hacer algo, seguir eso.
- **No romper decisiones cerradas** (ver sección más abajo).
- **Preguntar si hay ambigüedad** antes de asumir una dirección de implementación.
- **Priorizar la coherencia del sistema** por encima de la solución más elegante en aislamiento.
- **Documentar decisiones nuevas** si la tarea genera una elección que afecta al sistema.

---

## Estado del proyecto

Micaso es la conversión de [Casa](../Casa) (una herramienta privada de
búsqueda de casa, en producción para 3 personas en `D:\Casa`) en un SaaS
que un corredor inmobiliario contrata para gestionar la búsqueda de cada
uno de sus clientes. Ver `README.md` para la estructura del repo y
`ARQUITECTURA.md` para el diseño completo — leerlo antes de proponer
cualquier cambio, es la fuente de verdad de todas las decisiones tomadas
hasta ahora (tiene addendums fechados en cada sección; el estado real
puede estar varias secciones más abajo del texto original, no solo en el
encabezado).

**Ya no es una copia de `D:\Casa` sin modificar — es el producto SaaS, en
producción.** Desde el punto de partida del 14 de septiembre de 2026 (ver
README.md) se construyó encima: la capa multi-corredor (Auth.js con
Google para corredor y super-admin, `lib/cases.ts`, namespacing por
`case:{caseId}:...`, panel del corredor, super-admin) está escrita y en
vivo en `micaso.com.ar`, con Carolina como primera corredora real. Mercado
Pago (suscripciones vía API de Preapproval, con precio en ARS/USD según
IP) también está implementado, igual que notificaciones Web Push, PWA con
soporte offline (Serwist) y el resto de lo que `ARQUITECTURA.md` documenta
sección por sección. Lo que sigue pendiente son detalles puntuales, no la
capa entera — no asumir que algo "no está escrito todavía" sin
confirmarlo contra el código o los addendums fechados de
`ARQUITECTURA.md`.

**Decisión (14 sept 2026), sigue vigente: no se espera validación de
pago para seguir construyendo.** La sección 12 de `ARQUITECTURA.md`
("Camino de validación sugerido") describía un gate — no escribir código
hasta que un corredor, además de Carolina, confirmara que pagaría. Lucas
decidió que no importa: quiere construirlo igual como proyecto personal
para aprender, y ver más adelante si el negocio funciona. La validación
de pago no bloquea el desarrollo — sigue siendo relevante como señal de
negocio, no como condición para escribir código (y, de hecho, Carolina ya
confirmó que pagaría — ver esa misma sección).

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
