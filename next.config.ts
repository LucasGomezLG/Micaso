import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";
import { randomUUID } from "crypto";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
  // El fallback de app/sw.ts sirve /offline desde el precache, pero la
  // página en sí nunca se precacheaba (solo sus chunks de JS): sin red,
  // una página no guardada mostraba el error del navegador. Revisión por
  // deploy, para que cada versión baje la /offline actual.
  additionalPrecacheEntries: [
    { url: "/offline", revision: process.env.VERCEL_GIT_COMMIT_SHA ?? randomUUID() },
  ],
});

const nextConfig: NextConfig = {
  // SEP23-11 (AUDITORIA-2026-09-23.md): sin esto, el panel y /superadmin
  // se podían embeber en un iframe ajeno (clickjacking sobre acciones como
  // "Eliminar mi cuenta"). Referrer-Policy además evita que la URL
  // completa (con el magic link de /login?t=…) viaje a otros sitios. Una
  // CSP completa queda para después: Leaflet, las tiles de OSM y Vercel
  // Analytics necesitan su propia lista.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
    ],
  },
};

export default withSerwist(nextConfig);
