import { useCallback, useEffect, useRef, useState } from 'react';
import type Anthropic from '@anthropic-ai/sdk';
import { useAppState } from '../context/app-context';
import { createAiClient, describeAiError, effortConfig } from '../utils/ai/client';
import { WEEKLY_PLAN_SYSTEM, languageDirective } from '../utils/ai/prompts';
import { buildHealthContext } from '../utils/ai/context-builder';
import { WEEKLY_PLAN_SCHEMA, validateWeeklyPlan } from '../utils/ai/weekly-plan';
import { KEYS, isWeeklyPlanCache, loadFromStorage, saveToStorage } from '../utils/storage';
import { todayKey } from '../utils/date-utils';
import type { WeeklyPlanCache } from '../types';

function planCoversToday(plan: WeeklyPlanCache): boolean {
  return plan.days.some((d) => d.date === todayKey());
}

export function useWeeklyPlan() {
  const { state } = useAppState();
  const [plan, setPlan] = useState<WeeklyPlanCache | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Show a still-valid cached plan on mount
  useEffect(() => {
    let cancelled = false;
    loadFromStorage(KEYS.AI_WEEKLY_PLAN, null as WeeklyPlanCache | null, isWeeklyPlanCache).then((cached) => {
      if (!cancelled && cached && planCoversToday(cached)) setPlan(cached);
    });
    return () => { cancelled = true; };
  }, []);

  const getPlan = useCallback(async (force = false) => {
    const current = stateRef.current;
    const { aiSettings } = current;
    setError(null);

    if (!force) {
      const cached = await loadFromStorage(KEYS.AI_WEEKLY_PLAN, null as WeeklyPlanCache | null, isWeeklyPlanCache);
      if (cached && planCoversToday(cached)) {
        setPlan(cached);
        return;
      }
    }

    setLoading(true);
    try {
      const startDate = new Date();
      const client = createAiClient(aiSettings);
      const response = await client.messages.create({
        model: aiSettings.model,
        max_tokens: 4096,
        system: [
          {
            type: 'text',
            text: `${WEEKLY_PLAN_SYSTEM}\n${languageDirective(aiSettings.language)}`,
            cache_control: { type: 'ephemeral' },
          },
          { type: 'text', text: buildHealthContext(current) },
        ],
        output_config: {
          format: { type: 'json_schema', schema: WEEKLY_PLAN_SCHEMA as unknown as Record<string, unknown> },
          ...effortConfig(aiSettings.model, 'medium').output_config,
        },
        messages: [
          { role: 'user', content: `Plan my next 7 days of training starting today (${todayKey()}).` },
        ],
      });
      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('');
      const parsed = JSON.parse(text) as { days?: unknown; reason?: unknown };
      const days = validateWeeklyPlan(parsed, startDate);
      if (!days) throw new Error('unusable plan');
      const fresh: WeeklyPlanCache = {
        startDate: todayKey(),
        days,
        reason: typeof parsed.reason === 'string' ? parsed.reason : '',
        generatedAt: Date.now(),
      };
      saveToStorage(KEYS.AI_WEEKLY_PLAN, fresh);
      setPlan(fresh);
    } catch (err) {
      setError(describeAiError(err, aiSettings.language));
    } finally {
      setLoading(false);
    }
  }, []);

  return { plan, loading, error, getPlan };
}
