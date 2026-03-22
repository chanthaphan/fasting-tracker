import {
  startOfMonth, endOfMonth, startOfWeek, endOfWeek,
  eachDayOfInterval, format, isSameMonth, isSameDay,
  addMonths, subMonths,
} from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { dateKey } from '../../utils/date-utils';

interface CalendarGridProps {
  selectedDate: string;
  onSelectDate: (date: string) => void;
  datesWithFood: Set<string>;
  datesWithFasting: Set<string>;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function CalendarGrid({ selectedDate, onSelectDate, datesWithFood, datesWithFasting }: CalendarGridProps) {
  const [viewDate, setViewDate] = useState(new Date());

  const monthStart = startOfMonth(viewDate);
  const monthEnd = endOfMonth(viewDate);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800">
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => setViewDate(subMonths(viewDate, 1))} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
          <ChevronLeft size={20} className="text-gray-500" />
        </button>
        <h3 className="font-semibold text-sm">{format(viewDate, 'MMMM yyyy')}</h3>
        <button onClick={() => setViewDate(addMonths(viewDate, 1))} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800">
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
    </div>
  );
}
