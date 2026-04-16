import { describe, it, expect, vi } from 'vitest';
import { callAgent } from '../../src/agents/utils.js';
import type { LLMProvider, CompletionResponse } from '../../src/providers/types.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface FakeProvider {
  provider: LLMProvider;
  /** The vi.fn() spy — access this instead of provider.complete to avoid unbound-method lint errors. */
  completeSpy: ReturnType<typeof vi.fn>;
}

function makeResponse(
  content: string,
  overrides: Partial<CompletionResponse> = {},
): CompletionResponse {
  return {
    content,
    inputTokens: 100,
    outputTokens: 50,
    durationMs: 200,
    model: 'llama-3.3-70b-versatile',
    provider: 'groq',
    ...overrides,
  };
}

/** Provider that always returns the same content. */
function makeProvider(content: string): FakeProvider {
  const completeSpy = vi.fn().mockResolvedValue(makeResponse(content));
  const provider: LLMProvider = {
    name: 'groq',
    isConfigured: () => true,
    complete: completeSpy,
  };
  return { provider, completeSpy };
}

/** Provider that returns a different response on each call. */
function makeSequentialProvider(responses: Array<CompletionResponse | Error>): FakeProvider {
  let call = 0;
  const completeSpy = vi.fn().mockImplementation(() => {
    const r = responses[call++] ?? responses[responses.length - 1];
    return r instanceof Error ? Promise.reject(r) : Promise.resolve(r);
  });
  const provider: LLMProvider = {
    name: 'groq',
    isConfigured: () => true,
    complete: completeSpy,
  };
  return { provider, completeSpy };
}

const VALID_OUTPUT = { clarifiedGoal: 'Build a CLI', requirements: ['req1'] };
const VALID_JSON = JSON.stringify(VALID_OUTPUT);

// ─── JSON extraction ──────────────────────────────────────────────────────────

describe('callAgent() — JSON extraction', () => {
  it('parses a clean JSON response', async () => {
    const { provider } = makeProvider(VALID_JSON);
    const result = await callAgent('po', provider, 'llama-3.3-70b-versatile', 'sys', 'user');
    expect(result.output).toEqual(VALID_OUTPUT);
  });

  it('strips ```json ... ``` code fences before parsing', async () => {
    const fenced = '```json\n' + VALID_JSON + '\n```';
    const { provider } = makeProvider(fenced);
    const result = await callAgent('po', provider, 'llama-3.3-70b-versatile', 'sys', 'user');
    expect(result.output).toEqual(VALID_OUTPUT);
  });

  it('strips ``` ... ``` code fences without language tag', async () => {
    const fenced = '```\n' + VALID_JSON + '\n```';
    const { provider } = makeProvider(fenced);
    const result = await callAgent('po', provider, 'llama-3.3-70b-versatile', 'sys', 'user');
    expect(result.output).toEqual(VALID_OUTPUT);
  });

  it('ignores leading prose before the JSON object', async () => {
    const withProse = 'Here is the result:\n' + VALID_JSON;
    const { provider } = makeProvider(withProse);
    const result = await callAgent('po', provider, 'llama-3.3-70b-versatile', 'sys', 'user');
    expect(result.output).toEqual(VALID_OUTPUT);
  });

  it('throws after MAX_JSON_RETRIES when no JSON object is found', async () => {
    // 1 initial + 2 retries = 3 calls total
    const { provider, completeSpy } = makeProvider('I cannot answer that.');
    await expect(
      callAgent('po', provider, 'llama-3.3-70b-versatile', 'sys', 'user'),
    ).rejects.toThrow('No JSON object');
    expect(completeSpy).toHaveBeenCalledTimes(3);
  });

  it('throws after MAX_JSON_RETRIES when the JSON is malformed', async () => {
    const { provider, completeSpy } = makeProvider('{ clarifiedGoal: missing quotes }');
    await expect(
      callAgent('po', provider, 'llama-3.3-70b-versatile', 'sys', 'user'),
    ).rejects.toThrow();
    expect(completeSpy).toHaveBeenCalledTimes(3);
  });
});

// ─── Meta / cost ──────────────────────────────────────────────────────────────

describe('callAgent() — meta', () => {
  it('populates role, modelId, provider on meta', async () => {
    const { provider } = makeProvider(VALID_JSON);
    const { meta } = await callAgent('po', provider, 'llama-3.3-70b-versatile', 'sys', 'user');
    expect(meta.role).toBe('po');
    expect(meta.modelId).toBe('llama-3.3-70b-versatile');
    expect(meta.provider).toBe('groq');
  });

  it('sets inputTokens, outputTokens, durationMs from response', async () => {
    const { provider } = makeProvider(VALID_JSON);
    const { meta } = await callAgent('po', provider, 'llama-3.3-70b-versatile', 'sys', 'user');
    expect(meta.inputTokens).toBe(100);
    expect(meta.outputTokens).toBe(50);
    expect(meta.durationMs).toBe(200);
  });

  it('defaults cacheReadTokens and cacheCreationTokens to 0 when absent', async () => {
    const { provider } = makeProvider(VALID_JSON);
    const { meta } = await callAgent('po', provider, 'llama-3.3-70b-versatile', 'sys', 'user');
    expect(meta.cacheReadTokens).toBe(0);
    expect(meta.cacheCreationTokens).toBe(0);
  });

  it('calculates costUsd from catalog pricing', async () => {
    const { provider } = makeProvider(VALID_JSON);
    const { meta } = await callAgent('po', provider, 'llama-3.3-70b-versatile', 'sys', 'user');
    // llama: 0.00000059 in, 0.00000079 out
    const expected = 100 * 0.00000059 + 50 * 0.00000079;
    expect(meta.costUsd).toBeCloseTo(expected, 10);
  });

  it('reports retries: 0 on first-attempt success', async () => {
    const { provider } = makeProvider(VALID_JSON);
    const { meta } = await callAgent('po', provider, 'llama-3.3-70b-versatile', 'sys', 'user');
    expect(meta.retries).toBe(0);
  });

  it('sends request with temperature 0 and cacheSystemPrompt true', async () => {
    const { provider, completeSpy } = makeProvider(VALID_JSON);
    await callAgent('po', provider, 'llama-3.3-70b-versatile', 'the-system-prompt', 'the-user');
    expect(completeSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        temperature: 0,
        cacheSystemPrompt: true,
        systemPrompt: 'the-system-prompt',
      }),
    );
  });
});

// ─── JSON retry ───────────────────────────────────────────────────────────────

describe('callAgent() — JSON retry', () => {
  it('succeeds on second attempt after invalid JSON', async () => {
    const { provider, completeSpy } = makeSequentialProvider([
      makeResponse('not json at all'),
      makeResponse(VALID_JSON),
    ]);
    const result = await callAgent('po', provider, 'llama-3.3-70b-versatile', 'sys', 'user');
    expect(result.output).toEqual(VALID_OUTPUT);
    expect(completeSpy).toHaveBeenCalledTimes(2);
  });

  it('succeeds on third attempt after two bad responses', async () => {
    const { provider, completeSpy } = makeSequentialProvider([
      makeResponse('bad'),
      makeResponse('also bad'),
      makeResponse(VALID_JSON),
    ]);
    const result = await callAgent('po', provider, 'llama-3.3-70b-versatile', 'sys', 'user');
    expect(result.output).toEqual(VALID_OUTPUT);
    expect(completeSpy).toHaveBeenCalledTimes(3);
  });

  it('reports retries count correctly after JSON retries', async () => {
    const { provider } = makeSequentialProvider([makeResponse('bad'), makeResponse(VALID_JSON)]);
    const { meta } = await callAgent('po', provider, 'llama-3.3-70b-versatile', 'sys', 'user');
    expect(meta.retries).toBe(1);
  });

  it('accumulates tokens across retry attempts', async () => {
    const { provider } = makeSequentialProvider([
      makeResponse('bad', { inputTokens: 80, outputTokens: 20, durationMs: 100 }),
      makeResponse(VALID_JSON, { inputTokens: 120, outputTokens: 60, durationMs: 300 }),
    ]);
    const { meta } = await callAgent('po', provider, 'llama-3.3-70b-versatile', 'sys', 'user');
    expect(meta.inputTokens).toBe(200);
    expect(meta.outputTokens).toBe(80);
    expect(meta.durationMs).toBe(400);
  });

  it('sends a corrective user message on JSON retry', async () => {
    const { provider, completeSpy } = makeSequentialProvider([
      makeResponse('bad'),
      makeResponse(VALID_JSON),
    ]);
    await callAgent('po', provider, 'llama-3.3-70b-versatile', 'sys', 'user');

    const secondCall = completeSpy.mock.calls[1] as [
      { messages: Array<{ role: string; content: string }> },
    ];
    const messages = secondCall[0].messages;
    const lastMessage = messages[messages.length - 1];
    expect(lastMessage?.role).toBe('user');
    expect(lastMessage?.content).toMatch(/not valid JSON/i);
  });
});

// ─── Rate-limit retry ─────────────────────────────────────────────────────────

describe('callAgent() — rate limit retry', () => {
  it('retries after a 429 error and succeeds', async () => {
    vi.useFakeTimers();

    const rateLimitError = new Error('429 Too Many Requests — rate limit exceeded');
    const { provider, completeSpy } = makeSequentialProvider([
      rateLimitError,
      makeResponse(VALID_JSON),
    ]);

    const resultPromise = callAgent('po', provider, 'llama-3.3-70b-versatile', 'sys', 'user');
    await vi.runAllTimersAsync();
    const result = await resultPromise;

    expect(result.output).toEqual(VALID_OUTPUT);
    expect(completeSpy).toHaveBeenCalledTimes(2);

    vi.useRealTimers();
  });

  it('reports retries count after rate limit retry', async () => {
    vi.useFakeTimers();

    const rateLimitError = new Error('429 rate limit');
    const { provider } = makeSequentialProvider([rateLimitError, makeResponse(VALID_JSON)]);

    const resultPromise = callAgent('po', provider, 'llama-3.3-70b-versatile', 'sys', 'user');
    await vi.runAllTimersAsync();
    const { meta } = await resultPromise;

    expect(meta.retries).toBe(1);

    vi.useRealTimers();
  });

  it('rethrows after MAX_RATE_LIMIT_RETRIES consecutive 429s', async () => {
    vi.useFakeTimers();

    const rateLimitError = new Error('429 rate limit');
    const { provider, completeSpy } = makeSequentialProvider([
      rateLimitError,
      rateLimitError,
      rateLimitError,
      rateLimitError, // 4th — exceeds MAX (3)
    ]);

    const resultPromise = callAgent('po', provider, 'llama-3.3-70b-versatile', 'sys', 'user').catch(
      (e: unknown) => e,
    );
    await vi.runAllTimersAsync();
    const err = await resultPromise;

    expect(err).toBeInstanceOf(Error);
    expect(completeSpy).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
    vi.useRealTimers();
  });

  it('rethrows non-rate-limit provider errors immediately', async () => {
    const networkError = new Error('ECONNREFUSED');
    const { provider, completeSpy } = makeSequentialProvider([networkError]);
    await expect(
      callAgent('po', provider, 'llama-3.3-70b-versatile', 'sys', 'user'),
    ).rejects.toThrow('ECONNREFUSED');
    expect(completeSpy).toHaveBeenCalledTimes(1);
  });
});
