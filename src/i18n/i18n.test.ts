import { describe, it, expect } from 'vitest';
import { translate, formatDate, langForMode, localizeDays, unitLabel } from './index';
import { en, th } from './messages';
import { lastNDays } from '../utils/chart-data';

describe('i18n', () => {
  it('has a Thai string for every English key, and none are empty', () => {
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      expect(th[key], key).toBeTruthy();
    }
    expect(Object.keys(th).sort()).toEqual(Object.keys(en).sort());
  });

  it('keeps the same placeholders in both languages', () => {
    const holes = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort();
    for (const key of Object.keys(en) as (keyof typeof en)[]) {
      expect(holes(th[key]), key).toEqual(holes(en[key]));
    }
  });

  it('fills placeholders and leaves unknown ones visible', () => {
    expect(translate('th', 'food.deleted', { name: 'ข้าวผัด' })).toBe('ลบ ข้าวผัด แล้ว');
    expect(translate('en', 'med.progress', { taken: 2, total: 5 })).toBe('2 of 5 taken');
    expect(translate('en', 'med.progress', { taken: 2 })).toBe('2 of {total} taken');
  });

  it('adult mode reads Thai, standard mode English', () => {
    expect(langForMode('adult')).toBe('th');
    expect(langForMode('standard')).toBe('en');
  });

  it('formats Thai dates with the Buddhist year', () => {
    expect(formatDate('2026-09-19', 'th', 'short')).toBe('19 ก.ย. 2569');
    expect(formatDate('2026-09-19', 'th', 'long')).toBe('วันเสาร์ที่ 19 กันยายน 2569');
    expect(formatDate('2026-09-19', 'th', 'weekday')).toBe('เสาร์');
    expect(formatDate(new Date(2026, 8, 19, 8, 5), 'th', 'time')).toBe('08:05');
    expect(formatDate('2026-09-19', 'en', 'short')).toBe('Sep 19, 2026');
  });

  it('localizes chart day labels in Thai only', () => {
    const days = lastNDays(7, new Date(2026, 8, 19));
    expect(localizeDays(days, 'en')).toBe(days);
    const thai = localizeDays(days, 'th');
    expect(thai[6].label).toBe('ส.');
    expect(thai[6].title).toBe('ส. 19 ก.ย.');
  });

  it('shows kg as กก. in Thai', () => {
    expect(unitLabel('kg', 'th')).toBe('กก.');
    expect(unitLabel('lbs', 'en')).toBe('lbs');
  });
});
