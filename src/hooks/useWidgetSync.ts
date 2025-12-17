import { useEffect } from 'react';
import { Preferences } from '@capacitor/preferences';
import { Capacitor } from '@capacitor/core';

/**
 * Hook per sincronizzare i dati del localStorage con SharedPreferences native
 * in modo che il widget Android possa leggerli.
 */
export function useWidgetSync() {
  const isNative = Capacitor.isNativePlatform();

  useEffect(() => {
    if (!isNative) return;

    // Sincronizza i dati iniziali
    syncDataToWidget();

    // Ascolta i cambiamenti al localStorage
    const handleStorageChange = () => {
      syncDataToWidget();
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Sincronizza ogni volta che cambia il focus (quando si torna all'app)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        syncDataToWidget();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isNative]);

  return { syncDataToWidget };
}

// Funzione per sincronizzare i dati
async function syncDataToWidget() {
  try {
    // Leggi i dati dal localStorage
    const reminders = localStorage.getItem('reminder-items') || '[]';
    const categories = localStorage.getItem('reminder-categories') || '[]';

    // Scrivi su SharedPreferences native (accessibili dal widget)
    await Preferences.set({ key: 'reminders', value: reminders });
    await Preferences.set({ key: 'categories', value: categories });

    // Invia broadcast per aggiornare il widget
    if (Capacitor.getPlatform() === 'android') {
      try {
        // Usa un intent broadcast per aggiornare il widget
        const { App } = await import('@capacitor/app');
        // Il widget si aggiornerà automaticamente alla prossima richiesta
        console.log('📱 Dati sincronizzati con widget');
      } catch (e) {
        console.log('Widget sync: broadcast non disponibile');
      }
    }
  } catch (error) {
    console.error('Errore sincronizzazione widget:', error);
  }
}

// Esporta per uso manuale
export { syncDataToWidget };

