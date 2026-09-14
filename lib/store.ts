import { dbGet, dbSet } from "./db";
import { SEED_CHECKLIST, SEED_CRITERIA, SEED_HOUSES } from "./seed";
import { ChecklistItem, Criteria, House, HouseChecklistItem, HouseComment, HouseStatus, PIPELINE_STATUSES } from "./types";

const HOUSES_KEY = "houses";
const CHECKLIST_KEY = "checklist";
const CRITERIA_KEY = "criteria";

const VALID_STATUSES = new Set<string>([...PIPELINE_STATUSES, "borrada"]);

/** Drop fields with the wrong shape instead of persisting them — a
 * malformed `status` or non-array `comments` would otherwise silently
 * break every `Record<HouseStatus,_>` lookup or `.comments.length`
 * read for that house from then on. */
function sanitizeHousePatch(patch: Partial<House>): Partial<House> {
  const safe = { ...patch };
  if ("status" in safe && !VALID_STATUSES.has(safe.status as string)) {
    delete safe.status;
  }
  if ("comments" in safe && !Array.isArray(safe.comments)) {
    delete safe.comments;
  }
  if ("images" in safe && !Array.isArray(safe.images)) {
    delete safe.images;
  }
  if ("checklist" in safe && !Array.isArray(safe.checklist)) {
    delete safe.checklist;
  }
  return safe;
}

const NEW_FIELD_DEFAULTS = {
  superficieM2: null,
  contactoNombre: null,
  contactoTelefono: null,
  proximaAccion: null,
  proximaAccionFecha: null,
  visitaFecha: null,
  visitReview: null,
  checklist: [] as HouseChecklistItem[],
} as const;

/** Backfills fields added after a house was first stored, so older
 * records don't come back with keys silently missing:
 * - Older stored houses have a single `notes: string` instead of
 *   `comments` — fold that into one comment.
 * - Fase-1 fields (superficie, contacto, próxima acción, visita) may
 *   not exist at all on records written before they were added.
 * - Older stored houses have a single `image: string | null` instead
 *   of `images: string[]` — wrap it into a one-element array. */
function normalizeHouse(house: House & { notes?: string; image?: string | null }): House {
  const needsCommentsMigration = !Array.isArray(house.comments);
  const legacyNotes = needsCommentsMigration && typeof house.notes === "string" ? house.notes.trim() : "";
  const needsImageMigration = !Array.isArray(house.images);
  return {
    ...NEW_FIELD_DEFAULTS,
    ...house,
    comments: needsCommentsMigration
      ? legacyNotes
        ? [{ id: crypto.randomUUID(), author: house.addedBy, text: legacyNotes, createdAt: house.addedAt }]
        : []
      : house.comments,
    images: needsImageMigration ? (house.image ? [house.image] : []) : house.images,
  };
}

export async function getHouses(): Promise<House[]> {
  const houses = await dbGet<House[]>(HOUSES_KEY);
  if (houses === null) {
    await dbSet(HOUSES_KEY, SEED_HOUSES);
    return SEED_HOUSES;
  }
  return houses.map(normalizeHouse);
}

export async function saveHouses(houses: House[]): Promise<void> {
  await dbSet(HOUSES_KEY, houses);
}

export async function addHouse(
  input: Pick<House, "url" | "addedBy"> & Partial<House>
): Promise<House> {
  const houses = await getHouses();
  const now = new Date().toISOString();
  const house: House = {
    id: crypto.randomUUID(),
    url: input.url,
    title: input.title || input.url,
    source: input.source || guessSource(input.url),
    priceUsd: input.priceUsd ?? null,
    zone: input.zone ?? null,
    ambientes: input.ambientes ?? null,
    dormitorios: input.dormitorios ?? null,
    cochera: input.cochera ?? null,
    superficieM2: input.superficieM2 ?? null,
    images: input.images ?? [],
    comments: input.comments ?? [],
    checklist: input.checklist ?? [],
    status: input.status ?? "pendiente",
    highlighted: input.highlighted ?? false,
    contactoNombre: input.contactoNombre ?? null,
    contactoTelefono: input.contactoTelefono ?? null,
    proximaAccion: input.proximaAccion ?? null,
    proximaAccionFecha: input.proximaAccionFecha ?? null,
    visitaFecha: input.visitaFecha ?? null,
    visitReview: input.visitReview ?? null,
    addedBy: input.addedBy,
    addedAt: input.addedAt ?? now,
    updatedAt: now,
  };
  await saveHouses([house, ...houses]);
  return house;
}

export async function updateHouse(
  id: string,
  patch: Partial<House>
): Promise<House | null> {
  const houses = await getHouses();
  const safePatch = sanitizeHousePatch(patch);
  let updated: House | null = null;
  const next = houses.map((house) => {
    if (house.id !== id) return house;
    updated = { ...house, ...safePatch, id: house.id, updatedAt: new Date().toISOString() };
    return updated;
  });
  if (!updated) return null;
  await saveHouses(next);
  return updated;
}

export async function addComment(
  houseId: string,
  author: string,
  text: string
): Promise<House | null> {
  const houses = await getHouses();
  const comment: HouseComment = {
    id: crypto.randomUUID(),
    author,
    text,
    createdAt: new Date().toISOString(),
  };
  let updated: House | null = null;
  const next = houses.map((house) => {
    if (house.id !== houseId) return house;
    updated = { ...house, comments: [...house.comments, comment], updatedAt: comment.createdAt };
    return updated;
  });
  if (!updated) return null;
  await saveHouses(next);
  return updated;
}

export async function addHouseChecklistItem(
  houseId: string,
  text: string
): Promise<House | null> {
  const houses = await getHouses();
  const item: HouseChecklistItem = { id: crypto.randomUUID(), text, done: false };
  let updated: House | null = null;
  const next = houses.map((house) => {
    if (house.id !== houseId) return house;
    updated = { ...house, checklist: [...house.checklist, item], updatedAt: new Date().toISOString() };
    return updated;
  });
  if (!updated) return null;
  await saveHouses(next);
  return updated;
}

export async function updateHouseChecklistItem(
  houseId: string,
  itemId: string,
  patch: Partial<HouseChecklistItem>
): Promise<House | null> {
  const houses = await getHouses();
  let updated: House | null = null;
  const next = houses.map((house) => {
    if (house.id !== houseId) return house;
    updated = {
      ...house,
      checklist: house.checklist.map((item) => (item.id === itemId ? { ...item, ...patch, id: item.id } : item)),
      updatedAt: new Date().toISOString(),
    };
    return updated;
  });
  if (!updated) return null;
  await saveHouses(next);
  return updated;
}

export async function deleteHouseChecklistItem(
  houseId: string,
  itemId: string
): Promise<House | null> {
  const houses = await getHouses();
  let updated: House | null = null;
  const next = houses.map((house) => {
    if (house.id !== houseId) return house;
    updated = {
      ...house,
      checklist: house.checklist.filter((item) => item.id !== itemId),
      updatedAt: new Date().toISOString(),
    };
    return updated;
  });
  if (!updated) return null;
  await saveHouses(next);
  return updated;
}

export async function deleteHouse(id: string): Promise<void> {
  const houses = await getHouses();
  await saveHouses(houses.filter((house) => house.id !== id));
}

export function guessSource(url: string): string {
  try {
    const host = new URL(url).hostname;
    if (host.includes("mercadolibre")) return "MercadoLibre";
    if (host.includes("zonaprop")) return "ZonaProp";
    if (host.includes("argenprop")) return "ArgenProp";
    if (host.includes("remax")) return "RE/MAX";
    if (host.includes("mudafy")) return "Mudafy";
    return "Otro";
  } catch {
    return "Otro";
  }
}

export function countByStatus(houses: House[]): Record<HouseStatus, number> {
  const counts = {} as Record<HouseStatus, number>;
  for (const status of [...PIPELINE_STATUSES, "borrada" as const]) {
    counts[status] = houses.filter((h) => h.status === status).length;
  }
  return counts;
}

export async function getChecklist(): Promise<ChecklistItem[]> {
  const items = await dbGet<ChecklistItem[]>(CHECKLIST_KEY);
  if (items === null) {
    await dbSet(CHECKLIST_KEY, SEED_CHECKLIST);
    return SEED_CHECKLIST;
  }
  return items;
}

export async function updateChecklistItem(
  id: string,
  patch: Partial<ChecklistItem>
): Promise<ChecklistItem | null> {
  const items = await getChecklist();
  let updated: ChecklistItem | null = null;
  const next = items.map((item) => {
    if (item.id !== id) return item;
    updated = { ...item, ...patch, id: item.id };
    return updated;
  });
  if (!updated) return null;
  await dbSet(CHECKLIST_KEY, next);
  return updated;
}

export async function getCriteria(): Promise<Criteria> {
  const criteria = await dbGet<Criteria>(CRITERIA_KEY);
  if (criteria === null) {
    await dbSet(CRITERIA_KEY, SEED_CRITERIA);
    return SEED_CRITERIA;
  }
  return criteria;
}

export async function saveCriteria(criteria: Criteria): Promise<void> {
  await dbSet(CRITERIA_KEY, criteria);
}
