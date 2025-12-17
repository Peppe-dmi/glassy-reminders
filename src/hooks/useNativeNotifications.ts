import { useCallback, useEffect, useState } from 'react';
import { LocalNotifications, LocalNotificationSchema, Channel, ActionType } from '@capacitor/local-notifications';
import { Capacitor } from '@capacitor/core';

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

// Channel ID
const CHANNEL_ID = 'promemoria-alarm';

// Action type ID per notifiche alarm-style
const ALARM_ACTION_TYPE = 'alarm-actions';

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

  // Schedule notification with alarm-style actions
  const scheduleNotification = useCallback(async (options: NativeNotificationOptions) => {
    const settings = getNotificationSettings();
    const baseId = hashStringToNumber(options.id);
    
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
      return baseId;
    }

    try {
      const notification: LocalNotificationSchema = {
        id: baseId,
        title: `⏰ ${options.title}`,
        body: options.body,
        schedule: {
          at: options.scheduledAt,
          allowWhileIdle: true,
        },
        smallIcon: 'ic_stat_notification',
        largeIcon: 'ic_launcher',
        channelId: CHANNEL_ID,
        // Alarm-style: ongoing e fullScreenIntent per essere più invasivo
        ongoing: true, // Non può essere dismessa con swipe
        autoCancel: false,
        // Action buttons
        actionTypeId: ALARM_ACTION_TYPE,
        extra: {
          reminderId: options.id,
          scheduledTime: options.scheduledAt.getTime(),
        },
      };

      await LocalNotifications.schedule({ notifications: [notification] });
      
      console.log('✅ Notifica alarm-style programmata:', {
        id: baseId,
        title: options.title,
        at: options.scheduledAt.toLocaleString(),
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
      await LocalNotifications.cancel({
        notifications: [{ id: baseId }],
      });
      console.log('🗑️ Notifica cancellata:', baseId);
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
      title: 'Test Promemoria',
      body: 'Tocca per aprire l\'app, usa i pulsanti per gestire!',
      scheduledAt,
    });

    return !!result;
  }, [scheduleNotification]);

  // Snooze: ri-programma la notifica per 5 minuti dopo
  const snoozeNotification = useCallback(async (id: string, title: string, body: string) => {
    const snoozeTime = new Date(Date.now() + 5 * 60 * 1000); // 5 minuti
    
    // Prima cancella la notifica corrente
    await cancelNotification(id);
    
    // Poi riprogrammala
    await scheduleNotification({
      id: `${id}-snooze-${Date.now()}`,
      title: `🔄 ${title}`,
      body: body,
      scheduledAt: snoozeTime,
    });
    
    console.log('⏰ Notifica rimandatadi 5 minuti');
  }, [cancelNotification, scheduleNotification]);

  // Setup notification channels and action types for Android
  useEffect(() => {
    if (isNative) {
      setupNotificationChannels();
      setupActionTypes();
      setupNotificationListeners();
    }
  }, [isNative]);

  const setupNotificationChannels = async () => {
    try {
      // Create high-priority alarm channel
      const channel: Channel = {
        id: CHANNEL_ID,
        name: 'Promemoria',
        description: 'Notifiche per i tuoi promemoria',
        importance: 5, // MAX importance
        visibility: 1, // PUBLIC
        vibration: true,
        lights: true,
        lightColor: '#667eea',
      };

      await LocalNotifications.createChannel(channel);
      console.log('📢 Canale notifiche alarm creato');
    } catch (error) {
      console.log('Errore creazione canale:', error);
    }
  };

  const setupActionTypes = async () => {
    try {
      const actionTypes: ActionType[] = [
        {
          id: ALARM_ACTION_TYPE,
          actions: [
            {
              id: 'stop',
              title: 'Completata',
              destructive: false,
            },
            {
              id: 'snooze',
              title: '⏰ 5 min',
              destructive: false,
            },
          ],
        },
      ];

      await LocalNotifications.registerActionTypes({ types: actionTypes });
      console.log('📱 Action types registrati: Fatto, 5 min');
    } catch (error) {
      console.log('Errore registrazione action types:', error);
    }
  };

  const setupNotificationListeners = () => {
    // When notification is received
    LocalNotifications.addListener('localNotificationReceived', (notification) => {
      console.log('🔔 Notifica ricevuta:', notification);
    });

    // When user taps notification or action button
    LocalNotifications.addListener('localNotificationActionPerformed', async (action) => {
      console.log('👆 Azione su notifica:', action);
      
      const { actionId, notification } = action;
      const extra = notification.extra;
      
      if (actionId === 'snooze' && extra?.reminderId) {
        // Rimanda di 5 minuti
        const snoozeTime = new Date(Date.now() + 5 * 60 * 1000);
        
        // Cancel current
        await LocalNotifications.cancel({ 
          notifications: [{ id: notification.id }] 
        });
        
        // Schedule new one
        const newId = hashStringToNumber(`${extra.reminderId}-snooze-${Date.now()}`);
        await LocalNotifications.schedule({
          notifications: [{
            id: newId,
            title: `🔄 ${notification.title?.replace('⏰ ', '')}`,
            body: notification.body || '',
            schedule: { at: snoozeTime, allowWhileIdle: true },
            smallIcon: 'ic_stat_notification',
            largeIcon: 'ic_launcher',
            channelId: CHANNEL_ID,
            ongoing: true,
            autoCancel: false,
            actionTypeId: ALARM_ACTION_TYPE,
            extra: { reminderId: extra.reminderId },
          }],
        });
        
        console.log('⏰ Notifica rimandata di 5 minuti');
      } else if (actionId === 'stop' || actionId === 'tap') {
        // Stoppa - cancella la notifica
        await LocalNotifications.cancel({ 
          notifications: [{ id: notification.id }] 
        });
        console.log('✓ Notifica stoppata');
        
        // Dispatch event per l'app
        if (extra?.reminderId) {
          window.dispatchEvent(new CustomEvent('notification-stopped', { 
            detail: { reminderId: extra.reminderId } 
          }));
        }
      }
      
      // Open app on tap
      window.dispatchEvent(new CustomEvent('notification-clicked', { 
        detail: { reminderId: extra?.reminderId } 
      }));
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
    snoozeNotification,
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
