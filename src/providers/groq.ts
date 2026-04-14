import Groq from 'groq-sdk';
import type { LLMProvider, CompletionRequest, CompletionResponse } from './types.js';
import { getApiKey } from './config.js';

export class GroqProvider implements LLMProvider {
  readonly name = 'groq' as const;

  private client(): Groq {
    const apiKey = getApiKey('groq');
    if (!apiKey)
      throw new Error('Groq API key not configured. Run: aiwb config set groq.apiKey <key>');
    return new Groq({ apiKey });
  }

  isConfigured(): boolean {
    return !!getApiKey('groq');
  }

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const client = this.client();
    const start = Date.now();

    const messages: Groq.Chat.ChatCompletionMessageParam[] = [];
    for (const m of request.messages) {
      messages.push({ role: m.role, content: m.content });
    }

    const response = await client.chat.completions.create({
      model: request.modelId,
      messages: request.systemPrompt
        ? [{ role: 'system', content: request.systemPrompt }, ...messages]
        : messages,
      max_tokens: request.maxTokens ?? 4096,
      temperature: request.temperature ?? 0.7,
      stream: false,
    });

    const choice = response.choices[0];
    if (!choice) throw new Error('Groq returned no choices');

    return {
      content: choice.message.content ?? '',
      inputTokens: response.usage?.prompt_tokens ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
      durationMs: Date.now() - start,
      model: response.model,
      provider: 'groq',
    };
  }
}
