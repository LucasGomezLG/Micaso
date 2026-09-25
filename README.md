# Micaso

SaaS para corredores inmobiliarios: cada corredor paga una suscripción
mensual y gestiona, desde un panel propio, un "caso" (acceso privado con
usuario y contraseña) por cada familia con la que está trabajando. Nace
de [Casa](../Casa) — una herramienta privada de búsqueda de casa para 3
personas (Lucas, Abril, Carolina), que sigue en pie y en uso aparte —
generalizada a muchos corredores y muchas familias en simultáneo.

**Estado: en producción, en vivo en `micaso.com.ar`.** El código partió
como una copia sin modificar de `D:\Casa` (14 sept 2026) y desde entonces
se construyó encima la capa multi-corredor completa que describe
`ARQUITECTURA.md`: autenticación (Google OAuth para corredor/super-admin,
usuario y contraseña por caso), namespacing de datos por caso y por
corredor en Redis, panel del corredor, panel de super-admin, Mercado Pago
(suscripciones vía API de Preapproval), notificaciones Web Push, y PWA
con soporte offline. Carolina es la primera corredora real. Lo que sigue
pendiente son detalles puntuales, documentados sección por sección (con
sus fechas) en `ARQUITECTURA.md` — no asumir que algo "no está" sin
confirmarlo ahí o contra el código.

## Contenido

- [`ARQUITECTURA.md`](ARQUITECTURA.md) — la fuente de verdad de todas las
  decisiones de diseño, con addendums fechados por sección a medida que
  el proyecto avanzó: por qué nace, arquitectura de tres niveles
  (super-admin / corredor / caso), stack tecnológico, panel del corredor,
  panel de super-admin, qué cambió respecto al código de Casa, riesgos
  (la mayoría ya resueltos, documentados con su remediación), y qué queda
  fuera de alcance. También publicado como
  [artifact con diseño visual](https://claude.ai/code/artifact/613d03c0-8366-4fbd-b641-a59eb5383997)
  (ese artifact quedó congelado en el diseño original — para el estado
  real y actualizado, `ARQUITECTURA.md` manda).
- [`PENDIENTES.md`](PENDIENTES.md) — todo lo que falta hacer o decidir,
  en un solo lugar: chequeos de producción, la rama de seguridad sin
  mergear, bugs conocidos y mejoras de escala, cada una con cuándo
  conviene hacerla. Es una lista viva: lo que se hace se borra de ahí.
- [`AUDITORIA-CARGA-2026-09-25.md`](AUDITORIA-CARGA-2026-09-25.md) — cuánta
  gente aguanta Micaso (100, 1.000 o 10.000 usuarios), medido en local
  con un servidor falso de Upstash. Las herramientas para repetir la
  medición están en [`scripts/load-test/`](scripts/load-test/README.md).
- [`brand/logo.html`](brand/logo.html) — propuesta de logo y wordmark
  (ícono de casa con ventana iluminada + wordmark en Fraunces). También
  publicado como [artifact](https://claude.ai/code/artifact/ba1a3f32-80b1-4137-8db7-5014456ec12c).
- `app/`, `components/`, `lib/`, `proxy.ts` y el resto de los archivos de
  Next.js — la base de código. Partió como copia tal cual de `D:\Casa` el
  14 de septiembre de 2026; hoy es multi-corredor y multi-caso de punta a
  punta, no queda nada de la app de un solo caso original salvo el
  historial de git.

## Relación con Casa

`D:\Casa` (`home-blush-one.vercel.app`) sigue siendo un proyecto aparte,
en uso diario — el código de acá nunca se mantuvo sincronizado con sus
cambios futuros, son dos bases de código independientes desde el 14 de
septiembre (ver sección 8 de `ARQUITECTURA.md` para el detalle archivo
por archivo de qué cambió). La búsqueda real de Lucas y Abril que vivía
ahí (41 propiedades) se migró como caso dentro de Micaso el 19 de
septiembre de 2026 — importada de solo lectura, sin dar de baja
`D:\Casa`, que sigue funcionando igual mientras tanto.

## Cómo se construyó

Siguiendo la sección 8 de `ARQUITECTURA.md` ("Qué cambia respecto al
código de Casa"), archivo por archivo: primero el núcleo multi-caso
(tipos, storage namespaced por caso, alta/baja de casos), después Auth.js
(Google OAuth) y Mercado Pago una vez configuradas las credenciales. No
se esperó a la validación de pago que en su momento se planteó como gate
— decisión de Lucas (14 sept 2026): es un proyecto personal para
aprender, esa validación es una señal de negocio, no un requisito para
seguir construyendo (Carolina, de hecho, ya confirmó que pagaría).
