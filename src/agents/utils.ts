import { getModelById } from '../models/catalog.js';
import type { AgentRole } from '../types/index.js';
import type { LLMProvider } from '../providers/types.js';
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

// ─── Core runner ──────────────────────────────────────────────────────────────

/**
 * Calls a provider, extracts the JSON output, and wraps the result with cost
 * and token metadata.
 *
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
  const response = await provider.complete({
    modelId,
    systemPrompt,
    cacheSystemPrompt: true,
    messages: [{ role: 'user', content: userMessage }],
    temperature: 0, // deterministic output
  });

  const parsed = extractJson(response.content) as T;

  const inputTokens = response.inputTokens;
  const outputTokens = response.outputTokens;
  const cacheReadTokens = response.cacheReadTokens ?? 0;
  const cacheCreationTokens = response.cacheCreationTokens ?? 0;

  const meta: AgentMeta = {
    role,
    modelId,
    provider: provider.name,
    inputTokens,
    outputTokens,
    cacheReadTokens,
    cacheCreationTokens,
    costUsd: calcCostUsd(modelId, inputTokens, outputTokens),
    durationMs: response.durationMs,
  };

  return { output: parsed, meta };
}
