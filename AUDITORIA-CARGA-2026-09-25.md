# Auditoría de carga — Micaso (25 sept 2026)

**Pregunta:** ¿se banca Micaso 100, 1.000 o 10.000 usuarios?

**Alcance:** el código de `main` en `0737695` (lo que está en producción),
sin los arreglos de la rama `fix/auditoria-2026-09-23`, que todavía no
está mergeada. La hizo Claude (Opus 5.5) a pedido de Lucas.

**Cómo leer las etiquetas:**
- **Medido:** sale de correr la app y contar o cronometrar.
- **Calculado:** sale de multiplicar lo medido por supuestos de uso,
  escritos en cada caso.
- **A confirmar:** depende de un dato de producción que no se puede ver
  desde el repo.

---

## Veredicto

| Usuarios | ¿Aguanta? | Qué hace falta |
|---|---|---|
| **100** | **Sí**, con holgura en capacidad. | Arreglar el backup (ya se rompe con ~35 casos) y confirmar que Vercel esté en plan Pro: el plan Hobby no permite uso comercial. |
| **1.000** | **Sí, con cambios.** | Upstash pago (el plan Free no alcanza), Vercel Pro, mergear la rama de la auditoría, pasar los índices globales a sets de Redis y cambiar el geocoder. |
| **10.000** | **No tal como está.** | Además de lo anterior: resúmenes del panel precalculados, fotos fuera de las funciones, cron por lotes y escrituras sin lock de spin. |

**Lo que no es problema:** la capacidad bruta. Vercel escala solo
(hasta 30.000 ejecuciones concurrentes). Upstash acepta 10.000
comandos/s, y el pico estimado con 10.000 usuarios anda por 1.500
comandos/s. El costo de Upstash tampoco es un tema: unos USD 35 por mes a
10.000 usuarios.

**Lo que sí es problema:** hay datos que se guardan como un solo bloque
para toda la plataforma o para todo un corredor. Esos bloques crecen con
la cantidad de usuarios y se reescriben enteros detrás de un lock. A eso
se suman algunos límites duros: los 4,5 MB de respuesta de Vercel, los
10 MB por pedido de Upstash y la regla de 1 pedido por segundo de
Nominatim.

---

## Cómo se midió

No se le apuntó carga a producción. La app corrió en local con el build
de producción (`next start`), pero en lugar de Upstash usó un servidor
falso que habla el mismo protocolo REST (comando suelto, `/pipeline` y
base64). Ese servidor:
- guarda todo en memoria;
- simula la latencia de red hasta Upstash con dos valores:
  - **2 ms**, funciones y base en la misma región;
  - **30 ms**, regiones distintas;
- cuenta cada comando, cada pedido HTTP, cada reintento fallido del lock
  y el tamaño de cada respuesta.

Los datos se cargaron con el código real de la app (`createCase`, índices,
contraseñas cifradas):
- 50 corredores con 20 casos cada uno, o sea 1.000 casos;
- 40 casas por caso, de tamaño realista: 8 fotos, 2 comentarios y
  checklist, unos **2,2 KB por casa** y **86 KB por caso**;
- para medir el cron, 9.000 casos más sin casas, hasta 10.450 en total.

Las sesiones de familia y de corredor se firmaron con secretos de prueba,
no con los de producción.

**Límites de la medición:**
- Es una sola máquina, así que el rendimiento por segundo es el de una
  instancia. En Vercel se suman instancias solas.
- Lo que sí vale tal cual: cuántos comandos cuesta cada acción, cuántos
  datos mueve, cómo se comporta el lock con concurrencia y en qué punto se
  cruzan los límites duros.
- La latencia simulada es fija. En Upstash real varía y tiene picos.

Los límites externos se verificaron hoy en la documentación oficial:
- [Upstash pricing](https://upstash.com/docs/redis/overall/pricing);
- [Vercel Functions limits](https://vercel.com/docs/functions/limitations);
- [Vercel fair use](https://vercel.com/docs/limits/fair-use-guidelines);
- [Nominatim usage policy](https://operations.osmfoundation.org/policies/nominatim/).

---

## Lo medido

| Acción | Comandos Upstash | Datos desde Upstash | Una instancia | Detalle |
|---|---|---|---|---|
| Familia abre `/caso/casas` (40 casas) | **5** | 114 KB | ~40 vistas/s (2 ms) · ~30/s (30 ms) | ~25 ms de CPU por render. HTML de 791 KB, que comprimido queda en 60 KB (gzip). |
| Familia abre un caso de 150 casas | 5 | ~330 KB | — | Render de 133 ms. HTML de 2,5 MB. |
| Cada foto de una casa | **1** (lo hace `proxy.ts`) | — | — | Cada foto es además una ejecución de función más una descarga externa. Las 40 fotos del listado pasan por `/api/image` (con carga diferida). |
| Familia comenta (casos distintos) | 6 | — | ~250/s | Escala bien. |
| Familia comenta (**el mismo caso**, 20 a la vez) | **24–29** por comentario | — | **~15/s** (2 ms) · **~7/s** (30 ms) | Con 30 ms, **el 17% falló con 500** al vencer el lock (5 s). |
| Corredor abre `/panel` (20 casos) | **28** | **2,3 MB** | ~28/s (2 ms) · ~17/s (30 ms) | Baja todas las casas de todos sus casos para los resúmenes. |
| Mismo corredor, 5 pedidos en paralelo | 31 | — | — | **p95 1,9 s, p99 3 s**: `getCurrentBroker` escribe con lock en cada pedido. |
| Alta de caso (5 a la vez) | 21 | 540 KB (con 10.000 casos) | ~16/s | Reescribe entera la lista global `all_case_ids`, que ocupa 398 KB con 10.000 casos. |
| Alta de caso (**20 a la vez**) | 32–40 | — | — | **Entre el 3% y el 8% falló** (lock de `all_case_ids`), y **cada falla dejó un caso a medio crear**: 15 de 15. |
| Backup completo (1.000 casos) | 15.154 | un pedido de 39 MB | — | **Respuesta de 124,5 MB.** |
| Cron diario (10.450 casos, 900 para archivar) | 4.504 | un pedido de 5,6 MB | — | **70 s** con 2 ms de latencia. |
| `/superadmin` (50 corredores) | 102 | 0,8 MB | — | Sin problema. |

Con Upstash en otra región (30 ms), el rendimiento cae entre un 25% y un
40%, y los problemas del lock se duplican o peor.

---

## Hallazgos

### 🔴 CARGA-01 — El backup se rompe con unos 35 casos

**Dónde:** `app/api/superadmin/backup/route.ts` y `lib/backup.ts`.

`buildFullBackup` junta toda la base en memoria y la devuelve como un
solo JSON con indentación. Con 40 casas por caso son unos **125 KB por
caso**, y Vercel corta cualquier respuesta de función en **4,5 MB**
(`413 FUNCTION_PAYLOAD_TOO_LARGE`). La cuenta da unos 35 casos, o sea
menos que la escala de "100 usuarios".

- **Verificación:** medido. Con 1.000 casos la respuesta fue de 124,5 MB.
  Además, el cliente de Upstash agrupó las lecturas en un pedido de
  39 MB, que supera los 10 MB por pedido que documenta Upstash.
- **Consecuencia:** el único backup que existe deja de funcionar
  justo cuando empieza a importar.
- **Arreglo:**
  - Activar los backups propios de Upstash (según el plan).
  - Pasar el export a uno por caso o por corredor, o generarlo por
    partes y guardarlo en Vercel Blob en vez de devolverlo en la
    respuesta.
  - Sacar la indentación: el JSON con sangría pesa un 30–40% más.

### 🔴 CARGA-02 — Altas de casos simultáneas: falla el lock global y quedan casos a medio crear

**Dónde:** `lib/cases.ts` (`createCase`, `addToAllCaseIds`) y `lib/db.ts`
(`dbUpdate`).

Toda alta de caso reescribe `all_case_ids`, que es la lista de todos los
casos de la plataforma, detrás del lock de spin de `dbUpdate`: espera de
a 50 ms y se rinde a los 5 s. `createCase` guarda primero el caso y el
índice del corredor, y después toca `all_case_ids`. Si ese último paso se
rinde, el caso queda guardado y visible en el panel, pero no está en
`all_case_ids`, y el corredor recibe un error.

- **Verificación:** medido. Con 20 altas simultáneas fallaron entre el 3%
  y el 8%. Después de la prueba había **15 casos en los índices de los
  corredores que faltaban en `all_case_ids`, uno por cada error**, todos
  con sus datos guardados.
- **Consecuencia:**
  - El cron nunca archiva esos casos.
  - El backup no los incluye.
  - El corredor, que vio un error, probablemente reintente y termine con
    el caso duplicado.
  - El mensaje que ve es interno: "Timeout adquiriendo lock concurrente
    en Redis para la clave: all_case_ids".
- **Cuándo pasa:** hacen falta altas casi simultáneas, algo raro con
  tráfico normal pero posible en un pico (un corredor que carga varios
  casos seguidos, reintentos o un evento de lanzamiento). Además, la
  lista crece: con 10.000 casos cada alta mueve unos 540 KB y tiene el
  lock tomado más tiempo.
- **Arreglo:**
  - Pasar `all_case_ids`, `all_broker_ids`, `broker:{id}:cases` y
    `deleted_broker_ids` a **sets de Redis** (`SADD`, `SREM`,
    `SMEMBERS`/`SSCAN`). Son atómicos, no necesitan lock y no se
    reescriben enteros.
  - Hacer que el alta sea reintentable sin duplicar.
  - Devolver un 503 con un mensaje claro en vez del error interno.

### 🟠 CARGA-03 — `getCurrentBroker` escribe con lock en cada pedido del corredor

**Dónde:** `lib/brokers.ts` (`getOrCreateBroker` vía `dbUpdate`).

Es el SEP23-19 de la auditoría del 23/9. **Está arreglado en la rama
`fix/auditoria-2026-09-23`, pero esa rama no está en producción.** Cada
página del panel, cada vista de un caso como corredor y cada llamada a
`/api/panel/*` hace 6 comandos con lock sobre la misma clave del
corredor.

- **Verificación:** medido. Con 5 pedidos en paralelo del mismo corredor,
  el 5% más lento de los pedidos tardó 1,9 s o más, y el 1% más lento,
  3 s o más.
- **Consecuencia:** no depende de la cantidad de usuarios. Cualquier
  corredor lo nota hoy, cuando el panel dispara varias cargas a la vez.
- **Arreglo:** mergear la rama (hace `dbGet` primero y solo escribe si
  el corredor no existe).

### 🟠 CARGA-04 — El panel baja todas las casas de todos los casos del corredor

**Dónde:** `app/panel/page.tsx` y `lib/store.ts` (`getCaseSummary`).

Para mostrar los contadores de cada fila (pendientes, destacadas,
novedades), el panel lee la lista completa de casas de cada caso.

- **Verificación:** medido. Con 20 casos son 28 comandos y **2,3 MB por
  vista del panel**.
- **Cálculo:** un corredor con plan `volumen_alto` no tiene tope de
  casos. Con 100 casos de 40 casas serían unos **8,6 MB por vista**,
  cerca de los 10 MB que acepta Upstash por pedido, y el panel se
  vuelve lento de parsear.
- **Arreglo:** guardar un resumen chico por caso, con esos contadores y
  la fecha de la última actividad, y actualizarlo en cada escritura de
  casas. El panel pasa a leer un `MGET` de resúmenes.

### 🟠 CARGA-05 — Cada foto pasa por una función, por `proxy.ts` y por Redis

**Dónde:** `app/api/image/route.ts` y el `matcher` de `proxy.ts`.

Toda foto que no esté en Blob se sirve a través de `/api/image`. Eso
implica una ejecución de `proxy.ts`, una lectura del caso en Redis, una
ejecución de la función, la descarga de la foto del portal y su reenvío.
El `Cache-Control` solo dice `max-age` (caché del navegador): sin
`s-maxage` o `CDN-Cache-Control`, la CDN de Vercel no la guarda, y cada
dispositivo nuevo la vuelve a pedir.

- **Cálculo:** con unas 15 fotos por día activo, cada miembro de la
  familia genera unos 45 MB por mes de **Fast Origin Transfer**.
  - El plan Hobby incluye 10 GB, que se van con unos 200 usuarios
    activos.
  - A 10.000 usuarios son unos 450 GB por mes.
  - Además, las fotos son la mayor parte de las ejecuciones de función.
- **Arreglo, de menor a mayor esfuerzo:**
  - Sumar `CDN-Cache-Control` para que la CDN las guarde.
  - Sacar `/api/image` del `matcher` de `proxy.ts` y validar la sesión
    en la propia ruta con la firma de la cookie, sin ir a Redis.
  - A largo plazo, guardar miniaturas en Blob cuando se carga la casa.

### 🟠 CARGA-06 — Nominatim no es para uso comercial a escala

**Dónde:** `lib/geocode.ts`.

La política de Nominatim pone un máximo absoluto de 1 pedido por segundo,
no permite uso pesado y pide que una app comercial use un servicio pago
o su propio servidor. El limitador global de la app respeta el 1/s, pero
bajo carga pasan dos cosas:
- cada alta o edición de dirección puede esperar hasta 3 s;
- después se rinde en silencio, y la casa queda sin pin en el mapa.

Además, las IPs de salida de Vercel se comparten con otros proyectos:
si Nominatim bloquea por abuso, puede caer Micaso por culpa de otro.

- **Cálculo:** a 1.000 usuarios ya hay picos de más de 1 alta por
  segundo en el horario de uso.
- **Arreglo:** pasar a un geocoder comercial con capa gratuita
  (LocationIQ, Geoapify, Mapbox o Google) y mantener la caché por texto.

### 🟡 CARGA-07 — El lock por clave pone techo a las escrituras de un mismo caso

**Dónde:** `lib/db.ts` (`dbUpdate`): 5 viajes secuenciales por escritura
y espera de 50 ms entre intentos.

- **Verificación:** medido.
  - El techo es de unas 15 escrituras por segundo sobre el mismo caso
    (7 con 30 ms de latencia).
  - Cada reintento es un `SET` que se cobra: con 20 escritores, un
    comentario costó 24–29 comandos en vez de 6.
  - Con 30 ms, el 17% terminó en 500.
- **Consecuencia:** para una familia no es realista, pero es el mismo
  mecanismo que falla en CARGA-02 y en cualquier clave compartida.
- **Arreglo, a mediano plazo:**
  - Hacer la lectura-modificación-escritura atómica en un solo viaje con
    un script Lua (`EVAL`, que Upstash soporta).
  - O guardar las casas como un hash por caso (`HSET` por casa), así cada
    cambio toca una sola casa y no reescribe la lista entera.

### 🟡 CARGA-08 — El cron diario lee todos los casos en un solo pedido y archiva de a uno

**Dónde:** `lib/cases.ts` (`archiveStaleReadOnlyCases`).

- **Verificación:** medido. Con 10.450 casos, el `MGET` fue de 5,6 MB
  (unos 534 bytes por caso). Archivar 900 casos tardó 70 s con 2 ms de
  latencia, porque cada uno son 5 viajes secuenciales.
- **Cálculo:** el `MGET` pasa los 10 MB de Upstash alrededor de los 19.000
  casos. Con 30 ms de latencia, cada archivado cuesta unos 150 ms, así
  que el cron llega a los 300 s de tope de Vercel con unos 2.000
  archivados en una sola corrida. En un día normal son pocos, pero puede
  pasar con una acumulación.
- **Arreglo:** recorrer por lotes (`SSCAN`, o `MGET` de a 500) y
  archivar en paralelo acotado.

### 🟡 CARGA-09 — El usuario de 6 caracteres de cada caso puede repetirse

**Dónde:** `lib/cases.ts` (`createCase`).

`dbSet(case_username:{username})` pisa sin chequear. Hay 32⁶ ≈ 1.070
millones de combinaciones.

- **Cálculo:** la probabilidad de que dos casos compartan usuario es
  0,01% con 480 casos (unos 1.000 usuarios), **1,1% con 4.800 casos**
  (unos 10.000 usuarios) y 4,6% con 10.000 casos.
- **Consecuencia:** la familia del caso más viejo ya no puede entrar con
  usuario y clave. El link de acceso le sigue funcionando.
- **Arreglo:** `SET … NX` y reintentar con otro código si ya existe.

### 🟡 CARGA-10 — El límite de intentos de login es por IP

**Dónde:** `app/api/login/route.ts` y `lib/rateLimit.ts`.

Bloquea después de 10 fallos cada 15 minutos por IP. Las operadoras
móviles argentinas usan CGNAT, así que miles de usuarios comparten IP, y
a escala los intentos fallidos de otros pueden bloquear a alguien
legítimo.

- **Arreglo:** contar por IP y usuario juntos, con un tope por IP más
  alto.

### ❔ CARGA-11 — A confirmar en producción: planes y región

- **Plan de Vercel.** Hobby está "restricted to non-commercial personal
  use only", y Micaso cobra. Además, sus cupos (10 GB de Fast Origin
  Transfer y 4 h de CPU) se agotan antes de los 1.000 usuarios. **Tiene
  que ser Pro.**
- **Plan de Upstash.** Free incluye 500K comandos y 10 GB por mes, que
  alcanzan para unos 100 usuarios pero no para 1.000 (ver costos).
  Pay-as-you-go cobra USD 0,20 cada 100K comandos, con 200 GB gratis.
- **Región.** Vercel corre por defecto en `iad1` (EE. UU.), y
  `vercel.json` no define región. Si la base de Upstash está en otra
  región, cada comando suma latencia: medido, 30 ms de más bajan el
  rendimiento entre un 25% y un 40% y duplican las fallas del lock.
  - Conviene que las dos estén en la misma región.
  - Para usuarios en Argentina, lo ideal es `gru1` (São Paulo) con
    Upstash en `sa-east-1`, las dos juntas.

---

## Costos proyectados

**Calculado.** Los supuestos son una estimación razonable, no datos
reales de uso:
- Por cada 100 usuarios: 3 corredores y 97 familiares, en unos 48 casos
  con 40 casas.
- Un familiar, por día activo (20 días al mes): 8 páginas, 15 fotos y 2
  escrituras.
- Un corredor, por día activo (22 días al mes): 10 vistas del panel, 15
  vistas de casos y 20 escrituras.

| | 100 usuarios | 1.000 usuarios | 10.000 usuarios |
|---|---|---|---|
| Comandos de Upstash por mes | ~170K (entra en Free) | ~1,7M | ~17M |
| Datos desde Upstash por mes | ~3,4 GB (entra en Free) | ~33 GB (supera Free) | ~340 GB |
| Costo de Upstash (Pay-as-you-go) | USD 0 | ~USD 3 | ~USD 35–40 |
| Ejecuciones de función por mes | ~60K | ~600K | ~6M |
| Fast Origin Transfer (sobre todo fotos) | ~5 GB | ~50 GB (supera Hobby) | ~500 GB |
| CPU activa por mes | < 1 h | ~1–2 h | ~11 h |

El costo de infraestructura no frena el crecimiento. Lo que frena son
los problemas de diseño de arriba.

---

## Plan de acción

> **Escala real al 25 sept 2026:** en producción hay 1 caso real (el de
> Carolina) más los de prueba de Lucas. Con eso no se rompe nada de lo
> de este informe: el backup, por ejemplo, recién falla cerca de los 35
> casos. Lo que queda para ya son dos chequeos que no dependen de la
> carga, el plan de Vercel y la región (puntos 1 y 4). La rama de la
> auditoría se mergea por seguridad, cuando pase su checklist. Todo lo
> demás espera a la señal de cada punto, y para eso conviene configurar
> alertas de uso en Upstash y de gasto en Vercel.

**Ahora, a cualquier escala:**
1. Confirmar Vercel Pro y el plan de Upstash, y configurar alertas de
   gasto (CARGA-11).
2. Rehacer el backup, porque ya está al límite (CARGA-01).
3. Mergear `fix/auditoria-2026-09-23`. Arregla CARGA-03 y además cierra
   SEP23-17, la regex que un visitante del demo puede usar para gastar
   CPU, y SEP23-18.
4. Verificar que las funciones y Upstash estén en la misma región
   (CARGA-11).

**Antes de los 1.000 usuarios:**

5. Pasar los índices globales a sets de Redis y hacer el alta
   reintentable. Con eso desaparecen los casos a medio crear (CARGA-02).
6. `SET NX` para el usuario de cada caso (CARGA-09).
7. Pasar a un geocoder comercial (CARGA-06).
8. Poner las fotos en la caché de la CDN y sacarlas de `proxy.ts`
   (CARGA-05).

**Antes de los 10.000 usuarios:**

9. Resúmenes del panel precalculados (CARGA-04).
10. Cron por lotes (CARGA-08).
11. Escrituras atómicas sin lock de spin: Lua o un hash por caso
    (CARGA-07).
12. Límite de intentos por usuario e IP (CARGA-10).
13. Observabilidad: métricas de Upstash, logs de errores 5xx y alertas.
    Para medir con carga real, usar un deploy de preview con **su propia
    base de Upstash**, nunca la de producción.

---

## Qué no se probó

- **Carga real contra Vercel y Upstash.** Todo se midió en local con un
  servidor falso. La latencia simulada fue fija, y la real tiene picos
  que empeoran el lock.
- **El navegador del usuario:** cuánto tarda en armar una página de
  2,5 MB en un celular de gama baja.
- **Mercado Pago, Web Push y el scraper bajo carga.** Hacen pedidos
  externos y no se les apuntó tráfico.
- **Los arreglos de la rama `fix/auditoria-2026-09-23`.** Se midió
  `main`. La rama mejora CARGA-03 y agrega `withLock` al tope de casos
  del plan, pero no cambia la lista global de CARGA-02.

## Cómo repetir la medición

Con las herramientas de `scripts/load-test/`: el servidor falso de
Upstash, la carga inicial de datos y el generador de carga. Los pasos,
los escenarios y los resultados de referencia de este informe están en
su `README.md`. Conviene volver a medir después de cada arreglo del plan
de acción.

Lo que falta hacer, con cuándo hacerlo, se sigue en `PENDIENTES.md`.
