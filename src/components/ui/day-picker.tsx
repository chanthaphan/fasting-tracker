import { ChevronLeft, ChevronRight } from 'lucide-react';
import { addDays, parseISO } from 'date-fns';
import { todayKey, dateKey } from '../../utils/date-utils';
import { useT } from '../../i18n';

interface DayPickerProps {
  /** 'YYYY-MM-DD' */
  day: string;
  onChange: (day: string) => void;
}

/** ‹ Today › header used by the day-based logs; never moves past today. */
export function DayPicker({ day, onChange }: DayPickerProps) {
  const { t, fmtDate } = useT();
  const isToday = day === todayKey();
  return (
    <div className="flex items-center justify-between mb-3">
      <button
        type="button"
        onClick={() => onChange(dateKey(addDays(parseISO(day), -1)))}
        aria-label={t('common.prevDay')}
        className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500"
      >
        <ChevronLeft size={18} />
      </button>
      <div className="text-center">
        <p className="text-sm font-semibold">{isToday ? t('common.today') : fmtDate(day, 'weekday')}</p>
        <p className="text-xs text-gray-400">{fmtDate(day, 'short')}</p>
      </div>
      <div className="flex items-center gap-1">
        {!isToday && (
          <button
            type="button"
            onClick={() => onChange(todayKey())}
            className="px-2 py-1 rounded-lg text-xs font-medium text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20"
          >
            {t('common.today')}
          </button>
        )}
        <button
          type="button"
          onClick={() => onChange(dateKey(addDays(parseISO(day), 1)))}
          disabled={isToday}
          aria-label={t('common.nextDay')}
          className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 disabled:opacity-30"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}
