import type { AiProvider, AiSettings } from '../../types';
import { IS_ARTIFACT } from '../artifact';
import { sampleStatus } from './sample-status';

/** The provider in use; settings saved before Foundry existed have none and mean Anthropic. */
export function providerOf(settings: AiSettings): AiProvider {
  return settings.provider === 'foundry' ? 'foundry' : 'anthropic';
}

/** The API key for the provider in use. */
export function aiKeyOf(settings: AiSettings): string {
  return (providerOf(settings) === 'foundry' ? settings.foundryApiKey : settings.apiKey)?.trim() ?? '';
}

/**
 * The `model` to put in a request. Anthropic takes the model id; Foundry
 * routes by the *deployment name*, which can be anything the user chose.
 */
export function aiModelId(settings: AiSettings): string {
  if (providerOf(settings) === 'foundry') return settings.foundryDeployment?.trim() || settings.model;
  return settings.model;
}

/**
 * Turn whatever the user typed for a Foundry resource into the base URL the
 * Anthropic SDK expects, `https://<resource>.services.ai.azure.com/anthropic`
 * (the SDK appends `/v1/messages`). Accepts a bare resource name, a host, the
 * base URL, or the full target URI copied from the deployment's Details tab.
 * Returns null for anything that isn't an https address: the API key is sent
 * to this URL, so it must never be plain http.
 */
export function foundryBaseUrl(input: string | undefined): string | null {
  const raw = input?.trim();
  if (!raw) return null;
  // A bare resource name ("my-resource") → its standard host
  const withHost = /^[a-z0-9][a-z0-9-]*$/i.test(raw) ? `https://${raw}.services.ai.azure.com` : raw;
  let url: URL;
  try {
    url = new URL(/^[a-z][a-z0-9+.-]*:\/\//i.test(withHost) ? withHost : `https://${withHost}`);
  } catch {
    return null;
  }
  if (url.protocol !== 'https:' || !url.hostname.includes('.') || url.username || url.password) return null;
  // Keep everything up to and including "/anthropic"; drop "/v1/messages" and the like
  const path = url.pathname.replace(/\/+$/, '');
  const at = path.toLowerCase().indexOf('/anthropic');
  const base = at >= 0 ? path.slice(0, at + '/anthropic'.length) : `${path}/anthropic`;
  return `${url.origin}${base}`;
}

/** True when the provider in use has everything a request needs. */
export function aiConfigured(settings: AiSettings): boolean {
  // In a Claude Artifact there is no API key: AI is ready once the viewer's Claude is reachable
  if (IS_ARTIFACT) return sampleStatus() === 'ready';
  if (!aiKeyOf(settings)) return false;
  return providerOf(settings) === 'foundry'
    ? foundryBaseUrl(settings.foundryEndpoint) !== null && !!settings.foundryDeployment?.trim()
    : true;
}
