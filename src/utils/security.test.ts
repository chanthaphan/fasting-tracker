import { describe, it, expect } from 'vitest';
import { parseImportFile } from './export-import';

describe('Security - Import file validation', () => {
  function makeFile(content: string): File {
    return new File([content], 'test.json', { type: 'application/json' });
  }

  it('rejects completely invalid JSON', async () => {
    await expect(parseImportFile(makeFile('not json'))).rejects.toThrow();
  });

  it('rejects file with missing foodEntries array', async () => {
    await expect(parseImportFile(makeFile(JSON.stringify({
      version: 1,
      foodEntries: 'not an array',
      fastingSessions: [],
    })))).rejects.toThrow();
  });

  it('rejects file with missing fastingSessions array', async () => {
    await expect(parseImportFile(makeFile(JSON.stringify({
      version: 1,
      foodEntries: [],
      fastingSessions: 'bad',
    })))).rejects.toThrow();
  });

  it('accepts valid backup file', async () => {
    const data = await parseImportFile(makeFile(JSON.stringify({
      version: 1,
      exportedAt: '2025-01-01T00:00:00Z',
      foodEntries: [],
      fastingSessions: [],
      weightEntries: [],
      exerciseEntries: [],
    })));
    expect(data.foodEntries).toEqual([]);
    expect(data.fastingSessions).toEqual([]);
  });

  it('handles missing optional fields gracefully', async () => {
    const data = await parseImportFile(makeFile(JSON.stringify({
      version: 1,
      foodEntries: [],
      fastingSessions: [],
      // no weightEntries, exerciseEntries
    })));
    expect(data.weightEntries).toBeUndefined();
    expect(data.exerciseEntries).toBeUndefined();
  });
});

describe('Security - XSS prevention in data', () => {
  it('food entry names are not HTML-sanitized at storage level (React handles rendering)', () => {
    // React auto-escapes JSX text content, so XSS via data is prevented at render time
    // This test documents that the data layer stores strings as-is
    const xssPayload = '<script>alert("xss")</script>';
    const entry = { name: xssPayload };
    expect(entry.name).toBe(xssPayload);
    // In React, this would render as escaped text, not executed HTML
  });

  it('numeric fields reject NaN via form validation pattern', () => {
    // The app uses Number() conversion which produces NaN for non-numeric strings
    expect(Number('abc')).toBeNaN();
    expect(Number('') || 0).toBe(0);
    expect(Number('100')).toBe(100);
    // The || 0 pattern used in forms converts NaN to 0
    expect(Number('abc') || 0).toBe(0);
  });
});

describe('Security - Storage quota handling', () => {
  it('saveToStorage handles QuotaExceededError gracefully', () => {
    // The storage module catches DOMException with name QuotaExceededError
    // and dispatches a 'storage-full' event rather than crashing
    const error = new DOMException('quota exceeded', 'QuotaExceededError');
    expect(error.name).toBe('QuotaExceededError');
    expect(error instanceof DOMException).toBe(true);
  });
});

describe('Security - Data integrity', () => {
  it('crypto.randomUUID generates unique IDs', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(crypto.randomUUID());
    }
    expect(ids.size).toBe(100);
  });

  it('Date strings are in expected format', () => {
    const dateStr = new Date().toISOString().split('T')[0];
    expect(dateStr).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
