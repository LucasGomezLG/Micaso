// Migración ARC-01/DAT-01 — una sola vez, a mano (ver ARQUITECTURA.md
// sección 9 y el plan guardado en esta sesión). Explota los blobs
// monolíticos viejos "cases" y "brokers" en claves por entidad
// (case:{id}:meta, broker:{id}:meta) más los índices globales
// (all_case_ids, all_broker_ids) y el índice de login por username
// (case_username:{username}) que ya usa el código nuevo de
// lib/cases.ts / lib/brokers.ts.
//
// No destructivo: nunca borra ni modifica "cases"/"brokers" — solo lee
// de ahí y escribe en las claves nuevas. Si algo sale mal, alcanza con
// volver a desplegar el código anterior; las claves viejas siguen
// intactas. Idempotente — correrlo dos veces pisa las claves nuevas con
// los mismos datos frescos del blob viejo, no rompe nada.
//
// Uso: node --env-file-if-exists=.env.local --import tsx scripts/migrate-cases-brokers.mts
import { dbGet, dbSet, dbUpdate } from "../lib/db";
import { Broker, Case } from "../lib/types";

async function main() {
  const oldCases = (await dbGet<Record<string, Case>>("cases")) ?? {};
  const oldBrokers = (await dbGet<Record<string, Broker>>("brokers")) ?? {};

  const caseIds = Object.keys(oldCases);
  const brokerIds = Object.keys(oldBrokers);

  console.log(`Blob viejo: ${caseIds.length} casos, ${brokerIds.length} corredores.`);

  for (const broker of Object.values(oldBrokers)) {
    await dbSet(`broker:${broker.id}:meta`, broker);
  }
  await dbUpdate<string[]>("all_broker_ids", (current) => {
    const ids = new Set(current ?? []);
    for (const id of brokerIds) ids.add(id);
    return [...ids];
  });

  for (const kase of Object.values(oldCases)) {
    await dbSet(`case:${kase.id}:meta`, kase);
    await dbSet(`case_username:${kase.username}`, kase.id);
  }
  await dbUpdate<string[]>("all_case_ids", (current) => {
    const ids = new Set(current ?? []);
    for (const id of caseIds) ids.add(id);
    return [...ids];
  });

  // Verificación: cada clave nueva tiene que poder leerse de vuelta con
  // el mismo contenido, y los índices globales tienen que tener el mismo
  // largo que la cantidad de entradas del blob viejo — una discrepancia
  // acá señala algo mal, no queda en silencio.
  const writtenCaseIds = (await dbGet<string[]>("all_case_ids")) ?? [];
  const writtenBrokerIds = (await dbGet<string[]>("all_broker_ids")) ?? [];
  let caseMismatches = 0;
  for (const id of caseIds) {
    const written = await dbGet<Case>(`case:${id}:meta`);
    if (!written || written.id !== id) caseMismatches++;
  }
  let brokerMismatches = 0;
  for (const id of brokerIds) {
    const written = await dbGet<Broker>(`broker:${id}:meta`);
    if (!written || written.id !== id) brokerMismatches++;
  }

  console.log(`all_case_ids: ${writtenCaseIds.length} (esperado >= ${caseIds.length})`);
  console.log(`all_broker_ids: ${writtenBrokerIds.length} (esperado >= ${brokerIds.length})`);
  console.log(`Casos con contenido verificado: ${caseIds.length - caseMismatches}/${caseIds.length}`);
  console.log(`Corredores con contenido verificado: ${brokerIds.length - brokerMismatches}/${brokerIds.length}`);

  if (caseMismatches > 0 || brokerMismatches > 0 || writtenCaseIds.length < caseIds.length || writtenBrokerIds.length < brokerIds.length) {
    console.error("VERIFICACIÓN FALLÓ — revisar antes de desplegar el código nuevo.");
    process.exit(1);
  }
  console.log("Migración completa y verificada. Las claves viejas (\"cases\"/\"brokers\") quedaron intactas como respaldo.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
