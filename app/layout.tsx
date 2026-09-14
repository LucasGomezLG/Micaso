import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/components/Nav";

export const metadata: Metadata = {
  title: "Casa",
  description: "Búsqueda de casa con crédito hipotecario BBVA — criterios, propiedades y checklist en un solo lugar.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className="h-full">
      <body className="min-h-full flex flex-col">
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
      </body>
    </html>
  );
}
