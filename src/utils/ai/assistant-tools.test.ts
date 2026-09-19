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
      ['add_medication', 'get_medication_history', 'log_food', 'log_weight', 'mark_medication', 'remove_medication', 'set_calorie_goal', 'set_sodium_goal', 'set_sugar_goal', 'update_medication']
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

  it('log_food carries sodium when the model gives it, and set_sodium_goal updates the goal', () => {
    const out = executeAssistantTool('log_food', { name: 'ก๋วยเตี๋ยวน้ำ', calories: 380, sodium: 1600.4, meal_type: 'dinner' }, makeAppState(), TODAY);
    expect(out.actions[0]).toMatchObject({ type: 'ADD_FOOD', payload: { sodium: 1600 } });
    expect(out.labels[0]).toContain('Na 1600');
    const state = makeAppState();
    expect(executeAssistantTool('set_sodium_goal', { sodium_mg: 1500 }, state, TODAY).actions).toEqual([
      { type: 'SET_GOALS', payload: { ...state.goals, sodium: 1500 } },
    ]);
    expect(executeAssistantTool('set_sodium_goal', { sodium_mg: 10 }, state, TODAY).actions).toHaveLength(0);
  });

  it('log_food carries sugar, and set_sugar_goal updates the goal', () => {
    const out = executeAssistantTool('log_food', { name: 'ชาเย็น', calories: 200, sugar: 32.2, meal_type: 'snacks' }, makeAppState(), TODAY);
    expect(out.actions[0]).toMatchObject({ type: 'ADD_FOOD', payload: { sugar: 32 } });
    expect(out.labels[0]).toContain('น้ำตาล 32');
    const state = makeAppState();
    expect(executeAssistantTool('set_sugar_goal', { sugar_g: 20 }, state, TODAY).actions).toEqual([
      { type: 'SET_GOALS', payload: { ...state.goals, sugar: 20 } },
    ]);
    expect(executeAssistantTool('set_sugar_goal', { sugar_g: 1 }, state, TODAY).actions).toHaveLength(0);
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

  it('update_medication changes only the fields given and keeps slot order', () => {
    const state = makeAppState({ medications: [bp] });
    const out = executeAssistantTool('update_medication', { medication_name: 'ความดัน', slots: ['bedtime', 'morning'], dosage: '2 เม็ด' }, state, TODAY);
    expect(out.actions).toEqual([{ type: 'EDIT_MEDICATION', payload: { ...bp, slots: ['morning', 'bedtime'], dosage: '2 เม็ด' } }]);
    expect(executeAssistantTool('update_medication', { medication_name: 'ความดัน' }, state, TODAY).actions).toHaveLength(0);
    expect(executeAssistantTool('update_medication', { medication_name: 'ความดัน', slots: [] }, state, TODAY).actions).toHaveLength(0);
    expect(executeAssistantTool('update_medication', { medication_name: 'ไม่มี', dosage: '1' }, state, TODAY).result).toContain('ไม่พบยา');
  });

  it('get_medication_history summarises past days with what was missed', () => {
    const state = makeAppState({
      medications: [bp],
      medicationLogs: [
        { id: 'a', medicationId: 'm1', date: '2026-09-18', slot: 'morning', takenAt: 1 },
        { id: 'b', medicationId: 'm1', date: '2026-09-18', slot: 'evening', takenAt: 1 },
        { id: 'c', medicationId: 'm1', date: '2026-09-17', slot: 'morning', takenAt: 1 },
      ],
    });
    const out = executeAssistantTool('get_medication_history', { days: 2 }, state, TODAY);
    expect(out.actions).toHaveLength(0);
    const lines = out.result.split('\n');
    expect(lines).toHaveLength(2);
    expect(lines[0]).toContain('กิน 2/2');
    expect(lines[0]).toContain('ครบ');
    expect(lines[1]).toContain('กิน 1/2');
    expect(lines[1]).toContain('ขาด ยาความดัน (เย็น)');
    expect(executeAssistantTool('get_medication_history', {}, makeAppState(), TODAY).result).toContain('ยังไม่มีรายการยา');
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
    expect(ctx).toContain('โซเดียมไม่เกิน 2000 มก.');
    expect(ctx).toContain('น้ำตาลไม่เกิน 24 ก.');
    expect(ctx).toContain('65 กก.');
    expect(ctx).toContain('ยาความดัน (1 เม็ด) หลังอาหาร');
    expect(ctx).toContain('เช้า: กินแล้ว 08:10');
    expect(ctx).toContain('เย็น: ยังไม่กิน');
  });
});
