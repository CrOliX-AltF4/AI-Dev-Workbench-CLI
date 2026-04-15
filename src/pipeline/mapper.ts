import type {
  POOutput,
  PlannerOutput,
  DevOutput,
  PlannerInput,
  DevInput,
  QAInput,
} from '../agents/types.js';

// ─── Context mappers ──────────────────────────────────────────────────────────
// Each mapper selects only the fields the next agent needs.
// This is the primary token-reduction mechanism: no agent ever receives the
// full upstream history, only its typed slice.

export function buildPlannerInput(po: POOutput): PlannerInput {
  return {
    clarifiedGoal: po.clarifiedGoal,
    requirements: po.requirements,
    constraints: po.constraints,
    complexity: po.complexity,
  };
}

export function buildDevInput(po: POOutput, planner: PlannerOutput): DevInput {
  return {
    clarifiedGoal: po.clarifiedGoal,
    architecture: planner.architecture,
    techStack: planner.techStack,
    tasks: planner.tasks,
  };
}

/** QA draws from both PO (requirements) and Dev (code). */
export function buildQAInput(po: POOutput, dev: DevOutput): QAInput {
  return {
    requirements: po.requirements,
    acceptanceCriteria: po.acceptanceCriteria,
    files: dev.files,
    entryPoints: dev.entryPoints,
  };
}
