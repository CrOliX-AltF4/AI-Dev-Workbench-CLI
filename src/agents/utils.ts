import { getModelById } from '../models/catalog.js';
import type { AgentRole } from '../types/index.js';
import type { LLMProvider, Message } from '../providers/types.js';
import type { AgentMeta, AgentResult } from './types.js';

// ─── JSON extraction ──────────────────────────────────────────────────────────

/**
 * Extracts the first JSON object from a raw LLM response.
 * Handles markdown code fences (```json ... ```) and leading/trailing prose.
 */
function extractJson(raw: string): unknown {
  const stripped = raw
    .replace(/^```(?:json)?\s*/m, '')
    .replace(/\s*```\s*$/m, '')
    .trim();

  const start = stripped.indexOf('{');
  const end = stripped.lastIndexOf('}');

  if (start === -1 || end === -1 || end < start) {
    throw new Error(`No JSON object in model response. Got: ${raw.slice(0, 300)}`);
  }

  try {
    return JSON.parse(stripped.slice(start, end + 1));
  } catch (err) {
    throw new Error(`Malformed JSON in model response: ${String(err)}. Got: ${raw.slice(0, 300)}`);
  }
}

// ─── Cost calculation ─────────────────────────────────────────────────────────

function calcCostUsd(modelId: string, inputTokens: number, outputTokens: number): number {
  const spec = getModelById(modelId);
  if (!spec) return 0;
  return inputTokens * spec.costPerInputToken + outputTokens * spec.costPerOutputToken;
}

// ─── Retry helpers ────────────────────────────────────────────────────────────

const MAX_JSON_RETRIES = 2;
const MAX_RATE_LIMIT_RETRIES = 3;
const RATE_LIMIT_BASE_MS = 1000;

function isRateLimit(err: unknown): boolean {
  const msg = String(err).toLowerCase();
  return msg.includes('429') || msg.includes('rate limit') || msg.includes('too many requests');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Core runner ──────────────────────────────────────────────────────────────

/**
 * Calls a provider, extracts the JSON output, and wraps the result with cost
 * and token metadata.
 *
 * Retry strategy:
 * - JSON parse failure → multi-turn retry: the bad response is sent back as an
 *   assistant message, followed by a corrective user message. Up to 2 retries.
 * - Rate limit (429) → exponential backoff: 1s, 2s, 4s. Up to 3 retries.
 *
 * Tokens and costs are accumulated across all attempts.
 * The system prompt is always cached (`cacheSystemPrompt: true`) because agent
 * system prompts are static per role — the variable data lives in the user
 * message only.
 */
export async function callAgent<T>(
  role: AgentRole,
  provider: LLMProvider,
  modelId: string,
  systemPrompt: string,
  userMessage: string,
): Promise<AgentResult<T>> {
  const messages: Message[] = [{ role: 'user', content: userMessage }];

  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCacheReadTokens = 0;
  let totalCacheCreationTokens = 0;
  let totalDurationMs = 0;
  let retries = 0;

  let jsonAttempts = 0;
  let rateLimitAttempts = 0;

  for (;;) {
    // ── Rate-limit backoff ──────────────────────────────────────────────────
    let response: Awaited<ReturnType<typeof provider.complete>>;
    try {
      response = await provider.complete({
        modelId,
        systemPrompt,
        cacheSystemPrompt: true,
        messages,
        temperature: 0,
      });
    } catch (err) {
      if (isRateLimit(err) && rateLimitAttempts < MAX_RATE_LIMIT_RETRIES) {
        const waitMs = RATE_LIMIT_BASE_MS * Math.pow(2, rateLimitAttempts);
        rateLimitAttempts++;
        retries++;
        await sleep(waitMs);
        continue;
      }
      throw err;
    }

    // Accumulate usage across all attempts
    totalInputTokens += response.inputTokens;
    totalOutputTokens += response.outputTokens;
    totalCacheReadTokens += response.cacheReadTokens ?? 0;
    totalCacheCreationTokens += response.cacheCreationTokens ?? 0;
    totalDurationMs += response.durationMs;

    // ── JSON extraction with corrective retry ───────────────────────────────
    try {
      const parsed = extractJson(response.content) as T;

      const meta: AgentMeta = {
        role,
        modelId,
        provider: provider.name,
        inputTokens: totalInputTokens,
        outputTokens: totalOutputTokens,
        cacheReadTokens: totalCacheReadTokens,
        cacheCreationTokens: totalCacheCreationTokens,
        costUsd: calcCostUsd(modelId, totalInputTokens, totalOutputTokens),
        durationMs: totalDurationMs,
        retries,
      };

      return { output: parsed, meta };
    } catch (jsonErr) {
      if (jsonAttempts >= MAX_JSON_RETRIES) {
        throw jsonErr;
      }
      // Add the bad response + corrective prompt for next attempt
      messages.push({ role: 'assistant', content: response.content });
      messages.push({
        role: 'user',
        content:
          'Your previous response was not valid JSON. ' +
          'Respond ONLY with a valid JSON object — no prose, no markdown fences, no explanation.',
      });
      jsonAttempts++;
      retries++;
    }
  }
}
