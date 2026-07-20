export type ErrorCode = 'rate_limit' | 'auth' | 'quota' | 'server' | 'network' | 'unknown';

export interface ClassifiedError {
  code: ErrorCode;
  message: string;
  hint: string;
}

export function classifyProviderError(err: unknown): ClassifiedError {
  const raw = err instanceof Error ? err.message : String(err);
  const lower = raw.toLowerCase();

  if (/\b429\b|rate.?limit/i.test(raw)) {
    return {
      code: 'rate_limit',
      message: `Rate limit hit: ${raw}`,
      hint: 'Wait a moment and retry, or switch provider with --provider.',
    };
  }

  if (/\b401\b|\b403\b|unauthorized|forbidden|invalid.?api.?key|incorrect.?api.?key/i.test(raw)) {
    return {
      code: 'auth',
      message: `Authentication failed: ${raw}`,
      hint: 'Check your API key with: lunira config list',
    };
  }

  if (/\b402\b|quota|insufficient.?credit|billing|payment/i.test(raw)) {
    return {
      code: 'quota',
      message: `Quota or credit exhausted: ${raw}`,
      hint: 'Add credits to your provider account or switch provider with --provider.',
    };
  }

  if (/\b5\d{2}\b|server.?error|service.?unavailable|overloaded|bad.?gateway/i.test(raw)) {
    return {
      code: 'server',
      message: `Provider server error: ${raw}`,
      hint: 'The provider is temporarily unavailable. Retry in a few seconds.',
    };
  }

  if (
    lower.includes('econnrefused') ||
    lower.includes('etimedout') ||
    lower.includes('enotfound') ||
    lower.includes('network')
  ) {
    return {
      code: 'network',
      message: `Network error: ${raw}`,
      hint: 'Check your internet connection or provider status.',
    };
  }

  return {
    code: 'unknown',
    message: raw,
    hint: 'Run lunira setup to verify your configuration.',
  };
}
