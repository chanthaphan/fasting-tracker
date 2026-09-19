import { describe, it, expect } from 'vitest';
import { appReducer } from './app-reducer';
import { makeAppState } from '../test/app-state';
import { dateKey } from '../utils/date-utils';
import type { Medication, MedicationLog } from '../types';

const med: Medication = {
  id: 'm1',
  name: 'ยาความดัน',
  dosage: '1 เม็ด',
  slots: ['morning', 'evening'],
  mealRelation: 'after',
  startDate: '2026-01-01',
  createdAt: 1,
};

const log = (slot: MedicationLog['slot'], date = '2026-01-02'): MedicationLog => ({
  id: `l-${slot}-${date}`,
  medicationId: 'm1',
  date,
  slot,
  takenAt: 1,
});

describe('appReducer - app mode', () => {
  it('SET_APP_MODE switches between standard and adult', () => {
    const adult = appReducer(makeAppState(), { type: 'SET_APP_MODE', payload: 'adult' });
    expect(adult.appMode).toBe('adult');
    expect(appReducer(adult, { type: 'SET_APP_MODE', payload: 'standard' }).appMode).toBe('standard');
  });
});

describe('appReducer - medication actions', () => {
  it('ADD_MEDICATION adds with a generated id and createdAt', () => {
    const state = appReducer(makeAppState(), {
      type: 'ADD_MEDICATION',
      payload: { name: 'วิตามิน', slots: ['noon'], mealRelation: 'none', startDate: '2026-01-01' },
    });
    expect(state.medications).toHaveLength(1);
    expect(state.medications[0].name).toBe('วิตามิน');
    expect(state.medications[0].id).toBeTruthy();
    expect(state.medications[0].createdAt).toBeGreaterThan(0);
  });

  it('ADD_MEDICATION ignores a medicine with no time slots', () => {
    const state = appReducer(makeAppState(), {
      type: 'ADD_MEDICATION',
      payload: { name: 'x', slots: [], mealRelation: 'none', startDate: '2026-01-01' },
    });
    expect(state.medications).toHaveLength(0);
  });

  it('EDIT_MEDICATION replaces the medicine and drops logs for removed slots', () => {
    const base = makeAppState({ medications: [med], medicationLogs: [log('morning'), log('evening')] });
    const state = appReducer(base, { type: 'EDIT_MEDICATION', payload: { ...med, name: 'ยาใหม่', slots: ['morning'] } });
    expect(state.medications[0].name).toBe('ยาใหม่');
    expect(state.medicationLogs.map((l) => l.slot)).toEqual(['morning']);
  });

  it('DELETE_MEDICATION removes the medicine and its logs', () => {
    const base = makeAppState({ medications: [med], medicationLogs: [log('morning')] });
    const state = appReducer(base, { type: 'DELETE_MEDICATION', payload: { id: 'm1' } });
    expect(state.medications).toHaveLength(0);
    expect(state.medicationLogs).toHaveLength(0);
  });

  it('RESTORE_MEDICATION puts the medicine and its logs back, without duplicates', () => {
    const base = makeAppState();
    const once = appReducer(base, { type: 'RESTORE_MEDICATION', payload: { medication: med, logs: [log('morning')] } });
    expect(once.medications).toHaveLength(1);
    expect(once.medicationLogs).toHaveLength(1);
    const twice = appReducer(once, { type: 'RESTORE_MEDICATION', payload: { medication: med, logs: [log('morning')] } });
    expect(twice).toBe(once);
  });

  it('TOGGLE_MEDICATION_TAKEN records a dose, and a second toggle removes it', () => {
    const base = makeAppState({ medications: [med] });
    const taken = appReducer(base, { type: 'TOGGLE_MEDICATION_TAKEN', payload: { medicationId: 'm1', date: '2026-01-02', slot: 'morning' } });
    expect(taken.medicationLogs).toHaveLength(1);
    expect(taken.medicationLogs[0]).toMatchObject({ medicationId: 'm1', date: '2026-01-02', slot: 'morning' });
    expect(taken.medicationLogs[0].takenAt).toBeGreaterThan(0);

    const untaken = appReducer(taken, { type: 'TOGGLE_MEDICATION_TAKEN', payload: { medicationId: 'm1', date: '2026-01-02', slot: 'morning' } });
    expect(untaken.medicationLogs).toHaveLength(0);
  });

  it('TOGGLE_MEDICATION_TAKEN ignores an unknown medicine', () => {
    const base = makeAppState();
    expect(appReducer(base, { type: 'TOGGLE_MEDICATION_TAKEN', payload: { medicationId: 'nope', date: '2026-01-02', slot: 'morning' } })).toBe(base);
  });

  it('taking a dose today counts as a daily check-in', () => {
    const today = dateKey(new Date());
    const base = makeAppState({ medications: [med] });
    const state = appReducer(base, { type: 'TOGGLE_MEDICATION_TAKEN', payload: { medicationId: 'm1', date: today, slot: 'morning' } });
    expect(state.gamification.checkIns).toContain(today);
  });

  it('IMPORT_DATA merges and replaces medicines like other lists', () => {
    const other: Medication = { ...med, id: 'm2', name: 'อื่น' };
    const base = makeAppState({ medications: [med], medicationLogs: [log('morning')] });
    const merged = appReducer(base, {
      type: 'IMPORT_DATA',
      payload: { foodEntries: [], fastingSessions: [], medications: [other], medicationLogs: [log('evening')], mode: 'merge' },
    });
    expect(merged.medications.map((m) => m.id).sort()).toEqual(['m1', 'm2']);
    expect(merged.medicationLogs).toHaveLength(2);

    const replaced = appReducer(base, {
      type: 'IMPORT_DATA',
      payload: { foodEntries: [], fastingSessions: [], medications: [other], medicationLogs: [], mode: 'replace' },
    });
    expect(replaced.medications.map((m) => m.id)).toEqual(['m2']);
    expect(replaced.medicationLogs).toHaveLength(0);

    // A backup without the medicine keys leaves the current data alone
    const untouched = appReducer(base, { type: 'IMPORT_DATA', payload: { foodEntries: [], fastingSessions: [], mode: 'replace' } });
    expect(untouched.medications).toEqual([med]);
  });
});
