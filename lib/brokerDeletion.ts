import { deleteBroker, getBroker } from "./brokers";
import { deleteBrokerCaseIndex, deleteCase, listCasesForBroker, withCaseLimitLock } from "./cases";
import { cancelSubscription } from "./mercadopago";
import { deleteCaseData } from "./store";

/** Baja definitiva de un corredor con todo lo que cuelga de él: su
 * suscripción en Mercado Pago, cada uno de sus casos (casas, checklist,
 * criterios, suscripciones push, fotos de Blob) y el índice de casos.
 * Es la única puerta para borrar un corredor — la usan "Eliminar mi
 * cuenta" (app/api/panel/profile) y el borrado desde /superadmin
 * (app/api/superadmin/brokers/[id]). Antes cada ruta armaba su propia
 * cascada, y la del autoservicio solo borraba al corredor: sus casos
 * quedaban activos para siempre, la familia seguía entrando y el cron no
 * los bajaba nunca (SEP23-02, AUDITORIA-2026-09-23.md). Vive en un
 * archivo propio porque necesita brokers, cases y store a la vez, y
 * lib/brokers.ts no puede importar lib/cases.ts (al revés ya pasa).
 *
 * Devuelve false si el corredor no existe. */
export async function deleteBrokerCascade(brokerId: string): Promise<boolean> {
  const broker = await getBroker(brokerId);
  if (!broker) return false;

  // Activa o atrasada (preapproval `paused`, que se puede reanudar): las
  // dos siguen vivas en Mercado Pago. Si falla, la baja sigue igual —
  // el corredor pidió irse, y desde su cuenta de Mercado Pago todavía
  // puede cancelarla él mismo.
  if (broker.mpPreapprovalId && broker.subscriptionStatus !== "cancelada") {
    const cancelled = await cancelSubscription(broker.mpPreapprovalId).catch((err) => {
      console.error("Error cancelando la suscripción durante la baja:", err);
      return false;
    });
    if (!cancelled) {
      console.error(
        `No se pudo cancelar la suscripción ${broker.mpPreapprovalId} del corredor ${brokerId} durante la baja — revisarla a mano en Mercado Pago`
      );
    }
  }

  // Con el mismo lock que createCase/reopenCase: sin él, un caso creado
  // desde otra pestaña mientras corre la baja (después de listar los casos
  // y antes de borrar al corredor) quedaba huérfano. El alta que espera el
  // lock ve después al corredor borrado y falla (assertUnderCaseLimit).
  await withCaseLimitLock(brokerId, async () => {
    // Los casos antes que el corredor: si algo falla a mitad de camino, el
    // corredor sigue existiendo y la baja se puede reintentar entera.
    const cases = await listCasesForBroker(brokerId);
    for (const kase of cases) {
      await deleteCase(kase.id, brokerId);
      await deleteCaseData(kase.id, brokerId);
    }
    await deleteBrokerCaseIndex(brokerId);
    await deleteBroker(brokerId);
  });
  return true;
}
