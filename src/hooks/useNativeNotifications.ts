import { useCallback, useEffect, useState } from 'react';
import { LocalNotifications, LocalNotificationSchema, Channel } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';
import { RingtoneType, getAndroidSoundName, playRingtone, vibrateDevice } from './useNotificationSettings';

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
  return { vibrationEnabled: true, ringtone: 'chime', alarmMode: true };
}

// Channel IDs for each ringtone
const CHANNEL_IDS = {
  default: 'promemoria-default',
  chime: 'promemoria-chime',
  beep: 'promemoria-beep',
  gentle: 'promemoria-gentle',
  urgent: 'promemoria-urgent',
  alert: 'promemoria-alert',
  silent: 'promemoria-silent',
} as const;

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

  // Schedule multiple notifications for ALARM MODE (like an alarm clock)
  const scheduleNotification = useCallback(async (options: NativeNotificationOptions) => {
    const settings = getNotificationSettings();
    const baseId = hashStringToNumber(options.id);
    
    if (!isNative) {
      // Web fallback
      const now = new Date();
      const delay = options.scheduledAt.getTime() - now.getTime();
      
      if (delay > 0) {
        console.log(`⏰ Notifica web programmata tra ${Math.round(delay / 1000)} secondi`);
        
        // Schedule multiple notifications if alarm mode is on
        const intervals = settings.alarmMode ? [0, 60000, 120000] : [0]; // 0, 1min, 2min
        
        intervals.forEach((extraDelay, index) => {
          setTimeout(() => {
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification(`${options.title}${index > 0 ? ` (${index + 1})` : ''}`, {
                body: options.body,
                icon: '/icon-192.png',
                tag: `${options.id}-${index}`,
                requireInteraction: true,
                silent: true,
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
          }, delay + extraDelay);
        });
      }
      return baseId;
    }

    try {
      const notifications: LocalNotificationSchema[] = [];
      
      // Get the channel ID based on ringtone setting
      const ringtone = settings.ringtone as RingtoneType;
      const channelId = CHANNEL_IDS[ringtone] || CHANNEL_IDS.chime;
      
      // ALARM MODE: Schedule 3-4 notifications at 1 minute intervals
      const intervals = settings.alarmMode 
        ? [0, 60000, 120000, 180000] // 0, 1min, 2min, 3min
        : [0]; // Single notification
      
      for (let i = 0; i < intervals.length; i++) {
        const notifId = baseId + i;
        const scheduledTime = new Date(options.scheduledAt.getTime() + intervals[i]);
        
        const notification: LocalNotificationSchema = {
          id: notifId,
          title: i === 0 ? options.title : `⏰ ${options.title} (promemoria ${i + 1})`,
          body: options.body,
          schedule: {
            at: scheduledTime,
            allowWhileIdle: true, // Important for Doze mode on Samsung
          },
          smallIcon: 'ic_stat_notification',
          largeIcon: 'ic_launcher',
          // Use the correct channel for the selected ringtone
          channelId: channelId,
          // Extra data for handling
          extra: {
            reminderId: options.id,
            alarmIndex: i,
            totalAlarms: intervals.length,
          },
          // Make it high priority
          ongoing: false,
          autoCancel: true,
        };

        notifications.push(notification);
      }

      await LocalNotifications.schedule({ notifications });
      
      console.log('✅ Notifiche programmate:', {
        count: notifications.length,
        baseId,
        title: options.title,
        at: options.scheduledAt.toLocaleString(),
        channelId,
        alarmMode: settings.alarmMode,
      });

      return baseId;
    } catch (error) {
      console.error('❌ Errore scheduling notifica nativa:', error);
      return null;
    }
  }, [isNative]);

  const cancelNotification = useCallback(async (id: string) => {
    const baseId = hashStringToNumber(id);

    if (!isNative) {
      console.log('📱 Cancel notifica web (noop):', id);
      return;
    }

    try {
      // Cancel all alarm mode notifications (base + 0,1,2,3)
      const idsToCancel = [baseId, baseId + 1, baseId + 2, baseId + 3];
      await LocalNotifications.cancel({
        notifications: idsToCancel.map(nid => ({ id: nid })),
      });
      console.log('🗑️ Notifiche cancellate:', idsToCancel);
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
      body: 'Le notifiche funzionano! 🎉 Se hai modalità sveglia attiva, ne arriveranno altre.',
      scheduledAt,
    });

    return !!result;
  }, [scheduleNotification]);

  // Setup notification channels for Android (Samsung compatible)
  useEffect(() => {
    if (isNative) {
      setupNotificationChannels();
      setupNotificationListeners();
    }
  }, [isNative]);

  const setupNotificationChannels = async () => {
    try {
      // Delete old channels if they exist
      try {
        await LocalNotifications.deleteChannel({ id: 'promemoria-alarm' });
      } catch (e) { /* ignore */ }

      // Create a channel for each ringtone type - Android requires separate channels for different sounds
      const channels: Channel[] = [
        {
          id: CHANNEL_IDS.default,
          name: 'Promemoria - Standard',
          description: 'Notifiche con suono standard Android',
          importance: 5,
          visibility: 1,
          vibration: true,
          lights: true,
          lightColor: '#667eea',
        },
        {
          id: CHANNEL_IDS.chime,
          name: 'Promemoria - Carillon',
          description: 'Notifiche con suono carillon',
          importance: 5,
          visibility: 1,
          sound: 'chime.mp3',
          vibration: true,
          lights: true,
          lightColor: '#667eea',
        },
        {
          id: CHANNEL_IDS.beep,
          name: 'Promemoria - Beep',
          description: 'Notifiche con suono beep',
          importance: 5,
          visibility: 1,
          sound: 'beep.mp3',
          vibration: true,
          lights: true,
          lightColor: '#667eea',
        },
        {
          id: CHANNEL_IDS.gentle,
          name: 'Promemoria - Delicato',
          description: 'Notifiche con suono delicato',
          importance: 5,
          visibility: 1,
          sound: 'gentle.mp3',
          vibration: true,
          lights: true,
          lightColor: '#667eea',
        },
        {
          id: CHANNEL_IDS.urgent,
          name: 'Promemoria - Urgente',
          description: 'Notifiche con suono urgente',
          importance: 5,
          visibility: 1,
          sound: 'urgent.mp3',
          vibration: true,
          lights: true,
          lightColor: '#667eea',
        },
        {
          id: CHANNEL_IDS.alert,
          name: 'Promemoria - Allarme',
          description: 'Notifiche con suono allarme',
          importance: 5,
          visibility: 1,
          sound: 'alert.mp3',
          vibration: true,
          lights: true,
          lightColor: '#667eea',
        },
        {
          id: CHANNEL_IDS.silent,
          name: 'Promemoria - Silenzioso',
          description: 'Notifiche silenziose',
          importance: 4,
          visibility: 1,
          vibration: false,
          lights: true,
          lightColor: '#667eea',
        },
      ];

      for (const channel of channels) {
        await LocalNotifications.createChannel(channel);
      }

      console.log('📢 Canali notifiche Android creati per ogni suoneria');
    } catch (error) {
      console.log('Errore creazione canali:', error);
    }
  };

  const setupNotificationListeners = () => {
    // When notification is received
    LocalNotifications.addListener('localNotificationReceived', (notification) => {
      console.log('🔔 Notifica ricevuta:', notification);
    });

    // When user taps notification - cancel remaining alarms
    LocalNotifications.addListener('localNotificationActionPerformed', async (action) => {
      console.log('👆 Azione su notifica:', action);
      
      const extra = action.notification.extra;
      if (extra?.reminderId) {
        // User interacted - cancel remaining alarm notifications
        const baseId = hashStringToNumber(extra.reminderId);
        const remainingIds = [];
        
        for (let i = (extra.alarmIndex || 0) + 1; i < (extra.totalAlarms || 4); i++) {
          remainingIds.push({ id: baseId + i });
        }
        
        if (remainingIds.length > 0) {
          await LocalNotifications.cancel({ notifications: remainingIds });
          console.log('🗑️ Notifiche rimanenti cancellate:', remainingIds);
        }
        
        window.dispatchEvent(new CustomEvent('notification-clicked', { 
          detail: { reminderId: extra.reminderId } 
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
  // Make sure it's positive and not too close to MAX_INT to allow +3 for alarm mode
  return Math.abs(hash) % 1000000000;
}
