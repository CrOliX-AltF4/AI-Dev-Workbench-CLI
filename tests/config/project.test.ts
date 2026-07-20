import { describe, it, expect, vi } from 'vitest';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { loadProjectConfig, defaultConfig } from '../../src/config/project.js';

describe('loadProjectConfig', () => {
  it('returns defaultConfig when no lunira.config.json exists', async () => {
    const config = await loadProjectConfig('/nonexistent/path');
    expect(config).toEqual(defaultConfig);
  });

  it('merges partial config with defaults', async () => {
    const { mkdtemp, writeFile, rm } = await import('node:fs/promises');
    const { join } = await import('node:path');
    const { tmpdir } = await import('node:os');

    const dir = await mkdtemp(join(tmpdir(), 'lunatar-test-'));
    try {
      await writeFile(
        join(dir, 'lunira.config.json'),
        JSON.stringify({ skills: { dev: ['typescript-strict'] } }),
      );
      const config = await loadProjectConfig(dir);
      expect(config.skills.dev).toContain('typescript-strict');
      expect(config.plugins).toEqual(defaultConfig.plugins);
    } finally {
      await rm(dir, { recursive: true });
    }
  });

  it('returns defaultConfig on invalid JSON', async () => {
    const { mkdtemp, writeFile, rm } = await import('node:fs/promises');
    const { join } = await import('node:path');
    const { tmpdir } = await import('node:os');

    const dir = await mkdtemp(join(tmpdir(), 'lunatar-test-'));
    try {
      await writeFile(join(dir, 'lunira.config.json'), 'not json');
      const config = await loadProjectConfig(dir);
      expect(config).toEqual(defaultConfig);
    } finally {
      await rm(dir, { recursive: true });
    }
  });

  it('parses models field when provided', async () => {
    const { mkdtemp, writeFile, rm } = await import('node:fs/promises');
    const { join } = await import('node:path');
    const { tmpdir } = await import('node:os');

    const dir = await mkdtemp(join(tmpdir(), 'lunatar-test-'));
    try {
      await writeFile(
        join(dir, 'lunira.config.json'),
        JSON.stringify({ models: { dev: 'llama-3.3-70b-versatile' } }),
      );
      const config = await loadProjectConfig(dir);
      expect(config.models?.dev).toBe('llama-3.3-70b-versatile');
    } finally {
      await rm(dir, { recursive: true });
    }
  });

  it('returns defaultConfig when config is not a plain object', async () => {
    const { mkdtemp, writeFile, rm } = await import('node:fs/promises');
    const { join: joinAsync } = await import('node:path');
    const { tmpdir: tmpdirAsync } = await import('node:os');

    const dir = await mkdtemp(joinAsync(tmpdirAsync(), 'lunatar-test-'));
    try {
      await writeFile(joinAsync(dir, 'lunira.config.json'), '"a string"');
      const config = await loadProjectConfig(dir);
      expect(config).toEqual(defaultConfig);
    } finally {
      await rm(dir, { recursive: true });
    }
  });
});

// ─── Schema validation ────────────────────────────────────────────────────────

describe('loadProjectConfig — schema validation', () => {
  it('returns default config and writes to stderr on invalid JSON', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'lunatar-'));
    writeFileSync(join(dir, 'lunira.config.json'), 'not json');
    writeFileSync(join(dir, 'package.json'), '{}');
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    const config = await loadProjectConfig(dir);

    expect(config).toEqual(defaultConfig);
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('invalid JSON'));
    stderrSpy.mockRestore();
    rmSync(dir, { recursive: true });
  });

  it('returns default config and writes to stderr on schema violation', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'lunatar-'));
    writeFileSync(join(dir, 'lunira.config.json'), JSON.stringify({ skills: 'not-an-object' }));
    writeFileSync(join(dir, 'package.json'), '{}');
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    const config = await loadProjectConfig(dir);

    expect(config).toEqual(defaultConfig);
    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('invalid config'));
    stderrSpy.mockRestore();
    rmSync(dir, { recursive: true });
  });
});

// ─── Upward lookup ────────────────────────────────────────────────────────────

describe('loadProjectConfig — upward lookup', () => {
  it('finds config in a parent directory above cwd', async () => {
    const root = mkdtempSync(join(tmpdir(), 'lunatar-root-'));
    const child = join(root, 'packages', 'sub');
    mkdirSync(child, { recursive: true });

    // Config in root, package.json in root, cwd = child (no package.json)
    writeFileSync(
      join(root, 'lunira.config.json'),
      JSON.stringify({ skills: { all: ['typescript-strict'] } }),
    );
    writeFileSync(join(root, 'package.json'), '{}');

    const config = await loadProjectConfig(child);

    expect(config.skills.all).toContain('typescript-strict');
    rmSync(root, { recursive: true });
  });

  it('stops at the nearest package.json boundary', async () => {
    const outer = mkdtempSync(join(tmpdir(), 'outer-'));
    const inner = join(outer, 'inner');
    mkdirSync(inner);

    // Config in outer, package.json in BOTH outer and inner
    writeFileSync(
      join(outer, 'lunira.config.json'),
      JSON.stringify({ skills: { all: ['outer-skill'] } }),
    );
    writeFileSync(join(outer, 'package.json'), '{}');
    writeFileSync(join(inner, 'package.json'), '{}');
    // No lunira.config.json in inner — should NOT find the outer one

    const config = await loadProjectConfig(inner);

    expect(config.skills.all).toBeUndefined();
    rmSync(outer, { recursive: true });
  });
});
