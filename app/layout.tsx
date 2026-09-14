import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Micaso — la búsqueda de casa de cada cliente, en un solo lugar",
  description:
    "Micaso es la herramienta para corredores inmobiliarios: un link privado por familia, con criterios, propiedades, visitas y checklist en un solo lugar.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
