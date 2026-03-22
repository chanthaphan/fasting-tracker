const KEYS = {
  FOOD_ENTRIES: 'ft_food_entries',
  FASTING_SESSIONS: 'ft_fasting_sessions',
  WEIGHT_ENTRIES: 'ft_weight_entries',
  SETTINGS: 'ft_settings',
} as const;

export function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

export function saveToStorage(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // storage full — silently fail
  }
}

export { KEYS };
