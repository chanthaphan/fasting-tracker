import { dateKey } from './date-utils';

/**
 * Compute current/longest streaks over a set of 'YYYY-MM-DD' dates.
 * The current streak tolerates "today not done yet" by falling back
 * to a streak ending yesterday.
 */
export function computeStreaksFromDates(dates: Iterable<string>): { current: number; longest: number } {
  const dateSet = dates instanceof Set ? (dates as Set<string>) : new Set(dates);
  if (dateSet.size === 0) return { current: 0, longest: 0 };

  const sorted = [...dateSet].sort();

  let longest = 1;
  let run = 1;

  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1] + 'T00:00:00');
    const curr = new Date(sorted[i] + 'T00:00:00');
    const diffDays = (curr.getTime() - prev.getTime()) / 86400000;
    if (diffDays === 1) {
      run++;
      if (run > longest) longest = run;
    } else {
      run = 1;
    }
  }

  const today = dateKey(new Date());
  const yesterday = dateKey(new Date(Date.now() - 86400000));
  let current = 0;

  let startFrom = '';
  if (dateSet.has(today)) {
    startFrom = today;
  } else if (dateSet.has(yesterday)) {
    startFrom = yesterday;
  }

  if (startFrom) {
    current = 1;
    const d = new Date(startFrom + 'T00:00:00');
    while (true) {
      d.setDate(d.getDate() - 1);
      if (dateSet.has(dateKey(d))) {
        current++;
      } else {
        break;
      }
    }
  }

  return { current, longest };
}
