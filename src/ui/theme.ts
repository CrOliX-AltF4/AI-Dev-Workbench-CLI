import type { PipelineStepStatus, ProviderName, AgentRole } from '../types/index.js';

export type CompanionState = 'idle' | 'thinking' | 'forging' | 'error' | 'done';

// ─── Brand ────────────────────────────────────────────────────────────────────

export const BRAND_COLOR = 'yellow' as const; // Ink named color (used as prop)
export const GOLD = '#C8A415' as const; // amber/gold — active, focus
export const COPPER = '#B87333' as const; // copper/ember — borders, structure
export const BRAND_NAME = "Lun'Ira" as const;
export const BRAND_TAGLINE = 'intent → code' as const;

// ─── Spinner ──────────────────────────────────────────────────────────────────

export const SPINNER_FRAMES = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'] as const;
export const SPINNER_INTERVAL_MS = 80;

// ─── Status icons ─────────────────────────────────────────────────────────────

export const STATUS_ICONS: Record<PipelineStepStatus, string> = {
  pending: '○',
  running: '◆',
  completed: '✓',
  failed: '✗',
  skipped: '–',
};

// ─── Status colors ────────────────────────────────────────────────────────────

export const STATUS_COLORS: Record<PipelineStepStatus, string> = {
  pending: 'gray',
  running: 'yellow',
  completed: 'green',
  failed: 'red',
  skipped: 'gray',
};

// ─── Provider colors ──────────────────────────────────────────────────────────

export const PROVIDER_COLORS: Record<ProviderName, string> = {
  openrouter: 'white',
  groq: 'cyan',
  gemini: 'blue',
  claude: 'magenta',
  openai: 'green',
  nim: 'yellow',
  ollama: 'gray',
};

// ─── Role labels ──────────────────────────────────────────────────────────────

export const ROLE_LABELS: Record<AgentRole, string> = {
  po: 'PO     ',
  planner: 'Planner',
  dev: 'Dev    ',
  qa: 'QA     ',
};

export const ROLE_TASK_LABELS: Record<AgentRole, string> = {
  po: 'Clarification',
  planner: 'Architecture',
  dev: 'Code generation',
  qa: 'Validation',
};

// ─── Agent class labels ───────────────────────────────────────────────────────

export const AGENT_CLASS_LABELS: Record<AgentRole, string> = {
  po: 'Requirements Clerk',
  planner: 'Architect Mage',
  dev: 'Code Forger',
  qa: 'Quality Paladin',
};

export const AGENT_CLASS_SHORT: Record<AgentRole, string> = {
  po: 'Clerk    ',
  planner: 'Mage     ',
  dev: 'Forger   ',
  qa: 'Paladin  ',
};

// ─── Flavor text ──────────────────────────────────────────────────────────────

export const AGENT_FLAVOR_TEXT: Record<AgentRole, readonly string[]> = {
  po: [
    '"The requester\'s will has been clarified."',
    '"Requirements carved in stone."',
    '"The scroll is sealed."',
  ],
  planner: [
    '"The plan takes shape in the mist."',
    '"Strategy revealed."',
    '"Seven paths lead to the dungeon."',
  ],
  dev: [
    '"The hammer strikes the anvil one last time."',
    '"The artifacts take life."',
    '"The forge settles."',
  ],
  qa: ['"Quality verified."', '"The paladin renders its verdict."', '"The artifact is pure."'],
};

// ─── Oracle messages ──────────────────────────────────────────────────────────

export const ORACLE_MESSAGES: readonly string[] = [
  '"A patient blacksmith forges twice."',
  '"The right incantation is worth a thousand lines of code."',
  '"A cold forge fears no storm."',
  '"Master your tools, master the dungeon."',
  '"A well-written scroll spares a hundred battles."',
  '"The architect who doubts builds on sand."',
  '"Untested code is an unsharpened blade."',
];

// ─── File rarity ──────────────────────────────────────────────────────────────

export type FileRarity = 'legendary' | 'rare' | 'uncommon' | 'common';

export function getFileRarity(lineCount: number): FileRarity {
  if (lineCount >= 200) return 'legendary';
  if (lineCount >= 100) return 'rare';
  if (lineCount >= 50) return 'uncommon';
  return 'common';
}

export const RARITY_LABELS: Record<FileRarity, string> = {
  legendary: '[LEGENDARY ]',
  rare: '[RARE      ]',
  uncommon: '[UNCOMMON  ]',
  common: '[COMMON    ]',
};

export const RARITY_COLORS: Record<FileRarity, string> = {
  legendary: GOLD,
  rare: 'magenta',
  uncommon: 'green',
  common: 'gray',
};

// ─── Forgeron level ───────────────────────────────────────────────────────────

export function forgeronLevel(runCount: number): number {
  return Math.floor(runCount / 3) + 1;
}
