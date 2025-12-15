import { useCallback, useEffect, useRef, useState } from 'react';
import { Reminder } from '@/types/reminder';

export function useNotifications() {
  const scheduledNotifications = useRef<Map<string, NodeJS.Timeout>>(new Map());
  const [permissionState, setPermissionState] = useState<NotificationPermission>(
    typeof window !== 'undefined' && 'Notification' in window 
      ? Notification.permission 
      : 'denied'
  );

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      setPermissionState('granted');
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      setPermissionState(permission);
      return permission === 'granted';
    }

    setPermissionState('denied');
    return false;
  }, []);

  const sendNotification = useCallback((title: string, body: string, icon?: string) => {
    if (permissionState === 'granted') {
      try {
        const notification = new Notification(title, {
          body,
          icon: icon || '/favicon.ico',
          tag: `reminder-${Date.now()}`,
          requireInteraction: true,
          silent: false,
        });

        notification.onclick = () => {
          window.focus();
          notification.close();
        };

        // Play notification sound
        playNotificationSound();
        
        console.log('✅ Notifica inviata:', title);
      } catch (error) {
        console.error('❌ Errore invio notifica:', error);
      }
    } else {
      console.warn('⚠️ Notifiche non autorizzate:', permissionState);
    }
  }, [permissionState]);

  const playNotificationSound = useCallback(() => {
    try {
      // Create a simple beep using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
      
      // Second beep
      setTimeout(() => {
        const osc2 = audioContext.createOscillator();
        const gain2 = audioContext.createGain();
        osc2.connect(gain2);
        gain2.connect(audioContext.destination);
        osc2.frequency.value = 1000;
        osc2.type = 'sine';
        gain2.gain.setValueAtTime(0.3, audioContext.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
        osc2.start(audioContext.currentTime);
        osc2.stop(audioContext.currentTime + 0.2);
      }, 150);
    } catch (e) {
      console.log('Audio not supported');
    }
  }, []);

  const scheduleNotification = useCallback((reminder: Reminder, categoryName: string) => {
    if (!reminder.isAlarmEnabled || reminder.isCompleted) return;

    // Clear existing notification for this reminder
    const existingTimeout = scheduledNotifications.current.get(reminder.id);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    const reminderDate = new Date(reminder.date);
    if (reminder.time) {
      const [hours, minutes] = reminder.time.split(':').map(Number);
      reminderDate.setHours(hours, minutes, 0, 0);
    }

    // Subtract the minutes before for the alarm
    const alarmTime = new Date(reminderDate.getTime() - reminder.alarmMinutesBefore * 60 * 1000);
    const now = new Date();
    const delay = alarmTime.getTime() - now.getTime();

    if (delay > 0) {
      const timeout = setTimeout(() => {
        const timeString = reminder.alarmMinutesBefore === 0 
          ? 'È ora!' 
          : `Tra ${reminder.alarmMinutesBefore} minuti`;
        sendNotification(
          `📅 ${categoryName}: ${reminder.title}`,
          `${timeString}\n${reminder.description || ''}`,
        );
        scheduledNotifications.current.delete(reminder.id);
      }, delay);

      scheduledNotifications.current.set(reminder.id, timeout);
    }
  }, [sendNotification]);

  const cancelNotification = useCallback((reminderId: string) => {
    const timeout = scheduledNotifications.current.get(reminderId);
    if (timeout) {
      clearTimeout(timeout);
      scheduledNotifications.current.delete(reminderId);
    }
  }, []);

  const cancelAllNotifications = useCallback(() => {
    scheduledNotifications.current.forEach((timeout) => clearTimeout(timeout));
    scheduledNotifications.current.clear();
  }, []);

  useEffect(() => {
    return () => {
      cancelAllNotifications();
    };
  }, [cancelAllNotifications]);

  // Test function to verify notifications work
  const testNotification = useCallback(() => {
    if (permissionState === 'granted') {
      sendNotification(
        '🔔 Test Notifica',
        'Le notifiche funzionano correttamente!'
      );
      return true;
    }
    return false;
  }, [permissionState, sendNotification]);

  return {
    requestPermission,
    sendNotification,
    scheduleNotification,
    cancelNotification,
    cancelAllNotifications,
    testNotification,
    isSupported: 'Notification' in window,
    permission: permissionState,
  };
}
