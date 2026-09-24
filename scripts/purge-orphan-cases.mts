// Borra los casos que quedaron sin corredor por el bug de SEP23-02
// (AUDITORIA-2026-09-23.md): hasta el 23 sept 2026, "Eliminar mi cuenta"
// borraba al corredor pero no sus casos — quedaban activos, la familia
// seguía entrando, y el cron no los bajaba nunca. El arreglo
// (deleteBrokerCascade, lib/brokerDeletion.ts) evita casos nuevos así,
// pero no limpia los que ya existían. Este script los busca: casos cuyo
// corredor ya no existe. El caso demo nunca se toca.
//
// Uso: las credenciales de Redis de producción van en un archivo APARTE,
// nunca en .env.local — con ellas ahí, `npm run dev` también escribiría
// en la base de producción. `.env.produccion` no lo carga Next.js solo, y
// `.env*` ya está en .gitignore.
//   vercel env pull .env.produccion --environment=production
//   node --env-file=.env.produccion --import tsx scripts/purge-orphan-cases.mts              # solo muestra qué haría
//   node --env-file=.env.produccion --import tsx scripts/purge-orphan-cases.mts --confirmar  # lo hace
// Sin --env-file corre contra la base local (.data/store.json).
// Necesita CASE_SECRET_KEY en ese archivo (deleteCase lee el caso, y eso
// desencripta la clave): si Vercel no la deja bajar por estar marcada
// como sensible, copiarla a mano.
import { getBroker } from "../lib/brokers";
import { deleteBrokerCaseIndex, deleteCase, listAllCases } from "../lib/cases";
import { isUsingRemoteDb } from "../lib/db";
import { DEMO_CASE_ID } from "../lib/seed";
import { deleteCaseData } from "../lib/store";

async function main() {
  const confirmed = process.argv.includes("--confirmar");
  console.log(`Base: ${isUsingRemoteDb() ? "Redis (remota)" : "archivo local"}`);

  const cases = (await listAllCases()).filter((c) => c.id !== DEMO_CASE_ID);
  const orphans = [];
  for (const kase of cases) {
    if (!(await getBroker(kase.brokerId))) orphans.push(kase);
  }

  console.log(`Casos revisados: ${cases.length} · sin corredor: ${orphans.length}`);
  for (const kase of orphans) {
    console.log(`  - ${kase.id} · "${kase.titulo}" · estado ${kase.estado} · corredor borrado: ${kase.brokerId}`);
  }
  if (orphans.length === 0) return;

  if (!confirmed) {
    console.log("\nNo se borró nada. Para borrarlos (con sus casas, checklist, criterios, push y fotos), correr de nuevo con --confirmar.");
    return;
  }

  for (const kase of orphans) {
    await deleteCase(kase.id, kase.brokerId);
    await deleteCaseData(kase.id, kase.brokerId);
  }
  for (const brokerId of new Set(orphans.map((k) => k.brokerId))) {
    await deleteBrokerCaseIndex(brokerId);
  }
  console.log(`\n✔ Borrados ${orphans.length} casos sin corredor.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
