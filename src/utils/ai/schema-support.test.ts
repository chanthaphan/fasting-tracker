import { describe, it, expect } from 'vitest';
import { WEEKLY_PLAN_SCHEMA } from './weekly-plan';
import { FOOD_ITEMS_SCHEMA } from './food-parse';
import { FAST_PLAN_SCHEMA } from '../../hooks/use-fast-ai';

/**
 * Structured outputs (output_config.format json_schema) reject a request
 * with a 400 when the schema uses unsupported JSON Schema keywords:
 * numeric constraints (minimum/maximum/multipleOf), string length
 * constraints, and minItems/maxItems beyond 0 or 1. We send raw schemas
 * (no SDK auto-transform), so this guard keeps them from coming back.
 */
const FORBIDDEN_KEYS = ['minimum', 'maximum', 'multipleOf', 'minLength', 'maxLength', 'pattern'];

function findViolations(node: unknown, path: string, out: string[]): void {
  if (Array.isArray(node)) {
    node.forEach((v, i) => findViolations(v, `${path}[${i}]`, out));
    return;
  }
  if (typeof node !== 'object' || node === null) return;
  for (const [key, value] of Object.entries(node)) {
    if (FORBIDDEN_KEYS.includes(key)) out.push(`${path}.${key}`);
    if ((key === 'minItems' || key === 'maxItems') && typeof value === 'number' && value > 1) {
      out.push(`${path}.${key}=${value}`);
    }
    findViolations(value, `${path}.${key}`, out);
  }
}

describe('structured-output schemas use only supported keywords', () => {
  const schemas = {
    FOOD_ITEMS_SCHEMA,
    WEEKLY_PLAN_SCHEMA,
    FAST_PLAN_SCHEMA,
  };

  for (const [name, schema] of Object.entries(schemas)) {
    it(`${name} has no unsupported constraint keywords`, () => {
      const violations: string[] = [];
      findViolations(schema, name, violations);
      expect(violations).toEqual([]);
    });
  }
});
