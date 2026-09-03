import { useCallback, useSyncExternalStore } from 'react';

const PREF_KEY = 'ft_notifications';
const listeners = new Set<() => void>();

function readPref(): boolean {
  try {
    return localStorage.getItem(PREF_KEY) === '1';
  } catch {
    return false;
  }
}

function writePref(on: boolean) {
  try {
    localStorage.setItem(PREF_KEY, on ? '1' : '0');
  } catch {
    // preference is best-effort
  }
  listeners.forEach((l) => l());
}

export function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/** Short haptic tap; no-op where unsupported (iOS Safari). */
export function vibrate(pattern: number | number[] = 200): void {
  try {
    navigator.vibrate?.(pattern);
  } catch {
    // ignore
  }
}

/** Ask for permission (only from a user gesture). Resolves true when granted. */
export async function requestNotificationPermission(): Promise<boolean> {
  if (!notificationsSupported()) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  try {
    return (await Notification.requestPermission()) === 'granted';
  } catch {
    return false;
  }
}

/**
 * Buzz and, when the user opted in and granted permission, show a
 * system notification. Used for "rest is over" and "fast target reached".
 */
export function alertUser(title: string, body: string, tag: string): void {
  vibrate([200, 100, 200]);
  if (!readPref() || !notificationsSupported() || Notification.permission !== 'granted') return;
  try {
    const n = new Notification(title, { body, tag, icon: '/icons/icon-192.png' });
    n.onclick = () => { window.focus(); n.close(); };
  } catch {
    // Some browsers only allow notifications from a service worker; the vibration still fired
  }
}

/** Opt-in preference for system notifications, shared across components. */
export function useNotificationsPref(): [boolean, (on: boolean) => Promise<void>] {
  const on = useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
    readPref,
    () => false
  );
  const set = useCallback(async (next: boolean) => {
    if (next && !(await requestNotificationPermission())) {
      writePref(false);
      return;
    }
    writePref(next);
  }, []);
  return [on, set];
}
