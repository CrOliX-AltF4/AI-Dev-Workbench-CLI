import Anthropic from '@anthropic-ai/sdk';
import type { LLMProvider, CompletionRequest, CompletionResponse } from './types.js';
import { getApiKey } from './config.js';

export class ClaudeProvider implements LLMProvider {
  readonly name = 'claude' as const;

  private client(): Anthropic {
    const apiKey = getApiKey('claude');
    if (!apiKey)
      throw new Error('Anthropic API key not configured. Run: aiwb config set claude.apiKey <key>');
    return new Anthropic({ apiKey });
  }

  isConfigured(): boolean {
    return !!getApiKey('claude');
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const client = this.client();
    const start = Date.now();

    // Build system prompt — apply prompt caching when requested
    const systemParam: Anthropic.Messages.MessageCreateParamsNonStreaming['system'] =
      request.systemPrompt
        ? request.cacheSystemPrompt
          ? [
              {
                type: 'text' as const,
                text: request.systemPrompt,
                cache_control: { type: 'ephemeral' as const },
              },
            ]
          : request.systemPrompt
        : undefined;

    const messages: Anthropic.Messages.MessageParam[] = request.messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const params: Anthropic.Messages.MessageCreateParamsNonStreaming = {
      model: request.modelId,
      max_tokens: request.maxTokens ?? 4096,
      messages,
      ...(systemParam !== undefined ? { system: systemParam } : {}),
      ...(request.temperature !== undefined ? { temperature: request.temperature } : {}),
    };

    const response = await client.messages.create(params);

    const textBlock = response.content.find((b) => b.type === 'text');
    const content = textBlock?.type === 'text' ? textBlock.text : '';

    const { usage } = response;

    const result: CompletionResponse = {
      content,
      inputTokens: usage.input_tokens,
      outputTokens: usage.output_tokens,
      durationMs: Date.now() - start,
      model: response.model,
      provider: 'claude',
    };

    if (usage.cache_read_input_tokens != null) {
      result.cacheReadTokens = usage.cache_read_input_tokens;
    }
    if (usage.cache_creation_input_tokens != null) {
      result.cacheCreationTokens = usage.cache_creation_input_tokens;
    }

    return result;
  }
}
