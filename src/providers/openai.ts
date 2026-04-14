import OpenAI from 'openai';
import type { LLMProvider, CompletionRequest, CompletionResponse } from './types.js';
import { getApiKey } from './config.js';

export class OpenAIProvider implements LLMProvider {
  readonly name = 'openai' as const;

  private client(): OpenAI {
    const apiKey = getApiKey('openai');
    if (!apiKey)
      throw new Error('OpenAI API key not configured. Run: aiwb config set openai.apiKey <key>');
    return new OpenAI({ apiKey });
  }

  isConfigured(): boolean {
    return !!getApiKey('openai');
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const client = this.client();
    const start = Date.now();

    const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [];

    if (request.systemPrompt) {
      messages.push({ role: 'system', content: request.systemPrompt });
    }

    for (const m of request.messages) {
      messages.push({ role: m.role, content: m.content });
    }

    const response = await client.chat.completions.create({
      model: request.modelId,
      messages,
      max_tokens: request.maxTokens ?? 4096,
      temperature: request.temperature ?? 0.7,
    });

    const choice = response.choices[0];
    if (!choice) throw new Error('OpenAI returned no choices');

    return {
      content: choice.message.content ?? '',
      inputTokens: response.usage?.prompt_tokens ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
      durationMs: Date.now() - start,
      model: response.model,
      provider: 'openai',
    };
  }
}
