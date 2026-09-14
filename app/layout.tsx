import type { Metadata } from "next";
import "./globals.css";

const TITLE = "Micaso — la búsqueda de casa de cada cliente, en un solo lugar";
const DESCRIPTION =
  "Micaso es la herramienta para corredores inmobiliarios: un link privado por familia, con criterios, propiedades, visitas y checklist en un solo lugar.";

// Sin dominio propio todavía (ver ARQUITECTURA.md sección 11) — cae a
// localhost en dev. Configurar NEXT_PUBLIC_SITE_URL en Vercel cuando se
// compre el dominio, para que las imágenes OG resuelvan con URL absoluta.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    locale: "es_AR",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="es" className="h-full">
      <body className="min-h-full">{children}</body>
    </html>
  );
}
