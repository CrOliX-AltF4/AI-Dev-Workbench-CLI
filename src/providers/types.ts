import type { ProviderName } from '../types/index.js';

// ─── Request / Response ───────────────────────────────────────────────────────

export interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export interface CompletionRequest {
  messages: Message[];
  systemPrompt?: string;
  /** Enable prompt caching on the system prompt (Claude only for now) */
  cacheSystemPrompt?: boolean;
  modelId: string;
  maxTokens?: number;
  temperature?: number;
}

export interface CompletionResponse {
  content: string;
  inputTokens: number;
  outputTokens: number;
  /** Cache read tokens (Claude prompt caching) */
  cacheReadTokens?: number;
  /** Cache creation tokens (Claude prompt caching) */
  cacheCreationTokens?: number;
  durationMs: number;
  model: string;
  provider: ProviderName;
}

// ─── Provider interface ───────────────────────────────────────────────────────

export interface LLMProvider {
  readonly name: ProviderName;
  complete(request: CompletionRequest): Promise<CompletionResponse>;
  isConfigured(): boolean;
}
