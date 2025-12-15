// Service Worker for Promemoria PWA
const CACHE_NAME = 'promemoria-v1';

// Install event
self.addEventListener('install', (event) => {
  console.log('📦 Service Worker installato');
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', (event) => {
  console.log('✅ Service Worker attivato');
  event.waitUntil(clients.claim());
});

// Listen for messages from the main app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SCHEDULE_NOTIFICATION') {
    const { id, title, body, scheduledTime } = event.data;
    scheduleNotification(id, title, body, scheduledTime);
  }
  
  if (event.data && event.data.type === 'CANCEL_NOTIFICATION') {
    const { id } = event.data;
    cancelScheduledNotification(id);
  }
});

// Store for scheduled notifications
const scheduledNotifications = new Map();

function scheduleNotification(id, title, body, scheduledTime) {
  const now = Date.now();
  const delay = scheduledTime - now;
  
  if (delay <= 0) {
    console.log('⏰ Notifica già scaduta, mostro subito');
    showNotification(title, body);
    return;
  }
  
  // Cancel existing if any
  cancelScheduledNotification(id);
  
  console.log(`⏰ Notifica programmata tra ${Math.round(delay / 1000)} secondi`);
  
  const timeoutId = setTimeout(() => {
    showNotification(title, body);
    scheduledNotifications.delete(id);
  }, delay);
  
  scheduledNotifications.set(id, timeoutId);
}

function cancelScheduledNotification(id) {
  if (scheduledNotifications.has(id)) {
    clearTimeout(scheduledNotifications.get(id));
    scheduledNotifications.delete(id);
    console.log(`❌ Notifica ${id} cancellata`);
  }
}

function showNotification(title, body) {
  console.log('🔔 Mostro notifica:', title);
  
  self.registration.showNotification(title, {
    body: body,
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    vibrate: [200, 100, 200, 100, 300],
    tag: 'promemoria-' + Date.now(),
    requireInteraction: true,
    actions: [
      { action: 'open', title: 'Apri' },
      { action: 'dismiss', title: 'Ignora' }
    ]
  });
}

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  if (event.action === 'dismiss') {
    return;
  }
  
  // Open the app
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      // If app is already open, focus it
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open new window
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

// Periodic background sync (if supported)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-reminders') {
    event.waitUntil(checkReminders());
  }
});

async function checkReminders() {
  // This runs periodically in background (when supported)
  console.log('🔄 Controllo promemoria in background...');
  
  // Get reminders from IndexedDB or localStorage
  // For now, just log
}

console.log('🚀 Service Worker caricato');

