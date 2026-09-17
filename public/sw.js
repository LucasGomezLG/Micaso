// Service Worker para notificaciones Web Push en Micaso
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Micaso", body: event.data ? event.data.text() : "Novedades en tu búsqueda" };
  }

  const title = data.title || "Micaso";
  const options = {
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
    clients.matchAll({ type: "window", includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if (client.url && client.url.includes("/caso") && "focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
