import { useEffect, useMemo, useRef } from 'react';
import { CheckCircle2, Flame, Sparkles, Timer, XCircle } from 'lucide-react';
import { Modal } from '../ui/modal';
import { AiMarkdown } from '../ai/ai-markdown';
import { useAppState } from '../../context/app-context';
import { useAiReady } from '../../hooks/use-ai';
import { useFastSummary } from '../../hooks/use-fast-ai';
import { computeStreaks } from '../../utils/fasting-streak';
import { formatHoursMinutes } from '../../utils/date-utils';
import { HEALTH_DISCLAIMER } from '../../utils/ai/prompts';
import type { FastingSession } from '../../types';

interface FastSummaryModalProps {
  open: boolean;
  onClose: () => void;
  session: FastingSession | null;
}

/**
 * Shown right after stopping a fast: instant stats, plus a streaming
 * AI recap when a key is configured (stats-only otherwise).
 */
export function FastSummaryModal({ open, onClose, session }: FastSummaryModalProps) {
  const { state } = useAppState();
  const aiReady = useAiReady();
  const { summary, streaming, error, summarizeFast } = useFastSummary();
  const requestedFor = useRef<string | null>(null);

  const streaks = useMemo(() => computeStreaks(state.fastingSessions), [state.fastingSessions]);

  useEffect(() => {
    if (open && session && session.endTime !== null && aiReady && requestedFor.current !== session.id) {
      requestedFor.current = session.id;
      summarizeFast(session);
    }
  }, [open, session, aiReady, summarizeFast]);

  if (!session || session.endTime === null) return null;

  const durationMs = session.endTime - session.startTime;
  const hours = durationMs / 3600000;
  const targetMet = session.targetHours !== undefined ? hours >= session.targetHours : null;

  return (
    <Modal open={open} onClose={onClose} title="Fast Complete">
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
            <Timer size={16} className="mx-auto mb-1 text-brand-500" />
            <p className="text-lg font-bold">{formatHoursMinutes(durationMs)}</p>
            <p className="text-[10px] text-gray-400">Duration</p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
            {targetMet === null ? (
              <Timer size={16} className="mx-auto mb-1 text-gray-400" />
            ) : targetMet ? (
              <CheckCircle2 size={16} className="mx-auto mb-1 text-green-500" />
            ) : (
              <XCircle size={16} className="mx-auto mb-1 text-amber-500" />
            )}
            <p className="text-lg font-bold">
              {session.targetHours !== undefined ? `${session.targetHours}h` : '—'}
            </p>
            <p className="text-[10px] text-gray-400">
              {targetMet === null ? 'No target' : targetMet ? 'Target met' : 'Target missed'}
            </p>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl p-3 text-center">
            <Flame size={16} className="mx-auto mb-1 text-orange-500" />
            <p className="text-lg font-bold">{streaks.current}</p>
            <p className="text-[10px] text-gray-400">Day streak</p>
          </div>
        </div>

        {aiReady && (
          <div className="bg-brand-50/50 dark:bg-brand-900/10 rounded-xl p-3 border border-brand-100 dark:border-brand-900/40">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1.5">
              <Sparkles size={13} className="text-brand-500" />
              Coach recap
            </p>
            {summary ? (
              <div className="text-sm text-gray-700 dark:text-gray-300">
                <AiMarkdown text={summary} />
                {streaming && <span className="inline-block w-1.5 h-3.5 ml-0.5 bg-brand-400 animate-pulse align-middle rounded-sm" />}
              </div>
            ) : streaming ? (
              <div className="space-y-2 animate-pulse">
                <div className="h-3 bg-brand-100/60 dark:bg-gray-800 rounded w-full" />
                <div className="h-3 bg-brand-100/60 dark:bg-gray-800 rounded w-3/4" />
              </div>
            ) : error ? (
              <p className="text-xs text-red-500 font-medium">{error}</p>
            ) : null}
            <p className="text-[10px] text-gray-400 mt-2">{HEALTH_DISCLAIMER.en} · {HEALTH_DISCLAIMER.th}</p>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl transition-colors"
        >
          Done
        </button>
      </div>
    </Modal>
  );
}
