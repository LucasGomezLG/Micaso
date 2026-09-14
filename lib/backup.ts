import { listAllBrokers } from "./brokers";
import { listAllCases } from "./cases";
import { getChecklist, getCriteria, getHouses } from "./store";
import { Broker, Case, ChecklistItem, Criteria, House } from "./types";

export interface CaseBackup {
  case: Case;
  houses: House[];
  checklist: ChecklistItem[];
  criteria: Criteria;
}

export interface FullBackup {
  exportedAt: string;
  brokers: Broker[];
  cases: CaseBackup[];
}

/** Vuelca toda la base a un solo objeto — pensado para descargarse como
 * JSON desde /superadmin (ver app/api/superadmin/backup/route.ts), no
 * para restaurarse automáticamente todavía. Recorre `listAllCases` en
 * vez de sumar `listCasesForBroker` por corredor para no depender de
 * que el índice `broker:{id}:cases` esté al día. */
export async function buildFullBackup(): Promise<FullBackup> {
  const [brokers, cases] = await Promise.all([listAllBrokers(), listAllCases()]);
  const caseBackups = await Promise.all(
    cases.map(async (kase): Promise<CaseBackup> => {
      const [houses, checklist, criteria] = await Promise.all([
        getHouses(kase.id),
        getChecklist(kase.id),
        getCriteria(kase.id),
      ]);
      return { case: kase, houses, checklist, criteria };
    })
  );
  return { exportedAt: new Date().toISOString(), brokers, cases: caseBackups };
}
