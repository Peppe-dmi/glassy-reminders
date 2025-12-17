import { useCallback, useEffect, useState } from 'react';
import { LocalNotifications } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { NativeNotification } from '@/plugins/NativeNotification';

interface NativeNotificationOptions {
  id: string;
  title: string;
  body: string;
  scheduledAt: Date;
}

// Get notification settings from localStorage
function getNotificationSettings() {
  try {
    const stored = localStorage.getItem('notification-settings');
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.log('Error reading notification settings');
  }
  return { vibrationEnabled: true, alarmMode: true };
}

export function useNativeNotifications() {
  const [hasPermission, setHasPermission] = useState(false);
  const isNative = Capacitor.isNativePlatform();
  const isAndroid = Capacitor.getPlatform() === 'android';

  // Request permission on mount
  useEffect(() => {
    if (isNative) {
      checkPermission();
    }
  }, [isNative]);

  const checkPermission = useCallback(async () => {
    if (!isNative) {
      console.log('📱 Non in ambiente nativo, uso notifiche web');
      return false;
    }

    try {
      const permission = await LocalNotifications.checkPermissions();
      if (permission.display === 'granted') {
        setHasPermission(true);
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Errore controllo permessi:', error);
      return false;
    }
  }, [isNative]);

  const requestPermission = useCallback(async () => {
    if (!isNative) {
      if ('Notification' in window) {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      }
      return false;
    }

    try {
      const permission = await LocalNotifications.requestPermissions();
      const granted = permission.display === 'granted';
      setHasPermission(granted);
      console.log('📱 Permesso notifiche native:', granted ? '✅' : '❌');
      return granted;
    } catch (error) {
      console.error('❌ Errore richiesta permessi:', error);
      return false;
    }
  }, [isNative]);

  // Schedule notification using native plugin (Android) or Capacitor (iOS/Web)
  const scheduleNotification = useCallback(async (options: NativeNotificationOptions) => {
    const settings = getNotificationSettings();
    
    if (!isNative) {
      // Web fallback
      const now = new Date();
      const delay = options.scheduledAt.getTime() - now.getTime();
      
      if (delay > 0) {
        console.log(`⏰ Notifica web programmata tra ${Math.round(delay / 1000)} secondi`);
        
        setTimeout(() => {
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification(options.title, {
              body: options.body,
              icon: '/icon-192.png',
              tag: options.id,
              requireInteraction: true,
            });
            if (settings.vibrationEnabled && 'vibrate' in navigator) {
              navigator.vibrate([500, 200, 500, 200, 500]);
            }
          }
        }, delay);
      }
      return options.id;
    }

    // Android: usa plugin nativo per pulsanti che non aprono l'app
    if (isAndroid) {
      try {
        const result = await NativeNotification.schedule({
          id: options.id,
          title: options.title,
          body: options.body,
          timestamp: options.scheduledAt.getTime(),
        });
        
        console.log('✅ Notifica nativa Android programmata:', {
          id: result.id,
          title: options.title,
          at: options.scheduledAt.toLocaleString(),
        });
        
        return options.id;
      } catch (error) {
        console.error('❌ Errore scheduling notifica nativa:', error);
        return null;
      }
    }

    // iOS: usa Capacitor Local Notifications (fallback)
    try {
      const baseId = hashStringToNumber(options.id);
      await LocalNotifications.schedule({
        notifications: [{
          id: baseId,
          title: `⏰ ${options.title}`,
          body: options.body,
          schedule: {
            at: options.scheduledAt,
            allowWhileIdle: true,
          },
        }],
      });
      return options.id;
    } catch (error) {
      console.error('❌ Errore scheduling notifica:', error);
      return null;
    }
  }, [isNative, isAndroid]);

  const cancelNotification = useCallback(async (id: string) => {
    if (!isNative) {
      console.log('📱 Cancel notifica web (noop):', id);
      return;
    }

    // Android: usa plugin nativo
    if (isAndroid) {
      try {
        await NativeNotification.cancel({ id });
        console.log('🗑️ Notifica nativa cancellata:', id);
      } catch (error) {
        console.error('❌ Errore cancellazione notifica:', error);
      }
      return;
    }

    // iOS: usa Capacitor
    try {
      const baseId = hashStringToNumber(id);
      await LocalNotifications.cancel({
        notifications: [{ id: baseId }],
      });
      console.log('🗑️ Notifica cancellata:', baseId);
    } catch (error) {
      console.error('❌ Errore cancellazione notifica:', error);
    }
  }, [isNative, isAndroid]);

  const cancelAllNotifications = useCallback(async () => {
    if (!isNative) return;

    try {
      const pending = await LocalNotifications.getPending();
      if (pending.notifications.length > 0) {
        await LocalNotifications.cancel({
          notifications: pending.notifications.map(n => ({ id: n.id })),
        });
        console.log('🗑️ Tutte le notifiche cancellate');
      }
    } catch (error) {
      console.error('❌ Errore cancellazione notifiche:', error);
    }
  }, [isNative]);

  const testNotification = useCallback(async () => {
    if (!isNative) {
      // Web test
      if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Test Promemoria', {
          body: 'Le notifiche funzionano! 🎉',
          icon: '/icon-192.png',
        });
      }
      return true;
    }

    // Android: usa plugin nativo per test immediato
    if (isAndroid) {
      try {
        await NativeNotification.test();
        console.log('✅ Test notifica nativa mostrata');
        return true;
      } catch (error) {
        console.error('❌ Errore test notifica:', error);
        return false;
      }
    }

    // iOS fallback
    const now = new Date();
    const scheduledAt = new Date(now.getTime() + 3000);
    const result = await scheduleNotification({
      id: `test-${Date.now()}`,
      title: 'Test Promemoria',
      body: 'Le notifiche funzionano! 🎉',
      scheduledAt,
    });
    return !!result;
  }, [isNative, isAndroid, scheduleNotification]);

  return {
    isNative,
    hasPermission,
    requestPermission,
    scheduleNotification,
    cancelNotification,
    cancelAllNotifications,
    testNotification,
  };
}

// Helper to convert string ID to numeric ID
function hashStringToNumber(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash) % 1000000000;
}
