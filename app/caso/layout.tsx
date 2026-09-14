import type { Metadata } from "next";
import Nav from "@/components/Nav";
import { getCaseId } from "@/lib/session";
import { getCase } from "@/lib/cases";
import { getBroker } from "@/lib/brokers";

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

  return (
    <div className="flex min-h-full flex-col">
      <Nav
        caseTitle={kase?.titulo ?? "Tu caso"}
        tipoCaso={kase?.tipoCaso ?? "compra"}
        brokerName={broker?.nombreMarca ?? null}
        brokerImage={broker?.imagenUrl ?? null}
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
