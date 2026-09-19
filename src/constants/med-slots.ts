import type { MedSlot, MealRelation } from '../types';
import type { MessageKey } from '../i18n/messages';

/** Times of day a medicine can be scheduled, in display order. */
export const MED_SLOTS: { value: MedSlot; labelKey: MessageKey; icon: string }[] = [
  { value: 'morning', labelKey: 'med.slot.morning', icon: '🌅' },
  { value: 'noon', labelKey: 'med.slot.noon', icon: '☀️' },
  { value: 'evening', labelKey: 'med.slot.evening', icon: '🌆' },
  { value: 'bedtime', labelKey: 'med.slot.bedtime', icon: '🌙' },
];

export const MED_SLOT_ORDER: Record<MedSlot, number> = { morning: 0, noon: 1, evening: 2, bedtime: 3 };

export const MEAL_RELATIONS: { value: MealRelation; labelKey: MessageKey }[] = [
  { value: 'before', labelKey: 'med.before' },
  { value: 'after', labelKey: 'med.after' },
  { value: 'none', labelKey: 'med.none' },
];
