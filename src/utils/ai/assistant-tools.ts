import type Anthropic from '@anthropic-ai/sdk';
import type { AppAction, AppState, MealRelation, MealType, MedSlot, Medication } from '../../types';
import { MED_SLOTS } from '../../constants/med-slots';
import { MEAL_TYPES } from '../../constants/meal-types';
import { dosesForDay } from '../medication';
import { sumMacros } from '../macro-calc';
import { formatDate, translate } from '../../i18n';
import { unitLabel } from '../../i18n';

/**
 * The adult-mode assistant does the logging for the user: every tool here
 * maps onto a reducer action, so what the chat records is exactly what the
 * forms would have recorded.
 */
export const ASSISTANT_TOOLS: Anthropic.Tool[] = [
  {
    name: 'log_food',
    description:
      'บันทึกอาหารที่ผู้ใช้กิน 1 รายการ ประเมินแคลอรีและสารอาหารตามปริมาณอาหารไทยทั่วไป เรียกหลายครั้งได้ถ้ามีหลายอย่าง',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'ชื่ออาหารภาษาไทย รวมปริมาณ เช่น "ข้าวกะเพราไก่ 1 จาน"' },
        calories: { type: 'number', description: 'แคลอรีโดยประมาณ (kcal)' },
        protein: { type: 'number', description: 'โปรตีน (กรัม)' },
        carbs: { type: 'number', description: 'คาร์โบไฮเดรต (กรัม)' },
        fat: { type: 'number', description: 'ไขมัน (กรัม)' },
        meal_type: { type: 'string', enum: ['breakfast', 'lunch', 'dinner', 'snacks'], description: 'มื้ออาหาร' },
        date: { type: 'string', description: 'วันที่ YYYY-MM-DD ถ้าไม่ระบุคือวันนี้' },
      },
      required: ['name', 'calories', 'meal_type'],
    },
  },
  {
    name: 'log_weight',
    description: 'บันทึกน้ำหนักตัวของผู้ใช้',
    input_schema: {
      type: 'object',
      properties: {
        weight: { type: 'number', description: 'น้ำหนัก' },
        unit: { type: 'string', enum: ['kg', 'lbs'], description: 'หน่วย ค่าเริ่มต้น kg' },
        date: { type: 'string', description: 'วันที่ YYYY-MM-DD ถ้าไม่ระบุคือวันนี้' },
        note: { type: 'string', description: 'หมายเหตุสั้น ๆ (ถ้ามี)' },
      },
      required: ['weight'],
    },
  },
  {
    name: 'add_medication',
    description: 'เพิ่มยาที่ผู้ใช้ต้องกินเป็นประจำเข้ารายการยา',
    input_schema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'ชื่อยา' },
        dosage: { type: 'string', description: 'ขนาดยา เช่น "1 เม็ด"' },
        slots: {
          type: 'array',
          items: { type: 'string', enum: ['morning', 'noon', 'evening', 'bedtime'] },
          description: 'ช่วงเวลาที่กิน: morning=เช้า noon=กลางวัน evening=เย็น bedtime=ก่อนนอน',
        },
        meal_relation: { type: 'string', enum: ['before', 'after', 'none'], description: 'ก่อนอาหาร/หลังอาหาร/ไม่ระบุ' },
      },
      required: ['name', 'slots'],
    },
  },
  {
    name: 'mark_medication',
    description:
      'บันทึกว่ากินยาแล้ว (หรือยกเลิก) ถ้าผู้ใช้ไม่ระบุชื่อยา ให้ใช้ all_medications=true เพื่อบันทึกทุกตัวในช่วงเวลานั้น',
    input_schema: {
      type: 'object',
      properties: {
        medication_name: { type: 'string', description: 'ชื่อยา (ใกล้เคียงได้)' },
        all_medications: { type: 'boolean', description: 'true = ทุกตัวในช่วงเวลาที่ระบุ' },
        slot: { type: 'string', enum: ['morning', 'noon', 'evening', 'bedtime'], description: 'ช่วงเวลา ถ้าไม่ระบุคือทุกช่วงของยานั้น' },
        taken: { type: 'boolean', description: 'true = กินแล้ว (ค่าเริ่มต้น), false = ยังไม่ได้กิน/ยกเลิก' },
        date: { type: 'string', description: 'วันที่ YYYY-MM-DD ถ้าไม่ระบุคือวันนี้' },
      },
      required: [],
    },
  },
  {
    name: 'update_medication',
    description: 'แก้ไขยาที่มีอยู่แล้ว เช่น เปลี่ยนชื่อ ขนาดยา ช่วงเวลากิน หรือก่อน/หลังอาหาร ระบุเฉพาะช่องที่ต้องการเปลี่ยน',
    input_schema: {
      type: 'object',
      properties: {
        medication_name: { type: 'string', description: 'ชื่อยาที่ต้องการแก้ไข (ใกล้เคียงได้)' },
        new_name: { type: 'string', description: 'ชื่อใหม่ (ถ้าเปลี่ยน)' },
        dosage: { type: 'string', description: 'ขนาดยาใหม่ (ถ้าเปลี่ยน)' },
        slots: {
          type: 'array',
          items: { type: 'string', enum: ['morning', 'noon', 'evening', 'bedtime'] },
          description: 'ช่วงเวลากินใหม่ทั้งหมด (แทนที่ของเดิม)',
        },
        meal_relation: { type: 'string', enum: ['before', 'after', 'none'] },
      },
      required: ['medication_name'],
    },
  },
  {
    name: 'get_medication_history',
    description: 'ดูประวัติการกินยาย้อนหลังเป็นรายวัน (กินครบไหม ตัวไหนขาด) ใช้เมื่อถามเรื่องวันก่อน ๆ หรือสัปดาห์ที่ผ่านมา',
    input_schema: {
      type: 'object',
      properties: {
        days: { type: 'number', description: 'จำนวนวันย้อนหลัง (1–30) ค่าเริ่มต้น 7' },
      },
      required: [],
    },
  },
  {
    name: 'remove_medication',
    description: 'ลบยาออกจากรายการยา ใช้เมื่อผู้ใช้บอกว่าเลิกกินยานั้นแล้ว',
    input_schema: {
      type: 'object',
      properties: {
        medication_name: { type: 'string', description: 'ชื่อยา (ใกล้เคียงได้)' },
      },
      required: ['medication_name'],
    },
  },
  {
    name: 'set_calorie_goal',
    description: 'ตั้งเป้าหมายแคลอรีต่อวัน',
    input_schema: {
      type: 'object',
      properties: {
        calories: { type: 'number', description: 'แคลอรีต่อวัน' },
      },
      required: ['calories'],
    },
  },
];

const SLOT_TH: Record<MedSlot, string> = { morning: 'เช้า', noon: 'กลางวัน', evening: 'เย็น', bedtime: 'ก่อนนอน' };
const MEAL_TH: Record<MealType, string> = { breakfast: 'มื้อเช้า', lunch: 'มื้อกลางวัน', dinner: 'มื้อเย็น', snacks: 'ของว่าง' };
const RELATION_TH: Record<MealRelation, string> = { before: 'ก่อนอาหาร', after: 'หลังอาหาร', none: '' };

export interface ToolOutcome {
  /** What the model reads back */
  result: string;
  /** Actions to apply to the store, in order */
  actions: AppAction[];
  /** One-line description of each change, for the chat UI */
  labels: string[];
}

const isSlot = (v: unknown): v is MedSlot => typeof v === 'string' && v in SLOT_TH;
const isMeal = (v: unknown): v is MealType => typeof v === 'string' && v in MEAL_TH;
const isDateKey = (v: unknown): v is string => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v);
const num = (v: unknown): number => (typeof v === 'number' && Number.isFinite(v) ? v : Number(v) || 0);
const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');
const parseDateKey = (key: string): Date => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};

/** Case-insensitive match on the medicine name: exact first, then a containing match either way. */
export function findMedication(medications: Medication[], query: string): { match: Medication | null; candidates: Medication[] } {
  const q = query.trim().toLowerCase();
  if (!q) return { match: null, candidates: [] };
  const exact = medications.filter((m) => m.name.toLowerCase() === q);
  if (exact.length === 1) return { match: exact[0], candidates: exact };
  const partial = medications.filter((m) => m.name.toLowerCase().includes(q) || q.includes(m.name.toLowerCase()));
  if (partial.length === 1) return { match: partial[0], candidates: partial };
  return { match: null, candidates: partial };
}

export function executeAssistantTool(name: string, input: unknown, state: AppState, today: string): ToolOutcome {
  const args = (typeof input === 'object' && input !== null ? input : {}) as Record<string, unknown>;
  const fail = (result: string): ToolOutcome => ({ result, actions: [], labels: [] });

  switch (name) {
    case 'log_food': {
      const foodName = str(args.name);
      if (!foodName) return fail('ต้องระบุชื่ออาหาร');
      const mealType = isMeal(args.meal_type) ? args.meal_type : 'snacks';
      const date = isDateKey(args.date) ? args.date : today;
      const entry = {
        name: foodName,
        calories: Math.max(0, Math.round(num(args.calories))),
        protein: Math.max(0, Math.round(num(args.protein))),
        carbs: Math.max(0, Math.round(num(args.carbs))),
        fat: Math.max(0, Math.round(num(args.fat))),
        mealType,
        date,
      };
      return {
        result: `บันทึกแล้ว: ${entry.name} ${entry.calories} แคล (${MEAL_TH[mealType]}, ${date})`,
        actions: [{ type: 'ADD_FOOD', payload: entry }],
        labels: [`🍽️ ${entry.name} · ${entry.calories} แคล (${MEAL_TH[mealType]})`],
      };
    }
    case 'log_weight': {
      const weight = num(args.weight);
      if (weight <= 0 || weight > 500) return fail('น้ำหนักไม่ถูกต้อง');
      const unit = args.unit === 'lbs' ? 'lbs' : 'kg';
      const date = isDateKey(args.date) ? args.date : today;
      const note = str(args.note) || undefined;
      return {
        result: `บันทึกน้ำหนัก ${weight} ${unit} (${date}) แล้ว`,
        actions: [{ type: 'ADD_WEIGHT', payload: { weight, unit, date, note } }],
        labels: [`⚖️ น้ำหนัก ${weight} ${unitLabel(unit, 'th')}`],
      };
    }
    case 'add_medication': {
      const medName = str(args.name);
      if (!medName) return fail('ต้องระบุชื่อยา');
      const slots = Array.isArray(args.slots) ? MED_SLOTS.map((s) => s.value).filter((v) => (args.slots as unknown[]).includes(v)) : [];
      if (slots.length === 0) return fail('ต้องระบุช่วงเวลาที่กินอย่างน้อย 1 ช่วง (morning/noon/evening/bedtime)');
      const existing = findMedication(state.medications, medName).match;
      if (existing && existing.name.toLowerCase() === medName.toLowerCase()) return fail(`มียา "${existing.name}" อยู่ในรายการแล้ว`);
      const mealRelation: MealRelation = args.meal_relation === 'before' || args.meal_relation === 'none' ? args.meal_relation : 'after';
      const dosage = str(args.dosage) || undefined;
      return {
        result: `เพิ่มยา ${medName}${dosage ? ` (${dosage})` : ''} ช่วง ${slots.map((s) => SLOT_TH[s]).join('/')} ${RELATION_TH[mealRelation]} แล้ว`,
        actions: [{ type: 'ADD_MEDICATION', payload: { name: medName, dosage, slots, mealRelation, startDate: today } }],
        labels: [`💊 เพิ่มยา ${medName} (${slots.map((s) => SLOT_TH[s]).join('/')})`],
      };
    }
    case 'mark_medication': {
      const date = isDateKey(args.date) ? args.date : today;
      const taken = args.taken !== false;
      const slot = isSlot(args.slot) ? args.slot : null;
      const doses = dosesForDay(state.medications, state.medicationLogs, date);
      let targets = doses;
      if (!args.all_medications) {
        const query = str(args.medication_name);
        if (!query) return fail('ต้องระบุชื่อยา หรือใช้ all_medications=true');
        const { match, candidates } = findMedication(state.medications, query);
        if (!match) {
          return fail(
            candidates.length > 1
              ? `ชื่อยาไม่ชัดเจน มีหลายตัวที่ใกล้เคียง: ${candidates.map((m) => m.name).join(', ')}`
              : `ไม่พบยาชื่อ "${query}" ในรายการ (รายการยา: ${state.medications.map((m) => m.name).join(', ') || 'ยังไม่มี'})`
          );
        }
        targets = doses.filter((d) => d.medication.id === match.id);
      }
      if (slot) targets = targets.filter((d) => d.slot === slot);
      if (targets.length === 0) return fail('ไม่มียาที่ต้องกินตามที่ระบุในวันนั้น');
      const changed = targets.filter((d) => (d.log !== null) !== taken);
      const actions: AppAction[] = changed.map((d) => ({
        type: 'TOGGLE_MEDICATION_TAKEN',
        payload: { medicationId: d.medication.id, date, slot: d.slot },
      }));
      const describe = (list: typeof targets) => list.map((d) => `${d.medication.name} (${SLOT_TH[d.slot]})`).join(', ');
      if (changed.length === 0) return fail(taken ? `บันทึกไว้แล้วว่ากิน ${describe(targets)} แล้ว` : `${describe(targets)} ยังไม่ได้บันทึกว่ากิน`);
      return {
        result: taken ? `บันทึกว่ากิน ${describe(changed)} แล้ว` : `ยกเลิกการกิน ${describe(changed)} แล้ว`,
        actions,
        labels: changed.map((d) => `${taken ? '✅' : '↩️'} ${d.medication.name} · ${SLOT_TH[d.slot]}`),
      };
    }
    case 'update_medication': {
      const query = str(args.medication_name);
      const { match, candidates } = findMedication(state.medications, query);
      if (!match) {
        return fail(candidates.length > 1 ? `ชื่อยาไม่ชัดเจน: ${candidates.map((m) => m.name).join(', ')}` : `ไม่พบยาชื่อ "${query}"`);
      }
      const next: Medication = { ...match };
      const changes: string[] = [];
      const newName = str(args.new_name);
      if (newName && newName !== match.name) { next.name = newName; changes.push(`ชื่อ → ${newName}`); }
      if (typeof args.dosage === 'string') {
        const dosage = str(args.dosage) || undefined;
        if (dosage !== match.dosage) { next.dosage = dosage; changes.push(`ขนาด → ${dosage ?? '-'}`); }
      }
      if (Array.isArray(args.slots)) {
        const slots = MED_SLOTS.map((s) => s.value).filter((v) => (args.slots as unknown[]).includes(v));
        if (slots.length === 0) return fail('ต้องเหลือช่วงเวลากินอย่างน้อย 1 ช่วง');
        if (slots.join() !== match.slots.join()) { next.slots = slots; changes.push(`เวลา → ${slots.map((s) => SLOT_TH[s]).join('/')}`); }
      }
      if (args.meal_relation === 'before' || args.meal_relation === 'after' || args.meal_relation === 'none') {
        if (args.meal_relation !== match.mealRelation) { next.mealRelation = args.meal_relation; changes.push(RELATION_TH[args.meal_relation] || 'ไม่ระบุก่อน/หลังอาหาร'); }
      }
      if (changes.length === 0) return fail(`ไม่มีอะไรเปลี่ยนสำหรับ ${match.name}`);
      return {
        result: `แก้ไข ${match.name} แล้ว: ${changes.join(', ')}`,
        actions: [{ type: 'EDIT_MEDICATION', payload: next }],
        labels: [`✏️ ${match.name}: ${changes.join(', ')}`],
      };
    }
    case 'get_medication_history': {
      const days = Math.min(30, Math.max(1, Math.round(num(args.days)) || 7));
      if (state.medications.length === 0) return fail('ยังไม่มีรายการยา');
      const lines: string[] = [];
      const base = parseDateKey(today);
      for (let i = 1; i <= days; i++) {
        const d = new Date(base.getTime() - i * 86400000);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        const doses = dosesForDay(state.medications, state.medicationLogs, key);
        if (doses.length === 0) continue;
        const missed = doses.filter((x) => x.log === null);
        lines.push(
          `${formatDate(key, 'th', 'weekdayShort')}: กิน ${doses.length - missed.length}/${doses.length}` +
            (missed.length ? ` ขาด ${missed.map((x) => `${x.medication.name} (${SLOT_TH[x.slot]})`).join(', ')}` : ' ครบ')
        );
      }
      return { result: lines.length ? lines.join('\n') : 'ไม่มีข้อมูลในช่วงนั้น', actions: [], labels: [] };
    }
    case 'remove_medication': {
      const query = str(args.medication_name);
      const { match, candidates } = findMedication(state.medications, query);
      if (!match) {
        return fail(candidates.length > 1 ? `ชื่อยาไม่ชัดเจน: ${candidates.map((m) => m.name).join(', ')}` : `ไม่พบยาชื่อ "${query}"`);
      }
      return {
        result: `ลบยา ${match.name} ออกจากรายการแล้ว`,
        actions: [{ type: 'DELETE_MEDICATION', payload: { id: match.id } }],
        labels: [`🗑️ ลบยา ${match.name}`],
      };
    }
    case 'set_calorie_goal': {
      const calories = Math.round(num(args.calories));
      if (calories < 500 || calories > 10000) return fail('เป้าหมายแคลอรีควรอยู่ระหว่าง 500–10000');
      return {
        result: `ตั้งเป้าหมาย ${calories} แคลต่อวันแล้ว`,
        actions: [{ type: 'SET_GOALS', payload: { ...state.goals, calories } }],
        labels: [`🎯 เป้าหมาย ${calories} แคล/วัน`],
      };
    }
    default:
      return fail(`ไม่รู้จักเครื่องมือ ${name}`);
  }
}

/** Today's data in Thai, compact enough to send on every turn. */
export function buildAssistantContext(state: AppState, today: string, now: Date = new Date()): string {
  const lines: string[] = [];
  lines.push(`วันนี้: ${today} (${formatDate(today, 'th', 'long')}) เวลา ${formatDate(now, 'th', 'time')} น.`);
  lines.push(`เป้าหมายแคลอรีต่อวัน: ${state.goals.calories}`);

  const todayFood = state.foodEntries.filter((e) => e.date === today);
  if (todayFood.length === 0) lines.push('อาหารวันนี้: ยังไม่ได้บันทึก');
  else {
    const totals = sumMacros(todayFood);
    lines.push(`อาหารวันนี้ (รวม ${totals.calories} แคล, โปรตีน ${totals.protein} ก.):`);
    for (const m of MEAL_TYPES) {
      const items = todayFood.filter((e) => e.mealType === m.value);
      if (items.length) lines.push(`- ${translate('th', m.labelKey)}: ${items.map((e) => `${e.name} ${e.calories} แคล`).join(', ')}`);
    }
  }

  const weights = [...state.weightEntries].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
  if (weights.length === 0) lines.push('น้ำหนัก: ยังไม่มีบันทึก');
  else {
    lines.push(
      `น้ำหนักล่าสุด: ${weights
        .slice(0, 3)
        .map((w) => `${w.weight} ${unitLabel(w.unit, 'th')} (${formatDate(w.date, 'th', 'short')})`)
        .join(', ')}`
    );
  }
  if (state.weightGoal) lines.push(`เป้าหมายน้ำหนัก: ${state.weightGoal.targetWeight} ${unitLabel(state.weightGoal.unit, 'th')} ภายใน ${formatDate(state.weightGoal.targetDate, 'th', 'short')}`);

  if (state.medications.length === 0) lines.push('รายการยา: ยังไม่มี');
  else {
    const doses = dosesForDay(state.medications, state.medicationLogs, today);
    lines.push('รายการยาและสถานะวันนี้:');
    for (const m of state.medications) {
      const status = m.slots
        .map((s) => {
          const d = doses.find((x) => x.medication.id === m.id && x.slot === s);
          return `${SLOT_TH[s]}: ${d?.log ? `กินแล้ว ${formatDate(d.log.takenAt, 'th', 'time')}` : d ? 'ยังไม่กิน' : 'ยังไม่เริ่ม'}`;
        })
        .join(', ');
      lines.push(`- ${m.name}${m.dosage ? ` (${m.dosage})` : ''} ${RELATION_TH[m.mealRelation]} — ${status}`);
    }
  }
  return lines.join('\n');
}

export const ASSISTANT_SYSTEM =
  'คุณคือ "ผู้ช่วย" ในแอปบันทึกสุขภาพสำหรับผู้ใหญ่ชาวไทย ผู้ใช้อาจเป็นผู้สูงอายุที่ไม่ถนัดเทคโนโลยี ' +
  'ตอบเป็นภาษาไทยเสมอ ใช้ภาษาง่าย ๆ สุภาพ อบอุ่น และสั้นกระชับ (ปกติไม่เกิน 3 ประโยค) หลีกเลี่ยงศัพท์เทคนิคและอังกฤษ ไม่ต้องใช้หัวข้อหรือตาราง ' +
  'หน้าที่หลักคือบันทึกข้อมูลแทนผู้ใช้ด้วยเครื่องมือที่มีให้: ' +
  'เมื่อผู้ใช้บอกว่ากินอะไร ให้ประเมินแคลอรี โปรตีน คาร์บ ไขมัน ตามปริมาณอาหารไทยทั่วไป (รวมของจากเซเว่นและร้านอาหาร) แล้วเรียก log_food ทันทีทีละรายการ โดยไม่ต้องถามยืนยัน เดามื้อจากเวลาปัจจุบันถ้าไม่ระบุ; ' +
  'เมื่อผู้ใช้ส่งรูปอาหาร ให้ระบุอาหารทุกอย่างในรูป ประเมินปริมาณจากที่เห็น แล้ว log_food ทีละรายการทันที; ' +
  'เมื่อบอกน้ำหนัก ให้เรียก log_weight; เมื่อบอกว่ากินยาแล้ว ให้เรียก mark_medication (ถ้าไม่ระบุชื่อยาให้ใช้ all_medications=true กับช่วงเวลาที่กล่าวถึง หรือช่วงเวลาปัจจุบัน); ' +
  'เมื่อขอเพิ่มยาใหม่ ให้เรียก add_medication ทันทีถ้ารู้ชื่อยาและช่วงเวลากินแล้ว ถ้ายังไม่ครบ ให้ถามทีละข้อสั้น ๆ (ชื่อยา → กินตอนไหน เช้า/กลางวัน/เย็น/ก่อนนอน → ครั้งละเท่าไร → ก่อนหรือหลังอาหาร) แล้วค่อยบันทึก; ' +
  'เมื่อขอเปลี่ยนเวลากิน ขนาดยา หรือชื่อยา ให้เรียก update_medication; เมื่อบอกว่าเลิกกินยา ให้เรียก remove_medication; ' +
  'คำถามเรื่องยาของผู้ใช้ (กินตอนไหน ครบหรือยัง ขาดวันไหน) ให้ตอบจากรายการยาด้านล่าง และใช้ get_medication_history เมื่อถามถึงวันก่อน ๆ; ' +
  'คำถามความรู้ทั่วไปเกี่ยวกับยา (ยานี้ใช้ทำอะไร ควรกินอย่างไร ข้อควรระวังทั่วไป) ตอบได้ในระดับข้อมูลทั่วไป สั้นและเข้าใจง่าย พร้อมย้ำให้ยึดตามฉลากยาและคำแนะนำของแพทย์หรือเภสัชกร ถ้าไม่แน่ใจให้บอกตรง ๆ; ' +
  'คำถามเกี่ยวกับสิ่งที่กิน น้ำหนัก หรือยาที่ต้องกิน ให้ตอบจากข้อมูลของผู้ใช้ด้านล่างโดยระบุตัวเลขจริง ' +
  'หลังใช้เครื่องมือ ให้สรุปสั้น ๆ ว่าบันทึกอะไรไปแล้ว และถ้าเหลือยาที่ยังไม่ได้กินในวันนี้ ให้เตือนอย่างนุ่มนวล ' +
  'คุณไม่ใช่แพทย์: ห้ามวินิจฉัยโรค ห้ามแนะนำให้เพิ่ม ลด หรือหยุดยาเอง ให้แนะนำปรึกษาแพทย์หรือเภสัชกรเมื่อมีคำถามเรื่องยา อาการป่วย หรือการกินที่ผิดปกติ';
