import { useCallback, useRef, useState } from 'react';
import Anthropic from '@anthropic-ai/sdk';
import { useAppState } from '../context/app-context';
import { createAiClient, describeAiError, effortConfig } from '../utils/ai/client';
import { FAST_PLAN_SYSTEM, FAST_SUMMARY_SYSTEM, languageDirective } from '../utils/ai/prompts';
import { buildHealthContext } from '../utils/ai/context-builder';
import { KEYS, isFastPlanCache, loadFromStorage, saveToStorage } from '../utils/storage';
import { todayKey } from '../utils/date-utils';
import type { FastingSession, FastPlanCache } from '../types';

export const SUGGESTED_TARGETS = [12, 16, 18, 20, 24, 36];

const PLAN_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['targetHours', 'reason'],
  properties: {
    targetHours: { type: 'number', enum: SUGGESTED_TARGETS },
    reason: { type: 'string' },
  },
} as const;

export interface FastFactorsInput {
  sleepHours: number;
  hydration: 'low' | 'normal' | 'high';
  caffeine: boolean;
  exerciseCals: number;
}

function clampTarget(hours: number): number {
  return SUGGESTED_TARGETS.reduce((best, t) =>
    Math.abs(t - hours) < Math.abs(best - hours) ? t : best
  );
}

export function useFastSuggestion() {
  const { state } = useAppState();
  const [suggestion, setSuggestion] = useState<FastPlanCache | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const getSuggestion = useCallback(async (factors: FastFactorsInput) => {
    const current = stateRef.current;
    const { aiSettings } = current;
    setError(null);

    // Serve today's cached suggestion if we have one
    const cached = await loadFromStorage(KEYS.AI_FAST_PLAN, null as FastPlanCache | null, isFastPlanCache);
    if (cached && cached.dateKey === todayKey()) {
      setSuggestion(cached);
      return;
    }

    setLoading(true);
    try {
      const client = createAiClient(aiSettings);
      const response = await client.messages.create({
        model: aiSettings.model,
        max_tokens: 512,
        system: [
          { type: 'text', text: `${FAST_PLAN_SYSTEM}\n${languageDirective(aiSettings.language)}`, cache_control: { type: 'ephemeral' } },
          { type: 'text', text: buildHealthContext(current) },
        ],
        output_config: {
          format: { type: 'json_schema', schema: PLAN_SCHEMA as unknown as Record<string, unknown> },
          ...effortConfig(aiSettings.model, 'low').output_config,
        },
        messages: [
          {
            role: 'user',
            content: `Suggest tonight's fasting target. Today: slept ${factors.sleepHours}h, hydration ${factors.hydration}, caffeine ${factors.caffeine ? 'yes' : 'no'}, exercise ${factors.exerciseCals} kcal burned.`,
          },
        ],
      });
      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('');
      const parsed = JSON.parse(text) as { targetHours?: unknown; reason?: unknown };
      const targetHours = typeof parsed.targetHours === 'number' ? clampTarget(parsed.targetHours) : 16;
      const fresh: FastPlanCache = {
        dateKey: todayKey(),
        targetHours,
        reason: typeof parsed.reason === 'string' ? parsed.reason : '',
        generatedAt: Date.now(),
      };
      saveToStorage(KEYS.AI_FAST_PLAN, fresh);
      setSuggestion(fresh);
    } catch (err) {
      setError(describeAiError(err, aiSettings.language));
    } finally {
      setLoading(false);
    }
  }, []);

  return { suggestion, loading, error, getSuggestion };
}

export function useFastSummary() {
  const { state } = useAppState();
  const [summary, setSummary] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const summarizeFast = useCallback(async (session: FastingSession) => {
    const current = stateRef.current;
    const { aiSettings } = current;
    if (!aiSettings.apiKey.trim() || session.endTime === null) return;
    setSummary('');
    setError(null);
    setStreaming(true);
    try {
      const client = createAiClient(aiSettings);
      const hours = ((session.endTime - session.startTime) / 3600000).toFixed(1);
      const stream = client.messages.stream({
        model: aiSettings.model,
        max_tokens: 1024,
        system: [
          { type: 'text', text: `${FAST_SUMMARY_SYSTEM}\n${languageDirective(aiSettings.language)}`, cache_control: { type: 'ephemeral' } },
          { type: 'text', text: buildHealthContext(current) },
        ],
        ...effortConfig(aiSettings.model, 'low'),
        messages: [
          {
            role: 'user',
            content: `I just finished a ${hours}h fast${session.targetHours ? ` (target ${session.targetHours}h)` : ''}. Recap it for me.`,
          },
        ],
      });
      stream.on('text', (delta) => setSummary((prev) => prev + delta));
      await stream.finalMessage();
    } catch (err) {
      if (!(err instanceof Anthropic.APIUserAbortError)) {
        setError(describeAiError(err, aiSettings.language));
      }
    } finally {
      setStreaming(false);
    }
  }, []);

  return { summary, streaming, error, summarizeFast };
}
