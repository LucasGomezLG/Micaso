import type { MetadataRoute } from "next";

// Sin dominio propio todavía (ver ARQUITECTURA.md sección 11) — cae a
// localhost en dev. Configurar NEXT_PUBLIC_SITE_URL en Vercel cuando se
// compre el dominio.
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/caso", "/panel", "/api", "/login"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
