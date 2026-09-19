import { useContext } from 'react';
import { format, parseISO } from 'date-fns';
import { th as thLocale } from 'date-fns/locale';
import { AppContext } from '../context/use-app-state';
import type { AppMode } from '../types';
import type { DayBucket } from '../utils/chart-data';
import type { BarSlot } from '../components/charts/daily-bars';
import { en, th, type MessageKey } from './messages';

export type Lang = 'en' | 'th';
export type { MessageKey };

const DICTS: Record<Lang, Record<MessageKey, string>> = { en, th };

/** The adult (ผู้ใหญ่) experience is Thai; the standard one is English. */
export function langForMode(mode: AppMode): Lang {
  return mode === 'adult' ? 'th' : 'en';
}

type Vars = Record<string, string | number>;

/** Look up a UI string, filling {placeholders} from `vars`. */
export function translate(lang: Lang, key: MessageKey, vars?: Vars): string {
  const template = DICTS[lang][key] ?? en[key] ?? key;
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (m, name: string) => (name in vars ? String(vars[name]) : m));
}

export type DateStyle = 'short' | 'long' | 'dayMonth' | 'weekday' | 'weekdayShort' | 'time';

const toDate = (d: string | number | Date): Date =>
  typeof d === 'string' ? parseISO(d) : d instanceof Date ? d : new Date(d);

/**
 * Locale-aware date text. Thai dates use the Buddhist year (พ.ศ.), which is
 * what adult users expect to read.
 */
export function formatDate(d: string | number | Date, lang: Lang, style: DateStyle = 'short'): string {
  const date = toDate(d);
  if (lang === 'th') {
    const be = date.getFullYear() + 543;
    const f = (p: string) => format(date, p, { locale: thLocale });
    switch (style) {
      case 'short': return `${f('d MMM')} ${be}`;
      case 'long': return `วัน${f('EEEE')}ที่ ${f('d MMMM')} ${be}`;
      case 'dayMonth': return f('d MMM');
      case 'weekday': return f('EEEE');
      case 'weekdayShort': return f('EEE d MMM');
      case 'time': return f('HH:mm');
    }
  }
  switch (style) {
    case 'short': return format(date, 'MMM d, yyyy');
    case 'long': return format(date, 'EEEE, MMM d, yyyy');
    case 'dayMonth': return format(date, 'MMM d');
    case 'weekday': return format(date, 'EEEE');
    case 'weekdayShort': return format(date, 'EEE, MMM d');
    case 'time': return format(date, 'h:mm a');
  }
}

/** Weight unit as shown to the user ('kg' → 'กก.' in Thai). */
export function unitLabel(unit: string, lang: Lang): string {
  if (unit === 'kg') return translate(lang, 'common.kg');
  if (unit === 'lbs') return translate(lang, 'common.lbs');
  return unit;
}

/** Give chart day buckets localized axis labels and tooltip titles. */
export function localizeDays(days: DayBucket[], lang: Lang): BarSlot[] {
  if (lang === 'en') return days;
  return days.map((d) => {
    const date = parseISO(d.key);
    return {
      ...d,
      label: days.length <= 7 ? format(date, 'EEEEEE', { locale: thLocale }) : d.label,
      title: formatDate(date, lang, 'weekdayShort'),
    };
  });
}

/** Current UI language, from the app mode. Outside the provider (tests, error fallback) it is English. */
export function useLang(): Lang {
  const store = useContext(AppContext);
  return store ? langForMode(store.state.appMode) : 'en';
}

/** `t('key', vars)` bound to the current language, plus date and unit helpers. */
export function useT() {
  const lang = useLang();
  return {
    lang,
    isThai: lang === 'th',
    t: (key: MessageKey, vars?: Vars) => translate(lang, key, vars),
    fmtDate: (d: string | number | Date, style: DateStyle = 'short') => formatDate(d, lang, style),
    unit: (u: string) => unitLabel(u, lang),
  };
}
