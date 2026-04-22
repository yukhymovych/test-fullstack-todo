/// <reference lib="webworker" />
import {
  precacheAndRoute,
  createHandlerBoundToURL,
  matchPrecache,
} from 'workbox-precaching';
import { NavigationRoute, registerRoute } from 'workbox-routing';
import type { RouteHandlerCallbackOptions } from 'workbox-core/types.js';

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<{
    revision: string | null;
    url: string;
  }>;
};

// Take control of open pages on first install so offline works without
// a second reload. This is safe for a read-only cache strategy.
self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

precacheAndRoute(self.__WB_MANIFEST);

// In dev, `__WB_MANIFEST` is often empty (no precached shell). After one
// successful online navigation we store HTML as `/index.html` in NAV_CACHE so
// deep-link refreshes can still load the SPA shell offline.
const NAV_CACHE = 'rememo-app-shell-v1';

let precachedShellHandler: ReturnType<typeof createHandlerBoundToURL> | null = null;
try {
  precachedShellHandler = createHandlerBoundToURL('/index.html');
} catch {
  precachedShellHandler = null;
}

async function resolveAppShell(
  ctx: RouteHandlerCallbackOptions
): Promise<Response> {
  // SPA navigations are usually client-side, so the browser may never have cached
  // a document response for `/notes/:id`. NetworkFirst keyed by the full URL
  // then misses offline. Always prefer the precached SPA shell for navigations.
  const precached = await matchPrecache('/index.html');
  if (precached) return precached;

  if (precachedShellHandler) {
    try {
      const fromPrecache = await precachedShellHandler(ctx);
      if (fromPrecache) return fromPrecache;
    } catch {
      // ignore
    }
  }

  const navCache = await caches.open(NAV_CACHE);
  const canonicalShell = await navCache.match('/index.html');
  if (canonicalShell) return canonicalShell;

  try {
    const response = await fetch(ctx.request);
    const contentType = response.headers.get('content-type') ?? '';
    if (response.ok && contentType.includes('text/html')) {
      await navCache.put('/index.html', response.clone());
      return response;
    }
    if (response.ok) return response;
  } catch {
    // offline / network error
  }

  const runtime = await caches.match('/index.html');
  if (runtime) return runtime;

  return new Response(
    '<!doctype html><meta charset="utf-8"><title>Offline</title>' +
      '<body style="font-family:sans-serif;padding:24px;">' +
      '<h1>Offline</h1><p>This page is not available yet. Open the app once online to enable offline access.</p></body>',
    { status: 503, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  );
}

registerRoute(
  new NavigationRoute(resolveAppShell, {
    denylist: [/^\/api\//, /\.[^/]+$/],
  })
);

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
  const url = payload.url ?? '/notes';

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
  const targetUrl = String(event.notification.data?.url ?? '/notes');

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
