// Service Worker for SSK Business Network Native Web Push Notifications

const DEFAULT_ICON = '/ssk-logo-256.png';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

function resolveTargetUrl(rawUrl) {
  try {
    const candidate = rawUrl && typeof rawUrl === 'string' ? rawUrl : '/notifications';
    const resolved = new URL(candidate, self.location.origin);
    if (resolved.origin !== self.location.origin) {
      return new URL('/notifications', self.location.origin).href;
    }
    return resolved.href;
  } catch {
    return new URL('/notifications', self.location.origin).href;
  }
}

// Handle push notification clicks (works when app is open, backgrounded, or completely closed)
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetHref = resolveTargetUrl(event.notification?.data?.url || '/notifications');
  const targetUrlObj = new URL(targetHref);
  const relativePath = `${targetUrlObj.pathname}${targetUrlObj.search}${targetUrlObj.hash}`;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(async (clientList) => {
      for (const client of clientList) {
        if (!client.url || !client.url.startsWith(self.location.origin)) continue;
        try {
          if ('focus' in client) {
            await client.focus();
          }
          if (typeof client.postMessage === 'function') {
            client.postMessage({
              type: 'SSK_NOTIFICATION_CLICK',
              url: relativePath,
            });
            return client;
          }
          if ('navigate' in client) {
            return client.navigate(targetHref);
          }
          return client;
        } catch {
          // Fall through to opening a fresh window
        }
      }

      if (self.clients.openWindow) {
        return self.clients.openWindow(targetHref);
      }
      return undefined;
    })
  );
});

// Handle background push messages even when website/tab is closed or minimized
self.addEventListener('push', (event) => {
  let data = {
    title: 'SSK Business Network',
    body: 'You have a new pending task reminder.',
    url: '/notifications',
    tag: 'ssk-notification',
  };

  if (event.data) {
    try {
      const parsed = event.data.json();
      data = { ...data, ...(parsed || {}) };
    } catch {
      const text = event.data.text();
      if (text) data.body = text;
    }
  }

  const targetUrl = resolveTargetUrl(data.url || data.link || '/notifications');
  const options = {
    body: data.body || data.message || 'You have an update waiting in SSK Business Network.',
    icon: data.icon || DEFAULT_ICON,
    badge: data.badge || DEFAULT_ICON,
    vibrate: [120, 60, 120],
    requireInteraction: false,
    renotify: true,
    timestamp: Date.now(),
    data: {
      url: targetUrl,
      slot: data.slot || null,
      pendingCount: data.pendingCount ?? null,
    },
    tag: data.tag || 'ssk-notification',
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'SSK Business Network', options)
  );
});

// Auto-refresh push subscription if the browser rotates VAPID/push keys
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const res = await fetch('/api/vapidPublicKey');
        if (!res.ok) return;
        const { publicKey } = await res.json();
        if (!publicKey) return;

        const padding = '='.repeat((4 - (publicKey.length % 4)) % 4);
        const base64 = (publicKey + padding).replace(/-/g, '+').replace(/_/g, '/');
        const raw = atob(base64);
        const keyBytes = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) keyBytes[i] = raw.charCodeAt(i);

        const nextSub = await self.registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: keyBytes,
        });

        const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        for (const client of clientList) {
          client.postMessage({
            type: 'SSK_PUSH_SUBSCRIPTION_ROTATED',
            subscription: nextSub.toJSON(),
          });
        }
      } catch {
        // Ignore transient rotation failure; client sync will recover on next launch
      }
    })()
  );
});
