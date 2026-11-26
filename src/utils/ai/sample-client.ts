import type Anthropic from '@anthropic-ai/sdk';
import { getSample, type SampleFn, type SampleOptions, type SampleTool } from './sample-status';

/**
 * An Anthropic-client look-alike backed by the Artifact `sample` capability,
 * so the app's AI features run unchanged inside a Claude Artifact. It covers
 * the two calls the app makes, `messages.create` and `messages.stream`, and
 * reads the few request fields they use: `system`, `messages` (text and
 * image blocks), `output_config.format` for JSON, and `output_config.effort`.
 * `sample` is memory-less, so the system prompt becomes a leading user turn,
 * and it has no model choice beyond a tier: a low-effort request (quick
 * answers, small JSON) runs on `quick`, everything else on `default`.
 */

type Turn = { role: 'user' | 'assistant'; content: string };

interface RequestLike {
  system?: string | { type: string; text?: string }[];
  messages: { role: 'user' | 'assistant'; content: string | { type: string; text?: string; source?: { data?: string; media_type?: string } }[] }[];
  output_config?: { effort?: string; format?: { type?: string; schema?: unknown } };
}

function base64ToBlob(data: string, type: string): Blob {
  const bin = atob(data);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type });
}

/** What Claude reads for a request, plus the photos that go with it. */
export function toSampleInput(params: RequestLike): { input: Turn[]; images: Blob[]; json: boolean } {
  const system = typeof params.system === 'string'
    ? params.system
    : (params.system ?? []).map((b) => b.text ?? '').filter(Boolean).join('\n\n');
  const wantsJson = params.output_config?.format?.type === 'json_schema';
  const schema = wantsJson ? JSON.stringify(params.output_config?.format?.schema) : '';

  const images: Blob[] = [];
  const turns: Turn[] = [];
  for (const m of params.messages) {
    let text = '';
    if (typeof m.content === 'string') text = m.content;
    else {
      for (const block of m.content) {
        if (block.type === 'text' && block.text) text += (text ? '\n' : '') + block.text;
        else if (block.type === 'image' && block.source?.data) images.push(base64ToBlob(block.source.data, block.source.media_type ?? 'image/jpeg'));
      }
    }
    if (text.trim()) turns.push({ role: m.role, content: text });
  }

  // `sample` has no system prompt: standing instructions are a leading user turn
  const lead = [system, wantsJson ? `Reply with only one JSON value that matches this JSON Schema, and no other text:\n${schema}` : '']
    .filter(Boolean)
    .join('\n\n');
  return { input: lead ? [{ role: 'user', content: lead }, ...turns] : turns, images, json: wantsJson };
}

const tierOf = (params: RequestLike): SampleOptions['modelTier'] => (params.output_config?.effort === 'low' ? 'quick' : 'default');

function requireSample(): SampleFn {
  const sample = getSample();
  if (!sample) throw { code: 'capability_disabled', message: 'Claude is not available in this view' };
  return sample;
}

const message = (text: string, truncated = false) =>
  ({ content: [{ type: 'text', text }], stop_reason: truncated ? 'max_tokens' : 'end_turn' }) as unknown as Anthropic.Message;

async function run(params: RequestLike, options: Pick<SampleOptions, 'signal' | 'onText'>): Promise<Anthropic.Message> {
  const sample = requireSample();
  const { input, images, json } = toSampleInput(params);
  const opts: SampleOptions = { ...options, modelTier: tierOf(params), cache: false, ...(images.length > 0 ? { images } : {}) };
  if (json) return message(JSON.stringify(await sample.json(input, opts)));
  const { text, truncated } = await sample(input, opts);
  return message(text, truncated);
}

export function createSampleClient(): Anthropic {
  const client = {
    messages: {
      create: (params: RequestLike) => run(params, {}),
      stream: (params: RequestLike) => {
        const controller = new AbortController();
        const listeners: ((delta: string) => void)[] = [];
        // Start on the next microtask so the caller can attach `.on('text')` first, as it can with the SDK's stream
        const done = Promise.resolve().then(() =>
          run(params, { signal: controller.signal, onText: ({ delta }) => listeners.forEach((l) => l(delta)) })
        );
        done.catch(() => {}); // the caller awaits finalMessage(); this only stops an abandoned stream from being "unhandled"
        const stream = {
          on(event: string, listener: (delta: string) => void) {
            if (event === 'text') listeners.push(listener);
            return stream;
          },
          finalMessage: () => done,
          abort: () => controller.abort(),
        };
        return stream;
      },
    },
  };
  return client as unknown as Anthropic;
}

/**
 * One assistant turn that may call the app's tools. `sample` runs the tool
 * rounds itself, calling `execute` here in the page, so the caller gets the
 * written reply back instead of driving a tool loop.
 */
export async function sampleWithTools(args: {
  system: string;
  turns: Turn[];
  image?: { mediaType: string; base64: string };
  tools: SampleTool[];
  effort?: 'low' | 'medium' | 'high';
  signal: AbortSignal;
  onText: (text: string) => void;
}): Promise<string> {
  const sample = requireSample();
  const input: Turn[] = [{ role: 'user', content: args.system }, ...args.turns];
  const { text } = await sample(input, {
    tools: args.tools,
    modelTier: args.effort === 'low' ? 'quick' : 'default',
    signal: args.signal,
    onText: ({ text: whole }) => args.onText(whole),
    ...(args.image ? { images: [base64ToBlob(args.image.base64, args.image.mediaType)] } : {}),
  });
  return text;
}
