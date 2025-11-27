import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);

// Register service worker untuk PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js', { scope: '/' })
      .then((registration) => {
        console.log('✅ Service Worker registered:', registration);
        
        // Update service worker otomatis
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                console.log('🔄 New content available, please refresh!');
                // Bisa bikin notification ke user untuk refresh
              }
            });
          }
        });
      })
      .catch((error) => {
        console.error('❌ Service Worker registration failed:', error);
      });
  });
}

// Install PWA prompt handler
let deferredPrompt: any = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  console.log('💡 PWA install prompt ready');
  
  // Dispatch custom event untuk component lain bisa dengerin
  window.dispatchEvent(new CustomEvent('pwa-install-available'));
});

// Event setelah PWA berhasil di-install
window.addEventListener('appinstalled', () => {
  console.log('🎉 PWA successfully installed!');
  deferredPrompt = null;
});

// Export function untuk trigger install dari component
(window as any).installPWA = async () => {
  if (!deferredPrompt) {
    console.log('❌ Install prompt not available');
    return false;
  }
  
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  
  if (outcome === 'accepted') {
    console.log('✅ User accepted PWA install');
  } else {
    console.log('❌ User cancelled PWA install');
  }
  
  deferredPrompt = null;
  return outcome === 'accepted';
};

// Check if running as standalone PWA
(window as any).isPWAInstalled = () => {
  return window.matchMedia('(display-mode: standalone)').matches ||
         (window.navigator as any).standalone === true;
};