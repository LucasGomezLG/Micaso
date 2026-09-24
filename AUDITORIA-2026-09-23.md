# Auditoría de código — Micaso (23 sept 2026)

**Alcance:** seguridad, aislamiento multi-tenant, flujo de cobro (Mercado
Pago), costo/performance y calidad general, sobre el código de `main` en
`4da51a7`. La hizo Claude (Opus 5.5) a pedido de Lucas, en dos pasadas el
mismo día:
- **Primera pasada** (SEP23-01 a 15): backend completo, es decir
  autenticación, sesiones, aislamiento, pagos y SSRF.
- **Segunda pasada** (SEP23-16 a 22): lo que había quedado afuera de la
  primera, que es service worker/PWA, el resto de `lib/store.ts`, rutas
  restantes del panel y super-admin, Server Components, parseo del
  scraper, geocoding, backup, utilidades, costo y cobertura de tests.

Qué quedó cubierto y qué no, al final, en "Cobertura".

Antes de reportar nada se leyó la sección 9 de `ARQUITECTURA.md`: lo que
ya estaba resuelto o aceptado como riesgo en las auditorías del 18 y 19
sept (SEC-*, RT-*, CON-*, ARC-01, DAT-01, etc.) **no se repite acá**,
salvo que el arreglo haya quedado incompleto.

**Cómo leer el campo "Verificación" de cada hallazgo:**
- **Reproducido:** hay un test que falla contra el código actual (incluido
  al final de este documento).
- **Confirmado en código:** se siguió el camino completo leyendo el código,
  pero no se ejecutó.
- **Confirmado en el build:** se verificó en el artefacto de producción
  (`npm run build`), no en un navegador.
- **A confirmar:** depende de una decisión o de un dato externo.

**Estado (23 sept, fin del día):** los 22 hallazgos están arreglados en el
código, sin commitear todavía. **Actualización (24 sept):** los arreglos
están commiteados en la rama `fix/auditoria-2026-09-23` (subida a
`origin`), no en `main`. Se mergean después de las pruebas a mano de
`PRUEBAS-2026-09-24.md`; hasta entonces, producción no los tiene. Quedan dos pasos que solo puede hacer Lucas
contra producción: volver a sembrar el demo (SEP23-15) y buscar casos que
hayan quedado sin corredor (SEP23-02). Queda también una decisión pendiente
sobre el historial de pagos. El detalle, las decisiones de Lucas y lo que
agregó la revisión de este informe están en "Seguimiento de la remediación",
más abajo (antes de los tests de reproducción).

---

## Resumen

| ID | Severidad | Hallazgo | Verificación |
|---|---|---|---|
| SEP23-01 | 🔴 Alta | El webhook de la suscripción vieja marca como `cancelada` a un corredor que acaba de pagar | Reproducido · ✅ arreglado |
| SEP23-02 | 🔴 Alta | "Eliminar mi cuenta" no borra los casos del corredor: siguen activos para siempre | Reproducido · ✅ arreglado |
| SEP23-03 | 🟠 Media | `/api/image` es un proxy abierto (vía la sesión demo pública) y sigue redirects sin revisarlos | Confirmado en código · ✅ arreglado |
| SEP23-04 | 🟠 Media | "Regenerar clave" no invalida magic links ni sesiones ya emitidas | Confirmado en código · ✅ arreglado |
| SEP23-05 | 🟠 Media | Usuario y contraseña de caso se generan con `Math.random()` | Confirmado en código · ✅ arreglado |
| SEP23-06 | 🟠 Media | El `endpoint` de Web Push no se valida y no hay tope de suscripciones por caso | Confirmado en código · ✅ arreglado |
| SEP23-16 | 🟠 Media | El service worker cachea en el dispositivo páginas y `/api/*` autenticados (claves, magic links, backup) y no se limpia al cerrar sesión | Confirmado en el build · ✅ arreglado |
| SEP23-17 | 🟠 Media | Las regex del scraper tardan tiempo cuadrático con HTML armado a propósito, y cualquiera lo dispara vía el demo | Reproducido · ✅ arreglado |
| SEP23-07 | 🟡 Baja | Open redirect con `?next=` en `/login` y `/panel/login` | Confirmado en código · ✅ arreglado |
| SEP23-08 | 🟡 Baja | El borrado de fotos de Vercel Blob solo mira el dominio, no a qué caso pertenece la foto | Confirmado en código · ✅ arreglado |
| SEP23-09 | 🟡 Baja | `/superadmin` manda las contraseñas descifradas al navegador | Confirmado en código · ✅ arreglado |
| SEP23-10 | 🟡 Baja | La firma del webhook cubre el `data.id` del query, pero se procesa el id del body | Confirmado en código · ✅ arreglado (sin ventana de `ts`) |
| SEP23-11 | 🟡 Baja | Sin headers de seguridad: el panel se puede embeber en un iframe | Confirmado en código · ✅ arreglado |
| SEP23-12 | 🟡 Baja | `people` sin límite de cantidad ni de largo | Confirmado en código · ✅ arreglado |
| SEP23-13 | 🟡 Baja | `scratch/test_mp.ts` commiteado: si se corre, crea un preapproval real | Confirmado en código · ✅ arreglado |
| SEP23-14 | 🟡 Baja | `npm audit`: 2 vulnerabilidades altas en `browserslist` (solo en build) | Confirmado · ✅ arreglado (`overrides`) |
| SEP23-18 | 🟡 Baja | `INCR` + `EXPIRE` no atómicos: un contador puede quedar sin vencimiento y bloquear para siempre | Confirmado en código · ✅ arreglado (sin probar contra Upstash) |
| SEP23-19 | 🟡 Baja | `getCurrentBroker()` escribe en Redis (con lock) en cada llamada, aunque el corredor ya exista | Confirmado en código · ✅ arreglado |
| SEP23-20 | 🟡 Baja | El tope de casos del plan se puede pasar con altas simultáneas | Confirmado en código · ✅ arreglado |
| SEP23-21 | 🟡 Baja | `micaso_last_ping` es global en `localStorage`, no por caso | Confirmado en código · ✅ arreglado |
| SEP23-22 | 🟡 Baja | `proxy.ts` no tiene tests (es el control de acceso central) | Confirmado · ✅ arreglado |
| SEP23-15 | ❔ | El caso demo público expone datos financieros reales | A confirmar · ✅ datos cambiados · falta resembrar prod |

Además, hay variables de entorno de producción que no se pueden verificar
desde el repo (ver "Configuración de producción a confirmar").

**Orden de remediación sugerido:** 01 → 02 → 03 → 17 → 04 → 16 → 05.
Todos son cambios chicos y acotados:
- **01 y 02** afectan a corredores reales que pagan, o que se van, así que
  conviene arreglarlos antes de sumar el próximo corredor.
- **03 y 17** los puede disparar cualquiera desde internet, porque la
  sesión demo es pública.
- **04 y 16** protegen credenciales ya emitidas.

**Nota transversal:** la sesión demo pública (`/api/demo-access`) es la
puerta de entrada de SEP23-03 y SEP23-17. `proxy.ts` le exceptúa
`/api/scrape` del bloqueo de escritura, y `/api/image` es `GET`. Además de
arreglar cada uno, conviene decidir si el demo necesita esas dos rutas
abiertas. El demo no puede guardar casas, así que el scraper ahí solo sirve
para mostrar el autocompletado. **Corrección posterior:** `/api/image` no
se le puede cerrar al demo, porque todas sus fotos que no están en Blob
pasan por ese proxy (`proxiedImage` en `lib/format.ts`). Para el demo, la
salida es aceptar solo URLs que ya estén en las casas del caso (la opción
estricta de SEP23-03). `/api/scrape` sí se le puede cerrar.

---

## 🔴 Alta

### SEP23-01 — El webhook de la suscripción vieja cancela al corredor que acaba de pagar

**Dónde:** `app/api/mercadopago/webhook/route.ts:89-120`

**Qué pasa.** El fix de CON-03 (20 sept) cancela la suscripción anterior
cuando llega `authorized` para una nueva. Pero después las ramas `paused` y
`cancelled` aplican el estado al corredor **sin fijarse si el
`resourceId` del evento es la suscripción vigente del corredor**
(`broker.mpPreapprovalId`). Secuencia:

1. El corredor tiene la suscripción A, se le pausó por un cobro fallido
   y se vuelve a suscribir: se crea B. (Corrección posterior: "cambiar de
   plan" con A activa no llega acá, porque `POST /api/panel/subscription`
   lo rechaza. El otro camino real es cancelar A y suscribirse a B, si el
   aviso de A llega tarde.)
2. Llega `authorized` para B. El handler cancela A en Mercado Pago
   (línea 99) y guarda B como vigente (línea 103).
3. Mercado Pago notifica el cambio de estado de A. El handler vuelve a
   consultar A, ve `cancelled` y ejecuta la línea 116:
   `subscriptionStatus: "cancelada"` más
   `downgradeCasesForInactiveBrokers`.

**Consecuencia:** el corredor queda `cancelada` y todos sus casos activos
pasan a `solo_lectura`, mientras **B sigue cobrándole todos los meses**.
Tampoco puede cancelar B desde el panel, porque `DELETE
/api/panel/subscription` exige `subscriptionStatus === "activa"`
(`app/api/panel/subscription/route.ts:63`). El camino más afectado es
justamente el de recuperar a un corredor atrasado que vuelve a pagar.

**Segundo problema, de orden:** en la rama `authorized` se cancela A
(línea 99) *antes* de guardar B como vigente (línea 103). Si el webhook de
A entra en ese intervalo, `broker.mpPreapprovalId` todavía es A, así que
un chequeo de "es la vigente" lo dejaría pasar igual.

**Supuesto:** que Mercado Pago manda el evento `subscription_preapproval`
también cuando la cancelación la hace nuestra propia API. El tópico cubre
"creación y actualización" de la suscripción. Conviene mirarlo en el log de
webhooks del panel de Mercado Pago. Igual, el arreglo no rompe nada aunque
ese evento nunca llegue.

**Verificación:** reproducido (test al final). La salida contra el código
actual es: `tras autorizar B: activa sub-B` → `tras webhook de A
cancelada: cancelada sub-B`.

**Arreglo:**
- Aplicar `paused`/`cancelled` solo si `resourceId ===
  broker.mpPreapprovalId`. Con igualdad estricta, un checkout abandonado
  que después expira tampoco toca a un corredor en `prueba` sin
  suscripción.
- En `authorized`, primero `updateBroker` con B y recién después
  `cancelSubscription(A)`.
- Sumar el test de reproducción a `test/subscription.test.mts` como test
  de regresión.

---

### SEP23-02 — "Eliminar mi cuenta" no borra los casos del corredor

**Dónde:** `app/api/panel/profile/route.ts:19-37`. La promesa está en
`components/BrokerProfileModal.tsx:124`.

**Qué pasa.** El autoservicio de baja (hallazgo #5 de
`AUDITORIA-LEGAL-2026-09-19-Claude.md`, marcado ✓) solo llama a
`deleteBroker(broker.id)`. El borrado desde super-admin
(`app/api/superadmin/brokers/[id]/route.ts:51-57`) sí borra en cascada
cada caso (`deleteCase` + `deleteCaseData`) y el índice
`broker:{id}:cases`. En la baja por autoservicio:

- Los casos quedan en `activo`, con casas, checklist, criterios,
  suscripciones push y fotos de Blob intactos.
- La familia sigue entrando con su usuario/contraseña o su magic link
  (`proxy.ts` solo mira `getCase` y `estado`).
- El cron no los baja nunca: `downgradeCasesForInactiveBrokers()` recorre
  `listAllBrokers()`, y el corredor borrado ya no está en
  `all_broker_ids`.

**Consecuencia:**
- **Acceso gratis indefinido** para los casos de un corredor que se fue.
- **Datos personales retenidos** aunque el modal promete "Se borrarán todos
  tus datos" y la Política de privacidad ofrece supresión. Es el mismo tipo
  de contradicción política/código que el hallazgo #1 del informe legal.

**Verificación:** reproducido (test al final). Después de `deleteBroker` y
del cron, el caso sigue `activo` y el login de la familia funciona.

**Arreglo:**
- Mover la cascada a una sola función (por ejemplo
  `deleteBrokerCascade(brokerId)` en `lib/`) y usarla desde las dos rutas.
  Es el mismo criterio de "protegido por construcción, no por convención"
  del hardening de `getCaseForBroker` (sección 9, 15 sept).
- De paso: hoy la baja solo cancela la suscripción en Mercado Pago si está
  `activa`. Con `atrasada` (preapproval `paused`) también conviene
  cancelarla, para que no pueda reanudarse sola.

---

## 🟠 Media

### SEP23-03 — `/api/image`: proxy abierto y redirects sin revisar

**Dónde:** `app/api/image/route.ts:8-55` (el número original, 93-140,
estaba mal: el archivo tiene 55 líneas)

**Qué pasa:**
- **Abierto a cualquiera:** `/api/demo-access` es pública y emite una
  cookie de sesión del caso demo. `checkCaseAccess` (`proxy.ts`) solo le
  bloquea al demo los métodos que mutan, y `/api/image` es un `GET` sin
  rate limit. Cualquier persona puede usar `micaso.com.ar` como proxy de
  cualquier imagen pública: costo de ancho de banda en Vercel, y contenido
  ajeno servido desde nuestro dominio, con `Cache-Control` público.
- **SSRF por redirect:** `isSafeResolvedUrl` revisa solo la URL inicial, y
  el `fetch` de la línea 110 usa el default `redirect: "follow"`. Un host
  público que responde `302 → http://127.0.0.1:...` o a una IP interna hace
  que el servidor le pegue a ese destino (el `fetch` de la línea 25). Es
  ciego: el filtro de `content-type` impide leer la respuesta, pero el
  request se hace.
  `app/api/scrape/route.ts` ya resuelve exactamente esto, siguiendo los
  redirects a mano con `redirect: "manual"` y revisando cada salto.

**Arreglo:**
- Seguir los redirects a mano, con el mismo loop de `fetchHtml` en el
  scraper (conviene extraerlo a `lib/url-safety.ts` y usarlo en los dos
  lados).
- Cuota por `caseId` con `checkAndConsumeQuota`, igual que el scraper.
- Opcional, lo más estricto: aceptar solo URLs que figuren en
  `images` de alguna casa del caso de la sesión.

---

### SEP23-04 — "Regenerar clave" no revoca magic links ni sesiones

**Dónde:** `lib/sessionToken.ts:27-31` y `:64-68` (qué se firma),
`lib/cases.ts:291-297` (`regeneratePassword`).

**Qué pasa.** Tanto la cookie `case_id` (90 días) como el magic link
`?t=` (15 días) firman solo `caseId` + `issuedAt`. Regenerar la contraseña
cambia `Case.password`, pero cualquier token ya emitido sigue siendo
válido hasta que vence. Desde CON-02, lo que el corredor comparte por
WhatsApp es justamente el magic link, que ya es una credencial completa
por sí solo. Entonces, en el caso para el que existe el botón (un link o
una clave filtrada, sección 9: "Rotar una contraseña filtrada"), rotar no
corta nada. Además, `app/panel/page.tsx:120-122` genera un magic link nuevo
de 15 días para cada caso en cada render del panel.

**Arreglo propuesto:** guardar `credencialesRotadasEn` (timestamp) en
`Case`. Lo setea `regeneratePassword`. Los tokens con
`issuedAt < credencialesRotadasEn` se rechazan: en `checkCaseAccess`
(`proxy.ts`, que ya lee el caso) y en la rama de magic link de
`app/api/login`. Hace falta que `verify*Token` devuelva también
`issuedAt`. **No cambia el formato del token**, así que a diferencia de
SEC-01 no desloguea a nadie al desplegar.

**Decisión (Lucas, 23 sept): sí.** Regenerar la clave cierra las sesiones
abiertas de esa familia, que tiene que volver a entrar con el link o la
clave nuevos. Es lo esperable si hubo una filtración, aunque cambia el
comportamiento de hoy.

---

### SEP23-05 — Credenciales de caso generadas con `Math.random()`

**Dónde:** `lib/cases.ts:36-42` (`randomCode`).

**Qué pasa.** Usuario (6 caracteres) y contraseña (12) salen de
`Math.random()`. En V8 es xorshift128+, que no es criptográfico: a partir
de suficientes salidas consecutivas se puede recuperar el estado interno y
predecir las siguientes en la misma instancia. Un corredor ve las salidas
de sus propias altas y regeneraciones. Explotarlo en serverless no es
trivial, pero la entropía de ~60 bits documentada en la sección 9 supone un
generador seguro.

**Arreglo:** `CODE_ALPHABET[crypto.randomInt(CODE_ALPHABET.length)]`
(`import { randomInt } from "crypto"`). No cambia el formato ni hace
falta migrar nada.

---

### SEP23-06 — Web Push: `endpoint` sin validar y sin tope

**Dónde:** `lib/schemas.ts:214-228`, `lib/push.ts:50-75` y `:125-147`.

**Qué pasa:**
- `endpoint` acepta cualquier string. `notifyCaseClients` le hace un POST
  desde el servidor a cada endpoint guardado cada vez que el corredor
  carga una casa, agenda una visita o cambia un precio. Un endpoint
  interno es SSRF ciego por POST.
- No hay tope de suscripciones por caso (solo se deduplica por
  endpoint). Una sesión de caso puede registrar miles, y cada evento se
  multiplica en miles de requests salientes desde Vercel, además de agrandar
  la clave de Redis.

**Arreglo:**
- Aceptar solo `https:` con host de un servicio de push conocido
  (`fcm.googleapis.com`, `updates.push.services.mozilla.com`,
  `*.notify.windows.com`, `web.push.apple.com`).
- Guardar como máximo unas 20 suscripciones por caso, descartando la más
  vieja.

---

### SEP23-16 — El service worker guarda datos autenticados en el dispositivo

**Dónde:** `app/sw.ts:18` (`runtimeCaching: defaultCache`) y
`next.config.ts`. `withSerwistInit` no pasa `register: false`, así que el
service worker se registra solo en **todas** las páginas, con scope `/`.

**Qué pasa.** En producción, el `defaultCache` de `@serwist/next` guarda
en Cache Storage, con estrategia NetworkFirst y 24 h de expiración:
- todo `GET` a `/api/*` (cache `apis`);
- toda navegación o payload RSC de mismo origen (caches `pages-rsc` y
  `others`).

Eso incluye:
- `/panel`: el payload trae la contraseña descifrada y un magic link de
  15 días de **cada** caso del corredor.
- `/superadmin/brokers/[id]`: las contraseñas descifradas (ver SEP23-09).
- `/api/superadmin/backup?code=…`: el JSON con toda la base, y el código
  de seguridad queda en la URL que se usa como clave del cache.
- `/api/criteria` y `/api/houses`: presupuesto, crédito, teléfonos de
  contacto y comentarios de la familia.

Nada borra esos caches al cerrar sesión: el logout de `Nav.tsx` solo da de
baja el push, `PanelLogoutButton` solo llama a `signOut`, y no hay ningún
`caches.delete` en el código. En un dispositivo compartido o prestado (la
PC de una oficina, el celular de alguien de la familia), después del
logout los datos siguen en disco. Se pueden leer desde DevTools →
Application → Cache Storage, o abriendo la página sin conexión, porque
NetworkFirst sirve lo cacheado si no hay red.

No era la intención: ARQUITECTURA.md (18 sept) describe la PWA como
"precachear los assets de la app y mostrar una pantalla propia
(`/offline`)". Guardar datos autenticados es un efecto colateral de usar
`defaultCache` tal cual.

**Verificación:** confirmado en el build. `npm run build` genera un
`public/sw.js` con los caches `apis`, `pages`, `pages-rsc` y `others`.
No se probó en un navegador.

**Arreglo:**
- Reemplazar `defaultCache` por una lista propia: `NetworkOnly` para
  `/api/*` y para documentos/RSC de `/panel`, `/superadmin` y `/caso`.
  Mantener el cache de assets estáticos (`/_next/static`, fuentes,
  imágenes) y el fallback a `/offline`.
- En los dos logouts, borrar los caches `apis`, `pages`, `pages-rsc` y
  `others` con `caches.keys()`.
- **Decisión (Lucas, 23 sept):** sin señal, la familia tiene que poder
  ver lo último que cargó de `/caso`. Se cachea solo `/caso` (con los
  datos que necesita para mostrarse) y se borra al cerrar sesión.
  `/panel`, `/superadmin` y `/api/superadmin/*` no se cachean nunca.

---

### SEP23-17 — ReDoS en el parseo del scraper

**Dónde:** `app/api/scrape/route.ts:16-18` (`extractMeta`), `:32`
(preload), `:44-45` (`extractItemprop`) y `:115-116` (JSON-LD).

**Qué pasa.** Patrones como
`<meta[^>]+property=["']…["'][^>]+content=…` tardan tiempo **cuadrático**
cuando el HTML trae muchas aperturas `<meta` sin `>`: desde cada inicio,
`[^>]+` recorre hasta el final y vuelve para atrás. Pasa lo mismo con
`[\s\S]*?<\/script>` del JSON-LD si nunca aparece el cierre. El HTML lo
controla quien pega el link, porque puede apuntar a su propio servidor.

**Verificación:** reproducido con las mismas regex, aisladas del route, en
Node. El tiempo se multiplica ~×4 cada vez que el tamaño se duplica:

| HTML armado | `extractMeta` (1 patrón) | JSON-LD |
|---|---|---|
| 34KB / 171KB | 72 ms | 94 ms |
| 68KB / 342KB | 291 ms | 372 ms |
| 137KB / 684KB | 1,2 s | 1,6 s |
| 273KB / 1,3MB | 5,8 s | 7,3 s |

El scraper acepta hasta 3MB (`MAX_BODY_BYTES`), y cada request corre más
de una docena de estos patrones (4 propiedades × 3 variantes en
`extractMeta`, más itemprop, preload y JSON-LD). Extrapolando, son minutos
de CPU por request.

**Quién puede dispararlo:** cualquiera. La sesión demo es pública y
`proxy.ts:190-191` exceptúa `/api/scrape` del bloqueo de escritura del
demo. La cuota es de 40 requests cada 5 minutos por caso: el demo la
comparte entre todos, pero una prueba gratis permite crear casos nuevos.

**Consecuencia:**
- Cada request tiene la función ocupada hasta el máximo de duración
  configurado en el proyecto de Vercel (el código no fija `maxDuration`),
  y eso es costo.
- Si el proyecto usa Fluid compute (varias requests comparten instancia),
  la regex bloquea el event loop y **frena las requests de otros
  usuarios** que caen en esa misma instancia.

**Arreglo:**
- Parsear solo los primeros ~512KB: los og/meta/JSON-LD viven en el
  `<head>`.
- Acotar los cuantificadores (`[^>]{0,2000}`) o recorrer los tags con
  `indexOf`.
- Para JSON-LD, buscar `</script>` con `indexOf` desde cada apertura.
- Test de regresión: 1MB de HTML armado tiene que parsear en menos de
  ~200 ms.

---

## 🟡 Baja

### SEP23-07 — Open redirect con `?next=`

**Dónde:** `proxy.ts:101-102`, `proxy.ts:122-124`,
`components/LoginForm.tsx:67`; también `app/api/dev-login/route.ts`,
aunque ese es solo de desarrollo.

`new URL(next, request.url)` con `next=https://evil.com` o `//evil.com`
resuelve a otro dominio (verificado con Node). Un link
`micaso.com.ar/login?next=https://…` le sirve a un phishing para mandar a
la familia, ya logueada, a una página falsa de "volvé a ingresar tu
clave". `javascript:` **no** es explotable: React 19 y el router de Next
ya lo bloquean.

**Arreglo:** un helper `safeNextPath(next)` que acepte solo rutas que
empiezan con `/` y no con `//` ni `/\`, usado en los tres lugares.

### SEP23-08 — Borrado de fotos de Blob sin chequear a qué caso pertenecen

**Dónde:** `lib/store.ts:23-31` (`ownBlobUrls`), usado por `deleteHouse`
y `deleteCaseData`.

Solo chequea `hostname.endsWith(".blob.vercel-storage.com")`. Borrar una
casa borra cualquier foto de Blob que figure en su `images`, aunque
pertenezca a otro caso. El caso realista es un corredor que copia la URL
de una foto de un caso a otro (la misma propiedad mostrada a dos
familias): al borrar la casa en uno, la foto desaparece del otro. También
se borra si otra casa del mismo caso usa la misma URL.

**Arreglo:** exigir que el path empiece con `/case-photos/{caseId}/`
(el prefijo que usa `app/api/houses/photo/route.ts`) y excluir las URLs
que sigan referenciadas por otra casa del caso.

### SEP23-09 — `/superadmin` manda las contraseñas descifradas al navegador

**Dónde:** `app/superadmin/brokers/[id]/page.tsx:49` y `:140`.

`listCasesForBroker` desencripta, y el `Case` completo se pasa como prop a
`AdminCaseCard`, un Client Component. La contraseña viaja en el payload
RSC aunque la UI la oculte detrás de "Ver contraseña"
(`/api/superadmin/cases/[id]/reveal-password`). Solo lo ve el admin, pero
contradice la intención documentada ("no mostrada por default").

**Arreglo:** pasar el caso sin `password` (`{ ...kase, password: "" }` o
un tipo sin ese campo).

### SEP23-10 — Webhook de Mercado Pago: la firma y el id procesado no coinciden

**Dónde:** `app/api/mercadopago/webhook/route.ts:16`, `:50` y `:67`.

El manifest HMAC usa `data.id` del **query string**, pero el recurso que
se procesa sale de `body.data.id || body.id`. Además, `ts` no se compara
contra una ventana de tiempo. El impacto es bajo, porque el handler
siempre vuelve a consultar el estado real a la API de Mercado Pago, pero
un request firmado capturado podría reusarse con otro body.

**Arreglo:** procesar `dataIdParam`, o rechazar si difiere del id del
body. Opcionalmente, rechazar un `ts` fuera de una ventana razonable,
después de confirmar en qué unidad lo manda Mercado Pago.

### SEP23-11 — Sin headers de seguridad

**Dónde:** `next.config.ts` (no tiene `headers()`), `vercel.json`.

Falta `X-Frame-Options: DENY` / `frame-ancestors 'none'`, así que el panel
y `/superadmin` se pueden embeber en un iframe (clickjacking sobre
acciones como "Eliminar mi cuenta"). También faltan
`X-Content-Type-Options`, `Referrer-Policy` y `Permissions-Policy`.

**Arreglo:** agregar `headers()` en `next.config.ts` con esos cuatro. Una
CSP completa queda para después: Leaflet, las tiles de OSM y Vercel
Analytics necesitan su propia lista.

### SEP23-12 — `people` sin límites

**Dónde:** `lib/schemas.ts:185` (`peoplePatchSchema`) y `:259`
(`panelCaseCreateSchema`).

Array y strings sin `.max()`. Una sesión de caso puede guardar un array
enorme en `case:{id}:meta`, que además se lee en cada request por
`proxy.ts`.

**Arreglo:** `z.array(z.string().max(100)).max(30)`.

### SEP23-13 — Archivos de trabajo local commiteados

`scratch/test_mp.ts` crea un preapproval real contra la API de producción
de Mercado Pago si se corre con el `.env.local` de producción.
`.agents/mcp_config.json` y `.agents/run_mp_mcp.js` son tooling personal,
con un path absoluto de esta máquina.

**Arreglo:** sacarlos del repo (o sumar `/scratch/` y `/.agents/` a
`.gitignore`). No hay secretos commiteados: los dos leen el token de
`.env.local`, que ya está ignorado.

### SEP23-14 — `npm audit --omit=dev`

2 vulnerabilidades altas en `browserslist` (GHSA-c83g-rgw3-j3cx,
GHSA-73wf-gq98-2v4g), traídas por `@serwist/next`. Solo se ejecuta al
compilar y con configuración propia, no con input de usuarios: no es
explotable en producción. **No correr `npm audit fix --force`**: baja
`@serwist/next` a 9.4.1, que es un cambio incompatible. Esperar a que
`@serwist/next` actualice la dependencia.

### SEP23-18 — Contadores con `INCR` + `EXPIRE` no atómicos

**Dónde:** `lib/db.ts:185-190` (`dbIncrWithTtl`), usado por
`lib/rateLimit.ts` y por el limitador global de Nominatim en
`lib/geocode.ts:31`.

`INCR` y `EXPIRE` son dos requests HTTP separadas a Upstash, y el
`EXPIRE` solo corre si el `INCR` devolvió 1. Si esa segunda llamada falla
(un error de red, o la función que se corta justo en el medio), la clave
queda **sin vencimiento**:
- `ratelimit:nominatim:global` sin TTL apaga el geocoding de **toda** la
  plataforma para siempre: `geocodeZone` devuelve `null` en silencio y las
  casas nuevas quedan sin coordenadas.
- Un `ratelimit:scrape:{caseId}` sin TTL deja a ese caso sin
  autocompletado para siempre.
- Un `ratelimit:case-login:{ip}` sin TTL bloquea el login desde esa IP
  cuando llega a 10.

La probabilidad es baja, pero cuando pasa no se arregla solo.

**Arreglo:** `SET key 0 EX ttl NX` antes del `INCR` (dejar el TTL puesto
antes de contar), o `redis.multi()` / pipeline con `INCR` + `EXPIRE … NX`.

### SEP23-19 — `getCurrentBroker()` escribe en Redis en cada llamada

**Dónde:** `lib/brokers.ts:82-122` (`getOrCreateBroker`) y `:147-159`.

`getCurrentBroker()` siempre termina en `getOrCreateBroker`, que usa
`dbUpdate` aunque el corredor ya exista. Eso son ~6 comandos de Redis por
llamada: `GET` de tombstones, `SET NX` del lock, `GET`, `SET` del mismo
valor, `GET` y `DEL` del lock. Se llama en cada render de `/panel` y
`/panel/plan`, en cada ruta de `/api/panel/*`, en el layout de `/caso`
cuando lo mira el corredor, y en `POST /api/houses` (17 lugares en `app/`).
El resultado es más comandos facturados en Upstash y requests paralelas del
mismo corredor que se serializan en el lock (espera de 50 ms por vuelta).

**Arreglo:** hacer primero `dbGet` y pasar por `dbUpdate` solo si
devuelve `null`.

### SEP23-20 — El tope de casos del plan se puede pasar con altas simultáneas

**Dónde:** `lib/cases.ts:107-164` (`assertUnderCaseLimit` + `createCase`).

Se cuentan los casos activos y después se crea, sin lock entre las dos
cosas. Dos altas simultáneas cuando el corredor está en el tope menos uno
pasan las dos. `reopenCase` tiene el mismo problema. Es poco probable desde
la UI, fácil con dos requests directas. El impacto es de negocio, no de
seguridad.

**Arreglo:** contar y agregar al índice `broker:{id}:cases` dentro del
mismo `dbUpdate`, abortando si ya está en el tope. O aceptarlo como
riesgo, dada la escala.

### SEP23-21 — `micaso_last_ping` es global, no por caso

**Dónde:** `components/FamilyPing.tsx:15-20`.

Es la misma clase de bug que el barrido del 14 sept ("quedó pensado para un
solo caso"): una sola clave de `localStorage` para todos los casos. Si en
el mismo dispositivo se entra a dos casos dentro de la misma hora, el
segundo no registra la visita, y el panel del corredor muestra mal la
"última visita" de esa familia.

**Arreglo:** usar una clave `micaso_last_ping:{caseId}`.

### SEP23-22 — `proxy.ts` no tiene tests

`proxy.ts` es el control de acceso central de la app:
- rutas públicas;
- sesión de corredor y de admin;
- bloqueo de escritura para `solo_lectura` y demo, con sus excepciones
  (`/api/scrape`, `/api/caso/logout`);
- denegación de casos archivados;
- los bypass de `/login` y `/`.

Ninguno de los 64 tests lo cubre, y ya tuvo un bug real por esa falta (el
magic link vencido, 20 sept, sección 9). Los tests de aislamiento prueban
`lib/`, no las rutas.

**Arreglo:** tests que llamen al `proxy` exportado con `NextRequest`
armados (cookie de caso firmada, sin cookie, demo, `solo_lectura`,
archivado) y verifiquen status y redirect. Cuando se arregle SEP23-07,
sumar ahí los casos de `?next=`.

---

## ❔ A confirmar

### SEP23-15 — El caso demo público expone datos financieros reales

**Dónde:** `lib/seed.ts` (`SEED_CRITERIA.loan`) y
`app/api/demo-access/route.ts`.

El caso demo es público a propósito (sección 9: "`demo` es público a
propósito"), pero se siembra con la búsqueda real de Lucas y Abril: banco,
monto aprobado y cuota del crédito, fondos propios, fecha límite de
mudanza, y nombres. Cualquiera que entre desde la landing lo ve. Si es
intencional (una muestra real), no hay nada que hacer. Si no, conviene
reemplazar esos valores por datos ficticios verosímiles.

**Decisión (Lucas, 23 sept):** no es intencional. Hay que cambiar esos
datos para que el demo no revele los suyos.

### Configuración de producción a confirmar (Vercel)

No se puede verificar desde el repo porque este entorno no tiene acceso a
las variables de Vercel. **Confirmado por Lucas (23 sept): están todas
cargadas en producción y funcionando.** Queda la tabla como referencia de
qué rompe cada una si falta:

| Variable | Qué pasa si falta en producción |
|---|---|
| `CASE_SECRET_KEY` | El login de caso y cualquier lectura de contraseña tiran error (falla cerrado). Si se **cambia**, se invalidan todas las sesiones y todas las contraseñas cifradas quedan ilegibles. |
| `MP_WEBHOOK_SECRET` | El webhook responde 500 y **no procesa ningún evento** de Mercado Pago: los pagos no activan la suscripción. |
| `CRON_SECRET` | El cron responde 500 y no archiva ni baja casos. |
| `ADMIN_BACKUP_CODE` | El backup responde siempre 403 (falla cerrado). |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | Se generan y se guardan en Redis (`micaso:vapid_keys`) la primera vez, con `dbSet`. Si dos requests llegan juntas en ese primer momento, queda una sola clave y las suscripciones hechas con la otra fallan para siempre, con un error que no es 404/410, así que tampoco se limpian solas. Con las variables cargadas, esto no aplica. |
| `FOUNDER_EMAIL` | Usa el valor por defecto del código, que es el mail de Lucas. |

---

## Lo que se revisó y está bien

Para que la próxima auditoría no lo vuelva a revisar desde cero:

- **Aislamiento entre casos:** todas las rutas de `/api/houses/*`,
  `/api/checklist/*`, `/api/criteria`, `/api/case/*` toman el `caseId`
  solo de la cookie firmada (`getCaseIdFromRequest`) y acceden por claves
  `case:{caseId}:…`. Ninguna acepta un `caseId` del body ni del path.
- **Aislamiento entre corredores:** todas las rutas de
  `/api/panel/cases/[id]/*` pasan por `getCaseForBroker`, y los mutadores
  de `lib/cases.ts` repiten el chequeo.
- **Super-admin:** todas las rutas de `/api/superadmin/*` vuelven a
  chequear `getCurrentAdminEmail()`, sin depender solo de `proxy.ts`. El
  login de desarrollo (`micaso_dev_user`) está bloqueado cuando
  `NODE_ENV === "production"` en los tres lugares que lo leen.
- **Sesiones y credenciales:** HMAC con `timingSafeEqual`, AES-256-GCM
  para las contraseñas, y comparación en tiempo constante al hacer login.
- **Scraper:** SSRF con resolución DNS, redirects seguidos a mano, tope de
  3MB, timeout que cubre el body y cuota por caso.
- **XSS:** no hay `dangerouslySetInnerHTML` con datos de usuario (el único
  es el script fijo del tema en `app/layout.tsx`). Los `href={house.url}`
  no son explotables con `javascript:` porque React 19 los bloquea.
- **Fotos subidas:** se rechaza SVG, hay tope de 6MB, y el demo y
  `solo_lectura` quedan bloqueados por `proxy.ts`.
- **Resto de las rutas del panel y super-admin** (`close`, `reopen`,
  `regenerate-password`): chequean dueño o admin, rechazan casos
  archivados, y `reopen` respeta el tope del plan y el estado de la
  suscripción.
- **Mutaciones de `lib/store.ts`:** todas pasan por `dbUpdate` sobre
  `case:{caseId}:…`. `sanitizeHousePatch` y los schemas de Zod impiden
  pisar `comments`/`checklist`/`id`. Autor y fecha de los comentarios los
  pone el servidor.
- **Server Components:** `/caso/*` solo recibe datos del propio caso;
  `/superadmin` (la página principal) solo pasa conteos. La única fuga está
  en SEP23-09.
- **Server Actions:** solo existen el `signIn` y el `signOut` de Auth.js.
  No hay ninguna que mute datos esquivando el bloqueo de escritura de
  `proxy.ts`, que solo mira `/api/*`.
- **Login con Google:** el `redirectTo: next` de `/panel/login` es seguro,
  porque Auth.js solo acepta mismo origen.
- **`lib/backup.ts`, `lib/ics.ts`, `lib/whatsapp.ts`, `lib/listingText.ts`:**
  sin hallazgos. Las regex de `listingText` son lineales y el mensaje de
  WhatsApp lleva el magic link, no la contraseña.
- **Push `notificationclick`:** la URL que abre sale solo de payloads
  armados por el servidor, con strings fijos.

## Estado de las verificaciones automáticas (23 sept 2026)

| Chequeo | Resultado |
|---|---|
| `npx tsc --noEmit` | 0 errores |
| `npx eslint` | 0 errores, 4 warnings: `useEffect` importado sin usar en `BriefEditor.tsx`, `CreateCaseModal.tsx`, `CriteriaEditor.tsx`, `EditHouseModal.tsx` |
| `npm test` | 64/64 pasan |
| `npm run build` | OK (usado para verificar SEP23-16) |
| `npm audit --omit=dev` | 2 altas, ver SEP23-14 |

## Cobertura

**Revisado:**
- todo `app/api/**`, `proxy.ts`, `auth.ts`, `app/sw.ts`;
- todo `lib/` salvo lo listado abajo;
- los Server Components de `/caso`, `/panel` y `/superadmin`;
- en los componentes, solo lo que toca seguridad: puntos de XSS, redirects,
  logout y `localStorage`.

**No revisado, o solo por arriba:**
- **Lógica, UX, accesibilidad y responsive de los ~50 componentes de
  `components/`.** Es otra clase de auditoría (de producto y UI), no de
  seguridad.
- **Cálculos de `lib/mortgage.ts`, `lib/format.ts` y
  `lib/checklistTemplates.ts`:** son funciones puras de presentación, no
  se validaron los números.
- **`scripts/` (migración y purga):** son de una sola vez y ya se
  corrieron en producción (sección 9). Solo se confirmó que la purga tiene
  guardas.
- **Parte legal y de cumplimiento:** está cubierta en
  `AUDITORIA-LEGAL-2026-09-19-*.md`, no se volvió a revisar. SEP23-02 sí
  toca algo que ese informe daba por resuelto.
- **Validación en runtime:** fuera de lo marcado "Reproducido" o
  "Confirmado en el build", los hallazgos salen de leer el código, sin
  ejecutarlo contra un servidor o un navegador.
- **Configuración real de Vercel, Upstash y Google Cloud:** ver
  "Configuración de producción a confirmar".

---

## Seguimiento de la remediación

### Revisión del informe (23 sept)

Se volvieron a verificar los 22 hallazgos contra el código, y todos se
sostienen. Los dos tests de reproducción fallan como dice el informe, y
el crecimiento cuadrático de SEP23-17 se volvió a medir: ~1 s para una
sola regex con 125KB. Las correcciones al texto quedaron marcadas en su
lugar: las líneas de SEP23-03, el camino de "cambia de plan" en SEP23-01
y `/api/image` en la nota sobre el demo.

Lo que agregó la revisión:
- **`npm test` podía correr contra el Redis de producción.** El script
  carga `.env.local`, y `lib/db.ts` usaba Redis apenas encontraba
  credenciales, sin mirar `MICASO_LOCAL_DB_PATH`. Hoy `.env.local` no las
  tiene, pero un `vercel env pull` las trae. ✅ Arreglado en el bloque 1.
- **Una cancelación fallida en Mercado Pago no dejaba rastro.**
  `cancelSubscription` devuelve `false` (no tira error) si Mercado Pago
  rechaza el pedido, y el webhook y la baja solo atrapaban excepciones.
  ✅ Arreglado en el bloque 1: ahora se loguea con el id para revisarla a
  mano. Nada la reintenta sola.
- **Carrera residual en la rama `authorized`.** Un evento viejo de A,
  leído mientras A todavía está `authorized`, vuelve a poner A como
  vigente y cancela B. Primero se aceptó como riesgo, pero el repaso de
  código (más abajo) mostró un camino real: si falla la cancelación de A,
  su cobro mensual la reactiva. ✅ Arreglado en el repaso.
- **`broker:{id}:payments` no se borra en ninguna baja.** Puede ser
  correcto guardarlo por motivos fiscales, pero entonces lo tiene que
  decir la política de privacidad. **Decisión pendiente (Lucas).**

### Bloque 1 (23 sept): SEP23-01, SEP23-02 y el aislamiento de los tests

- **SEP23-01:** el webhook aplica `paused`/`cancelled` solo si el evento
  es de la suscripción vigente (`resourceId === broker.mpPreapprovalId`).
  En `authorized`, primero guarda la nueva y recién después cancela la
  vieja. Tests en `test/subscription.test.mts`: el caso del corredor
  atrasado que vuelve a pagar, el aviso que llega en medio de la
  cancelación (con un caso activo que no tiene que pasar a solo lectura)
  y el checkout abandonado.
- **SEP23-02:** `deleteBrokerCascade` (`lib/brokerDeletion.ts`) es la
  única forma de borrar un corredor, y la usan las dos bajas. Cancela en
  Mercado Pago la suscripción que siga viva (activa o atrasada, no solo
  activa), borra cada caso con sus datos y el índice, y al final al
  corredor. **Cambio de comportamiento:** el borrado desde `/superadmin`
  ahora también cancela la suscripción, cosa que antes no hacía. Tests en
  `test/broker-deletion.test.mts`.
- **Tests contra Redis:** con `MICASO_LOCAL_DB_PATH` puesto, `lib/db.ts`
  nunca usa Redis. Test en `test/db-test-isolation.test.mts`, con
  credenciales falsas.
- **Verificación:** 72/72 tests (64 + 8 nuevos), `tsc` limpio y `eslint`
  sin errores en los archivos tocados. Los 4 tests nuevos del webhook y
  de `db.ts` fallan contra el código anterior.
- **Pendiente de SEP23-02 en producción:** si algún corredor ya se dio de
  baja por autoservicio antes del arreglo, sus casos siguen en Redis,
  activos y sin dueño. Para eso está `scripts/purge-orphan-cases.mts` (ver
  "Lo que falta", abajo).

### Bloques 2 a 5 (23 sept): el resto de los hallazgos

- **SEP23-03:** `fetchFollowingSafeRedirects` (`lib/url-safety.ts`) sigue
  los redirects a mano y revisa cada salto. El demo solo puede pedir las
  fotos de sus propias casas (salvo el admin); el resto de los casos tiene
  una cuota de 600 imágenes cada 5 minutos. No se aplicó la lista
  permitida a todos los casos porque la vista previa de "Agregar casa"
  muestra fotos que todavía no están guardadas.
- **SEP23-17:** el parseo pasó a `lib/listingHtml.ts`, que recorre los
  tags con `indexOf` en una sola pasada. Con 1MB armado para cada patrón
  viejo tarda entre 2 y 30 ms (antes, minutos). Contra el parser viejo, con
  9 HTML representativos, da exactamente el mismo resultado. `/api/scrape`
  ya no tiene excepción en `proxy.ts`: ni el demo ni un caso en solo
  lectura pueden usarlo.
- **SEP23-04:** `credencialesRotadasEn` en el caso. `proxy.ts` y el login
  con magic link rechazan los tokens anteriores. Los dos lugares de
  `proxy.ts` que miran la sesión usan la misma función, para no armar un
  loop entre `/login` y `/caso`. **Bug encontrado de paso:** después de
  regenerar, el panel se quedaba sin `magicLinkToken` y "Copiar" /
  "Compartir" tiraban error. La ruta ahora devuelve un link nuevo (probado
  en el navegador, en los tres anchos).
- **SEP23-16:** `app/sw.ts` cachea solo `/caso` (HTML y RSC) y las fotos de
  `/api/image`, sin respuestas redirigidas. Todo lo demás de mismo origen
  va siempre a la red. Los caches se borran al salir (del caso y del
  panel), al entrar a un caso y, los viejos del `defaultCache`, al
  activarse el service worker nuevo. **Bug encontrado de paso:** la
  página `/offline` nunca se precacheaba, así que sin red se veía el error
  del navegador. Ahora está en `additionalPrecacheEntries` y es pública en
  `proxy.ts`. Verificado con el build de producción en Edge: sin red,
  `/caso/casas` se ve y una página no visitada muestra "Estás sin
  conexión". Después de salir no queda ningún cache con datos del caso.
- **SEP23-06:** solo endpoints `https` de FCM, Mozilla, WNS y Apple, en
  el schema y en `saveCaseSubscription`. Tope de 20 por caso.
- **SEP23-05, 08, 09, 12, 13, 19, 21:** tal como proponía el informe.
  SEP23-09 también cubre la respuesta de "Regenerar clave" en
  `/superadmin`. SEP23-13 dejó de trackear `scratch/` y `.agents/` (siguen
  en disco) y los sumó a `.gitignore`.
- **SEP23-07:** `safeNextPath` resuelve la URL y compara el origen, así
  que también cubre `/\t/evil.com` y `/\evil.com`. Se usa en `proxy.ts`,
  `LoginForm`, `dev-login` y además en `app/panel/login/page.tsx`, que
  hacía `redirect(next)` con el valor crudo (no estaba en el informe).
- **SEP23-10:** se procesa solo el `data.id` firmado, y un body con otro
  id da 400. **No se agregó la ventana de `ts`:** falta confirmar en qué
  unidad lo manda Mercado Pago, y si firma de nuevo sus reintentos (que
  pueden llegar días después).
- **SEP23-11:** `X-Frame-Options`, `frame-ancestors 'none'`,
  `X-Content-Type-Options`, `Referrer-Policy` y `Permissions-Policy`
  (cámara, micrófono y geolocalización, que la app no usa).
- **SEP23-14:** `overrides` en `package.json` fuerza `browserslist`
  ^4.28.9 solo para `@serwist/next`, sin `--force`. `npm audit` da 0.
- **SEP23-15:** la semilla del demo, la landing (showcase) y dos
  placeholders ya no tienen los nombres de Lucas, Abril ni Carolina, ni el
  banco, montos, cuota, fondos propios, fecha de mudanza o citas de sus
  chats. La cita "— Lucas, creador de Micaso" de la landing se dejó a
  propósito. Revisado en mobile, sm y lg.
- **SEP23-18:** `MULTI` con `INCR` + `EXPIRE … NX` en un solo request. `NX`
  además arregla sola una clave que haya quedado sin TTL. No se pudo
  probar contra Upstash real desde acá.
- **SEP23-20:** `withLock` (`lib/db.ts`), un lock con nombre, envuelve
  contar y crear o reabrir. El test de comportamiento pasa también sin el
  lock en modo local (el lock del store serializa las altas de hecho), así
  que la exclusión se prueba directamente sobre `withLock`.
- **SEP23-22:** `test/proxy.test.mts`, con 11 casos. Contra el `proxy.ts`
  anterior fallan justo los 4 del comportamiento nuevo.
- **Verificación final:** 107/107 tests (tres corridas seguidas), `tsc`
  limpio, `eslint` sin errores ni warnings (se limpiaron los 4 `useEffect`
  sin usar), `npm run build` OK y `npm audit` en 0.

### Repaso de código de todos los cambios (23 sept)

Una revisión del diff completo encontró 10 cosas. Todas se verificaron
contra el código antes de tocar nada:
- **SEP23-06 quedaba a medias:** el chequeo del endpoint estaba solo al
  guardar, así que las suscripciones guardadas antes seguían recibiendo el
  POST. `notifyCaseClients` ahora filtra y aplica el tope al enviar, y
  borra las que no pasan. Tiene test.
- **Webhook:** si fallaba la cancelación de la suscripción vieja, su
  próximo aviso (por ejemplo, el cobro mensual) la volvía a poner como
  vigente y cancelaba la nueva. El corredor ahora guarda
  `mpReplacedPreapprovalIds`. Un `authorized` de una reemplazada reintenta
  cancelarla en vez de volver a ella, y así también se reintenta la
  cancelación fallida. Tiene test.
- **SEP23-08 quedaba a medias:** borrar en el caso dueño de la foto la
  rompía en el otro caso que la había copiado. `blobPhotosToDelete`
  (`lib/store.ts`) excluye las fotos que usa cualquier otro caso del mismo
  corredor. `deleteCaseData` ahora recibe el `brokerId`, porque para
  entonces el caso ya está borrado. Tiene test.
- **SEP23-16:** el service worker anterior guardaba las fotos de
  `/api/image` en `static-image-assets` (la URL termina en .jpg), y las
  fotos subidas a Blob quedan en `cross-origin`. Los dos ahora se borran
  al salir, y el primero también al activarse. Verificado en el navegador.
- **SEP23-02:** una alta en otra pestaña durante la baja quedaba huérfana.
  La cascada usa el mismo lock que el alta, y el alta rechaza a un
  corredor dado de baja (tombstone). Tiene test.
- **`/api/image`:** la consulta DNS se hacía antes de la puerta del demo o
  de la cuota (y dos veces). Ahora va primero el chequeo barato y la
  resolución queda solo en el fetch. Las fotos del demo quedan en memoria
  un minuto, en vez de leer todas sus casas de Redis por cada foto.
- **SEP23-21:** `FamilyPing` no volvía a registrar la visita si el layout
  seguía montado y cambiaba el caso. Ahora recuerda para qué caso lo hizo.
- **SEP23-04:** `proxy.ts` tomaba como válido un magic link revocado y
  dejaba a un corredor logueado en un `/login` que después fallaba. Ahora
  aplica el mismo criterio que `/api/login`. Tiene test.
- **Redirects duplicados:** se alineó el límite de saltos con el del
  scraper. No se unificaron los dos loops: el del scraper además chequea
  sitios bloqueados en cada salto, reintenta con otro User-Agent y lee el
  body con su propio timeout.

Después del repaso: 112/112 tests (dos corridas), `tsc` y `eslint`
limpios, `npm run build` OK. Las pruebas en el navegador (service worker,
fotos del demo) se repitieron contra el build nuevo.

### Lo que falta

- **Pruebas a mano antes del deploy:** checklist en
  `PRUEBAS-2026-09-24.md` (qué cambió por área, qué ya está verificado y
  qué falta probar en dev, en el build de producción y después del deploy).
- **De Lucas, contra producción, después del deploy.** Las credenciales
  van en `.env.produccion`, nunca en `.env.local`; ver el encabezado de
  cada script.
  - `scripts/reset-demo.mts`: vuelve a sembrar el demo con los datos
    nuevos, porque el de producción ya está guardado con los viejos.
    Borra lo que se le haya cambiado al demo a mano.
  - `scripts/purge-orphan-cases.mts`: lista (y con `--confirmar`, borra)
    los casos que quedaron sin corredor por SEP23-02.
  - Los dos arrancan en modo "solo mostrar". Se probaron contra copias de
    la base local.
- **Decisión pendiente:** si `broker:{id}:payments` se borra con la baja
  del corredor o se conserva por motivos fiscales (y se dice en la
  política de privacidad).
- **Aceptado, sin arreglar:** la ventana de `ts` de SEP23-10, y que el
  loop de redirects del scraper y `fetchFollowingSafeRedirects` sigan
  siendo dos copias (ver el repaso).
- **Visto de paso, fuera del informe:** `test/db-file-lock.test.mts` (el
  lock de archivo que solo se usa en desarrollo) falló una vez en ~20
  corridas de la suite completa y no se volvió a reproducir.

---

## Tests de reproducción

Están escritos para ir directo a `test/`. **Fallan a propósito contra el
código actual**, así que conviene sumarlos junto con el arreglo de cada
hallazgo, no antes, para no dejar la suite en rojo. (Los dos ya se
sumaron con el bloque 1, adaptados a `test/subscription.test.mts` y
`test/broker-deletion.test.mts`. Quedan acá como registro.)

<details>
<summary><code>SEP23-01</code> — webhook de la suscripción vieja (agregar a <code>test/subscription.test.mts</code> o como archivo propio)</summary>

```ts
import { test, after, before } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import crypto from "node:crypto";

const dbDir = mkdtempSync(join(tmpdir(), "micaso-test-sep23-01-"));
process.env.MICASO_LOCAL_DB_PATH = join(dbDir, "store.json");
process.env.MP_ACCESS_TOKEN = "test-access-token";
process.env.MP_WEBHOOK_SECRET = "test-webhook-secret";
process.env.CASE_SECRET_KEY ??= crypto.randomBytes(32).toString("base64");

const brokers = await import("../lib/brokers");
const cases = await import("../lib/cases");
const { POST } = await import("../app/api/mercadopago/webhook/route");

after(() => rmSync(dbDir, { recursive: true, force: true }));

// Estado de cada preapproval "en Mercado Pago" — el PUT de cancelación lo
// cambia de verdad, así el webhook siguiente lo lee cancelado.
const statusById: Record<string, { status: string; external_reference: string }> = {};
const originalFetch = globalThis.fetch;
before(() => {
  globalThis.fetch = (async (url: string | URL, init?: RequestInit) => {
    const href = url.toString();
    const id = href.split("/preapproval/")[1];
    if (href.includes("/preapproval/") && (!init?.method || init.method === "GET")) {
      return new Response(JSON.stringify(statusById[id]), { status: 200 });
    }
    if (href.includes("/preapproval/") && init?.method === "PUT") {
      statusById[id] = { ...statusById[id], status: "cancelled" };
      return new Response(JSON.stringify({ status: "cancelled" }), { status: 200 });
    }
    throw new Error("fetch no mockeado " + href);
  }) as typeof fetch;
});
after(() => { globalThis.fetch = originalFetch; });

function signed(resourceId: string): Request {
  const ts = Date.now().toString();
  const reqId = `req-${resourceId}-${Math.random()}`;
  const manifest = `id:${resourceId};request-id:${reqId};ts:${ts};`;
  const hash = crypto.createHmac("sha256", process.env.MP_WEBHOOK_SECRET!).update(manifest).digest("hex");
  return new Request(`https://www.micaso.com.ar/api/mercadopago/webhook?topic=preapproval&data.id=${resourceId}`, {
    method: "POST",
    headers: { "x-signature": `ts=${ts},v1=${hash}`, "x-request-id": reqId },
    body: JSON.stringify({ data: { id: resourceId } }),
  });
}

test("SEP23-01: el webhook de la suscripción vieja (cancelada por nosotros) no cancela al corredor", async () => {
  const b = await brokers.getOrCreateBroker("sep23-01@example.com", "Corredor", null);
  await brokers.updateBroker(b.id, { subscriptionStatus: "activa", mpPreapprovalId: null });
  await cases.createCase(b.id, "Familia", "compra");

  // A autorizada, después pausada por cobro fallido → corredor atrasado
  statusById["sub-A"] = { status: "authorized", external_reference: `${b.id}:para_arrancar` };
  await POST(signed("sub-A"));
  statusById["sub-A"].status = "paused";
  await POST(signed("sub-A"));
  assert.equal((await brokers.getBroker(b.id))!.subscriptionStatus, "atrasada");

  // Se vuelve a suscribir con B → el handler cancela A en Mercado Pago
  statusById["sub-B"] = { status: "authorized", external_reference: `${b.id}:para_arrancar` };
  await POST(signed("sub-B"));
  assert.equal((await brokers.getBroker(b.id))!.subscriptionStatus, "activa");

  // Mercado Pago avisa del cambio de estado de A
  await POST(signed("sub-A"));
  const now = await brokers.getBroker(b.id);
  assert.equal(now!.mpPreapprovalId, "sub-B");
  assert.equal(now!.subscriptionStatus, "activa", "acaba de pagar B y quedó cancelado");
});
```

</details>

<details>
<summary><code>SEP23-02</code> — baja del corredor (agregar a <code>test/brokers.test.mts</code> o como archivo propio)</summary>

```ts
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import crypto from "node:crypto";

const dbDir = mkdtempSync(join(tmpdir(), "micaso-test-sep23-02-"));
process.env.MICASO_LOCAL_DB_PATH = join(dbDir, "store.json");
process.env.CASE_SECRET_KEY ??= crypto.randomBytes(32).toString("base64");

const brokers = await import("../lib/brokers");
const cases = await import("../lib/cases");

after(() => rmSync(dbDir, { recursive: true, force: true }));

test("SEP23-02: después de la baja del corredor, sus casos dejan de ser accesibles", async () => {
  const b = await brokers.getOrCreateBroker("sep23-02@example.com", "Corredor", null);
  const kase = await cases.createCase(b.id, "Familia", "compra");

  // Hoy DELETE /api/panel/profile hace exactamente esto y nada más —
  // una vez arreglado, reemplazar por la función de cascada compartida.
  await brokers.deleteBroker(b.id);
  await cases.downgradeCasesForInactiveBrokers(); // cron diario

  assert.equal(await cases.getCase(kase.id), null, "el caso sigue existiendo");
  assert.equal(await cases.getCaseByCredentials(kase.username, kase.password), null, "la familia sigue entrando");
});
```

</details>
