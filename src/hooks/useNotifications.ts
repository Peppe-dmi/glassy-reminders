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
    // Always play sound and vibrate, even if notifications aren't granted
    playNotificationSound();
    vibrateDevice();
    
    // Show in-app alert for mobile
    showInAppAlert(title, body);
    
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
        
        console.log('✅ Notifica inviata:', title);
      } catch (error) {
        console.error('❌ Errore invio notifica:', error);
      }
    } else {
      console.warn('⚠️ Notifiche browser non autorizzate, usando alert in-app');
    }
  }, [permissionState]);

  const vibrateDevice = useCallback(() => {
    // Vibrate on mobile devices
    if ('vibrate' in navigator) {
      // Pattern: vibrate 200ms, pause 100ms, vibrate 200ms, pause 100ms, vibrate 300ms
      navigator.vibrate([200, 100, 200, 100, 300]);
      console.log('📳 Vibrazione attivata');
    }
  }, []);

  const showInAppAlert = useCallback((title: string, body: string) => {
    // Create a visual alert that works on mobile
    const alertDiv = document.createElement('div');
    alertDiv.id = 'reminder-alert';
    alertDiv.innerHTML = `
      <div style="
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.8);
        z-index: 99999;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 20px;
        animation: fadeIn 0.3s ease;
      ">
        <div style="
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          border-radius: 20px;
          padding: 30px;
          max-width: 350px;
          width: 100%;
          text-align: center;
          box-shadow: 0 20px 60px rgba(0,0,0,0.5);
          animation: slideUp 0.3s ease;
        ">
          <div style="font-size: 50px; margin-bottom: 15px;">🔔</div>
          <h2 style="color: white; font-size: 20px; margin: 0 0 10px 0; font-weight: bold;">${title}</h2>
          <p style="color: rgba(255,255,255,0.9); font-size: 16px; margin: 0 0 25px 0;">${body}</p>
          <button onclick="document.getElementById('reminder-alert').remove()" style="
            background: white;
            color: #764ba2;
            border: none;
            padding: 15px 40px;
            border-radius: 30px;
            font-size: 16px;
            font-weight: bold;
            cursor: pointer;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
          ">OK, Ho capito!</button>
        </div>
      </div>
      <style>
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideUp { from { transform: translateY(50px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      </style>
    `;
    
    // Remove existing alert if any
    const existing = document.getElementById('reminder-alert');
    if (existing) existing.remove();
    
    document.body.appendChild(alertDiv);
    console.log('📱 Alert in-app mostrato');
  }, []);

  const playNotificationSound = useCallback(() => {
    try {
      // Create a loud notification sound using Web Audio API
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Play a sequence of tones (like a phone ringtone)
      const playTone = (freq: number, startTime: number, duration: number, volume: number) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = freq;
        oscillator.type = 'sine';
        
        gainNode.gain.setValueAtTime(volume, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + duration);
      };
      
      const now = audioContext.currentTime;
      
      // Play a pleasant notification melody (louder, volume 0.8)
      // First phrase
      playTone(880, now, 0.15, 0.8);        // A5
      playTone(1108, now + 0.15, 0.15, 0.8); // C#6
      playTone(1318, now + 0.3, 0.25, 0.8);  // E6
      
      // Repeat after pause
      playTone(880, now + 0.8, 0.15, 0.8);
      playTone(1108, now + 0.95, 0.15, 0.8);
      playTone(1318, now + 1.1, 0.25, 0.8);
      
      // Third time
      playTone(880, now + 1.6, 0.15, 0.8);
      playTone(1108, now + 1.75, 0.15, 0.8);
      playTone(1318, now + 1.9, 0.4, 0.8);
      
      console.log('🔊 Suono notifica riprodotto');
    } catch (e) {
      console.log('Audio not supported:', e);
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
