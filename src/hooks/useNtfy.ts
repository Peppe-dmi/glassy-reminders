import { useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';

interface NtfyConfig {
  enabled: boolean;
  topic: string;
  server: string;
}

const DEFAULT_CONFIG: NtfyConfig = {
  enabled: false,
  topic: '',
  server: 'https://ntfy.sh',
};

export function useNtfy() {
  const [config, setConfig] = useLocalStorage<NtfyConfig>('ntfy-config', DEFAULT_CONFIG);

  // Send immediate notification
  const sendNotification = useCallback(async (title: string, message: string, priority: number = 4) => {
    if (!config.enabled || !config.topic) {
      console.log('📵 ntfy non configurato');
      return false;
    }

    try {
      const response = await fetch(`${config.server}/${config.topic}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          topic: config.topic,
          title: title,
          message: message,
          priority: priority,
          tags: ['calendar', 'promemoria'],
        }),
      });

      if (response.ok) {
        console.log('✅ Notifica ntfy inviata:', title);
        return true;
      } else {
        console.error('❌ Errore ntfy:', response.status);
        return false;
      }
    } catch (error) {
      console.error('❌ Errore invio ntfy:', error);
      return false;
    }
  }, [config]);

  // Schedule a notification for a specific time using ntfy's scheduling feature
  const scheduleNotification = useCallback(async (
    title: string, 
    message: string, 
    scheduledTime: Date,
    priority: number = 4,
    reminderId?: string
  ) => {
    if (!config.enabled || !config.topic) {
      console.log('📵 ntfy non configurato');
      return false;
    }

    const now = new Date();
    if (scheduledTime <= now) {
      console.log('⏰ Orario già passato, invio immediato');
      return sendNotification(title, message, priority);
    }

    try {
      // ntfy supports scheduling with the "at" parameter (Unix timestamp)
      const unixTimestamp = Math.floor(scheduledTime.getTime() / 1000);
      
      const response = await fetch(`${config.server}/${config.topic}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-At': unixTimestamp.toString(), // Schedule for specific time
        },
        body: JSON.stringify({
          topic: config.topic,
          title: title,
          message: message,
          priority: priority,
          tags: ['calendar', 'alarm_clock'],
        }),
      });

      if (response.ok) {
        const data = await response.json();
        console.log('✅ Notifica ntfy programmata per:', scheduledTime.toLocaleString(), 'ID:', data.id);
        
        // Store the ntfy message ID to allow cancellation later
        if (reminderId && data.id) {
          const storedIds = JSON.parse(localStorage.getItem('ntfy-scheduled-ids') || '{}');
          storedIds[reminderId] = data.id;
          localStorage.setItem('ntfy-scheduled-ids', JSON.stringify(storedIds));
        }
        
        return true;
      } else {
        const errorText = await response.text();
        console.error('❌ Errore ntfy scheduling:', response.status, errorText);
        return false;
      }
    } catch (error) {
      console.error('❌ Errore scheduling ntfy:', error);
      return false;
    }
  }, [config, sendNotification]);

  const testNotification = useCallback(async () => {
    return sendNotification(
      '🧪 Test Promemoria',
      'Se vedi questo messaggio, le notifiche push funzionano! 🎉',
      4
    );
  }, [sendNotification]);

  const enableNtfy = useCallback((topic: string, server: string = 'https://ntfy.sh') => {
    setConfig({
      enabled: true,
      topic: topic.trim(),
      server: server.trim(),
    });
  }, [setConfig]);

  const disableNtfy = useCallback(() => {
    setConfig(prev => ({ ...prev, enabled: false }));
  }, [setConfig]);

  const generateTopic = useCallback(() => {
    // Generate a random topic name
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let topic = 'promemoria-';
    for (let i = 0; i < 8; i++) {
      topic += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return topic;
  }, []);

  return {
    config,
    sendNotification,
    scheduleNotification,
    testNotification,
    enableNtfy,
    disableNtfy,
    generateTopic,
    isEnabled: config.enabled && !!config.topic,
  };
}

