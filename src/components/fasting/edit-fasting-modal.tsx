import { useState, useEffect } from 'react';
import { Modal } from '../ui/modal';
import type { FastingSession } from '../../types';

interface EditFastingModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (id: string, startTime: number, endTime: number | null) => void;
  session: FastingSession | null;
}

function toLocalDatetime(ms: number): string {
  const d = new Date(ms);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

function fromLocalDatetime(value: string): number {
  return new Date(value).getTime();
}

export function EditFastingModal({ open, onClose, onSave, session }: EditFastingModalProps) {
  const [startStr, setStartStr] = useState('');
  const [endStr, setEndStr] = useState('');
  const [hasEnd, setHasEnd] = useState(false);

  useEffect(() => {
    if (session) {
      setStartStr(toLocalDatetime(session.startTime));
      if (session.endTime) {
        setEndStr(toLocalDatetime(session.endTime));
        setHasEnd(true);
      } else {
        setEndStr('');
        setHasEnd(false);
      }
    }
  }, [session, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !startStr) return;
    const startTime = fromLocalDatetime(startStr);
    const endTime = hasEnd && endStr ? fromLocalDatetime(endStr) : null;
    if (endTime !== null && endTime <= startTime) return;
    onSave(session.id, startTime, endTime);
    onClose();
  };

  const inputClass = 'w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500 text-sm';

  return (
    <Modal open={open} onClose={onClose} title="Edit Fasting Session">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-gray-600 dark:text-gray-400">Start Time</label>
          <input
            type="datetime-local"
            value={startStr}
            onChange={(e) => setStartStr(e.target.value)}
            className={inputClass}
          />
        </div>

        <div>
          <div className="flex items-center gap-2 mb-1">
            <label className="text-sm font-medium text-gray-600 dark:text-gray-400">End Time</label>
            {!session?.endTime && (
              <label className="flex items-center gap-1.5 text-xs text-gray-500">
                <input
                  type="checkbox"
                  checked={hasEnd}
                  onChange={(e) => setHasEnd(e.target.checked)}
                  className="rounded"
                />
                Set end time
              </label>
            )}
          </div>
          {hasEnd ? (
            <input
              type="datetime-local"
              value={endStr}
              onChange={(e) => setEndStr(e.target.value)}
              className={inputClass}
            />
          ) : (
            <p className="text-sm text-gray-400 italic">Currently fasting...</p>
          )}
        </div>

        <button
          type="submit"
          className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl transition-colors"
        >
          Save Changes
        </button>
      </form>
    </Modal>
  );
}
