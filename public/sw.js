self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  const fallback = {
    body: "Open Errday to keep your day on track.",
    title: "Errday",
    url: "/today",
  };
  let payload = fallback;

  if (event.data) {
    try {
      payload = {
        ...fallback,
        ...event.data.json(),
      };
    } catch {
      payload = {
        ...fallback,
        body: event.data.text(),
      };
    }
  }

  const url = payload.url || "/today";

  event.waitUntil(
    self.registration.showNotification(payload.title || "Errday", {
      badge: "/icons/badge-96.png",
      body: payload.body,
      data: { url },
      icon: "/icons/icon-192.png",
      tag: payload.tag || "errday-reminder",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl = new URL(event.notification.data?.url || "/today", self.location.origin);
  if (targetUrl.origin !== self.location.origin) {
    targetUrl.href = `${self.location.origin}/today`;
  }

  event.waitUntil(
    self.clients.matchAll({ includeUncontrolled: true, type: "window" }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client && client.url.startsWith(self.location.origin)) {
          client.navigate(targetUrl.href);
          return client.focus();
        }
      }

      return self.clients.openWindow(targetUrl.href);
    }),
  );
});
