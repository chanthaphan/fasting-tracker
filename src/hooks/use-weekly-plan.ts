import { useCallback, useEffect, useRef, useState } from 'react';
import type Anthropic from '@anthropic-ai/sdk';
import { useAppState } from '../context/use-app-state';
import { createAiClient, describeAiError, effortConfig } from '../utils/ai/client';
import { WEEKLY_PLAN_SYSTEM, languageDirective } from '../utils/ai/prompts';
import { buildHealthContext } from '../utils/ai/context-builder';
import { WEEKLY_PLAN_SCHEMA, isPlanCurrent, planHasWorkout, validateWeeklyPlan } from '../utils/ai/weekly-plan';
import { KEYS, isWeeklyPlanCache, loadFromStorage, saveToStorage } from '../utils/storage';
import { dateKey, todayKey } from '../utils/date-utils';
import type { TrainingGoal, WeeklyPlanCache } from '../types';

async function loadCurrentPlan(): Promise<WeeklyPlanCache | null> {
  try {
    const cached = await loadFromStorage(KEYS.AI_WEEKLY_PLAN, null as WeeklyPlanCache | null, isWeeklyPlanCache);
    return cached && isPlanCurrent(cached, todayKey()) ? cached : null;
  } catch {
    return null;
  }
}

export function useWeeklyPlan() {
  const { state } = useAppState();
  const [plan, setPlan] = useState<WeeklyPlanCache | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const planRef = useRef<WeeklyPlanCache | null>(null);
  planRef.current = plan;

  // Show a still-current cached plan on mount
  useEffect(() => {
    let cancelled = false;
    loadCurrentPlan().then((cached) => {
      if (!cancelled && cached) setPlan(cached);
    });
    return () => { cancelled = true; };
  }, []);

  /**
   * goalOverride carries a just-saved TrainingGoal past React's batched
   * dispatch — without it, generating right after saving the goal would
   * read the pre-save state and plan the week without the new goal.
   */
  const getPlan = useCallback(async (force = false, goalOverride?: TrainingGoal) => {
    const base = stateRef.current;
    const current = goalOverride ? { ...base, trainingGoal: goalOverride } : base;
    setError(null);

    if (!force) {
      if (planRef.current && isPlanCurrent(planRef.current, todayKey())) return;
      const cached = await loadCurrentPlan();
      if (cached) {
        setPlan(cached);
        return;
      }
    }

    setLoading(true);
    try {
      // Capture the start moment once — the request may cross midnight
      const startDate = new Date();
      const startKey = dateKey(startDate);
      const client = await createAiClient(current.aiSettings);
      const response = await client.messages.create({
        model: current.aiSettings.model,
        max_tokens: 4096,
        system: [
          {
            type: 'text',
            text: `${WEEKLY_PLAN_SYSTEM}\n${languageDirective(current.aiSettings.language)}`,
            cache_control: { type: 'ephemeral' },
          },
          { type: 'text', text: buildHealthContext(current) },
        ],
        output_config: {
          format: { type: 'json_schema', schema: WEEKLY_PLAN_SCHEMA as unknown as Record<string, unknown> },
          ...effortConfig(current.aiSettings.model, 'medium').output_config,
        },
        messages: [
          { role: 'user', content: `Plan my next 7 days of training starting today (${startKey}).` },
        ],
      });
      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('');
      const parsed = JSON.parse(text) as { days?: unknown; reason?: unknown };
      const days = validateWeeklyPlan(parsed, startDate);
      if (!days || !planHasWorkout(days)) throw new Error('unusable plan');
      const fresh: WeeklyPlanCache = {
        startDate: startKey,
        days,
        reason: typeof parsed.reason === 'string' ? parsed.reason : '',
        generatedAt: Date.now(),
      };
      saveToStorage(KEYS.AI_WEEKLY_PLAN, fresh);
      setPlan(fresh);
    } catch (err) {
      setError(describeAiError(err, current.aiSettings.language));
    } finally {
      setLoading(false);
    }
  }, []);

  return { plan, loading, error, getPlan };
}
