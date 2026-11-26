import { IS_ARTIFACT } from '../artifact';

/**
 * In the Claude Artifact build, AI goes through the Artifact `sample`
 * capability: the request is made on the viewer's own Claude account, after
 * they allow it. It arrives a moment after load, and is absent when the page
 * is not shown inside Claude, so the app treats AI as "not ready" until it
 * resolves and hides the AI features if it never does.
 */

/** The parts of `window.claude.use('sample')` this app calls. */
export interface SampleFn {
  (input: string | { role: 'user' | 'assistant'; content: string }[], options?: SampleOptions): Promise<{ text: string; truncated: boolean }>;
  json<T = unknown>(input: string | { role: 'user' | 'assistant'; content: string }[], options?: SampleOptions): Promise<T>;
  limits(): Promise<{ images?: { maxCount: number; mediaTypes: string[] }; tools?: { maxCount: number } }>;
}

export interface SampleTool {
  name: string;
  description: string;
  inputSchema?: { type: 'object'; properties?: Record<string, unknown>; required?: string[] };
  execute(input: Record<string, unknown>, context: { signal: AbortSignal }): unknown;
}

export interface SampleOptions {
  onText?: (update: { text: string; delta: string }) => void;
  signal?: AbortSignal;
  images?: Blob[];
  tools?: SampleTool[];
  modelTier?: 'quick' | 'default' | 'complex';
  cache?: boolean;
}

export type SampleStatus = 'pending' | 'ready' | 'absent';

let status: SampleStatus = IS_ARTIFACT ? 'pending' : 'absent';
let sampleFn: SampleFn | null = null;
const listeners = new Set<() => void>();

function set(next: SampleStatus) {
  if (status === next) return;
  status = next;
  listeners.forEach((l) => l());
}

if (IS_ARTIFACT) {
  const claude = (window as unknown as { claude?: { use?: (name: string) => Promise<unknown> } }).claude;
  Promise.resolve(claude?.use?.('sample'))
    .then((fn) => {
      sampleFn = typeof fn === 'function' ? (fn as SampleFn) : null;
      set(sampleFn ? 'ready' : 'absent');
    })
    .catch(() => set('absent'));
  if (!claude?.use) set('absent');
}

export const sampleStatus = (): SampleStatus => status;
export const getSample = (): SampleFn | null => sampleFn;
export const subscribeSampleStatus = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
};
