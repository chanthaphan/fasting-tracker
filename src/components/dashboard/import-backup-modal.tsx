import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Modal } from '../ui/modal';
import type { ImportSummary } from '../../utils/export-import';

interface ImportBackupModalProps {
  open: boolean;
  summary: ImportSummary | null;
  error: string | null;
  onClose: () => void;
  onConfirm: (mode: 'replace' | 'merge') => Promise<void>;
}

const fmt = (key: string) => {
  try {
    return format(parseISO(key), 'MMM d, yyyy');
  } catch {
    return key;
  }
};

/**
 * Shows what a backup contains before it touches anything, and offers
 * merge (union by id) or replace. Replace exports the current data first.
 */
export function ImportBackupModal({ open, summary, error, onClose, onConfirm }: ImportBackupModalProps) {
  const [busy, setBusy] = useState<'replace' | 'merge' | null>(null);

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
    <Modal open={open} onClose={onClose} title="Import backup">
      {error ? (
        <div>
          <p className="text-sm text-red-500 font-medium">{error}</p>
          <p className="text-xs text-gray-400 mt-2">Choose a file exported from this app's "Export Backup" button.</p>
          <button onClick={onClose} className="w-full mt-4 py-2.5 bg-gray-100 dark:bg-gray-800 rounded-xl text-sm font-semibold">
            Close
          </button>
        </div>
      ) : summary && c ? (
        <div className="space-y-4">
          <div className="text-sm text-gray-600 dark:text-gray-300">
            <p>
              This backup{summary.exportedAt ? ` from ${fmt(summary.exportedAt.slice(0, 10))}` : ''} contains:
            </p>
            <ul className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-500 dark:text-gray-400">
              <li><b className="text-gray-800 dark:text-gray-100">{c.food}</b> meals</li>
              <li><b className="text-gray-800 dark:text-gray-100">{c.fasts}</b> fasts</li>
              <li><b className="text-gray-800 dark:text-gray-100">{c.weights}</b> weigh-ins</li>
              <li><b className="text-gray-800 dark:text-gray-100">{c.exercise}</b> exercise logs</li>
              <li><b className="text-gray-800 dark:text-gray-100">{c.workouts}</b> workouts</li>
              <li>{summary.hasSettings ? 'Profile & goals included' : 'No profile or goals'}</li>
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
              {busy === 'merge' ? 'Merging…' : 'Merge into my data'}
            </button>
            <p className="text-[11px] text-gray-400 text-center">Keeps everything you have; entries with the same id are taken from the backup.</p>
            <button
              onClick={() => run('replace')}
              disabled={busy !== null}
              className="w-full py-2.5 bg-gray-100 dark:bg-gray-800 text-red-600 dark:text-red-400 rounded-xl text-sm font-semibold disabled:opacity-50"
            >
              {busy === 'replace' ? 'Replacing…' : 'Replace my data'}
            </button>
            <p className="text-[11px] text-gray-400 text-center">A backup of your current data is downloaded first.</p>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
