import type {
  AgentRole,
  ComplexityLevel,
  ModelRecommendation,
  ModelSpec,
  ProviderName,
  TaskType,
} from '../types/index.js';
import { MODEL_CATALOG, getDefaultModel } from './catalog.js';

// ─── Scoring preferences ──────────────────────────────────────────────────────

export interface ScoringPreferences {
  /** 0–1, how much to favor task-fit over other dimensions (default 0.4) */
  taskFitWeight: number;
  /** 0–1, how much to favor lower cost (default 0.25) */
  costWeight: number;
  /** 0–1, how much to favor lower latency (default 0.2) */
  latencyWeight: number;
  /** 0–1, how much to favor larger context window (default 0.15) */
  contextWeight: number;
}

export const DEFAULT_PREFERENCES: ScoringPreferences = {
  taskFitWeight: 0.4,
  costWeight: 0.25,
  latencyWeight: 0.2,
  contextWeight: 0.15,
};

// ─── Complexity multipliers ───────────────────────────────────────────────────

/** Adjust cost/latency tolerance based on task complexity */
const COMPLEXITY_MULTIPLIERS: Record<
  ComplexityLevel,
  { costPenalty: number; latencyPenalty: number }
> = {
  low: { costPenalty: 1.5, latencyPenalty: 1.5 }, // strongly penalise expensive/slow on simple tasks
  medium: { costPenalty: 1.0, latencyPenalty: 1.0 },
  high: { costPenalty: 0.5, latencyPenalty: 0.5 }, // tolerate cost/latency for complex tasks
};

// ─── Score helpers ────────────────────────────────────────────────────────────

/** Returns 0–1: higher is better for task fit */
function scoreTaskFit(model: ModelSpec, taskType: TaskType, role: AgentRole): number {
  // Role-to-task affinity bonus
  const roleTaskMap: Record<AgentRole, TaskType[]> = {
    po: ['clarification'],
    planner: ['architecture', 'analysis'],
    dev: ['code', 'debug'],
    qa: ['analysis', 'debug'],
  };

  const primaryStrengths = roleTaskMap[role];
  const taskInStrengths = model.strengths.includes(taskType) ? 1 : 0;
  const roleAffinityBonus = primaryStrengths.some((t) => model.strengths.includes(t)) ? 0.2 : 0;

  return Math.min(1, taskInStrengths * 0.8 + roleAffinityBonus);
}

/** Returns 0–1: higher is better (inverse cost, normalised) */
function scoreCost(model: ModelSpec, allModels: ModelSpec[], penalty: number): number {
  const cost = (model.costPerInputToken + model.costPerOutputToken) * penalty;
  const maxCost =
    Math.max(...allModels.map((m) => m.costPerInputToken + m.costPerOutputToken)) * penalty;
  if (maxCost === 0) return 1;
  return 1 - cost / maxCost;
}

/** Returns 0–1: higher is better (inverse latency, normalised) */
function scoreLatency(model: ModelSpec, allModels: ModelSpec[], penalty: number): number {
  const latency = model.avgLatencyMs * penalty;
  const maxLatency = Math.max(...allModels.map((m) => m.avgLatencyMs)) * penalty;
  if (maxLatency === 0) return 1;
  return 1 - latency / maxLatency;
}

/** Returns 0–1: higher is better (larger context) */
function scoreContext(model: ModelSpec, allModels: ModelSpec[]): number {
  const maxCtx = Math.max(...allModels.map((m) => m.contextWindow));
  if (maxCtx === 0) return 1;
  return model.contextWindow / maxCtx;
}

// ─── Estimator ────────────────────────────────────────────────────────────────

const ESTIMATED_TOKENS_BY_COMPLEXITY: Record<ComplexityLevel, { input: number; output: number }> = {
  low: { input: 500, output: 300 },
  medium: { input: 1500, output: 800 },
  high: { input: 4000, output: 2000 },
};

function estimateCostUsd(model: ModelSpec, complexity: ComplexityLevel): number {
  const tokens = ESTIMATED_TOKENS_BY_COMPLEXITY[complexity];
  return tokens.input * model.costPerInputToken + tokens.output * model.costPerOutputToken;
}

// ─── Main recommender ─────────────────────────────────────────────────────────

export interface RecommendInput {
  role: AgentRole;
  taskType: TaskType;
  complexity: ComplexityLevel;
  preferences?: Partial<ScoringPreferences>;
  /**
   * When provided, only models whose provider is in this list are considered.
   * Pass the result of `listConfiguredProviders().map(p => p.name)` at call site.
   */
  allowedProviders?: ProviderName[];
}

export function recommend(input: RecommendInput): ModelRecommendation {
  const prefs: ScoringPreferences = {
    ...DEFAULT_PREFERENCES,
    ...input.preferences,
  };

  const { allowedProviders } = input;
  const candidates = allowedProviders
    ? MODEL_CATALOG.filter((m) => allowedProviders.includes(m.provider))
    : MODEL_CATALOG;

  // Fall back to full catalog if the allowed-providers filter leaves nothing
  const pool = candidates.length > 0 ? candidates : MODEL_CATALOG;

  const multipliers = COMPLEXITY_MULTIPLIERS[input.complexity];

  const scored = pool.map((model) => {
    const taskFit = scoreTaskFit(model, input.taskType, input.role);
    const cost = scoreCost(model, pool, multipliers.costPenalty);
    const latency = scoreLatency(model, pool, multipliers.latencyPenalty);
    const context = scoreContext(model, pool);

    const total =
      taskFit * prefs.taskFitWeight +
      cost * prefs.costWeight +
      latency * prefs.latencyWeight +
      context * prefs.contextWeight;

    return { model, total, taskFit, cost, latency, context };
  });

  scored.sort((a, b) => b.total - a.total);

  const top = scored[0];
  if (!top) {
    // Absolute fallback — should never happen
    const fallback = getDefaultModel(input.role);
    return {
      recommended: fallback,
      alternatives: [],
      reason: `Default model for role ${input.role}`,
      estimatedCostUsd: estimateCostUsd(fallback, input.complexity),
    };
  }

  const alternatives = scored.slice(1, 3).map((s) => s.model);

  const reason = buildReason(top.model, input, {
    taskFit: top.taskFit,
    cost: top.cost,
    latency: top.latency,
  });

  return {
    recommended: top.model,
    alternatives,
    reason,
    estimatedCostUsd: estimateCostUsd(top.model, input.complexity),
  };
}

function buildReason(
  model: ModelSpec,
  input: RecommendInput,
  scores: { taskFit: number; cost: number; latency: number },
): string {
  const parts: string[] = [];

  if (scores.taskFit >= 0.8) parts.push(`strong ${input.taskType} capability`);
  else if (scores.taskFit >= 0.5) parts.push(`adequate ${input.taskType} support`);

  if (input.complexity === 'high' && scores.taskFit >= 0.8) {
    parts.push('handles complex tasks well');
  }
  if (input.complexity === 'low' && scores.cost >= 0.8) {
    parts.push('cost-efficient for simple tasks');
  }
  if (scores.latency >= 0.8) parts.push('fast response times');

  return parts.length > 0
    ? `${model.displayName}: ${parts.join(', ')}`
    : `Best overall score for ${input.role} / ${input.taskType} at ${input.complexity} complexity`;
}
