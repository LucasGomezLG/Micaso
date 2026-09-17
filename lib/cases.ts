import { DEV_BROKER_ID } from "./auth";
import { getBroker } from "./brokers";
import { decryptSecret, encryptSecret, timingSafeStringEqual } from "./crypto";
import { dbDelete, dbGet, dbUpdate } from "./db";
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

const CASES_KEY = "cases";
const brokerCasesKey = (brokerId: string) => `broker:${brokerId}:cases`;

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

/** Se asegura de que el caso demo (la búsqueda real de Lucas y Abril,
 * migrada desde D:\Casa) siempre exista, con las mismas credenciales que
 * ya se usaban (usuario "casa", clave "1234") — así nadie queda afuera
 * la primera vez que corre este código nuevo. Ver ARQUITECTURA.md
 * sección 8, "No es solo agregar código". El chequeo y la creación
 * pasan por dbUpdate para que no compita con otra escritura concurrente
 * a la misma clave "cases" (ver lib/db.ts). */
async function getAllCases(): Promise<Record<string, Case>> {
  let createdDemo = false;
  const cases = await dbUpdate<Record<string, Case>>(CASES_KEY, (current) => {
    const cases = current ?? {};
    if (cases[DEMO_CASE_ID]) return cases;
    createdDemo = true;
    const now = new Date().toISOString();
    const demoCase: Case = {
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
    return { ...cases, [DEMO_CASE_ID]: demoCase };
  });
  if (createdDemo) await addToBrokerIndex(DEV_BROKER_ID, DEMO_CASE_ID);
  return cases;
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
  const kase: Case = {
    id: crypto.randomUUID(),
    brokerId,
    titulo,
    tipoCaso,
    estado: "activo",
    username: randomCode(6).toLowerCase(),
    password: encryptSecret(plainPassword),
    people: cleanedPeople,
    soloLecturaDesde: null,
    brokerLastSeenAt: now,
    createdAt: now,
    updatedAt: now,
  };
  await dbUpdate<Record<string, Case>>(CASES_KEY, (current) => ({ ...(current ?? {}), [kase.id]: kase }));
  await addToBrokerIndex(brokerId, kase.id);
  return { ...kase, password: plainPassword };
}

export async function listCasesForBroker(brokerId: string): Promise<Case[]> {
  const [cases, ids] = await Promise.all([getAllCases(), dbGet<string[]>(brokerCasesKey(brokerId))]);
  return (ids ?? [])
    .map((id) => cases[id])
    .filter((c): c is Case => Boolean(c))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .map(decryptCase);
}

export async function getCase(caseId: string): Promise<Case | null> {
  const cases = await getAllCases();
  // hasOwnProperty en vez de cases[caseId]: caseId ahora también llega
  // directo desde path params de rutas de superadmin (ver
  // app/api/superadmin/cases/[id]/*) — con caseId === "__proto__" el
  // acceso por corchetes devuelve Object.prototype heredado, no undefined.
  const kase = Object.prototype.hasOwnProperty.call(cases, caseId) ? cases[caseId] : null;
  return kase ? decryptCase(kase) : null;
}

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
  const cases = await getAllCases();
  return Object.values(cases);
}

/** Compara la contraseña ingresada contra la del caso encontrado por
 * username, ya desencriptada, con `timingSafeStringEqual` (ver
 * lib/crypto.ts) en vez de `===` — evita filtrar por cuánto tarda la
 * respuesta si el ingresado coincide con el principio de la clave real. */
export async function getCaseByCredentials(username: string, password: string): Promise<Case | null> {
  const cases = await getAllCases();
  const candidate = Object.values(cases).find((c) => c.username === username);
  if (!candidate) return null;
  const storedPassword = decryptSecret(candidate.password);
  if (!timingSafeStringEqual(storedPassword, password)) return null;
  return { ...candidate, password: storedPassword };
}

async function updateCase(caseId: string, patch: Partial<Case>): Promise<Case | null> {
  // Se asegura de que el índice ya exista (y el caso demo esté creado)
  // antes de la escritura atómica — updateCase no puede inventar un caso
  // que nunca existió, solo modificar uno ya presente.
  await getAllCases();
  const result = await dbUpdate<Record<string, Case>>(CASES_KEY, (current) => {
    const cases = current ?? {};
    // hasOwnProperty, no cases[caseId]: con caseId === "__proto__" el
    // acceso por corchetes devuelve el Object.prototype heredado (un
    // objeto "truthy") en vez de undefined, y este mutador terminaría
    // creando/pisando un caso fantasma bajo esa clave.
    if (!Object.prototype.hasOwnProperty.call(cases, caseId)) return cases;
    const existing = cases[caseId];
    const updated: Case = { ...existing, ...patch, id: existing.id, updatedAt: new Date().toISOString() };
    return { ...cases, [caseId]: updated };
  });
  return Object.prototype.hasOwnProperty.call(result, caseId) ? result[caseId] : null;
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
 * cambia el estado a solo_lectura), esto saca al caso de "cases" y del
 * índice del corredor. Pensado para limpiar casos de prueba desde
 * /superadmin (ver app/api/superadmin/cases/[id]/route.ts, DELETE).
 * Irreversible a propósito, no hay soft-delete. No borra las casas,
 * checklist ni criterios del caso — eso vive en lib/store.ts
 * (deleteCaseData), el caller llama a las dos. */
export async function deleteCase(caseId: string, brokerId: string): Promise<boolean> {
  const kase = await getCaseForBroker(caseId, brokerId);
  if (!kase) return false;
  await dbUpdate<Record<string, Case>>(CASES_KEY, (current) => {
    const cases = current ?? {};
    if (!Object.prototype.hasOwnProperty.call(cases, caseId)) return cases;
    const next = { ...cases };
    delete next[caseId];
    return next;
  });
  await dbUpdate<string[]>(brokerCasesKey(brokerId), (current) => (current ?? []).filter((id) => id !== caseId));
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

/** Archiva los casos que llevan más de 90 días en solo_lectura (cierre
 * manual o, más adelante, impago) — pensado para correr una vez por día
 * desde app/api/cron/archive-stale-cases/route.ts (Vercel Cron). Una
 * sola escritura atómica sobre "cases" para no competir con otra
 * mutación concurrente. Devuelve los IDs que efectivamente archivó. */
export async function archiveStaleReadOnlyCases(): Promise<string[]> {
  const cutoff = Date.now() - GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000;
  const archived: string[] = [];
  await dbUpdate<Record<string, Case>>(CASES_KEY, (current) => {
    const cases = current ?? {};
    const next = { ...cases };
    for (const kase of Object.values(cases)) {
      if (kase.estado !== "solo_lectura" || !kase.soloLecturaDesde) continue;
      if (new Date(kase.soloLecturaDesde).getTime() > cutoff) continue;
      archived.push(kase.id);
      next[kase.id] = { ...kase, estado: "archivado", updatedAt: new Date().toISOString() };
    }
    return next;
  });
  return archived;
}
