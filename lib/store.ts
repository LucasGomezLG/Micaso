import { dbGet, dbSet, dbUpdate } from "./db";
import { DEMO_CASE_ID, SEED_CHECKLIST, SEED_CRITERIA, SEED_HOUSES } from "./seed";
import { buildChecklistTemplate } from "./checklistTemplates";
import { getCase } from "./cases";
import { ChecklistItem, Criteria, House, HouseChecklistItem, HouseComment, HouseStatus, LoanInfo, PIPELINE_STATUSES, SearchBrief } from "./types";

const housesKey = (caseId: string) => `case:${caseId}:houses`;
const checklistKey = (caseId: string) => `case:${caseId}:checklist`;
const criteriaKey = (caseId: string) => `case:${caseId}:criteria`;

/** Un caso nuevo arranca sin criterios cargados — el corredor o la
 * familia los completa desde la misma pantalla de Criterios que ya
 * existe (ver ARQUITECTURA.md sección 6). Solo el caso demo arranca con
 * los datos reales de Lucas y Abril (SEED_CRITERIA). */
const EMPTY_CRITERIA: Criteria = {
  loan: {
    bankMaxUsd: 0,
    ownFundsMinUsd: 0,
    ownFundsMaxUsd: 0,
    approvedAmountArs: 0,
    approvedInstallmentArs: 0,
    rateLabel: "",
    termMonths: 0,
    conditions: [],
    moveOutDeadline: "",
  },
  brief: { mustHave: [], flexible: [], zones: [], capitalZones: [] },
};

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
  aptoCredito: "no_se" as const,
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

export async function getHouses(caseId: string): Promise<House[]> {
  const houses = await dbGet<House[]>(housesKey(caseId));
  if (houses === null) {
    const initial = caseId === DEMO_CASE_ID ? SEED_HOUSES : [];
    await dbSet(housesKey(caseId), initial);
    return initial;
  }
  return houses.map(normalizeHouse);
}

/** Todas las mutaciones (agregar, editar, comentar, borrar) pasan por
 * acá en vez de hacer su propio getHouses()+dbSet(): dbUpdate lee,
 * aplica `mutate` y guarda como una sola operación atómica, así dos
 * cambios concurrentes sobre el mismo caso (dos personas de la misma
 * familia comentando casas distintas al mismo tiempo, por ejemplo) no
 * se pisan entre sí — ver lib/db.ts y el comentario de dbUpdate. */
async function mutateHouses(caseId: string, mutate: (houses: House[]) => House[]): Promise<House[]> {
  return dbUpdate<House[]>(housesKey(caseId), (current) => {
    const houses = current === null ? (caseId === DEMO_CASE_ID ? SEED_HOUSES : []) : current.map(normalizeHouse);
    return mutate(houses);
  });
}

export async function addHouse(
  caseId: string,
  input: Pick<House, "url" | "addedBy"> & Partial<House>
): Promise<House> {
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
    aptoCredito: input.aptoCredito ?? "no_se",
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
  await mutateHouses(caseId, (houses) => [house, ...houses]);
  return house;
}

export async function updateHouse(
  caseId: string,
  id: string,
  patch: Partial<House>
): Promise<House | null> {
  const safePatch = sanitizeHousePatch(patch);
  let updated: House | null = null;
  await mutateHouses(caseId, (houses) =>
    houses.map((house) => {
      if (house.id !== id) return house;
      updated = { ...house, ...safePatch, id: house.id, updatedAt: new Date().toISOString() };
      return updated;
    })
  );
  return updated;
}

export async function addComment(
  caseId: string,
  houseId: string,
  author: string,
  text: string
): Promise<House | null> {
  const comment: HouseComment = {
    id: crypto.randomUUID(),
    author,
    text,
    createdAt: new Date().toISOString(),
  };
  let updated: House | null = null;
  await mutateHouses(caseId, (houses) =>
    houses.map((house) => {
      if (house.id !== houseId) return house;
      updated = { ...house, comments: [...house.comments, comment], updatedAt: comment.createdAt };
      return updated;
    })
  );
  return updated;
}

export async function addHouseChecklistItem(
  caseId: string,
  houseId: string,
  text: string
): Promise<House | null> {
  const item: HouseChecklistItem = { id: crypto.randomUUID(), text, done: false };
  let updated: House | null = null;
  await mutateHouses(caseId, (houses) =>
    houses.map((house) => {
      if (house.id !== houseId) return house;
      updated = { ...house, checklist: [...house.checklist, item], updatedAt: new Date().toISOString() };
      return updated;
    })
  );
  return updated;
}

export async function updateHouseChecklistItem(
  caseId: string,
  houseId: string,
  itemId: string,
  patch: Partial<HouseChecklistItem>
): Promise<House | null> {
  let updated: House | null = null;
  await mutateHouses(caseId, (houses) =>
    houses.map((house) => {
      if (house.id !== houseId) return house;
      updated = {
        ...house,
        checklist: house.checklist.map((item) => (item.id === itemId ? { ...item, ...patch, id: item.id } : item)),
        updatedAt: new Date().toISOString(),
      };
      return updated;
    })
  );
  return updated;
}

export async function deleteHouseChecklistItem(
  caseId: string,
  houseId: string,
  itemId: string
): Promise<House | null> {
  let updated: House | null = null;
  await mutateHouses(caseId, (houses) =>
    houses.map((house) => {
      if (house.id !== houseId) return house;
      updated = {
        ...house,
        checklist: house.checklist.filter((item) => item.id !== itemId),
        updatedAt: new Date().toISOString(),
      };
      return updated;
    })
  );
  return updated;
}

export async function deleteHouse(caseId: string, id: string): Promise<void> {
  await mutateHouses(caseId, (houses) => houses.filter((house) => house.id !== id));
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

export async function getChecklist(caseId: string): Promise<ChecklistItem[]> {
  const items = await dbGet<ChecklistItem[]>(checklistKey(caseId));
  if (items === null) {
    let initial: ChecklistItem[];
    if (caseId === DEMO_CASE_ID) {
      initial = SEED_CHECKLIST;
    } else {
      const kase = await getCase(caseId);
      initial = buildChecklistTemplate(kase?.tipoCaso ?? "compra");
    }
    await dbSet(checklistKey(caseId), initial);
    return initial;
  }
  return items;
}

export async function updateChecklistItem(
  caseId: string,
  id: string,
  patch: Partial<ChecklistItem>
): Promise<ChecklistItem | null> {
  // El tipoCaso se resuelve antes del dbUpdate (no adentro) para no
  // reentrar el lock del store local desde otra clave — ver el
  // comentario de dbUpdate en lib/db.ts.
  const kase = caseId === DEMO_CASE_ID ? null : await getCase(caseId);
  let updated: ChecklistItem | null = null;
  await dbUpdate<ChecklistItem[]>(checklistKey(caseId), (current) => {
    const items = current ?? (caseId === DEMO_CASE_ID ? SEED_CHECKLIST : buildChecklistTemplate(kase?.tipoCaso ?? "compra"));
    return items.map((item) => {
      if (item.id !== id) return item;
      updated = { ...item, ...patch, id: item.id };
      return updated;
    });
  });
  return updated;
}

export async function getCriteria(caseId: string): Promise<Criteria> {
  const criteria = await dbGet<Criteria>(criteriaKey(caseId));
  if (criteria === null) {
    const initial = caseId === DEMO_CASE_ID ? SEED_CRITERIA : EMPTY_CRITERIA;
    await dbSet(criteriaKey(caseId), initial);
    return initial;
  }
  return criteria;
}

export async function updateCriteria(
  caseId: string,
  patch: { loan?: Partial<LoanInfo>; brief?: Partial<SearchBrief> }
): Promise<Criteria> {
  return dbUpdate<Criteria>(criteriaKey(caseId), (current) => {
    const base = current ?? (caseId === DEMO_CASE_ID ? SEED_CRITERIA : EMPTY_CRITERIA);
    return {
      loan: { ...base.loan, ...(patch.loan ?? {}) },
      brief: { ...base.brief, ...(patch.brief ?? {}) },
    };
  });
}
