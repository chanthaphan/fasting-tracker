import { useCallback, useRef, useState } from 'react';
import type Anthropic from '@anthropic-ai/sdk';
import { useAppState } from '../context/app-context';
import { createAiClient, describeAiError, effortConfig } from '../utils/ai/client';
import { WORKOUT_PLAN_SYSTEM, languageDirective } from '../utils/ai/prompts';
import { buildHealthContext } from '../utils/ai/context-builder';
import { KEYS, isWorkoutPlanCache, loadFromStorage, saveToStorage } from '../utils/storage';
import { todayKey } from '../utils/date-utils';
import type { WorkoutPlanCache, WorkoutPlanExercise } from '../types';

const WORKOUT_PLAN_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['exercises', 'reason'],
  properties: {
    exercises: {
      type: 'array',
      minItems: 3,
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
    reason: { type: 'string' },
  },
} as const;

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function validatePlanExercises(value: unknown): WorkoutPlanExercise[] {
  if (!Array.isArray(value)) return [];
  const result: WorkoutPlanExercise[] = [];
  for (const raw of value) {
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

export function useWorkoutAi() {
  const { state } = useAppState();
  const [plan, setPlan] = useState<WorkoutPlanCache | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const getPlan = useCallback(async () => {
    const current = stateRef.current;
    const { aiSettings } = current;
    setError(null);

    const cached = await loadFromStorage(KEYS.AI_WORKOUT_PLAN, null as WorkoutPlanCache | null, isWorkoutPlanCache);
    if (cached && cached.dateKey === todayKey()) {
      setPlan(cached);
      return;
    }

    setLoading(true);
    try {
      const client = createAiClient(aiSettings);
      const response = await client.messages.create({
        model: aiSettings.model,
        max_tokens: 1024,
        system: [
          {
            type: 'text',
            text: `${WORKOUT_PLAN_SYSTEM}\n${languageDirective(aiSettings.language)}`,
            cache_control: { type: 'ephemeral' },
          },
          { type: 'text', text: buildHealthContext(current) },
        ],
        output_config: {
          format: { type: 'json_schema', schema: WORKOUT_PLAN_SCHEMA as unknown as Record<string, unknown> },
          ...effortConfig(aiSettings.model, 'low').output_config,
        },
        messages: [{ role: 'user', content: 'Suggest my next weight training workout.' }],
      });
      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('');
      const parsed = JSON.parse(text) as { exercises?: unknown; reason?: unknown };
      const exercises = validatePlanExercises(parsed.exercises);
      if (exercises.length === 0) throw new Error('empty plan');
      const fresh: WorkoutPlanCache = {
        dateKey: todayKey(),
        exercises,
        reason: typeof parsed.reason === 'string' ? parsed.reason : '',
        generatedAt: Date.now(),
      };
      saveToStorage(KEYS.AI_WORKOUT_PLAN, fresh);
      setPlan(fresh);
    } catch (err) {
      setError(describeAiError(err, aiSettings.language));
    } finally {
      setLoading(false);
    }
  }, []);

  return { plan, loading, error, getPlan };
}
