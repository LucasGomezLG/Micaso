import { cache } from "react";
import { dbDelete, dbGet, dbUpdate } from "./db";
import { DEMO_CASE_ID, SEED_CHECKLIST, SEED_CRITERIA, SEED_HOUSES } from "./seed";
import { buildChecklistTemplate } from "./checklistTemplates";
import { getCase } from "./cases";
import { isOverdue } from "./format";
import { ChecklistItem, Criteria, House, HouseChecklistItem, HouseComment, HouseStatus, LoanInfo, PIPELINE_STATUSES, SearchBrief } from "./types";

const housesKey = (caseId: string) => `case:${caseId}:houses`;
const checklistKey = (caseId: string) => `case:${caseId}:checklist`;
const criteriaKey = (caseId: string) => `case:${caseId}:criteria`;

/** Borra las casas, el checklist y los criterios de un caso — usado por
 * el borrado definitivo desde /superadmin (ver lib/cases.ts deleteCase,
 * que borra el caso en sí; el caller llama a las dos). Irreversible a
 * propósito, no hay soft-delete acá. */
export async function deleteCaseData(caseId: string): Promise<void> {
  await Promise.all([dbDelete(housesKey(caseId)), dbDelete(checklistKey(caseId)), dbDelete(criteriaKey(caseId))]);
}

/** Un caso nuevo arranca sin criterios cargados — el corredor o la
 * familia los completa desde la misma pantalla de Criterios que ya
 * existe (ver ARQUITECTURA.md sección 6). Solo el caso demo arranca con
 * los datos reales de Lucas y Abril (SEED_CRITERIA). */
const EMPTY_CRITERIA: Criteria = {
  loan: {
    hasCredit: true,
    bankName: "",
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

export const getHouses = cache(async function getHouses(caseId: string): Promise<House[]> {
  const houses = await dbGet<House[]>(housesKey(caseId));
  if (houses !== null) return houses.map(normalizeHouse);
  // Caso nuevo: nadie inicializó esta clave todavía. Un dbGet+dbSet
  // separado acá tenía una carrera real - si entre el dbGet y el dbSet
  // otra request ya agregó la primera casa (vía dbUpdate, atómico), este
  // dbSet la pisaba con un array vacío. dbUpdate vuelve a chequear
  // `current` adentro del mismo lock, así que si ya hay algo, se respeta.
  const initial = caseId === DEMO_CASE_ID ? SEED_HOUSES : [];
  const result = await dbUpdate<House[]>(housesKey(caseId), (current) => current ?? initial);
  return result.map(normalizeHouse);
});

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
  input: Pick<House, "addedBy"> & Partial<House>
): Promise<House> {
  const now = new Date().toISOString();
  const house: House = {
    id: crypto.randomUUID(),
    url: input.url ?? null,
    title: input.title || input.url || "Propiedad sin título",
    source: input.source || (input.url ? guessSource(input.url) : "Manual"),
    priceUsd: input.priceUsd ?? null,
    zone: input.zone ?? null,
    lat: input.lat ?? null,
    lng: input.lng ?? null,
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

export interface CaseSummary {
  pendientes: number;
  destacadas: number;
  totalHouses: number;
  /** ISO — la más reciente entre las casas del caso, o null sin casas. */
  lastActivity: string | null;
  /** La próxima acción vencida más antigua (la que lleva más tiempo
   * esperando), o null si no hay ninguna vencida. */
  overdueAccion: { text: string; fecha: string } | null;
  /** ISO datetime de la visita coordinada futura más próxima, o null. */
  nextVisita: string | null;
  /** Cantidad de novedades (casas agregadas, cambios o comentarios) no vistas por el corredor. */
  unreadCount: number;
  /** Resumen textual amigable de las novedades. */
  unreadSummary: string | null;
}

/** Resumen de un caso para el panel del corredor (lista de casos y
 * dashboard, ver app/panel/page.tsx) — pensado para leerse una vez por
 * carga de página, no para reaccionar en vivo a cambios de otro caso. */
export const getCaseSummary = cache(async function getCaseSummary(caseId: string, brokerLastSeenAt?: string | null): Promise<CaseSummary> {
  const houses = (await getHouses(caseId)).filter((h) => h.status !== "borrada");
  const pendientes = houses.filter((h) => h.status === "pendiente").length;
  const destacadas = houses.filter((h) => h.highlighted).length;
  const lastActivity = houses.reduce<string | null>(
    (max, h) => (max === null || h.updatedAt > max ? h.updatedAt : max),
    null
  );

  const overdue = houses
    .filter((h): h is House & { proximaAccion: string; proximaAccionFecha: string } =>
      Boolean(h.proximaAccion && h.proximaAccionFecha && isOverdue(h.proximaAccionFecha))
    )
    .sort((a, b) => (a.proximaAccionFecha < b.proximaAccionFecha ? -1 : 1))[0];

  const nowIso = new Date().toISOString();
  const upcoming = houses
    .filter((h): h is House & { visitaFecha: string } => Boolean(h.visitaFecha && h.visitaFecha > nowIso))
    .sort((a, b) => (a.visitaFecha < b.visitaFecha ? -1 : 1))[0];

  // Cálculo de novedades no vistas por el corredor
  let unreadCount = 0;
  let newHousesCount = 0;
  let statusGustoCount = 0;
  let newCommentsCount = 0;

  if (brokerLastSeenAt) {
    for (const h of houses) {
      const isNew = h.addedAt > brokerLastSeenAt;
      const isUpdated = h.updatedAt > brokerLastSeenAt;
      if (isNew) {
        unreadCount++;
        newHousesCount++;
      } else if (isUpdated) {
        unreadCount++;
        if (h.status === "gusto") statusGustoCount++;
      }
      for (const c of h.comments) {
        if (c.createdAt > brokerLastSeenAt) {
          unreadCount++;
          newCommentsCount++;
        }
      }
    }
  }

  let unreadSummary: string | null = null;
  if (unreadCount > 0) {
    const parts: string[] = [];
    if (newHousesCount > 0) {
      parts.push(`${newHousesCount} casa${newHousesCount === 1 ? "" : "s"} agregada${newHousesCount === 1 ? "" : "s"}`);
    }
    if (statusGustoCount > 0) {
      parts.push(`marcó "Nos gustó" en ${statusGustoCount}`);
    }
    if (newCommentsCount > 0) {
      parts.push(`${newCommentsCount} nota${newCommentsCount === 1 ? "" : "s"} nueva${newCommentsCount === 1 ? "" : "s"}`);
    }
    unreadSummary = parts.length > 0 ? parts.join(" · ") : `${unreadCount} novedades`;
  }

  return {
    pendientes,
    destacadas,
    totalHouses: houses.length,
    lastActivity,
    overdueAccion: overdue ? { text: overdue.proximaAccion, fecha: overdue.proximaAccionFecha } : null,
    nextVisita: upcoming ? upcoming.visitaFecha : null,
    unreadCount,
    unreadSummary,
  };
});

/** Plantilla por default si el checklist de un caso nunca se inicializó
 * — pasa por acá tanto getChecklist como el fallback de updateChecklistItem
 * (dbUpdate no puede resolver criteria/case adentro de su callback, ver
 * el comentario de dbUpdate en lib/db.ts, así que ambos la resuelven
 * antes de entrar). */
async function defaultChecklist(caseId: string): Promise<ChecklistItem[]> {
  if (caseId === DEMO_CASE_ID) return SEED_CHECKLIST;
  const [kase, criteria] = await Promise.all([getCase(caseId), getCriteria(caseId)]);
  return buildChecklistTemplate(kase?.tipoCaso ?? "compra", criteria.loan.hasCredit);
}

export const getChecklist = cache(async function getChecklist(caseId: string): Promise<ChecklistItem[]> {
  const items = await dbGet<ChecklistItem[]>(checklistKey(caseId));
  if (items !== null) return items;
  // Mismo riesgo de carrera que getHouses (ver ese comentario) - se
  // resuelve con dbUpdate, que vuelve a chequear `current` adentro del
  // lock en vez de un dbSet ciego.
  const fallback = await defaultChecklist(caseId);
  return dbUpdate<ChecklistItem[]>(checklistKey(caseId), (current) => current ?? fallback);
});

export async function updateChecklistItem(
  caseId: string,
  id: string,
  patch: Partial<ChecklistItem>
): Promise<ChecklistItem | null> {
  const fallback = await defaultChecklist(caseId);
  let updated: ChecklistItem | null = null;
  await dbUpdate<ChecklistItem[]>(checklistKey(caseId), (current) => {
    const items = current ?? fallback;
    return items.map((item) => {
      if (item.id !== id) return item;
      updated = { ...item, ...patch, id: item.id };
      return updated;
    });
  });
  return updated;
}

export async function addChecklistItem(
  caseId: string,
  group: string,
  label: string
): Promise<ChecklistItem> {
  const fallback = await defaultChecklist(caseId);
  const newItem: ChecklistItem = { id: crypto.randomUUID(), group, label, done: false, assignedTo: null, notes: "" };
  await dbUpdate<ChecklistItem[]>(checklistKey(caseId), (current) => [...(current ?? fallback), newItem]);
  return newItem;
}

export async function deleteChecklistItem(caseId: string, id: string): Promise<boolean> {
  const fallback = await defaultChecklist(caseId);
  let deleted = false;
  await dbUpdate<ChecklistItem[]>(checklistKey(caseId), (current) => {
    const items = current ?? fallback;
    const next = items.filter((item) => item.id !== id);
    deleted = next.length !== items.length;
    return next;
  });
  return deleted;
}

export const getCriteria = cache(async function getCriteria(caseId: string): Promise<Criteria> {
  const criteria = await dbGet<Criteria>(criteriaKey(caseId));
  if (criteria !== null) return criteria;
  // Mismo riesgo de carrera que getHouses (ver ese comentario).
  const fallback = caseId === DEMO_CASE_ID ? SEED_CRITERIA : EMPTY_CRITERIA;
  return dbUpdate<Criteria>(criteriaKey(caseId), (current) => current ?? fallback);
});

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
