import { describe, it, expect, vi } from 'vitest';
import type Anthropic from '@anthropic-ai/sdk';
import { parseFoodInput, validateParsedItems } from './food-parse';
import type { AiSettings } from '../../types';

const settings: AiSettings = { apiKey: 'sk-ant-test', model: 'claude-opus-5', language: 'auto' };

function fakeClient(responseJson: unknown) {
  const create = vi.fn().mockResolvedValue({
    content: [{ type: 'text', text: JSON.stringify(responseJson) }],
  });
  return { client: { messages: { create } } as unknown as Anthropic, create };
}

describe('validateParsedItems', () => {
  it('accepts well-formed items', () => {
    const items = validateParsedItems({
      items: [{ name: 'ผัดกะเพราไก่', calories: 550, protein: 30, carbs: 55, fat: 22, mealType: 'lunch' }],
    });
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe('ผัดกะเพราไก่');
  });

  it('returns empty for non-object / missing items array', () => {
    expect(validateParsedItems(null)).toEqual([]);
    expect(validateParsedItems('x')).toEqual([]);
    expect(validateParsedItems({ items: 'not-array' })).toEqual([]);
  });

  it('drops items without a name or numeric calories', () => {
    const items = validateParsedItems({
      items: [
        { name: '', calories: 100, protein: 0, carbs: 0, fat: 0, mealType: 'lunch' },
        { name: 'Rice', calories: 'many', protein: 0, carbs: 0, fat: 0, mealType: 'lunch' },
        { name: 'Ok', calories: 100, protein: 1, carbs: 2, fat: 3, mealType: 'dinner' },
      ],
    });
    expect(items).toHaveLength(1);
    expect(items[0].name).toBe('Ok');
  });

  it('clamps negative numbers and rounds decimals', () => {
    const items = validateParsedItems({
      items: [{ name: 'Latte', calories: -50, protein: 7.6, carbs: 12.2, fat: 6, mealType: 'snacks' }],
    });
    expect(items[0].calories).toBe(0);
    expect(items[0].protein).toBe(8);
    expect(items[0].carbs).toBe(12);
  });

  it('coerces unknown mealType to snacks', () => {
    const items = validateParsedItems({
      items: [{ name: 'Latte', calories: 150, protein: 7, carbs: 12, fat: 6, mealType: 'brunch' }],
    });
    expect(items[0].mealType).toBe('snacks');
  });
});

describe('parseFoodInput', () => {
  it('returns validated items from the model response', async () => {
    const { client } = fakeClient({
      items: [
        { name: 'ผัดกะเพราไก่ไข่ดาว', calories: 650, protein: 35, carbs: 60, fat: 28, mealType: 'lunch' },
        { name: 'ลาเต้เย็น', calories: 180, protein: 6, carbs: 20, fat: 8, mealType: 'lunch' },
      ],
    });
    const items = await parseFoodInput(settings, { text: 'ผัดกะเพราไก่ไข่ดาว กับลาเต้เย็น' }, client);
    expect(items).toHaveLength(2);
    expect(items[1].name).toBe('ลาเต้เย็น');
  });

  it('places the image block before the text block', async () => {
    const { client, create } = fakeClient({ items: [] });
    await parseFoodInput(
      settings,
      { text: 'lunch', image: { mediaType: 'image/jpeg', base64: 'abc123' } },
      client
    );
    const content = create.mock.calls[0][0].messages[0].content;
    expect(content[0].type).toBe('image');
    expect(content[0].source.data).toBe('abc123');
    expect(content[1].type).toBe('text');
  });

  it('includes effort only for opus and always a json_schema format', async () => {
    const { client, create } = fakeClient({ items: [] });
    await parseFoodInput(settings, { text: 'rice' }, client);
    expect(create.mock.calls[0][0].output_config.effort).toBe('low');
    expect(create.mock.calls[0][0].output_config.format.type).toBe('json_schema');

    const { client: haikuClient, create: haikuCreate } = fakeClient({ items: [] });
    await parseFoodInput({ ...settings, model: 'claude-haiku-4-5' }, { text: 'rice' }, haikuClient);
    expect(haikuCreate.mock.calls[0][0].output_config.effort).toBeUndefined();
    expect(haikuCreate.mock.calls[0][0].model).toBe('claude-haiku-4-5');
  });

  it('returns [] when the model reply is not valid JSON', async () => {
    const create = vi.fn().mockResolvedValue({ content: [{ type: 'text', text: 'not json' }] });
    const client = { messages: { create } } as unknown as Anthropic;
    const items = await parseFoodInput(settings, { text: 'rice' }, client);
    expect(items).toEqual([]);
  });
});
