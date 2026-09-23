import { NextResponse } from "next/server";
import { z } from "zod";

/** Parsea el body JSON de un Request contra un schema de Zod — reemplaza
 * el `try { body = await request.json() } catch {...}` + chequeos a mano
 * que estaba repetido en cada route handler (COD-01, ver ARQUITECTURA.md):
 * ningún endpoint validaba el *shape* real del body en runtime, solo
 * confiaba en el tipo de TypeScript (que no protege nada una vez
 * compilado — un `priceUsd: "carísimo"` pasaba derecho a `updateHouse` y
 * quedaba guardado tal cual). Devuelve `{ data }` ya tipado y validado, o
 * `{ error }` con la respuesta 400 lista para retornar tal cual. */
export async function parseJsonBody<T>(
  request: Request,
  schema: z.ZodType<T>
): Promise<{ data: T } | { error: NextResponse }> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return { error: NextResponse.json({ error: "Solicitud inválida" }, { status: 400 }) };
  }
  const result = schema.safeParse(raw);
  if (!result.success) {
    const issue = result.error.issues[0];
    const field = issue.path.length > 0 ? `${issue.path.join(".")}: ` : "";
    return { error: NextResponse.json({ error: `${field}${issue.message}` }, { status: 400 }) };
  }
  return { data: result.data };
}

/** String requerida con UN mensaje de error amigable tanto si falta la
 * key, viene con otro tipo, o llega vacía — Zod separa "tipo inválido"
 * de "muy corta" en dos checks distintos (`{error}` en el constructor
 * cubre el primero, `.min(1, msg)` el segundo); sin este helper había
 * que repetir el mismo string dos veces en cada campo. */
function requiredString(message: string) {
  return z.string({ error: message }).min(1, message);
}

/** Igual que `requiredString`, pero recorta espacios antes de chequear
 * el mínimo — a propósito NO es "min(1).trim()": `.trim()` es una
 * transformación, así que tiene que ir ANTES del check para que un
 * string de solo espacios ("   ") no pase el `min(1)` con su longitud
 * original y termine guardado como "" recién después de recortarlo. */
function requiredTrimmedString(message: string) {
  return z.string({ error: message }).trim().min(1, message);
}

// ---------------------------------------------------------------------
// Casas (lib/store.ts / lib/types.ts House)
// ---------------------------------------------------------------------

const aptoCreditoSchema = z.enum(["no_se", "si", "no"]);
const houseStatusSchema = z.enum([
  "pendiente", "duda_visitar", "a_coordinar", "coordinada",
  "gusto", "no_gusto", "oferta", "comprada", "descartada", "borrada",
]);

const visitReviewSchema = z.object({
  bien: z.string().max(2000),
  faltante: z.string().max(2000),
  aMejorar: z.string().max(2000),
});

/** Campos de House que un caller externo puede mandar al crear o editar
 * una casa — deliberadamente sin `comments` ni `checklist`: esos dos
 * tienen sus propios endpoints (POST .../comments, POST/PATCH/DELETE
 * .../checklist/[itemId]) que sí controlan autor/fecha del lado del
 * servidor; aceptarlos acá permitiría pisar el array entero con
 * cualquier cosa con la forma correcta (mismo riesgo que RT-04, ver
 * ARQUITECTURA.md). Tampoco `id`/`addedAt`/`updatedAt` (los pone el
 * servidor) ni `lat`/`lng` (los calcula geocodeZone a partir de
 * `address` o, si no hay, `zone` — ver app/api/houses/route.ts y
 * app/api/houses/[id]/route.ts). */
const housePatchableFields = {
  url: z.string().max(2000).nullable(),
  title: z.string().min(1).max(300),
  source: z.string().max(100),
  priceUsd: z.number().finite().nonnegative().nullable(),
  zone: z.string().max(200).nullable(),
  address: z.string().max(300).nullable(),
  ambientes: z.number().int().nonnegative().max(50).nullable(),
  dormitorios: z.number().int().nonnegative().max(50).nullable(),
  cochera: z.boolean().nullable(),
  superficieM2: z.number().finite().positive().nullable(),
  aptoCredito: aptoCreditoSchema,
  images: z.array(z.string().max(2000)).max(30),
  status: houseStatusSchema,
  highlighted: z.boolean(),
  contactoNombre: z.string().max(200).nullable(),
  contactoTelefono: z.string().max(50).nullable(),
  proximaAccion: z.string().max(500).nullable(),
  proximaAccionFecha: z.string().max(20).nullable(),
  visitaFecha: z.string().max(40).nullable(),
  visitReview: visitReviewSchema.nullable(),
};

const housePatchableSchema = z.object(housePatchableFields);

export const housePatchSchema = housePatchableSchema.partial();

/** POST /api/houses — `addedBy` es el único campo realmente obligatorio
 * acá (el resto de los requisitos de negocio, como "hace falta url o
 * title", se siguen chequeando aparte porque son una regla entre dos
 * campos, no la forma de uno solo). */
export const houseCreateSchema = housePatchableSchema.partial().extend({
  addedBy: requiredTrimmedString("Falta el campo obligatorio: addedBy"),
  // Solo texto plano — lib/store.ts addHouse arma el HouseComment real
  // (id/author/createdAt) del lado del servidor, ver el comentario ahí.
  initialComments: z.array(z.string().trim().min(1).max(5000)).max(20).optional(),
});

export const houseCommentCreateSchema = z.object({
  author: requiredString("Faltan campos obligatorios: author, text"),
  text: requiredTrimmedString("Faltan campos obligatorios: author, text").max(5000),
});

export const houseChecklistItemCreateSchema = z.object({
  text: requiredTrimmedString("Falta el campo obligatorio: text").max(500),
});

export const houseChecklistItemPatchSchema = z
  .object({ text: z.string().min(1).max(500), done: z.boolean() })
  .partial();

// ---------------------------------------------------------------------
// Checklist del caso (lib/types.ts ChecklistItem)
// ---------------------------------------------------------------------

export const checklistItemCreateSchema = z.object({
  group: requiredTrimmedString("Falta la categoría o la tarea").max(100),
  label: requiredTrimmedString("Falta la categoría o la tarea").max(300),
});

export const checklistItemPatchSchema = z
  .object({
    group: z.string().min(1).max(100),
    label: z.string().min(1).max(300),
    done: z.boolean(),
    assignedTo: z.string().max(200).nullable(),
    notes: z.string().max(2000),
  })
  .partial();

// ---------------------------------------------------------------------
// Criterios (lib/types.ts Criteria / LoanInfo / SearchBrief)
// ---------------------------------------------------------------------

const loanPatchSchema = z
  .object({
    hasCredit: z.boolean(),
    bankName: z.string().max(200),
    bankMaxUsd: z.number().finite().nonnegative(),
    fxRateArs: z.number().finite().nonnegative(),
    ownFundsMinUsd: z.number().finite().nonnegative(),
    ownFundsMaxUsd: z.number().finite().nonnegative(),
    approvedAmountArs: z.number().finite().nonnegative(),
    approvedInstallmentArs: z.number().finite().nonnegative(),
    rateLabel: z.string().max(100),
    termMonths: z.number().finite().nonnegative(),
    conditions: z.array(z.string().max(500)).max(50),
    moveOutDeadline: z.string().max(40),
  })
  .partial();

const briefPatchSchema = z
  .object({
    mustHave: z.array(z.string().max(300)).max(50),
    flexible: z.array(z.string().max(300)).max(50),
    zones: z.array(z.string().max(200)).max(50),
    capitalZones: z.array(z.string().max(200)).max(50),
  })
  .partial();

export const criteriaPatchSchema = z.object({
  loan: loanPatchSchema.optional(),
  brief: briefPatchSchema.optional(),
});

// ---------------------------------------------------------------------
// Caso — personas (app/api/case/people)
// ---------------------------------------------------------------------

export const peoplePatchSchema = z.object({
  people: z.array(z.string(), { error: "Falta la lista de personas" }),
});

// ---------------------------------------------------------------------
// Login de caso (app/api/login)
// ---------------------------------------------------------------------

export const caseLoginSchema = z.object({
  username: z.string().optional(),
  password: z.string().optional(),
  token: z.string().optional(),
  // Versión de Términos/Privacidad que el checkbox de LoginForm.tsx
  // tenía marcada al enviar — ver lib/legal.ts y recordTermsAcceptance
  // en lib/cases.ts. Opcional: no rompe logins de clientes viejos.
  acceptedTermsVersion: z.string().max(20).optional(),
}).superRefine((data, ctx) => {
  if (data.token && data.token.trim().length > 0) return;
  if (!data.username || !data.password || data.username.trim() === "" || data.password.trim() === "") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Usuario o contraseña incorrectos",
    });
  }
});

// ---------------------------------------------------------------------
// Web Push (app/api/case/push/subscribe)
// ---------------------------------------------------------------------

export const pushSubscribeSchema = z.object({
  subscription: z.object(
    {
      endpoint: requiredString("Suscripción incompleta"),
      keys: z.object(
        {
          p256dh: requiredString("Suscripción incompleta"),
          auth: requiredString("Suscripción incompleta"),
        },
        { error: "Suscripción incompleta" }
      ),
    },
    { error: "Suscripción incompleta" }
  ),
});

export const pushUnsubscribeSchema = z.object({
  endpoint: z.string().min(1).optional(),
});

// ---------------------------------------------------------------------
// Panel del corredor
// ---------------------------------------------------------------------

const IMAGE_DATA_URL = /^data:image\/(jpeg|png|webp);base64,/;
const MAX_IMAGE_LENGTH = 700_000;

export const brokerProfilePatchSchema = z
  .object({
    nombreMarca: z.string().trim().min(1, "Falta el nombre").max(200),
    imagenUrl: z
      .string()
      .max(MAX_IMAGE_LENGTH, "La imagen no es válida o es demasiado grande")
      .refine(
        (v) => IMAGE_DATA_URL.test(v) || v.startsWith("https://"),
        "La imagen no es válida o es demasiado grande"
      )
      .nullable(),
  })
  .partial()
  .refine((body) => Object.keys(body).length > 0, { message: "Nada para actualizar" });

export const panelCaseCreateSchema = z.object({
  titulo: requiredTrimmedString("Falta el título del caso").max(300),
  tipoCaso: z.enum(["compra", "alquiler", "otro"]).optional(),
  people: z.union([z.array(z.string()), z.string()]).optional(),
});

export const caseRenameSchema = z.object({
  titulo: requiredTrimmedString("Falta el título").max(300),
});

export const subscriptionCreateSchema = z.object({
  plan: z.enum(["para_arrancar", "para_tu_cartera"], { error: "Plan inválido" }),
});

// ---------------------------------------------------------------------
// Super-admin
// ---------------------------------------------------------------------

export const adminBrokerCreateSchema = z.object({
  email: requiredTrimmedString("Falta el email o el nombre").toLowerCase(),
  nombreMarca: requiredTrimmedString("Falta el email o el nombre"),
});

export const adminBrokerPatchSchema = z
  .object({
    nombreMarca: z.string().trim().min(1, "Falta el nombre").max(200),
    plan: z.enum(["para_arrancar", "para_tu_cartera", "volumen_alto"], { error: "Plan inválido" }),
    subscriptionStatus: z.enum(["prueba", "activa", "atrasada", "cancelada"], { error: "Estado inválido" }),
    trialEndsAt: z.string().refine((v) => !Number.isNaN(Date.parse(v)), "Fecha inválida"),
  })
  .partial();

export const adminCaseRenameSchema = z.object({
  titulo: requiredTrimmedString("Falta el título").max(300),
});

// ---------------------------------------------------------------------
// Scraper (app/api/scrape)
// ---------------------------------------------------------------------

export const scrapeRequestSchema = z.object({
  url: requiredString("Falta la URL"),
});
