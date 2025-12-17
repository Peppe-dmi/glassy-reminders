import { useLocalStorage } from './useLocalStorage';
import { useEffect } from 'react';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';

export interface UserSettings {
  userName: string;
}

const DEFAULT_SETTINGS: UserSettings = {
  userName: '',
};

export function useUserSettings() {
  const [settings, setSettings] = useLocalStorage<UserSettings>(
    'user-settings',
    DEFAULT_SETTINGS
  );

  // Sync to native SharedPreferences for notifications
  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      Preferences.set({ key: 'user-name', value: settings.userName });
    }
  }, [settings.userName]);

  const setUserName = (name: string) => {
    setSettings({ ...settings, userName: name });
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    let greeting = '';
    let emoji = '';
    
    if (hour < 12) {
      greeting = 'Buongiorno';
      emoji = '☀️';
    } else if (hour < 18) {
      greeting = 'Buon pomeriggio';
      emoji = '👋';
    } else {
      greeting = 'Buonasera';
      emoji = '😌';
    }
    
    if (settings.userName) {
      return `${greeting}, ${settings.userName}! ${emoji}`;
    }
    return `${greeting}! ${emoji}`;
  };

  return {
    settings,
    setUserName,
    getGreeting,
    userName: settings.userName,
  };
}
