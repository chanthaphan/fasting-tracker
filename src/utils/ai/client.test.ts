import { describe, it, expect } from 'vitest';
import Anthropic from '@anthropic-ai/sdk';
import { effortConfig, describeAiError, createAiClient } from './client';

describe('effortConfig', () => {
  it('includes effort for claude-opus-5', () => {
    expect(effortConfig('claude-opus-5', 'low')).toEqual({ output_config: { effort: 'low' } });
  });

  it('omits effort for claude-haiku-4-5 (unsupported)', () => {
    expect(effortConfig('claude-haiku-4-5', 'low')).toEqual({});
  });
});

describe('describeAiError', () => {
  type ErrorCtor = new (status: number, error: object | undefined, message: string | undefined, headers: Headers) => Error;
  const makeError = (Cls: unknown, status: number) =>
    new (Cls as ErrorCtor)(status, { type: 'error' }, 'boom', new Headers());

  it('maps AuthenticationError to an invalid-key message', () => {
    const err = makeError(Anthropic.AuthenticationError, 401);
    expect(describeAiError(err, 'en')).toMatch(/Invalid API key/);
    expect(describeAiError(err, 'th')).toMatch(/คีย์ API/);
  });

  it('maps RateLimitError to a retry message', () => {
    const err = makeError(Anthropic.RateLimitError, 429);
    expect(describeAiError(err, 'en')).toMatch(/Rate limited/);
  });

  it('maps APIConnectionError to a connection message', () => {
    const err = new Anthropic.APIConnectionError({ message: 'offline' });
    expect(describeAiError(err, 'en')).toMatch(/internet connection/);
    expect(describeAiError(err, 'th')).toMatch(/อินเทอร์เน็ต/);
  });

  it('maps generic APIError with its status code', () => {
    const err = makeError(Anthropic.InternalServerError, 500);
    expect(describeAiError(err, 'en')).toContain('500');
  });

  it('falls back for unknown errors', () => {
    expect(describeAiError(new Error('x'), 'en')).toMatch(/Something went wrong/);
  });

  it('auto language falls back to English', () => {
    expect(describeAiError(new Error('x'), 'auto')).toMatch(/Something went wrong/);
  });
});

describe('createAiClient', () => {
  it('sends Anthropic requests to the Anthropic API with the Anthropic key', async () => {
    const client = await createAiClient({ apiKey: 'sk-ant-1', model: 'claude-opus-5', language: 'auto' });
    expect(client.baseURL).toBe('https://api.anthropic.com');
    expect(client.apiKey).toBe('sk-ant-1');
  });

  it('sends Foundry requests to the resource, with the Foundry key', async () => {
    const client = await createAiClient({
      apiKey: 'sk-ant-1',
      model: 'claude-opus-5',
      language: 'auto',
      provider: 'foundry',
      foundryApiKey: 'azure-key',
      foundryEndpoint: 'my-res',
      foundryDeployment: 'my-sonnet',
    });
    expect(client.baseURL).toBe('https://my-res.services.ai.azure.com/anthropic');
    expect(client.apiKey).toBe('azure-key');
  });

  it('refuses a Foundry endpoint that is not https, so the key is never sent in clear', async () => {
    await expect(createAiClient({
      apiKey: '', model: 'claude-opus-5', language: 'auto',
      provider: 'foundry', foundryApiKey: 'azure-key', foundryEndpoint: 'http://my-res.services.ai.azure.com',
    })).rejects.toThrow(/endpoint/i);
  });
});
