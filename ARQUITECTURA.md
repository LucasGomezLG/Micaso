# De herramienta personal a SaaS para corredores

> Documento de arquitectura — Micaso · 13 sept 2026 (estado actualizado 20 sept 2026)
> Estado: **en construcción activa, en vivo en `micaso.com.ar`.** Núcleo multi-caso, panel de corredor (con login real por Google), super-admin con control por corredor, landing pública, Mercado Pago (suscripciones vía Preapproval, ARS/USD según IP), notificaciones Web Push y PWA con soporte offline (Serwist) ya funcionando — ver los addendums fechados en cada sección para el detalle de qué se construyó y cuándo. Lo que falta es más chico y puntual: legal (sección 9), la confirmación del `robots.txt`/términos de ZonaProp (sección 9), y la migración internacional a Stripe/i18n (sección 6 y 13, todavía sin arrancar).
> Nace de Casa, en producción desde el 12 sept 2026 (41 propiedades, 3 personas usándolo a la fecha)
> Versión con diseño: [artifact publicado](https://claude.ai/code/artifact/613d03c0-8366-4fbd-b641-a59eb5383997)

Propuesta de arquitectura para convertir Casa — hoy una herramienta de uso
privado para una sola búsqueda — en un producto donde un corredor
inmobiliario paga una suscripción mensual y genera, dentro de su panel, un
acceso independiente por cada familia con la que está trabajando.

## 1. Por qué ahora

Una familia busca casa una vez cada varios años, durante unos meses. Un
corredor inmobiliario tiene varios casos abiertos en simultáneo, todo el
año, como trabajo permanente. El primero no sostiene una suscripción
mensual — el segundo sí.

Eso cambia quién es el cliente que paga. No es Lucas, ni Abril, ni ninguna
familia buscando su próxima casa: es Carolina — o cualquier corredor en su
lugar — que hoy ya cumple ese rol de manera informal en esta misma búsqueda
(coordina visitas, negocia con inmobiliarias, arma comparaciones). El
producto le da una herramienta profesional para hacer eso mismo con cada
uno de sus clientes, y a cada familia le llega gratis, vía un link, sin
saber ni que existe una capa de "cuenta corredor" por debajo.

> **Ya validado:** el caso de uso individual (una familia, un corredor
> informal, un crédito, una lista de propiedades) lleva desde el 9 de
> septiembre en uso real — no es una hipótesis, es la unidad que este
> documento propone multiplicar.

## 2. Panorama competitivo

Antes de construir nada vale la pena confirmar que el hueco es real, no
solo asumirlo. Investigación hecha el 13 de septiembre de 2026, separada
en cuatro categorías que a simple vista se confunden entre sí pero
resuelven problemas distintos.

### CRMs para corredores en Argentina y LatAm — gestión interna, no portal para el cliente

| | |
|---|---|
| **Tokko Broker** | se autodenomina "el CRM #1 de LatAm" — publica en 30+ portales, funnel de leads, búsqueda guardada por contacto con alerta automática por mail cuando aparece algo que matchea. En un ranking 2026 quedó detrás de KiteProp (7.0/10 vs 9.4/10): le falta WhatsApp nativo, tasador con comparables, firma digital biométrica. |
| **KiteProp** | hoy el mejor rankeado en Argentina — 30+ portales, WhatsApp nativo, IA para automatizar tareas, tasaciones con comparables. Presencia en Argentina y Chile. |
| **2clics** | más simple, pensado para oficina chica o corredor independiente — el perfil más parecido a Carolina. Funnel + botón de WhatsApp + publicación multi-portal, prueba gratis sin tarjeta. |
| **Xintel, Solution Malls, Datasync** | jugadores menores o de nicho (integraciones contables, sincronización multi-portal) — menor relevancia competitiva directa. |

Ninguno de los cuatro le da al cliente o familia un login propio para ver
su búsqueda. Todos resuelven "cómo gestiono mis leads y publico en
portales" — la alerta automática por mail de Tokko es lo más parecido a
"visibilidad del cliente" que existe hoy, y es un mail, no un panel vivo
con pipeline, comentarios y checklist.

### Portales de anuncios — no compiten, son la fuente

ZonaProp, ArgenProp, MercadoLibre y Properati son los sitios de donde Casa
ya scrapea (sección 5: stack). Alguno tiene "panel del cliente" para
búsquedas guardadas y alertas, pero es una función del portal para
cualquier usuario anónimo — no algo que un corredor arma y comparte con un
cliente puntual.

### Simuladores de crédito UVA — resuelven otra pregunta

CreditosUVA.ar, Valencia Neira, Somos Inmobiliarios e InfoZona son una
categoría madura y con varios jugadores — pero contestan "¿qué banco me
conviene?", comparando tasas de ~25 bancos. Micaso no compite acá: asume
que el crédito **ya está pre-aprobado** y contesta "con ese crédito,
¿cuánto necesito de bolsillo para esta casa puntual?" — un problema
distinto, sin superposición real.

### Portales de colaboración cliente-agente — la categoría existe, pero no acá

| | |
|---|---|
| **OneHome** (Cotality, ex-CoreLogic) | portal con marca del agente, comparación lado a lado, el cliente deja feedback por propiedad. Precio no público. |
| **Trackxi** | portal de cliente + tracker de transacción. US$ 39–199/mes según plan. |
| **Ahsuite** | portal de cliente genérico adoptado por agentes inmobiliarios. US$ 14–24/mes por usuario. |
| **Clinked, HAR Client Portal, SuiteDash** | variantes del mismo concepto, rangos de precio similares. |

Esto valida algo importante: el modelo de negocio funciona — un corredor
paga entre US$ 14 y US$ 200 por mes por esto. Pero ninguno opera en
Argentina, ninguno integra el cálculo hipotecario argentino, y ninguno se
conecta a MercadoLibre, ZonaProp, ArgenProp, RE/MAX o Mudafy como ya hace
Casa.

> **Veredicto:** no es un mercado vacío — la categoría "portal de
> colaboración" existe y factura en EEUU. Pero en Argentina el hueco es
> real: nadie combina portal para el cliente + cálculo hipotecario
> argentino + conexión a los portales locales. Los jugadores grandes de
> acá (Tokko, KiteProp) tienen la escala y la base de corredores para
> copiar esto rápido si lo ven funcionar — el diferenciador de Micaso no
> es tecnológico, es el enfoque, la velocidad de ejecución, y tener a
> Carolina validándolo en uso real ahora mismo (sección 12).

## 3. La unidad base: un caso

Todo lo construido hasta hoy es, en los términos de este documento, **un
caso**. El trabajo de arquitectura no es rehacer esto — es ponerle una capa
arriba que permita tener muchos al mismo tiempo, aislados entre sí, cada
uno con su propio acceso.

| | |
|---|---|
| **Criterios** | zonas de interés e imprescindibles en común a cualquier caso; el perfil financiero varía por tipo (ver abajo) |
| **Casas** | pipeline de 7 estados de búsqueda + papelera recuperable, fotos, comentarios, revisión de visita, plata necesaria calculada contra el presupuesto del caso |
| **Vistas** | comparación de destacadas, mapa aproximado por zona |
| **Agenda** | visitas coordinadas agrupadas por día, en orden cronológico, con botón para descargar el evento al calendario del celular, marca de visita confirmada y botón para compartir el recorrido del día por WhatsApp |
| **Checklist** | trámites y documentación, asignable entre los miembros del caso — plantilla distinta por tipo (ver abajo) |
| **Carga de propiedades** | pegar un link de cualquier sitio autocompleta título, fotos, precio, ambientes, superficie y zona (si el sitio lo permite — ver abajo) |

> **Implementado (15 sept 2026): agenda de visitas.** Nueva pestaña
> `/caso/agenda` — lista las visitas coordinadas en orden cronológico,
> agrupadas por día, con un botón para descargar un evento `.ics` válido
> (RFC5545, offset fijo de Argentina UTC-3) a cualquier calendario del
> celular. De paso se unificaron dos componentes que estaban duplicados
> entre `HouseCard` y el inicio del caso (`VisitaCoordinadaBadge`,
> `EmptyState`).
>
> **Implementado (17 sept 2026): separar pasadas de próximas.** El
> filtro original de `/caso/agenda` solo mostraba visitas con fecha
> futura (`visitaFecha >= hoy`) — una visita ya pasada simplemente
> desaparecía de la lista, sin aviso ni forma de verla. Ahora se agrupan
> en dos secciones, "Próximas" y "Visitas pasadas" (esta última, más
> recientes primero), en vez de perderse.
>
> **Implementado (25 sept 2026): compartir el día por WhatsApp y marcar
> visitas confirmadas.** Pedido de Lucas, a partir de un mensaje real
> armado a mano: dirección y hora de cada visita del día, con ✅ en las que
> ya confirmó la inmobiliaria o el dueño.
> - **Dato nuevo, `House.visitaConfirmada` (boolean).** Se marca a mano
>   con el botón "Marcar confirmada" / "Confirmada" de cada visita próxima
>   en `/caso/agenda` (`VisitConfirmToggle`). Lo puede tocar cualquiera con
>   acceso al caso, igual que el resto de los datos de una casa (cambiado
>   el mismo día: ahora es solo del corredor, ver el ajuste de abajo).
>   `updateHouse` (`lib/store.ts`) lo baja a `false` cuando cambia
>   `visitaFecha`, porque la confirmación era de otro horario, salvo que el
>   mismo patch la vuelva a marcar. Sin `visitaFecha` nunca queda en
>   `true`. Las casas guardadas antes arrancan en `false` (`normalizeHouse`).
> - **Botón "Compartir" en cada día próximo** (`ShareVisitDayButton`). Arma
>   el mensaje con `buildVisitDayMessage` (`lib/whatsapp.ts`) y lo abre con
>   `openWhatsapp`, el mismo camino que ya evita la corrupción de emojis de
>   `wa.me`. Formato: "🏠 VISITA(S) PROGRAMADA(S)", "📅 Fecha: sábado
>   26/09/26", y por visita "📍 Ubicación: …" y "⌚ Hora: 10:00hs ✅".
>   La ubicación es `address`; si no hay, el título de la casa (ajustado
>   el mismo día: antes caía primero en `zone`, y un barrio solo, como
>   "Villa Ballester", no dice adónde ir ni de qué casa se habla).
>   La hora sale en 24 h (`formatTime24` en `lib/format.ts`): `formatTime`
>   sigue el default de es-AR, que da "10:00 a. m.".
> - **Aviso push al agendar una visita:** decía "Visita confirmada: …" y
>   ahora dice "Visita agendada: …", para no confundirlo con la
>   confirmación de verdad. Confirmar una visita no manda aviso.
> - Tests en `test/whatsapp.test.mts` (formato) y
>   `test/visit-confirmation.test.mts` (cuándo se desconfirma). Probado
>   en el navegador en 375, 640 y 1280 px, en claro y oscuro.
>
> **Ajuste (25 sept 2026, mismo día): confirmar es solo del corredor; el
> aviso de visita, solo si cambia la fecha.** Decisión de Lucas:
> - **Confirmar una visita lo hace solo el corredor del caso**, porque es
>   él quien la coordina con la inmobiliaria o el dueño. La familia ve el
>   estado ("Confirmada" en verde o "Sin confirmar" en gris) como un
>   indicador, no como un botón. **Compartir el día lo puede hacer
>   cualquiera**, y el mensaje lleva los ✅ igual.
>   - Se controla en el servidor, no solo en la UI: el PATCH de
>     `app/api/houses/[id]` responde 403 si trae `visitaConfirmada` y quien
>     lo manda no es el corredor dueño del caso (mismo criterio que
>     `viewingAsBroker` en `app/caso/layout.tsx`). La familia sigue
>     pudiendo editar el resto de los datos de la casa. Si mueve la fecha
>     de una visita, la confirmación se borra, igual que antes.
>   - `houseCreateSchema` descarta `visitaConfirmada`: una casa siempre
>     nace sin confirmar.
> - **El aviso push "Visita agendada" se repetía:** salía en cada guardado
>   de "Editar datos" en una casa con visita, porque ese formulario manda
>   `visitaFecha` siempre, aunque no se haya tocado. Ahora sale solo si la
>   fecha cambió, con `visitMoved` (`lib/store.ts`), la misma función que
>   decide cuándo se borra la confirmación.
> - Probado en el navegador con las dos sesiones, corredor y familia (la
>   familia entra con su link), en 375, 640 y 1280 px.
>
> **Aclaración (18 sept 2026): la carga de propiedades no es una lista
> cerrada de sitios soportados.** `app/api/scrape/route.ts` no tiene
> lógica particular por sitio salvo dos excepciones — le pega a
> **cualquier** link que se le pegue y saca lo que encuentre con
> heurísticas genéricas (Open Graph, JSON-LD de schema.org, microdatos,
> y texto libre del título/descripción como último recurso). Las dos
> excepciones son de naturaleza distinta, vale la pena no confundirlas:
> **(a) bloqueo legal** — MercadoLibre, ArgenProp y ZonaProp enteros, más
> `mudafy.com.ar/ficha/*`, no se tocan en absoluto porque sus términos de
> uso lo prohíben (sección 9); no es que sean "más difíciles" de leer,
> están vedados sin importar eso. **(b) ayuda técnica** — RE/MAX (y
> Mudafy fuera de `/ficha/`) sí se leen, pero necesitaron una función
> aparte porque el precio no viene en una etiqueta estándar sino en un
> bloque de JSON que arma el sitio con JavaScript. Cualquier sitio nuevo
> que un corredor o familia use — un portal chico, la web propia de una
> inmobiliaria, Facebook Marketplace — funciona solo si expone esos datos
> de forma estándar, sin que haga falta tocar código para sumarlo.
>
> **Implementado el mismo día: ambientes, superficie y zona, no solo
> título/fotos/precio.** `guessAmbientesFromText`/`guessSuperficieFromText`
> en `app/api/scrape/route.ts` buscan "N ambientes"/"N amb" y "NNN
> m2"/"NNN m²" en el título y la descripción (con JSON-LD `numberOfRooms`/
> `floorSize` como fuente preferida cuando el sitio lo trae); si aparece
> más de un número y no coinciden, se abstienen en vez de adivinar mal —
> mismo criterio que ya usaba el código para el precio. La zona no se
> adivina de texto libre (demasiado propenso a error): `AddHouseModal`
> ahora recibe las zonas de interés que el caso ya tiene cargadas en sus
> criterios (`criteria.brief.zones`) y, si el título del aviso menciona
> alguna, la propone sola — si no reconoce ninguna, el campo queda vacío
> para completar a mano. Probado de punta a punta con un caso real y un
> link real de RE/MAX: ambientes y zona se completaron solos, superficie
> quedó vacía porque ese aviso puntual no la menciona (comportamiento
> correcto, no un bug).
>
> **Arreglado el mismo día: "Actualizar desde el aviso" ignoraba un
> cambio de precio.** El botón de refresh por casa (`HouseCard.tsx`,
> `refreshFromSource`) ya existía desde Casa, pero solo completaba el
> precio si la casa no tenía uno cargado — si el precio del aviso
> original bajaba o subía después de guardada la casa, apretar el botón
> no hacía nada y encima decía "No encontramos nada nuevo en el aviso",
> lo cual era falso. Para una herramienta pensada para seguir
> propiedades durante meses de búsqueda, un cambio de precio es
> justamente el dato que más vale la pena no perderse. Ahora compara
> contra el precio guardado y, si difiere, lo actualiza y muestra
> "El precio cambió: US$ X → US$ Y". Sigue siendo manual (lo dispara la
> persona, no hay chequeo automático en segundo plano) — automatizarlo
> del todo necesitaría un cron y decidir con qué frecuencia pegarle a
> cada sitio, justo lo que la sección 9 ya trata con cuidado por los
> términos de uso. Probado de punta a punta con un caso real: una casa
> cargada a US$ 90.000 con el link real de RE/MAX (que hoy publica
> US$ 100.000) mostró el toast correcto y el precio en la tarjeta se
> actualizó.
>
> **Sumado en el mismo arreglo: aviso push cuando cambia el precio.**
> Hasta ahora Web Push (sección 6) solo avisaba a la familia por una
> visita agendada o una casa nueva — un cambio de precio, que puede pasar
> sin que nadie esté mirando la app en ese momento, no generaba ningún
> aviso. `PATCH /api/houses/[id]` ahora compara el precio antes y después
> del cambio (una lectura extra de `getHouses`, solo cuando el patch trae
> `priceUsd` — no en cada cambio de estado o favorito) y, si de verdad
> cambió, notifica "Cambio de precio: US$ X → US$ Y" — mismo mecanismo
> (`notifyCaseClients`) que ya usan las otras dos notificaciones, sin
> filtrar quién disparó el cambio (broker o familia), igual que la de
> visitas ya hacía. No dispara si es la primera vez que se carga un
> precio (no hay "antes" con qué compararlo) ni si el valor no cambió.
>
> **Chico, mismo día: el teléfono de contacto ahora se puede tocar para
> llamar.** `house.contactoTelefono` (`HouseCard.tsx`) era texto plano —
> había que copiarlo a mano para llamar a la inmobiliaria o al dueño.
> Ahora es un link `tel:`, sin parsear ni validar el formato (el sistema
> operativo del celular ya sabe interpretar cualquier formato que alguien
> haya tipeado), solo se le sacan espacios/guiones para el `href`. El
> texto visible no cambia.
>
> **Chico, mismo día: "Actualizar desde el aviso" podía borrar fotos
> subidas a mano.** Misma función que el arreglo de precio de arriba
> (`refreshFromSource`, `HouseCard.tsx`): si el aviso original ahora
> tenía más fotos que las guardadas, el código **reemplazaba** el array
> entero por las del scrape — si alguien había subido una foto propia
> (sección 5, Vercel Blob) que no es parte del aviso, se perdía sin
> aviso. Ahora suma las fotos nuevas del aviso a las que ya había en vez
> de reemplazar, así nunca se pierde nada. Probado interceptando la
> respuesta de `/api/scrape` con dos fotos nuevas contra una casa que ya
> tenía una foto subida a mano: con el código viejo hubiera quedado en 2
> (perdiendo la subida a mano), con el arreglo quedan las 3.
>
> **Implementado el mismo día (18 sept 2026): recuperación de datos en dos vueltas.**
> - **Sin botón "Reintentar" para sitios bloqueados:** Si el link pertenece a un portal bloqueado por ToS (MercadoLibre, ZonaProp, ArgenProp), el botón "Reintentar" desaparece por completo ya que volver a intentar siempre resultaría en el mismo bloqueo. Solo se ofrece reintentar ante fallos de red o errores inesperados.
> - **Segunda vuelta local por texto de descripción:** Si el portal no permite scraping o la propiedad se carga a mano, `AddHouseModal` abre una caja de autocompletado donde el usuario pega el texto o descripción del aviso copiado del portal. El módulo `lib/listingText.ts` procesa el texto en el navegador: extrae el precio en dólares (priorizando USD sobre expensas en pesos), la cantidad de ambientes y los m² totales, y matchea la zona contra las zonas de interés del caso, autocompletando los campos del formulario sin necesidad de hacer requests al servidor ni violar ToS.

### Tipo de caso: no todos buscan lo mismo

Comprar con crédito hipotecario y alquilar tienen un perfil financiero
distinto de raíz — no es solo una etiqueta, cambia qué datos hay que
pedir:

- **Compra:** capital disponible, crédito pre-aprobado (banco, monto,
  tasa), cuota estimada. Alimenta la calculadora de cuota francesa y la
  "plata necesaria" por casa, tal como existe hoy.
- **Alquiler:** presupuesto mensual y presupuesto de entrada (depósito,
  comisión inmobiliaria, primer mes, seguro de caución o garantía).
  Alimenta un cálculo distinto — gastos iniciales, no cuota francesa.
- **Otro:** sin calculadora específica por ahora — un campo de
  presupuesto libre alcanza hasta que haya un caso real de este tipo.

El checklist de trámites cambia igual de raíz (escritura y tasación no
tienen nada que ver con seguro de caución y recibos de sueldo). Lo único
100% común a los tres tipos es el pipeline de casas: estados, fotos,
comentarios, contacto, comparación y mapa no dependen de si el caso es
compra, alquiler u otra cosa.

> **Implementado (14 sept 2026): compra se divide en con crédito / al
> contado.** `LoanInfo` suma `hasCredit: boolean` y `bankName: string` —
> con `hasCredit: false` el caso muestra solo el capital disponible ("Al
> contado, con USD X–Y disponibles"), sin banco, cuota ni condiciones; el
> corredor lo tildea desde el mismo editor de crédito. La calculadora de
> cuota francesa sigue aplicando solo cuando `hasCredit` es `true`.

## 4. Arquitectura objetivo

Tres niveles, no uno. Hoy existe un solo login compartido para todo el
mundo. El modelo nuevo separa **tu panel de super-admin** (uno solo, el
tuyo) de **el panel de cada corredor** (una cuenta por corredor) de
**cada caso** (un acceso propio por familia, generado desde el panel de
su corredor).

```mermaid
graph TD
  SA["Vos: super-admin<br/>Google + lista blanca"] -.->|administra| B
  B["Corredor<br/>login con Google"] -->|crea| C1["Caso: Familia Pérez<br/>usuario + contraseña generados"]
  B -->|crea| C2["Caso: Familia Gómez<br/>usuario + contraseña generados"]
  B -->|crea| C3["Caso: ..."]
  C1 --> D1["Criterios / Crédito"]
  C1 --> D2["Casas (pipeline, fotos, comentarios)"]
  C1 --> D3["Checklist"]
  C2 --> D4["Criterios / Crédito"]
  C2 --> D5["Casas (pipeline, fotos, comentarios)"]
  C2 --> D6["Checklist"]
```

Cada caso es una copia aislada de lo que existe hoy — nada se comparte
entre familias.

### Autenticación — tres puertas, una sola con OAuth

- **Vos (super-admin) → tu panel:** el mismo login con Google que un
  corredor, pero tu email vive en una lista blanca (`ADMIN_EMAILS`) que
  te manda a un panel distinto — no hace falta un sistema de roles
  aparte.
- **Corredor → panel:** login con Google. **Decisión revisada** respecto
  a la primera versión de este documento, que proponía usuario/contraseña
  propio — tiene más sentido OAuth para un cliente que vuelve todos los
  días y entra desde una landing pública: sin contraseña que recuperar,
  signup más corto. Sesión larga, ve la lista de sus casos.

  > **Confirmado funcionando de punta a punta (17 sept 2026).** El botón
  > "Continuar con Google" en `/panel/login` redirige a una pantalla real
  > de consentimiento de Google ("Sign in with Google — to continue to
  > Micaso"), con `AUTH_GOOGLE_ID`/`AUTH_GOOGLE_SECRET` ya cargados — no
  > es solo la decisión de diseño de este párrafo, el flujo de OAuth ya
  > está en pie. **Resuelto (17 sept 2026):** `https://www.micaso.com.ar/api/auth/callback/google`
  > ya está sumado a los redirect URIs autorizados del proyecto en Google
  > Cloud Console — login con Google funcionando tanto en local como en
  > producción.
- **Caso → familia:** usuario/contraseña simple generados al crear el
  caso (no elegidos a mano por el corredor). Cortos está bien — no se
  comparte información bancaria — pero siguen siendo generados al azar y
  únicos por caso, nunca un `1234` repetido entre casos: el presupuesto o
  el teléfono de contacto de una familia no es "sensible" en sentido
  legal, pero tampoco es para que lo mire el cliente de otro corredor
  adivinando una URL.

### Namespacing de datos

Hoy cada colección vive en una clave global de Redis. Pasa a estar
prefijada por caso:

| Hoy | Con casos |
|---|---|
| `houses` | `case:{caseId}:houses` |
| `checklist` | `case:{caseId}:checklist` |
| `criteria` | `case:{caseId}:criteria` |
| *(no existe)* | `brokers` — cuentas de corredor: login, `nombreMarca`/`imagenUrl`, y estado de suscripción (`mpPreapprovalId`, `subscriptionStatus`, `trialEndsAt`) |
| *(no existe)* | `cases` — metadata: **título del caso** (editable, no fijo desde la creación), credenciales, `brokerId`, fecha de creación, `estado` (activo/cerrado) |

## 5. Stack tecnológico

Lo mínimo nuevo para no reinventar lo que ya resuelven bien otros.

### Ya en uso, sin cambios

- **Next.js 16 (App Router) + React 19 + TypeScript + Tailwind CSS v4** —
  el mismo stack de hoy. Esta capa lo extiende, no lo reescribe.
- **Vercel** — hosting y auto-deploy desde GitHub. El proyecto sigue
  siendo uno solo; no hace falta infraestructura separada para
  multi-tenant.
- **Upstash Redis** — sigue siendo la base de datos, ahora particionada
  por caso (ver sección 4). Por qué alcanza por ahora, y cuándo dejaría
  de alcanzar: ver abajo.
- **Leaflet + OpenStreetMap** — el mapa aproximado por zona no cambia.
- **El scraper actual** (meta tags, JSON-LD, sin navegador headless) — la
  lógica no cambia, solo el volumen (ver riesgo de escala en sección 9).

### Nuevo, hay que sumarlo

- **Auth.js** (ex-NextAuth) con proveedor de Google — resuelve el login
  OAuth de corredor y super-admin. Es la opción estándar en Next.js para
  esto; evita escribir el flujo de OAuth a mano.
- **Mercado Pago** (Suscripciones / API de Preapproval) — cobro recurrente
  y notificaciones de pago para enterarse de altas, rechazos y
  cancelaciones. Reemplaza a Stripe (ver sección 9: Stripe no es viable
  para un negocio radicado en Argentina). A diferencia de Stripe, no trae
  un Customer Portal alojado — cambiar de plan o cancelar necesita una
  pantalla propia mínima (ver sección 8), algo que con Stripe no hubiera
  hecho falta construir.
- **Dominio propio** — hoy la app original vive en
  `home-blush-one.vercel.app`; una landing pública que le vende a
  desconocidos necesita un dominio de verdad. Nombre público del
  producto: **decidido, se llama Micaso** (ver sección 11) — "Casa" queda
  como nombre interno/histórico de la herramienta original, no como marca
  pública.

  > **Implementado (verificado 15 sept 2026):** `micaso.com.ar` está
  > comprado y en vivo, sirviendo la landing real (headlines y precios
  > de sección 11 coinciden). Ver también sección 11, que tenía esto
  > anotado como pendiente.
- **Almacenamiento de imágenes subidas** (Vercel Blob u otro) — hoy todas
  las fotos de la app vienen de URLs externas (scrapeadas de un aviso, o
  pegadas a mano en el editor); la foto de perfil del corredor es la
  primera imagen que alguien sube de verdad en vez de pegar un link, así
  que hace falta un lugar donde guardarla.

  > **Implementado (15 sept 2026): Vercel Blob para fotos de casa, no
  > para la de perfil.** La foto de perfil del corredor sigue sin usar
  > esto — es una miniatura de 256px que se guarda como data URL adentro
  > del mismo registro (ver sección 6, ya estaba así desde el 14 sept).
  > Lo que sí necesitaba storage real eran las fotos que se suben a mano
  > en `EditHouseModal` (antes solo se podía pegar una URL): una casa
  > puede tener varias, y embeberlas como texto en el mismo objeto Redis
  > que ya comparten título/checklist/comentarios de todas las casas del
  > caso agrandaría esa clave en cada mutación — justo lo que la sección
  > 9 ya marca como el punto débil de `dbUpdate` en Redis. `npm install
  > @vercel/blob`, ruta nueva `app/api/houses/photo`, comprimida a 1600px
  > lado mayor / calidad 0.85 antes de subir.
  >
  > **Probado de punta a punta (15 sept 2026) y funcionando.** Primer
  > intento contra el store `micaso-blob`: falló porque se había creado
  > en modo Privado ("Cannot use public access on a private store"), y
  > las fotos de casa necesitan acceso público (se muestran con un
  > `<img>` común a cualquiera con el link del caso, sin login). No tenía
  > forma de pasarlo a público después de creado, así que se borró y se
  > creó de nuevo en modo público. Con ese store, probado el camino
  > completo contra un caso real (no el demo, que tiene su propio
  > bloqueo de escritura): subir un archivo → URL pública de
  > `*.public.blob.vercel-storage.com` devuelta y confirmada accesible
  > → guardada en `images` de una casa vía el mismo PATCH que ya usa
  > `EditHouseModal`. Falta probarlo a mano en el navegador (esto se
  > probó por API), pero el mecanismo nuevo — auth, subida a Blob,
  > servido público, persistencia — ya está verificado real.
- **`web-push`** — notificaciones push del navegador (protocolo Web Push
  estándar, sin servicio de terceros tipo Firebase) para avisar a la
  familia cuando el corredor agenda una visita o carga una propiedad
  nueva. Ver el addendum "Implementado (17 sept 2026): notificaciones Web
  Push" en la sección 6 para el detalle.
- **Serwist** (`@serwist/next` + `serwist`) — precaching y pantalla
  offline (PWA de verdad, no solo instalable). Ver el addendum
  "Implementado (18 sept 2026): PWA con soporte offline de verdad" en la
  sección 6.

### Deliberadamente no se suma nada

- **Servicio de email transaccional** (Resend, SendGrid, etc.) — Mercado
  Pago también notifica cobros exitosos y fallidos a quien paga por sus
  propios medios; a confirmar cuando se implemente si alcanza sin sumar
  nada más, pero la idea de no construir un servicio de mail aparte para
  v1 se mantiene.
- **Herramienta de analytics propia** — las métricas del panel de
  super-admin (sección 7) pueden salir directo del dashboard de Mercado
  Pago (altas, bajas, ingreso mensual) en vez de calcularlas a mano; solo
  la lista de corredores y las acciones manuales necesitan pantalla
  propia.

### Base de datos: por qué Redis alcanza por ahora, y cuándo dejaría de alcanzar

Hoy cada colección (`houses`, `checklist`, `criteria`) vive en una sola
clave por caso, guardada como un array — leer o escribir un solo campo de
una sola casa implica traer y volver a guardar el array completo. Es una
limitación ya documentada y aceptada para 3 personas en un caso; con
casos multiplicándose, sigue siendo aceptable **si cada caso mantiene un
volumen chico** (decenas de casas, no miles), porque el "radio de
explosión" de una escritura pesada queda contenido dentro de un caso, no
de toda la plataforma.

**Mejora barata, sin cambiar de tecnología:** el próximo paso natural —ya
anticipado en el README de Casa— es que cada casa pase a ser su propia
clave (`case:{caseId}:house:{houseId}`) en vez de un elemento de un array
compartido. Sigue siendo Redis, sigue siendo el mismo Upstash, pero
actualizar el checklist de una casa deja de tocar las otras cuarenta.

**Cuándo de verdad conviene otra base de datos (Postgres u otra
relacional):** el disparador no es "cuántos corredores" — es que la
decisión de la sección 6 (casos siempre aislados, sin vista unificada)
cambie. Consultar propiedades cruzando varios casos, o darle al panel de
super-admin reportes de verdad en vez de una lista simple, son consultas
relacionales que Redis hace mal y Postgres hace bien de fábrica. Ninguna
de las dos está decidida como necesaria hoy, así que migrar de base de
datos es resolver un problema que todavía no existe.

> **En resumen: una sola base de datos, no una por corredor.** El
> aislamiento entre casos es por nombre de clave (`case:{caseId}:...`,
> sección 4), no por infraestructura separada — crear un caso nuevo
> agrega un puñado de claves a la misma base, nunca una base nueva. Nada
> de lo nuevo agrega otra base de datos de verdad: Auth.js con Google
> puede andar con la sesión en una cookie firmada, sin guardar nada en
> Redis; Mercado Pago guarda la facturación de su lado (solo
> referenciamos un ID); y el storage de imágenes guarda archivos sueltos,
> no reemplaza a Redis ni lo complementa con más tablas.

## 6. Panel del corredor

Tres momentos distintos: la landing lo convence, el alta lo registra, el
panel lo engancha todos los días.

### Landing: convencer al corredor, no a la familia

Página pública de marketing, dirigida al corredor — nunca a una familia
(esa nunca la ve, entra directo por su link de caso). Necesita una
propuesta de valor concreta ("organizá a cada cliente de búsqueda de casa
en un lugar, con su propio link privado"), el precio a la vista, y un
único CTA: **empezar prueba gratis**.

### Alta y prueba — sin pedir tarjeta

El alta es entrar con Google — sin formulario de contraseña, la identidad
y el email vienen de la cuenta que usa para loguearse (ver sección 4). Al
entrar por primera vez se le pide nombre de marca para su panel, nada
más. **Decidido: prueba de 14 días sin pedir tarjeta** — entra directo a
un panel vacío, puede crear casos de prueba, y recién al terminar la
prueba se le pide un método de pago para seguir.

### Cobro — plan fijo, con tope de casos activos

**Decisión revisada:** un precio mensual fijo, pero no todo-lo-que-quieras
— la versión anterior de este documento lo dejaba sin tope. Cada plan
incluye una cantidad máxima de **casos activos simultáneos**; abrir más
que eso implica pasar a un plan superior o un cargo por caso extra. Sigue
sin ser cobro por-caso puro — eso ya se había descartado por complicar la
facturación desde el día uno — pero tampoco es un precio plano
desconectado de cuánto usa la herramienta un corredor grande frente a uno
chico.

**Decidido (14 sept 2026): precio y topes — ver sección 11** para el
análisis de costos y el razonamiento completo. Los tres planes:

| Plan | Tope de casos activos | Precio |
|---|---|---|
| Inicial | 5 | USD 13/mes (o $ 18.000 ARS) |
| Profesional | 20 | USD 29/mes (o $ 39.000 ARS) |
| A medida | a medida | a convenir, sin número fijo |

Esto es la razón concreta por la que **cerrar un caso** deja de ser solo
prolijidad — ver "Ciclo de vida de un caso" abajo.

Al terminar la prueba (o antes, si el corredor decide pagar de una), se
inicia una suscripción. **Decisión sobre pasarelas:** hoy está implementado **Mercado Pago** (API de Preapproval) para cobrar en pesos. La interfaz detecta si el usuario está en Argentina (usando headers de Vercel `x-vercel-ip-country`) y muestra $ 18.000 / $ 39.000 ARS. Si está en otro país, muestra USD 13 / USD 29, y más adelante se sumará **Stripe** (o similar) para poder procesar esos pagos internacionales en dólares, ya que Mercado Pago no permite cobrar desde fuera hacia una cuenta local. A diferencia de
lo pensado originalmente con Stripe, Mercado Pago no ofrece un portal
alojado equivalente al Customer Portal: cambiar de plan o cancelar
necesita una pantalla propia mínima dentro del panel (ver sección 8), en
vez de tercerizarla del todo. Si falla un cobro o no carga tarjeta al
terminar la prueba, la respuesta por ahora es pasar el panel a
solo-lectura hasta que se resuelva, no cortar el acceso de un día para el
otro (detalle sin cerrar del todo, ver sección 9).

### Internacionalización y Multidioma (Futuro)

Para la expansión a otros países, la arquitectura aprovechará la misma lógica que hoy cambia la moneda de los precios (detectar el país mediante el header `x-vercel-ip-country` inyectado por Vercel, combinado con `Accept-Language` del navegador):
- **Moneda:** Ya está preparado para mostrar USD a IPs fuera de Argentina. El siguiente paso es acoplar esos precios en USD a una integración con **Stripe** (Checkout Sessions y Webhooks equivalentes a los de Mercado Pago) que procese el cobro internacional.
- **Idioma:** La aplicación implementará un mecanismo de i18n (ej. `next-intl` o diccionarios manuales, aprovechando el App Router de Next.js). Si se detecta un país no hispanohablante o el `Accept-Language` pide inglés, la app entera (landing page, panel del corredor y el caso de los clientes) se renderizará en inglés. El diseño base ya es neutro y solo requerirá externalizar los strings de texto duro actuales.
- **Dominio (.com vs .com.ar):** La app opera en `micaso.com.ar`, lo cual asocia fuertemente el producto a Argentina (afectando la confianza y el SEO en el exterior). La estrategia para el lanzamiento internacional será adquirir un dominio global (ej. `.com`, `.app` o `.io`) y configurarlo en Vercel como el dominio principal. El `.com.ar` quedará redirigido hacia el nuevo dominio o como alias exclusivo para el mercado local.
- **Lógica de Negocio y Formatos Locales:** Actualmente el modelo asume reglas argentinas (scraping de ZonaProp/Argenprop, 8.5% de gastos de escritura, separadores de miles). Para salir al exterior, esta lógica deberá abstraerse mediante "adaptadores regionales", permitiendo leer links de otros portales (Zillow, Idealista, etc.), aplicar fórmulas hipotecarias locales (ej. Closing Costs en vez de Escrituración) y renderizar fechas/monedas según el *locale* de la familia.


### Ciclo de vida de un caso: cuánto dura un link

**Decidido: el corredor cierra el caso a mano, no expira solo.** Mientras
un caso está activo, su link no tiene fecha de vencimiento — dura lo que
dure la búsqueda real, sea un mes o un año. El corredor necesita un botón
explícito para **cerrar y terminar** un caso cuando la familia ya compró,
alquiló, o simplemente dejó de buscar.

Al cerrar un caso:
- Deja de contar contra el tope de casos activos del plan (ver Cobro,
  arriba) — el incentivo para el corredor es real, no solo prolijidad.
- Pasa a modo solo-lectura en vez de cortarse de un día para el otro —
  mismo criterio que si el corredor deja de pagar (sección 9): la familia
  sigue viendo su historial, pero no puede seguir cargando casas ni
  comentarios nuevos.

Esto es más simple que el "archivado automático" que ya está fuera de
alcance (sección 10): ahí lo que se descarta es que el sistema *detecte
solo* que una compra se cerró; esto es un botón que aprieta el corredor
cuando él sabe que terminó, nada de inferir nada.

### Una vez adentro: qué ve el corredor

Lo mínimo que necesita el panel para ser útil desde el primer día:

- Lista de casos: nombre del cliente, link/credenciales para copiar y
  mandar, un resumen rápido (cuántas pendientes, destacadas, última
  actividad).
- Botón para crear un caso nuevo — genera usuario/contraseña, le pone un
  título (ver abajo) y arranca ese caso vacío. Bloqueado si ya llegó al
  tope de casos activos de su plan. **Decidido: pide solo lo mínimo**
  (título, tipo de caso) para no frenar al corredor con un formulario
  largo — los criterios (presupuesto, zonas, crédito o alquiler) se
  completan después, desde la misma pantalla de Criterios que ya existe
  hoy: el corredor los carga si ya los tiene de charlar con el cliente, o
  la familia los completa ella misma la primera vez que entra con su
  link. No hace falta un asistente de onboarding aparte — es el mismo
  formulario editable de siempre, quien llegue primero lo llena.
- Botón para cerrar un caso (ver "Ciclo de vida de un caso", arriba) — y
  un indicador de cuántos casos activos tiene contra el tope de su plan.
- Sin las 41 propiedades de Lucas de arranque: cada caso nuevo empieza en
  blanco, no con el seed actual (ver sección 8).
- **Marca propia:** nombre e imagen de perfil (una foto personal sirve
  igual que un logo — muchos corredores individuales, como Carolina, no
  tienen uno) que el corredor carga una vez en su panel y se muestran en
  todos los casos que ve su cliente — la familia nunca ve "Micaso" como
  marca, ve la del corredor. Decidido: sí va, ver sección 8.
- **Título del caso, editable:** el corredor le pone un nombre a cada caso
  al crearlo (ej. "Familia Pérez") y puede cambiarlo cuando quiera — no es
  solo una etiqueta interna para ordenarse, es lo que la familia ve como
  encabezado dentro de su propio caso.

> **Decidido: casos siempre aislados, sin vista unificada en v1.** Cada
> propiedad pertenece a un único caso — no hay relación muchos-a-muchos
> entre casas y casos. Si más adelante un corredor necesita evitar cargar
> la misma dirección dos veces en casos distintos, alcanza con una
> búsqueda de solo lectura entre sus propios casos (una consulta, no un
> cambio de modelo de datos) — se agrega cuando haga falta, no ahora.
> Esto también baja la urgencia de migrar a una base relacional (sección
> 5): sin necesidad real de cruzar datos entre casos, Redis con el
> namespacing actual sigue alcanzando.

> **Implementado (14 sept 2026): dashboard del panel, entrar/compartir
> caso, foto de perfil.** `/panel` ya no es solo la lista de casos:
> arriba muestra tres KPI (casos activos contra el tope del plan,
> propiedades en seguimiento, próxima visita coordinada) y, si hay algo
> que atender, un bloque "Necesita tu atención" con acciones vencidas y
> visitas dentro de las próximas 48 horas, cada una con link directo a su
> caso (`getCaseSummary` en `lib/store.ts` calcula esto por caso, una vez
> por carga de página). Cada fila de caso suma un resumen corto
> (pendientes, destacadas, última actividad) y un borde de color que
> avisa si algo vence. "Entrar como este caso" pasa a **"Entrar al
> caso"**, con un botón **Compartir** al lado que arma el mensaje de
> WhatsApp (usuario, contraseña y una explicación corta) para que el
> corredor se lo mande a su cliente sin escribirlo de cero. La foto de
> perfil (sección 6, "Marca propia") ya se puede subir: se comprime en el
> navegador a una miniatura de 256px y se guarda como parte del registro
> del corredor (`brokers.imagenUrl` pasa a poder ser una data URL, no
> solo la foto de Google) — evita depender del storage de imágenes
> externo (sección 5) mientras no esté configurado; si más adelante hace
> falta subir imágenes pesadas (fotos de propiedades, por ejemplo), ahí sí
> hace falta Vercel Blob u otro de verdad.

> **Implementado (15 sept 2026): compartir una propiedad, carga manual,
> PWA básica.**
> - **Compartir por WhatsApp desde la tarjeta de la casa** (no ya solo
>   las credenciales del caso, más arriba) — un botón en `HouseCard`
>   arma "Mirá esta casa que guardé en Micaso: título — precio, link"
>   para que la familia se la reenvíe a su pareja o al corredor sin
>   escribirlo a mano.
> - **Carga manual de una propiedad** en `AddHouseModal` — un toggle
>   "¿No tenés un link? Cargar los datos a mano" para propiedades de
>   dueño directo o una ficha privada que no tiene página de portal.
>   `House.url` pasa a ser `string | null` (antes obligatorio) para
>   representar esto de verdad, no un URL inventado. La UI que dependía
>   de un aviso original (botón "actualizar desde el aviso", el link de
>   la foto de tapa) se esconde para estas casas en vez de apuntar a un
>   link roto.
> - **PWA básica**: `app/manifest.ts` + íconos generados con `next/og`
>   en 192/512px (`app/icons/*`) y el ícono de iOS
>   (`app/apple-icon.tsx`) — familia y corredor pueden "Agregar a
>   pantalla de inicio" y abrir Micaso en pantalla completa. Encontrado
>   en la prueba real (no algo obvio de antemano): `proxy.ts` bloqueaba
>   `/manifest.webmanifest` y los íconos detrás del login — el
>   navegador los pide sin sesión, incluso parado en `/login`, así que
>   quedaron sumados a `PUBLIC_PATHS`.
>
> Probando la carga manual con clicks reales en el navegador (no solo
> por API) aparecieron dos bugs de verdad, sin relación directa con
> estas tres features — ver "La reescritura de 14 sept no fue completa"
> y "Segundo hallazgo, más de raíz" un poco más abajo en esta misma
> sección 9. Las tres features se volvieron a probar de punta a punta
> con el navegador real después del segundo arreglo (lock de archivo) y
> siguen funcionando: WhatsApp arma el mensaje con título/precio/link,
> la carga manual persiste sin perderse, y el manifest/íconos cargan sin
> sesión.

> **Implementado (15 sept 2026): buscador y tabs en la lista de casos,
> integrantes opcionales al crear un caso.** `CaseList.tsx` suma pestañas
> Activos/Todos/Cerrados (con contador) y un buscador por título,
> integrante o usuario de caso — antes la lista era un `.map()` plano sin
> filtrar, incómodo en cuanto un corredor tiene más de un puñado de
> casos. `CreateCaseModal` suma un campo opcional para cargar los nombres
> de la familia ya en el alta (sigue sin ser obligatorio — el criterio de
> "quien llegue primero los completa" de la sección 6 no cambia). `/caso`
> y `/panel` comparten un `EmptyState` para "todavía no hay nada acá" en
> vez de un mensaje distinto por pantalla.

> **Implementado (16 sept 2026): botón para forzar la instalación como
> PWA.** La PWA básica de arriba dependía de que la persona encontrara
> "Agregar a pantalla de inicio" en el menú del navegador —
> `InstallAppButton` escucha `beforeinstallprompt` en Android/Chrome para
> disparar el prompt nativo con un toque; en iOS Safari (sin esa API)
> muestra instrucciones manuales ("Compartir → Agregar a inicio"). Vive
> en `Nav.tsx` (familia) y, desde el 17 sept 2026, también en el header
> de `/panel` (corredor).
>
> **Revisado (17 sept 2026): la instalación como PWA no depende de tener
> service worker.** El criterio de instalabilidad de Chrome ya no lo
> exige de forma estricta, y en la práctica el prompt apareció en
> producción sin él. Revisión de código: `manifest.ts` trae los campos
> que Chrome chequea (`name`, `short_name`, `icons` 192/512, `start_url`,
> `display: "standalone"`); `app/icons/192` y `app/icons/512` (`next/og`)
> generan esos íconos, y `app/apple-icon.tsx` cubre el ícono de iOS vía la
> convención de archivo de Next.js (`appleWebApp` en `layout.tsx` agrega
> los meta tags de Safari). `InstallAppButton` no muestra el botón si
> `matchMedia("(display-mode: standalone)")` ya es true (evita ofrecer
> instalar algo ya instalado). En el momento de esta revisión el proyecto
> todavía no tenía service worker — cambió más tarde el mismo día, ver
> el addendum siguiente.
>
> **Implementado (17 sept 2026): notificaciones Web Push + primer service
> worker.** `public/sw.js` (hecho a mano, sin librería) escucha `push` y
> `notificationclick` — cuando el corredor agenda una visita o carga una
> propiedad nueva, la familia que dio permiso recibe una notificación del
> sistema operativo aunque no tenga la pestaña abierta. `lib/push.ts`
> guarda la suscripción del navegador aislada por `caseId` (claves VAPID
> autogeneradas si no hay variables de entorno propias),
> `PushNotificationPrompt.tsx` es el banner de opt-in en `/caso`, y el
> panel del corredor suma un badge de "novedades" (casas o comentarios no
> vistos desde el último ingreso). De paso, "destacada" pasa a llamarse
> "favorita" en toda la UI (tab propio en el tablero de casas, vista de
> comparación adaptada a mobile). `/sw.js` tuvo que sumarse a
> `PUBLIC_PATHS` de `proxy.ts` — igual que `/manifest.webmanifest`, el
> navegador lo pide sin sesión activa. El caso demo tiene las
> notificaciones deshabilitadas para no mandarle push reales a cualquiera
> que entre a probarlo.
>
> **Implementado (18 sept 2026): PWA con soporte offline de verdad
> (Serwist), sin perder el service worker de Web Push.** Se sumó
> `@serwist/next` para precachear los assets de la app y mostrar una
> pantalla propia (`/offline`) cuando no hay conexión, en vez de la
> pantalla en blanco del navegador. El service worker pasa a generarse en
> build desde `app/sw.ts` (antes `public/sw.js` se escribía a mano) — los
> listeners de `push`/`notificationclick` del addendum de arriba se
> movieron ahí, fusionados con el precaching de Serwist, para que el
> build de uno no pise al otro; `public/sw.js` deja de vivir en el repo
> (pasa a ser un artefacto de build, gitignored, igual que `.next/`).
> Next 16 usa Turbopack por defecto pero `@serwist/next` todavía no lo
> soporta (solo tiene soporte experimental vía un paquete aparte,
> `@serwist/turbopack`) — **decisión: forzar webpack** en los scripts de
> `dev`/`build` en vez de migrar a esa vía experimental o al "modo
> configurador" de Serwist (que hubiera sumado tres dependencias nuevas y
> un build en dos pasos). Todo el proyecto pierde Turbopack a cambio, no
> solo el service worker — el trade-off elegido mientras el soporte de
> Serwist para Turbopack siga así de inmaduro.

> **Aclaración (19 sept 2026): la PWA nunca hay que reinstalarla para
> recibir un deploy nuevo.** `app/sw.ts` configura `skipWaiting: true` +
> `clientsClaim: true` — el service worker nuevo se activa y toma control
> apenas el navegador lo detecta (chequeo automático, típicamente al
> abrir o volver a primer plano), sin esperar a que se cierren todas las
> pestañas/instancias abiertas como pasaría por default. En la práctica,
> la próxima vez que alguien abra o vuelva a la app después de un deploy
> ya ve la versión nueva sola; como mucho, si la tenía abierta justo en
> el momento del deploy, hace falta cerrarla y volver a abrirla una vez.

> **Implementado (16 sept 2026): panel usable en mobile de punta a
> punta.** El header con el email del corredor, las tabs de `CaseList` y
> la fila de cada caso desbordaban horizontalmente en mobile —
> `overflow-x: clip` en `html`/`body` más `min-w-0`/`truncate`/`shrink-0`
> puntuales, sin romper los headers `sticky`. El aviso "pasarela de cobro
> en desarrollo" de `/panel/plan` pasa a `PlanGatewayNotice`, descartable
> con ✕ y que recuerda la elección en `localStorage` vía
> `useSyncExternalStore` (sin parpadeo de hidratación).

> **Auditoría de UX e implementado (17 sept 2026): varios bugs reales de
> punta a punta, probados en navegador real, no solo por código.**
> - **Calculadora:** un valor negativo en "Valor de la propiedad" o
>   "Ahorro propio" rompía los totales (gastos y cuota negativos) — los
>   inputs ahora sanitizan con `Math.max(0, ...)` y `min={0}`.
> - **Confirmaciones críticas del panel:** "Cerrar caso" y "Regenerar
>   clave" mostraban un toast de Sonner abajo a la derecha, con un botón
>   de acción que desaparecía solo a los 12 segundos — fácil de pasar
>   por alto en un celular. Ahora abren un modal centrado (Cancelar /
>   Confirmar), en `CaseRow` (panel del corredor) y en el nuevo
>   `AdminCaseCard` (super-admin, ver sección 7).
> - **Carga de propiedades:** en el modo "pegar un link" alcanzaba con
>   pegar cualquier texto (sin que llegara a scrapearse nada) para
>   guardar una casa con la URL cruda como título y precio "-" —
>   `AddHouseModal` ahora exige un título real (scrapeado o tipeado a
>   mano) en los dos modos antes de habilitar "Agregar".
> - **`/panel/plan`:** se sacaron las etiquetas redundantes "Checkout /
>   Pago online en desarrollo" — el aviso de `PlanGatewayNotice` de
>   arriba ya cubre lo mismo; queda directo el botón "Coordinar por
>   WhatsApp".
> - **React 19:** `ClientOnboardingModal` y `LoginForm` llamaban
>   `setState` de forma síncrona dentro del cuerpo de un `useEffect` al
>   montar, disparando el lint nuevo `react-hooks/set-state-in-effect`
>   (cascading renders) — se difiere con `setTimeout(..., 0)`, mismo
>   patrón que ya usaba `CalculadoraClient` para restaurar valores de
>   `localStorage`.
>
> Ver también la agenda (sección 3) y el super-admin (sección 7), que
> tuvieron su propio hallazgo el mismo día.

> **Bugs de mobile encontrados y arreglados (19 sept 2026), con capturas
> reales de celular.** Los tres eran la misma clase de problema de
> Tailwind/flexbox: un hijo con texto potencialmente largo sin
> `min-w-0`/`truncate`, así que en pantalla angosta en vez de recortarse
> prolijo empuja el layout o se corta a mitad de palabra.
> - **Inicio del caso, "Propiedades en seguimiento"** (`app/caso/page.tsx`):
>   la fila título/precio/badge no tenía `flex-wrap`, así que en mobile
>   competían por el mismo renglón y el título quedaba con casi nada de
>   ancho (truncaba a `"P..."`). Se sumó `flex-wrap` (mismo patrón que ya
>   usaba la sección de "Próximas visitas" un poco más arriba) y
>   `truncate` a la línea de zona/autor/fecha, que tampoco lo tenía.
> - **Inicio del caso, "Próximas visitas y acciones"**: la línea de
>   zona/fuente (`house.zone ?? house.source`) no tenía `truncate` —
>   con una fuente larga (`"MercadoLibre"`) quedaba pisada por el badge
>   de la visita al lado en vez de cortarse.
> - **Onboarding del corredor, Paso 1** (`components/BrokerOnboarding.tsx`):
>   la columna del `grid md:grid-cols-2` no tenía `min-w-0` — un item de
>   grid, igual que uno de flex, no se achica por debajo de su ancho
>   natural por default. El texto de ayuda "JPG, PNG o WebP. Se ajusta
>   automáticamente." se cortaba a mitad de palabra en vez de wrappear.
>   Hizo falta `min-w-0` en la columna del grid, no alcanzaba con
>   ponerlo más adentro en el árbol — la restricción de ancho tiene que
>   estar en el nivel donde realmente se define el ancho disponible.
>
> Verificado por Lucas con capturas reales del emulador de mobile del
> navegador (Galaxy A55, 360×800), no solo por lectura de código — este
> entorno no tiene forma de abrir un navegador para confirmar renderizado
> visual. Eso importó de verdad: el primer intento del arreglo de
> onboarding (`min-w-0` puesto más adentro en el árbol, sin tocar la
> columna del grid) no alcanzó, y solo se detectó con la segunda
> captura.

> **Segunda vuelta del mismo día: el `truncate`/`flex-wrap` de arriba no
> alcanzó para "Propiedades en seguimiento" ni "Próximas visitas y
> acciones" — hizo falta rediseñar la fila, no solo taparle el síntoma.**
> Con capturas nuevas de celular real se vio que el título seguía
> truncando a una sola letra (`"P..."`, `"Venta ..."`). La causa real:
> el `Link` del título tenía `min-w-0`, que le permite achicarse **sin
> límite** — con eso, `flex-wrap` nunca llega a activarse, porque
> siempre "entra" en el renglón si se lo aprieta lo suficiente. El
> arreglo de verdad fue estructural: las dos filas pasan a `flex-col`
> por default (cada bloque — título/zona, y precio/badge/ícono — en su
> propia línea completa) y `sm:flex-row` recién a partir de pantallas
> grandes, en vez de confiar en que `flex-wrap` decida solo cuándo
> cortar. De paso, el botón "Calendario" de la agenda (`app/caso/agenda/
> page.tsx`) quedaba flotando chico a un costado en mobile — se le sumó
> un prop `fullWidth` a `AddToCalendarButton` (default `false`, no
> afecta a los otros tres usos del componente) para que ocupe todo el
> ancho con una línea divisoria arriba, en vez de flotar solo.
>
> **Lección repetida:** en este entorno, sin forma de abrir un
> navegador, un `truncate`/`min-w-0` puesto en el lugar equivocado del
> árbol *parece* correcto leyendo el código y compila sin errores, pero
> solo una captura real de mobile lo termina de confirmar o lo
> desmiente.

> **Auditoría de UX e implementado (18 sept 2026): bloque intensivo de seguridad visual, accesibilidad y velocidad percibida.**
> - **Seguridad visual (contraseñas):** En el panel del corredor (`CaseRow`), super-admin (`AdminCaseCard`), y alta de caso (`CreateCaseModal`), la contraseña del caso ya no se muestra en texto plano por defecto. Se oculta como `••••••••` y requiere un click en un ícono de ojo (toggle) para revelarse — previene el riesgo pasivo de mostrar accesos sensibles al compartir pantalla o en un café.
> - **Optimistic UI (React 19) en Checklist:** Tildar/destildar una tarea en `ChecklistClient` usa `useOptimistic` para una respuesta instantánea (sin delay percibido), mientras `PATCH` persiste de fondo. Se suma también un filtro "Ocultar completados" para limpiar el ruido visual.
> - **Accesibilidad y Portales:** Modales pesados (`AddHouseModal`, `EditHouseModal`, `BriefEditor`, `CriteriaEditor`, además de `CreateCaseModal`) migrados a `<div>` con `createPortal(..., document.body)` para escapar del *stacking context* de Tailwind y prevenir recortes, con bloqueo de scroll (`overflow: hidden`) y listener para la tecla `Escape`. (No se usa el elemento nativo `<dialog>`.)
> - **Mapa y Navegación:** El popup de propiedades en el mapa (`HousesMap`) suma título, precio y badge de estado con link hacia la tarjeta detallada (`#house-[id]`) — sin foto. La vista de agenda invita a calificar la visita ("¿Cómo les fue? Calificar →") si la fecha acaba de pasar. `VisitReview` acorta cada campo de la nota a 1 línea (`line-clamp-1`) si está colapsado.
> - **Menú compartir:** En `HouseCard`, el botón de WhatsApp ahora abre un menú desplegable armado a mano (no hay componente `Popover` en el repo) con opciones separadas para "WhatsApp" o "Copiar enlace al portapapeles".
> - **Métricas de lista:** `CaseList` gana ordenamiento dinámico ("Más recientes", "A–Z (Nombre)", "Más propiedades") usando un nuevo campo calculado `summaries`, y cada fila de caso muestra ahora el número total de propiedades ("{n} propiedades") y las pendientes de revisar ("{n} por revisar").

> **Implementado (18 sept 2026, parte 2): Mejoras Rápidas Lote 3 (Mobile, API Geocoding, Accesibilidad).**
> - **Skeletons de Carga:** Archivos `loading.tsx` dedicados bajo `/caso` y `/panel` para dar feedback menor a 50ms al usuario de celular mientras Redis resuelve datos, anulando el delay visual de las transiciones de App Router.
> - **Refactor Hooks y Error Boundaries:** Creación de `useModalScrollLock` reduciendo boilerplate y reparando bugs de modales previos, sumado a un `app/caso/error.tsx` para evitar que caídas de red rompan el Footer y NavBar de las familias.
> - **Geocodificación Real (Nominatim):** Al persistir una propiedad, se introdujo una integración server-side contra *OpenStreetMap Nominatim* (`lib/zoneCoords.ts`) que mapea texto libre de zonas a `lat`/`lng` reales de manera transparente. Previene el crasheo del mapa de familias en el interior y provee un fallback nativo a la lista estática si Nominatim falla.
> - **Seguridad y Mobile-First:** Solución del scroll-bounce en iOS Safari/Chrome mediante CSS `overscroll-behavior-y: contain`. Adicionalmente, el login cuenta con atributos nativos `autoComplete` completos y todos los Action Buttons poseen `aria-label` para plena compatibilidad con lectores de pantalla y administradores de contraseñas de mobile.

> **Implementado (17 sept 2026): editar perfil (foto y nombre) desde el
> celular.** En el header angosto del panel, `BrokerNameEditor` solo se
> mostraba a partir de `sm:` (`hidden sm:inline-flex`) — pero esa misma
> clase se reutilizaba también para el `<input>` en modo edición, así que
> lo que fuera que disparara la edición en mobile heredaba `display:
> none` y el campo "desaparecía". En mobile ahora solo se ve el círculo
> de foto (`BrokerProfileModal`, nuevo), que abre un modal simple con
> foto y nombre editables; desktop no cambió.
>
> **Bug de fondo encontrado dos veces el mismo día, mismo mecanismo:**
> el modal de confirmación de `CaseRow` y el nuevo `BrokerProfileModal`
> quedaban recortados arriba de la pantalla en vez de centrados en todo
> el viewport. La card de `CaseRow` tiene `transform` en `:hover` y el
> `<header>` de `/panel` tiene `backdrop-filter` (`backdrop-blur-md`) —
> las dos propiedades CSS crean un *containing block* nuevo para
> cualquier hijo `position: fixed`, así que el modal quedaba encerrado
> en esa caja en vez de cubrir toda la pantalla. Mismo arreglo en los
> tres casos afectados (`CaseRow`, `BrokerProfileModal`,
> `InstallAppButton`): `createPortal` a `document.body`.
>
> **Implementado (17 sept 2026): modales tapados por la barra de
> navegación mobile.** `AddHouseModal`, `EditHouseModal`, `BriefEditor` y
> `CriteriaEditor` — los cuatro modales "hoja inferior" de `/caso/*` —
> usaban `z-20`, por debajo de la barra de navegación fija de `Nav.tsx`
> (`z-30`): el botón de guardar quedaba tapado en mobile. Subidos a
> `z-50`, mismo nivel que el resto de los modales de la app.

> **Encontrado y arreglado (20 sept 2026): un corredor sin suscripción
> activa no tenía forma de volver a pagar desde su propio panel.**
> Auditoría propia de `/panel/plan` y `PanelDashboard.tsx`, sin que nadie
> lo reportara todavía — dos bugs relacionados, el segundo más grave que
> el primero.
> - **`/panel/plan`:** `isCurrent = broker.plan === pKey` no miraba
>   `subscriptionStatus` — un corredor `atrasada`/`cancelada`, o con la
>   prueba de 14 días vencida (`subscriptionStatus` se queda en
>   `"prueba"` para siempre, nada lo cambia solo — ver el detalle en
>   sección 9), veía su plan de siempre marcado "Plan en uso" con el
>   botón deshabilitado, sin ningún banner que explicara por qué ni
>   ningún camino para pagar de nuevo. **Arreglado:**
>   `hasWorkingSubscription` distingue "prueba vigente" de "prueba
>   vencida pero el campo sigue diciendo prueba"; el botón de suscripción
>   vuelve a aparecer (con la etiqueta "Reactivar este plan") para esos
>   tres estados, y un banner nuevo explica el motivo.
> - **`PanelDashboard.tsx` (más grave): el componente entero desaparecía
>   con `activeCount === 0`** — exactamente el estado de un corredor al
>   que se le bajaron todos los casos a `solo_lectura` por impago
>   (`downgradeCasesForInactiveBrokers`, sección 9). Es el único lugar de
>   todo `/panel` con un link a `/panel/plan`; ocultarlo tapaba la única
>   salida visible justo cuando más hacía falta. **Arreglado:** se sacó
>   el `return null`.
> - De paso, el texto de "Garantías y preguntas sobre cobro" en la misma
>   página seguía diciendo que "la pasarela automática con Mercado Pago
>   está en desarrollo" y que se coordina por WhatsApp — desactualizado
>   desde que el checkout automático quedó funcionando (sección 9).
>   Corregido.

## 7. Tu panel de super-admin

Una capa más arriba de todo: vos administrando la plataforma completa, no
un caso ni un corredor puntual.

**Mismo login, otro destino.** No hace falta un sistema de roles nuevo:
entrás con el mismo Google OAuth que un corredor, pero tu email está en
una lista blanca (`ADMIN_EMAILS`) que te redirige a `/superadmin` en vez
de al panel de corredor.

**Decidido: control total.** Además de ver la lista completa de
corredores (estado de suscripción, plan, métricas básicas — activos, en
prueba, ingreso mensual total), el panel te deja actuar directamente:
editar una suscripción a mano, extender una prueba, crear o dar de baja
un corredor sin pasar por Mercado Pago. Tiene sentido ahora, con pocos
corredores manejados uno por uno — pero mezcla "soporte" con "operación
interna" en un solo lugar, y conviene separarlos el día que haya
demasiados corredores para tocarlos a mano de a uno.

> **De paso, resuelve el alta del primer corredor real:** con la landing
> todavía sin publicar, das de alta a Carolina a mano desde este panel en
> vez de esperar a que pase por el flujo de signup público — el mismo
> mecanismo (Google OAuth) sirve para los dos casos.

> **Implementado (14 sept 2026), antes de Mercado Pago.** `/superadmin`
> ya existe — lista de corredores con plan, estado de cobro y casos
> activos contra el tope de su plan (ver Cobro, sección 6), editable a
> mano desde ahí, más el alta manual de un corredor por email. `brokers`
> suma los campos que la sección 4 ya preveía (`plan`, `trialEndsAt`,
> `mpPreapprovalId`) y uno nuevo, `subscriptionStatus`, con cuatro
> valores: `prueba` (los 14 días sin tarjeta), `activa` (paga),
> `atrasada` (falló un cobro o venció la prueba — mismo trato que
> solo_lectura, sección 9) y `cancelada` (de baja). Como Mercado Pago
> todavía no está conectado, ese campo solo lo cambia un admin a mano;
> el día que exista el webhook (sección 8), pasa a actualizarlo también.
> `createCase` ya bloquea contra el tope de casos activos del plan del
> corredor (sección 6) — corredores creados antes de este cambio migran
> solos a `para_arrancar`/`activa` la primera vez que se leen (ver el
> backfill en `lib/brokers.ts`, mismo patrón que `normalizeHouse`).

> **Implementado (14 sept 2026): backup completo descargable.** Un botón
> en `/superadmin` (`/api/superadmin/backup`, protegido igual que el
> resto de la sección) descarga un único JSON con todos los corredores y,
> por cada caso, sus casas, checklist y criterios (`lib/backup.ts`). Es
> manual, no automático — pensado como red de contención mientras no
> exista un backup programado de verdad, después del incidente de
> pérdida de datos documentado en la sección 9.

> **Implementado (17 sept 2026): control real por corredor, sin ver la
> actividad de sus clientes.** `/superadmin` suma KPIs (corredores por
> estado de suscripción, casos activos/totales) y un buscador con tabs
> por estado — mismo patrón que `CaseList` en el panel del corredor.
> Cada fila suma un botón "Gestionar →" a una página nueva,
> `/superadmin/brokers/[id]`: la cuenta del corredor editable de punta a
> punta (nombre de marca, plan, estado, fin de prueba — antes solo
> plan/estado/prueba eran editables, y solo desde la fila de la lista) y
> la lista de sus casos con métricas agregadas (pendientes, destacadas,
> última actividad, propiedades en seguimiento). Desde ahí se puede
> cerrar, reabrir, renombrar o regenerar la clave de un caso puntual
> (nuevas rutas `/api/superadmin/cases/[id]/*`, protegidas igual que el
> resto de la sección — reutilizan `closeCase`/`reopenCase`/
> `regeneratePassword`/`renameCase` de `lib/cases.ts` ya existentes,
> pasándoles el `brokerId` real del caso en vez de uno nuevo). A
> propósito **no** hay "Entrar al caso" ahí, ni se muestra la contraseña
> del caso en esa pantalla (aunque sigue viajando en la respuesta de la
> API, igual que en el panel del corredor — la restricción es de
> interfaz, no un límite criptográfico nuevo): control operativo sobre la
> cuenta del corredor, no visibilidad sobre lo que carga la familia
> (casas, comentarios, checklist).
>
> **Bug de seguridad encontrado y arreglado en el mismo trabajo:**
> `getBroker`/`getCase` (y sus mutadores `updateBroker`/`updateCase`/
> `getOrCreateBroker` en `lib/brokers.ts`/`lib/cases.ts`) leían
> `brokers[id]`/`cases[caseId]` directo sobre un objeto plano de
> JavaScript. Con `id === "__proto__"` eso devuelve el `Object.prototype`
> heredado (un objeto "truthy", no `undefined`) — antes no importaba
> porque ningún `id` le llegaba crudo desde una URL a esas funciones; las
> rutas nuevas de esta misma sección sí lo hacen (`id`/`caseId` vienen
> directo de un path param). Reproducido de punta a punta contra el
> propio servidor (`POST /api/superadmin/cases/__proto__/close` terminaba
> "cerrando" un caso fantasma guardado bajo esa clave) y cerrado con
> `Object.prototype.hasOwnProperty.call(...)` en los cuatro puntos de
> lectura/escritura — mejora también al panel normal del corredor, que
> comparte las mismas funciones. De paso se encontró y arregló un bug
> funcional (no de seguridad) en el mismo código: `id` llega todavía
> URL-encoded (`%40` en vez de `@`) cuando se navega a
> `/superadmin/brokers/[id]` con `<Link>` — sin `decodeURIComponent`,
> "Gestionar" no funcionaba para ningún corredor cuyo `id` fuera un email
> (o sea, todos salvo `dev-broker`).

> **Implementado (17 sept 2026): borrado definitivo, para limpiar cuentas
> de prueba.** Hasta ahora la única acción destructiva era "Cerrar caso"
> (soft, reversible con "Reabrir"). Se suma "Eliminar caso" en
> `AdminCaseCard` y "Eliminar corredor" en `AdminBrokerEditor`, cada uno
> con el mismo modal de confirmación centrado (`createPortal`) que ya
> usaba el resto del panel — irreversible a propósito, sin soft-delete.
> Eliminar un caso saca el registro de `cases` y del índice del corredor
> (`deleteCase`, `lib/cases.ts`) y borra sus casas/checklist/criterios
> (`deleteCaseData`, `lib/store.ts`, claves separadas). Eliminar un
> corredor hace lo mismo con **todos** sus casos en cascada antes de
> borrar al corredor — el modal avisa cuántos casos se van a borrar.
> Nuevo primitivo genérico en la capa de datos: `dbDelete` (ya existía
> para el rate-limit; se reutilizó en vez de duplicarlo). Si el caso
> tiene usuario `"casa"` (el demo público de la landing), el modal de
> confirmación lo advierte explícitamente antes de dejar borrarlo.
>
> **Lección de esta misma sesión, no del código sino del entorno:**
> verificar contra el dev server en caliente no alcanza si el propio
> server está sirviendo una compilación vieja — Turbopack, en este
> entorno, no siempre recompiló una ruta tras guardarla, así que una
> primera ronda de pruebas "pasó" contra código stale (una clave
> `broker:{id}:cases` quedaba huérfana en vez de borrarse). Se detectó
> agregando un log de debug dentro de la función y viendo que nunca se
> escribía; un restart del proceso de `next dev` lo resolvió. Ante un
> cambio que "no hace nada" a pesar de leerse bien, restart antes de
> seguir buscando el bug en el código.

> **Implementado (19 sept 2026): el corredor también puede borrar su
> propio caso, no solo super-admin.** Hasta ahora "Eliminar caso" solo
> existía en `/superadmin` (pensado para limpiar cuentas de prueba). Se
> suma `DELETE /api/panel/cases/[id]`, con una diferencia a propósito
> respecto a la versión de super-admin: exige que el caso ya esté en
> `solo_lectura`/`archivado` (devuelve 400 si está `activo`) — así
> "Borrar" nunca es un atajo accidental frente a "Cerrar caso", tiene que
> pasar por ahí primero. Mismo guard de ownership que el resto del panel
> (`getCaseForBroker`, 404 si el caso no es del corredor logueado), mismo
> modal de confirmación centrado que cerrar/reabrir/regenerar clave en
> `CaseRow`. Reutiliza `deleteCase`/`deleteCaseData`, sin cambios ahí.

> **Ajustes de soporte y un chequeo real de "desbloquear" un corredor
> borrado (20 sept 2026).**
> - Reactivar a mano un corredor (`subscriptionStatus` → `"activa"`)
>   desde `AdminBrokerRow`/`AdminBrokerEditor` **no reabre solo** los
>   casos que quedaron en `solo_lectura` por el corte automático — el
>   modelo no distingue eso de un cierre manual del corredor (mismo
>   campo `Case.estado`), así que reabrir a ciegas podría deshacer un
>   cierre real. En vez de automatizarlo, ahora sale un toast recordando
>   revisarlos y reabrirlos a mano.
> - El texto de `/superadmin` ("plan y estado se editan a mano hasta que
>   Mercado Pago esté conectado") y el comentario de `PATCH
>   /api/superadmin/brokers/[id]` decían lo mismo desde antes de que el
>   webhook de MP estuviera en pie — corregidos para explicar que el
>   editor manual es un override de soporte, no la única vía.
> - Nueva tarjeta "Ingreso mensual estimado" en el dashboard, calculada
>   con `MP_PLAN_PRICES` × corredores en `subscriptionStatus: "activa"`
>   (sin el plan "a medida", que no tiene precio fijo) — sin esto no
>   había ningún número de negocio a la vista sin ir a mirar Mercado Pago
>   aparte.
> - **Confirmado con un test real, no solo lectura de código: borrar un
>   corredor y volver a darlo de alta con el mismo email desde "Dar de
>   alta un corredor" sí le saca el bloqueo.** Lucas reportó una cuenta
>   borrada antes de este cambio que seguía sin acceso ni aparecía en la
>   lista — esto último es esperado (un corredor borrado sale del índice
>   `all_broker_ids`, no hay fila para "restaurar"), lo que hacía falta
>   confirmar es que recrearlo funciona. Script de prueba contra el store
>   local: crear → `deleteBroker` → `getOrCreateBroker` con el mismo
>   email → el registro vuelve a existir y el tombstone (`RT-01`, ver
>   sección 9) queda limpio — mismo mecanismo que ya usa "Dar de alta un
>   corredor". Se sumó una aclaración en ese modal para que quede
>   documentado como el camino correcto, no solo implícito en el código.

## 8. Qué cambia respecto al código de Casa

Es una extensión del código existente de `D:\Casa`, no una reescritura.
Los archivos que tocaría esta capa (rutas relativas al repo de Casa, que
serviría de base para este proyecto):

| Archivo | Cambio |
|---|---|
| `proxy.ts` | tres chequeos en vez de uno: sesión de Google (corredor o super-admin, según el email) para `/panel/*` y `/superadmin/*`, cookie de caso simple para todo lo demás |
| `lib/store.ts` | cada función (`getHouses`, `updateHouse`, `addComment`...) recibe un `caseId` y lo antepone a la clave |
| `lib/seed.ts` | deja de aplicar tal cual — un caso nuevo arranca vacío, no con la búsqueda real de Lucas; `SEED_CHECKLIST` deja de ser una única lista y pasa a ser una plantilla por `tipoCaso`, elegida al crear el caso |
| `lib/auth.ts` | la constante `SITE_PASSWORD` desaparece — el login de corredor y de super-admin pasan a Auth.js (Google OAuth), el segundo con un chequeo extra contra `ADMIN_EMAILS`; solo el login de caso sigue siendo una credencial simple generada, guardada en `cases` |
| nuevo: `lib/cases.ts` | crear caso (con su título inicial y `id` tipo UUID), generar credenciales, listar casos de un corredor, editar el título de un caso ya creado, **regenerar la contraseña de un caso** (si se sospecha una filtración), cerrar un caso (pasa a solo-lectura y libera un lugar del tope); frena la creación de uno nuevo si el corredor ya llegó al tope de su plan |
| nuevo: rate limiting de login de caso | contador de intentos fallidos en Redis con TTL de 15 min; bloquea después de 10 intentos — vive en la ruta de login de caso, no en `proxy.ts` |
| nuevo: Vercel Cron (diario) | revisa casos en solo-lectura hace más de 90 días y los archiva (el link deja de funcionar; reactivable si el corredor vuelve a pagar) |
| `lib/types.ts` | dos cambios: `PEOPLE` (hoy una constante fija Lucas/Abril/Carolina) pasa a ser una lista definida al crear cada caso; y `Criteria`/`LoanInfo` (hoy asumen compra con crédito) pasan a variar según un nuevo campo `tipoCaso` (compra/alquiler/otro), cada uno con su propio perfil financiero |
| `lib/mortgage.ts` | `frenchInstallment()` y `cashNeededRange()` aplican solo a `tipoCaso` "compra" — alquiler necesita su propio cálculo (depósito + comisión + primer mes + seguro de caución o garantía) en vez de cuota francesa |
| `components/Nav.tsx` | hoy tiene `"Casa"` hardcodeado como marca — pasa a leer nombre e imagen del corredor dueño del caso, más el título de ese caso puntual; `brokers` necesita campos `nombreMarca` / `imagenUrl` |
| ~~nuevo: `app/api/upload/route.ts`~~ | **implementado distinto (14 sept 2026):** no hay ruta de upload aparte ni storage externo — `PATCH /api/panel/profile` acepta `imagenUrl` como data URL, ya comprimida a miniatura en el navegador (ver addendum de la sección 6) |
| `app/page.tsx` | hoy es el Inicio (dashboard) del caso único y vive en la raíz `/`; con landing pública, la raíz pasa a ser la landing de marketing y el dashboard de un caso se corre a otra ruta |
| nuevo: rutas del corredor | alta (login con Google vía Auth.js) y `app/panel/*` (lista de casos, crear caso, configurar marca, y una pantalla mínima de cambiar de plan/cancelar ya que Mercado Pago no trae un portal alojado como el de Stripe) — hoy no existen, todo el código actual asume un solo caso ya autenticado |
| nuevo: `app/superadmin/*` | panel de super-admin — lista de corredores, métricas, edición manual de suscripciones; protegido por el mismo login de Google + `ADMIN_EMAILS` |
| nuevo: `app/api/mercadopago/webhook/route.ts` | recibe notificaciones de Mercado Pago (pago exitoso, pago rechazado, cancelación de la suscripción) y actualiza `subscriptionStatus` en `brokers` |

> **No es solo agregar código:** el caso actual de Lucas y Abril — 41
> propiedades reales, en producción desde el 12 de septiembre en
> `D:\Casa` — tendría que migrar a ser el primer caso real dentro de
> Micaso (probablemente bajo la cuenta de Carolina como primera
> corredora), en vez de quedar aparte. Vale la pena planear esa migración
> puntual cuando llegue el momento, para no perder el historial ya
> construido.

> **Migrado (19 sept 2026).** Quedó bajo `dev-broker` (la cuenta de
> Lucas), no bajo Carolina como se especulaba arriba — hoy Carolina
> todavía no tiene cuenta real en Micaso (nunca inició sesión), así que
> no había a qué corredor real asignárselo. `D:\Casa` (`home-blush-one.
> vercel.app`) sigue en pie y en uso — este import fue de solo lectura
> desde ahí, no una baja. Datos extraídos a mano del RSC payload de las
> páginas en vivo (no había endpoint JSON para el checklist), adaptados
> a los dos campos que Micaso sumó desde que `D:\Casa` se congeló como
> punto de partida (`House.lat`/`lng`, en `null` — se geocodifican solos
> después; `LoanInfo.hasCredit`/`bankName`, completados como `true`/
> `"BBVA"`, inferido del propio contenido exportado). Resultado: 50 casas
> (41 activas + 9 en la papelera), 14 items de checklist y los criterios
> de crédito/búsqueda, probados primero en local y confirmados después
> contra producción leyendo las claves reales.

> **Sumado sin estar planeado (14 sept 2026): notificaciones toast.**
> `sonner` reemplaza los fallos silenciosos de `fetch()` — antes, si un
> guardado fallaba, la única señal era la consola del navegador, algo que
> nadie del otro lado del celular ve. `lib/http.ts` (`apiErrorMessage`)
> lee el `{ error }` de una respuesta fallida; `GlobalErrorToasts.tsx`
> (montado una vez en `app/layout.tsx`) atrapa además las caídas de red
> reales (offline, DNS, timeout) que ni siquiera llegan a una respuesta.

## 9. Riesgos y agujeros que encontré

Ninguno bloquea seguir — todos son más baratos de resolver ahora, por
escrito, que después de tener corredores pagando.

**Scraping a escala comercial, no personal**
Hoy el scraper le pega a MercadoLibre, ZonaProp, ArgenProp, RE/MAX y
Mudafy para 3 personas. Convertir esto en un producto pago que se apoya en
ese mismo scraping para muchos corredores cambia la naturaleza del asunto
— de conveniencia personal a extraer datos de terceros como parte de un
producto comercial. Antes de vender esto, conviene una revisión real de
los términos de uso de esos sitios, no asumir que lo razonable para 3
personas lo sigue siendo a escala.

> **Revisión real hecha (15 sept 2026)** — se leyó el `robots.txt` de
> los cinco sitios y, insistiendo con un User-Agent de navegador normal
> donde el primer intento dio 401/403, sus términos de uso. Contra eso se
> compararon las URLs que hoy ya están cargadas en `lib/seed.ts` y el
> comportamiento real de `app/api/scrape/route.ts`.
>
> - **RE/MAX — violaba su `robots.txt`, ahora resuelto.**
>   `remax.com.ar/robots.txt` tiene `User-agent: *` → `Disallow:
>   *?associate` (aplica a cualquier bot, no solo a IA). Los cuatro
>   avisos de RE/MAX ya cargados en `lib/seed.ts` tienen todos
>   `?associate=...` en la URL — es el parámetro que identifica al
>   agente que comparte el link, así que prácticamente **todo** link de
>   RE/MAX que un corredor argentino comparta lo va a tener; no es un
>   caso borde. **Arreglado:** `stripDisallowedQuery()` en
>   `app/api/scrape/route.ts` saca el parámetro `associate` antes de
>   pedir la página — el contenido del aviso no cambia sin él, así que
>   el autocompletado sigue funcionando igual, ya sin pisar esa regla.
> - **Mudafy — mismo problema con `/ficha/`, ahora resuelto (con
>   pérdida parcial de automatismo).** `mudafy.com.ar/robots.txt` tiene
>   `Disallow: /ficha/` para `User-agent: *`, sin excepción por
>   parámetro — a diferencia de RE/MAX, acá no hay nada que sacar de la
>   URL. Uno de los dos avisos de Mudafy en `lib/seed.ts` usa esa ruta
>   (`mudafy.com.ar/ficha/propiedad/...`); el otro usa `/casas/...`, que
>   no está vedada (el sitio parece haber migrado de estructura de URL
>   en algún momento). **Arreglado:** `isBlockedForAutoFill()` corta el
>   autocompletado para cualquier link `/ficha/*` antes de pedir la
>   página — para esos, la familia/corredor carga título, foto y precio
>   a mano; el resto de Mudafy sigue automático.
> - **ArgenProp — el `robots.txt` no bloquea la ruta usada, pero los
>   términos de uso sí lo prohíben por escrito.** El artículo 26.3 de
>   `argenprop.com/TerminosCondiciones` dice textual: *"El usuario
>   acepta no utilizar el sitio web ni los materiales incluidos o
>   extraídos del sitio web de manera ilegal, lo que incluye, sin
>   carácter restrictivo, extraer (scraping) contenido del sitio o la
>   base de datos para obtener listas de inventario u otra información
>   privada."* Nombra "scraping" explícitamente, aunque acotado a
>   "listas de inventario u otra información privada" — no
>   inequívocamente una ficha pública individual. **Decidido y
>   arreglado (15 sept 2026):** a diferencia de RE/MAX y Mudafy, achicar
>   esto no era un cambio de URL — `isBlockedForAutoFill()` corta el
>   autocompletado para todo `argenprop.com`. El link se sigue pegando y
>   guardando; título, foto y precio quedan a cargo de quien lo agrega.
> - **ZonaProp — confirmado y resuelto (18 sept 2026).** Su `robots.txt`
>   no bloquea el patrón de URL que `lib/seed.ts` usa hoy
>   (`/propiedades/clasificado/...`); el bloqueo estaba en los términos
>   de uso, en una página que es una SPA de React y no entrega el texto
>   legal sin ejecutar JavaScript — `curl` y WebFetch no pudieron leerla
>   antes. Confirmado con un navegador real (Playwright, ya en uso para
>   probar la app) contra
>   `help.zonaprop.com.ar/s/article/terminos-y-condiciones-de-uso`. Dos
>   cláusulas aplican, ninguna nombra "scraping" literal pero las dos
>   apuntan a lo mismo: **1.5.4** prohíbe específicamente *"el uso o
>   intento de uso de cualquier máquina, software, herramienta, agente u
>   otro mecanismo para navegar o buscar en este Sitio Web"* que no sean
>   sus propias herramientas de búsqueda — un fetch programático de una
>   ficha es exactamente eso; **1.3.2** prohíbe *"el uso, adaptación,
>   reproducción y/o comercialización no autorizada del Contenido"*
>   (texto, imágenes, entre otros) — el scraper reproduce título y foto
>   dentro de un producto pago, que es comercialización en el sentido
>   literal de la cláusula. **Arreglado:** mismo mecanismo que ArgenProp
>   y MercadoLibre — `isBlockedForAutoFill()` en `app/api/scrape/route.ts`
>   corta el autocompletado para todo `zonaprop.com.ar`; el link se sigue
>   pegando y guardando, título/foto/precio quedan a cargo de quien lo
>   agrega. Con esto, los cinco sitios de `lib/seed.ts` ya están
>   revisados — ninguno queda pendiente de confirmar.
>
> **Revisión adicional (18 sept 2026)** — Lucas pidió revisar de nuevo
> los cinco de arriba "por las dudas" más cuatro inmobiliarias chicas de
> la zona de búsqueda (links pasados a mano, no en `lib/seed.ts` todavía).
>
> - **Re-chequeo de los cinco ya conocidos: sin cambios**, salvo un
>   detalle nuevo en Mudafy. Se releyó el `robots.txt` de los cinco y se
>   re-confirmó el texto exacto del art. 26.3 de ArgenProp contra la web
>   en vivo — idéntico a lo ya documentado arriba. **Mudafy** sí tiene
>   algo no documentado todavía: su `robots.txt` bloquea `Disallow: /*?`
>   (cualquier URL con query string) para `User-agent: *`, no solo
>   `/ficha/*`. Hoy no afecta nada porque los links de Mudafy usados no
>   llevan query params, pero un link con `?utm_...` de tracking quedaría
>   bloqueado sin que `isBlockedForAutoFill()` lo sepa — no se tocó el
>   código todavía, queda anotado para cuando se dé el caso.
>   Adicionalmente, a diferencia de MercadoLibre/ArgenProp/ZonaProp, para
>   **RE/MAX y Mudafy** el arreglo original (14-15 sept) solo había
>   chequeado `robots.txt`, no el texto de los Términos y Condiciones —
>   se leyeron completos hoy (`remax.com.ar/terminos-y-condiciones` y
>   `mudafy.com.ar/d/terminos-y-condiciones`): **ninguno de los dos tiene
>   cláusula de scraping, bots, ni de propiedad intelectual/reproducción
>   de contenido** — RE/MAX ni siquiera tiene una cláusula de derechos de
>   autor en sus T&C; lo único cercano en Mudafy es la sección 8 sobre su
>   sistema de valuación específicamente, no el sitio en general. Con
>   esto, RE/MAX y Mudafy quedan confirmados a nivel de términos, no solo
>   de `robots.txt`.
> - **Bernabé Propiedades (`bernabepropiedades.com.ar`), DIC Propiedades
>   (`dicpropiedades.com.ar`), Altamirano (`altamirano.com.ar`) y
>   Montenegro Propiedades (`montenegropropiedades.com.ar`) — sin
>   restricción encontrada en ninguno de los cuatro.** `robots.txt`: DIC
>   tiene `Allow: /` explícito para todos los bots; Bernabé solo bloquea
>   bots de SEO nombrados (AhrefsBot, MJ12bot, etc.), no bots generales;
>   Altamirano nombra puntualmente a GPTBot/ChatGPT-User pero solo les
>   bloquea parámetros sueltos (`whatsapp`, `markers`), no las fichas de
>   propiedad; Montenegro no tiene `robots.txt` (404). Ninguno de los
>   cuatro tiene una página de Términos y Condiciones pública/enlazada
>   (Bernabé menciona "aceptás los T&C" en el formulario de contacto,
>   pero sin link visible ni contenido encontrado). A diferencia de los
>   cinco portales grandes de arriba, son inmobiliarias chicas sin
>   departamento legal — no hay una cláusula contractual que violar
>   porque no existe la cláusula. No se agregó ninguno de los cuatro a
>   `isBlockedForAutoFill()`, y el scraper ya los soporta automático hoy
>   (no están en la lista de bloqueados). Vale la pena repetir esta
>   revisión si alguna vez agregan un sitio nuevo grande a la lista, o
>   periódicamente para los que ya nombran bots de IA en su `robots.txt`
>   (Altamirano) por si suman restricciones más adelante.
> - **Agujero encontrado y cerrado: un link acortado bypaseaba el
>   bloqueo.** `isBlockedForAutoFill()` solo chequeaba el host del link
>   tal cual se pegaba, no el destino final después de seguir redirects
>   — un link de `share.google` (el que genera el botón "Compartir" de
>   Google en el celular, y que ya aparece en casas reales cargadas)
>   apuntando a MercadoLibre traía el aviso completo igual, sin que el
>   bloqueo se enterara. Probado y confirmado con un redirect armado a
>   mano antes de arreglarlo. **Arreglado:** `fetchHtml()` en
>   `app/api/scrape/route.ts` ahora sigue redirects a mano
>   (`redirect: "manual"`) y chequea `isBlockedForAutoFill` en cada hop
>   *antes* de pedirlo — si un hop cae en un sitio bloqueado, corta ahí
>   mismo sin haberle mandado nunca un request a ese sitio.
> - **Nuevo (18 sept 2026): datos aproximados desde el slug de la URL
>   para los sitios bloqueados, sin pedirle nada a su servidor.** Los
>   tres portales bloqueados meten el título del aviso (y ArgenProp/
>   ZonaProp a veces los ambientes) como texto en el path de la URL —
>   parsear ESE string no es acceso automatizado al sitio en ningún
>   sentido, es leer texto que el usuario ya pegó en el input, igual que
>   si lo hubiera tipeado él mismo. `guessFromBlockedUrlSlug()` en
>   `app/api/scrape/route.ts` hace ese parseo (probado contra avisos
>   reales de los tres sitios) y el endpoint devuelve esos campos más un
>   `notice` explicando qué falta cargar a mano (foto y precio siguen
>   sin poder sacarse así). El front (`AddHouseModal.tsx`) ya sabía
>   completar el formulario con lo que venga en la respuesta — solo hubo
>   que dejar de tratar esta respuesta como un error duro.
> - **MercadoLibre — el más grave de los cinco, confirmado con el texto
>   real (no una fuente secundaria).** Leído directo de
>   `mercadolibre.com.ar/ayuda/terminos-y-condiciones-de-uso_991`
>   (sección 12, "Uso Automatizado del Sitio y Acceso a la
>   Información"): *"Queda prohibido el uso de sistemas automatizados
>   (incluyendo, sin limitarse a, bots, spiders, scrapers o crawlers)
>   para acceder, indexar, extraer, copiar, almacenar, reutilizar,
>   reproducir, transmitir o distribuir, directa o indirectamente,
>   cualquier contenido del sitio de Mercado Libre sin la correspondiente
>   autorización expresa de Mercado Libre"* — sin condicionarlo al
>   User-Agent ni a qué tan "bien" se porte el bot; y agrega que el
>   incumplimiento *"podrá constituir una infracción contractual, una
>   violación a los derechos de propiedad intelectual... habilitando a
>   Mercado Libre a ejercer las acciones legales y técnicas
>   correspondientes"*. Su `robots.txt` es consistente con esto:
>   bloquea por nombre a ClaudeBot, GPTBot, PerplexityBot, Amazonbot con
>   `Disallow: /`, y solo deja pasar bots de vista previa de links
>   (Facebook, Twitter, LinkedIn) con `Allow: /`. El scraper
>   (`app/api/scrape/route.ts`) hoy se identifica justamente con el
>   User-Agent de `facebookexternalhit` — no porque sea ese bot, sino
>   para que el sitio lo trate como si lo fuera. Con la cláusula 12 de
>   por medio, cambiar el User-Agent por uno honesto **no alcanza**: el
>   texto prohíbe cualquier extracción automatizada, la haga quien la
>   haga. **Decidido y arreglado (15 sept 2026):** es la fuente más
>   usada de las cinco en `lib/seed.ts`, así que esta es la baja de
>   automatismo más grande de las cuatro — `isBlockedForAutoFill()`
>   corta el autocompletado para todo `mercadolibre.com.ar` (el link se
>   sigue pegando y guardando, solo que sin fetch automático). De paso,
>   como nunca más se le pide la página a MercadoLibre, el User-Agent de
>   `facebookexternalhit` deja de enviársele — el problema de
>   identificarse como un bot que no es queda resuelto para este sitio
>   sin tener que decidir qué UA "honesto" usar en su lugar.

**Costo de infraestructura — resuelto (14 sept 2026), con supuestos
explícitos en vez de datos medidos**
Upstash cobra por volumen de comandos y almacenamiento; Vercel por
invocaciones de función y ancho de banda. El proxy de imágenes
(`/api/image`) en particular hace pasar cada foto de cada aviso por
nuestro servidor — escala directo con corredores × casos × fotos. Sin un
caso real corriendo todavía en Micaso (Carolina sigue en `D:\Casa`), no
hay datos medidos — pero alcanza con los precios públicos de cada
proveedor (verificados 14 sept 2026) y un supuesto de uso conservador:

- **Fijo de la plataforma, no depende de cuántos corredores haya:**
  Vercel Pro USD 20/mes (Hobby no permite uso comercial) + dominio
  prorrateado (~USD 1,5/mes) + Upstash Redis USD 0 (free tier: 500K
  comandos/mes y 256MB, alcanza mucho tiempo antes de necesitar el plan
  pago) ≈ **USD 22/mes en total**, sea 1 corredor o 50.
- **Marginal por caso activo/mes:** Redis (lecturas/escrituras de
  pipeline, checklist, comentarios) cuesta centavos de dólar incluso a
  varias decenas de casos ($0,20 cada 100K comandos, $0,25/GB de storage
  pasado el primer GB gratis). El driver más variable es el ancho de
  banda del proxy de imágenes: con el supuesto de ~40 casas × 8 fotos ×
  300KB revisualizadas ~20 veces/mes, un caso mueve del orden de 2GB/mes
  — muy por debajo del 1TB incluido en Vercel Pro hasta varios cientos de
  casos simultáneos (pasado eso, USD 0,15–0,35/GB según región). El
  storage de la foto de perfil del corredor es insignificante y ni
  siquiera usa Vercel Blob (ver sección 5: es una miniatura de 256px
  guardada como data URL junto con el resto del corredor). Lo que sí usa
  Vercel Blob de verdad, desde el 15 sept 2026, son las fotos de casa
  subidas a mano (antes solo se podía pegar una URL) — comprimidas a
  1600px antes de subir, el costo adicional de storage es marginal
  frente al ancho de banda del proxy de imágenes de arriba, que sigue
  siendo el driver más grande.

**Conclusión: el costo no es la restricción para fijar precio.** Con los
volúmenes esperados (decenas de casos por corredor, no miles — ya
asumido arriba), cualquier precio de plan por encima de unos pocos
dólares por mes deja margen bruto superior al 90%. El techo real es
cuánto esté dispuesto a pagar un corredor — ver sección 11 para el precio
decidido y sección 12 para la validación con Carolina, que ya confirmó
que pagaría (falta la letra chica: cuánto, con qué frecuencia).

**Seguridad de las credenciales por caso — ya resuelto**
- **Límite de intentos:** bloquear el login de un caso después de 10
  intentos fallidos por 15 minutos — un contador simple en Redis con
  vencimiento automático (TTL), no hace falta un servicio aparte.
- **Identificador no-adivinable:** el ID del caso en la URL es un UUID
  igual que el resto de los IDs del sistema (`crypto.randomUUID()`, ya se
  usa en todo el código actual), no un número secuencial. Es gratis, no
  hay razón para no hacerlo.
- **Rotar una contraseña filtrada sin cortar el acceso:** un botón
  "regenerar contraseña" en el panel del corredor genera una nueva al
  azar para ese caso, manteniendo el mismo ID/URL. El corredor le reenvía
  la nueva contraseña a la familia por WhatsApp — no hace falta cerrar el
  caso ni perder el historial.

**Qué pasa si el corredor deja de pagar — ya resuelto**
Modo solo-lectura inmediato (sección 6), con todo visible tal cual
estaba — fotos, comentarios, historial completo; nada se oculta, solo se
bloquea la escritura. Después de **90 días** en solo-lectura sin que el
corredor reactive la suscripción, el caso pasa a archivado: el link deja
de funcionar (reactivable si el corredor vuelve a pagar, restaurándolo
desde su panel). Noventa días le da tiempo de sobra a un corredor que
canceló por error o está resolviendo un problema de pago, sin sostener
indefinidamente el caso de alguien que ya se fue de verdad.

**Sin tests, y ahora hay más para perder**
Hoy no hay ningún test automático en Casa (ver su CLAUDE.md) — razonable
para una herramienta de 3 personas que se prueba a mano. Pero el
aislamiento entre casos de distintos corredores es exactamente el tipo de
bug (un caso viendo o pisando datos de otro por una clave de Redis mal
armada) que una revisión manual detecta tarde y un test automático
previene antes de llegar a producción. No hace falta un framework de
testing completo — alcanza con un puñado de tests de integración que
confirmen que las claves de `case:{caseId}:...` nunca se cruzan entre
casos distintos, antes de tener un segundo corredor real con datos ajenos
en juego.

**Auditoría manual de aislamiento entre casos y corredores (14 sept
2026) — sin hallazgos, no reemplaza los tests pendientes arriba**
Con la app ya recibiendo escritura real de un segundo tipo de usuario
(el panel de corredor, además del caso), se revisaron a mano las tres
superficies donde un bug de aislamiento sería más grave: rutas
`/api/checklist`, `/api/houses`, `/api/criteria`, `/api/case/people` y
login de caso (¿puede un caso tocar datos de otro caso?); rutas
`/api/panel/cases/*` y `/api/panel/profile` (¿puede un corredor tocar
un caso o perfil de otro corredor?); y `proxy.ts` + `/api/superadmin/*`
+ `dev-login` (¿hay algún bypass del gate de admin, o el login de
desarrollo se cuela a producción?). Resultado: nada explotable en
ninguna de las tres. La razón estructural en el primer caso es que
cada operación pasa por una clave de Redis ya namespaced por `caseId`
(`case:{caseId}:...`) antes de buscar el recurso por su propio id,
nunca al revés; en el segundo, las seis rutas de mutación de casos
verifican `kase.brokerId === broker.id` de forma consistente; en el
tercero, las rutas de super-admin no confían solo en `proxy.ts` — vuelven
a chequear `ADMIN_EMAILS` contra la sesión real de Google adentro de
cada handler. Esto no reemplaza los tests automáticos de aislamiento que
ya se pedían arriba — es una foto de un momento, no una garantía
permanente contra una regresión futura.

> **Hardening resuelto (15 sept 2026):** el chequeo de `brokerId` que
> vivía repetido en cada ruta del panel se movió adentro de
> `lib/cases.ts`. `renameCase`, `closeCase`, `reopenCase` y
> `regeneratePassword` ahora reciben `brokerId` y verifican la
> pertenencia del caso ellas mismas (vía el nuevo `getCaseForBroker`)
> antes de escribir — si el día de mañana se agrega una ruta nueva que
> las llame sin repetir el chequeo, sigue protegida por construcción, no
> por convención. Las 5 rutas de `/api/panel/cases/[id]/*` (incluida
> `impersonate`, que no muta pero comparte el mismo riesgo de
> autorización) se simplificaron para usar `getCaseForBroker` en vez de
> repetir `kase.brokerId !== broker.id` a mano. Los 4 tests de
> aislamiento existentes (`test/isolation.test.mts`) siguen pasando.

**Credenciales de caso en texto plano — identificado, riesgo aceptado
por ahora**
La contraseña de cada caso (`lib/cases.ts`, antes `randomCode(8)`) se
guarda sin hashear, y el login la compara con `===` directo contra texto
plano — a diferencia de una contraseña de usuario típica, es
intencional: el corredor necesita poder *ver* la clave para compartirla
por WhatsApp (botón "Compartir" en el panel), así que hashearla
rompería esa función. La consecuencia es que cualquier exposición de la
base (Redis/Upstash comprometido, o el JSON completo de
`/api/superadmin/backup`) entrega las credenciales de acceso de
**todas** las familias, de todos los corredores, en texto plano y
listas para usar — quien lo tenga puede loguearse como cualquier
familia y ver DNI, ingresos y el resto de la documentación cargada. El
acceso a ese backup ya está bien controlado (solo `ADMIN_EMAILS`,
verificado server-side, no solo en `proxy.ts`), así que hoy el radio de
exposición depende de un solo admin (vos) y un solo caso real
(Carolina) — bajo. Importa más el día que haya varios corredores
pagando con clientes reales: en ese momento conviene tratar ese JSON de
backup como el activo más sensible del sistema (no guardarlo suelto,
borrar copias viejas).

> **Entropía subida (15 sept 2026):** `randomCode` ahora genera 12
> caracteres en vez de 8, tanto al crear un caso como al regenerar la
> clave — sobre el mismo alfabeto de 32 caracteres sin ambiguos, pasa de
> ~40 a ~60 bits.

> **Resuelto (17 sept 2026): encriptación reversible, no hash.** Un hash
> de un solo sentido (bcrypt) no servía acá — el corredor necesita poder
> *ver* la contraseña real para compartirla por WhatsApp (botón
> "Compartir"/"Regenerar clave" en `CaseRow` y, desde hoy, "Ver
> contraseña" en `AdminCaseCard`, ver sección 7), no solo verificarla.
> `lib/crypto.ts` encripta con AES-256-GCM (`CASE_SECRET_KEY`, una
> variable de entorno — nunca en la base) y desencripta de forma
> transparente en el borde de `lib/cases.ts`: todo el resto de la app
> (componentes, rutas) sigue leyendo `Case.password` como texto plano, sin
> saber que existe encriptación. Ahora si se filtra la base o el JSON de
> `/api/superadmin/backup`, lo que queda expuesto es texto cifrado, no la
> contraseña real — con una excepción a propósito: `listAllCases()` (la
> que alimenta el backup) nunca desencripta, así que ni siquiera un admin
> mirando ese JSON ve las claves en limpio. El login de caso
> (`getCaseByCredentials`) también pasa a comparar con
> `timingSafeStringEqual` en vez de `===`, cerrando el timing attack de
> paso. **Migración: perezosa, no un script aparte.** Las contraseñas ya
> guardadas (de antes de este cambio) siguen en texto plano hasta la
> próxima vez que se regeneren — `decryptSecret` reconoce el prefijo
> `enc1:` y devuelve cualquier valor sin ese prefijo tal cual, así que
> conviven los dos formatos sin romper nada. Probado de punta a punta con
> el navegador real: regenerar una clave real, revelarla desde
> `/superadmin`, loguearse con la nueva, confirmar que la vieja ya no
> funciona, y que el backup descargado la muestra cifrada.

> **Auditoría Integral de Arquitectura y Seguridad (18 sept 2026):** Se llevó a
> cabo una auditoría exhaustiva en dos fases (Arquitectura Base + Red Team de Puntos Ciegos)
> de todo el repositorio (el informe técnico formal completo vivió en
> `AUDITORIA-2026-09-18.md` y `AUDITORIA-2026-09-18_2.md` — borrados tras la
> verificación y remediación de más abajo, que ya cubre lo que quedó vigente
> de cada hallazgo). Se identificaron:
> - **Fase 1:** 3 hallazgos críticos (falsificación de sesión e IDOR por cookie `case_id` sin firma HMAC,
>   SSRF y evasión por DNS Rebinding en scraping/proxy, y condición de carrera en `dbUpdate`
>   sobre Redis) y 4 hallazgos de severidad alta (almacenamiento monolítico $O(N)$ en `"cases"`,
>   omisión de firma en webhook de Mercado Pago, geocodificación OSM Nominatim sincrónica
>   sin caché y evasión de rate limiting por IP spoofing).
> - **Fase 2 (Red Team / Puntos Ciegos):** 8 hallazgos adicionales de lógica de negocio y abuso funcional
>   (resurrección de brokers borrados vía JWT de 30 días, acceso ilimitado a casos con trial vencido,
>   Slow-Read DoS en scraper, inyección de comentarios forjados, doble cobro de suscripción MP, fuga de
>   sesión residual post-logout, CRLF injection en .ics y almacenamiento de blobs huérfanos en Vercel).
> El plan de remediación priorizado quedó establecido en dicho documento.

> **Verificación y remediación de la auditoría del 18 sept — no todo lo
> reportado era real (18 sept 2026).** Antes de implementar nada se
> verificó cada hallazgo contra el código real, no contra lo que decía
> el informe (protocolo de este CLAUDE.md: no fabricar, confirmar). Dos
> resultaron falsos positivos: **RT-06** (cookie `case_id` post-logout)
> ya se borraba en `PanelLogoutButton.tsx` desde antes de la auditoría —
> el auditor no leyó el archivo real; y **SEC-04** (spoofing de IP vía
> `X-Forwarded-For`) es falso en este deploy — Vercel sobreescribe ese
> header y no reenvía IPs externas sin plan Enterprise + Trusted Proxy
> (confirmado contra la doc oficial de Vercel). Dos estaban sobreestimados:
> **SEC-01** no es CVSS 9.1/IDOR trivial — los IDs de caso son UUIDs
> random de 128 bits, no adivinables, y `"demo"` es público a propósito
> (`/api/demo-access`); igual se firmó la cookie (HMAC + expiración) como
> defensa en profundidad. **SEC-03** no permite fraude — el webhook
> siempre vuelve a consultar el estado real a la API de Mercado Pago en
> vez de confiar en el body; sí tenía dos bugs de correctitud reales
> (validación salteable sin headers, manifest HMAC armado con
> `x-request-id` en vez de `data.id`, que habría rechazado webhooks
> legítimos el día que `MP_WEBHOOK_SECRET` se configurara) — ambos
> arreglados.
>
> Implementado: SEC-01 (`lib/sessionToken.ts`, HMAC+expiración),
> RT-01 (tombstone de brokers borrados en `lib/brokers.ts`), RT-05
> (cancela suscripción previa antes de crear una nueva), RT-02
> (`downgradeCasesForInactiveBrokers` en `lib/cases.ts` — conecta "atrasada
> = mismo trato que solo_lectura", que estaba documentado pero no
> conectado a ningún código), SEC-03 (fix de correctitud), SEC-02
> (resolución DNS antes de fetch en `lib/url-safety.ts`), RT-03
> (timeout activo + tope de 3MB en el scraper), RT-04 (`comments`/
> `checklist` ya no se aceptan del body al crear una casa), RT-07 (CRLF
> injection en `lib/ics.ts`), RT-08 (`del()` de Vercel Blob al borrar
> casa/caso), PER-01 (caché en Redis + timeout de 2.5s para Nominatim,
> movido a `lib/geocode.ts` para no romper el bundle del browser — ver
> nota abajo). Cada fix tiene test de regresión (`test/sessionToken.test.mts`
> nuevo, CRLF en `test/ics.test.mts`, manifest correcto en
> `test/mercadopago.test.mts`) y se probó en runtime contra el server de
> dev real (login, SSRF con `nip.io` e IP decimal, rate limit de scrape,
> inyección de comentarios, resurrección de broker, downgrade de caso).
>
> **Efecto colateral de desplegar esto: todas las sesiones de caso
> existentes en producción quedan invalidadas** — el formato de la
> cookie cambió (de UUID crudo a token firmado), así que familias y
> corredores con `case_id` guardado van a tener que loguearse de nuevo
> una vez (con la misma contraseña de siempre, no se pierde nada). Vale
> la pena avisarle a Carolina antes de desplegar.
>
> **Deliberadamente no tocado:** **ARC-01** (partir `cases`/`brokers` de
> una clave JSON monolítica a claves por entidad) y **DAT-01** (la
> condición de carrera de `dbUpdate` en Redis, sin WATCH/MULTI) quedan
> afuera de este lote — la sección 9 de este documento ya los describe
> como riesgo aceptado a esta escala, con la misma solución de fondo para
> los dos (estructuras atómicas nativas de Redis en vez de un JSON
> grande). Es una migración de datos en producción con usuarios reales,
> no un fix quirúrgico — mejor encararla aparte, con su propio plan.
> **COD-01** (validación Zod en runtime), **OBS-01** (códigos HTTP
> consistentes) y **ARC-02** (capa de servicios) quedan como deuda menor
> de calidad de código, no de seguridad — no bloquean nada.

> **ARC-01/DAT-01 implementado y probado en local (19 sept 2026).**
> `lib/cases.ts` y `lib/brokers.ts` dejaron de guardar todo en un blob
> único (`"cases"`, `"brokers"`) — cada caso vive en `case:{caseId}:meta`
> y cada corredor en `broker:{brokerId}:meta`, mismo patrón que ya usaban
> `houses`/`checklist`/`criteria` (`lib/store.ts`) y las suscripciones
> push (`lib/push.ts`). Se sumaron dos índices globales (`all_case_ids`,
> `all_broker_ids`, mismo patrón que el índice `broker:{id}:cases` que ya
> existía) para reemplazar `Object.values(blob)` en los listados
> completos y los barridos del cron, y un índice de login
> (`case_username:{username} -> caseId`) que reemplaza el scan lineal que
> tenía `getCaseByCredentials`. `lib/db.ts` suma `dbMultiGet` (usa `MGET`
> de Redis) para resolver varios IDs de un índice en un solo viaje en vez
> de N requests HTTP separadas. Ningún caller externo se tocó — las
> firmas exportadas de `cases.ts`/`brokers.ts` quedaron iguales.
>
> Efecto práctico: leer o escribir un caso puntual ya no depende de
> cuántos casos/corredores tenga la plataforma, y una escritura
> concurrente solo puede pisar a otra si apuntan al mismo caso o al mismo
> corredor — mismo nivel de riesgo, ya aceptado, que houses/checklist/
> criteria. Deliberadamente sin tocar: `deleted_broker_ids` (tombstones,
> chico y acotado) y estructuras nativas `SADD`/`redis.multi()` (el
> cliente REST de Upstash no expone WATCH, así que un CAS real no está
> disponible igual, y el achique del radio de la carrera ya alcanza el
> nivel aceptado en el resto del código).
>
> Probado con dos test files nuevos (`test/cases.test.mts`,
> `test/brokers.test.mts`: sembrado perezoso del caso demo, CRUD
> completo, los tres índices nuevos, login por username,
> `downgradeCasesForInactiveBrokers` con y sin `brokerId`,
> `archiveStaleReadOnlyCases`) más toda la suite existente (59/59),
> `tsc --noEmit`, `eslint` y `npm run build` limpios, y un ensayo
> end-to-end contra el store local: `scripts/migrate-cases-brokers.mts`
> (nuevo, no destructivo — lee el blob viejo y escribe las claves nuevas
> sin borrar nada) corrido contra los datos reales de dev, seguido de
> login de ambos casos reales, panel, superadmin, y el ciclo completo
> crear/renombrar/cerrar/reabrir/borrar caso y crear/borrar corredor —
> todo contra el server de dev real, no solo los tests.
>
> **Migrado y desplegado a producción (19 sept 2026).** Se tomó un
> respaldo de lectura de `cases`/`brokers` aparte antes de tocar nada,
> se corrió `scripts/migrate-cases-brokers.mts` contra el Redis real
> (verificado: 2 casos y 1 corredor migrados y con contenido idéntico al
> original) y recién ahí se desplegó el código nuevo. Las claves viejas
> (`cases`, `brokers`) siguen en Redis, sin tocar, como respaldo — se
> pueden borrar más adelante a mano una vez que haya confianza total en
> el esquema nuevo, no antes.

> **Bug real de sesión de caso encontrado y arreglado (20 sept 2026): un
> magic link vencido tapaba una cookie de sesión todavía válida.**
> Reportado por familias reales de un corredor: cerraban la app o la
> pestaña, la volvían a abrir, y tenían que loguearse de nuevo — pasaba
> en Android, tanto con la PWA instalada como reabriendo siempre el
> mismo link de WhatsApp. La cookie de sesión (`case_id`, 90 días,
> HMAC-firmada, ver SEC-01 arriba) estaba bien construida en los tres
> lugares que la emiten (`/api/login`, `/api/demo-access`, el
> impersonate del panel); el bug estaba en el bypass que auto-saltea
> `/login` cuando ya hay sesión activa (`proxy.ts`, agregado el 19 sept
> junto con los magic links de CON-02, sin test ni documentar acá — ver
> también el addendum de términos más abajo sobre esa misma laguna).
> Si la URL todavía traía `?t=<token>` del link de WhatsApp compartido y
> ese token —que dura 15 días, no 90 (`MAGIC_LINK_MAX_AGE_MS`, ver
> `lib/sessionToken.ts`)— ya había vencido, el código nunca hacía el
> bypass aunque la cookie siguiera perfectamente válida. Como el link de
> WhatsApp que comparte el corredor no caduca solo (sección 6, "Ciclo de
> vida de un caso" — el corredor lo cierra a mano), pasados esos 15 días
> cualquier familia que reabriera el mismo link volvía a ver el
> formulario completo de login (usuario/contraseña + checkbox de
> términos), en vez de entrar directo a `/caso`.
>
> **Arreglado:** un token vencido ahora se trata como "no hay token que
> honrar", no como "hay otro caso distinto que respetar" — la cookie ya
> válida gana. Solo se sigue exigiendo el login manual cuando el token
> es válido y apunta a un caso *distinto* al de la cookie activa (cambio
> de caso intencional, se preserva). Probado con curl contra el server
> de dev real, no solo el análisis de código: sin parámetros → bypass
> (sin cambios); token vencido/inválido → ahora sí bypassea a `/caso`
> (el fix); token válido de otro caso → sigue sin bypassear, pide login
> a mano. De paso, dos prolijidades chicas de la misma revisión: el
> comentario de `auth.ts` que decía que el redirect URI de producción de
> Google todavía no estaba configurado (desactualizado desde el 17 sept,
> ver sección 4) se corrigió, y `Nav.tsx` ahora da de baja la
> suscripción Web Push del dispositivo (`DELETE /api/case/push/
> subscribe`) antes de cerrar sesión, para no dejar un registro huérfano
> mandándole avisos de un caso a un dispositivo que ya no tiene acceso.

> **Segunda verificación cruzada (20 sept 2026): los dos informes legales
> del 19 sept (`AUDITORIA-LEGAL-2026-09-19-Claude.md` y
> `AUDITORIA-LEGAL-2026-09-19-Gemini.md`) se contradicen entre sí en
> varios puntos — se chequeó cada uno contra el código real y el
> historial de git, no se les creyó por escrito (mismo protocolo de este
> CLAUDE.md: no fabricar, confirmar).**
>
> - **Encontrado y arreglado el mismo día: cambiar de plan podía
>   terminar cobrando dos suscripciones a la vez en Mercado Pago (Gemini
>   CON-03) — más grave de lo que parecía al leer el informe.**
>   `git log -S "Cancelación preventiva suspendida"` ubica el cambio en
>   el mismo commit `1dce11a` (18 sept 2026, 23:58) que agregó los dos
>   informes: se sacó la cancelación preventiva de la suscripción
>   anterior antes de crear un checkout nuevo (razón correcta en su
>   momento: evitaba dejar al corredor sin nada activo si el checkout
>   nuevo fallaba), y el comentario que quedó en su lugar
>   (`app/api/panel/subscription/route.ts`) prometía que "se cancela en
>   el webhook al confirmar" — pero `app/api/mercadopago/webhook/
>   route.ts` nunca llamaba a `cancelSubscription` en ningún punto;
>   cuando llegaba `status: "authorized"` solo pisaba `mpPreapprovalId`
>   con el ID nuevo y dejaba la suscripción vieja corriendo en Mercado
>   Pago para siempre — sin ningún cron ni reconciliación que lo
>   detectara después. Peor todavía: `/panel/plan` no muestra el botón
>   de checkout si `subscriptionStatus === "activa"`, pero **`POST
>   /api/panel/subscription` no repetía ese chequeo en el servidor** —
>   cualquiera que le pegara directo a la ruta (o incluso una ventana de
>   carrera normal, con el webhook todavía sin procesar el estado nuevo)
>   generaba un segundo cobro mensual real, sin que nada lo corrigiera
>   solo. No era un riesgo latente para el día que se construya la
>   pantalla de "cambiar de plan" (sección 6) — ya era explotable contra
>   la API tal como estaba.
>
>   **Arreglado:** dos cambios. (1) `app/api/mercadopago/webhook/
>   route.ts` ahora sí cumple la promesa del comentario — cuando llega
>   `status: "authorized"` para una suscripción nueva, busca el
>   `mpPreapprovalId` que el corredor ya tenía guardado y, si es
>   distinto al de la suscripción recién confirmada, cancela la vieja en
>   ese mismo momento (nunca antes de confirmar la nueva, por la misma
>   razón original: si se cancelara antes y el checkout nuevo nunca se
>   confirma, el corredor queda sin nada activo). (2) `POST /api/panel/
>   subscription` ahora rechaza con 400 si el corredor ya tiene
>   `subscriptionStatus === "activa"`, cerrando el camino de pegarle
>   directo a la API sin pasar por la UI. Cubierto con 3 tests nuevos
>   (`test/subscription.test.mts`, mockeando `fetch` contra la API de
>   Mercado Pago — no le pega a la real): confirma la suscripción vieja
>   distinta se cancela, que una primera suscripción sin
>   `mpPreapprovalId` previo no intenta cancelar nada, y que un evento de
>   webhook repetido para la misma suscripción no se cancela a sí misma.
>   Probado además contra el server de dev real: un corredor con
>   `subscriptionStatus: "activa"` que le pega directo a `POST
>   /api/panel/subscription` ahora recibe 400 (antes hubiera llegado
>   hasta crear un preapproval real contra la API de producción de
>   Mercado Pago — no se probó ese camino contra la API real por lo que
>   implica, el mock ya cubre la lógica).
>
> - **Encontrado y arreglado el mismo día: `deleteCaseData` no borraba
>   las suscripciones push del caso (Gemini CON-05; Claude no lo
>   lista).** Las tres rutas que borran un caso para siempre
>   (`app/api/panel/cases/[id]/route.ts`, `app/api/superadmin/
>   cases/[id]/route.ts`, y en cascada desde `app/api/superadmin/
>   brokers/[id]/route.ts`) llaman `deleteCase` + `deleteCaseData`
>   (`lib/store.ts`), que borraba casas/checklist/criterios y las fotos
>   de Vercel Blob — pero nunca `case:{caseId}:push_subscriptions`
>   (`lib/push.ts`). No era un riesgo de seguridad (nadie puede leer esas
>   suscripciones desde afuera), era una clave huérfana que quedaba en
>   Redis para siempre por cada caso borrado.
>
>   **Arreglado:** nuevo `deleteCaseSubscriptions(caseId)` exportado
>   desde `lib/push.ts` (borra la clave entera de una, no de a un
>   endpoint como ya hacía `removeCaseSubscription`) — `deleteCaseData`
>   lo suma al mismo `Promise.all` que ya borraba houses/checklist/
>   criteria, así las tres rutas de borrado quedan cubiertas sin
>   tocarlas (todas pasan por esta misma función). Cubierto con un test
>   nuevo en `test/notifications.test.mts` (guarda una suscripción,
>   borra el caso, confirma que no queda ninguna) — 63/63 tests,
>   `tsc`/`eslint` limpios.
>
> - **Confirmado por Lucas (20 sept 2026): `scripts/purge-legacy-blobs.mts`
>   ya se corrió contra producción (Claude #1 / Gemini CON-05).** El
>   script existe, tiene guardas de seguridad (aborta si no encuentra los
>   índices nuevos) y quedó commiteado en el mismo `1dce11a` — a
>   diferencia de `scripts/migrate-cases-brokers.mts`, cuya corrida
>   contra el Redis real sí quedó documentada más arriba en esta misma
>   sección, esta no tenía ningún addendum propio (ni `git log` tiene un
>   commit de "purga" más allá de crear el archivo), y este entorno de
>   desarrollo no tiene credenciales de Upstash para verificarlo directo
>   contra la base real — así que esto queda registrado como confirmado
>   por Lucas, no verificado de forma independiente contra el Redis de
>   producción. Los blobs viejos `"cases"`/`"brokers"` ya no deberían
>   existir en producción.
>
> - **Descartado: el hallazgo CON-01 de Gemini (falsificación de
>   `Referer` y User-Agent `facebookexternalhit`) ya estaba resuelto en
>   el mismo commit que agregó su propio informe.** `git show
>   f059e34:app/api/scrape/route.ts` (el commit inmediatamente anterior)
>   todavía tiene el `USER_AGENTS` viejo con `facebookexternalhit`; el
>   commit siguiente, `1dce11a` — el mismo que agrega
>   `AUDITORIA-LEGAL-2026-09-19-Gemini.md` — ya lo reemplaza por
>   `MicasoBot/1.0` con contacto real, y sacó el `Referer:
>   ${url.origin}/` falso de `app/api/image/route.ts`. El informe de
>   Gemini describe código que dejó de existir en el mismo momento en
>   que se lo commiteó — no es que el riesgo sea bajo, es que ya no
>   existe. No hace falta ninguna acción sobre esto.
>
> - **Confirmado, real, y resuelto por fuera del código (Gemini
>   CON-08): no existe ninguna integración de facturación
>   electrónica.** Búsqueda exhaustiva (`factura`, `invoice`, `AFIP`,
>   `WSFE`, `CAE`, `CUIT`) sin un solo resultado en el código — ni
>   siquiera existe el campo CUIT/razón social en el perfil del
>   corredor. Micaso cobra suscripciones reales por Mercado Pago sin
>   que el código emita ningún comprobante fiscal — y no lo va a hacer:
>   **decisión de Lucas (20 sept 2026), esto se gestiona a mano desde su
>   cuenta de Mercado Pago (facturación del propio monotributo/
>   responsable inscripto sobre lo cobrado), no se construye una
>   integración con AFIP/WSFE.** Deuda de negocio resuelta por vía
>   administrativa, no de código — no bloquea nada y no queda pendiente
>   ninguna tarea de desarrollo.

**Barrido de "quedó pensado para un solo caso" (14 sept 2026) — dos
bugs reales encontrados y resueltos**
Además de la auditoría de aislamiento de arriba (¿puede un caso/corredor
tocar datos de otro?), se buscó la otra cara del mismo problema: código
que asume que solo existe un caso a la vez, sin ningún cruce de datos
entre corredores de por medio. Se revisó todo lo que quedó con nombres
del caso real de Lucas y Abril (`Lucas`, `Abril`, `Carolina`, `BBVA`) —
la enorme mayoría es contenido intencional (testimonio y muestra real en
la landing, datos semilla del caso demo, atajos de login solo en
desarrollo) salvo un comentario desactualizado en `lib/types.ts`
(mencionaba "crédito BBVA" en un campo que ya era genérico,
`aptoCredito` — corregido, no afectaba el comportamiento). Los dos bugs
de verdad estaban en `localStorage`, del lado del navegador, con nombres
de clave heredados de cuando esto era una sola app de un solo caso:
- `components/CalculadoraClient.tsx` guardaba los números de la
  calculadora bajo la clave global `"casa-norte-calculadora"` — un
  corredor que entra a dos casos distintos desde el mismo navegador (el
  botón "Entrar al caso" del panel) veía los números del caso anterior
  filtrarse al siguiente. **Resuelto:** la clave ahora incluye el
  `caseId` (`micaso-calculadora:{caseId}`), pasado como prop desde
  `app/caso/calculadora/page.tsx`. Verificado a mano: cargar un valor en
  el caso A y entrar al caso B en el mismo navegador ya no arrastra nada.
- `components/HouseCard.tsx` recordaba el último autor de comentario
  (`"casa-comment-author"`) igual de global — podía precargar un nombre
  que ni siquiera pertenece a la familia del caso actual. **Resuelto:**
  se valida contra la lista `people` del caso actual antes de usarlo, en
  vez de confiar ciegamente en lo guardado (más robusto que solo
  namespacear por `caseId`, porque también cubre el caso de que a alguien
  se le cambie el nombre o se lo borre de `people`).

**Riesgo competitivo: los jugadores grandes podrían copiar el enfoque**
El panorama competitivo (sección 2) muestra que ningún competidor local
hace hoy lo que hace Micaso, pero Tokko Broker y KiteProp ya tienen la
base de corredores, el presupuesto y el equipo para agregar un "portal
para el cliente" como feature nueva si ven que el modelo funciona. El
moat de Micaso no es tecnológico — es llegar primero, ejecutar rápido, y
construir la relación con corredores reales (empezando por Carolina)
antes de que a alguno de los grandes le convenga copiarlo.

> **Segunda revisión (13 sept, más tarde):** cinco cosas más aparecieron
> al releer el documento completo de punta a punta. Cuatro se resolvieron
> ese mismo día — una con una búsqueda real, tres con una decisión de
> diseño —; a la quinta se le decidió el alcance, pero le falta la letra
> real (ver abajo).

**Stripe no es viable para cobrar desde Argentina — confirmado, resuelto
con Mercado Pago**
Confirmado con una búsqueda real (13 sept 2026): Argentina no está entre
los cerca de 46 países donde Stripe permite abrir una cuenta para
*recibir* pagos — la única vía sería armar una entidad en el exterior
(tipo Stripe Atlas), lo cual agrega costo y complejidad injustificados en
esta etapa. **Decisión: el procesador de cobro pasa a ser Mercado Pago**
(Suscripciones / API de Preapproval) — además de ser viable para un
negocio argentino, es la opción que cualquier corredor local ya conoce y
confía, y resuelve mejor la facturación AFIP (que Stripe nunca iba a
dar). Diferencia real a tener en cuenta: Mercado Pago no trae un Customer
Portal alojado como el de Stripe — pausar, cancelar o cambiar de plan se
arma vía su API, así que esa pantalla de autogestión (que se había
decidido explícitamente no construir a mano) probablemente haya que
construirla igual, aunque sea mínima. Todas las referencias a Stripe en
el resto del documento (secciones 4, 5, 6, 8 y 10) ya se actualizaron a
Mercado Pago.

**El modelo de datos de `cases.estado` — resuelto: pasa a tres valores**
`estado` pasa de `activo/cerrado` a **`activo` / `solo_lectura` /
`archivado`**. Impago y cierre manual comparten el mismo camino:
**los dos pasan primero por `solo_lectura`**, con los mismos 90 días de
gracia antes de archivarse — un cierre manual no archiva de inmediato
(se había escrito así acá en un primer borrador; la implementación real
y la copia de la landing ya usan el camino único, que es más simple de
razonar y le da margen al corredor por si cerró un caso por error).
`Case.soloLecturaDesde` guarda el momento exacto en que empezó el
plazo, para que el cron de 90 días no dependa de `updatedAt` (que
cualquier otra edición pisa). Reactivar sigue sin tener UI (no hace
falta hasta que haya cobro real de Mercado Pago que lo dispare).

**Cuándo se cargan los nombres de la familia de un caso — resuelto**
Mismo criterio que ya se usa para los Criterios: nadie los pide al crear
el caso. La primera vez que cada integrante de la familia entra con el
link del caso, se le pregunta una sola vez "¿cómo te llamás?" y ese
nombre se agrega a la lista `PEOPLE` de ese caso — se recuerda en su
dispositivo (cookie o local storage) para no volver a preguntarlo. El
corredor puede cargar un nombre a mano si ya lo sabe, pero no es
obligatorio para crear el caso.

**Abuso de la prueba gratis sin tarjeta — resuelto: riesgo aceptado**
No se mitiga en v1. Mientras el producto se prueba con conocidos y
corredores captados a mano (sección 7), el costo de alguien reiniciando
su propia prueba con una cuenta de Google nueva es bajo — se revisita
si alguna vez se vuelve un problema real observado, no antes.

**Política de privacidad y términos de servicio — parcialmente resuelto:
falta el texto, no el alcance**
Lo que sí se puede decidir ahora sin escribir la letra chica: hacen falta
**dos documentos distintos, no uno**. **Términos de servicio**, para el
corredor — cubre la suscripción, y deja explícito que el corredor es
responsable de tener el permiso de su cliente para cargar sus datos en la
plataforma; la relación comercial es entre corredor y familia, no entre
la plataforma y la familia. **Política de privacidad**, para la familia
— se muestra la primera vez que entra con su link, y cubre qué guarda la
plataforma (presupuesto, contacto, fotos, comentarios), quién puede verlo
(su corredor y vos como super-admin; nunca otro corredor ni otra
familia), y qué pasa con eso si el caso se cierra o se archiva (ya
resuelto arriba). Lo que sigue sin resolver es la letra real: redactarla
con cuidado (idealmente con alguien que conozca la ley de protección de
datos argentina) antes de publicar la landing — eso ya no es una
decisión de diseño, es contenido que no se improvisa en una tarde.

> **Resuelto (15 sept 2026): texto real publicado, no un stub.** `/terminos`
> y `/privacidad` ya tienen el contenido completo en producción, separados
> como se decidió arriba. Sigue siendo prudente una revisión legal
> profesional antes de escalar a muchos corredores con clientes reales,
> pero ya no bloquea tener la landing pública en vivo.

> **Laguna documental encontrada y consentimiento arreglado (20 sept
> 2026): el clickwrap de TyC pasa a aceptarse una vez, con prueba real,
> no en cada login.** El 19 sept 2026 se sumó un checkbox obligatorio de
> "acepto los Términos y la Política de privacidad" en `LoginForm.tsx`
> (y el equivalente en `BrokerLoginForm.tsx`) siguiendo un informe de
> auditoría legal (`AUDITORIA-LEGAL-2026-09-19-Gemini.md`, hallazgo
> CON-06: el aviso pasivo al pie del formulario, sin acción afirmativa,
> no cuenta como consentimiento expreso bajo el Art. 5 de la Ley 25.326)
> — pero ese cambio nunca quedó registrado acá, y solo se implementó la
> mitad de lo que ese mismo informe pedía: el checkbox no se mandaba al
> servidor ni dejaba ningún registro (no probaba nada ante nadie), y
> además volvía a pedirse en cada visita a `/login`, molesto para una
> familia que reingresa seguido (reportado como queja real de clientes
> de un corredor). Registrar el consentimiento una vez —con fecha y
> versión— y no repetirlo no le resta validez legal: lo que exige la ley
> es un consentimiento expreso e informado, no un checkbox sin memoria
> que se repite en cada visita.
>
> **Arreglado:** `lib/legal.ts` fija `TERMS_VERSION` (`"2026-09-v1"`,
> mismo string que ya usaba el informe). `Case.terminos`
> (`lib/types.ts`) guarda `{ version, aceptadoEn }` —
> `recordTermsAcceptance()` (`lib/cases.ts`) lo escribe la primera vez
> que el login trae `acceptedTermsVersion` en el body
> (`app/api/login/route.ts`), sin pisar la fecha si esa misma versión ya
> estaba aceptada (la fecha del primer "acepto" es la que importa
> legalmente, no la del último login). En el dispositivo,
> `LoginForm.tsx` refleja lo mismo en `localStorage`
> (`micaso_terms_accepted_version`) para no volver a mostrar el
> checkbox — si sube `TERMS_VERSION` el día que cambie el texto real de
> `/terminos` o `/privacidad`, se vuelve a pedir. Probado de punta a
> punta con Playwright contra un caso real (no el demo): la primera vez
> pide el checkbox, después de loguearse el caso queda con `terminos`
> guardado (verificado leyendo el registro), y una segunda visita al
> mismo dispositivo —incluso sin cookie de sesión, ver el addendum de
> arriba sobre esa misma laguna— ya no lo vuelve a pedir.
>
> **Deliberadamente sin hacer:** ese mismo informe también pedía guardar
> IP y user-agent junto al consentimiento (`legalAudit` en el hallazgo
> CON-06) — no se sumó; versión + fecha alcanza para lo que hoy hace
> falta, y ese nivel de trazabilidad, si llega a hacer falta, es un
> cambio aparte. `BrokerLoginForm.tsx` (corredor) tampoco se tocó — no
> es molesto en la práctica porque la sesión de Google dura 30 días
> (sección 4) y rara vez vuelve a pasar por `/panel/login`.

**Condición de carrera en el store local — pasó de verdad (14 sept
2026), resuelto para local; queda un resto menor en Redis**
El fallback de archivo local (`.data/store.json`, usado en desarrollo
sin credenciales de Upstash configuradas) perdió datos reales una vez:
cada mutación hacía su propio "leer todo el archivo" y, en una llamada
aparte, su propio "guardar todo el archivo" — dos requests
concurrentes leen el mismo estado viejo, y el segundo guardado pisa
por completo lo que el primero acababa de escribir. Se perdieron
`case:demo:houses`, `case:demo:criteria`, `case:demo:checklist` y
`brokers` enteros (se recuperaron sin pérdida real porque las
propiedades y el checklist demo viven como semilla en `lib/seed.ts`,
y el perfil del corredor se recrea solo desde la sesión de Google).
**Resuelto para el store local:** `lib/db.ts` expone `dbUpdate(key,
mutate)`, que hace lectura+escritura como una sola operación atómica;
se reescribió cada punto del código que hacía "leer, después guardar"
por separado (`lib/cases.ts`, `lib/brokers.ts`, `lib/store.ts`) para
usarla. Confirmado con un test de estrés real (15 creaciones de caso
concurrentes): antes del arreglo sobrevivía 1 de 15, después las 15.
**Sin resolver del todo en Redis (producción):** `dbUpdate` ahí sigue
siendo un GET y despues un SET, no una transacción real (no hay
WATCH/MULTI vía el cliente REST de Upstash que se usa) — el mismo
patrón de carrera podría repetirse con dos requests verdaderamente
simultáneas para el mismo caso. Riesgo aceptado por ahora: Vercel rara
vez sirve dos requests al mismo tiempo para el mismo caso con el
volumen esperado (sección 9, "Costo de infraestructura"). Si alguna
vez se vuelve un problema real observado, la solución es mover el
índice de casos por corredor y la lista de casos a estructuras
atómicas nativas de Redis (`SADD`/listas) en vez de un objeto JSON
grande por clave.

> **La reescritura de "14 sept" no fue completa — encontrado y
> arreglado de verdad probando la carga manual (15 sept 2026).**
> `getHouses`, `getChecklist` y `getCriteria` en `lib/store.ts` seguían
> teniendo exactamente el patrón "leer, después guardar" por separado,
> pero solo en la rama de inicializar una clave nueva (`dbGet` ve
> `null` → `dbSet` con el valor por defecto) — quedó afuera de aquel
> barrido porque no es el mutador obvio de cada dato (agregar/editar
> una casa sí pasa por `dbUpdate`), es la primera lectura de un caso
> recién creado. Se reprodujo de verdad probando la feature de carga
> manual: se creó un caso, se agregó una casa por API, y al abrirlo en
> el navegador un instante después la casa había desaparecido — no una
> vez, sino de forma reproducible corriendo `getHouses`/`addHouse` en
> paralelo directo desde código (ver `test/concurrency.test.mts`, que
> falla de forma determinística contra el código viejo). **Arreglado**
> reemplazando el `dbSet` ciego por un `dbUpdate` que vuelve a chequear
> `current` adentro del mismo lock, mismo criterio que ya usaban
> `updateChecklistItem`/`addChecklistItem`/`updateCriteria`. El caso
> demo no lo sufría (su clave ya existe desde que corrió `lib/seed.ts`
> la primera vez), por eso nunca apareció antes: hace falta un caso
> *nuevo* y una lectura+escritura casi simultáneas sobre él — exactamente
> lo que un corredor cargando la primera casa justo cuando la familia
> abre el link por primera vez puede disparar.

> **Segundo hallazgo, más de raíz — probando las 3 features de "Nivel
> 2" con el navegador real (15 sept 2026).** El arreglo de arriba no
> alcanzaba: un caso recién creado seguía desapareciendo del todo
> (no una casa suelta — el objeto `cases` entero volvía a tener solo
> el caso demo) al abrirlo en el navegador, incluso ya con el `dbUpdate`
> corregido en todos lados. Causa real: `withLocalStoreLock` en
> `lib/db.ts` era una promesa encadenada en una variable de módulo — un
> lock en memoria, no en disco. En `next dev` con Turbopack, cada route
> handler (y el middleware, `proxy.ts`, aparte) se compila bajo demanda
> como su propio módulo la primera vez que se lo pide — cada uno carga
> su propia instancia de `lib/db.ts`, con su propia variable
> `localStoreQueue`. Un load de `/caso/casas` dispara varios fetches en
> paralelo (casas, checklist, criterios, gente, y el propio chequeo de
> sesión del middleware) — la primera vez que corre cada uno compila su
> propio módulo, y dos de esos módulos leyendo y escribiendo el mismo
> `store.json` entero no se ven entre sí: la segunda escritura pisa a la
> primera sin que ningún lock lo evite, porque cada una tenía el suyo
> propio. Confirmado instrumentando `lib/db.ts` con un ID de instancia
> aleatorio al cargar el módulo: en una sola carga de página aparecían
> 3 IDs distintos. **Arreglado** reemplazando el lock en memoria por un
> lock de archivo real (`store.json.lock`, creado con `wx` — falla si ya
> existe — y con expiración de 10s por si un proceso murió sin
> liberarlo): un archivo en disco sí es compartido por cualquier
> cantidad de instancias del módulo, a diferencia de una variable en
> memoria. Test de regresión en `test/db-file-lock.test.mts`: importa
> `lib/db.ts` dos veces con un query string distinto para forzar que
> Node lo evalúe como dos módulos separados (simulando exactamente el
> caso de Turbopack) y confirma que 30 escrituras concurrentes repartidas
> entre las dos "instancias" no pierden ninguna — contra el lock viejo,
> se perdían 12 de 30 de forma reproducible. **Alcance: solo el fallback
> local de desarrollo** (`.data/store.json`, sin credenciales de
> Upstash) — en producción (Redis) este código nunca se ejecuta, así que
> este hallazgo no cambia el riesgo ya documentado arriba para Redis.
> Explica, en retrospectiva, varias "casas perdidas" que se habían visto
> antes en esta misma sesión de trabajo al probar a mano con el
> navegador y que en su momento se habían atribuido (parcialmente sin
> confirmar del todo) a una edición manual del store hecha por fuera del
> server — es probable que este bug ya estuviera contribuyendo desde
> antes.

> **Tres bugs reales de sesión encontrados y arreglados (20 sept 2026),
> dos de ellos reportados por Lucas probando a mano.**
> - **Cuenta de corredor borrada, pantalla en blanco.**
>   `getCurrentBroker()` ya devolvía `null` a propósito para una cuenta
>   tombstoneada (RT-01, arriba) — pero `app/panel/page.tsx` no
>   distinguía ese caso de nada, y terminaba sin renderizar contenido (ni
>   onboarding ni mensaje), indistinguible de la app rota. Decisión
>   tomada con Lucas: mantener el bloqueo (protección real contra abuso
>   de la prueba gratis), pero mostrar un mensaje claro ("Esta cuenta ya
>   no tiene acceso a Micaso") con un botón para volver al inicio, en vez
>   de una pantalla vacía.
> - **El caso demo se quedaba atrapado, sin forma de salir ni volver a la
>   landing.** `Nav.tsx` `handleLogout` para `isDemo` solo hacía
>   `router.push("/")`, sin borrar la cookie de sesión — como seguía
>   viva, `proxy.ts` devolvía a `/caso` apenas la landing intentaba
>   cargar (el mismo bypass de sesión ya activa que la sección 4
>   documenta). **Arreglado:** el demo ahora pasa por el mismo `/api/
>   caso/logout` que cualquier caso (salteando solo el paso de dar de
>   baja push, que el demo nunca tiene habilitado).
> - **Ese mismo `/api/caso/logout` devolvía 403 al intentar arreglarlo —
>   un segundo bug, más viejo, debajo del primero.** `checkCaseAccess` en
>   `proxy.ts` bloquea cualquier POST/PUT/PATCH/DELETE hacia `/api/*`
>   para el caso demo o un caso en `solo_lectura` — pero `/api/caso/
>   logout` no muta ningún dato del caso, solo borra la cookie del
>   navegador, y caía en esa misma regla igual que `/api/scrape` ya tenía
>   una excepción explícita por el mismo motivo. **Arreglado** con la
>   misma excepción. De paso corrige el caso real (no solo el demo): una
>   familia con el caso pausado por impago tampoco podía cerrar sesión
>   antes de este fix. **Verificado contra un servidor de dev real** con
>   tres casos (activo, solo_lectura, demo): `/api/caso/logout` pasa a
>   200 en los tres (antes 403 en los últimos dos) y borra la cookie de
>   verdad (`Set-Cookie: case_id=; Expires=1970`); de control, `POST
>   /api/houses` sigue devolviendo 403 para solo_lectura y demo — la
>   protección contra mutar datos reales no se tocó, solo el logout
>   quedó exento.
> - De paso: los tres botones de "cerrar sesión" de la app (familia/demo
>   en `Nav.tsx`, corredor en `PanelLogoutButton.tsx`) ahora se
>   deshabilitan y muestran un spinner mientras la request está en curso,
>   para que un doble toque no dispare dos logouts en paralelo.

## 10. Fuera de alcance (v1)

Explícitamente afuera hasta tener señal real de que el resto funciona:

- OAuth para el acceso de un caso — sigue siendo usuario/contraseña
  simple para esa puerta (ver sección 4); Google OAuth ya está decidido,
  pero solo para corredor y super-admin.
- Equipos / múltiples corredores por inmobiliaria compartiendo casos.
- Geocodificación real de direcciones — el mapa sigue siendo aproximado
  por zona.
- Scraping fuera de los sitios argentinos ya soportados.
- Archivado automático de un caso al cerrarse la compra.
- Notificaciones agregadas entre casos (mail/WhatsApp cuando algo cambia
  en cualquiera) — decidido que no hace falta, al menos para v1.

## 11. Parámetros a definir al lanzar

Ninguno de estos bloquea el diseño — son números y decisiones de
negocio, no arquitectura, y no hace falta resolverlos para considerar
este documento completo.

**Precio y tope de casos incluidos por plan — decidido (14 sept 2026),
sin esperar la validación de la sección 12.** El cálculo de costo de
infraestructura (sección 9) confirmó que el costo no es la restricción —
cualquier precio razonable deja margen enorme. Lo que faltaba, y sigue
faltando, es la segunda pata original de este párrafo: lo que Carolina
(u otro corredor) esté realmente dispuesta a pagar, algo que todavía no
se le preguntó. Coherente con la decisión general del proyecto de no
esperar validación de pago para avanzar, se publicó un precio de
lanzamiento igual, apoyado en dos referencias externas en vez de en la
respuesta de Carolina:

- **2clics** (CRM inmobiliario completo — sitio propio, multi-portal,
  WhatsApp, mucho más alcance que Micaso): ARS 60.545–173.745/mes, unos
  USD 39–112 al dólar blue del 14 sept 2026 ($1.545).
- **Portales de colaboración cliente-agente en EEUU** (sección 2, ya
  investigado): USD 14–199/mes.

Micaso es más angosto que un CRM completo (no publica en portales, no
arma embudo de ventas), así que el ancla elegida queda más cerca del piso
de esos rangos — como herramienta complementaria, no reemplazo de CRM:

| Plan | Tope de casos activos | Precio |
|---|---|---|
| Inicial | 5 | USD 13/mes (o $ 18.000 ARS) |
| Profesional | 20 | USD 29/mes (o $ 39.000 ARS) |
| A medida | a medida | a convenir (botón "Hablar con nosotros", no cobro automático) |

Los topes de casos (5 y 20) son una suposición de partida, no un dato
medido — ningún corredor real todavía maneja múltiples casos simultáneos
en Micaso. Precio mostrado en USD como referencia o en ARS si se detecta IP de Argentina. Por el momento el cobro real se hace en pesos vía Mercado Pago, previendo incorporar Stripe para pagos internacionales en USD. Todo esto
es precio de lanzamiento, no un número grabado en piedra — se revisa en
cuanto haya uso real o la respuesta de Carolina de la sección 12.

**Nombre público del producto — resuelto: Micaso**
De cara al corredor y a la familia, el producto se llama **Micaso** —
juego de palabras con "mi casa", y además el nombre literal de la unidad
del producto (un "caso" por familia, sección 3). "Casa" queda como
nombre interno/histórico de la herramienta original en `D:\Casa`.
Verificado sin conflictos con proptech existente. **Resuelto (verificado
15 sept 2026):** el dominio ya está comprado y la landing está publicada
en vivo en `micaso.com.ar` — el trámite que faltaba ya se hizo.

> **Forma canónica del dominio — `www.micaso.com.ar`, no el apex (15 sept
> 2026).** Vercel redirige `micaso.com.ar` hacia `www.micaso.com.ar` con
> un 308, y el crawler de WhatsApp descarta la previsualización de
> imagen (`og:image`) si la URL que declara la página no es ya la final
> tras esa redirección — comparte una vez con WhatsApp mostraba el link
> sin imagen. `lib/site.ts` centraliza el dominio con www para
> `metadataBase`, el OG de `/login`, `sitemap.xml` y `robots.txt`;
> `lib/whatsapp.ts` lo replica del lado del cliente (no puede importar
> `lib/site.ts` directamente: esa lógica depende de `VERCEL_ENV`, una
> variable de servidor que no llega al bundle del browser).

## 12. Camino de validación sugerido

> **Actualización (14 sept 2026):** este camino de validación dejó de ser
> un gate para escribir código. Lucas decidió construir Micaso igual,
> como proyecto personal para aprender — sin importar si alguien paga
> todavía; eso se evalúa más adelante. Lo que sigue abajo queda como
> registro de las señales reales ya observadas con Carolina, y como algo
> a retomar cuando la construcción esté más avanzada, no como condición
> para empezar.

**No construir nada de esto todavía — pero ya hay una señal real que vale
la pena seguir.**

> **Señal — 13 sept 2026:** Carolina vio la propuesta y reaccionó bien:
> dice que tiene potencial y que ella lo usaría. Es una señal real, pero
> todavía barata — es fácil ser generosa con algo que un amigo construyó.
> La pregunta que todavía no tiene respuesta es si lo *pagaría*, no si lo
> usaría gratis.

> **Segunda señal — 13 sept 2026:** Carolina pidió algo concreto que la
> herramienta no tenía: un checklist de verificaciones propio por casa
> (no el general de trámites — uno por propiedad, tipo "pedir informe de
> dominio"). Ya está construido y en producción. Es exactamente lo que
> el párrafo de abajo proponía observar — "qué carga que hoy no carga,
> qué le falta" — pasando solo, sin que nadie se lo pidiera como parte de
> un test formal. Sigue sin responder si pagaría, pero ya es uso real
> generando pedidos reales, no una opinión sobre una propuesta.

> **Tercera señal — 15 sept 2026: respondió la pregunta que faltaba.**
> Se le preguntó directo, como proponía el párrafo de abajo, y dijo que
> sí pagaría. Todavía falta la letra chica (cuánto, con qué frecuencia,
> desde cuándo) — eso no se registra acá hasta confirmarlo, para no
> inventar un número — pero la pregunta central de esta sección ("me
> gusta" vs. "pagaría") ya tiene respuesta, y es la que de verdad valida
> el negocio.

El caso de uso ya está corriendo en vivo con Carolina cumpliendo, de
manera informal, exactamente el rol que este documento propone
formalizar. Antes de invertir en la capa multi-caso, vale más observar
cómo usaría ella la herramienta si fuera realmente "suya": qué carga que
hoy no carga, qué le falta para coordinar visitas de varias familias el
mismo día, si de verdad completaría contacto, próxima acción y revisión
de visita en cada propiedad o si eso termina siendo fricción.

> **Prueba barata antes de multi-tenant real:** pedirle a Carolina que la
> use esta semana con un caso real y actual suyo — no hipotético — usando
> el truco de una segunda instancia del mismo repo (otro proyecto de
> Vercel, base de datos vacía), sin escribir una sola línea de código
> nueva. Y preguntarle directo si pagaría algo mensual por esto, aunque
> sea un monto simbólico de "primera corredora". "Me gusta" y "pagaría $X
> valida el negocio, y recién ahí tiene sentido arrancar con la
> construcción real.

---

## 13. Hacia la expansión internacional (Plan a futuro)

Micaso se construyó inicialmente enfocado en Argentina (Mercado Pago en ARS, copys "apto crédito", "cochera", "ambientes", zona horaria local). Sin embargo, el objetivo a largo plazo es llevarlo al exterior. Cuando se valide este modelo y se decida dar el salto, se deberán contemplar los siguientes frentes:

1. **Pasarela de pagos global:**
   Se reemplazará Mercado Pago (Checkout Pro y Suscripciones) por Stripe para procesar pagos internacionales, probablemente facturados en USD (dólares). Esto implicará un rediseño del webhook actual en `app/api/mercadopago/webhook` para adaptarlo a los eventos de Stripe.
2. **Internacionalización de idioma y glosario (i18n):**
   Actualmente hay vocabulario muy porteño ("ambientes", "cochera", "expensas"). Se deberá abstraer la UI para soportar múltiples idiomas o, al menos, un español más neutro (ej: "habitaciones", "estacionamiento", "gastos comunes"). Las fechas y la moneda (`es-AR` y formato pesos) también deberán adaptarse dinámicamente según la región o broker.
3. **Migración de Dominio y Branding:**
   Actualmente el dominio base está en `.com.ar`. Se preverá la transición a un dominio `.com` u otro TLD global una vez validado fuera de Argentina, configurando redirecciones limpias (301) para no perder los enlaces de casos ya activos por las familias.
