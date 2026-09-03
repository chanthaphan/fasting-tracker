import type Anthropic from '@anthropic-ai/sdk';
import type { AiSettings, MealType, ParsedFoodItem } from '../../types';
import { createAiClient, effortConfig } from './client';
import { FOOD_PARSE_SYSTEM } from './prompts';

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snacks'];

// NOTE: structured outputs reject numeric/array constraint keywords
// (minimum, maximum, minItems > 1, ...) with a 400 — ranges live in
// descriptions here and are enforced client-side by validateParsedItems.
export const FOOD_ITEMS_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['items'],
  properties: {
    items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'calories', 'protein', 'carbs', 'fat', 'mealType'],
        properties: {
          name: { type: 'string' },
          calories: { type: 'number', description: 'kcal, non-negative' },
          protein: { type: 'number', description: 'grams, non-negative' },
          carbs: { type: 'number', description: 'grams, non-negative' },
          fat: { type: 'number', description: 'grams, non-negative' },
          mealType: { type: 'string', enum: MEAL_TYPES },
        },
      },
    },
  },
} as const;

/**
 * Defensive parse of the model's JSON reply — a malformed item must
 * never reach the reducer. Clamps negatives, rounds, coerces mealType.
 */
export function validateParsedItems(value: unknown): ParsedFoodItem[] {
  if (typeof value !== 'object' || value === null) return [];
  const items = (value as { items?: unknown }).items;
  if (!Array.isArray(items)) return [];
  const result: ParsedFoodItem[] = [];
  for (const raw of items) {
    if (typeof raw !== 'object' || raw === null) continue;
    const r = raw as Record<string, unknown>;
    if (typeof r.name !== 'string' || r.name.trim() === '') continue;
    const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(0, Math.round(v)) : null);
    const calories = num(r.calories);
    if (calories === null) continue;
    result.push({
      name: r.name.trim(),
      calories,
      protein: num(r.protein) ?? 0,
      carbs: num(r.carbs) ?? 0,
      fat: num(r.fat) ?? 0,
      mealType: MEAL_TYPES.includes(r.mealType as MealType) ? (r.mealType as MealType) : 'snacks',
    });
  }
  return result;
}

export interface FoodParseInput {
  text?: string;
  image?: { mediaType: 'image/jpeg' | 'image/png' | 'image/webp'; base64: string };
  now?: Date;
}

export async function parseFoodInput(
  settings: AiSettings,
  input: FoodParseInput,
  client: Anthropic = createAiClient(settings)
): Promise<ParsedFoodItem[]> {
  const now = input.now ?? new Date();
  const localTime = `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`;

  const content: Anthropic.ContentBlockParam[] = [];
  if (input.image) {
    content.push({
      type: 'image',
      source: { type: 'base64', media_type: input.image.mediaType, data: input.image.base64 },
    });
  }
  content.push({
    type: 'text',
    text: input.text?.trim() || 'Identify the food in this photo and estimate nutrition per item.',
  });

  const response = await client.messages.create({
    model: settings.model,
    max_tokens: 2048,
    system: [
      { type: 'text', text: `${FOOD_PARSE_SYSTEM}\nLocal time now: ${localTime}.`, cache_control: { type: 'ephemeral' } },
    ],
    output_config: {
      format: { type: 'json_schema', schema: FOOD_ITEMS_SCHEMA as unknown as Record<string, unknown> },
      ...effortConfig(settings.model, 'low').output_config,
    },
    messages: [{ role: 'user', content }],
  });

  const text = response.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('');
  try {
    return validateParsedItems(JSON.parse(text));
  } catch {
    return [];
  }
}

const MAX_IMAGE_DIMENSION = 1024;

/**
 * Downscale a photo to keep vision tokens and request size bounded.
 * Returns base64 without the data-URL prefix (and without newlines).
 */
export async function compressImage(file: File): Promise<{ mediaType: 'image/jpeg'; base64: string }> {
  const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
  const scale = Math.min(1, MAX_IMAGE_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas not supported');
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
  return { mediaType: 'image/jpeg', base64: dataUrl.split(',')[1].replace(/\s/g, '') };
}
