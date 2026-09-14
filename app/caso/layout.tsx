import type { Metadata } from "next";
import Nav from "@/components/Nav";
import { getCaseId } from "@/lib/session";
import { getCase } from "@/lib/cases";
import { getBroker, getCurrentBroker } from "@/lib/brokers";

export async function generateMetadata(): Promise<Metadata> {
  const caseId = await getCaseId();
  const kase = await getCase(caseId);
  return {
    title: kase ? `${kase.titulo} — Micaso` : "Micaso",
    description: "Presupuesto, propiedades, visitas y checklist de tu búsqueda de casa, todo en un solo lugar.",
  };
}

export default async function CasoLayout({ children }: LayoutProps<"/caso">) {
  const caseId = await getCaseId();
  const kase = await getCase(caseId);
  const broker = kase ? await getBroker(kase.brokerId) : null;
  // Si quien mira esto es el propio corredor del caso (entró con "Entrar
  // como este caso" desde su panel, ver CaseRow.tsx), le mostramos un
  // link de vuelta — sin esto, quedaría atrapado en la vista de la
  // familia sin forma de volver a su panel.
  const viewer = await getCurrentBroker();
  const viewingAsBroker = Boolean(viewer && kase && viewer.id === kase.brokerId);

  return (
    <div className="flex min-h-full flex-col">
      <Nav
        caseTitle={kase?.titulo ?? "Tu caso"}
        tipoCaso={kase?.tipoCaso ?? "compra"}
        brokerName={broker?.nombreMarca ?? null}
        brokerImage={broker?.imagenUrl ?? null}
        viewingAsBroker={viewingAsBroker}
      />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>
      <footer
        className="border-t px-4 py-6 text-center text-xs sm:px-6"
        style={{ borderColor: "var(--border)", color: "var(--ink-faint)" }}
      >
        Micaso{broker ? ` — gestionado por ${broker.nombreMarca}` : ""}
      </footer>
    </div>
  );
}
