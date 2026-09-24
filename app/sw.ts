import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, RuntimeCaching, SerwistGlobalConfig, SerwistPlugin } from "serwist";
import { CacheFirst, ExpirationPlugin, NetworkFirst, NetworkOnly, Serwist, Strategy } from "serwist";
import { CASO_IMAGES_CACHE, CASO_PAGES_CACHE, LEGACY_PRIVATE_CACHES } from "@/lib/offlineCache";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// SEP23-16 (AUDITORIA-2026-09-23.md): el `defaultCache` de Serwist, usado
// tal cual, guardaba en el dispositivo cualquier página y cualquier
// `GET /api/*` de mismo origen: `/panel` (con la clave y el magic link de
// cada caso), `/superadmin`, el backup completo, presupuesto y teléfonos
// de la familia — y nada lo borraba al cerrar sesión. Ahora se cachea a
// propósito solo lo que la familia necesita para ver su caso sin señal
// (decisión de Lucas, 23 sept 2026), y se borra al cerrar sesión (ver
// lib/offlineCache.ts). Todo lo demás de mismo origen va siempre a la red.

const DAY_SECONDS = 24 * 60 * 60;
const isCasoPath = (pathname: string) => pathname === "/caso" || pathname.startsWith("/caso/");

// Del defaultCache se conservan solo los assets estáticos (JS/CSS de la
// app, fuentes, íconos) y el cache de otros orígenes (tiles del mapa,
// fotos subidas a Blob, 1 h). Las fotos de Blob sí son de la familia, así
// que `cross-origin` también se borra al cerrar sesión (lib/offlineCache.ts).
const STATIC_CACHE_NAMES = new Set([
  "google-fonts-webfonts",
  "google-fonts-stylesheets",
  "static-font-assets",
  "static-image-assets",
  "next-static-js-assets",
  "next-image",
  "static-audio-assets",
  "static-video-assets",
  "static-js-assets",
  "static-style-assets",
]);
const staticAssetCaching = defaultCache.filter(
  (entry) => entry.handler instanceof Strategy && STATIC_CACHE_NAMES.has(entry.handler.cacheName)
);
const crossOriginCaching = defaultCache.filter(
  (entry) => entry.handler instanceof Strategy && entry.handler.cacheName === "cross-origin"
);

// Solo respuestas directas y OK: al cerrar sesión, los prefetch de /caso
// que Next.js dispara después vuelven redirigidos a /login, y quedaban
// guardados bajo la URL de /caso (verificado con el build de producción
// en un navegador, 23 sept 2026).
const onlyDirectOkResponses: SerwistPlugin = {
  cacheWillUpdate: async ({ response }) => (response.ok && !response.redirected ? response : null),
};

const runtimeCaching: RuntimeCaching[] = [
  // Páginas de /caso (HTML y payloads RSC, incluidos los prefetch): de la
  // red si hay señal, y lo último que se vio si no. Con timeout, para no
  // quedarse colgado con señal muy mala.
  {
    matcher: ({ sameOrigin, url: { pathname } }) => sameOrigin && isCasoPath(pathname),
    handler: new NetworkFirst({
      cacheName: CASO_PAGES_CACHE,
      networkTimeoutSeconds: 8,
      plugins: [onlyDirectOkResponses, new ExpirationPlugin({ maxEntries: 64, maxAgeSeconds: 7 * DAY_SECONDS })],
    }),
  },
  // Fotos de las casas que pasan por el proxy propio (/api/image). Antes
  // de las reglas de assets: su URL termina en .jpg/.png y si no caería
  // en `static-image-assets`, que no se borra al cerrar sesión.
  {
    matcher: ({ sameOrigin, url: { pathname } }) => sameOrigin && pathname === "/api/image",
    method: "GET",
    handler: new CacheFirst({
      cacheName: CASO_IMAGES_CACHE,
      plugins: [onlyDirectOkResponses, new ExpirationPlugin({ maxEntries: 300, maxAgeSeconds: 7 * DAY_SECONDS })],
    }),
  },
  ...staticAssetCaching,
  // Todo lo demás de mismo origen (API, /panel, /superadmin, /login con
  // su magic link en la URL, la landing): nunca a disco. Pasa igual por
  // una estrategia para que un documento sin red caiga en /offline.
  {
    matcher: ({ sameOrigin }) => sameOrigin,
    handler: new NetworkOnly(),
  },
  ...crossOriginCaching,
];

// Instalaciones que ya tenían el service worker anterior guardaron datos
// en los caches del defaultCache — se borran apenas se activa este.
self.addEventListener("activate", (event) => {
  event.waitUntil(Promise.all(LEGACY_PRIVATE_CACHES.map((name) => caches.delete(name))));
});

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching,
  fallbacks: {
    entries: [
      {
        url: "/offline",
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },
});

serwist.addEventListeners();

self.addEventListener("push", (event) => {
  let data: { title?: string; body?: string; url?: string } = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Micaso", body: event.data ? event.data.text() : "Novedades en tu búsqueda" };
  }

  const title = data.title || "Micaso";
  const options: NotificationOptions & { vibrate?: number[] } = {
    body: data.body || "Novedades en tu búsqueda de casa",
    icon: "/icons/192",
    badge: "/icons/192",
    data: {
      url: data.url || "/caso",
    },
    vibrate: [100, 50, 100],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/caso";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url && client.url.includes("/caso") && "focus" in client) {
          (client as WindowClient).navigate(targetUrl);
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
