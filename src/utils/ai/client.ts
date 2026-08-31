import Anthropic from '@anthropic-ai/sdk';
import type { AiLanguage, AiModel, AiSettings } from '../../types';

/**
 * The user brings their own API key (stored on-device); requests go
 * straight from the browser to the Anthropic API — there is no backend.
 */
export function createAiClient(settings: AiSettings): Anthropic {
  return new Anthropic({ apiKey: settings.apiKey, dangerouslyAllowBrowser: true });
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
  if (err instanceof Anthropic.AuthenticationError) return ERROR_MESSAGES.auth[lang];
  if (err instanceof Anthropic.RateLimitError) return ERROR_MESSAGES.rate[lang];
  if (err instanceof Anthropic.APIConnectionError) return ERROR_MESSAGES.connection[lang];
  if (err instanceof Anthropic.APIError) return `${ERROR_MESSAGES.api[lang]} (${err.status ?? '?'}).`;
  return ERROR_MESSAGES.unknown[lang];
}

export const AI_MODELS: { id: AiModel; label: string; hint: string }[] = [
  { id: 'claude-opus-5', label: 'Claude Opus 5', hint: 'Smartest · $5/$25 per M tokens' },
  { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5', hint: 'Fast & cheap · $1/$5 per M tokens' },
];
