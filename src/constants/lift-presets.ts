export interface LiftPreset {
  name: string;
  emoji: string;
  muscleGroup: string;
}

export interface LiftPresetCategory {
  label: string;
  emoji: string;
  items: LiftPreset[];
}

/** Calorie rate used for the derived exercise entry when a workout finishes
 *  (matches the "Weight Lifting (moderate)" exercise preset). */
export const STRENGTH_CALORIES_PER_30MIN = 150;

export const DEFAULT_REST_SECONDS = 90;

export const LIFT_PRESET_CATEGORIES: LiftPresetCategory[] = [
  {
    label: 'Chest',
    emoji: '🫁',
    items: [
      { name: 'Bench Press', emoji: '🏋️', muscleGroup: 'chest' },
      { name: 'Incline Dumbbell Press', emoji: '🏋️', muscleGroup: 'chest' },
      { name: 'Machine Chest Press', emoji: '🏋️', muscleGroup: 'chest' },
      { name: 'Cable Fly', emoji: '🔗', muscleGroup: 'chest' },
      { name: 'Push-up', emoji: '🤸', muscleGroup: 'chest' },
      { name: 'Dip', emoji: '🤸', muscleGroup: 'chest' },
    ],
  },
  {
    label: 'Back',
    emoji: '🔙',
    items: [
      { name: 'Deadlift', emoji: '🏋️', muscleGroup: 'back' },
      { name: 'Barbell Row', emoji: '🏋️', muscleGroup: 'back' },
      { name: 'Lat Pulldown', emoji: '🔗', muscleGroup: 'back' },
      { name: 'Seated Cable Row', emoji: '🔗', muscleGroup: 'back' },
      { name: 'Pull-up', emoji: '🤸', muscleGroup: 'back' },
      { name: 'Dumbbell Row', emoji: '🏋️', muscleGroup: 'back' },
    ],
  },
  {
    label: 'Legs',
    emoji: '🦵',
    items: [
      { name: 'Squat', emoji: '🏋️', muscleGroup: 'legs' },
      { name: 'Smith Machine Squat', emoji: '🏋️', muscleGroup: 'legs' },
      { name: 'Leg Press', emoji: '🦵', muscleGroup: 'legs' },
      { name: 'Romanian Deadlift', emoji: '🏋️', muscleGroup: 'legs' },
      { name: 'Hip Thrust', emoji: '🍑', muscleGroup: 'legs' },
      { name: 'Leg Extension', emoji: '🦵', muscleGroup: 'legs' },
      { name: 'Leg Curl', emoji: '🦵', muscleGroup: 'legs' },
      { name: 'Calf Raise', emoji: '🦵', muscleGroup: 'legs' },
      { name: 'Walking Lunge', emoji: '🚶', muscleGroup: 'legs' },
    ],
  },
  {
    label: 'Shoulders',
    emoji: '💪',
    items: [
      { name: 'Overhead Press', emoji: '🏋️', muscleGroup: 'shoulders' },
      { name: 'Dumbbell Shoulder Press', emoji: '🏋️', muscleGroup: 'shoulders' },
      { name: 'Lateral Raise', emoji: '🏋️', muscleGroup: 'shoulders' },
      { name: 'Face Pull', emoji: '🔗', muscleGroup: 'shoulders' },
      { name: 'Rear Delt Fly', emoji: '🏋️', muscleGroup: 'shoulders' },
    ],
  },
  {
    label: 'Arms',
    emoji: '💪',
    items: [
      { name: 'Barbell Curl', emoji: '💪', muscleGroup: 'arms' },
      { name: 'Dumbbell Curl', emoji: '💪', muscleGroup: 'arms' },
      { name: 'Cable Curl', emoji: '🔗', muscleGroup: 'arms' },
      { name: 'Hammer Curl', emoji: '💪', muscleGroup: 'arms' },
      { name: 'Triceps Pushdown', emoji: '🔗', muscleGroup: 'arms' },
      { name: 'Skull Crusher', emoji: '🏋️', muscleGroup: 'arms' },
      { name: 'Overhead Triceps Extension', emoji: '🏋️', muscleGroup: 'arms' },
    ],
  },
  {
    label: 'Core',
    emoji: '🧘',
    items: [
      { name: 'Plank', emoji: '🧘', muscleGroup: 'core' },
      { name: 'Cable Crunch', emoji: '🔗', muscleGroup: 'core' },
      { name: 'Hanging Leg Raise', emoji: '🤸', muscleGroup: 'core' },
      { name: 'Russian Twist', emoji: '🧘', muscleGroup: 'core' },
    ],
  },
];
