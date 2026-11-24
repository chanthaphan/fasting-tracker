import { describe, it, expect } from 'vitest';
import { appReducer } from './app-reducer';
import { makeAppState } from '../test/app-state';
import { dateKey } from '../utils/date-utils';
import type { BloodPressureEntry } from '../types';

const reading: BloodPressureEntry = {
  id: 'bp1', systolic: 128, diastolic: 82, pulse: 70, date: '2026-01-02', time: '08:30', createdAt: 1,
};

describe('appReducer - blood pressure', () => {
  it('ADD_BP stores a reading with a generated id', () => {
    const state = appReducer(makeAppState(), {
      type: 'ADD_BP',
      payload: { systolic: 128, diastolic: 82, pulse: 70, date: '2026-01-02', time: '08:30' },
    });
    expect(state.bloodPressureEntries).toHaveLength(1);
    expect(state.bloodPressureEntries[0]).toMatchObject({ systolic: 128, diastolic: 82, date: '2026-01-02' });
    expect(state.bloodPressureEntries[0].id).toBeTruthy();
  });

  it('ADD_BP checks in only for a reading dated today', () => {
    const today = dateKey(new Date());
    const base = makeAppState();
    const past = appReducer(base, { type: 'ADD_BP', payload: { systolic: 120, diastolic: 80, date: '2020-01-01', time: '07:00' } });
    expect(past.gamification.checkIns).toEqual([]);
    const now = appReducer(base, { type: 'ADD_BP', payload: { systolic: 120, diastolic: 80, date: today, time: '07:00' } });
    expect(now.gamification.checkIns).toEqual([today]);
  });

  it('EDIT_BP replaces just that reading', () => {
    const other = { ...reading, id: 'bp2' };
    const state = appReducer(makeAppState({ bloodPressureEntries: [reading, other] }), {
      type: 'EDIT_BP', payload: { ...reading, systolic: 140 },
    });
    expect(state.bloodPressureEntries.map((e) => e.systolic)).toEqual([140, 128]);
  });

  it('DELETE_BP removes a reading and RESTORE_BP puts it back once', () => {
    const start = makeAppState({ bloodPressureEntries: [reading] });
    const deleted = appReducer(start, { type: 'DELETE_BP', payload: { id: 'bp1' } });
    expect(deleted.bloodPressureEntries).toEqual([]);
    const restored = appReducer(deleted, { type: 'RESTORE_BP', payload: reading });
    expect(restored.bloodPressureEntries).toEqual([reading]);
    expect(appReducer(restored, { type: 'RESTORE_BP', payload: reading })).toBe(restored);
  });

  it('IMPORT_DATA replaces or merges readings, and leaves them alone when the backup has none', () => {
    const existing = makeAppState({ bloodPressureEntries: [reading] });
    const incoming = { ...reading, id: 'bp9', systolic: 150 };
    const base = { foodEntries: [], fastingSessions: [] };

    const replaced = appReducer(existing, { type: 'IMPORT_DATA', payload: { ...base, bloodPressureEntries: [incoming], mode: 'replace' } });
    expect(replaced.bloodPressureEntries.map((e) => e.id)).toEqual(['bp9']);

    const merged = appReducer(existing, { type: 'IMPORT_DATA', payload: { ...base, bloodPressureEntries: [incoming], mode: 'merge' } });
    expect(merged.bloodPressureEntries.map((e) => e.id).sort()).toEqual(['bp1', 'bp9']);

    const untouched = appReducer(existing, { type: 'IMPORT_DATA', payload: { ...base, mode: 'replace' } });
    expect(untouched.bloodPressureEntries).toEqual([reading]);
  });
});
