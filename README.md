# Micaso

SaaS para corredores inmobiliarios: cada corredor paga una suscripción
mensual y gestiona, desde un panel propio, un "caso" (acceso privado con
usuario y contraseña) por cada familia con la que está trabajando. Nace
de [Casa](../Casa) — hoy una herramienta privada de búsqueda de casa para
3 personas (Lucas, Abril, Carolina) — generalizada a muchos corredores y
muchas familias en simultáneo.

**Estado: diseño cerrado, sin construir.** No hay código todavía en esta
carpeta — ver `ARQUITECTURA.md` para el porqué y para el camino de
validación antes de escribir la primera línea.

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

## Relación con Casa

`D:\Casa` sigue siendo el proyecto en producción (real, en uso diario) —
esta carpeta es donde eventualmente vive la versión multi-corredor de esa
misma herramienta, una vez validado que alguien más, además de Carolina,
pagaría por esto. Cuando llegue el momento de construir, este repo
probablemente arranque como un fork o extensión del código de `D:\Casa`
(ver sección 8 de `ARQUITECTURA.md` para el detalle archivo por archivo).

## Antes de escribir código

Ver la sección 12 ("Camino de validación sugerido") de `ARQUITECTURA.md`.
El paso pendiente, a la fecha, es que un corredor real — no solo
Carolina, gratis — confirme que pagaría algo mensual por esto.
