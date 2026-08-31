import type { AppState, FoodEntry } from '../../types';
import { dateKey } from '../date-utils';
import { sumMacros } from '../macro-calc';
import { getTDEE } from '../tdee-calc';
import { computeStreaks } from '../fasting-streak';
import { computeLiftRecords, listLifts, sessionVolume } from '../workout-stats';

const FOOD_DAYS = 14;
const MAX_FASTS = 10;
const MAX_WEIGHTS = 8;
const MAX_TODAY_FOODS = 15;
const MAX_WORKOUTS = 8;
const MAX_LIFTS_PER_LINE = 6;
const MAX_LIFT_BESTS = 8;

function toKg(weight: number, unit: string): number {
  return unit === 'lbs' ? weight * 0.453592 : weight;
}

function round1(n: number): string {
  return (Math.round(n * 10) / 10).toString();
}

/**
 * Compact plaintext summary of the user's data for LLM context.
 * Deliberately windowed (14 days food, 10 fasts, 8 weigh-ins) so the
 * prompt stays small no matter how much history is stored.
 */
export function buildHealthContext(state: AppState, now: Date = new Date()): string {
  const lines: string[] = ['## User data'];
  const today = dateKey(now);

  if (state.userProfile) {
    const p = state.userProfile;
    lines.push(`Profile: ${p.gender}, ${p.age}y, ${p.heightCm}cm, activity ${p.activityLevel}`);
  }
  lines.push(
    `Daily goals: ${state.goals.calories} kcal, ${state.goals.protein}g protein, ${state.goals.carbs}g carbs, ${state.goals.fat}g fat`
  );
  if (state.weightGoal) {
    const g = state.weightGoal;
    lines.push(`Weight goal: ${g.targetWeight}${g.unit} by ${g.targetDate} (started ${g.startWeight}${g.unit} on ${g.startDate})`);
  }

  const sortedWeights = [...state.weightEntries].sort((a, b) => a.date.localeCompare(b.date));
  const latestWeight = sortedWeights[sortedWeights.length - 1] ?? null;

  const tdee = getTDEE(
    state.userProfile,
    latestWeight ? toKg(latestWeight.weight, latestWeight.unit) : null,
    state.foodEntries,
    state.exerciseEntries,
    state.weightEntries
  );
  if (tdee) {
    lines.push(`Estimated TDEE: ${tdee.tdee} kcal/day (${tdee.method === 'data' ? `from data, ${tdee.confidence} confidence` : 'formula'})`);
  }

  if (latestWeight) {
    const monthAgo = dateKey(new Date(now.getTime() - 30 * 86400000));
    const monthOld = sortedWeights.filter((w) => w.date <= monthAgo).pop() ?? sortedWeights[0];
    const delta = toKg(latestWeight.weight, latestWeight.unit) - toKg(monthOld.weight, monthOld.unit);
    lines.push(`Weight: ${latestWeight.weight}${latestWeight.unit} on ${latestWeight.date}; 30-day change ${delta >= 0 ? '+' : ''}${round1(delta)}kg`);
    const recent = sortedWeights.slice(-MAX_WEIGHTS);
    lines.push(`Recent weigh-ins: ${recent.map((w) => `${w.date}=${w.weight}${w.unit}`).join(', ')}`);
  }

  // Per-day food + exercise totals for the last FOOD_DAYS days
  const dayLines: string[] = [];
  for (let i = 0; i < FOOD_DAYS; i++) {
    const day = dateKey(new Date(now.getTime() - i * 86400000));
    const foods = state.foodEntries.filter((e) => e.date === day);
    const exercise = state.exerciseEntries.filter((e) => e.date === day);
    if (foods.length === 0 && exercise.length === 0) continue;
    const t = sumMacros(foods);
    const burned = exercise.reduce((s, e) => s + e.calories, 0);
    dayLines.push(
      `${day}: ${t.calories} kcal (P${Math.round(t.protein)} C${Math.round(t.carbs)} F${Math.round(t.fat)})${burned > 0 ? `, exercise -${burned} kcal` : ''}`
    );
  }
  if (dayLines.length > 0) {
    lines.push(`Last ${FOOD_DAYS} days (logged days only):`, ...dayLines);
  }

  // Completed fasts + streaks
  const completed = state.fastingSessions
    .filter((s) => s.endTime !== null)
    .sort((a, b) => b.startTime - a.startTime)
    .slice(0, MAX_FASTS);
  if (completed.length > 0) {
    const streaks = computeStreaks(state.fastingSessions);
    lines.push(`Fasting streak: ${streaks.current} days current, ${streaks.longest} longest`);
    lines.push(
      `Recent fasts: ${completed
        .map((s) => {
          const hours = (s.endTime! - s.startTime) / 3600000;
          const met = s.targetHours !== undefined ? (hours >= s.targetHours ? '✓' : '✗') : '';
          return `${dateKey(new Date(s.startTime))} ${round1(hours)}h${s.targetHours ? `/${s.targetHours}h${met}` : ''}`;
        })
        .join(', ')}`
    );
  }

  // Weight training
  const finishedWorkouts = state.workoutSessions
    .filter((s) => s.endTime !== null)
    .sort((a, b) => b.startTime - a.startTime)
    .slice(0, MAX_WORKOUTS);
  if (finishedWorkouts.length > 0) {
    lines.push('Recent weight-training workouts:');
    for (const w of finishedWorkouts) {
      const mins = Math.round((w.endTime! - w.startTime) / 60000);
      const liftSummaries = w.exercises
        .map((ex) => {
          const completed = ex.sets.filter((s) => s.completed);
          if (completed.length === 0) return null;
          const top = completed.reduce((best, s) => (s.weightKg > best.weightKg ? s : best));
          return `${ex.name} ${top.weightKg}kgx${top.reps}`;
        })
        .filter((s): s is string => s !== null)
        .slice(0, MAX_LIFTS_PER_LINE);
      lines.push(`${w.date} ${w.name} ${mins}min vol ${Math.round(sessionVolume(w))}kg: ${liftSummaries.join(', ')}`);
    }
    const bests = listLifts(state.workoutSessions)
      .slice(0, MAX_LIFT_BESTS)
      .map((lift) => {
        const r = computeLiftRecords(state.workoutSessions, lift.name);
        return `${lift.name} ${r.bestWeightKg}kg (1RM ${Math.round(r.best1RmKg)})`;
      });
    if (bests.length > 0) lines.push(`Lift bests: ${bests.join(', ')}`);
  }

  // Today
  const todayFoods = state.foodEntries.filter((e) => e.date === today);
  if (todayFoods.length > 0) {
    const shown = todayFoods.slice(0, MAX_TODAY_FOODS);
    lines.push(
      `Today's foods: ${shown.map((f: FoodEntry) => `${f.name} (${f.calories} kcal)`).join(', ')}${todayFoods.length > shown.length ? ` +${todayFoods.length - shown.length} more` : ''}`
    );
  }
  const active = state.fastingSessions.find((s) => s.id === state.activeFastingId);
  if (active) {
    const elapsed = (now.getTime() - active.startTime) / 3600000;
    lines.push(`Currently fasting: ${round1(elapsed)}h elapsed${active.targetHours ? ` of ${active.targetHours}h target` : ''}`);
  }

  lines.push(`Today's date: ${today}, local time ${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`);
  return lines.join('\n');
}

/** Whether the user's logged food names contain Thai script (used for 'auto' language). */
export function dataLooksThai(state: AppState): boolean {
  return state.foodEntries.slice(-30).some((e) => /[\u0E00-\u0E7F]/.test(e.name));
}
