import { readFileSync, existsSync } from 'fs';
import { getConfiguredProviders, getProvider } from '../../providers/registry.js';
import { recommend } from '../../models/recommender.js';
import type { ProviderName } from '../../types/index.js';

// ─── Options ──────────────────────────────────────────────────────────────────

export interface AskOptions {
  provider?: string;
  model?: string;
  file?: string[];
}

// ─── Command ──────────────────────────────────────────────────────────────────

export async function askCommand(prompt: string, opts: AskOptions): Promise<void> {
  const configured = getConfiguredProviders();
  if (configured.length === 0) {
    process.stderr.write('No provider configured. Run: lunira setup\n');
    process.exit(1);
    return;
  }

  // Resolve provider and model
  let providerName: ProviderName;
  let modelId: string;

  if (opts.provider) {
    providerName = opts.provider as ProviderName;
    modelId = opts.model ?? '';
  } else {
    const rec = recommend({
      role: 'po',
      taskType: 'clarification',
      complexity: 'low',
      allowedProviders: configured.map((p) => p.name),
    });
    providerName = rec.recommended.provider;
    modelId = opts.model ?? rec.recommended.id;
  }

  const provider = getProvider(providerName);
  if (!provider.isConfigured()) {
    process.stderr.write(`Provider "${providerName}" is not configured. Run: lunira setup\n`);
    process.exit(1);
    return;
  }

  // Build user message — inject file contents before the prompt
  const parts: string[] = [];

  for (const filePath of opts.file ?? []) {
    if (!existsSync(filePath)) {
      process.stderr.write(`File not found: ${filePath}\n`);
      process.exit(1);
      return;
    }
    const content = readFileSync(filePath, 'utf-8');
    parts.push(`\`\`\`\n// ${filePath}\n${content}\n\`\`\``);
  }

  parts.push(prompt);
  const userMessage = parts.join('\n\n');

  const response = await provider.complete({
    messages: [{ role: 'user', content: userMessage }],
    modelId,
    maxTokens: 4096,
    temperature: 0.7,
  });

  process.stdout.write(response.content + '\n');
}
