import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { LLMProvider } from '../../src/providers/types.js';
import type { PipelineStep } from '../../src/types/index.js';
import type {
  AgentResult,
  POOutput,
  PlannerOutput,
  DevOutput,
  QAOutput,
} from '../../src/agents/types.js';

// ─── Mocks ────────────────────────────────────────────────────────────────────

vi.mock('../../src/providers/registry.js');
vi.mock('../../src/agents/index.js');

const { getProvider } = await import('../../src/providers/registry.js');
const { runPOAgent, runPlannerAgent, runDevAgent, runQAAgent } =
  await import('../../src/agents/index.js');
const { runPipeline } = await import('../../src/pipeline/runner.js');

const mockGetProvider = vi.mocked(getProvider);
const mockRunPOAgent = vi.mocked(runPOAgent);
const mockRunPlannerAgent = vi.mocked(runPlannerAgent);
const mockRunDevAgent = vi.mocked(runDevAgent);
const mockRunQAAgent = vi.mocked(runQAAgent);

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeProvider(configured = true): LLMProvider {
  return {
    name: 'groq',
    isConfigured: () => configured,
    complete: vi.fn(),
  };
}

const BASE_META = {
  role: 'po' as const,
  modelId: 'llama-3.3-70b-versatile',
  provider: 'groq' as const,
  inputTokens: 100,
  outputTokens: 50,
  cacheReadTokens: 0,
  cacheCreationTokens: 0,
  costUsd: 0.0001,
  durationMs: 200,
};

const PO_RESULT: AgentResult<POOutput> = {
  output: {
    clarifiedGoal: 'Build a CLI',
    requirements: ['req1'],
    constraints: [],
    acceptanceCriteria: ['ac1'],
    complexity: 'medium',
    assumptions: [],
  },
  meta: { ...BASE_META, role: 'po' },
};

const PLANNER_RESULT: AgentResult<PlannerOutput> = {
  output: {
    architecture: 'Simple CLI',
    techStack: ['Node.js'],
    tasks: [{ id: 't1', description: 'init', dependsOn: [] }],
    estimatedFiles: ['src/index.ts'],
    risks: [],
  },
  meta: { ...BASE_META, role: 'planner' },
};

const DEV_RESULT: AgentResult<DevOutput> = {
  output: {
    files: [{ path: 'src/index.ts', content: 'console.log("hi")', description: 'entry' }],
    entryPoints: ['src/index.ts'],
    implementationNotes: [],
  },
  meta: { ...BASE_META, role: 'dev' },
};

const QA_RESULT: AgentResult<QAOutput> = {
  output: {
    verdict: 'pass',
    score: 95,
    issues: [],
    suggestions: [],
    requirementsCoverage: { req1: true },
  },
  meta: { ...BASE_META, role: 'qa' },
};

const STEPS: PipelineStep[] = [
  {
    id: 'po',
    role: 'po',
    taskType: 'clarification',
    status: 'pending',
    modelId: 'llama-3.3-70b-versatile',
    provider: 'groq',
  },
  {
    id: 'planner',
    role: 'planner',
    taskType: 'architecture',
    status: 'pending',
    modelId: 'gemini-2.0-flash',
    provider: 'gemini',
  },
  {
    id: 'dev',
    role: 'dev',
    taskType: 'code',
    status: 'pending',
    modelId: 'claude-sonnet-4-5',
    provider: 'claude',
  },
  {
    id: 'qa',
    role: 'qa',
    taskType: 'analysis',
    status: 'pending',
    modelId: 'llama-3.3-70b-versatile',
    provider: 'groq',
  },
];

// ─── Setup ────────────────────────────────────────────────────────────────────

beforeEach(() => {
  vi.clearAllMocks();
  mockGetProvider.mockReturnValue(makeProvider(true));
  mockRunPOAgent.mockResolvedValue(PO_RESULT);
  mockRunPlannerAgent.mockResolvedValue(PLANNER_RESULT);
  mockRunDevAgent.mockResolvedValue(DEV_RESULT);
  mockRunQAAgent.mockResolvedValue(QA_RESULT);
});

// ─── Happy path ───────────────────────────────────────────────────────────────

describe('runPipeline() — happy path', () => {
  it('returns a completed run with all steps completed', async () => {
    const run = await runPipeline('Build a CLI', STEPS);
    expect(run.status).toBe('completed');
    expect(run.steps.every((s) => s.status === 'completed')).toBe(true);
  });

  it('assigns a uuid id and createdAt to the run', async () => {
    const run = await runPipeline('Build a CLI', STEPS);
    expect(run.id).toMatch(/^[0-9a-f-]{36}$/);
    expect(run.createdAt).toBeTruthy();
  });

  it('aggregates totalCostUsd, totalTokens, totalDurationMs', async () => {
    const run = await runPipeline('Build a CLI', STEPS);
    expect(run.totalCostUsd).toBeCloseTo(4 * 0.0001, 8);
    expect(run.totalTokens).toBe(4 * 150); // 100 in + 50 out per step
    expect(run.totalDurationMs).toBeGreaterThanOrEqual(0);
  });

  it('stores serialised JSON output on each step', async () => {
    const run = await runPipeline('Build a CLI', STEPS);
    const poStep = run.steps.find((s) => s.role === 'po');
    expect(JSON.parse(poStep?.output ?? '')).toEqual(PO_RESULT.output);
  });

  it('calls onUpdate for running then completed on each step', async () => {
    const updates: Array<{ role: string; status: string }> = [];
    await runPipeline('Build a CLI', STEPS, (s) =>
      updates.push({ role: s.role, status: s.status }),
    );
    // 2 events per step (running + completed) × 4 steps
    expect(updates.length).toBe(8);
    expect(updates.filter((u) => u.status === 'running').length).toBe(4);
    expect(updates.filter((u) => u.status === 'completed').length).toBe(4);
  });
});

// ─── Provider not configured ──────────────────────────────────────────────────

describe('runPipeline() — provider not configured', () => {
  it('marks the step as failed and skips remaining steps', async () => {
    mockGetProvider.mockReturnValueOnce(makeProvider(false)); // PO provider fails
    const run = await runPipeline('Build a CLI', STEPS);

    expect(run.status).toBe('failed');
    expect(run.steps[0]?.status).toBe('failed');
    expect(run.steps[0]?.error).toContain('not configured');
    expect(run.steps.slice(1).every((s) => s.status === 'skipped')).toBe(true);
  });
});

// ─── Agent error ──────────────────────────────────────────────────────────────

describe('runPipeline() — agent throws', () => {
  it('marks the failing step and skips subsequent steps', async () => {
    mockRunPlannerAgent.mockRejectedValueOnce(new Error('LLM timeout'));
    const run = await runPipeline('Build a CLI', STEPS);

    expect(run.status).toBe('failed');
    expect(run.steps[0]?.status).toBe('completed'); // PO succeeded
    expect(run.steps[1]?.status).toBe('failed');
    expect(run.steps[1]?.error).toContain('LLM timeout');
    expect(run.steps[2]?.status).toBe('skipped');
    expect(run.steps[3]?.status).toBe('skipped');
  });

  it('still aggregates metrics from completed steps on failure', async () => {
    mockRunPlannerAgent.mockRejectedValueOnce(new Error('timeout'));
    const run = await runPipeline('Build a CLI', STEPS);

    // Only PO completed — one step worth of cost/tokens
    expect(run.totalCostUsd).toBeCloseTo(0.0001, 8);
    expect(run.totalTokens).toBe(150);
  });
});
