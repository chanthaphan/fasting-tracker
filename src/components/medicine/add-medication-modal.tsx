import { useState } from 'react';
import { Modal } from '../ui/modal';
import { MED_SLOTS, MEAL_RELATIONS } from '../../constants/med-slots';
import { todayKey } from '../../utils/date-utils';
import { useT } from '../../i18n';
import type { Medication, MedSlot, MealRelation } from '../../types';

export type MedicationDraft = Omit<Medication, 'id' | 'createdAt'>;

interface AddMedicationModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (draft: MedicationDraft) => void;
  /** Present when editing; the delete button shows only then */
  editEntry?: Medication | null;
  onDelete?: (medication: Medication) => void;
}

/** Mounted only while open, so the form below starts fresh (or from the entry) on every open. */
export function AddMedicationModal(props: AddMedicationModalProps) {
  if (!props.open) return null;
  return <MedicationForm key={props.editEntry?.id ?? 'new'} {...props} />;
}

function MedicationForm({ open, onClose, onSave, editEntry, onDelete }: AddMedicationModalProps) {
  const { t } = useT();
  const [name, setName] = useState(() => editEntry?.name ?? '');
  const [dosage, setDosage] = useState(() => editEntry?.dosage ?? '');
  const [slots, setSlots] = useState<MedSlot[]>(() => editEntry?.slots ?? ['morning']);
  const [mealRelation, setMealRelation] = useState<MealRelation>(() => editEntry?.mealRelation ?? 'after');
  const [note, setNote] = useState(() => editEntry?.note ?? '');
  const [startDate, setStartDate] = useState(() => editEntry?.startDate ?? todayKey());
  const [slotError, setSlotError] = useState(false);

  const toggleSlot = (slot: MedSlot) => {
    setSlotError(false);
    setSlots((s) => (s.includes(slot) ? s.filter((x) => x !== slot) : [...s, slot]));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (slots.length === 0) {
      setSlotError(true);
      return;
    }
    onSave({
      name: name.trim(),
      dosage: dosage.trim() || undefined,
      // Keep the canonical order so the schedule reads morning → bedtime
      slots: MED_SLOTS.map((s) => s.value).filter((v) => slots.includes(v)),
      mealRelation,
      note: note.trim() || undefined,
      startDate: startDate || todayKey(),
    });
    onClose();
  };

  const inputClass = 'w-full px-3 py-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-500';
  const labelClass = 'block text-sm font-medium mb-1 text-gray-600 dark:text-gray-400';

  return (
    <Modal open={open} onClose={onClose} title={editEntry ? t('med.edit') : t('med.add')}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className={labelClass} htmlFor="med-name">{t('med.name')}</label>
          <input
            id="med-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('med.namePlaceholder')}
            className={inputClass}
            autoFocus
            required
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="med-dosage">{t('med.dosage')}</label>
          <input
            id="med-dosage"
            type="text"
            value={dosage}
            onChange={(e) => setDosage(e.target.value)}
            placeholder={t('med.dosagePlaceholder')}
            className={inputClass}
          />
        </div>

        <div>
          <p className="block text-sm font-medium mb-2 text-gray-600 dark:text-gray-400">{t('med.times')}</p>
          <div className="grid grid-cols-4 gap-2" role="group" aria-label={t('med.times')}>
            {MED_SLOTS.map((s) => {
              const on = slots.includes(s.value);
              return (
                <button
                  key={s.value}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggleSlot(s.value)}
                  className={`py-2 px-1 rounded-xl text-xs font-medium transition-all ${
                    on
                      ? 'bg-brand-500 text-white shadow-md'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                  }`}
                >
                  <span className="block text-base mb-0.5" aria-hidden="true">{s.icon}</span>
                  {t(s.labelKey)}
                </button>
              );
            })}
          </div>
          {slotError && <p role="alert" className="text-xs text-red-500 mt-1.5">{t('med.needSlot')}</p>}
        </div>

        <div>
          <p className="block text-sm font-medium mb-2 text-gray-600 dark:text-gray-400">{t('med.mealRelation')}</p>
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={t('med.mealRelation')}>
            {MEAL_RELATIONS.map((r) => (
              <button
                key={r.value}
                type="button"
                role="radio"
                aria-checked={mealRelation === r.value}
                onClick={() => setMealRelation(r.value)}
                className={`py-2.5 rounded-xl text-sm font-medium transition-all ${
                  mealRelation === r.value
                    ? 'bg-brand-500 text-white shadow-md'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                }`}
              >
                {t(r.labelKey)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={labelClass} htmlFor="med-start">{t('med.startDate')}</label>
          <input
            id="med-start"
            type="date"
            value={startDate}
            max={todayKey()}
            onChange={(e) => setStartDate(e.target.value || todayKey())}
            className={`${inputClass} text-sm`}
          />
        </div>

        <div>
          <label className={labelClass} htmlFor="med-note">{t('common.note')}</label>
          <input
            id="med-note"
            type="text"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className={inputClass}
          />
        </div>

        <button
          type="submit"
          className="w-full py-3 bg-brand-600 hover:bg-brand-700 text-white font-semibold rounded-xl transition-colors"
        >
          {editEntry ? t('common.update') : t('med.add')}
        </button>

        {editEntry && onDelete && (
          <button
            type="button"
            onClick={() => { onDelete(editEntry); onClose(); }}
            className="w-full py-2.5 text-sm font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
          >
            {t('med.remove')}
          </button>
        )}
      </form>
    </Modal>
  );
}
