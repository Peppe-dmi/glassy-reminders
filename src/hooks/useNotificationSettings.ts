import { useLocalStorage } from './useLocalStorage';

// I nomi corrispondono ai file in android/app/src/main/res/raw/
export type RingtoneType = 'default' | 'chime' | 'beep' | 'gentle' | 'urgent' | 'alert' | 'silent';

export interface NotificationSettings {
  vibrationEnabled: boolean;
  ringtone: RingtoneType;
  alarmMode: boolean; // Modalità sveglia: notifiche ripetute
}

const DEFAULT_SETTINGS: NotificationSettings = {
  vibrationEnabled: true,
  ringtone: 'chime',
  alarmMode: true, // Default ON per notifiche tipo sveglia
};

export const RINGTONE_OPTIONS: { value: RingtoneType; label: string; emoji: string }[] = [
  { value: 'default', label: 'Standard Android', emoji: '🔔' },
  { value: 'chime', label: 'Carillon', emoji: '🎵' },
  { value: 'beep', label: 'Beep', emoji: '📢' },
  { value: 'gentle', label: 'Delicato', emoji: '🌸' },
  { value: 'urgent', label: 'Urgente', emoji: '⚡' },
  { value: 'alert', label: 'Allarme', emoji: '🚨' },
  { value: 'silent', label: 'Silenzioso', emoji: '🔇' },
];

// Mappa suoneria -> nome file Android (senza estensione)
export function getAndroidSoundName(ringtone: RingtoneType): string | undefined {
  switch (ringtone) {
    case 'default': return undefined; // Usa suono default Android
    case 'chime': return 'chime';
    case 'beep': return 'beep';
    case 'gentle': return 'gentle';
    case 'urgent': return 'urgent';
    case 'alert': return 'alert';
    case 'silent': return undefined;
    default: return undefined;
  }
}

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

  const setAlarmMode = (enabled: boolean) => {
    setSettings({ ...settings, alarmMode: enabled });
  };

  const playPreview = (ringtone: RingtoneType) => {
    playRingtone(ringtone);
    if (settings.vibrationEnabled) {
      vibrateDevice(true);
    }
  };

  return {
    settings,
    setVibrationEnabled,
    setRingtone,
    setAlarmMode,
    playPreview,
  };
}

// Play ringtone sound (web fallback with synthesized tones)
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
      case 'beep':
        playTone(1000, now, 0.3);
        playTone(1000, now + 0.4, 0.3);
        break;
      case 'gentle':
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
      case 'alert':
        playTone(800, now, 0.5);
        playTone(400, now + 0.1, 0.4);
        break;
    }
  } catch (e) {
    console.log('Audio not supported');
  }
}

// Vibrate device with STRONG pattern for Samsung
export function vibrateDevice(enabled: boolean) {
  if (!enabled) return;
  
  if ('vibrate' in navigator) {
    // Pattern forte per Samsung: lungo-pausa-lungo-pausa-molto lungo
    navigator.vibrate([500, 200, 500, 200, 800]);
  }
}
