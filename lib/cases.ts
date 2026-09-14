import { DEV_BROKER_ID } from "./auth";
import { dbGet, dbUpdate } from "./db";
import { DEMO_CASE_ID } from "./seed";
import { Case, TipoCaso } from "./types";

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
      createdAt: now,
      updatedAt: now,
    };
    return { ...cases, [DEMO_CASE_ID]: demoCase };
  });
  if (createdDemo) await addToBrokerIndex(DEV_BROKER_ID, DEMO_CASE_ID);
  return cases;
}

export async function createCase(
  brokerId: string,
  titulo: string,
  tipoCaso: TipoCaso
): Promise<Case> {
  const now = new Date().toISOString();
  const kase: Case = {
    id: crypto.randomUUID(),
    brokerId,
    titulo,
    tipoCaso,
    estado: "activo",
    username: randomCode(6).toLowerCase(),
    password: randomCode(8),
    people: [],
    createdAt: now,
    updatedAt: now,
  };
  await dbUpdate<Record<string, Case>>(CASES_KEY, (current) => ({ ...(current ?? {}), [kase.id]: kase }));
  await addToBrokerIndex(brokerId, kase.id);
  return kase;
}

export async function listCasesForBroker(brokerId: string): Promise<Case[]> {
  const [cases, ids] = await Promise.all([getAllCases(), dbGet<string[]>(brokerCasesKey(brokerId))]);
  return (ids ?? [])
    .map((id) => cases[id])
    .filter((c): c is Case => Boolean(c))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));
}

export async function getCase(caseId: string): Promise<Case | null> {
  const cases = await getAllCases();
  return cases[caseId] ?? null;
}

export async function getCaseByCredentials(username: string, password: string): Promise<Case | null> {
  const cases = await getAllCases();
  return Object.values(cases).find((c) => c.username === username && c.password === password) ?? null;
}

async function updateCase(caseId: string, patch: Partial<Case>): Promise<Case | null> {
  // Se asegura de que el índice ya exista (y el caso demo esté creado)
  // antes de la escritura atómica — updateCase no puede inventar un caso
  // que nunca existió, solo modificar uno ya presente.
  await getAllCases();
  const result = await dbUpdate<Record<string, Case>>(CASES_KEY, (current) => {
    const cases = current ?? {};
    const existing = cases[caseId];
    if (!existing) return cases;
    const updated: Case = { ...existing, ...patch, id: existing.id, updatedAt: new Date().toISOString() };
    return { ...cases, [caseId]: updated };
  });
  return result[caseId] ?? null;
}

export async function renameCase(caseId: string, titulo: string): Promise<Case | null> {
  return updateCase(caseId, { titulo });
}

/** Editable desde adentro del caso (no desde el panel del corredor) —
 * la familia es quien sabe sus propios nombres. Sin duplicados ni
 * strings vacíos. */
export async function updatePeople(caseId: string, people: string[]): Promise<Case | null> {
  const cleaned = Array.from(new Set(people.map((p) => p.trim()).filter(Boolean)));
  return updateCase(caseId, { people: cleaned });
}

export async function regeneratePassword(caseId: string): Promise<Case | null> {
  return updateCase(caseId, { password: randomCode(8) });
}

/** Cierre manual: pasa a `solo_lectura`, no directo a `archivado` — la
 * familia conserva su historial (puede seguir viéndolo, no seguir
 * cargando), y deja de contar contra el tope de casos activos del plan.
 * Mismo criterio que el impago (que sí espera 90 días de gracia antes
 * de archivar). Ver ARQUITECTURA.md sección 6, "Ciclo de vida de un
 * caso". El bloqueo de escritura en solo_lectura vive en proxy.ts. */
export async function closeCase(caseId: string): Promise<Case | null> {
  return updateCase(caseId, { estado: "solo_lectura" });
}
