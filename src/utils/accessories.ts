export type AccessoryId = 'wristband' | 'cap' | 'sunglasses' | 'medal' | 'crown';

export const ACCESSORY_LEVELS: Record<AccessoryId, number> = {
  wristband: 3,
  cap: 5,
  sunglasses: 8,
  medal: 10,
  crown: 15,
};

/**
 * Accessories unlocked at a given level, in draw order. Cumulative,
 * except the crown replaces the cap (highest headwear wins).
 */
export function getAccessoriesForLevel(level: number): AccessoryId[] {
  const unlocked = (Object.keys(ACCESSORY_LEVELS) as AccessoryId[]).filter(
    (id) => level >= ACCESSORY_LEVELS[id]
  );
  return unlocked.includes('crown') ? unlocked.filter((id) => id !== 'cap') : unlocked;
}
