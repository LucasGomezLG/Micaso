# Reporte de Riesgo Legal — Micaso (19 sept 2026)

**Nota de alcance:** este reporte es un análisis técnico-legal hecho por Claude (Anthropic) a pedido de Lucas, revisando el código real del proyecto. No es un dictamen de un abogado matriculado ni reemplaza asesoramiento legal profesional — es insumo de due diligence interno. Para decisiones de cumplimiento formal ante la AAIP o para blindar contratos, un abogado matriculado en Argentina tiene que revisar esto.

**Contexto evaluado:** plataforma B2B2C (Micaso) donde corredores inmobiliarios pagan una suscripción para gestionar búsquedas de propiedades de sus clientes finales. Almacena datos personales, historiales de búsqueda, comentarios familiares, geolocalización, y procesa pagos vía Mercado Pago.

**Nota de alcance geográfico (agregada tras discusión del 18 sept):** todo este reporte asume el alcance actual — operación en Argentina, portales scrapeados argentinos, brokers y familias argentinos, marco normativo Ley 25.326/AAIP. Si el producto se expande a otros países más adelante, esto no extiende automáticamente: (a) el scraping con `Referer` falseado y User-Agent de `facebookexternalhit` (hallazgo #6/#7 abajo) pasa de ser un tema de ToS de bajo riesgo a exposición real bajo DMCA §1201 (EEUU) si los portales scrapeados o la operación del negocio quedan bajo jurisdicción estadounidense — esa ley prevé daños estatutarios sin necesidad de probar perjuicio concreto, mucho más agresiva que la Ley 11.723 argentina; (b) usuarios en la UE activan GDPR de verdad (no solo "estándares de interoperabilidad"), y usuarios en California activan CCPA — cada mercado nuevo requiere su propia revisión, no una extensión de esta. Mientras la operación sea solo Argentina, las calificaciones de riesgo de este reporte se mantienen como están.

## ESTADO DE REMEDIACIÓN ACTUALIZADO (18 Septiembre 2026)
**Mitigaciones completadas:**
- **[✓] #1, #2:** Blobs legacy purgados y textos legales (Política de Privacidad y Términos) sincerados con el verdadero ciclo de vida de los datos (conservación archivada hasta supresión expresa).
- **[✓] #3:** Implementado consentimiento afirmativo (Clickwrap) en formularios de acceso directo (`LoginForm.tsx`) y de alta de corredores (`BrokerLoginForm.tsx`).
- **[✓] #4:** Backup general del superadmin `/api/superadmin/backup` securizado mediante código de autorización en URL (`ADMIN_BACKUP_CODE`).
- **[✓] #5:** Autoservicio de baja implementado. Botón "Eliminar mi cuenta" agregado en `BrokerProfileModal.tsx`, con cancelación automática de la suscripción en Mercado Pago.
- **[✓] #6, #7:** Scraping mitigado. Se eliminó la falsificación de `Referer` y se configuró un `User-Agent` transparente (MicasoBot) con correo de contacto.
- **[✓] #8:** Webhook de Mercado Pago configurado en modo *Fail-Closed*. Si falla `MP_WEBHOOK_SECRET`, arroja HTTP 500 y no procesa el payload.
- **[✓] #10:** Implementado Rate Limiting estricto (1 req/s global) para Nominatim en `lib/geocode.ts` mediante lock en Redis para prevenir baneo de IP.

---

## Resumen de Exposición Legal: MODERADO

La base es mejor de lo esperado: hay una Política de Privacidad y Términos de Servicio reales (no placeholder), alineados a la Ley 25.326, con roles de responsable/encargado bien definidos, exclusión expresa de datos sensibles, y protecciones técnicas ya implementadas (aislamiento por caso verificado con tests, contraseñas encriptadas, verificación de firma en el webhook de Mercado Pago, re-consulta a la API real de MP en vez de confiar en el body). Eso baja el riesgo de "crítico" a "moderado".

Lo que lo mantiene en moderado y no en "bajo": hay una contradicción directa y actual entre lo que la Política de Privacidad promete y lo que el código hace — generada el mismo día de este reporte por la migración de arquitectura ARC-01/DAT-01 — más un modelo de consentimiento débil (browsewrap, no clickwrap) y un backup que concentra todo en un solo archivo.

## Matriz de Contingencias Legales

| # | Hallazgo Técnico | Normativa/Área Vulnerada | Riesgo | Actor Afectado |
|---|---|---|---|---|
| 1 | `cases`/`brokers` (blobs viejos) siguen en Redis después de la migración ARC-01 del 19 sept, con copia completa de nombres, emails y contraseñas encriptadas — `deleteCase`/`deleteBroker` no los tocan | Ley 25.326 art. 4 (calidad/no conservación indebida) + incumplimiento de la propia Política de Privacidad §6 ("supresión inmediata y definitiva") | Sanción AAIP por incumplir la propia política publicada; reclamo de un titular que pidió el borrado y descubre que el dato persiste | Desarrollador (directo); Corredor/Familia (su dato "borrado" no lo está) |
| 2 | `archiveStaleReadOnlyCases` solo cambia `estado` a `"archivado"` a los 90 días — no borra ni un byte, pese a que Términos §4 dice textualmente "Micaso... proceder[á] con la depuración del almacenamiento" | Representación engañosa / incumplimiento contractual (el propio ToS) | Reclamo civil por incumplimiento de lo prometido por escrito | Desarrollador |
| 3 | Consentimiento tipo "browsewrap": `LoginForm.tsx` y `panel/login` solo muestran un texto "Al continuar, aceptás..." con links — sin checkbox ni acción afirmativa explícita antes de habilitar el submit | Ley 25.326 art. 5-6 (consentimiento informado y expreso) | Cuestionamiento de validez del consentimiento en un reclamo AAIP; más débil que un consentimiento clickwrap ante un tribunal | Desarrollador; Corredor (como responsable de los datos de su cliente) |
| 4 | `buildFullBackup` (`/api/superadmin/backup`) descarga en un único JSON los datos personales de todos los corredores y todas las familias de la plataforma, sin cifrado del archivo en sí | Ley 25.326 (medidas de seguridad, principio de minimización) | Si ese único archivo se filtra (laptop robada, email mal enviado), es una brecha multi-tenant masiva de una sola vez, notificable | Desarrollador; todos los Corredores/Familias simultáneamente |
| 5 | Sin autoservicio de baja de cuenta para el Corredor — `deleteBroker` solo lo puede ejecutar superadmin; no hay botón "Eliminar mi cuenta" en el panel | Ley 25.326 art. 14-16 (plazos ARCO) — la Política promete 5 días hábiles para supresión, pero no hay un flujo trazable que lo garantice | Incumplimiento de plazo si un pedido de un corredor se pierde en un canal informal (WhatsApp, mail) | Desarrollador; Corredor |
| 6 | `/api/image` hace proxy en vivo de fotos de portales de terceros (ZonaProp, ArgenProp, MercadoLibre) con `Cache-Control` de hasta 7 días en el edge de Vercel — no las descarga a storage propio | Ley 11.723 (Propiedad Intelectual) | Bajo pero no nulo: es un proxy transitorio, no rehosting permanente, y el propio Términos §5 ya declara que esas imágenes "pertenecen a sus legítimos autores". Riesgo realista: carta de cese y desista, no demanda de fondo | Desarrollador (operador técnico) |
| 7 | Scraping de datos estructurados (precio, ambientes, superficie) de portales — son hechos/datos, no expresión creativa protegible individualmente | Ley 11.723 (protección de bases de datos, menos desarrollada en AR que en la UE) | Bajo — mismo mitigante: Términos §5 ya lo declara explícitamente | Desarrollador |
| 8 | Webhook de Mercado Pago sin `MP_WEBHOOK_SECRET` configurado salta la verificación de firma HMAC (aunque igual re-consulta el estado real contra la API de MP, que es la protección de fondo) | Riesgo contractual/operativo, no normativo directo | Bajo — la re-verificación contra la API real ya bloquea el fraude de fondo (otorgar suscripción sin pago real); la firma es defensa en profundidad, no la única barrera | Desarrollador |
| 9 | Cláusula de "limitación de responsabilidad" (Términos §8) excluye pérdida de datos y lucro cesante bajo "as is" | Art. 1743 CCyC: las cláusulas de exención de responsabilidad no son válidas si el daño deriva de dolo o culpa grave | Si algún día un corredor pierde datos por un bug ya conocido y no corregido a tiempo, esa cláusula podría no protegerte — un actor que sabía del riesgo (documentado en `ARQUITECTURA.md` sobre DAT-01) y no actuó es el escenario que un juez lee como culpa grave | Desarrollador |
| 10 | Geocodificación vía Nominatim sin rate-limit propio (solo caché indefinida en Redis, sin límite de 1 req/seg) | Política de uso de Nominatim/OSM Foundation (no es ley, es ToS de un tercero) | Bloqueo de IP compartida de Vercel si hay un pico de altas simultáneas — afecta a toda la plataforma, no es una multa pero sí una caída de servicio | Desarrollador (todos los tenants, indirectamente) |

## Análisis y Remediación (Legal-by-Design)

### Prioridad alta

**#1 — Blobs huérfanos post-migración.** La migración ARC-01 fue deliberadamente no destructiva (dejar `cases`/`brokers` viejos como respaldo de rollback), pero eso significa que hoy, un `deleteCase`/`deleteBroker` real deja el dato viejo intacto en esas claves. Remediación concreta:
- Ya que ARC-01 está confirmado y funcionando en producción, falta un script de purga puntual (`scripts/purge-legacy-blobs.mts`) que borre las claves `cases`/`brokers` viejas — recién ahí la promesa de "supresión inmediata y definitiva" vuelve a ser cierta.
- Mientras tanto, `deleteCase`/`deleteBroker` deberían también limpiar la entrada correspondiente en el blob viejo si todavía existe (un `dbUpdate` más, barato), para que un pedido de borrado de hoy se cumpla de verdad aunque el blob viejo siga ahí para casos no tocados.

**#4 — Backup concentrado.** Alcanza con encriptar el JSON completo (no solo las contraseñas de caso, que ya lo están) antes de servirlo, o exigir una segunda confirmación/contraseña al descargarlo desde `/superadmin`. Barato de implementar, reduce mucho el radio de explosión de una filtración.

### Prioridad media

**#2 — "Depuración del almacenamiento" no es cierto todavía.** Dos caminos: (a) implementar la purga real a los 90 días de `archivado` (borrar `case:{id}:*` de verdad, no solo cambiar `estado`), o (b) si se prefiere conservar el archivo por valor de negocio, corregir el texto del Término para que diga lo que el código realmente hace ("se conserva archivado, sin acceso, hasta que se solicite supresión expresa"). Lo urgente no es necesariamente construir la purga automática — es que el texto legal no mienta sobre el comportamiento real.

**#3 — Consentimiento browsewrap → clickwrap.** Agregar un checkbox real ("He leído y acepto los Términos y la Política de Privacidad") que deshabilite el botón de submit hasta marcarse, tanto en `LoginForm.tsx` (familia) como en el flujo de alta de corredor. Es un cambio de UI chico con impacto legal real — un consentimiento afirmativo pesa mucho más que un link al pie.

**#5 — Autoservicio de baja.** Un botón "Eliminar mi cuenta" en el panel del corredor (mismo patrón de confirmación que ya existe para borrar un caso) que dispare `deleteBroker` sobre uno mismo, en vez de depender de que superadmin lo haga a mano vía un canal informal.

### Prioridad baja / ya mitigado

**#6, #7 (scraping/imágenes):** el diseño actual (proxy en vivo, no rehosting; Términos ya declara la titularidad de terceros) ya es razonable **para el alcance actual (Argentina)**. No se recomienda tocar nada acá salvo, opcionalmente, bajar el `stale-while-revalidate` de 7 días a algo más corto si en algún momento un portal reclama — pero si hay planes concretos de expansión a otros países (ver nota de alcance geográfico al inicio), el `Referer` falseado y el User-Agent de `facebookexternalhit` (`app/api/image/route.ts`, `app/api/scrape/route.ts`) conviene sacarlos antes de esa expansión, no durante: es barato de arreglar hoy (aceptar el 403 y mostrar un estado de "no disponible" en el frontend) y caro de encontrar bajo presión el día que haya usuarios o portales bajo jurisdicción de EEUU.

**#8 (webhook):** confirmar que `MP_WEBHOOK_SECRET` esté seteado en producción (chequeo de 5 minutos, no de código) — la protección de fondo ya está bien.

**#9 (limitación de responsabilidad):** no es un bug de código, es una nota de proceso: documentar riesgos conocidos y no corregirlos (como se hizo con DAT-01, ya resuelto el mismo día) es exactamente el patrón que un juez podría leer como culpa grave. La buena noticia es que ya se arregló — vale la pena que quede así de trazable en `ARQUITECTURA.md` (ya lo está) como evidencia de diligencia, no solo como bitácora técnica.

**#10 (Nominatim):** agregar un rate-limiter simple (reusar `lib/rateLimit.ts`, que ya existe para otra cosa) delante de `geocodeZone` — no es una obligación legal pero sí evita un apagón de todo el mapa por un ban de IP compartida.
