import { runPipeline } from '../pipeline/index.js';
import type { PipelinePreload, PipelineOverride } from '../pipeline/index.js';
import { saveRun } from '../storage/index.js';
import { saveRecovery } from '../storage/recovery.js';
import type { PipelineRun, PipelineStep } from '../types/index.js';
import type { PipelineEvent } from '../types/events.js';
import type { POOutput } from '../agents/types.js';

// ─── Orchestrator ─────────────────────────────────────────────────────────────
// Public façade over the pipeline runner.
// This is the stable entry point for consumers (TUI, CLI, future API).

export async function run(
  intent: string,
  steps: PipelineStep[],
  onUpdate?: (step: PipelineStep) => void,
  preload?: PipelinePreload,
  override?: PipelineOverride,
  onEvent?: (event: PipelineEvent) => void,
  signal?: AbortSignal,
): Promise<PipelineRun> {
  const result = await runPipeline(intent, steps, onUpdate, preload, override, onEvent, signal);

  if (result.status === 'failed') {
    const poStep = result.steps.find((s) => s.role === 'po' && s.status === 'completed');
    const failedStep = result.steps.find((s) => s.status === 'failed');
    if (poStep?.output && failedStep?.role !== 'po') {
      try {
        const po = JSON.parse(poStep.output) as POOutput;
        const recoveryPath = await saveRecovery(po, intent);
        onEvent?.({
          type: 'step_failed',
          stepId: failedStep?.id ?? 'unknown',
          role: failedStep?.role ?? 'dev',
          error: `${failedStep?.error ?? 'unknown error'}\n\nPartial progress saved. Resume with:\n  lunira run --from-po "${recoveryPath}"`,
        });
      } catch {
        // best-effort — don't mask the original failure
      }
    }
  }

  // Persist regardless of success/failure so history shows failed runs too
  await saveRun(result);
  return result;
}
