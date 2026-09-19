import { useEffect, useMemo, useState } from 'react';
import { useAppState } from '../context/use-app-state';
import { useTodayKey } from './use-today-key';
import { dosesForDay } from '../utils/medication';
import { alertUser } from '../utils/notify';
import { langForMode, translate } from '../i18n';
import { MED_SLOTS } from '../constants/med-slots';
import type { AppState, MedSlot } from '../types';

export interface DueSlot {
  slot: MedSlot;
  /** Untaken doses in this slot */
  remaining: number;
}

const CHECK_EVERY_MS = 30_000;
/** Remind again while doses stay untaken, this often, this many times */
const REPEAT_EVERY_MS = 30 * 60_000;
const MAX_REPEATS = 3;

const hhmm = (d: Date) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;

/** Slots whose reminder time has passed today and that still have untaken doses. */
export function dueSlots(state: AppState, today: string, now: Date = new Date()): DueSlot[] {
  if (!state.medReminders.enabled) return [];
  const nowKey = hhmm(now);
  const doses = dosesForDay(state.medications, state.medicationLogs, today);
  return MED_SLOTS.map((s) => s.value)
    .filter((slot) => state.medReminders.times[slot] <= nowKey)
    .map((slot) => ({ slot, remaining: doses.filter((d) => d.slot === slot && d.log === null).length }))
    .filter((d) => d.remaining > 0);
}

/** Read-only view of what is due right now, for banners. Re-checks every half minute. */
export function useDueSlots(): DueSlot[] {
  const { state } = useAppState();
  const today = useTodayKey();
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setTick((n) => n + 1), CHECK_EVERY_MS);
    return () => clearInterval(id);
  }, []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => dueSlots(state, today), [state.medReminders, state.medications, state.medicationLogs, today, tick]);
}

/**
 * Fires the reminder notification (and vibration) when a slot becomes due,
 * then again every half hour up to three times while doses stay untaken.
 * There is no server, so this works while the app is open or installed and
 * in the background; mount it once at the app root.
 */
export function useMedicationReminders(): void {
  const { state } = useAppState();
  const today = useTodayKey();
  const lang = langForMode(state.appMode);
  const [fired] = useState(() => new Map<string, { count: number; at: number }>());

  useEffect(() => {
    const check = () => {
      const now = Date.now();
      for (const { slot, remaining } of dueSlots(state, today, new Date(now))) {
        const key = `${today}|${slot}`;
        const prev = fired.get(key);
        if (prev && (prev.count > MAX_REPEATS || now - prev.at < REPEAT_EVERY_MS)) continue;
        fired.set(key, { count: (prev?.count ?? 0) + 1, at: now });
        const slotLabel = translate(lang, MED_SLOTS.find((s) => s.value === slot)!.labelKey);
        alertUser(
          translate(lang, 'remind.due', { slot: slotLabel }),
          translate(lang, 'remind.dueBody', { count: remaining }),
          `med-${key}`
        );
      }
    };
    check();
    const id = setInterval(check, CHECK_EVERY_MS);
    const onVisible = () => { if (document.visibilityState === 'visible') check(); };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [state, today, lang, fired]);
}
