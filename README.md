# Micaso

SaaS para corredores inmobiliarios: cada corredor paga una suscripción
mensual y gestiona, desde un panel propio, un "caso" (acceso privado con
usuario y contraseña) por cada familia con la que está trabajando. Nace
de [Casa](../Casa) — hoy una herramienta privada de búsqueda de casa para
3 personas (Lucas, Abril, Carolina) — generalizada a muchos corredores y
muchas familias en simultáneo.

**Estado: diseño cerrado, en construcción.** El código que hay en esta
carpeta (`app/`, `components/`, `lib/`, etc.) partió como una **copia sin
modificar** de `D:\Casa` (14 sept 2026) y ahora se está extendiendo hacia
la capa multi-corredor (auth, cobro, paneles) que describe
`ARQUITECTURA.md`. Se construye como proyecto personal para aprender,
sin esperar a que un corredor confirme que pagaría — ver sección 12 de
`ARQUITECTURA.md` para el contexto de esa decisión.

## Contenido

- [`ARQUITECTURA.md`](ARQUITECTURA.md) — el documento de diseño completo:
  por qué ahora, panorama competitivo, arquitectura de tres niveles
  (super-admin / corredor / caso), stack tecnológico, panel del corredor,
  panel de super-admin, qué cambia respecto al código de Casa, riesgos
  (la mayoría ya resueltos), qué queda fuera de alcance para v1, los dos
  parámetros de negocio pendientes (precio y dominio), y el camino de
  validación sugerido. También publicado como
  [artifact con diseño visual](https://claude.ai/code/artifact/613d03c0-8366-4fbd-b641-a59eb5383997).
- [`brand/logo.html`](brand/logo.html) — propuesta de logo y wordmark
  (ícono de casa con ventana iluminada + wordmark en Fraunces). También
  publicado como [artifact](https://claude.ai/code/artifact/ba1a3f32-80b1-4137-8db7-5014456ec12c).
- `app/`, `components/`, `lib/`, `proxy.ts` y el resto de los archivos de
  Next.js — la base de código, copiada tal cual de `D:\Casa` el 14 de
  septiembre de 2026. Sigue siendo la app de un solo caso (usuario/clave
  `casa`/`1234`, 41 propiedades semilla) hasta que se construya la capa
  de la sección 8.

## Relación con Casa

`D:\Casa` sigue siendo el proyecto en producción (real, en uso diario) —
esta carpeta es donde eventualmente vive la versión multi-corredor de esa
misma herramienta, una vez validado que alguien más, además de Carolina,
pagaría por esto. El código de acá es un punto de partida congelado, no
un fork que se vaya a mantener sincronizado con los cambios futuros de
`D:\Casa` — a partir de ahora son dos bases de código independientes (ver
sección 8 de `ARQUITECTURA.md` para el detalle archivo por archivo de qué
cambia).

## Cómo se está construyendo

Siguiendo la sección 8 de `ARQUITECTURA.md` ("Qué cambia respecto al
código de Casa"), archivo por archivo. Orden elegido: primero el núcleo
multi-caso (tipos, storage namespaced por caso, alta/baja de casos) que
no depende de credenciales externas; Auth.js (Google OAuth) y Mercado
Pago quedan para cuando haya credenciales configuradas. No se esperó la
validación de pago de la sección 12 — decisión de Lucas (14 sept 2026):
es un proyecto personal para aprender, esa validación se evalúa más
adelante, no es un requisito para empezar.
