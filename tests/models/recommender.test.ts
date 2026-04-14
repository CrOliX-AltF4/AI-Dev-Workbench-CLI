import { describe, it, expect } from 'vitest';
import { recommend } from '../../src/models/recommender.js';
import type { RecommendInput } from '../../src/models/recommender.js';

describe('recommend()', () => {
  it('returns a recommendation with the expected shape', () => {
    const input: RecommendInput = {
      role: 'dev',
      taskType: 'code',
      complexity: 'medium',
    };
    const result = recommend(input);

    expect(result.recommended).toBeDefined();
    expect(result.recommended.id).toBeTypeOf('string');
    expect(result.alternatives).toBeInstanceOf(Array);
    expect(result.reason).toBeTypeOf('string');
    expect(result.estimatedCostUsd).toBeGreaterThanOrEqual(0);
  });

  it('prefers a model with code strength for dev/code role', () => {
    const result = recommend({ role: 'dev', taskType: 'code', complexity: 'high' });
    expect(result.recommended.strengths).toContain('code');
  });

  it('prefers cheaper models at low complexity', () => {
    const lowResult = recommend({ role: 'qa', taskType: 'analysis', complexity: 'low' });
    const highResult = recommend({ role: 'qa', taskType: 'analysis', complexity: 'high' });

    // Low complexity should not pick the most expensive model
    const expensiveIds = ['claude-opus-4-6'];
    expect(expensiveIds).not.toContain(lowResult.recommended.id);

    // High complexity may pick a more powerful (potentially pricier) model
    expect(highResult.recommended).toBeDefined();
  });

  it('returns up to 2 alternatives', () => {
    const result = recommend({ role: 'planner', taskType: 'architecture', complexity: 'medium' });
    expect(result.alternatives.length).toBeLessThanOrEqual(2);
  });

  it('respects custom scoring preferences', () => {
    // Maximize latency weight — should favour Groq (fastest)
    const result = recommend({
      role: 'po',
      taskType: 'clarification',
      complexity: 'low',
      preferences: { latencyWeight: 0.9, costWeight: 0.05, taskFitWeight: 0.05, contextWeight: 0 },
    });
    expect(result.recommended.provider).toBe('groq');
  });

  it('falls back to full catalog when allowedProviders yields no candidates', () => {
    // Empty allowedProviders list — should fall back and still return a result
    const result = recommend({
      role: 'dev',
      taskType: 'code',
      complexity: 'high',
      allowedProviders: [],
    });
    expect(result.recommended).toBeDefined();
  });

  it('estimated cost scales with complexity', () => {
    const base: Omit<RecommendInput, 'complexity'> = { role: 'dev', taskType: 'code' };
    const low = recommend({ ...base, complexity: 'low' });
    const high = recommend({ ...base, complexity: 'high' });

    // Same model — high complexity should cost more
    if (low.recommended.id === high.recommended.id) {
      expect(high.estimatedCostUsd).toBeGreaterThan(low.estimatedCostUsd);
    }
  });
});
