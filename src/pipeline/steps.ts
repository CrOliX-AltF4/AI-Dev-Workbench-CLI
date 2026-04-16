import { getDefaultModel } from '../models/catalog.js';
import type { AgentRole, PipelineStep, TaskType } from '../types/index.js';

// ─── Agent sequence ───────────────────────────────────────────────────────────

const AGENT_SEQUENCE: Array<{ role: AgentRole; taskType: TaskType }> = [
  { role: 'po', taskType: 'clarification' },
  { role: 'planner', taskType: 'architecture' },
  { role: 'dev', taskType: 'code' },
  { role: 'qa', taskType: 'analysis' },
];

/**
 * Builds the default pipeline steps using the catalog's recommended model per role.
 * Used by both the TUI (PipelineScreen) and the headless CLI runner.
 */
export function buildDefaultSteps(): PipelineStep[] {
  return AGENT_SEQUENCE.map(({ role, taskType }) => {
    const model = getDefaultModel(role);
    return {
      id: role,
      role,
      taskType,
      status: 'pending',
      modelId: model.id,
      provider: model.provider,
    };
  });
}
