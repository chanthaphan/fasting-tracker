import { useEffect, useRef, useState } from 'react';
import { Send, Sparkles, Square, Trash2, Mic, MicOff, Loader2, Camera, ImagePlus } from 'lucide-react';
import { PageShell } from '../layout/page-shell';
import { AiGate } from '../ai/ai-gate';
import { AiMarkdown } from '../ai/ai-markdown';
import { useAiReady } from '../../hooks/use-ai';
import { useAssistantChat } from '../../hooks/use-assistant-chat';
import { compressImage } from '../../utils/ai/food-parse';
import { HEALTH_DISCLAIMER } from '../../utils/ai/prompts';
import { useT } from '../../i18n';
import type { MessageKey } from '../../i18n/messages';

const STARTER_KEYS: MessageKey[] = ['assist.starter1', 'assist.starter2', 'assist.starter3', 'assist.starter4'];

/** ผู้ช่วย: a chat that logs food, weight and medicine for the adult (ผู้ใหญ่) mode. */
export function AssistantPage() {
  const ready = useAiReady();
  const { t } = useT();
  return (
    <PageShell title={t('assist.title')}>
      <AiGate feature={t('assist.feature')}>
        {ready && <AssistantChat />}
      </AiGate>
    </PageShell>
  );
}

// Web Speech API is prefixed on Chrome/Safari and absent elsewhere
type Recognition = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  start: () => void;
  stop: () => void;
};
function speechRecognition(): (new () => Recognition) | null {
  const w = window as unknown as { SpeechRecognition?: new () => Recognition; webkitSpeechRecognition?: new () => Recognition };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

function AssistantChat() {
  const { t, lang } = useT();
  const { messages, partial, sending, working, error, send, stop, clear } = useAssistantChat();
  const [input, setInput] = useState('');
  const [listening, setListening] = useState(false);
  const recRef = useRef<Recognition | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const canListen = speechRecognition() !== null;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, partial, working]);

  useEffect(() => () => recRef.current?.stop(), []);

  const handleSend = () => {
    if (!input.trim() || sending) return;
    send(input);
    setInput('');
  };

  const handlePhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || sending) return;
    setPhotoError(null);
    try {
      const image = await compressImage(file);
      const text = input.trim();
      setInput('');
      void send(text || t('assist.photoPrompt'), image, t('assist.photoSent'));
    } catch {
      setPhotoError(t('snap.badImage'));
    }
  };

  const toggleListen = () => {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const Ctor = speechRecognition();
    if (!Ctor) return;
    const rec = new Ctor();
    rec.lang = lang === 'th' ? 'th-TH' : 'en-US';
    rec.interimResults = false;
    rec.continuous = false;
    rec.onresult = (e) => {
      const text = Array.from({ length: e.results.length }, (_, i) => e.results[i][0]?.transcript ?? '').join(' ').trim();
      if (text) setInput((prev) => (prev ? `${prev} ${text}` : text));
    };
    rec.onend = () => { setListening(false); recRef.current = null; };
    rec.onerror = () => { setListening(false); recRef.current = null; };
    recRef.current = rec;
    setListening(true);
    try {
      rec.start();
    } catch {
      setListening(false);
      recRef.current = null;
    }
  };

  return (
    <div className="pb-20">
      {messages.length > 0 && (
        <div className="flex justify-end mb-2">
          <button onClick={clear} className="flex items-center gap-1 text-xs text-gray-400 hover:text-red-500">
            <Trash2 size={13} />
            {t('assist.clear')}
          </button>
        </div>
      )}

      {messages.length === 0 && partial === null && (
        <div className="text-center py-8">
          <Sparkles size={32} className="mx-auto text-brand-400 mb-3" />
          <p className="text-base text-gray-600 dark:text-gray-300 mb-5 px-4">{t('assist.intro')}</p>
          <div className="flex flex-wrap justify-center gap-2">
            {STARTER_KEYS.map((k) => (
              <button
                key={k}
                onClick={() => send(t(k))}
                className="px-3.5 py-2 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 rounded-full text-sm font-medium hover:bg-brand-100 dark:hover:bg-brand-900/40 transition-colors"
              >
                {t(k)}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
        {messages.map((m, i) => (
          <MessageBubble key={i} role={m.role} content={m.content} actions={m.actions} image={m.image} />
        ))}
        {partial !== null && (
          working
            ? (
              <p role="status" className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400 px-1">
                <Loader2 size={16} className="animate-spin" />
                {t('assist.working')}
              </p>
            )
            : <MessageBubble role="assistant" content={partial || '…'} streaming />
        )}
        {(error || photoError) && <p role="alert" className="text-sm text-red-500 font-medium text-center">{error ?? photoError}</p>}
        <div ref={bottomRef} />
      </div>

      <p className="text-[11px] text-gray-400 text-center mt-4">{lang === 'th' ? HEALTH_DISCLAIMER.th : HEALTH_DISCLAIMER.en}</p>

      {/* Input bar pinned above the bottom nav (adult nav = 4rem + safe-area inset) */}
      <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] left-0 right-0 z-30 bg-white/90 dark:bg-gray-950/90 backdrop-blur-lg border-t border-gray-100 dark:border-gray-800 pl-[env(safe-area-inset-left)] pr-[env(safe-area-inset-right)]">
        <div className="max-w-lg md:max-w-3xl mx-auto flex items-center gap-2 px-4 py-2">
          {/* Camera (phones open the camera directly) and gallery/upload (any picture already on the device) */}
          <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto} aria-hidden tabIndex={-1} />
          <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} aria-hidden tabIndex={-1} />
          <button
            type="button"
            onClick={() => cameraRef.current?.click()}
            disabled={sending}
            aria-label={t('assist.photo')}
            className="p-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 disabled:opacity-40"
          >
            <Camera size={18} />
          </button>
          <button
            type="button"
            onClick={() => galleryRef.current?.click()}
            disabled={sending}
            aria-label={t('assist.upload')}
            className="p-3 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 disabled:opacity-40"
          >
            <ImagePlus size={18} />
          </button>
          {canListen && (
            <button
              type="button"
              onClick={toggleListen}
              aria-pressed={listening}
              aria-label={listening ? t('assist.listening') : t('assist.listen')}
              className={`p-3 rounded-xl transition-colors ${listening ? 'bg-red-500 text-white animate-pulse' : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300'}`}
            >
              {listening ? <MicOff size={18} /> : <Mic size={18} />}
            </button>
          )}
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleSend(); }}
            placeholder={listening ? t('assist.listening') : t('assist.placeholder')}
            className="flex-1 min-w-0 px-3 py-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 text-base"
          />
          {sending ? (
            <button onClick={stop} className="p-3 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded-xl" aria-label={t('assist.stop')}>
              <Square size={18} />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={!input.trim()}
              className="p-3 bg-brand-600 hover:bg-brand-700 text-white rounded-xl transition-colors disabled:opacity-40"
              aria-label={t('assist.send')}
            >
              <Send size={18} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ role, content, actions, image, streaming }: { role: 'user' | 'assistant'; content: string; actions?: string[]; image?: string; streaming?: boolean }) {
  const isUser = role === 'user';
  const { t } = useT();
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[88%] px-4 py-3 rounded-2xl text-base ${
          isUser
            ? 'bg-brand-500 text-white rounded-br-md whitespace-pre-wrap'
            : 'bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 rounded-bl-md'
        }`}
      >
        {image && <img src={image} alt={t('snap.photoAlt')} className="block max-h-48 w-auto rounded-xl mb-2 object-cover" />}
        {isUser ? content : <AiMarkdown text={content} />}
        {streaming && <span className="inline-block w-1.5 h-4 ml-0.5 bg-brand-400 animate-pulse align-middle rounded-sm" />}
        {actions && actions.length > 0 && (
          <ul className="mt-2 space-y-1">
            {actions.map((a, i) => (
              <li key={i} className="inline-block mr-1 px-2.5 py-1 rounded-lg bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-700 dark:text-gray-200">
                {a}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
