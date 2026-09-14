import { DEV_BROKER_ID } from "./auth";
import { dbGet, dbSet } from "./db";
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
  const key = brokerCasesKey(brokerId);
  const ids = (await dbGet<string[]>(key)) ?? [];
  if (!ids.includes(caseId)) {
    await dbSet(key, [caseId, ...ids]);
  }
}

/** Se asegura de que el caso demo (la búsqueda real de Lucas y Abril,
 * migrada desde D:\Casa) siempre exista, con las mismas credenciales que
 * ya se usaban (usuario "casa", clave "1234") — así nadie queda afuera
 * la primera vez que corre este código nuevo. Ver ARQUITECTURA.md
 * sección 8, "No es solo agregar código". */
async function ensureDemoCase(cases: Record<string, Case>): Promise<Record<string, Case>> {
  if (cases[DEMO_CASE_ID]) return cases;
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
  const next = { ...cases, [DEMO_CASE_ID]: demoCase };
  await dbSet(CASES_KEY, next);
  await addToBrokerIndex(DEV_BROKER_ID, DEMO_CASE_ID);
  return next;
}

async function getAllCases(): Promise<Record<string, Case>> {
  const cases = (await dbGet<Record<string, Case>>(CASES_KEY)) ?? {};
  return ensureDemoCase(cases);
}

export async function createCase(
  brokerId: string,
  titulo: string,
  tipoCaso: TipoCaso
): Promise<Case> {
  const cases = await getAllCases();
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
  await dbSet(CASES_KEY, { ...cases, [kase.id]: kase });
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
  const cases = await getAllCases();
  const current = cases[caseId];
  if (!current) return null;
  const updated: Case = { ...current, ...patch, id: current.id, updatedAt: new Date().toISOString() };
  await dbSet(CASES_KEY, { ...cases, [caseId]: updated });
  return updated;
}

export async function renameCase(caseId: string, titulo: string): Promise<Case | null> {
  return updateCase(caseId, { titulo });
}

export async function regeneratePassword(caseId: string): Promise<Case | null> {
  return updateCase(caseId, { password: randomCode(8) });
}

/** Cierre manual: archiva de inmediato, sin pasar por `solo_lectura` —
 * el corredor ya confirmó que el caso terminó, no hay nada que esperar
 * (a diferencia del impago, que sí espera 90 días de gracia). Ver
 * ARQUITECTURA.md sección 9. */
export async function closeCase(caseId: string): Promise<Case | null> {
  return updateCase(caseId, { estado: "archivado" });
}
