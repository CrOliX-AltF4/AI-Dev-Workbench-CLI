import { describe, it, expect } from 'vitest';
import { ciYml, luniraConfig, readmeMd } from '../../src/init/templates/core.js';
import { buildGuidance } from '../../src/init/scaffolder.js';

describe('ciYml', () => {
  it('targets master branch, not main or dev', () => {
    const yml = ciYml();
    expect(yml).toContain('branches: [master]');
    expect(yml).not.toContain('branches: [main, dev]');
  });
});

describe('luniraConfig', () => {
  it('returns valid JSON with skills and plugins sections', () => {
    const raw = luniraConfig();
    const parsed = JSON.parse(raw) as unknown;
    expect(parsed).toMatchObject({
      skills: expect.any(Object) as unknown,
      plugins: expect.any(Object) as unknown,
    });
  });

  it('pre-enables typescript-strict and conventional-commits skills', () => {
    const parsed = JSON.parse(luniraConfig()) as { skills: { all: string[] } };
    expect(parsed.skills.all).toContain('typescript-strict');
    expect(parsed.skills.all).toContain('conventional-commits');
  });
});

describe('readmeMd', () => {
  it('includes the project name in the title', () => {
    const readme = readmeMd('my-project', 'cli');
    expect(readme).toContain('# my-project');
  });

  it('includes lunira run usage', () => {
    const readme = readmeMd('my-project', 'cli');
    expect(readme).toContain('lunira run');
  });
});

describe('buildGuidance', () => {
  it('includes cd command with project name', () => {
    const msg = buildGuidance('my-proj', 'cli');
    expect(msg).toContain('cd my-proj');
  });

  it('mentions lunira setup', () => {
    const msg = buildGuidance('my-proj', 'cli');
    expect(msg).toContain('lunira setup');
  });

  it('mentions lunira run', () => {
    const msg = buildGuidance('my-proj', 'cli');
    expect(msg).toContain('lunira run');
  });
});
