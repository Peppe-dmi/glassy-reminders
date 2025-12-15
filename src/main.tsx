import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Register Service Worker for background notifications
if ('serviceWorker' in navigator) {
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
