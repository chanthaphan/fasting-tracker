export interface ExercisePreset {
  name: string;
  emoji: string;
  caloriesPer30Min: number; // approximate calories burned in 30 minutes for a 70kg person
}

export interface ExercisePresetCategory {
  label: string;
  emoji: string;
  items: ExercisePreset[];
}

// Approximate values for a 70kg person per 30 minutes
export const EXERCISE_PRESET_CATEGORIES: ExercisePresetCategory[] = [
  {
    label: 'Cardio',
    emoji: '🏃',
    items: [
      { name: 'Running (8 km/h)', emoji: '🏃', caloriesPer30Min: 280 },
      { name: 'Running (10 km/h)', emoji: '🏃', caloriesPer30Min: 370 },
      { name: 'Running (12 km/h)', emoji: '🏃', caloriesPer30Min: 450 },
      { name: 'Jogging (6 km/h)', emoji: '🏃', caloriesPer30Min: 210 },
      { name: 'Walking (5 km/h)', emoji: '🚶', caloriesPer30Min: 120 },
      { name: 'Brisk Walking (6.5 km/h)', emoji: '🚶', caloriesPer30Min: 160 },
      { name: 'Cycling (moderate)', emoji: '🚴', caloriesPer30Min: 240 },
      { name: 'Cycling (vigorous)', emoji: '🚴', caloriesPer30Min: 360 },
      { name: 'Stationary Bike', emoji: '🚴', caloriesPer30Min: 210 },
      { name: 'Jump Rope', emoji: '⏭️', caloriesPer30Min: 340 },
      { name: 'Stair Climbing', emoji: '🪜', caloriesPer30Min: 250 },
      { name: 'Elliptical', emoji: '🏋️', caloriesPer30Min: 200 },
      { name: 'Rowing Machine', emoji: '🚣', caloriesPer30Min: 250 },
    ],
  },
  {
    label: 'Strength & Gym',
    emoji: '🏋️',
    items: [
      { name: 'Weight Lifting (moderate)', emoji: '🏋️', caloriesPer30Min: 150 },
      { name: 'Weight Lifting (vigorous)', emoji: '🏋️', caloriesPer30Min: 220 },
      { name: 'Bodyweight Exercises', emoji: '💪', caloriesPer30Min: 170 },
      { name: 'HIIT / CrossFit', emoji: '🔥', caloriesPer30Min: 350 },
      { name: 'Circuit Training', emoji: '🔄', caloriesPer30Min: 280 },
      { name: 'Kettlebell', emoji: '🏋️', caloriesPer30Min: 200 },
      { name: 'Pull-ups / Push-ups', emoji: '💪', caloriesPer30Min: 160 },
    ],
  },
  {
    label: 'Sports',
    emoji: '⚽',
    items: [
      { name: 'Swimming (moderate)', emoji: '🏊', caloriesPer30Min: 220 },
      { name: 'Swimming (vigorous)', emoji: '🏊', caloriesPer30Min: 340 },
      { name: 'Badminton', emoji: '🏸', caloriesPer30Min: 180 },
      { name: 'Tennis', emoji: '🎾', caloriesPer30Min: 240 },
      { name: 'Football / Soccer', emoji: '⚽', caloriesPer30Min: 260 },
      { name: 'Basketball', emoji: '🏀', caloriesPer30Min: 270 },
      { name: 'Boxing / Muay Thai', emoji: '🥊', caloriesPer30Min: 350 },
      { name: 'Table Tennis', emoji: '🏓', caloriesPer30Min: 130 },
      { name: 'Volleyball', emoji: '🏐', caloriesPer30Min: 150 },
      { name: 'Golf (walking)', emoji: '⛳', caloriesPer30Min: 140 },
    ],
  },
  {
    label: 'Flexibility & Mind-Body',
    emoji: '🧘',
    items: [
      { name: 'Yoga (Hatha)', emoji: '🧘', caloriesPer30Min: 90 },
      { name: 'Yoga (Vinyasa/Power)', emoji: '🧘', caloriesPer30Min: 170 },
      { name: 'Pilates', emoji: '🧘', caloriesPer30Min: 130 },
      { name: 'Stretching', emoji: '🤸', caloriesPer30Min: 70 },
      { name: 'Tai Chi', emoji: '🧘', caloriesPer30Min: 80 },
    ],
  },
  {
    label: 'Daily Activities',
    emoji: '🏠',
    items: [
      { name: 'House Cleaning', emoji: '🧹', caloriesPer30Min: 110 },
      { name: 'Gardening', emoji: '🌱', caloriesPer30Min: 140 },
      { name: 'Dancing', emoji: '💃', caloriesPer30Min: 190 },
      { name: 'Playing with Kids', emoji: '👶', caloriesPer30Min: 150 },
      { name: 'Shopping (walking)', emoji: '🛒', caloriesPer30Min: 100 },
    ],
  },
];
