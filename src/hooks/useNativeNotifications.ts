import { useCallback, useEffect, useState } from 'react';
import { LocalNotifications, ScheduleOptions, LocalNotificationSchema } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

interface NativeNotificationOptions {
  id: string;
  title: string;
  body: string;
  scheduledAt: Date;
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
      // Fallback to web notifications
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
            });
            playNotificationSound();
            vibrateDevice();
          }
        }, delay);
      }
      return notificationId;
    }

    try {
      const notification: LocalNotificationSchema = {
        id: notificationId,
        title: options.title,
        body: options.body,
        schedule: {
          at: options.scheduledAt,
          allowWhileIdle: true, // Important: allows notification even in Doze mode
        },
        sound: 'default',
        smallIcon: 'ic_notification',
        largeIcon: 'ic_launcher',
        channelId: 'promemoria-channel',
        extra: {
          reminderId: options.id,
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
    const scheduledAt = new Date(now.getTime() + 5000); // 5 seconds from now

    const result = await scheduleNotification({
      id: `test-${Date.now()}`,
      title: '🧪 Test Notifica',
      body: 'Le notifiche native funzionano! 🎉',
      scheduledAt,
    });

    return !!result;
  }, [scheduleNotification]);

  // Setup notification channel for Android
  useEffect(() => {
    if (isNative) {
      setupNotificationChannel();
      setupNotificationListeners();
    }
  }, [isNative]);

  const setupNotificationChannel = async () => {
    try {
      await LocalNotifications.createChannel({
        id: 'promemoria-channel',
        name: 'Promemoria',
        description: 'Notifiche per i tuoi promemoria',
        importance: 5, // Max importance
        visibility: 1, // Public
        sound: 'default',
        vibration: true,
        lights: true,
        lightColor: '#667eea',
      });
      console.log('📢 Canale notifiche creato');
    } catch (error) {
      console.log('Canale già esistente o errore:', error);
    }
  };

  const setupNotificationListeners = () => {
    LocalNotifications.addListener('localNotificationReceived', (notification) => {
      console.log('🔔 Notifica ricevuta:', notification);
    });

    LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
      console.log('👆 Azione su notifica:', action);
      // Navigate to the reminder if needed
      const reminderId = action.notification.extra?.reminderId;
      if (reminderId) {
        // Could dispatch an event or use navigation
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
    hash = hash & hash; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

// Sound and vibration helpers for web fallback
function playNotificationSound() {
  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    const playTone = (freq: number, startTime: number, duration: number) => {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.5, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };
    const now = audioContext.currentTime;
    playTone(880, now, 0.15);
    playTone(1108, now + 0.15, 0.15);
    playTone(1318, now + 0.3, 0.25);
  } catch (e) {
    console.log('Audio not supported');
  }
}

function vibrateDevice() {
  if ('vibrate' in navigator) {
    navigator.vibrate([200, 100, 200, 100, 300]);
  }
}

