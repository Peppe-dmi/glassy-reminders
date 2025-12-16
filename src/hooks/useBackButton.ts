import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

export function useBackButton() {
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    // Solo su Android nativo
    if (!Capacitor.isNativePlatform()) return;

    const handleBackButton = App.addListener('backButton', ({ canGoBack }) => {
      // Se siamo nella home, chiedi conferma per uscire
      if (location.pathname === '/') {
        App.exitApp();
      } else {
        // Altrimenti torna indietro nella navigazione
        navigate(-1);
      }
    });

    return () => {
      handleBackButton.then(handler => handler.remove());
    };
  }, [navigate, location.pathname]);
}

