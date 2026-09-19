import type { Medication, MedicationLog, MedSlot } from '../types';
import { MED_SLOT_ORDER } from '../constants/med-slots';

/** One dose on the day's schedule: which medicine, when, and whether it was taken. */
export interface ScheduledDose {
  medication: Medication;
  slot: MedSlot;
  log: MedicationLog | null;
}

/**
 * Every dose due on `date`, grouped by time of day. A medicine appears from
 * its start date on, so adding one today does not make yesterday look missed.
 */
export function dosesForDay(medications: Medication[], logs: MedicationLog[], date: string): ScheduledDose[] {
  const logIndex = new Map<string, MedicationLog>();
  for (const l of logs) if (l.date === date) logIndex.set(`${l.medicationId}|${l.slot}`, l);
  const doses: ScheduledDose[] = [];
  for (const medication of medications) {
    if (medication.startDate && medication.startDate > date) continue;
    for (const slot of medication.slots) {
      doses.push({ medication, slot, log: logIndex.get(`${medication.id}|${slot}`) ?? null });
    }
  }
  return doses.sort(
    (a, b) => MED_SLOT_ORDER[a.slot] - MED_SLOT_ORDER[b.slot] || a.medication.createdAt - b.medication.createdAt
  );
}

/** Doses on a day, split by slot in display order (slots with nothing due are omitted). */
export function dosesBySlot(doses: ScheduledDose[]): { slot: MedSlot; doses: ScheduledDose[] }[] {
  const groups = new Map<MedSlot, ScheduledDose[]>();
  for (const d of doses) {
    const list = groups.get(d.slot);
    if (list) list.push(d);
    else groups.set(d.slot, [d]);
  }
  return [...groups.entries()]
    .sort((a, b) => MED_SLOT_ORDER[a[0]] - MED_SLOT_ORDER[b[0]])
    .map(([slot, list]) => ({ slot, doses: list }));
}

export function doseProgress(doses: ScheduledDose[]): { taken: number; total: number } {
  return { taken: doses.filter((d) => d.log !== null).length, total: doses.length };
}
