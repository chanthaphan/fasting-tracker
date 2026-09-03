import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isSameMonth, isSameDay,
  addMonths, subMonths,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { dateKey } from '../../utils/date-utils';
import { parseISO } from 'date-fns';

interface CalendarGridProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  datesWithFood: Set<string>;
  datesWithFasting: Set<string>;
}

import { DAY_NAMES as WEEKDAYS } from '../../utils/date-utils';

export function CalendarGrid({ selectedDate, onSelectDate, datesWithFood, datesWithFasting }: CalendarGridProps) {
  const [viewDate, setViewDate] = useState(() => parseISO(selectedDate));
  // Follow the selected date when it moves to another month (e.g. from the food log's day picker)
  const [followedDate, setFollowedDate] = useState(selectedDate);
  if (selectedDate !== followedDate) {
    setFollowedDate(selectedDate);
    const sel = parseISO(selectedDate);
    if (!isSameMonth(sel, viewDate)) setViewDate(sel);
  }
  const today = new Date();

  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(viewDate);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800">
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setViewDate(subMonths(viewDate, 1))} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Previous month">
          <ChevronLeft size={20} className="text-gray-500" />
        </button>
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm">{format(viewDate, 'MMMM yyyy')}</h3>
          {(!isSameMonth(viewDate, today) || selectedDate !== dateKey(today)) && (
            <button
              onClick={() => { setViewDate(today); onSelectDate(dateKey(today)); }}
              className="px-2 py-0.5 rounded-lg text-[11px] font-medium text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-900/20"
            >
              Today
            </button>
          )}
        </div>
        <button onClick={() => setViewDate(addMonths(viewDate, 1))} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800" aria-label="Next month">
          <ChevronRight size={20} className="text-gray-500" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((d) => (
          <div key={d} className="text-xs font-medium text-gray-400 py-1">{d}</div>
        ))}
        {days.map((day) => {
          const key = dateKey(day);
          const isSelected = key === selectedDate;
          const inMonth = isSameMonth(day, viewDate);
          const isToday = isSameDay(day, new Date());
          const hasFood = datesWithFood.has(key);
          const hasFasting = datesWithFasting.has(key);

          return (
            <button
              key={key}
              onClick={() => onSelectDate(key)}
              aria-label={`${format(day, 'EEEE, MMMM d')}${hasFood ? ', food logged' : ''}${hasFasting ? ', fasted' : ''}`}
              aria-pressed={isSelected}
              className={`relative aspect-square flex flex-col items-center justify-center rounded-xl text-sm transition-all ${
                isSelected
                  ? 'bg-brand-600 text-white font-semibold'
                  : isToday
                    ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400 font-semibold'
                    : inMonth
                      ? 'hover:bg-gray-100 dark:hover:bg-gray-800'
                      : 'text-gray-300 dark:text-gray-700'
              }`}
            >
              {format(day, 'd')}
              <div className="flex gap-0.5 mt-0.5">
                {hasFood && <div className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-brand-500'}`} />}
                {hasFasting && <div className={`w-1 h-1 rounded-full ${isSelected ? 'bg-white' : 'bg-purple-500'}`} />}
              </div>
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-center gap-4 mt-2 text-[10px] text-gray-400">
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-brand-500" />Food logged</span>
        <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-purple-500" />Fasted</span>
      </div>
    </div>
  );
}
