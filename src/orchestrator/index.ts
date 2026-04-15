import { runPipeline } from '../pipeline/index.js';
import type { PipelineRun, PipelineStep } from '../types/index.js';

// ─── Orchestrator ─────────────────────────────────────────────────────────────
// Public façade over the pipeline runner.
// This is the stable entry point for consumers (TUI, CLI, future API).
// Storage and metrics hooks will be added here without touching callers.

export async function run(
  intent: string,
  steps: PipelineStep[],
  onUpdate?: (step: PipelineStep) => void,
): Promise<PipelineRun> {
  // TODO(storage): persist run before start
  const result = await runPipeline(intent, steps, onUpdate);
  // TODO(storage): save completed run
  // TODO(metrics): record run metrics
  return result;
}
