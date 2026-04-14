import type { AgentRole, ModelSpec } from '../types/index.js';

// ─── Model catalog ────────────────────────────────────────────────────────────
// Hardcoded for now — will be driven by the Model Recommendation Engine (step 4)

export const MODEL_CATALOG: ModelSpec[] = [
  {
    id: 'llama-3.3-70b-versatile',
    provider: 'groq',
    displayName: 'Llama 3.3 70B',
    contextWindow: 128_000,
    costPerInputToken: 0.00000059,
    costPerOutputToken: 0.00000079,
    avgLatencyMs: 800,
    strengths: ['clarification', 'analysis', 'debug'],
  },
  {
    id: 'gemini-2.0-flash',
    provider: 'gemini',
    displayName: 'Gemini 2.0 Flash',
    contextWindow: 1_048_576,
    costPerInputToken: 0.0000001,
    costPerOutputToken: 0.0000004,
    avgLatencyMs: 1200,
    strengths: ['architecture', 'analysis', 'code'],
  },
  {
    id: 'gemini-2.5-pro',
    provider: 'gemini',
    displayName: 'Gemini 2.5 Pro',
    contextWindow: 1_048_576,
    costPerInputToken: 0.00000125,
    costPerOutputToken: 0.00001,
    avgLatencyMs: 2000,
    strengths: ['architecture', 'code', 'analysis'],
  },
  {
    id: 'claude-sonnet-4-5',
    provider: 'claude',
    displayName: 'Claude Sonnet 4.5',
    contextWindow: 200_000,
    costPerInputToken: 0.000003,
    costPerOutputToken: 0.000015,
    avgLatencyMs: 2500,
    strengths: ['code', 'architecture', 'analysis'],
  },
  {
    id: 'claude-opus-4-6',
    provider: 'claude',
    displayName: 'Claude Opus 4.6',
    contextWindow: 200_000,
    costPerInputToken: 0.000015,
    costPerOutputToken: 0.000075,
    avgLatencyMs: 4000,
    strengths: ['code', 'architecture'],
  },
  {
    id: 'gpt-4o',
    provider: 'openai',
    displayName: 'GPT-4o',
    contextWindow: 128_000,
    costPerInputToken: 0.0000025,
    costPerOutputToken: 0.00001,
    avgLatencyMs: 2000,
    strengths: ['code', 'analysis', 'clarification'],
  },
];

// ─── Default model per role ───────────────────────────────────────────────────
// Strategy: fast+cheap for routing, powerful for code generation
// Will be replaced by MRE scoring in step 4

export const DEFAULT_ROLE_MODELS: Record<AgentRole, string> = {
  po: 'llama-3.3-70b-versatile', // fast clarification
  planner: 'gemini-2.0-flash', // large context for architecture
  dev: 'claude-sonnet-4-5', // best code quality
  qa: 'llama-3.3-70b-versatile', // fast validation
};

export function getModelById(id: string): ModelSpec | undefined {
  return MODEL_CATALOG.find((m) => m.id === id);
}

export function getDefaultModel(role: AgentRole): ModelSpec {
  const id = DEFAULT_ROLE_MODELS[role];
  const model = getModelById(id);
  if (!model) throw new Error(`Default model not found for role: ${role}`);
  return model;
}
