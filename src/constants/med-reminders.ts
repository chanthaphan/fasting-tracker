import type { MedReminderSettings } from '../types';

/** Reminders are off until the user turns them on; these are the default times. */
export const DEFAULT_MED_REMINDERS: MedReminderSettings = {
  enabled: false,
  times: { morning: '08:00', noon: '12:00', evening: '18:00', bedtime: '21:00' },
};
