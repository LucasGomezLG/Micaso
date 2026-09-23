# Feedbacks — sesión 2026-09-22

Documento de trabajo: 8 feedbacks relevados a partir de capturas de pantalla
y una reproducción en vivo de un bug. Cada uno tiene el pedido original, el
estado actual del código (con archivo y línea), el cambio propuesto, y las
decisiones abiertas que necesitan tu OK antes de tocar código.

**Regla transversal — responsive:** todo ítem que agrega o cambia UI
(marcado con 📱 abajo) se revisa en mobile/sm/lg antes de darlo por
terminado, no alcanza con que el dato se vea en desktop.

**Estado (22 sept 2026): los 8 quedaron implementados y probados en vivo.**
Ver el resumen de verificación al final del documento — incluye un bug real
que encontré y arreglé durante el testing (no estaba en el plan original) y
uno preexistente que encontré pero no toqué por estar fuera de alcance.
Nada de esto está commiteado ni pusheado — queda en el working tree para
que lo revises vos antes.

---

## Orden sugerido de implementación

De más simple/aislado a más grande, para poder ir probando en pasos chicos:

1. **#7** — bug de login (aislado, un solo archivo, alto impacto)
2. **#3** — rename de etiqueta (trivial)
3. **#1** — decimales con coma en ARS
4. **#8** — apto crédito en alta + rename "no sé"→"sin dato"
5. **#5** — autocompletar al corredor en "Buscan"
6. **#4** — dirección de la propiedad (toca 6 archivos)
7. **#2** — autocálculo de USD desde el dólar
8. **#6** — popup de ficha completa en Agenda/Inicio (el más grande)

Si preferís otro orden o agruparlos distinto, decime y lo reacomodo.

---

## 1. Comas con decimales en Monto aprobado / Cuota aproximada (ARS)

**Aprobado:** [x] — implementado y probado (ver verificación al final)

### Pedido
Los campos "Monto aprobado (ARS)" y "Cuota aproximada (ARS)" del editor de
crédito no dejan escribir coma decimal (formato argentino). Pedido:
permitir coma con hasta 2 decimales.

### Estado actual
- `components/CriteriaEditor.tsx:96-115` — ambos campos son
  `<input type="number">`, con `onChange` que hace
  `Number(e.target.value) || 0`.
- Un `<input type="number">` nativo no acepta `,` como separador decimal
  en la mayoría de los navegadores (espera `.`) — hoy es literalmente
  imposible cargar centavos con el teclado en formato argentino.
- El propio dato semilla ya tiene decimales reales:
  `lib/seed.ts:23` → `approvedInstallmentArs: 822753.04`. No es un
  capricho — la cuota real de un crédito UVA trae decimales.
- El schema de backend ya acepta decimales sin problema:
  `lib/schemas.ts:154-155` → `z.number().finite().nonnegative()` (sin
  `.int()`). El límite es 100% de la UI, no del modelo de datos.
- Los helpers de formato (`lib/format.ts:21-37`, `formatArs`/`formatUsd`)
  redondean a 0 decimales para *mostrar* plata en el resto de la app — eso
  no cambia, es solo para display. Esto es puramente sobre poder *cargar*
  el decimal en este par de inputs de edición.

### Cambio propuesto
- Reemplazar `type="number"` por un input de texto controlado que:
  - acepte dígitos, un separador decimal (`,` o `.`) y hasta 2 decimales;
  - parsee a `number` real al guardar (coma → punto antes de `Number()`);
  - muestre el valor ya cargado con coma al reabrir el modal.
- Como son 2 campos con la misma necesidad (y el mismo patrón lo
  necesita el dólar de #2), conviene un helper chico compartido
  (`parseArsDecimal` / `formatArsDecimalInput` en `lib/format.ts`, o un
  componente `DecimalField`) en vez de duplicar la lógica de parseo dos
  veces — sin crear una abstracción más grande de la que hace falta.

### Alcance — confirmado
Solo estos 2 campos por ahora (más el nuevo campo de dólar de #2, que
nace ya con este patrón). El resto de los `type="number"` con plata
(`bankMaxUsd`, `ownFundsMinUsd/MaxUsd`, `priceUsd`, etc.) no se tocan
salvo pedido explícito. 📱

**Verificación de que no rompe otros cálculos** (pedida explícitamente):
recorrí todos los usos de `approvedAmountArs`/`approvedInstallmentArs`
en el repo — son solo 5, y ninguno asume enteros:
- `app/caso/page.tsx:270,274` — solo se muestran con `formatArs`
  (redondea a 0 decimales para mostrar, ya soporta cualquier decimal de
  entrada sin romperse).
- `components/CalculadoraClient.tsx:27` — `impliedFx =
  approvedAmountArs / bankMaxUsd` — es una división de JS, decimales no
  rompen nada, solo cambia la precisión del resultado.
- `components/CalculadoraClient.tsx:319-320` — mismo caso que
  `app/caso/page.tsx`, solo display con `formatArs`.
No hay ningún `parseInt`, truncamiento ni operación de texto que asuma
que estos dos campos son enteros. Riesgo confirmado como bajo.

---

## 2. Autocalcular el préstamo en USD desde el dólar

**Aprobado:** [x] — implementado y probado (ver verificación al final)

### Pedido
El campo "Préstamo máximo del banco (USD)" se carga a mano. Pedido:
agregar un campo de cotización del dólar y que el USD se autocalcule a
partir del "Monto aprobado (ARS)".

### Estado actual
- `components/CriteriaEditor.tsx:132-138` — `bankMaxUsd` es un
  `<input type="number">` de carga manual.
- `lib/types.ts:129-145` (`LoanInfo`) no tiene ningún campo de cotización
  — solo `bankMaxUsd`, `approvedAmountArs`, etc.
- Ya existe el cálculo inverso en la calculadora del cliente:
  `components/CalculadoraClient.tsx:27` →
  `impliedFx = approvedAmountArs / bankMaxUsd` (redondeado), usado solo
  como dato informativo ("Implícito en el pre-aprobado: X") en la propia
  calculadora — no persiste en ningún lado, se recalcula cada vez.

### Cambio propuesto
- Agregar un campo nuevo a `LoanInfo`: `fxRateArs: number` (cotización
  del dólar usada para el pre-aprobado, 0 = no cargada). Requiere tocar:
  - `lib/types.ts:129-145` (interface)
  - `lib/schemas.ts:149-158` (schema del loan)
  - `lib/store.ts:53-68` (`EMPTY_CRITERIA`, default `0`)
  - `lib/seed.ts:16-32` (`SEED_CRITERIA`, puede quedar en `0` o cargarle
    el valor real de Carolina/Lucas si lo tenés)

**Compatibilidad con casos ya existentes (chequeado):** `getCriteria()`
(`lib/store.ts:490-496`) devuelve el objeto tal cual está guardado en
Redis, sin rellenar campos nuevos — a diferencia de `getHouses()`, que sí
tiene ese mecanismo (`normalizeHouse`, ver detalle en #4). Sin un ajuste,
cualquier caso real que ya exista hoy (el de Carolina incluido) leería
`loan.fxRateArs` como `undefined`, no `0`. No rompe nada (el botón
"Autocalcular" quedaría deshabilitado hasta cargar la cotización, que es
lo correcto), pero conviene taparlo agregando a `getCriteria` el mismo
tipo de relleno que ya existe para `House`, para que `CriteriaEditor`
siempre reciba un `number` real y no un `undefined` silencioso.
- En `CriteriaEditor.tsx`: nuevo campo "Cotización del dólar (ARS)"
  (mismo input decimal de #1) junto a `bankMaxUsd`.
- `CalculadoraClient.tsx:198` — el hint "Implícito en el pre-aprobado"
  sigue funcionando igual sin cambios (válido como fallback para casos
  sin `fxRateArs`); opcionalmente, si `fxRateArs > 0`, mostrar ese valor
  real en vez de "implícito" ya que deja de ser una inferencia. Mejora
  opcional, no necesaria para que el pedido funcione.

### Decisión — confirmada: botón de autocálculo, no recálculo en vivo
`bankMaxUsd` sigue siendo un input editable normal, igual que hoy — **no**
pasa a solo lectura. Al lado (o cerca de `fxRateArs`), un botón chico
"Autocalcular" que, al clickearlo, hace
`bankMaxUsd = approvedAmountArs / fxRateArs` (habilitado solo cuando
ambos son > 0) y pisa el valor actual del campo con el resultado.

Clave: el cálculo **no** se dispara solo en cada tecleo de `fxRateArs`
o `approvedAmountArs` — solo al apretar el botón. Así:
- se puede autocompletar con un click cuando se carga/cambia la
  cotización;
- si el corredor después edita `bankMaxUsd` a mano (por la razón que
  sea), no hay ningún `useEffect` reactivo que se lo vuelva a pisar
  solo — el único momento en que se recalcula es una acción explícita.
📱

---

## 3. "Si aparece algo en Capital" → genérico

**Aprobado:** [x] — implementado y probado (ver verificación al final)

### Pedido
La etiqueta dice "Si aparece algo en Capital" — debería ser "Si aparece
algo en", sin asumir que la zona aspiracional es siempre Capital Federal.

### Estado actual
- `components/BriefEditor.tsx:95-101` y `app/caso/page.tsx:227` — texto
  fijo "Si aparece algo en Capital" en ambos lugares.
- El dato subyacente se llama `capitalZones` en 7 archivos
  (`lib/types.ts`, `lib/schemas.ts`, `lib/store.ts`, `lib/seed.ts`,
  `components/BriefEditor.tsx`, `app/caso/page.tsx`,
  `app/caso/casas/page.tsx`) — el nombre interno del campo sigue
  hablando de "Capital", pero eso no se ve en pantalla.

### Cambio propuesto
Cambiar el texto visible en los 2 lugares a "Si aparece algo en" (sin
"Capital"). **No** renombrar el campo `capitalZones` en el modelo de
datos — es un cambio de copy, no de estructura, y tocar el nombre interno
en 7 archivos no aporta nada visible a cambio del riesgo de romper algo.

### Fuera de alcance (a menos que digas lo contrario)
Que el usuario pueda nombrar esa categoría libremente (en vez de un texto
fijo, aunque sea genérico) es un cambio de modelo de datos más grande.
Lo dejo anotado como posible feedback futuro, no lo incluyo acá.

---

## 4. Dirección exacta de la propiedad

**Aprobado:** [x] — implementado y probado (ver verificación al final)

### Pedido
Falta poder cargar la dirección exacta de una propiedad (no solo la
zona), para que el calendario y el mapa la puedan usar. Debe poder
cargarse al alta y editarse después desde el lapicito de la card.

### Estado actual
`House` (`lib/types.ts:82-118`) tiene `zone: string | null` (texto libre,
ej. "Villa Ballester") pero no tiene `address`. Puntos que hoy muestran
`zone` donde debería poder mostrarse `address`:

| # | Lugar | Archivo |
|---|---|---|
| 1 | Card de la propiedad | `components/HouseCard.tsx:440-442` |
| 2 | Agenda de visitas | `app/caso/agenda/page.tsx:187-189` |
| 3 | "Próximas visitas y acciones" (Inicio) | `app/caso/page.tsx:113-117` (hoy con fallback raro: `zone ?? source`, por eso a veces muestra "ArgenProp" en vez de una zona) |
| 4 | Evento `.ics` del calendario | `lib/ics.ts:106` (`LOCATION:`) |
| 5 | Link "Agregar a Google Calendar" | `lib/ics.ts:139-141` (`location` del template URL) |
| 6 | Geocoding para el pin del mapa | `lib/geocode.ts:20` + `app/api/houses/route.ts:32` (alta) + `app/api/houses/[id]/route.ts:28-34` (edición) |

Alta y edición del dato:
- `components/AddHouseModal.tsx` — no tiene campo de dirección. El campo
  "Zona" está en las líneas 499-506; el nuevo campo de dirección iría
  justo antes o después de ese.
- `components/EditHouseModal.tsx:147-156` — mismo caso, el bloque "Zona"
  está ahí junto a "Cochera"; agregar "Dirección" al lado.

### Cambio propuesto
1. **Modelo de datos** — agregar `address: string | null` a:
   - `lib/types.ts:82-118` (`House`)
   - `lib/schemas.ts:74-94` (`housePatchableFields` — cubre alta y
     edición en un solo lugar, `z.string().max(300).nullable()`)
   - `lib/seed.ts:71-130` (sumar `"address"` a `SeedFields` con default
     `null`, mismo patrón que `contactoNombre`/`superficieM2`)
   - `lib/store.ts:93-103` (`NEW_FIELD_DEFAULTS`) — sumar `address: null`
     ahí. **Este paso es el que hace que sea compatible con casas ya
     guardadas en Redis**: es el mecanismo que ya usa el proyecto para
     esto (`normalizeHouse`, línea 113-127, aplicado en cada
     `getHouses()`) — así se agregó `aptoCredito` en su momento, ya
     probado en producción. Sin este paso, una casa vieja leería
     `address` como `undefined` en vez de `null`; con él, se rellena
     sola en cada lectura, sin tocar los datos guardados.
2. **Alta** (`AddHouseModal.tsx`) — nuevo campo "Dirección" (texto libre,
   opcional) cerca de "Zona".
3. **Edición** (`EditHouseModal.tsx`) — mismo campo, mismo patrón que
   `zone` (placeholder "Sin dato").
4. **Display** (puntos 1-3 de la tabla) — mostrar `house.address ??
   house.zone` en vez de solo `house.zone`. En el punto 3 (Inicio),
   además corregir el fallback raro (`zone ?? source`) a
   `address ?? zone ?? source`.
5. **Calendario** (puntos 4-5) — en `lib/ics.ts`:
   - `IcsHouse` (línea 73-76) necesita sumar `"address"` al `Pick<House, ...>`.
   - `buildVisitIcs` (línea 106) y `buildGoogleCalendarUrl` (línea 139-141)
     pasan a usar `house.address ?? house.zone` en vez de solo `house.zone`.
   - `test/ics.test.mts:48` tiene un assert exacto sobre el `LOCATION:`
     actual — hay que sumarle un caso con `address` cargada, sin romper
     el caso existente (sin dirección, cae a zona, igual que hoy).
6. **Geocoding / mapa** (punto 6) — en las dos rutas de API, geocodificar
   con `body.address || body.zone` (alta) y re-geocodificar cuando
   cambie *cualquiera* de los dos (hoy `[id]/route.ts:28` solo dispara si
   cambia `zone`). `geocodeZone()` en sí no cambia — ya geocodifica
   cualquier texto libre contra Nominatim, no le importa si es zona o
   dirección.

### Decisión — confirmada: "lo que se pueda sin violar normas de sitios"
Leí `app/api/scrape/route.ts` a fondo para esto. El dato importante:
**los 3 portales más usados ya están completamente bloqueados para
autofill por sus propios términos de uso** —
`isBlockedForAutoFill()` (línea 178-185) corta cualquier fetch
automático a MercadoLibre, ArgenProp y ZonaProp (verificado contra sus
ToS, con fecha, en el comentario de la línea 159-177 y en
`ARQUITECTURA.md` sección 9). Para esos, hoy no se trae ni foto ni
precio — solo se lee el slug de texto que ya viene en la URL pegada
(`guessFromBlockedUrlSlug`, línea 197-229), y esos portales
deliberadamente no ponen la dirección exacta en la URL (es su modelo de
negocio: ocultarla hasta que el interesado los contacte). Conclusión:
**para esos 3 sitios, la dirección va a seguir siendo 100% carga
manual** — no hay nada legítimo de dónde sacarla sin violar sus normas,
igual que ya pasa con foto y precio ahí.

Para los sitios **no bloqueados** (Mudafy fuera de `/ficha/*`, RE/MAX,
y cualquier otro portal que no esté en la lista) sí se hace un fetch
completo de la página — ahí es gratis sumar la extracción de dirección
al mismo pipeline que ya saca precio/ambientes/superficie, sin ningún
riesgo nuevo (es la misma página ya permitida, un campo más a leer):
- JSON-LD (`guessFromJsonLd`, línea 101-134): schema.org suele traer
  `address.streetAddress` — sumar esa lectura igual que ya se lee
  `numberOfRooms`/`floorSize`.
- Microdata (`extractItemprop`, línea 42-52): buscar
  `itemprop="streetAddress"`, mismo patrón que ya se usa para `image`.

Resumen: se implementa el autofill de dirección para los sitios donde ya
se hace scraping legítimo hoy; para los 3 bloqueados, sigue siendo manual
— consistente con cómo ya se trata todo lo demás en esos sitios. 📱

---

## 5. Autocompletar al corredor en "Buscan"

**Aprobado:** [x] — implementado y probado (ver verificación al final)

### Pedido
Cuando el corredor crea un caso, su propio nombre debería aparecer solo
en la lista "Buscan" (el array de personas), sin que tenga que agregarse
a mano después.

### Estado actual
- `app/api/panel/cases/route.ts:6-33` — el corredor manda `people` desde
  `components/CreateCaseModal.tsx` (un campo de texto separado por
  comas, pensado para los nombres de los clientes) y eso se pasa tal
  cual a `createCase()`.
- `lib/cases.ts:129-159` (`createCase`) ya deduplica el array recibido
  (`Array.from(new Set(...))`), así que agregar el nombre del corredor
  ahí no genera duplicado si el corredor también se escribe a mano.
- **Ya existe el mismo patrón en otro lado**, para el caso análogo de
  "quien agrega una casa": `app/api/houses/route.ts:41-48` — si
  `addedBy` no está en `kase.people`, lo suma automáticamente con
  `updatePeople(caseId, [...kase.people, author])`. La solución de este
  feedback es replicar ese mismo criterio en la creación del caso, no
  inventar uno nuevo.
- El corredor (`Broker`, `lib/types.ts:175-178`) no tiene un campo de
  "nombre de pila" limpio — solo `nombreMarca`, que arranca como el
  nombre de Google (`googleName || email`, `lib/brokers.ts:97`) pero el
  corredor lo puede renombrar después a un nombre de marca/negocio desde
  su panel.

### Cambio propuesto
En `app/api/panel/cases/route.ts`, antes de llamar a `createCase`,
anteponer el nombre del corredor a `initialPeople`:
```
const brokerFirstName = broker.nombreMarca.trim().split(/\s+/)[0];
initialPeople = [brokerFirstName, ...initialPeople];
```
`createCase` ya deduplica, así que no hace falta chequear si ya está.

### Decisión — confirmada: primera palabra de `nombreMarca`
Ej. "Carolina Gómez" → "Carolina". Si en algún momento lo renombra a algo
como "RE/MAX Norte", quedaría "RE/MAX" — el corredor puede sacarse de la
lista a mano con el botón "×" del chip si queda raro (mismo control que
ya existe en `PeopleEditor.tsx`), así que es un caso raro y reversible,
no bloqueante.

---

## 6. Popup con la ficha completa de la casa (Agenda + Inicio)

**Aprobado:** [x] — implementado y probado (ver verificación al final)

### Pedido
En la Agenda y en "Próximas visitas y acciones" del Inicio, al clickear
una propiedad debería abrirse un popup con la ficha completa (editable,
con comentarios) — la misma que se usa en Casas — en vez de redirigir a
`/caso/casas`. Confirmado con vos: es el mismo componente reusado, no una
copia — así queda sincronizado automáticamente porque pega contra el
mismo registro en Redis.

### Estado actual
- **Casas** (`components/CasasBoard.tsx:520`) ya usa `HouseCard` así:
  `<HouseCard house={house} loan={loan} people={people} onChange={handleChange} onDelete={handleDelete} />`.
  `handleChange`/`handleDelete` (líneas 192-227) son genéricos: pegan
  contra `PATCH/DELETE /api/houses/[id]` y listo — no dependen del resto
  del tablero (filtros, ordenamiento), son reusables tal cual.
- `HouseCard.tsx` es un componente `"use client"` autocontenido: maneja
  sus propios comentarios (líneas 86-135), checklist, `EditHouseModal`
  interno (línea 768), y el review de visita (`VisitReview`, línea
  483-484) — todo lo que se ve en Casas ya vive ahí adentro.
- **Agenda** (`app/caso/agenda/page.tsx`) es un Server Component puro,
  hoy solo carga `getHouses()` (línea 25) — no tiene `loan` ni `people`.
  Dos links navegan a `/caso/casas#house-{id}`:
  - línea 180-184 (título de la visita)
  - línea 226-236 ("¿Cómo les fue? Calificar →", en visitas pasadas)
  
  Este segundo link es relevante: califica la visita usando
  `VisitReview`, que **ya está adentro de `HouseCard`** (línea 483-484
  de HouseCard.tsx). Si abrimos el mismo popup ahí en vez de navegar,
  "Calificar" deja de necesitar su propio link — el popup ya muestra esa
  sección. Ver decisión abajo.
- **Inicio** (`app/caso/page.tsx`) ya carga `criteria` (con `loan`) y
  `kase.people` en la línea 52-53 — no hace falta agregar fetching acá,
  solo usar lo que ya está en scope. El link a reemplazar está en la
  línea 109-133 (todo el bloque, el link envuelve título + acción
  pendiente + badge de visita).
- Referencia de cómo Casas obtiene `loan`/`people`:
  `app/caso/casas/page.tsx:13` →
  `Promise.all([getHouses(caseId), getCriteria(caseId), getCase(caseId)])`.

### Cambio propuesto
1. Nuevo componente cliente, ej. `components/HouseQuickView.tsx`:
   recibe `house`, `loan`, `people`, y el elemento disparador (el título,
   como children). Maneja su propio `open` state, portal + overlay +
   `useModalScrollLock` (mismo patrón que `AddHouseModal`/
   `EditHouseModal`), y adentro renderiza `<HouseCard house={...} loan={loan} people={people} onChange={...} onDelete={...} />`.
   `onChange`/`onDelete` locales: mismo patrón de `CasasBoard.tsx:192-227`
   (fetch PATCH/DELETE + `router.refresh()`), sin la maquinaria de
   filtros/optimistic-list que no aplica a un solo item.
2. **Agenda** (`app/caso/agenda/page.tsx`):
   - Sumar `getCriteria(caseId)` y `getCase(caseId)` al `Promise.all` de
     la línea 25, pasar `loan`/`people` a través de `DayGroup` (línea
     118-256) hasta cada fila.
   - Reemplazar el `<Link>` de la línea 180-184 por
     `<HouseQuickView house={house} loan={loan} people={people}>{house.title}</HouseQuickView>`.
3. **Inicio** (`app/caso/page.tsx:109-133`): mismo reemplazo, usando el
   `loan`/`people` que ya están en scope — sin fetching nuevo acá.
4. **Estilo del popup**: ancho más generoso que los modales de
   formulario (`AddHouseModal`/`EditHouseModal` usan `max-w-md`) porque
   `HouseCard` trae fotos, comentarios y checklist — probar en mobile/sm/lg
   y ajustar el ancho empíricamente, no fijarlo a ciegas de antemano. 📱

### Decisión — confirmada
El link "Calificar →" de visitas pasadas (`agenda/page.tsx:226-236`)
también pasa a abrir el mismo popup (`HouseQuickView`) en vez de navegar
a Casas — mismo comportamiento en toda la pantalla de Agenda, ya que
`VisitReview` vive adentro de `HouseCard` y el popup lo muestra sin nada
extra.

---

## 7. Bug: magic link de caso ignorado con sesión de Google activa

**Aprobado:** [x] — implementado y probado (ver verificación al final)

### Repro
Vos, logueado con tu cuenta de Google (corredor/super-admin), abriste el
link mágico de otro corredor (compartido a un cliente por WhatsApp) y
terminaste en tu propio panel de corredor, no en el caso.

### Causa raíz
`proxy.ts:109-119`:
```js
const isCaseLoginWithParams = pathname === "/login" && request.nextUrl.searchParams.has("u");
if (userEmail && !isCaseLoginWithParams && (pathname === "/panel/login" || pathname === "/login")) {
  ...
  return NextResponse.redirect(new URL("/panel", request.url));
}
```
`isCaseLoginWithParams` solo excluye el login de usuario/contraseña
(`?u=`), pero **no** el magic link (`?t=`). El único bloque que sí
procesa `t` es `proxy.ts:76-98`, y ese solo corre si ya existe una cookie
de sesión de *caso* válida (`loggedCaseId`) — no es tu situación: vos
tenías sesión de Google, no cookie de caso. Entonces el `t` nunca se
llega a mirar y el request cae directo en el `redirect("/panel")`.

**Alcance real:** no es fuga de datos entre corredores — viste tu propio
panel, no el caso ajeno. Es una rotura funcional: cualquier corredor o
super-admin con sesión de Google activa que abre un link mágico de caso
(el suyo o el de otro corredor) queda atrapado en su panel sin poder
entrar al caso desde ese link. Le pasaría también a un corredor que
figura como "persona" en su propio caso (ver #5) si prueba el link
estando logueado como corredor.

### Cómo se comporta hoy un link mágico "normal" (sin sesión de Google)
`app/login/page.tsx` → `components/LoginForm.tsx:17` lee `t` de la URL y
manda `{ token: magicToken }` a `/api/login`, que valida el token,
setea la cookie de caso y redirige a `/caso`. Este camino funciona bien
hoy — el fix no debe tocarlo.

### Fix propuesto
En `proxy.ts`, usar `verifyMagicLinkToken` (ya importado en la línea 6)
para decidir si hay algo real que honrar antes de aplicar el atajo a
`/panel`:
```js
const magicToken = pathname === "/login" ? request.nextUrl.searchParams.get("t") : null;
const hasValidMagicToken = magicToken ? verifyMagicLinkToken(magicToken) !== null : false;
const isCaseLoginWithParams =
  pathname === "/login" && (request.nextUrl.searchParams.has("u") || hasValidMagicToken);
```
Con esto: si el token es válido, el usuario con sesión de Google cae al
`/login` normal y `LoginForm` procesa el magic link igual que a
cualquier visitante — la cookie de caso y la sesión de Google son
cookies distintas, conviven sin problema. Si el token es inválido/vencido,
se mantiene el comportamiento actual (redirect a `/panel`, no hay nada
legítimo que honrar).

### Alternativa considerada y descartada
Chequear solo `.has("t")` sin validar el token (igual de estricto que el
chequeo que ya existe para `u`). Menos código, pero un link vencido
mostraría el formulario de login con un error en vez de mandar directo al
panel. Me quedo con la versión que valida con `verifyMagicLinkToken` (ya
importado, una línea más) por ser más precisa sin costo real extra.

### Testing sugerido
No vi tests de `proxy.ts` en el repo (busqué `test/`) — este fix se
verificaría a mano: sesión de Google activa + link mágico propio (debe
entrar al caso), sesión de Google activa + link vencido (debe ir a
panel, sin cambios), sin sesión + link mágico (debe seguir funcionando
igual que hoy).

---

## 8. Apto crédito en "Agregar casa" + rename "no sé" → "sin dato"

**Aprobado:** [x] — implementado y probado (ver verificación al final)

### Pedido
Que aparezca un control (como el de "Tiene cochera") para apto crédito
en el alta de la propiedad, default "Sin dato". Y cambiar "No sé" por
"Sin dato" en la card.

### Estado actual
- `AptoCredito` (`lib/types.ts:1`) es de **3 estados**:
  `"no_se" | "si" | "no"` — a diferencia de `cochera`, que es booleano.
  El default ya es `"no_se"` en todos lados (`lib/store.ts:102`,
  `lib/seed.ts:120`) — eso no cambia.
- `components/AddHouseModal.tsx` no tiene ningún control para
  `aptoCredito` — se agregaría después de "Tiene cochera" (línea
  508-515).
- `components/EditHouseModal.tsx` **tampoco** lo tiene — hoy solo se
  edita ciclando el badge en la card (`HouseCard.tsx:407-416`,
  `APTO_CREDITO_NEXT`, línea 48-52). No lo pediste explícitamente para
  edición, pero como ya agregamos "Cochera" con un `<Select>` de 3
  opciones en `EditHouseModal.tsx:157-168` (mismo patrón: `unknown` /
  `yes` / `no`), agregar "Apto crédito" ahí con el mismo `<Select>`
  queda consistente casi gratis. Ver decisión abajo.
- **El rename ya es inconsistente en el código**, no hace falta
  inventarlo: `components/CompareTable.tsx:285` ya dice
  `"Apto crédito: sin dato"`, y el mismo patrón de Cochera en esa
  pantalla (línea 262) también dice "Sin dato". El único lugar que
  todavía dice "no sé" es `components/HouseCard.tsx:55` →
  `no_se: "Apto crédito: no sé"`.

### Cambio propuesto
1. **Rename** — `HouseCard.tsx:55`: `"Apto crédito: no sé"` →
   `"Apto crédito: sin dato"` (un solo cambio de string, ya coincide con
   el resto de la app).
2. **Alta** (`AddHouseModal.tsx`) — nuevo campo "Apto crédito" con
   `<Select>` de 3 opciones (`Sin dato` / `Sí` / `No`), mismo componente
   `Select` que ya se usa en el propio archivo para "Quién la agrega"
   (línea 530). No es un checkbox porque el dato tiene 3 estados, no 2 —
   distinto de "Tiene cochera".
3. `lib/schemas.ts:84` (`aptoCredito: aptoCreditoSchema`) ya está en
   `housePatchableFields`, que cubre tanto alta como edición — no hace
   falta tocar el schema, ya acepta el campo en el POST.

### Decisión — confirmada
Se agrega también en **`EditHouseModal.tsx`**, junto a "Cochera"
(línea 157-168), mismo componente `<Select>` con las mismas 3 opciones
(Sin dato / Sí / No) — por consistencia entre los dos campos de esa
pantalla. El badge cíclico de la card (`HouseCard.tsx:407-416`) queda
como está, como forma rápida adicional de cambiarlo sin abrir el modal.
📱

---

## Verificación (22 sept 2026)

Implementado todo en orden y probado antes de dar por terminado, no solo
análisis estático:

- **Tests automáticos:** `npm test` — 64/64 pasan (sumé un test nuevo en
  `test/ics.test.mts` para el fallback `address` → `zone` en el `.ics`).
- **Tipos:** `npx tsc --noEmit` — sin errores.
- **Lint:** `npx eslint .` — sin errores (4 warnings de `useEffect` sin
  usar, preexistentes en `BriefEditor`/`CreateCaseModal`/`CriteriaEditor`/
  `EditHouseModal`, confirmé por `git diff` que ninguno lo causó este
  trabajo).
- **Build:** `npm run build` — build de producción completo, sin errores.
- **Prueba en vivo (navegador, Playwright headless):** levanté la app con
  `npm run dev` y probé cada feedback de verdad, en desktop (1280px) y
  mobile (375px):
  - #3: confirmado que "Si aparece algo en Capital" desapareció y quedó
    "Si aparece algo en".
  - #1: tipeé "822753,04" en Monto aprobado (ARS) y la coma se mantuvo
    tal cual, en desktop y mobile.
  - #2: cargué cotización + monto aprobado, confirmé que "Autocalcular"
    arranca deshabilitado y se habilita solo cuando ambos están cargados,
    y que al clickearlo calcula `bankMaxUsd` correctamente
    (`Math.round(monto / cotización)`).
  - #8: confirmé "Dirección (opcional)" y "Apto crédito" en el alta, y
    "Dirección" + "Apto crédito" en la edición, en desktop y mobile.
  - #5: creé un caso nuevo desde cero como corredora "Carolina" **sin
    tipear ninguna persona** — "Carolina" apareció sola en "Buscan".
  - #4: cargué una propiedad con dirección "Av. Test 1234, Villa
    Ballester" — confirmé que se ve en Casas y en la Agenda (en vez de
    la zona).
  - #6: desde la Agenda y desde "Próximas visitas y acciones" del
    Inicio, confirmé que clickear la propiedad abre el popup con la
    ficha completa (comentarios, checklist, edición) **sin cambiar de
    URL** — no navega a Casas.
  - Usé un caso de prueba descartable (creado y borrado por mí, no toqué
    el caso demo ni datos reales de Carolina) porque el caso demo
    bloquea escrituras sin sesión real de Google — eso ya lo sabía por
    el análisis de #7, no es una sorpresa nueva.

### Bug encontrado y arreglado durante el testing (no estaba en el plan)
Al probar el popup de #6, el botón de cerrar ("×") quedaba **exactamente
superpuesto** con el botón de "marcar como favorita" (la estrella) que
`HouseCard` ya tiene en esa misma esquina — Playwright literalmente no
podía clickear "Cerrar" porque la estrella le tapaba el click. Lo
solucioné sacando el botón de cerrar afuera del recorte de la card, como
un botón flotando en la esquina del popup en vez de encima de la imagen
(`components/HouseQuickView.tsx`). Ya no se superponen — verificado de
nuevo después del fix, en desktop y mobile.

### Bug preexistente encontrado, NO arreglado (fuera de alcance)
Al renderizar por primera vez una propiedad con visita coordinada,
apareció un warning de **hydration mismatch de React** en
`VisitaCoordinadaBadge` (la fecha/hora formateada con `Intl.DateTimeFormat`
difiere un carácter invisible entre el render de servidor y el de
navegador — típico de "a. m./p. m." con espacio angosto). Confirmé por
`git diff` que no toqué `VisitaCoordinadaBadge.tsx` ni las funciones de
formato de fecha existentes (solo agregué funciones nuevas a
`lib/format.ts`), así que esto ya estaba en el código antes de esta
sesión — probablemente nunca se vio porque ninguna casa de la demo tenía
`visitaFecha` cargada hasta que yo cargué una para poder probar. Como
afecta a cualquier visita coordinada real (no solo a lo que yo agregué),
te lo marco para que decidas si lo agregamos como feedback #9, pero no lo
toqué porque no era parte de lo que me pediste hoy.
