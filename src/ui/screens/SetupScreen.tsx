import React, { useState } from 'react';
import { Box, Text, useInput, useApp } from 'ink';
import TextInput from 'ink-text-input';
import { Separator } from '../components/Separator.js';
import type { ProviderName } from '../../types/index.js';
import { setApiKey, getApiKey } from '../../providers/config.js';

// ─── Provider metadata ────────────────────────────────────────────────────────

interface ProviderInfo {
  name: ProviderName;
  label: string;
  url: string;
  free: boolean;
  envVar: string;
  desc: string;
}

const PROVIDERS: ProviderInfo[] = [
  {
    name: 'openrouter',
    label: 'OpenRouter',
    url: 'openrouter.ai',
    free: true,
    envVar: 'OPENROUTER_API_KEY',
    desc: 'Gateway to 200+ models — one key, no credit card required to start',
  },
  {
    name: 'groq',
    label: 'Groq',
    url: 'console.groq.com',
    free: true,
    envVar: 'GROQ_API_KEY',
    desc: 'Ultra-fast LPU inference (Llama, Mixtral) — free tier, great for dev',
  },
  {
    name: 'claude',
    label: 'Claude',
    url: 'console.anthropic.com',
    free: false,
    envVar: 'ANTHROPIC_API_KEY',
    desc: "Anthropic's Claude family — best complex reasoning, paid only",
  },
  {
    name: 'openai',
    label: 'OpenAI',
    url: 'platform.openai.com',
    free: false,
    envVar: 'OPENAI_API_KEY',
    desc: 'GPT-4o, o1 — industry standard, paid only',
  },
  {
    name: 'gemini',
    label: 'Gemini',
    url: 'aistudio.google.com',
    free: true,
    envVar: 'GEMINI_API_KEY',
    desc: 'Google Gemini — free tier via AI Studio (GEMINI_API_KEY)',
  },
  {
    name: 'nim',
    label: 'NIM',
    url: 'build.nvidia.com',
    free: true,
    envVar: 'NIM_API_KEY',
    desc: 'NVIDIA hosted models — sign up at build.nvidia.com, free tier available',
  },
  {
    name: 'ollama',
    label: 'Ollama',
    url: 'ollama.ai',
    free: true,
    envVar: '(none)',
    desc: 'Local models on your machine — no key, no cost, install from ollama.ai',
  },
];

// ─── Screen ───────────────────────────────────────────────────────────────────

interface SetupScreenProps {
  onComplete: () => void;
  onBack?: () => void;
}

export function SetupScreen({ onComplete, onBack }: SetupScreenProps) {
  const app = useApp();
  const [focusedIndex, setFocusedIndex] = useState(0);
  const [entering, setEntering] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [configured, setConfigured] = useState<Set<ProviderName>>(
    () => new Set(PROVIDERS.map((p) => p.name).filter((n) => !!getApiKey(n))),
  );

  const focusedProvider = PROVIDERS[focusedIndex];
  const hasOne = configured.size > 0;

  useInput((input, key) => {
    if (entering) {
      if (key.escape) {
        setInputValue('');
        setEntering(false);
      }
      return;
    }
    if (key.escape) {
      if (onBack) onBack();
      return;
    }
    if (input === 'q') {
      if (onBack) onBack();
      else app.exit();
    }
    if (key.upArrow) setFocusedIndex((i) => Math.max(0, i - 1));
    if (key.downArrow) setFocusedIndex((i) => Math.min(PROVIDERS.length - 1, i + 1));
    if (key.return) setEntering(true);
    if (input === 'c' && hasOne) onComplete();
  });

  const handleSubmit = (value: string) => {
    const trimmed = value.trim();
    if (focusedProvider?.name === 'ollama') {
      // Ollama needs no API key — mark as acknowledged
      setConfigured((prev) => new Set([...prev, 'ollama']));
    } else if (trimmed && focusedProvider) {
      setApiKey(focusedProvider.name, trimmed);
      setConfigured((prev) => new Set([...prev, focusedProvider.name]));
    }
    setInputValue('');
    setEntering(false);
  };

  return (
    <Box flexDirection="column">
      <Separator />

      <Box flexDirection="column" paddingX={2} paddingY={1} gap={1}>
        <Text color="white" bold>
          Arm the forge — choose a provider
        </Text>
        <Text color="gray" dimColor>
          At least one key required to fire the forge. Groq and Gemini offer a free tier.
        </Text>

        {/* Provider list */}
        <Box flexDirection="column" marginTop={1} gap={0}>
          {PROVIDERS.map((p, i) => {
            const isConfigured = configured.has(p.name);
            const isFocused = i === focusedIndex;
            return (
              <Box key={p.name} flexDirection="column">
                <Box gap={2}>
                  <Text color="yellow">{isFocused ? '▶' : ' '}</Text>
                  <Box width={2}>
                    <Text color={isConfigured ? 'green' : 'gray'}>{isConfigured ? '✓' : '○'}</Text>
                  </Box>
                  <Box width={12}>
                    <Text color={isFocused ? 'white' : 'gray'} bold={isFocused}>
                      {p.label}
                    </Text>
                  </Box>
                  <Text color="gray" dimColor={!isFocused}>
                    {p.url}
                  </Text>
                  {p.free && (
                    <Text color="green" dimColor>
                      free
                    </Text>
                  )}
                </Box>
                {isFocused && (
                  <Box marginLeft={5}>
                    <Text color="gray" dimColor>
                      {p.desc}
                    </Text>
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>

        {/* Key input */}
        {entering && focusedProvider && (
          <Box
            flexDirection="column"
            gap={0}
            marginTop={1}
            borderStyle="round"
            borderColor="yellow"
            paddingX={2}
            paddingY={1}
          >
            <Text color="gray">
              {focusedProvider.name === 'ollama'
                ? 'No key needed — Ollama runs locally. Install from ollama.ai then press Enter.'
                : `Get your key at ${focusedProvider.url} · env var: ${focusedProvider.envVar}`}
            </Text>
            <Box gap={1} marginTop={1}>
              <Text color="yellow">›</Text>
              <TextInput
                value={inputValue}
                onChange={setInputValue}
                onSubmit={handleSubmit}
                placeholder={
                  focusedProvider.name === 'ollama' ? 'Enter to confirm' : 'paste your API key…'
                }
                {...(focusedProvider.name !== 'ollama' ? { mask: '*' } : {})}
              />
            </Box>
            <Text color="gray" dimColor>
              <Text color="yellow">[↵]</Text> save · <Text color="yellow">[Esc]</Text> cancel
            </Text>
          </Box>
        )}

        {/* Alt: persist via CLI or .env */}
        {!entering && (
          <Box marginTop={1} flexDirection="column" gap={0}>
            <Text color="gray" dimColor>
              Persist a key: <Text color="white">lunira config set groq.apiKey sk-...</Text>
            </Text>
            <Text color="gray" dimColor>
              Or add to your project&apos;s <Text color="white">.env</Text>:{' '}
              <Text color="white">GROQ_API_KEY=sk-...</Text>
            </Text>
          </Box>
        )}
      </Box>

      {/* Footer */}
      <Box gap={3} paddingX={1} marginTop={1}>
        <Text color="gray">
          <Text color="yellow">[↑↓]</Text> navigate
        </Text>
        <Text color="gray">
          <Text color="yellow">[↵]</Text> enter key
        </Text>
        {hasOne && (
          <Text color="gray">
            <Text color="green">[c]</Text> continuer
          </Text>
        )}
        {onBack && (
          <Text color="gray">
            <Text color="yellow">[Esc]</Text> back
          </Text>
        )}
        <Text color="gray">
          <Text color="yellow">[q]</Text> quit
        </Text>
      </Box>
    </Box>
  );
}
