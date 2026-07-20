import { describe, it, expect } from 'vitest';
import { loadProjectConfig } from '../../src/config/project.js';
import { writeFile, mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

describe('project config — external field', () => {
  it('parses external plugin and skill paths from lunira.config.json', async () => {
    const dir = join(tmpdir(), `lunatar-test-${String(Date.now())}`);
    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, 'lunira.config.json'),
      JSON.stringify({
        skills: { all: [], external: ['./my-skill.md'] },
        plugins: { all: [], external: ['./my-plugin.js'] },
      }),
    );
    const config = await loadProjectConfig(dir);
    expect(config.skills.external).toEqual(['./my-skill.md']);
    expect(config.plugins.external).toEqual(['./my-plugin.js']);
    await rm(dir, { recursive: true });
  });

  it('defaults external to empty array when absent', async () => {
    const dir = join(tmpdir(), `lunatar-test-${String(Date.now())}`);
    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, 'lunira.config.json'),
      JSON.stringify({ skills: { all: [] }, plugins: { all: [] } }),
    );
    const config = await loadProjectConfig(dir);
    expect(config.skills.external).toEqual([]);
    expect(config.plugins.external).toEqual([]);
    await rm(dir, { recursive: true });
  });
});

describe('project config — providers.fallback', () => {
  it('parses fallback provider list', async () => {
    const dir = join(tmpdir(), `lunatar-fb-test-${String(Date.now())}`);
    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, 'lunira.config.json'),
      JSON.stringify({
        skills: { all: [] },
        plugins: { all: [] },
        providers: { fallback: ['groq', 'openai'] },
      }),
    );
    const config = await loadProjectConfig(dir);
    expect(config.providers?.fallback).toEqual(['groq', 'openai']);
    await rm(dir, { recursive: true });
  });

  it('defaults providers to empty when absent', async () => {
    const dir = join(tmpdir(), `lunatar-fb-test2-${String(Date.now())}`);
    await mkdir(dir, { recursive: true });
    await writeFile(
      join(dir, 'lunira.config.json'),
      JSON.stringify({ skills: { all: [] }, plugins: { all: [] } }),
    );
    const config = await loadProjectConfig(dir);
    expect(config.providers?.fallback ?? []).toEqual([]);
    await rm(dir, { recursive: true });
  });
});
