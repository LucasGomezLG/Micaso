import type { Metadata } from "next";
import Link from "next/link";
import Nav from "@/components/Nav";
import ClientOnboardingModal from "@/components/ClientOnboardingModal";
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

  const isDemo = caseId === "demo";

  return (
    <div className="flex min-h-full flex-col">
      <Nav
        caseTitle={kase?.titulo ?? "Tu caso"}
        tipoCaso={kase?.tipoCaso ?? "compra"}
        brokerName={broker?.nombreMarca ?? null}
        brokerImage={broker?.imagenUrl ?? null}
        viewingAsBroker={viewingAsBroker}
        isDemo={isDemo}
      />
      <ClientOnboardingModal
        caseId={caseId}
        caseTitle={kase?.titulo ?? "Tu búsqueda"}
        brokerName={broker?.nombreMarca ?? null}
        brokerImage={broker?.imagenUrl ?? null}
        existingPeople={kase?.people ?? []}
        viewingAsBroker={viewingAsBroker}
        isDemo={isDemo}
      />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 pb-20 sm:pb-8 sm:px-6">
        {children}
      </main>
      <footer
        className="mb-16 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-t px-4 py-6 text-center text-xs sm:mb-0 sm:px-6"
        style={{ borderColor: "var(--border)", color: "var(--ink-faint)" }}
      >
        <span>Micaso{broker ? ` — gestionado por ${broker.nombreMarca}` : ""}</span>
        <span aria-hidden>·</span>
        <Link href="/privacidad" className="hover:underline" style={{ color: "var(--ink-muted)" }}>
          Privacidad
        </Link>
        <span aria-hidden>·</span>
        <Link href="/terminos" className="hover:underline" style={{ color: "var(--ink-muted)" }}>
          Términos
        </Link>
      </footer>
    </div>
  );
}
