import type { WorkoutSession, WorkoutSet } from '../types';

/** Epley estimated one-rep max. */
export function epley1Rm(weightKg: number, reps: number): number {
  if (reps <= 0 || weightKg <= 0) return 0;
  if (reps === 1) return weightKg;
  return weightKg * (1 + reps / 30);
}

/** Canonical lift-name identity used everywhere lifts are matched by name. */
export function normalizeLiftName(name: string): string {
  return name.trim().toLowerCase();
}
const normalize = normalizeLiftName;

function finishedSessions(sessions: WorkoutSession[]): WorkoutSession[] {
  return sessions
    .filter((s) => s.endTime !== null)
    .sort((a, b) => a.startTime - b.startTime);
}

function completedSetsFor(session: WorkoutSession, liftName: string): WorkoutSet[] {
  const target = normalize(liftName);
  return session.exercises
    .filter((ex) => normalize(ex.name) === target)
    .flatMap((ex) => ex.sets.filter((set) => set.completed));
}

/** Sets from the most recent finished session containing this lift (for placeholders). */
export function getPreviousSets(sessions: WorkoutSession[], liftName: string): WorkoutSet[] | null {
  const finished = finishedSessions(sessions);
  for (let i = finished.length - 1; i >= 0; i--) {
    const sets = completedSetsFor(finished[i], liftName);
    if (sets.length > 0) return sets;
  }
  return null;
}

/** Top set = heaviest completed set (ties broken by reps). */
function topSet(sets: WorkoutSet[]): WorkoutSet | null {
  if (sets.length === 0) return null;
  return sets.reduce((best, s) =>
    s.weightKg > best.weightKg || (s.weightKg === best.weightKg && s.reps > best.reps) ? s : best
  );
}

export interface LiftHistoryPoint {
  date: string;
  topWeightKg: number;
  topReps: number;
  est1Rm: number;
  volume: number;
}

export interface LiftRecords {
  bestWeightKg: number;
  best1RmKg: number;
  history: LiftHistoryPoint[];
}

export function computeLiftRecords(sessions: WorkoutSession[], liftName: string): LiftRecords {
  const history: LiftHistoryPoint[] = [];
  for (const session of finishedSessions(sessions)) {
    const sets = completedSetsFor(session, liftName);
    const top = topSet(sets);
    if (!top) continue;
    history.push({
      date: session.date,
      topWeightKg: top.weightKg,
      topReps: top.reps,
      est1Rm: Math.round(Math.max(...sets.map((s) => epley1Rm(s.weightKg, s.reps))) * 10) / 10,
      volume: sets.reduce((sum, s) => sum + s.weightKg * s.reps, 0),
    });
  }
  return {
    bestWeightKg: history.reduce((max, h) => Math.max(max, h.topWeightKg), 0),
    best1RmKg: history.reduce((max, h) => Math.max(max, h.est1Rm), 0),
    history,
  };
}

/** Total kg lifted across completed sets. */
export function sessionVolume(session: WorkoutSession): number {
  return session.exercises.reduce(
    (sum, ex) => sum + ex.sets.reduce((s, set) => (set.completed ? s + set.weightKg * set.reps : s), 0),
    0
  );
}

export function sessionSetCount(session: WorkoutSession): number {
  return session.exercises.reduce((sum, ex) => sum + ex.sets.filter((s) => s.completed).length, 0);
}

export interface PrRecord {
  name: string;
  kind: 'weight' | '1rm';
  value: number;
}

/** PRs this session set compared to all prior finished sessions. */
export function detectPrs(session: WorkoutSession, priorSessions: WorkoutSession[]): PrRecord[] {
  const prs: PrRecord[] = [];
  const others = priorSessions.filter((s) => s.id !== session.id);
  for (const ex of session.exercises) {
    const sets = ex.sets.filter((s) => s.completed);
    const top = topSet(sets);
    if (!top) continue;
    const prior = computeLiftRecords(others, ex.name);
    if (top.weightKg > prior.bestWeightKg) {
      prs.push({ name: ex.name, kind: 'weight', value: top.weightKg });
    }
    const best1Rm = Math.max(...sets.map((s) => epley1Rm(s.weightKg, s.reps)));
    if (best1Rm > prior.best1RmKg && top.weightKg <= prior.bestWeightKg) {
      prs.push({ name: ex.name, kind: '1rm', value: Math.round(best1Rm * 10) / 10 });
    }
  }
  return prs;
}

/** Unique lift names across all sessions, most recently performed first. */
export function listLifts(sessions: WorkoutSession[]): { name: string; lastPerformed: string }[] {
  const seen = new Map<string, { name: string; lastPerformed: string }>();
  const sorted = [...sessions]
    .filter((s) => s.endTime !== null)
    .sort((a, b) => b.startTime - a.startTime);
  for (const session of sorted) {
    for (const ex of session.exercises) {
      const key = normalize(ex.name);
      if (!seen.has(key) && ex.sets.some((s) => s.completed)) {
        seen.set(key, { name: ex.name, lastPerformed: session.date });
      }
    }
  }
  return [...seen.values()];
}
