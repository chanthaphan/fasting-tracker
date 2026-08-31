import { useEffect, useRef, useState } from 'react';
import { Send, Sparkles, Square, Trash2 } from 'lucide-react';
import { PageShell } from '../layout/page-shell';
import { AiGate } from '../ai/ai-gate';
import { useAiReady } from '../../hooks/use-ai';
import { useCoachChat } from '../../hooks/use-coach-chat';
import { HEALTH_DISCLAIMER } from '../../utils/ai/prompts';

const STARTERS = [
  'วันนี้ควรกินอะไรดี?',
  'How is my weight trend?',
  'ควร fast กี่ชั่วโมงคืนนี้?',
  'Am I eating enough protein?',
];

export function CoachPage() {
  const ready = useAiReady();

  return (
    <PageShell title="Coach">
      <AiGate feature="chat with a coach that knows your fasting, food, and weight history">
        {ready && <CoachChat />}
      </AiGate>
    </PageShell>
  );
}

function CoachChat() {
  const { messages, partial, sending, error, send, stop, clear } = useCoachChat();
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, partial]);

  const handleSend = () => {
    if (!input.trim() || sending) return;
    send(input);
    setInput('');
  };

  return (
    <div className="pb-16">
      {messages.length > 0 && (
        <div className="flex justify-end mb-2">
          <button
            onClick={clear}
            className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500"
          >
            <Trash2 size={13} />
            Clear chat
          </button>
        </div>
      )}

      {messages.length === 0 && partial === null && (
        <div className="text-center py-8">
          <Sparkles size={28} className="mx-auto text-brand-400 mb-3" />
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
            Ask anything about your fasting, food, or weight.
          </p>
          <p className="text-xs text-gray-400 mb-5">ถามได้ทั้งภาษาไทยและอังกฤษ</p>
          <div className="flex flex-wrap justify-center gap-2">
            {STARTERS.map((s) => (
              <button
                key={s}
                onClick={() => send(s)}
                className="px-3 py-1.5 bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 rounded-full text-xs font-medium hover:bg-brand-100 dark:hover:bg-brand-900/40 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {messages.map((m, i) => (
          <MessageBubble key={i} role={m.role} content={m.content} />
        ))}
        {partial !== null && (
          <MessageBubble role="assistant" content={partial || '…'} streaming />
        )}
        {error && (
          <p className="text-xs text-red-500 font-medium text-center">{error}</p>
        )}
        <div ref={bottomRef} />
      </div>

      <p className="text-[10px] text-gray-400 text-center mt-4">
        {HEALTH_DISCLAIMER.en} · {HEALTH_DISCLAIMER.th}
      </p>

      {/* Input bar pinned above the bottom nav */}
      <div className="fixed bottom-14 left-0 right-0 z-30 bg-white/90 dark:bg-gray-950/90 backdrop-blur-lg border-t border-gray-100 dark:border-gray-800">
        <div className="max-w-lg mx-auto flex items-center gap-2 px-4 py-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
            placeholder="Ask your coach… / ถามโค้ชของคุณ"
            className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm"
          />
          {sending ? (
            <button
              onClick={stop}
              className="p-2.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl"
              aria-label="Stop"
            >
              <Square size={16} />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="p-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl transition-colors disabled:opacity-40"
              aria-label="Send"
            >
              <Send size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ role, content, streaming }: { role: 'user' | 'assistant'; content: string; streaming?: boolean }) {
  const isUser = role === 'user';
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm whitespace-pre-wrap ${
          isUser
            ? 'bg-brand-500 text-white rounded-br-md'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-md'
        }`}
      >
        {content}
        {streaming && <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-brand-400 animate-pulse align-middle rounded-sm" />}
      </div>
    </div>
  );
}
