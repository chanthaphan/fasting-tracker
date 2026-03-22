import type { FastingPhase } from '../types';

export const FASTING_PHASES: FastingPhase[] = [
  { id: 'fed', label: 'Fed State', description: 'Body digesting food', minHours: 0, maxHours: 4, color: '#10b981', bgColor: '#d1fae5' },
  { id: 'early-fasting', label: 'Early Fasting', description: 'Insulin levels dropping', minHours: 4, maxHours: 8, color: '#14b8a6', bgColor: '#ccfbf1' },
  { id: 'fat-burn-begin', label: 'Fat Burning Begins', description: 'Switching to fat for fuel', minHours: 8, maxHours: 12, color: '#06b6d4', bgColor: '#cffafe' },
  { id: 'fat-burn-zone', label: 'Fat Burning Zone', description: 'Steady fat oxidation', minHours: 12, maxHours: 18, color: '#3b82f6', bgColor: '#dbeafe' },
  { id: 'ketosis-begin', label: 'Ketosis Begins', description: 'Ketone production rising', minHours: 18, maxHours: 24, color: '#8b5cf6', bgColor: '#ede9fe' },
  { id: 'deep-ketosis', label: 'Deep Ketosis', description: 'Elevated ketone levels', minHours: 24, maxHours: 48, color: '#a855f7', bgColor: '#f3e8ff' },
  { id: 'autophagy', label: 'Autophagy', description: 'Cellular recycling active', minHours: 48, maxHours: Infinity, color: '#d946ef', bgColor: '#fae8ff' },
];
