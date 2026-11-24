import { useState } from 'react';
import { format } from 'date-fns';
import { Modal } from '../ui/modal';
import type { BloodPressureEntry } from '../../types';
import { todayKey } from '../../utils/date-utils';
import { validateBp, type BpError } from '../../utils/blood-pressure';
import { useT } from '../../i18n';
import type { MessageKey } from '../../i18n/messages';

export interface BpDraft {
  systolic: number;
  diastolic: number;
  pulse?: number;
  date: string;
  time: string;
  note?: string;
}

interface AddBpModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: BpDraft) => void;
  editEntry?: BloodPressureEntry | null;
}

const ERROR_KEYS: Record<BpError, MessageKey> = {
  systolic: 'bp.errSystolic',
  diastolic: 'bp.errDiastolic',
  pulse: 'bp.errPulse',
  order: 'bp.errOrder',
};

/** Mounted only while open, so the form starts fresh (or from the entry) on every open. */
export function AddBpModal(props: AddBpModalProps) {
  if (!props.open) return null;
  return <AddBpForm key={props.editEntry?.id ?? 'new'} {...props} />;
}

function AddBpForm({ open, onClose, onSave, editEntry }: AddBpModalProps) {
  const { t } = useT();
  const [systolic, setSystolic] = useState(() => (editEntry ? String(editEntry.systolic) : ''));
  const [diastolic, setDiastolic] = useState(() => (editEntry ? String(editEntry.diastolic) : ''));
  const [pulse, setPulse] = useState(() => (editEntry?.pulse !== undefined ? String(editEntry.pulse) : ''));
  const [date, setDate] = useState(() => editEntry?.date ?? todayKey());
  const [time, setTime] = useState(() => editEntry?.time ?? format(new Date(), 'HH:mm'));
  const [note, setNote] = useState(() => editEntry?.note ?? '');
  const [error, setError] = useState<BpError | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const sys = Number(systolic);
    const dia = Number(diastolic);
    const bpm = pulse.trim() === '' ? undefined : Number(pulse);
    const problem = systolic.trim() === '' || diastolic.trim() === '' ? (systolic.trim() === '' ? 'systolic' : 'diastolic') : validateBp(sys, dia, bpm);
    if (problem) {
      setError(problem);
      return;
    }
    onSave({ systolic: Math.round(sys), diastolic: Math.round(dia), pulse: bpm === undefined ? undefined : Math.round(bpm), date, time, note: note.trim() || undefined });
    onClose();
  };

  const inputClass = 'w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500';
  const labelClass = 'block text-sm font-medium mb-1 text-gray-600 dark:text-gray-400';
  const invalid = (field: BpError) => error === field || (field === 'diastolic' && error === 'order');

  return (
    <Modal open={open} onClose={onClose} title={editEntry ? t('bp.edit') : t('bp.log')}>
      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="bp-systolic" className={labelClass}>{t('bp.systolic')}</label>
            <input
              id="bp-systolic"
              type="number"
              inputMode="numeric"
              value={systolic}
              onChange={(e) => { setSystolic(e.target.value); setError(null); }}
              placeholder="120"
              className={inputClass}
              aria-invalid={invalid('systolic')}
              autoFocus
            />
          </div>
          <div>
            <label htmlFor="bp-diastolic" className={labelClass}>{t('bp.diastolic')}</label>
            <input
              id="bp-diastolic"
              type="number"
              inputMode="numeric"
              value={diastolic}
              onChange={(e) => { setDiastolic(e.target.value); setError(null); }}
              placeholder="80"
              className={inputClass}
              aria-invalid={invalid('diastolic')}
            />
          </div>
        </div>
        <p className="-mt-2 text-xs text-gray-400">{t('bp.inputHint')}</p>

        <div>
          <label htmlFor="bp-pulse" className={labelClass}>{t('bp.pulse')} · {t('bp.bpm')}</label>
          <input
            id="bp-pulse"
            type="number"
            inputMode="numeric"
            value={pulse}
            onChange={(e) => { setPulse(e.target.value); setError(null); }}
            placeholder="72"
            className={inputClass}
            aria-invalid={invalid('pulse')}
          />
        </div>

        {error && <p role="alert" className="text-sm text-red-500">{t(ERROR_KEYS[error])}</p>}

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label htmlFor="bp-date" className={labelClass}>{t('common.date')}</label>
            <input id="bp-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label htmlFor="bp-time" className={labelClass}>{t('bp.time')}</label>
            <input id="bp-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} className={inputClass} />
          </div>
        </div>

        <div>
          <label htmlFor="bp-note" className={labelClass}>{t('common.note')}</label>
          <input
            id="bp-note"
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder={t('bp.notePlaceholder')}
            className={inputClass}
          />
        </div>

        <button type="submit" className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl transition-colors">
          {editEntry ? t('common.update') : t('bp.log')}
        </button>
      </form>
    </Modal>
  );
}
