import { useCallback, useEffect, useRef, useState } from 'react';
import Anthropic from '@anthropic-ai/sdk';
import { useAppState } from '../context/app-context';
import { createAiClient, describeAiError } from '../utils/ai/client';
import { COACH_SYSTEM, languageDirective } from '../utils/ai/prompts';
import { buildHealthContext } from '../utils/ai/context-builder';
import { KEYS, isChatHistory, loadFromStorage, saveToStorage } from '../utils/storage';
import type { ChatMessageRecord } from '../types';

const MAX_HISTORY = 40;

export function useCoachChat() {
  const { state } = useAppState();
  const [messages, setMessages] = useState<ChatMessageRecord[]>([]);
  const [partial, setPartial] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<{ abort: () => void } | null>(null);
  const partialRef = useRef('');

  useEffect(() => {
    let cancelled = false;
    loadFromStorage(KEYS.AI_CHAT, [] as ChatMessageRecord[], isChatHistory).then((stored) => {
      if (!cancelled) setMessages(stored);
    });
    return () => { cancelled = true; };
  }, []);

  const persist = (msgs: ChatMessageRecord[]) => {
    const capped = msgs.slice(-MAX_HISTORY);
    saveToStorage(KEYS.AI_CHAT, capped);
    return capped;
  };

  const send = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || sending) return;
      const { aiSettings } = state;
      const history: Anthropic.MessageParam[] = [
        ...messages.map((m): Anthropic.MessageParam => ({ role: m.role, content: m.content })),
        { role: 'user', content: trimmed },
      ];
      setMessages((prev) => [...prev, { role: 'user', content: trimmed }]);
      setSending(true);
      setError(null);
      setPartial('');
      partialRef.current = '';

      const client = createAiClient(aiSettings);
      try {
        const stream = client.messages.stream({
          model: aiSettings.model,
          max_tokens: 8000,
          system: [
            {
              type: 'text',
              text: `${COACH_SYSTEM}\n${languageDirective(aiSettings.language)}`,
              cache_control: { type: 'ephemeral' },
            },
            { type: 'text', text: buildHealthContext(state) },
          ],
          messages: history,
        });
        streamRef.current = stream;
        stream.on('text', (delta) => {
          partialRef.current += delta;
          setPartial(partialRef.current);
        });
        const final = await stream.finalMessage();
        const reply = final.content
          .filter((b): b is Anthropic.TextBlock => b.type === 'text')
          .map((b) => b.text)
          .join('');
        setMessages((prev) => persist([...prev, { role: 'assistant', content: reply }]));
      } catch (err) {
        if (err instanceof Anthropic.APIUserAbortError) {
          // Keep whatever streamed before the user stopped it
          const partialText = partialRef.current;
          if (partialText) {
            setMessages((prev) => persist([...prev, { role: 'assistant', content: partialText }]));
          }
        } else {
          setError(describeAiError(err, aiSettings.language));
        }
      } finally {
        streamRef.current = null;
        setPartial(null);
        setSending(false);
      }
    },
    [messages, sending, state]
  );

  const stop = useCallback(() => {
    streamRef.current?.abort();
  }, []);

  const clear = useCallback(() => {
    setMessages([]);
    setError(null);
    saveToStorage(KEYS.AI_CHAT, []);
  }, []);

  return { messages, partial, sending, error, send, stop, clear };
}
