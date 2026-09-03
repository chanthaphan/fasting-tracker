import { useEffect, useState } from 'react';
import { todayKey } from '../utils/date-utils';

/**
 * Today's date key as stable React state (re-checked once a minute so a
 * page left open across midnight rolls over). Using state instead of calling
 * todayKey() in render keeps the value referentially stable for memoisation.
 */
export function useTodayKey(): string {
  const [today, setToday] = useState(() => todayKey());
  useEffect(() => {
    const id = setInterval(() => {
      const next = todayKey();
      setToday((prev) => (prev === next ? prev : next));
    }, 60_000);
    return () => clearInterval(id);
  }, []);
  return today;
}
