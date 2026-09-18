# Mejoras rápidas de alto valor

> **Estado: COMPLETADO (18 sept 2026)**
> Todas las 9 mejoras detalladas en este documento han sido implementadas en el "Lote 3", probadas y pusheadas a producción, incluyendo la reescritura total del flujo de geocodificación mediante la API de Nominatim, accesibilidad, modals transaccionales y performance móvil.

Backlog de mejoras concretas, de esfuerzo bajo y alto valor, encontradas
al explorar el repo (no una auditoría exhaustiva). Surgió de revisar el
diff grande de UX/seguridad que ya se mergeó (ver `ARQUITECTURA.md`,
addendum del 18 sept 2026), más una pasada dirigida por el codebase
buscando estados de carga/error, duplicación de código, accesibilidad y
detalles de PWA/mobile.

Cada punto tiene evidencia verificada contra el código real (no
especulación), salvo el último, marcado explícitamente.

---

## 1. No hay `loading.tsx` en ninguna ruta

**Alto valor · esfuerzo bajo**

No existe ni un solo `loading.tsx` en todo `app/`. Las páginas bajo
`app/caso/*` y `app/panel` (`app/caso/page.tsx`, `app/caso/casas/page.tsx`,
`app/caso/agenda/page.tsx`, `app/caso/checklist/page.tsx`,
`app/panel/page.tsx`) son Server Components con
`export const dynamic = "force-dynamic"` que hacen `await` a Redis
(`getHouses`, `getCriteria`, `getCase`) antes de renderizar.

**Por qué importa:** el bottom tab bar de mobile (`components/Nav.tsx`,
líneas 139-172) es lo que una familia toca constantemente desde el
celular — Inicio / Casas / Agenda / Checklist. Sin `loading.tsx`, cada
toque se siente congelado hasta que resuelve el fetch, en vez de mostrar
un skeleton instantáneo. Next.js maneja el Suspense boundary solo por
convención de archivo — no hay que tocar nada más del código existente.

**Esfuerzo:** archivos nuevos, un skeleton simple por ruta.

---

## 2. Patrón scroll-lock + Escape duplicado a mano en 7 modales — ya causó un bug real

**Alto valor · esfuerzo bajo**

El mismo bloque de ~12 líneas (`useEffect` con
`document.body.style.overflow` + `addEventListener("keydown", ...)`) está
copiado a mano en:

- `components/AddHouseModal.tsx:84-96`
- `components/EditHouseModal.tsx:42-52`
- `components/BriefEditor.tsx:19-29`
- `components/CriteriaEditor.tsx:20-30`
- `components/CreateCaseModal.tsx:37-53`
- `components/HouseCard.tsx:115-125`
- `components/ContactModal.tsx:24-34`

`components/ClientOnboardingModal.tsx:39-46` copió solo la mitad (el
scroll-lock) y **se olvidó del handler de Escape** — confirmado leyendo
el archivo: es el único modal de toda la app donde Escape no cierra.

**Por qué importa:** confirma que vale la pena un hook compartido
`useModalScrollLock(open, onClose)` (no existe carpeta de hooks
compartidos todavía). Además de eliminar la duplicación, arregla el bug
real en `ClientOnboardingModal`.

**Esfuerzo:** extraer el hook y reemplazar 8 call sites — mecánico.

---

## 3. `alert()` / `confirm()` nativos en los botones de facturación

**Alto valor · esfuerzo bajo**

`components/CancelSubscriptionButton.tsx` usa `confirm()` nativo (línea
10) y `alert()` con mensaje genérico fijo (línea 27) — confirmado leyendo
el archivo completo. No usa `apiErrorMessage` como el resto del código
(ver `components/CasasBoard.tsx:202,218` o `components/CompareTable.tsx:28`).
`components/SubscribeButton.tsx` también usa `alert()`.

**Por qué importa:** son las dos acciones más sensibles del negocio — dar
de alta o cancelar la suscripción paga del corredor. Un `alert()`/`confirm()`
nativo se ve roto justo en el momento de pagar o cancelar, y al no usar
`apiErrorMessage` siempre muestra el mismo mensaje genérico aunque el
servidor tenga un motivo más específico (ej. Mercado Pago rechazó la
tarjeta).

**Esfuerzo:** swap directo a `toast.error(await apiErrorMessage(res, ...))`;
para el `confirm()` de cancelación, ya existe el patrón de modal de
confirmación propio en `components/AdminCaseCard.tsx:185` y
`components/AdminBrokerEditor.tsx:197` para copiar.

---

## 4. Botones solo-ícono con `title` pero sin `aria-label`

**Alto valor · esfuerzo bajo**

`components/HouseCard.tsx` tiene 8 botones ícono-solo con `title=` pero
sin `aria-label=`: flechas de foto (líneas 294, 306), refrescar (664),
compartir (675), editar (728), archivar (748), y el botón de favorito del
footer (736-746). El botón de favorito flotante sobre la foto (líneas
351-359) sí tiene ambos — la misma acción de toggle favorito está
implementada dos veces en el mismo archivo con accesibilidad
inconsistente. `components/CaseRow.tsx:322-349` suma 3 más (copiar
credenciales, compartir por WhatsApp, entrar como caso).

**Por qué importa:** `title` no se ve en touch (no hay hover en celular)
y los lectores de pantalla no siempre lo anuncian en un `<button>`. Para
un usuario vidente en el celular tampoco hay ninguna pista textual — solo
un ícono sin explicación hasta que lo tocan.

**Esfuerzo:** agregar `aria-label` calcado del `title` existente en cada
botón.

---

## 5. Sin `error.tsx` por segmento bajo `app/caso/*`

**Valor medio · esfuerzo bajo**

Solo existe `app/error.tsx` (raíz). `app/caso/layout.tsx:32-70` monta
`<Nav>` + footer alrededor de `{children}`; si `getHouses`/`getCriteria`/`getCase`
tira (un hiccup transitorio de Redis — `ARQUITECTURA.md` documenta que la
escritura en Redis producción "sigue siendo un GET y despues un SET, no
una transacción real"), el error burbujea hasta el error boundary raíz y
el usuario pierde el Nav, el footer y el contexto del caso.

**Por qué importa:** en vez de un error contenido con botón "reintentar"
que lo deja en su caso, cae a una pantalla genérica que no sabe a qué
caso volver.

**Esfuerzo:** un `app/caso/error.tsx` — puede reusar casi el mismo markup
que `app/error.tsx:19-77`.

---

## 6. Inputs de login de caso sin `autoComplete` / `name`

**Valor medio · esfuerzo bajo**

`components/LoginForm.tsx:117-127` (usuario) y `132-138` (contraseña) no
tienen `autoComplete` ni `name`. Las contraseñas se generan con
`randomCode(12)` (`lib/cases.ts:111`) — 12 caracteres al azar. El primer
ingreso es automático vía link `?u=&p=`, pero cualquier reingreso
posterior (otro dispositivo, cookie vencida a los 90 días —
`app/api/login/route.ts:47`, logout) obliga a la familia a tipear a mano
esa contraseña random en el celular, sin que el navegador pueda sugerir
autocompletar ni ofrecer guardarla.

**Por qué importa:** es exactamente el perfil de usuario de esta app —
familia en el celular tipeando credenciales largas sin sentido
nemotécnico.

**Esfuerzo:** agregar `autoComplete="username"` / `"current-password"` y
`name="username"` / `"password"`.

---

## 7. `<img>` nativos sin `loading="lazy"`

**Valor bajo · esfuerzo muy bajo**

Ninguno de los `<img>` ya reconocidos como deliberados (con
`eslint-disable-next-line @next/next/no-img-element`) tiene
`loading="lazy"`: `components/CompareTable.tsx:41,194` (miniatura por
cada casa en la tabla de comparación), `components/Nav.tsx:93` (avatar
del corredor en cada página), `components/BrokerProfileModal.tsx:62`,
`components/BrokerOnboarding.tsx:200,283`, `components/AdminBrokerEditor.tsx:78`.

**Por qué importa:** menor de la lista, pero `CompareTable` en particular
puede renderizar varias miniaturas de golpe en la vista de comparar casas
en mobile.

**Esfuerzo:** un atributo por `<img>`.

---

## 8. Sin `overscroll-behavior-y` — especulativo

**Valor incierto (no confirmado) · esfuerzo muy bajo**

`app/globals.css` no define `overscroll-behavior` en ningún selector
(verificado por grep). **Esto es una hipótesis, no un bug confirmado en
dispositivo real.**

**Por qué podría importar:** cuando la app corre en el navegador móvil
normal (antes de "agregar a inicio" como PWA), un swipe hacia abajo
arriba del todo de una lista larga — el caso real de Lucas tiene 41
propiedades cargadas — puede disparar el refresh nativo del navegador y
perder el estado de filtros/búsqueda de `CasasBoard`.

**Esfuerzo:** una línea CSS (`html, body { overscroll-behavior-y: contain; }`)
— lo suficientemente barato como para probarlo igual pese a la
incertidumbre.

---

## 9. Mapa vacío (sin aviso) para cualquier zona fuera de las 19 hardcodeadas

**Alto valor · esfuerzo medio** (no es un quick win como el resto de la lista, pero se documenta acá)

`lib/zoneCoords.ts` tiene una tabla fija de 19 zonas (Martínez, Olivos,
Vicente López, San Andrés, Villa Ballester, San Martín... todo Zona
Norte, la zona de búsqueda de Lucas). `matchZoneCoord()` devuelve `null`
en silencio para cualquier `house.zone` que no matchee ninguno de esos 19
nombres — la casa se omite del mapa sin error ni aviso.

**Confirmado en vivo contra datos reales:** el caso de Carolina ("Familia
Mendez", casas en Palermo) carga `/caso/casas/mapa` sin errores pero con
**0 marcadores** — mapa completamente vacío, además centrado en Zona
Norte (lejos de Palermo). Es el único corredor real hoy, y el mapa ya
está roto para él en producción.

**Por qué importa:** el mapa se ve "andando" (no tira error) pero no
muestra nada útil para cualquier corredor cuyos clientes busquen fuera de
Zona Norte — que es la norma, no la excepción, para un producto que se
vende a corredores de cualquier zona del país.

**Recomendación (18 sept 2026):** geocodificar el campo `zone` con
**Nominatim** (API de búsqueda de OpenStreetMap — mismo proveedor que ya
se usa para las tiles del mapa, gratis, sin nuevo proveedor). Se llama
una vez al guardar la casa (no en cada render del mapa), se cachea el
lat/lng resultante en la propiedad, y si falla o no hay match cae al
`matchZoneCoord` actual como fallback — sin regresión.

Como geocodifica el texto de zona en vez de scrapear la página del
portal, funciona igual para casas de MercadoLibre/ArgenProp/ZonaProp que
para cualquier otra — no depende de qué sitios están bloqueados por ToS
(ver más arriba, sección de scraping en `ARQUITECTURA.md`).

**Trade-off:** Nominatim pide máximo 1 request/segundo y no hay dirección
real para geocodificar (`zone` es texto libre tipo "Palermo" o "Villa
Ballester (Geodesia)"), así que la precisión sigue siendo de barrio, no
de calle exacta — mismo nivel que tiene hoy la tabla fija, pero
automático para cualquier zona en vez de las 19 hardcodeadas.

---

## Descartado por no ser claramente bajo esfuerzo

Memoizar `HouseCard` con `React.memo` tendría valor en listas de 40
casas, pero `handleChange`/`handleDelete` en
`components/CasasBoard.tsx:192,507` no están envueltos en `useCallback` —
el memo no serviría de nada sin tocar también esos callbacks. Tampoco se
incluye el punto de `ARQUITECTURA.md` sobre `dbUpdate` sin transacción
real en Redis producción, porque el propio documento lo marca como
"riesgo aceptado" de esfuerzo medio/alto.
