import { Check } from 'lucide-react';
import { useAppState } from '../../context/use-app-state';
import { MED_SLOTS } from '../../constants/med-slots';
import { dosesBySlot, type ScheduledDose } from '../../utils/medication';
import { useT } from '../../i18n';

interface MedChecklistProps {
  /** 'YYYY-MM-DD' the doses belong to */
  date: string;
  doses: ScheduledDose[];
}

/**
 * The day's doses grouped by time of day, each with one big "taken" button.
 * Tapping a taken dose un-takes it, so a mis-tap is a second tap away.
 */
export function MedChecklist({ date, doses }: MedChecklistProps) {
  const { dispatch } = useAppState();
  const { t, fmtDate } = useT();
  const groups = dosesBySlot(doses);

  const toggle = (dose: ScheduledDose) =>
    dispatch({ type: 'TOGGLE_MEDICATION_TAKEN', payload: { medicationId: dose.medication.id, date, slot: dose.slot } });

  return (
    <div className="space-y-4">
      {groups.map(({ slot, doses: list }) => {
        const meta = MED_SLOTS.find((s) => s.value === slot)!;
        const slotLabel = t(meta.labelKey);
        return (
          <section key={slot} aria-label={slotLabel}>
            <h3 className="flex items-center gap-2 px-1 mb-2 text-sm font-semibold text-gray-600 dark:text-gray-300">
              <span className="text-lg" aria-hidden="true">{meta.icon}</span>
              {slotLabel}
              <span className="text-xs font-medium text-gray-400">
                {list.filter((d) => d.log).length}/{list.length}
              </span>
            </h3>
            <ul className="space-y-2">
              {list.map((dose) => {
                const taken = dose.log !== null;
                const m = dose.medication;
                return (
                  <li key={`${m.id}-${slot}`}>
                    <button
                      type="button"
                      onClick={() => toggle(dose)}
                      aria-pressed={taken}
                      aria-label={taken
                        ? t('med.unmarkTaken', { name: m.name, slot: slotLabel })
                        : t('med.markTaken', { name: m.name, slot: slotLabel })}
                      className={`w-full flex items-center gap-3 p-3 rounded-2xl border text-left transition-colors ${
                        taken
                          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                          : 'bg-white dark:bg-gray-900 border-gray-100 dark:border-gray-800 hover:border-brand-300 dark:hover:border-brand-700'
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className={`flex items-center justify-center w-11 h-11 rounded-full shrink-0 transition-colors ${
                          taken ? 'bg-green-500 text-white' : 'border-2 border-gray-300 dark:border-gray-600 text-transparent'
                        }`}
                      >
                        <Check size={24} strokeWidth={3} />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className={`block font-semibold truncate ${taken ? 'text-green-800 dark:text-green-200' : ''}`}>{m.name}</span>
                        <span className="block text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          {[m.dosage, m.mealRelation !== 'none' ? t(m.mealRelation === 'before' ? 'med.before' : 'med.after') : null]
                            .filter(Boolean)
                            .join(' · ')}
                        </span>
                        {taken && dose.log && (
                          <span className="block text-xs font-medium text-green-600 dark:text-green-400 mt-0.5">
                            {t('med.takenAt', { time: fmtDate(dose.log.takenAt, 'time') })}
                          </span>
                        )}
                      </span>
                      <span className={`text-xs font-semibold shrink-0 ${taken ? 'text-green-600 dark:text-green-400' : 'text-gray-400'}`}>
                        {taken ? t('med.taken') : t('med.notTaken')}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
