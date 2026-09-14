import type { Metadata } from "next";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "Casa",
  description: "Búsqueda de casa con crédito hipotecario BBVA — criterios, propiedades y checklist en un solo lugar.",
};

export default function CasoLayout({ children }: LayoutProps<"/caso">) {
  return (
    <div className="flex min-h-full flex-col">
      <Nav />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8 sm:px-6">
        {children}
      </main>
      <footer
        className="border-t px-4 py-6 text-center text-xs sm:px-6"
        style={{ borderColor: "var(--border)", color: "var(--ink-faint)" }}
      >
        Casa — uso privado de Lucas, Abril y Carolina.
      </footer>
    </div>
  );
}
