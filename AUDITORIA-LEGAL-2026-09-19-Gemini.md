# INFORME DE AUDITORÍA DE RIESGO LEGAL, COMPLIANCE Y PRIVACIDAD DE DATOS (LEGAL-BY-DESIGN)

**Plataforma Auditada:** Micaso (SaaS B2B2C Inmobiliario)  
**Fecha de Emisión:** 19 de Septiembre de 2026  
**Auditoría a cargo de:** Asesoría Letrada Especialista en Derecho Informático, Compliance & Privacidad de Datos  
**Ámbito de Aplicación:** República Argentina (con estándares de interoperabilidad internacional RGPD / CCPA)  
**Marco Regulatorio:**
- Ley N° 25.326 de Protección de los Datos Personales (Argentina) y Dto. Reglamentario 1558/2001
- Resoluciones y Criterios Orientadores de la Agencia de Acceso a la Información Pública (AAIP)
- Ley N° 24.240 de Defensa del Consumidor
- Código Civil y Comercial de la Nación (Arts. 1105, 1716, 1724, 1728, 1737, 1743)
- Ley N° 11.723 de Propiedad Intelectual
- Código Penal de la Nación (Arts. 153 bis, 172 y 173)
- Ley N° 11.683 de Procedimiento Tributario y RG AFIP/ARCA sobre Facturación Electrónica
- Términos de Servicio y Políticas de Uso Aceptable de APIs de Terceros (OpenStreetMap / Nominatim, Mercado Pago)

**Nota de alcance geográfico (agregada tras revisión cruzada del 18 sept):** este informe cita normativa de EEUU (DMCA Sec. 1201, CON-01) como marco vulnerado, pero la operación actual de Micaso es exclusivamente argentina — portales scrapeados argentinos, brokers y familias argentinos. Bajo ese alcance real, el marco aplicable a CON-01 es la Ley 11.723 (más débil que la DMCA, sin daños estatutarios), y la calificación CRÍTICO/153 bis CP de ese hallazgo es exagerada para el contexto actual. La cita a la DMCA cobra sentido recién si la operación se expande a EEUU (portales, usuarios o la propia entidad del negocio bajo jurisdicción estadounidense) — en ese escenario sí conviene haber sacado el `Referer` falseado y el User-Agent de `facebookexternalhit` de antemano, porque ahí la ley sí prevé daños estatutarios sin necesidad de probar perjuicio concreto. Mismo razonamiento aplica al resto del informe: GDPR y CCPA solo rigen de verdad con usuarios en la UE o California respectivamente, no por "estándar de interoperabilidad" — cada mercado nuevo pide revisión propia.

---

## ESTADO DE REMEDIACIÓN ACTUALIZADO
**Acciones de mitigación rápida implementadas:**
- **[✓] CON-06 (Consentimiento / Clickwrap):** Se eliminó el autologin en accesos directos y se implementó un checkbox de aceptación obligatoria de Términos y Privacidad en los formularios de familias (`LoginForm.tsx`) y corredores (`BrokerLoginForm.tsx`).
- **[✓] CON-05 (Retención de Datos):** Se sinceraron los textos de la Política de Privacidad y Términos de Servicio sobre el tiempo de retención de archivos, y se purgaron exitosamente los blobs legacy (`cases` y `brokers`) post-migración ARC-01.

---

## 1. RESUMEN EJECUTIVO DE EXPOSICIÓN LEGAL

### Calificación General de Riesgo: **CRÍTICO** 🔴

La arquitectura técnica de **Micaso** y su documentación preliminar ([terminos/page.tsx](file:///d:/Micaso/app/terminos/page.tsx) y [privacidad/page.tsx](file:///d:/Micaso/app/privacidad/page.tsx)) demuestran la adopción de buenas prácticas en varias áreas (aislamiento de datos por caso, tokens de sesión con HMAC, cifrado AES-256-GCM para contraseñas en reposo).

No obstante, **el análisis forense del código fuente revela contradicciones severas entre lo que el sistema declara en sus políticas y lo que realmente ejecuta en runtime**. Existen prácticas y patrones en el código que generan exposición inmediata a:

1. **Demandas Civiles por Daños y Perjuicios e Infracción a la Ley de Propiedad Intelectual (Ley 11.723 / Art. 153 bis CP):** Elusión deliberada de medidas tecnológicas de protección (falsificación del encabezado HTTP `Referer` para saltar bloqueos 403 en CDNs de terceros) y suplantación de identidad en scrapers mediante User-Agents ajenos (`facebookexternalhit`).
2. **Sanciones y Multas de la Autoridad de Control (AAIP):** Transmisión de credenciales en texto plano en parámetros URL vía WhatsApp, consentimiento presunto (*browsewrap*) no vinculante y retención indefinida de expedientes en estado `archivado`, vulnerando el Derecho al Olvido y el principio de limitación de plazo de conservación.
3. **Responsabilidad Financiera y Daño Punitivo (Ley 24.240):** Cancelación preventiva y asincrónica de suscripciones anteriores al generar nuevos checkouts en Mercado Pago (riesgo de doble facturación activa o bajas accidentales) y omisión del circuito de facturación electrónica fiscal obligatoria.
4. **Demandas de Corredores por Lucro Cesante (CCCN Arts. 1716, 1728 y 1743):** Falta de atomicidad en `dbUpdate` (Upstash Redis), lo que genera condiciones de carrera concurrentes que provocan la pérdida irreversible de propiedades y expedientes de clientes. Las cláusulas de exención de responsabilidad ("as is") resultan nulas de pleno derecho por culpa grave.

---

## 2. MATRIZ DE CONTINGENCIAS LEGALES Y REGULATORIAS

| ID | Hallazgo Técnico en Código | Normativa Vulnerada | Riesgo Jurídico Concreto | Actor Afectado | Nivel de Riesgo |
| :--- | :--- | :--- | :--- | :--- | :---: |
| **CON-01** | Bypassing de hotlink protection mediante falsificación de `Referer: origin` y suplantación de User-Agent de Meta. | Ley 11.723, Art. 153 bis CP, DMCA Sec. 1201. | Medidas cautelares de cese de uso, demandas de portales inmobiliarios y bloqueo de dominio. | Desarrollador | **CRÍTICO** |
| **CON-02** | **(Resuelto)** Contraseñas y accesos directos expuestos en texto plano en query parameters (`?u=...&p=...`) por WhatsApp. | Ley 25.326 Art. 9 (Deber de Seguridad), RGPD Art. 32. | Fuga de credenciales en logs/proxies, violación al secreto profesional, sanciones graves de la AAIP. | Desarrollador, Broker, Familia | **RESUELTO** |
| **CON-03** | Cancelación preventiva de suscripciones previas en cambio de plan; webhook con validación saltable. | Ley 24.240 Arts. 4 y 36, Art. 52 bis (Daño Punitivo). | Cobros duplicados indebidos a tarjetas, cancelaciones fallidas, demandas de consumidores y multas. | Broker, Desarrollador | **CRÍTICO** |
| **CON-04** | Falta de transacciones atómicas en Upstash Redis (`dbUpdate` no protegido contra escrituras concurrentes). | CCCN Arts. 1716, 1728, 1743 (Nulidad de cláusulas por culpa grave). | Demandas de brokers por lucro cesante ante caída de operaciones de compraventa inmobiliaria. | Desarrollador, Broker | **ALTO** |
| **CON-05** | Retención indefinida de casos archivados en Redis y Vercel Blob sin purgado definitivo ni TTL. | Ley 25.326 Arts. 4 y 16 (Derecho al Olvido), RGPD Art. 17. | Multas regulatorias por conservación ilícita de datos personales y comerciales caducos. | Desarrollador | **ALTO** |
| **CON-06** | Mecanismo de aceptación tácita (*browsewrap*) en los accesos de Corredores y Familias, sin logs auditables. | Ley 25.326 Art. 5 (Consentimiento Expreso e Informado). | Inoponibilidad de Términos de Servicio y de cláusulas de prórroga de jurisdicción ante litigios. | Desarrollador | **ALTO** |
| **CON-07** | Ausencia de limitador de frecuencia saliente (1 req/s) para OpenStreetMap / Nominatim. | Términos de Uso de OSM Foundation (Nominatim Usage Policy). | Bloqueo de IP de salida de Vercel (HTTP 403), interrupción generalizada del servicio de geocodificación. | Desarrollador, Broker | **MEDIO** |
| **CON-08** | Inexistencia de circuito automatizado de emisión de comprobantes fiscales (Factura A / B). | Ley 11.683 (Procedimiento Tributario), RG AFIP/ARCA. | Sanciones fiscales, clausura administrativa digital por falta de emisión de facturación electrónica. | Desarrollador | **MEDIO** |

---

## 3. ANÁLISIS DETALLADO DE CONTINGENCIAS Y PLAN DE REMEDIACIÓN

---

### CON-01: Elusión de Medidas Tecnológicas y Responsabilidad por Propiedad Intelectual

#### Evidencia en Código
En [app/api/image/route.ts](file:///d:/Micaso/app/api/image/route.ts#L4-L33):
```typescript
// Proxy property photos through our own server: several listing sites
// (ArgenProp, etc.) hotlink-protect their CDN and 403 an <img> requested
// directly from a different domain, but allow it when the request's
// Referer matches their own site — which only a server-side fetch can set.
...
const res = await fetch(url, {
  headers: {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) ... Chrome/128.0.0.0 Safari/537.36",
    Referer: `${url.origin}/`,
    Accept: "image/*",
  },
});
```
En [app/api/scrape/route.ts](file:///d:/Micaso/app/api/scrape/route.ts#L257-L263):
```typescript
const USER_AGENTS = [
  "Mozilla/5.0 (compatible; facebookexternalhit/1.1; +http://www.facebook.com/externalhit_uatext.php)",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) ... Chrome/128.0.0.0 Safari/537.36",
];
```

#### Problema Jurídico
1. **Elusión Dolosa de Protecciones Técnicas:** El código reconoce explícitamente que los portales implementan protección anti-hotlink (HTTP 403) para impedir el consumo de su infraestructura y contenidos. Falsear la cabecera `Referer` para simular que la petición proviene del propio portal configura un ardid técnico violatorio de los principios de buena fe contractual y elusión de barreras de control de acceso (Arts. 9, 10 y 1725 CCCN; Art. 153 bis del Código Penal).
2. **Infracción a la Propiedad Intelectual (Ley 11.723):** Al almacenar y servir las imágenes a través de `/api/image` con directivas de caché pública (`Cache-Control: public, max-age=86400`), Micaso no es un mero visor transitorio: actúa como un servidor de redistribución no autorizado de obras fotográficas protegidas.
3. **Suplantación de Identidad Digital:** El uso ilegítimo del User-Agent de Meta (`facebookexternalhit`) para saltar los bloqueos de bots inmobiliarios constituye una práctica desleal susceptible de acciones tanto por parte de los portales como de Meta.

#### Remediación Técnica (Legal-by-Design)
1. **Eliminación del Bypassing de Referer:** En [app/api/image/route.ts](file:///d:/Micaso/app/api/image/route.ts), suprimir la cabecera `Referer: ${url.origin}/`. Si el servidor de origen responde con 403 o prohíbe el hotlinking, el sistema debe respetar la decisión técnica del portal y mostrar un fallback visual en el frontend (*"Foto no previsualizable por restricciones del portal de origen"*).
2. **Declaración Transparente de User-Agent:** Establecer en [app/api/scrape/route.ts](file:///d:/Micaso/app/api/scrape/route.ts) una identificación veraz:
   ```typescript
   "User-Agent": "MicasoBot/1.0 (+https://www.micaso.com.ar/bot; legal@micaso.com.ar)"
   ```
3. **Almacenamiento Conforme en Vercel Blob:** Promover que las fotos sean cargadas de forma voluntaria y directa por el corredor o la familia mediante [lib/photoUpload.ts](file:///d:/Micaso/lib/photoUpload.ts), asumiendo el usuario la garantía de indemnidad sobre los derechos del material cargado.

---

### CON-02: Exposición de Credenciales en URL y Brecha de Privacidad en Enlaces de WhatsApp

#### Evidencia en Código
En [lib/whatsapp.ts](file:///d:/Micaso/lib/whatsapp.ts#L31-L54):
```typescript
export function getCanonicalLoginUrl(username: string, password: string): string {
  const params = new URLSearchParams({ u: username, p: password });
  return `${canonicalOrigin()}/login?${params.toString()}`;
}
...
`Usuario: ${kase.username}`
`Contraseña: ${kase.password}`
```
En [components/LoginForm.tsx](file:///d:/Micaso/components/LoginForm.tsx#L49-L57):
```typescript
if (initialUser && initialPass) {
  setTimeout(() => performLogin(initialUser, initialPass, true), 0);
}
```

#### Problema Jurídico
1. **Violación al Deber de Seguridad (Art. 9 Ley 25.326):** Los parámetros de consulta en una URL (`?u=...&p=...`) viajan en texto plano y quedan asentados en el historial de navegación, en cachés locales, en los servidores proxy y en los registros de acceso (logs) de cualquier intermediario de red.
2. **Riesgo de Acceso Indebido y Pérdida de Confidencialidad:** Si el enlace de WhatsApp se reenvía o filtra, terceros ajenos adquieren acceso irrestricto a los datos sensibles de la familia: presupuestos económicos, comentarios íntimos sobre inmuebles, rutinas familiares y ubicaciones geográficas de interés.
3. **Invalidez del Consentimiento por Ingreso Automático:** El autologin directo saltea cualquier posibilidad de lectura y aceptación efectiva de la Política de Privacidad, viciando de nulidad el consentimiento informado exigido por el Art. 5 de la Ley 25.326.

#### Remediación Técnica (Legal-by-Design)
1. **Sustitución por Magic Links Efímeros Firmados Criptográficamente:**
   Eliminar `?u=...&p=...` de las URLs compartidas. Implementar tokens de invitación con HMAC y tiempo de expiración corto (ej. 72 horas) en [lib/cases.ts](file:///d:/Micaso/lib/cases.ts):
   ```typescript
   export function generateCaseInviteToken(caseId: string): string {
     const expiresAt = Date.now() + 72 * 60 * 60 * 1000;
     const hmac = createHmac("sha256", process.env.CASE_SECRET_KEY!);
     hmac.update(`invite:${caseId}:${expiresAt}`);
     return `${caseId}.${expiresAt}.${hmac.digest("base64url")}`;
   }
   ```
   ```
2. **Onboarding de Primer Ingreso con Consentimiento Obligatorio:** Al ingresar por primera vez con el token de invitación, la familia debe validar su identidad y aceptar expresamente los Términos y la Política de Privacidad antes de acceder al expediente.
3. **Separación de Canales de Acceso:** En caso de utilizar credenciales manuales, no enviar la contraseña en el cuerpo del mismo mensaje que contiene el enlace de acceso.

**ESTADO DE REMEDIACIÓN:** ✅ Resuelto (Septiembre 2026). Se implementó la solución mediante tokens HMAC (Magic Links efímeros) generados dinámicamente y el componente `LoginForm` exige de manera mandatoria la aceptación del _clickwrap_ legal ocultando los campos de texto si detecta un token seguro.

---

### CON-03: Responsabilidad Financiera, Doble Imputación de Cuotas y Seguridad en Webhooks

#### Evidencia en Código
En [app/api/panel/subscription/route.ts](file:///d:/Micaso/app/api/panel/subscription/route.ts#L24-L26):
```typescript
if (broker.mpPreapprovalId && broker.subscriptionStatus === "activa") {
  await cancelSubscription(broker.mpPreapprovalId).catch(() => {});
}
// Inmediatamente genera el checkout del nuevo plan...
const { initPoint } = await createSubscriptionCheckout(...);
```
En [app/api/mercadopago/webhook/route.ts](file:///d:/Micaso/app/api/mercadopago/webhook/route.ts#L27-L56):
```typescript
if (MP_WEBHOOK_SECRET) {
  // Validación de firma x-signature...
}
// Si MP_WEBHOOK_SECRET no está definido en el entorno, el código omite el bloque y procesa el evento crudo sin validar autenticidad.
```

#### Problema Jurídico
1. **Riesgo de Doble Facturación o Baja No Deseada:**
   - Si el corredor inicia un cambio de plan pero abandona el checkout de Mercado Pago, su suscripción anterior ya fue cancelada en la pasarela, perdiendo su abono activo sin haber perfeccionado el nuevo.
   - Si la llamada `cancelSubscription` falla de forma silenciosa por red (`.catch(() => {})`), Mercado Pago continúa cobrando la suscripción original. Al pagar el nuevo checkout, el corredor sufrirá dos débitos automáticos mensuales concurrentes.
2. **Sanciones por Daño Punitivo (Ley 24.240 Arts. 4, 36 y 52 bis):** El cobro indebido reiterado faculta a los clientes a reclamar el reintegro inmediato con intereses y abre la puerta a demandas por daño punitivo en sede civil y de consumo.
3. **Vulnerabilidad de Webhook Abierto (*Fail-Open*):** Si `MP_WEBHOOK_SECRET` no se carga en el entorno de producción, cualquier actor malicioso puede forjar llamadas POST al webhook y modificar el estado de las cuentas de los corredores sin autorización.
4. **Incumplimiento del Régimen de Facturación Electrónica (AFIP/ARCA):** El cobro de suscripciones recurrentes en pesos sin la emisión sistemática de la correspondiente Factura Electrónica A o B viola las normas de registración y facturación de la Ley 11.683.

#### Remediación Técnica (Legal-by-Design)
1. **Cancelación Atómica Supeditada a la Confirmación del Nuevo Abono:**
   No cancelar la suscripción preexistente en el momento de crear el checkout. Conservar la anterior y proceder a su cancelación ante Mercado Pago **única y exclusivamente** tras recibir y verificar el evento `status: "authorized"` del nuevo `preapproval_id` en el webhook.
2. **Modo Fail-Closed en Webhook:**
   En [app/api/mercadopago/webhook/route.ts](file:///d:/Micaso/app/api/mercadopago/webhook/route.ts):
   ```typescript
   if (!MP_WEBHOOK_SECRET) {
     console.error("FATAL: MP_WEBHOOK_SECRET no configurado");
     return NextResponse.json({ error: "Webhook signing secret missing" }, { status: 500 });
   }
   ```
3. **Idempotencia y Facturación Electrónica:**
   Almacenar un registro auditable de cada cobro confirmado (`topic === "payment"`) e integrarlo con un circuito de emisión de comprobantes fiscales electrónicos autorizados por AFIP/ARCA.

---

### CON-04: Integridad Transaccional, Pérdida de Datos y Responsabilidad Civil por Lucro Cesante

#### Evidencia en Código
En [lib/db.ts](file:///d:/Micaso/lib/db.ts#L131-L141):
```typescript
 * En Redis no es una transacción real (no hay WATCH/MULTI acá) — dos
 * requests concurrentes en producción podrían todavía pisarse. Es un
 * riesgo menor que el del fallback local (Vercel rara vez sirve dos
 * requests al mismo tiempo para el mismo caso) pero sigue abierto; ver
 * ARQUITECTURA.md sección 9. */
export async function dbUpdate<T>(key: string, mutate: (current: T | null) => T): Promise<T> {
  if (redis) {
    const current = await redis.get<T>(key);
    const next = mutate(current ?? null);
    await redis.set(key, next);
    return next;
  }
```

#### Problema Jurídico
1. **Pérdida de Datos por Concurrencia:** Dos peticiones concurrentes a la misma clave (ej. corredor y cliente agregando comentarios o casas simultáneamente) generan una condición de carrera donde el último `dbSet` destruye las modificaciones del primero.
2. **Nulidad de Cláusulas de Exoneración por Culpa Grave (Art. 1743 CCCN):** En [app/terminos/page.tsx](file:///d:/Micaso/app/terminos/page.tsx#L191) se establece que la plataforma se ofrece "tal cual es" (*as is*) y no responde por pérdida de datos ni lucro cesante. Sin embargo, documentar en los comentarios que el sistema carece de transacciones reales y mantiene un riesgo abierto de sobreescritura tipifica **culpa grave**. Las cláusulas de exención son jurídicamente nulas cuando media culpa grave en la obligación esencial del servicio.
3. **Litigios por Frustración de Operaciones Inmobiliarias:** Si un corredor pierde notas de visita, registros de reservas o datos de contacto críticos y una operación de compraventa de inmuebles se frustra por ese motivo, el corredor puede accionar judicialmente contra el desarrollador reclamando la comisión inmobiliaria perdida en concepto de daño patrimonial directo y lucro cesante.

#### Remediación Técnica (Legal-by-Design)
1. **Transacciones Atómicas con Scripts Lua en Redis:**
   Implementar operaciones de actualización mediante scripts Lua en Upstash Redis para garantizar que la lectura, modificación y escritura se ejecuten como una unidad atómica e indivisible.
2. **Control Optimista de Concurrencia (Versioning):**
   Incorporar un número de versión (`version: number`) en cada objeto de datos. Toda mutación debe verificar que la versión leída coincida con la que se intenta actualizar, abortando y reintentando si hubo un cambio concurrente.
3. **Copias de Seguridad Automatizadas y Disaster Recovery:**
   Crear un cronjob seguro que exporte diariamente snapshots completos y cifrados de la base de datos a un almacenamiento inmutable, garantizando políticas de RPO (Recovery Point Objective) y RTO (Recovery Time Objective) acordes a un servicio profesional.

---

### CON-05: Conservación Indefinida de Expedientes y Violación al "Derecho al Olvido"

#### Evidencia en Código
En [lib/cases.ts](file:///d:/Micaso/lib/cases.ts#L398-L411):
```typescript
export async function archiveStaleReadOnlyCases(): Promise<string[]> {
  // ...
  for (const kase of cases) {
    if (kase.estado !== "solo_lectura" || !kase.soloLecturaDesde) continue;
    if (new Date(kase.soloLecturaDesde).getTime() > cutoff) continue;
    await updateCase(kase.id, { estado: "archivado" });
    archived.push(kase.id);
  }
  return archived;
}
```
En [lib/store.ts](file:///d:/Micaso/lib/store.ts#L36-L41), `deleteCaseData` no limpia `case:${caseId}:push_subscriptions` ([lib/push.ts](file:///d:/Micaso/lib/push.ts#L21)), y no existe ninguna rutina que purgue los casos que llevan meses en estado `archivado`.

#### Problema Jurídico
1. **Violación al Principio de Temporalidad de los Datos (Art. 4 inc. 5 Ley 25.326):** Los datos personales y patrimoniales deben ser destruidos cuando dejan de ser pertinentes y necesarios para la finalidad que motivó su recolección.
2. **Incumplimiento de la Política de Privacidad Publicada:** La Política de Privacidad ([app/privacidad/page.tsx](file:///d:/Micaso/app/privacidad/page.tsx#L165)) asegura a las familias que tras el período de gracia de 90 días los casos pasan a baja y depuración. Mantenerlos almacenados indefinidamente en Redis y Vercel Blob configura una afirmación engañosa pasible de sanción por la AAIP.
3. **Omisión del Purgado en Vercel Blob:** Las fotos de casas de casos archivados permanecen alojadas en buckets públicos de Vercel Blob consumiendo almacenamiento y exponiendo imágenes privadas de inmuebles familiares sin justificación operativa.

#### Remediación Técnica (Legal-by-Design)
1. **Purgado Definitivo Automatizado (*Hard Delete*):**
   Programar en el cronjob diario ([app/api/cron/archive-stale-cases/route.ts](file:///d:/Micaso/app/api/cron/archive-stale-cases/route.ts)) que aquellos casos que permanezcan en estado `archivado` por más de 30 días adicionales sean eliminados de raíz:
   - Invocación de `deleteCase(caseId, brokerId)`.
   - Invocación de `deleteCaseData(caseId)` con purga masiva de fotos en `@vercel/blob`.
   - Eliminación de la clave Redis `case:${caseId}:push_subscriptions`.
2. **Mecanismo de Autogestión de Supresión:** Implementar una opción accesible para que las familias o el corredor puedan solicitar y ejecutar la baja definitiva e irreversible de su expediente en ejercicio del Derecho de Supresión (Art. 16 Ley 25.326).

---

### CON-06: Consentimiento Tácito (*Browsewrap*) y Ausencia de Trazabilidad Probatoria

#### Evidencia en Código
En [app/panel/login/page.tsx](file:///d:/Micaso/app/panel/login/page.tsx#L71-L79):
```html
<p className="mt-4 text-[11px]">
  Al continuar, aceptás nuestros Términos de servicio y la Política de privacidad.
</p>
```
En [components/LoginForm.tsx](file:///d:/Micaso/components/LoginForm.tsx#L185-L194):
```html
<p className="mt-4 text-center text-[11px]">
  El uso de tu caso se rige por la Política de privacidad y los Términos de servicio.
</p>
```

#### Problema Jurídico
1. **Ineficacia Jurídica del Consentimiento Tácito:** El régimen de protección de datos exige un consentimiento previo, libre, expreso e informado (Art. 5 Ley 25.326). La modalidad *browsewrap* (leyenda estática al pie) carece de valor probatorio para acreditar que el titular tomó conocimiento y aceptó activamente los términos.
2. **Inoponibilidad de Cláusulas de Prórroga de Competencia Territorial:** En caso de litigio con corredores del interior del país, el fuero pactado en los Términos (Tribunales Ordinarios de CABA) será desestimado por los tribunales si el usuario no manifestó su aceptación de manera expresa e inequívoca mediante una acción afirmativa (*clickwrap*).
3. **Falta de Bitácora de Consentimiento:** No existe registro de la versión exacta de las condiciones aceptadas, la fecha, hora, dirección IP ni el User-Agent del suscriptor al momento de registrarse.

#### Remediación Técnica (Legal-by-Design)
1. **Implementación de Checkbox de Clickwrap Obligatorio:**
   En los formularios de login de corredores y familias, incorporar una casilla de verificación obligatoria no premarcada:
   ```html
   <label className="flex items-start gap-2 text-xs">
     <input type="checkbox" required name="accept_terms" className="mt-0.5" />
     <span>He leído y acepto los <Link href="/terminos" target="_blank">Términos de Servicio</Link> y la <Link href="/privacidad" target="_blank">Política de Privacidad</Link>.</span>
   </label>
   ```
2. **Registro de Auditoría en la Base de Datos:**
   Guardar en el perfil del corredor ([lib/brokers.ts](file:///d:/Micaso/lib/brokers.ts)) el objeto de auditoría legal:
   ```typescript
   legalAudit: {
     acceptedTermsVersion: "2026-09-v1",
     acceptedAt: new Date().toISOString(),
     ipAddress: requestIp,
     userAgent: requestUa,
   }
   ```

---

### CON-07: Violación de Políticas de Uso Aceptable de OpenStreetMap / Nominatim

#### Evidencia en Código
En [lib/geocode.ts](file:///d:/Micaso/lib/geocode.ts#L30-L36):
```typescript
const q = encodeURIComponent(`${zone}, Argentina`);
const res = await fetch(`https://nominatim.openstreetmap.org/search?q=${q}&format=json&limit=1`, {
  headers: {
    "User-Agent": "MicasoApp/1.0 (+https://www.micaso.com.ar; contacto@micaso.com.ar)",
  },
});
```

#### Problema Jurídico
1. **Infracción de los Términos de Servicio de Nominatim:** La política oficial de uso de OpenStreetMap establece como condición ineludible un **límite máximo de 1 solicitud por segundo** y la prohibición de enviar peticiones concurrentes o en ráfaga (*bursts*).
2. **Riesgo de Bloqueo Generalizado de Infraestructura:** `geocodeZone` se ejecuta sincrónicamente al crear o editar casas. Si múltiples corredores dan de alta inmuebles en paralelo, se despachan peticiones simultáneas a Nominatim desde las funciones de Vercel. Al detectar ráfagas, OSM bloquea la dirección IP con código HTTP 403. Tratándose de IPs de salida compartidas en Vercel, el bloqueo inhabilita la funcionalidad para toda la plataforma.

#### Remediación Técnica (Legal-by-Design)
1. **Rate Limiting Saliente y Cola de Geocodificación:**
   Crear un regulador de llamadas salientes (usando Redis o una cola de tareas) que garantice una cadencia no menor a 1.100 ms entre peticiones consecutivas a Nominatim.
2. **Procesamiento Asíncrono Desacoplado:**
   Guardar el inmueble de inmediato sin bloquear la respuesta HTTP al usuario y delegar la resolución de coordenadas geográficas a un proceso en segundo plano que consuma la cola respetando estrictamente los límites de la API comunitaria.

---

### CON-08: Omisión del Régimen de Emisión de Facturación Electrónica

#### Evidencia en Código
En [lib/mercadopago.ts](file:///d:/Micaso/lib/mercadopago.ts) y [app/api/mercadopago/webhook/route.ts](file:///d:/Micaso/app/api/mercadopago/webhook/route.ts), el sistema percibe cobros de suscripciones recurrentes ($18.000 / $39.000 ARS) pero carece de integración con los servicios de comprobantes electrónicos de AFIP/ARCA ni emite comprobantes legales para los suscriptores.

#### Problema Jurídico
La percepción periódica de ingresos derivados de contratos de software como servicio (SaaS) obliga a la emisión de Facturas Electrónicas "A" (a personas jurídicas o responsables inscriptos) o "B" (a consumidores finales o monotributistas). La omisión sistemática de facturación expone a la titularidad de la plataforma a sanciones materiales, multas de clausura tributaria y reclamos fiscales bajo la Ley N° 11.683.

#### Remediación Técnica (Legal-by-Design)
1. **Captura de Datos Fiscales del Corredor:** Incorporar en el panel de configuración del corredor ([app/panel/perfil](file:///d:/Micaso/app/panel/perfil)) los campos fiscales obligatorios: CUIT/CUIL, Razón Social, Condición frente al IVA y Domicilio Fiscal.
2. **Integración con Facturación Electrónica:** Conectar el webhook de cobro exitoso con una API de facturación (o directamente con el Web Service WSFE de AFIP/ARCA) para emitir el comprobante con CAE de forma automática tras cada pago confirmado.

---

## 4. CRONOGRAMA DE REMEDIACIÓN Y PLAN DE ACCIÓN

```
┌─────────────────────────────────────────────────────────────────────────┐
│ FASE 1: Parches Críticos e Inmediatos (Plazo: 24 - 48 hs)               │
│ - Eliminar falsificación de Referer en /api/image                       │
│ - Reemplazar User-Agents fraudulentos por User-Agent institucional      │
│ - Blindar webhook de Mercado Pago en modo Fail-Closed                   │
│ - Suspender cancelación previa de suscripciones al generar checkout     │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ FASE 2: Privacidad y Trazabilidad de Consentimiento (Plazo: 7 días)     │
│ - Implementar Magic Links temporales en WhatsApp (eliminar ?u=&p=)      │
│ - [✓] Incorporar checkbox Clickwrap obligatorio (Login Familias/Brokers)│
│ - [✓] Sinceramiento legal y purga de blobs legacy (cases y brokers)     │
│ - Automatizar purga definitiva (Hard Delete) de casos archivados        │
│ - Limpiar suscripciones Web Push y fotos huérfanas en Vercel Blob       │
└────────────────────────────────────┬────────────────────────────────────┘
                                     │
                                     ▼
┌─────────────────────────────────────────────────────────────────────────┐
│ FASE 3: Integridad Transaccional y Compliance Fiscal (Plazo: 15-30 días)│
│ - Transacciones atómicas / Optimistic locking en Upstash Redis          │
│ - Rate limiter saliente (1 req/s) para OpenStreetMap / Nominatim        │
│ - Backups automatizados cifrados fuera de sitio con RPO < 24 hs         │
│ - Circuito de facturación electrónica vinculada a cobros de Mercado Pago│
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 5. CONCLUSIÓN DEL DICTAMEN

El proyecto **Micaso** cuenta con bases arquitectónicas modernas y sólidas en el App Router de Next.js. Sin embargo, para operar comercialmente en el mercado inmobiliario B2B2C sin contingencias de responsabilidad civil patrimonial, sanciones regulatorias de la AAIP ni conflictos de propiedad intelectual con terceros, **resulta imperativo adecuar los flujos de código a los principios de Legal-by-Design expuestos en este informe**.

La ejecución de las tres fases del plan de acción brindará cobertura y blindaje jurídico completo a la empresa y a sus usuarios, posicionando a Micaso como una plataforma transparente, segura y conforme a las mejores prácticas internacionales de compliance tecnológico.
