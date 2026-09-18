import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import GlobalErrorToasts from "@/components/GlobalErrorToasts";
import { SITE_URL } from "@/lib/site";
import "./globals.css";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#14181d" },
  ],
};

const TITLE = "Micaso — la búsqueda de casa de cada cliente, en un solo lugar";
const DESCRIPTION =
  "Micaso es la herramienta para corredores inmobiliarios: un link privado por familia, con criterios, propiedades, visitas y checklist en un solo lugar.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "Micaso",
    statusBarStyle: "black-translucent",
  },
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
    <html lang="es" className="h-full" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("micaso-theme");if(t==="dark"||t==="light"){document.documentElement.setAttribute("data-theme",t);}}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full">
        {children}
        <Toaster theme="system" position="bottom-right" richColors closeButton />
        <GlobalErrorToasts />
      </body>
    </html>
  );
}
