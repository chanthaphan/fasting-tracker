import { describe, it, expect } from 'vitest';
import { aiConfigured, aiKeyOf, aiModelId, foundryBaseUrl, providerOf } from './provider';
import type { AiSettings } from '../../types';

const anthropic: AiSettings = { apiKey: 'sk-ant-1', model: 'claude-opus-5', language: 'auto' };
const foundry: AiSettings = {
  ...anthropic,
  provider: 'foundry',
  foundryApiKey: 'azure-key',
  foundryEndpoint: 'my-res',
  foundryDeployment: 'my-sonnet',
};

describe('foundryBaseUrl', () => {
  const base = 'https://my-res.services.ai.azure.com/anthropic';

  it.each([
    'my-res',
    '  my-res  ',
    'my-res.services.ai.azure.com',
    'https://my-res.services.ai.azure.com',
    'https://my-res.services.ai.azure.com/',
    'https://my-res.services.ai.azure.com/anthropic',
    'https://my-res.services.ai.azure.com/anthropic/',
    'https://my-res.services.ai.azure.com/anthropic/v1/messages',
    'HTTPS://my-res.services.ai.azure.com/Anthropic/v1/messages?x=1',
  ])('normalizes %s', (input) => {
    expect(foundryBaseUrl(input)?.toLowerCase()).toBe(base);
  });

  it('refuses anything the key must not be sent to', () => {
    expect(foundryBaseUrl('http://my-res.services.ai.azure.com/anthropic')).toBeNull(); // plain http
    expect(foundryBaseUrl('https://user:pw@my-res.services.ai.azure.com')).toBeNull(); // credentials in the URL
    expect(foundryBaseUrl('ftp://my-res.services.ai.azure.com')).toBeNull();
    expect(foundryBaseUrl('https://localhost')).toBeNull(); // no dot: not a public host
    expect(foundryBaseUrl('not a url')).toBeNull();
    expect(foundryBaseUrl('')).toBeNull();
    expect(foundryBaseUrl(undefined)).toBeNull();
  });
});

describe('provider settings', () => {
  it('treats settings saved before Foundry existed as Anthropic', () => {
    expect(providerOf(anthropic)).toBe('anthropic');
    expect(aiKeyOf(anthropic)).toBe('sk-ant-1');
    expect(aiModelId(anthropic)).toBe('claude-opus-5');
  });

  it('uses the Foundry key and the deployment name (not the model id) for Foundry', () => {
    expect(providerOf(foundry)).toBe('foundry');
    expect(aiKeyOf(foundry)).toBe('azure-key');
    expect(aiModelId(foundry)).toBe('my-sonnet');
  });

  it('is configured only when the active provider has everything it needs', () => {
    expect(aiConfigured(anthropic)).toBe(true);
    expect(aiConfigured({ ...anthropic, apiKey: ' ' })).toBe(false);
    expect(aiConfigured(foundry)).toBe(true);
    expect(aiConfigured({ ...foundry, foundryApiKey: '' })).toBe(false);
    expect(aiConfigured({ ...foundry, foundryEndpoint: 'http://x.example.com' })).toBe(false);
    expect(aiConfigured({ ...foundry, foundryDeployment: '' })).toBe(false);
    // an Anthropic key does not make a half-set-up Foundry config ready
    expect(aiConfigured({ ...anthropic, provider: 'foundry' })).toBe(false);
  });
});
