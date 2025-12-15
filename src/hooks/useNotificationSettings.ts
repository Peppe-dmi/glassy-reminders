import { useLocalStorage } from './useLocalStorage';

export type RingtoneType = 'default' | 'chime' | 'bell' | 'soft' | 'urgent' | 'silent';

export interface NotificationSettings {
  vibrationEnabled: boolean;
  ringtone: RingtoneType;
}

const DEFAULT_SETTINGS: NotificationSettings = {
  vibrationEnabled: true,
  ringtone: 'default',
};

export const RINGTONE_OPTIONS: { value: RingtoneType; label: string; emoji: string }[] = [
  { value: 'default', label: 'Standard', emoji: '🔔' },
  { value: 'chime', label: 'Carillon', emoji: '🎵' },
  { value: 'bell', label: 'Campana', emoji: '🔔' },
  { value: 'soft', label: 'Delicato', emoji: '🌸' },
  { value: 'urgent', label: 'Urgente', emoji: '⚡' },
  { value: 'silent', label: 'Silenzioso', emoji: '🔇' },
];

export function useNotificationSettings() {
  const [settings, setSettings] = useLocalStorage<NotificationSettings>(
    'notification-settings',
    DEFAULT_SETTINGS
  );

  const setVibrationEnabled = (enabled: boolean) => {
    setSettings({ ...settings, vibrationEnabled: enabled });
  };

  const setRingtone = (ringtone: RingtoneType) => {
    setSettings({ ...settings, ringtone });
  };

  const playPreview = (ringtone: RingtoneType) => {
    playRingtone(ringtone);
    if (settings.vibrationEnabled && 'vibrate' in navigator) {
      navigator.vibrate([200, 100, 200]);
    }
  };

  return {
    settings,
    setVibrationEnabled,
    setRingtone,
    playPreview,
  };
}

// Play ringtone sound
export function playRingtone(type: RingtoneType) {
  if (type === 'silent') return;

  try {
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    const playTone = (freq: number, startTime: number, duration: number, volume = 0.5) => {
      const osc = audioContext.createOscillator();
      const gain = audioContext.createGain();
      osc.connect(gain);
      gain.connect(audioContext.destination);
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(volume, startTime);
      gain.gain.exponentialRampToValueAtTime(0.01, startTime + duration);
      osc.start(startTime);
      osc.stop(startTime + duration);
    };

    const now = audioContext.currentTime;

    switch (type) {
      case 'default':
        playTone(880, now, 0.15);
        playTone(1108, now + 0.15, 0.15);
        playTone(1318, now + 0.3, 0.25);
        break;
      case 'chime':
        playTone(523, now, 0.2);
        playTone(659, now + 0.2, 0.2);
        playTone(784, now + 0.4, 0.2);
        playTone(1047, now + 0.6, 0.4);
        break;
      case 'bell':
        playTone(800, now, 0.5);
        playTone(400, now + 0.1, 0.4);
        break;
      case 'soft':
        playTone(440, now, 0.3, 0.3);
        playTone(550, now + 0.35, 0.3, 0.3);
        break;
      case 'urgent':
        playTone(1000, now, 0.1);
        playTone(1200, now + 0.1, 0.1);
        playTone(1000, now + 0.2, 0.1);
        playTone(1200, now + 0.3, 0.1);
        playTone(1400, now + 0.4, 0.2);
        break;
    }
  } catch (e) {
    console.log('Audio not supported');
  }
}

// Vibrate device
export function vibrateDevice(enabled: boolean) {
  if (enabled && 'vibrate' in navigator) {
    navigator.vibrate([200, 100, 200, 100, 300]);
  }
}

