import { describe, it, expect } from 'vitest';
import { dosesForDay, dosesBySlot, doseProgress } from './medication';
import { dueSlots } from '../hooks/use-medication-reminders';
import { makeAppState } from '../test/app-state';
import type { Medication, MedicationLog } from '../types';

const bp: Medication = { id: 'm1', name: 'ยาความดัน', slots: ['evening', 'morning'], mealRelation: 'after', startDate: '2026-01-10', createdAt: 2 };
const vit: Medication = { id: 'm2', name: 'วิตามิน', slots: ['morning'], mealRelation: 'none', startDate: '2026-01-01', createdAt: 1 };
const taken: MedicationLog = { id: 'l1', medicationId: 'm1', date: '2026-01-15', slot: 'morning', takenAt: 5 };

describe('dosesForDay', () => {
  it('lists every slot of every medicine, morning first, with its log', () => {
    const doses = dosesForDay([bp, vit], [taken], '2026-01-15');
    expect(doses.map((d) => `${d.medication.id}:${d.slot}:${d.log ? 'taken' : 'due'}`)).toEqual([
      'm2:morning:due',
      'm1:morning:taken',
      'm1:evening:due',
    ]);
  });

  it('hides a medicine on days before it was started', () => {
    expect(dosesForDay([bp, vit], [], '2026-01-05').map((d) => d.medication.id)).toEqual(['m2']);
  });

  it('ignores logs from other days', () => {
    expect(dosesForDay([bp], [taken], '2026-01-16').every((d) => d.log === null)).toBe(true);
  });

  it('groups by slot and counts progress', () => {
    const doses = dosesForDay([bp, vit], [taken], '2026-01-15');
    expect(dosesBySlot(doses).map((g) => [g.slot, g.doses.length])).toEqual([['morning', 2], ['evening', 1]]);
    expect(doseProgress(doses)).toEqual({ taken: 1, total: 3 });
  });
});

describe('dueSlots', () => {
  const reminders = { enabled: true, times: { morning: '08:00', noon: '12:00', evening: '18:00', bedtime: '21:00' } };

  it('is empty while reminders are off', () => {
    const state = makeAppState({ medications: [bp, vit], medReminders: { ...reminders, enabled: false } });
    expect(dueSlots(state, '2026-01-15', new Date('2026-01-15T09:00:00'))).toEqual([]);
  });

  it('reports slots whose time has passed and still have untaken doses', () => {
    const state = makeAppState({ medications: [bp, vit], medicationLogs: [taken], medReminders: reminders });
    // 09:00 — morning is due (vitamin untaken), evening not yet
    expect(dueSlots(state, '2026-01-15', new Date('2026-01-15T09:00:00'))).toEqual([{ slot: 'morning', remaining: 1 }]);
    // 19:00 — evening joins
    expect(dueSlots(state, '2026-01-15', new Date('2026-01-15T19:00:00'))).toEqual([
      { slot: 'morning', remaining: 1 },
      { slot: 'evening', remaining: 1 },
    ]);
    // before 08:00 nothing is due
    expect(dueSlots(state, '2026-01-15', new Date('2026-01-15T07:59:00'))).toEqual([]);
  });

  it('drops a slot once everything in it is taken', () => {
    const allMorning: MedicationLog = { id: 'l2', medicationId: 'm2', date: '2026-01-15', slot: 'morning', takenAt: 6 };
    const state = makeAppState({ medications: [bp, vit], medicationLogs: [taken, allMorning], medReminders: reminders });
    expect(dueSlots(state, '2026-01-15', new Date('2026-01-15T09:00:00'))).toEqual([]);
  });
});
