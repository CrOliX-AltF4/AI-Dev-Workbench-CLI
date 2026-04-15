import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PipelineRun } from '../../src/types/index.js';
import type { QAOutput } from '../../src/agents/types.js';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../../src/storage/index.js');

const { listRuns } = await import('../../src/storage/index.js');
const { historyCommand } = await import('../../src/cli/commands/history.js');

const mockListRuns = vi.mocked(listRuns);

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const QA_PASS: QAOutput = {
  verdict: 'pass',
  score: 95,
  issues: [],
  suggestions: [],
  requirementsCoverage: {},
};

const QA_FAIL: QAOutput = {
  verdict: 'fail',
  score: 40,
  issues: [{ severity: 'critical', description: 'Missing auth', suggestion: 'Add auth' }],
  suggestions: [],
  requirementsCoverage: {},
};

function makeRun(overrides: Partial<PipelineRun> & { qa?: QAOutput }): PipelineRun {
  const { qa, ...rest } = overrides;
  return {
    id: 'run-1',
    createdAt: '2026-04-15T10:00:00.000Z',
    intent: 'Build a REST API',
    steps: qa
      ? [
          {
            id: 'qa',
            role: 'qa',
            taskType: 'analysis',
            status: 'completed',
            output: JSON.stringify(qa),
          },
        ]
      : [],
    totalCostUsd: 0.0123,
    totalTokens: 4500,
    totalDurationMs: 8000,
    status: 'completed',
    ...rest,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, 'log').mockImplementation(() => undefined);
});

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('historyCommand()', () => {
  it('prints a message when no runs exist', async () => {
    mockListRuns.mockResolvedValue([]);
    await historyCommand();
    expect(console.log).toHaveBeenCalledWith(expect.stringContaining('No pipeline runs'));
  });

  it('prints a table with headers when runs exist', async () => {
    mockListRuns.mockResolvedValue([makeRun({ qa: QA_PASS })]);
    await historyCommand();
    const output = vi
      .mocked(console.log)
      .mock.calls.map((c) => String(c[0]))
      .join('\n');
    expect(output).toContain('Date');
    expect(output).toContain('Verdict');
    expect(output).toContain('Intent');
    expect(output).toContain('Cost');
    expect(output).toContain('Tokens');
  });

  it('shows PASS verdict for a passing QA run', async () => {
    mockListRuns.mockResolvedValue([makeRun({ qa: QA_PASS })]);
    await historyCommand();
    const output = vi
      .mocked(console.log)
      .mock.calls.map((c) => String(c[0]))
      .join('\n');
    expect(output).toContain('PASS');
  });

  it('shows FAIL verdict for a failing QA run', async () => {
    mockListRuns.mockResolvedValue([makeRun({ qa: QA_FAIL })]);
    await historyCommand();
    const output = vi
      .mocked(console.log)
      .mock.calls.map((c) => String(c[0]))
      .join('\n');
    expect(output).toContain('FAIL');
  });

  it('shows FAILED for a run with failed status', async () => {
    mockListRuns.mockResolvedValue([makeRun({ status: 'failed', steps: [] })]);
    await historyCommand();
    const output = vi
      .mocked(console.log)
      .mock.calls.map((c) => String(c[0]))
      .join('\n');
    expect(output).toContain('FAILED');
  });

  it('truncates long intents to 45 chars', async () => {
    const longIntent =
      'Build a very complex microservices architecture with event sourcing and CQRS patterns';
    mockListRuns.mockResolvedValue([makeRun({ intent: longIntent, qa: QA_PASS })]);
    await historyCommand();
    const output = vi
      .mocked(console.log)
      .mock.calls.map((c) => String(c[0]))
      .join('\n');
    expect(output).toContain('…');
    expect(output).not.toContain(longIntent);
  });

  it('respects the limit parameter', async () => {
    const runs = Array.from({ length: 5 }, (_, i) =>
      makeRun({ id: `run-${String(i)}`, qa: QA_PASS }),
    );
    mockListRuns.mockResolvedValue(runs);
    await historyCommand(2);
    const output = vi
      .mocked(console.log)
      .mock.calls.map((c) => String(c[0]))
      .join('\n');
    expect(output).toContain('2 of 5 runs shown');
  });
});
