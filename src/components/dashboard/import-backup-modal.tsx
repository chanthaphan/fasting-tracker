import { useState } from 'react';
import { Modal } from '../ui/modal';
import type { ImportSummary } from '../../utils/export-import';
import { useT } from '../../i18n';

interface ImportBackupModalProps {
  open: boolean;
  summary: ImportSummary | null;
  error: string | null;
  onClose: () => void;
  onConfirm: (mode: 'replace' | 'merge') => Promise<void>;
}

/**
 * Shows what a backup contains before it touches anything, and offers
 * merge (union by id) or replace. Replace exports the current data first.
 */
export function ImportBackupModal({ open, summary, error, onClose, onConfirm }: ImportBackupModalProps) {
  const [busy, setBusy] = useState<'replace' | 'merge' | null>(null);
  const { t, fmtDate } = useT();
  const fmt = (key: string) => {
    try {
      return fmtDate(key);
    } catch {
      return key;
    }
  };

  const run = async (mode: 'replace' | 'merge') => {
    setBusy(mode);
    try {
      await onConfirm(mode);
    } finally {
      setBusy(null);
    }
  };

  const c = summary?.counts;

  return (
    <Modal open={open} onClose={onClose} title={t('import.title')}>
      {error ? (
        <div>
          <p className="text-sm text-red-500 font-medium">{error}</p>
          <p className="text-xs text-gray-400 mt-2">{t('import.hint')}</p>
          <button onClick={onClose} className="w-full mt-4 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm font-semibold">
            {t('common.close')}
          </button>
        </div>
      ) : summary && c ? (
        <div className="space-y-4">
          <div className="text-sm text-gray-600 dark:text-gray-300">
            <p>
              {t('import.contains', { from: summary.exportedAt ? t('import.from', { date: fmt(summary.exportedAt.slice(0, 10)) }) : '' })}
            </p>
            <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
              <li><b className="text-gray-800 dark:text-gray-100">{c.food}</b> {t('import.food')}</li>
              <li><b className="text-gray-800 dark:text-gray-100">{c.fasts}</b> {t('import.fasts')}</li>
              <li><b className="text-gray-800 dark:text-gray-100">{c.weights}</b> {t('import.weights')}</li>
              <li><b className="text-gray-800 dark:text-gray-100">{c.exercise}</b> {t('import.exercise')}</li>
              <li><b className="text-gray-800 dark:text-gray-100">{c.workouts}</b> {t('import.workouts')}</li>
              <li><b className="text-gray-800 dark:text-gray-100">{c.medications}</b> {t('import.medications')}</li>
              <li>{summary.hasSettings ? t('import.settingsIncluded') : t('import.noSettings')}</li>
            </ul>
            {summary.dateRange && (
              <p className="text-xs text-gray-400 mt-2">
                {fmt(summary.dateRange.from)} – {fmt(summary.dateRange.to)}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <button
              onClick={() => run('merge')}
              disabled={busy !== null}
              className="w-full py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-sm font-semibold disabled:opacity-50"
            >
              {busy === 'merge' ? t('import.merging') : t('import.merge')}
            </button>
            <p className="text-[11px] text-gray-400 text-center">{t('import.mergeHint')}</p>
            <button
              onClick={() => run('replace')}
              disabled={busy !== null}
              className="w-full py-2.5 bg-gray-100 dark:bg-gray-800 text-red-600 dark:text-red-400 rounded-xl text-sm font-semibold disabled:opacity-50"
            >
              {busy === 'replace' ? t('import.replacing') : t('import.replace')}
            </button>
            <p className="text-[11px] text-gray-400 text-center">{t('import.replaceHint')}</p>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
