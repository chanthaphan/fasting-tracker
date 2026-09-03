import type Anthropic from '@anthropic-ai/sdk';
import type { AiLanguage, AiModel, AiSettings } from '../../types';

type Sdk = typeof import('@anthropic-ai/sdk');
let sdk: Sdk | null = null;

/**
 * The SDK is a large dependency that most sessions never need (no key
 * set), so it is loaded on first use rather than in the main bundle.
 */
export async function loadSdk(): Promise<Sdk> {
  if (!sdk) sdk = await import('@anthropic-ai/sdk');
  return sdk;
}

/**
 * The user brings their own API key (stored on-device); requests go
 * straight from the browser to the Anthropic API — there is no backend.
 */
export async function createAiClient(settings: AiSettings): Promise<Anthropic> {
  const { default: AnthropicClient } = await loadSdk();
  return new AnthropicClient({ apiKey: settings.apiKey, dangerouslyAllowBrowser: true });
}

/** Error class names, for when the SDK hasn't been loaded through loadSdk (e.g. tests). */
function errorKind(err: unknown): 'auth' | 'rate' | 'connection' | 'abort' | 'api' | 'unknown' {
  if (typeof err !== 'object' || err === null) return 'unknown';
  if (sdk) {
    const A = sdk.default;
    if (err instanceof A.APIUserAbortError) return 'abort';
    if (err instanceof A.AuthenticationError) return 'auth';
    if (err instanceof A.RateLimitError) return 'rate';
    if (err instanceof A.APIConnectionError) return 'connection';
    if (err instanceof A.APIError) return 'api';
  }
  const name = err.constructor?.name ?? '';
  const status = (err as { status?: unknown }).status;
  if (name === 'APIUserAbortError') return 'abort';
  if (status === 401 || name === 'AuthenticationError') return 'auth';
  if (status === 429 || name === 'RateLimitError') return 'rate';
  if (name === 'APIConnectionError' || name === 'APIConnectionTimeoutError') return 'connection';
  if (typeof status === 'number') return 'api';
  return 'unknown';
}

/** True when the request was cancelled by the user (stream.abort()). */
export function isAbortError(err: unknown): boolean {
  return errorKind(err) === 'abort';
}

export type AiEffort = 'low' | 'medium' | 'high';

/**
 * `output_config.effort` is only supported on the Opus family —
 * sending it to Haiku is a 400.
 */
export function effortConfig(model: AiModel, effort: AiEffort): { output_config?: { effort: AiEffort } } {
  return model === 'claude-opus-5' ? { output_config: { effort } } : {};
}

const ERROR_MESSAGES: Record<string, { en: string; th: string }> = {
  auth: {
    en: 'Invalid API key — check your AI settings.',
    th: 'คีย์ API ไม่ถูกต้อง — กรุณาตรวจสอบการตั้งค่า AI',
  },
  rate: {
    en: 'Rate limited by the API — wait a moment and try again.',
    th: 'มีการเรียกใช้งานถี่เกินไป — กรุณารอสักครู่แล้วลองใหม่',
  },
  connection: {
    en: 'Could not reach the AI service — check your internet connection.',
    th: 'เชื่อมต่อบริการ AI ไม่ได้ — กรุณาตรวจสอบอินเทอร์เน็ต',
  },
  api: {
    en: 'The AI service returned an error',
    th: 'บริการ AI ตอบกลับด้วยข้อผิดพลาด',
  },
  unknown: {
    en: 'Something went wrong with the AI request.',
    th: 'เกิดข้อผิดพลาดในการเรียกใช้งาน AI',
  },
};

export function describeAiError(err: unknown, language: AiLanguage = 'auto'): string {
  const lang = language === 'th' ? 'th' : 'en';
  switch (errorKind(err)) {
    case 'auth': return ERROR_MESSAGES.auth[lang];
    case 'rate': return ERROR_MESSAGES.rate[lang];
    case 'connection': return ERROR_MESSAGES.connection[lang];
    case 'api': return `${ERROR_MESSAGES.api[lang]} (${(err as { status?: number }).status ?? '?'}).`;
    default: return ERROR_MESSAGES.unknown[lang];
  }
}

export const AI_MODELS: { id: AiModel; label: string; hint: string }[] = [
  { id: 'claude-opus-5', label: 'Claude Opus 5', hint: 'Smartest · $5/$25 per M tokens' },
  { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5', hint: 'Fast & cheap · $1/$5 per M tokens' },
];
