import { RefreshCw, Sparkles } from 'lucide-react';
import { AiGate } from '../ai/ai-gate';
import { AiMarkdown } from '../ai/ai-markdown';
import { useDailyDigest } from '../../hooks/use-daily-digest';
import { useAiReady } from '../../hooks/use-ai';
import { HEALTH_DISCLAIMER } from '../../utils/ai/prompts';

export function DailyDigestCard() {
  const ready = useAiReady();
  return (
    <AiGate feature="get a personalized daily check-in on your dashboard">
      {ready && <DigestContent />}
    </AiGate>
  );
}

function DigestContent() {
  const { digest, loading, error, regenerate } = useDailyDigest();

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 mb-3 border border-gray-100 dark:border-gray-800">
      <div className="flex items-center justify-between mb-2">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-gray-500 dark:text-gray-400">
          <Sparkles size={15} className="text-brand-500" />
          Daily Check-in
        </h2>
        <button
          onClick={regenerate}
          disabled={loading}
          className="p-1.5 rounded-lg text-gray-400 hover:text-brand-500 hover:bg-gray-50 dark:hover:bg-gray-800 disabled:opacity-40"
          aria-label="Regenerate"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {loading && !digest && (
        <div className="space-y-2 animate-pulse">
          <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-full" />
          <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-11/12" />
          <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-4/5" />
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs text-red-500 font-medium">{error}</p>
          <button onClick={regenerate} className="text-xs text-brand-500 font-medium shrink-0">
            Retry
          </button>
        </div>
      )}

      {digest && !error && (
        <>
          <AiMarkdown
            text={digest.content}
            className={`text-sm text-gray-700 dark:text-gray-300 ${loading ? 'opacity-50' : ''}`}
          />
          <p className="text-[10px] text-gray-400 mt-2">
            Generated today · {digest.model} · {HEALTH_DISCLAIMER.en}
          </p>
        </>
      )}
    </div>
  );
}
