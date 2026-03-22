export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snacks';

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

export interface AppState {
  foodEntries: FoodEntry[];
  fastingSessions: FastingSession[];
  activeFastingId: string | null;
  selectedDate: string;
  theme: 'light' | 'dark' | 'system';
}

export type AppAction =
  | { type: 'ADD_FOOD'; payload: Omit<FoodEntry, 'id' | 'createdAt'> }
  | { type: 'EDIT_FOOD'; payload: FoodEntry }
  | { type: 'DELETE_FOOD'; payload: { id: string } }
  | { type: 'START_FAST'; payload?: { targetHours?: number } }
  | { type: 'STOP_FAST' }
  | { type: 'DELETE_FAST'; payload: { id: string } }
  | { type: 'SET_SELECTED_DATE'; payload: string }
  | { type: 'SET_THEME'; payload: 'light' | 'dark' | 'system' }
  | { type: 'IMPORT_DATA'; payload: { foodEntries: FoodEntry[]; fastingSessions: FastingSession[] } }
  | { type: 'HYDRATE'; payload: AppState };
