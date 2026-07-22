// Service Worker for SSK Business Network Push Notifications

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(clients.claim());
});

// Handle push notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const urlToOpen = event.notification?.data?.url || '/notifications';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) {
          if (client.url.includes(urlToOpen)) {
            return client.focus();
          } else {
            client.navigate(urlToOpen);
            return client.focus();
          }
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Handle background push messages
self.addEventListener('push', (event) => {
  let data = { title: 'SSK Business Network', body: 'You have a new update.', url: '/notifications' };
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body || data.message || 'New notification received.',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    vibrate: [100, 50, 100],
    data: { url: data.url || data.link || '/notifications' },
    tag: data.tag || 'ssk-notification'
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'SSK Business Network', options)
  );
});
