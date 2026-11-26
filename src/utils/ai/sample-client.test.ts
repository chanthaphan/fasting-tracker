import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { SampleFn, SampleOptions } from './sample-status';
import { describeAiError, isAbortError } from './client';

const sampleMock = vi.fn();
const jsonMock = vi.fn();
let available: SampleFn | null = null;

vi.mock('./sample-status', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./sample-status')>()),
  getSample: () => available,
}));

import { createSampleClient, sampleWithTools, toSampleInput } from './sample-client';

beforeEach(() => {
  sampleMock.mockReset();
  jsonMock.mockReset();
  available = Object.assign(sampleMock, { json: jsonMock, limits: vi.fn() }) as unknown as SampleFn;
});

describe('toSampleInput', () => {
  it('turns the system prompt into a leading user turn, ahead of the conversation', () => {
    const { input } = toSampleInput({
      system: [{ type: 'text', text: 'Be brief.' }, { type: 'text', text: 'Context: 2 meals.' }],
      messages: [{ role: 'user', content: 'hi' }, { role: 'assistant', content: 'hello' }, { role: 'user', content: 'and now?' }],
    });
    expect(input).toEqual([
      { role: 'user', content: 'Be brief.\n\nContext: 2 meals.' },
      { role: 'user', content: 'hi' },
      { role: 'assistant', content: 'hello' },
      { role: 'user', content: 'and now?' },
    ]);
  });

  it('moves photos into images and keeps the text, dropping empty turns', () => {
    const { input, images } = toSampleInput({
      messages: [
        { role: 'user', content: '   ' },
        { role: 'user', content: [{ type: 'image', source: { data: btoa('abc'), media_type: 'image/png' } }, { type: 'text', text: 'what is this?' }] },
      ],
    });
    expect(input).toEqual([{ role: 'user', content: 'what is this?' }]);
    expect(images).toHaveLength(1);
    expect(images[0].type).toBe('image/png');
    expect(images[0].size).toBe(3);
  });

  it('asks for JSON matching the schema when the request wants structured output', () => {
    const { input, json } = toSampleInput({
      system: 'Parse food.',
      messages: [{ role: 'user', content: 'two eggs' }],
      output_config: { format: { type: 'json_schema', schema: { type: 'object' } } },
    });
    expect(json).toBe(true);
    expect(input[0].content).toContain('Parse food.');
    expect(input[0].content).toContain('{"type":"object"}');
  });
});

describe('createSampleClient', () => {
  it('create() returns the answer text in the shape the app reads, on the quick tier for low effort', async () => {
    sampleMock.mockResolvedValue({ text: 'Nice day.', truncated: false });
    const res = await createSampleClient().messages.create({
      model: 'x', max_tokens: 10, messages: [{ role: 'user', content: 'check in' }], output_config: { effort: 'low' },
    } as never);
    expect(res.content).toEqual([{ type: 'text', text: 'Nice day.' }]);
    expect(res.stop_reason).toBe('end_turn');
    const opts = sampleMock.mock.calls[0][1] as SampleOptions;
    expect(opts.modelTier).toBe('quick');
    expect(opts.cache).toBe(false); // every ask must be fresh
  });

  it('uses the default tier without a low effort, and returns structured output as JSON text', async () => {
    jsonMock.mockResolvedValue([{ name: 'egg', calories: 70 }]);
    const res = await createSampleClient().messages.create({
      model: 'x', max_tokens: 10, messages: [{ role: 'user', content: 'egg' }],
      output_config: { format: { type: 'json_schema', schema: {} } },
    } as never);
    expect(JSON.parse((res.content[0] as { text: string }).text)).toEqual([{ name: 'egg', calories: 70 }]);
    expect((jsonMock.mock.calls[0][1] as SampleOptions).modelTier).toBe('default');
  });

  it('stream() relays text deltas, resolves the final message, and can be aborted', async () => {
    let seenSignal: AbortSignal | undefined;
    sampleMock.mockImplementation(async (_input: unknown, opts: SampleOptions) => {
      seenSignal = opts.signal;
      opts.onText?.({ text: 'Hel', delta: 'Hel' });
      opts.onText?.({ text: 'Hello', delta: 'lo' });
      return { text: 'Hello', truncated: false };
    });
    const stream = createSampleClient().messages.stream({ model: 'x', max_tokens: 10, messages: [{ role: 'user', content: 'hi' }] } as never);
    const deltas: string[] = [];
    stream.on('text', (d: string) => deltas.push(d));
    const final = await stream.finalMessage();
    expect(deltas).toEqual(['Hel', 'lo']);
    expect((final.content[0] as { text: string }).text).toBe('Hello');
    stream.abort();
    expect(seenSignal?.aborted).toBe(true);
  });

  it('rejects when Claude is not reachable, and does not leave an unhandled rejection on an abandoned stream', async () => {
    available = null;
    await expect(createSampleClient().messages.create({ model: 'x', max_tokens: 1, messages: [{ role: 'user', content: 'a' }] } as never)).rejects.toMatchObject({ code: 'capability_disabled' });
    expect(() => createSampleClient().messages.stream({ model: 'x', max_tokens: 1, messages: [{ role: 'user', content: 'a' }] } as never)).not.toThrow();
    await new Promise((r) => setTimeout(r, 0));
  });
});

describe('sample errors in the app', () => {
  it('reads a cancelled call as a user abort', () => {
    expect(isAbortError({ code: 'cancelled', message: 'x' })).toBe(true);
    expect(isAbortError({ code: 'upstream_error', message: 'x' })).toBe(false);
  });

  it('explains the common failures in the user\'s language', () => {
    expect(describeAiError({ code: 'not_granted', message: 'x' }, 'en')).toMatch(/Claude is not available/);
    expect(describeAiError({ code: 'not_granted', message: 'x' }, 'th')).toMatch(/Claude/);
    expect(describeAiError({ code: 'rate_limited', message: 'x' }, 'en')).toMatch(/Rate limited/);
    expect(describeAiError({ code: 'upstream_error', message: 'x' }, 'en')).toMatch(/Could not reach/);
  });
});

describe('sampleWithTools', () => {
  it('hands the tools, the photo and the conversation to sample and returns the reply', async () => {
    sampleMock.mockImplementation(async (_input: unknown, opts: SampleOptions) => {
      opts.onText?.({ text: 'Logged', delta: 'Logged' });
      return { text: 'Logged it.', truncated: false };
    });
    const seen: string[] = [];
    const tool = { name: 'log_food', description: 'log', inputSchema: { type: 'object' as const }, execute: () => 'ok' };
    const reply = await sampleWithTools({
      system: 'You log food.',
      turns: [{ role: 'user', content: 'rice' }],
      image: { mediaType: 'image/jpeg', base64: btoa('xyz') },
      tools: [tool],
      effort: 'low',
      signal: new AbortController().signal,
      onText: (t) => seen.push(t),
    });
    expect(reply).toBe('Logged it.');
    expect(seen).toEqual(['Logged']);
    const [input, opts] = sampleMock.mock.calls[0] as [{ role: string; content: string }[], SampleOptions];
    expect(input[0]).toEqual({ role: 'user', content: 'You log food.' });
    expect(opts.tools).toEqual([tool]);
    expect(opts.modelTier).toBe('quick');
    expect(opts.images).toHaveLength(1);
  });
});
