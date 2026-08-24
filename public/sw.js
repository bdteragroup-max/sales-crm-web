// receive push event and show notification
self.addEventListener('push', (event) => { 
  const data = event.data?.json() ?? {}; 
  event.waitUntil( 
    self.registration.showNotification(data.title, { 
      body: data.body,
      icon: data.icon || '/app-icon.jpg',
      badge: '/app-icon.jpg',
      data: { url: data.url }, 
      vibrate: [200, 100, 200] 
    }) 
  );
});

// Click notification → Open the relevant page
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((windowClients) => {
      // Check if there is already a window/tab open with the target URL
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        // If so, just focus it.
        if (client.url === event.notification.data?.url && 'focus' in client) {
          return client.focus();
        }
      }
      // If not, then open the target URL in a new window/tab.
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data?.url || '/');
      }
    })
  );
});
