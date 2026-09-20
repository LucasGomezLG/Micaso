import { cache } from "react";
import { DEV_BROKER_ID } from "./auth";
import { getBroker, listAllBrokers } from "./brokers";
import { decryptSecret, encryptSecret, timingSafeStringEqual } from "./crypto";
import { dbDelete, dbGet, dbMultiGet, dbSet, dbUpdate } from "./db";
import { DEMO_CASE_ID } from "./seed";
import { Case, PLAN_CASE_LIMIT, TipoCaso } from "./types";

/** La base guarda `Case.password` encriptada (ver lib/crypto.ts) — esto
 * la vuelve a texto plano para cualquier caller fuera de este archivo
 * (panel del corredor, super-admin, login de caso). Los mutadores
 * internos (`updateCase`) nunca pasan por acá: leen y escriben directo
 * contra el valor crudo de la base, así que un cierre/reapertura/cambio
 * de título no vuelve a pisar la contraseña con texto plano. */
function decryptCase(kase: Case): Case {
  return { ...kase, password: decryptSecret(kase.password) };
}

// Esquema de claves (migración ARC-01/DAT-01, sept 2026): antes "cases"
// era un único blob JSON con todos los casos de todos los corredores —
// cada lectura/escritura de un caso puntual descargaba y volvía a
// guardar el JSON de toda la plataforma, y dos escrituras concurrentes a
// casos distintos competían por la misma clave (ver ARQUITECTURA.md,
// adenda de esta migración). Ahora cada caso vive en su propia clave,
// mismo patrón que ya usan houses/checklist/criteria por caso
// (lib/store.ts) y payments por corredor (lib/brokers.ts).
const caseKey = (caseId: string) => `case:${caseId}:meta`;
const brokerCasesKey = (brokerId: string) => `broker:${brokerId}:cases`;
const ALL_CASE_IDS_KEY = "all_case_ids";
const caseUsernameKey = (username: string) => `case_username:${username}`;

// Sin caracteres ambiguos (0/O, 1/I/l) — se lee y se tipea a mano al
// compartir por WhatsApp.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCode(length: number): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return out;
}

async function addToBrokerIndex(brokerId: string, caseId: string): Promise<void> {
  await dbUpdate<string[]>(brokerCasesKey(brokerId), (current) => {
    const ids = current ?? [];
    return ids.includes(caseId) ? ids : [caseId, ...ids];
  });
}

async function addToAllCaseIds(caseId: string): Promise<void> {
  await dbUpdate<string[]>(ALL_CASE_IDS_KEY, (current) => {
    const ids = current ?? [];
    return ids.includes(caseId) ? ids : [caseId, ...ids];
  });
}

async function removeFromAllCaseIds(caseId: string): Promise<void> {
  await dbUpdate<string[]>(ALL_CASE_IDS_KEY, (current) => (current ?? []).filter((id) => id !== caseId));
}

/** Se asegura de que el caso demo (la búsqueda real de Lucas y Abril,
 * migrada desde D:\Casa) siempre exista, con las mismas credenciales que
 * ya se usaban (usuario "casa", clave "1234") — así nadie queda afuera
 * la primera vez que corre este código nuevo. Ver ARQUITECTURA.md
 * sección 8, "No es solo agregar código". El chequeo y la creación pasan
 * por dbUpdate para que no compita con otra escritura concurrente a la
 * misma clave (ver lib/db.ts) — a diferencia de la versión anterior, acá
 * solo compite consigo misma (la clave de ESTE caso), no con la de
 * cualquier otro caso de la plataforma. */
async function ensureDemoCaseSeed(): Promise<Case> {
  let createdDemo = false;
  const kase = await dbUpdate<Case>(caseKey(DEMO_CASE_ID), (current) => {
    if (current) return current;
    createdDemo = true;
    const now = new Date().toISOString();
    return {
      id: DEMO_CASE_ID,
      brokerId: DEV_BROKER_ID,
      titulo: "Lucas y Abril",
      tipoCaso: "compra",
      estado: "activo",
      username: "casa",
      password: "1234",
      people: ["Lucas", "Abril", "Carolina"],
      soloLecturaDesde: null,
      createdAt: now,
      updatedAt: now,
    };
  });
  if (createdDemo) {
    await Promise.all([
      addToBrokerIndex(DEV_BROKER_ID, DEMO_CASE_ID),
      addToAllCaseIds(DEMO_CASE_ID),
      dbSet(caseUsernameKey("casa"), DEMO_CASE_ID),
    ]);
  }
  return kase;
}

/** Tope de casos activos simultáneos del plan (ARQUITECTURA.md sección
 * 6) — createCase lo chequea antes de crear, no proxy.ts ni la ruta, así
 * que cualquier lugar que llegue a crear un caso queda cubierto. Sin
 * corredor (no debería pasar, brokerId siempre viene de una sesión ya
 * autenticada) no bloquea: dejarlo pasar es más seguro que un caso
 * imposible de crear por un dato faltante. */
async function assertUnderCaseLimit(brokerId: string): Promise<void> {
  const broker = await getBroker(brokerId);
  if (!broker) return;

  if (broker.subscriptionStatus === "atrasada") {
    throw new Error("Suscripción atrasada. Por favor, regularizá tu plan para seguir creando casos.");
  }
  if (broker.subscriptionStatus === "cancelada") {
    throw new Error("Tu suscripción fue cancelada. Suscribite a un plan para seguir creando casos.");
  }
  if (broker.subscriptionStatus === "prueba" && new Date() > new Date(broker.trialEndsAt)) {
    throw new Error("Tu período de prueba finalizó. Elegí un plan para seguir creando casos.");
  }

  const limit = PLAN_CASE_LIMIT[broker.plan];
  if (limit === null) return;
  const activos = (await listCasesForBroker(brokerId)).filter((c) => c.estado === "activo").length;
  if (activos >= limit) {
    throw new Error(`Llegaste al tope de ${limit} casos activos de tu plan. Cerrá uno o cambiá de plan para crear otro.`);
  }
}

export async function createCase(
  brokerId: string,
  titulo: string,
  tipoCaso: TipoCaso,
  people: string[] = []
): Promise<Case> {
  await assertUnderCaseLimit(brokerId);
  const now = new Date().toISOString();
  const cleanedPeople = Array.from(new Set(people.map((p) => p.trim()).filter(Boolean)));
  const plainPassword = randomCode(12);
  const username = randomCode(6).toLowerCase();
  const kase: Case = {
    id: crypto.randomUUID(),
    brokerId,
    titulo,
    tipoCaso,
    estado: "activo",
    username,
    password: encryptSecret(plainPassword),
    people: cleanedPeople,
    soloLecturaDesde: null,
    brokerLastSeenAt: now,
    createdAt: now,
    updatedAt: now,
  };
  // Clave nueva — no hay ninguna escritura concurrente posible contra
  // este mismo caseId recién generado, así que dbSet directo alcanza
  // (a diferencia de updateCase, que sí necesita dbUpdate).
  await dbSet(caseKey(kase.id), kase);
  await Promise.all([
    addToBrokerIndex(brokerId, kase.id),
    addToAllCaseIds(kase.id),
    dbSet(caseUsernameKey(username), kase.id),
  ]);
  return { ...kase, password: plainPassword };
}

export async function listCasesForBroker(brokerId: string): Promise<Case[]> {
  const ids = await dbGet<string[]>(brokerCasesKey(brokerId));
  if (!ids || ids.length === 0) return [];
  const cases = await dbMultiGet<Case>(ids.map(caseKey));
  return cases
    .filter((c): c is Case => c !== null)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .map(decryptCase);
}

export const getCase = cache(async function getCase(caseId: string): Promise<Case | null> {
  const kase = await dbGet<Case>(caseKey(caseId));
  if (kase) return decryptCase(kase);
  // Único caso con sembrado perezoso — cualquier otro caseId inexistente
  // simplemente no existe.
  if (caseId === DEMO_CASE_ID) return decryptCase(await ensureDemoCaseSeed());
  return null;
});

/** Único punto donde se verifica que un caso pertenezca a un corredor
 * dado — usado tanto por las rutas del panel (para el 404 si no es
 * suyo) como, ahora, por los mutadores de abajo (renameCase, closeCase,
 * reopenCase, regeneratePassword), para que ese chequeo no dependa de
 * que cada ruta nueva se acuerde de repetirlo. Ver ARQUITECTURA.md
 * sección 9, "mejora de hardening" sobre este mismo punto. */
export async function getCaseForBroker(caseId: string, brokerId: string): Promise<Case | null> {
  const kase = await getCase(caseId);
  return kase && kase.brokerId === brokerId ? kase : null;
}

/** Todos los casos de todos los corredores — usado por el backup
 * completo de /superadmin (ver lib/backup.ts), no por ninguna pantalla
 * de corredor (esos siempre pasan por listCasesForBroker). A propósito
 * NO desencripta `password` (a diferencia del resto de las funciones de
 * este archivo) — el backup es exactamente el escenario que la
 * encriptación defiende (ver lib/crypto.ts y ARQUITECTURA.md sección 9):
 * si el JSON descargado se filtra, lo que queda expuesto es texto
 * cifrado, no la contraseña real de cada caso. */
export async function listAllCases(): Promise<Case[]> {
  const ids = await dbGet<string[]>(ALL_CASE_IDS_KEY);
  if (!ids || ids.length === 0) return [];
  const cases = await dbMultiGet<Case>(ids.map(caseKey));
  return cases.filter((c): c is Case => c !== null);
}

/** Compara la contraseña ingresada contra la del caso encontrado por
 * username, ya desencriptada, con `timingSafeStringEqual` (ver
 * lib/crypto.ts) en vez de `===` — evita filtrar por cuánto tarda la
 * respuesta si el ingresado coincide con el principio de la clave real.
 * `case_username:{username}` es un lookup directo (antes era un scan
 * lineal de todos los casos de todos los corredores). */
export async function getCaseByCredentials(username: string, password: string): Promise<Case | null> {
  // Garantiza que el login del caso demo funcione en un deploy nuevo sin
  // haber pasado antes por getCase — mismo motivo que el chequeo de
  // updateCase de abajo.
  await ensureDemoCaseSeed();
  const caseId = await dbGet<string>(caseUsernameKey(username));
  if (!caseId) return null;
  const candidate = await dbGet<Case>(caseKey(caseId));
  if (!candidate) return null;
  const storedPassword = decryptSecret(candidate.password);
  if (!timingSafeStringEqual(storedPassword, password)) return null;
  return { ...candidate, password: storedPassword };
}

async function updateCase(caseId: string, patch: Partial<Case>): Promise<Case | null> {
  // Solo importa para el caso demo — cualquier otro caseId que no exista
  // simplemente no se actualiza (dbUpdate abajo devuelve null y listo).
  if (caseId === DEMO_CASE_ID) await ensureDemoCaseSeed();
  return dbUpdate<Case | null>(caseKey(caseId), (current) =>
    current === null ? null : { ...current, ...patch, id: current.id, updatedAt: new Date().toISOString() }
  );
}

export async function renameCase(caseId: string, brokerId: string, titulo: string): Promise<Case | null> {
  const kase = await getCaseForBroker(caseId, brokerId);
  if (!kase) return null;
  const updated = await updateCase(caseId, { titulo });
  return updated ? decryptCase(updated) : null;
}

/** Marca el caso como visto por el corredor — actualiza `brokerLastSeenAt`
 * para apagar el badge de novedades en el panel hasta que la familia
 * vuelva a realizar acciones. */
export async function markCaseSeenByBroker(caseId: string, brokerId?: string): Promise<Case | null> {
  if (brokerId) {
    const kase = await getCaseForBroker(caseId, brokerId);
    if (!kase) return null;
  }
  const now = new Date().toISOString();
  const updated = await updateCase(caseId, { brokerLastSeenAt: now });
  return updated ? decryptCase(updated) : null;
}

/** Marca el caso como visitado por la familia — actualiza `familyLastSeenAt`.
 * Llamado desde un endpoint silencioso (ping) en el layout del caso. */
export async function markCaseSeenByFamily(caseId: string): Promise<Case | null> {
  const now = new Date().toISOString();
  const updated = await updateCase(caseId, { familyLastSeenAt: now });
  return updated ? decryptCase(updated) : null;
}

/** Registra la primera vez que alguien de la familia aceptó el
 * clickwrap de Términos/Privacidad vigente — hasta ahora el checkbox de
 * LoginForm.tsx no dejaba ningún rastro server-side, así que no probaba
 * nada ante nadie (CON-06). No pisa una aceptación ya registrada para
 * la misma versión: la fecha del primer "acepto" es la que importa
 * legalmente, no la de cada login posterior. Si `version` cambia (se
 * republicó /terminos o /privacidad), sí vuelve a quedar registrada. */
export async function recordTermsAcceptance(caseId: string, version: string): Promise<Case | null> {
  const kase = await getCase(caseId);
  if (!kase || kase.terminos?.version === version) return kase;
  const updated = await updateCase(caseId, { terminos: { version, aceptadoEn: new Date().toISOString() } });
  return updated ? decryptCase(updated) : null;
}

/** Editable desde adentro del caso (no desde el panel del corredor) —
 * la familia es quien sabe sus propios nombres. Sin duplicados ni
 * strings vacíos. */
export async function updatePeople(caseId: string, people: string[]): Promise<Case | null> {
  const cleaned = Array.from(new Set(people.map((p) => p.trim()).filter(Boolean)));
  const updated = await updateCase(caseId, { people: cleaned });
  return updated ? decryptCase(updated) : null;
}

export async function regeneratePassword(caseId: string, brokerId: string): Promise<Case | null> {
  const kase = await getCaseForBroker(caseId, brokerId);
  if (!kase) return null;
  const plainPassword = randomCode(12);
  const updated = await updateCase(caseId, { password: encryptSecret(plainPassword) });
  return updated ? { ...updated, password: plainPassword } : null;
}

/** Cierre manual: pasa a `solo_lectura`, no directo a `archivado` — la
 * familia conserva su historial (puede seguir viéndolo, no seguir
 * cargando), y deja de contar contra el tope de casos activos del plan.
 * Mismo criterio que el impago (que también pasa por acá, cuando exista
 * — ambos caminos comparten los 90 días de gracia antes de archivar).
 * Ver ARQUITECTURA.md sección 6 y 9. El bloqueo de escritura en
 * solo_lectura vive en proxy.ts; el archivado a los 90 días vive en
 * archiveStaleReadOnlyCases() (ver abajo), llamado por el cron. */
export async function closeCase(caseId: string, brokerId: string): Promise<Case | null> {
  const kase = await getCaseForBroker(caseId, brokerId);
  if (!kase) return null;
  const updated = await updateCase(caseId, { estado: "solo_lectura", soloLecturaDesde: new Date().toISOString() });
  return updated ? decryptCase(updated) : null;
}

/** Vuelve un caso de `solo_lectura` a `activo` — no aplica a `archivado`
 * (ese estado depende del cobro, ver comentario de CaseEstado en
 * lib/types.ts, no de un botón en el panel). Un caso reabierto vuelve a
 * contar contra el tope de casos activos del plan, por eso repite el
 * mismo chequeo que createCase(). */
export async function reopenCase(caseId: string, brokerId: string): Promise<Case | null> {
  const kase = await getCaseForBroker(caseId, brokerId);
  if (!kase) return null;
  await assertUnderCaseLimit(kase.brokerId);
  const updated = await updateCase(caseId, { estado: "activo", soloLecturaDesde: null });
  return updated ? decryptCase(updated) : null;
}

/** Borrado definitivo de un caso — a diferencia de closeCase (que solo
 * cambia el estado a solo_lectura), esto borra la clave del caso y lo
 * saca de todos sus índices (el del corredor, el global de todos los
 * casos, y el de login por username). Pensado para limpiar casos de
 * prueba desde /superadmin, y ahora también desde el panel del corredor
 * una vez cerrado (ver app/api/panel/cases/[id]/route.ts). Irreversible
 * a propósito, no hay soft-delete. No borra las casas, checklist ni
 * criterios del caso — eso vive en lib/store.ts (deleteCaseData), el
 * caller llama a las dos. */
export async function deleteCase(caseId: string, brokerId: string): Promise<boolean> {
  const kase = await getCaseForBroker(caseId, brokerId);
  if (!kase) return false;
  await dbDelete(caseKey(caseId));
  await Promise.all([
    dbUpdate<string[]>(brokerCasesKey(brokerId), (current) => (current ?? []).filter((id) => id !== caseId)),
    removeFromAllCaseIds(caseId),
    dbDelete(caseUsernameKey(kase.username)),
  ]);
  return true;
}

/** Borra el índice de casos de un corredor (queda vacío una vez que
 * deleteCase() sacó todos sus casos uno por uno) — llamado junto con
 * deleteBroker() para no dejar una clave `broker:{id}:cases: []`
 * huérfana en la base. */
export async function deleteBrokerCaseIndex(brokerId: string): Promise<void> {
  await dbDelete(brokerCasesKey(brokerId));
}

const GRACE_PERIOD_DAYS = 90;

/** "atrasada (falló un cobro o venció la prueba) tiene el mismo trato
 * que solo_lectura" — ARQUITECTURA.md sección 7. Hasta ahora esto no
 * estaba conectado: assertUnderCaseLimit solo lo chequeaba al crear o
 * reabrir un caso, así que un corredor con la prueba vencida o la
 * suscripción cancelada podía seguir usando de por vida los casos que ya
 * tenía activos (no se le negaba el acceso en ningún otro punto). Pasa
 * los casos activos de esos corredores a solo_lectura, igual que un
 * cierre manual — comparten el mismo camino y los mismos 90 días de
 * gracia antes de archivarse (ver archiveStaleReadOnlyCases). Pensado
 * para correr desde el cron diario (igual que el archivado) y también
 * apenas el webhook de Mercado Pago marca a un corredor puntual como
 * atrasado/cancelado, para no esperar hasta el próximo cron.
 *
 * Con un `brokerId` puntual (el caso común, disparado por el webhook)
 * solo toca el índice de ESE corredor — nunca descarga ni recorre casos
 * de nadie más. Sin `brokerId` (el cron diario, que tiene que revisar a
 * todos) recorre los corredores inactivos uno por uno; el costo sigue
 * siendo proporcional a cuántos corredores/casos hay que bajar, no al
 * tamaño total de la plataforma. */
export async function downgradeCasesForInactiveBrokers(brokerId?: string): Promise<string[]> {
  const brokers = brokerId ? [await getBroker(brokerId)].filter((b): b is NonNullable<typeof b> => b !== null) : await listAllBrokers();
  const inactiveBrokerIds = brokers
    .filter(
      (b) =>
        b.subscriptionStatus === "atrasada" ||
        b.subscriptionStatus === "cancelada" ||
        (b.subscriptionStatus === "prueba" && new Date() > new Date(b.trialEndsAt))
    )
    .map((b) => b.id);
  if (inactiveBrokerIds.length === 0) return [];

  const downgraded: string[] = [];
  for (const inactiveBrokerId of inactiveBrokerIds) {
    const ids = await dbGet<string[]>(brokerCasesKey(inactiveBrokerId));
    if (!ids || ids.length === 0) continue;
    const cases = await dbMultiGet<Case>(ids.map(caseKey));
    for (const kase of cases) {
      if (!kase || kase.estado !== "activo") continue;
      await updateCase(kase.id, { estado: "solo_lectura", soloLecturaDesde: new Date().toISOString() });
      downgraded.push(kase.id);
    }
  }
  return downgraded;
}

/** Archiva los casos que llevan más de 90 días en solo_lectura (cierre
 * manual o, más adelante, impago) — pensado para correr una vez por día
 * desde app/api/cron/archive-stale-cases/route.ts (Vercel Cron). Recorre
 * `all_case_ids` en vez de un blob único, resolviendo los casos de a
 * lote con dbMultiGet en lugar de descargar todo en una sola respuesta
 * gigante — este es el único recorrido que sí necesita mirar todos los
 * casos de la plataforma (es un barrido por criterio, no por corredor
 * puntual), pero ya no paga el costo de traer y volver a guardar un JSON
 * enorme para hacerlo. Devuelve los IDs que efectivamente archivó. */
export async function archiveStaleReadOnlyCases(): Promise<string[]> {
  const cutoff = Date.now() - GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000;
  const ids = await dbGet<string[]>(ALL_CASE_IDS_KEY);
  if (!ids || ids.length === 0) return [];
  const cases = await dbMultiGet<Case>(ids.map(caseKey));
  const archived: string[] = [];
  for (const kase of cases) {
    if (!kase) continue;
    if (kase.estado !== "solo_lectura" || !kase.soloLecturaDesde) continue;
    if (new Date(kase.soloLecturaDesde).getTime() > cutoff) continue;
    await updateCase(kase.id, { estado: "archivado" });
    archived.push(kase.id);
  }
  return archived;
}
