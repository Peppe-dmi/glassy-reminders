import { useCallback, useEffect, useRef } from 'react';
import { Reminder } from '@/types/reminder';

export function useNotifications() {
  const scheduledNotifications = useRef<Map<string, NodeJS.Timeout>>(new Map());

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!('Notification' in window)) {
      console.log('This browser does not support notifications');
      return false;
    }

    if (Notification.permission === 'granted') {
      return true;
    }

    if (Notification.permission !== 'denied') {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    }

    return false;
  }, []);

  const sendNotification = useCallback((title: string, body: string, icon?: string) => {
    if (Notification.permission === 'granted') {
      const notification = new Notification(title, {
        body,
        icon: icon || '/favicon.ico',
        tag: `reminder-${Date.now()}`,
        requireInteraction: true,
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      // Also play a sound
      try {
        const audio = new Audio('data:audio/wav;base64,UklGRl9vT19XQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YU');
        audio.volume = 0.5;
        audio.play().catch(() => {});
      } catch (e) {
        // Audio not supported
      }
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

  return {
    requestPermission,
    sendNotification,
    scheduleNotification,
    cancelNotification,
    cancelAllNotifications,
    isSupported: 'Notification' in window,
    permission: typeof window !== 'undefined' && 'Notification' in window 
      ? Notification.permission 
      : 'denied',
  };
}
