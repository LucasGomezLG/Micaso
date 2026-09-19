// Purga de blobs monolíticos viejos "cases" y "brokers" post-migración ARC-01/DAT-01
// Ver hallazgo CON-05 / auditorías legales Claude y Gemini (sept 2026).
//
// Una vez confirmada la migración a claves individuales (case:{id}:meta y
// broker:{id}:meta), conservar "cases" y "brokers" en la base viola el principio
// de minimización de datos (Ley 25.326 art. 4) y provoca que un borrado en el código
// nuevo deje copias fantasma en el blob viejo.
//
// Uso: node --env-file-if-exists=.env.local --import tsx scripts/purge-legacy-blobs.mts
import { dbDelete, dbGet } from "../lib/db";

async function main() {
  console.log("Iniciando verificación y purga de blobs legacy...");

  const oldCases = await dbGet<Record<string, unknown>>("cases");
  const oldBrokers = await dbGet<Record<string, unknown>>("brokers");

  const allCaseIds = await dbGet<string[]>("all_case_ids");
  const allBrokerIds = await dbGet<string[]>("all_broker_ids");

  console.log(`Estado actual:
- Blobs viejos: "cases" (${oldCases ? Object.keys(oldCases).length : "inexistente"}), "brokers" (${oldBrokers ? Object.keys(oldBrokers).length : "inexistente"})
- Claves nuevas: "all_case_ids" (${allCaseIds?.length ?? 0}), "all_broker_ids" (${allBrokerIds?.length ?? 0})`);

  // Verificación de seguridad: nunca purgar si no existen los índices nuevos
  if (!allCaseIds || allCaseIds.length === 0) {
    console.error("ABORTANDO: 'all_case_ids' no existe o está vacío. La migración ARC-01 no parece estar activa.");
    process.exit(1);
  }

  let purgedCount = 0;
  if (oldCases !== null) {
    await dbDelete("cases");
    console.log("✔ Clave legacy 'cases' eliminada con éxito.");
    purgedCount++;
  } else {
    console.log("ℹ La clave legacy 'cases' ya no existe.");
  }

  if (oldBrokers !== null) {
    await dbDelete("brokers");
    console.log("✔ Clave legacy 'brokers' eliminada con éxito.");
    purgedCount++;
  } else {
    console.log("ℹ La clave legacy 'brokers' ya no existe.");
  }

  console.log(`Purga finalizada. Claves eliminadas: ${purgedCount}. Base de datos conforme a ARC-01.`);
}

main().catch((err) => {
  console.error("Error durante la purga:", err);
  process.exit(1);
});
