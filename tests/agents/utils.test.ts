import { describe, it, expect, vi } from 'vitest';
import { callAgent } from '../../src/agents/utils.js';
import type { LLMProvider, CompletionResponse } from '../../src/providers/types.js';

// ─── Helpers ──────────────────────────────────────────────────────────────────

interface FakeProvider {
  provider: LLMProvider;
  /** The vi.fn() spy — access this instead of provider.complete to avoid unbound-method lint errors. */
  completeSpy: ReturnType<typeof vi.fn>;
}

function makeProvider(content: string): FakeProvider {
  const response: CompletionResponse = {
    content,
    inputTokens: 100,
    outputTokens: 50,
    durationMs: 200,
    model: 'llama-3.3-70b-versatile',
    provider: 'groq',
  };
  const completeSpy = vi.fn().mockResolvedValue(response);
  const provider: LLMProvider = {
    name: 'groq',
    isConfigured: () => true,
    complete: completeSpy,
  };
  return { provider, completeSpy };
}

const VALID_OUTPUT = { clarifiedGoal: 'Build a CLI', requirements: ['req1'] };

// ─── JSON extraction ──────────────────────────────────────────────────────────

describe('callAgent() — JSON extraction', () => {
  it('parses a clean JSON response', async () => {
    const { provider } = makeProvider(JSON.stringify(VALID_OUTPUT));
    const result = await callAgent('po', provider, 'llama-3.3-70b-versatile', 'sys', 'user');
    expect(result.output).toEqual(VALID_OUTPUT);
  });

  it('strips ```json ... ``` code fences before parsing', async () => {
    const fenced = '```json\n' + JSON.stringify(VALID_OUTPUT) + '\n```';
    const { provider } = makeProvider(fenced);
    const result = await callAgent('po', provider, 'llama-3.3-70b-versatile', 'sys', 'user');
    expect(result.output).toEqual(VALID_OUTPUT);
  });

  it('strips ``` ... ``` code fences without language tag', async () => {
    const fenced = '```\n' + JSON.stringify(VALID_OUTPUT) + '\n```';
    const { provider } = makeProvider(fenced);
    const result = await callAgent('po', provider, 'llama-3.3-70b-versatile', 'sys', 'user');
    expect(result.output).toEqual(VALID_OUTPUT);
  });

  it('ignores leading prose before the JSON object', async () => {
    const withProse = 'Here is the result:\n' + JSON.stringify(VALID_OUTPUT);
    const { provider } = makeProvider(withProse);
    const result = await callAgent('po', provider, 'llama-3.3-70b-versatile', 'sys', 'user');
    expect(result.output).toEqual(VALID_OUTPUT);
  });

  it('throws when no JSON object is found', async () => {
    const { provider } = makeProvider('I cannot answer that.');
    await expect(
      callAgent('po', provider, 'llama-3.3-70b-versatile', 'sys', 'user'),
    ).rejects.toThrow('No JSON object');
  });

  it('throws when the JSON is malformed', async () => {
    const { provider } = makeProvider('{ clarifiedGoal: missing quotes }');
    await expect(
      callAgent('po', provider, 'llama-3.3-70b-versatile', 'sys', 'user'),
    ).rejects.toThrow();
  });
});

// ─── Meta / cost ──────────────────────────────────────────────────────────────

describe('callAgent() — meta', () => {
  it('populates role, modelId, provider on meta', async () => {
    const { provider } = makeProvider(JSON.stringify(VALID_OUTPUT));
    const { meta } = await callAgent('po', provider, 'llama-3.3-70b-versatile', 'sys', 'user');
    expect(meta.role).toBe('po');
    expect(meta.modelId).toBe('llama-3.3-70b-versatile');
    expect(meta.provider).toBe('groq');
  });

  it('sets inputTokens, outputTokens, durationMs from response', async () => {
    const { provider } = makeProvider(JSON.stringify(VALID_OUTPUT));
    const { meta } = await callAgent('po', provider, 'llama-3.3-70b-versatile', 'sys', 'user');
    expect(meta.inputTokens).toBe(100);
    expect(meta.outputTokens).toBe(50);
    expect(meta.durationMs).toBe(200);
  });

  it('defaults cacheReadTokens and cacheCreationTokens to 0 when absent', async () => {
    const { provider } = makeProvider(JSON.stringify(VALID_OUTPUT));
    const { meta } = await callAgent('po', provider, 'llama-3.3-70b-versatile', 'sys', 'user');
    expect(meta.cacheReadTokens).toBe(0);
    expect(meta.cacheCreationTokens).toBe(0);
  });

  it('calculates costUsd from catalog pricing', async () => {
    const { provider } = makeProvider(JSON.stringify(VALID_OUTPUT));
    const { meta } = await callAgent('po', provider, 'llama-3.3-70b-versatile', 'sys', 'user');
    // llama: 0.00000059 in, 0.00000079 out
    const expected = 100 * 0.00000059 + 50 * 0.00000079;
    expect(meta.costUsd).toBeCloseTo(expected, 10);
  });

  it('sends request with temperature 0 and cacheSystemPrompt true', async () => {
    const { provider, completeSpy } = makeProvider(JSON.stringify(VALID_OUTPUT));
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
