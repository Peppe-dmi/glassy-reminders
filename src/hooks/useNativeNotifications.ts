import { useCallback, useEffect, useState } from 'react';
import { LocalNotifications, ScheduleOptions, LocalNotificationSchema } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { RingtoneType, playRingtone, vibrateDevice } from './useNotificationSettings';

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
  return { vibrationEnabled: true, ringtone: 'default' };
}

export function useNativeNotifications() {
  const [hasPermission, setHasPermission] = useState(false);
  const isNative = Capacitor.isNativePlatform();

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

  const scheduleNotification = useCallback(async (options: NativeNotificationOptions) => {
    const notificationId = hashStringToNumber(options.id);
    const settings = getNotificationSettings();
    
    if (!isNative) {
      // Fallback to web notification with setTimeout
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
              silent: true, // Always silent, we play our own sound
            });
            // Play selected ringtone
            if (settings.ringtone !== 'silent') {
              playRingtone(settings.ringtone as RingtoneType);
            }
            // Vibrate if enabled
            if (settings.vibrationEnabled) {
              vibrateDevice(true);
            }
          }
        }, delay);
      }
      return notificationId;
    }

    try {
      // Native notification - NO sound from Android, we handle it ourselves
      const notification: LocalNotificationSchema = {
        id: notificationId,
        title: options.title,
        body: options.body,
        schedule: {
          at: options.scheduledAt,
          allowWhileIdle: true,
        },
        // NO sound - we play our own custom sound
        sound: undefined,
        smallIcon: 'ic_notification',
        largeIcon: 'ic_launcher',
        // Use silent channel - sound is handled by our code
        channelId: settings.vibrationEnabled ? 'promemoria-vibration-only' : 'promemoria-silent',
        extra: {
          reminderId: options.id,
          ringtone: settings.ringtone,
          vibration: settings.vibrationEnabled,
        },
      };

      const scheduleOptions: ScheduleOptions = {
        notifications: [notification],
      };

      await LocalNotifications.schedule(scheduleOptions);
      console.log('✅ Notifica nativa programmata:', {
        id: notificationId,
        title: options.title,
        at: options.scheduledAt.toLocaleString(),
        vibration: settings.vibrationEnabled,
        ringtone: settings.ringtone,
      });

      return notificationId;
    } catch (error) {
      console.error('❌ Errore scheduling notifica nativa:', error);
      return null;
    }
  }, [isNative]);

  const cancelNotification = useCallback(async (id: string) => {
    const notificationId = hashStringToNumber(id);

    if (!isNative) {
      console.log('📱 Cancel notifica web (noop):', id);
      return;
    }

    try {
      await LocalNotifications.cancel({
        notifications: [{ id: notificationId }],
      });
      console.log('🗑️ Notifica cancellata:', notificationId);
    } catch (error) {
      console.error('❌ Errore cancellazione notifica:', error);
    }
  }, [isNative]);

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
    const now = new Date();
    const scheduledAt = new Date(now.getTime() + 3000); // 3 seconds from now

    const result = await scheduleNotification({
      id: `test-${Date.now()}`,
      title: '🧪 Test Notifica',
      body: 'Le notifiche funzionano! 🎉',
      scheduledAt,
    });

    return !!result;
  }, [scheduleNotification]);

  // Setup notification channels for Android
  useEffect(() => {
    if (isNative) {
      setupNotificationChannels();
      setupNotificationListeners();
    }
  }, [isNative]);

  const setupNotificationChannels = async () => {
    try {
      // Channel with vibration only (no sound - we handle sound ourselves)
      await LocalNotifications.createChannel({
        id: 'promemoria-vibration-only',
        name: 'Promemoria',
        description: 'Notifiche promemoria con vibrazione',
        importance: 5,
        visibility: 1,
        sound: undefined, // No Android sound
        vibration: true,
        lights: true,
        lightColor: '#667eea',
      });

      // Silent channel (no sound, no vibration)
      await LocalNotifications.createChannel({
        id: 'promemoria-silent',
        name: 'Promemoria (silenzioso)',
        description: 'Notifiche promemoria silenziose',
        importance: 5,
        visibility: 1,
        sound: undefined,
        vibration: false,
        lights: true,
        lightColor: '#667eea',
      });

      console.log('📢 Canali notifiche creati (senza suono Android)');
    } catch (error) {
      console.log('Canale già esistente o errore:', error);
    }
  };

  const setupNotificationListeners = () => {
    // When notification is received - play OUR sound
    LocalNotifications.addListener('localNotificationReceived', (notification) => {
      console.log('🔔 Notifica ricevuta:', notification);
      
      // Get settings and play our custom sound
      const settings = getNotificationSettings();
      
      // Play the selected ringtone (not Android default)
      if (settings.ringtone !== 'silent') {
        playRingtone(settings.ringtone as RingtoneType);
      }
      
      // Vibrate is handled by the channel, but we can reinforce it
      if (settings.vibrationEnabled && 'vibrate' in navigator) {
        navigator.vibrate([200, 100, 200, 100, 300]);
      }
    });

    LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
      console.log('👆 Azione su notifica:', action);
      const reminderId = action.notification.extra?.reminderId;
      if (reminderId) {
        window.dispatchEvent(new CustomEvent('notification-clicked', { 
          detail: { reminderId } 
        }));
      }
    });
  };

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

// Helper to convert string ID to numeric ID (required by Capacitor)
function hashStringToNumber(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}
