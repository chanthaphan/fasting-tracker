import { useCallback, useEffect, useRef, useState } from 'react';
import type Anthropic from '@anthropic-ai/sdk';
import { useAppState } from '../context/use-app-state';
import { appReducer } from '../context/app-reducer';
import { createAiClient, describeAiError, effortConfig, isAbortError } from '../utils/ai/client';
import { ASSISTANT_SYSTEM, ASSISTANT_TOOLS, buildAssistantContext, executeAssistantTool } from '../utils/ai/assistant-tools';
import { KEYS, isChatHistory, loadFromStorage, saveToStorage } from '../utils/storage';
import { todayKey } from '../utils/date-utils';
import type { AppState, ChatMessageRecord } from '../types';

export interface ChatImage {
  mediaType: 'image/jpeg' | 'image/png' | 'image/webp';
  base64: string;
}

const MAX_HISTORY = 40;
/** How many tool rounds one user message may take before we stop */
const MAX_ROUNDS = 6;

/**
 * Chat for the adult (ผู้ใหญ่) mode. Unlike the coach, the assistant acts:
 * the model calls tools, each tool becomes reducer actions, and the reply
 * carries chips describing what was logged.
 */
export function useAssistantChat() {
  const { state, dispatch } = useAppState();
  const [messages, setMessages] = useState<ChatMessageRecord[]>([]);
  const [partial, setPartial] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [working, setWorking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const streamRef = useRef<{ abort: () => void } | null>(null);
  const partialRef = useRef('');
  // Latest state for tool execution without re-creating `send` on every change
  const stateRef = useRef<AppState>(state);
  stateRef.current = state;

  useEffect(() => {
    let cancelled = false;
    loadFromStorage(KEYS.AI_ASSISTANT_CHAT, [] as ChatMessageRecord[], isChatHistory).then((stored) => {
      if (!cancelled) setMessages(stored);
    });
    return () => { cancelled = true; };
  }, []);

  const persist = (msgs: ChatMessageRecord[]) => {
    const capped = msgs.slice(-MAX_HISTORY);
    // Photos are large and only matter for the turn they were sent in
    saveToStorage(KEYS.AI_ASSISTANT_CHAT, capped.map((m) => ({ role: m.role, content: m.content, ...(m.actions ? { actions: m.actions } : {}) })));
    return capped;
  };

  const send = useCallback(
    async (text: string, image?: ChatImage, imageLabel = '📷') => {
      const trimmed = text.trim();
      if ((!trimmed && !image) || sending) return;
      const { aiSettings } = stateRef.current;
      const today = todayKey();
      // A photo goes to the model once; the saved history keeps only a marker for it
      const shown = image ? (trimmed ? `${imageLabel} ${trimmed}` : imageLabel) : trimmed;
      const userContent: Anthropic.MessageParam['content'] = image
        ? [
            { type: 'image', source: { type: 'base64', media_type: image.mediaType, data: image.base64 } },
            { type: 'text', text: trimmed || 'ในรูปนี้มีอาหารอะไรบ้าง ประเมินปริมาณแล้วบันทึกให้ด้วย' },
          ]
        : trimmed;
      const history: Anthropic.MessageParam[] = [
        ...messages.map((m): Anthropic.MessageParam => ({ role: m.role, content: m.content })),
        { role: 'user', content: userContent },
      ];
      setMessages((prev) => [...prev, { role: 'user', content: shown, ...(image ? { image: `data:${image.mediaType};base64,${image.base64}` } : {}) }]);
      setSending(true);
      setWorking(false);
      setError(null);
      setPartial('');
      partialRef.current = '';

      const labels: string[] = [];
      // Tools see the state as it will be after earlier tools in this turn
      let snapshot = stateRef.current;

      const client = await createAiClient(aiSettings);
      try {
        const system: Anthropic.TextBlockParam[] = [
          { type: 'text', text: ASSISTANT_SYSTEM, cache_control: { type: 'ephemeral' } },
          { type: 'text', text: buildAssistantContext(snapshot, today) },
        ];
        let reply = '';
        for (let round = 0; round < MAX_ROUNDS; round++) {
          partialRef.current = '';
          setPartial('');
          const stream = client.messages.stream({
            model: aiSettings.model,
            max_tokens: 2000,
            ...effortConfig(aiSettings.model, 'low'),
            system,
            tools: ASSISTANT_TOOLS,
            messages: history,
          });
          streamRef.current = stream;
          stream.on('text', (delta) => {
            partialRef.current += delta;
            setPartial(partialRef.current);
          });
          const final = await stream.finalMessage();
          const text = final.content
            .filter((b): b is Anthropic.TextBlock => b.type === 'text')
            .map((b) => b.text)
            .join('')
            .trim();
          if (text) reply = text;
          const toolUses = final.content.filter((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');
          if (final.stop_reason !== 'tool_use' || toolUses.length === 0) break;

          setWorking(true);
          const results: Anthropic.ToolResultBlockParam[] = toolUses.map((tu) => {
            const outcome = executeAssistantTool(tu.name, tu.input, snapshot, today);
            for (const action of outcome.actions) {
              dispatch(action);
              snapshot = appReducer(snapshot, action);
            }
            labels.push(...outcome.labels);
            return { type: 'tool_result', tool_use_id: tu.id, content: outcome.result };
          });
          history.push({ role: 'assistant', content: final.content });
          history.push({ role: 'user', content: results });
          // The context block reflects the changes for the next round
          system[1] = { type: 'text', text: buildAssistantContext(snapshot, today) };
        }
        const record: ChatMessageRecord = {
          role: 'assistant',
          content: reply || (labels.length > 0 ? 'บันทึกให้แล้วค่ะ' : '…'),
          ...(labels.length > 0 ? { actions: labels } : {}),
        };
        setMessages((prev) => persist([...prev, record]));
      } catch (err) {
        if (isAbortError(err)) {
          const partialText = partialRef.current;
          if (partialText || labels.length > 0) {
            setMessages((prev) => persist([...prev, { role: 'assistant', content: partialText || 'หยุดแล้ว', ...(labels.length > 0 ? { actions: labels } : {}) }]));
          }
        } else {
          setError(describeAiError(err, 'th'));
        }
      } finally {
        streamRef.current = null;
        setPartial(null);
        setSending(false);
        setWorking(false);
      }
    },
    [messages, sending, dispatch]
  );

  const stop = useCallback(() => {
    streamRef.current?.abort();
  }, []);

  const clear = useCallback(() => {
    setMessages([]);
    setError(null);
    saveToStorage(KEYS.AI_ASSISTANT_CHAT, []);
  }, []);

  return { messages, partial, sending, working, error, send, stop, clear };
}
