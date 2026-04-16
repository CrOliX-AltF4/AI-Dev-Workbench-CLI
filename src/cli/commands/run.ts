import { render } from 'ink';
import React from 'react';
import { App } from '../../ui/App.js';
import { buildDefaultSteps } from '../../pipeline/steps.js';
import * as orchestrator from '../../orchestrator/index.js';
import type { PipelineStep } from '../../types/index.js';

// ─── Shared role labels for progress output ───────────────────────────────────

const ROLE_LABELS: Record<string, string> = {
  po: 'Product Owner',
  planner: 'Planner',
  dev: 'Developer',
  qa: 'QA Engineer',
};

// ─── Command options ──────────────────────────────────────────────────────────

interface RunOptions {
  intent?: string;
  json?: boolean;
}

// ─── TUI mode ─────────────────────────────────────────────────────────────────

async function tuiRun(intent?: string): Promise<void> {
  const props = intent ? { initialIntent: intent } : {};
  const { waitUntilExit } = render(React.createElement(App, props));
  await waitUntilExit();
}

// ─── Headless mode ────────────────────────────────────────────────────────────

/**
 * Runs the pipeline without a TUI.
 * Progress is written to stderr so stdout stays clean for JSON consumers.
 * Final PipelineRun JSON is written to stdout on completion.
 * Exits with code 1 if the pipeline fails.
 */
async function headlessRun(intent: string): Promise<void> {
  const steps = buildDefaultSteps();
  const total = steps.length;

  process.stderr.write(`aiwb — running pipeline: "${intent}"\n\n`);

  const onUpdate = (step: PipelineStep): void => {
    const idx = steps.findIndex((s) => s.id === step.id) + 1;
    const label = ROLE_LABELS[step.role] ?? step.role;

    if (step.status === 'running') {
      process.stderr.write(`[${String(idx)}/${String(total)}] ${label} · running...\n`);
    } else if (step.status === 'completed') {
      const dur = step.durationMs !== undefined ? ` · ${(step.durationMs / 1000).toFixed(1)}s` : '';
      const tok = step.tokensUsed !== undefined ? ` · ${step.tokensUsed.toLocaleString()} tok` : '';
      process.stderr.write(`[${String(idx)}/${String(total)}] ${label} · done${dur}${tok}\n`);
    } else if (step.status === 'failed') {
      process.stderr.write(
        `[${String(idx)}/${String(total)}] ${label} · FAILED: ${step.error ?? 'unknown error'}\n`,
      );
    } else if (step.status === 'skipped') {
      process.stderr.write(`[${String(idx)}/${String(total)}] ${label} · skipped\n`);
    }
  };

  const run = await orchestrator.run(intent, steps, onUpdate);

  process.stderr.write(
    `\nDone — status: ${run.status} · $${run.totalCostUsd.toFixed(4)} · ${run.totalTokens.toLocaleString()} tok · ${(run.totalDurationMs / 1000).toFixed(1)}s\n`,
  );

  process.stdout.write(JSON.stringify(run, null, 2) + '\n');

  if (run.status === 'failed') {
    process.exit(1);
  }
}

// ─── Entry point ──────────────────────────────────────────────────────────────

export async function runCommand(options: RunOptions): Promise<void> {
  if (options.json) {
    if (!options.intent) {
      process.stderr.write(
        'Error: --json requires an intent argument. Example: aiwb run "build a REST API" --json\n',
      );
      process.exit(1);
    }
    await headlessRun(options.intent);
    return;
  }
  await tuiRun(options.intent);
}
