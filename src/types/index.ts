export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snacks';

export interface MacroGoals {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface FoodEntry {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  mealType: MealType;
  date: string; // 'YYYY-MM-DD'
  createdAt: number;
}

export interface FastingSession {
  id: string;
  startTime: number; // Unix ms
  endTime: number | null; // null = active
  targetHours?: number;
}

export interface FastingPhase {
  id: string;
  label: string;
  description: string;
  minHours: number;
  maxHours: number;
  color: string;
  bgColor: string;
}

export interface WeightEntry {
  id: string;
  weight: number; // in kg or lbs depending on user pref
  unit: 'kg' | 'lbs';
  date: string; // 'YYYY-MM-DD'
  note?: string;
  createdAt: number;
}

export interface WeightGoal {
  targetWeight: number;
  unit: 'kg' | 'lbs';
  targetDate: string; // 'YYYY-MM-DD'
  startWeight: number;
  startDate: string; // 'YYYY-MM-DD'
}

export interface AppState {
  foodEntries: FoodEntry[];
  fastingSessions: FastingSession[];
  weightEntries: WeightEntry[];
  activeFastingId: string | null;
  selectedDate: string;
  theme: 'light' | 'dark' | 'system';
  goals: MacroGoals;
  weightGoal: WeightGoal | null;
}

export type AppAction =
  | { type: 'ADD_FOOD'; payload: Omit<FoodEntry, 'id' | 'createdAt'> }
  | { type: 'EDIT_FOOD'; payload: FoodEntry }
  | { type: 'DELETE_FOOD'; payload: { id: string } }
  | { type: 'START_FAST'; payload?: { targetHours?: number } }
  | { type: 'STOP_FAST' }
  | { type: 'DELETE_FAST'; payload: { id: string } }
  | { type: 'EDIT_FAST'; payload: { id: string; startTime: number; endTime: number | null } }
  | { type: 'ADD_WEIGHT'; payload: Omit<WeightEntry, 'id' | 'createdAt'> }
  | { type: 'EDIT_WEIGHT'; payload: WeightEntry }
  | { type: 'DELETE_WEIGHT'; payload: { id: string } }
  | { type: 'SET_SELECTED_DATE'; payload: string }
  | { type: 'SET_THEME'; payload: 'light' | 'dark' | 'system' }
  | { type: 'SET_GOALS'; payload: MacroGoals }
  | { type: 'SET_WEIGHT_GOAL'; payload: WeightGoal | null }
  | { type: 'IMPORT_DATA'; payload: { foodEntries: FoodEntry[]; fastingSessions: FastingSession[]; weightEntries?: WeightEntry[] } }
  | { type: 'HYDRATE'; payload: AppState };
