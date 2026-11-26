import { useCallback, useEffect, useRef, useState } from 'react';
import type Anthropic from '@anthropic-ai/sdk';
import { useAppState } from '../context/use-app-state';
import { aiConfigured, aiModelId } from '../utils/ai/provider';
import { createAiClient, describeAiError, effortConfig } from '../utils/ai/client';
import { DIGEST_SYSTEM, languageDirective } from '../utils/ai/prompts';
import { buildHealthContext } from '../utils/ai/context-builder';
import { KEYS, isDigestCache, loadFromStorage, saveToStorage } from '../utils/storage';
import { todayKey } from '../utils/date-utils';
import { IS_ARTIFACT } from '../utils/artifact';
import type { DailyDigestCache } from '../types';

/** Auto-generation runs at most once per day per app session. */
let autoAttemptedFor: string | null = null;

export function useDailyDigest() {
  const { state } = useAppState();
  const ready = aiConfigured(state.aiSettings);
  const [digest, setDigest] = useState<DailyDigestCache | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  const generate = useCallback(async () => {
    const current = stateRef.current;
    const { aiSettings } = current;
    if (!aiConfigured(aiSettings)) return;
    setLoading(true);
    setError(null);
    try {
      const client = await createAiClient(aiSettings);
      const response = await client.messages.create({
        model: aiModelId(aiSettings),
        max_tokens: 1024,
        system: [
          {
            type: 'text',
            text: `${DIGEST_SYSTEM}\n${languageDirective(aiSettings.language)}`,
            cache_control: { type: 'ephemeral' },
          },
          { type: 'text', text: buildHealthContext(current) },
        ],
        ...effortConfig(aiSettings.model, 'low'),
        messages: [{ role: 'user', content: "Write today's check-in." }],
      });
      const content = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === 'text')
        .map((b) => b.text)
        .join('')
        .trim();
      const fresh: DailyDigestCache = {
        dateKey: todayKey(),
        content,
        model: aiModelId(aiSettings),
        generatedAt: Date.now(),
      };
      saveToStorage(KEYS.AI_DIGEST, fresh);
      setDigest(fresh);
    } catch (err) {
      setError(describeAiError(err, aiSettings.language));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    loadFromStorage(KEYS.AI_DIGEST, null as DailyDigestCache | null, isDigestCache).then((cached) => {
      if (cancelled) return;
      const today = todayKey();
      if (cached && cached.dateKey === today) {
        setDigest(cached);
      } else if (ready && !IS_ARTIFACT && autoAttemptedFor !== today) {
        // (In a Claude Artifact each call spends the viewer's own Claude usage, so it waits for a tap)
        autoAttemptedFor = today;
        generate();
      }
    });
    return () => { cancelled = true; };
  }, [ready, generate]);

  return { digest, loading, error, regenerate: generate };
}
