# Pendientes — Micaso

Todo lo que falta hacer o decidir, en un solo lugar, con **cuándo**
conviene hacer cada cosa y dónde está el detalle. Es una lista viva:
cuando algo se hace, se borra de acá (el registro queda en git y en los
addendums de `ARQUITECTURA.md`), y cuando aparece algo nuevo, se suma.

**Última actualización:** 25 sept 2026.
**Escala real a esa fecha:** 1 caso real (el de Carolina), más los de
prueba de Lucas.

---

## 1. Ahora: chequeos de producción (sin código)

Ninguno depende de la cantidad de usuarios. Se ven en los paneles de
Vercel y de Upstash. Detalle en `AUDITORIA-CARGA-2026-09-25.md`, CARGA-11 y
CARGA-01.

- [ ] **Plan de Vercel: tiene que ser Pro.** El plan Hobby está
  restringido a uso personal no comercial, y Micaso cobra. Además, sus
  cupos (10 GB de Fast Origin Transfer y 4 h de CPU) no llegan a los
  1.000 usuarios.
- [ ] **Misma región para las funciones de Vercel y la base de
  Upstash.** Si están separadas, cada comando suma latencia: medido, el
  rendimiento baja entre un 25% y un 40% y las fallas del lock se
  duplican.
  - Hoy `vercel.json` no fija región, así que Vercel usa `iad1` (EE. UU.).
  - Para usuarios en Argentina, lo ideal es `gru1` con Upstash en
    `sa-east-1`. Moverlas, siempre juntas.
- [ ] **Plan de Upstash y alertas.** Anotar qué plan es. Configurar una
  alerta de uso en Upstash y una de gasto en Vercel: son las señales para
  la sección 4.
- [ ] **Backups automáticos de Upstash**, si el plan los incluye. Es un
  seguro barato mientras no se rehaga el backup propio (sección 4).

## 2. Rama `fix/auditoria-2026-09-23` (seguridad), sin mergear

Tiene los 22 hallazgos de la auditoría del 23/9 arreglados: 1 commit, con
`main` 3 commits adelante. Al 25/9 no tiene conflictos con `main`.
Mientras no se mergee, **producción no tiene esos arreglos**, entre ellos
cosas que cualquiera puede aprovechar desde el demo público.

Los documentos están en la rama:
- [`PRUEBAS-2026-09-24.md`](https://github.com/LucasGomezLG/Micaso/blob/fix/auditoria-2026-09-23/PRUEBAS-2026-09-24.md),
  la checklist de pruebas a mano;
- [`AUDITORIA-2026-09-23.md`](https://github.com/LucasGomezLG/Micaso/blob/fix/auditoria-2026-09-23/AUDITORIA-2026-09-23.md),
  los hallazgos y su remediación.

- [ ] Traer los cambios de `main` a la rama y volver a correr
  `npm test`, `tsc` y el build.
- [ ] Hacer las pruebas a mano de `PRUEBAS-2026-09-24.md`: dev, build de
  producción, offline y push.
- [ ] Antes de mergear: `scripts/check-redis.mts` contra el Upstash de
  producción, con las credenciales en `.env.produccion`, **nunca** en
  `.env.local`.
- [ ] Mergear a `main`, que es el deploy.
- [ ] Después del deploy: correr `scripts/reset-demo.mts` y
  `scripts/purge-orphan-cases.mts` contra producción. Los dos arrancan
  mostrando qué harían, sin cambiar nada.
- [ ] Actualizar las notas de estado que dicen "está en una rama":
  `AUDITORIA-2026-09-23.md`, `PRUEBAS-2026-09-24.md` y el addendum de
  `ARQUITECTURA.md` (sección 9).

## 3. Bugs conocidos en `main`

- [ ] **Error de hidratación en `/caso/casas`** (visto el 25/9,
  confirmado con `main` limpio).
  - **Qué pasa:** la fecha de la visita en cada tarjeta
    (`VisitaCoordinadaBadge`, `formatDateTime`: "sáb, 26 sept, 11:30 a. m.")
    sale con un espacio distinto en el servidor (Node) que en el navegador.
    React detecta la diferencia y vuelve a dibujar esa parte.
  - **Arreglo propuesto:** mostrar las horas en 24 h (`hourCycle: "h23"`
    en `formatDateTime` y `formatTime` de `lib/format.ts`). Así también se
    cambia el "10:00 a. m." de la agenda, que queda igual al mensaje de
    WhatsApp ("10:00hs").
  - **Estado:** Lucas decidió verlo más adelante.

## 4. Escalabilidad: cuando aparezca la señal

Detalle, método y mediciones en `AUDITORIA-CARGA-2026-09-25.md`. Nada de
esto es urgente con la escala actual. Después de cada arreglo, volver a
medir con `scripts/load-test/` (ver su `README.md`).

| # | Qué | Cuándo | Ref. |
|---|---|---|---|
| 1 | Pasar Upstash a un plan pago | Cuando el uso pase de ~300K comandos o ~7 GB por mes (Free da 500K y 10 GB), alrededor de 100–150 usuarios activos. | CARGA-11 |
| 2 | Rehacer el backup: por partes o guardado en Blob, sin indentación | Alrededor de 20 casos. Con 40 casas por caso, falla cerca de los 35 por el tope de 4,5 MB de Vercel. | CARGA-01 |
| 3 | Pasar las listas globales a sets de Redis (`all_case_ids`, `all_broker_ids`, `broker:{id}:cases`, `deleted_broker_ids`), hacer el alta reintentable y devolver 503 con un mensaje claro | Antes de sumar ~20 corredores o de una campaña. Hoy, con altas simultáneas, quedan casos a medio crear. | CARGA-02 |
| 4 | `SET NX` para el usuario de 6 caracteres de cada caso | Junto con el punto 3. Es un riesgo real recién con miles de casos. | CARGA-09 |
| 5 | Cambiar Nominatim por un geocoder comercial | Alrededor de 500 usuarios, o antes si aparecen casas sin pin en el mapa. | CARGA-06 |
| 6 | Fotos: sumar `CDN-Cache-Control` a `/api/image` (una línea, se puede hacer cuando sea). Después, sacar `/api/image` de `proxy.ts` y guardar miniaturas en Blob | Cuando se note lo que cobra Vercel de transferencia. En Hobby, alrededor de 200 usuarios activos. | CARGA-05 |
| 7 | Resumen del panel precalculado por caso | Cuando algún corredor pase de ~40–50 casos o note el panel lento. | CARGA-04 |
| 8 | Cron diario por lotes y en paralelo | Alrededor de 5.000 casos. | CARGA-08 |
| 9 | Escrituras atómicas sin lock de spin (Lua, o una clave o un hash por casa) | Pensando en ~10.000 usuarios. | CARGA-07 |
| 10 | Límite de intentos de login por usuario e IP | Alrededor de 1.000 usuarios, o si alguien avisa que quedó bloqueado. | CARGA-10 |
| 11 | Observabilidad: métricas de Upstash, logs de errores 5xx y alertas | Antes de empezar a crecer. | — |

## 5. Decisiones abiertas

- **Historial de pagos cuando se da de baja un corredor**
  (`broker:{id}:payments`). Hoy no se borra. O se borra, o se conserva por
  motivos fiscales y lo dice la política de privacidad. Viene de la
  auditoría del 23/9.
- **Aceptado sin arreglar** (auditoría del 23/9): la ventana de tiempo
  (`ts`) de la firma del webhook de Mercado Pago, y que los loops de
  redirects del scraper y de `fetchFollowingSafeRedirects` sigan siendo
  dos copias.
- **A vigilar:** `test/db-file-lock.test.mts` falló una vez en unas 20
  corridas el 23/9 y no se volvió a reproducir.
