import { addDays } from 'date-fns';
import type { WeeklyPlanCache, WeeklyPlanDay, WorkoutPlanExercise } from '../../types';
import { dateKey } from '../date-utils';

export const WEEKLY_PLAN_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['days', 'reason'],
  properties: {
    days: {
      type: 'array',
      minItems: 7,
      maxItems: 7,
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['date', 'type'],
        properties: {
          date: { type: 'string' },
          type: { type: 'string', enum: ['workout', 'rest'] },
          name: { type: 'string' },
          note: { type: 'string' },
          exercises: {
            type: 'array',
            minItems: 1,
            maxItems: 8,
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['name', 'sets', 'targetWeightKg', 'targetReps'],
              properties: {
                name: { type: 'string' },
                sets: { type: 'integer', minimum: 1, maximum: 6 },
                targetWeightKg: { type: 'number', minimum: 0 },
                targetReps: { type: 'integer', minimum: 1, maximum: 30 },
              },
            },
          },
        },
      },
    },
    reason: { type: 'string' },
  },
} as const;

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function validateExercises(value: unknown): WorkoutPlanExercise[] {
  if (!Array.isArray(value)) return [];
  const result: WorkoutPlanExercise[] = [];
  for (const raw of value.slice(0, 8)) {
    if (typeof raw !== 'object' || raw === null) continue;
    const r = raw as Record<string, unknown>;
    if (typeof r.name !== 'string' || r.name.trim() === '') continue;
    result.push({
      name: r.name.trim(),
      sets: typeof r.sets === 'number' ? clamp(Math.round(r.sets), 1, 6) : 3,
      targetWeightKg: typeof r.targetWeightKg === 'number' ? Math.max(0, r.targetWeightKg) : 0,
      targetReps: typeof r.targetReps === 'number' ? clamp(Math.round(r.targetReps), 1, 30) : 8,
    });
  }
  return result;
}

/**
 * Defensive parse of the model's weekly plan. Always returns exactly 7
 * days with sequential dates from startDate (the model's dates are
 * advisory — position wins); malformed days degrade to rest days.
 * Returns null only when the payload has no usable days array.
 */
export function validateWeeklyPlan(value: unknown, startDate: Date): WeeklyPlanDay[] | null {
  if (typeof value !== 'object' || value === null) return null;
  const rawDays = (value as { days?: unknown }).days;
  if (!Array.isArray(rawDays) || rawDays.length === 0) return null;

  const days: WeeklyPlanDay[] = [];
  for (let i = 0; i < 7; i++) {
    const date = dateKey(addDays(startDate, i));
    const raw = rawDays[i];
    if (typeof raw !== 'object' || raw === null) {
      days.push({ date, type: 'rest' });
      continue;
    }
    const r = raw as Record<string, unknown>;
    const exercises = validateExercises(r.exercises);
    const isWorkout = r.type === 'workout' && exercises.length > 0;
    days.push({
      date,
      type: isWorkout ? 'workout' : 'rest',
      name: isWorkout && typeof r.name === 'string' && r.name.trim() ? r.name.trim() : undefined,
      exercises: isWorkout ? exercises : undefined,
      note: typeof r.note === 'string' && r.note.trim() ? r.note.trim() : undefined,
    });
  }
  return days;
}

/** A plan needs at least one training day to be worth caching. */
export function planHasWorkout(days: WeeklyPlanDay[]): boolean {
  return days.some((d) => d.type === 'workout');
}

/**
 * A cached plan is current while today is inside it but not its final
 * day — on the last day (or after) a fresh forward-looking week should
 * be generated instead of showing mostly-past days.
 */
export function isPlanCurrent(plan: WeeklyPlanCache, today: string): boolean {
  if (!Array.isArray(plan.days) || plan.days.length === 0) return false;
  const index = plan.days.findIndex((d) => d.date === today);
  return index >= 0 && index < plan.days.length - 1;
}
