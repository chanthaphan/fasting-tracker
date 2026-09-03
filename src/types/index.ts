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

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';

export interface UserProfile {
  gender: 'male' | 'female';
  age: number;
  heightCm: number;
  activityLevel: ActivityLevel;
}

export interface ExerciseEntry {
  id: string;
  name: string;
  calories: number; // calories burned
  durationMin: number;
  date: string; // 'YYYY-MM-DD'
  note?: string;
  createdAt: number;
}

export type AiModel = 'claude-opus-5' | 'claude-haiku-4-5';

export type AiLanguage = 'auto' | 'th' | 'en';

export interface AiSettings {
  apiKey: string;
  model: AiModel;
  language: AiLanguage;
}

export interface ParsedFoodItem {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  mealType: MealType;
}

export interface DailyDigestCache {
  dateKey: string;
  content: string;
  model: string;
  generatedAt: number;
}

export interface FastPlanCache {
  dateKey: string;
  targetHours: number;
  reason: string;
  generatedAt: number;
}

export interface ChatMessageRecord {
  role: 'user' | 'assistant';
  content: string;
}

export interface WorkoutSet {
  id: string;
  weightKg: number;
  reps: number;
  completed: boolean;
}

export interface WorkoutExercise {
  id: string;
  name: string;
  sets: WorkoutSet[];
}

export interface WorkoutSession {
  id: string;
  name: string;
  date: string; // 'YYYY-MM-DD' of start
  startTime: number; // Unix ms
  endTime: number | null; // null = active
  exercises: WorkoutExercise[];
  note?: string;
  restTimerEndsAt?: number | null; // Unix ms — persisted so the timer survives navigation/reload
  templateId?: string;
}

export interface WorkoutTemplateExercise {
  name: string;
  numSets: number;
  lastWeightKg?: number;
  lastReps?: number;
}

export interface WorkoutTemplate {
  id: string;
  name: string;
  exercises: WorkoutTemplateExercise[];
  createdAt: number;
}

export interface WorkoutPlanExercise {
  name: string;
  sets: number;
  targetWeightKg: number;
  targetReps: number;
}

export interface LiftTarget {
  name: string;
  targetWeightKg: number;
}

export interface TrainingGoal {
  targetLifts: LiftTarget[];
  preferredDays: number[]; // 0 = Sunday .. 6 = Saturday
  sessionMinutes: number;
}

export interface WeeklyPlanDay {
  date: string; // 'YYYY-MM-DD'
  type: 'workout' | 'rest';
  name?: string;
  exercises?: WorkoutPlanExercise[];
  note?: string;
}

export interface WeeklyPlanCache {
  startDate: string; // 'YYYY-MM-DD'
  days: WeeklyPlanDay[];
  reason: string;
  generatedAt: number;
}

export interface GamificationData {
  checkIns: string[]; // 'YYYY-MM-DD', sorted, deduped
  seenAchievements: string[]; // achievement ids already celebrated
}

export interface AppState {
  foodEntries: FoodEntry[];
  fastingSessions: FastingSession[];
  weightEntries: WeightEntry[];
  exerciseEntries: ExerciseEntry[];
  workoutSessions: WorkoutSession[];
  workoutTemplates: WorkoutTemplate[];
  activeWorkoutId: string | null;
  activeFastingId: string | null;
  selectedDate: string;
  theme: 'light' | 'dark' | 'system';
  goals: MacroGoals;
  weightGoal: WeightGoal | null;
  userProfile: UserProfile | null;
  aiSettings: AiSettings;
  trainingGoal: TrainingGoal | null;
  gamification: GamificationData;
  /** True once IndexedDB has been read; persistence waits for this so a cold start can't overwrite newer data. */
  hydrated: boolean;
}

/** Profile, goals and targets carried in a backup file (never AI settings). */
export interface ImportedSettings {
  userProfile?: UserProfile | null;
  goals?: MacroGoals;
  weightGoal?: WeightGoal | null;
  trainingGoal?: TrainingGoal | null;
}

export interface ImportPayload {
  foodEntries: FoodEntry[];
  fastingSessions: FastingSession[];
  weightEntries?: WeightEntry[];
  exerciseEntries?: ExerciseEntry[];
  workoutSessions?: WorkoutSession[];
  workoutTemplates?: WorkoutTemplate[];
  gamification?: GamificationData;
  settings?: ImportedSettings;
  /** replace = the backup becomes the data; merge = union by id, backup wins on conflict */
  mode?: 'replace' | 'merge';
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
  | { type: 'ADD_EXERCISE'; payload: Omit<ExerciseEntry, 'id' | 'createdAt'> }
  | { type: 'EDIT_EXERCISE'; payload: ExerciseEntry }
  | { type: 'DELETE_EXERCISE'; payload: { id: string } }
  | { type: 'SET_SELECTED_DATE'; payload: string }
  | { type: 'SET_THEME'; payload: 'light' | 'dark' | 'system' }
  | { type: 'SET_GOALS'; payload: MacroGoals }
  | { type: 'SET_WEIGHT_GOAL'; payload: WeightGoal | null }
  | { type: 'SET_USER_PROFILE'; payload: UserProfile | null }
  | { type: 'SET_AI_SETTINGS'; payload: AiSettings }
  | { type: 'SET_TRAINING_GOAL'; payload: TrainingGoal | null }
  | { type: 'START_WORKOUT'; payload?: { name?: string; exercises?: WorkoutExercise[]; templateId?: string } }
  | { type: 'UPDATE_WORKOUT'; payload: WorkoutSession }
  | { type: 'FINISH_WORKOUT'; payload: { id: string; endTime: number } }
  | { type: 'CANCEL_WORKOUT'; payload: { id: string } }
  | { type: 'DELETE_WORKOUT'; payload: { id: string } }
  | { type: 'SAVE_TEMPLATE'; payload: Omit<WorkoutTemplate, 'id' | 'createdAt'> }
  | { type: 'DELETE_TEMPLATE'; payload: { id: string } }
  | { type: 'DAILY_CHECK_IN' }
  | { type: 'MARK_ACHIEVEMENTS_SEEN'; payload: { ids: string[] } }
  | { type: 'IMPORT_DATA'; payload: ImportPayload }
  | { type: 'HYDRATE'; payload: AppState };
