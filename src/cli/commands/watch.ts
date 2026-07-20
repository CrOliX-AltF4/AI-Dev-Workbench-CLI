import { watch as fsWatch } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import * as orchestrator from '../../orchestrator/index.js';
import { buildDefaultSteps } from '../../pipeline/steps.js';
import type { PipelineEvent } from '../../types/events.js';
import type { PipelineStep } from '../../types/index.js';

interface WatchOptions {
  intent?: string;
  debounce?: number;
}

async function readIntentFile(filePath: string): Promise<string> {
  const content = await readFile(filePath, 'utf8');
  return content.trim();
}

export async function watchCommand(watchPath: string, options: WatchOptions): Promise<void> {
  const debounceMs = options.debounce ?? 500;
  const intentFile = options.intent ? resolve(options.intent) : null;

  let lastIntent: string | null = null;
  let debounceTimer: ReturnType<typeof setTimeout> | null = null;
  let isRunning = false;
  let abortCurrentRun = false;

  if (intentFile) {
    try {
      lastIntent = await readIntentFile(intentFile);
    } catch {
      process.stderr.write(`Error: cannot read intent file "${intentFile}"\n`);
      process.exit(1);
    }
  }

  if (!lastIntent) {
    if (!intentFile) {
      process.stderr.write('Error: provide --intent <file> to specify the pipeline intent.\n');
      process.exit(1);
    }
    process.stderr.write('Warning: intent file is empty — will retry on next change\n');
  }

  process.stderr.write(`lunira watch: watching "${watchPath}"\n`);
  if (intentFile) process.stderr.write(`  intent: ${intentFile}\n`);
  process.stderr.write('Ctrl+C to stop\n\n');

  const triggerRun = async () => {
    if (intentFile) {
      try {
        const fresh = await readIntentFile(intentFile);
        if (fresh) lastIntent = fresh;
      } catch {
        process.stderr.write('Warning: could not re-read intent file\n');
      }
    }

    if (!lastIntent) {
      process.stderr.write('[watch] No intent — skipping run\n');
      return;
    }

    if (isRunning) {
      abortCurrentRun = true;
      process.stderr.write('[watch] Change detected during run — will restart after current run\n');
      return;
    }

    isRunning = true;
    abortCurrentRun = false;
    const steps = buildDefaultSteps(new Set());
    const runStart = Date.now();
    const currentIntent = lastIntent;

    process.stderr.write(`[watch] Running: "${currentIntent}"\n`);

    const onUpdate = (step: PipelineStep): void => {
      if (step.status === 'running') {
        process.stderr.write(`  → ${step.role} running...\n`);
      }
    };

    const onEvent = (event: PipelineEvent): void => {
      process.stdout.write(JSON.stringify(event) + '\n');
    };

    try {
      const run = await orchestrator.run(
        currentIntent,
        steps,
        onUpdate,
        undefined,
        undefined,
        onEvent,
      );
      const durationS = ((Date.now() - runStart) / 1000).toFixed(1);
      let verdict = run.status === 'failed' ? 'FAILED' : 'NO QA';
      const qaStep = run.steps.find((s) => s.role === 'qa' && s.status === 'completed');
      if (qaStep?.output) {
        try {
          const qa = JSON.parse(qaStep.output) as { verdict: string };
          verdict = qa.verdict.toUpperCase();
        } catch {
          /* ignore */
        }
      }
      process.stderr.write(
        `[watch] Done — ${verdict} · $${run.totalCostUsd.toFixed(4)} · ${durationS}s\n`,
      );
    } catch (err) {
      process.stderr.write(`[watch] Run error: ${String(err)}\n`);
    } finally {
      isRunning = false;
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      if (abortCurrentRun) {
        abortCurrentRun = false;
        process.stderr.write('[watch] Restarting due to change during run...\n');
        void triggerRun();
      } else {
        process.stderr.write('[watch] Watching for changes...\n\n');
      }
    }
  };

  const onChange = () => {
    if (debounceTimer) clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      void triggerRun();
    }, debounceMs);
  };

  // Initial run on startup
  await triggerRun();

  const watcher = fsWatch(watchPath, { recursive: true }, (_event, _filename) => {
    onChange();
  });

  process.on('SIGINT', () => {
    process.stderr.write('\n[watch] Stopping...\n');
    watcher.close();
    if (debounceTimer) clearTimeout(debounceTimer);
    process.exit(0);
  });

  // Keep process alive (awaiting a promise that never resolves, until SIGINT)

  await new Promise<void>(() => {});
}
