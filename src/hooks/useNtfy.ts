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
          priority: priority, // 1-5, 5 = urgent
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
    testNotification,
    enableNtfy,
    disableNtfy,
    generateTopic,
    isEnabled: config.enabled && !!config.topic,
  };
}

