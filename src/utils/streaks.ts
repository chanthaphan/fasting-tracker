import { dateKey } from './date-utils';

const FREEZE_EARN_DAYS = 7; // one freeze token per 7 consecutive check-in days
const FREEZE_CAP = 2; // tokens held at once; earning at the cap is wasted

export interface FreezeStreaks {
  current: number;
  longest: number;
  freezesHeld: number;
  freezesUsed: number;
}

/**
 * Streaks with Duolingo-style freezes, fully derived from the date set
 * (nothing persisted): walking the sorted dates chronologically, every
 * 7th consecutive check-in day earns a token (max 2 held), and a gap of
 * exactly one missed day consumes a token to keep the streak alive.
 * Longer gaps always break the streak; held tokens survive breaks.
 * Bridged days don't count toward the streak length — only real
 * check-ins do. The "today not checked in yet" tolerance never consumes
 * a token, but a streak ending two days ago can be kept frozen by one.
 */
export function computeStreaksWithFreeze(dates: Iterable<string>): FreezeStreaks {
  const dateSet = dates instanceof Set ? (dates as Set<string>) : new Set(dates);
  if (dateSet.size === 0) return { current: 0, longest: 0, freezesHeld: 0, freezesUsed: 0 };

  const sorted = [...dateSet].sort();

  let tokens = 0;
  let used = 0;
  let run = 1;
  let earnCounter = 1;
  let longest = 1;

  const maybeEarn = () => {
    if (earnCounter % FREEZE_EARN_DAYS === 0 && tokens < FREEZE_CAP) tokens++;
  };

  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1] + 'T00:00:00');
    const curr = new Date(sorted[i] + 'T00:00:00');
    const diffDays = Math.round((curr.getTime() - prev.getTime()) / 86400000);
    if (diffDays === 1) {
      run++;
      earnCounter++;
      maybeEarn();
    } else if (diffDays === 2 && tokens > 0) {
      // one missed day bridged by a freeze; the arriving check-in continues the run
      tokens--;
      used++;
      run++;
      earnCounter++;
      maybeEarn();
    } else {
      run = 1;
      earnCounter = 1;
    }
    if (run > longest) longest = run;
  }

  const last = sorted[sorted.length - 1];
  const today = dateKey(new Date());
  const yesterday = dateKey(new Date(Date.now() - 86400000));
  const dayBefore = dateKey(new Date(Date.now() - 2 * 86400000));

  let current = 0;
  if (last === today || last === yesterday) {
    current = run;
  } else if (last === dayBefore && tokens > 0) {
    // streak is frozen right now: yesterday is bridged, today still tolerated
    tokens--;
    used++;
    current = run;
  }

  return { current, longest, freezesHeld: tokens, freezesUsed: used };
}

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
