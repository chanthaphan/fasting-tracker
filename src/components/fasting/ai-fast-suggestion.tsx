import { Loader2, Sparkles } from 'lucide-react';
import { useAiReady } from '../../hooks/use-ai';
import { useFastSuggestion, type FastFactorsInput } from '../../hooks/use-fast-ai';

interface AiFastSuggestionProps {
  factors: FastFactorsInput;
  onApply: (targetHours: number) => void;
}

/**
 * Lazy AI target suggestion — only calls the API when the user taps
 * "Get suggestion" (cached per day). Hidden entirely when no key is set;
 * the target picker below works exactly as before.
 */
export function AiFastSuggestion({ factors, onApply }: AiFastSuggestionProps) {
  const ready = useAiReady();
  const { suggestion, loading, error, getSuggestion } = useFastSuggestion();

  if (!ready) return null;

  return (
    <div className="w-full">
      {!suggestion && (
        <button
          onClick={() => getSuggestion(factors)}
          disabled={loading}
          className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-white dark:bg-gray-900 border border-dashed border-brand-200 dark:border-brand-800 rounded-xl text-xs font-medium text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20 transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
          {loading ? 'Thinking…' : "Get tonight's AI suggestion"}
        </button>
      )}

      {suggestion && (
        <div className="bg-white dark:bg-gray-900 rounded-xl p-3 border border-brand-100 dark:border-brand-900/50">
          <div className="flex items-center justify-between gap-2">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400">
              <Sparkles size={14} className="text-brand-500" />
              Suggested: <span className="text-brand-600 dark:text-brand-400 font-bold">{suggestion.targetHours}h</span>
            </p>
            <button
              onClick={() => onApply(suggestion.targetHours)}
              className="px-3 py-1 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-xs font-semibold transition-colors"
            >
              Use {suggestion.targetHours}h
            </button>
          </div>
          {suggestion.reason && (
            <p className="text-[11px] text-gray-400 mt-1.5">{suggestion.reason}</p>
          )}
        </div>
      )}

      {error && <p className="text-xs text-red-500 font-medium mt-1.5">{error}</p>}
    </div>
  );
}
