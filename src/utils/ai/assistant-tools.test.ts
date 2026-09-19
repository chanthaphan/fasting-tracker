import { describe, it, expect } from 'vitest';
import { executeAssistantTool, findMedication, buildAssistantContext, ASSISTANT_TOOLS } from './assistant-tools';
import { makeAppState } from '../../test/app-state';
import type { Medication } from '../../types';

const TODAY = '2026-09-19';

const bp: Medication = { id: 'm1', name: 'ยาความดัน', dosage: '1 เม็ด', slots: ['morning', 'evening'], mealRelation: 'after', startDate: '2026-01-01', createdAt: 1 };
const vit: Medication = { id: 'm2', name: 'วิตามินซี', slots: ['morning'], mealRelation: 'none', startDate: '2026-01-01', createdAt: 2 };

describe('assistant tools', () => {
  it('declares every tool the executor handles', () => {
    expect(ASSISTANT_TOOLS.map((t) => t.name).sort()).toEqual(
      ['add_medication', 'log_food', 'log_weight', 'mark_medication', 'remove_medication', 'set_calorie_goal']
    );
  });

  it('log_food becomes an ADD_FOOD with rounded macros and today as the default date', () => {
    const out = executeAssistantTool('log_food', { name: 'ข้าวกะเพราไก่ 1 จาน', calories: 550.4, protein: 28, meal_type: 'lunch' }, makeAppState(), TODAY);
    expect(out.actions).toEqual([
      { type: 'ADD_FOOD', payload: { name: 'ข้าวกะเพราไก่ 1 จาน', calories: 550, protein: 28, carbs: 0, fat: 0, mealType: 'lunch', date: TODAY } },
    ]);
    expect(out.labels).toHaveLength(1);
    expect(out.result).toContain('550');
  });

  it('log_food rejects an empty name and an unknown meal falls back to snacks', () => {
    expect(executeAssistantTool('log_food', { name: '', calories: 100, meal_type: 'lunch' }, makeAppState(), TODAY).actions).toHaveLength(0);
    const out = executeAssistantTool('log_food', { name: 'กล้วย', calories: 100, meal_type: 'brunch' }, makeAppState(), TODAY);
    expect(out.actions[0]).toMatchObject({ type: 'ADD_FOOD', payload: { mealType: 'snacks' } });
  });

  it('log_weight defaults to kg and rejects nonsense', () => {
    const out = executeAssistantTool('log_weight', { weight: 65 }, makeAppState(), TODAY);
    expect(out.actions).toEqual([{ type: 'ADD_WEIGHT', payload: { weight: 65, unit: 'kg', date: TODAY, note: undefined } }]);
    expect(executeAssistantTool('log_weight', { weight: -3 }, makeAppState(), TODAY).actions).toHaveLength(0);
  });

  it('add_medication keeps slots in canonical order and starts today', () => {
    const out = executeAssistantTool('add_medication', { name: 'ยาเบาหวาน', slots: ['evening', 'morning'], meal_relation: 'before' }, makeAppState(), TODAY);
    expect(out.actions).toEqual([
      { type: 'ADD_MEDICATION', payload: { name: 'ยาเบาหวาน', dosage: undefined, slots: ['morning', 'evening'], mealRelation: 'before', startDate: TODAY } },
    ]);
    expect(executeAssistantTool('add_medication', { name: 'x', slots: [] }, makeAppState(), TODAY).actions).toHaveLength(0);
  });

  it('add_medication refuses a duplicate name', () => {
    const out = executeAssistantTool('add_medication', { name: 'ยาความดัน', slots: ['morning'] }, makeAppState({ medications: [bp] }), TODAY);
    expect(out.actions).toHaveLength(0);
    expect(out.result).toContain('อยู่ในรายการแล้ว');
  });

  it('mark_medication toggles only the untaken doses it names', () => {
    const state = makeAppState({
      medications: [bp, vit],
      medicationLogs: [{ id: 'l1', medicationId: 'm1', date: TODAY, slot: 'morning', takenAt: 1 }],
    });
    // "กินยาความดันแล้ว" with no slot: morning is already taken, so only evening toggles
    const out = executeAssistantTool('mark_medication', { medication_name: 'ความดัน' }, state, TODAY);
    expect(out.actions).toEqual([{ type: 'TOGGLE_MEDICATION_TAKEN', payload: { medicationId: 'm1', date: TODAY, slot: 'evening' } }]);

    // all morning medicine: only the vitamin is still untaken in the morning
    const all = executeAssistantTool('mark_medication', { all_medications: true, slot: 'morning' }, state, TODAY);
    expect(all.actions).toEqual([{ type: 'TOGGLE_MEDICATION_TAKEN', payload: { medicationId: 'm2', date: TODAY, slot: 'morning' } }]);

    // un-taking the morning dose
    const undo = executeAssistantTool('mark_medication', { medication_name: 'ยาความดัน', slot: 'morning', taken: false }, state, TODAY);
    expect(undo.actions).toEqual([{ type: 'TOGGLE_MEDICATION_TAKEN', payload: { medicationId: 'm1', date: TODAY, slot: 'morning' } }]);

    // nothing to do is reported, not toggled
    const noop = executeAssistantTool('mark_medication', { medication_name: 'ยาความดัน', slot: 'morning' }, state, TODAY);
    expect(noop.actions).toHaveLength(0);
  });

  it('mark_medication explains an unknown or ambiguous medicine', () => {
    const state = makeAppState({ medications: [bp, { ...vit, name: 'ยาความดันตัวใหม่' }] });
    const unknown = executeAssistantTool('mark_medication', { medication_name: 'ยาแก้ปวด' }, state, TODAY);
    expect(unknown.actions).toHaveLength(0);
    expect(unknown.result).toContain('ไม่พบยา');
    const ambiguous = executeAssistantTool('mark_medication', { medication_name: 'ความดัน' }, state, TODAY);
    expect(ambiguous.actions).toHaveLength(0);
    expect(ambiguous.result).toContain('ไม่ชัดเจน');
  });

  it('remove_medication and set_calorie_goal map to their actions', () => {
    const state = makeAppState({ medications: [bp] });
    expect(executeAssistantTool('remove_medication', { medication_name: 'ยาความดัน' }, state, TODAY).actions).toEqual([{ type: 'DELETE_MEDICATION', payload: { id: 'm1' } }]);
    expect(executeAssistantTool('set_calorie_goal', { calories: 1800 }, state, TODAY).actions).toEqual([
      { type: 'SET_GOALS', payload: { ...state.goals, calories: 1800 } },
    ]);
    expect(executeAssistantTool('set_calorie_goal', { calories: 10 }, state, TODAY).actions).toHaveLength(0);
    expect(executeAssistantTool('nope', {}, state, TODAY).actions).toHaveLength(0);
  });

  it('findMedication prefers an exact match over partial ones', () => {
    const meds = [bp, { ...vit, name: 'ยาความดัน เม็ดเล็ก' }];
    expect(findMedication(meds, 'ยาความดัน').match?.id).toBe('m1');
    expect(findMedication(meds, 'เม็ดเล็ก').match?.id).toBe('m2');
    expect(findMedication(meds, 'ความดัน').match).toBeNull();
  });

  it('context lists today\'s food, weight and medicine status in Thai', () => {
    const state = makeAppState({
      medications: [bp],
      medicationLogs: [{ id: 'l1', medicationId: 'm1', date: TODAY, slot: 'morning', takenAt: new Date('2026-09-19T08:10:00').getTime() }],
      foodEntries: [{ id: 'f1', name: 'ข้าวต้ม', calories: 300, protein: 10, carbs: 50, fat: 5, mealType: 'breakfast', date: TODAY, createdAt: 1 }],
      weightEntries: [{ id: 'w1', weight: 65, unit: 'kg', date: TODAY, createdAt: 1 }],
    });
    const ctx = buildAssistantContext(state, TODAY, new Date('2026-09-19T09:00:00'));
    expect(ctx).toContain('ข้าวต้ม 300 แคล');
    expect(ctx).toContain('65 กก.');
    expect(ctx).toContain('ยาความดัน (1 เม็ด) หลังอาหาร');
    expect(ctx).toContain('เช้า: กินแล้ว 08:10');
    expect(ctx).toContain('เย็น: ยังไม่กิน');
  });
});
