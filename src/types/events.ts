import type { AgentRole, PipelineRun } from './index.js';
import type { QAIssue } from '../agents/types.js';

export type PipelineEvent =
  | { type: 'step_started'; stepId: string; role: AgentRole; provider: string; modelId: string }
  | {
      type: 'step_completed';
      stepId: string;
      role: AgentRole;
      costUsd: number;
      tokensUsed: number;
      durationMs: number;
    }
  | { type: 'step_failed'; stepId: string; role: AgentRole; error: string }
  | { type: 'step_skipped'; stepId: string; role: AgentRole }
  | { type: 'plugin_called'; stepId: string; pluginId: string; callCount: number }
  | { type: 'provider_switched'; stepId: string; from: string; to: string }
  | {
      type: 'iteration_started';
      iteration: number;
      maxIterations: number;
      issues: QAIssue[];
    }
  | { type: 'run_completed'; run: PipelineRun }
  | { type: 'budget_warning'; percentUsed: number; spentUsd: number; limitUsd: number }
  | {
      type: 'plan_review_required';
      planSummary: {
        architecture: string;
        tasks: number;
        estimatedFiles: string[];
        risks: string[];
      };
    };
