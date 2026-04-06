/// <reference lib="webworker" />
import { precacheAndRoute } from 'workbox-precaching';

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{
    revision: string | null;
    url: string;
  }>;
};

precacheAndRoute(self.__WB_MANIFEST);

self.addEventListener('push', (event) => {
  if (!event.data) return;

  let payload: {
    title?: string;
    body?: string;
    url?: string;
  } = {};
  try {
    payload = event.data.json() as typeof payload;
  } catch {
    return;
  }

  const title = payload.title ?? 'Rememo';
  const body = payload.body ?? '';
  const url = payload.url ?? '/learning';

  event.waitUntil(
    self.registration.showNotification(title, {
      body,
      icon: '/pwa-192x192.png',
      badge: '/pwa-192x192.png',
      tag: 'rememo-daily-reminder',
      requireInteraction: true,
      data: { url },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = String(event.notification.data?.url ?? '/learning');

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        const windowClient = client as WindowClient;
        if ('focus' in windowClient && windowClient.url.includes(self.location.origin)) {
          return windowClient.focus().then(() => windowClient.navigate(targetUrl));
        }
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
