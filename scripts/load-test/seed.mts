// Siembra el mock de Upstash (mock-upstash.mjs) con datos de tamaño
// realista — ver README.md de esta carpeta. Corredores y casos pasan por el
// código real de la app (índices, contraseña cifrada); las casas se arman
// acá con el mismo formato que House (~2,2 KB cada una: 8 fotos, 2
// comentarios, checklist). Deja en la salida las cookies de sesión de
// familia, corredor y admin, firmadas con los secretos DE PRUEBA de env.sh.
//
// Uso, desde la raíz del repo y con env.sh cargado:
//   node --import tsx scripts/load-test/seed.mts [corredores] [casosPorCorredor] [casasPorCaso] [salida.json]
import { mkdirSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";

const mockUrl = process.env.UPSTASH_REDIS_REST_URL ?? "";
if (!mockUrl.startsWith("http://127.0.0.1")) {
  // Protección: este script escribe; jamás contra un Upstash real.
  throw new Error(`UPSTASH_REDIS_REST_URL tiene que apuntar al mock local, no a "${mockUrl}". Cargá scripts/load-test/env.sh.`);
}

const root = process.cwd();
const fromRepo = (p: string) => pathToFileURL(join(root, p)).href;
const repoRequire = createRequire(join(root, "package.json"));

const nBrokers = Number(process.argv[2] ?? 50);
const casesPerBroker = Number(process.argv[3] ?? 20);
const housesPerCase = Number(process.argv[4] ?? 40);
const outFile = process.argv[5] ?? join(root, "scripts/load-test/out/seed.json");

const { createCase } = await import(fromRepo("lib/cases.ts"));
const { createCaseSessionToken } = await import(fromRepo("lib/sessionToken.ts"));
const { FOUNDER_EMAIL } = await import(fromRepo("lib/auth.ts"));
const { encode } = await import(pathToFileURL(repoRequire.resolve("next-auth/jwt")).href);

async function load(map: Record<string, unknown>) {
  const res = await fetch(`${mockUrl}/__load`, { method: "POST", body: JSON.stringify(map) });
  if (!res.ok) throw new Error(`__load respondió ${res.status}`);
}

function sessionCookie(email: string, name: string): Promise<string> {
  return encode({
    token: { email, name, sub: email },
    secret: process.env.AUTH_SECRET!,
    salt: "authjs.session-token",
  });
}

const ZONES = ["Villa Urquiza", "Saavedra", "Coghlan", "Villa Ballester", "San Andrés", "Belgrano", "Núñez", "Palermo"];

function house(i: number, author: string) {
  const now = new Date(Date.now() - i * 3_600_000).toISOString();
  return {
    id: randomUUID(),
    url: `https://www.zonaprop.com.ar/propiedades/clasificado/veclapin-ph-3-ambientes-con-patio-y-terraza-${50_000_000 + i}.html`,
    title: `PH 3 ambientes con patio y terraza en ${ZONES[i % ZONES.length]} — ${i}`,
    source: "Zonaprop",
    priceUsd: 95_000 + (i % 40) * 2_500,
    zone: ZONES[i % ZONES.length],
    address: `Calle ${100 + i} ${1000 + i * 7}`,
    lat: -34.56 + i / 10_000,
    lng: -58.49 + i / 10_000,
    ambientes: 3,
    dormitorios: 2,
    cochera: i % 3 === 0,
    superficieM2: 70 + (i % 30),
    aptoCredito: "no_se",
    images: Array.from(
      { length: 8 },
      (_, k) => `https://imgar.zonapropcdn.com/avisos/1/00/${50_000_000 + i}/360x266/${2_000_000_000 + i * 10 + k}.jpg?isFirstImage=${k === 0}`
    ),
    comments: [
      { id: randomUUID(), author, text: "Nos gustó la luz del living, pero el baño necesita reforma completa. Preguntar expensas.", createdAt: now },
      { id: randomUUID(), author: "Corredor", text: "Hablé con la inmobiliaria: aceptan crédito hipotecario y hay margen para negociar.", createdAt: now },
    ],
    checklist: [
      { id: randomUUID(), text: "Pedir plano", done: i % 2 === 0, createdAt: now },
      { id: randomUUID(), text: "Consultar expensas", done: false, createdAt: now },
    ],
    status: ["pendiente", "a_coordinar", "coordinada", "gusto", "no_gusto"][i % 5],
    highlighted: i % 7 === 0,
    contactoNombre: "Inmobiliaria Ejemplo",
    contactoTelefono: "+54 9 11 5555-0000",
    proximaAccion: i % 4 === 0 ? "Llamar para coordinar segunda visita" : null,
    proximaAccionFecha: i % 4 === 0 ? "2026-10-01" : null,
    visitaFecha: i % 5 === 2 ? `2026-10-0${1 + (i % 8)}T1${i % 9}:00` : null,
    visitaConfirmada: false,
    visitReview: null,
    addedBy: author,
    addedAt: now,
    updatedAt: now,
  };
}

const t0 = Date.now();
const brokers: { id: string; cookie: string }[] = [];
const brokerKeys: Record<string, unknown> = {};
for (let b = 0; b < nBrokers; b++) {
  const email = `corredor${b}@test.local`;
  brokerKeys[`broker:${email}:meta`] = {
    id: email,
    email,
    nombreMarca: `Corredor ${b}`,
    imagenUrl: null,
    plan: "volumen_alto",
    subscriptionStatus: "activa",
    trialEndsAt: "2099-01-01T00:00:00.000Z",
    mpPreapprovalId: null,
    createdAt: new Date().toISOString(),
  };
  brokers.push({ id: email, cookie: await sessionCookie(email, `Corredor ${b}`) });
}
brokerKeys.all_broker_ids = brokers.map((b) => b.id);
await load(brokerKeys);

const cases: { id: string; brokerId: string; cookie: string; houseIds: string[] }[] = [];
let housesBytes = 0;
for (const broker of brokers) {
  for (let c = 0; c < casesPerBroker; c++) {
    const kase = await createCase(broker.id, `Familia ${broker.id}-${c}`, "compra", ["Ana", "Pablo"]);
    const houses = Array.from({ length: housesPerCase }, (_, i) => house(i, "Ana"));
    const json = JSON.stringify(houses);
    housesBytes += json.length;
    await load({ [`case:${kase.id}:houses`]: json });
    cases.push({ id: kase.id, brokerId: broker.id, cookie: createCaseSessionToken(kase.id), houseIds: houses.map((h) => h.id) });
  }
}

mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, JSON.stringify({ admin: await sessionCookie(FOUNDER_EMAIL, "Admin"), brokers, cases }));
console.log(
  JSON.stringify({
    corredores: brokers.length,
    casos: cases.length,
    casasPorCaso: housesPerCase,
    kbPorCaso: cases.length ? +(housesBytes / cases.length / 1024).toFixed(1) : 0,
    segundos: +((Date.now() - t0) / 1000).toFixed(1),
    salida: outFile,
  })
);
