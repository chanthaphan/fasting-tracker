export interface FoodPreset {
  name: string;
  emoji: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface PresetCategory {
  label: string;
  emoji: string;
  items: FoodPreset[];
}

// Approximate values per typical serving/plate
export const FOOD_PRESET_CATEGORIES: PresetCategory[] = [
  {
    label: 'Rice & Noodles',
    emoji: '🍚',
    items: [
      { name: 'Pad Thai', emoji: '🍜', calories: 450, protein: 18, carbs: 55, fat: 16 },
      { name: 'Pad See Ew', emoji: '🍜', calories: 480, protein: 20, carbs: 58, fat: 16 },
      { name: 'Pad Kra Pao + Rice', emoji: '🍚', calories: 550, protein: 28, carbs: 60, fat: 18 },
      { name: 'Khao Pad (Fried Rice)', emoji: '🍚', calories: 500, protein: 16, carbs: 62, fat: 18 },
      { name: 'Khao Man Gai', emoji: '🍗', calories: 580, protein: 32, carbs: 55, fat: 22 },
      { name: 'Khao Moo Daeng', emoji: '🍚', calories: 520, protein: 30, carbs: 58, fat: 14 },
      { name: 'Boat Noodles', emoji: '🍜', calories: 350, protein: 22, carbs: 40, fat: 10 },
      { name: 'Pad Woon Sen', emoji: '🍜', calories: 380, protein: 15, carbs: 48, fat: 12 },
      { name: 'Rad Na', emoji: '🍜', calories: 460, protein: 22, carbs: 52, fat: 16 },
      { name: 'Kuay Teaw (Noodle Soup)', emoji: '🍜', calories: 380, protein: 24, carbs: 42, fat: 10 },
    ],
  },
  {
    label: 'Curries & Soups',
    emoji: '🍛',
    items: [
      { name: 'Green Curry + Rice', emoji: '🟢', calories: 550, protein: 24, carbs: 55, fat: 24 },
      { name: 'Red Curry + Rice', emoji: '🔴', calories: 530, protein: 22, carbs: 54, fat: 22 },
      { name: 'Massaman Curry + Rice', emoji: '🍛', calories: 620, protein: 26, carbs: 58, fat: 28 },
      { name: 'Panang Curry + Rice', emoji: '🍛', calories: 560, protein: 25, carbs: 52, fat: 26 },
      { name: 'Tom Yum Goong', emoji: '🍲', calories: 200, protein: 20, carbs: 12, fat: 8 },
      { name: 'Tom Kha Gai', emoji: '🍲', calories: 300, protein: 18, carbs: 10, fat: 22 },
      { name: 'Gaeng Jued (Clear Soup)', emoji: '🍲', calories: 150, protein: 12, carbs: 10, fat: 6 },
    ],
  },
  {
    label: 'Stir-fry & Sides',
    emoji: '🥘',
    items: [
      { name: 'Gai Pad Med Mamuang', emoji: '🥜', calories: 420, protein: 28, carbs: 20, fat: 26 },
      { name: 'Larb Moo', emoji: '🥗', calories: 280, protein: 26, carbs: 8, fat: 16 },
      { name: 'Som Tam', emoji: '🥗', calories: 120, protein: 4, carbs: 18, fat: 4 },
      { name: 'Kai Jeow (Thai Omelette)', emoji: '🍳', calories: 300, protein: 16, carbs: 4, fat: 24 },
      { name: 'Moo Ping (Grilled Pork)', emoji: '🍢', calories: 250, protein: 22, carbs: 10, fat: 14 },
      { name: 'Gai Yang (Grilled Chicken)', emoji: '🍗', calories: 320, protein: 34, carbs: 6, fat: 18 },
      { name: 'Steamed Rice (1 plate)', emoji: '🍚', calories: 250, protein: 5, carbs: 55, fat: 1 },
      { name: 'Sticky Rice (1 portion)', emoji: '🍚', calories: 200, protein: 4, carbs: 44, fat: 0 },
    ],
  },
  {
    label: 'Drinks & Desserts',
    emoji: '🧋',
    items: [
      { name: 'Thai Iced Tea', emoji: '🧋', calories: 200, protein: 2, carbs: 38, fat: 5 },
      { name: 'Thai Iced Coffee', emoji: '☕', calories: 180, protein: 2, carbs: 32, fat: 5 },
      { name: 'Mango Sticky Rice', emoji: '🥭', calories: 400, protein: 5, carbs: 72, fat: 12 },
      { name: 'Roti + Condensed Milk', emoji: '🫓', calories: 350, protein: 6, carbs: 48, fat: 16 },
      { name: 'Kanom Buang (Crispy Crepe)', emoji: '🥞', calories: 150, protein: 3, carbs: 22, fat: 6 },
    ],
  },
];
