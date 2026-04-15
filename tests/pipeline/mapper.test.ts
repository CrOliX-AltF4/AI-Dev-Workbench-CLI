import { describe, it, expect } from 'vitest';
import { buildPlannerInput, buildDevInput, buildQAInput } from '../../src/pipeline/mapper.js';
import type { POOutput, PlannerOutput, DevOutput } from '../../src/agents/types.js';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

const po: POOutput = {
  clarifiedGoal: 'Build a REST API',
  requirements: ['req1', 'req2'],
  constraints: ['con1'],
  acceptanceCriteria: ['ac1', 'ac2'],
  complexity: 'medium',
  assumptions: ['assumption1'],
};

const planner: PlannerOutput = {
  architecture: 'Express server with controllers',
  techStack: ['Node.js', 'Express'],
  tasks: [{ id: 't1', description: 'Setup project', dependsOn: [] }],
  estimatedFiles: ['src/index.ts'],
  risks: ['risk1'],
};

const dev: DevOutput = {
  files: [{ path: 'src/index.ts', content: 'console.log("hi")', description: 'entry' }],
  entryPoints: ['src/index.ts'],
  implementationNotes: ['note1'],
};

// ─── buildPlannerInput ────────────────────────────────────────────────────────

describe('buildPlannerInput()', () => {
  it('maps clarifiedGoal, requirements, constraints, complexity from PO', () => {
    const input = buildPlannerInput(po);
    expect(input.clarifiedGoal).toBe(po.clarifiedGoal);
    expect(input.requirements).toEqual(po.requirements);
    expect(input.constraints).toEqual(po.constraints);
    expect(input.complexity).toBe(po.complexity);
  });

  it('does not include acceptanceCriteria or assumptions (selective context)', () => {
    const input = buildPlannerInput(po);
    expect(input).not.toHaveProperty('acceptanceCriteria');
    expect(input).not.toHaveProperty('assumptions');
  });
});

// ─── buildDevInput ────────────────────────────────────────────────────────────

describe('buildDevInput()', () => {
  it('takes clarifiedGoal from PO and architecture/techStack/tasks from Planner', () => {
    const input = buildDevInput(po, planner);
    expect(input.clarifiedGoal).toBe(po.clarifiedGoal);
    expect(input.architecture).toBe(planner.architecture);
    expect(input.techStack).toEqual(planner.techStack);
    expect(input.tasks).toEqual(planner.tasks);
  });

  it('does not include risks or estimatedFiles (Planner internals)', () => {
    const input = buildDevInput(po, planner);
    expect(input).not.toHaveProperty('risks');
    expect(input).not.toHaveProperty('estimatedFiles');
  });

  it('does not include PO acceptanceCriteria or constraints', () => {
    const input = buildDevInput(po, planner);
    expect(input).not.toHaveProperty('acceptanceCriteria');
    expect(input).not.toHaveProperty('constraints');
  });
});

// ─── buildQAInput ─────────────────────────────────────────────────────────────

describe('buildQAInput()', () => {
  it('takes requirements and acceptanceCriteria from PO', () => {
    const input = buildQAInput(po, dev);
    expect(input.requirements).toEqual(po.requirements);
    expect(input.acceptanceCriteria).toEqual(po.acceptanceCriteria);
  });

  it('takes files and entryPoints from Dev', () => {
    const input = buildQAInput(po, dev);
    expect(input.files).toEqual(dev.files);
    expect(input.entryPoints).toEqual(dev.entryPoints);
  });

  it('does not forward PO clarifiedGoal or Dev implementationNotes', () => {
    const input = buildQAInput(po, dev);
    expect(input).not.toHaveProperty('clarifiedGoal');
    expect(input).not.toHaveProperty('implementationNotes');
  });
});
