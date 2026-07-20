import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PipelineStep, PipelineRun } from '../../src/types/index.js';
import type { PipelineEvent } from '../../src/types/events.js';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../../src/pipeline/index.js');
vi.mock('../../src/storage/recovery.js');

const { runPipeline } = await import('../../src/pipeline/index.js');
const { saveRecovery } = await import('../../src/storage/recovery.js');
const { run } = await import('../../src/orchestrator/index.js');

const mockRunPipeline = vi.mocked(runPipeline);
const mockSaveRecovery = vi.mocked(saveRecovery);

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const STEPS: PipelineStep[] = [
  {
    id: 'po',
    role: 'po',
    taskType: 'clarification',
    status: 'pending',
    provider: 'groq',
    modelId: 'llama-3.3-70b-versatile',
  },
];

const COMPLETED_RUN: PipelineRun = {
  id: 'run-1',
  createdAt: '2026-01-01T00:00:00.000Z',
  intent: 'Build a CLI',
  steps: STEPS.map((s) => ({ ...s, status: 'completed' })),
  totalCostUsd: 0.0001,
  totalTokens: 150,
  totalDurationMs: 300,
  status: 'completed',
};

const PO_OUTPUT = {
  clarifiedGoal: 'Build a CLI',
  requirements: ['req-1'],
  constraints: [],
  acceptanceCriteria: [],
  complexity: 'medium',
  assumptions: [],
};

function failedRun(steps: PipelineStep[]): PipelineRun {
  return {
    id: 'run-2',
    createdAt: '2026-01-01T00:00:00.000Z',
    intent: 'Build a CLI',
    steps,
    totalCostUsd: 0.0001,
    totalTokens: 150,
    totalDurationMs: 300,
    status: 'failed',
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockRunPipeline.mockResolvedValue(COMPLETED_RUN);
  mockSaveRecovery.mockResolvedValue('/home/user/.lunira/recovery/2026-01-01.json');
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('orchestrator.run()', () => {
  it('delegates to runPipeline and returns its result', async () => {
    const result = await run('Build a CLI', STEPS);
    expect(result).toEqual(COMPLETED_RUN);
    expect(mockRunPipeline).toHaveBeenCalledOnce();
  });

  it('forwards intent and steps to runPipeline', async () => {
    await run('Build a CLI', STEPS);
    expect(mockRunPipeline).toHaveBeenCalledWith(
      'Build a CLI',
      STEPS,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
    );
  });

  it('forwards the onUpdate callback to runPipeline', async () => {
    const onUpdate = vi.fn();
    await run('Build a CLI', STEPS, onUpdate);
    expect(mockRunPipeline).toHaveBeenCalledWith(
      'Build a CLI',
      STEPS,
      onUpdate,
      undefined,
      undefined,
      undefined,
      undefined,
    );
  });

  it('forwards the onEvent callback to runPipeline', async () => {
    const onEvent = vi.fn();
    await run('Build a CLI', STEPS, undefined, undefined, undefined, onEvent);
    expect(mockRunPipeline).toHaveBeenCalledWith(
      'Build a CLI',
      STEPS,
      undefined,
      undefined,
      undefined,
      onEvent,
      undefined,
    );
  });

  describe('when the run fails', () => {
    it('saves recovery and emits a step_failed event pointing at the recovery file when the po step completed', async () => {
      const steps: PipelineStep[] = [
        {
          id: 'po',
          role: 'po',
          taskType: 'clarification',
          status: 'completed',
          output: JSON.stringify(PO_OUTPUT),
        },
        { id: 'dev', role: 'dev', taskType: 'implementation', status: 'failed', error: 'boom' },
      ];
      mockRunPipeline.mockResolvedValue(failedRun(steps));
      const onEvent = vi.fn<(event: PipelineEvent) => void>();

      await run('Build a CLI', STEPS, undefined, undefined, undefined, onEvent);

      expect(mockSaveRecovery).toHaveBeenCalledWith(PO_OUTPUT, 'Build a CLI');
      expect(onEvent).toHaveBeenCalledTimes(1);
      const event = onEvent.mock.calls[0]?.[0];
      if (event?.type !== 'step_failed') throw new Error('expected a step_failed event');
      expect(event.stepId).toBe('dev');
      expect(event.role).toBe('dev');
      expect(event.error).toContain('/home/user/.lunira/recovery/2026-01-01.json');
    });

    it('does not attempt recovery when no po step completed', async () => {
      const steps: PipelineStep[] = [
        { id: 'po', role: 'po', taskType: 'clarification', status: 'failed', error: 'boom' },
      ];
      mockRunPipeline.mockResolvedValue(failedRun(steps));
      const onEvent = vi.fn();

      await run('Build a CLI', STEPS, undefined, undefined, undefined, onEvent);

      expect(mockSaveRecovery).not.toHaveBeenCalled();
      expect(onEvent).not.toHaveBeenCalled();
    });

    it('does not attempt recovery when the po step itself is the one that failed', async () => {
      const steps: PipelineStep[] = [
        {
          id: 'po',
          role: 'po',
          taskType: 'clarification',
          status: 'failed',
          output: JSON.stringify(PO_OUTPUT),
          error: 'boom',
        },
      ];
      mockRunPipeline.mockResolvedValue(failedRun(steps));

      await run('Build a CLI', steps);

      expect(mockSaveRecovery).not.toHaveBeenCalled();
    });

    it('swallows recovery errors without masking the original failure', async () => {
      const steps: PipelineStep[] = [
        {
          id: 'po',
          role: 'po',
          taskType: 'clarification',
          status: 'completed',
          output: 'not valid json',
        },
        { id: 'dev', role: 'dev', taskType: 'implementation', status: 'failed', error: 'boom' },
      ];
      mockRunPipeline.mockResolvedValue(failedRun(steps));
      const onEvent = vi.fn();

      const result = await run('Build a CLI', STEPS, undefined, undefined, undefined, onEvent);

      expect(mockSaveRecovery).not.toHaveBeenCalled();
      expect(onEvent).not.toHaveBeenCalled();
      expect(result.status).toBe('failed');
    });
  });
});
