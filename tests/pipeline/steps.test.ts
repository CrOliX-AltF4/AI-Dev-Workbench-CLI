import { describe, it, expect } from 'vitest';
import { buildDefaultSteps, parseSkipRoles } from '../../src/pipeline/steps.js';

// ─── buildDefaultSteps ────────────────────────────────────────────────────────

describe('buildDefaultSteps()', () => {
  it('returns 4 steps in order: po → planner → dev → qa', () => {
    const steps = buildDefaultSteps();
    expect(steps.map((s) => s.role)).toEqual(['po', 'planner', 'dev', 'qa']);
  });

  it('all steps are pending when no skipRoles provided', () => {
    const steps = buildDefaultSteps();
    expect(steps.every((s) => s.status === 'pending')).toBe(true);
  });

  it('marks matching roles as skipped', () => {
    const steps = buildDefaultSteps(new Set(['po', 'qa']));
    expect(steps.find((s) => s.role === 'po')?.status).toBe('skipped');
    expect(steps.find((s) => s.role === 'qa')?.status).toBe('skipped');
    expect(steps.find((s) => s.role === 'planner')?.status).toBe('pending');
    expect(steps.find((s) => s.role === 'dev')?.status).toBe('pending');
  });

  it('assigns modelId and provider from catalog defaults', () => {
    const steps = buildDefaultSteps();
    steps.forEach((s) => {
      expect(s.modelId).toBeTruthy();
      expect(s.provider).toBeTruthy();
    });
  });
});

// ─── parseSkipRoles ───────────────────────────────────────────────────────────

describe('parseSkipRoles()', () => {
  it('parses a single role', () => {
    const result = parseSkipRoles('qa');
    expect(result).toEqual(new Set(['qa']));
  });

  it('parses comma-separated roles', () => {
    const result = parseSkipRoles('po,qa');
    expect(result).toEqual(new Set(['po', 'qa']));
  });

  it('trims whitespace around tokens', () => {
    const result = parseSkipRoles(' po , qa ');
    expect(result).toEqual(new Set(['po', 'qa']));
  });

  it('is case-insensitive', () => {
    const result = parseSkipRoles('PO,QA');
    expect(result).toEqual(new Set(['po', 'qa']));
  });

  it('throws on an invalid role name', () => {
    expect(() => parseSkipRoles('po,unknown')).toThrow(/Invalid role/);
    expect(() => parseSkipRoles('unknown')).toThrow(/"unknown"/);
  });

  it('includes all valid role names in the error message', () => {
    expect(() => parseSkipRoles('bad')).toThrow(/po, planner, dev, qa/);
  });
});
