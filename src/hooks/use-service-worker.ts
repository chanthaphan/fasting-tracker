import { useEffect, useRef, useState } from 'react';
import { registerSW } from 'virtual:pwa-register';

/**
 * Registers the service worker and reports when a new build is waiting.
 * `update()` activates the waiting worker and reloads the page.
 */
export function useServiceWorker() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const updateRef = useRef<((reload?: boolean) => Promise<void>) | null>(null);

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;
    updateRef.current = registerSW({
      onNeedRefresh: () => setNeedRefresh(true),
      onRegisteredSW: (_url, registration) => {
        // Check for a new build every hour while the app stays open
        if (!registration) return;
        const id = setInterval(() => registration.update().catch(() => {}), 60 * 60 * 1000);
        window.addEventListener('beforeunload', () => clearInterval(id), { once: true });
      },
    });
  }, []);

  const update = () => {
    setNeedRefresh(false);
    void updateRef.current?.(true);
  };
  const dismiss = () => setNeedRefresh(false);

  return { needRefresh, update, dismiss };
}
