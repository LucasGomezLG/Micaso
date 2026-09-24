// Vuelve a sembrar el caso demo público desde lib/seed.ts (SEP23-15,
// AUDITORIA-2026-09-23.md). El demo se siembra una sola vez, la primera
// vez que alguien lo abre — así que cambiar lib/seed.ts no cambia el demo
// que ya está guardado en producción. Este script borra sus claves y lo
// vuelve a sembrar con la semilla actual (la que ya no tiene los nombres
// ni los datos reales del crédito de Lucas y Abril).
//
// Borra también cualquier cambio que se le haya hecho al demo a mano desde
// la app (casas, comentarios, checklist, criterios). No toca ningún otro
// caso: todas las claves son `case:demo:*`.
//
// Uso: las credenciales de Redis de producción van en un archivo APARTE,
// nunca en .env.local — con ellas ahí, `npm run dev` también escribiría
// en la base de producción. `.env.produccion` no lo carga Next.js solo, y
// `.env*` ya está en .gitignore.
//   vercel env pull .env.produccion --environment=production
//   node --env-file=.env.produccion --import tsx scripts/reset-demo.mts              # solo muestra qué haría
//   node --env-file=.env.produccion --import tsx scripts/reset-demo.mts --confirmar  # lo hace
// Sin --env-file corre contra la base local (.data/store.json).
import { dbDelete, dbGet, isUsingRemoteDb } from "../lib/db";
import { getCase } from "../lib/cases";
import { getChecklist, getCriteria, getHouses } from "../lib/store";
import { DEMO_CASE_ID } from "../lib/seed";
import type { Case, Criteria } from "../lib/types";

const DEMO_KEYS = ["meta", "houses", "checklist", "criteria"].map((suffix) => `case:${DEMO_CASE_ID}:${suffix}`);

async function main() {
  const confirmed = process.argv.includes("--confirmar");
  console.log(`Base: ${isUsingRemoteDb() ? "Redis (remota)" : "archivo local"}`);

  const before = await dbGet<Case>(`case:${DEMO_CASE_ID}:meta`);
  const criteria = await dbGet<Criteria>(`case:${DEMO_CASE_ID}:criteria`);
  console.log(`Demo actual: "${before?.titulo ?? "(no sembrado)"}" · banco: ${criteria?.loan.bankName ?? "-"}`);

  if (!confirmed) {
    console.log(`\nSe borrarían y volverían a sembrar: ${DEMO_KEYS.join(", ")}`);
    console.log("No se cambió nada. Para hacerlo, correr de nuevo con --confirmar.");
    return;
  }

  for (const key of DEMO_KEYS) await dbDelete(key);

  // Cada lectura siembra lo que falta (ver ensureDemoCaseSeed en
  // lib/cases.ts y getHouses/getChecklist/getCriteria en lib/store.ts).
  const kase = await getCase(DEMO_CASE_ID);
  const [houses, checklist, newCriteria] = await Promise.all([
    getHouses(DEMO_CASE_ID),
    getChecklist(DEMO_CASE_ID),
    getCriteria(DEMO_CASE_ID),
  ]);
  console.log(
    `\n✔ Demo resembrado: "${kase?.titulo}" · personas: ${kase?.people.join(", ")} · ` +
      `${houses.length} casas · ${checklist.length} ítems de checklist · banco: ${newCriteria.loan.bankName}`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
