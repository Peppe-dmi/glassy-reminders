import { createRoot } from "react-dom/client";
import { Capacitor } from '@capacitor/core';
import { StatusBar, Style } from '@capacitor/status-bar';
import App from "./App.tsx";
import "./index.css";

// Configure status bar for native apps
if (Capacitor.isNativePlatform()) {
  // Make status bar transparent with dark icons
  StatusBar.setOverlaysWebView({ overlay: false }).catch(() => {});
  StatusBar.setBackgroundColor({ color: '#0f0f12' }).catch(() => {});
  StatusBar.setStyle({ style: Style.Dark }).catch(() => {});
}

// Register Service Worker for web (not needed for native)
if (!Capacitor.isNativePlatform() && 'serviceWorker' in navigator) {
  window.addEventListener('load', async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('✅ Service Worker registrato:', registration.scope);
    } catch (error) {
      console.log('❌ Service Worker registration failed:', error);
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);
