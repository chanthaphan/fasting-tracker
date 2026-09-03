export type WeightUnit = 'kg' | 'lbs';

export const LBS_PER_KG = 2.20462;

/** Convert a weight in the given unit to kilograms. Unknown units are treated as kg. */
export function toKg(weight: number, unit: string): number {
  return unit === 'lbs' ? weight / LBS_PER_KG : weight;
}

/** Convert kilograms to the given display unit. */
export function fromKg(kg: number, unit: WeightUnit): number {
  return unit === 'lbs' ? kg * LBS_PER_KG : kg;
}

/** Convert a weight between units, rounded to one decimal. */
export function convertWeight(weight: number, from: string, to: WeightUnit): number {
  return round1(fromKg(toKg(weight, from), to));
}

export function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
